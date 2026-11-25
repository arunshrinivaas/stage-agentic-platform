"""STAGE Role Authentication & AI Command Centre Rehearsal Verification.
Tests all 5 demo roles, permission boundaries, and AI Command Centre query routing.
"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

DEMO_USERS = [
    {"email": "aarav@stage.live", "expected_role": "performer", "user_id": "usr-aarav", "name": "Aarav Sen"},
    {"email": "priya@heritagestages.live", "expected_role": "provider", "user_id": "usr-heritage", "name": "Priya Sharma"},
    {"email": "rhea.sen@example.com", "expected_role": "audience", "user_id": "usr-rhea", "name": "Rhea Sen"},
    {"email": "organizer@deltamelody.org", "expected_role": "organiser", "user_id": "usr-delta", "name": "Kabir Mehta"},
]
PASSWORD = "stage2026"
ADMIN_SECRET = "stage_admin_key_2026"

def verify_roles():
    print("=== [1/2] Verifying Authenticated Role Workflows ===")
    tokens = {}

    # Verify 4 Core Role Logins
    for user in DEMO_USERS:
        email = user["email"]
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": PASSWORD})
        assert resp.status_code == 200, f"Login failed for {email}: {resp.status_code} {resp.text}"
        data = resp.json()
        assert "token" in data, f"Token missing for {email}"
        assert data["user"]["role"] == user["expected_role"], f"Role mismatch for {email}: expected {user['expected_role']}, got {data['user']['role']}"
        tokens[user["expected_role"]] = data["token"]
        print(f"  ✓ {user['expected_role'].upper()}: {email} authenticated successfully. User ID: {data['user']['id']}, Role: {data['user']['role']}")

    # Verify Admin Access Boundary (Header + Secret on protected POST /api/venues)
    print("\n  Verifying Admin Security Boundaries...")
    import uuid
    venue_uid = uuid.uuid4().hex[:6]
    test_venue_payload = {
        "name": f"Rehearsal Admin Test Venue {venue_uid}",
        "venueType": "Loft",
        "location": {"address": "1 Rehearsal Rd", "neighborhood": "Downtown", "city": "Kolkata"},
        "capacity": {"seated": 50, "standing": 100, "formatted": "50/100"},
        "suitableCategories": ["Music"],
        "amenities": ["Acoustics"],
        "availabilityNotice": "Rehearsal",
        "availabilityStatus": "open_slots",
        "host": {"name": "Admin Tester", "role": "admin", "policy": "Test policy"},
        "imageUrl": ""
    }

    # 1. Missing Admin Secret -> 403
    adm_missing = requests.post(
        f"{BASE_URL}/api/venues",
        headers={"X-STAGE-Role": "admin"},
        json=test_venue_payload
    )
    assert adm_missing.status_code == 403, f"Expected 403 for missing admin secret, got {adm_missing.status_code}"
    print("  ✓ Admin rejected with 403 when secret is omitted.")

    # 2. Invalid Admin Secret -> 403
    adm_invalid = requests.post(
        f"{BASE_URL}/api/venues",
        headers={"X-STAGE-Role": "admin", "X-STAGE-Admin-Secret": "invalid_secret"},
        json=test_venue_payload
    )
    assert adm_invalid.status_code == 403, f"Expected 403 for invalid admin secret, got {adm_invalid.status_code}"
    print("  ✓ Admin rejected with 403 when providing invalid secret.")

    # 3. Valid Admin Secret -> 201 Created
    adm_valid = requests.post(
        f"{BASE_URL}/api/venues",
        headers={"X-STAGE-Role": "admin", "X-STAGE-Admin-Secret": ADMIN_SECRET},
        json=test_venue_payload
    )
    assert adm_valid.status_code == 201, f"Admin valid secret failed: {adm_valid.status_code}"
    created_venue_id = adm_valid.json().get("id")
    print(f"  ✓ Admin authorized with valid X-STAGE-Admin-Secret (Created test venue {created_venue_id}).")

    # Clean up test venue
    if created_venue_id:
        requests.delete(
            f"{BASE_URL}/api/venues/{created_venue_id}",
            headers={"X-STAGE-Role": "admin", "X-STAGE-Admin-Secret": ADMIN_SECRET}
        )

    # Security Boundary Checks
    print("\n  Verifying Security Boundaries & Permissions...")
    # 1. Unauthenticated access
    unauth_resp = requests.get(f"{BASE_URL}/api/auth/me")
    assert unauth_resp.status_code == 401, f"Unauthenticated request should return 401, got {unauth_resp.status_code}"
    print("  ✓ Unauthenticated access to /api/auth/me rejected with 401.")

    # 2. Authenticated user identity
    for role, token in tokens.items():
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200, f"/api/auth/me failed for {role}"
        assert me_resp.json()["role"] == role
    print("  ✓ /api/auth/me verified for all 4 authenticated roles.")

    # 3. Role-specific resource endpoints
    # Performer requests
    perf_resp = requests.get(f"{BASE_URL}/api/requests", headers={"Authorization": f"Bearer {tokens['performer']}"})
    assert perf_resp.status_code == 200, f"Performer requests fetch failed: {perf_resp.status_code}"
    print(f"  ✓ Performer fetched {len(perf_resp.json())} requests.")

    # Provider venues
    prov_resp = requests.get(f"{BASE_URL}/api/venues")
    assert prov_resp.status_code == 200, f"Venues fetch failed: {prov_resp.status_code}"
    print(f"  ✓ Stage Provider accessed {len(prov_resp.json())} venues.")

    # Audience bookings
    aud_resp = requests.get(f"{BASE_URL}/api/bookings", headers={"Authorization": f"Bearer {tokens['audience']}"})
    assert aud_resp.status_code == 200, f"Audience bookings fetch failed: {aud_resp.status_code}"
    print(f"  ✓ Audience fetched {len(aud_resp.json())} bookings.")

    # Organiser campaigns / causes
    org_resp = requests.get(f"{BASE_URL}/api/causes")
    assert org_resp.status_code == 200, f"Causes fetch failed: {org_resp.status_code}"
    print(f"  ✓ Organiser fetched {len(org_resp.json())} civic impact causes.")

    return tokens

def verify_ai_command_centre(tokens):
    print("\n=== [2/2] Verifying AI Command Centre Workflows ===")

    # Test 1: StageMatch query
    stage_query = {
        "message": "Find an acoustic stage in Kolkata for classical sitar with 50 seats",
        "user_id": "usr-aarav"
    }
    print(f"  Querying StageMatch: '{stage_query['message']}'...")
    resp1 = requests.post(
        f"{BASE_URL}/api/ai/command",
        json=stage_query,
        headers={"Authorization": f"Bearer {tokens['performer']}"}
    )
    assert resp1.status_code == 200, f"AI command failed: {resp1.status_code} {resp1.text}"
    result1 = resp1.json()
    exec_mode1 = result1.get("execution_mode", "unknown")
    specialists1 = result1.get("selected_specialist_agents", [])
    text1 = result1.get("final_response", "")
    events1 = result1.get("agent_execution_events", [])
    print(f"  ✓ StageMatch Response received.")
    print(f"    - Execution Mode: {exec_mode1}")
    print(f"    - Specialists Selected: {specialists1}")
    print(f"    - Events recorded: {len(events1)}")
    print(f"    - Final response length: {len(text1)} chars")
    assert len(text1) > 50, "Response content should be informative"
    assert any("stage_match" in s for s in specialists1), f"Expected stage_match in specialists: {specialists1}"

    # Test 2: CivicAssist query
    civic_query = {
        "message": "What are the sound limit rules and noise curfew guidelines in South Kolkata?",
        "user_id": "usr-heritage"
    }
    print(f"\n  Querying CivicAssist: '{civic_query['message']}'...")
    resp2 = requests.post(
        f"{BASE_URL}/api/ai/command",
        json=civic_query,
        headers={"Authorization": f"Bearer {tokens['provider']}"}
    )
    assert resp2.status_code == 200, f"AI command failed: {resp2.status_code} {resp2.text}"
    result2 = resp2.json()
    exec_mode2 = result2.get("execution_mode", "unknown")
    specialists2 = result2.get("selected_specialist_agents", [])
    text2 = result2.get("final_response", "")
    events2 = result2.get("agent_execution_events", [])
    print(f"  ✓ CivicAssist Response received.")
    print(f"    - Execution Mode: {exec_mode2}")
    print(f"    - Specialists Selected: {specialists2}")
    print(f"    - Events recorded: {len(events2)}")
    print(f"    - Final response length: {len(text2)} chars")
    assert len(text2) > 50, "Response content should be informative"
    assert any("civic_assist" in s for s in specialists2), f"Expected civic_assist in specialists: {specialists2}"

    print("\nALL ROLE & AI COMMAND CENTRE VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    tokens = verify_roles()
    verify_ai_command_centre(tokens)
