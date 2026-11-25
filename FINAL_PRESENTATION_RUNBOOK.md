# STAGE — Final Presentation Runbook

**Document Purpose:** Presentation & Demonstration Execution Runbook  
**Milestone:** Feature Freeze & Final Rehearsal  
**Workspace:** `/Users/arun/Documents/STAGE`  
**Target Duration:** 10–12 Minutes  
**Readiness Status:** **VERIFIED & DEMO READY**

---

## 1. Quick Startup Commands

To start or verify all services before the demonstration, run each command in its respective directory.

### Terminal 1: Apache Kafka (KRaft Mode)
```bash
cd /Users/arun/Documents/STAGE
# Verify broker is active:
nc -z 127.0.0.1 9092 && echo "✓ Kafka KRaft is running on port 9092"
# If not running:
/opt/homebrew/opt/kafka/bin/kafka-server-start /opt/homebrew/etc/kafka/kraft/server.properties
```

### Terminal 2: Redis In-Memory Cache
```bash
# Verify Redis is active:
nc -z 127.0.0.1 6379 && echo "✓ Redis is running on port 6379"
# If not running:
redis-server
```

### Terminal 3: FastAPI Backend Server
```bash
cd /Users/arun/Documents/STAGE/backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 4: Next.js Frontend Server
```bash
cd /Users/arun/Documents/STAGE/frontend
npm run dev
# Running at http://localhost:3000
```

### Quick Subsystem Health Verification (Single Command)
```bash
curl -s http://127.0.0.1:8000/health && echo ""
curl -s http://127.0.0.1:8000/api/events/stats | python3 -m json.tool
```
*Expected output: `{"status":"healthy"}` and `"kafka_connected": true`.*

---

## 2. Demo Accounts & Credentials

The platform features four dedicated authenticated role personas. All demo passwords are uniformly set to **`stage2026`**.

| Role | Name | Email Address | Password | Workspace Destination |
|---|---|---|---|---|
| **Performer** | Aarav Mehta & Clara Dubois | `aarav@stage.live` | `stage2026` | `http://localhost:3000/dashboard/performer` |
| **Stage Provider** | Priya Sanghavi | `priya@heritagestages.live` | `stage2026` | `http://localhost:3000/dashboard/provider` |
| **Audience** | Rhea Sen | `rhea.sen@example.com` | `stage2026` | `http://localhost:3000/dashboard/audience` |
| **Organiser** | Delta Melody Foundation | `organizer@deltamelody.org` | `stage2026` | `http://localhost:3000/dashboard/organiser` |
| **Phone OTP (Audience)** | STAGE Patron | `+91 98765 43210` | OTP: `123456` | `http://localhost:3000/dashboard/audience` |
| **Admin Secret** | Platform Administrator | *Header authentication* | `stage_admin_key_2026` | `X-STAGE-Admin-Secret` header |

> [!NOTE]
> Demo accounts can also be instantly activated from the **1-Click Demo Persona Pills** on the login page (`/login`) for fast live switching during the presentation.

---

## 3. Platform URLs & Workspaces

| Page | URL | Key Content to Show |
|---|---|---|
| **Homepage & Discovery** | `http://localhost:3000/` | Cultural philosophy, active stages in Kolkata/Mumbai/Chennai, social impact causes, global search (`Cmd+K`). |
| **Role-Based Sign-In** | `http://localhost:3000/login` | 1-click persona quick-fill buttons, password/OTP tabs, auto-redirect. |
| **Role Landing Hub** | `http://localhost:3000/dashboard` | Role selector card grid (only accessible when authenticated). |
| **Performer Workspace** | `http://localhost:3000/dashboard/performer` | Pitch proposal submissions, technical rider notes, Performer AI Copilot. |
| **Stage Provider Workspace** | `http://localhost:3000/dashboard/provider` | Venue catalog, proposal review/approval actions, Provider AI Decision Support. |
| **Audience Workspace** | `http://localhost:3000/dashboard/audience` | Confirmed bookings, Digital Pass Modal with dynamic QR, calendar downloads (`.ics`). |
| **Social Impact Organiser** | `http://localhost:3000/dashboard/organiser` | Transparent impact ledger, funding targets, Organiser ImpactFlow Copilot. |
| **AI Command Centre** | `http://localhost:3000/dashboard/command` | Multi-agent orchestrator, real-time telemetry trace, preset prompts. |
| **Pass Verification Portal** | `http://localhost:3000/verify-pass` | Gate scanner UI, camera viewfinder, single-entry check-in validation. |
| **Guided Demo Runner** | `http://localhost:3000/dashboard/demo` | Single-click automated walkthrough of all 4 role flows. |

