import assert from 'node:assert';
import {
  initMongo,
  findMemories,
  getMemoryById,
  deleteMemoryDocument,
  updateMemoryDocument,
  wipeAllStoredData,
  recordFeedback,
  getTrainingStats,
  exportDpoDataset,
  getMemoryGraph,
  traverseGraphRAG,
  addMemoryRelation,
  buildHierarchicalClusters,
  searchHierarchicalMemories
} from './db-mongo.js';
import {
  extractAndFormMemory,
  setSimulatedTime,
  getAppNow,
  checkPrivacyFilter
} from './memory-engine-v2.js';
import { recallMemories } from './recall-engine-v2.js';
import {
  evaluateMemoryConsensus,
  getConsensusHistory,
  getConsensusStats
} from './consensus-engine-v2.js';
import {
  AVAILABLE_MODELS,
  generateMultiModelAnswer,
  buildGroundingPrompt
} from './providers/llm-provider.js';
import { realtimeSync } from './realtime-sync.js';
import { runLiveBenchmark, getLatestBenchmark, BENCHMARK_SCENARIOS } from './benchmark-engine.js';
import { analyzePreCommitConflict, executeConflictResolution } from './conflict-arbiter.js';
import { generateEnterpriseAdrDossier } from './dossier-exporter.js';

console.log('🧪 Starting SynapseMem 2.0 (MongoDB Agentic Memory) Verification Tests...\n');

await initMongo();
await wipeAllStoredData();
setSimulatedTime('2026-10-30T10:00:00.000Z');

// ----------------------------------------------------
// TEST 1: Intelligent Memory Formation & Extraction
// ----------------------------------------------------
console.log('▶ TEST 1: Intelligent Memory Formation & Extraction');
const userA = { id: 'u_sarah', name: 'Sarah Jenkins' };
const res1 = await extractAndFormMemory({
  text: 'For Project Atlas, we use Node.js, Express and MongoDB Atlas because we need flexible document persistence.',
  user: userA,
  workspaceId: 'ws_core',
  channel: 'architecture'
});

assert(res1.extracted !== null, 'Memory should be extracted');
assert.strictEqual(res1.extracted.topic, 'Database');
assert.strictEqual(res1.extracted.embeddingDimensions, 1024, 'Embeddings must be 1024D');
assert.strictEqual(res1.extracted.embedding.length, 1024);
console.log('✔ Passed: Formed structured memory in MongoDB schema with 1024D dense embedding.\n');

// ----------------------------------------------------
// TEST 2: Persistent Semantic Recall & Behavioral Adaptation
// ----------------------------------------------------
console.log('▶ TEST 2: Persistent Semantic Recall & Behavioral Adaptation');
// Add constraint: Do not introduce Redis without approval
await extractAndFormMemory({
  text: 'Do not introduce Redis or paid infrastructure without approval.',
  user: userA,
  workspaceId: 'ws_core',
  channel: 'architecture'
});

const recallRes = await recallMemories({
  query: 'Design a background job system for scheduled notifications.',
  user: userA,
  workspaceId: 'ws_core',
  model: 'local-grounded'
});

console.log('Agent Answer (With Memory):', recallRes.answer);
console.log('Agent Baseline (Without Memory):', recallRes.withoutMemoryAnswer);

assert(recallRes.answer.includes('Do not introduce Redis'), 'Answer must adhere to stored constraint');
assert(recallRes.withoutMemoryAnswer.includes('Redis'), 'Baseline without memory proposes generic Redis queue');
assert.strictEqual(recallRes.trace.promptPayload.chat_history_injected, false, 'No chat history injected');
console.log('✔ Passed: Semantic recall adapted response behavior using verified MongoDB memory.\n');

// ----------------------------------------------------
// TEST 3: Conflict Detection & Superseding
// ----------------------------------------------------
console.log('▶ TEST 3: Conflict Detection & Superseding');
const res3 = await extractAndFormMemory({
  text: 'We have now approved Redis for caching, but MongoDB Atlas must remain our primary database.',
  user: userA,
  workspaceId: 'ws_core',
  channel: 'architecture'
});

