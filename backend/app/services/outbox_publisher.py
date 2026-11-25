"""STAGE Platform — Background Transactional Outbox Publisher.

Periodically polls unpublished outbox records from SQLite and relays them to
Apache Kafka. Ensures reliable at-least-once delivery with confirmation-based
marking of published_at timestamps.
"""
import time
import logging
import threading
from typing import Optional

from app.config import settings
from app.database import get_db
from app.services.outbox import (
    get_pending_outbox_events,
    mark_outbox_event_published,
    record_outbox_publish_failure,
)
from app.services.kafka_producer import kafka_producer

logger = logging.getLogger(__name__)


class OutboxPublisher:
    """Manages background polling and publishing of SQLite transactional outbox events."""

    def __init__(self):
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self) -> None:
        """Start the background outbox publisher thread."""
        with self._lock:
            if self._running:
                return

            self._stop_event.clear()
            self._running = True
            self._thread = threading.Thread(
                target=self._run_loop,
                name="stage-outbox-publisher",
                daemon=True,
            )
            self._thread.start()
            logger.info("Background transactional outbox publisher started.")

    def stop(self, timeout: float = 3.0) -> None:
        """Signal publisher to stop and wait for current batch completion."""
        with self._lock:
            if not self._running:
                return

            self._stop_event.set()
            if self._thread is not None:
                self._thread.join(timeout=timeout)
                self._thread = None
            self._running = False
            logger.info("Background transactional outbox publisher stopped.")

    def publish_pending_batch(self, limit: Optional[int] = None) -> int:
        """Process a single batch of pending outbox events.

        Returns:
            Number of successfully published events.
        """
        batch_size = limit or settings.kafka_outbox_batch_size
        success_count = 0

        try:
            with get_db() as conn:
                pending_events = get_pending_outbox_events(conn, limit=batch_size)
                if not pending_events:
                    return 0

                for ev in pending_events:
                    if self._stop_event.is_set():
                        break

                    event_id = ev["event_id"]
                    try:
                        # Relay to Kafka
                        kafka_producer.publish_event(
                            event_dict=ev,
                            topic=settings.kafka_topic,
                            timeout=3.0,
                        )
                        # Mark published strictly after Kafka delivery confirmation
                        mark_outbox_event_published(conn, event_id)
                        success_count += 1
                    except Exception as exc:
                        # Record publication attempt failure without crashing loop
                        record_outbox_publish_failure(conn, event_id, str(exc))
                        logger.warning(
                            "Failed to publish outbox event %s to Kafka (%s). Will retry.",
                            event_id,
                            type(exc).__name__,
                        )
        except Exception as exc:
            logger.warning("Outbox batch publishing cycle encountered error (%s).", type(exc).__name__)

        return success_count

    def _run_loop(self) -> None:
        """Background worker thread execution loop."""
        poll_interval = settings.kafka_outbox_poll_interval_seconds
        while not self._stop_event.is_set():
            try:
                published = self.publish_pending_batch()
                # If we published a full batch, poll again quickly; otherwise wait interval
                wait_time = 0.05 if published >= settings.kafka_outbox_batch_size else poll_interval
                self._stop_event.wait(wait_time)
            except Exception as exc:
                logger.warning("Unexpected error in outbox publisher loop (%s).", type(exc).__name__)
                self._stop_event.wait(poll_interval)


# Module singleton
outbox_publisher = OutboxPublisher()

