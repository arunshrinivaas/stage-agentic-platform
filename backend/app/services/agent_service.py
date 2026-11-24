"""Service orchestrating Google ADK Multi-Agent execution with full observability and session continuity."""
import time
import uuid
import datetime
import re
import asyncio
import random
from typing import List, Dict, Any, Optional, Tuple

from google.adk import Runner, Event
from google.adk.sessions import InMemorySessionService, Session
from google.genai import types

from app.config import settings
from app.agents.orchestrator import create_stage_orchestrator
from app.schemas.ai import AgentExecutionEvent, AiCommandResponse

# Direct tool imports for deterministic execution & testing
from app.agents.stage_match.tools import (
    search_stages,
    get_stage_details,
    calculate_match_score,
    get_performer_requests,
)
from app.agents.civic_assist.tools import (
    classify_venue,
    retrieve_permission_guidelines,
    generate_permission_checklist,
    draft_permission_letter,
)
from app.agents.civic_assist.rag import retrieve_civic_guidance_rag
from app.agents.impact_flow.tools import (
    get_campaign_details,
    get_contribution_ledger,
    calculate_contribution_allocation,
    generate_impact_report,
)

MAX_LIVE_ATTEMPTS = 3
INITIAL_RETRY_DELAY = 0.5  # seconds
MAX_RETRY_DELAY = 2.5      # seconds

# Registry of tools that cause non-idempotent state mutations
MUTATING_TOOLS: set[str] = {
    "create_booking",
    "book_stage",
    "submit_permission_application",
    "create_campaign",
    "record_contribution",
    "update_request_status",
    "create_venue",
    "send_notification",
}

def is_mutating_tool(tool_name: str) -> bool:
    """Determine if a tool performs non-idempotent state mutations."""
    name_clean = (tool_name or "").lower().strip()
    return name_clean in MUTATING_TOOLS or any(
        name_clean.startswith(prefix)
        for prefix in ["create_", "update_", "delete_", "submit_", "book_", "record_", "send_"]
    )

def is_temporary_rate_limit(exc: Exception) -> Tuple[bool, Optional[float]]:
    """Determine if an error represents temporary rate-limit throttling (HTTP 429).
    
    Returns:
        (is_temporary: bool, suggested_delay_seconds: Optional[float])
    """
    # 1. Check Google GenAI ClientError / APIError structured attributes
    details = getattr(exc, "details", None)
    if isinstance(details, dict):
        error_dict = details.get("error", {}) if "error" in details else details
        err_details_list = error_dict.get("details", [])
        if isinstance(err_details_list, list):
            for d in err_details_list:
                if isinstance(d, dict) and "RetryInfo" in d.get("@type", ""):
                    delay_str = str(d.get("retryDelay", "")).rstrip("s")
                    try:
                        return True, float(delay_str)
                    except ValueError:
                        return True, 2.0

    # 2. Check HTTP headers (Retry-After)
    response = getattr(exc, "response", None)
    if response is not None:
        headers = getattr(response, "headers", None)
        if headers and hasattr(headers, "get"):
            retry_after = headers.get("Retry-After") or headers.get("retry-after")
            if retry_after:
                try:
                    return True, float(retry_after)
                except ValueError:
                    return True, 2.0

    # 3. Check textual signals
    err_str = str(exc).lower()
    permanent_indicators = [
        "daily quota",
        "exceeded your current quota",
        "quota limit reached",
        "plan quota",
        "billing",
        "check your plan",
    ]
    if any(k in err_str for k in permanent_indicators):
        return False, None

    temporary_indicators = [
        "rate limit",
        "rate_limit",
        "too many requests",
        "tpm",
        "rpm",
        "per minute",
        "try again",
        "retry after",
        "retry-after",
        "retry delay",
    ]
    if any(k in err_str for k in temporary_indicators):
        match = re.search(r'try again in (\d+(?:\.\d+)?)\s*s', err_str)
        delay = float(match.group(1)) if match else None
        return True, delay

    return False, None

