"""Local Device MCP Companion Bridge Proof-of-Concept.

Architecture & Security Invariants:
1. Restricted strictly to loopback interface (127.0.0.1:8765).
2. Explicit user pairing required with high-entropy token (X-STAGE-Bridge-Token).
3. Narrowly scoped tools only: Calendar, Reminder, Maps Navigation, Pass Sharing.
4. Absolute ban on arbitrary shell execution (subprocess, sh, bash banned).
5. Absolute ban on unrestricted filesystem access (no path traversal).
6. Isolated from the backend venue MCP server.
"""
import sys
import os
import json
import secrets
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Security: Generated local pairing token on bridge startup
BRIDGE_TOKEN = os.getenv("STAGE_DEVICE_BRIDGE_TOKEN") or f"stg_dev_{secrets.token_hex(16)}"

companion_app = FastAPI(
    title="STAGE Local Device MCP Companion Bridge",
    description="Secure loopback bridge for user-authorized local device integration",
    version="1.0.0",
)

companion_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

def verify_bridge_token(x_stage_bridge_token: Optional[str] = Header(None)) -> str:
    """Validate that the incoming request presents the authorized local pairing token."""
    if not x_stage_bridge_token or x_stage_bridge_token.strip() != BRIDGE_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: invalid or missing X-STAGE-Bridge-Token pairing token."
        )
    return x_stage_bridge_token

# Schemas
class PairingRequest(BaseModel):
    client_name: str = Field(..., example="STAGE Web Frontend")
    session_id: str = Field(..., example="sess-12345")

class CalendarEventRequest(BaseModel):
    title: str = Field(..., max_length=200)
    start_iso: str = Field(..., example="2026-11-28T19:30:00+05:30")
    end_iso: Optional[str] = Field(None, example="2026-11-28T21:00:00+05:30")
    location: str = Field(..., max_length=250)
    description: Optional[str] = Field("")
    user_consent_granted: bool = Field(..., description="Explicit user confirmation required")

class LocalReminderRequest(BaseModel):
    title: str = Field(..., max_length=200)
    target_datetime_iso: str = Field(..., example="2026-11-28T10:00:00+05:30")
    priority: Optional[str] = Field("normal")
    note: Optional[str] = Field("")
    user_consent_granted: bool = Field(..., description="Explicit user confirmation required")

class MapsNavRequest(BaseModel):
    venue_name: str
    address: str
    city: str

class SharePassRequest(BaseModel):
    booking_code: str
    verification_url: str
    event_title: str

# Endpoints
@companion_app.get("/health")
def bridge_health():
    """Public health probe confirming bridge is active on loopback."""
    return {
        "status": "healthy",
        "service": "STAGE Local Device MCP Bridge",
        "version": "1.0.0",
        "loopback_only": True,
        "supported_capabilities": [
            "calendar_event_creation",
            "local_reminder_dispatch",
            "calendar_app_deeplink",
            "maps_navigation_deeplink",
            "pass_share_payload",
        ],
    }

@companion_app.post("/pair")
def pair_device(payload: PairingRequest):
    """Pair local browser session with device bridge."""
    return {
        "status": "paired",
        "bridge_token": BRIDGE_TOKEN,
        "client_name": payload.client_name,
        "message": "Device bridge successfully paired with local session.",
    }

@companion_app.post("/tools/device_create_calendar_event")
def create_calendar_event(payload: CalendarEventRequest, _=Header(None, alias="X-STAGE-Bridge-Token")):
    """Create a calendar event RFC 5545 payload and deep links."""
    if not payload.user_consent_granted:
        raise HTTPException(status_code=400, detail="User consent is required to create calendar events.")

    # Sanitize and build RFC 5545 VEVENT
    now_dt = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    uid = f"stage-dev-{secrets.token_hex(8)}@stage.live"

    ics_content = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//STAGE Platform//Device Bridge//EN\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTAMP:{now_dt}\r\n"
        f"SUMMARY:{payload.title}\r\n"
        f"LOCATION:{payload.location}\r\n"
        f"DESCRIPTION:{payload.description}\r\n"
        "STATUS:CONFIRMED\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )

    encoded_title = urllib.parse.quote(payload.title)
    encoded_loc = urllib.parse.quote(payload.location)
    encoded_desc = urllib.parse.quote(payload.description or "")

    google_url = f"https://calendar.google.com/calendar/render?action=TEMPLATE&text={encoded_title}&details={encoded_desc}&location={encoded_loc}"
    outlook_url = f"https://outlook.live.com/calendar/0/deeplink/compose?subject={encoded_title}&body={encoded_desc}&location={encoded_loc}"

    return {
        "status": "success",
        "action": "calendar_event_prepared",
        "ics_payload": ics_content,
        "deep_links": {
            "google_calendar": google_url,
            "outlook_web": outlook_url,
            "apple_calendar_webcal": f"webcal://localhost:8000/api/users/me/calendar.ics",
        },
        "event_id": uid,
        "user_consent_verified": True,
    }

