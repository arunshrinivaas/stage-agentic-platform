import time
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import List
from app.database import get_db
from app.schemas.request import (
    PerformanceRequestCreate,
    PerformanceRequestStatusUpdate,
    PerformanceRequestResponse,
)

router = APIRouter(prefix="/api/requests", tags=["Performance Requests"])

def row_to_request(r) -> PerformanceRequestResponse:
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
    )

@router.get("", response_model=List[PerformanceRequestResponse])
def get_requests():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM performance_requests ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        return [row_to_request(r) for r in rows]

@router.post("", response_model=PerformanceRequestResponse, status_code=201)
def create_request(payload: PerformanceRequestCreate):
    req_id = f"req-{int(time.time() * 1000)}"
    created_at = datetime.utcnow().strftime("%Y-%m-%d")
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO performance_requests (
            id, performer_id, performer_name, performer_handle,
            title, art_form, preferred_location, venue_id, venue_name,
            date, time, expected_audience_size, budget, currency,
            description, status, review_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?);
        """, (
            req_id,
            payload.performerId,
            payload.performerName,
            payload.performerHandle,
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
        ))

        # Push notification for Stage Provider
        notif_id = f"notif-{int(time.time() * 1000)}"
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'provider', 'New Incoming Performance Pitch', ?, 'Just now', 0, 'request');
        """, (notif_id, f"{payload.performerName} submitted a request for '{payload.title}'."))

        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (req_id,))
        row = cursor.fetchone()
        return row_to_request(row)

@router.patch("/{request_id}/status", response_model=PerformanceRequestResponse)
def update_request_status(request_id: str, payload: PerformanceRequestStatusUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Performance request not found")

        review_note = payload.reviewNote or (
            "Approved by venue host. Technical rider cleared."
            if payload.status == "approved"
            else "Declined by host."
        )

        cursor.execute("""
        UPDATE performance_requests
        SET status = ?, review_note = ?
        WHERE id = ?;
        """, (payload.status, review_note, request_id))

        # Push notification for Performer
        notif_id = f"notif-{int(time.time() * 1000)}"
        title = "Stage Request Approved!" if payload.status == "approved" else "Stage Request Update"
        venue_display = req["venue_name"] or "Venue host"
        message = f"{venue_display} marked '{req['title']}' as {payload.status}."

        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'performer', ?, ?, 'Just now', 0, 'approval');
        """, (notif_id, title, message))

        cursor.execute("SELECT * FROM performance_requests WHERE id = ?;", (request_id,))
        updated_row = cursor.fetchone()
        return row_to_request(updated_row)

