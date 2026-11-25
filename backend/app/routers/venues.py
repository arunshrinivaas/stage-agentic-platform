import json
import time
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.database import get_db
from app.schemas.venue import VenueCreate, VenueResponse, VenueLocation, VenueCapacity, VenueHost
from app.services import venue_cache
from app.services.venue_cache import invalidate_venue_cache
from app.services.outbox import record_outbox_event
from app.services.auth import require_role

router = APIRouter(prefix="/api/venues", tags=["Venues"])

@router.get("/cache/stats")
def get_venue_cache_stats():
    """Retrieve operational cache statistics for venue discovery."""
    return venue_cache.get_cache_stats()

def resolve_venue_image_url(image_url: str | None, venue_type: str, venue_id: str = "") -> str:
    """Resolve category-matched, high-resolution aesthetic imagery when image_url is missing or empty."""
    if image_url and image_url.strip():
        return image_url.strip()
    
    t = (venue_type or "").lower()
    if "amphitheater" in t or "outdoor" in t or "seaside" in t:
        return "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&auto=format&fit=crop&q=85"
    if "loft" in t or "warehouse" in t or "industrial" in t:
        return "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=900&auto=format&fit=crop&q=85"
    if "garden" in t or "courtyard" in t:
        return "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&auto=format&fit=crop&q=85"
    if "cellar" in t or "listening" in t or "underground" in t:
        return "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&auto=format&fit=crop&q=85"
    if "pavilion" in t or "mandapam" in t or "heritage" in t:
        return "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=85"
    
    return "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop&q=85"

def row_to_venue(r) -> VenueResponse:
    suitable_cats = json.loads(r["suitable_categories"]) if r["suitable_categories"] else []
    amenities_list = json.loads(r["amenities"]) if r["amenities"] else []
    resolved_image = resolve_venue_image_url(r["image_url"], r["venue_type"], r["id"])
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
        imageUrl=resolved_image,
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
def create_venue(
    payload: VenueCreate,
    current_user: dict = Depends(require_role(["provider"])),
):
    venue_id = f"venue-{int(time.time() * 1000)}"
    
    with get_db() as conn:
        cursor = conn.cursor()
        # Check duplicate by name
        cursor.execute("SELECT id FROM stage_venues WHERE LOWER(name) = LOWER(?);", (payload.name.strip(),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="A venue with this name already exists")
            
        final_image_url = resolve_venue_image_url(payload.imageUrl, payload.venueType, venue_id)
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
            final_image_url,
        ))

        # Push platform notification for Stage Provider
        notif_id = f"notif-{int(time.time() * 1000)}"
        cursor.execute("""
        INSERT INTO notifications (id, role, title, message, timestamp, read, type)
        VALUES (?, 'provider', 'Venue Listed Successfully', ?, 'Just now', 0, 'system');
        """, (notif_id, f"'{payload.name}' is now active for performer discovery."))

        # Increment durable cache generation in the SAME database transaction
        venue_cache.increment_durable_generation(conn, namespace="venues")

        # Record transactional outbox event for Kafka publication
        record_outbox_event(
            conn=conn,
            event_type="venue.created",
            aggregate_type="venue",
            aggregate_id=venue_id,
            payload={
                "id": venue_id,
                "name": payload.name,
                "venue_type": payload.venueType,
                "city": payload.location.city,
                "neighborhood": payload.location.neighborhood,
                "seated_capacity": payload.capacity.seated,
                "standing_capacity": payload.capacity.standing,
                "suitable_categories": payload.suitableCategories,
                "amenities": payload.amenities,
                "host_name": payload.host.name,
            },
        )

        cursor.execute("SELECT * FROM stage_venues WHERE id = ?;", (venue_id,))
        row = cursor.fetchone()

    # Invalidate venue search cache strictly after successful DB insert
    invalidate_venue_cache()

    return row_to_venue(row)

