import re
import time
import random
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from app.database import get_db
from app.services.auth import require_role
from app.schemas.event import (
    EventResponse,
    EventPerformer,
    EventLocation,
    EventSeats,
    EventLinkedCause,
)
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.outbox import record_outbox_event
from app.services.pass_service import issue_digital_pass
from app.services.financial_settlement import create_settlement_for_contribution

router = APIRouter(prefix="/api", tags=["Events & Bookings"])

def row_to_event(r) -> EventResponse:
    linked_cause = None
    if r["cause_id"] and r["cause_name"]:
        linked_cause = EventLinkedCause(
            id=r["cause_id"],
            name=r["cause_name"],
            percentageContribution=r["cause_percentage"] or 0.0,
        )

    return EventResponse(
        id=r["id"],
        title=r["title"],
        performer=EventPerformer(
            name=r["performer_name"],
            handle=r["performer_handle"],
            avatarUrl=r["performer_avatar_url"] or "",
            bio=r["performer_bio"] or "",
        ),
        artForm=r["art_form"],
        subGenre=r["sub_genre"],
        date=r["date"],
        time=r["time"],
        dateTimeISO=r["date_time_iso"],
        location=EventLocation(
            venueName=r["venue_name"],
            neighborhood=r["neighborhood"],
            city=r["city"],
            isIndoor=bool(r["is_indoor"]),
        ),
        seats=EventSeats(
            total=r["total_seats"],
            available=r["available_seats"],
            priceLabel=r["price_label"],
            status=r["seat_status"],
        ),
        imageUrl=r["image_url"],
        description=r["description"],
        linkedCause=linked_cause,
        isDemonstration=bool(r["is_demonstration"]),
        featured=bool(r["featured"]),
    )

@router.get("/events", response_model=List[EventResponse])
def get_events():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events ORDER BY created_at ASC;")
        rows = cursor.fetchall()
        return [row_to_event(r) for r in rows]

@router.get("/bookings", response_model=List[BookingResponse])
def get_bookings(
    event_id: Optional[str] = None,
    attendee_email: Optional[str] = None,
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM bookings"
        params = []
        conditions = []
        if event_id:
            conditions.append("event_id = ?")
            params.append(event_id)
        if attendee_email:
            conditions.append("LOWER(attendee_email) = LOWER(?)")
            params.append(attendee_email.strip())
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY booked_at DESC;"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [
            BookingResponse(
                id=r["id"],
                bookingCode=r["booking_code"],
                eventId=r["event_id"],
                eventTitle=r["event_title"],
                eventArtForm=r["event_art_form"],
                eventDate=r["event_date"],
                eventTime=r["event_time"],
                venueName=r["venue_name"],
                city=r["city"],
                ticketCount=r["ticket_count"],
                totalPaid=r["total_paid"],
                currency=r["currency"] or "₹",
                attendeeName=r["attendee_name"],
                attendeeEmail=r["attendee_email"],
                linkedCauseName=r["linked_cause_name"],
                causeContributionAmount=r["cause_contribution_amount"],
                bookedAt=r["booked_at"],
                qrCodePlaceholder=r["qr_code_placeholder"],
                status=r["status"],
                isSimulated=bool(r["is_simulated"]),
            )
            for r in rows
        ]

