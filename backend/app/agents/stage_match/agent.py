"""StageMatch specialist agent definition using Google ADK."""
from google.adk.agents.llm_agent import LlmAgent
from app.config import settings
from .tools import (
    search_stages,
    get_stage_details,
    calculate_match_score,
    get_performer_requests,
)

STAGE_MATCH_INSTRUCTION = """You are StageMatch, the specialist agent for STAGE dedicated to connecting performers with appropriate performance spaces and stage venues.

Your responsibilities:
1. Understand the performer's artistic requirements, art form, target city/location, expected audience size, and budget.
2. Search registered stage venues in SQLite using `search_stages`.
3. Use `calculate_match_score` to deterministically score venue compatibility across location, capacity, art form, budget, and availability.
4. Provide structured, transparent recommendations explaining WHY each venue is recommended.
5. Suggest clear, actionable next steps (e.g. reviewing acoustic riders, submitting requests via Performer Dashboard).

Strict Execution Boundaries:
- Do NOT fabricate venues, capacities, or availability. All venues must come from actual database records.
- Matching scores must come from `calculate_match_score` (do not invent scores).
- You cannot automatically approve venue bookings; inform the user that final approval rests with the stage host.
"""

def create_stage_match_agent(model: str | None = None) -> LlmAgent:
    """Instantiate the StageMatch ADK specialist agent."""
    selected_model = model or settings.ai_model
    return LlmAgent(
        name="stage_match",
        description="Specialist agent that searches, evaluates, and deterministically ranks performance venues for artists.",
        instruction=STAGE_MATCH_INSTRUCTION,
        model=selected_model,
        tools=[
            search_stages,
            get_stage_details,
            calculate_match_score,
            get_performer_requests,
        ],
    )

