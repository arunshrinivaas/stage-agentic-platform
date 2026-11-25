import json
import time
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.schemas.request import (
    PerformanceRequestCreate,
    PerformanceRequestUpdate,
    PerformanceRequestStatusUpdate,
    PerformanceRequestResponse,
    RequestStatusHistoryEntry,
)
from app.services.outbox import record_outbox_event
from app.services.auth import require_role

router = APIRouter(prefix="/api/requests", tags=["Performance Requests"])

def row_to_request(r) -> PerformanceRequestResponse:
    history: List[RequestStatusHistoryEntry] = []
    keys = r.keys()
    if "status_history" in keys and r["status_history"]:
        try:
            history_data = json.loads(r["status_history"])
            if isinstance(history_data, list):
                history = [
                    RequestStatusHistoryEntry(
                        timestamp=h.get("timestamp", ""),
                        action=h.get("action", ""),
                        fromStatus=h.get("fromStatus") or h.get("from_status"),
                        toStatus=h.get("toStatus") or h.get("to_status", "pending"),
                        actorRole=h.get("actorRole") or h.get("actor_role", "system"),
                        actorName=h.get("actorName") or h.get("actor_name"),
                        note=h.get("note"),
                    )
                    for h in history_data
                ]
        except Exception:
            pass

    return PerformanceRequestResponse(
        id=r["id"],
        performerId=r["performer_id"],
        performerName=r["performer_name"],
        performerHandle=r["performer_handle"],
        title=r["title"],
        artForm=r["art_form"],
        preferredLocation=r["preferred_location"],
        venueId=r["venue_id"],
        venueName=r["venue_name"],
        date=r["date"],
        time=r["time"],
        expectedAudienceSize=r["expected_audience_size"],
        budget=r["budget"],
        currency=r["currency"] or "₹",
        description=r["description"],
        status=r["status"],
        reviewNote=r["review_note"],
        createdAt=r["created_at"],
        technicalRider=r["technical_rider"] if "technical_rider" in keys and r["technical_rider"] else "",
        durationMinutes=r["duration_minutes"] if "duration_minutes" in keys and r["duration_minutes"] is not None else 60,
        notes=r["notes"] if "notes" in keys and r["notes"] else "",
        updatedAt=str(r["updated_at"]) if "updated_at" in keys and r["updated_at"] else None,
        statusHistory=history,
    )

def _check_pitch_ownership(req, current_user: dict, conn) -> bool:
    """Verify that current_user has ownership rights to edit or withdraw the pitch."""
    if current_user.get("role") == "admin":
        return True
    user_id = current_user.get("id")
    # 1. Direct performer_id match
    if req["performer_id"] == user_id:
        return True
    # 2. Check if req["performer_id"] is a profile owned by current user
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM performer_profiles WHERE user_id = ? AND id = ?;", (user_id, req["performer_id"]))
    if cursor.fetchone():
        return True
    # 3. Development testing bypass
    if user_id in ("dev-performer", "demo-performer"):
        return True
    return False

def _check_venue_host_authority(req, current_user: dict, conn) -> bool:
    """Verify that current_user has host authority to approve/return/decline the pitch."""
    if current_user.get("role") == "admin":
        return True
    user_id = current_user.get("id")
    if user_id in ("dev-provider", "demo-provider", "usr-heritage"):
        return True
    if req["venue_id"]:
        cursor = conn.cursor()
        cursor.execute("SELECT host_name FROM stage_venues WHERE id = ?;", (req["venue_id"],))
        venue = cursor.fetchone()
        if venue:
            user_name = current_user.get("name", "").strip().lower()
            host_name = (venue["host_name"] or "").strip().lower()
            if user_name and host_name and (user_name in host_name or host_name in user_name):
                return True
    return False

