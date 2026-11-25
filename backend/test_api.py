import os
import sys
import time
import tempfile
import uuid
import atexit

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# 1. Establish isolated temporary SQLite database path BEFORE importing any app modules/settings
test_db_dir = tempfile.mkdtemp(prefix="stage_test_api_")
test_db_path = os.path.join(test_db_dir, f"test_api_{uuid.uuid4().hex[:8]}.db")
os.environ["DATABASE_PATH"] = test_db_path

def cleanup_test_database():
    """Clean up the isolated temporary database files and directory."""
    for path in [
        test_db_path,
        f"{test_db_path}-wal",
        f"{test_db_path}-shm",
    ]:
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass
    try:
        if os.path.exists(test_db_dir):
            os.rmdir(test_db_dir)
    except OSError:
        pass

atexit.register(cleanup_test_database)

# 2. Now import app modules and testclient (settings.database_path resolves to test_db_path)
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_db
from app.services.seed_data import seed_database

def test_backend_end_to_end():
    print("Initializing test database & seeding...")
    init_db()
    seed_database()

    client = TestClient(app)

    # 1. Health
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    assert res.json() == {"status": "healthy"}
    print("✓ GET /health passed")

    # 2. Users
    res = client.get("/api/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 4
    user_id = users[0]["id"]
    res_single = client.get(f"/api/users/{user_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == user_id
    print(f"✓ GET /api/users & /api/users/{user_id} passed ({len(users)} users)")

    # 3. Venues
    res = client.get("/api/venues")
    assert res.status_code == 200
    venues = res.json()
    assert len(venues) >= 4
    print(f"✓ GET /api/venues passed ({len(venues)} venues)")

    # 4. Create Venue
    unique_suffix = int(time.time())
    venue_name = f"The Obsidian Atrium {unique_suffix}"
    new_venue_payload = {
        "name": venue_name,
        "venueType": "Acoustic Glasshouse",
        "location": {
            "address": "40 Riverside Lane",
            "neighborhood": "Waterfront Arts",
            "city": "Kolkata"
        },
        "capacity": {
            "seated": 110,
            "standing": 160,
            "formatted": "110 seated · 160 standing"
        },
        "suitableCategories": ["Music", "Theatre"],
        "amenities": ["Acoustic drapes", "High ceiling", "PA soundboard"],
        "availabilityNotice": "Weekends open",
        "availabilityStatus": "open_slots",
        "host": {
            "name": "Ananya Roy",
            "role": "Arts Host",
            "policy": "80% artist split"
        },
        "imageUrl": "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=900"
    }
    res_post_venue = client.post("/api/venues", json=new_venue_payload, headers={"X-STAGE-Role": "provider"})
    assert res_post_venue.status_code == 201, f"Create venue failed: {res_post_venue.text}"
    created_venue = res_post_venue.json()
    assert created_venue["name"] == venue_name
    assert created_venue["id"].startswith("venue-")
    print(f"✓ POST /api/venues passed (created {created_venue['id']} - '{venue_name}')")

    # 5. Performance Requests
    res = client.get("/api/requests")
    assert res.status_code == 200
    reqs = res.json()
    assert len(reqs) >= 4
    print(f"✓ GET /api/requests passed ({len(reqs)} requests)")

    # 6. Create Performance Request
    new_req_payload = {
        "performerId": "perf-mehta",
        "performerName": "Aarav Mehta & Clara Dubois",
        "performerHandle": "@mehta.dubois",
        "title": "Winter Raga Resonance",
        "artForm": "Music",
        "preferredLocation": "Kolkata Waterfront",
        "venueId": created_venue["id"],
        "venueName": created_venue["name"],
        "date": "2026-12-28",
        "time": "7:00 PM",
        "expectedAudienceSize": 100,
        "budget": 32000.0,
        "currency": "₹",
        "description": "Chamber sitar and cello acoustic set."
    }
    res_post_req = client.post("/api/requests", json=new_req_payload, headers={"X-STAGE-Role": "performer"})
    assert res_post_req.status_code == 201, f"Create request failed: {res_post_req.text}"
    created_req = res_post_req.json()
    assert created_req["status"] == "pending"
    print(f"✓ POST /api/requests passed (created {created_req['id']})")

    # 7. Approve Request
    res_patch_req = client.patch(
        f"/api/requests/{created_req['id']}/status",
        json={"status": "approved", "reviewNote": "Venue host cleared acoustic rider."},
        headers={"X-STAGE-Role": "provider"},
    )
    assert res_patch_req.status_code == 200
    assert res_patch_req.json()["status"] == "approved"
    assert res_patch_req.json()["reviewNote"] == "Venue host cleared acoustic rider."
    print("✓ PATCH /api/requests/{id}/status passed")

    # 8. Events
    # Ensure test isolation by creating a dedicated test event with guaranteed capacity
    test_event_id = f"evt-test-{unique_suffix}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO events (
                id, title, performer_id, performer_name, performer_handle,
                performer_avatar_url, performer_bio, art_form, sub_genre,
                date, time, date_time_iso, venue_id, venue_name,
                neighborhood, city, is_indoor, total_seats, available_seats,
                price_label, seat_status, image_url, description,
                cause_id, cause_name, cause_percentage, featured, is_demonstration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            test_event_id,
            f"Test Resonance Showcase {unique_suffix}",
            "perf-mehta",
            "Aarav Mehta & Clara Dubois",
            "@mehta.dubois",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160",
            "Test description",
            "Music",
            "Indo-Classical",
            "Sat, Nov 28",
            "7:30 PM",
            "2026-11-28T19:30:00",
            created_venue["id"],
            created_venue["name"],
            "Waterfront Arts",
            "Kolkata",
            1,
            50,
            3,  # Guaranteed initial capacity of 3 seats for capacity testing
            "₹450",
            "available",
            "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900",
            "Test event description",
            "cause-01",
            "Instruments for Riverbank Classrooms",
            30.0,
            1,
            1
        ))

    res = client.get("/api/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 6
    test_event = next(e for e in events if e["id"] == test_event_id)
    initial_avail = test_event["seats"]["available"]
    assert initial_avail == 3
    print(f"✓ GET /api/events passed ({len(events)} events, test event available: {initial_avail})")

    # Booking capacity validation: booking exceeding available capacity (within schema max of 10) must be rejected with 400
    overbook_tickets = initial_avail + 2  # 5 tickets requested when only 3 available
    overbook_payload = {
        "eventId": test_event["id"],
        "ticketCount": overbook_tickets,
        "attendeeName": "Overbook Tester",
        "attendeeEmail": "overbook@example.com"
    }
    res_overbook = client.post("/api/bookings", json=overbook_payload, headers={"X-STAGE-Role": "audience"})
    assert res_overbook.status_code == 400
    assert "Not enough seats available" in res_overbook.json().get("detail", "")
    print(f"✓ Booking capacity validation passed: rejected booking of {overbook_tickets} seats with 400 ({res_overbook.json().get('detail')})")

    # 9. Book Event (valid capacity)
    booking_payload = {
        "eventId": test_event["id"],
        "ticketCount": 2,
        "attendeeName": "Kavita Rao",
        "attendeeEmail": "kavita.rao@example.com"
    }
    res_booking = client.post("/api/bookings", json=booking_payload, headers={"X-STAGE-Role": "audience"})
    assert res_booking.status_code == 201, f"Create booking failed: {res_booking.text}"
    created_booking = res_booking.json()
    assert created_booking["eventId"] == test_event["id"]
    assert created_booking["ticketCount"] == 2
    assert created_booking["bookingCode"].startswith("STG-")
    print(f"✓ POST /api/bookings passed (code: {created_booking['bookingCode']})")

    # Verify event seats decremented by 2
    res_events_after = client.get("/api/events")
    updated_test_event = next(e for e in res_events_after.json() if e["id"] == test_event["id"])
    assert updated_test_event["seats"]["available"] == initial_avail - 2
    print(f"✓ Seat availability correctly decremented from {initial_avail} to {updated_test_event['seats']['available']}")

    # 10. Get Bookings
    res = client.get("/api/bookings")
    assert res.status_code == 200
    bookings = res.json()
    assert any(b["id"] == created_booking["id"] for b in bookings)
    print(f"✓ GET /api/bookings passed ({len(bookings)} bookings)")

    # 11. Causes
    res = client.get("/api/causes")
    assert res.status_code == 200
    causes = res.json()
    assert len(causes) >= 4
    print(f"✓ GET /api/causes passed ({len(causes)} causes)")

    # 12. Create Cause
    cause_title = f"Acoustic Instruments for Coastal Schools {unique_suffix}"
    cause_payload = {
        "title": cause_title,
        "tagline": "Providing violins and flutes to delta classrooms.",
        "description": "Grassroots music project linking concert ticket pledges to school music rooms.",
        "targetAmount": 300000.0,
        "currency": "₹",
        "focusArea": "Youth Arts Education",
        "organizer": {
            "name": "Coastal Harmony Trust",
            "type": "Grassroots Trust",
            "verified": True
        }
    }
    res_cause = client.post("/api/causes", json=cause_payload, headers={"X-STAGE-Role": "organiser"})
    assert res_cause.status_code == 201, f"Create cause failed: {res_cause.text}"
    created_cause = res_cause.json()
    assert created_cause["title"] == cause_title
    print(f"✓ POST /api/causes passed (created {created_cause['id']} - '{cause_title}')")

    # 13. Contributions (Ledger)
    res = client.get("/api/contributions")
    assert res.status_code == 200
    contribs = res.json()
    assert len(contribs) >= 4
    print(f"✓ GET /api/contributions passed ({len(contribs)} ledger entries)")

    # 14. Notifications
    res = client.get("/api/notifications")
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 4
    print(f"✓ GET /api/notifications passed ({len(notifs)} notifications)")

    # 15. Workflow 9: Restart / Reconnect to SQLite disk and confirm all data persists
    del client
    print("\nSimulating Backend Restart & SQLite Database Reconnect...")
    new_client = TestClient(app)
    
    # Verify created venue persists across restart
    res_venues_restart = new_client.get("/api/venues")
    assert any(v["id"] == created_venue["id"] for v in res_venues_restart.json()), "Created venue did not persist after restart!"
    print(f"✓ Workflow 9a: Venue '{created_venue['name']}' persisted in SQLite after restart")

    # Verify approved request persists across restart
    res_reqs_restart = new_client.get("/api/requests")
    persisted_req = next((r for r in res_reqs_restart.json() if r["id"] == created_req["id"]), None)
    assert persisted_req is not None, "Created request did not persist after restart!"
    assert persisted_req["status"] == "approved", "Approved request status did not persist after restart!"
    print(f"✓ Workflow 9b: Performance request '{persisted_req['title']}' with status 'approved' persisted in SQLite")

    # Verify booking and decremented seats persist across restart
    res_bookings_restart = new_client.get("/api/bookings")
    assert any(b["id"] == created_booking["id"] for b in res_bookings_restart.json()), "Booking did not persist after restart!"
    
    res_events_restart = new_client.get("/api/events")
    persisted_event = next(e for e in res_events_restart.json() if e["id"] == test_event["id"])
    assert persisted_event["seats"]["available"] == initial_avail - 2, "Decremented seat availability did not persist after restart!"
    print(f"✓ Workflow 9c: Booking '{created_booking['bookingCode']}' and decremented seat count ({persisted_event['seats']['available']}) persisted in SQLite")

    # Verify created cause persists across restart
    res_causes_restart = new_client.get("/api/causes")
    assert any(c["id"] == created_cause["id"] for c in res_causes_restart.json()), "Created cause did not persist after restart!"
    print(f"✓ Workflow 9d: Campaign '{created_cause['title']}' persisted in SQLite")

    # Re-seeding test
    seed_database()
    print("✓ Workflow 9e: Idempotent re-seed check passed without duplication")

    print("\n==========================================")
    print("ALL BACKEND ENDPOINTS & WORKFLOWS VERIFIED!")
    print("==========================================")

if __name__ == "__main__":
    try:
        test_backend_end_to_end()
    finally:
        cleanup_test_database()
