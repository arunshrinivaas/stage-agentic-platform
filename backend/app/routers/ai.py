"""FastAPI router for Google ADK AI Multi-Agent commands."""
from fastapi import APIRouter, HTTPException, status
from app.schemas.ai import AiCommandRequest, AiCommandResponse
from app.services.agent_service import agent_service

router = APIRouter(prefix="/api/ai", tags=["Agentic AI & Orchestration"])

@router.post(
    "/command",
    response_model=AiCommandResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute multi-agent command via STAGE Orchestrator",
)
async def execute_ai_command(payload: AiCommandRequest) -> AiCommandResponse:
    """Execute a natural-language command using the Google ADK multi-agent architecture.

    Delegates to `stage_orchestrator`, which dynamically coordinates:
    - **StageMatch**: Venue discovery and deterministic match scoring.
    - **CivicAssist**: Regulatory classification, curated guidelines, compliance checklists, and formal drafts.
    - **ImpactFlow**: Contribution allocations, transparent ledger audits, and deterministic impact reports.

    Maintains conversational continuity across requests via `session_id`.
    """
    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )

    try:
        response = await agent_service.execute_command(
            user_id=payload.user_id,
            message=payload.message.strip(),
            session_id=payload.session_id,
            force_mock=bool(payload.force_mock),
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-agent execution encountered an error: {str(e)}"
        )

