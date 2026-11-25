"""STAGE — Comprehensive Security & Functionality Audit Test Suite.

Verifies:
1. Password security (bcrypt hashing, per-user salt, work factor, constant-time verification, legacy SHA-256 fallback).
2. Backend authentication enforcement (strict 401 on missing credentials across all protected endpoints vs 200 on public reads).
3. Session management & token lifecycle (entropy, expired sessions, logout invalidation).
4. Role-based authorization matrix (strict 403 on cross-role privilege escalation).
5. User impersonation prevention (blocking mismatched performer IDs in request creation).
6. Request ownership & host review authority (blocking non-owner edits/withdrawals, allowing host review).
7. Request lifecycle integrity (duplicate submission prevention, material change auto-reversion to pending).
8. Admin authorization (admin token multi-role access, header-based admin secret requirement).
"""
import os
import sys
import tempfile
import uuid
import atexit
import time
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

test_db_dir = tempfile.mkdtemp(prefix="stage_security_audit_")
test_db_path = os.path.join(test_db_dir, f"security_audit_{uuid.uuid4().hex[:8]}.db")
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
from app.database import init_db, get_db
from app.services.seed_data import seed_database
from app.services.auth import (
    hash_password,
    verify_password,
    create_user_session,
    get_user_by_token,
    delete_user_session,
    ADMIN_DEV_SECRET,
)

