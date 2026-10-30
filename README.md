# 🧠 SynapseMem — Memory-Powered Team Assistant

[![Node.js](https://img.shields.io/badge/Node.js-v22%2B%20%7C%20v24%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Database](https://img.shields.io/badge/Database-Native%20node%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![Dependencies](https://img.shields.io/badge/Dependencies-Zero%20External%20Bloat-success)](package.json)
[![Vector Search](https://img.shields.io/badge/Retrieval-128d%20Dense%20Vectors%20%2B%20BM25-blueviolet)](src/vector-search.js)
[![Tests](https://img.shields.io/badge/Tests-6%2F6%20Passing-brightgreen)](src/test-suite.js)
[![Status](https://img.shields.io/badge/Grounding-100%25%20Memory%20Verified-indigo)](src/recall-engine.js)

> **A memory-powered assistant that sits in front of a team’s conversations, remembers structured decisions, recalls facts from stored memory (not chat history), keeps memory honest through automatic superseding and temporal expiry, and fully explains itself via an Inspect panel.**

---

## 📑 Table of Contents

- [The Core Problem](#-the-core-problem)
- [How SynapseMem Works: Traditional vs. Memory-Powered](#-traditional-chatbots-vs-synapsemem)
- [The 4 Core Pillars](#-the-4-core-pillars)
  - [1. Remembers (Structured Extraction)](#1--remembers-structured-extraction)
  - [2. Recalls (Pure Memory Grounding)](#2--recalls-pure-memory-grounding)
  - [3. Keeps Memory Honest (Superseding & Expiry)](#3--keeps-memory-honest-superseding--expiry)
  - [4. Explains Itself (The Inspect Panel)](#4--explains-itself-the-inspect-panel)
- [Interactive UI & Feature Walkthrough](#-interactive-ui--feature-walkthrough)
- [Quick Start Guide](#-quick-start-guide)
- [Automated Verification Test Suite](#-automated-verification-test-suite)
- [REST API Reference & Examples](#-rest-api-reference)
- [Project Architecture & File Tree](#-project-architecture)
- [Design Principles & Technology Highlights](#-design-principles)

---

## 🌟 The Core Problem

Teams make dozens of critical decisions every week in chat channels and meeting threads:
- *"We’re using Postgres because the team knows SQL."*
- *"The demo is on Friday because executive stakeholders are visiting."*
- *"We're deploying to Vercel for preview branch environments."*

Weeks or months later:
1. **Chatbots forget everything** between sessions.
2. **Chatbots that claim to "remember" cheat** by pasting raw, noisy chat logs into prompt context.
3. **Chat history grows endlessly**, causing context window bloat, token wastage, and hallucinations.
4. **Raw history has no sense of time or lifecycle**: it never knows when a decision was superseded (e.g. switching to MongoDB) or when an assumption expired (e.g. the demo date has already passed).

---

## ⚡ Traditional Chatbots vs. SynapseMem

```
TRADITIONAL APPROACH (Fragile & Hallucination-Prone):
=====================================================
User Chat ──> [Append to endless Raw Transcript] ──> [Paste Entire Chat Log into LLM Prompt]
                                                           │
                                                           ▼
                                         ❌ Hallucinates old outdated facts
                                         ❌ Never knows when "Friday demo" expired
                                         ❌ Confuses previous "Postgres" with new "MongoDB"

SYNAPSEMEM APPROACH (Deterministic, Structured & Auditable):
=============================================================
User Chat ──> [NLP & Heuristic Extractor] ──> Structured Memory Ledger (Native SQLite)
                                                        │
                      ┌─────────────────────────────────┴───────────────────────────────┐
                      ▼                                                                 ▼
           [Supersede Engine]                                                  [Temporal Engine]
(Postgres ➔ marked SUPERSEDED;                                       ("Demo is Friday" ➔ auto-EXPIRES
 MongoDB ➔ marked ACTIVE)                                             when clock passes Friday)
                      │                                                                 │
                      └─────────────────────────────────┬───────────────────────────────┘
                                                        ▼
Later Query ──> [Hybrid 128d Vector + BM25 Search] ──> [Strict Active Filters Enforced]
                                                        │
                                                        ▼
                 [Crisp Grounded Answer]  +  [Side-by-Side Inspect Panel Explains Scores & Proof]
```

---

## 🏛️ The 4 Core Pillars

### 1. 🧠 Remembers (Structured Extraction)

When anyone shares a decision in any team channel:
> *"We’re using Postgres because the team knows SQL."*

The extraction engine ([`src/memory-engine.js`](src/memory-engine.js)) immediately parses the text without requiring external API keys and extracts a structured schema:

```json
{
  "id": "mem_1793367983622_49baad",
  "topic": "Database",
  "decision": "We’re using Postgres",
  "reason": "The team knows SQL",
  "owner": "Sarah (Tech Lead)",
  "created_at": "2026-10-30T10:00:00.000Z",
  "type": "decision",
  "status": "active",
  "valid_until": null,
  "confidence": 0.98,
  "tags": ["database", "postgres", "sql"],
  "vector": [0.124, -0.043, 0.312, ...]  // 128-dimensional dense semantic embedding
}
```

- **Visual Feedback:** An animated emerald chip appears directly underneath the message in the chat thread: `[💡 Memory Extracted: Database]`. Clicking it instantly highlights the memory in the Ledger.

---

### 2. 🔍 Recalls (Pure Memory Grounding)

In any later session or dedicated query channel (e.g. `#ask-assistant`), you can ask:
> *"What database are we using and why?"*

- **Pure Memory Retrieval:** Performs hybrid search combining **128-dimensional dense vector cosine similarity** with **BM25 lexical overlap** strictly against stored memory records.
- **Zero Chat Noise:** Raw transcripts are **never dumped into the prompt**.
- **Direct Synthesis:**
  > *"We are using Postgres because the team knows SQL. (Decided by Sarah (Tech Lead))"*
- **Clickable Attribution:** Features an `[Inspect Retrieval]` button directly on the assistant's reply.

---

### 3. 🛡️ Keeps Memory Honest (Superseding & Expiry)

Memories are not static strings—they are living team agreements that evolve and expire.

#### A. Automatic Conflict & Superseding
If a team member later posts:
> *"Actually, we’re switching to MongoDB because we need flexible JSON schema."*

1. The contradiction engine detects the collision in the `Database` domain.
2. The old decision (`Postgres`) is marked `SUPERSEDED` and updated with `superseded_by: mem_mongo`.
3. The new decision (`MongoDB`) is created with `status: active` and `supersedes_id: mem_postgres`.
4. Full historical lineage is preserved in SQLite for compliance and auditability.
5. When asked *"What database are we using and why?"*, the assistant answers with MongoDB and notes:
   > *(Note: This superseded our earlier decision on 30/10/2026: "We’re using Postgres")*

#### B. Temporal Expiry
Short-lived assumptions like *"The demo is on Friday"* or *"Code freeze until Nov 5"*:
1. The engine calculates an exact ISO `valid_until` deadline.
2. The memory remains `ACTIVE` until the deadline passes.
3. Once the deadline passes, the status automatically transitions to `EXPIRED`.
4. When recalled after expiry, the assistant responds honestly:
   > *"There was a previous assumption that 'The demo is on Friday', but this expired on 30/10/2026. No active assumption is currently recorded."*

#### C. Built-in Time Machine
The top header provides quick time jumps:
- `[Today: Oct 30, 2026]`
- `[+7d (Expire Demo)]` — fast-forwards 7 days past Friday to watch the Friday demo assumption expire in real-time.

#### D. Full User Corrections & Deletions (CRUD)
The **Memory Ledger** view enables users to edit any memory field (decision, reason, owner, expiry date, status) or delete records with an audit trail.

---

### 4. 🔬 Explains Itself (The Inspect Panel)

Every response from the assistant includes a transparent inspection panel:

```
+-----------------------------------------------------------+
| 🔍 INSPECT RETRIEVAL                                  [X] |
+-----------------------------------------------------------+
| Inspected Query: "What database are we using and why?"    |
| Intent: Active State Intent (Superseded memories excluded)|
+-----------------------------------------------------------+
| FILTERS EVALUATED:                                        |
|  • Status Filter: status == "active"             [PASSED] |
|  • Temporal Expiry: valid_until > now()          [PASSED] |
|  • Similarity Threshold: hybridScore >= 0.40     [PASSED] |
+-----------------------------------------------------------+
| SELECTED MEMORIES (USED IN ANSWER):                       |
|  [✓] Database: We're switching to MongoDB                 |
|      Why: We need flexible JSON schema                    |
|      Cosine Similarity: 0.718 [==============   ] 72%     |
|      BM25 Overlap: 0.840 | Owner: Sarah (Tech Lead)       |
+-----------------------------------------------------------+
| CONSIDERED BUT FILTERED OUT:                              |
|  [✕] Database: We're using Postgres                       |
|      Rejection Reason: Superseded by "MongoDB"            |
+-----------------------------------------------------------+
| PROMPT GROUNDING PROOF:                                   |
|  [>] View Raw Injected Prompt Payload                     |
|      (Proves chat history was NOT injected)               |
+-----------------------------------------------------------+
```

---

### 5. 👥 Collaborative Coding & Token Guard (Prompt Deduplication)

When multiple team members or candidates code on the same codebase:
- **Candidate A** prompts the AI: *"Create a PostgreSQL connection pool with retry logic and error handler in Node.js"*.
- **Candidate B** doesn't know Candidate A is doing this and prompts: *"Implement postgres connection pool with retry mechanism and error handler in express"*.

#### How the Token Guard Intercepts & Protects:
1. **Pre-Flight Prompt Interceptor:** When Candidate B types their prompt, the system vectorizes it and performs hybrid semantic comparison against all active and completed tasks in the team database.
2. **Collision Radar Trigger:**
   - Detects **73% semantic overlap** and shared file lock (`src/db/pool.js`).
   - Flags: `⚠️ HIGH COLLISION: Candidate A is currently building this exact functionality!`.
   - Calculates token savings: **~3,500 tokens ($0.07)** saved by preventing redundant AI generation.
3. **Smart Work Allocation Options:**
   - **`Adopt Candidate A's Work`**: Instantly clones Candidate A's generated code into Candidate B's workspace with **zero tokens spent**, incrementing the team's Token Savings Counter.
   - **`Pivot to Sub-Task`**: Prompts Candidate B to work on complementary components (e.g. SQL migrations or API health endpoints) instead of duplicating the database pool.
   - **`Force Execute`**: Candidate can choose to override if building an alternative prototype.
4. **Live Team Work Board & Component Locks:** Displays real-time claims and file locks (`src/db/pool.js`, `src/components/UserProfile.jsx`) so team members never step on each other's code.

---

## 🖥️ Interactive UI & Feature Walkthrough

The web application provides a clean, modern interface:

1. **Team Channels Sidebar:**
   - `#architecture` — Discuss technical decisions, database, and frameworks.
   - `#sprint-planning` — Plan milestones, demo dates, and temporary assumptions.
   - `#ask-assistant` — Ask questions across past sessions and inspect memory retrieval.
2. **Channel Chat Area:**
   - Real-time conversation thread with user persona switcher (*Sarah, Alex, Marcus, Elena*).
   - Instant extraction badges with glowing pulses on newly recorded memories.
   - Quick try buttons to populate sample team statements with 1 click.
3. **Structured Memory Ledger:**
   - Grid and card view of every recorded memory.
   - Status filters: `All`, `Active`, `Superseded`, and `Expired`.
   - Complete CRUD: "Add Memory Manually", "Edit Memory", and "Delete Memory".
4. **Guided 1-Click Scenarios in Header:**
   - **`Postgres ➔ Mongo`**: Demonstrates decision extraction, asking the assistant, superseding with MongoDB, and asking again.
   - **`Demo Expiry`**: Demonstrates setting Friday demo deadline, asking before expiry, fast-forwarding time, and asking after expiry.
   - **`Reset`**: Resets all databases to clean baseline.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v22.5.0+` or `v24.x+` (Node 24 includes native `node:sqlite` — zero external compilation or native C++ tools required).

### Installation & Launch

```bash
# 1. Clone or navigate to the project directory
cd y:\team-memory-assistant

# 2. Start the application
npm start
# (Or: node src/server.js)
```

The server will start immediately:
```
=======================================================
🧠 Team Memory Assistant running at http://localhost:3000
=======================================================
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Automated Verification Test Suite

SynapseMem includes an end-to-end automated test suite verifying all 4 pillars and 6 core behaviors:

```bash
node src/test-suite.js
```

### Test Suite Execution Output:
```text
🧪 Starting SynapseMem Core Engine Verification Tests...

▶ TEST 1: Extraction of structured decision memory
✔ Passed: Memory extracted with structured schema (Topic, Decision, Reason, Owner, Date, Vector).

▶ TEST 2: Recall from stored memory
Assistant Answer 1: We are using Postgres because the team knows SQL. (Decided by Sarah (Tech Lead))
✔ Passed: Recalled directly from memory store with similarity score 0.733.

▶ TEST 3: Superseding previous decision
✔ Passed: Postgres marked superseded, MongoDB marked active, bidirectional audit link established.

▶ TEST 4: Recall after superseding
Assistant Answer 2: We are using MongoDB because we need flexible JSON schema. (Decided by Sarah (Tech Lead)) (Note: This superseded our earlier decision on 30/10/2026: "We’re using Postgres")
✔ Passed: Correctly answers MongoDB and proves Postgres was excluded due to superseded status.

▶ TEST 5: Temporal Expiry of short-lived assumptions
Demo recall (before Friday): Based on stored memory, The demo is on Friday. Target deadline is Friday, Oct 30. (Owner: Marcus (PM))
Demo recall (after Friday): There was a previous assumption that "The demo is on Friday", but this expired on 30/10/2026. No active assumption is currently recorded.
✔ Passed: Temporal assumption automatically expired when time advanced.

▶ TEST 6: User manual corrections and deletions
✔ Passed: Manual memory edits and deletions verified.

🎉 ALL 6 VERIFICATION TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.
```

---

## 💡 REST API Reference

All endpoints accept and return `application/json`.

### 1. Channels & Chat

#### `GET /api/channels`
List available conversation simulation channels.

#### `GET /api/channels/:channel/messages`
Retrieve all messages for a specific channel.

#### `POST /api/channels/:channel/messages`
Send a message in a channel. Automatically analyzes text for decision extraction or triggers memory recall if sent to `#ask-assistant`.

**Request Body:**
```json
{
  "text": "We’re using Postgres because the team knows SQL",
  "sender": "Sarah (Tech Lead)"
}
```

**Response Body:**
```json
{
  "userMessage": {
    "id": "msg_...",
    "text": "We’re using Postgres because the team knows SQL",
    "memories_extracted": ["mem_..."]
  },
  "extractedMemory": {
    "id": "mem_...",
    "topic": "Database",
    "decision": "We’re using Postgres",
    "reason": "The team knows SQL",
    "status": "active"
  },
  "supersededMemory": null
}
```

---

### 2. Recall & Query

#### `POST /api/recall`
Directly query the memory store. Returns the synthesized grounded answer and full inspection metrics.

**Request Body:**
```json
{
  "query": "What database are we using and why?"
}
```

**Response Body:**
```json
{
  "answer": "We are using Postgres because the team knows SQL. (Decided by Sarah (Tech Lead))",
  "selectedMemories": [
    {
      "id": "mem_...",
      "topic": "Database",
      "decision": "We’re using Postgres",
      "reason": "The team knows SQL",
      "score": 0.718,
      "status": "active"
    }
  ],
  "inspection": {
    "query": "What database are we using and why?",
    "evaluated_at": "2026-10-30T10:00:00.000Z",
    "retrieval_strategy": "Hybrid Dense Vector (128d) + BM25 Lexical + Status Filter",
    "active_filters": [
      { "name": "Status Filter", "rule": "status == 'active'", "status": "ENFORCED" },
      { "name": "Temporal Expiry", "rule": "valid_until > now", "status": "ENFORCED" }
    ],
    "rejected_memories": [],
    "prompt_payload": {
      "system_instructions": "Answer user queries strictly using the verified structured memory records...",
      "memory_context_injected": [...],
      "chat_history_injected": false
    }
  }
}
```

---

### 3. Memory Ledger CRUD

#### `GET /api/memories?status=active|superseded|expired|all`
Retrieve memories with optional status and category filters.

#### `POST /api/memories`
Manually create a new memory card.

#### `PUT /api/memories/:id`
Correct or update any field of an existing memory.

#### `DELETE /api/memories/:id`
Permanently remove a memory record.

---

### 4. Time Machine (Date Simulator)

#### `GET /api/time`
Get current simulated system time and count of newly expired memories.

#### `POST /api/time`
Set simulated system time to test temporal assumption expiry.

**Request Body:**
```json
{
  "isoString": "2026-11-06T19:00:00.000Z"
}
```

---

## 📁 Project Architecture

```
y:\team-memory-assistant\
├── data/
│   └── memory.db                  # Native SQLite database (ACID storage)
├── src/
│   ├── server.js                  # HTTP server, REST endpoints & static file hosting
│   ├── db.js                      # Database schema, queries, CRUD, audit trail
│   ├── memory-engine.js           # Extraction, contradiction detector, superseding, expiry
│   ├── recall-engine.js           # Hybrid retrieval, synthesis, inspect explanation generator
│   ├── vector-search.js           # Dense 128d embeddings, cosine similarity, BM25 ranker
│   ├── seed-data.js               # Sample scenario data for rapid walkthroughs
│   └── test-suite.js              # Automated 6-part end-to-end test suite
├── public/
│   ├── index.html                 # Single Page Application UI with Tailwind CSS
│   ├── app.js                     # Frontend state reactivity, channels, inspect drawer, ledger
│   ├── styles.css                 # Custom animations, progress meters, glowing extraction chips
│   └── favicon.svg                # Application icon
├── package.json                   # Project metadata & npm scripts
└── README.md                      # Comprehensive project documentation
```

---

## 💎 Design Principles

1. **Zero External Dependencies:** Built leveraging Node.js native `node:sqlite`, `node:http`, and `node:crypto`. Zero npm install delays, zero native compilation headaches, and zero security vulnerabilities.
2. **100% Offline Capable:** Does not require an external API key to run. The built-in deterministic NLP, tokenization, 128-dimensional dense vector embeddings, and BM25 ranker execute locally with sub-millisecond latency.
3. **Auditability First:** Every state transition (`CREATE`, `UPDATE`, `SUPERSEDE`, `EXPIRE`, `DELETE`) is committed to the database with bidirectional pointers and logged in the audit ledger.
4. **Radical Transparency:** The Inspect Panel ensures users never have to guess why an answer was generated or which facts were utilized.

---

**Built with ❤️ for High-Velocity Engineering Teams.**


# Uncharted_2k26
