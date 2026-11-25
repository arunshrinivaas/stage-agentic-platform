"""Comprehensive unit and integration tests for STAGE Milestone 6.2:
Bounded Gemini Request, Error Telemetry, and Safety Guarantees.

Test Scenarios Covered:
1. HTTP 503 retry success (attempt 1 fails with 503 UNAVAILABLE demand spike, attempt 2 recovers live).
2. All retries fail with HTTP 503 (all 3 attempts fail with 503, safe deterministic fallback engaged).
3. Provider request timeout (bounded timeout triggers TimeoutError, retries and recovers).
4. Session cleanup and canonical message isolation on failure (isolated attempt sessions, zero canonical pollution).
5. No tool replay after read-only tool failure (partial failure locks out retries and suppresses deterministic replay).
6. No retry or fallback after mutating tool failure (mutating tool execution strictly halts retries and disables fallback).
7. Telemetry preservation and secret sanitization (zero API key/secret leakage, structured fields populated).
8. Deterministic fallback activation strictly when safe (activates only when 0 tools executed live).
9. Specialist handoff without tool call retries safely.
10. Temporary 429 rate limit retries and recovers.
11. Permanent quota exhaustion halts immediately without blind retries.
12. First-attempt live success returns live_gemini cleanly.
"""
import os
import sys
import asyncio
import time
from unittest.mock import AsyncMock, patch, MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from google.genai import types, errors
from app.config import settings
from app.services.agent_service import (
    agent_service,
    classify_execution_error,
    sanitize_provider_message,
    is_mutating_tool,
    is_temporary_rate_limit,
    MAX_LIVE_ATTEMPTS,
    ErrorClassification,
    OVERALL_EXECUTION_BUDGET_SECONDS,
    MIN_RETRY_BUDGET_SECONDS,
)
from app.agents.stage_match import tools as stage_match_tools


class MockAdkEvent:
    """Mock ADK Event object for generator testing."""
    def __init__(self, author="stage_orchestrator", text=None, function_call=None, function_response=None):
        self.author = author
        self.content = MagicMock()
        parts = []
        self._func_calls = []
        self._func_responses = []

        if text:
            part = MagicMock()
            part.text = text
            part.function_call = None
            part.function_response = None
            parts.append(part)

        if function_call:
            part = MagicMock()
            part.text = None
            part.function_call = function_call
            part.function_response = None
            parts.append(part)
            self._func_calls.append(function_call)

        if function_response:
            part = MagicMock()
            part.text = None
            part.function_call = None
            part.function_response = function_response
            parts.append(part)
            self._func_responses.append(function_response)

        self.content.parts = parts

        # Facilitate commit to canonical session
        self.id = f"mock-ev-{time.time()}"

    def get_function_calls(self):
        return self._func_calls

    def get_function_responses(self):
        return self._func_responses


def test_error_classification_and_telemetry_extraction():
    """Verify error classification, status code extraction, sanitization, and 429 distinctions."""
    print("\n[Test 0] Error classification & telemetry extraction...")

    # 1. HTTP 503 with Google GenAI ServerError response
    e_503 = errors.ServerError(
        code=503,
        response_json={
            "error": {
                "code": 503,
                "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
                "status": "UNAVAILABLE",
            }
        },
    )
    res_503 = classify_execution_error(e_503)
    assert res_503.is_retryable is True
    assert res_503.status_code == 503
    assert "Service Unavailable" in res_503.category
    assert "high demand" in res_503.provider_message

    # Test backwards-compatible tuple unpacking
    r_unpacked, cat_unpacked = classify_execution_error(e_503)
    assert r_unpacked is True
    assert "503" in cat_unpacked

    # 2. Bounded Provider Timeout (TimeoutError / 504)
    e_timeout = TimeoutError("Outbound HTTP request exceeded bounded deadline of 20000ms")
    res_timeout = classify_execution_error(e_timeout)
    assert res_timeout.is_retryable is True
    assert res_timeout.status_code == 504
    assert "Provider Request Timeout" in res_timeout.category

    # 3. HTTP 404 Model Not Found
    e_404 = errors.ClientError(
        code=404,
        response_json={
            "error": {
                "code": 404,
                "message": "models/gemini-2.5-flash is not found. For details, see: https://ai.google.dev/gemini-api/docs/models",
                "status": "NOT_FOUND",
            }
        },
    )
    res_404 = classify_execution_error(e_404)
    assert res_404.is_retryable is False
    assert res_404.status_code == 404
    assert "Model Not Found" in res_404.category

    # 4. HTTP 401 with raw secret key leak
    fake_secret = "AIzaSyD-AbCdEfGhIjKlMnOpQrStUvWxYz12345"
    e_401 = Exception(f"401 Unauthorized: Invalid API key provided: {fake_secret} for project")
    res_401 = classify_execution_error(e_401)
    assert res_401.is_retryable is False
    assert res_401.status_code == 401
    assert fake_secret not in res_401.provider_message
    assert "[REDACTED_API_KEY]" in res_401.provider_message
    assert "401" in res_401.category

    # 5. HTTP 429 Temporary Rate Limit
    e_temp_429 = errors.ClientError(
        code=429,
        response_json={
            "error": {
                "message": "Resource temporarily exhausted, please try again in 1.5s",
                "details": [{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "1.5s"}],
            }
        },
    )
    res_temp_429 = classify_execution_error(e_temp_429)
    assert res_temp_429.is_retryable is True
    assert res_temp_429.status_code == 429
    assert "Temporary Rate Limit" in res_temp_429.category

    # 6. HTTP 429 Permanent Quota
    e_perm_429 = errors.ClientError(
        code=429,
        response_json={
            "error": {
                "message": "Daily quota exceeded for project. Monthly billing threshold reached.",
                "status": "RESOURCE_EXHAUSTED",
            }
        },
    )
    res_perm_429 = classify_execution_error(e_perm_429)
    assert res_perm_429.is_retryable is False
    assert res_perm_429.status_code == 429
    assert "Permanent Quota Exhaustion" in res_perm_429.category

    print("✓ Test 0 Passed: Classification accurately captures status codes, sanitized provider messages, and unpacks cleanly.")


