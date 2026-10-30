import assert from 'node:assert';
import {
  clearAllMemories,
  getAllMemories,
  getMemoryById,
  deleteMemory,
  updateMemory,
  clearAllCodeTasks,
  getCodingStats
} from './db.js';
import { processMessageForMemory, setSimulatedTime, getCurrentTime } from './memory-engine.js';
import { recallFromMemory } from './recall-engine.js';
import {
  checkPromptCollision,
  claimAndExecuteTask,
  adoptExistingTask
} from './prompt-guard.js';

console.log('🧪 Starting SynapseMem Core Engine Verification Tests...\n');

// Reset DB
clearAllMemories();
setSimulatedTime('2026-10-30T10:00:00.000Z');

// ----------------------------------------------------
// Test 1: REMEMBERS (Extraction of structured memory)
// ----------------------------------------------------
console.log('▶ TEST 1: Extraction of structured decision memory');
const input1 = "We’re using Postgres because the team knows SQL";
const res1 = processMessageForMemory(input1, "Sarah (Tech Lead)", "architecture");

assert(res1.extracted !== null, 'Memory should be extracted');
assert.strictEqual(res1.extracted.topic, 'Database', 'Topic should be Database');
assert(res1.extracted.decision.toLowerCase().includes('postgres'), 'Decision should contain Postgres');
assert.strictEqual(res1.extracted.reason, 'The team knows SQL', 'Reason should match');
assert.strictEqual(res1.extracted.owner, 'Sarah (Tech Lead)', 'Owner should match sender');
assert.strictEqual(res1.extracted.status, 'active', 'Initial status must be active');
console.log('✔ Passed: Memory extracted with structured schema (Topic, Decision, Reason, Owner, Date, Vector).\n');

// ----------------------------------------------------
// Test 2: RECALLS (Answers from memory, not chat history)
// ----------------------------------------------------
console.log('▶ TEST 2: Recall from stored memory');
const recall1 = await recallFromMemory("What database are we using and why?");
console.log('Assistant Answer 1:', recall1.answer);
assert(recall1.answer.includes('Postgres'), 'Answer should mention Postgres');
assert(recall1.answer.toLowerCase().includes('sql'), 'Answer should include the reason (SQL)');
assert.strictEqual(recall1.selectedMemories.length, 1, 'Should have retrieved 1 active memory');
assert(recall1.inspection.prompt_payload.chat_history_injected === false, 'Chat history must NOT be injected');
assert(recall1.inspection.retrieved_memories[0].score >= 0.50, 'Similarity score should be >= 0.50');
console.log(`✔ Passed: Recalled directly from memory store with similarity score ${recall1.inspection.retrieved_memories[0].score}.\n`);

// ----------------------------------------------------
// Test 3: KEEPS MEMORY HONEST (Superseding)
// ----------------------------------------------------
console.log('▶ TEST 3: Superseding previous decision');
const input2 = "Actually, we’re switching to MongoDB because we need flexible JSON schema";
const res2 = processMessageForMemory(input2, "Sarah (Tech Lead)", "architecture");

assert(res2.extracted !== null, 'New memory should be extracted');
assert(res2.superseded !== null, 'Older memory must be marked superseded');
assert.strictEqual(res2.superseded.id, res1.extracted.id, 'Superseded target must be the Postgres memory');

// Check DB state
const oldMem = getMemoryById(res1.extracted.id);
const newMem = getMemoryById(res2.extracted.id);

assert.strictEqual(oldMem.status, 'superseded', 'Old Postgres memory status must be superseded');
assert.strictEqual(oldMem.superseded_by, newMem.id, 'Old memory superseded_by pointer must point to MongoDB');
assert.strictEqual(newMem.supersedes_id, oldMem.id, 'New memory supersedes_id pointer must point to Postgres');
assert.strictEqual(newMem.status, 'active', 'New MongoDB memory status must be active');
console.log('✔ Passed: Postgres marked superseded, MongoDB marked active, bidirectional audit link established.\n');

// ----------------------------------------------------
// Test 4: RECALL AFTER SUPERSEDING (Only new active memory used)
// ----------------------------------------------------
console.log('▶ TEST 4: Recall after superseding');
const recall2 = await recallFromMemory("What database are we using and why?");
console.log('Assistant Answer 2:', recall2.answer);
assert(recall2.answer.includes('MongoDB'), 'Answer must now reflect MongoDB');
assert(recall2.answer.toLowerCase().includes('flexible json schema'), 'Answer must cite new reason');
assert.strictEqual(recall2.selectedMemories[0].id, newMem.id, 'Selected memory must be MongoDB');
// Postgres should appear in rejected/filtered memories with reason "Superseded"
const rejectedPostgres = recall2.inspection.rejected_memories.find(m => m.id === oldMem.id);
assert(rejectedPostgres !== undefined, 'Postgres should be reported in rejected_memories');
assert(rejectedPostgres.rejection_reason.includes('Superseded'), 'Rejection reason must state superseded');
console.log('✔ Passed: Correctly answers MongoDB and proves Postgres was excluded due to superseded status.\n');

