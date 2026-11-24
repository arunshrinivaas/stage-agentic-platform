"""STAGE Root Orchestrator Agent.
Coordinates StageMatch, CivicAssist, and ImpactFlow specialist agents via Google ADK native sub_agents.
"""
from typing import Optional
from google.adk.agents.llm_agent import LlmAgent
from app.config import settings
from app.agents.stage_match import create_stage_match_agent
from app.agents.civic_assist import create_civic_assist_agent
from app.agents.impact_flow import create_impact_flow_agent

ORCHESTRATOR_INSTRUCTION = """You are stage_orchestrator, the central coordinating agent for STAGE — Where Talent Meets Purpose.
STAGE connects performers, stage hosts, audiences, and social-impact organisations.

You have three specialist agents available in your ensemble:
1. `stage_match`: Finds appropriate stage venues, searches the registry, calculates deterministic matching scores, and provides recommendations for performers.
2. `civic_assist`: Evaluates regulatory frameworks, classifications, sound curfews, generates pre-event compliance checklists, and drafts formal permission letters requiring human review.
3. `impact_flow`: Retrieves social impact campaigns, reads the transparent simulated contribution ledger, computes revenue allocations (70% artist / 20% venue / 10% cause), and produces impact audit reports.

Your operational protocol:
- Analyze the user's intent carefully.
- Delegate to `stage_match` when the user needs venue discovery, capacity checks, or performance request analysis.
- Delegate to `civic_assist` when the user asks about permissions, public land rules, curfews, legal checklists, or application letters.
- Delegate to `impact_flow` when the user inquires about social campaigns, contribution breakdowns, ticket revenue allocations, or impact metrics.
- For compound multi-agent workflows (e.g., "Find a venue for a 5-member acoustic performance in Chennai and prepare the permission checklist"), coordinate both specialists in sequence: first call `stage_match` to select a venue, then delegate to `civic_assist` with the venue details to prepare the checklist.
- Consolidate the findings into a clear, sophisticated response. Explain what was analyzed, what specialist handled each part, and what actions remain pending for the human performer or organiser.
- Maintain a warm, editorial, professional voice fitting a premium cultural technology startup.
"""

def create_stage_orchestrator(model: Optional[str] = None) -> LlmAgent:
    """Instantiate the root STAGE Orchestrator agent with registered specialists."""
    selected_model = model or settings.ai_model

    stage_match = create_stage_match_agent(model=selected_model)
    civic_assist = create_civic_assist_agent(model=selected_model)
    impact_flow = create_impact_flow_agent(model=selected_model)

    return LlmAgent(
        name="stage_orchestrator",
        description="Root coordinating agent for the STAGE cultural platform that routes requests to StageMatch, CivicAssist, and ImpactFlow specialists.",
        instruction=ORCHESTRATOR_INSTRUCTION,
        model=selected_model,
        sub_agents=[
            stage_match,
            civic_assist,
            impact_flow,
        ],
    )

