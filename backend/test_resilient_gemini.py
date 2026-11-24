"""Comprehensive unit tests for Milestone 6.1.2: Correct Retry and Partial Execution Safety.

Tests:
1. Specialist handoff without tool execution does not count as a side effect (retries safely).
2. Failure before tool execution retries safely.
3. Failed attempts do not duplicate canonical user messages in session history.
4. Failure after a read-only tool does not trigger full deterministic replay.
5. Failure after a mutating tool never triggers retry or fallback.
6. Partial live tool events remain visible in the returned telemetry.
7. Temporary 429 can retry when explicitly identified as transient.
8. Permanent quota exhaustion does not retry.
9. Successful live execution still returns live_gemini.
10. Safe retry exhaustion still triggers deterministic fallback.
"""
import os
import sys
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from google.genai import types, errors
from app.config import settings
from app.services.agent_service import (
    agent_service,
    classify_execution_error,
    is_mutating_tool,
    is_temporary_rate_limit,
    MAX_LIVE_ATTEMPTS,
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

    def get_function_calls(self):
        return self._func_calls

    def get_function_responses(self):
        return self._func_responses


def test_error_classification():
    """Verify error classification, sanitization, and 429 distinctions."""
    print("\n[Test 0] Error classification & 429 distinction...")
    # 503
    r1, cat1 = classify_execution_error(Exception("503 Service Unavailable: Overloaded"))
    assert r1 is True
    assert "503" in cat1

    # Timeout
    r2, cat2 = classify_execution_error(Exception("httpx.ConnectTimeout: Connection timed out"))
    assert r2 is True
    assert "Timeout" in cat2

    # 404
    r3, cat3 = classify_execution_error(Exception("404 Not Found: models/gemini-foo is not found"))
    assert r3 is False
    assert "404" in cat3

    # 401
    r4, cat4 = classify_execution_error(Exception("401 Unauthorized: API_KEY_INVALID: secret_123456"))
    assert r4 is False
    assert "secret_123456" not in cat4
    assert "401" in cat4

    # 429 Temporary (Retry-After)
    e_temp = errors.ClientError(
        code=429,
        response_json={
            "error": {
                "message": "Resource temporarily exhausted, please try again in 1.5s",
                "details": [{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "1.5s"}],
            }
        },
    )
    r5, cat5 = classify_execution_error(e_temp)
    assert r5 is True
    assert "Temporary Rate Limit" in cat5

    # 429 Permanent Quota
    e_perm = errors.ClientError(
        code=429,
        response_json={
            "error": {
                "message": "Daily quota exceeded for project. Check your billing plan.",
                "status": "RESOURCE_EXHAUSTED",
            }
        },
    )
    r6, cat6 = classify_execution_error(e_perm)
    assert r6 is False
    assert "Permanent Quota Exhaustion" in cat6

    print("✓ Test 0 Passed: Classification accurately separates transient throttling from permanent quota and server errors.")


async def test_case_1_specialist_handoff_retries_safely():
    """Test 1: Specialist handoff without tool execution does NOT count as a side effect."""
    print("\n[Test 1] Specialist handoff without tool execution retries safely...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            # Emits specialist handoff, but NO tool executes
            yield MockAdkEvent(
                author="stage_match",
                text="StageMatch specialist engaged. Evaluating parameters...",
            )
            # Transient 503 before any tool call
            raise Exception("503 Service Unavailable: Connection dropped before tool call")
        yield MockAdkEvent(
            author="stage_match",
            text="StageMatch completed analysis successfully on retry attempt 2.",
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find an acoustic hall",
        )

    assert attempts_called == 2, f"Expected 2 attempts (retry should proceed), got {attempts_called}"
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"
    assert "completed analysis successfully" in res.final_response

    event_types = [e.event_type for e in res.agent_execution_events]
    assert "retry_started" in event_types
    assert "retry_failed" in event_types
    assert "retry_aborted_partial_execution" not in event_types
    print("✓ Test 1 Passed: Specialist handoff without tool call did not abort live retries.")


async def test_case_2_failure_before_tool_retries():
    """Test 2: Failure before tool execution retries safely."""
    print("\n[Test 2] Failure before tool execution retries safely...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            raise Exception("503 Service Unavailable: Server overloaded on intake")
        yield MockAdkEvent(
            author="stage_orchestrator",
            text="Intake succeeded on attempt 2.",
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Hello STAGE",
        )

    assert attempts_called == 2
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"
    print("✓ Test 2 Passed: Pre-tool transient failure retried cleanly.")


async def test_case_3_no_duplicate_canonical_messages():
    """Test 3: Failed attempts do NOT duplicate canonical user messages in session history."""
    print("\n[Test 3] Session history isolation across retries...")
    attempts_called = 0
    session_id = "test-dedup-session"

    # Pre-create canonical session
    canonical_session = await agent_service.get_or_create_session(
        user_id="usr-aarav", session_id=session_id
    )

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # Each attempt will have its own isolated session_id
        current_sess_id = kwargs.get("session_id", "")
        assert current_sess_id != session_id, f"run_async must run on isolated session, not canonical session! Got: {current_sess_id}"
        if attempts_called < 3:
            raise Exception("503 Service Unavailable: Attempt failed")
        yield MockAdkEvent(
            author="stage_orchestrator",
            text="Attempt 3 recovered.",
        )

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Check permissions for amphitheatre",
            session_id=session_id,
        )

    assert attempts_called == 3
    assert res.session_id == session_id

    # Inspect canonical session in session_service
    stored_canonical = await agent_service.session_service.get_session(
        app_name="stage_platform", user_id="usr-aarav", session_id=session_id
    )
    user_events = [e for e in stored_canonical.events if getattr(e, "author", "") == "user"]
    assert len(user_events) <= 1, f"Expected at most 1 user message in canonical session, found {len(user_events)}!"
    print(f"✓ Test 3 Passed: Canonical session retained exactly {len(user_events)} user turn despite 3 retry attempts.")


async def test_case_4_read_only_tool_failure_no_deterministic_replay():
    """Test 4: Failure after a read-only tool does NOT trigger full deterministic replay."""
    print("\n[Test 4] Partial failure after read-only tool halts without replay...")
    attempts_called = 0
    deterministic_tools_called = 0

    # Spy on search_stages to track whether fallback re-invokes it
    original_search = stage_match_tools.search_stages
    def spy_search(*args, **kwargs):
        nonlocal deterministic_tools_called
        deterministic_tools_called += 1
        return original_search(*args, **kwargs)

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # 1. Specialist yields a function call for search_stages
        call_obj = MagicMock()
        call_obj.name = "search_stages"
        call_obj.args = {"city": "Chennai"}
        yield MockAdkEvent(author="stage_match", function_call=call_obj)

        # 2. Function response yielded
        resp_obj = MagicMock()
        resp_obj.name = "search_stages"
        resp_obj.response = {"venues": ["The Marina Coastal Amphitheatre"]}
        yield MockAdkEvent(author="stage_match", function_response=resp_obj)

        # 3. Connection drop mid-stream
        raise Exception("503 Service Unavailable: Transport failure during model synthesis")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async), \
         patch.object(stage_match_tools, "search_stages", spy_search):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find a venue in Chennai",
        )

    # Assertions
    assert attempts_called == 1, f"Expected retries to halt after tool execution, but ran {attempts_called} times!"
    assert deterministic_tools_called == 0, f"Deterministic tools must NOT replay after partial failure! Got {deterministic_tools_called} calls."
    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"

    event_types = [e.event_type for e in res.agent_execution_events]
    assert "retry_aborted_partial_execution" in event_types
    assert "partial_execution_failure" in event_types
    assert "offline_fallback_activated" not in event_types

    # Ensure live tool call and result were preserved in response telemetry
    tool_calls = [e for e in res.agent_execution_events if e.event_type == "tool_call"]
    assert len(tool_calls) == 1
    assert tool_calls[0].tool_name == "search_stages"
    print("✓ Test 4 Passed: Partial read-only tool execution preserved telemetry and suppressed deterministic replay.")


