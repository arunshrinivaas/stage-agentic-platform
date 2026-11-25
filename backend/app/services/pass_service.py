"""Service for secure digital pass generation, cryptographic token signing, and concurrency-safe check-in."""
import hmac
import hashlib
import secrets
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from app.database import get_db
from app.config import settings
from app.services.outbox import record_outbox_event

# High-entropy signing secret for tamper-proof pass verification
SIGNING_SECRET = getattr(settings, "secret_key", "stage-secure-sign-key-2026-kolkata").encode("utf-8")

def generate_verification_token() -> str:
    """Generate a high-entropy URL-safe verification token."""
    return f"stg_tok_{secrets.token_urlsafe(32)}"

def sign_token(token: str, booking_code: str, event_id: str) -> str:
    """Create an HMAC-SHA256 signature binding the token to the booking code and event."""
    message = f"{token}:{booking_code}:{event_id}".encode("utf-8")
    return hmac.new(SIGNING_SECRET, message, hashlib.sha256).hexdigest()

def verify_token_signature(token: str, booking_code: str, event_id: str, signature: str) -> bool:
    """Constant-time verification of HMAC signature to prevent timing attacks."""
    expected = sign_token(token, booking_code, event_id)
    return hmac.compare_digest(expected, signature)

def issue_digital_pass(
    booking_id: str,
    event_id: str,
    user_id: Optional[str],
    booking_code: str,
    conn: Optional[Any] = None,
) -> Dict[str, Any]:
    """Issue a unique, cryptographically signed digital pass for a confirmed booking."""
    token = generate_verification_token()
    sig = sign_token(token, booking_code, event_id)
    pass_id = f"pass-{secrets.token_hex(8)}"

    def _execute(c):
        cursor = c.cursor()
        # Check if pass already exists for this booking
        cursor.execute("SELECT * FROM digital_passes WHERE booking_id = ?;", (booking_id,))
        existing = cursor.fetchone()
        if existing:
            return dict(existing)

        # Ensure user_id exists in users table to preserve foreign key constraint
        valid_user_id = None
        if user_id:
            cursor.execute("SELECT id FROM users WHERE id = ?;", (user_id,))
            if cursor.fetchone():
                valid_user_id = user_id

        cursor.execute("""
        INSERT INTO digital_passes (
            id, booking_id, event_id, user_id, booking_code,
            verification_token, token_signature, status, issued_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'valid', CURRENT_TIMESTAMP);
        """, (
            pass_id, booking_id, event_id, valid_user_id, booking_code, token, sig
        ))

        cursor.execute("SELECT * FROM digital_passes WHERE id = ?;", (pass_id,))
        row = cursor.fetchone()
        return dict(row)

    if conn is not None:
        return _execute(conn)
    with get_db() as c:
        return _execute(c)

def get_pass_by_booking_id(booking_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve pass details for a given booking ID, automatically provisioning one if missing."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM digital_passes WHERE booking_id = ?;", (booking_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)

        # Backfill pass if booking exists
        cursor.execute("SELECT * FROM bookings WHERE id = ?;", (booking_id,))
        b = cursor.fetchone()
        if b:
            # Look up user if attendee_email matches a user
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?);", (b["attendee_email"],))
            u = cursor.fetchone()
            u_id = u["id"] if u else None
            return issue_digital_pass(
                booking_id=b["id"],
                event_id=b["event_id"],
                user_id=u_id,
                booking_code=b["booking_code"],
            )
        return None