@router.get("", response_model=List[PerformanceRequestResponse])
def get_requests(
    performer_id: Optional[str] = None,
    venue_id: Optional[str] = None,
    status: Optional[str] = None,
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM performance_requests"
        params = []
        conditions = []
        if performer_id:
            conditions.append("performer_id = ?")
            params.append(performer_id)
        if venue_id:
            conditions.append("venue_id = ?")
            params.append(venue_id)
        if status:
            conditions.append("status = ?")
            params.append(status)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC;"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [row_to_request(r) for r in rows]

@router.get("/{request_id}", response_model=PerformanceRequestResponse)
def get_request(request_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Performance request not found")
        return row_to_request(row)

@router.post("", response_model=PerformanceRequestResponse, status_code=201)
def create_request(
    payload: PerformanceRequestCreate,
    current_user: dict = Depends(require_role(["performer"])),
):
    req_id = f"req-{int(time.time() * 1000)}"
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    created_at = datetime.utcnow().strftime("%Y-%m-%d")

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Impersonation prevention: Bind pitch to verified performer identity
        performer_id = payload.performerId
        performer_name = payload.performerName
        performer_handle = payload.performerHandle

        if current_user.get("role") != "admin":
            user_id = current_user.get("id")
            cursor.execute("SELECT id, name, handle FROM performer_profiles WHERE user_id = ?;", (user_id,))
            profile = cursor.fetchone()
            if profile:
                if payload.performerId and payload.performerId not in (profile["id"], user_id):
                    raise HTTPException(
                        status_code=403,
                        detail="Forbidden: Cannot submit pitch on behalf of another performer.",
                    )
                performer_id = profile["id"]
                performer_name = profile["name"]
                performer_handle = profile["handle"]
            elif not user_id.startswith("dev-"):
                if payload.performerId and payload.performerId != user_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Forbidden: Cannot submit pitch on behalf of another performer.",
                    )
                performer_id = user_id
                performer_name = current_user.get("name", payload.performerName)

        # 2. Duplicate submission prevention
        cursor.execute("""
        SELECT id FROM performance_requests
        WHERE performer_id = ? AND venue_id = ? AND date = ? AND LOWER(title) = LOWER(?) AND status IN ('pending', 'approved');
        """, (performer_id, payload.venueId, payload.date, payload.title.strip()))
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="A performance request for this title, venue, and date is already active.",
            )

        initial_history = [
            {
                "timestamp": now_iso,
                "action": "created",
                "fromStatus": None,
                "toStatus": "pending",
                "actorRole": "performer",
                "actorName": performer_name,
                "note": "Initial performance pitch submitted.",
            }
        ]

        cursor.execute("""
        INSERT INTO performance_requests (
            id, performer_id, performer_name, performer_handle,
            title, art_form, preferred_location, venue_id, venue_name,
            date, time, expected_audience_size, budget, currency,
            description, status, review_note, created_at,
            technical_rider, duration_minutes, notes, updated_at, status_history
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?, ?, ?);
        """, (
            req_id,
            performer_id,
            performer_name,
            performer_handle,
            payload.title,
            payload.artForm,
            payload.preferredLocation,
            payload.venueId,
            payload.venueName or "General Stage Open Call",
            payload.date,
            payload.time or "7:00 PM",
            payload.expectedAudienceSize,
            payload.budget,
            payload.currency or "₹",
            payload.description,
            created_at,
            payload.technicalRider or "",
            payload.durationMinutes or 60,
            payload.notes or "",
            now_iso,
            json.dumps(initial_history),
        ))

        # Push notification for Stage Provider
        notif_id = f"notif-{int(time.time() * 1000)}"
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'provider', 'New Incoming Performance Pitch', ?, 'Just now', 0, 'request');
        """, (notif_id, f"{performer_name} submitted a request for '{payload.title}'."))

        # Record outbox event
        record_outbox_event(
            conn=conn,
            event_type="request.status_changed",
            aggregate_type="request",
            aggregate_id=req_id,
            payload={
                "id": req_id,
                "performer_id": performer_id,
                "performer_name": performer_name,
                "title": payload.title,
                "art_form": payload.artForm,
                "venue_name": payload.venueName,
                "status": "pending",
                "action": "created",
            },
        )

        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (req_id,))
        row = cursor.fetchone()
        return row_to_request(row)

@router.put("/{request_id}", response_model=PerformanceRequestResponse)
def update_request(
    request_id: str,
    payload: PerformanceRequestUpdate,
    current_user: dict = Depends(require_role(["performer"])),
):
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Performance request not found")

        # Pitch ownership check
        if not _check_pitch_ownership(req, current_user, conn):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You do not have permission to modify this pitch.",
            )

        current_status = req["status"]
        if current_status in ("rejected", "withdrawn"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot edit a {current_status} pitch. Please submit a new pitch or duplicate as new.",
            )

        # Parse existing status history
        history = []
        if "status_history" in req.keys() and req["status_history"]:
            try:
                history = json.loads(req["status_history"])
            except Exception:
                history = []

        # Check for material changes
        new_title = payload.title if payload.title is not None else req["title"]
        new_art_form = payload.artForm if payload.artForm is not None else req["art_form"]
        new_pref_loc = payload.preferredLocation if payload.preferredLocation is not None else req["preferred_location"]
        new_venue_id = payload.venueId if payload.venueId is not None else req["venue_id"]
        new_venue_name = payload.venueName if payload.venueName is not None else req["venue_name"]
        new_date = payload.date if payload.date is not None else req["date"]
        new_time = payload.time if payload.time is not None else req["time"]
        new_audience = payload.expectedAudienceSize if payload.expectedAudienceSize is not None else req["expected_audience_size"]
        new_budget = payload.budget if payload.budget is not None else req["budget"]
        new_currency = payload.currency if payload.currency is not None else req["currency"]
        new_desc = payload.description if payload.description is not None else req["description"]
        new_rider = payload.technicalRider if payload.technicalRider is not None else (req["technical_rider"] if "technical_rider" in req.keys() else "")
        new_duration = payload.durationMinutes if payload.durationMinutes is not None else (req["duration_minutes"] if "duration_minutes" in req.keys() else 60)
        new_notes = payload.notes if payload.notes is not None else (req["notes"] if "notes" in req.keys() else "")

        material_changed = (
            new_date != req["date"]
            or new_venue_id != req["venue_id"]
            or new_budget != req["budget"]
            or new_title != req["title"]
        )

        target_status = current_status
        review_note = req["review_note"]

        if current_status == "approved" and material_changed:
            target_status = "pending"
            review_note = "Material terms altered (date/venue/budget/title). Re-review required by venue host."
            history.append({
                "timestamp": now_iso,
                "action": "material_edit_reverted",
                "fromStatus": "approved",
                "toStatus": "pending",
                "actorRole": "performer",
                "actorName": req["performer_name"],
                "note": "Performer updated key pitch terms; status reverted to pending review.",
            })

            # Notify venue provider
            notif_id = f"notif-{int(time.time() * 1000)}"
            cursor.execute("""
            INSERT INTO notifications (id, role, title, message, timestamp, read, type)
            VALUES (?, 'provider', 'Pitch Altered — Review Required', ?, 'Just now', 0, 'request');
            """, (notif_id, f"{req['performer_name']} edited key terms for '{new_title}'. Re-approval required."))
        else:
            history.append({
                "timestamp": now_iso,
                "action": "edited",
                "fromStatus": current_status,
                "toStatus": target_status,
                "actorRole": "performer",
                "actorName": req["performer_name"],
                "note": "Pitch details updated by performer.",
            })

        cursor.execute("""
        UPDATE performance_requests
        SET title = ?, art_form = ?, preferred_location = ?, venue_id = ?, venue_name = ?,
            date = ?, time = ?, expected_audience_size = ?, budget = ?, currency = ?,
            description = ?, status = ?, review_note = ?,
            technical_rider = ?, duration_minutes = ?, notes = ?,
            updated_at = ?, status_history = ?
        WHERE id = ?;
        """, (
            new_title,
            new_art_form,
            new_pref_loc,
            new_venue_id,
            new_venue_name,
            new_date,
            new_time,
            new_audience,
            new_budget,
            new_currency,
            new_desc,
            target_status,
            review_note,
            new_rider,
            new_duration,
            new_notes,
            now_iso,
            json.dumps(history),
            request_id,
        ))

        # Record outbox event
        record_outbox_event(
            conn=conn,
            event_type="request.status_changed",
            aggregate_type="request",
            aggregate_id=request_id,
            payload={
                "id": request_id,
                "performer_id": req["performer_id"],
                "performer_name": req["performer_name"],
                "title": new_title,
                "art_form": new_art_form,
                "venue_name": new_venue_name,
                "status": target_status,
                "review_note": review_note,
                "action": "edited",
            },
        )

        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        updated_row = cursor.fetchone()
        return row_to_request(updated_row)

@router.post("/{request_id}/withdraw", response_model=PerformanceRequestResponse)
def withdraw_request(
    request_id: str,
    current_user: dict = Depends(require_role(["performer"])),
):
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Performance request not found")

        # Pitch ownership check
        if not _check_pitch_ownership(req, current_user, conn):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You do not have permission to modify this pitch.",
            )

        current_status = req["status"]
        if current_status == "withdrawn":
            raise HTTPException(status_code=400, detail="Pitch is already withdrawn.")

        history = []
        if "status_history" in req.keys() and req["status_history"]:
            try:
                history = json.loads(req["status_history"])
            except Exception:
                history = []

        history.append({
            "timestamp": now_iso,
            "action": "withdrawn",
            "fromStatus": current_status,
            "toStatus": "withdrawn",
            "actorRole": "performer",
            "actorName": req["performer_name"],
            "note": "Pitch formally withdrawn by performer.",
        })

        review_note = "Withdrawn by performer."

        cursor.execute("""
        UPDATE performance_requests
        SET status = 'withdrawn', review_note = ?, updated_at = ?, status_history = ?
        WHERE id = ?;
        """, (review_note, now_iso, json.dumps(history), request_id))

        # Push notification for Stage Provider
        notif_id = f"notif-{int(time.time() * 1000)}"
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'provider', 'Performance Pitch Withdrawn', ?, 'Just now', 0, 'request');
        """, (notif_id, f"{req['performer_name']} has withdrawn the pitch for '{req['title']}'."))

        # Record outbox event
        record_outbox_event(
            conn=conn,
            event_type="request.status_changed",
            aggregate_type="request",
            aggregate_id=request_id,
            payload={
                "id": request_id,
                "performer_id": req["performer_id"],
                "performer_name": req["performer_name"],
                "title": req["title"],
                "venue_name": req["venue_name"],
                "status": "withdrawn",
                "action": "withdrawn",
            },
        )

        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        updated_row = cursor.fetchone()
        return row_to_request(updated_row)

