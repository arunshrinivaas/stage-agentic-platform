import os
import sys
import tempfile
import uuid
import atexit

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

test_db_dir = tempfile.mkdtemp(prefix="stage_test_auth_")
test_db_path = os.path.join(test_db_dir, f"test_auth_{uuid.uuid4().hex[:8]}.db")
os.environ["DATABASE_PATH"] = test_db_path

def cleanup():
    for p in [test_db_path, f"{test_db_path}-wal", f"{test_db_path}-shm"]:
        if os.path.exists(p):
            try: os.remove(p)
            except OSError: pass
    if os.path.exists(test_db_dir):
        try: os.rmdir(test_db_dir)
        except OSError: pass

atexit.register(cleanup)

from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from app.services.seed_data import seed_database

def run_tests():
    print("Initializing isolated DB...")
    init_db()
    seed_database()
    client = TestClient(app)

    print("\n--- 1. Testing Demo Login for all roles ---")
    tokens = {}
    for role in ["performer", "provider", "audience", "organiser", "admin"]:
        res = client.post("/api/auth/demo-login", json={"role": role})
        assert res.status_code == 200, f"Demo login failed for {role}: {res.text}"
        data = res.json()
        assert "token" in data
        assert data["user"]["role"] == role
        tokens[role] = data["token"]
        print(f"✓ Demo login for '{role}' succeeded (User: {data['user']['name']}, Role: {data['user']['role']})")

    print("\n--- 2. Testing /api/auth/me ---")
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['performer']}"})
    assert res.status_code == 200
    me = res.json()
    assert me["role"] == "performer"
    assert me["id"] == "usr-aarav"
    print(f"✓ GET /api/auth/me passed for {me['name']}")

    # Unauthenticated / invalid token
    res_bad = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid-token"})
    assert res_bad.status_code == 401
    print("✓ GET /api/auth/me rejected invalid token (401)")

    print("\n--- 3. Testing User Registration ---")
    reg_payload = {
        "name": "Maya Lin",
        "email": "maya.lin@example.com",
        "password": "securepassword123",
        "role": "performer",
        "artForm": "Dance",
        "handle": "@maya.dance",
        "bio": "Contemporary Bharatanatyam soloist."
    }
    res_reg = client.post("/api/auth/register", json=reg_payload)
    assert res_reg.status_code == 201, f"Registration failed: {res_reg.text}"
    reg_data = res_reg.json()
    assert reg_data["user"]["name"] == "Maya Lin"
    assert reg_data["user"]["role"] == "performer"
    maya_token = reg_data["token"]
    print("✓ POST /api/auth/register succeeded")

    # Duplicate registration
    res_dup = client.post("/api/auth/register", json=reg_payload)
    assert res_dup.status_code == 400
    print("✓ Duplicate email rejected (400)")

    print("\n--- 4. Testing Role Authorization Restrictions (HTTP 403 Forbidden) ---")
    # Performer trying to create a venue -> 403
    res_venue_perf = client.post(
        "/api/venues",
        headers={"Authorization": f"Bearer {tokens['performer']}"},
        json={
            "name": "Unauthorized Venue",
            "venueType": "Loft",
            "location": {"address": "123 St", "neighborhood": "Downtown", "city": "Mumbai"},
            "capacity": {"seated": 50, "standing": 80, "formatted": "50/80"},
            "suitableCategories": ["Music"],
            "amenities": ["Acoustics"],
            "availabilityNotice": "Open",
            "availabilityStatus": "open_slots",
            "host": {"name": "Host", "role": "Owner", "policy": "Split"},
            "imageUrl": "https://example.com/img.jpg"
        }
    )
    assert res_venue_perf.status_code == 403, f"Expected 403 for performer creating venue, got {res_venue_perf.status_code}"
    print("✓ Performer token blocked from creating venue (403 Forbidden)")

    # Audience trying to approve a request -> 403
    res_appr_aud = client.patch(
        "/api/requests/req-01/status",
        headers={"Authorization": f"Bearer {tokens['audience']}"},
        json={"status": "approved", "reviewNote": "I approve this!"}
    )
    assert res_appr_aud.status_code == 403, f"Expected 403 for audience approving request, got {res_appr_aud.status_code}"
    print("✓ Audience token blocked from approving request (403 Forbidden)")

    # Provider CAN create a venue -> 201
    res_venue_prov = client.post(
        "/api/venues",
        headers={"Authorization": f"Bearer {tokens['provider']}"},
        json={
            "name": "The Heritage Brick Stage",
            "venueType": "Loft",
            "location": {"address": "123 St", "neighborhood": "Downtown", "city": "Mumbai"},
            "capacity": {"seated": 50, "standing": 80, "formatted": "50/80"},
            "suitableCategories": ["Music"],
            "amenities": ["Acoustics"],
            "availabilityNotice": "Open",
            "availabilityStatus": "open_slots",
            "host": {"name": "Priya", "role": "Owner", "policy": "Split"},
            "imageUrl": "https://example.com/img.jpg"
        }
    )
    assert res_venue_prov.status_code == 201
    print("✓ Provider token allowed to create venue (201 Created)")

    # Admin CAN create a venue (multi-role admin) -> 201
    res_venue_admin = client.post(
        "/api/venues",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={
            "name": "The Admin All-Access Stage",
            "venueType": "Amphitheatre",
            "location": {"address": "Admin Blvd", "neighborhood": "Civic", "city": "Bengaluru"},
            "capacity": {"seated": 100, "standing": 200, "formatted": "100/200"},
            "suitableCategories": ["Music", "Theatre"],
            "amenities": ["Full Rig"],
            "availabilityNotice": "Open",
            "availabilityStatus": "open_slots",
            "host": {"name": "Admin", "role": "Lead", "policy": "Platform"},
            "imageUrl": "https://example.com/img.jpg"
        }
    )
    assert res_venue_admin.status_code == 201
    print("✓ Admin token allowed to create venue (201 Created)")

    print("\n--- 5. Testing Request Lifecycle (Create -> Edit -> Return -> Resubmit -> Approve -> Material Alteration) ---")
    # Performer creates request
    create_req_payload = {
        "performerId": "perf-mehta",
        "performerName": "Aarav Mehta & Clara Dubois",
        "performerHandle": "@mehta.dubois",
        "title": "Winter Acoustic Sunset Session",
        "artForm": "Music",
        "preferredLocation": "Mumbai Waterfront",
        "venueId": "venue-01",
        "venueName": "The Vault Amphitheater",
        "date": "2026-12-10",
        "time": "6:00 PM",
        "expectedAudienceSize": 80,
        "budget": 25000,
        "currency": "₹",
        "description": "Sunset ragas exploring classical and baroque harmony.",
        "technicalRider": "Natural acoustics, 2 condenser mics, acoustic carpet.",
        "durationMinutes": 75,
        "notes": "Prefer sunset golden hour."
    }
    res_req_create = client.post(
        "/api/requests",
        headers={"Authorization": f"Bearer {tokens['performer']}"},
        json=create_req_payload
    )
    assert res_req_create.status_code == 201
    req_obj = res_req_create.json()
    req_id = req_obj["id"]
    assert req_obj["status"] == "pending"
    assert req_obj["technicalRider"] == "Natural acoustics, 2 condenser mics, acoustic carpet."
    assert req_obj["durationMinutes"] == 75
    assert len(req_obj["statusHistory"]) >= 1
    print(f"✓ Pitch created with id '{req_id}', status 'pending', history tracked")

    # Performer edits non-material fields
    res_req_edit = client.put(
        f"/api/requests/{req_id}",
        headers={"Authorization": f"Bearer {tokens['performer']}"},
        json={"description": "Updated sunset description with added cello solo.", "durationMinutes": 90}
    )
    assert res_req_edit.status_code == 200
    edited_obj = res_req_edit.json()
    assert edited_obj["status"] == "pending"
    assert edited_obj["durationMinutes"] == 90
    print("✓ Performer edited request details; status remains 'pending'")

    # Venue Provider returns request for changes
    res_return = client.patch(
        f"/api/requests/{req_id}/status",
        headers={"Authorization": f"Bearer {tokens['provider']}"},
        json={"status": "returned", "reviewNote": "Please adjust time to 7:00 PM due to soundcheck window."}
    )
    assert res_return.status_code == 200
    returned_obj = res_return.json()
    assert returned_obj["status"] == "returned"
    assert "soundcheck window" in returned_obj["reviewNote"]
    print("✓ Stage Provider returned pitch for changes (status: 'returned')")

    # Performer resubmits request
    res_resubmit = client.post(
        f"/api/requests/{req_id}/resubmit",
        headers={"Authorization": f"Bearer {tokens['performer']}"}
    )
    assert res_resubmit.status_code == 200
    resubmitted_obj = res_resubmit.json()
    assert resubmitted_obj["status"] == "pending"
    print("✓ Performer resubmitted returned pitch (status: 'pending')")

    # Provider approves request
    res_approve = client.patch(
        f"/api/requests/{req_id}/status",
        headers={"Authorization": f"Bearer {tokens['provider']}"},
        json={"status": "approved", "reviewNote": "Approved for 7:00 PM slot."}
    )
    assert res_approve.status_code == 200
    approved_obj = res_approve.json()
    assert approved_obj["status"] == "approved"
    print("✓ Stage Provider approved pitch (status: 'approved')")

    # Performer makes MATERIAL alteration (changes date to 2026-12-15) -> reverts to pending!
    res_mat_edit = client.put(
        f"/api/requests/{req_id}",
        headers={"Authorization": f"Bearer {tokens['performer']}"},
        json={"date": "2026-12-15"}
    )
    assert res_mat_edit.status_code == 200
    mat_obj = res_mat_edit.json()
    assert mat_obj["status"] == "pending", f"Expected status 'pending' after material date change, got {mat_obj['status']}"
    assert "Material terms altered" in mat_obj["reviewNote"]
    print("✓ Material change (date) correctly reverted approved pitch to 'pending' with warning review note")

    # Performer withdraws pitch
    res_withdraw = client.post(
        f"/api/requests/{req_id}/withdraw",
        headers={"Authorization": f"Bearer {tokens['performer']}"}
    )
    assert res_withdraw.status_code == 200
    withdrawn_obj = res_withdraw.json()
    assert withdrawn_obj["status"] == "withdrawn"
    print("✓ Performer withdrew pitch (status: 'withdrawn')")

    # Editing a withdrawn pitch fails
    res_edit_withdrawn = client.put(
        f"/api/requests/{req_id}",
        headers={"Authorization": f"Bearer {tokens['performer']}"},
        json={"title": "Trying to edit withdrawn"}
    )
    assert res_edit_withdrawn.status_code == 400
    print("✓ Editing withdrawn pitch rejected (400 Bad Request)")

    print("\n--- 6. Authentication Enforcement on Protected vs Public Endpoints ---")
    # Public catalog read: GET /api/requests without credentials -> 200 OK
    res_unauth_get = client.get("/api/requests")
    assert res_unauth_get.status_code == 200
    print("✓ Public catalog GET /api/requests accessible without credentials (200 OK)")

    # Protected mutation: POST /api/requests without credentials -> strict 401 Unauthorized
    res_unauth_post = client.post("/api/requests", json=create_req_payload)
    assert res_unauth_post.status_code == 401, f"Expected 401 for unauthenticated request creation, got {res_unauth_post.status_code}"
    print("✓ Protected POST /api/requests strictly rejected without credentials (401 Unauthorized)")

    print("\n========================================================")
    print("ALL AUTH & REQUEST LIFECYCLE TESTS PASSED PERFECTLY (100%)")
    print("========================================================")

if __name__ == "__main__":
    run_tests()