async def test_case_5_mutating_tool_failure_no_retry_no_fallback():
    """Test 5: Failure after a mutating tool never triggers retry or fallback."""
    print("\n[Test 5] Mutating tool execution disables retry and fallback...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        # 1. Function call for mutating tool: create_booking
        call_obj = MagicMock()
        call_obj.name = "create_booking"
        call_obj.args = {"venue_id": "venue-01", "tickets": 2}
        yield MockAdkEvent(author="stage_match", function_call=call_obj)

        # 2. Connection failure
        raise Exception("503 Service Unavailable: Timeout waiting for mutation acknowledgment")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Book 2 passes for the coastal concert",
        )

    assert attempts_called == 1
    assert res.execution_mode == "live_gemini_partial_failure"
    assert res.execution_status == "partial_failure"

    event_types = [e.event_type for e in res.agent_execution_events]
    assert "retry_aborted_mutating_tool" in event_types
    assert "partial_execution_failure" in event_types
    assert "offline_fallback_activated" not in event_types
    assert "Yes (create_booking)" in res.final_response
    assert "Mutating Side Effects" in res.final_response
    print("✓ Test 5 Passed: Mutating tool execution immediately locked out retries and fallback.")


async def test_case_6_partial_telemetry_visibility():
    """Test 6: Partial live tool events remain visible in the returned telemetry."""
    print("\n[Test 6] Verification of partial telemetry retention...")
    async def mock_run_async(*args, **kwargs):
        call_obj = MagicMock()
        call_obj.name = "classify_venue"
        call_obj.args = {"venue_type": "Amphitheatre"}
        yield MockAdkEvent(author="civic_assist", function_call=call_obj)
        resp_obj = MagicMock()
        resp_obj.name = "classify_venue"
        resp_obj.response = {"category": "public_heritage_amphitheatre"}
        yield MockAdkEvent(author="civic_assist", function_response=resp_obj)
        raise Exception("504 Gateway Timeout")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Check classification of amphitheatre",
        )

    # Verify event timeline contains the actual live tool events
    tool_events = [e for e in res.agent_execution_events if e.tool_name == "classify_venue"]
    assert len(tool_events) == 2, f"Expected 2 tool events (call + result), found {len(tool_events)}"
    assert tool_events[0].event_type == "tool_call"
    assert tool_events[1].event_type == "tool_result"
    print("✓ Test 6 Passed: Full tool call and result payloads persisted in partial telemetry.")


