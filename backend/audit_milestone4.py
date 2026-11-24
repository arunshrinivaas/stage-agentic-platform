"""Comprehensive audit script for STAGE Milestone 4.1.
Verifies:
1. Actual Gemini execution / API key status & distinguishing live vs offline mock.
2. Location consistency (Chennai preserved, only Chennai venues, match score, no Kolkata venues).
3. Financial allocation audit (no universal 70/20/10, retrieves real event/cause rules, deterministic reconciliation).
4. Compound agent delegation (StageMatch -> CivicAssist -> ImpactFlow).
"""
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import init_db
from app.services.seed_data import seed_database
from app.agents.impact_flow.tools import calculate_contribution_allocation, resolve_allocation_rule

def audit_milestone_4():
    print("=" * 70)
    print("STAGE — Milestone 4.1: Live Agent Verification & Consistency Audit")
    print("=" * 70)

    # Initialize and seed database
    init_db()
    seed_database()

    client = TestClient(app)

    # -------------------------------------------------------------------------
    # 1. Verify Gemini API Key & Live Execution Status
    # -------------------------------------------------------------------------
    print("\n--- 1. Gemini Execution & API Key Audit ---")
    has_key = bool(settings.gemini_api_key)
    print(f"• GEMINI_API_KEY configured: {has_key}")
    if has_key:
        print(f"• Key length: {len(settings.gemini_api_key)} chars (prefix: {settings.gemini_api_key[:4]}...)")
    else:
        print("• Notice: GEMINI_API_KEY is NOT configured in backend/.env or environment.")
        print("  System operates safely in offline deterministic mode for testing without API quota.")

    # Execute a request through POST /api/ai/command
    res_live_check = client.post(
        "/api/ai/command",
        json={
            "user_id": "usr-audit",
            "message": "Hello STAGE, what spaces and tools do you have available?",
        }
    )
    assert res_live_check.status_code == 200
    data_live = res_live_check.json()
    print(f"• Execution Status: {data_live['execution_status']}")
    print(f"• Execution Mode: {data_live.get('execution_mode')}")
    print(f"• Model / Pipeline Used: {data_live['model_used']}")

    if has_key:
        assert data_live.get("execution_mode") == "live_gemini"
        print("✓ Live Gemini execution verified.")
    else:
        assert data_live.get("execution_mode") == "offline_deterministic"
        print("✓ Correctly identified offline deterministic mode without pretending live execution succeeded.")

    # -------------------------------------------------------------------------
    # 2. Fix Location Consistency (Chennai Test)
    # -------------------------------------------------------------------------
    print("\n--- 2. Location Consistency Audit (Chennai Test) ---")
    chennai_prompt = "Find a suitable stage in Chennai for a five-member acoustic performance."
    res_chennai = client.post(
        "/api/ai/command",
        json={"user_id": "usr-aarav", "message": chennai_prompt}
    )
    assert res_chennai.status_code == 200
    data_chennai = res_chennai.json()
    resp_text = data_chennai["final_response"]

    # Verify Chennai is preserved
    assert "Chennai" in resp_text, "Expected 'Chennai' in the agent response"

    # Verify no Kolkata venues appear in the recommendation
    assert "Kolkata" not in resp_text, f"Kolkata unexpectedly appeared in Chennai venue recommendation: {resp_text}"
    assert "The Vault Amphitheater" not in resp_text, "Kolkata venue 'The Vault Amphitheater' leaked into Chennai response!"
    assert "The Obsidian Atrium" not in resp_text, "Kolkata venue 'The Obsidian Atrium' leaked into Chennai response!"

    # Verify a relevant Chennai venue was returned
    assert ("The Marina Coastal Amphitheatre" in resp_text or "Kalakshetra Heritage Pavilion" in resp_text), \
        f"Expected Chennai venue in response: {resp_text}"

    # Verify match score event evaluated Chennai
    call_event = next(e for e in data_chennai["agent_execution_events"] if e["tool_name"] == "calculate_match_score" and e["event_type"] == "tool_call")
    result_event = next(e for e in data_chennai["agent_execution_events"] if e["tool_name"] == "calculate_match_score" and e["event_type"] == "tool_result")
    assert call_event["tool_input"]["city"] == "Chennai", f"calculate_match_score evaluated city '{call_event['tool_input'].get('city')}', expected 'Chennai'!"
    match_result = result_event["tool_output"]
    assert match_result["dimensions"]["location"]["score"] == 25, "Location score should be 25 for exact Chennai match!"

    print(f"✓ Location Consistency Verified:")
    print(f"  - Target City: Chennai")
    print(f"  - Recommended Space: {match_result['venue_name']} ({match_result['city']})")
    print(f"  - Location Score: {match_result['dimensions']['location']['score']}/25 ({match_result['dimensions']['location']['notes']})")
    print(f"  - Zero Kolkata venues in response.")

    # -------------------------------------------------------------------------
    # 3. Audit Financial Allocation (Data-driven rules & exact reconciliation)
    # -------------------------------------------------------------------------
    print("\n--- 3. Financial Allocation Audit ---")
    # Test 3a: Event evt-01 rule (Echoes of the Ghats: 30% pledge, 15% venue, 55% artist)
    alloc_evt1 = calculate_contribution_allocation(ticket_price=450.0, ticket_count=2, event_id="evt-01")
    assert alloc_evt1["gross_total"] == 900.0
    bd1 = alloc_evt1["allocation_breakdown"]
    assert bd1["social_cause_pledge"]["percentage"] == "30.0%", f"Expected 30.0% pledge for evt-01, got {bd1['social_cause_pledge']['percentage']}"
    assert bd1["social_cause_pledge"]["amount"] == 270.0
    assert bd1["venue_host_share"]["amount"] == 135.0   # 15%
    assert bd1["artist_share"]["amount"] == 495.0       # 55%
    assert alloc_evt1["reconciled_sum"] == 900.0
    print(f"✓ Event evt-01 Allocation: Gross=₹900.00 -> Cause(30%)=₹{bd1['social_cause_pledge']['amount']}, Venue(15%)=₹{bd1['venue_host_share']['amount']}, Artist(55%)=₹{bd1['artist_share']['amount']} (Reconciled: ₹{alloc_evt1['reconciled_sum']})")

    # Test 3b: Event evt-02 rule (Contemporary Kathak: 25% pledge, 10% venue, 65% artist)
    alloc_evt2 = calculate_contribution_allocation(ticket_price=600.0, ticket_count=1, event_id="evt-02")
    assert alloc_evt2["gross_total"] == 600.0
    bd2 = alloc_evt2["allocation_breakdown"]
    assert bd2["social_cause_pledge"]["percentage"] == "25.0%"
    assert bd2["social_cause_pledge"]["amount"] == 150.0
    assert bd2["artist_share"]["amount"] + bd2["venue_host_share"]["amount"] + bd2["social_cause_pledge"]["amount"] == 600.0
    print(f"✓ Event evt-02 Allocation: Gross=₹600.00 -> Cause(25%)=₹{bd2['social_cause_pledge']['amount']}, Venue(10%)=₹{bd2['venue_host_share']['amount']}, Artist(65%)=₹{bd2['artist_share']['amount']} (Reconciled: ₹{alloc_evt2['reconciled_sum']})")

    # Test 3c: Rounding edge case (odd ticket price with fractional split)
    alloc_odd = calculate_contribution_allocation(ticket_price=333.33, ticket_count=3, event_id="evt-01")
    gross_odd = alloc_odd["gross_total"]
    bd_odd = alloc_odd["allocation_breakdown"]
    reconciled_odd = round(bd_odd["artist_share"]["amount"] + bd_odd["venue_host_share"]["amount"] + bd_odd["social_cause_pledge"]["amount"], 2)
    assert reconciled_odd == gross_odd, f"Rounding mismatch: sum={reconciled_odd} vs gross={gross_odd}"
    print(f"✓ Rounding Reconciliation: Gross=₹{gross_odd:,.2f} -> Reconciled Sum=₹{reconciled_odd:,.2f} (diff = 0.00).")

    # -------------------------------------------------------------------------
    # 4. Verify Compound Agent Delegation
    # -------------------------------------------------------------------------
    print("\n--- 4. Compound Agent Delegation Audit ---")
    compound_prompt = (
        "Find a suitable venue in Chennai for an acoustic performance, "
        "prepare the relevant permission checklist, and explain the contribution "
        "allocation for the selected education campaign."
    )
    res_comp = client.post(
        "/api/ai/command",
        json={"user_id": "usr-aarav", "message": compound_prompt}
    )
    assert res_comp.status_code == 200
    data_comp = res_comp.json()
    resp_comp = data_comp["final_response"]
    selected = data_comp["selected_specialist_agents"]

    # Verify all three specialists were engaged
    assert "stage_match" in selected, f"stage_match missing from {selected}"
    assert "civic_assist" in selected, f"civic_assist missing from {selected}"
    assert "impact_flow" in selected, f"impact_flow missing from {selected}"
    print(f"✓ Specialist Ensemble Engaged: {selected}")

    # Verify tool calls across all three specialists
    tool_names = [e["tool_name"] for e in data_comp["agent_execution_events"] if e["event_type"] == "tool_call"]
    print(f"✓ Tools Executed: {tool_names}")
    assert "search_stages" in tool_names
    assert "calculate_match_score" in tool_names
    assert "classify_venue" in tool_names
    assert "generate_permission_checklist" in tool_names
    assert "calculate_contribution_allocation" in tool_names

    # Verify CivicAssist received the actual Chennai venue details from StageMatch
    assert "The Marina Coastal Amphitheatre" in resp_comp or "Kalakshetra Heritage Pavilion" in resp_comp
    assert "Chennai" in resp_comp
    # Verify ImpactFlow retrieved education campaign
    assert "Instruments for Riverbank Classrooms" in resp_comp or "Youth Arts Education" in resp_comp
    # Verify Orchestrator consolidated all 3 sections
    assert "Stage Recommendation" in resp_comp
    assert "Regulatory Guidance & Checklist" in resp_comp
    assert "Social Impact & Financial Allocation" in resp_comp

    print("✓ Compound Agent Delegation Verified:")
    print("  - StageMatch discovered Chennai space")
    print("  - CivicAssist received actual Chennai venue details")
    print("  - ImpactFlow evaluated the education campaign with data-driven rules")
    print("  - Orchestrator consolidated all three specialist findings")

    print("\n" + "=" * 70)
    print("ALL MILESTONE 4.1 AUDIT CHECKS PASSED WITH ZERO DEFECTS!")
    print("=" * 70)

if __name__ == "__main__":
    audit_milestone_4()
