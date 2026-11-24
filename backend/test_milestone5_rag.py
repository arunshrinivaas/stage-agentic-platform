"""Milestone 5 RAG and AI Command Centre verification suite.
Tests:
1. Identifiable civic document corpus loading and metadata validation.
2. CivicAssist RAG retrieval with source attribution (DOC-CIVIC-001 to DOC-CIVIC-004).
3. Clear distinction of retrieved evidence, general recommendations, and missing information.
4. Legal disclaimer enforcement (RAG does not make guidance legally accurate).
5. Fictional demonstration status for Chennai venues.
6. Compound multi-agent delegation executing RAG, StageMatch, and ImpactFlow.
7. Offline deterministic mode preservation without Gemini key.
"""
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from app.services.seed_data import seed_database
from app.agents.civic_assist.rag import load_guidance_corpus, retrieve_civic_guidance_rag

def test_milestone5_rag_and_agents():
    print("=" * 70)
    print("STAGE — Milestone 5: CivicAssist RAG & AI Command Centre Test Suite")
    print("=" * 70)

    # Initialize and seed database
    init_db()
    seed_database()

    # -------------------------------------------------------------
    # Test 1: Identifiable Corpus Loading
    # -------------------------------------------------------------
    print("\n[Test 1] Identifiable civic document corpus validation...")
    corpus = load_guidance_corpus()
    assert len(corpus) >= 4, f"Expected >= 4 documents, got {len(corpus)}"
    doc_ids = {doc["document_id"] for doc in corpus}
    expected_ids = {"DOC-CIVIC-001", "DOC-CIVIC-002", "DOC-CIVIC-003", "DOC-CIVIC-004"}
    assert expected_ids.issubset(doc_ids), f"Missing expected documents from {doc_ids}"

    for doc in corpus:
        assert "title" in doc
        assert "jurisdiction" in doc
        assert "source_file" in doc
        assert "legal_disclaimer" in doc
        assert "sections" in doc
        assert len(doc["sections"]) >= 3
    print(f"✓ Test 1 Passed: Loaded {len(corpus)} identifiable corpus documents with full metadata.")

    # -------------------------------------------------------------
    # Test 2: RAG Retrieval with Source Attribution
    # -------------------------------------------------------------
    print("\n[Test 2] RAG retrieval with source attribution...")
    rag_chennai = retrieve_civic_guidance_rag(
        query="acoustic shell curfew decibel noise limits",
        city="Chennai",
        venue_type="Open-Air Seaside Amphitheatre",
    )
    assert len(rag_chennai["retrieved_evidence"]) > 0
    top_ev = rag_chennai["retrieved_evidence"][0]
    assert top_ev["document_id"] == "DOC-CIVIC-001"
    assert "Chennai" in top_ev["document_title"]
    assert "SEC-" in top_ev["section_id"]
    assert "source_file" in top_ev
    assert "citation" in top_ev
    assert top_ev["citation"].startswith("[DOC-CIVIC-001]")
    print(f"✓ Test 2 Passed: Retrieved evidence with citation: '{top_ev['citation']}'")
    print(f"  Source file: {top_ev['source_file']}")

    # -------------------------------------------------------------
    # Test 3: Distinction of Evidence, Recommendations & Missing Info
    # -------------------------------------------------------------
    print("\n[Test 3] Distinction of Evidence, Recommendations & Missing Info...")
    assert "retrieved_evidence" in rag_chennai
    assert "general_recommendations" in rag_chennai
    assert "missing_information" in rag_chennai
    assert len(rag_chennai["general_recommendations"]) >= 2
    assert len(rag_chennai["missing_information"]) >= 2
    # Verify missing info explicitly notes unverified municipal items
    assert any("fee schedule" in m.lower() or "deposit" in m.lower() for m in rag_chennai["missing_information"])
    print(f"✓ Test 3 Passed: Distinctly returned {len(rag_chennai['retrieved_evidence'])} evidence excerpts, {len(rag_chennai['general_recommendations'])} recommendations, and {len(rag_chennai['missing_information'])} missing items.")

    # -------------------------------------------------------------
    # Test 4: Legal Disclaimer Enforcement
    # -------------------------------------------------------------
    print("\n[Test 4] Legal disclaimer enforcement...")
    assert "legal_disclaimer" in rag_chennai
    disclaimer = rag_chennai["legal_disclaimer"]
    assert "not constitute authoritative" in disclaimer.lower() or "not legal advice" in disclaimer.lower()
    print(f"✓ Test 4 Passed: Disclaimer enforced: '{disclaimer[:85]}...'")

    # -------------------------------------------------------------
    # Test 5: Chennai Venue Demo Labeling in SQLite & API
    # -------------------------------------------------------------
    print("\n[Test 5] Fictional demonstration status for Chennai venues...")
    client = TestClient(app)
    res_venues = client.get("/api/venues")
    assert res_venues.status_code == 200
    chennai_venues = [v for v in res_venues.json() if v["location"]["city"] == "Chennai"]
    assert len(chennai_venues) >= 2
    for cv in chennai_venues:
        assert cv["isDemonstration"] is True, f"Venue {cv['name']} isDemonstration is not True!"
    print(f"✓ Test 5 Passed: All {len(chennai_venues)} Chennai venues marked with isDemonstration = True.")

    # -------------------------------------------------------------
    # Test 6: Compound Multi-Agent Command with RAG & Deterministic Offline Mode
    # -------------------------------------------------------------
    print("\n[Test 6] Full compound AI command execution via POST /api/ai/command...")
    payload = {
        "user_id": "usr-aarav",
        "message": (
            "Find a suitable venue in Chennai for an acoustic performance, "
            "prepare the relevant permission checklist, and explain the contribution "
            "allocation for the selected education campaign."
        ),
        "force_mock": True,
    }
    res_cmd = client.post("/api/ai/command", json=payload)
    assert res_cmd.status_code == 200
    data = res_cmd.json()
    assert data["execution_status"] == "completed"
    assert data["execution_mode"] in ["offline_deterministic", "offline_fallback_after_live_error"]
    assert any(term in data["model_used"].lower() for term in ["offline deterministic mode", "mock test mode", "live gemini call failed"])

    # Verify all 3 specialist agents engaged
    agents = data["selected_specialist_agents"]
    assert "stage_match" in agents
    assert "civic_assist" in agents
    assert "impact_flow" in agents

    # Verify RAG tool call captured in execution trace
    tools_called = [e["tool_name"] for e in data["agent_execution_events"] if e["event_type"] == "tool_call"]
    assert "retrieve_civic_guidance_rag" in tools_called, f"retrieve_civic_guidance_rag missing from {tools_called}"
    assert "calculate_contribution_allocation" in tools_called
    assert "calculate_match_score" in tools_called

    # Verify response contains RAG evidence and demo label
    resp_text = data["final_response"]
    assert "DOC-CIVIC-001" in resp_text
    assert "Retrieved Evidence" in resp_text
    assert "General Recommendations" in resp_text
    assert "Missing Information" in resp_text
    assert "Fictional demonstration record" in resp_text
    assert "Chennai" in resp_text

    print(f"✓ Test 6 Passed: Compound orchestration executed with RAG evidence and {len(data['agent_execution_events'])} real backend events.")

    print("\n" + "=" * 70)
    print("ALL MILESTONE 5 RAG & MULTI-AGENT TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_milestone5_rag_and_agents()

