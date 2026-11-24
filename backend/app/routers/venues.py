import json
import time
from fastapi import APIRouter, HTTPException
from typing import List
from app.database import get_db
from app.schemas.venue import VenueCreate, VenueResponse, VenueLocation, VenueCapacity, VenueHost

router = APIRouter(prefix="/api/venues", tags=["Venues"])

def row_to_venue(r) -> VenueResponse:
    suitable_cats = json.loads(r["suitable_categories"]) if r["suitable_categories"] else []
    amenities_list = json.loads(r["amenities"]) if r["amenities"] else []
    return VenueResponse(
        id=r["id"],
        name=r["name"],
        venueType=r["venue_type"],
        location=VenueLocation(
            address=r["address"],
            neighborhood=r["neighborhood"],
            city=r["city"],
        ),
        capacity=VenueCapacity(
            seated=r["seated_capacity"],
            standing=r["standing_capacity"],
            formatted=r["formatted_capacity"],
        ),
        suitableCategories=suitable_cats,
        amenities=amenities_list,
        availabilityNotice=r["availability_notice"],
        availabilityStatus=r["availability_status"],
        host=VenueHost(
            name=r["host_name"],
            role=r["host_role"],
            policy=r["host_policy"],
        ),
        imageUrl=r["image_url"],
        isDemonstration=bool(r["is_demonstration"]),
    )

@router.get("", response_model=List[VenueResponse])
def get_venues():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM stage_venues ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        return [row_to_venue(r) for r in rows]

@router.post("", response_model=VenueResponse, status_code=201)
def create_venue(payload: VenueCreate):
    venue_id = f"venue-{int(time.time() * 1000)}"
    
    with get_db() as conn:
        cursor = conn.cursor()
        # Check duplicate by name
        cursor.execute("SELECT id FROM stage_venues WHERE LOWER(name) = LOWER(?);", (payload.name.strip(),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="A venue with this name already exists")
            
        cursor.execute("""
        INSERT INTO stage_venues (
            id, name, venue_type, address, neighborhood, city,
            seated_capacity, standing_capacity, formatted_capacity,
            suitable_categories, amenities, availability_notice,
            availability_status, host_name, host_role, host_policy,
            image_url, is_demonstration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
        """, (
            venue_id,
            payload.name,
            payload.venueType,
            payload.location.address,
            payload.location.neighborhood,
            payload.location.city,
            payload.capacity.seated,
            payload.capacity.standing,
            payload.capacity.formatted,
            json.dumps(payload.suitableCategories),
            json.dumps(payload.amenities),
            payload.availabilityNotice or "Open for Weekend Dusk & Evening slots",
            payload.availabilityStatus or "open_slots",
            payload.host.name,
            payload.host.role,
            payload.host.policy,
            payload.imageUrl,
        ))

        # Push platform notification for Stage Provider
        notif_id = f"notif-{int(time.time() * 1000)}"
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'provider', 'Venue Listed Successfully', ?, 'Just now', 0, 'system');
        """, (notif_id, f"'{payload.name}' is now active for performer discovery."))

        cursor.execute("SELECT * FROM stage_venues WHERE id = ?;", (venue_id,))
        row = cursor.fetchone()
        return row_to_venue(row)

