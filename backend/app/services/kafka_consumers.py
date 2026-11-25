"""STAGE Platform — Kafka Consumer Services.

Implements two independent consumer groups with durable idempotency:
1. 'stage-notifications': Generates in-app notifications based on domain events.
2. 'stage-analytics': Ingests domain events into an analytics ledger.

Durable idempotency guarantee:
Uses SQLite table `processed_events` with PRIMARY KEY (consumer_group, event_id).
The Kafka offset is committed strictly after the local SQLite transaction commits.
"""
import time
import json
import logging
import threading
from typing import Optional, Dict, Any, List

try:
    from confluent_kafka import Consumer, KafkaError, KafkaException
except ImportError:
    Consumer = None
    KafkaError = None
    KafkaException = Exception

from app.config import settings
from app.database import get_db

logger = logging.getLogger(__name__)


def is_event_processed(conn: Any, consumer_group: str, event_id: str) -> bool:
    """Check if an event has already been processed by the given consumer group."""
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 1 FROM processed_events
    WHERE consumer_group = ? AND event_id = ?;
    """, (consumer_group, event_id))
    return cursor.fetchone() is not None


def record_event_processed(conn: Any, consumer_group: str, event_id: str) -> None:
    """Record that an event has been processed by the consumer group."""
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR IGNORE INTO processed_events (consumer_group, event_id, processed_at)
    VALUES (?, ?, CURRENT_TIMESTAMP);
    """, (consumer_group, event_id))


def get_consumer_metrics(conn: Any) -> Dict[str, Any]:
    """Retrieve processed counts for each consumer group."""
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS processed_events (
        consumer_group TEXT NOT NULL,
        event_id TEXT NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (consumer_group, event_id)
    );
    """)

    cursor.execute("SELECT COUNT(*) FROM processed_events WHERE consumer_group = 'stage-notifications';")
    notif_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM processed_events WHERE consumer_group = 'stage-analytics';")
    analytics_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM processed_events;")
    total_processed = cursor.fetchone()[0]

    return {
        "notifications_processed": notif_count,
        "analytics_processed": analytics_count,
        "total_processed": total_processed,
    }


# -----------------------------------------------------------------------------
# Handlers for stage-notifications
# -----------------------------------------------------------------------------

def process_notification_event(conn: Any, event_dict: Dict[str, Any]) -> bool:
    """Idempotently process an event for the stage-notifications group."""
    event_id = event_dict.get("event_id")
    if not event_id:
        return False

    group_id = "stage-notifications"
    if is_event_processed(conn, group_id, event_id):
        logger.debug("[%s] Event %s already processed; skipping.", group_id, event_id)
        return True

    event_type = event_dict.get("event_type", "")
    payload = event_dict.get("payload", {})
    cursor = conn.cursor()

    notif_id = f"notif-kfk-{event_id}"

    if event_type == "venue.created":
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'provider', 'Kafka Notice: Venue Registered', ?, 'Just now', 0, 'system');
        """, (notif_id, f"Venue '{payload.get('name', 'New Venue')}' is active across the network."))

    elif event_type == "booking.created":
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'audience', 'Kafka Notice: Booking Confirmed', ?, 'Just now', 0, 'booking');
        """, (notif_id, f"Pass {payload.get('booking_code', 'CONFIRMED')} verified on message bus."))

    elif event_type == "request.status_changed":
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'performer', 'Kafka Notice: Request Updated', ?, 'Just now', 0, 'approval');
        """, (notif_id, f"Request '{payload.get('title', '')}' marked {payload.get('status', '')}."))

    elif event_type == "contribution.recorded":
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'provider', 'Kafka Notice: Impact Contribution', ?, 'Just now', 0, 'system');
        """, (notif_id, f"₹{payload.get('impact_amount', 0)} pledged to '{payload.get('cause_title', 'Cause')}'."))

    # Record processing in the same transaction
    record_event_processed(conn, group_id, event_id)
    return True


# -----------------------------------------------------------------------------
# Handlers for stage-analytics
# -----------------------------------------------------------------------------

def process_analytics_event(conn: Any, event_dict: Dict[str, Any]) -> bool:
    """Idempotently process an event for the stage-analytics group."""
    event_id = event_dict.get("event_id")
    if not event_id:
        return False

    group_id = "stage-analytics"
    if is_event_processed(conn, group_id, event_id):
        logger.debug("[%s] Event %s already processed; skipping.", group_id, event_id)
        return True

    event_type = event_dict.get("event_type", "")
    aggregate_type = event_dict.get("aggregate_type", "")
    aggregate_id = str(event_dict.get("aggregate_id", ""))
    payload_str = json.dumps(event_dict.get("payload", {}))

    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO event_analytics (
        event_id, event_type, aggregate_type, aggregate_id, payload
    ) VALUES (?, ?, ?, ?, ?);
    """, (event_id, event_type, aggregate_type, aggregate_id, payload_str))

    # Record processing in the same transaction
    record_event_processed(conn, group_id, event_id)
    return True


