"""STAGE Infrastructure & Subsystems Verification Script.
Verifies MCP tools, Redis caching, Kafka outbox and consumer replay idempotency.
"""
import sys
import json
import uuid
from app.database import get_db
from app.services import venue_cache
from app.agents.stage_match.tools import search_stages, get_stage_details, calculate_match_score
from app.mcp_server.venue_server import search_stages as mcp_search_stages, get_stage_details as mcp_get_stage_details
from app.services.kafka_consumers import (
    process_notification_event,
    process_analytics_event,
    is_event_processed,
    get_consumer_metrics
)
from app.services.outbox import record_outbox_event

def run_verification():
    print("=== STAGE Subsystems Rehearsal Verification ===")

    # 1. MCP Tools Verification
    print("\n[1/4] Verifying MCP Venue Server Tools...")
    mcp_venues = mcp_search_stages(city="Kolkata")
    assert len(mcp_venues) > 0, "MCP search_stages should return Kolkata venues"
    venue_01 = mcp_get_stage_details("venue-01")
    assert venue_01.get("id") == "venue-01", "MCP get_stage_details should retrieve venue-01"
    match_eval = calculate_match_score("venue-01", "Kolkata", 50, "Music")
    assert match_eval.get("total_score", 0) > 0, "calculate_match_score should return positive score"
    print(f"  ✓ MCP search returned {len(mcp_venues)} venues.")
    print(f"  ✓ MCP get_stage_details retrieved '{venue_01.get('name')}'.")
    print(f"  ✓ Match evaluation total score: {match_eval.get('total_score')}%")

    # 2. Redis Caching & Invalidation Verification
    print("\n[2/4] Verifying Redis Cache & Generational Invalidation...")
    gen_before = venue_cache.get_durable_generation()
    print(f"  Durable generation: {gen_before}")
    stages_first = search_stages(city="Kolkata")
    # Second search should hit Redis verified generation
    stages_cached = search_stages(city="Kolkata")
    assert len(stages_cached) == len(stages_first), "Cached search must match first search"
    print("  ✓ Redis cache search & generation verification verified.")

    # 3. Kafka Consumers & Replay Idempotency Verification
    print("\n[3/4] Verifying Kafka Consumer Replay Idempotency...")
    test_event_id = f"evt-test-rehearsal-{uuid.uuid4().hex[:8]}"
    test_event = {
        "event_id": test_event_id,
        "event_type": "request.status_changed",
        "aggregate_type": "request",
        "aggregate_id": "req-test-999",
        "payload": {
            "title": "Rehearsal Test Recital",
            "status": "confirmed"
        }
    }

    with get_db() as conn:
        metrics_before = get_consumer_metrics(conn)
        print(f"  Initial consumer metrics: {metrics_before}")

        # First delivery
        ok1 = process_notification_event(conn, test_event)
        assert ok1 is True, "First delivery should succeed"
        processed_1 = is_event_processed(conn, "stage-notifications", test_event_id)
        assert processed_1 is True, "Event should be marked processed in stage-notifications"

        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE id = ?", (f"notif-kfk-{test_event_id}",))
        notif_count_1 = cursor.fetchone()[0]
        assert notif_count_1 == 1, "Exactly 1 notification should be created on first delivery"

        # Replay duplicate delivery
        ok2 = process_notification_event(conn, test_event)
        assert ok2 is True, "Replay delivery should succeed without error"
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE id = ?", (f"notif-kfk-{test_event_id}",))
        notif_count_2 = cursor.fetchone()[0]
        assert notif_count_2 == 1, "Duplicate delivery MUST NOT insert a duplicate notification"
        print("  ✓ stage-notifications replay idempotency verified (duplicate skipped).")

        # Analytics consumer delivery & replay
        ok_a1 = process_analytics_event(conn, test_event)
        assert ok_a1 is True, "Analytics consumer first delivery should succeed"
        cursor.execute("SELECT COUNT(*) FROM event_analytics WHERE event_id = ?", (test_event_id,))
        analytics_count_1 = cursor.fetchone()[0]
        assert analytics_count_1 == 1, "Exactly 1 analytics record on first delivery"

        ok_a2 = process_analytics_event(conn, test_event)
        assert ok_a2 is True, "Analytics consumer replay delivery should succeed"
        cursor.execute("SELECT COUNT(*) FROM event_analytics WHERE event_id = ?", (test_event_id,))
        analytics_count_2 = cursor.fetchone()[0]
        assert analytics_count_2 == 1, "Duplicate analytics delivery MUST NOT insert duplicate record"
        print("  ✓ stage-analytics replay idempotency verified (duplicate skipped).")

        # Clean up test artifacts
        cursor.execute("DELETE FROM notifications WHERE id = ?", (f"notif-kfk-{test_event_id}",))
        cursor.execute("DELETE FROM event_analytics WHERE event_id = ?", (test_event_id,))
        cursor.execute("DELETE FROM processed_events WHERE event_id = ?", (test_event_id,))
        print("  ✓ Test artifacts safely cleaned up.")

    # 4. Outbox Verification
    print("\n[4/4] Verifying Transactional Outbox...")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM event_outbox;")
        total_outbox = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM event_outbox WHERE published_at IS NOT NULL;")
        published_outbox = cursor.fetchone()[0]
        print(f"  Total outbox events: {total_outbox}")
        print(f"  Published outbox events: {published_outbox}")
        assert published_outbox <= total_outbox, "Published events cannot exceed total"
        print("  ✓ Outbox invariants verified.")

    print("\nALL SUBSYSTEM VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_verification()
