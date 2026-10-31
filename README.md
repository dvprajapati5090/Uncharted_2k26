# 🧠 SynapseMem 2.0 — The Memory Operating System for AI Agents

[![Track](https://img.shields.io/badge/Hackathon-Track%201%3A%20Agentic%20Memory-indigo)](https://github.com)
[![Database](https://img.shields.io/badge/Authoritative%20Store-MongoDB%20Atlas-13AA52?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Retrieval](https://img.shields.io/badge/Vector%20Search-%24vectorSearch%20(1024D)-blueviolet)](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
[![Embeddings](https://img.shields.io/badge/Embeddings-Voyage%20AI%20(voyage--4)-orange)](https://docs.voyageai.com)
[![Tests](https://img.shields.io/badge/Verification-7%2F7%20Passed-brightgreen)](src/test-suite-v2.js)
[![Status](https://img.shields.io/badge/Dual--Mode-Grounding%20Verified-success)](src/recall-engine-v2.js)

> **An AI agent that does not merely retain conversation history. It identifies what matters, recalls the right knowledge later using MongoDB Atlas Vector Search, understands when information changes, and adapts its next response accordingly.**

---

## 🌟 What is SynapseMem 2.0?

Traditional chatbots fail when assisting engineering teams over long projects:
1. **Chat history bloat:** Chatbots dump raw transcripts into prompts, wasting tokens and causing hallucinations.
2. **No lifecycle or time awareness:** They cannot tell when a decision was superseded (e.g., Postgres → MongoDB) or expired (e.g., demo date has passed).
3. **No privacy boundary:** Sensitive credentials or private personal preferences leak into team responses.

**SynapseMem 2.0 fixes this:**
- **Persistent Authoritative Storage:** All memory documents live in **MongoDB Atlas** (`memories` collection).
- **1024-Dimensional Semantic Vectors:** Generated using **Voyage AI (`voyage-4`)** and queried using native **MongoDB `$vectorSearch`**.
- **Self-Evolving Lifecycle:** Automatic conflict detection, superseding with bidirectional lineage, and time-based logical expiry + MongoDB TTL index cleanup.
- **Behavioral Adaptation Proof:** Every answer includes side-by-side contrast against a **"Without Memory"** baseline, proving that stored memory visibly alters the agent's behavior.

---

## 🏛️ Architecture & Data Flow

```
User Message
     │
     ▼
[Privacy Filter Gate] ──(Detects API keys/tokens)──► Refuses to persist secrets
     │
     ▼
[Intelligent Memory Formation] ──► Extracts Type, Statement, Reason, Scope, Validity
     │
     ▼
[Voyage AI Embedding] ──► Generates 1024D dense semantic vector
     │
     ▼
[MongoDB Atlas Store] ──► Persists document to 'memories' collection
     │
 ┌───┴──────────────────────────────┐
 ▼                                  ▼
[Superseding Engine]       [TTL Index & Temporal Expiry]
(Postgres marked superseded;   (validUntil boundary checked immediately;
 MongoDB marked active)         purgeAt handles eventual physical cleanup)
```

### Retrieval & Answer Generation

```
User Query (e.g. "Design a background job system")
     │
     ▼
[Voyage Query Embedding] (1024D)
     │
     ▼
[MongoDB $vectorSearch Aggregation]
  • Index: memory_vector_index
  • Filters: workspaceId, status: "active", server-side owner isolation
     │
     ▼
[Grounding Prompt Engine] (Chat history is NEVER injected!)
     │
     ├─────────────────────────────────┬─────────────────────────────────┐
     ▼                                 ▼                                 ▼
[Memory-Grounded Answer]      [Without-Memory Baseline]          [Inspect Panel Trace]
"Do not use Redis..."         "Use Redis with BullMQ..."         Scores, Filter Proof,
(Adheres to stored rule)      (Generic industry standard)        Selected Memory IDs
```

---

## 📊 MongoDB Document Model

### 1. `memories` Collection

```javascript
{
  "_id": ObjectId("672410a8b9e..."),
  "scope": "workspace",             // "workspace" | "user"
  "ownerId": "u_sarah",
  "workspaceId": "ws_core",
  "createdBy": "u_sarah",
  "type": "constraint",             // decision | preference | fact | constraint | outcome
  "topic": "Infrastructure",
  "content": {
    "statement": "Do not introduce Redis without approval",
    "reason": "Team architecture consensus",
    "normalizedValue": "infrastructure"
  },
  "tags": ["infrastructure", "constraint"],
  "source": {
    "kind": "conversation",
    "channel": "architecture",
    "excerpt": "Do not introduce Redis or paid infrastructure without approval."
  },
  "confidence": 0.96,
  "sensitivity": "workspace",
  "status": "active",               // active | superseded | expired
  "createdAt": ISODate("2026-10-30T10:00:00.000Z"),
  "updatedAt": ISODate("2026-10-30T10:00:00.000Z"),
  "validFrom": ISODate("2026-10-30T10:00:00.000Z"),
  "validUntil": null,               // Logical boundary date
  "purgeAt": null,                  // Physical TTL cleanup date
  "supersedesId": null,
  "supersededBy": null,
  "version": 1,
  "embedding": [0.034, -0.012, ..., 0.089], // Exactly 1024 finite numbers
  "embeddingModel": "voyage-4",
  "embeddingDimensions": 1024
}
```

### 2. Indexes

1. **TTL Index (Physical Cleanup):**
   ```javascript
   db.memories.createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0, name: "ttl_purge_index" })
   ```
2. **Compound Filter Indexes:**
   ```javascript
   db.memories.createIndex({ ownerId: 1, status: 1, type: 1, updatedAt: -1 })
   db.memories.createIndex({ workspaceId: 1, status: 1, type: 1, updatedAt: -1 })
   ```
3. **Atlas Vector Search Index (`memory_vector_index`):**
   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 1024,
         "similarity": "cosine"
       },
       { "type": "filter", "path": "scope" },
       { "type": "filter", "path": "ownerId" },
       { "type": "filter", "path": "workspaceId" },
       { "type": "filter", "path": "status" }
     ]
   }
   ```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: `v22.5+` or `v24.x+` (verified on v24.13.0)
- **MongoDB Atlas Cluster** (or runs using the built-in resilient local document engine if no URI is supplied)

### 2. Configuration
Copy the template and configure your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```dotenv
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=synapsemem
MONGODB_VECTOR_INDEX_NAME=memory_vector_index

# Voyage AI Embeddings
EMBEDDING_PROVIDER=voyage
VOYAGE_API_KEY=your-voyage-api-key
VOYAGE_EMBEDDING_MODEL=voyage-4
VOYAGE_EMBEDDING_DIMENSIONS=1024
```
*(Note: If `MONGODB_URI` or `VOYAGE_API_KEY` are omitted, SynapseMem 2.0 starts in resilient local document mode with deterministic 1024D embeddings so the UI, tests, and demos work immediately).*

### 3. Start the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Verification Test Suite

Run the automated 7-part verification test suite:
```bash
npm test
```

### Test Suite Output:
```text
🧪 Starting SynapseMem 2.0 (MongoDB Agentic Memory) Verification Tests...

▶ TEST 1: Intelligent Memory Formation & Extraction
✔ Passed: Formed structured memory in MongoDB schema with 1024D dense embedding.

▶ TEST 2: Persistent Semantic Recall & Behavioral Adaptation
Agent Answer (With Memory): Based on stored memory, we have an active constraint: "Do not introduce Redis without approval"...
Agent Baseline (Without Memory): For general tasks, standard architectural patterns recommend typical industry tooling. For background job systems, a standard solution often employs Redis with BullMQ...
✔ Passed: Semantic recall adapted response behavior using verified MongoDB memory.

▶ TEST 3: Conflict Detection & Superseding
✔ Passed: Bidirectional lineage established, superseded constraint excluded from current truth.

▶ TEST 4: Logical Expiry & Temporal Boundaries
✔ Passed: Logical expiry executed immediately upon time advancement.

▶ TEST 5: Privacy Boundary & Scope Isolation
✔ Passed: Strict server-side ownership isolation enforced.

▶ TEST 6: Explicit Forget / Deletion
✔ Passed: Authoritative memory document and vector purged.

▶ TEST 7: Secret / Credential Rejection
✔ Passed: Privacy gate prevented persisting credentials.

🎉 ALL 7 SYNAPSEMEM 2.0 VERIFICATION TESTS PASSED SUCCESSFULLY!
```

---

## 🎬 4-Minute Hackathon Demo Script

### Demo 1: Teach the Agent
1. In `#architecture`, Sarah posts:  
   `"For Project Atlas, we use Node.js, Express and MongoDB Atlas. Do not introduce Redis or paid infrastructure without approval."`
2. **Observe:** Emerald badge appears: `[🧠 Memory Saved: Infrastructure]`. The memory document is stored in MongoDB with a 1024D vector.

### Demo 2: Behavioral Adaptation
1. Open `#ask-assistant` and ask:  
   `"Design a background job system for scheduled notifications."`
2. **Observe:** The agent answers: *"Based on stored memory, we have an active constraint: 'Do not introduce Redis without approval'. We should build the background job system using MongoDB Change Streams..."*
3. **Contrast:** Underneath, the **Dual-Mode Baseline** shows what an agent *without memory* would say: *"A standard solution employs Redis with BullMQ..."*
4. Click **Inspect Retrieval** to prove `chat_history_injected: false` and view the 1024D vector search score.

### Demo 3: Conflict & Superseding
1. Sarah posts in `#architecture`:  
   `"We have now approved Redis for caching, but MongoDB Atlas must remain our primary database."`
2. Open **Memory Ledger**: Notice the prior Redis restriction is marked `SUPERSEDED`, pointing to the new `ACTIVE` decision.
3. Ask the assistant: *"Can we use Redis for caching?"* → Answers **Yes** (citing the approval).
4. Ask: *"Where should permanent job records be stored?"* → Answers **MongoDB Atlas**.

### Demo 4: Temporal Expiry
1. Marcus posts: `"No production deployments until November 5, 2026."`
2. Open **Time Machine** from top-right menu → click **Fast-Forward +7 Days**.
3. Ask: *"Are there any active deployment freeze rules?"*  
   → The assistant truthfully answers that the rule **expired on Nov 5** and is no longer active.

### Demo 5: Privacy Isolation & Forget
1. Save a private memory under Sarah's profile (`scope: user`).
2. Switch to **Alex Rivera** in the header. Ask for Sarah's private preference.
3. Observe: Server-side isolation blocks recall. User A's private knowledge is never leaked.
4. Click **Delete (Trash)** on any memory in the Ledger → document and vector are permanently purged from MongoDB.


---

## 🛡️ SynapseMem CI / PR Architecture Compliance Linter

> **Bridges the gap between AI agent memory and real-world software engineering pipelines.**  
> Automatically validates Pull Requests, RFCs, and commit messages against authoritative MongoDB Atlas architecture memory before code merges.

### 🌟 Why This Matters
AI agents in chat are useful, but architectural violations usually happen in **Pull Requests**. Without guardrails, a developer might introduce an unapproved database, bypass a deployment freeze, or leak API keys into code reviews. The **PR Linter** runs in terminal or inside **GitHub Actions CI**, acting as an automated architectural gatekeeper.

### 🔍 4-Stage Verification Pipeline

```
Pull Request / Commit Message / RFC
                 │
                 ▼
 [Stage 1: Zero-Trust Privacy Gate] ──────► Fails on exposed API keys, private keys, or tokens
                 │
                 ▼
 [Stage 2: Architecture Contradiction] ──► Fails if PR contradicts active MongoDB decisions (e.g., Redis ban)
                 │
                 ▼
 [Stage 3: Release Governance Window] ───► Fails if PR deploys to prod during an active freeze window
                 │
                 ▼
 [Stage 4: Multi-Agent Quorum] ──────────► Submits proposal to Architect, Security Guard & Pipeline Marshal
                 │
                 ▼
      [Pass: Exit 0 / Block: Exit 1] ────► Automatically posts Markdown Audit Table to GitHub PR
```

### 🧪 How to Test Locally & In Real Projects

#### 1. Run the Automated 4-Scenario Test Suite
Evaluates compliant changes, direct contradictions, freeze violations, and credential leaks in one command:
```bash
node scripts/pr-linter.js --demo
```

#### 2. Test Any Custom PR Description or Commit Message
```bash
# Example A: Test an unauthorized Redis proposal (Should FAIL)
node scripts/pr-linter.js --text "Introduce Redis with BullMQ for notification job queues without approval."

# Example B: Test a compliant MongoDB Change Stream proposal (Should PASS)
node scripts/pr-linter.js --text "Standardize on MongoDB Atlas change streams for background notification workers."
```

#### 3. Test with a Markdown PR File
```bash
# Test against sample PR file and generate GitHub PR Markdown report
node scripts/pr-linter.js --file scripts/sample-pr.md --markdown
```

#### 4. GitHub Actions CI Integration
The repository includes a ready-to-run GitHub Actions workflow located at:
[`.github/workflows/synapse-pr-linter.yml`](.github/workflows/synapse-pr-linter.yml)

It triggers on `pull_request` events, runs the audit, generates a formatted compliance table, and exits with code `1` to block merging if any architectural policy or security rule is violated.