async def test_scenario_1_503_retry_success():
    """Scenario 1: HTTP 503 retry success (first attempt fails with demand spike, attempt 2 recovers live)."""
    print("\n[Scenario 1] HTTP 503 retry success...")
    attempts_called = 0

    e_google_503 = errors.ServerError(
        code=503,
        response_json={
            "error": {
                "code": 503,
                "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
                "status": "UNAVAILABLE",
            }
        },
    )

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            raise e_google_503
        yield MockAdkEvent(
            author="stage_orchestrator",
            text="The STAGE multi-agent system recovered on attempt 2 and analyzed your performance requirements.",
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find an acoustic hall for sitar recital",
        )

    assert attempts_called == 2, f"Expected 2 attempts (retry on 503), got {attempts_called}"
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"
    assert "recovered on attempt 2" in res.final_response

    # Verify structured telemetry
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "retry_failed" in event_types
    assert "retry_started" in event_types
    assert "live_execution_success" in event_types

    failed_ev = next(e for e in res.agent_execution_events if e.event_type == "retry_failed")
    assert failed_ev.provider_status == 503
    assert failed_ev.attempt == 1
    assert "high demand" in (failed_ev.provider_message or "")
    assert failed_ev.duration_ms is not None and failed_ev.duration_ms >= 0

    success_ev = next(e for e in res.agent_execution_events if e.event_type == "live_execution_success")
    assert success_ev.attempt == 2
    assert success_ev.duration_ms is not None and success_ev.duration_ms >= 0

    print("✓ Scenario 1 Passed: 503 demand spike triggered retry; attempt 2 succeeded with full provider telemetry.")


async def test_scenario_2_all_retries_fail_503():
    """Scenario 2: All 3 retries fail with HTTP 503 -> safe deterministic fallback engaged."""
    print("\n[Scenario 2] All 3 retries fail with HTTP 503 -> safe deterministic fallback...")
    attempts_called = 0

    e_google_503 = errors.ServerError(
        code=503,
        response_json={
            "error": {
                "code": 503,
                "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
                "status": "UNAVAILABLE",
            }
        },
    )

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if False:
            yield None
        raise e_google_503

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find an acoustic stage in Kolkata suitable for sitar duo",
        )

    assert attempts_called == MAX_LIVE_ATTEMPTS, f"Expected {MAX_LIVE_ATTEMPTS} attempts, got {attempts_called}"
    assert res.execution_mode == "offline_fallback_after_live_error"
    assert res.execution_status == "completed"

    # Verify telemetry has 3 retry_failed events with status 503 and high demand notice
    retry_failures = [e for e in res.agent_execution_events if e.event_type == "retry_failed"]
    assert len(retry_failures) == 3
    for idx, ev in enumerate(retry_failures, 1):
        assert ev.attempt == idx
        assert ev.provider_status == 503
        assert "high demand" in (ev.provider_message or "")
        assert ev.has_mutating_tools is False

    # Verify fallback event
    fallback_ev = next(e for e in res.agent_execution_events if e.event_type == "offline_fallback_activated")
    assert fallback_ev.provider_status == 503
    assert "high demand" in (fallback_ev.provider_message or "")
    assert fallback_ev.attempt == MAX_LIVE_ATTEMPTS

    # Verify response contains deterministic recommendations
    assert "Stage Recommendation" in res.final_response
    print("✓ Scenario 2 Passed: 3 exhausted 503 attempts safely activated offline fallback with complete telemetry.")


