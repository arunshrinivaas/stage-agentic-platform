"""Specialist tools for ImpactFlow agent.
Retrieves SQLite campaign details and contribution ledgers, and performs deterministic financial allocations.
All financial calculations are executed by deterministic Python functions.
"""
from typing import Dict, Any, List, Optional
from decimal import Decimal, ROUND_HALF_UP
from app.database import get_db

CENT = Decimal("0.01")

# Data-driven allocation rules retrieved from SQLite records (events, causes, and venues)

def get_campaign_details(
    cause_id: Optional[str] = None,
    title_keyword: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve social impact campaign details from the platform database.

    Args:
        cause_id: Optional specific cause identifier (e.g. 'cause-01').
        title_keyword: Optional search term to filter campaigns by title or focus area.

    Returns:
        List of campaign records with fundraising progress and organizer details.
    """
    query = "SELECT * FROM causes WHERE 1=1"
    params: List[Any] = []

    if cause_id and cause_id.strip():
        query += " AND id = ?"
        params.append(cause_id.strip())

    if title_keyword and title_keyword.strip():
        query += " AND (LOWER(title) LIKE ? OR LOWER(focus_area) LIKE ?)"
        term = f"%{title_keyword.strip().lower()}%"
        params.extend([term, term])

    query += " ORDER BY current_amount DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "title": r["title"],
                "tagline": r["tagline"],
                "description": r["description"],
                "target_amount": r["target_amount"],
                "current_amount": r["current_amount"],
                "currency": r["currency"] or "₹",
                "progress_percentage": round((r["current_amount"] / r["target_amount"]) * 100, 1) if r["target_amount"] > 0 else 0,
                "linked_performances_count": r["linked_performances_count"],
                "organizer": {
                    "name": r["organizer_name"],
                    "type": r["organizer_type"],
                    "verified": bool(r["organizer_verified"]),
                },
                "focus_area": r["focus_area"],
                "is_demonstration": bool(r["is_demonstration"]),
            }
            for r in rows
        ]

def get_contribution_ledger(
    cause_id: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """Retrieve transparent simulated contribution ledger entries from SQLite.

    Args:
        cause_id: Optional campaign ID filter.
        limit: Maximum number of ledger entries to return.

    Returns:
        List of simulated ledger entries recording ticket contributions.
    """
    query = "SELECT * FROM contributions WHERE 1=1"
    params: List[Any] = []

    if cause_id and cause_id.strip():
        query += " AND cause_id = ?"
        params.append(cause_id.strip())

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "cause_id": r["cause_id"],
                "cause_title": r["cause_title"],
                "event_id": r["event_id"],
                "event_title": r["event_title"],
                "performer_name": r["performer_name"],
                "venue_name": r["venue_name"],
                "booking_id": r["booking_id"],
                "date": r["date"],
                "tickets_sold": r["tickets_sold"],
                "gross_proceeds": r["gross_proceeds"],
                "pledged_percentage": r["pledged_percentage"],
                "amount": r["impact_amount"],
                "currency": r["currency"] or "₹",
                "is_simulated": bool(r["is_simulated"]),
                "created_at": r["created_at"],
            }
            for r in rows
        ]

def resolve_allocation_rule(
    event_id: Optional[str] = None,
    cause_id: Optional[str] = None,
    venue_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve the applicable allocation percentages from existing database records."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Case 1: Specific event requested or matched
        if event_id:
            cursor.execute("SELECT * FROM events WHERE id = ? OR LOWER(title) LIKE ?;", (event_id, f"%{event_id.lower()}%"))
            event_row = cursor.fetchone()
            if event_row:
                cause_pct = float(event_row["cause_percentage"]) if event_row["cause_percentage"] is not None else 20.0
                c_id = event_row["cause_id"] or "cause-01"
                c_name = event_row["cause_name"] or "Community Arts Impact Fund"
                v_id = event_row["venue_id"]

                venue_pct = 15.0
                if v_id:
                    cursor.execute("SELECT host_policy FROM stage_venues WHERE id = ?;", (v_id,))
                    v_row = cursor.fetchone()
                    if v_row and v_row["host_policy"]:
                        pol = v_row["host_policy"].lower()
                        if "free venue hire" in pol:
                            venue_pct = 0.0
                        elif "85%" in pol:
                            venue_pct = 15.0
                        elif "80%" in pol:
                            venue_pct = 10.0
                        elif "75/25" in pol:
                            venue_pct = 25.0

                artist_pct = max(0.0, round(100.0 - (cause_pct + venue_pct), 2))
                return {
                    "artist_percentage": artist_pct,
                    "venue_percentage": venue_pct,
                    "cause_percentage": cause_pct,
                    "campaign_id": c_id,
                    "campaign_name": c_name,
                    "rule_source": f"Event '{event_row['title']}' configured pledge ({cause_pct}%) & Venue host policy ({venue_pct}%)",
                }

        # Case 2: Specific cause requested
        if cause_id:
            cursor.execute("SELECT * FROM events WHERE cause_id = ? ORDER BY id ASC LIMIT 1;", (cause_id,))
            event_row = cursor.fetchone()
            if event_row:
                cause_pct = float(event_row["cause_percentage"])
                c_name = event_row["cause_name"]
                venue_pct = 15.0
                artist_pct = max(0.0, round(100.0 - (cause_pct + venue_pct), 2))
                return {
                    "artist_percentage": artist_pct,
                    "venue_percentage": venue_pct,
                    "cause_percentage": cause_pct,
                    "campaign_id": cause_id,
                    "campaign_name": c_name,
                    "rule_source": f"Configured campaign rule from linked event '{event_row['title']}' ({cause_pct}%)",
                }

            cursor.execute("SELECT title FROM causes WHERE id = ?;", (cause_id,))
            cause_row = cursor.fetchone()
            c_name = cause_row["title"] if cause_row else "Grassroots Arts Fund"
            return {
                "artist_percentage": 65.0,
                "venue_percentage": 15.0,
                "cause_percentage": 20.0,
                "campaign_id": cause_id,
                "campaign_name": c_name,
                "rule_source": f"Baseline platform rule for campaign '{c_name}' (20% cause / 15% venue / 65% artist)",
            }

        # Case 3: Baseline database event rule (evt-01)
        cursor.execute("SELECT * FROM events WHERE id = 'evt-01';")
        default_evt = cursor.fetchone()
        if default_evt:
            cause_pct = float(default_evt["cause_percentage"])  # 30%
            venue_pct = 15.0
            artist_pct = max(0.0, round(100.0 - (cause_pct + venue_pct), 2))  # 55%
            return {
                "artist_percentage": artist_pct,
                "venue_percentage": venue_pct,
                "cause_percentage": cause_pct,
                "campaign_id": default_evt["cause_id"],
                "campaign_name": default_evt["cause_name"],
                "rule_source": f"Platform baseline rule from event '{default_evt['title']}' ({cause_pct}% pledge)",
            }

        return {
            "artist_percentage": 60.0,
            "venue_percentage": 20.0,
            "cause_percentage": 20.0,
            "campaign_id": "cause-01",
            "campaign_name": "Instruments for Riverbank Classrooms",
            "rule_source": "Default verified platform allocation rule",
        }

def calculate_contribution_allocation(
    ticket_price: float,
    ticket_count: int,
    event_id: Optional[str] = None,
    cause_id: Optional[str] = None,
    venue_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Deterministically calculate revenue splits and social cause allocation from existing data rules.

    Args:
        ticket_price: Price per individual event pass (in platform currency).
        ticket_count: Number of passes purchased.
        event_id: Optional event ID (e.g. 'evt-01') to look up specific event pledge rules.
        cause_id: Optional destination campaign ID (e.g. 'cause-01').
        venue_id: Optional venue ID to look up host split policies.

    Returns:
        Structured deterministic financial breakdown reconciling exactly with the gross amount.
    """
    if ticket_price < 0 or ticket_count <= 0:
        return {"error": "Invalid ticket pricing or count", "gross_total": 0.0}

    # Strict decimal arithmetic to guarantee cent-level reconciliation
    gross_d = (Decimal(str(ticket_price)) * Decimal(str(ticket_count))).quantize(CENT, rounding=ROUND_HALF_UP)
    rule = resolve_allocation_rule(event_id=event_id, cause_id=cause_id, venue_id=venue_id)

    cause_pct = float(rule["cause_percentage"])
    venue_pct = float(rule["venue_percentage"])
    artist_pct = float(rule["artist_percentage"])
    cause_pct_d = Decimal(str(cause_pct))
    venue_pct_d = Decimal(str(venue_pct))
    artist_pct_d = Decimal(str(artist_pct))

    cause_pledge_d = ((gross_d * cause_pct_d) / Decimal("100.00")).quantize(CENT, rounding=ROUND_HALF_UP)
    venue_share_d = ((gross_d * venue_pct_d) / Decimal("100.00")).quantize(CENT, rounding=ROUND_HALF_UP)
    # Reconcile exact remainder to artist so allocated amounts always equal gross exactly
    artist_share_d = gross_d - (cause_pledge_d + venue_share_d)

    # Sanity reconciliation verification
    reconciled_sum_d = artist_share_d + venue_share_d + cause_pledge_d
    assert reconciled_sum_d == gross_d, f"Decimal reconciliation error: {reconciled_sum_d} != {gross_d}"

    gross_total = float(gross_d)
    reconciled_sum = float(reconciled_sum_d)
    artist_share = float(artist_share_d)
    venue_share = float(venue_share_d)
    cause_pledge = float(cause_pledge_d)

    return {
        "is_simulated": True,
        "pricing_parameters": {
            "ticket_price": ticket_price,
            "ticket_count": ticket_count,
            "currency": "₹",
        },
        "gross_total": gross_total,
        "reconciled_sum": reconciled_sum,
        "allocation_breakdown": {
            "artist_share": {
                "amount": artist_share,
                "percentage": f"{artist_pct:.1f}%",
                "description": "Direct compensation to performing ensemble",
            },
            "venue_host_share": {
                "amount": venue_share,
                "percentage": f"{venue_pct:.1f}%",
                "description": "Production space host acoustic maintenance & operational split",
            },
            "social_cause_pledge": {
                "amount": cause_pledge,
                "percentage": f"{cause_pct:.1f}%",
                "campaign_id": rule["campaign_id"],
                "campaign_name": rule["campaign_name"],
                "description": "Direct contribution pledged to verified grassroots cause",
            },
        },
        "rule_source": rule["rule_source"],
        "formula_notice": f"Calculated deterministically using: {rule['rule_source']}. 100% reconciled to gross total.",
    }

def generate_impact_report(cause_id: str) -> Dict[str, Any]:
    """Generate a deterministic social impact report from real database figures and verify ledger consistency.

    Args:
        cause_id: Unique campaign identifier.

    Returns:
        Structured impact audit containing raised totals, deterministic tangible outcomes, and ledger verification.
    """
    campaigns = get_campaign_details(cause_id=cause_id)
    if not campaigns:
        return {"error": f"Campaign '{cause_id}' not found in registry."}

    campaign = campaigns[0]
    total_raised = campaign["current_amount"]
    focus = campaign["focus_area"].lower()

    # Deterministic tangible impact units derived from actual totals raised
    tangible_metrics: Dict[str, Any] = {}
    if "education" in focus or "youth" in focus:
        instruments = int(total_raised / 6250)
        workshops = int(total_raised / 12500)
        students = int(total_raised / 1200)
        tangible_metrics = {
            "primary_metric": f"{instruments} Student Instrument Kits Funded",
            "secondary_metric": f"{workshops} Acoustic Mentorship Workshops",
            "community_beneficiaries": f"{students} Delta & Rural Schoolchildren Supported",
        }
    elif "heritage" in focus or "folk" in focus or "elder" in focus:
        masterclasses = int(total_raised / 15000)
        stipends = int(total_raised / 25000)
        archives = int(total_raised / 8000)
        tangible_metrics = {
            "primary_metric": f"{stipends} Elder Folk Artist Living Stipends",
            "secondary_metric": f"{masterclasses} Oral Tradition Masterclasses",
            "community_beneficiaries": f"{archives} Field Audio Archives Digitized",
        }
    elif "theatre" in focus or "disability" in focus or "access" in focus:
        access_passes = int(total_raised / 500)
        ramps = int(total_raised / 20000)
        sign_sessions = int(total_raised / 4000)
        tangible_metrics = {
            "primary_metric": f"{access_passes} Subsidized Accessibility Passes",
            "secondary_metric": f"{sign_sessions} Sign-Language Interpreted Showings",
            "community_beneficiaries": f"{ramps} Mobile Accessibility Ramps Deployed",
        }
    else:
        performances_funded = int(total_raised / 10000)
        community_sessions = int(total_raised / 3000)
        tangible_metrics = {
            "primary_metric": f"{performances_funded} Grassroots Outreach Showcases",
            "secondary_metric": f"{community_sessions} Public Cultural Gatherings",
            "community_beneficiaries": "Open Community Audience Across Districts",
        }

    # Verify ledger integrity
    ledger_entries = get_contribution_ledger(cause_id=cause_id, limit=100)
    ledger_total = round(sum(entry["amount"] for entry in ledger_entries), 2)
    ledger_count = len(ledger_entries)

    discrepancy = round(total_raised - ledger_total, 2)
    ledger_status = "CONSISTENT" if abs(discrepancy) < 1.0 else f"DISCREPANCY_NOTED (Seed difference: ₹{discrepancy:,.2f})"

    return {
        "cause_id": campaign["id"],
        "title": campaign["title"],
        "focus_area": campaign["focus_area"],
        "organizer": campaign["organizer"]["name"],
        "target_amount": campaign["target_amount"],
        "current_amount": total_raised,
        "progress_percentage": campaign["progress_percentage"],
        "deterministic_outcomes": tangible_metrics,
        "ledger_audit": {
            "tracked_contributions_count": ledger_count,
            "tracked_ledger_sum": ledger_total,
            "campaign_balance": total_raised,
            "audit_status": ledger_status,
        },
        "is_simulated": True,
        "transparency_notice": "All figures derived deterministically from the STAGE verified SQLite ledger.",
    }