async def test_case_7_temporary_429_retries():
    """Test 7: Temporary 429 can retry when explicitly identified as transient."""
    print("\n[Test 7] Temporary 429 rate limit retries safely...")
    attempts_called = 0

    e_temp_429 = errors.ClientError(
        code=429,
        response_json={
            "error": {
                "message": "Resource has been exhausted (rate limit: please try again in 0.1s)",
                "status": "RESOURCE_EXHAUSTED",
                "details": [{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "0.1s"}],
            }
        },
    )

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if attempts_called == 1:
            raise e_temp_429
        yield MockAdkEvent(author="stage_orchestrator", text="Live analysis succeeded after 429 backoff.")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Analyze impact allocations",
        )

    assert attempts_called == 2
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"
    print("✓ Test 7 Passed: Temporary 429 was retried and recovered.")


async def test_case_8_permanent_quota_does_not_retry():
    """Test 8: Permanent quota exhaustion does not retry."""
    print("\n[Test 8] Permanent quota exhaustion halts immediately...")
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

    assert attempts_called == 1, f"Permanent quota must halt after 1 attempt, but ran {attempts_called} times!"
    # Since no tools executed live, clean fallback was engaged
    assert res.execution_mode == "offline_fallback_after_live_error"
    event_types = [e.event_type for e in res.agent_execution_events]
    assert "non_retryable_error" in event_types
    assert "retry_started" not in event_types
    print("✓ Test 8 Passed: Permanent quota exhaustion halted immediately without blind retries.")


async def test_case_9_successful_live_execution():
    """Test 9: Successful live execution still returns live_gemini."""
    print("\n[Test 9] Successful live execution...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        yield MockAdkEvent(author="stage_orchestrator", text="All stages verified.")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find stages",
        )

    assert attempts_called == 1
    assert res.execution_mode == "live_gemini"
    assert res.execution_status == "completed"
    assert "All stages verified." in res.final_response
    print("✓ Test 9 Passed: First attempt success returned live_gemini.")


async def test_case_10_safe_retry_exhaustion_triggers_fallback():
    """Test 10: Safe retry exhaustion still triggers deterministic fallback."""
    print("\n[Test 10] Safe retry exhaustion triggers deterministic fallback...")
    attempts_called = 0

    async def mock_run_async(*args, **kwargs):
        nonlocal attempts_called
        attempts_called += 1
        if False:
            yield None
        raise Exception("503 Service Unavailable: Connection transport drop")

    with patch.object(settings, "gemini_api_key", "test-mock-key"), \
         patch.object(agent_service.runner, "run_async", mock_run_async):
        res = await agent_service.execute_command(
            user_id="usr-aarav",
            message="Find a venue in Chennai for an acoustic performance",
        )

    assert attempts_called == MAX_LIVE_ATTEMPTS
    assert res.execution_mode == "offline_fallback_after_live_error"
    assert res.execution_status == "completed"

    event_types = [e.event_type for e in res.agent_execution_events]
    assert event_types.count("retry_failed") == 3
    assert event_types.count("retry_started") == 2
    assert "offline_fallback_activated" in event_types
    assert "Stage Recommendation (via StageMatch)" in res.final_response
    print("✓ Test 10 Passed: Safe retry exhaustion cleanly activated offline deterministic fallback.")


async def main():
    print("======================================================================")
    print("STAGE — Milestone 6.1.2: Correct Retry & Partial Safety Test Suite")
    print("======================================================================")
    test_error_classification()
    await test_case_1_specialist_handoff_retries_safely()
    await test_case_2_failure_before_tool_retries()
    await test_case_3_no_duplicate_canonical_messages()
    await test_case_4_read_only_tool_failure_no_deterministic_replay()
    await test_case_5_mutating_tool_failure_no_retry_no_fallback()
    await test_case_6_partial_telemetry_visibility()
    await test_case_7_temporary_429_retries()
    await test_case_8_permanent_quota_does_not_retry()
    await test_case_9_successful_live_execution()
    await test_case_10_safe_retry_exhaustion_triggers_fallback()
    print("======================================================================")
    print("ALL 11 SAFETY & RESILIENCE TESTS PASSED SUCCESSFULLY!")
    print("======================================================================")


if __name__ == "__main__":
    asyncio.run(main())
