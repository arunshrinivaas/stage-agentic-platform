"""STAGE Platform — Kafka Producer Service.

Provides a thread-safe, robust producer interface using confluent-kafka.
Publishes domain events with delivery confirmation, idempotent producer settings,
and partition routing based on aggregate_id.
"""
import time
import json
import logging
from typing import Optional, Dict, Any, List

try:
    import confluent_kafka
    from confluent_kafka import Producer, KafkaException
    from confluent_kafka.admin import AdminClient
except ImportError:
    confluent_kafka = None
    Producer = None
    KafkaException = Exception
    AdminClient = None

from app.config import settings

logger = logging.getLogger(__name__)


class StageKafkaProducer:
    """Reusable, thread-safe Kafka producer with delivery acknowledgements."""

    def __init__(
        self,
        bootstrap_servers: Optional[str] = None,
        client_id: str = "stage-producer",
    ):
        self.bootstrap_servers = bootstrap_servers or settings.kafka_bootstrap_servers
        self.client_id = client_id
        self._producer: Optional[Any] = None
        self._admin: Optional[Any] = None

    def _get_producer(self) -> Optional[Any]:
        if self._producer is not None:
            return self._producer

        if Producer is None:
            logger.warning("confluent_kafka is not installed. Kafka publishing disabled.")
            return None

        try:
            conf = {
                "bootstrap.servers": self.bootstrap_servers,
                "client.id": self.client_id,
                "acks": "all",
                "enable.idempotence": True,
                "message.timeout.ms": 5000,
                "socket.timeout.ms": 3000,
                "retries": 3,
            }
            self._producer = Producer(conf)
            logger.info("Kafka producer initialized for broker %s.", self.bootstrap_servers)
            return self._producer
        except Exception as exc:
            logger.warning("Failed to initialize Kafka producer (%s).", type(exc).__name__)
            return None

    def is_connected(self, timeout: float = 2.0) -> bool:
        """Check whether the Kafka broker cluster is reachable."""
        if AdminClient is None:
            return False
        try:
            admin = AdminClient({
                "bootstrap.servers": self.bootstrap_servers,
                "socket.timeout.ms": int(timeout * 1000),
            })
            metadata = admin.list_topics(timeout=timeout)
            return len(metadata.brokers) > 0
        except Exception:
            return False

    def publish_event(
        self,
        event_dict: Dict[str, Any],
        topic: Optional[str] = None,
        timeout: float = 5.0,
    ) -> bool:
        """Publish a domain event to Kafka and await broker acknowledgement.

        Args:
            event_dict: Event dictionary containing event_id, aggregate_id, event_type, payload.
            topic: Target topic name (defaults to settings.kafka_topic).
            timeout: Maximum seconds to wait for broker delivery acknowledgement.

        Returns:
            True if broker confirmed delivery; raises KafkaException on failure.
        """
        producer = self._get_producer()
        if producer is None:
            raise RuntimeError("Kafka producer unavailable.")

        target_topic = topic or settings.kafka_topic
        event_id = str(event_dict.get("event_id", ""))
        aggregate_id = str(event_dict.get("aggregate_id", ""))
        event_type = str(event_dict.get("event_type", ""))

        key_bytes = aggregate_id.encode("utf-8") if aggregate_id else None
        value_bytes = json.dumps(event_dict, default=str).encode("utf-8")

        headers = [
            ("event_id", event_id.encode("utf-8")),
            ("event_type", event_type.encode("utf-8")),
        ]

        delivery_error = None
        delivered = False

        def on_delivery(err, msg):
            nonlocal delivery_error, delivered
            if err is not None:
                delivery_error = err
            else:
                delivered = True

        producer.produce(
            topic=target_topic,
            key=key_bytes,
            value=value_bytes,
            headers=headers,
            on_delivery=on_delivery,
        )

        # Flush to wait for delivery confirmation
        remaining = producer.flush(timeout=timeout)
        if delivery_error is not None:
            raise KafkaException(delivery_error)
        if remaining > 0 and not delivered:
            raise TimeoutError(f"Kafka delivery acknowledgement timed out after {timeout}s.")

        logger.debug("Delivered event %s to topic %s (key=%s)", event_id, target_topic, aggregate_id)
        return True

    def close(self) -> None:
        """Flush and close producer connections."""
        if self._producer is not None:
            try:
                self._producer.flush(timeout=2.0)
            except Exception:
                pass
            self._producer = None


# Module singleton
kafka_producer = StageKafkaProducer()

