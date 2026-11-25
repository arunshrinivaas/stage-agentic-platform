"""Service for timezone-aware, deduplicated local user reminder management integrated with platform events."""
import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from app.database import get_db

TIMEZONE_OFFSET_HOURS = 5.5  # Asia/Kolkata (IST = UTC+5:30)

def get_now_ist() -> datetime:
    """Get current time in Asia/Kolkata timezone."""
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist)

def format_iso_ist(dt: datetime) -> str:
    """Format datetime as ISO-8601 string with IST timezone offset."""
    return dt.isoformat()

def sync_user_reminders_from_platform_state(user_id: str, role: str) -> int:
    """Automatically discover and synchronize reminders from platform state without duplicates."""
    synced_count = 0
    now_ist = get_now_ist()

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Booking Reminders (for Audience)
        if role in ("audience", "admin"):
            cursor.execute("""
            SELECT b.id, b.booking_code, b.event_title, b.event_date, b.event_time, b.venue_name, b.city
            FROM bookings b
            WHERE b.status = 'confirmed'
              AND (b.attendee_email IN (SELECT email FROM users WHERE id = ?) OR ? = 'admin');
            """, (user_id, role))
            for b in cursor.fetchall():
                dedup_key = f"{user_id}:booking:{b['id']}"
                date_str = b["event_date"] or "2026-11-28"
                time_str = b["event_time"] or "19:30"
                iso_ts = f"{date_str}T{time_str if ':' in time_str else '19:30:00'}+05:30"
                
                cursor.execute("""
                INSERT OR IGNORE INTO user_reminders (
                    id, user_id, title, category, target_date, target_time,
                    target_timestamp, venue, status, advance_hours, dedup_key, metadata_json
                ) VALUES (?, ?, ?, 'booking', ?, ?, ?, ?, 'pending', 24, ?, ?);
                """, (
                    f"rem-{secrets.token_hex(6)}",
                    user_id,
                    f"Live Event: {b['event_title']}",
                    date_str,
                    time_str,
                    iso_ts,
                    f"{b['venue_name']}, {b['city']}",
                    dedup_key,
                    json.dumps({"booking_id": b["id"], "booking_code": b["booking_code"]}),
                ))
                if cursor.rowcount > 0:
                    synced_count += 1

        # 2. Performance Schedules & Civic Deadlines (for Performers)
        if role in ("performer", "admin"):
            cursor.execute("""
            SELECT id, title, date, time, venue_name, status, art_form
            FROM performance_requests
            WHERE status IN ('approved', 'pending')
              AND (performer_id IN (SELECT id FROM performer_profiles WHERE user_id = ?) OR ? = 'admin');
            """, (user_id, role))
            for req in cursor.fetchall():
                # A. Performance Schedule Reminder
                dedup_key_sched = f"{user_id}:schedule:{req['id']}"
                date_str = req["date"]
                time_str = req["time"] or "19:00"
                iso_ts = f"{date_str}T19:00:00+05:30"

                cursor.execute("""
                INSERT OR IGNORE INTO user_reminders (
                    id, user_id, title, category, target_date, target_time,
                    target_timestamp, venue, status, advance_hours, dedup_key, metadata_json
                ) VALUES (?, ?, ?, 'schedule', ?, ?, ?, ?, 'pending', 48, ?, ?);
                """, (
                    f"rem-{secrets.token_hex(6)}",
                    user_id,
                    f"Performance Showcase: {req['title']}",
                    date_str,
                    time_str,
                    iso_ts,
                    req["venue_name"] or "Pending Venue",
                    dedup_key_sched,
                    json.dumps({"request_id": req["id"], "status": req["status"]}),
                ))
                if cursor.rowcount > 0:
                    synced_count += 1

                # B. Civic Application Deadline (7 days prior to performance)
                try:
                    event_dt = datetime.strptime(date_str, "%Y-%m-%d")
                    civic_deadline_dt = event_dt - timedelta(days=7)
                    civic_deadline_str = civic_deadline_dt.strftime("%Y-%m-%d")
                    dedup_key_civic = f"{user_id}:civic_deadline:{req['id']}"

                    cursor.execute("""
                    INSERT OR IGNORE INTO user_reminders (
                        id, user_id, title, category, target_date, target_time,
                        target_timestamp, venue, status, advance_hours, dedup_key, metadata_json
                    ) VALUES (?, ?, ?, 'civic_deadline', ?, '17:00', ?, ?, 'pending', 72, ?, ?);
                    """, (
                        f"rem-{secrets.token_hex(6)}",
                        user_id,
                        f"Civic Permit Filing Deadline: {req['title']}",
                        civic_deadline_str,
                        f"{civic_deadline_str}T17:00:00+05:30",
                        req["venue_name"] or "Municipal Authority",
                        dedup_key_civic,
                        json.dumps({"request_id": req["id"], "type": "civic_permit_filing"}),
                    ))
                    if cursor.rowcount > 0:
                        synced_count += 1
                except Exception:
                    pass

        # 3. Request Review Deadlines (for Stage Providers)
        if role in ("provider", "admin"):
            cursor.execute("""
            SELECT id, title, date, performer_name, venue_name, created_at
            FROM performance_requests
            WHERE status = 'pending';
            """)
            for req in cursor.fetchall():
                dedup_key_rev = f"{user_id}:request_deadline:{req['id']}"
                # 48-hour approval window from request creation
                date_str = req["date"]
                cursor.execute("""
                INSERT OR IGNORE INTO user_reminders (
                    id, user_id, title, category, target_date, target_time,
                    target_timestamp, venue, status, advance_hours, dedup_key, metadata_json
                ) VALUES (?, ?, ?, 'request_deadline', ?, '18:00', ?, ?, 'pending', 24, ?, ?);
                """, (
                    f"rem-{secrets.token_hex(6)}",
                    user_id,
                    f"Review Pitch: '{req['title']}' ({req['performer_name']})",
                    date_str,
                    f"{date_str}T18:00:00+05:30",
                    req["venue_name"] or "Your Stage",
                    dedup_key_rev,
                    json.dumps({"request_id": req["id"], "performer": req["performer_name"]}),
                ))
                if cursor.rowcount > 0:
                    synced_count += 1

        # 4. Campaign Milestones & Settlements (for Organisers)
        if role in ("organiser", "admin"):
            cursor.execute("SELECT id, title, target_amount, current_amount FROM causes LIMIT 5;")
            for cause in cursor.fetchall():
                dedup_key_camp = f"{user_id}:campaign_milestone:{cause['id']}"
                cursor.execute("""
                INSERT OR IGNORE INTO user_reminders (
                    id, user_id, title, category, target_date, target_time,
                    target_timestamp, venue, status, advance_hours, dedup_key, metadata_json
                ) VALUES (?, ?, ?, 'campaign_milestone', '2026-12-05', '12:00', '2026-12-05T12:00:00+05:30', 'Delta Foundation', 'pending', 24, ?, ?);
                """, (
                    f"rem-{secrets.token_hex(6)}",
                    user_id,
                    f"Campaign Milestone Review: {cause['title']}",
                    dedup_key_camp,
                    json.dumps({"cause_id": cause["id"], "target": cause["target_amount"]}),
                ))
                if cursor.rowcount > 0:
                    synced_count += 1

    return synced_count