# -----------------------------------------------------------------------------
# Consumer Worker
# -----------------------------------------------------------------------------

class KafkaConsumerWorker:
    """Worker loop managing an isolated Kafka consumer instance."""

    def __init__(self, group_id: str, handler_fn):
        self.group_id = group_id
        self.handler_fn = handler_fn
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._consumer: Optional[Any] = None

    def start(self) -> None:
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run_loop,
            name=f"kfk-consumer-{self.group_id}",
            daemon=True,
        )
        self._thread.start()

    def stop(self, timeout: float = 3.0) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=timeout)
            self._thread = None
        if self._consumer is not None:
            try:
                self._consumer.close()
            except Exception:
                pass
            self._consumer = None

    def _run_loop(self) -> None:
        if Consumer is None:
            return

        conf = {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "group.id": self.group_id,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
            "socket.timeout.ms": 3000,
            "session.timeout.ms": 6000,
        }

        while not self._stop_event.is_set():
            try:
                consumer = Consumer(conf)
                consumer.subscribe([settings.kafka_topic])
                self._consumer = consumer
                logger.info("[%s] Subscribed to %s.", self.group_id, settings.kafka_topic)

                while not self._stop_event.is_set():
                    msg = consumer.poll(timeout=0.5)
                    if msg is None:
                        continue
                    if msg.error():
                        if msg.error().code() == KafkaError._PARTITION_EOF:
                            continue
                        logger.warning("[%s] Consumer error: %s", self.group_id, msg.error())
                        break

                    # Decode JSON event
                    try:
                        val_str = msg.value().decode("utf-8")
                        event_dict = json.loads(val_str)
                    except Exception as exc:
                        logger.warning("[%s] Malformed Kafka message (%s). Committing to skip.", self.group_id, type(exc).__name__)
                        consumer.commit(msg, asynchronous=False)
                        continue

                    # Process in SQLite transaction
                    success = False
                    try:
                        with get_db() as conn:
                            success = self.handler_fn(conn, event_dict)
                    except Exception as exc:
                        logger.warning("[%s] Error processing event %s (%s). Offset not committed.", self.group_id, event_dict.get("event_id"), type(exc).__name__)

                    # Commit Kafka offset strictly after SQLite transaction succeeds
                    if success:
                        try:
                            consumer.commit(msg, asynchronous=False)
                        except Exception as exc:
                            logger.warning("[%s] Failed to commit offset (%s).", self.group_id, type(exc).__name__)

            except Exception as exc:
                logger.warning("[%s] Consumer connection failed (%s). Retrying in 2s...", self.group_id, type(exc).__name__)
                self._stop_event.wait(2.0)
            finally:
                if self._consumer is not None:
                    try:
                        self._consumer.close()
                    except Exception:
                        pass
                    self._consumer = None


class StageConsumerManager:
    """Manages the lifecycle of both stage-notifications and stage-analytics consumer groups."""

    def __init__(self):
        self._notif_worker = KafkaConsumerWorker("stage-notifications", process_notification_event)
        self._analytics_worker = KafkaConsumerWorker("stage-analytics", process_analytics_event)
        self._running = False
        self._lock = threading.Lock()

    def start(self) -> None:
        with self._lock:
            if self._running:
                return
            self._notif_worker.start()
            self._analytics_worker.start()
            self._running = True
            logger.info("Kafka consumer groups (notifications, analytics) started.")

    def stop(self, timeout: float = 3.0) -> None:
        with self._lock:
            if not self._running:
                return
            self._notif_worker.stop(timeout=timeout)
            self._analytics_worker.stop(timeout=timeout)
            self._running = False
            logger.info("Kafka consumer groups stopped.")


# Module singleton
consumer_manager = StageConsumerManager()