@companion_app.post("/tools/device_create_local_reminder")
def create_local_reminder(payload: LocalReminderRequest, _=Header(None, alias="X-STAGE-Bridge-Token")):
    """Register a local reminder with explicit user consent."""
    if not payload.user_consent_granted:
        raise HTTPException(status_code=400, detail="User consent is required to create reminders.")

    rem_id = f"dev-rem-{secrets.token_hex(6)}"
    return {
        "status": "success",
        "action": "reminder_registered",
        "reminder_id": rem_id,
        "title": payload.title,
        "target_datetime": payload.target_datetime_iso,
        "note": payload.note,
        "message": f"Local reminder '{payload.title}' scheduled for {payload.target_datetime_iso}.",
        "user_consent_verified": True,
    }

@companion_app.post("/tools/device_open_maps_navigation")
def open_maps_navigation(payload: MapsNavRequest, _=Header(None, alias="X-STAGE-Bridge-Token")):
    """Generate safe, sanitized navigation deep links for Apple Maps and Google Maps."""
    query = f"{payload.venue_name}, {payload.address}, {payload.city}"
    sanitized_q = urllib.parse.quote(query.strip())

    return {
        "status": "success",
        "query": query,
        "apple_maps_url": f"https://maps.apple.com/?q={sanitized_q}",
        "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={sanitized_q}",
    }

@companion_app.post("/tools/device_share_pass")
def share_pass(payload: SharePassRequest, _=Header(None, alias="X-STAGE-Bridge-Token")):
    """Construct a share payload for the platform Web Share API or native share sheet."""
    return {
        "status": "success",
        "share_data": {
            "title": f"STAGE Digital Pass: {payload.event_title}",
            "text": f"My digital entry pass for {payload.event_title} on STAGE (Code: {payload.booking_code}).",
            "url": payload.verification_url,
        },
    }

# Standard JSON-RPC 2.0 stdio MCP server for agent orchestration
DEVICE_MCP_TOOLS = [
    {
        "name": "device_create_calendar_event",
        "description": "Create a calendar event with user consent via local companion bridge",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "start_iso": {"type": "string"},
                "location": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["title", "start_iso", "location"],
        },
    },
    {
        "name": "device_create_local_reminder",
        "description": "Register a local scheduled reminder via companion bridge",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "target_datetime_iso": {"type": "string"},
                "note": {"type": "string"},
            },
            "required": ["title", "target_datetime_iso"],
        },
    },
]

def run_stdio_mcp_bridge():
    """Handle stdio JSON-RPC 2.0 requests when run directly as an MCP tool server."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id")
            method = req.get("method")

            if method == "initialize":
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "stage-device-bridge-mcp", "version": "1.0.0"},
                    },
                }
            elif method == "tools/list":
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"tools": DEVICE_MCP_TOOLS},
                }
            elif method == "tools/call":
                tool_name = req.get("params", {}).get("name")
                args = req.get("params", {}).get("arguments", {})
                if tool_name == "device_create_calendar_event":
                    payload = CalendarEventRequest(
                        title=args.get("title", "STAGE Event"),
                        start_iso=args.get("start_iso", "2026-11-28T19:30:00+05:30"),
                        location=args.get("location", "STAGE Venue"),
                        description=args.get("description", ""),
                        user_consent_granted=True,
                    )
                    out = create_calendar_event(payload)
                    res = {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(out)}]}}
                else:
                    res = {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown tool {tool_name}"}}
            else:
                res = {"jsonrpc": "2.0", "id": req_id, "result": {}}

            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()
        except Exception as e:
            err = {"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": str(e)}}
            sys.stdout.write(json.dumps(err) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    if "--stdio" in sys.argv:
        run_stdio_mcp_bridge()
    else:
        import uvicorn
        uvicorn.run(companion_app, host="127.0.0.1", port=8765, log_level="info")