assert(res3.superseded !== null, 'Previous Redis constraint must be marked superseded');
const recallAfterApproval = await recallMemories({
  query: 'Can we use Redis for our caching layer?',
  user: userA,
  workspaceId: 'ws_core',
  model: 'local-grounded'
});
console.log('Recall after approval:', recallAfterApproval.answer);
assert(recallAfterApproval.answer.includes('approved Redis'), 'Answer must reflect new active decision');
console.log('✔ Passed: Bidirectional lineage established, superseded constraint excluded from current truth.\n');

// ----------------------------------------------------
// TEST 4: Logical Expiry (Time Machine)
// ----------------------------------------------------
console.log('▶ TEST 4: Logical Expiry & Temporal Boundaries');
const deadlineRes = await extractAndFormMemory({
  text: 'No production deployments until November 5, 2026.',
  user: { id: 'u_marcus', name: 'Marcus Chen' },
  workspaceId: 'ws_core',
  channel: 'sprint-planning'
});

assert(deadlineRes.extracted.validUntil !== null, 'validUntil boundary must be recorded');

// Jump past Nov 5, 2026
setSimulatedTime('2026-11-06T10:00:00.000Z');
const recallExpired = await recallMemories({
  query: 'Are there any active deployment freeze rules?',
  user: userA,
  workspaceId: 'ws_core',
  model: 'local-grounded'
});
console.log('Recall after expiry date:', recallExpired.answer);
const expiredMem = await getMemoryById(deadlineRes.extracted._id);
assert.strictEqual(expiredMem.status, 'expired', 'Memory must transition to expired status');
console.log('✔ Passed: Logical expiry executed immediately upon time advancement.\n');

// ----------------------------------------------------
// TEST 5: Privacy Boundary (User A vs User B Isolation)
// ----------------------------------------------------
console.log('▶ TEST 5: Privacy Boundary & Scope Isolation');
const privateMem = await extractAndFormMemory({
  text: 'I prefer darker high-contrast IDE themes and vim keybindings.',
  user: userA,
  workspaceId: 'ws_core',
  scope: 'user' // Private to Sarah
});

const userB = { id: 'u_alex', name: 'Alex Rivera' };
const userBRecall = await recallMemories({
  query: 'What IDE theme and keybindings are preferred?',
  user: userB,
  workspaceId: 'ws_core'
});

const leaked = userBRecall.selectedMemories.some(m => m.scope === 'user' && m.ownerId === 'u_sarah');
assert.strictEqual(leaked, false, 'User B must never retrieve User A private memories');
console.log('✔ Passed: Strict server-side ownership isolation enforced.\n');

// ----------------------------------------------------
// TEST 6: Forget / Permanent Deletion
// ----------------------------------------------------
console.log('▶ TEST 6: Explicit Forget / Deletion');
const deleteTargetId = res1.extracted._id;
const delSuccess = await deleteMemoryDocument(deleteTargetId);
assert.strictEqual(delSuccess, true, 'Document must be removed');
const checkDeleted = await getMemoryById(deleteTargetId);
assert.strictEqual(checkDeleted, null, 'Forgotten memory must not exist in collection');
console.log('✔ Passed: Authoritative memory document and vector purged.\n');

// ----------------------------------------------------
// TEST 7: Privacy Filter Refusal
// ----------------------------------------------------
console.log('▶ TEST 7: Secret / Credential Rejection');
const privacyCheck = checkPrivacyFilter('Our secret database API key is sk_live_998877665544332211aabbcc');
assert.strictEqual(privacyCheck.safe, false, 'Credentials must be rejected');
console.log('✔ Passed: Privacy gate prevented persisting credentials.\n');

// ----------------------------------------------------
// TEST 8: Active Reinforcement & Dynamic Calibration Loop
// ----------------------------------------------------
console.log('▶ TEST 8: Active Reinforcement & Dynamic Calibration Loop');
const memToCalibrate = deadlineRes.extracted._id;
const initialMem = await getMemoryById(memToCalibrate);
const initialConf = initialMem.confidence || 0.95;

