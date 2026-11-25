"""StageMatch specialist agent definition using Google ADK."""
import os
import sys
from typing import Optional, Union
from google.adk.agents.llm_agent import LlmAgent
from google.adk.models.google_llm import Gemini
from google.adk.tools.mcp_tool.mcp_toolset import (
    McpToolset,
    StdioConnectionParams,
    StdioServerParameters,
)
from google.genai import types
from app.config import settings
from .tools import (
    search_stages,
    get_stage_details,
    calculate_match_score,
    get_performer_requests,
)

STAGE_MATCH_INSTRUCTION = """You are StageMatch, the specialist agent for STAGE dedicated to connecting performers with appropriate performance spaces and stage venues.

Your responsibilities:
1. Understand the performer's artistic requirements, art form, target city/location, expected audience size, and budget.
2. Search registered stage venues in SQLite using `search_stages`.
3. Use `calculate_match_score` to deterministically score venue compatibility across location, capacity, art form, budget, and availability.
4. Provide structured, transparent recommendations explaining WHY each venue is recommended.
5. Suggest clear, actionable next steps (e.g. reviewing acoustic riders, submitting requests via Performer Dashboard).

Strict Execution Boundaries:
- Do NOT fabricate venues, capacities, or availability. All venues must come from actual database records.
- Matching scores must come from `calculate_match_score` (do not invent scores).
- You cannot automatically approve venue bookings; inform the user that final approval rests with the stage host.
"""


def build_venue_mcp_toolset(
    timeout: float = 5.0,
    backend_dir: Optional[str] = None,
) -> McpToolset:
    """Construct an ADK McpToolset configured for the local venue MCP server."""
    if backend_dir is None:
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

    server_params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "app.mcp_server.venue_server"],
        cwd=backend_dir,
    )
    conn_params = StdioConnectionParams(
        server_params=server_params,
        timeout=timeout,
    )
    return McpToolset(
        connection_params=conn_params,
        tool_filter=["search_stages", "get_stage_details"],
    )


def create_stage_match_agent(
    model: Optional[Union[str, Gemini]] = None,
    mcp_toolset: Optional[McpToolset] = None,
) -> LlmAgent:
    """Instantiate the StageMatch ADK specialist agent."""
    if isinstance(model, Gemini):
        selected_model = model
    elif isinstance(model, str):
        selected_model = Gemini(model=model, client_kwargs={"http_options": types.HttpOptions(timeout=20_000)})
    else:
        selected_model = Gemini(model=settings.ai_model, client_kwargs={"http_options": types.HttpOptions(timeout=20_000)})

    if mcp_toolset is not None:
        agent_tools = [
            mcp_toolset,
            calculate_match_score,
            get_performer_requests,
        ]
    else:
        agent_tools = [
            search_stages,
            get_stage_details,
            calculate_match_score,
            get_performer_requests,
        ]

    return LlmAgent(
        name="stage_match",
        description="Specialist agent that searches, evaluates, and deterministically ranks performance venues for artists.",
        instruction=STAGE_MATCH_INSTRUCTION,
        model=selected_model,
        tools=agent_tools,
    )

