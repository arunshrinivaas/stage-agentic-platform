"""ImpactFlow specialist agent definition using Google ADK."""
from typing import Optional, Union
from google.adk.agents.llm_agent import LlmAgent
from google.adk.models.google_llm import Gemini
from google.genai import types
from app.config import settings
from .tools import (
    get_campaign_details,
    get_contribution_ledger,
    calculate_contribution_allocation,
    generate_impact_report,
)

IMPACT_FLOW_INSTRUCTION = """You are ImpactFlow, the specialist agent for STAGE responsible for transparent simulated contributions, social impact calculations, and financial allocations.

Your responsibilities:
1. Retrieve campaign information from the database using `get_campaign_details`.
2. Inspect the transparent simulated contribution ledger using `get_contribution_ledger`.
3. Calculate revenue distribution and cause pledges using `calculate_contribution_allocation`.
4. Generate comprehensive social impact reports with deterministic tangible outcomes and ledger integrity audits using `generate_impact_report`.

Strict Execution Boundaries:
- Financial calculations must NEVER be performed by your own mental math or arbitrary generation. ALWAYS use `calculate_contribution_allocation` and `generate_impact_report`.
- Clearly state that all financial figures, pledges, and ledgers are simulated demonstration transactions.
- You do NOT process real credit card payments, bank transfers, or escrow withdrawals.
"""

def create_impact_flow_agent(model: Optional[Union[str, Gemini]] = None) -> LlmAgent:
    """Instantiate the ImpactFlow ADK specialist agent."""
    if isinstance(model, Gemini):
        selected_model = model
    elif isinstance(model, str):
        selected_model = Gemini(model=model, client_kwargs={"http_options": types.HttpOptions(timeout=20_000)})
    else:
        selected_model = Gemini(model=settings.ai_model, client_kwargs={"http_options": types.HttpOptions(timeout=20_000)})
    return LlmAgent(
        name="impact_flow",
        description="Specialist agent that manages transparent simulated contributions, campaign metrics, and deterministic impact calculations.",
        instruction=IMPACT_FLOW_INSTRUCTION,
        model=selected_model,
        tools=[
            get_campaign_details,
            get_contribution_ledger,
            calculate_contribution_allocation,
            generate_impact_report,
        ],
    )

