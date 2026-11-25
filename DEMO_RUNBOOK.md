# STAGE — Live Demonstration Runbook

> **Target Duration:** 10–15 minutes  
> **Platform Version:** STAGE Milestone 7.3 (Demo Ready)  
> **Verified Stack:** FastAPI (Python 3.12), Google ADK 2.15.0, MCP SDK 2.3.0, Apache Kafka 4.4.0 (KRaft), Redis 8.12.0, SQLite (WAL mode), ChromaDB, Next.js 16.4.6 (React 19).

---

## 1. System Architecture & Prerequisites

### Infrastructure Requirements
- **macOS (Apple Silicon / Intel)**
- **Python 3.12 virtual environment:** `~/Documents/STAGE/backend/.venv`
- **Node.js 20+ / npm:** `~/Documents/STAGE/frontend/node_modules`
- **Apache Kafka 4.4.0 (KRaft mode):** Installed via Homebrew (`/opt/homebrew/opt/kafka`)
- **Redis 8.12.0:** Installed via Homebrew (`/opt/homebrew/opt/redis`)
- **Persistent SQLite Database:** `~/Documents/STAGE/backend/stage.db`
- **ChromaDB Vector Store:** `~/Documents/STAGE/backend/data/chroma_db`

---

## 2. Startup Order & Exact Commands

Start services strictly in the following sequence across 4 separate terminal tabs/windows:

```
[Tab 1: Redis] ➔ [Tab 2: Kafka Broker] ➔ [Tab 3: FastAPI Backend] ➔ [Tab 4: Next.js Frontend]
```

### Step 1: Redis Server
In Terminal 1:
```bash
# If not already running as a service
redis-server /opt/homebrew/etc/redis.conf
```
*Alternatively, verify background service:*
```bash
brew services start redis
```

### Step 2: Apache Kafka Broker (KRaft Mode)
In Terminal 2:
```bash
/opt/homebrew/opt/kafka/bin/kafka-server-start /opt/homebrew/etc/kafka/server.properties
```
*Note: Do not restart or reformat the storage directory if Kafka is already running.*

### Step 3: FastAPI Backend (Port 8000)
In Terminal 3:
```bash
cd ~/Documents/STAGE/backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 4: Next.js Frontend (Port 3000)
In Terminal 4:
```bash
cd ~/Documents/STAGE/frontend
npm run dev
```

---

## 3. Pre-Flight Health Checks

Run these commands to verify every layer before opening the browser:

```bash
# 1. Check Redis Ping
redis-cli ping
# Expected: PONG

# 2. Check Kafka Port & stage.events Topic
nc -vz 127.0.0.1 9092
/opt/homebrew/bin/kafka-topics --bootstrap-server 127.0.0.1:9092 --describe --topic stage.events
# Expected: PartitionCount: 3, ReplicationFactor: 1

# 3. Check Backend Health & Event Bus Observability
curl -s http://127.0.0.1:8000/health
# Expected: {"status":"healthy"}

curl -s http://127.0.0.1:8000/api/events/stats
# Expected: {"status":"healthy","kafka_connected":true,"broker":"127.0.0.1:9092","topic":"stage.events",...}

# 4. Check Frontend Route Availability
curl -sI http://localhost:3000 | head -n 1
# Expected: HTTP/1.1 200 OK
```

---

## 4. 10–15 Minute Live Demonstration Script

Open Google Chrome or Safari to: **`http://localhost:3000`**

```
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE LIVE DEMONSTRATION TIMELINE (12 MINUTES)                         │
│ 00:00–02:00: Platform Overview & Role Switcher                         │
│ 02:00–04:30: Role 1 — Performer Pitch & Stage Discovery                │
│ 04:30–06:30: Role 2 — Stage Provider Review & Venue Listing            │
│ 06:30–08:30: Role 3 — Audience Ticketing & Dynamic Seat Decoupling     │
│ 08:30–10:00: Role 4 — Social Impact Campaign & Proceeds Allocation     │
│ 10:00–12:00: AI Command Centre, MCP Tools & Kafka Bus Observability    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Segment 1: Platform Overview & Landing Page (2 mins)
1. **Navigate to:** `http://localhost:3000/`
2. **Talking Points:**
   - *"STAGE is a multi-agent civic cultural platform connecting artists, venue stewards, audiences, and social impact causes."*
   - Point out the unified mission: *"Where talent meets purpose."*
3. **Role Cards:** Show the 4 role portals on the landing page:
   - **Performer** (`Aarav Mehta`)
   - **Stage Provider** (`Priya Sanghavi`)
   - **Audience** (`Rhea Sen`)
   - **Organiser** (`Delta Melody Foundation`)
4. Click **"Launch Demo Hub"** or navigate to `http://localhost:3000/dashboard`.

---

### Segment 2: Role 1 — Performer Workspace (2.5 mins)
1. **Navigate to:** `http://localhost:3000/dashboard/performer` (or click *Performer* in header).
2. **Demonstrate Stage Discovery:**
   - Show available Kolkata & Mumbai performance spaces.
   - Filter by art form: *Classical Indian Music & Fusion*.
