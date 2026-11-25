"""Comprehensive automated test suite for STAGE Google ADK Multi-Agent System.
Tests all 10 required capabilities:
1. StageMatch venue discovery.
2. Deterministic matching scores.
3. CivicAssist venue classification.
4. Permission checklist generation.
5. Permission letter drafting.
6. ImpactFlow allocation calculation.
7. Campaign ledger retrieval.
8. Orchestrator delegation to each specialist (StageMatch, CivicAssist, ImpactFlow).
9. Multi-agent request involving StageMatch and CivicAssist.
10. FastAPI /api/ai/command endpoint integration & session continuity.
"""
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from app.services.seed_data import seed_database
from app.services.agent_service import agent_service

# Import tools directly
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
from app.agents.impact_flow.tools import (
    get_campaign_details,
    get_contribution_ledger,
    calculate_contribution_allocation,
    generate_impact_report,
)

def run_all_agent_tests():
    print("=" * 65)
    print("STAGE — Milestone 4: Google ADK Multi-Agent System Test Suite")
    print("=" * 65)

    # Initialize and seed database
    init_db()
    seed_database()

    # -------------------------------------------------------------
    # Test 1: StageMatch Venue Discovery
    # -------------------------------------------------------------
    print("\n[Test 1] StageMatch venue discovery...")
    kolkata_stages = search_stages(city="Kolkata")
    assert len(kolkata_stages) >= 2, f"Expected >= 2 venues in Kolkata, got {len(kolkata_stages)}"
    assert any("Riverfront" in s["name"] or "Acoustic" in s["name"] or "Atrium" in s["name"] for s in kolkata_stages)
    all_stages = search_stages()
    assert len(all_stages) >= 4, f"Expected >= 4 total venues, got {len(all_stages)}"
    print(f"✓ Test 1 Passed: Found {len(kolkata_stages)} Kolkata venues and {len(all_stages)} total registered venues.")

    # -------------------------------------------------------------
    # Test 2: Deterministic Matching Scores
    # -------------------------------------------------------------
    print("\n[Test 2] Deterministic matching scores...")
    venue_01 = all_stages[0]
    # Optimal match
    high_match = calculate_match_score(
        venue_id=venue_01["id"],
        city=venue_01["city"],
        expected_audience=85,
        art_form="Music",
        budget=25000.0,
    )
    assert high_match["total_score"] >= 80, f"Expected high score >= 80, got {high_match['total_score']}"
    assert high_match["is_recommended"] is True
    assert "dimensions" in high_match
    assert high_match["dimensions"]["location"]["score"] == 25

    # Location mismatch
    mismatch = calculate_match_score(
        venue_id=venue_01["id"],
        city="NonExistentCity",
        expected_audience=85,
        art_form="Music",
        budget=25000.0,
    )
    assert mismatch["dimensions"]["location"]["score"] == 0
    assert mismatch["is_recommended"] is False
    print(f"✓ Test 2 Passed: High match = {high_match['total_score']}/100, Mismatch = {mismatch['total_score']}/100 (deterministic scoring verified).")

    # -------------------------------------------------------------
    # Test 3: CivicAssist Venue Classification
    # -------------------------------------------------------------
    print("\n[Test 3] CivicAssist venue classification...")
    c1 = classify_venue("Heritage Open Amphitheatre")
    assert c1["classified_category"] == "public_heritage_amphitheatre"
    assert c1["regulatory_complexity"] == "HIGH"

    c2 = classify_venue("Central Public Park Promenade")
    assert c2["classified_category"] == "municipal_park_open_space"
    assert c2["regulatory_complexity"] == "MODERATE"

    c3 = classify_venue("Studio Acoustic Loft")
    assert c3["classified_category"] == "private_acoustic_hall_or_gallery"
    assert c3["regulatory_complexity"] == "LOW"
    print(f"✓ Test 3 Passed: Classified public amphitheatre ({c1['regulatory_complexity']}), park ({c2['regulatory_complexity']}), and studio ({c3['regulatory_complexity']}).")

    # -------------------------------------------------------------
    # Test 4: Permission Checklist Generation
    # -------------------------------------------------------------
    print("\n[Test 4] Permission checklist generation...")
    checklist = generate_permission_checklist(
        venue_name="Riverfront Steps Amphitheatre",
        venue_type="Heritage Amphitheatre",
        expected_audience=120,
        uses_amplified_sound=True,
    )
    assert len(checklist["checklist"]) >= 3
    assert "statutory_curfew" in checklist
    assert "statutory_warning" in checklist
    assert checklist["is_demonstration"] is True
    print(f"✓ Test 4 Passed: Generated checklist with {len(checklist['checklist'])} statutory steps. Curfew: '{checklist['statutory_curfew']}'.")

    # -------------------------------------------------------------
    # Test 5: Permission Letter Drafting
    # -------------------------------------------------------------
    print("\n[Test 5] Permission letter drafting...")
    letter = draft_permission_letter(
        applicant_name="Aarav Mehta",
        event_title="Winter Classical Raga",
        venue_name="Heritage Steps",
        event_date="2026-12-28",
        expected_audience=120,
        art_form="Music",
    )
    assert letter["document_type"] == "DRAFT_REQUIRING_HUMAN_REVIEW"
    assert "SIMULATED DRAFT" in letter["watermark"]
    assert "Aarav Mehta" in letter["draft_body"]
    assert "Winter Classical Raga" in letter["draft_body"]
    print(f"✓ Test 5 Passed: Formal draft letter generated with watermark '{letter['watermark']}'.")

    # -------------------------------------------------------------
    # Test 6: ImpactFlow Allocation Calculation (Data-Driven Rule)
    # -------------------------------------------------------------
    print("\n[Test 6] ImpactFlow allocation calculation...")
    alloc = calculate_contribution_allocation(ticket_price=500.0, ticket_count=4)
    assert alloc["gross_total"] == 2000.0
    bd = alloc["allocation_breakdown"]
    # Configured platform baseline rule (evt-01): 30% cause, 15% venue, 55% artist
    assert bd["social_cause_pledge"]["amount"] == 600.0   # 30%
    assert bd["venue_host_share"]["amount"] == 300.0      # 15%
    assert bd["artist_share"]["amount"] == 1100.0         # 55%
    assert alloc["reconciled_sum"] == 2000.0
    assert alloc["is_simulated"] is True
    print(f"✓ Test 6 Passed: Gross ₹2000.00 deterministically allocated via data rule: Artist=₹{bd['artist_share']['amount']} (55%), Venue=₹{bd['venue_host_share']['amount']} (15%), Cause=₹{bd['social_cause_pledge']['amount']} (30%). Reconciled: ₹{alloc['reconciled_sum']}.")

    # -------------------------------------------------------------
    # Test 7: Campaign Ledger Retrieval & Impact Report
    # -------------------------------------------------------------
    print("\n[Test 7] Campaign ledger retrieval & impact report...")
    campaigns = get_campaign_details()
    assert len(campaigns) >= 4
    ledger = get_contribution_ledger(limit=10)
    assert len(ledger) >= 4
    rep = generate_impact_report(campaigns[0]["id"])
    assert "deterministic_outcomes" in rep
    assert rep["is_simulated"] is True
    assert "ledger_audit" in rep
    print(f"✓ Test 7 Passed: Retrieved {len(campaigns)} campaigns and {len(ledger)} ledger records. Impact audit: '{rep['title']}' ({rep['deterministic_outcomes']['primary_metric']}).")

    # -------------------------------------------------------------
    # Test 8: Orchestrator Delegation to Each Specialist
    # -------------------------------------------------------------
    print("\n[Test 8] Orchestrator delegation to each specialist...")
    import asyncio

    # 8a. Delegate to StageMatch
    res_sm = asyncio.run(agent_service.execute_command(
        user_id="usr-aarav",
        message="Find a suitable stage in Chennai for a 5-member acoustic music performance.",
        force_mock=True,
    ))
    assert "stage_match" in res_sm.selected_specialist_agents
    assert any(e.event_type == "specialist_handoff" for e in res_sm.agent_execution_events)
    assert any(e.tool_name == "calculate_match_score" for e in res_sm.agent_execution_events)
    print("✓ Test 8a: Successfully delegated to StageMatch.")

    # 8b. Delegate to CivicAssist
    res_ca = asyncio.run(agent_service.execute_command(
        user_id="usr-malik",
        message="I want to perform at a public park. What permissions should I investigate?",
        force_mock=True,
    ))
    assert "civic_assist" in res_ca.selected_specialist_agents
    assert any(e.tool_name == "classify_venue" for e in res_ca.agent_execution_events)
    assert any(e.tool_name == "generate_permission_checklist" for e in res_ca.agent_execution_events)
    print("✓ Test 8b: Successfully delegated to CivicAssist.")

    # 8c. Delegate to ImpactFlow
    res_if = asyncio.run(agent_service.execute_command(
        user_id="usr-dev",
        message="Show me how the contributions from this campaign are allocated.",
        force_mock=True,
    ))
    assert "impact_flow" in res_if.selected_specialist_agents
    assert any(e.tool_name == "calculate_contribution_allocation" for e in res_if.agent_execution_events)
    print("✓ Test 8c: Successfully delegated to ImpactFlow.")

    # -------------------------------------------------------------
    # Test 9: Multi-Agent Request (StageMatch + CivicAssist)
    # -------------------------------------------------------------
    print("\n[Test 9] Multi-agent compound request (StageMatch + CivicAssist)...")
    res_compound = asyncio.run(agent_service.execute_command(
        user_id="usr-rhea",
        message="Find a venue for this performance and prepare the permission checklist.",
        force_mock=True,
    ))
    assert "stage_match" in res_compound.selected_specialist_agents
    assert "civic_assist" in res_compound.selected_specialist_agents
    # Verify tool calls for both agents in the execution trace
    tools_called = [e.tool_name for e in res_compound.agent_execution_events if e.event_type == "tool_call"]
    assert "search_stages" in tools_called
    assert "generate_permission_checklist" in tools_called
    assert "draft_permission_letter" in tools_called
    print(f"✓ Test 9 Passed: Multi-agent coordination engaged {res_compound.selected_specialist_agents}. Tools called: {set(tools_called)}.")

    # -------------------------------------------------------------
    # Test 10: FastAPI /api/ai/command Integration & Sessions
    # -------------------------------------------------------------
    print("\n[Test 10] FastAPI POST /api/ai/command integration & session continuity...")
    client = TestClient(app)

    # 10a: First command in session (explicit deterministic mock execution)
    payload_1 = {
        "user_id": "usr-aarav",
        "message": "Find a stage in Kolkata for an acoustic recital",
        "force_mock": True,
    }
    res_api_1 = client.post("/api/ai/command", json=payload_1)
    assert res_api_1.status_code == 200, f"AI command failed: {res_api_1.text}"
    data_1 = res_api_1.json()
    assert data_1["execution_status"] == "completed"
    assert data_1["execution_mode"] == "offline_deterministic"
    assert "stage_match" in data_1["selected_specialist_agents"]
    assert len(data_1["agent_execution_events"]) >= 4
    session_id = data_1["session_id"]
    assert session_id is not None
    print(f"✓ Test 10a: Initial command successful (session_id: {session_id}, mode: {data_1['execution_mode']}).")

    # 10b: Follow-up command maintaining the same session_id
    payload_2 = {
        "user_id": "usr-aarav",
        "message": "What permissions and noise curfews apply to this venue?",
        "session_id": session_id,
        "force_mock": True,
    }
    res_api_2 = client.post("/api/ai/command", json=payload_2)
    assert res_api_2.status_code == 200
    data_2 = res_api_2.json()
    assert data_2["session_id"] == session_id, f"Session ID mismatch: expected {session_id}, got {data_2['session_id']}"
    assert data_2["execution_status"] == "completed"
    assert data_2["execution_mode"] == "offline_deterministic"
    assert "civic_assist" in data_2["selected_specialist_agents"]
    print(f"✓ Test 10b: Follow-up command preserved session continuity ({session_id}, mode: {data_2['execution_mode']}).")

    # 10c: Validation on empty message
    res_empty = client.post("/api/ai/command", json={"user_id": "usr-aarav", "message": "   ", "force_mock": True})
    assert res_empty.status_code == 400
    print("✓ Test 10c: Input validation properly rejected empty message with 400.")

    print("\n" + "=" * 65)
    print("ALL 10 MULTI-AGENT ADK TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_all_agent_tests()

