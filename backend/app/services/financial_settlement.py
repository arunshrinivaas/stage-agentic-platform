"""Deterministic Financial Settlement & Immutable Ledger Service using exact Decimal arithmetic."""
import secrets
from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from app.database import get_db
from app.services.outbox import record_outbox_event

# Exact 2-decimal quantizer
CENT = Decimal("0.01")

# Standard campaign split rule: 70% Performer, 20% Cause, 10% Platform operations
DEFAULT_SPLIT_RULE = {
    "version": "v1.0",
    "performer_pct": Decimal("70.00"),
    "cause_pct": Decimal("20.00"),
    "platform_pct": Decimal("10.00"),
}

def quantize_currency(amount: Decimal) -> Decimal:
    """Quantize to 2 decimal places using standard financial round half up."""
    return amount.quantize(CENT, rounding=ROUND_HALF_UP)

def calculate_exact_allocation(
    gross_amount: Decimal,
    split_rule: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Calculate exact deterministic allocation amounts using decimal arithmetic.

    Guarantees:
        performer_share + cause_share + platform_fee == gross_amount
    Any fractional cent remainder is deterministically allocated to the cause endowment.
    """
    rule = split_rule or DEFAULT_SPLIT_RULE
    gross = quantize_currency(gross_amount)

    perf_pct = Decimal(str(rule["performer_pct"]))
    cause_pct = Decimal(str(rule["cause_pct"]))
    plat_pct = Decimal(str(rule["platform_pct"]))

    # Validate percentages sum to 100.00
    if perf_pct + cause_pct + plat_pct != Decimal("100.00"):
        raise ValueError(f"Split percentages must sum to 100.00, got {perf_pct + cause_pct + plat_pct}")

    # Compute shares
    raw_perf = (gross * perf_pct) / Decimal("100.00")
    raw_cause = (gross * cause_pct) / Decimal("100.00")
    raw_plat = (gross * plat_pct) / Decimal("100.00")

    perf_share = raw_perf.quantize(CENT, rounding=ROUND_DOWN)
    plat_fee = raw_plat.quantize(CENT, rounding=ROUND_DOWN)
    
    # Remainder cent handling: cause gets whatever remains to make sum match gross exactly
    cause_share = gross - (perf_share + plat_fee)
    rounding_remainder = cause_share - raw_cause.quantize(CENT, rounding=ROUND_DOWN)

    # Mathematical reconciliation invariant
    total_allocated = perf_share + cause_share + plat_fee
    if total_allocated != gross:
        raise ValueError(f"Allocation failure: allocated {total_allocated} != gross {gross}")

    return {
        "gross_amount": str(gross),
        "performer_share": str(perf_share),
        "cause_share": str(cause_share),
        "platform_fee": str(plat_fee),
        "rounding_remainder": str(rounding_remainder),
        "performer_pct": str(perf_pct),
        "cause_pct": str(cause_pct),
        "platform_pct": str(plat_pct),
        "calculation_version": rule.get("version", "v1.0"),
        "reconciled": True,
    }

def create_settlement_for_contribution(
    contribution_id: str,
    campaign_id: str,
    event_id: str,
    gross_amount: Decimal,
    currency: str = "₹",
    conn: Optional[Any] = None,
) -> Dict[str, Any]:
    """Create a pending financial settlement record and write initial escrow journal entries."""
    alloc = calculate_exact_allocation(gross_amount)
    settlement_id = f"stl-{secrets.token_hex(8)}"

    def _execute(c):
        cursor = c.cursor()
        # Prevent duplicate settlement for the same contribution
        cursor.execute("SELECT * FROM financial_settlements WHERE contribution_id = ?;", (contribution_id,))
        existing = cursor.fetchone()
        if existing:
            return dict(existing)

        # 1. Insert master settlement row
        cursor.execute("""
        INSERT INTO financial_settlements (
            id, contribution_id, campaign_id, event_id, gross_amount,
            performer_share, cause_share, platform_fee, rounding_remainder,
            currency, calculation_version, status, settled_at, reconciled, is_simulated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, 1, 1);
        """, (
            settlement_id,
            contribution_id,
            campaign_id,
            event_id,
            alloc["gross_amount"],
            alloc["performer_share"],
            alloc["cause_share"],
            alloc["platform_fee"],
            alloc["rounding_remainder"],
            currency,
            alloc["calculation_version"],
        ))

        # 2. Append-only ledger journal: Record incoming gross funds to escrow
        cursor.execute("""
        INSERT INTO settlement_ledger (
            settlement_id, entry_type, account, amount, currency, balance_after, narrative
        ) VALUES (?, 'credit', 'escrow', ?, ?, ?, ?);
        """, (
            settlement_id,
            alloc["gross_amount"],
            currency,
            alloc["gross_amount"],
            f"Gross ticket proceeds credited to clearing escrow for contribution {contribution_id}",
        ))

        # Record outbox event
        record_outbox_event(
            conn=c,
            event_type="settlement.pending",
            aggregate_type="financial_settlement",
            aggregate_id=settlement_id,
            payload={
                "settlement_id": settlement_id,
                "contribution_id": contribution_id,
                "gross_amount": alloc["gross_amount"],
                "currency": currency,
                "status": "pending",
            },
        )

        cursor.execute("SELECT * FROM financial_settlements WHERE id = ?;", (settlement_id,))
        return dict(cursor.fetchone())

    if conn is not None:
        return _execute(conn)
    with get_db() as c:
        return _execute(c)

def execute_settlement(settlement_id: str, actor_id: Optional[str] = None) -> Tuple[bool, str, Dict[str, Any]]:
    """Execute settlement disbursement: debit escrow and credit performer, cause, and platform accounts.

    Idempotent: Re-executing an already settled transaction safely returns existing records.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM financial_settlements WHERE id = ?;", (settlement_id,))
        st = cursor.fetchone()
        if not st:
            return False, "Settlement record not found", {}

        if st["status"] == "settled":
            # Idempotent return
            return True, "Settlement was already completed", dict(st)

        if st["status"] == "failed":
            return False, "Settlement has failed and cannot be processed directly", dict(st)

        # Execute disbursements in ledger
        gross = Decimal(st["gross_amount"])
        perf_share = Decimal(st["performer_share"])
        cause_share = Decimal(st["cause_share"])
        plat_fee = Decimal(st["platform_fee"])
        curr = st["currency"]

        # Escrow Debit
        cursor.execute("""
        INSERT INTO settlement_ledger (settlement_id, entry_type, account, amount, currency, balance_after, narrative)
        VALUES (?, 'debit', 'escrow', ?, ?, '0.00', 'Escrow funds fully released for tripartite disbursement');
        """, (settlement_id, str(gross), curr))

        # Performer Payout Credit
        cursor.execute("""
        INSERT INTO settlement_ledger (settlement_id, entry_type, account, amount, currency, balance_after, narrative)
        VALUES (?, 'allocation', 'performer_payout', ?, ?, ?, 'Disbursed 70% share to performer compensation ledger');
        """, (settlement_id, str(perf_share), curr, str(perf_share)))

        # Cause Endowment Credit
        cursor.execute("""
        INSERT INTO settlement_ledger (settlement_id, entry_type, account, amount, currency, balance_after, narrative)
        VALUES (?, 'allocation', 'cause_endowment', ?, ?, ?, 'Disbursed social impact contribution to verified campaign pool');
        """, (settlement_id, str(cause_share), curr, str(cause_share)))

        # Platform Operations Credit
        cursor.execute("""
        INSERT INTO settlement_ledger (settlement_id, entry_type, account, amount, currency, balance_after, narrative)
        VALUES (?, 'allocation', 'platform_operations', ?, ?, ?, 'Platform operations & compliance overhead fee (10%)');
        """, (settlement_id, str(plat_fee), curr, str(plat_fee)))

        # Update settlement status to settled
        cursor.execute("""
        UPDATE financial_settlements
        SET status = 'settled',
            settled_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        """, (settlement_id,))

        # Record outbox event
        record_outbox_event(
            conn=conn,
            event_type="settlement.completed",
            aggregate_type="financial_settlement",
            aggregate_id=settlement_id,
            payload={
                "settlement_id": settlement_id,
                "contribution_id": st["contribution_id"],
                "gross_amount": str(gross),
                "performer_share": str(perf_share),
                "cause_share": str(cause_share),
                "platform_fee": str(plat_fee),
                "status": "settled",
                "actor_id": actor_id,
            },
        )

        cursor.execute("SELECT * FROM financial_settlements WHERE id = ?;", (settlement_id,))
        updated = dict(cursor.fetchone())
        return True, "Settlement successfully disbursed and reconciled", updated

def reconcile_settlement_ledger(settlement_id: str) -> Dict[str, Any]:
    """Perform a mathematical reconciliation check on the settlement's append-only ledger entries."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM financial_settlements WHERE id = ?;", (settlement_id,))
        st = cursor.fetchone()
        if not st:
            return {"reconciled": False, "error": "Settlement not found"}

        cursor.execute("""
        SELECT entry_type, account, amount, created_at, narrative
        FROM settlement_ledger
        WHERE settlement_id = ?
        ORDER BY id ASC;
        """, (settlement_id,))
        entries = [dict(r) for r in cursor.fetchall()]

    gross = Decimal(st["gross_amount"])
    perf = Decimal(st["performer_share"])
    cause = Decimal(st["cause_share"])
    fee = Decimal(st["platform_fee"])

    # Reconciliation checks
    shares_sum = perf + cause + fee
    shares_match_gross = (shares_sum == gross)

    # Check ledger debits match credits
    credits = sum(Decimal(e["amount"]) for e in entries if e["entry_type"] == "credit")
    debits = sum(Decimal(e["amount"]) for e in entries if e["entry_type"] == "debit")
    allocations = sum(Decimal(e["amount"]) for e in entries if e["entry_type"] == "allocation")

    is_settled = (st["status"] == "settled")
    ledger_balanced = True
    if is_settled:
        ledger_balanced = (credits == debits) and (allocations == gross)

    return {
        "settlement_id": settlement_id,
        "gross_amount": str(gross),
        "shares_sum": str(shares_sum),
        "shares_match_gross": shares_match_gross,
        "ledger_entries_count": len(entries),
        "credits": str(credits),
        "debits": str(debits),
        "allocations": str(allocations),
        "ledger_balanced": ledger_balanced,
        "reconciled": (shares_match_gross and ledger_balanced),
        "status": st["status"],
        "entries": entries,
    }

def backfill_settlements_for_contributions() -> int:
    """Ensure every existing contribution has a corresponding financial settlement record."""
    created = 0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.id, c.cause_id, c.event_id, c.gross_proceeds, c.currency
        FROM contributions c
        WHERE c.id NOT IN (SELECT contribution_id FROM financial_settlements);
        """)
        rows = cursor.fetchall()

    for r in rows:
        gross_val = Decimal(str(r["gross_proceeds"] or 450.00))
        create_settlement_for_contribution(
            contribution_id=r["id"],
            campaign_id=r["cause_id"],
            event_id=r["event_id"],
            gross_amount=gross_val,
            currency=r["currency"] or "₹",
        )
        created += 1
    return created