async def test_scenario_3_provider_request_timeout():
    """Scenario 3: Provider request timeout triggers TimeoutError, retries and recovers."""
    print("\n[Scenario 3] Provider request timeout retries cleanly...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            raise TimeoutError("Outbound HTTP request exceeded bounded deadline of 20000ms")
        yield MockAdkEvent(
            author="stage_orchestrator",
            text="Completed successfully after recovering from timeout.",
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find acoustic stage",
        )

    assert attempts_called == 2
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"

    timeout_ev = next(e for e in res.agent_execution_events if e.event_type == "retry_failed")
    assert timeout_ev.provider_status == 504
    assert "Provider Request Timeout" in timeout_ev.message
    print("✓ Scenario 3 Passed: Bounded provider timeout was classified as 504, retried, and recovered.")


async def test_scenario_4_session_cleanup_and_canonical_isolation():
    """Scenario 4: Session cleanup and canonical message isolation across retries."""
    print("\n[Scenario 4] Session cleanup & canonical isolation...")
    attempts_called = 0
    session_id = "test-session-isolation"
    observed_attempt_session_ids = []

    # Pre-create canonical session
    canonical_session = await agent_service.get_or_create_session(
        user_id="usr-aarav", session_id=session_id
    )

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        current_sess_id = kwargs.get("session_id", "")
        observed_attempt_session_ids.append(current_sess_id)
        assert current_sess_id != session_id, "run_async must execute on isolated session, not canonical session!"
        assert "-att-" in current_sess_id, f"Session ID must include attempt tag: {current_sess_id}"
        if attempts_called < 3:
            raise Exception("503 Service Unavailable: High load spike")
        yield MockAdkEvent(
            author="stage_orchestrator",
            text="Recovered on attempt 3.",
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Check stage permissions",
            session_id=session_id,
        )

    assert attempts_called == 3
    assert len(observed_attempt_session_ids) == 3

    # Verify all isolated attempt sessions were cleaned up in finally block
    for att_id in observed_attempt_session_ids:
        deleted_sess = await agent_service.session_service.get_session(
            app_name="stage_platform", user_id="usr-aarav", session_id=att_id
        )
        assert deleted_sess is None, f"Attempt session {att_id} was not deleted from session service!"

    # Verify canonical session does not contain duplicated user turns
    canonical_after = await agent_service.session_service.get_session(
        app_name="stage_platform", user_id="usr-aarav", session_id=session_id
    )
    user_turns = [e for e in canonical_after.events if getattr(e, "author", "") == "user"]
    assert len(user_turns) <= 1, f"Canonical session polluted with {len(user_turns)} user turns!"
    print(f"✓ Scenario 4 Passed: 3 isolated attempt sessions created & cleaned up. Canonical session has {len(user_turns)} user turn.")


async def test_scenario_5_read_only_tool_no_replay():
    """Scenario 5: Partial failure after read-only tool halts retries and suppresses deterministic replay."""
    print("\n[Scenario 5] No tool replay after read-only tool failure...")
    attempts_called = 0
    deterministic_tools_called = 0

    original_search = stage_match_tools.search_stages

    def spy_search(*args, **kwargs):
        nonlocal deterministic_tools_called
        deterministic_tools_called += 1
        return original_search(*args, **kwargs)

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # 1. Yield function call for read-only tool
        call_obj = MagicMock()
        call_obj.name = "search_stages"
        call_obj.args = {"city": "Kolkata"}
        yield MockAdkEvent(author="stage_match", function_call=call_obj)

        # 2. Yield function response
        resp_obj = MagicMock()
        resp_obj.name = "search_stages"
        resp_obj.response = {"venues": ["Rabindra Sadan Cultural Complex"]}
        yield MockAdkEvent(author="stage_match", function_response=resp_obj)

        # 3. Fail mid-turn with 503
        raise errors.ServerError(
            code=503,
            response_json={
                "error": {
                    "code": 503,
                    "message": "Model overloaded during synthesis",
                    "status": "UNAVAILABLE",
                }
            },
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(stage_match_tools, "search_stages", spy_search):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert attempts_called == 1, f"Retries must halt after tool execution! Ran {attempts_called} attempts."
    assert deterministic_tools_called == 0, f"Deterministic replay must be suppressed! Replayed {deterministic_tools_called} times."
    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"

    event_types = [e.event_type for e in res.agent_execution_events]
    assert "retry_aborted_partial_execution" in event_types
    assert "partial_execution_failure" in event_types
    assert "offline_fallback_activated" not in event_types

    # Verify tool events and provider status are retained
    tool_events = [e for e in res.agent_execution_events if e.tool_name == "search_stages"]
    assert len(tool_events) == 2  # call + response
    assert any(e.provider_status == 503 for e in res.agent_execution_events if e.event_type == "retry_failed")

    print("✓ Scenario 5 Passed: Read-only tool execution locked out retries and prevented deterministic replay.")


async def test_scenario_6_mutating_tool_no_retry_no_fallback():
    """Scenario 6: Mutating tool execution disables retry and fallback."""
    print("\n[Scenario 6] Mutating tool execution disables retry and fallback...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        call_obj = MagicMock()
        call_obj.name = "create_booking"
        call_obj.args = {"venue_id": "venue-01", "performer_id": "usr-aarav"}
        yield MockAdkEvent(author="stage_match", function_call=call_obj)
        raise Exception("503 Service Unavailable: Broken pipe after booking creation")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Book stage venue-01",
        )

    assert attempts_called == 1, "Must not retry after mutating tool!"
    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"

    event_types = [e.event_type for e in res.agent_execution_events]
    assert "retry_aborted_mutating_tool" in event_types
    assert "partial_execution_failure" in event_types
    assert "offline_fallback_activated" not in event_types

    aborted_ev = next(e for e in res.agent_execution_events if e.event_type == "retry_aborted_mutating_tool")
    assert aborted_ev.has_mutating_tools is True
    assert "create_booking" in aborted_ev.message
    assert "Yes (create_booking)" in res.final_response
    print("✓ Scenario 6 Passed: Mutating tool execution locked out retries and disabled fallback.")


async def test_scenario_7_telemetry_preservation_and_secret_sanitization():
    """Scenario 7: Telemetry preservation and secret sanitization."""
    print("\n[Scenario 7] Telemetry preservation and secret sanitization...")
    secret_key = "AIzaSyD-SecretKeyLeakedFromTrace1234567"
    auth_header = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token"

    async def mock_run_async(*args, **kwargs):
        call_obj = MagicMock()
        call_obj.name = "classify_venue"
        call_obj.args = {"venue_type": "Heritage Amphitheatre"}
        yield MockAdkEvent(author="civic_assist", function_call=call_obj)
        resp_obj = MagicMock()
        resp_obj.name = "classify_venue"
        resp_obj.response = {"category": "heritage", "curfew": "22:00"}
        yield MockAdkEvent(author="civic_assist", function_response=resp_obj)
        # Raise exception containing sensitive values
        raise Exception(f"504 Gateway Timeout: url='https://api.google.com?key={secret_key}', auth='{auth_header}'")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Classify venue",
        )

    # 1. Check secrets are completely redacted in all event messages
    for ev in res.agent_execution_events:
        msg = ev.message or ""
        prov_msg = ev.provider_message or ""
        assert secret_key not in msg, f"Secret leaked in event.message: {msg}"
        assert secret_key not in prov_msg, f"Secret leaked in event.provider_message: {prov_msg}"
        assert "eyJhbGci" not in msg, f"Bearer token leaked in event.message: {msg}"
        assert "eyJhbGci" not in prov_msg, f"Bearer token leaked in event.provider_message: {prov_msg}"

    assert secret_key not in res.final_response
    assert "eyJhbGci" not in res.final_response

    # 2. Check structured fields exist and are populated
    partial_ev = next(e for e in res.agent_execution_events if e.event_type == "partial_execution_failure")
    assert partial_ev.provider_status == 504
    assert partial_ev.duration_ms is not None

    tool_call_ev = next(e for e in res.agent_execution_events if e.event_type == "tool_call")
    assert tool_call_ev.tool_name == "classify_venue"
    assert tool_call_ev.tool_input == {"venue_type": "Heritage Amphitheatre"}

    tool_result_ev = next(e for e in res.agent_execution_events if e.event_type == "tool_result")
    assert tool_result_ev.tool_name == "classify_venue"
    assert tool_result_ev.tool_output == {"category": "heritage", "curfew": "22:00"}

    print("✓ Scenario 7 Passed: Secrets thoroughly redacted; structured telemetry fields fully preserved.")


async def test_scenario_8_deterministic_fallback_activation():
    """Scenario 8: Deterministic fallback activation strictly when safe (0 tools executed)."""
    print("\n[Scenario 8] Deterministic fallback activation strictly when safe...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if False:
            yield None
        raise Exception("503 Service Unavailable: High load")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find a venue for an acoustic sitar performance and check permissions",
        )

    assert attempts_called == MAX_LIVE_ATTEMPTS
    assert res.execution_mode == "offline_fallback_after_live_error"
    assert res.execution_status == "completed"
    assert "stage_match" in res.selected_specialist_agents
    assert "civic_assist" in res.selected_specialist_agents
    assert "offline_fallback_activated" in [e.event_type for e in res.agent_execution_events]
    assert "Stage Recommendation" in res.final_response
    print("✓ Scenario 8 Passed: Safe pre-tool failure correctly engaged offline deterministic specialists.")


async def test_specialist_handoff_retries_safely():
    """Test: Specialist handoff without tool call does NOT count as a side effect and retries safely."""
    print("\n[Test 9] Specialist handoff without tool call retries safely...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            yield MockAdkEvent(author="stage_match", text="StageMatch specialist engaged...")
            raise Exception("503 Service Unavailable: Dropped before any tool invocation")
        yield MockAdkEvent(author="stage_match", text="StageMatch completed successfully on attempt 2.")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find acoustic stage",
        )

    assert attempts_called == 2
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"
    print("✓ Test 9 Passed: Specialist handoff alone did not lock out live retries.")


async def test_temporary_429_retries():
    """Test: Temporary 429 rate limit retries and recovers."""
    print("\n[Test 10] Temporary 429 rate limit retries and recovers...")
    attempts_called = 0

    e_temp_429 = errors.ClientError(
        code=429,
        response_json={
            "error": {
                "message": "Resource temporarily exhausted, please try again in 0.1s",
                "details": [{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "0.1s"}],
            }
        },
    )

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            raise e_temp_429
        yield MockAdkEvent(author="stage_orchestrator", text="Recovered from 429 backoff.")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Check allocations",
        )

    assert attempts_called == 2
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"
    print("✓ Test 10 Passed: Temporary 429 retried and recovered.")


