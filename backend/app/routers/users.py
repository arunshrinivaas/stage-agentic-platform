import json
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header, Response
from app.database import get_db
from app.schemas.user import UserResponse
from app.schemas.settings import (
    UserSettingsModel,
    UserSettingsUpdateRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
)
from app.services.auth import (
    get_user_by_token,
    verify_password,
    hash_password,
)

router = APIRouter(prefix="/api/users", tags=["Users & Settings"])

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Dependency extracting the authenticated user dictionary from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required. Please provide a Bearer token.")
    token = authorization[7:].strip()
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid token.")
    return user

@router.get("", response_model=List[UserResponse])
def get_users():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, role, avatar_url, bio, created_at FROM users ORDER BY created_at ASC;")
        rows = cursor.fetchall()
        return [
            UserResponse(
                id=r["id"],
                name=r["name"],
                email=r["email"],
                role=r["role"],
                avatarUrl=r["avatar_url"],
                bio=r["bio"],
                createdAt=str(r["created_at"]),
            )
            for r in rows
        ]

@router.get("/me/settings", response_model=UserSettingsModel)
def get_my_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_settings WHERE user_id = ?;", (user_id,))
        row = cursor.fetchone()

        if not row:
            # Create default settings record
            cursor.execute("""
            INSERT OR IGNORE INTO user_settings (
                user_id, theme, layout_density, email_notifications,
                booking_confirmations, request_status_updates, cause_updates,
                ai_recommendations, proactive_ai_assistance, ai_notification_preferences,
                preferred_recommendation_categories, calendar_sync_enabled,
                calendar_provider, reminder_advance_hours
            ) VALUES (?, 'system', 'comfortable', 1, 1, 1, 1, 1, 1, 'all', '["Music", "Theatre", "Dance", "Spoken Word"]', 0, 'download_ics', 24);
            """, (user_id,))
            cursor.execute("SELECT * FROM user_settings WHERE user_id = ?;", (user_id,))
            row = cursor.fetchone()

        cats = ["Music", "Theatre", "Dance", "Spoken Word"]
        try:
            if row["preferred_recommendation_categories"]:
                cats = json.loads(row["preferred_recommendation_categories"])
        except Exception:
            pass

        return UserSettingsModel(
            user_id=row["user_id"],
            theme=row["theme"] or "system",
            layout_density=row["layout_density"] or "comfortable",
            email_notifications=bool(row["email_notifications"]),
            booking_confirmations=bool(row["booking_confirmations"]),
            request_status_updates=bool(row["request_status_updates"]),
            cause_updates=bool(row["cause_updates"]),
            ai_recommendations=bool(row["ai_recommendations"]),
            proactive_ai_assistance=bool(row["proactive_ai_assistance"]),
            ai_notification_preferences=row["ai_notification_preferences"] or "all",
            preferred_recommendation_categories=cats,
            calendar_sync_enabled=bool(row["calendar_sync_enabled"]),
            calendar_provider=row["calendar_provider"] or "download_ics",
            reminder_advance_hours=int(row["reminder_advance_hours"] or 24),
        )