3. **Submit a Performance Request:**
   - Click **"Pitch a Performance"** button.
   - Fill in:
     - **Title:** `Monsoon Raga Recital`
     - **Art Form:** `Music`
     - **Stage:** Select `The Vault Amphitheater`
     - **Expected Audience:** `120`
     - **Target Date:** Upcoming weekend
   - Click **"Submit Pitch"**.
4. **Instant Verification:**
   - The pitch immediately appears in the *Outgoing Pitches* table with status **Pending Review**.
   - Note to audience: *"Under the hood, this mutation recorded an atomic event in the SQLite transactional outbox for Kafka publication."*

---

### Segment 3: Role 2 — Stage Provider Workspace (2 mins)
1. **Navigate to:** `http://localhost:3000/dashboard/provider` (or switch role via header dropdown).
2. **Review Incoming Pitch:**
   - In *Incoming Performer Pitches*, locate Aarav Mehta's `Monsoon Raga Recital`.
3. **Approve Request:**
   - Click the green **Approve** button on the pitch card.
   - Host review note is automatically recorded: `Approved by venue host. Technical sound check scheduled.`
   - Status transitions instantly to **Approved** with a confirmation toast.
4. **Create a New Stage Venue (Optional / Quick Demo):**
   - Click **"Add New Venue"**.
   - Enter Name: `The Banyan Court Glasshouse`
   - Select Venue Type, City: `Kolkata`, Capacity: `150 seated`.
   - Click **"Register Venue"**.
   - Point out: *"The venue search cache was invalidated cleanly; durable generation was incremented in SQLite."*

---

### Segment 4: Role 3 — Audience Experience & Digital Passes (2 mins)
1. **Navigate to:** `http://localhost:3000/dashboard/audience`.
2. **Discover Upcoming Performances:**
   - Locate `Echoes of the Ghats: Sitar & Cello Dialogue` at *The Vault Amphitheater*.
   - Point out the current seat count (e.g., 22 seats remaining).
3. **Book Pass:**
   - Click **"Book Pass"** directly on the event card.
   - Instant reservation confirms 1 pass for logged-in audience member *Rhea Sen* (`rhea.sen@example.com`).
   - Confirmation toast displays: `Reserved 1 pass for 'Echoes of the Ghats'! Booking reference: STG-XXXX-KOL`.
4. **Decoupled Ticket & Seat Reconcile:**
   - Available seats automatically decrement by 1 in real time.
   - Switch to the **"Passes & Bookings"** tab or click **"View Digital Pass"** to show the simulated QR admission pass.
   - Explain: *"All payments, ticketing proceeds, and contributions are simulated demonstration figures."*
   - 30% of gross proceeds is automatically allocated to the linked cause (*Acoustic Instruments for Coastal Schools*).

---

### Segment 5: Role 4 — Social Impact Campaign Hub (1.5 mins)
1. **Navigate to:** `http://localhost:3000/dashboard/organiser`.
2. **Campaign Ledger & Impact Transparency:**
   - Show active campaigns (e.g., *Preserving Delta Folk & Classical Traditions*).
   - Show the real-time **Contributions Ledger**: point out the impact contributions generated by audience bookings.
3. **Launch Quick Fellowship Campaign:**
   - Click **"Create Campaign"**.
   - Fill in:
     - **Title:** `Handcrafted Tanpura Restoration`
     - **Tagline:** `Preserving heritage string craftsmanship for rural academies.`
     - **Target Amount:** `₹300,000`
     - **Focus Area:** Select `Instrument Fellowship & Youth Access`
   - Click **"Publish Campaign"**.
   - The campaign immediately appears under active campaigns with real-time persistence.

---

### Segment 6: AI Command Centre & Architecture Tour (3 mins)
1. **Navigate to:** `http://localhost:3000/dashboard/command`.
2. **Prompt 1: Multi-Agent Venue Matching:**
   - Click the preset pill **"Chennai Stage Matching"** or enter: `Find an acoustic stage in Kolkata suitable for an Indian classical sitar duo.`
   - Click **"Execute Command"**.
   - **Show Observability Trace:**
     - Orchestrator handoff ➔ `stage_match` specialist.
     - Execution of MCP read-only tool `search_stages` via Model Context Protocol.
     - Deterministic 5-dimension compatibility score (scored 100/100 for high-compatibility venues like *The Obsidian Atrium* based on location, intimate capacity, art form, and budget).
3. **Prompt 2: CivicAssist Semantic RAG:**
   - Click the preset pill **"Civic Permission & Curfew Guidance"** or enter: `What are the sound limit regulations and curfew times for outdoor acoustic performances in Chennai?`
   - Click **"Execute Command"**.
   - **Show Output & Legal Boundary Disclaimer:**
     - Orchestrator handoff ➔ `civic_assist`.
     - ChromaDB vector retrieval from identifiable demonstration corpus (`DOC-CIVIC-001`).
     - Citation to *SEC-2.3: Decibel Thresholds & Nighttime Silence Hours (10:00 PM standard silence boundary)*.
     - Explicitly state: *"CivicAssist operates strictly over an identifiable demonstration corpus and does not constitute formal legal counsel."*
