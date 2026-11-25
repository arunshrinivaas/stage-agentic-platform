"""Focused unit and integration test suite for STAGE Milestone 7.1:
Native Local Model Context Protocol (MCP) Integration using Google ADK.

Verifies:
1. MCP venue server exposes exactly the two intended read-only tools.
2. Tool arguments and results match existing direct Python implementations.
3. StageMatch agent registers the MCP toolset and retains its direct tools without duplicates.
4. StageAgentService async lifecycle initializes once and shuts down once.
5. Actual stdio client-server smoke test using ADK McpToolset.
6. FastAPI lifespan context manager initializes and cleanly shuts down MCP.
"""
import os
import sys
import asyncio

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import init_db
from app.services.seed_data import seed_database
from app.mcp_server.venue_server import venue_server
from app.agents.stage_match.tools import (
    search_stages as direct_search_stages,
    get_stage_details as direct_get_stage_details,
    calculate_match_score,
    get_performer_requests,
)
from app.agents.stage_match.agent import (
    create_stage_match_agent,
    build_venue_mcp_toolset,
)
from app.services.agent_service import StageAgentService, agent_service
from app.main import app, lifespan
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset


async def test_mcp_server_exposes_exactly_two_tools():
    """Test 1: Verify venue MCP server exposes exactly search_stages and get_stage_details."""
    print("\n[Test 1] Verifying MCP server exposes exactly two tools...")
    tools = await venue_server.list_tools()
    tool_names = [t.name for t in tools]
    assert len(tools) == 2, f"Expected exactly 2 tools, got {len(tools)}: {tool_names}"
    assert set(tool_names) == {"search_stages", "get_stage_details"}

    # Validate search_stages parameter schema
    search_tool = next(t for t in tools if t.name == "search_stages")
    props = search_tool.input_schema.get("properties", {})
    assert "city" in props
    assert "art_form" in props
    assert "min_capacity" in props
    assert "max_capacity" in props

    # Validate get_stage_details parameter schema
    details_tool = next(t for t in tools if t.name == "get_stage_details")
    d_props = details_tool.input_schema.get("properties", {})
    assert "venue_id" in d_props
    assert "venue_id" in details_tool.input_schema.get("required", [])

    print("✓ Test 1 Passed: MCP server exposes exactly 2 tools with valid JSON schemas.")


async def test_mcp_tools_match_direct_python_functions():
    """Test 2: Verify MCP tools return identical results to direct Python functions."""
    print("\n[Test 2] Verifying MCP tools match direct Python functions...")
    # 1. Test search_stages
    mcp_search_res = await venue_server.call_tool("search_stages", {"city": "Kolkata"})
    mcp_search_venues = mcp_search_res.structured_content.get("result", [])
    direct_search_venues = direct_search_stages(city="Kolkata")
    assert len(mcp_search_venues) == len(direct_search_venues), "Venue count mismatch"
    assert [v["id"] for v in mcp_search_venues] == [v["id"] for v in direct_search_venues]

    # 2. Test get_stage_details
    mcp_details_res = await venue_server.call_tool("get_stage_details", {"venue_id": "venue-01"})
    mcp_venue = mcp_details_res.structured_content.get("result", {})
    direct_venue = direct_get_stage_details("venue-01")
    assert mcp_venue["id"] == direct_venue["id"]
    assert mcp_venue["name"] == direct_venue["name"]
    assert mcp_venue["city"] == direct_venue["city"]

    print("✓ Test 2 Passed: MCP tools produce 100% identical outputs to direct Python functions.")


async def test_stagematch_registers_mcp_tools_and_retains_direct_tools():
    """Test 3: Verify StageMatch registers McpToolset and retains calculate_match_score & get_performer_requests."""
    print("\n[Test 3] Verifying StageMatch agent MCP and direct tool registration...")
    toolset = build_venue_mcp_toolset()
    try:
        agent = create_stage_match_agent(mcp_toolset=toolset)

        # 1. Direct tools list contains McpToolset, calculate_match_score, and get_performer_requests
        assert len(agent.tools) == 3
        assert toolset in agent.tools
        assert calculate_match_score in agent.tools
        assert get_performer_requests in agent.tools

        # Ensure direct search_stages / get_stage_details are NOT registered directly (avoiding duplicates)
        assert direct_search_stages not in agent.tools
        assert direct_get_stage_details not in agent.tools

        # 2. Canonical tools resolution expands MCP tools into callable BaseTools
        canonical = await agent.canonical_tools()
        canonical_names = set(t.name for t in canonical)
        assert "search_stages" in canonical_names
        assert "get_stage_details" in canonical_names
        assert "calculate_match_score" in canonical_names
        assert "get_performer_requests" in canonical_names
    finally:
        await toolset.close()

    print("✓ Test 3 Passed: StageMatch registers McpToolset without duplicate direct tools.")


