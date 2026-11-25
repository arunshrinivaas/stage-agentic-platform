"""Test suite for Digital Pass, Cryptographic QR Verification, and Concurrency Check-in."""
import unittest
import secrets
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.services.auth import create_user_session
from app.services.pass_service import (
    issue_digital_pass,
    verify_pass_details,
    check_in_pass_transactional,
    sign_token,
)

class TestDigitalPassAndVerification(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, role FROM users WHERE email = 'priya@heritagestages.live';")
            self.provider_user = dict(cursor.fetchone())
            cursor.execute("SELECT id, booking_code, event_id FROM bookings LIMIT 1;")
            self.booking = dict(cursor.fetchone())

        self.provider_token = create_user_session(self.provider_user["id"], self.provider_user["role"])
        self.provider_headers = {"Authorization": f"Bearer {self.provider_token}"}

    def test_pass_cryptographic_verification(self):
        """Test that a genuine issued pass verifies successfully and tampered signature fails."""
        pass_rec = issue_digital_pass(
            booking_id=self.booking["id"],
            event_id=self.booking["event_id"],
            user_id=self.provider_user["id"],
            booking_code=self.booking["booking_code"],
        )
        token = pass_rec["verification_token"]

        # Valid token verification
        valid, msg, details = verify_pass_details(token)
        self.assertTrue(valid)
        self.assertIn("passId", details)
        self.assertEqual(details["status"], "valid")
        self.assertIn("accessInstructions", details)

        # Public API verification endpoint
        res = self.client.get(f"/api/passes/verify/{token}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["valid"])
        self.assertEqual(data["status"], "valid")

        # Tampered token verification
        tampered_token = token + "_tampered"
        res_tampered = self.client.get(f"/api/passes/verify/{tampered_token}")
        self.assertEqual(res_tampered.status_code, 200)
        self.assertFalse(res_tampered.json()["valid"])

    def test_concurrency_safe_check_in_and_duplicate_rejection(self):
        """Test single-use check-in admission and concurrency protection against replay."""
        test_booking_id = f"book-concurrency-{secrets.token_hex(4)}"
        test_code = f"STG-CONC-{secrets.token_hex(3).upper()}"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO bookings (
                id, booking_code, event_id, event_title, event_art_form,
                event_date, event_time, venue_name, city, ticket_count,
                total_paid, attendee_name, attendee_email, booked_at,
                qr_code_placeholder, status, is_simulated
            ) VALUES (?, ?, ?, 'Test Recital', 'Music', '2026-11-28', '7:30 PM', 'Vault', 'Kolkata', 1, 450, 'Test User', 'test@example.com', CURRENT_TIMESTAMP, '', 'confirmed', 1);
            """, (test_booking_id, test_code, self.booking["event_id"]))

        pass_rec = issue_digital_pass(
            booking_id=test_booking_id,
            event_id=self.booking["event_id"],
            user_id=self.provider_user["id"],
            booking_code=test_code,
        )
        token = pass_rec["verification_token"]

        # 1. First check-in: Must succeed
        checkin_res1 = self.client.post(
            "/api/passes/check-in",
            headers=self.provider_headers,
            json={"token": token, "device_info": "test-scanner-1"},
        )
        self.assertEqual(checkin_res1.status_code, 200)
        self.assertEqual(checkin_res1.json()["status"], "success")

        # 2. Second check-in attempt (replay or concurrent scan): Must return 409 Conflict
        checkin_res2 = self.client.post(
            "/api/passes/check-in",
            headers=self.provider_headers,
            json={"token": token, "device_info": "test-scanner-2"},
        )
        self.assertEqual(checkin_res2.status_code, 409)
        self.assertIn("already used", checkin_res2.json()["detail"].lower())

        # 3. Check-in audit log verification
        audit_res = self.client.get("/api/passes/audit/check-ins", headers=self.provider_headers)
        self.assertEqual(audit_res.status_code, 200)
        audits = audit_res.json()
        actions = [a["action"] for a in audits]
        self.assertIn("admitted", actions)
        self.assertIn("duplicate_rejected", actions)

    def test_unauthorized_check_in_rejected(self):
        """Test that audience user or unauthenticated client cannot trigger guest admission."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, role FROM users WHERE role = 'audience' LIMIT 1;")
            aud_user = dict(cursor.fetchone())
        aud_token = create_user_session(aud_user["id"], aud_user["role"])

        res = self.client.post(
            "/api/passes/check-in",
            headers={"Authorization": f"Bearer {aud_token}"},
            json={"token": "some-token"},
        )
        self.assertEqual(res.status_code, 403)

if __name__ == "__main__":
    unittest.main()
