"""ImpactFlow specialist agent definition using Google ADK."""
from google.adk.agents.llm_agent import LlmAgent
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

def create_impact_flow_agent(model: str | None = None) -> LlmAgent:
    """Instantiate the ImpactFlow ADK specialist agent."""
    selected_model = model or settings.ai_model
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