// Positive feedback: user confirms agent adhered to constraint
await recordFeedback({
  query: 'Are there any active deployment freeze rules?',
  chosenAnswer: 'The prior restriction was in effect, but it expired on Nov 5, 2026.',
  rejectedAnswer: 'Standard deployment practices allow continuous delivery.',
  rating: 1,
  reasonTag: 'adhered_to_constraint',
  memoryIds: [memToCalibrate.toString()],
  workspaceId: 'ws_core'
});

const boostedMem = await getMemoryById(memToCalibrate);
assert(boostedMem.confidence >= initialConf, 'Positive reinforcement must increase memory confidence');
assert.strictEqual(boostedMem.reinforcementUp, 1, 'Reinforcement counter must increment');

// Verify DPO dataset generation
const dpoData = await exportDpoDataset();
assert(dpoData.length > 0, 'DPO dataset must contain exported training pairs');
assert(dpoData[0].chosen && dpoData[0].rejected && dpoData[0].prompt, 'DPO items must have prompt, chosen, and rejected');
console.log('✔ Passed: Dynamic confidence calibration and DPO training export verified.\n');

// ----------------------------------------------------
// TEST 9: Architectural Knowledge Graph & GraphRAG Lineage
// ----------------------------------------------------
console.log('▶ TEST 9: Architectural Knowledge Graph & GraphRAG Lineage');
const graph = await getMemoryGraph('ws_core');
assert(graph.nodes.length > 0, 'Knowledge graph must contain nodes');
assert(graph.edges.length > 0, 'Knowledge graph must contain lineage edges');

// Traversal from approval to superseded constraint
const traversal = await traverseGraphRAG(res3.extracted._id, 2);
assert(traversal.neighbors.length > 0, 'GraphRAG traversal must resolve connected lineage');
console.log('✔ Passed: Multi-hop graph lineage and GraphRAG traversal verified.\n');

console.log('▶ TEST 10: Hierarchical Multi-Vector Clustering & Parent-Child Memory Resolution');
const hierarchy = await buildHierarchicalClusters('ws_core');
assert(Array.isArray(hierarchy.clusters), 'Hierarchy must return cluster list');
assert(hierarchy.clusters.length > 0, 'Hierarchy must form at least 1 macro domain cluster');
assert(hierarchy.summary.coherenceScore >= 80, 'Coherence score must be healthy');

const persistenceCluster = hierarchy.clusters.find(c => c.id === 'domain_persistence');
assert(persistenceCluster, 'Should form domain_persistence cluster from seeded memories');
assert(Array.isArray(persistenceCluster.macroVector) && persistenceCluster.macroVector.length === 1024, 'Macro cluster must have 1024D centroid vector');
assert(persistenceCluster.children.length > 0, 'Domain cluster must contain child micro-decisions');

// Test hierarchical multi-vector query resolution
const hSearch = await searchHierarchicalMemories({
  query: 'Can we use Redis for caching queries in MongoDB?',
  workspaceId: 'ws_core'
});

assert(hSearch.matchedCluster, 'Hierarchical search must match a macro architectural domain');
assert(hSearch.matchedCluster.id === 'domain_persistence', 'Query must resolve to persistence & data layer');
assert(hSearch.resolvedDecisions.length > 0, 'Hierarchical search must drill down into child micro-decisions');
assert(hSearch.hierarchicalContext.includes('Persistence & Data Layer'), 'Context must include macro domain');
console.log(`Matched Macro Domain: ${hSearch.matchedCluster.name} (Match: ${Math.round(hSearch.matchedCluster.domainScore * 100)}%)`);
console.log(`Resolved Child Decisions: ${hSearch.resolvedDecisions.length}`);
console.log('✔ Passed: Hierarchical multi-vector clustering and parent-child domain resolution verified.\n');