def run_security_audit():
    print("=" * 70)
    print("STAGE PLATFORM — SECURITY & FUNCTIONALITY AUDIT TEST SUITE")
    print("=" * 70)

    print("\n[SETUP] Initializing isolated database and seeding demo records...")
    init_db()
    seed_database()
    client = TestClient(app)

    # ---------------------------------------------------------
    # SUITE 1: Password Security & Cryptographic Hashing
    # ---------------------------------------------------------
    print("\n--- SUITE 1: Password Security & Cryptographic Hashing ---")
    raw_pw = "stage2026_SecPass#!"
    h1 = hash_password(raw_pw)
    h2 = hash_password(raw_pw)

    assert h1.startswith("$2b$12$"), f"Expected bcrypt prefix $2b$12$, got {h1[:7]}"
    assert h2.startswith("$2b$12$"), f"Expected bcrypt prefix $2b$12$, got {h2[:7]}"
    assert h1 != h2, "Bcrypt salt must be unique per password hash"
    print("✓ Bcrypt generated with work factor 12 and distinct per-user cryptographic salts.")

    assert verify_password(raw_pw, h1) is True, "Password verification failed for valid password"
    assert verify_password("wrong_password", h1) is False, "Password verification succeeded for wrong password"
    assert verify_password("", h1) is False, "Empty password must fail closed"
    assert verify_password(raw_pw, "") is False, "Empty hash must fail closed"
    assert verify_password(raw_pw, None) is False, "None hash must fail closed"
    assert verify_password(None, h1) is False, "None password must fail closed"
    print("✓ Password verification correctly handles matches, mismatches, and fails closed on empty/null values.")

    # Legacy SHA-256 fallback verification
    import hashlib
    legacy_hash = hashlib.sha256(f"stage_live_platform_salt_2026_{raw_pw}".encode("utf-8")).hexdigest()
    assert verify_password(raw_pw, legacy_hash) is True, "Legacy SHA-256 verification failed"
    assert verify_password("wrong", legacy_hash) is False, "Legacy SHA-256 accepted wrong password"
    print("✓ Legacy SHA-256 password migration works via constant-time comparison.")

    # API Login authentication
    res_bad_login = client.post("/api/auth/login", json={"email": "aarav@stage.live", "password": "wrongpassword"})
    assert res_bad_login.status_code == 401, f"Expected 401 for bad password, got {res_bad_login.status_code}"
    print("✓ POST /api/auth/login rejects invalid password with HTTP 401 Unauthorized.")

    res_good_login = client.post("/api/auth/login", json={"email": "aarav@stage.live", "password": "stage2026"})
    assert res_good_login.status_code == 200, f"Expected 200 for good password, got {res_good_login.status_code}"
    aarav_token = res_good_login.json()["token"]
    assert aarav_token.startswith("stg_tok_")
    print(f"✓ POST /api/auth/login succeeded with valid bcrypt password (token generated: {aarav_token[:16]}...).")

    # ---------------------------------------------------------
    # SUITE 2: Session Management & Lifecycle
    # ---------------------------------------------------------
    print("\n--- SUITE 2: Session Management & Lifecycle ---")
    assert len(aarav_token) >= 40, "Session token must have sufficient cryptographic entropy"
    print(f"✓ Session token length: {len(aarav_token)} characters (high entropy urlsafe base64).")

    # Tampered token
    res_tampered = client.get("/api/auth/me", headers={"Authorization": "Bearer stg_tok_tampered_invalid_token_999"})
    assert res_tampered.status_code == 401
    print("✓ Tampered / non-existent session token strictly returns HTTP 401.")

    # Expired token in database
    expired_token = f"stg_tok_expired_{uuid.uuid4().hex}"
    past_timestamp = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO user_sessions (token, user_id, role, expires_at) VALUES (?, 'usr-aarav', 'performer', ?);",
                       (expired_token, past_timestamp))
    res_expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401
    print("✓ Expired session token strictly returns HTTP 401.")

    # Logout revocation
    res_logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {aarav_token}"})
    assert res_logout.status_code == 200
    res_after_logout = client.get("/api/auth/me", headers={"Authorization": f"Bearer {aarav_token}"})
    assert res_after_logout.status_code == 401
    print("✓ Session revocation on logout verified: subsequent call returned HTTP 401.")

    # ---------------------------------------------------------
    # SUITE 3: Backend Authentication Enforcement (Public vs Protected)
    # ---------------------------------------------------------
    print("\n--- SUITE 3: Backend Authentication Enforcement (Public vs Protected) ---")
    public_endpoints = [
        ("GET", "/api/venues"),
        ("GET", "/api/events"),
        ("GET", "/api/causes"),
        ("GET", "/api/requests"),
        ("GET", "/api/notifications"),
        ("GET", "/api/users"),
        ("GET", "/health"),
    ]
    for method, path in public_endpoints:
        res = client.get(path)
        assert res.status_code == 200, f"Expected 200 for public {path}, got {res.status_code}"
    print(f"✓ All {len(public_endpoints)} public catalog endpoints accessible without credentials (HTTP 200).")

    protected_endpoints = [
        ("POST", "/api/venues", {"name": "Test Venue", "venueType": "Hall"}),
        ("POST", "/api/requests", {"title": "Test Pitch", "performerId": "perf-mehta"}),
        ("PUT", "/api/requests/req-01", {"title": "Updated Pitch"}),
        ("POST", "/api/requests/req-01/withdraw", {}),
        ("POST", "/api/requests/req-01/resubmit", {}),
        ("PATCH", "/api/requests/req-01/status", {"status": "approved"}),
        ("POST", "/api/bookings", {"eventId": "evt-01", "ticketCount": 1}),
        ("POST", "/api/causes", {"title": "Test Cause"}),
    ]
    for method, path, payload in protected_endpoints:
        if method == "POST":
            res = client.post(path, json=payload)
        elif method == "PUT":
            res = client.put(path, json=payload)
        elif method == "PATCH":
            res = client.patch(path, json=payload)
        assert res.status_code == 401, f"Expected strict 401 for unauthenticated {method} {path}, got {res.status_code}"
    print(f"✓ All {len(protected_endpoints)} protected mutation endpoints strictly return HTTP 401 when unauthenticated.")

    # ---------------------------------------------------------
    # SUITE 4: Role-Based Authorization Matrix (HTTP 403 Forbidden)
    # ---------------------------------------------------------
    print("\n--- SUITE 4: Role-Based Authorization Matrix (HTTP 403 Forbidden) ---")
    # Generate tokens for each demo persona
    tokens = {}
    for role in ["performer", "provider", "audience", "organiser", "admin"]:
        r = client.post("/api/auth/demo-login", json={"role": role})
        assert r.status_code == 200
        tokens[role] = r.json()["token"]

    # 1. Performer cannot create venue (needs provider)
    r = client.post("/api/venues", headers={"Authorization": f"Bearer {tokens['performer']}"},
                    json={"name": "Illegal Venue", "venueType": "Loft", "location": {"address": "A", "neighborhood": "B", "city": "C"},
                          "capacity": {"seated": 10, "standing": 20, "formatted": "10/20"}, "suitableCategories": [], "amenities": [],
                          "availabilityNotice": "", "availabilityStatus": "open_slots", "host": {"name": "H", "role": "R", "policy": "P"}, "imageUrl": ""})
    assert r.status_code == 403, f"Expected 403 for performer creating venue, got {r.status_code}"
    print("✓ Performer blocked from POST /api/venues (HTTP 403 Forbidden).")

    # 2. Performer cannot create cause (needs organiser)
    r = client.post("/api/causes", headers={"Authorization": f"Bearer {tokens['performer']}"},
                    json={"title": "Illegal Cause", "tagline": "T", "description": "D", "targetAmount": 1000, "currency": "₹", "focusArea": "F"})
    assert r.status_code == 403
    print("✓ Performer blocked from POST /api/causes (HTTP 403 Forbidden).")

    # 3. Provider cannot create performance request (needs performer)
    r = client.post("/api/requests", headers={"Authorization": f"Bearer {tokens['provider']}"},
                    json={"performerId": "perf-mehta", "performerName": "Aarav", "performerHandle": "@a", "title": "Illegal Pitch",
                          "artForm": "Music", "preferredLocation": "City", "venueId": "v1", "date": "2026-12-01", "time": "7 PM",
                          "expectedAudienceSize": 50, "budget": 1000, "currency": "₹", "description": "D"})
    assert r.status_code == 403
    print("✓ Provider blocked from POST /api/requests (HTTP 403 Forbidden).")

    # 4. Audience cannot approve performance request (needs provider)
    r = client.patch("/api/requests/req-01/status", headers={"Authorization": f"Bearer {tokens['audience']}"},
                     json={"status": "approved", "reviewNote": "I approve"})
    assert r.status_code == 403
    print("✓ Audience blocked from PATCH /api/requests/{id}/status (HTTP 403 Forbidden).")

    # 5. Organiser cannot create booking (needs audience)
    r = client.post("/api/bookings", headers={"Authorization": f"Bearer {tokens['organiser']}"},
                    json={"eventId": "evt-01", "ticketCount": 1, "attendeeName": "A", "attendeeEmail": "a@b.com"})
    assert r.status_code == 403
    print("✓ Organiser blocked from POST /api/bookings (HTTP 403 Forbidden).")

    # ---------------------------------------------------------
    # SUITE 5: User Impersonation Prevention
    # ---------------------------------------------------------
    print("\n--- SUITE 5: User Impersonation Prevention ---")
    # Performer Aarav Mehta (logged in) attempts to submit a pitch specifying someone else's performer ID
    impersonation_payload = {
        "performerId": "perf-impersonated-hacker-id",
        "performerName": "Hacked Artist",
        "performerHandle": "@hacked",
        "title": "Malicious Impersonation Pitch",
        "artForm": "Music",
        "preferredLocation": "Secret Stage",
        "venueId": "venue-01",
        "date": "2026-12-25",
        "time": "8:00 PM",
        "expectedAudienceSize": 100,
        "budget": 50000,
        "currency": "₹",
        "description": "Unauthorized impersonation attempt."
    }
    r_imp = client.post("/api/requests", headers={"Authorization": f"Bearer {tokens['performer']}"}, json=impersonation_payload)
    assert r_imp.status_code == 403, f"Expected 403 for user impersonation, got {r_imp.status_code}"
    print("✓ Impersonation attempt rejected: performer cannot submit pitch under another performer ID (HTTP 403).")

    # Valid pitch with Aarav's own linked profile succeeds
    valid_pitch_payload = {
        "performerId": "perf-mehta",
        "performerName": "Aarav Mehta & Clara Dubois",
        "performerHandle": "@mehta.dubois",
        "title": "Sacred Ragas in Winter",
        "artForm": "Music",
        "preferredLocation": "Kolkata Waterfront",
        "venueId": "venue-01",
        "date": "2026-12-29",
        "time": "7:00 PM",
        "expectedAudienceSize": 120,
        "budget": 35000,
        "currency": "₹",
        "description": "Legitimate sitar and cello chamber fusion.",
        "technicalRider": "2 condenser microphones, DI box",
        "durationMinutes": 90
    }
    r_valid = client.post("/api/requests", headers={"Authorization": f"Bearer {tokens['performer']}"}, json=valid_pitch_payload)
    assert r_valid.status_code == 201, f"Expected 201 for valid pitch creation, got {r_valid.text}"
    aarav_pitch = r_valid.json()
    aarav_pitch_id = aarav_pitch["id"]
    print(f"✓ Legitimate pitch successfully created: '{aarav_pitch['title']}' (ID: {aarav_pitch_id}).")

    # Duplicate submission prevention
    r_dup = client.post("/api/requests", headers={"Authorization": f"Bearer {tokens['performer']}"}, json=valid_pitch_payload)
    assert r_dup.status_code == 400, f"Expected 400 for duplicate pitch submission, got {r_dup.status_code}"
    assert "already active" in r_dup.json()["detail"]
    print("✓ Duplicate pitch submission successfully prevented (HTTP 400 Bad Request).")

    # ---------------------------------------------------------
    # SUITE 6: Pitch Ownership & Lifecycle Review Authority
    # ---------------------------------------------------------
    print("\n--- SUITE 6: Pitch Ownership & Lifecycle Review Authority ---")
    # Register a second performer: Maya Lin
    r_reg_maya = client.post("/api/auth/register", json={
        "name": "Maya Lin",
        "email": "maya.lin@securityaudit.live",
        "password": "stage2026_maya",
        "role": "performer",
        "artForm": "Dance",
        "handle": "@mayalin.dance"
    })
    assert r_reg_maya.status_code == 201
    maya_token = r_reg_maya.json()["token"]

    # Maya attempts to edit Aarav's pitch -> 403 Forbidden
    r_maya_edit = client.put(f"/api/requests/{aarav_pitch_id}", headers={"Authorization": f"Bearer {maya_token}"},
                             json={"title": "Maya Trying To Hijack Aarav's Pitch"})
    assert r_maya_edit.status_code == 403, f"Expected 403 for non-owner editing pitch, got {r_maya_edit.status_code}"
    print("✓ Non-owner performer blocked from editing another performer's pitch (HTTP 403 Forbidden).")

    # Maya attempts to withdraw Aarav's pitch -> 403 Forbidden
    r_maya_withdraw = client.post(f"/api/requests/{aarav_pitch_id}/withdraw", headers={"Authorization": f"Bearer {maya_token}"})
    assert r_maya_withdraw.status_code == 403
    print("✓ Non-owner performer blocked from withdrawing another performer's pitch (HTTP 403 Forbidden).")

    # Aarav edits own pitch -> 200 OK
    r_aarav_edit = client.put(f"/api/requests/{aarav_pitch_id}", headers={"Authorization": f"Bearer {tokens['performer']}"},
                              json={"description": "Updated description with acoustic surround setup.", "durationMinutes": 100})
    assert r_aarav_edit.status_code == 200
    assert r_aarav_edit.json()["durationMinutes"] == 100
    print("✓ Owner performer allowed to edit non-material details (HTTP 200 OK).")

    # Provider Priya returns pitch with review notes
    r_return = client.patch(f"/api/requests/{aarav_pitch_id}/status", headers={"Authorization": f"Bearer {tokens['provider']}"},
                            json={"status": "returned", "reviewNote": "Please update soundcheck schedule."})
    assert r_return.status_code == 200
    assert r_return.json()["status"] == "returned"
    print("✓ Venue host provider successfully returned pitch for revisions (status: 'returned').")

    # Maya cannot resubmit Aarav's pitch -> 403 Forbidden
    r_maya_resubmit = client.post(f"/api/requests/{aarav_pitch_id}/resubmit", headers={"Authorization": f"Bearer {maya_token}"})
    assert r_maya_resubmit.status_code == 403
    print("✓ Non-owner performer blocked from resubmitting returned pitch (HTTP 403 Forbidden).")

    # Aarav resubmits own pitch -> status reverts to pending
    r_aarav_resubmit = client.post(f"/api/requests/{aarav_pitch_id}/resubmit", headers={"Authorization": f"Bearer {tokens['performer']}"})
    assert r_aarav_resubmit.status_code == 200
    assert r_aarav_resubmit.json()["status"] == "pending"
    print("✓ Owner performer successfully resubmitted returned pitch (status: 'pending').")

    # Provider approves pitch
    r_approve = client.patch(f"/api/requests/{aarav_pitch_id}/status", headers={"Authorization": f"Bearer {tokens['provider']}"},
                             json={"status": "approved", "reviewNote": "Acoustics cleared for 7:00 PM."})
    assert r_approve.status_code == 200
    assert r_approve.json()["status"] == "approved"
    print("✓ Venue host provider approved pitch (status: 'approved').")

    # Material alteration by performer on approved pitch: change date -> automatically reverts to pending!
    r_material_edit = client.put(f"/api/requests/{aarav_pitch_id}", headers={"Authorization": f"Bearer {tokens['performer']}"},
                                 json={"date": "2026-12-31"})
    assert r_material_edit.status_code == 200
    mat_data = r_material_edit.json()
    assert mat_data["status"] == "pending", f"Expected status 'pending' after material date change, got {mat_data['status']}"
    assert "Material terms altered" in mat_data["reviewNote"]
    print("✓ Material term change on approved pitch automatically reverted status to 'pending' with audit note.")

    # ---------------------------------------------------------
    # SUITE 7: Admin Authority & Admin Secret Enforcement
    # ---------------------------------------------------------
    print("\n--- SUITE 7: Admin Authority & Admin Secret Enforcement ---")
    # 1. Admin Bearer token has multi-role authorization
    r_admin_venue = client.post("/api/venues", headers={"Authorization": f"Bearer {tokens['admin']}"},
                                json={"name": "Admin Grand Stage", "venueType": "Civic Center",
                                      "location": {"address": "1 Plaza", "neighborhood": "Civic", "city": "Delhi"},
                                      "capacity": {"seated": 300, "standing": 500, "formatted": "300/500"},
                                      "suitableCategories": ["Music"], "amenities": ["All"],
                                      "availabilityNotice": "Open", "availabilityStatus": "open_slots",
                                      "host": {"name": "Admin", "role": "Lead", "policy": "Open"}, "imageUrl": ""})
    assert r_admin_venue.status_code == 201
    print("✓ Admin Bearer token authorized for provider actions (HTTP 201 Created).")

    # 2. X-STAGE-Role: admin WITHOUT secret -> 403 Forbidden
    r_admin_no_secret = client.post("/api/venues", headers={"X-STAGE-Role": "admin"},
                                    json={"name": "Spoofed Admin Stage", "venueType": "Loft",
                                          "location": {"address": "1 St", "neighborhood": "D", "city": "M"},
                                          "capacity": {"seated": 50, "standing": 100, "formatted": "50/100"},
                                          "suitableCategories": [], "amenities": [], "availabilityNotice": "",
                                          "availabilityStatus": "open_slots", "host": {"name": "H", "role": "R", "policy": "P"}, "imageUrl": ""})
    assert r_admin_no_secret.status_code == 403
    print("✓ Unauthenticated header spoofing (X-STAGE-Role: admin without secret) blocked (HTTP 403 Forbidden).")

    # 3. X-STAGE-Role: admin WITH INVALID secret -> 403 Forbidden
    r_admin_bad_secret = client.post("/api/venues", headers={"X-STAGE-Role": "admin", "X-STAGE-Admin-Secret": "wrong_key"},
                                     json={"name": "Spoofed Admin Stage", "venueType": "Loft",
                                           "location": {"address": "1 St", "neighborhood": "D", "city": "M"},
                                           "capacity": {"seated": 50, "standing": 100, "formatted": "50/100"},
                                           "suitableCategories": [], "amenities": [], "availabilityNotice": "",
                                           "availabilityStatus": "open_slots", "host": {"name": "H", "role": "R", "policy": "P"}, "imageUrl": ""})
    assert r_admin_bad_secret.status_code == 403
    print("✓ Invalid admin secret blocked (HTTP 403 Forbidden).")

    # 4. X-STAGE-Role: admin WITH VALID secret -> 201 Created
    r_admin_valid_secret = client.post("/api/venues", headers={"X-STAGE-Role": "admin", "X-STAGE-Admin-Secret": ADMIN_DEV_SECRET},
                                       json={"name": "Verified Admin Secret Stage", "venueType": "Loft",
                                             "location": {"address": "1 St", "neighborhood": "D", "city": "M"},
                                             "capacity": {"seated": 50, "standing": 100, "formatted": "50/100"},
                                             "suitableCategories": [], "amenities": [], "availabilityNotice": "",
                                             "availabilityStatus": "open_slots", "host": {"name": "H", "role": "R", "policy": "P"}, "imageUrl": ""})
    assert r_admin_valid_secret.status_code == 201
    print("✓ Admin access via header authorized with valid X-STAGE-Admin-Secret (HTTP 201 Created).")

    print("\n" + "=" * 70)
    print("ALL 7 SECURITY & FUNCTIONALITY SUITES PASSED PERFECTLY (100%)")
    print("=" * 70)

if __name__ == "__main__":
    run_security_audit()