async def test_permanent_quota_does_not_retry():
    """Test: Permanent quota exhaustion halts immediately without blind retries."""
    print("\n[Test 11] Permanent quota exhaustion halts immediately...")
    attempts_called = 0

    e_perm_quota = errors.ClientError(
        code=429,
        response_json={
            "error": {
                "message": "Quota exceeded for project. Monthly billing threshold reached.",
                "status": "RESOURCE_EXHAUSTED",
            }
        },
    )

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if False:
            yield None
        raise e_perm_quota

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Check sound curfew",
        )

    assert attempts_called == 1, f"Permanent quota must not retry! Ran {attempts_called} times."
    assert res.execution_mode == "offline_fallback_after_live_error"
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "non_retryable_error" in event_types
    assert "retry_started" not in event_types
    fallback_ev = next(e for e in res.agent_execution_events if e.event_type == "offline_fallback_activated")
    assert fallback_ev.attempt == 1
    print("✓ Test 11 Passed: Permanent quota exhaustion halted immediately on attempt 1.")


async def test_successful_live_execution():
    """Test: First-attempt live success returns live_gemini cleanly."""
    print("\n[Test 12] First-attempt live success...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        yield MockAdkEvent(author="stage_orchestrator", text="Live analysis completed with high confidence.")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages",
        )

    assert attempts_called == 1
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"
    assert "Live analysis completed" in res.final_response
    print("✓ Test 12 Passed: First attempt success returned live_gemini.")


async def test_deadline_exhausted_before_retry():
    """Test 13: Deadline exhausted before retry stops further attempts and activates safe fallback."""
    print("\n[Test 13] Deadline exhausted before retry stops further attempts...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if False:
            yield None
        raise Exception("503 Service Unavailable: High load spike")

    # Set budget to 15.0s (< 20s minimum required for another attempt).
    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 15.0):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert attempts_called == 1, f"Expected retry to be aborted by deadline budget! Got {attempts_called} attempts."
    assert res.execution_mode == "offline_fallback_after_live_error"
    assert res.execution_status == "completed"

    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    assert "retry_started" not in event_types
    assert "offline_fallback_activated" in event_types
    assert "Execution Deadline Exhausted" in res.model_used
    fallback_ev = next(e for e in res.agent_execution_events if e.event_type == "offline_fallback_activated")
    assert fallback_ev.attempt == 1
    print("✓ Test 13 Passed: Deadline exhaustion prevented blind retry and activated safe deterministic fallback.")


async def test_deadline_exhausted_after_multihop_attempt():
    """Test 14: Deadline exhausted after a multi-hop attempt safely triggers fallback."""
    print("\n[Test 14] Deadline exhausted after a multi-hop attempt...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # Multi-hop: specialist handoff yielded before model failure
        yield MockAdkEvent(
            author="stage_match",
            text="StageMatch specialist engaged for venue discovery...",
        )
        raise Exception("503 Service Unavailable: Transport dropped during specialist inference")

    # Simulate realistic multi-hop elapsed time: Attempt 1 took 58s of standard 75s budget (17s remaining < 20s)
    simulated_clock = 1000.0
    real_time = time.time
    real_mono = time.monotonic
    def mock_time():
        nonlocal simulated_clock
        simulated_clock += 15.0  # Advances 15s per check
        return simulated_clock

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(time, "time", mock_time), \
         patch.object(time, "monotonic", mock_time), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 75.0):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find acoustic stage in Kolkata",
        )

    assert attempts_called == 1, f"Multi-hop attempt should abort further retries when budget runs low! Got {attempts_called} attempts."
    assert res.execution_mode == "offline_fallback_after_live_error"
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    assert "offline_fallback_activated" in event_types
    assert "Stage Recommendation" in res.final_response
    print("✓ Test 14 Passed: Multi-hop pre-tool failure exited cleanly upon deadline exhaustion with safe fallback.")


async def test_deadline_exhausted_no_fallback_after_tool_execution():
    """Test 15: If tools have already executed, deadline exhaustion never triggers fallback."""
    print("\n[Test 15] No fallback after tool execution even if deadline is exhausted...")
    attempts_called = 0
    deterministic_tools_called = 0

    original_search = stage_match_tools.search_stages
    def spy_search(*args, **kwargs):
        nonlocal deterministic_tools_called
        deterministic_tools_called += 1
        return original_search(*args, **kwargs)

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # Tool call executed
        call_obj = MagicMock()
        call_obj.name = "search_stages"
        call_obj.args = {"city": "Kolkata"}
        yield MockAdkEvent(author="stage_match", function_call=call_obj)
        resp_obj = MagicMock()
        resp_obj.name = "search_stages"
        resp_obj.response = {"venues": ["Rabindra Sadan"]}
        yield MockAdkEvent(author="stage_match", function_response=resp_obj)
        raise Exception("503 Service Unavailable: Deadline reached after tool")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(stage_match_tools, "search_stages", spy_search), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 20.0):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert attempts_called == 1
    assert deterministic_tools_called == 0, "Deterministic fallback must NOT replay after tool execution!"
    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "offline_fallback_activated" not in event_types
    assert "partial_execution_failure" in event_types
    print("✓ Test 15 Passed: Tool execution strictly prevented fallback and deterministic replay.")


async def test_deadline_exhausted_session_cleanup():
    """Test 16: Session cleanup and canonical session isolation after deadline exhaustion."""
    print("\n[Test 16] Session cleanup after deadline exhaustion...")
    session_id = "test-deadline-cleanup-session"
    observed_attempt_session_ids = []

    # Pre-create canonical session
    canonical_session = await agent_service.get_or_create_session(
        user_id="usr-aarav", session_id=session_id
    )

    async def mock_run_async(*args, **kwargs):
        current_sess_id = kwargs.get("session_id", "")
        observed_attempt_session_ids.append(current_sess_id)
        if False:
            yield None
        raise Exception("503 Service Unavailable: Timeout before retry")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 15.0):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Check stage availability",
            session_id=session_id,
        )

    # Verify attempt session was deleted in finally
    for att_id in observed_attempt_session_ids:
        deleted = await agent_service.session_service.get_session(
            app_name="stage_platform", user_id="usr-aarav", session_id=att_id
        )
        assert deleted is None, f"Attempt session {att_id} was not cleaned up!"

    # Verify canonical session has not been corrupted with aborted events
    canonical_after = await agent_service.session_service.get_session(
        app_name="stage_platform", user_id="usr-aarav", session_id=session_id
    )
    user_turns = [e for e in canonical_after.events if getattr(e, "author", "") == "user"]
    assert len(user_turns) <= 1, f"Canonical session polluted with {len(user_turns)} user turns!"
    print("✓ Test 16 Passed: Isolated attempt sessions cleanly deleted and canonical session preserved.")