def verify_pass_details(token: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Public verification lookup: validates token authenticity and returns sanitized pass info."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT p.id as pass_id, p.booking_id, p.event_id, p.booking_code,
               p.verification_token, p.token_signature, p.status, p.issued_at,
               p.used_at, p.used_by_scanner,
               b.ticket_count, b.attendee_name, b.venue_name, b.city,
               b.event_date, b.event_time, b.status as booking_status,
               e.title as event_title, e.art_form, e.description as event_description
        FROM digital_passes p
        JOIN bookings b ON p.booking_id = b.id
        JOIN events e ON p.event_id = e.id
        WHERE p.verification_token = ?;
        """, (token,))
        row = cursor.fetchone()

        if not row:
            return False, "Pass not found or invalid token", None

        # Verify cryptographic signature
        if not verify_token_signature(token, row["booking_code"], row["event_id"], row["token_signature"]):
            return False, "Pass verification signature tampered or corrupt", None

        # Check booking status
        effective_status = row["status"]
        if row["booking_status"] == "cancelled":
            effective_status = "cancelled"

        # Mask booking code for public privacy (e.g. STG-8821-KOL -> STG-****-KOL)
        parts = row["booking_code"].split("-")
        masked_code = f"{parts[0]}-****-{parts[-1]}" if len(parts) >= 3 else row["booking_code"]

        sanitized_details = {
            "passId": row["pass_id"],
            "status": effective_status,
            "eventTitle": row["event_title"],
            "artForm": row["art_form"],
            "date": row["event_date"],
            "time": row["event_time"],
            "venueName": row["venue_name"],
            "city": row["city"],
            "bookingCode": masked_code,
            "fullBookingCode": row["booking_code"],
            "ticketCount": row["ticket_count"],
            "attendeeName": row["attendee_name"],
            "issuedAt": row["issued_at"],
            "usedAt": row["used_at"],
            "accessInstructions": "Please present this digital pass or physical QR code at the venue gate for check-in. Valid for single entry.",
        }

        return True, "Valid", sanitized_details

def check_in_pass_transactional(
    token: str,
    scanner_user_id: Optional[str] = None,
    scanner_role: Optional[str] = None,
    device_info: Optional[str] = None,
) -> Tuple[bool, int, str, Optional[Dict[str, Any]]]:
    """Execute a concurrency-safe atomic check-in transaction.

    Returns:
        (success, http_status, message, pass_details)
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Step 1: Look up pass record
        cursor.execute("SELECT * FROM digital_passes WHERE verification_token = ?;", (token,))
        p = cursor.fetchone()
        if not p:
            return False, 404, "Pass not found", None

        pass_id = p["id"]
        current_status = p["status"]

        # Step 2: Validate cryptographic integrity
        if not verify_token_signature(token, p["booking_code"], p["event_id"], p["token_signature"]):
            cursor.execute("""
            INSERT INTO pass_checkins (pass_id, scanner_user_id, scanner_role, action, device_info, notes)
            VALUES (?, ?, ?, 'tampered_rejected', ?, 'Cryptographic HMAC mismatch');
            """, (pass_id, scanner_user_id, scanner_role, device_info))
            return False, 400, "Cryptographic token verification failed: pass appears tampered", None

        # Step 3: Handle already used / cancelled / revoked
        if current_status == "used":
            cursor.execute("""
            INSERT INTO pass_checkins (pass_id, scanner_user_id, scanner_role, action, device_info, notes)
            VALUES (?, ?, ?, 'duplicate_rejected', ?, ?);
            """, (pass_id, scanner_user_id, scanner_role, device_info, f"Already used at {p['used_at']}"))
            return False, 409, f"Pass already used for entry at {p['used_at']}", {
                "passId": pass_id,
                "status": "used",
                "usedAt": p["used_at"],
                "bookingCode": p["booking_code"],
            }

        if current_status in ("cancelled", "revoked"):
            cursor.execute("""
            INSERT INTO pass_checkins (pass_id, scanner_user_id, scanner_role, action, device_info, notes)
            VALUES (?, ?, ?, 'revoked_rejected', ?, ?);
            """, (pass_id, scanner_user_id, scanner_role, device_info, f"Status is {current_status}"))
            return False, 400, f"Cannot check in: Pass is {current_status}", None

        # Step 4: Concurrency-safe atomic compare-and-swap
        cursor.execute("""
        UPDATE digital_passes
        SET status = 'used',
            used_at = CURRENT_TIMESTAMP,
            used_by_scanner = ?,
            checkin_device_id = ?
        WHERE verification_token = ? AND status = 'valid';
        """, (scanner_user_id or "scanner-desk", device_info or "web-scanner", token))

        if cursor.rowcount == 0:
            # Race condition: another scanner process admitted this pass simultaneously
            cursor.execute("SELECT used_at FROM digital_passes WHERE id = ?;", (pass_id,))
            race_row = cursor.fetchone()
            used_time = race_row["used_at"] if race_row else "Just now"
            cursor.execute("""
            INSERT INTO pass_checkins (pass_id, scanner_user_id, scanner_role, action, device_info, notes)
            VALUES (?, ?, ?, 'duplicate_rejected', ?, 'Simultaneous check-in race condition detected');
            """, (pass_id, scanner_user_id, scanner_role, device_info))
            return False, 409, f"Simultaneous admission conflict: pass was just checked in at {used_time}", None

        # Step 5: Record successful check-in in audit log
        cursor.execute("""
        INSERT INTO pass_checkins (pass_id, scanner_user_id, scanner_role, action, device_info, notes)
        VALUES (?, ?, ?, 'admitted', ?, 'Guest successfully admitted to venue');
        """, (pass_id, scanner_user_id, scanner_role, device_info))

        # Record transactional outbox event
        record_outbox_event(
            conn=conn,
            event_type="pass.checked_in",
            aggregate_type="digital_pass",
            aggregate_id=pass_id,
            payload={
                "pass_id": pass_id,
                "booking_code": p["booking_code"],
                "event_id": p["event_id"],
                "scanner_user_id": scanner_user_id,
                "scanned_at": datetime.now(timezone.utc).isoformat(),
                "status": "used",
            },
        )

        # Retrieve updated full details
        _, _, details = verify_pass_details(token)
        return True, 200, "Guest successfully admitted", details

def backfill_passes_for_existing_bookings() -> int:
    """Ensure every booking in the database has a corresponding verified digital pass."""
    created_count = 0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT b.id, b.event_id, b.booking_code, b.attendee_email, u.id as user_id
        FROM bookings b
        LEFT JOIN users u ON LOWER(b.attendee_email) = LOWER(u.email)
        WHERE b.id NOT IN (SELECT booking_id FROM digital_passes);
        """)
        unlinked = cursor.fetchall()

        for b in unlinked:
            token = generate_verification_token()
            sig = sign_token(token, b["booking_code"], b["event_id"])
            pass_id = f"pass-{secrets.token_hex(8)}"
            cursor.execute("""
            INSERT OR IGNORE INTO digital_passes (
                id, booking_id, event_id, user_id, booking_code,
                verification_token, token_signature, status, issued_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'valid', CURRENT_TIMESTAMP);
            """, (pass_id, b["id"], b["event_id"], b["user_id"], b["booking_code"], token, sig))
            created_count += 1

    return created_count

