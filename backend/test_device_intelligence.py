"""Test suite for Device Intelligence, Calendar Integration, Reminders, and Local MCP Bridge."""
import os
import unittest
from datetime import datetime, timezone
from app.services.reminder_service import (
    sync_user_reminders_from_platform_state,
    list_user_reminders,
    reschedule_reminder,
    update_reminder_status,
    create_custom_reminder,
)
from app.mcp_server.device_bridge import (
    BRIDGE_TOKEN,
    CalendarEventRequest,
    LocalReminderRequest,
    MapsNavRequest,
    SharePassRequest,
    create_calendar_event,
    create_local_reminder,
    open_maps_navigation,
    share_pass,
    companion_app,
)
from fastapi.testclient import TestClient

class TestDeviceIntelligenceAndBridge(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(companion_app)
        self.user_id = "usr-aarav"

    def test_local_bridge_health(self):
        """Test that device bridge reports loopback isolation and supported capabilities."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["loopback_only"])
        self.assertIn("calendar_event_creation", data["supported_capabilities"])
        self.assertIn("maps_navigation_deeplink", data["supported_capabilities"])

    def test_local_bridge_pairing(self):
        """Test client pairing with high-entropy token exchange."""
        res = self.client.post("/pair", json={"client_name": "Test Client", "session_id": "sess-test"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "paired")
        self.assertEqual(data["bridge_token"], BRIDGE_TOKEN)

    def test_calendar_event_creation_with_consent(self):
        """Test calendar event creation generates valid RFC 5545 iCal and deep links."""
        payload = CalendarEventRequest(
            title="Sitar & Cello Recital",
            start_iso="2026-11-28T19:30:00+05:30",
            location="The Vault Amphitheater, Kolkata",
            description="Acoustic recital booking",
            user_consent_granted=True,
        )
        res = create_calendar_event(payload)
        self.assertEqual(res["status"], "success")
        self.assertIn("BEGIN:VCALENDAR", res["ics_payload"])
        self.assertIn("SUMMARY:Sitar & Cello Recital", res["ics_payload"])
        self.assertIn("calendar.google.com", res["deep_links"]["google_calendar"])
        self.assertIn("outlook.live.com", res["deep_links"]["outlook_web"])

    def test_calendar_event_creation_requires_consent(self):
        """Test calendar event creation is blocked if user consent is false."""
        from fastapi import HTTPException
        payload = CalendarEventRequest(
            title="Unauthorized Event",
            start_iso="2026-11-28T19:30:00+05:30",
            location="Somewhere",
            description="",
            user_consent_granted=False,
        )
        with self.assertRaises(HTTPException):
            create_calendar_event(payload)

    def test_maps_navigation_sanitization(self):
        """Test map navigation deep links are properly URL-encoded and sanitized."""
        payload = MapsNavRequest(
            venue_name="The Vault Amphitheater",
            address="12 Strand Road",
            city="Kolkata",
        )
        res = open_maps_navigation(payload)
        self.assertEqual(res["status"], "success")
        self.assertIn("maps.apple.com", res["apple_maps_url"])
        self.assertIn("The%20Vault%20Amphitheater", res["apple_maps_url"])

    def test_pass_sharing_payload(self):
        """Test Web Share API payload construction."""
        payload = SharePassRequest(
            booking_code="STG-8821-KOL",
            verification_url="http://localhost:3000/verify-pass?token=test_tok",
            event_title="Echoes of the Ghats",
        )
        res = share_pass(payload)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["share_data"]["url"], "http://localhost:3000/verify-pass?token=test_tok")

    def test_reminder_sync_deduplication(self):
        """Test syncing reminders from platform state is idempotent with dedup_key."""
        count1 = sync_user_reminders_from_platform_state(user_id=self.user_id, role="performer")
        count2 = sync_user_reminders_from_platform_state(user_id=self.user_id, role="performer")
        # Second sync must not insert duplicate reminders
        self.assertEqual(count2, 0)

        reminders = list_user_reminders(user_id=self.user_id)
        self.assertGreaterEqual(reminders["total"], 1)
        self.assertIn("Asia/Kolkata", reminders["timezone"])

    def test_reminder_reschedule_and_completion(self):
        """Test updating reminder date, time, and marking as completed."""
        rem = create_custom_reminder(
            user_id=self.user_id,
            title="Soundcheck Rehearsal",
            target_date="2026-11-28",
            target_time="17:00",
            venue="Vault Amphitheater",
        )
        rem_id = rem["id"]

        # Reschedule
        success_resched = reschedule_reminder(rem_id, self.user_id, "2026-11-29", "18:00")
        self.assertTrue(success_resched)

        # Complete
        success_complete = update_reminder_status(rem_id, self.user_id, "completed")
        self.assertTrue(success_complete)

        rem_list = list_user_reminders(self.user_id)
        completed_ids = [r["id"] for r in rem_list["completed"]]
        self.assertIn(rem_id, completed_ids)

if __name__ == "__main__":
    unittest.main()