def classify_execution_error(exc: Exception) -> Tuple[bool, str]:
    """Sanitize and classify an exception to determine retry eligibility.

    Returns:
        (is_retryable: bool, sanitized_category: str)
    """
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    status = getattr(exc, "status", None)
    err_str = str(exc).lower()
    exc_type = type(exc).__name__

    # 1. Check HTTP 429 specifically
    if code == 429 or "429" in err_str:
        is_temp, _ = is_temporary_rate_limit(exc)
        if is_temp:
            return True, "Temporary Rate Limit (HTTP 429)"
        else:
            return False, "Permanent Quota Exhaustion (ResourceExhausted)"

    # 2. Check 401 / 403 Authentication & Permission
    if code in [401, 403] or status in ["UNAUTHENTICATED", "PERMISSION_DENIED"] or any(
        k in err_str for k in ["401", "unauthorized", "api_key", "api key", "forbidden", "403", "permission_denied"]
    ):
        return False, "Authentication / Permission Error (HTTP 401/403)"

    # 3. Check 404 Model Not Found
    if code == 404 or status == "NOT_FOUND" or any(
        k in err_str for k in ["404", "not found", "model not found", "is not found"]
    ):
        return False, "Model Not Found / Invalid Endpoint (HTTP 404)"

    # 4. Check 400 Bad Request
    if code == 400 or status == "INVALID_ARGUMENT" or any(
        k in err_str for k in ["400", "invalid argument", "bad request", "tool configuration"]
    ):
        return False, "Invalid Request / Tool Configuration (HTTP 400)"

    # 5. Check other quota exhaustion mentions
    if "quota" in err_str and "exhausted" in err_str:
        is_temp, _ = is_temporary_rate_limit(exc)
        if is_temp:
            return True, "Temporary Rate Limit (HTTP 429)"
        return False, "Permanent Quota Exhaustion (ResourceExhausted)"

    # 6. Retryable HTTP 503 / 502 / 504 / 500
    if code == 503 or status == "UNAVAILABLE" or any(k in err_str for k in ["503", "service unavailable", "overloaded", "model is overloaded"]):
        return True, "Service Unavailable (HTTP 503)"
    if code == 502 or any(k in err_str for k in ["502", "bad gateway"]):
        return True, "Bad Gateway (HTTP 502)"
    if code == 504 or any(k in err_str for k in ["504", "gateway timeout"]):
        return True, "Gateway Timeout (HTTP 504)"
    if code == 500 or status == "INTERNAL" or any(k in err_str for k in ["500", "internal server error"]):
        return True, "Internal Server Error (HTTP 500)"

    # 7. Network timeouts & Connection failures
    if any(k in err_str for k in ["timeout", "timed out", "connecttimeout", "readtimeout"]):
        return True, "Network Timeout"
    if any(k in err_str for k in ["connecterror", "connection refused", "connection reset", "broken pipe", "nodename nor servname"]):
        return True, "Connection Transport Failure"

    # Default to non-retryable for safety
    return False, f"Non-Retryable System Error ({exc_type})"

