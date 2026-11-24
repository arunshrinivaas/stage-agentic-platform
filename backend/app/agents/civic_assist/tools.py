"""Specialist tools for CivicAssist agent.
Provides venue classification, regulatory guidance, checklist generation, and draft letters for permissions.
All guidance is curated for planning and demonstration purposes; requires human review before submission.
"""
from typing import Dict, Any, List, Optional
from .rag import retrieve_civic_guidance_rag

# Curated demonstration guidelines knowledge base (prepared for RAG integration in Milestone 5)
CURATED_GUIDELINES: Dict[str, Dict[str, Any]] = {
    "public_heritage_amphitheatre": {
        "jurisdiction": "Municipal Corporation & Archaeological/Heritage Preservation Cell",
        "description": "Public heritage sites, civic plazas, and open-air amphitheatres requiring multi-agency clearance.",
        "sound_curfew": "10:00 PM standard municipal silence boundary",
        "noise_decibel_limit": "55 dB(A) daytime, 45 dB(A) after dusk at site boundary",
        "minimum_lead_time_days": 21,
        "required_clearances": [
            "Heritage Conservation Cell NOC",
            "Local Municipal Ward Sound & Sanitation Clearance",
            "Divisional Police Intimation (Traffic & Crowd Safety)",
            "Fire Department Access Path Verification",
        ],
        "fee_structure": "Standard civic deposit + refundable cleanup escrow (simulated)",
        "guidance_notes": "No permanent stage fixtures or ground penetration permitted. Natural acoustics preferred.",
    },
    "municipal_park_open_space": {
        "jurisdiction": "Parks & Recreation Department / Urban Development Authority",
        "description": "Public parks, waterfront promenades, and civic greens.",
        "sound_curfew": "9:30 PM strict flora/fauna quiet time",
        "noise_decibel_limit": "50 dB(A) at garden perimeter",
        "minimum_lead_time_days": 14,
        "required_clearances": [
            "Horticulture / Parks Department Booking Permit",
            "Public Address System Intimation to Local Police Station",
            "Waste Management & Green Protocol Undertaking",
        ],
        "fee_structure": "Nominal civic public green access fee",
        "guidance_notes": "Heavy generator trucks must remain on perimeter asphalt; no diesel generators inside lawn areas.",
    },
    "private_acoustic_hall_or_gallery": {
        "jurisdiction": "Private Trust / Venue Host Management Board",
        "description": "Privately owned acoustic spaces, studio lofts, intimate auditoriums, and community galleries.",
        "sound_curfew": "11:00 PM indoor acoustic isolation",
        "noise_decibel_limit": "Controlled internal amplification; soundproofed envelope",
        "minimum_lead_time_days": 7,
        "required_clearances": [
            "Host Venue Agreement & Performance Rider Sign-off",
            "Basic Commercial Ticket Tax Exemption Intimation (if non-commercial/social cause)",
            "Building Fire Exit Plan Compliance",
        ],
        "fee_structure": "Artist revenue split as established by host policy",
        "guidance_notes": "Venue host handles primary building permissions; artist must supply equipment list and production rider.",
    },
    "community_hall_or_school": {
        "jurisdiction": "School Administrative Board / Neighborhood Welfare Committee",
        "description": "School auditoriums, community centers, and local cultural trusts.",
        "sound_curfew": "10:00 PM",
        "noise_decibel_limit": "65 dB(A) internal hall resonance",
        "minimum_lead_time_days": 10,
        "required_clearances": [
            "Principal or Center Director Written Authorization",
            "Security & Entry Gate Access Protocol",
            "Electrical Safety Self-Declaration for lighting/PA equipment",
        ],
        "fee_structure": "Subsidized community cultural tariff",
        "guidance_notes": "Ideal for youth mentorship, community choir, and acoustic folk workshops.",
    },
}