def list_user_reminders(user_id: str) -> Dict[str, Any]:
    """Retrieve all reminders for a user, partitioned into pending, completed, and missed."""
    now_ist = get_now_ist()
    now_str = now_ist.strftime("%Y-%m-%d")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, user_id, title, category, target_date, target_time,
               target_timestamp, venue, status, advance_hours, dedup_key,
               metadata_json, created_at, updated_at
        FROM user_reminders
        WHERE user_id = ?
        ORDER BY target_date ASC, target_time ASC;
        """, (user_id,))
        rows = cursor.fetchall()

    pending = []
    completed = []
    missed = []

    for r in rows:
        item = dict(r)
        status = item["status"]
        target_date = item["target_date"]

        # Parse metadata
        try:
            item["metadata"] = json.loads(item["metadata_json"]) if item["metadata_json"] else {}
        except Exception:
            item["metadata"] = {}

        if status == "completed":
            completed.append(item)
        elif status == "cancelled":
            continue
        elif target_date < now_str:
            # Overdue / missed
            item["status"] = "missed"
            missed.append(item)
        else:
            pending.append(item)

    return {
        "pending": pending,
        "completed": completed,
        "missed": missed,
        "total": len(pending) + len(completed) + len(missed),
        "timezone": "Asia/Kolkata (UTC+5:30)",
    }

def reschedule_reminder(reminder_id: str, user_id: str, new_date: str, new_time: Optional[str] = None) -> bool:
    """Reschedule an existing reminder to a new date and time."""
    time_val = new_time or "19:00"
    iso_ts = f"{new_date}T{time_val}+05:30"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE user_reminders
        SET target_date = ?,
            target_time = ?,
            target_timestamp = ?,
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?;
        """, (new_date, time_val, iso_ts, reminder_id, user_id))
        return cursor.rowcount > 0

def update_reminder_status(reminder_id: str, user_id: str, status: str) -> bool:
    """Update status of a reminder to 'completed', 'cancelled', or 'pending'."""
    if status not in ("completed", "cancelled", "pending"):
        return False
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE user_reminders
        SET status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?;
        """, (status, reminder_id, user_id))
        return cursor.rowcount > 0

def create_custom_reminder(
    user_id: str,
    title: str,
    target_date: str,
    target_time: Optional[str] = "19:00",
    venue: Optional[str] = None,
    category: Optional[str] = "custom",
    advance_hours: int = 24,
) -> Dict[str, Any]:
    """Create a new custom user reminder with deduplication safety."""
    rem_id = f"rem-{secrets.token_hex(6)}"
    iso_ts = f"{target_date}T{target_time}+05:30"
    dedup_key = f"{user_id}:custom:{title.lower().strip()}:{target_date}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO user_reminders (
            id, user_id, title, category, target_date, target_time,
            target_timestamp, venue, status, advance_hours, dedup_key, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, '{}');
        """, (
            rem_id, user_id, title, category or "custom",
            target_date, target_time, iso_ts, venue or "STAGE", advance_hours, dedup_key
        ))
        cursor.execute("SELECT * FROM user_reminders WHERE id = ?;", (rem_id,))
        return dict(cursor.fetchone())

