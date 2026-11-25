#!/usr/bin/env python3
"""Execute real backend AI workflows for all four roles against live FastAPI backend.
Captures request, endpoint, role, agent, tools, results, and execution mode.
"""

import json
import urllib.request
import sys
import time

BASE_URL = "http://127.0.0.1:8000"

ROLES_CREDS = {
    "performer": ("aarav@stage.live", "stage2026"),
    "provider": ("priya@heritagestages.live", "stage2026"),
    "audience": ("rhea.sen@example.com", "stage2026"),
    "organiser": ("organizer@deltamelody.org", "stage2026"),
}

def login(email, password):
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data["token"], data["user"]

def execute_ai_command(token, user_id, message):
    payload = json.dumps({"user_id": user_id, "message": message}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/ai/command",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 80)
    print("STAGE PRIORITY PASS 1 — ROLE-BASED AI WORKFLOW VERIFICATION")
    print(f"Timestamp: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")
    print("=" * 80)

    evidence = {}

    # 1. Performer Workflow
    print("\n--- [WORKFLOW 1/4] Performer: StageMatch Venue Recommendation ---")
    p_token, p_user = login(*ROLES_CREDS["performer"])
    p_query = "Find an acoustic stage in Bangalore for a 50-seat classical sitar performance"
    print(f"  User: {p_user['name']} ({p_user['id']}, role={p_user['role']})")
    print(f"  Endpoint: POST {BASE_URL}/api/ai/command")
    print(f"  Prompt: '{p_query}'")
    
    t0 = time.time()
    p_res = execute_ai_command(p_token, p_user["id"], p_query)
    p_elapsed = time.time() - t0
    
    p_tools = [e.get("tool_name") for e in p_res.get("agent_execution_events", []) if e.get("event_type") == "tool_call"]
    print(f"  Execution Mode: {p_res.get('execution_mode')}")
    print(f"  Agents Selected: {p_res.get('selected_specialist_agents')}")
    print(f"  Tools Invoked: {p_tools if p_tools else 'None'}")
    print(f"  Response Length: {len(p_res.get('final_response', ''))} chars in {p_elapsed:.2f}s")
    print(f"  Sample Output:\n    {p_res.get('final_response', '')[:280]}...")

    evidence["performer"] = {
        "role": p_user["role"],
        "user_id": p_user["id"],
        "endpoint": "/api/ai/command",
        "request": p_query,
        "execution_mode": p_res.get("execution_mode"),
        "agents_selected": p_res.get("selected_specialist_agents"),
        "tools_invoked": p_tools,
        "response_length": len(p_res.get("final_response", "")),
        "response_excerpt": p_res.get("final_response", "")[:300],
        "events_count": len(p_res.get("agent_execution_events", []))
    }

    # 2. Stage Provider Workflow
    print("\n--- [WORKFLOW 2/4] Provider: Pending Request Analysis & Compatibility Evaluation ---")
    h_token, h_user = login(*ROLES_CREDS["provider"])
    h_query = "Evaluate the compatibility of the incoming pitch 'Acoustic Chamber Recital' for our natural stone amphitheater"
    print(f"  User: {h_user['name']} ({h_user['id']}, role={h_user['role']})")
    print(f"  Endpoint: POST {BASE_URL}/api/ai/command")
    print(f"  Prompt: '{h_query}'")
    
    t0 = time.time()
    h_res = execute_ai_command(h_token, h_user["id"], h_query)
    h_elapsed = time.time() - t0
    
    h_tools = [e.get("tool_name") for e in h_res.get("agent_execution_events", []) if e.get("event_type") == "tool_call"]
    print(f"  Execution Mode: {h_res.get('execution_mode')}")
    print(f"  Agents Selected: {h_res.get('selected_specialist_agents')}")
    print(f"  Tools Invoked: {h_tools if h_tools else 'None'}")
    print(f"  Response Length: {len(h_res.get('final_response', ''))} chars in {h_elapsed:.2f}s")
    print(f"  Sample Output:\n    {h_res.get('final_response', '')[:280]}...")

    evidence["provider"] = {
        "role": h_user["role"],
        "user_id": h_user["id"],
        "endpoint": "/api/ai/command",
        "request": h_query,
        "execution_mode": h_res.get("execution_mode"),
        "agents_selected": h_res.get("selected_specialist_agents"),
        "tools_invoked": h_tools,
        "response_length": len(h_res.get("final_response", "")),
        "response_excerpt": h_res.get("final_response", "")[:300],
        "events_count": len(h_res.get("agent_execution_events", []))
    }

    # 3. Audience Workflow
    print("\n--- [WORKFLOW 3/4] Audience: Event Recommendation Using Actual Event Records ---")
    a_token, a_user = login(*ROLES_CREDS["audience"])
    a_query = "Recommend an upcoming unamplified classical music event in Kolkata matching my taste in acoustic chamber strings"
    print(f"  User: {a_user['name']} ({a_user['id']}, role={a_user['role']})")
    print(f"  Endpoint: POST {BASE_URL}/api/ai/command")
    print(f"  Prompt: '{a_query}'")
    
    t0 = time.time()
    a_res = execute_ai_command(a_token, a_user["id"], a_query)
    a_elapsed = time.time() - t0
    
    a_tools = [e.get("tool_name") for e in a_res.get("agent_execution_events", []) if e.get("event_type") == "tool_call"]
    print(f"  Execution Mode: {a_res.get('execution_mode')}")
    print(f"  Agents Selected: {a_res.get('selected_specialist_agents')}")
    print(f"  Tools Invoked: {a_tools if a_tools else 'None'}")
    print(f"  Response Length: {len(a_res.get('final_response', ''))} chars in {a_elapsed:.2f}s")
    print(f"  Sample Output:\n    {a_res.get('final_response', '')[:280]}...")

    evidence["audience"] = {
        "role": a_user["role"],
        "user_id": a_user["id"],
        "endpoint": "/api/ai/command",
        "request": a_query,
        "execution_mode": a_res.get("execution_mode"),
        "agents_selected": a_res.get("selected_specialist_agents"),
        "tools_invoked": a_tools,
        "response_length": len(a_res.get("final_response", "")),
        "response_excerpt": a_res.get("final_response", "")[:300],
        "events_count": len(a_res.get("agent_execution_events", []))
    }

    # 4. Organiser Workflow
    print("\n--- [WORKFLOW 4/4] Organiser: ImpactFlow Contribution Summary & CivicAssist Retrieval ---")
    o_token, o_user = login(*ROLES_CREDS["organiser"])
    o_query = "Explain the contribution allocation for the Youth Arts Education campaign and prepare the civic permit checklist for our fundraising concert"
    print(f"  User: {o_user['name']} ({o_user['id']}, role={o_user['role']})")
    print(f"  Endpoint: POST {BASE_URL}/api/ai/command")
    print(f"  Prompt: '{o_query}'")
    
    t0 = time.time()
    o_res = execute_ai_command(o_token, o_user["id"], o_query)
    o_elapsed = time.time() - t0
    
    o_tools = [e.get("tool_name") for e in o_res.get("agent_execution_events", []) if e.get("event_type") == "tool_call"]
    print(f"  Execution Mode: {o_res.get('execution_mode')}")
    print(f"  Agents Selected: {o_res.get('selected_specialist_agents')}")
    print(f"  Tools Invoked: {o_tools if o_tools else 'None'}")
    print(f"  Response Length: {len(o_res.get('final_response', ''))} chars in {o_elapsed:.2f}s")
    print(f"  Sample Output:\n    {o_res.get('final_response', '')[:280]}...")

    evidence["organiser"] = {
        "role": o_user["role"],
        "user_id": o_user["id"],
        "endpoint": "/api/ai/command",
        "request": o_query,
        "execution_mode": o_res.get("execution_mode"),
        "agents_selected": o_res.get("selected_specialist_agents"),
        "tools_invoked": o_tools,
        "response_length": len(o_res.get("final_response", "")),
        "response_excerpt": o_res.get("final_response", "")[:300],
        "events_count": len(o_res.get("agent_execution_events", []))
    }

    # Write output to json file for reference
    with open("role_ai_workflows_evidence.json", "w") as f:
        json.dump(evidence, f, indent=2)

    print("\n" + "=" * 80)
    print("ALL 4 ROLE AI WORKFLOWS EXECUTED AND RECORDED CLEANLY (100%)")
    print("=" * 80)

if __name__ == "__main__":
    main()