def classify_venue(venue_type: str, is_public_space: Optional[bool] = None) -> Dict[str, Any]:
    """Classify venue category and determine the statutory regulatory framework.

    Args:
        venue_type: Description or type of venue (e.g. 'Amphitheatre', 'Park', 'Acoustic Glasshouse', 'Gallery').
        is_public_space: Optional boolean indicator if venue is on public land.

    Returns:
        Structured venue classification, primary jurisdiction, and regulatory tier.
    """
    vt_lower = venue_type.lower()
    
    if any(k in vt_lower for k in ["heritage", "amphitheatre", "historic", "monument"]):
        category = "public_heritage_amphitheatre"
        label = "Public Heritage Amphitheatre / Civic Monument"
        complexity = "HIGH"
        jurisdiction = "Municipal Corporation & Heritage Preservation Authority"
    elif any(k in vt_lower for k in ["park", "garden", "open air", "promenade", "lawn"]):
        category = "municipal_park_open_space"
        label = "Municipal Park / Public Open-Air Ground"
        complexity = "MODERATE"
        jurisdiction = "Parks & Recreation Department / Civic Ward"
    elif any(k in vt_lower for k in ["school", "community center", "welfare", "trust hall"]):
        category = "community_hall_or_school"
        label = "Community Hall / Educational Institution"
        complexity = "LOW_TO_MODERATE"
        jurisdiction = "Institution Governing Council & Local Ward"
    else:
        category = "private_acoustic_hall_or_gallery"
        label = "Private Acoustic Hall / Creative Studio"
        complexity = "LOW"
        jurisdiction = "Private Venue Management / Host Board"

    return {
        "venue_type_input": venue_type,
        "classified_category": category,
        "display_label": label,
        "regulatory_complexity": complexity,
        "primary_jurisdiction": jurisdiction,
        "curated_model": "STAGE-CivicAssist-v1",
        "disclaimer": "Classification provided for demonstration and planning purposes only.",
    }

def retrieve_permission_guidelines(jurisdiction_category: str) -> Dict[str, Any]:
    """Retrieve curated permission rules, curfews, sound restrictions, and clearance steps.

    Args:
        jurisdiction_category: The category key (e.g. 'public_heritage_amphitheatre', 'municipal_park_open_space', 'private_acoustic_hall_or_gallery').

    Returns:
        Curated guideline dictionary with legal disclaimer.
    """
    norm_key = jurisdiction_category.lower().replace(" ", "_").replace("-", "_")
    guideline = CURATED_GUIDELINES.get(norm_key)
    
    if not guideline:
        # Fallback to closest match
        if "park" in norm_key or "public" in norm_key:
            guideline = CURATED_GUIDELINES["municipal_park_open_space"]
        elif "heritage" in norm_key or "amphi" in norm_key:
            guideline = CURATED_GUIDELINES["public_heritage_amphitheatre"]
        else:
            guideline = CURATED_GUIDELINES["private_acoustic_hall_or_gallery"]

    return {
        "category_matched": norm_key,
        "guidelines": guideline,
        "status": "curated_demonstration_guidance",
        "legal_disclaimer": "Curated demonstration guidelines for planning purposes only. Not legal advice or official government clearance.",
    }