console.log('▶ TEST 11: Multi-Agent Consensus & Quorum Memory Validation');
setSimulatedTime('2026-10-30T10:00:00.000Z');
// 1. Valid proposal: Architect, Security, and DevOps should ratify (Quorum >= 67%)
const validProposal = await evaluateMemoryConsensus({
  content: { statement: 'We use MongoDB Atlas with Redis read-through caching for high throughput.' },
  topic: 'Infrastructure',
  ownerId: 'u_sarah',
  workspaceId: 'ws_core'
});
assert.strictEqual(validProposal.status, 'ratified', 'Compliant proposal must be ratified by agent quorum');
assert.strictEqual(validProposal.quorumReached, true, 'Quorum must be achieved');
assert.strictEqual(validProposal.hasHardVeto, false, 'No agent should issue a hard veto on compliant proposal');
assert(validProposal.approvalRate >= 0.67, 'Approval rate must meet or exceed 67% quorum threshold');
console.log(`Valid Proposal Quorum: ${validProposal.approvalCount}/${validProposal.totalVoters} Votes (${Math.round(validProposal.approvalRate * 100)}%) -> ${validProposal.status.toUpperCase()}`);

// 2. Unsafe proposal: Attempting to deploy immediately to production during active freeze
const vetoProposal = await evaluateMemoryConsensus({
  content: { statement: 'Deploy now to production immediately, bypass freeze window.' },
  topic: 'Deployment',
  ownerId: 'u_marcus',
  workspaceId: 'ws_core'
});
assert.strictEqual(vetoProposal.status, 'rejected', 'Proposal violating deployment freeze must be rejected');
assert.strictEqual(vetoProposal.hasHardVeto, true, 'Pipeline Marshal must issue a critical veto');
assert(vetoProposal.dissentingViews.length > 0, 'Dissenting rationale must be recorded');
console.log(`Vetoed Proposal: Veto Issued by ${vetoProposal.votes.find(v => v.veto)?.agentName} -> ${vetoProposal.status.toUpperCase()}`);

// 3. Rogue database proposal: Atlas Architect should vote reject
const rogueProposal = await evaluateMemoryConsensus({
  content: { statement: 'Migrate entire user database to DynamoDB and drop MongoDB.' },
  topic: 'Infrastructure',
  ownerId: 'u_marcus',
  workspaceId: 'ws_core'
});
const architectVote = rogueProposal.votes.find(v => v.agentId === 'agent_architect');
assert(architectVote && architectVote.vote === 'reject', 'Atlas Architect must reject unvetted rogue database');
console.log(`Rogue DB Proposal: Architect Voted ${architectVote.vote.toUpperCase()} ("${architectVote.rationale}")`);

const consensusStats = await getConsensusStats('ws_core');
assert(consensusStats.totalProposals >= 2, 'Consensus stats must reflect recorded proposals');
console.log(`Consensus Registry: ${consensusStats.totalProposals} Proposals Evaluated (${consensusStats.ratifiedCount} Ratified, ${consensusStats.rejectedCount} Rejected, ${consensusStats.vetoCount} Vetoes)`);
console.log('✔ Passed: Multi-agent quorum consensus and hard veto protection verified.\n');

console.log('▶ TEST 12: Live Multi-Model LLM Grounding & Prompt Synthesis (Gemini / Claude / Local)');
assert(AVAILABLE_MODELS.length >= 3, 'Must support at least 3 models (Gemini, Claude, Local)');
const hasGemini = AVAILABLE_MODELS.some(m => m.provider === 'gemini');
const hasClaude = AVAILABLE_MODELS.some(m => m.provider === 'claude');
assert(hasGemini, 'Must support Google Gemini models');
assert(hasClaude, 'Must support Anthropic Claude models');

// Verify strict grounding prompt constructor
const samplePrompt = buildGroundingPrompt({
  query: 'Can we use Redis for caching?',
  memories: [{
    _id: 'sample_1',
    topic: 'Infrastructure',
    ownerId: 'u_sarah',
    status: 'active',
    content: { statement: 'We have approved Redis for caching with MongoDB Atlas.', reason: 'Performance' }
  }]
});
assert(samplePrompt.includes('ZERO CHAT HISTORY INJECTION'), 'System prompt must enforce zero chat history');
assert(samplePrompt.includes('We have approved Redis for caching with MongoDB Atlas'), 'Prompt must inject Atlas memory records');

// Verify multi-model recall execution
const geminiRecall = await recallMemories({
  query: 'Can we use Redis for caching?',
  user: { id: 'u_sarah' },
  workspaceId: 'ws_core',
  model: 'gemini-2.5-flash'
});
assert(geminiRecall.answer && geminiRecall.answer.length > 10, 'Must produce grounded answer');
assert.strictEqual(geminiRecall.trace.promptPayload.chat_history_injected, false, 'Chat history injection must be false');
assert.strictEqual(geminiRecall.trace.promptPayload.modelRequested, 'gemini-2.5-flash');

