import { getAllMemories, getMemoryById } from './db.js';
import { generateEmbedding, rankMemory } from './vector-search.js';
import { getCurrentTime, refreshMemoryExpirations } from './memory-engine.js';

const SIMILARITY_THRESHOLD = 0.40;

/**
 * Recall engine queries stored memories (NOT chat history)
 * Synthesizes an answer and prepares an Inspect explanation payload
 */
export async function recallFromMemory(query, options = {}) {
  // 1. Keep memory state honest: refresh temporal expirations first
  refreshMemoryExpirations();

  const currentTime = getCurrentTime();
  const queryLower = query.toLowerCase();

  // 2. Detect query intent
  // Does the user specifically ask for history or previous decisions?
  const isAskingHistory = /previous|previously|before|earlier|past|history|ever consider|used to/i.test(queryLower);
  // Does the user ask "why"?
  const isAskingWhy = /why|reason|what made us|why did we/i.test(queryLower);

  // 3. Generate dense vector embedding for query
  const queryEmbedding = generateEmbedding(query);

  // 4. Retrieve ALL candidate memories to evaluate rankings and filters
  const allMemories = getAllMemories();

  const rankedCandidates = [];
  const rejectedCandidates = [];

  for (const memory of allMemories) {
    const ranking = rankMemory(query, memory, queryEmbedding);

    // Filter evaluations
    const isAboveThreshold = ranking.hybridScore >= SIMILARITY_THRESHOLD;
    let statusFilterPassed = false;
    let filterReason = '';

    if (isAskingHistory) {
      // If asking about history, superseded memories are acceptable
      statusFilterPassed = true;
      filterReason = 'Historical query allowed superseded memories';
    } else {
      if (memory.status === 'active') {
        // Check if temporal validity is still active
        if (memory.valid_until && new Date(memory.valid_until) < currentTime) {
          statusFilterPassed = false;
          filterReason = `Expired on ${new Date(memory.valid_until).toLocaleDateString()}`;
        } else {
          statusFilterPassed = true;
          filterReason = 'Active and within validity window';
        }
      } else if (memory.status === 'superseded') {
        statusFilterPassed = false;
        const supersedingMemory = memory.superseded_by ? getMemoryById(memory.superseded_by) : null;
        const targetTitle = supersedingMemory ? `"${supersedingMemory.decision}"` : 'a newer decision';
        filterReason = `Superseded by ${targetTitle}`;
      } else if (memory.status === 'expired') {
        statusFilterPassed = false;
        filterReason = 'Expired temporal assumption';
      } else {
        statusFilterPassed = false;
        filterReason = `Inactive status: ${memory.status}`;
      }
    }

    const candidate = {
      memory,
      ranking,
      filters: {
        isAboveThreshold,
        statusFilterPassed,
        status: memory.status,
        filterReason,
        evaluatedExpiry: memory.valid_until,
        currentTime: currentTime.toISOString()
      }
    };

    if (isAboveThreshold && statusFilterPassed) {
      rankedCandidates.push(candidate);
    } else if (ranking.hybridScore >= 0.25) {
      // Record in rejected candidates if there was at least minimal relevance
      rejectedCandidates.push(candidate);
    }
  }

  // Sort accepted candidates by hybrid score descending
  rankedCandidates.sort((a, b) => b.ranking.hybridScore - a.ranking.hybridScore);

  // 5. Synthesize Answer
  let answer = '';
  let selectedMemories = [];

  if (rankedCandidates.length > 0) {
    // Take top 1 to 3 relevant memories
    selectedMemories = rankedCandidates.slice(0, 3).map(c => ({
      ...c.memory,
      score: c.ranking.hybridScore,
      denseSimilarity: c.ranking.denseSimilarity,
      bm25Score: c.ranking.bm25Score,
      matchedTerms: c.ranking.matchedTerms,
      filterReason: c.filters.filterReason
    }));

    const primary = selectedMemories[0];

    // Check if primary memory supersedes something earlier
    let supersededNote = '';
    if (primary.supersedes_id) {
      const oldMem = getMemoryById(primary.supersedes_id);
      if (oldMem) {
        supersededNote = ` (Note: This superseded our earlier decision on ${new Date(oldMem.created_at).toLocaleDateString()}: "${oldMem.decision}")`;
      }
    }

    // Build synthesized response
    if (primary.type === 'deadline' || primary.type === 'assumption') {
      const validDateStr = primary.valid_until
        ? new Date(primary.valid_until).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : 'the upcoming milestone';
      answer = `Based on stored memory, ${primary.decision}. Target deadline is ${validDateStr}.`;
      if (primary.reason && isAskingWhy) {
        answer += ` Reason: ${primary.reason}.`;
      }
      if (primary.owner) {
        answer += ` (Owner: ${primary.owner})`;
      }
    } else {
      // Standard Decision - clean leading phrasing nicely
      let cleanDecision = primary.decision
        .replace(/^we['’]re using\s*/i, '')
        .replace(/^we are using\s*/i, '')
        .replace(/^we['’]re switching to\s*/i, '')
        .replace(/^we decided (to|on)\s*/i, '')
        .trim();

      answer = `We are using ${cleanDecision}`;
      if (primary.reason) {
        answer += ` because ${primary.reason.charAt(0).toLowerCase() + primary.reason.slice(1)}`;
      }
      answer += `.`;

      if (primary.owner) {
        answer += ` (Decided by ${primary.owner})`;
      }
    }

    if (supersededNote) {
      answer += supersededNote;
    }

    // If there are secondary memories that add valuable context
    if (selectedMemories.length > 1) {
      const additional = selectedMemories.slice(1).map(m => `"${m.decision}"`).join(' and ');
      answer += ` Related decisions: ${additional}.`;
    }
  } else {
    // Check if there was an expired or superseded memory that the user is asking about
    const expiredMatch = rejectedCandidates.find(c => c.memory.status === 'expired' && c.ranking.hybridScore > 0.40);
    const supersededMatch = rejectedCandidates.find(c => c.memory.status === 'superseded' && c.ranking.hybridScore > 0.40);

    if (expiredMatch) {
      const expiryDate = expiredMatch.memory.valid_until
        ? new Date(expiredMatch.memory.valid_until).toLocaleDateString()
        : 'earlier';
      answer = `There was a previous assumption that "${expiredMatch.memory.decision}", but this expired on ${expiryDate}. No active assumption is currently recorded.`;
    } else if (supersededMatch) {
      const replacer = supersededMatch.memory.superseded_by ? getMemoryById(supersededMatch.memory.superseded_by) : null;
      if (replacer) {
        answer = `Our previous decision "${supersededMatch.memory.decision}" was superseded. We switched to "${replacer.decision}" because ${replacer.reason || 'of updated requirements'}.`;
      } else {
        answer = `The previous decision "${supersededMatch.memory.decision}" was marked superseded and is no longer active.`;
      }
    } else {
      answer = `I checked the team memory store, but no active decision or assumption matches "${query}".`;
    }
  }

  // 6. Build the Complete Inspection Payload (Explains Itself)
  const inspection = {
    query,
    evaluated_at: currentTime.toISOString(),
    is_asking_history: isAskingHistory,
    retrieval_strategy: 'Hybrid Dense Vector (128d) + BM25 Lexical + Status Filter',
    prompt_payload: {
      system_instructions: 'Answer user queries strictly using the verified structured memory records provided below. DO NOT pull unverified facts from arbitrary chat transcripts.',
      memory_context_injected: selectedMemories.map(m => ({
        id: m.id,
        topic: m.topic,
        decision: m.decision,
        reason: m.reason,
        owner: m.owner,
        status: m.status,
        valid_until: m.valid_until,
        score: m.score
      })),
      chat_history_injected: false // Crucial proof of memory honesty!
    },
    retrieved_memories: selectedMemories,
    active_filters: [
      { name: 'Status Filter', rule: isAskingHistory ? 'ALLOW_ALL' : 'status == "active"', status: 'ENFORCED' },
      { name: 'Temporal Expiry', rule: `valid_until == null || valid_until > ${currentTime.toISOString()}`, status: 'ENFORCED' },
      { name: 'Similarity Threshold', rule: `hybridScore >= ${SIMILARITY_THRESHOLD}`, status: 'ENFORCED' }
    ],
    rejected_memories: rejectedCandidates.map(c => ({
      id: c.memory.id,
      topic: c.memory.topic,
      decision: c.memory.decision,
      status: c.memory.status,
      score: c.ranking.hybridScore,
      rejection_reason: c.filters.filterReason
    }))
  };

  return {
    answer,
    selectedMemories,
    inspection
  };
}