def generate_permission_checklist(
    venue_name: str,
    venue_type: str,
    expected_audience: int,
    uses_amplified_sound: bool = True,
) -> Dict[str, Any]:
    """Generate a structured pre-event statutory and administrative compliance checklist.

    Args:
        venue_name: The name of the performance space.
        venue_type: The type of venue (e.g. 'Heritage Amphitheatre', 'Acoustic Hall').
        expected_audience: Number of expected attendees.
        uses_amplified_sound: Whether PA or sound amplification will be utilized.

    Returns:
        Structured checklist containing documents, clearance steps, timeline, and review obligations.
    """
    classification = classify_venue(venue_type)
    guidelines_info = retrieve_permission_guidelines(classification["classified_category"])
    gl = guidelines_info["guidelines"]

    checklist_items: List[Dict[str, str]] = [
        {
            "step": "1. Venue Authority Sign-Off",
            "requirement": f"Obtain written booking confirmation or NOC from the governing body of '{venue_name}'.",
            "mandatory": "Yes",
            "authority": classification["primary_jurisdiction"],
        },
        {
            "step": "2. Production & Sound Rider Submission",
            "requirement": f"Submit technical rider detailing acoustic specifications (Amplification: {'Yes, PA system' if uses_amplified_sound else 'Unamplified purely acoustic'}). Curfew: {gl['sound_curfew']}.",
            "mandatory": "Yes" if uses_amplified_sound else "Recommended",
            "authority": "Local Police Intimation / Sound Control Board",
        },
        {
            "step": "3. Crowd & Safety Management Plan",
            "requirement": f"Demarcate entry/exit corridors and emergency access for {expected_audience} expected attendees.",
            "mandatory": "Yes" if expected_audience > 150 else "Recommended",
            "authority": "Venue Facility Operations",
        },
        {
            "step": "4. Social Cause & Charity Intimation",
            "requirement": "Include certification of simulated ticket contribution pledge if performance is linked to a community cause.",
            "mandatory": "Optional",
            "authority": "STAGE Impact Transparency Registry",
        },
    ]

    rag_data = retrieve_civic_guidance_rag(
        query=f"{venue_type} permissions curfew noise safety",
        venue_type=venue_type,
    )

    return {
        "venue_name": venue_name,
        "venue_classification": classification["display_label"],
        "recommended_lead_time": f"{gl['minimum_lead_time_days']} business days prior to performance",
        "statutory_curfew": gl["sound_curfew"],
        "checklist": checklist_items,
        "retrieved_evidence": rag_data["retrieved_evidence"],
        "retrieval_mode": rag_data.get("retrieval_mode", "chromadb_semantic"),
        "general_recommendations": rag_data["general_recommendations"],
        "missing_information": rag_data["missing_information"],
        "statutory_warning": "STAGE does not automatically submit or guarantee approvals. Applications require direct human submission and review.",
        "legal_disclaimer": "Unverified sample guidance for planning simulation only. Not statutory law, government order, or legal advice. All organizers must independently verify rules with local authorities.",
        "is_demonstration": True,
    }

def draft_permission_letter(
    applicant_name: str,
    event_title: str,
    venue_name: str,
    event_date: str,
    expected_audience: int,
    art_form: str,
    sound_details: str = "Acoustic and low-decibel vocal amplification",
) -> Dict[str, Any]:
    """Draft a formal letter of intent / permission request for review and signature by the performer or organiser.

    Args:
        applicant_name: Name of the performer or organiser representative.
        event_title: Title of the proposed cultural performance.
        venue_name: Destination venue name.
        event_date: Proposed date of the performance.
        expected_audience: Estimated audience attendance.
        art_form: Art form or genre (e.g. 'Classical Music', 'Street Theatre').
        sound_details: Technical sound characteristics.

    Returns:
        Structured draft letter with formal header, body text, recipient placeholders, and review watermark.
    """
    letter_text = f"""Date: [Insert Date]

To,
The Competent Authority / Venue Administrator
{venue_name}

Subject: Request for Permission to Host Cultural Performance — "{event_title}"

Respected Authority,

I am writing on behalf of the performing ensemble led by {applicant_name} to formally request permission to host a cultural performance at {venue_name} on {event_date}.

Details of Proposed Performance:
-----------------------------------------------------------------
1. Event Title: {event_title}
2. Art Form & Genre: {art_form}
3. Anticipated Attendance: Approximately {expected_audience} patrons
4. Audio & Technical Specifications: {sound_details}
5. Community Impact: Linked with the STAGE cultural and social empowerment platform

We assure the administration that all performances will conclude strictly before local curfew hours, adhere to statutory noise level limitations, and preserve the cleanliness and decorum of the premises. A designated volunteer safety team will oversee guest management and cleanliness.

We kindly request your formal consideration and issuance of the requisite permissions or venue clearance.

Sincerely,

_______________________________
{applicant_name}
Lead Representative / Organiser
Contact: [Insert Phone / Email]
STAGE Community Platform
"""
    return {
        "document_type": "DRAFT_REQUIRING_HUMAN_REVIEW",
        "watermark": "SIMULATED DRAFT — REQUIRES HUMAN REVIEW BEFORE SUBMISSION",
        "applicant_name": applicant_name,
        "event_title": event_title,
        "venue_name": venue_name,
        "event_date": event_date,
        "draft_body": letter_text.strip(),
        "submission_disclaimer": "This document is a preparatory draft generated for user editing. STAGE never submits applications automatically.",
    }

