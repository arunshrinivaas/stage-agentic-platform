"""STAGE Platform — Transactional Event Outbox Service.

Provides durable, atomic outbox persistence in SQLite. Ensures business mutations
and domain events commit in the exact same transaction, preventing dual-write anomalies
and ensuring reliable at-least-once publication to Apache Kafka.
"""
import uuid
import json
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


def ensure_outbox_tables(conn: Any) -> None:
    """Ensure outbox and consumer tracking tables exist on the given SQLite connection."""
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS event_outbox (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        last_error TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_outbox_published ON event_outbox(published_at);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS processed_events (
        consumer_group TEXT NOT NULL,
        event_id TEXT NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (consumer_group, event_id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS event_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON event_analytics(event_type);")


def record_outbox_event(
    conn: Any,
    event_type: str,
    aggregate_type: str,
    aggregate_id: str,
    payload: Dict[str, Any],
    event_id: Optional[str] = None,
) -> str:
    """Insert a domain event into event_outbox within the caller's active SQLite transaction.

    Args:
        conn: The active SQLite connection (from get_db() context manager).
        event_type: Dot-notated event identifier (e.g. 'venue.created', 'booking.created').
        aggregate_type: Domain entity type (e.g. 'venue', 'booking', 'request', 'contribution').
        aggregate_id: Unique identifier of the business aggregate.
        payload: Event payload dictionary (JSON-serializable).
        event_id: Optional deterministic UUID string; generated if None.

    Returns:
        The stable event_id assigned to this outbox entry.
    """
    ensure_outbox_tables(conn)
    assigned_id = event_id or str(uuid.uuid4())
    payload_json = json.dumps(payload, default=str)

    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO event_outbox (
        event_id, event_type, aggregate_type, aggregate_id,
        payload, created_at, published_at, attempts, last_error
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL, 0, NULL);
    """, (
        assigned_id,
        event_type,
        aggregate_type,
        str(aggregate_id),
        payload_json,
    ))

    logger.debug("Recorded transactional outbox event %s (%s for %s:%s)", assigned_id, event_type, aggregate_type, aggregate_id)
    return assigned_id


def get_pending_outbox_events(conn: Any, limit: int = 50, max_attempts: int = 10) -> List[Dict[str, Any]]:
    """Retrieve unpublished events from event_outbox ordered chronologically.

    Args:
        conn: Active SQLite connection.
        limit: Maximum batch size.
        max_attempts: Cap on retry attempts before backoff exclusion.

    Returns:
        List of event dictionaries with parsed payload.
    """
    ensure_outbox_tables(conn)
    cursor = conn.cursor()
    cursor.execute("""
    SELECT event_id, event_type, aggregate_type, aggregate_id, payload, created_at, attempts, last_error
    FROM event_outbox
    WHERE published_at IS NULL AND attempts < ?
    ORDER BY created_at ASC, attempts ASC
    LIMIT ?;
    """, (max_attempts, limit))
    rows = cursor.fetchall()

    results: List[Dict[str, Any]] = []
    for r in rows:
        try:
            payload = json.loads(r["payload"]) if r["payload"] else {}
        except Exception:
            payload = {"raw": r["payload"]}

        results.append({
            "event_id": r["event_id"],
            "event_type": r["event_type"],
            "aggregate_type": r["aggregate_type"],
            "aggregate_id": r["aggregate_id"],
            "payload": payload,
            "created_at": r["created_at"],
            "attempts": r["attempts"],
            "last_error": r["last_error"],
        })
    return results


def mark_outbox_event_published(conn: Any, event_id: str) -> bool:
    """Mark an event as successfully published after confirmed delivery from Kafka."""
    ensure_outbox_tables(conn)
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE event_outbox
    SET published_at = CURRENT_TIMESTAMP, last_error = NULL
    WHERE event_id = ?;
    """, (event_id,))
    return cursor.rowcount > 0


def record_outbox_publish_failure(conn: Any, event_id: str, error_message: str) -> bool:
    """Increment publication attempts and record the last error on delivery failure."""
    ensure_outbox_tables(conn)
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE event_outbox
    SET attempts = attempts + 1, last_error = ?
    WHERE event_id = ?;
    """, (error_message[:500], event_id))
    return cursor.rowcount > 0


def get_outbox_metrics(conn: Any) -> Dict[str, Any]:
    """Retrieve outbox publication and pending counts for observability."""
    ensure_outbox_tables(conn)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM event_outbox WHERE published_at IS NULL;")
    pending = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM event_outbox WHERE published_at IS NOT NULL;")
    published = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM event_outbox WHERE published_at IS NULL AND attempts > 0;")
    failed = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM event_outbox;")
    total = cursor.fetchone()[0]

    return {
        "pending_count": pending,
        "published_count": published,
        "failed_count": failed,
        "total_count": total,
    }