async def test_inflight_timeout_hang_interrupted():
    """Test 17: Active ADK execution hanging past deadline is interrupted mid-flight."""
    print("\n[Test 17] Active ADK execution hanging past deadline is interrupted...")
    attempts_called = 0
    t_start = time.monotonic()

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # Hang longer than budget (0.1s budget vs 1.5s hang)
        await asyncio.sleep(1.5)
        yield MockAdkEvent(text="This should never be produced")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.1):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find acoustic stage in Kolkata",
        )

    t_elapsed = time.monotonic() - t_start
    assert t_elapsed < 1.0, f"Execution hung for {t_elapsed}s; active deadline did not interrupt!"
    assert attempts_called == 1, f"Expected exactly 1 attempt; got {attempts_called}"
    assert res.execution_mode == "offline_fallback_after_live_error"
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    print(f"✓ Test 17 Passed: Hanging ADK attempt interrupted in {round(t_elapsed, 3)}s (< 1.0s).")


async def test_inflight_generator_aclose_executed():
    """Test 18: Generator's finally/aclose block executes upon in-flight cancellation."""
    print("\n[Test 18] Generator's finally/aclose executes upon cancellation...")
    generator_closed = False

    async def mock_run_async(*args, **kwargs):
        nonlocal generator_closed
        try:
            await asyncio.sleep(1.0)
            yield MockAdkEvent(text="never reached")
        finally:
            generator_closed = True

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.1):
        await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert generator_closed is True, "Async generator's finally block did not execute on timeout!"
    print("✓ Test 18 Passed: Generator aclose() cleanly executed upon mid-flight interruption.")


async def test_inflight_timeout_session_cleanup():
    """Test 19: Isolated attempt session is deleted after active-attempt timeout."""
    print("\n[Test 19] Isolated attempt session deleted after active-attempt timeout...")
    attempt_session_id = None

    async def mock_run_async(*args, **kwargs):
        nonlocal attempt_session_id
        attempt_session_id = kwargs.get("session_id")
        await asyncio.sleep(1.0)
        yield MockAdkEvent(text="never reached")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.1):
        await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert attempt_session_id is not None
    # Check that session was deleted
    sess = await agent_service.session_service.get_session(
        app_name="stage_platform", user_id="usr-aarav", session_id=attempt_session_id
    )
    assert sess is None, f"Attempt session {attempt_session_id} was not deleted after active timeout!"
    print(f"✓ Test 19 Passed: Attempt session {attempt_session_id} cleanly deleted.")


async def test_inflight_timeout_zero_tools_deterministic_fallback():
    """Test 20: Active timeout with zero tools executed falls back to deterministic execution."""
    print("\n[Test 20] Active timeout with zero tools executed engages deterministic fallback...")
    async def mock_run_async(*args, **kwargs):
        # 0 tools executed
        await asyncio.sleep(1.0)
        yield MockAdkEvent(text="never reached")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.1):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find acoustic stage in Kolkata",
        )

    assert res.execution_mode == "offline_fallback_after_live_error"
    assert res.execution_status == "completed"
    assert "Stage Recommendation" in res.final_response
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    assert "offline_fallback_activated" in event_types
    print("✓ Test 20 Passed: Active timeout with zero tools engaged deterministic fallback.")


async def test_inflight_timeout_after_readonly_tool():
    """Test 21: Active timeout after read-only tool execution returns partial failure, no fallback, no retry."""
    print("\n[Test 21] Active timeout after read-only tool execution returns partial failure...")
    attempts = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        # Yield read-only tool call and response
        call_obj = MagicMock()
        call_obj.name = "search_stages"
        call_obj.args = {"city": "Kolkata"}
        yield MockAdkEvent(author="stage_match", function_call=call_obj)
        resp_obj = MagicMock()
        resp_obj.name = "search_stages"
        resp_obj.response = {"venues": ["Nazrul Mancha"]}
        yield MockAdkEvent(author="stage_match", function_response=resp_obj)
        # Now hang past deadline
        await asyncio.sleep(1.0)
        yield MockAdkEvent(author="stage_match", text="Synthesis after hang")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.15):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find acoustic stage in Kolkata",
        )

    assert attempts == 1, f"Expected no retries after tool execution! Got {attempts}"
    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    assert "retry_aborted_partial_execution" in event_types
    assert "offline_fallback_activated" not in event_types
    print("✓ Test 21 Passed: Active timeout after read-only tool returned partial failure and suppressed fallback.")


async def test_inflight_timeout_after_mutating_tool():
    """Test 22: Active timeout after mutating tool execution returns partial failure with mutating flag, no fallback, no retry."""
    print("\n[Test 22] Active timeout after mutating tool execution returns mutating partial failure...")
    attempts = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        # Yield mutating tool call and response
        call_obj = MagicMock()
        call_obj.name = "create_booking"
        call_obj.args = {"stage_id": "stg-001"}
        yield MockAdkEvent(author="stage_match", function_call=call_obj)
        resp_obj = MagicMock()
        resp_obj.name = "create_booking"
        resp_obj.response = {"booking_id": "bk-999"}
        yield MockAdkEvent(author="stage_match", function_response=resp_obj)
        # Now hang past deadline
        await asyncio.sleep(1.0)
        yield MockAdkEvent(author="stage_match", text="Synthesis after hang")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.15):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Book acoustic stage in Kolkata",
        )

    assert attempts == 1, f"Expected no retries after mutating tool execution! Got {attempts}"
    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"
    assert "Yes (create_booking)" in res.final_response
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    assert "retry_aborted_mutating_tool" in event_types
    assert "offline_fallback_activated" not in event_types
    print("✓ Test 22 Passed: Active timeout after mutating tool returned mutating partial failure and suppressed fallback.")