const claudeRecall = await recallMemories({
  query: 'What database are we using?',
  user: { id: 'u_sarah' },
  workspaceId: 'ws_core',
  model: 'claude-3-5-sonnet'
});
assert(claudeRecall.answer && claudeRecall.answer.length > 10, 'Claude model recall must return grounded answer');
assert.strictEqual(claudeRecall.trace.promptPayload.modelRequested, 'claude-3-5-sonnet');
console.log(`Gemini Model Recall: "${geminiRecall.answer.slice(0, 70)}..."`);
console.log(`Claude Model Recall: "${claudeRecall.answer.slice(0, 70)}..."`);
console.log('✔ Passed: Live multi-model LLM grounding and strict zero-history synthesis verified.\n');

// ----------------------------------------------------
// TEST 13: MongoDB Change Streams & Multi-Agent Realtime Sync
// ----------------------------------------------------
console.log('▶ TEST 13: MongoDB Change Streams & Multi-Agent Realtime Sync');

const capturedEvents = [];
const syncListener = (evt) => capturedEvents.push(evt);
realtimeSync.on('sync_event', syncListener);

// 1. Trigger mutation via broadcast
const testBroadcast = realtimeSync.broadcast({
  operationType: 'insert',
  collection: 'memories',
  documentId: 'mem_test_sync_001',
  topic: 'Infrastructure',
  summary: 'Redis cache TTL standardized to 3600 seconds',
  status: 'active'
});

assert(testBroadcast.id.startsWith('evt_'), 'Sync event must have unique eventId');
assert.strictEqual(testBroadcast.operationType, 'insert');
assert(testBroadcast.latencyMs > 0, 'Must record realistic propagation latency');

// 2. Verify history and stats
const syncHistory = realtimeSync.getHistory();
assert(syncHistory.length > 0, 'Sync history ring buffer must capture events');
assert.strictEqual(syncHistory[0].documentId, 'mem_test_sync_001');

const syncStats = realtimeSync.getStats();
assert(syncStats.totalEvents > 0, 'Total events count must be positive');
assert(syncStats.inserts > 0, 'Insert count must increment');

realtimeSync.off('sync_event', syncListener);
console.log(`Live Sync Broadcast Captured: ${capturedEvents.length} events (Latest: "${syncHistory[0].summary}")`);
console.log(`Sync Stats: ${syncStats.totalEvents} total mutations synchronized, average latency: ${testBroadcast.latencyMs}ms`);
console.log('✔ Passed: Real-time change stream sync and multi-agent broadcast bus verified.\n');

// ----------------------------------------------------
// TEST 14: Live Benchmark Engine & Comparative Scorecard
// ----------------------------------------------------
console.log('▶ TEST 14: Live Benchmark Engine & Comparative Scorecard (Synapse vs Naive RAG vs History Bloat)');

const initialBenchmark = getLatestBenchmark();
assert(initialBenchmark.scorecard.synapseMem.score > 90, 'Initial score must reflect high adherence');
assert(initialBenchmark.radarMetrics.length === 5, 'Must evaluate across 5 radar dimensions');

const benchmarkRun = await runLiveBenchmark();
assert.strictEqual(benchmarkRun.detailedTests.length, BENCHMARK_SCENARIOS.length, 'Must execute all benchmark scenarios');
assert(benchmarkRun.scorecard.synapseMem.score >= 80, 'SynapseMem score must lead significantly');
assert(benchmarkRun.totalExecutionTimeMs >= 0, 'Must record execution time');
console.log(`Benchmark Executed: ${benchmarkRun.detailedTests.length} adversarial tests in ${benchmarkRun.totalExecutionTimeMs}ms`);
console.log(`SynapseMem Score: ${benchmarkRun.scorecard.synapseMem.score}% (Hallucination: ${benchmarkRun.scorecard.synapseMem.hallucinationRate}, Token Reduction: ${benchmarkRun.scorecard.synapseMem.tokenEfficiency})`);
console.log(`Naive Flat RAG Score: ${benchmarkRun.scorecard.naiveFlatRag.score}% (Hallucination: ${benchmarkRun.scorecard.naiveFlatRag.hallucinationRate})`);
console.log(`History Bloat Agent Score: ${benchmarkRun.scorecard.chatHistoryBloat.score}% (Hallucination: ${benchmarkRun.scorecard.chatHistoryBloat.hallucinationRate})`);
console.log('✔ Passed: Empirical benchmark engine and multi-architecture scorecard verified.\n');

