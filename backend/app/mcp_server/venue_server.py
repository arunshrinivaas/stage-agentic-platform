"""STAGE Local MCP Venue Server.

Exposes read-only stage venue discovery and specification tools over the
Model Context Protocol (MCP) using stdio transport. Reuses verified domain logic
from app.agents.stage_match.tools without query duplication.
"""
import os
import sys
import logging
from typing import Optional, List, Dict, Any

# Ensure backend root directory is present on sys.path for module resolution
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from mcp.server.mcpserver import MCPServer
from app.agents.stage_match.tools import (
    search_stages as _direct_search_stages,
    get_stage_details as _direct_get_stage_details,
)

# Route diagnostic logging strictly to stderr to prevent stdio protocol frame corruption
logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("venue_server")

venue_server = MCPServer(
    name="stage-venue-server",
    description="STAGE Local MCP server for stage venue discovery and specification retrieval.",
)


@venue_server.tool(
    name="search_stages",
    description="Search registered stage venues from the database using optional filters (city, art form, capacity).",
)
def search_stages(
    city: Optional[str] = None,
    art_form: Optional[str] = None,
    min_capacity: Optional[int] = None,
    max_capacity: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Search registered stage venues from the database using optional filters.

    Args:
        city: Optional city name to filter by (e.g. 'Kolkata', 'Chennai', 'Mumbai').
        art_form: Optional art form category to check compatibility (e.g. 'Music', 'Theatre', 'Dance').
        min_capacity: Optional minimum seated capacity.
        max_capacity: Optional maximum seated capacity.

    Returns:
        A list of matching venue records with capacity, categories, and amenities.
    """
    return _direct_search_stages(
        city=city,
        art_form=art_form,
        min_capacity=min_capacity,
        max_capacity=max_capacity,
    )


@venue_server.tool(
    name="get_stage_details",
    description="Retrieve full specifications and host policies for a specific venue by unique ID or name.",
)
def get_stage_details(venue_id: str) -> Dict[str, Any]:
    """Retrieve full specifications and host policies for a specific venue.

    Args:
        venue_id: The unique ID or exact name of the venue (e.g. 'venue-01').

    Returns:
        Detailed venue dictionary or error if not found.
    """
    return _direct_get_stage_details(venue_id=venue_id)


def main() -> None:
    """Executable module entry point for running the MCP server over stdio."""
    venue_server.run(transport="stdio")


if __name__ == "__main__":
    main()

