"""FastAPI Router for Digital Passes, QR Verification, and Concurrency-Safe Check-in."""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field

from app.database import get_db
from app.services.auth import get_user_by_token, require_role
from app.services.pass_service import (
    get_pass_by_booking_id,
    verify_pass_details,
    check_in_pass_transactional,
    backfill_passes_for_existing_bookings,
)

router = APIRouter(prefix="/api/passes", tags=["Digital Passes & QR Verification"])

class CheckInRequest(BaseModel):
    token: str = Field(..., description="High-entropy cryptographic verification token from pass QR code")
    device_info: Optional[str] = Field("web-scanner", description="Information about scanning device/browser")

class PassVerificationResponse(BaseModel):
    valid: bool
    status: str
    message: str
    passDetails: Optional[Dict[str, Any]] = None

@router.get("/booking/{booking_id}")
def get_pass_for_booking(booking_id: str, authorization: Optional[str] = Header(None)):
    """Retrieve the digital pass details, verification token, and QR payload for a booking."""
    pass_data = get_pass_by_booking_id(booking_id)
    if not pass_data:
        raise HTTPException(status_code=404, detail="Digital pass not found for booking")

    # If caller is authenticated, verify ownership or role
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        user = get_user_by_token(token)
        if user and user["role"] not in ("provider", "admin", "organiser"):
            # Check ownership
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT attendee_email FROM bookings WHERE id = ?;", (booking_id,))
                b = cursor.fetchone()
                if b and b["attendee_email"].lower() != user["email"].lower():
                    raise HTTPException(status_code=403, detail="Not authorized to access this pass")

    # Add verification URL
    verification_token = pass_data["verification_token"]
    pass_data["verification_url"] = f"http://localhost:3000/verify-pass?token={verification_token}"
    return pass_data

@router.get("/verify/{token}", response_model=PassVerificationResponse)
def verify_pass_token(token: str):
    """Public verification endpoint: validates cryptographic authenticity and returns sanitized pass details.

    Safe for public consumption; masks personal details and payment card information.
    """
    valid, message, details = verify_pass_details(token)
    if not valid:
        return PassVerificationResponse(
            valid=False,
            status="invalid",
            message=message,
            passDetails=None,
        )

    return PassVerificationResponse(
        valid=(details["status"] == "valid"),
        status=details["status"],
        message=f"Pass is {details['status'].upper()}",
        passDetails=details,
    )

@router.post("/check-in")
def check_in_guest(
    payload: CheckInRequest,
    current_user: dict = Depends(require_role(["provider", "admin", "organiser"])),
):
    """Execute a concurrency-safe atomic check-in transaction.

    Prevents simultaneous duplicate entry through compare-and-swap database locking.
    """
    success, status_code, message, details = check_in_pass_transactional(
        token=payload.token.strip(),
        scanner_user_id=current_user["id"],
        scanner_role=current_user["role"],
        device_info=payload.device_info,
    )

    if not success:
        raise HTTPException(status_code=status_code, detail=message)

    return {
        "status": "success",
        "message": message,
        "passDetails": details,
    }

@router.get("/audit/check-ins")
def list_checkin_audits(current_user: dict = Depends(require_role(["provider", "admin"]))):
    """Audit endpoint: lists recent check-in events and admissions."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.id, c.pass_id, c.scanner_user_id, c.scanner_role, c.scanned_at,
               c.action, c.device_info, c.notes,
               p.booking_code, e.title as event_title
        FROM pass_checkins c
        JOIN digital_passes p ON c.pass_id = p.id
        JOIN events e ON p.event_id = e.id
        ORDER BY c.scanned_at DESC LIMIT 50;
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.post("/backfill")
def backfill_passes(current_user: dict = Depends(require_role(["admin"]))):
    """Backfill passes for all existing bookings missing a pass."""
    count = backfill_passes_for_existing_bookings()
    return {"status": "success", "passes_created": count}