async def test_inflight_timeout_canonical_session_isolation():
    """Test 23: Canonical session history does not contain partial events from a timed-out attempt."""
    print("\n[Test 23] Canonical session history does not contain partial events from timed-out attempt...")
    session_id = "test-canonical-isolation-inflight"

    canonical_sess = await agent_service.get_or_create_session(
        user_id="usr-aarav", session_id=session_id
    )

    async def mock_run_async(*args, **kwargs):
        # Yield partial draft response before hanging
        yield MockAdkEvent(author="stage_orchestrator", text="DRAFT RESponse THAT MUST NOT BE COMMITTED")
        await asyncio.sleep(1.0)
        yield MockAdkEvent(author="stage_orchestrator", text="never reached")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.1):
        await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
            session_id=session_id,
        )

    # Inspect canonical session
    canonical_after = await agent_service.session_service.get_session(
        app_name="stage_platform", user_id="usr-aarav", session_id=session_id
    )
    for ev in canonical_after.events:
        content_str = str(getattr(ev, "content", ""))
        assert "DRAFT RESponse THAT MUST NOT BE COMMITTED" not in content_str, "Uncommitted draft event leaked into canonical session!"
    print("✓ Test 23 Passed: Timed-out attempt events were strictly isolated from canonical session.")


async def test_inflight_timeout_telemetry_fields():
    """Test 24: Telemetry contains deadline_exhausted event with correct attempt number and tool execution state."""
    print("\n[Test 24] Telemetry contains deadline_exhausted event with accurate fields...")
    async def mock_run_async(*args, **kwargs):
        await asyncio.sleep(1.0)
        yield MockAdkEvent(text="never reached")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.1):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    deadline_events = [e for e in res.agent_execution_events if e.event_type == "deadline_exhausted"]
    assert len(deadline_events) >= 1
    de = deadline_events[0]
    assert de.attempt == 1
    assert de.has_mutating_tools is False
    assert de.duration_ms is not None and de.duration_ms > 0
    assert "Live execution deadline exhausted during active attempt 1" in de.message
    print(f"✓ Test 24 Passed: Telemetry recorded attempt={de.attempt}, duration={de.duration_ms}ms, has_mutating={de.has_mutating_tools}.")


async def test_external_cancellation_propagates_no_fallback():
    """Test 25: External cancellation (asyncio.CancelledError) is re-raised and does NOT trigger fallback."""
    print("\n[Test 25] External cancellation propagates immediately without fallback...")
    async def mock_run_async(*args, **kwargs):
        await asyncio.sleep(1.0)
        yield MockAdkEvent(text="never reached")

    task = None
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        task = asyncio.create_task(
            agent_service.execute_command(
                user_id="usr-aarav",
                message="Find stages in Kolkata",
            )
        )
        await asyncio.sleep(0.05)
        task.cancel()

        raised_cancelled = False
        try:
            await task
        except asyncio.CancelledError:
            raised_cancelled = True

    assert raised_cancelled is True, "External cancellation was swallowed!"
    print("✓ Test 25 Passed: asyncio.CancelledError propagated immediately and was not swallowed.")


async def test_backoff_clamped_to_remaining_budget():
    """Test 26: Backoff sleep is clamped to remaining budget and never sleeps past deadline."""
    print("\n[Test 26] Backoff sleep is clamped to remaining budget...")
    attempts = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if False:
            yield None
        raise Exception("503 Service Unavailable: transient capacity spike")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 20.5):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    assert attempts == 1
    print("✓ Test 26 Passed: Insufficient budget for backoff + retry cleanly exited without sleeping past deadline.")


async def test_transfer_to_agent_does_not_set_has_executed_tools():
    """Test 27: transfer_to_agent is control-plane routing, does NOT set has_executed_tools, retries on 504."""
    print("\n[Test 27] transfer_to_agent does NOT set has_executed_tools and retries on 504...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            call_obj = MagicMock()
            call_obj.name = "transfer_to_agent"
            call_obj.args = {"agent_name": "stage_match"}
            yield MockAdkEvent(author="stage_orchestrator", function_call=call_obj)

            resp_obj = MagicMock()
            resp_obj.name = "transfer_to_agent"
            resp_obj.response = {"status": "transferred"}
            yield MockAdkEvent(author="stage_orchestrator", function_response=resp_obj)

            raise errors.ServerError(
                code=504,
                response_json={"error": {"code": 504, "message": "Deadline expired before operation could complete.", "status": "DEADLINE_EXCEEDED"}},
            )
        call_obj = MagicMock()
        call_obj.name = "transfer_to_agent"
        call_obj.args = {"agent_name": "stage_match"}
        yield MockAdkEvent(author="stage_orchestrator", function_call=call_obj)
        yield MockAdkEvent(author="stage_match", text="Venue matched successfully on retry!")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find acoustic stage in Kolkata",
        )

    assert attempts_called == 2, f"Expected 2 attempts, got {attempts_called}"
    assert res.execution_mode == "live_gemini"
    assert "stage_match" in res.selected_specialist_agents
    handoff_events = [e for e in res.agent_execution_events if e.event_type == "specialist_handoff"]
    assert len(handoff_events) >= 1
    assert "stage_match" in handoff_events[0].message
    tool_events = [e for e in res.agent_execution_events if e.event_type == "tool_call"]
    assert len(tool_events) == 0, f"transfer_to_agent should not produce tool_call event, got {tool_events}"
    print("✓ Test 27 Passed: transfer_to_agent did not lock out retries; recovered cleanly on attempt 2.")