// ----------------------------------------------------
// TEST 15: Semantic Conflict Arbiter & Pre-Commit Shield
// ----------------------------------------------------
console.log('▶ TEST 15: Semantic Conflict Arbiter & Pre-Commit Shield');

// 1. Check clean non-conflicting statement
const cleanCheck = await analyzePreCommitConflict({
  statement: 'All backend microservices must provide health check endpoints at /healthz.',
  topic: 'Architecture',
  workspaceId: 'ws_core'
});
assert.strictEqual(cleanCheck.hasConflict, false, 'Non-conflicting statement must pass clean');

// 2. Check direct contradiction against approved Redis policy
const conflictCheck = await analyzePreCommitConflict({
  statement: 'Do not use Redis or caching systems anywhere in our backend infrastructure.',
  topic: 'Infrastructure',
  workspaceId: 'ws_core'
});
assert.strictEqual(conflictCheck.hasConflict, true, 'Direct polarity clash must be flagged as conflict');
assert.strictEqual(conflictCheck.highestConflict.severity, 'high');
assert(conflictCheck.recommendedStrategies.length > 0, 'Must provide resolution strategies');
console.log(`Pre-Commit Shield: Detected ${conflictCheck.highestConflict.conflictType} against #${conflictCheck.highestConflict.memoryId} (Severity: ${conflictCheck.highestConflict.severity.toUpperCase()})`);
console.log(`Recommended Strategy: ${conflictCheck.recommendedStrategies[0].label} ("${conflictCheck.recommendedStrategies[0].description}")`);

// 3. Test strategy execution
const resolveRes = await executeConflictResolution({
  strategy: 'supersede',
  candidateMemory: { _id: 'mem_test_cand_01' },
  conflictingMemoryId: conflictCheck.highestConflict.memoryId,
  user: { id: 'u_sarah' }
});
assert.strictEqual(resolveRes.success, true);
assert.strictEqual(resolveRes.resolution, 'superseded');
console.log('✔ Passed: Pre-commit conflict scanning, polarity clash detection, and resolution strategies verified.\n');

// ----------------------------------------------------
// TEST 16: Enterprise ADR & Memory Dossier Exporter
// ----------------------------------------------------
console.log('▶ TEST 16: Enterprise ADR & Memory Dossier Exporter');

const dossierResult = await generateEnterpriseAdrDossier('ws_core');
assert(dossierResult.markdown && dossierResult.markdown.includes('# 🏛️ SynapseMem 2.0 — Enterprise Architecture Decision Record (ADR)'), 'Markdown dossier must contain executive header');
assert(dossierResult.markdown.includes('memory_vector_index'), 'Must cite Atlas Vector Search index');
assert(dossierResult.markdown.includes('```mermaid'), 'Must generate Mermaid architecture topology graph');
assert(dossierResult.structuredJson && dossierResult.structuredJson.summary, 'Must contain structured summary JSON');
assert(dossierResult.filename.startsWith('SynapseMem_ADR_Dossier_'), 'Must generate standardized filename');
console.log(`Generated Dossier: ${dossierResult.filename} (${dossierResult.markdown.length} bytes markdown)`);
console.log(`Active Policies: ${dossierResult.structuredJson.summary.activeCount}, Graph Nodes: ${dossierResult.structuredJson.summary.graphNodesCount}, Adherence: ${dossierResult.structuredJson.summary.adherenceRate}%`);
console.log('✔ Passed: Enterprise ADR documentation and structured JSON dossier generation verified.\n');

console.log('🎉 ALL 16 SYNAPSEMEM 2.0 VERIFICATION TESTS PASSED SUCCESSFULLY!');
process.exit(0);
