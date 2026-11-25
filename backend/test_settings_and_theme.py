"""Test suite for Theme persistence, Settings, and Notification Preference Enforcement."""
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.services.auth import create_user_session

class TestSettingsAndTheme(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, role FROM users WHERE email = 'aarav@stage.live';")
            self.user = dict(cursor.fetchone())
        self.token = create_user_session(self.user["id"], self.user["role"])
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_theme_persistence_and_update(self):
        """Test theme setting can be updated to dark and remains persisted."""
        # Update theme to dark
        res = self.client.put(
            "/api/users/me/settings",
            headers=self.headers,
            json={"theme": "dark", "layout_density": "compact"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["theme"], "dark")
        self.assertEqual(data["layout_density"], "compact")

        # Fetch settings again to verify persistent storage
        get_res = self.client.get("/api/users/me/settings", headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["theme"], "dark")

        # Restore to system
        self.client.put("/api/users/me/settings", headers=self.headers, json={"theme": "system"})

    def test_notification_preference_toggles(self):
        """Test disabling notification categories persists in database."""
        res = self.client.put(
            "/api/users/me/settings",
            headers=self.headers,
            json={
                "email_notifications": False,
                "booking_confirmations": False,
                "request_status_updates": True,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["email_notifications"])
        self.assertFalse(data["booking_confirmations"])
        self.assertTrue(data["request_status_updates"])

        # Restore
        self.client.put(
            "/api/users/me/settings",
            headers=self.headers,
            json={"email_notifications": True, "booking_confirmations": True},
        )

    def test_ai_preference_toggles(self):
        """Test AI proactive assistance and category preference storage."""
        res = self.client.put(
            "/api/users/me/settings",
            headers=self.headers,
            json={
                "proactive_ai_assistance": False,
                "ai_recommendations": True,
                "ai_notification_preferences": "critical_only",
                "preferred_recommendation_categories": ["Classical Sitar", "Acoustic Chamber"],
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["proactive_ai_assistance"])
        self.assertEqual(data["ai_notification_preferences"], "critical_only")
        self.assertIn("Classical Sitar", data["preferred_recommendation_categories"])

        # Restore
        self.client.put(
            "/api/users/me/settings",
            headers=self.headers,
            json={"proactive_ai_assistance": True, "ai_notification_preferences": "all"},
        )

    def test_notification_read_endpoints(self):
        """Test marking individual notification and all notifications as read."""
        notifs_res = self.client.get("/api/notifications")
        self.assertEqual(notifs_res.status_code, 200)
        notifs = notifs_res.json()
        if notifs:
            first_id = notifs[0]["id"]
            patch_res = self.client.patch(f"/api/notifications/{first_id}/read")
            self.assertEqual(patch_res.status_code, 200)
            self.assertTrue(patch_res.json()["read"])

        all_res = self.client.post("/api/notifications/mark-all-read")
        self.assertEqual(all_res.status_code, 200)

    def test_no_secret_exposure(self):
        """Verify that settings responses never expose internal tokens or secrets."""
        res = self.client.get("/api/users/me/settings", headers=self.headers)
        body_text = res.text
        self.assertNotIn("password_hash", body_text)
        self.assertNotIn("admin_secret", body_text)
        self.assertNotIn("SECRET_KEY", body_text)

if __name__ == "__main__":
    unittest.main()