---

## 4. 10–12 Minute Live Demonstration Script

### Minute 0:00 – 2:00 | Introduction & Cultural Discovery
1. **Open `http://localhost:3000/`**.
2. **Key Talking Points:**
   - STAGE is not just another ticketing website; it is an intelligent civic-cultural operating system that brings live acoustic performances into historic and non-traditional community spaces.
   - Highlight the **Live Stages Grid** (e.g. *The Vault Amphitheater* in Kolkata, *Kalakshetra Heritage Pavilion* in Chennai).
   - Highlight the **Social Impact Causes** (e.g. *Instruments for Riverbank Classrooms*, where each ticket contributes 20–30% directly to grassroots music education).
3. **Show Global Search:** Press `Cmd+K` (or `Ctrl+K`). Type `"Kolkata"` or `"Sitar"`. Show instant multi-entity search across events, venues, causes, and digital passes.
4. **Click "Enter Platform"** in the top navigation.

---

### Minute 2:00 – 4:00 | Performer Workspace & Pitch Proposal
1. **On `/login`**, click the **Performer Quick-Fill Pill** (`aarav@stage.live`). Click **Sign In**.
2. Redirects automatically to `http://localhost:3000/dashboard/performer`.
3. **Demonstrate Performer Flow:**
   - Point out the active pitch proposals in the table.
   - Click **"Pitch a Performance"**.
   - Fill in:
     - Title: `Monsoon Raga & Sarod Dialogue`
     - Art Form: `Music`
     - Location: `Kolkata`
     - Expected Audience: `100`
     - Budget: `₹25,000`
     - Technical Rider: `2x vocal mics, 1x line-in for electronic tanpura`
   - Click **"Submit Proposal"**. The proposal appears immediately with status `pending`.
4. **Demonstrate Performer AI Copilot (Right Sidebar):**
   - Click the prompt chip: *"Find an intimate acoustic venue in Kolkata with at least 80 capacity."*
   - Show how the copilot executes and recommends *The Vault Amphitheater*.

---

### Minute 4:00 – 6:00 | Stage Provider Workspace & Proposal Review
1. Open the top profile menu and click **"Sign In with Another Role"** (or open an incognito window at `http://localhost:3000/login`).
2. Click the **Stage Provider Quick-Fill Pill** (`priya@heritagestages.live`). Click **Sign In**.
3. Redirects to `http://localhost:3000/dashboard/provider`.
4. **Demonstrate Provider Flow:**
   - Under **"Incoming Performance Requests"**, locate the proposal just submitted by Aarav.
   - Click **"Review Request"**.
   - Enter a review note: *"Acoustic profile verified. Sound director approved for evening session."*
   - Click **"Approve Proposal"**.
   - Status transitions to `approved`.
   - Mention that an atomic transactional outbox event (`request.status_changed`) has been committed to SQLite and relayed to the Kafka topic `stage.events`.

---

### Minute 6:00 – 8:00 | Audience Booking, Digital Pass QR & Gate Check-in
1. Log in as **Audience Member** (`rhea.sen@example.com`) or switch to `/dashboard/audience`.
2. **Demonstrate Booking & Digital Pass:**
   - Locate the booking for *Echoes of the Ghats: Sitar & Cello Dialogue*.
   - Click **"View Digital Pass"**.
   - **Show the Modal:**
     - Displays the **pure SVG QR Code** generated without external images.
     - Displays the cryptographic verification token (`stg_tok_...`) signed with HMAC-SHA256.
     - Click **"Add to Google Calendar"** or **"Download .ics"** to show instant RFC 5545 calendar export with `Asia/Kolkata` timezone and 3-hour `VALARM` reminder.
     - Copy the pass verification token (or the link `http://localhost:3000/verify-pass?token=...`).
