import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def login(email, password):
    data = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res["token"]

def auth_get(path, token):
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"Authorization": f"Bearer {token}"},
        method="GET"
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode("utf-8")

def auth_put(path, token, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode("utf-8")

def auth_post(path, token, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode("utf-8")

def main():
    print("=== Testing STAGE Product Transformation Endpoints ===\n")
    
    # 1. Authenticate Aarav Mehta (Performer)
    print("[1] Authenticating Performer (aarav@stage.live)...")
    token = login("aarav@stage.live", "stage2026")
    assert token, "Login failed: token is empty"
    print("  ✓ Login successful.")

    # 2. Test GET /api/users/me/settings
    print("\n[2] Testing GET /api/users/me/settings...")
    status, body = auth_get("/api/users/me/settings", token)
    assert status == 200, f"Expected 200, got {status}"
    settings = json.loads(body)
    assert "theme" in settings, "Theme not in settings"
    assert "ai_recommendations" in settings, "AI recommendations setting missing"
    assert "proactive_ai_assistance" in settings, "Proactive AI setting missing"
    assert "calendar_sync_enabled" in settings, "Calendar sync setting missing"
    print(f"  ✓ User settings retrieved: theme={settings['theme']}, ai_recs={settings['ai_recommendations']}, calendar={settings['calendar_sync_enabled']}.")

    # 3. Test PUT /api/users/me/settings
    print("\n[3] Testing PUT /api/users/me/settings...")
    status, body = auth_put("/api/users/me/settings", token, {
        "theme": "dark",
        "email_notifications": True,
        "ai_recommendations": True,
        "proactive_ai_assistance": True,
        "calendar_sync_enabled": True,
        "reminder_advance_hours": 48
    })
    assert status == 200, f"Expected 200, got {status}"
    updated_settings = json.loads(body)
    assert updated_settings["theme"] == "dark", f"Theme update failed: {updated_settings}"
    assert updated_settings["reminder_advance_hours"] == 48, "Reminder advance hours update failed"
    print("  ✓ User settings updated successfully.")

    # 4. Test PUT /api/users/me/profile
    print("\n[4] Testing PUT /api/users/me/profile...")
    status, body = auth_put("/api/users/me/profile", token, {
        "name": "Aarav Mehta & Clara Dubois",
        "bio": "Indo-Classical sitar & baroque French cello chamber ensemble."
    })
    assert status == 200, f"Expected 200, got {status}"
    profile = json.loads(body)
    assert profile["name"] == "Aarav Mehta & Clara Dubois"
    print("  ✓ Profile updated successfully.")

    # 5. Test GET /api/users/me/reminders
    print("\n[5] Testing GET /api/users/me/reminders...")
    status, body = auth_get("/api/users/me/reminders", token)
    assert status == 200, f"Expected 200, got {status}"
    reminders_data = json.loads(body)
    assert "reminders" in reminders_data, "reminders key should be in response"
    assert isinstance(reminders_data["reminders"], list), "Reminders should be a list"
    print(f"  ✓ Reminders retrieved ({len(reminders_data['reminders'])} active items).")

    # 6. Test GET /api/users/me/calendar.ics
    print("\n[6] Testing GET /api/users/me/calendar.ics (RFC 5545 iCalendar)...")
    status, body = auth_get("/api/users/me/calendar.ics", token)
    assert status == 200, f"Expected 200, got {status}"
    assert "BEGIN:VCALENDAR" in body, "Missing BEGIN:VCALENDAR"
    assert "VERSION:2.0" in body, "Missing VERSION:2.0"
    assert "PRODID:-//STAGE Platform//Cultural Events Calendar//EN" in body, "Missing PRODID"
    assert "END:VCALENDAR" in body, "Missing END:VCALENDAR"
    print(f"  ✓ iCalendar .ics stream validated successfully ({len(body)} bytes).")

    # 7. Test OAuth Providers endpoint
    print("\n[7] Testing GET /api/auth/oauth/providers...")
    req = urllib.request.Request(f"{BASE_URL}/api/auth/oauth/providers")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        providers = json.loads(resp.read().decode("utf-8"))
        assert "google" in providers, "Google provider missing"
        assert "phone" in providers, "Phone provider missing"
        print(f"  ✓ OAuth providers retrieved: {[k for k in providers]}.")

    # 8. Test Phone OTP endpoints
    print("\n[8] Testing Phone OTP endpoints...")
    otp_req_data = json.dumps({"phone": "+919876543210"}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/phone/send-otp",
        data=otp_req_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        otp_res = json.loads(resp.read().decode("utf-8"))
        assert otp_res["status"] == "otp_sent"
        print(f"  ✓ Phone OTP dispatch returned status: {otp_res['status']}.")

    # Test Phone OTP verification
    verify_req_data = json.dumps({
        "phone": "+919876543210",
        "code": "123456",
        "role": "audience"
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/phone/verify-otp",
        data=verify_req_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        verify_res = json.loads(resp.read().decode("utf-8"))
        assert "token" in verify_res, "Verification failed to return token"
        assert "phone_919876543210" in verify_res["user"]["email"]
        assert verify_res["user"]["role"] == "audience"
        print(f"  ✓ Phone OTP verification succeeded for user {verify_res['user']['id']} (role={verify_res['user']['role']}).")

    # 9. Test AI Command Drawer Backend with Telemetry
    print("\n[9] Testing AI Command endpoint with agent telemetry...")
    status, body = auth_post("/api/ai/command", token, {
        "user_id": "usr-aarav",
        "message": "Find an acoustic stage in Bangalore for classical violin performance"
    })
    assert status == 200, f"Expected 200, got {status}"
    ai_res = json.loads(body)
    assert "final_response" in ai_res, "final_response missing"
    assert "execution_mode" in ai_res, "execution_mode missing"
    assert "agent_execution_events" in ai_res, "agent_execution_events missing"
    print(f"  ✓ AI Command succeeded: mode={ai_res['execution_mode']}, events={len(ai_res['agent_execution_events'])}, length={len(ai_res['final_response'])} chars.")

    print("\nALL PRODUCT TRANSFORMATION VERIFICATIONS PASSED CLEANLY (100%)!")

if __name__ == "__main__":
    main()