class StageAgentService:
    """Singleton service managing the STAGE multi-agent system."""

    def __init__(self):
        self.session_service = InMemorySessionService()
        self.orchestrator = create_stage_orchestrator()
        self.runner = Runner(
            agent=self.orchestrator,
            session_service=self.session_service,
            app_name="stage_platform",
        )

    async def get_or_create_session(self, user_id: str, session_id: Optional[str] = None) -> Session:
        """Retrieve existing conversational session or create a new one."""
        if session_id:
            existing = await self.session_service.get_session(
                app_name="stage_platform", user_id=user_id, session_id=session_id
            )
            if existing:
                return existing

        target_id = session_id or f"sess-{uuid.uuid4().hex[:12]}"
        return await self.session_service.create_session(
            app_name="stage_platform", user_id=user_id, session_id=target_id
        )

    async def execute_command(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        force_mock: bool = False,
    ) -> AiCommandResponse:
        """Execute a natural language command through the ADK multi-agent system."""
        session = await self.get_or_create_session(user_id=user_id, session_id=session_id)
        has_api_key = bool(settings.gemini_api_key) and not force_mock

        if has_api_key:
            return await self._execute_live_adk(user_id=user_id, session=session, message=message)
        else:
            return await self._execute_deterministic_adk(user_id=user_id, session=session, message=message)

    def _build_partial_execution_response(
        self,
        session_id: str,
        user_id: str,
        telemetry_events: List[AgentExecutionEvent],
        selected_agents: List[str],
        executed_tools: List[str],
        error_reason: str,
        attempt_text: str = "",
        is_mutating: bool = False,
    ) -> AiCommandResponse:
        """Construct a structured partial failure response preserving all live telemetry."""
        telemetry_events.append(
            AgentExecutionEvent(
                agent_name="stage_orchestrator",
                event_type="partial_execution_failure",
                message=f"Live multi-agent execution was interrupted after tool execution ({', '.join(executed_tools)}). Automatic retry and offline fallback were suppressed for safety.",
                timestamp=time.time(),
            )
        )

        tools_display = ", ".join(f"`{t}()`" for t in executed_tools) if executed_tools else "None"
        agents_display = ", ".join(selected_agents) if selected_agents else "None"
        mutating_status = f"Yes ({', '.join(t for t in executed_tools if is_mutating_tool(t))})" if is_mutating else "No (Read-only operations)"

        body_parts = [
            f"### ⚠️ Multi-Agent Execution Interrupted (Partial Failure)\n\n"
            f"Live execution via Google Gemini was interrupted by a service error (**{error_reason}**) after partial multi-agent operations were completed.\n\n"
            f"#### Executed Operations Summary:\n"
            f"- **Engaged Specialists:** {agents_display}\n"
            f"- **Executed Tools ({len(executed_tools)}):** {tools_display}\n"
            f"- **Mutating Side Effects:** {mutating_status}\n"
        ]

        if attempt_text.strip():
            body_parts.append(
                f"#### Partial Agent Synthesis:\n"
                f"{attempt_text.strip()}\n"
            )
        else:
            body_parts.append(
                f"#### Partial Agent Synthesis:\n"
                f"_No final text synthesis was produced before connection failure._\n"
            )

        body_parts.append(
            f"> [!WARNING]\n"
            f"> **Safety Notice:** To protect data integrity and avoid duplicate tool invocations, automatic retries and full offline replay were suppressed. The event timeline captures all verified actions performed prior to interruption."
        )

        return AiCommandResponse(
            session_id=session_id,
            final_response="\n\n".join(body_parts),
            selected_specialist_agents=selected_agents,
            execution_status="partial_failure",
            execution_mode="live_gemini_partial_failure",
            agent_execution_events=telemetry_events,
            model_used=f"Google ADK / {settings.ai_model} (live Gemini execution interrupted: {error_reason})",
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )

    async def _execute_live_adk(
        self, user_id: str, session: Session, message: str
    ) -> AiCommandResponse:
        """Execute live through Google ADK Runner with streaming Event capture, controlled retries, and fallback."""
        telemetry_events: List[AgentExecutionEvent] = []
        user_content = types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)],
        )

        # Initial orchestrator intake event
        telemetry_events.append(
            AgentExecutionEvent(
                agent_name="stage_orchestrator",
                event_type="orchestrator_invocation",
                message=f"STAGE Orchestrator received user prompt: '{message}'",
                timestamp=time.time(),
            )
        )

        last_error_reason = "Unknown live execution error"
        execution_succeeded = False
        final_response = ""
        selected_agents: set[str] = set()
        attempt_execution_events: List[AgentExecutionEvent] = []

        canonical_session = session
        canonical_events_count = len(canonical_session.events)

        for attempt in range(1, MAX_LIVE_ATTEMPTS + 1):
            attempt_events: List[AgentExecutionEvent] = []
            attempt_text_parts: List[str] = []
            attempt_agents: set[str] = set()
            executed_tools: List[str] = []
            executed_mutating_tools: List[str] = []
            has_emitted_specialist_events = False
            has_executed_tools = False
            has_executed_mutating_tools = False

            # Create an isolated attempt session to prevent session pollution / duplicate user messages on retry
            attempt_session_id = f"{canonical_session.id}-att-{attempt}-{uuid.uuid4().hex[:6]}"
            attempt_session = await self.session_service.create_session(
                app_name="stage_platform",
                user_id=user_id,
                session_id=attempt_session_id,
                state=dict(canonical_session.state) if hasattr(canonical_session, "state") and canonical_session.state else {},
            )
            # Copy canonical session history to isolated session
            for past_event in canonical_session.events:
                await self.session_service.append_event(attempt_session, past_event)

            if attempt > 1:
                telemetry_events.append(
                    AgentExecutionEvent(
                        agent_name="stage_orchestrator",
                        event_type="retry_started",
                        message=f"Attempt {attempt}/{MAX_LIVE_ATTEMPTS}: Restarting live request after transient failure ({last_error_reason}).",
                        timestamp=time.time(),
                    )
                )

            try:
                async for event in self.runner.run_async(
                    user_id=user_id,
                    session_id=attempt_session.id,
                    new_message=user_content,
                ):
                    agent_name = event.author or "stage_orchestrator"
                    if agent_name != "stage_orchestrator":
                        attempt_agents.add(agent_name)
                        has_emitted_specialist_events = True
                        # Note: Specialist handoff does NOT set has_executed_tools

                    # Check function calls using ADK helper if available
                    func_calls = event.get_function_calls() if hasattr(event, "get_function_calls") else []
                    for call in func_calls:
                        tool_name = call.name
                        has_executed_tools = True
                        executed_tools.append(tool_name)
                        if is_mutating_tool(tool_name):
                            has_executed_mutating_tools = True
                            executed_mutating_tools.append(tool_name)
                        attempt_events.append(
                            AgentExecutionEvent(
                                agent_name=agent_name,
                                event_type="tool_call",
                                tool_name=tool_name,
                                tool_input=dict(call.args) if getattr(call, "args", None) else {},
                                timestamp=time.time(),
                            )
                        )

                    # Check function responses using ADK helper if available
                    func_responses = event.get_function_responses() if hasattr(event, "get_function_responses") else []
                    for resp in func_responses:
                        tool_name = resp.name
                        has_executed_tools = True
                        if is_mutating_tool(tool_name):
                            has_executed_mutating_tools = True
                        attempt_events.append(
                            AgentExecutionEvent(
                                agent_name=agent_name,
                                event_type="tool_result",
                                tool_name=tool_name,
                                tool_output=resp.response if hasattr(resp, "response") else resp,
                                timestamp=time.time(),
                            )
                        )

                    # Process content parts if not already captured by helpers
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.text:
                                attempt_text_parts.append(part.text)
                                attempt_events.append(
                                    AgentExecutionEvent(
                                        agent_name=agent_name,
                                        event_type="agent_response",
                                        message=part.text[:300] + ("..." if len(part.text) > 300 else ""),
                                        timestamp=time.time(),
                                    )
                                )
                            elif part.function_call and not func_calls:
                                call = part.function_call
                                tool_name = call.name
                                has_executed_tools = True
                                executed_tools.append(tool_name)
                                if is_mutating_tool(tool_name):
                                    has_executed_mutating_tools = True
                                    executed_mutating_tools.append(tool_name)
                                attempt_events.append(
                                    AgentExecutionEvent(
                                        agent_name=agent_name,
                                        event_type="tool_call",
                                        tool_name=tool_name,
                                        tool_input=dict(call.args) if getattr(call, "args", None) else {},
                                        timestamp=time.time(),
                                    )
                                )
                            elif part.function_response and not func_responses:
                                resp = part.function_response
                                tool_name = resp.name
                                has_executed_tools = True
                                if is_mutating_tool(tool_name):
                                    has_executed_mutating_tools = True
                                attempt_events.append(
                                    AgentExecutionEvent(
                                        agent_name=agent_name,
                                        event_type="tool_result",
                                        tool_name=tool_name,
                                        tool_output=resp.response if hasattr(resp, "response") else resp,
                                        timestamp=time.time(),
                                    )
                                )

                final_response = "".join(attempt_text_parts).strip()
                if not final_response:
                    final_response = "The STAGE specialist agents have completed analyzing your request."

                # Success: Commit attempt events to canonical session
                s_att = await self.session_service.get_session(
                    app_name="stage_platform", user_id=user_id, session_id=attempt_session_id
                )
                if s_att and len(s_att.events) > canonical_events_count:
                    for new_ev in s_att.events[canonical_events_count:]:
                        await self.session_service.append_event(canonical_session, new_ev)

                selected_agents = attempt_agents
                attempt_execution_events = attempt_events
                execution_succeeded = True
                break

            except Exception as exc:
                is_retryable, last_error_reason = classify_execution_error(exc)

                # Record attempt failure telemetry
                telemetry_events.append(
                    AgentExecutionEvent(
                        agent_name="stage_orchestrator",
                        event_type="retry_failed",
                        message=f"Live attempt {attempt}/{MAX_LIVE_ATTEMPTS} failed: {last_error_reason}",
                        timestamp=time.time(),
                    )
                )

                # 1. Mutating Tool Execution: Absolutely NO retry and NO fallback
                if has_executed_mutating_tools:
                    telemetry_events.append(
                        AgentExecutionEvent(
                            agent_name="stage_orchestrator",
                            event_type="retry_aborted_mutating_tool",
                            message=f"Live execution halted after mutating tool execution ({', '.join(executed_mutating_tools)}). Automatic retry and fallback are disabled to prevent duplicate side effects.",
                            timestamp=time.time(),
                        )
                    )
                    return self._build_partial_execution_response(
                        session_id=canonical_session.id,
                        user_id=user_id,
                        telemetry_events=telemetry_events + attempt_events,
                        selected_agents=list(attempt_agents),
                        executed_tools=executed_tools,
                        error_reason=last_error_reason,
                        attempt_text="".join(attempt_text_parts),
                        is_mutating=True,
                    )

                # 2. Read-Only Tool Execution: Halt retries and do NOT trigger deterministic fallback from scratch
                if has_executed_tools:
                    telemetry_events.append(
                        AgentExecutionEvent(
                            agent_name="stage_orchestrator",
                            event_type="retry_aborted_partial_execution",
                            message=f"Live retry aborted on attempt {attempt}: partial execution already executed tools ({', '.join(executed_tools)}). Halting to prevent duplicate operations.",
                            timestamp=time.time(),
                        )
                    )
                    return self._build_partial_execution_response(
                        session_id=canonical_session.id,
                        user_id=user_id,
                        telemetry_events=telemetry_events + attempt_events,
                        selected_agents=list(attempt_agents),
                        executed_tools=executed_tools,
                        error_reason=last_error_reason,
                        attempt_text="".join(attempt_text_parts),
                        is_mutating=False,
                    )

                # 3. No Tools Executed (Specialist handoff or pre-tool intake only): Safe to evaluate retry/fallback
                if not is_retryable:
                    telemetry_events.append(
                        AgentExecutionEvent(
                            agent_name="stage_orchestrator",
                            event_type="non_retryable_error",
                            message=f"Non-retryable error encountered: {last_error_reason}. Live attempts halted.",
                            timestamp=time.time(),
                        )
                    )
                    break

                if attempt < MAX_LIVE_ATTEMPTS:
                    _, suggested_delay = is_temporary_rate_limit(exc)
                    base_delay = suggested_delay if suggested_delay is not None else (INITIAL_RETRY_DELAY * (2 ** (attempt - 1)))
                    backoff = min(MAX_RETRY_DELAY, base_delay + random.uniform(0.05, 0.20))
                    await asyncio.sleep(backoff)

            finally:
                # Clean up isolated attempt session
                try:
                    await self.session_service.delete_session(
                        app_name="stage_platform", user_id=user_id, session_id=attempt_session_id
                    )
                except Exception:
                    pass

        if execution_succeeded:
            return AiCommandResponse(
                session_id=canonical_session.id,
                final_response=final_response,
                selected_specialist_agents=list(selected_agents),
                execution_status="completed",
                execution_mode="live_gemini",
                agent_execution_events=telemetry_events + attempt_execution_events,
                model_used=f"Google ADK / {settings.ai_model} (live Gemini execution)",
                created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            )

        # Retry exhausted or aborted without executing any tools: Safe to engage offline deterministic fallback
        telemetry_events.append(
            AgentExecutionEvent(
                agent_name="stage_orchestrator",
                event_type="offline_fallback_activated",
                message=f"Live Gemini execution unavailable ({last_error_reason}). Engaging offline deterministic fallback.",
                timestamp=time.time(),
            )
        )

        fallback_res = await self._execute_deterministic_adk(
            user_id=user_id, session=canonical_session, message=message
        )
        fallback_res.execution_mode = "offline_fallback_after_live_error"
        fallback_res.model_used = f"Google ADK / {settings.ai_model} (live Gemini call failed: {last_error_reason})"
        fallback_res.agent_execution_events = telemetry_events + fallback_res.agent_execution_events
        return fallback_res

    async def _execute_deterministic_adk(
        self, user_id: str, session: Session, message: str
    ) -> AiCommandResponse:
        """Deterministic ADK specialist routing and tool execution for reliable offline testing."""
        msg_lower = message.lower()
        events_captured: List[AgentExecutionEvent] = []
        selected_agents: List[str] = []

        # 1. Orchestrator Invocation
        events_captured.append(
            AgentExecutionEvent(
                agent_name="stage_orchestrator",
                event_type="orchestrator_invocation",
                message=f"STAGE Orchestrator received command: '{message}'",
                timestamp=time.time(),
            )
        )

        is_compound = (
            ("venue" in msg_lower or "stage" in msg_lower)
            and ("permission" in msg_lower or "checklist" in msg_lower or "letter" in msg_lower or "allocation" in msg_lower or "campaign" in msg_lower or "education" in msg_lower)
        )
        is_stage_match = is_compound or any(k in msg_lower for k in ["find", "stage", "venue", "spaces", "perform", "acoustic"])
        is_civic_assist = is_compound or any(k in msg_lower for k in ["permission", "permit", "park", "amphitheatre", "checklist", "letter", "curfew", "noise"])
        is_impact_flow = any(k in msg_lower for k in ["contribution", "campaign", "impact", "ledger", "allocate", "allocation", "pledge", "fundraising", "education"])

        response_sections: List[str] = []
        target_venue = None
        score_data = None

        # Route A: StageMatch Specialist
        if is_stage_match:
            selected_agents.append("stage_match")
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="stage_orchestrator",
                    event_type="specialist_handoff",
                    message="Delegating to StageMatch for venue discovery and compatibility scoring.",
                    timestamp=time.time(),
                )
            )

            # Determine city filter strictly from request
            city_match = None
            for c in ["kolkata", "chennai", "mumbai", "bengaluru", "delhi", "pune"]:
                if c in msg_lower:
                    city_match = c.capitalize()
                    break

            # Tool Call 1: search_stages (never substitute other cities when city is requested)
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="stage_match",
                    event_type="tool_call",
                    tool_name="search_stages",
                    tool_input={"city": city_match, "art_form": "Music"},
                    timestamp=time.time(),
                )
            )
            found_stages = search_stages(city=city_match)
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="stage_match",
                    event_type="tool_result",
                    tool_name="search_stages",
                    tool_output={"count": len(found_stages), "venues": [s["name"] for s in found_stages[:3]]},
                    timestamp=time.time(),
                )
            )

            # Tool Call 2: calculate_match_score using the actual requested city and venue
            target_venue = found_stages[0] if found_stages else None
            if target_venue:
                eval_city = city_match or target_venue["city"]
                events_captured.append(
                    AgentExecutionEvent(
                        agent_name="stage_match",
                        event_type="tool_call",
                        tool_name="calculate_match_score",
                        tool_input={
                            "venue_id": target_venue["id"],
                            "city": eval_city,
                            "expected_audience": 80,
                            "art_form": "Music",
                            "budget": 25000.0,
                        },
                        timestamp=time.time(),
                    )
                )
                score_data = calculate_match_score(
                    venue_id=target_venue["id"],
                    city=eval_city,
                    expected_audience=80,
                    art_form="Music",
                    budget=25000.0,
                )
                events_captured.append(
                    AgentExecutionEvent(
                        agent_name="stage_match",
                        event_type="tool_result",
                        tool_name="calculate_match_score",
                        tool_output=score_data,
                        timestamp=time.time(),
                    )
                )

                response_sections.append(
                    f"### Stage Recommendation (via StageMatch)\n\n"
                    f"**Top Recommended Space:** {target_venue['name']} ({target_venue['neighborhood']}, {target_venue['city']})\n"
                    f"- **Venue Type:** {target_venue['venue_type']}\n"
                    f"- **Capacity:** {target_venue['seated_capacity']} seated / {target_venue['standing_capacity']} standing\n"
                    f"- **Deterministic Match Score:** **{score_data['total_score']}/100** ({'Recommended' if score_data['is_recommended'] else 'Notice'})\n"
                    f"- **Compatibility Rationale:** {score_data['rationale']}\n"
                    f"- **Host Policy:** {target_venue.get('host_policy', 'Standard host policy')}\n"
                    f"- **Record Verification:** Fictional demonstration record for platform simulation (is_demonstration = 1)\n"
                )
            elif city_match:
                response_sections.append(
                    f"### Stage Search Results (via StageMatch)\n\n"
                    f"No verified performance spaces currently match your criteria in **{city_match}**."
                )

        # Route B: CivicAssist Specialist
        if is_civic_assist:
            selected_agents.append("civic_assist")
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="stage_orchestrator",
                    event_type="specialist_handoff",
                    message="Delegating to CivicAssist for regulatory classification, checklist generation, and draft documentation.",
                    timestamp=time.time(),
                )
            )

            # Preserve selected venue details from StageMatch
            if target_venue:
                v_name = target_venue["name"]
                v_type = target_venue["venue_type"]
                v_city = target_venue["city"]
            elif "chennai" in msg_lower:
                v_name = "The Marina Coastal Amphitheatre"
                v_type = "Open-Air Seaside Amphitheatre"
                v_city = "Chennai"
            else:
                v_name = "The Vault Amphitheater"
                v_type = "Historic Brick Amphitheater"
                v_city = "Kolkata"

            # Tool Call 1: classify_venue
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="civic_assist",
                    event_type="tool_call",
                    tool_name="classify_venue",
                    tool_input={"venue_type": v_type},
                    timestamp=time.time(),
                )
            )
            v_class = classify_venue(venue_type=v_type)
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="civic_assist",
                    event_type="tool_result",
                    tool_name="classify_venue",
                    tool_output=v_class,
                    timestamp=time.time(),
                )
            )

            # Tool Call 2: retrieve_civic_guidance_rag (identifiable document corpus)
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="civic_assist",
                    event_type="tool_call",
                    tool_name="retrieve_civic_guidance_rag",
                    tool_input={"query": f"{v_name} {v_type} permissions curfew noise safety", "city": v_city, "venue_type": v_type},
                    timestamp=time.time(),
                )
            )
            rag_res = retrieve_civic_guidance_rag(
                query=f"{v_name} {v_type} permissions curfew noise safety",
                city=v_city,
                venue_type=v_type,
            )
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="civic_assist",
                    event_type="tool_result",
                    tool_name="retrieve_civic_guidance_rag",
                    tool_output={
                        "evidence_count": len(rag_res["retrieved_evidence"]),
                        "citations": [e["citation"] for e in rag_res["retrieved_evidence"]],
                        "status": rag_res["document_status"],
                        "retrieval_mode": rag_res.get("retrieval_mode", "chromadb_semantic"),
                        "similarity_scores": rag_res.get("similarity_scores", []),
                    },
                    timestamp=time.time(),
                )
            )

            # Tool Call 3: generate_permission_checklist
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="civic_assist",
                    event_type="tool_call",
                    tool_name="generate_permission_checklist",
                    tool_input={"venue_name": v_name, "venue_type": v_type, "expected_audience": 100},
                    timestamp=time.time(),
                )
            )
            checklist_res = generate_permission_checklist(
                venue_name=v_name, venue_type=v_type, expected_audience=100
            )
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="civic_assist",
                    event_type="tool_result",
                    tool_name="generate_permission_checklist",
                    tool_output={"items_count": len(checklist_res["checklist"])},
                    timestamp=time.time(),
                )
            )

            # Tool Call 4: draft_permission_letter (if requested or compound)
            letter_res = None
            if "letter" in msg_lower or is_compound:
                events_captured.append(
                    AgentExecutionEvent(
                        agent_name="civic_assist",
                        event_type="tool_call",
                        tool_name="draft_permission_letter",
                        tool_input={
                            "applicant_name": "Aarav Mehta",
                            "event_title": "Acoustic Raga Showcase",
                            "venue_name": v_name,
                            "event_date": "2026-12-28",
                            "expected_audience": 100,
                            "art_form": "Music",
                        },
                        timestamp=time.time(),
                    )
                )
                letter_res = draft_permission_letter(
                    applicant_name="Aarav Mehta",
                    event_title="Acoustic Raga Showcase",
                    venue_name=v_name,
                    event_date="2026-12-28",
                    expected_audience=100,
                    art_form="Music",
                )
                events_captured.append(
                    AgentExecutionEvent(
                        agent_name="civic_assist",
                        event_type="tool_result",
                        tool_name="draft_permission_letter",
                        tool_output={"watermark": letter_res["watermark"], "type": letter_res["document_type"]},
                        timestamp=time.time(),
                    )
                )

            # Format CivicAssist section with clearly separated RAG evidence, recommendations, and missing information
            civic_body = (
                f"### Regulatory Guidance & Checklist (via CivicAssist)\n\n"
                f"- **Venue:** {v_name} ({v_city})\n"
                f"- **Jurisdiction Tier:** {v_class['display_label']} ({v_class['primary_jurisdiction']})\n"
                f"- **Recommended Lead Time:** {checklist_res['recommended_lead_time']}\n"
                f"- **Sound Curfew (Sample Planning Limit):** {checklist_res['statutory_curfew']}\n\n"
                f"#### 1. Retrieved Evidence (ChromaDB Vector Retrieval · all-MiniLM-L6-v2)\n"
            )

            if rag_res["retrieved_evidence"]:
                for ev in rag_res["retrieved_evidence"]:
                    sim_str = f" *(Cosine Similarity: {ev['similarity_score']:.2f})*" if "similarity_score" in ev else ""
                    civic_body += (
                        f"- **Citation:** `{ev['citation']}`{sim_str}\n"
                        f"  - *Jurisdiction:* {ev['jurisdiction']}\n"
                        f"  - *Source File:* `{ev['source_file']}`\n"
                        f"  - *Excerpt:* \"{ev['excerpt']}\"\n"
                    )
            else:
                civic_body += "- No exact passage matched in the local sample document corpus.\n"

            civic_body += f"\n#### 2. General Recommendations\n"
            for rec in rag_res["general_recommendations"]:
                civic_body += f"- {rec}\n"

            civic_body += f"\n#### 3. Missing Information (Requires Independent Verification)\n"
            for miss in rag_res["missing_information"]:
                civic_body += f"- ⚠️ {miss}\n"

            civic_body += f"\n#### 4. Mandatory Compliance Checklist\n"
            for item in checklist_res["checklist"]:
                civic_body += f"1. **{item['step']}**: {item['requirement']} *(Authority: {item['authority']})*\n"

            if letter_res:
                civic_body += (
                    f"\n> **Draft Formal Letter Prepared:**\n"
                    f"> *Status: {letter_res['watermark']}*\n"
                    f"> A formal application letter of intent has been generated and ready for human review before manual submission.\n"
                )

            civic_body += (
                f"\n> [!WARNING]\n"
                f"> **Statutory Legal Disclaimer:** {rag_res['legal_disclaimer']}"
            )
            response_sections.append(civic_body)

        # Route C: ImpactFlow Specialist
        if is_impact_flow:
            selected_agents.append("impact_flow")
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="stage_orchestrator",
                    event_type="specialist_handoff",
                    message="Delegating to ImpactFlow for transparent financial ledger inspection and impact analytics.",
                    timestamp=time.time(),
                )
            )

            # Retrieve campaign based on query keyword (e.g. education)
            keyword = "Education" if ("education" in msg_lower or "school" in msg_lower) else None
            campaigns = get_campaign_details(title_keyword=keyword)
            if not campaigns:
                campaigns = get_campaign_details()
            primary_campaign = campaigns[0] if campaigns else None

            # Tool Call 1: get_campaign_details
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="impact_flow",
                    event_type="tool_call",
                    tool_name="get_campaign_details",
                    tool_input={"title_keyword": keyword},
                    timestamp=time.time(),
                )
            )
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="impact_flow",
                    event_type="tool_result",
                    tool_name="get_campaign_details",
                    tool_output={"campaigns_count": len(campaigns), "primary": primary_campaign["title"] if primary_campaign else None},
                    timestamp=time.time(),
                )
            )

            # Tool Call 2: calculate_contribution_allocation using data-driven event rules
            cause_param = primary_campaign["id"] if primary_campaign else "cause-01"
            event_param = "evt-01" if (primary_campaign and primary_campaign["id"] == "cause-01") else None

            events_captured.append(
                AgentExecutionEvent(
                    agent_name="impact_flow",
                    event_type="tool_call",
                    tool_name="calculate_contribution_allocation",
                    tool_input={"ticket_price": 500.0, "ticket_count": 2, "cause_id": cause_param, "event_id": event_param},
                    timestamp=time.time(),
                )
            )
            alloc_data = calculate_contribution_allocation(
                ticket_price=500.0,
                ticket_count=2,
                cause_id=cause_param,
                event_id=event_param,
            )
            events_captured.append(
                AgentExecutionEvent(
                    agent_name="impact_flow",
                    event_type="tool_result",
                    tool_name="calculate_contribution_allocation",
                    tool_output=alloc_data,
                    timestamp=time.time(),
                )
            )

            # Tool Call 3: generate_impact_report
            impact_rep = None
            if primary_campaign:
                events_captured.append(
                    AgentExecutionEvent(
                        agent_name="impact_flow",
                        event_type="tool_call",
                        tool_name="generate_impact_report",
                        tool_input={"cause_id": primary_campaign["id"]},
                        timestamp=time.time(),
                    )
                )
                impact_rep = generate_impact_report(primary_campaign["id"])
                events_captured.append(
                    AgentExecutionEvent(
                        agent_name="impact_flow",
                        event_type="tool_result",
                        tool_name="generate_impact_report",
                        tool_output=impact_rep,
                        timestamp=time.time(),
                    )
                )

            alloc_bd = alloc_data["allocation_breakdown"]
            impact_text = (
                f"### Social Impact & Financial Allocation (via ImpactFlow)\n\n"
                f"**Data-Driven Revenue Allocation ({alloc_data.get('rule_source', 'Configured platform rule')}):**\n"
                f"- **Gross Total:** ₹{alloc_data['gross_total']:,.2f} ({alloc_data['pricing_parameters']['ticket_count']} passes @ ₹{alloc_data['pricing_parameters']['ticket_price']:,.2f})\n"
                f"- **Artist Share ({alloc_bd['artist_share']['percentage']}):** ₹{alloc_bd['artist_share']['amount']:,.2f} ({alloc_bd['artist_share']['description']})\n"
                f"- **Venue Host Share ({alloc_bd['venue_host_share']['percentage']}):** ₹{alloc_bd['venue_host_share']['amount']:,.2f} ({alloc_bd['venue_host_share']['description']})\n"
                f"- **Social Impact Pledge ({alloc_bd['social_cause_pledge']['percentage']}):** ₹{alloc_bd['social_cause_pledge']['amount']:,.2f} pledged to *{alloc_bd['social_cause_pledge']['campaign_name']}*\n"
                f"- **Reconciled Total:** ₹{alloc_data['reconciled_sum']:,.2f} (100% matched to gross proceeds)\n\n"
            )

            if impact_rep:
                outcomes = impact_rep.get("deterministic_outcomes", {})
                impact_text += (
                    f"**Verified Campaign Metrics ({impact_rep['title']}):**\n"
                    f"- Total Raised to Date: ₹{impact_rep['current_amount']:,.2f} of ₹{impact_rep['target_amount']:,.2f} ({impact_rep['progress_percentage']}%)\n"
                    f"- Primary Tangible Outcome: **{outcomes.get('primary_metric', 'Active')}**\n"
                    f"- Community Beneficiaries: **{outcomes.get('community_beneficiaries', 'Youth students')}**\n"
                    f"- Ledger Audit: {impact_rep['ledger_audit']['tracked_contributions_count']} transactions verified ({impact_rep['ledger_audit']['audit_status']})\n\n"
                )

            impact_text += "*Simulated transparency ledger: All financial allocations are deterministic calculations for platform demonstration.*"
            response_sections.append(impact_text)

        # Default fallback if no specialist matched
        if not response_sections:
            selected_agents.append("stage_match")
            stages = search_stages()
            response_sections.append(
                f"STAGE Orchestrator received your request: '{message}'.\n\n"
                f"Currently, {len(stages)} verified stage venues and 4 social campaigns are active on the platform. "
                f"You can ask me to discover stages, check municipal and acoustic permission rules, or compute social cause contribution allocations."
            )

        final_response = "\n\n---\n\n".join(response_sections)

        # Record completion
        events_captured.append(
            AgentExecutionEvent(
                agent_name="stage_orchestrator",
                event_type="turn_complete",
                message=f"Consolidated analysis completed across {len(selected_agents)} specialist agent(s).",
                timestamp=time.time(),
            )
        )

        return AiCommandResponse(
            session_id=session.id,
            final_response=final_response,
            selected_specialist_agents=selected_agents,
            execution_status="completed",
            execution_mode="offline_deterministic",
            agent_execution_events=events_captured,
            model_used=f"Google ADK / {settings.ai_model} (offline deterministic mode - GEMINI_API_KEY not configured)" if not settings.gemini_api_key else f"Google ADK / {settings.ai_model} (mock test mode)",
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )

# Global singleton service instance
agent_service = StageAgentService()

