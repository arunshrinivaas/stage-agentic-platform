import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def run_live_verification():
    print(f"Testing live FastAPI server at {BASE_URL}...")

    # 1. Health & Docs
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("✓ 1. Live GET /health returned 200 OK")

    r_docs = requests.get(f"{BASE_URL}/docs")
    assert r_docs.status_code == 200
    print("✓ 1b. Live GET /docs (Swagger UI) returned 200 OK")

    # Workflow 1: Create performer request through API
    perf_req_payload = {
        "performerId": "perf-mehta",
        "performerName": "Aarav Mehta & Clara Dubois",
        "performerHandle": "@mehta.dubois",
        "title": "Spring Equinox Raga Recital",
        "artForm": "Music",
        "preferredLocation": "Kolkata Waterfront",
        "venueId": "venue-01",
        "venueName": "The Vault Amphitheater",
        "date": "2027-03-21",
        "time": "7:00 PM",
        "expectedAudienceSize": 140,
        "budget": 38000.0,
        "currency": "₹",
        "description": "Double raga evening with French baroque cello harmonies."
    }
    r = requests.post(f"{BASE_URL}/api/requests", json=perf_req_payload)
    assert r.status_code == 201, f"Create request failed: {r.text}"
    created_req = r.json()
    req_id = created_req["id"]
    print(f"✓ Workflow 1: Performer created request {req_id} (status: {created_req['status']})")

    # Workflow 2: Retrieve it from provider workspace
    r = requests.get(f"{BASE_URL}/api/requests")
    assert r.status_code == 200
    all_requests = r.json()
    found_in_provider = next((req for req in all_requests if req["id"] == req_id), None)
    assert found_in_provider is not None
    assert found_in_provider["status"] == "pending"
    print(f"✓ Workflow 2: Provider retrieved request '{found_in_provider['title']}' successfully")

    # Workflow 3: Approve the request through API
    r = requests.patch(
        f"{BASE_URL}/api/requests/{req_id}/status",
        json={"status": "approved", "reviewNote": "Venue host confirmed spring equinox booking."}
    )
    assert r.status_code == 200
    approved_req = r.json()
    assert approved_req["status"] == "approved"
    print(f"✓ Workflow 3: Approved request {req_id} via PATCH /api/requests/{req_id}/status")

    # Workflow 4: Retrieve updated status from performer workspace
    r = requests.get(f"{BASE_URL}/api/requests")
    updated_in_performer = next(req for req in r.json() if req["id"] == req_id)
    assert updated_in_performer["status"] == "approved"
    assert "spring equinox" in updated_in_performer["reviewNote"]
    print(f"✓ Workflow 4: Performer retrieved updated status: {updated_in_performer['status']} (Note: {updated_in_performer['reviewNote']})")

    # Workflow 5: Create a venue and retrieve it
    venue_payload = {
        "name": "The Riverside Terraces",
        "venueType": "Open-Air Tiered Garden",
        "location": {
            "address": "88 Ganges Esplanade",
            "neighborhood": "South Waterfront",
            "city": "Kolkata"
        },
        "capacity": {
            "seated": 180,
            "standing": 250,
            "formatted": "180 seated · 250 total"
        },
        "suitableCategories": ["Music", "Dance", "Spoken Word"],
        "amenities": ["Acoustic shell", "Lawn tiers", "Stage lighting"],
        "availabilityNotice": "Spring dusk slots open",
        "availabilityStatus": "open_slots",
        "host": {
            "name": "Civic Waterfront Trust",
            "role": "Community Steward",
            "policy": "85% box-office retained by artist"
        },
        "imageUrl": "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900"
    }
    r = requests.post(f"{BASE_URL}/api/venues", json=venue_payload)
    assert r.status_code == 201, f"Create venue failed: {r.text}"
    created_venue = r.json()
    venue_id = created_venue["id"]

    r_venues = requests.get(f"{BASE_URL}/api/venues")
    assert any(v["id"] == venue_id for v in r_venues.json())
    print(f"✓ Workflow 5: Created and retrieved venue '{created_venue['name']}' ({venue_id})")

    # Workflow 6 & 7: Book an event, update seat availability, and record simulated contribution
    r_events = requests.get(f"{BASE_URL}/api/events")
    events = r_events.json()
    target_event = next(e for e in events if e["id"] == "evt-01")
    initial_seats = target_event["seats"]["available"]

    booking_payload = {
        "eventId": "evt-01",
        "ticketCount": 3,
        "attendeeName": "Tanvi Sen",
        "attendeeEmail": "tanvi.sen@example.com"
    }
    r_booking = requests.post(f"{BASE_URL}/api/bookings", json=booking_payload)
    assert r_booking.status_code == 201, f"Create booking failed: {r_booking.text}"
    booking_data = r_booking.json()
    print(f"✓ Workflow 6a: Booked 3 seats for '{target_event['title']}' (Pass: {booking_data['bookingCode']})")

    # Verify seats updated
    r_events_updated = requests.get(f"{BASE_URL}/api/events")
    updated_event = next(e for e in r_events_updated.json() if e["id"] == "evt-01")
    assert updated_event["seats"]["available"] == initial_seats - 3
    print(f"✓ Workflow 6b: Event seats decremented from {initial_seats} to {updated_event['seats']['available']}")

    # Verify contribution ledger recorded
    r_ledger = requests.get(f"{BASE_URL}/api/contributions")
    ledger_entries = r_ledger.json()
    matching_contrib = next((c for c in ledger_entries if c.get("eventId") == "evt-01"), None)
    assert matching_contrib is not None
    print(f"✓ Workflow 7: Simulated contribution recorded (Pledged: {matching_contrib['pledgedPercentage']}%, Amount: ₹{matching_contrib['impactAmount']})")

    # Workflow 8: Create a campaign and retrieve its details
    campaign_payload = {
        "title": "Santoor Restoration in North Valley",
        "tagline": "Restoring handcrafted santoors and teaching youth.",
        "description": "Funding heritage instrument restoration masterclasses.",
        "targetAmount": 450000.0,
        "currency": "₹",
        "focusArea": "Folk Preservation & Elder Care",
        "organizer": {
            "name": "Valley Heritage Trust",
            "type": "Non-profit Archive",
            "verified": True
        }
    }
    r_cause = requests.post(f"{BASE_URL}/api/causes", json=campaign_payload)
    assert r_cause.status_code == 201, f"Create cause failed: {r_cause.text}"
    created_cause = r_cause.json()

    r_causes = requests.get(f"{BASE_URL}/api/causes")
    assert any(c["id"] == created_cause["id"] for c in r_causes.json())
    print(f"✓ Workflow 8: Created and retrieved campaign '{created_cause['title']}' ({created_cause['id']})")

    print("\nAll 8 live API workflows successfully passed against running FastAPI server!")

if __name__ == "__main__":
    run_live_verification()

