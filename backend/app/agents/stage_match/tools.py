"""Specialist tools for StageMatch agent.
Searches SQLite venue records and performs deterministic matching calculations.
"""
from typing import Optional, List, Dict, Any
import json
from app.database import get_db
from app.services import venue_cache

def search_stages(
    city: Optional[str] = None,
    art_form: Optional[str] = None,
    min_capacity: Optional[int] = None,
    max_capacity: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Search registered stage venues from the database using optional filters.

    Args:
        city: Optional city name to filter by (e.g. 'Kolkata', 'Chennai', 'Mumbai').
        art_form: Optional art form category to check compatibility (e.g. 'Music', 'Theatre', 'Dance').
        min_capacity: Optional minimum seated capacity.
        max_capacity: Optional maximum seated capacity.

    Returns:
        A list of matching venue records with capacity, categories, and amenities.
    """
    # 1. Attempt to verify durable generation for cache lookup; fail closed if unavailable
    current_gen: Optional[int] = None
    try:
        current_gen = venue_cache.get_durable_generation()
    except Exception:
        current_gen = None

    if current_gen is not None:
        try:
            cached = venue_cache.get_cached_search(
                city=city,
                art_form=art_form,
                min_capacity=min_capacity,
                max_capacity=max_capacity,
                generation=current_gen,
            )
            if cached is not None:
                # Post-read verification: re-verify durable generation to eliminate race
                # condition if venue creation committed generation G+1 during cache lookup.
                try:
                    verify_gen = venue_cache.get_durable_generation()
                except Exception:
                    verify_gen = None

                if verify_gen is not None and verify_gen == current_gen:
                    return cached
                # If generation changed or verification failed, discard cached result and execute SQLite query
        except Exception:
            pass

    query = "SELECT * FROM stage_venues WHERE 1=1"
    params: List[Any] = []

    if city and city.strip():
        query += " AND LOWER(city) = LOWER(?)"
        params.append(city.strip())

    if min_capacity is not None:
        query += " AND seated_capacity >= ?"
        params.append(min_capacity)

    if max_capacity is not None:
        query += " AND seated_capacity <= ?"
        params.append(max_capacity)

    query += " ORDER BY seated_capacity ASC"

    with get_db() as conn:
        # Snapshot durable generation within the EXACT SAME SQLite transaction as the query
        read_gen: Optional[int] = None
        try:
            read_gen = venue_cache.get_durable_generation(conn)
        except Exception:
            read_gen = None

        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

        results: List[Dict[str, Any]] = []
        for r in rows:
            try:
                categories = json.loads(r["suitable_categories"]) if r["suitable_categories"] else []
            except Exception:
                categories = [r["suitable_categories"]] if r["suitable_categories"] else []

            try:
                amenities = json.loads(r["amenities"]) if r["amenities"] else []
            except Exception:
                amenities = []

            # Art form filtering in python if requested
            if art_form and art_form.strip():
                req_af = art_form.strip().lower()
                if not any(req_af in cat.lower() for cat in categories):
                    continue

            results.append({
                "id": r["id"],
                "name": r["name"],
                "venue_type": r["venue_type"],
                "address": r["address"],
                "neighborhood": r["neighborhood"],
                "city": r["city"],
                "seated_capacity": r["seated_capacity"],
                "standing_capacity": r["standing_capacity"],
                "suitable_categories": categories,
                "amenities": amenities,
                "availability_notice": r["availability_notice"],
                "availability_status": r["availability_status"],
                "host_name": r["host_name"],
                "host_policy": r["host_policy"],
            })

    # Only write to Redis if the generation snapshot was verified in the transaction
    if read_gen is not None:
        try:
            venue_cache.set_cached_search(
                city=city,
                art_form=art_form,
                min_capacity=min_capacity,
                max_capacity=max_capacity,
                results=results,
                generation=read_gen,
            )
        except Exception:
            pass

    return results

def get_stage_details(venue_id: str) -> Dict[str, Any]:
    """Retrieve full specifications and host policies for a specific venue.

    Args:
        venue_id: The unique ID or exact name of the venue (e.g. 'venue-01').

    Returns:
        Detailed venue dictionary or error if not found.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM stage_venues WHERE id = ? OR LOWER(name) = LOWER(?);", (venue_id, venue_id))
        row = cursor.fetchone()
        if not row:
            return {"error": f"Venue '{venue_id}' not found in registry."}

        try:
            categories = json.loads(row["suitable_categories"]) if row["suitable_categories"] else []
        except Exception:
            categories = [row["suitable_categories"]]

        try:
            amenities = json.loads(row["amenities"]) if row["amenities"] else []
        except Exception:
            amenities = []

        return {
            "id": row["id"],
            "name": row["name"],
            "venue_type": row["venue_type"],
            "address": row["address"],
            "neighborhood": row["neighborhood"],
            "city": row["city"],
            "seated_capacity": row["seated_capacity"],
            "standing_capacity": row["standing_capacity"],
            "suitable_categories": categories,
            "amenities": amenities,
            "availability_notice": row["availability_notice"],
            "availability_status": row["availability_status"],
            "host_name": row["host_name"],
            "host_policy": row["host_policy"],
            "is_demonstration": bool(row["is_demonstration"]),
        }

def calculate_match_score(
    venue_id: str,
    city: str,
    expected_audience: int,
    art_form: str,
    budget: Optional[float] = None,
) -> Dict[str, Any]:
    """Calculate a deterministic compatibility score (0-100%) between a performance requirement and a venue.

    Args:
        venue_id: The venue ID to evaluate.
        city: Preferred city for the performance.
        expected_audience: Anticipated attendee count.
        art_form: Genre or art form of the performance (e.g. 'Music', 'Theatre', 'Dance').
        budget: Optional artist/performance budget.

    Returns:
        Structured evaluation with total_score, breakdown across dimensions, rationale, and recommended next steps.
    """
    venue = get_stage_details(venue_id)
    if "error" in venue:
        return {"error": venue["error"], "total_score": 0}

    # Dimension 1: Location Compatibility (max 25 pts)
    venue_city = venue.get("city", "").lower()
    req_city = city.strip().lower()
    if venue_city == req_city:
        loc_score = 25
        loc_notes = f"Exact city match ({venue.get('city')})."
    elif not req_city or req_city in ["any", "flexible"]:
        loc_score = 15
        loc_notes = f"Flexible location matched to {venue.get('city')}."
    else:
        loc_score = 0
        loc_notes = f"Location mismatch: requested '{city}', venue is in '{venue.get('city')}'."

    # Dimension 2: Capacity Suitability (max 25 pts)
    seated = venue.get("seated_capacity", 0)
    standing = venue.get("standing_capacity", seated)
    max_cap = max(seated, standing)
    if expected_audience <= 0:
        cap_score = 20
        cap_notes = "Standard default capacity fit."
    elif expected_audience > max_cap:
        cap_score = 5
        cap_notes = f"Venue under capacity: {max_cap} max vs {expected_audience} expected."
    elif expected_audience <= seated and seated <= expected_audience * 2.5:
        cap_score = 25
        cap_notes = f"Optimal intimate fit: {expected_audience} audience in a {seated}-seat space."
    elif expected_audience <= seated:
        cap_score = 20
        cap_notes = f"Comfortable capacity: {seated} seats available."
    elif expected_audience <= max_cap:
        cap_score = 15
        cap_notes = f"Requires standing room mix: {expected_audience} guests (seated {seated}, standing {standing})."
    else:
        cap_score = 10
        cap_notes = "Marginal capacity fit."

    # Dimension 3: Art-form Compatibility (max 25 pts)
    suitable_cats = [c.lower() for c in venue.get("suitable_categories", [])]
    req_art = art_form.strip().lower()
    if any(req_art in cat for cat in suitable_cats):
        art_score = 25
        art_notes = f"Art form '{art_form}' directly listed in venue primary categories."
    elif any(cat in req_art for cat in suitable_cats) or not suitable_cats:
        art_score = 20
        art_notes = f"Art form '{art_form}' closely aligns with venue programming."
    else:
        art_score = 5
        art_notes = f"Art form '{art_form}' not typically hosted here (prefers {', '.join(venue.get('suitable_categories', []))})."

    # Dimension 4: Budget Compatibility (max 15 pts)
    if budget is None or budget <= 0:
        budget_score = 15
        budget_notes = f"Standard host split applies: {venue.get('host_policy', 'Revenue split')}."
    elif budget >= 25000:
        budget_score = 15
        budget_notes = f"Budget of ₹{budget:,.0f} comfortably covers production and host split."
    elif budget >= 10000:
        budget_score = 12
        budget_notes = f"Budget of ₹{budget:,.0f} meets base acoustic hall expectations."
    else:
        budget_score = 8
        budget_notes = f"Budget of ₹{budget:,.0f} may require grassroots community rates."

    # Dimension 5: Availability Status (max 10 pts)
    avail_status = venue.get("availability_status", "open_slots")
    if avail_status == "open_slots":
        avail_score = 10
        avail_notes = "Open slots available for upcoming weekends."
    elif avail_status == "curated_inquiry":
        avail_score = 7
        avail_notes = "Curated booking inquiry required by host."
    else:
        avail_score = 4
        avail_notes = "Limited remaining availability."

    total_score = loc_score + cap_score + art_score + budget_score + avail_score
    is_recommended = total_score >= 65 and loc_score > 0

    return {
        "venue_id": venue["id"],
        "venue_name": venue["name"],
        "city": venue["city"],
        "total_score": total_score,
        "is_recommended": is_recommended,
        "dimensions": {
            "location": {"score": loc_score, "max": 25, "notes": loc_notes},
            "capacity": {"score": cap_score, "max": 25, "notes": cap_notes},
            "art_form": {"score": art_score, "max": 25, "notes": art_notes},
            "budget": {"score": budget_score, "max": 15, "notes": budget_notes},
            "availability": {"score": avail_score, "max": 10, "notes": avail_notes},
        },
        "rationale": f"{venue['name']} in {venue['city']} scored {total_score}/100. {loc_notes} {cap_notes}",
        "suggested_next_actions": [
            f"Review technical rider and acoustic drapes at {venue['name']}.",
            f"Submit formal performance request through Performer Dashboard.",
            f"Contact venue host {venue.get('host_name', 'Host')} under policy: '{venue.get('host_policy')}'."
        ] if is_recommended else [
            "Consider adjusting expected audience size or checking adjacent neighborhoods."
        ]
    }

def get_performer_requests(performer_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve existing performance proposals submitted by performers.

    Args:
        performer_id: Optional performer ID to filter by (e.g. 'perf-mehta').

    Returns:
        List of performance requests with title, status, budget, and review notes.
    """
    query = "SELECT * FROM performance_requests WHERE 1=1"
    params: List[Any] = []
    if performer_id and performer_id.strip():
        query += " AND performer_id = ?"
        params.append(performer_id.strip())

    query += " ORDER BY created_at DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "performer_id": r["performer_id"],
                "performer_name": r["performer_name"],
                "title": r["title"],
                "art_form": r["art_form"],
                "venue_name": r["venue_name"],
                "date": r["date"],
                "expected_audience_size": r["expected_audience_size"],
                "budget": r["budget"],
                "status": r["status"],
                "review_note": r["review_note"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]