4. **Execution Mode & Observability Telemetry:**
   - Point out the mode badge:
     - Reports `live_gemini` when external Google Gemini inference succeeds.
     - Transparently reports `offline_deterministic` or `offline_fallback_after_live_error` when Gemini API quota limits (HTTP 429) are active, demonstrating zero downtime and full offline resilience.
5. **Kafka Bus Observability:**
   - Switch to browser tab or terminal: `http://127.0.0.1:8000/api/events/stats`.
   - Demonstrate:
     - Broker connected to `127.0.0.1:9092` topic `stage.events`.
     - Outbox published count matches all business mutations.
     - Independent consumer groups (`stage-notifications`, `stage-analytics`) processed events without duplicate delivery.
3. **Prompt 2: CivicAssist Semantic RAG:**
   - Enter: `What are the sound limit regulations and curfew times for outdoor acoustic performances in Chennai?`
   - Click **Execute Command**.
   - **Show Output:**
     - Orchestrator handoff ➔ `civic_assist`.
     - ChromaDB vector retrieval from identifiable corpus (`DOC-CIVIC-001`).
     - Citation to *SEC-2.3: Decibel Thresholds & Nighttime Silence Hours (10:00 PM standard silence boundary)*.
4. **Architecture & Kafka Observability:**
   - Switch back to terminal or browser tab: `http://127.0.0.1:8000/api/events/stats`.
   - Demonstrate:
     - Broker connected to `127.0.0.1:9092`.
     - Outbox published count matches business mutations.
     - Independent consumer groups (`stage-notifications`, `stage-analytics`) processed events without duplicate delivery.

---

## 5. Important API Endpoints Reference

| Endpoint | Method | Purpose |
|---|:---:|---|
| `/health` | `GET` | Platform liveness and database sanity check |
| `/api/events/stats` | `GET` | Outbox metrics, consumer groups, and Kafka connectivity |
| `/api/venues` | `GET`, `POST` | List registered stages / Register new venue |
| `/api/requests` | `GET`, `POST` | Performer pitch submissions and status tracking |
| `/api/requests/{id}/status` | `PATCH` | Provider approval / rejection decision |
| `/api/events` | `GET` | Public event schedules with dynamic seat counts |
| `/api/bookings` | `POST`, `GET` | Audience ticketing and digital pass generation |
| `/api/causes` | `GET`, `POST` | Cultural preservation campaigns |
| `/api/contributions` | `GET` | Transparent public impact allocation ledger |
| `/api/ai/command` | `POST` | Multi-agent ADK Command Centre (Gemini / Offline fallback) |

---

## 6. Known Limitations & Fallback Behavior

1. **Google Gemini Quota / Network Fallback:**
   - **Behavior:** If Google Gemini encounters rate limits (HTTP 429) or upstream latency, STAGE automatically engages its **deterministic offline fallback engine**.
   - **Observability:** Telemetry transparently reports `execution_mode: offline_fallback_after_live_error` or `offline_deterministic`. Venue discovery, matching algorithms, and civic RAG guidelines continue to operate with 100% functionality.
2. **Restricted Terminal Sandbox Sockets:**
   - Standard sandbox mode restricts localhost socket connect (`Operation not permitted`). Production and live demonstration commands should run directly on the host shell or with standard environment permissions.
3. **Demo Isolation:**
   - Regression tests automatically run against temporary isolated SQLite databases (`test_e2e_*.db`) so that running tests never wipes or mutates the live demonstration data.

---

## 7. Troubleshooting Guide

### Issue A: Port 8000 Already in Use
```bash
# Identify and terminate stale uvicorn instance
lsof -i :8000
kill -9 <PID>
# Restart backend
cd ~/Documents/STAGE/backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Issue B: Port 3000 Already in Use
```bash
lsof -i :3000
kill -9 <PID>
cd ~/Documents/STAGE/frontend && npm run dev
```

### Issue C: Kafka Broker Disconnected
```bash
# Verify broker port
nc -vz 127.0.0.1 9092
# If down, start KRaft broker:
/opt/homebrew/opt/kafka/bin/kafka-server-start /opt/homebrew/etc/kafka/server.properties
```

### Issue D: Redis Cache Offline
```bash
# Check ping
redis-cli ping
# If down, start Redis:
brew services restart redis
# Note: Platform automatically falls back to direct SQLite queries if Redis is offline.
```

---

## 8. Clean Shutdown Procedure

When the demonstration concludes, cleanly stop the services in reverse order:

1. **Next.js:** Press `Ctrl + C` in Terminal 4.
2. **FastAPI Backend:** Press `Ctrl + C` in Terminal 3 (triggers graceful lifespan context cleanup for outbox publisher and consumer workers).
3. **Kafka Broker:** Press `Ctrl + C` in Terminal 2 (flushes KRaft metadata log cleanly).
4. **Redis Server:** `brew services stop redis` or `Ctrl + C` in Terminal 1.

