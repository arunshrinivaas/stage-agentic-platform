"""STAGE Platform — Milestone 6.2: Live Gemini Integration Verification.

This script sends a strictly read-only, non-mutating natural language request to
the STAGE backend API (POST /api/ai/command) to prove end-to-end live inference
using Google ADK, the configured Gemini model, and specialist agent orchestration.

Security & Safety Guidelines:
- Never prints, logs, or transmits API keys or raw error bodies.
- Operates strictly with documented read-only tools (search_stages, calculate_match_score).
- Rejects unexpected or mutating tools, and verifies tool call/result correspondence.
- Explicitly enforces force_mock=False.
- Rejects offline fallback or mock responses as verification failures.
"""
import os
import sys
import json
import re
from typing import Optional
import httpx

# Ensure backend root is on sys.path to access app configuration
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.config import settings

BASE_URL = os.getenv("STAGE_BACKEND_URL", "http://127.0.0.1:8000")
READ_ONLY_PROMPT = "Find an acoustic stage in Kolkata suitable for an Indian classical sitar duo."
TEST_USER_ID = "usr-aarav"
REQUEST_TIMEOUT_SECONDS = 90.0

ALLOWED_READ_ONLY_TOOLS = {"search_stages", "calculate_match_score"}
MUTATING_TOOL_PREFIXES = ("create_", "update_", "delete_", "submit_", "book_", "record_", "send_")


def sanitize_text(text: Optional[str], max_len: int = 300) -> str:
    """Sanitize and truncate text to prevent leaking API keys, credentials, or secrets."""
    if not text:
        return "No content"
    cleaned = str(text)
    # Redact Google API keys (AIza...)
    cleaned = re.sub(r'AIza[0-9A-Za-z-_]{35}', '[REDACTED_API_KEY]', cleaned)
    # Redact generic api_key / key parameters
    cleaned = re.sub(r'(?:api[_-]?key|key)[=:\s]+[A-Za-z0-9_-]{12,}', 'key=[REDACTED]', cleaned, flags=re.IGNORECASE)
    # Redact Authorization / Bearer tokens
    cleaned = re.sub(r'Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*', 'Bearer [REDACTED]', cleaned, flags=re.IGNORECASE)
    # Redact query parameters containing secrets/tokens
    cleaned = re.sub(r'([?&](?:key|token|secret|password)=)[^&]+', r'\1[REDACTED]', cleaned, flags=re.IGNORECASE)
    # Collapse excess whitespace
    cleaned = " ".join(cleaned.split())
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len] + "... [truncated]"
    return cleaned


HTTP_STATUS_DESCRIPTIONS = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
}


def format_sanitized_http_error(status_code: int) -> str:
    """Format a fixed, bounded status summary using only the HTTP status code.

    Never accesses, extracts, or prints response-body content.
    """
    desc = HTTP_STATUS_DESCRIPTIONS.get(status_code)
    if desc:
        return f"HTTP {status_code} - Backend returned an unsuccessful response ({desc})"
    return f"HTTP {status_code} - Backend returned an unsuccessful response"