async def test_transfer_to_agent_all_fail_activates_fallback():
    """Test 28: When all attempts fail after transfer_to_agent, safe deterministic fallback activates."""
    print("\n[Test 28] transfer_to_agent on all attempts allows safe deterministic fallback...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        call_obj = MagicMock()
        call_obj.name = "transfer_to_agent"
        call_obj.args = {"agent_name": "stage_match"}
        yield MockAdkEvent(author="stage_orchestrator", function_call=call_obj)

        resp_obj = MagicMock()
        resp_obj.name = "transfer_to_agent"
        resp_obj.response = {"status": "transferred"}
        yield MockAdkEvent(author="stage_orchestrator", function_response=resp_obj)

        raise errors.ServerError(
            code=504,
            response_json={"error": {"code": 504, "message": "Deadline expired before operation could complete.", "status": "DEADLINE_EXCEEDED"}},
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find acoustic stage in Kolkata",
        )

    assert attempts_called == MAX_LIVE_ATTEMPTS
    assert res.execution_mode == "offline_fallback_after_live_error"
    assert res.execution_status == "completed"
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "offline_fallback_activated" in event_types
    assert "specialist_handoff" in event_types
    print("✓ Test 28 Passed: Zero domain tools executed across all attempts; safe deterministic fallback activated.")


async def test_transfer_to_agent_followed_by_real_tool_locks_replay():
    """Test 29: Specialist executes a real read-only domain tool, then fails -> retries & fallback locked."""
    print("\n[Test 29] Real domain tool after handoff locks replay and fallback...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # Handoff
        call_obj = MagicMock()
        call_obj.name = "transfer_to_agent"
        call_obj.args = {"agent_name": "stage_match"}
        yield MockAdkEvent(author="stage_orchestrator", function_call=call_obj)

        # Real domain tool
        tool_call = MagicMock()
        tool_call.name = "search_stages"
        tool_call.args = {"city": "Kolkata"}
        yield MockAdkEvent(author="stage_match", function_call=tool_call)

        tool_resp = MagicMock()
        tool_resp.name = "search_stages"
        tool_resp.response = {"venues": ["Rabindra Sadan"]}
        yield MockAdkEvent(author="stage_match", function_response=tool_resp)

        # Failure occurs AFTER real tool execution
        raise errors.ServerError(
            code=504,
            response_json={"error": {"code": 504, "message": "Deadline expired.", "status": "DEADLINE_EXCEEDED"}},
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert attempts_called == 1, "Retries should be aborted after domain tool execution!"
    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"
    assert "stage_match" in res.selected_specialist_agents
    assert "offline_fallback_activated" not in [e.event_type for e in res.agent_execution_events]
    aborted_ev = next(e for e in res.agent_execution_events if e.event_type == "retry_aborted_partial_execution")
    assert "search_stages" in aborted_ev.message
    assert "transfer_to_agent" not in aborted_ev.message
    print("✓ Test 29 Passed: Domain tool after handoff correctly locked retries and fallback.")


async def test_transfer_to_agent_followed_by_mutating_tool_locks_replay():
    """Test 30: Specialist executes a mutating domain tool, then fails -> retries & fallback locked, mutating flagged."""
    print("\n[Test 30] Mutating domain tool after handoff locks replay and fallback...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # Handoff
        call_obj = MagicMock()
        call_obj.name = "transfer_to_agent"
        call_obj.args = {"agent_name": "civic_assist"}
        yield MockAdkEvent(author="stage_orchestrator", function_call=call_obj)

        # Mutating domain tool
        tool_call = MagicMock()
        tool_call.name = "submit_permit_application"
        tool_call.args = {"venue_id": "v-1", "event_type": "concert"}
        yield MockAdkEvent(author="civic_assist", function_call=tool_call)

        tool_resp = MagicMock()
        tool_resp.name = "submit_permit_application"
        tool_resp.response = {"permit_id": "p-123", "status": "pending"}
        yield MockAdkEvent(author="civic_assist", function_response=tool_resp)

        # Failure occurs AFTER mutating tool
        raise errors.ServerError(
            code=504,
            response_json={"error": {"code": 504, "message": "Deadline expired.", "status": "DEADLINE_EXCEEDED"}},
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Apply for permit",
        )

    assert attempts_called == 1
    assert res.execution_mode == "live_gemini_partial_failure"
    assert "civic_assist" in res.selected_specialist_agents
    assert "offline_fallback_activated" not in [e.event_type for e in res.agent_execution_events]
    aborted_ev = next(e for e in res.agent_execution_events if e.event_type == "retry_aborted_mutating_tool")
    assert aborted_ev.has_mutating_tools is True
    assert "submit_permit_application" in aborted_ev.message
    assert "transfer_to_agent" not in aborted_ev.message
    print("✓ Test 30 Passed: Mutating tool after handoff locked retries and fallback with mutating flag True.")


async def test_transfer_to_agent_content_part_fallback_routing():
    """Test 31: Content part function_call without get_function_calls helper handles transfer_to_agent."""
    print("\n[Test 31] Content part fallback function_call handles transfer_to_agent...")
    attempts_called = 0

    class PartEvent:
        def __init__(self, author, function_call=None, function_response=None, text=None):
            self.author = author
            self.content = MagicMock()
            p = MagicMock()
            p.function_call = function_call
            p.function_response = function_response
            p.text = text
            self.content.parts = [p]
            self.id = "ev-part-fallback"

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            call_obj = MagicMock()
            call_obj.name = "transfer_to_agent"
            call_obj.args = {"agent_name": "impact_flow"}
            yield PartEvent(author="stage_orchestrator", function_call=call_obj)

            resp_obj = MagicMock()
            resp_obj.name = "transfer_to_agent"
            resp_obj.response = {"status": "ok"}
            yield PartEvent(author="stage_orchestrator", function_response=resp_obj)

            raise Exception("503 Service Unavailable")

        yield PartEvent(author="impact_flow", text="Impact analysis complete.")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Show impact",
        )

    assert attempts_called == 2
    assert res.execution_mode == "live_gemini"
    assert "impact_flow" in res.selected_specialist_agents
    tool_events = [e for e in res.agent_execution_events if e.event_type == "tool_call"]
    assert len(tool_events) == 0
    print("✓ Test 31 Passed: Content part fallback function_call correctly routed transfer_to_agent.")


async def test_transfer_to_agent_inflight_timeout_allows_fallback():
    """Test 32: In-flight timeout after transfer_to_agent (0 domain tools) allows safe fallback."""
    print("\n[Test 32] In-flight timeout after transfer_to_agent allows safe fallback...")

    async def mock_run_async(*args, **kwargs):
        call_obj = MagicMock()
        call_obj.name = "transfer_to_agent"
        call_obj.args = {"agent_name": "stage_match"}
        yield MockAdkEvent(author="stage_orchestrator", function_call=call_obj)

        # Hang until in-flight timeout interrupts it
        await asyncio.sleep(100.0)

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.3):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert res.execution_mode == "offline_fallback_after_live_error"
    assert res.execution_status == "completed"
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    assert "offline_fallback_activated" in event_types
    print("✓ Test 32 Passed: In-flight deadline after handoff engaged safe deterministic fallback.")


async def test_transfer_to_agent_inflight_timeout_after_domain_tool_halts():
    """Test 33: In-flight timeout after domain tool execution halts without fallback."""
    print("\n[Test 33] In-flight timeout after handoff + domain tool halts without fallback...")

    async def mock_run_async(*args, **kwargs):
        call_obj = MagicMock()
        call_obj.name = "transfer_to_agent"
        call_obj.args = {"agent_name": "stage_match"}
        yield MockAdkEvent(author="stage_orchestrator", function_call=call_obj)

        tool_call = MagicMock()
        tool_call.name = "search_stages"
        tool_call.args = {"city": "Kolkata"}
        yield MockAdkEvent(author="stage_match", function_call=tool_call)

        tool_resp = MagicMock()
        tool_resp.name = "search_stages"
        tool_resp.response = {"venues": ["Rabindra Sadan"]}
        yield MockAdkEvent(author="stage_match", function_response=tool_resp)

        # Hang until in-flight timeout interrupts it
        await asyncio.sleep(100.0)

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.3):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"
    assert "offline_fallback_activated" not in [e.event_type for e in res.agent_execution_events]
    assert "stage_match" in res.selected_specialist_agents
    aborted_ev = next(e for e in res.agent_execution_events if e.event_type == "retry_aborted_partial_execution")
    assert "search_stages" in aborted_ev.message
    assert "transfer_to_agent" not in aborted_ev.message
    print("✓ Test 33 Passed: In-flight deadline after domain tool halted with live_gemini_partial_failure.")


async def test_offline_fallback_telemetry_attempt_number():
    """Test 34: offline_fallback_activated reports actual last attempted number (1 on early exit, MAX_LIVE_ATTEMPTS on exhaustion)."""
    print("\n[Test 34] offline_fallback_activated reports actual last attempted number...")

    # Case 1: Early exit after attempt 1 (non-retryable client error) reports attempt=1
    attempts_called_1 = 0
    e_client_error = errors.ClientError(
        code=400,
        response_json={
            "error": {
                "code": 400,
                "message": "Invalid argument: Bad request",
                "status": "INVALID_ARGUMENT",
            }
        },
    )

    async def mock_run_early(*args, **kwargs):
        nonlocal attempts_called_1
        attempts_called_1 += 1
        if False:
            yield None
        raise e_client_error

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_early):
        res_early = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert attempts_called_1 == 1, f"Expected 1 attempt on non-retryable error, got {attempts_called_1}"
    assert res_early.execution_mode == "offline_fallback_after_live_error"
    fallback_ev_1 = next(e for e in res_early.agent_execution_events if e.event_type == "offline_fallback_activated")
    assert fallback_ev_1.attempt == 1, f"Expected attempt=1 on early exit, got {fallback_ev_1.attempt}"

    # Case 2: Exhaustion after all attempts reports final attempt number (MAX_LIVE_ATTEMPTS)
    attempts_called_all = 0
    e_server_error = errors.ServerError(
        code=503,
        response_json={
            "error": {
                "code": 503,
                "message": "Service unavailable due to high load",
                "status": "UNAVAILABLE",
            }
        },
    )

    async def mock_run_all(*args, **kwargs):
        nonlocal attempts_called_all
        attempts_called_all += 1
        if False:
            yield None
        raise e_server_error

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_all):
        res_all = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert attempts_called_all == MAX_LIVE_ATTEMPTS, f"Expected {MAX_LIVE_ATTEMPTS} attempts, got {attempts_called_all}"
    assert res_all.execution_mode == "offline_fallback_after_live_error"
    fallback_ev_all = next(e for e in res_all.agent_execution_events if e.event_type == "offline_fallback_activated")
    assert fallback_ev_all.attempt == MAX_LIVE_ATTEMPTS, f"Expected attempt={MAX_LIVE_ATTEMPTS} on exhaustion, got {fallback_ev_all.attempt}"

    print(f"✓ Test 34 Passed: Fallback after attempt 1 reported attempt=1; fallback after all retries reported attempt={MAX_LIVE_ATTEMPTS}.")


