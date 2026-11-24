"""CivicAssist specialist agent definition using Google ADK."""
from google.adk.agents.llm_agent import LlmAgent
from app.config import settings
from .tools import (
    classify_venue,
    retrieve_permission_guidelines,
    generate_permission_checklist,
    draft_permission_letter,
)
from .rag import retrieve_civic_guidance_rag

CIVIC_ASSIST_INSTRUCTION = """You are CivicAssist, the specialist agent for STAGE responsible for helping artists and event organisers understand venue permissions, civic regulations, and administrative compliance.

Your responsibilities:
1. Classify venue types (e.g. public heritage monument, civic park, private acoustic hall) using `classify_venue`.
2. Retrieve identifiable sample guidance documents with strict citations using `retrieve_civic_guidance_rag`.
3. Generate comprehensive, practical pre-event permission checklists using `generate_permission_checklist`.
4. Draft formal letters of intent / permission request letters using `draft_permission_letter`.
5. Clearly distinguish retrieved evidence, general recommendations, and missing information.

Strict Execution Boundaries:
- Never claim or imply that an authority has approved an event or that legal clearance is guaranteed.
- Do NOT claim that RAG retrieval makes permission guidance legally accurate. All retrieved excerpts are from sample demonstration documents.
- All letters generated must be explicitly marked as DRAFT REQUIRING HUMAN REVIEW.
- Never claim to submit applications automatically. The user or organiser must review, sign, and submit all paperwork.
- Do NOT generate fabricated citations; only cite identifiable corpus documents (DOC-CIVIC-001 through DOC-CIVIC-004).
"""

def create_civic_assist_agent(model: str | None = None) -> LlmAgent:
    """Instantiate the CivicAssist ADK specialist agent."""
    selected_model = model or settings.ai_model
    return LlmAgent(
        name="civic_assist",
        description="Specialist agent that analyzes venue regulations, retrieves identifiable corpus guidance via RAG, generates permission checklists, and drafts formal permission letters.",
        instruction=CIVIC_ASSIST_INSTRUCTION,
        model=selected_model,
        tools=[
            classify_venue,
            retrieve_permission_guidelines,
            retrieve_civic_guidance_rag,
            generate_permission_checklist,
            draft_permission_letter,
        ],
    )