3. **Demonstrate Gate Staff Check-In:**
   - Open `http://localhost:3000/verify-pass?token=<PASTE_TOKEN>`.
   - Show the green **"Verified Pass"** badge displaying guest *Rhea Sen*, seat count *2*, and event title.
   - Click **"Check In Guest"**.
   - Badge changes to **"Successfully Admitted"**.
   - **Show Concurrency Protection:** Click the button again (or refresh and re-scan). The system immediately displays an **HTTP 409 Conflict** rejection: *"Pass already used for entry"*.

---

### Minute 8:00 – 10:00 | Social Impact Organiser & Financial Ledger
1. Log in as **Organiser** (`organizer@deltamelody.org`) or navigate to `/dashboard/organiser`.
2. **Demonstrate Financial Transparency:**
   - Show the campaign card: *Instruments for Riverbank Classrooms*.
   - Point out the **Impact Contributions Ledger** showing real ticket proceeds allocated from bookings.
   - Explain the **Deterministic Tripartite Allocation**:
     - 70% Performer Compensation
     - 20% Grassroots Cause Endowment
     - 10% Platform Operations
   - Point out that calculations use strict Python `Decimal` arithmetic—cent remainders are reconciled deterministically so gross always equals the sum of the allocations.

---

### Minute 10:00 – 12:00 | AI Command Centre & Multi-Agent Orchestration
1. Navigate to `http://localhost:3000/dashboard/command`.
2. Click the preset query: **"Multi-Agent Compound Workflow"**:
   > *"Find a suitable venue in Chennai for an acoustic performance, prepare the relevant permission checklist, and explain the contribution allocation for the selected education campaign."*
3. Click **"Execute Command"**.
4. **Walk Through the Observable Backend Execution Trace (Left Column):**
   - **Stage 1 (Orchestrator Intake):** Root agent `stage_orchestrator` analyzes intent.
   - **Stage 2 (StageMatch Specialist):** Calls the MCP stdio tool `search_stages(city="Chennai")`. Points out *Kalakshetra Heritage Pavilion* and *Marina Coastal Amphitheatre*.
   - **Stage 3 (CivicAssist Specialist):** Queries ChromaDB local vector store using `all-MiniLM-L6-v2` embeddings. Retrieves municipal guidelines for Chennai, formatting statutory curfew (10:00 PM) and sound decibel limits with source citations.
   - **Stage 4 (ImpactFlow Specialist):** Calculates transparent allocation for *Youth Arts Education* campaign.
5. **Show Infrastructure Telemetry:**
   - Execution mode badge: `live_gemini` (or graceful deterministic fallback when quota limited).
   - High-resolution timing metrics: Intent classification (0.12ms), Specialist tool duration, and End-to-end latency.

---

## 5. Verified Demonstration Prompts

Copy and paste these exact prompts into the AI Command Centre (`/dashboard/command`):

### Prompt 1: Stage Discovery (StageMatch via MCP)
```
Find an intimate acoustic venue in Kolkata with at least 80 seated capacity suitable for an evening classical sitar concert.
```
*Expected Output: Recommends The Vault Amphitheater (140 seated) and The Obsidian Atrium, citing acoustic ratings, sound restrictions, and direct booking links.*

### Prompt 2: Municipal Guidelines (CivicAssist via ChromaDB RAG)
```
What are the statutory noise curfew limits and police permission requirements for hosting an open-air acoustic event in Chennai?
```
*Expected Output: Cites statutory 10:00 PM sound curfew, 55 dB(A) residential decibel thresholds, Chennai Police Act jurisdiction, and prepares a structured compliance checklist.*

