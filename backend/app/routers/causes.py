import time
from fastapi import APIRouter, HTTPException
from typing import List
from app.database import get_db
from app.schemas.cause import CauseCreate, CauseResponse, CauseOrganizer
from app.schemas.contribution import ContributionResponse

router = APIRouter(prefix="/api", tags=["Causes & Contributions"])

def row_to_cause(r) -> CauseResponse:
    return CauseResponse(
        id=r["id"],
        title=r["title"],
        tagline=r["tagline"],
        description=r["description"],
        targetAmount=r["target_amount"],
        currentAmount=r["current_amount"],
        currency=r["currency"] or "₹",
        linkedPerformancesCount=r["linked_performances_count"],
        organizer=CauseOrganizer(
            name=r["organizer_name"],
            type=r["organizer_type"],
            verified=bool(r["organizer_verified"]),
        ),
        focusArea=r["focus_area"],
        imageUrl=r["image_url"],
        isDemonstration=bool(r["is_demonstration"]),
    )

@router.get("/causes", response_model=List[CauseResponse])
def get_causes():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM causes ORDER BY created_at ASC;")
        rows = cursor.fetchall()
        return [row_to_cause(r) for r in rows]

@router.post("/causes", response_model=CauseResponse, status_code=201)
def create_cause(payload: CauseCreate):
    cause_id = f"cause-{int(time.time() * 1000)}"
    
    with get_db() as conn:
        cursor = conn.cursor()
        # Check duplicate by title
        cursor.execute("SELECT id FROM causes WHERE LOWER(title) = LOWER(?);", (payload.title.strip(),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="A campaign with this title already exists")

        org_name = payload.organizer.name if payload.organizer else "Compassion Arts Collective"
        org_type = payload.organizer.type if payload.organizer else "Grassroots Cultural Trust"
        org_verified = 1 if (payload.organizer and payload.organizer.verified) else 1

        cursor.execute("""
        INSERT INTO causes (
            id, title, tagline, description, target_amount, current_amount,
            currency, linked_performances_count, organizer_name, organizer_type,
            organizer_verified, focus_area, image_url, is_demonstration
        ) VALUES (?, ?, ?, ?, ?, 0.0, ?, 0, ?, ?, ?, ?, ?, 1);
        """, (
            cause_id,
            payload.title,
            payload.tagline,
            payload.description,
            payload.targetAmount,
            payload.currency or "₹",
            org_name,
            org_type,
            org_verified,
            payload.focusArea,
            payload.imageUrl,
        ))

        cursor.execute("SELECT * FROM causes WHERE id = ?;", (cause_id,))
        row = cursor.fetchone()
        return row_to_cause(row)

@router.get("/contributions", response_model=List[ContributionResponse])
def get_contributions():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contributions ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        return [
            ContributionResponse(
                id=r["id"],
                causeId=r["cause_id"],
                causeTitle=r["cause_title"],
                eventId=r["event_id"],
                eventTitle=r["event_title"],
                performerName=r["performer_name"],
                venueName=r["venue_name"],
                date=r["date"],
                ticketsSold=r["tickets_sold"],
                grossProceeds=r["gross_proceeds"],
                pledgedPercentage=r["pledged_percentage"],
                impactAmount=r["impact_amount"],
                currency=r["currency"] or "₹",
                isSimulated=bool(r["is_simulated"]),
            )
            for r in rows
        ]