@router.put("/me/settings", response_model=UserSettingsModel)
def update_my_settings(
    payload: UserSettingsUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        # Ensure row exists
        cursor.execute("SELECT 1 FROM user_settings WHERE user_id = ?;", (user_id,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO user_settings (user_id) VALUES (?);", (user_id,))

        updates: List[str] = []
        params: List[Any] = []

        if payload.theme is not None:
            updates.append("theme = ?")
            params.append(payload.theme)
        if payload.layout_density is not None:
            updates.append("layout_density = ?")
            params.append(payload.layout_density)
        if payload.email_notifications is not None:
            updates.append("email_notifications = ?")
            params.append(1 if payload.email_notifications else 0)
        if payload.booking_confirmations is not None:
            updates.append("booking_confirmations = ?")
            params.append(1 if payload.booking_confirmations else 0)
        if payload.request_status_updates is not None:
            updates.append("request_status_updates = ?")
            params.append(1 if payload.request_status_updates else 0)
        if payload.cause_updates is not None:
            updates.append("cause_updates = ?")
            params.append(1 if payload.cause_updates else 0)
        if payload.ai_recommendations is not None:
            updates.append("ai_recommendations = ?")
            params.append(1 if payload.ai_recommendations else 0)
        if payload.proactive_ai_assistance is not None:
            updates.append("proactive_ai_assistance = ?")
            params.append(1 if payload.proactive_ai_assistance else 0)
        if payload.ai_notification_preferences is not None:
            updates.append("ai_notification_preferences = ?")
            params.append(payload.ai_notification_preferences)
        if payload.preferred_recommendation_categories is not None:
            updates.append("preferred_recommendation_categories = ?")
            params.append(json.dumps(payload.preferred_recommendation_categories))
        if payload.calendar_sync_enabled is not None:
            updates.append("calendar_sync_enabled = ?")
            params.append(1 if payload.calendar_sync_enabled else 0)
        if payload.calendar_provider is not None:
            updates.append("calendar_provider = ?")
            params.append(payload.calendar_provider)
        if payload.reminder_advance_hours is not None:
            updates.append("reminder_advance_hours = ?")
            params.append(payload.reminder_advance_hours)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            sql = f"UPDATE user_settings SET {', '.join(updates)} WHERE user_id = ?;"
            params.append(user_id)
            cursor.execute(sql, tuple(params))

    return get_my_settings(current_user=current_user)

@router.put("/me/profile", response_model=UserResponse)
def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        updates = []
        params = []
        if payload.name:
            updates.append("name = ?")
            params.append(payload.name.strip())
        if payload.bio is not None:
            updates.append("bio = ?")
            params.append(payload.bio.strip())
        if payload.avatar_url:
            updates.append("avatar_url = ?")
            params.append(payload.avatar_url.strip())

        if updates:
            sql = f"UPDATE users SET {', '.join(updates)} WHERE id = ?;"
            params.append(user_id)
            cursor.execute(sql, tuple(params))

        cursor.execute("SELECT id, name, email, role, avatar_url, bio, created_at FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()

    return UserResponse(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=row["role"],
        avatarUrl=row["avatar_url"],
        bio=row["bio"],
        createdAt=str(row["created_at"]),
    )

@router.post("/me/change-password")
def change_my_password(
    payload: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user["id"]
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")

        stored_hash = row["password_hash"]
        if not verify_password(payload.current_password, stored_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

        new_hash = hash_password(payload.new_password)
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?;", (new_hash, user_id))

    return {"status": "success", "message": "Password updated successfully."}

@router.get("/me/reminders")
def get_my_reminders(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve deduplicated reminders for upcoming events, bookings, and performance milestones."""
    user_id = current_user["id"]
    role = current_user["role"]
    reminders = []

    with get_db() as conn:
        cursor = conn.cursor()

        if role == "performer":
            cursor.execute("""
            SELECT id, title, date, time, venue_name, status, expected_audience_size
            FROM performance_requests
            WHERE performer_id IN (SELECT id FROM performer_profiles WHERE user_id = ?)
               OR performer_name LIKE ?
            ORDER BY date ASC LIMIT 10;
            """, (user_id, f"%{current_user.get('name', '')}%"))
            for r in cursor.fetchall():
                reminders.append({
                    "id": f"rem-req-{r['id']}",
                    "title": f"Performance Pitch: {r['title']}",
                    "date": r["date"],
                    "time": r["time"] or "7:00 PM",
                    "venue": r["venue_name"] or "Pending Venue",
                    "status": r["status"],
                    "type": "pitch",
                    "note": f"Audience target: {r['expected_audience_size']} seats",
                })

        elif role == "provider":
            cursor.execute("""
            SELECT r.id, r.title, r.date, r.time, r.performer_name, r.status, v.name as venue_name
            FROM performance_requests r
            LEFT JOIN stage_venues v ON r.venue_id = v.id
            WHERE r.status = 'pending'
            ORDER BY r.date ASC LIMIT 10;
            """, ())
            for r in cursor.fetchall():
                reminders.append({
                    "id": f"rem-prov-{r['id']}",
                    "title": f"Pitch Awaiting Review: {r['title']}",
                    "date": r["date"],
                    "time": r["time"] or "Evening",
                    "venue": r["venue_name"] or "Your Stage",
                    "status": r["status"],
                    "type": "review_needed",
                    "note": f"Performer: {r['performer_name']}",
                })

        elif role == "audience":
            cursor.execute("""
            SELECT b.id, b.booking_code, b.seat_tier, b.seats_count, e.title, e.date, e.time, e.venue_name, e.city
            FROM bookings b
            LEFT JOIN performance_events e ON b.event_id = e.id
            WHERE b.user_id = ?
            ORDER BY e.date ASC LIMIT 10;
            """, (user_id,))
            for r in cursor.fetchall():
                reminders.append({
                    "id": f"rem-book-{r['id']}",
                    "title": f"Live Event: {r['title'] or 'Cultural Showcase'}",
                    "date": r["date"] or "2026-11-28",
                    "time": r["time"] or "7:30 PM",
                    "venue": f"{r['venue_name'] or 'Venue'}, {r['city'] or 'India'}",
                    "status": "confirmed",
                    "type": "booking",
                    "note": f"Pass Code: {r['booking_code']} · {r['seats_count']} Seats ({r['seat_tier']})",
                })

        else: # organiser / admin
            cursor.execute("SELECT id, title, target_amount, current_amount FROM causes LIMIT 5;")
            for r in cursor.fetchall():
                reminders.append({
                    "id": f"rem-cause-{r['id']}",
                    "title": f"Impact Campaign Milestone: {r['title']}",
                    "date": "2026-12-01",
                    "time": "10:00 AM",
                    "venue": "Delta Melody Foundation",
                    "status": "active",
                    "type": "campaign",
                    "note": f"Target: ₹{r['target_amount']:,} · Raised: ₹{r['current_amount']:,}",
                })

    return {"reminders": reminders, "total": len(reminders)}

@router.get("/me/calendar.ics")
def export_my_calendar_ics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Generate and export a valid RFC 5545 iCalendar (.ics) file containing user events."""
    user_id = current_user["id"]
    role = current_user["role"]

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//STAGE Platform//Cultural Events Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:STAGE Live Cultural Calendar",
        "X-WR-TIMEZONE:Asia/Kolkata",
    ]

    now_dt = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    with get_db() as conn:
        cursor = conn.cursor()
        if role == "performer":
            cursor.execute("SELECT id, title, date, time, venue_name, description FROM performance_requests WHERE status IN ('approved', 'pending') LIMIT 20;")
            events = cursor.fetchall()
            for ev in events:
                date_str = ev["date"].replace("-", "")
                lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:perf-{ev['id']}@stage.live",
                    f"DTSTAMP:{now_dt}",
                    f"DTSTART;VALUE=DATE:{date_str}",
                    f"SUMMARY:STAGE: {ev['title']}",
                    f"DESCRIPTION:{ev['description'] or 'Performance booking on STAGE'}",
                    f"LOCATION:{ev['venue_name'] or 'Registered Stage'}",
                    "STATUS:CONFIRMED",
                    "END:VEVENT",
                ])
        elif role == "audience":
            cursor.execute("""
            SELECT b.id, b.booking_code, e.title, e.date, e.time, e.venue_name, e.city
            FROM bookings b
            LEFT JOIN performance_events e ON b.event_id = e.id
            WHERE b.user_id = ? LIMIT 20;
            """, (user_id,))
            events = cursor.fetchall()
            for ev in events:
                d_str = (ev["date"] or "2026-11-28").replace("-", "")
                lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:pass-{ev['id']}@stage.live",
                    f"DTSTAMP:{now_dt}",
                    f"DTSTART;VALUE=DATE:{d_str}",
                    f"SUMMARY:STAGE Event: {ev['title'] or 'Cultural Event'}",
                    f"DESCRIPTION:Pass code: {ev['booking_code']}",
                    f"LOCATION:{ev['venue_name']}, {ev['city']}",
                    "STATUS:CONFIRMED",
                    "END:VEVENT",
                ])
        else:
            cursor.execute("SELECT id, title, date, time, venue_name, city FROM performance_events LIMIT 10;")
            events = cursor.fetchall()
            for ev in events:
                d_str = ev["date"].replace("-", "")
                lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:evt-{ev['id']}@stage.live",
                    f"DTSTAMP:{now_dt}",
                    f"DTSTART;VALUE=DATE:{d_str}",
                    f"SUMMARY:STAGE Event: {ev['title']}",
                    f"DESCRIPTION:Cultural event in {ev['city']}",
                    f"LOCATION:{ev['venue_name']}, {ev['city']}",
                    "STATUS:CONFIRMED",
                    "END:VEVENT",
                ])

    lines.append("END:VCALENDAR")
    ics_body = "\r\n".join(lines) + "\r\n"

    return Response(
        content=ics_body,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=stage-{role}-events.ics",
            "Cache-Control": "no-cache",
        },
    )

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, role, avatar_url, bio, created_at FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            role=row["role"],
            avatarUrl=row["avatar_url"],
            bio=row["bio"],
            createdAt=str(row["created_at"]),
        )
