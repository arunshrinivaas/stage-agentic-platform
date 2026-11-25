"""Test suite for Deterministic Financial Settlement & Immutable Transaction Ledger."""
import unittest
import secrets
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.services.auth import create_user_session
from app.services.financial_settlement import (
    calculate_exact_allocation,
    create_settlement_for_contribution,
    execute_settlement,
    reconcile_settlement_ledger,
)

class TestFinancialSettlement(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, role FROM users WHERE email = 'organizer@deltamelody.org';")
            self.organiser_user = dict(cursor.fetchone())
            cursor.execute("SELECT id, cause_id, event_id FROM contributions LIMIT 1;")
            self.contribution = dict(cursor.fetchone())

        self.org_token = create_user_session(self.organiser_user["id"], self.organiser_user["role"])
        self.org_headers = {"Authorization": f"Bearer {self.org_token}"}

    def test_decimal_allocation_precision_and_reconciliation(self):
        """Test that allocation uses strict decimal arithmetic with exact cent rounding remainder."""
        gross_amounts = [
            Decimal("450.00"),
            Decimal("999.99"),
            Decimal("1337.33"),
            Decimal("100.01"),
        ]

        for gross in gross_amounts:
            alloc = calculate_exact_allocation(gross)
            perf = Decimal(alloc["performer_share"])
            cause = Decimal(alloc["cause_share"])
            fee = Decimal(alloc["platform_fee"])

            # Mathematical exactness: Sum must equal gross down to the cent
            self.assertEqual(perf + cause + fee, gross)
            self.assertTrue(alloc["reconciled"])

    def test_settlement_lifecycle_and_idempotency(self):
        """Test settlement creation, disbursement execution, and idempotent re-execution."""
        # Create unique test contribution row to satisfy foreign key constraint
        unique_contrib_id = f"test-contrib-{secrets.token_hex(4)}"
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO contributions (
                id, cause_id, cause_title, event_id, event_title,
                performer_name, venue_name, booking_id, date, tickets_sold,
                gross_proceeds, pledged_percentage, impact_amount, currency, is_simulated
            ) VALUES (?, ?, 'Test Cause', ?, 'Test Event', 'Performer', 'Venue', NULL, '2026-11-25', 1, 1500.0, 20.0, 300.0, '₹', 1);
            """, (unique_contrib_id, self.contribution["cause_id"], self.contribution["event_id"]))

        # Create settlement
        gross = Decimal("1500.00")
        settlement = create_settlement_for_contribution(
            contribution_id=unique_contrib_id,
            campaign_id=self.contribution["cause_id"],
            event_id=self.contribution["event_id"],
            gross_amount=gross,
        )
        st_id = settlement["id"]
        self.assertEqual(settlement["status"], "pending")

        # First execution: Must disburse funds and transition to 'settled'
        success, msg, rec = execute_settlement(st_id, actor_id=self.organiser_user["id"])
        self.assertTrue(success)
        self.assertEqual(rec["status"], "settled")

        # Second execution: Must be idempotent without duplicate ledger credits
        success2, msg2, rec2 = execute_settlement(st_id, actor_id=self.organiser_user["id"])
        self.assertTrue(success2)
        self.assertIn("already", msg2.lower())
        self.assertEqual(rec2["status"], "settled")

    def test_immutable_ledger_reconciliation_audit(self):
        """Test reconciliation audit verifies that ledger journal credits match debits and allocations."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM financial_settlements WHERE status = 'settled' LIMIT 1;")
            row = cursor.fetchone()

        if row:
            st_id = row["id"]
            recon = reconcile_settlement_ledger(st_id)
            self.assertTrue(recon["reconciled"])
            self.assertTrue(recon["ledger_balanced"])
            self.assertTrue(recon["shares_match_gross"])
            self.assertGreater(recon["ledger_entries_count"], 0)

            # Audit via API endpoint
            res = self.client.get(f"/api/settlements/{st_id}/reconciliation", headers=self.org_headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["reconciled"])

    def test_preview_allocation_api_and_disclaimer(self):
        """Test POST /api/settlements/calculate-preview returns exact allocation and simulation notice."""
        res = self.client.post(
            "/api/settlements/calculate-preview",
            json={"gross_amount": 1000.0, "performer_pct": 70.0, "cause_pct": 20.0, "platform_pct": 10.0},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("Simulated", data["disclaimer"])
        alloc = data["allocation"]
        self.assertEqual(alloc["performer_share"], "700.00")
        self.assertEqual(alloc["cause_share"], "200.00")
        self.assertEqual(alloc["platform_fee"], "100.00")

if __name__ == "__main__":
    unittest.main()

