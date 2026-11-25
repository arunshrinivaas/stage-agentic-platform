"""STAGE Platform — Event Observability API.

Provides real-time metrics for the transactional event outbox and
Apache Kafka consumer groups.
"""
from fastapi import APIRouter
from app.database import get_db
from app.config import settings
from app.services.outbox import get_outbox_metrics
from app.services.kafka_consumers import get_consumer_metrics
from app.services.kafka_producer import kafka_producer

router = APIRouter(prefix="/api/events", tags=["Kafka & Outbox Observability"])


@router.get("/stats")
def get_event_stats():
    """Retrieve operational metrics for outbox publication and consumer processing."""
    with get_db() as conn:
        outbox_stats = get_outbox_metrics(conn)
        consumer_stats = get_consumer_metrics(conn)

    connected = kafka_producer.is_connected(timeout=1.0)
    return {
        "status": "healthy" if connected else "degraded",
        "kafka_connected": connected,
        "broker": settings.kafka_bootstrap_servers,
        "topic": settings.kafka_topic,
        "outbox": outbox_stats,
        "consumers": consumer_stats,
    }