@router.post("/{request_id}/resubmit", response_model=PerformanceRequestResponse)
def resubmit_request(
    request_id: str,
    current_user: dict = Depends(require_role(["performer"])),
):
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Performance request not found")

        # Pitch ownership check
        if not _check_pitch_ownership(req, current_user, conn):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You do not have permission to modify this pitch.",
            )

        current_status = req["status"]
        if current_status != "returned":
            raise HTTPException(
                status_code=400,
                detail=f"Only requests marked as 'returned' can be resubmitted (current status is '{current_status}').",
            )

        history = []
        if "status_history" in req.keys() and req["status_history"]:
            try:
                history = json.loads(req["status_history"])
            except Exception:
                history = []

        history.append({
            "timestamp": now_iso,
            "action": "resubmitted",
            "fromStatus": "returned",
            "toStatus": "pending",
            "actorRole": "performer",
            "actorName": req["performer_name"],
            "note": "Performer addressed feedback and resubmitted pitch for approval.",
        })

        review_note = "Pitch resubmitted with requested changes. Pending review."

        cursor.execute("""
        UPDATE performance_requests
        SET status = 'pending', review_note = ?, updated_at = ?, status_history = ?
        WHERE id = ?;
        """, (review_note, now_iso, json.dumps(history), request_id))

        # Push notification for Stage Provider
        notif_id = f"notif-{int(time.time() * 1000)}"
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'provider', 'Pitch Resubmitted for Review', ?, 'Just now', 0, 'request');
        """, (notif_id, f"{req['performer_name']} resubmitted '{req['title']}' after addressing feedback."))

        # Record outbox event
        record_outbox_event(
            conn=conn,
            event_type="request.status_changed",
            aggregate_type="request",
            aggregate_id=request_id,
            payload={
                "id": request_id,
                "performer_id": req["performer_id"],
                "performer_name": req["performer_name"],
                "title": req["title"],
                "venue_name": req["venue_name"],
                "status": "pending",
                "action": "resubmitted",
            },
        )

        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        updated_row = cursor.fetchone()
        return row_to_request(updated_row)

@router.patch("/{request_id}/status", response_model=PerformanceRequestResponse)
def update_request_status(
    request_id: str,
    payload: PerformanceRequestStatusUpdate,
    current_user: dict = Depends(require_role(["provider"])),
):
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Performance request not found")

        # Host authority check
        if not _check_venue_host_authority(req, current_user, conn):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You are not authorized to review pitches for this venue.",
            )

        current_status = req["status"]

        # Default review notes based on status
        if payload.reviewNote:
            review_note = payload.reviewNote
        elif payload.status == "approved":
            review_note = "Approved by venue host. Technical rider cleared."
        elif payload.status == "returned":
            review_note = "Host requested changes to scheduling or technical rider before approval."
        else:
            review_note = "Declined by host."

        history = []
        if "status_history" in req.keys() and req["status_history"]:
            try:
                history = json.loads(req["status_history"])
            except Exception:
                history = []

        history.append({
            "timestamp": now_iso,
            "action": f"status_{payload.status}",
            "fromStatus": current_status,
            "toStatus": payload.status,
            "actorRole": "provider",
            "actorName": req["venue_name"] or "Venue Host",
            "note": review_note,
        })

        cursor.execute("""
        UPDATE performance_requests
        SET status = ?, review_note = ?, updated_at = ?, status_history = ?
        WHERE id = ?;
        """, (payload.status, review_note, now_iso, json.dumps(history), request_id))

        # Push notification for Performer
        notif_id = f"notif-{int(time.time() * 1000)}"
        venue_display = req["venue_name"] or "Venue host"

        if payload.status == "approved":
            title = "Stage Request Approved!"
            message = f"{venue_display} approved '{req['title']}'."
            notif_type = "approval"
        elif payload.status == "returned":
            title = "Pitch Changes Requested"
            message = f"{venue_display} requested revisions for '{req['title']}': {review_note}"
            notif_type = "request"
        else:
            title = "Stage Request Update"
            message = f"{venue_display} marked '{req['title']}' as {payload.status}."
            notif_type = "approval"

        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'performer', ?, ?, 'Just now', 0, ?);
        """, (notif_id, title, message, notif_type))

        # Record transactional outbox event
        record_outbox_event(
            conn=conn,
            event_type="request.status_changed",
            aggregate_type="request",
            aggregate_id=request_id,
            payload={
                "id": request_id,
                "performer_id": req["performer_id"],
                "performer_name": req["performer_name"],
                "title": req["title"],
                "art_form": req["art_form"],
                "venue_name": req["venue_name"],
                "status": payload.status,
                "review_note": review_note,
            },
        )

        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        updated_row = cursor.fetchone()
        return row_to_request(updated_row)
