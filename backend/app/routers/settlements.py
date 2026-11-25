"""FastAPI Router for Deterministic Financial Settlements & Ledger Audits."""
from typing import Optional, Dict, Any, List
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.database import get_db
from app.services.auth import require_role
from app.services.financial_settlement import (
    calculate_exact_allocation,
    execute_settlement,
    reconcile_settlement_ledger,
    backfill_settlements_for_contributions,
)

router = APIRouter(prefix="/api/settlements", tags=["Financial Settlements & Ledger"])

class AllocationPreviewRequest(BaseModel):
    gross_amount: float = Field(..., gt=0)
    performer_pct: Optional[float] = Field(70.0)
    cause_pct: Optional[float] = Field(20.0)
    platform_pct: Optional[float] = Field(10.0)

@router.post("/calculate-preview")
def preview_allocation(payload: AllocationPreviewRequest):
    """Preview exact deterministic financial allocation using decimal arithmetic."""
    try:
        rule = {
            "version": "v1.0",
            "performer_pct": Decimal(str(payload.performer_pct)),
            "cause_pct": Decimal(str(payload.cause_pct)),
            "platform_pct": Decimal(str(payload.platform_pct)),
        }
        alloc = calculate_exact_allocation(Decimal(str(payload.gross_amount)), split_rule=rule)
        return {
            "status": "success",
            "allocation": alloc,
            "disclaimer": "Simulated platform calculation. Allocation guaranteed exact to the cent.",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
def list_settlements(
    status: Optional[str] = None,
    current_user: dict = Depends(require_role(["organiser", "admin", "provider"])),
):
    """List financial settlements across campaigns and events."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT s.*, c.title as campaign_title, e.title as event_title
        FROM financial_settlements s
        JOIN causes c ON s.campaign_id = c.id
        JOIN events e ON s.event_id = e.id
        """
        params = []
        if status:
            query += " WHERE s.status = ?"
            params.append(status)
        query += " ORDER BY s.created_at DESC LIMIT 50;"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.get("/{settlement_id}")
def get_settlement(
    settlement_id: str,
    current_user: dict = Depends(require_role(["organiser", "admin", "provider"])),
):
    """Retrieve full settlement details along with reconciliation report."""
    recon = reconcile_settlement_ledger(settlement_id)
    if not recon.get("reconciled") and "error" in recon:
        raise HTTPException(status_code=404, detail="Settlement not found")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT s.*, c.title as campaign_title, e.title as event_title
        FROM financial_settlements s
        JOIN causes c ON s.campaign_id = c.id
        JOIN events e ON s.event_id = e.id
        WHERE s.id = ?;
        """, (settlement_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Settlement not found")

    return {
        "settlement": dict(row),
        "reconciliation": recon,
    }

@router.post("/{settlement_id}/execute")
def execute_settlement_disbursement(
    settlement_id: str,
    current_user: dict = Depends(require_role(["organiser", "admin"])),
):
    """Execute settlement disbursement: debit clearing escrow and credit account ledgers."""
    success, message, record = execute_settlement(
        settlement_id=settlement_id,
        actor_id=current_user["id"],
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)

    recon = reconcile_settlement_ledger(settlement_id)
    return {
        "status": "success",
        "message": message,
        "settlement": record,
        "reconciliation": recon,
    }

@router.get("/{settlement_id}/reconciliation")
def audit_settlement_ledger(
    settlement_id: str,
    current_user: dict = Depends(require_role(["organiser", "admin"])),
):
    """Audit endpoint: verify ledger equality and journal entries for a settlement."""
    recon = reconcile_settlement_ledger(settlement_id)
    if "error" in recon:
        raise HTTPException(status_code=404, detail=recon["error"])
    return recon

@router.post("/backfill")
def backfill(current_user: dict = Depends(require_role(["admin"]))):
    """Backfill settlements for all existing contributions."""
    created = backfill_settlements_for_contributions()
    return {"status": "success", "settlements_created": created}