async def test_deadline_exhausted_before_first_attempt_zero_attempts():
    """Test 35: Deadline exhausted before attempt 1 executes zero live attempts, safe fallback, and attempt is None."""
    print("\n[Test 35] Deadline exhausted before first attempt (zero live attempts)...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if False:
            yield None
        raise Exception("never called")

    from app.services import agent_service as as_module
    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(as_module, "OVERALL_EXECUTION_BUDGET_SECONDS", 0.0):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages in Kolkata",
        )

    assert attempts_called == 0, f"Expected 0 Gemini attempts executed, got {attempts_called}"
    assert res.execution_mode == "offline_fallback_after_live_error"
    assert res.execution_status == "completed"
    assert "Stage Recommendation" in res.final_response

    event_types = [e.event_type for e in res.agent_execution_events]
    assert "deadline_exhausted" in event_types
    assert "offline_fallback_activated" in event_types

    fallback_ev = next(e for e in res.agent_execution_events if e.event_type == "offline_fallback_activated")
    assert fallback_ev.attempt is None, f"Expected attempt is None when 0 attempts executed, got {fallback_ev.attempt}"

    print("✓ Test 35 Passed: Zero Gemini attempts executed; deterministic fallback succeeded with attempt=None.")


async def main():
    print("======================================================================")
    print("STAGE — Milestone 6.2: Bounded Gemini Request & Resilient Telemetry")
    print("======================================================================")
    test_error_classification_and_telemetry_extraction()
    await test_scenario_1_503_retry_success()
    await test_scenario_2_all_retries_fail_503()
    await test_scenario_3_provider_request_timeout()
    await test_scenario_4_session_cleanup_and_canonical_isolation()
    await test_scenario_5_read_only_tool_no_replay()
    await test_scenario_6_mutating_tool_no_retry_no_fallback()
    await test_scenario_7_telemetry_preservation_and_secret_sanitization()
    await test_scenario_8_deterministic_fallback_activation()
    await test_specialist_handoff_retries_safely()
    await test_temporary_429_retries()
    await test_permanent_quota_does_not_retry()
    await test_successful_live_execution()
    await test_deadline_exhausted_before_retry()
    await test_deadline_exhausted_after_multihop_attempt()
    await test_deadline_exhausted_no_fallback_after_tool_execution()
    await test_deadline_exhausted_session_cleanup()
    await test_inflight_timeout_hang_interrupted()
    await test_inflight_generator_aclose_executed()
    await test_inflight_timeout_session_cleanup()
    await test_inflight_timeout_zero_tools_deterministic_fallback()
    await test_inflight_timeout_after_readonly_tool()
    await test_inflight_timeout_after_mutating_tool()
    await test_inflight_timeout_canonical_session_isolation()
    await test_inflight_timeout_telemetry_fields()
    await test_external_cancellation_propagates_no_fallback()
    await test_backoff_clamped_to_remaining_budget()
    await test_transfer_to_agent_does_not_set_has_executed_tools()
    await test_transfer_to_agent_all_fail_activates_fallback()
    await test_transfer_to_agent_followed_by_real_tool_locks_replay()
    await test_transfer_to_agent_followed_by_mutating_tool_locks_replay()
    await test_transfer_to_agent_content_part_fallback_routing()
    await test_transfer_to_agent_inflight_timeout_allows_fallback()
    await test_transfer_to_agent_inflight_timeout_after_domain_tool_halts()
    await test_offline_fallback_telemetry_attempt_number()
    await test_deadline_exhausted_before_first_attempt_zero_attempts()
    print("======================================================================")
    print("ALL 36 RESILIENT GEMINI SAFETY, TELEMETRY & IN-FLIGHT DEADLINE TESTS PASSED!")
    print("======================================================================")


if __name__ == "__main__":
    asyncio.run(main())