def run_live_gemini_verification() -> bool:
    print("======================================================================")
    print("STAGE — Milestone 6.2: Live Gemini Integration Verification Probe")
    print("======================================================================")

    # 1. Configuration & Key Presence Check (Zero Credential Exposure)
    has_api_key = bool(settings.gemini_api_key and settings.gemini_api_key.strip())
    configured_model = settings.ai_model

    print(f"Target Backend URL    : {BASE_URL}")
    print(f"Target Endpoint       : POST /api/ai/command")
    print(f"Configured AI Model   : {configured_model}")
    print(f"Gemini Key Configured : {'YES (Key present in environment)' if has_api_key else 'NO (Missing GEMINI_API_KEY)'}")

    if not has_api_key:
        print("\n❌ PRE-CHECK FAILED: GEMINI_API_KEY is not configured in backend/.env or environment.")
        print("Please configure a valid Gemini API key to proceed with live verification.")
        return False

    # 2. Check Backend Health (Sanitized Error Reporting)
    print("\n[Step 1/3] Verifying backend availability...")
    try:
        health_resp = httpx.get(f"{BASE_URL}/health", timeout=5.0)
        is_healthy = False
        if health_resp.status_code == 200:
            try:
                is_healthy = (health_resp.json().get("status") == "healthy")
            except Exception:
                is_healthy = False

        if not is_healthy:
            error_summary = format_sanitized_http_error(health_resp.status_code)
            print(f"❌ Backend health probe failed: {error_summary}")
            return False
        print(f"✓ Backend server is responsive at {BASE_URL} (health: healthy).")
    except httpx.ConnectError:
        print(f"❌ Connection Error: Unable to connect to backend server at {BASE_URL}.")
        print("Ensure the FastAPI backend is running via:")
        print("  cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000")
        return False
    except Exception as e:
        print(f"❌ Health probe failed with error: {sanitize_text(str(e))}")
        return False

    # 3. Dispatch Live Read-Only AI Command
    print("\n[Step 2/3] Dispatching live agentic command to POST /api/ai/command...")
    print(f"User ID    : {TEST_USER_ID}")
    print(f"Prompt     : \"{READ_ONLY_PROMPT}\"")
    print(f"force_mock : False (enforcing live Gemini execution)")
    print("Waiting for streaming Google ADK orchestration and model synthesis...")

    payload = {
        "user_id": TEST_USER_ID,
        "message": READ_ONLY_PROMPT,
        "force_mock": False,
    }

    try:
        resp = httpx.post(
            f"{BASE_URL}/api/ai/command",
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except httpx.TimeoutException:
        print(f"❌ Request Timeout: Server did not respond within {REQUEST_TIMEOUT_SECONDS}s.")
        return False
    except Exception as e:
        print(f"❌ HTTP transport failure: {sanitize_text(str(e))}")
        return False

    http_status = resp.status_code
    print(f"\n[Step 3/3] Inspecting execution response & telemetry (HTTP {http_status})...")

    if http_status != 200:
        error_summary = format_sanitized_http_error(http_status)
        print(f"❌ Backend returned error: {error_summary}")
        return False

    try:
        data = resp.json()
    except Exception as e:
        print(f"❌ Failed to parse response JSON: {sanitize_text(str(e))}")
        return False

    # 4. Extract Execution & Telemetry Fields
    session_id = data.get("session_id", "Unknown")
    execution_status = data.get("execution_status", "unknown")
    execution_mode = data.get("execution_mode", "unknown")
    model_used = data.get("model_used", "unknown")
    selected_agents = data.get("selected_specialist_agents", [])
    events = data.get("agent_execution_events", [])
    final_response = data.get("final_response", "")

    # Analyze telemetry events
    tool_calls = [e for e in events if e.get("event_type") == "tool_call"]
    tool_results = [e for e in events if e.get("event_type") == "tool_result"]
    tools_executed = [e.get("tool_name") for e in tool_calls if e.get("tool_name")]
    tool_results_names = [e.get("tool_name") for e in tool_results if e.get("tool_name")]
    retry_events = [e for e in events if "retry" in e.get("event_type", "")]
    fallback_events = [e for e in events if "fallback" in e.get("event_type", "")]

    # Validate against mutating and unexpected tools
    unexpected_tools = [
        t for t in tools_executed
        if t not in ALLOWED_READ_ONLY_TOOLS or any(t.lower().startswith(p) for p in MUTATING_TOOL_PREFIXES)
    ]
    unexpected_result_tools = [
        t for t in tool_results_names
        if t not in ALLOWED_READ_ONLY_TOOLS or any(t.lower().startswith(p) for p in MUTATING_TOOL_PREFIXES)
    ]
    has_mutating_flag = any(bool(e.get("has_mutating_tools")) for e in events)

    # 5. Print Structured Verification Summary
    print("\n----------------------------------------------------------------------")
    print("EXECUTION TELEMETRY REPORT")
    print("----------------------------------------------------------------------")
    print(f"Session ID                 : {session_id}")
    print(f"HTTP Status                : {http_status}")
    print(f"Execution Status           : {execution_status}")
    print(f"Execution Mode             : {execution_mode}")
    print(f"Model Identifier           : {model_used}")
    print(f"Selected Specialists       : {', '.join(selected_agents) if selected_agents else 'None'}")
    print(f"Executed Tool Calls ({len(tool_calls)})    : {', '.join(tools_executed) if tools_executed else 'None'}")
    print(f"Observed Tool Results ({len(tool_results)}) : {', '.join(tool_results_names) if tool_results_names else 'None'}")
    print(f"Telemetry Events Count     : {len(events)}")
    if unexpected_tools:
        print(f"⚠️ Unexpected Tools        : {unexpected_tools}")
    if retry_events:
        print(f"Retry Occurrences          : {len(retry_events)} (Details: {[sanitize_text(e.get('message')) for e in retry_events]})")
    if fallback_events:
        print(f"Fallback Occurrences       : {len(fallback_events)} (Details: {[sanitize_text(e.get('message')) for e in fallback_events]})")

    print("\nFinal Response Synthesis Preview (First 400 chars):")
    preview = sanitize_text(final_response[:400].strip(), max_len=400)
    print(f"\"\"\"\n{preview}\n... [truncated]\"\"\"")

    # 6. Evaluate Strict Verification Criteria
    print("\n----------------------------------------------------------------------")
    print("VERIFICATION CRITERIA EVALUATION")
    print("----------------------------------------------------------------------")

    criteria = []

    # Criterion 1: HTTP 200 OK
    c1 = (http_status == 200)
    criteria.append(("HTTP Status is 200 OK", c1, f"Received {http_status}"))

    # Criterion 2: execution_mode == "live_gemini"
    c2 = (execution_mode == "live_gemini")
    criteria.append(("Execution mode is strictly 'live_gemini'", c2, f"Received '{execution_mode}'"))

    # Criterion 3: execution_status == "completed"
    c3 = (execution_status == "completed")
    criteria.append(("Execution status is 'completed'", c3, f"Received '{execution_status}'"))

    # Criterion 4: Specialist delegation observed
    c4 = (len(selected_agents) > 0 and "stage_match" in selected_agents)
    criteria.append(("Specialist delegation to StageMatch", c4, f"Selected: {selected_agents}"))

    # Criterion 5: Documented read-only tools used exclusively (no unexpected or mutating tools)
    c5_valid_tools = (
        len(tools_executed) > 0
        and len(unexpected_tools) == 0
        and len(unexpected_result_tools) == 0
        and not has_mutating_flag
        and all(t in ALLOWED_READ_ONLY_TOOLS for t in tools_executed)
    )
    c5_detail = (
        f"Valid read-only tools: {tools_executed}"
        if c5_valid_tools
        else f"Violation: unexpected={unexpected_tools or unexpected_result_tools or 'None'}, mutating_flag={has_mutating_flag}, tools={tools_executed}"
    )
    criteria.append(("Documented read-only tools used exclusively (search_stages, calculate_match_score)", c5_valid_tools, c5_detail))

    # Criterion 6: Tool results correspond directly to observed tool calls
    c6_corresponds = (
        len(tool_calls) > 0
        and len(tool_calls) == len(tool_results)
        and sorted(tools_executed) == sorted(tool_results_names)
    )
    c6_detail = (
        f"Calls ({len(tool_calls)}) correspond 1:1 with Results ({len(tool_results)}): {tools_executed}"
        if c6_corresponds
        else f"Mismatch: calls={tools_executed}, results={tool_results_names}"
    )
    criteria.append(("Tool results correspond to observed tool calls", c6_corresponds, c6_detail))

    # Criterion 7: Meaningful final response based on tool results
    c7 = bool(final_response and len(final_response.strip()) > 50)
    criteria.append(("Meaningful synthesis returned", c7, f"Length: {len(final_response)} chars"))

    # Print criteria checklist
    all_passed = True
    for desc, passed, detail in criteria:
        status_mark = "✓ PASS" if passed else "✗ FAIL"
        if not passed:
            all_passed = False
        print(f"{status_mark} : {desc} ({detail})")

    print("----------------------------------------------------------------------")

    if all_passed:
        print("🎉 LIVE GEMINI INTEGRATION VERIFICATION SUCCESSFUL!")
        print(f"Verified live agentic execution with model: {model_used}")
        print("----------------------------------------------------------------------")
        return True
    else:
        print("❌ LIVE VERIFICATION FAILED.")
        if execution_mode in ["offline_deterministic", "offline_fallback_after_live_error"]:
            print(f"Reason: System fell back to offline mode ('{execution_mode}').")
            print("Live Gemini execution could not be proven.")
        else:
            print(f"Reason: One or more strict verification criteria failed.")
        print("----------------------------------------------------------------------")
        return False


if __name__ == "__main__":
    success = run_live_gemini_verification()
    sys.exit(0 if success else 1)


