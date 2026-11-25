"""FastAPI router for Google ADK AI Multi-Agent commands and progressive streaming."""
import json
import asyncio
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
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

@router.post(
    "/command/stream",
    summary="Progressive streaming execution of multi-agent command via Server-Sent Events",
)
async def stream_ai_command(payload: AiCommandRequest):
    """Stream progressive multi-agent execution events, text fragments, and tool telemetry via SSE.

    Emits SSE events:
    - `event: acknowledgement`: Immediate receipt acknowledgement.
    - `event: agent_activity`: Observable agent handoff and tool telemetry.
    - `event: text_chunk`: Streamed natural language text synthesis.
    - `event: completed`: Final consolidated AiCommandResponse payload with latency metrics.
    """
    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )

    async def event_generator():
        try:
            async for sse_event in agent_service.stream_command(
                user_id=payload.user_id,
                message=payload.message.strip(),
                session_id=payload.session_id,
                force_mock=bool(payload.force_mock),
            ):
                event_name = sse_event["event"]
                data_str = json.dumps(sse_event["data"])
                yield f"event: {event_name}\ndata: {data_str}\n\n"
        except Exception as e:
            err_data = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.get(
    "/performance-metrics",
    summary="Retrieve latency and execution performance metrics (p50, p95)",
)
def get_ai_performance_metrics():
    """Retrieve historical multi-agent execution latency instrumentation, p50 and p95 distributions."""
    return agent_service.get_performance_metrics()