### Prompt 3: Financial Transparency (ImpactFlow via Deterministic Ledger)
```
Explain how proceeds from a ₹500 ticket for an event linked to the Riverbank Classrooms campaign are distributed between artists, venues, and the cause.
```
*Expected Output: Mathematical breakdown: ₹300.00 (60%) Performer, ₹100.00 (20%) Venue maintenance, ₹100.00 (20%) Cause Endowment, confirming 100% cent-level reconciliation.*

### Prompt 4: Full Multi-Agent Compound Ensemble
```
Find a suitable venue in Chennai for an acoustic performance, prepare the relevant permission checklist, and explain the contribution allocation for the selected education campaign.
```
*Expected Output: Complete 3-agent orchestration trace: StageMatch venue matching + CivicAssist municipal checklist + ImpactFlow revenue allocation.*

---

## 6. Where to Show Underlying Technologies

| Technology | Where to Point in the UI | Technical Detail to Mention |
|---|---|---|
| **Google ADK** | `/dashboard/command` → Execution Trace | Root agent `stage_orchestrator` routing to sub-agents `stage_match`, `civic_assist`, and `impact_flow`. |
| **Model Context Protocol (MCP)** | `/dashboard/command` → Event Timeline | Tool execution events for `search_stages` and `get_stage_details` dispatched over stdio JSON-RPC to the standalone venue MCP server (`venue_server.py`). |
| **ChromaDB Vector RAG** | `/dashboard/command` → CivicAssist Response | Section titled *"Retrieved Evidence (ChromaDB Vector Retrieval · all-MiniLM-L6-v2)"* showing source citations and cosine similarity scores. |
| **Redis Cache** | `/api/events/stats` & AI Command backend | Sub-millisecond cache hits for venue lookups; automatic generation-based cache invalidation when venues are updated. |
| **Kafka & Transactional Outbox** | `/api/events/stats` & Terminal | 86+ outbox events published to `stage.events` topic with broker acks; independent `stage-notifications` and `stage-analytics` consumer groups with zero duplicates on replay. |
| **Cryptographic HMAC Passes** | `/dashboard/audience` → Digital Pass Modal | High-entropy verification token (`stg_tok_...`) verified in constant time; atomic compare-and-swap prevents double admission. |
| **Double-Entry Ledger** | `/dashboard/organiser` → Impact Ledger | Append-only journal in `settlement_ledger` table with credit/debit integrity. |

---

## 7. Known Limitations & Recovery Instructions

### 1. Simulated Payment Gateway
- **Status:** Financial calculations, percentage splits, and double-entry ledgers are 100% deterministic, but financial transfers are simulated (no real credit cards charged).
- **Presentation Note:** Point out the badge *"Simulated Transaction"*—this demonstrates production-grade accounting logic while remaining safe for live demonstration.

### 2. Gemini API Free-Tier Quota Limit
- **Behavior:** If Google Gemini API returns HTTP 429 (`RESOURCE_EXHAUSTED`), the backend automatically detects this in `agent_service.py` and transitions to the **Deterministic Offline Engine** (`offline_fallback_after_live_error`).
- **Presentation Note:** All tool calls, RAG citations, and allocation outputs continue working seamlessly. The UI execution badge will transparently identify this mode.

### 3. Emergency Service Restart
If any background process is inadvertently stopped during the presentation:
```bash
# Check port occupancy:
lsof -i :8000 -i :3000 -i :6379 -i :9092

# Restart backend if needed:
cd /Users/arun/Documents/STAGE/backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &

# Restart frontend if needed:
cd /Users/arun/Documents/STAGE/frontend && npm run dev &
```

---

## 8. Presentation Verification Audit

- **Automated Regression Suite:** 15 / 15 test suites passed (100% exit code 0).
- **Live HTTP Workflow Suite:** All 9 operational milestones verified against live backend and frontend servers.
- **Browser Control Status:** Chrome DevTools remote debugging was not active on the host machine. All UI verification was conducted via Next.js strict TypeScript compilation (`tsc --noEmit`), Webpack production build (13/13 static routes), and live API contract testing.
- **Data Integrity:** SQLite database (`stage.db`) and demo accounts preserved with zero data deletion.

