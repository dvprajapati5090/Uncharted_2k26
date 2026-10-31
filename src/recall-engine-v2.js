import { embedQuery } from './providers/embedding-provider.js';
import { executeAtlasVectorSearch, getMemoryById, findMemories } from './db-mongo.js';
import { getAppNow, refreshExpirations } from './memory-engine-v2.js';
import { generateMultiModelAnswer } from './providers/llm-provider.js';

/**
 * Recall engine using MongoDB Atlas $vectorSearch with server-side ownership & lifecycle validation
 */
export async function recallMemories({
  query,
  user,
  workspaceId,
  scope = 'all',
  isHistorical = false,
  model = 'gemini-3-flash-preview',
  apiKey = ''
}) {
  await refreshExpirations();
  const now = getAppNow();

  const allowedOwnerId = user?.id || 'u_sarah';
  const allowedWorkspaceId = workspaceId || 'ws_core';

  // Detect broad ledger summary queries (e.g. "Give me all the memory ledger", "List all decisions")
  const isBroadLedgerQuery = /all\s+(?:the\s+)?(?:memory|memories|ledger|decisions|constraints)|list\s+(?:all\s+)?(?:memories|ledger|decisions)|show\s+(?:all\s+)?(?:memories|ledger|decisions)|give\s+(?:me\s+)?all|summary\s+of\s+memories|what\s+(?:are\s+)?(?:all\s+)?(?:the\s+)?decisions/i.test(query.trim());

  let selectedMemories = [];
  const rejectedMemories = [];

  if (isBroadLedgerQuery) {
    const allActive = await findMemories({
      workspaceId: allowedWorkspaceId,
      status: 'active'
    });
    selectedMemories = allActive.filter(mem => {
      return mem.scope === 'workspace' 
        ? mem.workspaceId === allowedWorkspaceId 
        : mem.ownerId === allowedOwnerId;
    });
  } else {
    // 1. Embed query into 1024D vector using Voyage provider
    const queryVector = await embedQuery(query);

    // 2. Execute $vectorSearch against MongoDB Atlas
    const rawResults = await executeAtlasVectorSearch({
      queryVector,
      limit: 10,
      numCandidates: 100,
      filter: {
        workspaceId: allowedWorkspaceId
      }
    });

    const qWords = query.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);

    // 3. Server-Side Secondary Verification (Guarantees privacy & temporal safety)
    for (const candidate of rawResults) {
      const isOwnerMatch = candidate.scope === 'workspace' 
        ? candidate.workspaceId === allowedWorkspaceId 
        : candidate.ownerId === allowedOwnerId;

      if (!isOwnerMatch) {
        rejectedMemories.push({
          id: candidate._id.toString(),
          topic: candidate.topic,
          reason: 'Ownership scope mismatch (private to another user)',
          score: candidate.score,
          statement: candidate.content?.statement
        });
        continue;
      }

      if (!isHistorical && candidate.status === 'superseded') {
        const replacer = candidate.supersededBy ? await getMemoryById(candidate.supersededBy) : null;
        rejectedMemories.push({
          id: candidate._id.toString(),
          topic: candidate.topic,
          reason: `Superseded by newer decision "${replacer?.content?.statement || 'updated directive'}"`,
          score: candidate.score,
          statement: candidate.content?.statement
        });
        continue;
      }

      const candText = ((candidate.content?.statement || '') + ' ' + (candidate.topic || '')).toLowerCase();
      const hasEntityMatch = qWords.some(w => candText.includes(w));
      const threshold = hasEntityMatch ? 0.08 : 0.20;

      const isExpired = candidate.status === 'expired' || (candidate.validUntil && new Date(candidate.validUntil) < now);
      if (!isHistorical && isExpired) {
        if (candidate.score >= threshold || hasEntityMatch) {
          const dateStr = candidate.validUntil 
            ? new Date(candidate.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'scheduled date';
          rejectedMemories.push({
            id: candidate._id.toString(),
            topic: candidate.topic,
            reason: `Logically expired on ${dateStr}`,
            score: candidate.score,
            statement: candidate.content?.statement,
            validUntil: candidate.validUntil,
            isExpired: true
          });
        }
        continue;
      }

      if (candidate.score < threshold) {
        rejectedMemories.push({
          id: candidate._id.toString(),
          topic: candidate.topic,
          reason: `Relevance score too low (${candidate.score})`,
          score: candidate.score,
          statement: candidate.content?.statement
        });
        continue;
      }

      selectedMemories.push(candidate);
    }

    // Hybrid keyword fallback: if vector search missed active memories containing query entities (e.g. dynamodb, redis)
    if (selectedMemories.length === 0) {
      const allActive = await findMemories({
        workspaceId: allowedWorkspaceId,
        status: 'active'
      });
      for (const mem of allActive) {
        const isOwnerMatch = mem.scope === 'workspace' 
          ? mem.workspaceId === allowedWorkspaceId 
          : mem.ownerId === allowedOwnerId;
        if (!isOwnerMatch) continue;

        const memText = ((mem.content?.statement || '') + ' ' + (mem.topic || '')).toLowerCase();
        if (qWords.some(w => w.length > 3 && memText.includes(w))) {
          if (!selectedMemories.some(s => s._id.toString() === mem._id.toString())) {
            selectedMemories.push(mem);
          }
        }
      }

      // Check expired memories for temporal explanation if no active memories matched
      if (selectedMemories.length === 0 && !rejectedMemories.some(r => r.isExpired && qWords.some(w => w.length > 3 && (r.statement || '').toLowerCase().includes(w)))) {
        const allExpired = await findMemories({
          workspaceId: allowedWorkspaceId,
          status: 'expired'
        });
        for (const expMem of allExpired) {
          const expText = ((expMem.content?.statement || '') + ' ' + (expMem.topic || '')).toLowerCase();
          if (qWords.some(w => w.length > 3 && expText.includes(w))) {
            const dateStr = expMem.validUntil 
              ? new Date(expMem.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'scheduled date';
            if (!rejectedMemories.some(r => r.id === expMem._id.toString())) {
              rejectedMemories.push({
                id: expMem._id.toString(),
                topic: expMem.topic,
                reason: `Logically expired on ${dateStr}`,
                score: 0.95,
                statement: expMem.content?.statement,
                validUntil: expMem.validUntil,
                isExpired: true
              });
            }
          }
        }
      }
    }
  }

  // 5. Generate Multi-Model Grounded Answer & Dual-Mode Baseline (with memory vs. without memory)
  const responseGeneration = await generateMultiModelAnswer({
    query,
    memories: selectedMemories,
    rejectedMemories,
    model,
    apiKey
  });

  const trace = {
    query: query,
    evaluatedAt: now.toISOString(),
    vectorIndex: 'memory_vector_index',
    dimensions: 1024,
    scopesSearched: ['user', 'workspace'],
    selectedCount: selectedMemories.length,
    rejectedCount: rejectedMemories.length,
    selectedMemories: selectedMemories.map(m => ({
      id: m._id.toString(),
      type: m.type,
      topic: m.topic,
      statement: m.content.statement,
      score: m.score,
      owner: m.ownerId
    })),
    rejectedMemories: rejectedMemories,
    promptPayload: responseGeneration.promptPayload || {
      chat_history_injected: false,
      memory_records_injected: selectedMemories.map(m => m._id.toString())
    }
  };

  return {
    answer: responseGeneration.withMemory,
    withoutMemoryAnswer: responseGeneration.withoutMemory,
    selectedMemories: selectedMemories,
    trace: trace
  };
}

/**
 * Dual-Mode Response Synthesizer:
 * Generates the memory-grounded response and the no-memory baseline for comparison
 */
function synthesizeResponses(query, memories, rejectedMemories = []) {
  const qLower = query.toLowerCase();

  // Baseline (No Memory injected)
  let withoutMemory = `For general tasks, standard architectural patterns recommend typical industry tooling. For background job systems, a standard solution often employs Redis with BullMQ or Celery for rapid distributed task execution.`;
  if (qLower.includes('deploy') || qLower.includes('freeze')) {
    withoutMemory = `Standard deployment practices allow continuous delivery and automated pipeline deployments whenever CI checks pass, unless a manual freeze is coordinated in chat.`;
  } else if (qLower.includes('database') || qLower.includes('db')) {
    withoutMemory = `Modern cloud architectures commonly default to managed relational databases like PostgreSQL (Amazon RDS or Supabase) for transactional integrity.`;
  }

  // Check if an expired constraint explains why there is no active rule
  const expiredDeployment = rejectedMemories.find(r => 
    r.isExpired && (r.topic === 'Deployment' || /freeze|deployment/i.test(r.statement || ''))
  );

  if (memories.length === 0) {
    if ((qLower.includes('deploy') || qLower.includes('freeze')) && expiredDeployment) {
      const expDate = expiredDeployment.validUntil 
        ? new Date(expiredDeployment.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'the scheduled date';
      return {
        withMemory: `The prior restriction ("${expiredDeployment.statement}") was in effect, but it expired on ${expDate}. There are currently no active deployment freeze rules.`,
        withoutMemory
      };
    }

    return {
      withMemory: `I checked the persistent memory ledger, but no active decision or constraint matches "${query}".`,
      withoutMemory
    };
  }

  const primary = memories[0];
  let answer = '';

  if (qLower.includes('deploy') || qLower.includes('freeze')) {
    const deploymentMem = memories.find(m => m.topic === 'Deployment' || /freeze|deployment/i.test(m.content?.statement || ''));
    if (deploymentMem) {
      const untilStr = deploymentMem.validUntil 
        ? ` until ${new Date(deploymentMem.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : '';
      return {
        withMemory: `Based on stored team constraint: "${deploymentMem.content.statement}"${untilStr}. (${deploymentMem.content.reason || 'Team architecture consensus'})`,
        withoutMemory
      };
    } else if (expiredDeployment) {
      const expDate = expiredDeployment.validUntil 
        ? new Date(expiredDeployment.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'the scheduled date';
      return {
        withMemory: `The prior restriction ("${expiredDeployment.statement}") was in effect, but it expired on ${expDate}. There are currently no active deployment freeze rules.`,
        withoutMemory
      };
    } else {
      return {
        withMemory: `I checked the persistent memory ledger, but no active decision or constraint matches "${query}".`,
        withoutMemory
      };
    }
  } else if (qLower.includes('background job') || qLower.includes('job system') || qLower.includes('queue')) {
    const hasRedisRestriction = memories.some(m => 
      m.type === 'constraint' && m.content.statement.toLowerCase().includes('redis')
    );
    const hasRedisApproval = memories.some(m => 
      m.type === 'decision' && m.content.statement.toLowerCase().includes('approved redis')
    );

    if (hasRedisApproval) {
      answer = `Based on stored memory, we have now approved Redis for caching. However, our persistent database remains MongoDB Atlas. You can design the job queues using approved Redis or native MongoDB change-stream queues.`;
    } else if (hasRedisRestriction) {
      answer = `Based on stored memory, we have an active constraint: "Do not introduce Redis without approval". Therefore, we should build the background job system using MongoDB Change Streams or native Node.js worker pools without external queue infrastructure.`;
    } else {
      answer = `Based on stored architecture decisions: ${primary.content.statement}.`;
    }
  } else if (qLower.includes('redis') && qLower.includes('caching')) {
    const hasRedisApproval = memories.some(m => 
      m.type === 'decision' && m.content.statement.toLowerCase().includes('approved redis')
    );
    if (hasRedisApproval) {
      answer = `Based on stored team memory: We have now approved Redis for caching, but MongoDB Atlas must remain our primary database.. (Team architecture consensus)`;
    } else {
      answer = `Based on stored team memory: ${primary.content.statement}. (${primary.content.reason})`;
    }
  } else if (qLower.includes('database') || qLower.includes('db')) {
    answer = `We are using ${primary.content.statement}. Reason: ${primary.content.reason}.`;
    if (primary.supersedesId) {
      answer += ` (Note: This superseded our earlier decision).`;
    }
  } else {
    answer = `Based on stored team memory: ${primary.content.statement}. (${primary.content.reason})`;
  }

  return {
    withMemory: answer,
    withoutMemory: withoutMemory
  };
}