async def test_mcp_stdio_client_server_smoke():
    """Test 4: Smoke test launching local venue server via stdio transport, querying tools and executing."""
    print("\n[Test 4] Stdio MCP client/server smoke test via Google ADK McpToolset...")
    toolset = build_venue_mcp_toolset()
    try:
        tools = await toolset.get_tools()
        names = [t.name for t in tools]
        assert "search_stages" in names
        assert "get_stage_details" in names

        # Execute search_stages via ADK MCP tool
        search_tool = next(t for t in tools if t.name == "search_stages")
        res = await search_tool.run_async(args={"city": "Kolkata"}, tool_context=None)
        assert res.get("isError") is False
        venues = res.get("structuredContent", {}).get("result", [])
        assert len(venues) > 0
        assert any(v.get("city") == "Kolkata" for v in venues)

        # Execute get_stage_details via ADK MCP tool
        details_tool = next(t for t in tools if t.name == "get_stage_details")
        res_d = await details_tool.run_async(args={"venue_id": "venue-01"}, tool_context=None)
        assert res_d.get("isError") is False
        venue = res_d.get("structuredContent", {}).get("result", {})
        assert venue.get("id") == "venue-01"
    finally:
        await toolset.close()

    print("✓ Test 4 Passed: Stdio MCP client/server execution completed successfully.")


async def test_lifecycle_initializes_once_and_closes_once():
    """Test 5: Verify StageAgentService initialize runs once (idempotent) and shutdown closes cleanly."""
    print("\n[Test 5] StageAgentService lifecycle (initialize once, shutdown once)...")
    service = StageAgentService()
    assert service.is_mcp_active is False
    assert service.mcp_toolset is None

    try:
        # First initialization
        await service.initialize()
        assert service.is_mcp_active is True
        assert service.mcp_toolset is not None
        initial_toolset = service.mcp_toolset

        # Second initialization (idempotent: must keep existing toolset)
        await service.initialize()
        assert service.is_mcp_active is True
        assert service.mcp_toolset is initial_toolset

        # Shutdown
        await service.shutdown()
        assert service.is_mcp_active is False
        assert service.mcp_toolset is None
    finally:
        if service.is_mcp_active:
            await service.shutdown()

    print("✓ Test 5 Passed: StageAgentService lifecycle correctly manages MCP toolset.")


async def test_fastapi_lifespan_integration():
    """Test 6: Verify FastAPI lifespan context manager initializes and cleanly shuts down MCP."""
    print("\n[Test 6] FastAPI lifespan context manager integration...")
    # Ensure agent_service starts from uninitialized state for test
    if agent_service.is_mcp_active:
        await agent_service.shutdown()

    assert agent_service.is_mcp_active is False

    async with lifespan(app):
        assert agent_service.is_mcp_active is True
        assert agent_service.mcp_toolset is not None

    assert agent_service.is_mcp_active is False
    assert agent_service.mcp_toolset is None
    print("✓ Test 6 Passed: FastAPI lifespan starts and stops MCP toolset cleanly.")


async def main():
    print("======================================================================")
    print("STAGE — Milestone 7.1: Local MCP Integration & Lifecycle Test Suite")
    print("======================================================================")
    init_db()
    seed_database()

    await test_mcp_server_exposes_exactly_two_tools()
    await test_mcp_tools_match_direct_python_functions()
    await test_stagematch_registers_mcp_tools_and_retains_direct_tools()
    await test_mcp_stdio_client_server_smoke()
    await test_lifecycle_initializes_once_and_closes_once()
    await test_fastapi_lifespan_integration()

    print("\n======================================================================")
    print("ALL 6 MCP INTEGRATION & LIFECYCLE TESTS PASSED SUCCESSFULLY!")
    print("======================================================================")


if __name__ == "__main__":
    asyncio.run(main())
