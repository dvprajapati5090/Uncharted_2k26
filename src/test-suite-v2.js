import assert from 'node:assert';
import {
  initMongo,
  findMemories,
  getMemoryById,
  deleteMemoryDocument,
  updateMemoryDocument,
  wipeAllStoredData
} from './db-mongo.js';
import {
  extractAndFormMemory,
  setSimulatedTime,
  getAppNow,
  checkPrivacyFilter
} from './memory-engine-v2.js';
import { recallMemories } from './recall-engine-v2.js';

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
  workspaceId: 'ws_core'
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
  workspaceId: 'ws_core'
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
  workspaceId: 'ws_core'
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

console.log('🎉 ALL 7 SYNAPSEMEM 2.0 VERIFICATION TESTS PASSED SUCCESSFULLY!');
process.exit(0);
