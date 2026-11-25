"""Pydantic schemas for the STAGE Multi-Agent AI System."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AgentExecutionEvent(BaseModel):
    """Event capturing an observable step in the ADK multi-agent execution."""
    agent_name: str = Field(..., description="Agent producing the event (stage_orchestrator, stage_match, civic_assist, impact_flow)")
    event_type: str = Field(..., description="Event classification (e.g. orchestrator_invocation, specialist_handoff, tool_call, tool_result, agent_response, turn_complete)")
    tool_name: Optional[str] = Field(None, description="Name of the tool invoked, if applicable")
    tool_input: Optional[Dict[str, Any]] = Field(None, description="Arguments supplied to the tool")
    tool_output: Optional[Any] = Field(None, description="Result returned by the tool")
    message: Optional[str] = Field(None, description="Textual explanation or agent message")
    timestamp: float = Field(..., description="Unix epoch timestamp of the event")
    provider_status: Optional[int] = Field(None, description="HTTP status code returned by the model provider (e.g. 503, 429)")
    provider_message: Optional[str] = Field(None, description="Sanitized error or status message from model provider")
    attempt: Optional[int] = Field(None, description="Attempt number for retried executions")
    duration_ms: Optional[float] = Field(None, description="Duration of the execution attempt in milliseconds")
    has_mutating_tools: Optional[bool] = Field(None, description="Whether mutating tool operations were performed")

class PerformanceMetrics(BaseModel):
    """Detailed latency instrumentation across execution stages."""
    intent_classification_ms: float = Field(0.0, description="Duration of intent routing in milliseconds")
    agent_init_ms: float = Field(0.0, description="Agent initialization time in milliseconds")
    llm_latency_ms: float = Field(0.0, description="Duration spent waiting for Gemini LLM in milliseconds")
    specialist_tool_execution_ms: float = Field(0.0, description="Specialist tool runtime in milliseconds")
    mcp_execution_ms: float = Field(0.0, description="Model Context Protocol runtime in milliseconds")
    rag_retrieval_ms: float = Field(0.0, description="Vector RAG retrieval runtime in milliseconds")
    database_query_ms: float = Field(0.0, description="Database access duration in milliseconds")
    total_duration_ms: float = Field(0.0, description="Total end-to-end response duration in milliseconds")
    routing_type: str = Field("deterministic_fast_path", description="Routing path: fast_path, gemini_live, or fallback")

class AiCommandRequest(BaseModel):
    """Request payload for POST /api/ai/command."""
    user_id: str = Field(..., description="ID of the user issuing the command (e.g. 'usr-aarav')")
    message: str = Field(..., description="Natural language command or prompt for the multi-agent system")
    session_id: Optional[str] = Field(None, description="Optional conversational session ID for multi-turn continuity")
    force_mock: Optional[bool] = Field(False, description="Explicitly force deterministic offline execution mode")

class AiCommandResponse(BaseModel):
    """Response payload for POST /api/ai/command."""
    session_id: str = Field(..., description="Conversational session ID")
    final_response: str = Field(..., description="Consolidated natural language response synthesized for the user")
    selected_specialist_agents: List[str] = Field(..., description="List of specialist agents engaged (e.g. ['stage_match', 'civic_assist'])")
    execution_status: str = Field(..., description="Execution status: 'completed', 'failed', or 'partial_failure'")
    execution_mode: str = Field("offline_deterministic", description="Execution mode: 'live_gemini', 'live_gemini_partial_failure', 'offline_deterministic', or 'offline_fallback_after_live_error'")
    agent_execution_events: List[AgentExecutionEvent] = Field(default_factory=list, description="Observability trace of all agent handoffs and tool executions")
    performance_metrics: Optional[PerformanceMetrics] = Field(None, description="Granular performance timing measurements")
    model_used: str = Field(..., description="Gemini model or execution mode utilized")
    created_at: str = Field(..., description="ISO 8601 formatted timestamp")