// ----------------------------------------------------
// Test 5: TEMPORAL EXPIRY (Demo is on Friday)
// ----------------------------------------------------
console.log('▶ TEST 5: Temporal Expiry of short-lived assumptions');
// Set simulated time to Thursday Oct 29
setSimulatedTime('2026-10-29T10:00:00.000Z');
const input3 = "The demo is on Friday because stakeholders want a sprint review";
const res3 = processMessageForMemory(input3, "Marcus (PM)", "sprint-planning");

assert(res3.extracted !== null, 'Demo memory extracted');
assert.strictEqual(res3.extracted.type, 'deadline', 'Type should be deadline');
assert(res3.extracted.valid_until !== null, 'valid_until should be set');
assert.strictEqual(res3.extracted.status, 'active', 'Status before Friday should be active');

// Ask when is demo before expiry
const recallBefore = await recallFromMemory("When is the demo?");
console.log('Demo recall (before Friday):', recallBefore.answer);
assert(recallBefore.answer.toLowerCase().includes('friday'), 'Should answer Friday before expiry');

// Advance time past Friday: Nov 5, 2026
setSimulatedTime('2026-11-05T10:00:00.000Z');
const recallAfter = await recallFromMemory("When is the demo?");
console.log('Demo recall (after Friday):', recallAfter.answer);
assert(recallAfter.answer.toLowerCase().includes('expired'), 'Must state assumption expired');
const demoMem = getMemoryById(res3.extracted.id);
assert.strictEqual(demoMem.status, 'expired', 'Status in DB must be updated to expired');
console.log('✔ Passed: Temporal assumption automatically expired when time advanced.\n');

// ----------------------------------------------------
// Test 6: USER CORRECTIONS & DELETIONS
// ----------------------------------------------------
console.log('▶ TEST 6: User manual corrections and deletions');
updateMemory(newMem.id, { reason: 'Corrected reason: native document model & horizontal scaling' });
const correctedMem = getMemoryById(newMem.id);
assert.strictEqual(correctedMem.reason, 'Corrected reason: native document model & horizontal scaling');

const delSuccess = deleteMemory(res3.extracted.id);
assert.strictEqual(delSuccess, true, 'Delete operation should succeed');
assert.strictEqual(getMemoryById(res3.extracted.id), null, 'Deleted memory should no longer exist');
console.log('✔ Passed: Manual memory edits and deletions verified.\n');

// ----------------------------------------------------
// Test 7: TEAM PROMPT DEDUPLICATION & COLLISION GUARD
// ----------------------------------------------------
console.log('▶ TEST 7: Team collaborative coding prompt deduplication and token saving');
clearAllCodeTasks();

// Step 1: Candidate A claims PostgreSQL connection pool
const promptA = 'Create a PostgreSQL connection pool with retry logic and error handler in Node.js';
const claimA = claimAndExecuteTask('Candidate A', promptA, { candidateRole: 'Backend Lead', status: 'in_progress' });
assert.strictEqual(claimA.task.candidate_id, 'Candidate A');
assert.strictEqual(claimA.task.status, 'in_progress');
assert(claimA.task.target_files.includes('src/db/pool.js'), 'Target files should include pool.js');
console.log('✔ Candidate A claimed task on src/db/pool.js');

// Step 2: Candidate B sends overlapping prompt
const promptB = 'Implement postgres connection pool with retry mechanism and error handler in express';
const collisionAnalysis = checkPromptCollision('Candidate B', promptB);
assert.strictEqual(collisionAnalysis.status, 'HIGH_COLLISION', 'Should be flagged as HIGH_COLLISION');
assert(collisionAnalysis.highestSimilarity >= 0.65, 'Similarity should exceed 0.65 collision threshold');
assert.strictEqual(collisionAnalysis.matchedTask.id, claimA.task.id, 'Should match Candidate A task');
assert.strictEqual(collisionAnalysis.fileCollision, true, 'Should flag file collision');
assert.strictEqual(collisionAnalysis.estimatedSavings, 3500, 'Estimated savings should be 3500 tokens');
console.log(`✔ Collision detected! Match: ${Math.round(collisionAnalysis.highestSimilarity * 100)}%, Tokens to save: ${collisionAnalysis.estimatedSavings}`);

// Step 3: Candidate B adopts Candidate A's work without running redundant AI inference
const adoption = adoptExistingTask('Candidate B', claimA.task.id, promptB);
assert.strictEqual(adoption.adoptedTask.status, 'deduplicated');
assert.strictEqual(adoption.tokensSaved, 3500);

// Verify team stats
const stats = getCodingStats();
assert.strictEqual(stats.collisionsPrevented, 1, 'Should have recorded 1 collision prevented');
assert(stats.totalTokensSaved >= 3500, 'Total tokens saved should be at least 3500');
console.log(`✔ Passed: Candidate B adopted Candidate A's work. Cumulative Tokens Saved: ${stats.totalTokensSaved} tokens.\n`);

// Step 4: Candidate C submits a novel, non-overlapping task
const promptC = 'Create Docker compose setup with Redis and MinIO storage';
const uniqueAnalysis = checkPromptCollision('Candidate C', promptC);
assert.notStrictEqual(uniqueAnalysis.status, 'HIGH_COLLISION', 'Novel task must NOT be flagged as collision');
console.log('✔ Passed: Non-overlapping task approved as novel.\n');

console.log('🎉 ALL 7 VERIFICATION TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.');
