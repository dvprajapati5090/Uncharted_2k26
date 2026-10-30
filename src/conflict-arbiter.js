import { findMemories, getMemoryById, updateMemoryDocument, insertMemoryDocument } from './db-mongo.js';
import { embedQuery, cosineSimilarity } from './providers/embedding-provider.js';
import { getAppNow } from './memory-engine-v2.js';
import { evaluateMemoryConsensus } from './consensus-engine-v2.js';

/**
 * Pre-Commit Conflict Arbiter:
 * Scans candidate memory statements against authoritative active memories
 * to prevent knowledge corruption and policy divergence before storage.
 */
export async function analyzePreCommitConflict({
  text = '',
  statement = '',
  topic = '',
  workspaceId = 'ws_core',
  userId = 'u_sarah'
}) {
  const queryText = (statement || text).trim();
  if (!queryText) {
    return { hasConflict: false, status: 'clean' };
  }

  // 1. Fetch active memories in workspace
  const activeMemories = await findMemories({ workspaceId, status: 'active' });
  if (!activeMemories || activeMemories.length === 0) {
    return { hasConflict: false, status: 'no_existing_memories' };
  }

  // 2. Embed candidate text into 1024D vector
  const candidateVector = await embedQuery(queryText);

  // 3. Scan for semantic overlaps and polarity contradictions
  let highestConflict = null;
  const overlaps = [];

  const lowerCandidate = queryText.toLowerCase();
  const isCandidateNegation = /\b(do not|don't|no|never|forbidden|cannot|can't|prohibit|freeze)\b/i.test(lowerCandidate);
  const isCandidateApproval = /\b(approved?|allow|permitted?|enabled?|adopt|use|switch to|standardize on)\b/i.test(lowerCandidate);

  for (const memory of activeMemories) {
    const memStatement = memory.content?.statement || '';
    const memReason = memory.content?.reason || '';
    const fullMemText = `${memStatement} ${memReason}`.toLowerCase();
    
    // Compute semantic cosine similarity
    const sim = memory.embedding ? cosineSimilarity(candidateVector, memory.embedding) : 0;
    
    // Check polarity clash
    const isMemNegation = /\b(do not|don't|no|never|forbidden|cannot|can't|prohibit|freeze)\b/i.test(fullMemText);
    const isMemApproval = /\b(approved?|allow|permitted?|enabled?|adopt|use|switch to|standardize on)\b/i.test(fullMemText);

    const hasPolarityClash = (isCandidateApproval && isMemNegation) || (isCandidateNegation && isMemApproval);
    const isSameTopic = topic && memory.topic && topic.toLowerCase() === memory.topic.toLowerCase();
    
    // Entity keyword overlap check (e.g. "redis", "deploy", "freeze", "mongodb")
    const keywords = ['redis', 'deploy', 'deployment', 'freeze', 'database', 'mongodb', 'postgres', 'caching', 'auth'];
    const sharedKeywords = keywords.filter(k => lowerCandidate.includes(k) && fullMemText.includes(k));

    if (sim >= 0.70 || (sharedKeywords.length > 0 && hasPolarityClash) || (isSameTopic && hasPolarityClash)) {
      let severity = 'low';
      let conflictType = 'scope_overlap';

      if (hasPolarityClash && sharedKeywords.length > 0) {
        severity = 'high';
        conflictType = 'direct_contradiction';
      } else if (lowerCandidate.includes('freeze') || fullMemText.includes('freeze')) {
        severity = 'high';
        conflictType = 'governance_freeze_conflict';
      } else if (sim >= 0.85) {
        severity = 'medium';
        conflictType = 'semantic_redundancy';
      }

      const conflictItem = {
        memoryId: memory._id.toString(),
        statement: memStatement,
        topic: memory.topic,
        ownerId: memory.ownerId,
        similarity: parseFloat(sim.toFixed(4)),
        conflictType,
        severity,
        sharedKeywords,
        hasPolarityClash
      };

      overlaps.push(conflictItem);

      if (!highestConflict || (severity === 'high' && highestConflict.severity !== 'high') || sim > highestConflict.similarity) {
        highestConflict = conflictItem;
      }
    }
  }

  if (!highestConflict) {
    return {
      hasConflict: false,
      status: 'clear_for_commit',
      confidence: 1.0,
      checkedAgainstCount: activeMemories.length
    };
  }

  // 4. Formulate intelligent arbitration recommendations
  const recommendedStrategies = [];
  if (highestConflict.conflictType === 'direct_contradiction') {
    recommendedStrategies.push({
      action: 'supersede',
      label: 'Supersede Existing Directive',
      description: `Formally replace active memory #${highestConflict.memoryId} with bidirectional lineage.`,
      recommended: true
    });
    recommendedStrategies.push({
      action: 'quorum_dispute',
      label: 'Submit to Multi-Agent Quorum',
      description: 'Route to Atlas Architect, Sentinel Guard & Pipeline Marshal for ratification voting.',
      recommended: false
    });
    recommendedStrategies.push({
      action: 'contextual_exception',
      label: 'Attach Contextual Boundary',
      description: 'Scope new decision specifically (e.g., "Allowed for caching only while MongoDB remains primary").',
      recommended: false
    });
  } else if (highestConflict.conflictType === 'governance_freeze_conflict') {
    recommendedStrategies.push({
      action: 'quorum_dispute',
      label: 'Request Governance Quorum Override',
      description: 'Pipeline Marshal must evaluate deployment risks before overriding freeze.',
      recommended: true
    });
  } else {
    recommendedStrategies.push({
      action: 'supersede',
      label: 'Update Existing Policy',
      description: 'Update existing memory with refined parameters.',
      recommended: true
    });
  }

  return {
    hasConflict: true,
    status: 'conflict_detected',
    highestConflict,
    allConflicts: overlaps,
    totalActiveScanned: activeMemories.length,
    recommendedStrategies,
    advisoryMessage: `Candidate directive collides with active team policy: "${highestConflict.statement}" (${highestConflict.conflictType}).`
  };
}

/**
 * Executes a chosen resolution strategy for a detected conflict.
 */
export async function executeConflictResolution({
  strategy,
  candidateMemory,
  conflictingMemoryId,
  user = { id: 'u_sarah' }
}) {
  const existing = await getMemoryById(conflictingMemoryId);
  if (!existing) {
    throw new Error(`Conflicting memory #${conflictingMemoryId} not found`);
  }

  if (strategy === 'supersede') {
    // 1. Mark existing as superseded
    await updateMemoryDocument(conflictingMemoryId, {
      status: 'superseded',
      supersededBy: candidateMemory._id?.toString() || 'pending_creation',
      updatedAt: getAppNow()
    });

    return {
      success: true,
      resolution: 'superseded',
      message: `Active memory #${conflictingMemoryId} superseded. Lineage preserved.`
    };
  }

  if (strategy === 'quorum_dispute') {
    // 2. Submit candidate to multi-agent consensus
    const consensusResult = await evaluateMemoryConsensus(candidateMemory, {
      proposer: user.id,
      workspaceId: candidateMemory.workspaceId || 'ws_core'
    });

    return {
      success: true,
      resolution: 'quorum_evaluated',
      consensusResult,
      message: `Submitted to Multi-Agent Quorum: Status is ${consensusResult.status.toUpperCase()} (${Math.round(consensusResult.approvalRate * 100)}%).`
    };
  }

  return {
    success: true,
    resolution: 'manual_override',
    message: 'Conflict resolved via manual override.'
  };
}