@router.post("/bookings", response_model=BookingResponse, status_code=201)
def create_booking(
    payload: BookingCreate,
    current_user: dict = Depends(require_role(["audience"])),
):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events WHERE id = ?;", (payload.eventId,))
        event = cursor.fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        available_seats = event["available_seats"]
        if available_seats < payload.ticketCount:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough seats available ({available_seats} remaining)"
            )

        # Deterministic price parsing from price_label
        match = re.search(r"\d[\d,]*", event["price_label"])
        ticket_price = int(match.group(0).replace(",", "")) if match else 450
        total_paid = float(ticket_price * payload.ticketCount)

        cause_contrib = 0.0
        if event["cause_id"] and event["cause_percentage"]:
            cause_contrib = round(total_paid * (event["cause_percentage"] / 100.0), 2)

        booking_id = f"book-{int(time.time() * 1000)}"
        city_prefix = (event["city"][:3] if event["city"] else "STG").upper()
        booking_code = f"STG-{random.randint(1000, 9999)}-{city_prefix}"
        booked_at = datetime.utcnow().isoformat()
        qr_code = f"STG-PASS-{int(time.time())}"

        # 1. Insert booking
        cursor.execute("""
        INSERT INTO bookings (
            id, booking_code, event_id, event_title, event_art_form,
            event_date, event_time, venue_name, city, ticket_count,
            total_paid, currency, attendee_name, attendee_email,
            linked_cause_name, cause_contribution_amount, booked_at,
            qr_code_placeholder, status, is_simulated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '₹', ?, ?, ?, ?, ?, ?, 'confirmed', 1);
        """, (
            booking_id,
            booking_code,
            event["id"],
            event["title"],
            event["art_form"],
            event["date"],
            event["time"],
            event["venue_name"],
            event["city"],
            payload.ticketCount,
            total_paid,
            payload.attendeeName,
            payload.attendeeEmail,
            event["cause_name"],
            cause_contrib,
            booked_at,
            qr_code,
        ))

        # 2. Decrement available seats in event
        new_avail = available_seats - payload.ticketCount
        new_status = "sold_out" if new_avail == 0 else "limited" if new_avail <= 5 else event["seat_status"]
        cursor.execute("""
        UPDATE events
        SET available_seats = ?, seat_status = ?
        WHERE id = ?;
        """, (new_avail, new_status, event["id"]))

        # 3. If linked cause, increment cause pool and add to contributions ledger
        if event["cause_id"] and cause_contrib > 0:
            cursor.execute("""
            UPDATE causes
            SET current_amount = current_amount + ?
            WHERE id = ?;
            """, (cause_contrib, event["cause_id"]))

            led_id = f"led-{int(time.time() * 1000)}"
            cursor.execute("""
            INSERT INTO contributions (
                id, cause_id, cause_title, event_id, event_title,
                performer_name, venue_name, booking_id, date, tickets_sold,
                gross_proceeds, pledged_percentage, impact_amount, currency, is_simulated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '₹', 1);
            """, (
                led_id,
                event["cause_id"],
                event["cause_name"] or "Social Impact Initiative",
                event["id"],
                event["title"],
                event["performer_name"],
                event["venue_name"],
                booking_id,
                datetime.utcnow().strftime("%Y-%m-%d"),
                payload.ticketCount,
                total_paid,
                event["cause_percentage"],
                cause_contrib,
            ))

            # Create deterministic financial settlement record
            create_settlement_for_contribution(
                contribution_id=led_id,
                campaign_id=event["cause_id"],
                event_id=event["id"],
                gross_amount=Decimal(str(total_paid)),
                currency="₹",
                conn=conn,
            )

            # Record transactional outbox event for contribution
            record_outbox_event(
                conn=conn,
                event_type="contribution.recorded",
                aggregate_type="contribution",
                aggregate_id=led_id,
                payload={
                    "id": led_id,
                    "cause_id": event["cause_id"],
                    "cause_title": event["cause_name"] or "Social Impact Initiative",
                    "event_id": event["id"],
                    "event_title": event["title"],
                    "performer_name": event["performer_name"],
                    "venue_name": event["venue_name"],
                    "booking_id": booking_id,
                    "tickets_sold": payload.ticketCount,
                    "gross_proceeds": total_paid,
                    "impact_amount": cause_contrib,
                    "currency": "₹",
                },
            )

        # 4. Push booking notification
        notif_id = f"notif-{int(time.time() * 1000)}"
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'audience', 'Booking Confirmed', ?, 'Just now', 0, 'booking');
        """, (notif_id, f"Pass {booking_code} for '{event['title']}' is confirmed."))

        # 5. Record transactional outbox event for booking
        record_outbox_event(
            conn=conn,
            event_type="booking.created",
            aggregate_type="booking",
            aggregate_id=booking_id,
            payload={
                "id": booking_id,
                "booking_code": booking_code,
                "event_id": event["id"],
                "event_title": event["title"],
                "event_art_form": event["art_form"],
                "event_date": event["date"],
                "venue_name": event["venue_name"],
                "city": event["city"],
                "ticket_count": payload.ticketCount,
                "total_paid": total_paid,
                "currency": "₹",
                "attendee_name": payload.attendeeName,
                "attendee_email": payload.attendeeEmail,
                "linked_cause_name": event["cause_name"],
                "cause_contribution_amount": cause_contrib,
                "status": "confirmed",
            },
        )

        # 6. Issue verified digital pass
        issue_digital_pass(
            booking_id=booking_id,
            event_id=event["id"],
            user_id=current_user.get("id"),
            booking_code=booking_code,
            conn=conn,
        )

        cursor.execute("SELECT * FROM bookings WHERE id = ?;", (booking_id,))
        row = cursor.fetchone()
        return BookingResponse(
            id=row["id"],
            bookingCode=row["booking_code"],
            eventId=row["event_id"],
            eventTitle=row["event_title"],
            eventArtForm=row["event_art_form"],
            eventDate=row["event_date"],
            eventTime=row["event_time"],
            venueName=row["venue_name"],
            city=row["city"],
            ticketCount=row["ticket_count"],
            totalPaid=row["total_paid"],
            currency=row["currency"] or "₹",
            attendeeName=row["attendee_name"],
            attendeeEmail=row["attendee_email"],
            linkedCauseName=row["linked_cause_name"],
            causeContributionAmount=row["cause_contribution_amount"],
            bookedAt=row["booked_at"],
            qrCodePlaceholder=row["qr_code_placeholder"],
            status=row["status"],
            isSimulated=bool(row["is_simulated"]),
        )

