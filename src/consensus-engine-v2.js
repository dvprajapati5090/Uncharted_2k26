import { findMemories, updateMemoryDocument, getDb, isMongoConnected } from './db-mongo.js';
import { getAppNow, checkPrivacyFilter } from './memory-engine-v2.js';
import { realtimeSync } from './realtime-sync.js';

export const AGENT_PERSONAS = [
  {
    id: 'agent_architect',
    name: 'Atlas Architect',
    role: 'System Architecture & Data Modeling',
    avatar: '🏛️',
    description: 'Enforces database consistency, schema validity, and tech stack compliance.'
  },
  {
    id: 'agent_security',
    name: 'Sentinel Guard',
    role: 'Security & Secret Sanitization',
    avatar: '🔒',
    description: 'Enforces zero-trust boundaries, credential prevention, and workspace isolation.'
  },
  {
    id: 'agent_devops',
    name: 'Pipeline Marshal',
    role: 'Release Governance & Delivery',
    avatar: '🚀',
    description: 'Enforces CI/CD pipeline integrity, freeze window adherence, and deployment safety.'
  }
];

const inMemoryConsensusStore = [];

/**
 * Architect Agent Evaluator
 */
function evaluateArchitect(memoryDoc, activeMemories = []) {
  const text = ((memoryDoc.content?.statement || '') + ' ' + (memoryDoc.topic || '')).toLowerCase();

  // Check for rogue unauthorized databases
  const rogueDbs = ['dynamodb', 'couchbase', 'cassandra', 'neo4j', 'oracle'];
  const hasRogueDb = rogueDbs.some(db => text.includes(db));
  if (hasRogueDb) {
    return {
      agentId: 'agent_architect',
      agentName: 'Atlas Architect',
      role: 'System Architecture',
      vote: 'reject',
      veto: false,
      confidence: 0.98,
      rationale: 'Primary persistence layer is strictly standardized on MongoDB Atlas. Introducing unvetted datastores causes schema fragmentation.'
    };
  }

  // Check Redis caching proposal
  if (text.includes('redis')) {
    if (text.includes('cache') || text.includes('caching') || text.includes('approved')) {
      return {
        agentId: 'agent_architect',
        agentName: 'Atlas Architect',
        role: 'System Architecture',
        vote: 'approve',
        confidence: 0.95,
        rationale: 'Redis caching tier is architecturally compatible with primary MongoDB Atlas document persistence.'
      };
    }
  }

  return {
    agentId: 'agent_architect',
    agentName: 'Atlas Architect',
    role: 'System Architecture',
    vote: 'approve',
    confidence: 0.94,
    rationale: 'Statement complies with team technical stack and data modeling guidelines.'
  };
}

/**
 * Security Agent Evaluator
 */
function evaluateSecurity(memoryDoc) {
  const text = memoryDoc.content?.statement || '';
  const privacyCheck = checkPrivacyFilter(text);

  if (!privacyCheck.safe) {
    return {
      agentId: 'agent_security',
      agentName: 'Sentinel Guard',
      role: 'Security & Privacy',
      vote: 'reject',
      veto: true, // Hard Veto
      confidence: 1.0,
      rationale: `CRITICAL SECURITY VETO: ${privacyCheck.reason}`
    };
  }

  // Check for suspicious open access patterns
  const lower = text.toLowerCase();
  if (lower.includes('disable auth') || lower.includes('bypass authentication') || lower.includes('public key without encryption')) {
    return {
      agentId: 'agent_security',
      agentName: 'Sentinel Guard',
      role: 'Security & Privacy',
      vote: 'reject',
      veto: true,
      confidence: 0.99,
      rationale: 'CRITICAL SECURITY VETO: Proposal attempts to degrade security posture or disable authentication boundaries.'
    };
  }

  return {
    agentId: 'agent_security',
    agentName: 'Sentinel Guard',
    role: 'Security & Privacy',
    vote: 'approve',
    confidence: 0.97,
    rationale: 'Passed zero-trust security audit: Sanitized payload with zero credential exposure.'
  };
}

/**
 * DevOps & Release Agent Evaluator
 */
function evaluateDevops(memoryDoc, activeMemories = []) {
  const text = (memoryDoc.content?.statement || '').toLowerCase();
  const now = getAppNow();

  // Check if trying to deploy during active freeze
  const activeFreeze = activeMemories.find(m => 
    m.topic === 'Deployment' && 
    m.status === 'active' && 
    (!m.validUntil || new Date(m.validUntil) > now)
  );

  const attemptsDeployNow = /(?:deploy|ship|release)\s+(?:now|today|immediately)\s+(?:to\s+prod|production)/i.test(text);
  const attemptsBypass = /bypass\s+(?:freeze|approval|pipeline|window|gate)/i.test(text);

  if ((activeFreeze && attemptsDeployNow) || attemptsBypass) {
    return {
      agentId: 'agent_devops',
      agentName: 'Pipeline Marshal',
      role: 'Release Governance',
      vote: 'reject',
      veto: true, // Hard Veto
      confidence: 0.99,
      rationale: activeFreeze
        ? `CRITICAL PIPELINE VETO: Violates active deployment freeze rule ("${activeFreeze.content?.statement}") valid until ${new Date(activeFreeze.validUntil).toLocaleDateString()}.`
        : 'CRITICAL PIPELINE VETO: Bypassing deployment gates and freeze protocols is strictly prohibited.'
    };
  }

  // Normal deployment or sprint boundary constraint
  if (memoryDoc.topic === 'Deployment' || text.includes('freeze') || text.includes('deployment')) {
    return {
      agentId: 'agent_devops',
      agentName: 'Pipeline Marshal',
      role: 'Release Governance',
      vote: 'approve',
      confidence: 0.96,
      rationale: 'Adheres to sprint release governance protocols and automated CI delivery gates.'
    };
  }

  return {
    agentId: 'agent_devops',
    agentName: 'Pipeline Marshal',
    role: 'Release Governance',
    vote: 'approve',
    confidence: 0.93,
    rationale: 'Infrastructure operations and pipeline telemetry requirements satisfied.'
  };
}

/**
 * Executes Multi-Agent Quorum Consensus on a candidate memory
 */
export async function evaluateMemoryConsensus(memoryDoc, options = {}) {
  const workspaceId = memoryDoc.workspaceId || options.workspaceId || 'ws_core';
  const activeMemories = await findMemories({ workspaceId, status: 'active' });

  // 1. Gather Agent Ballots
  const architectBallot = evaluateArchitect(memoryDoc, activeMemories);
  const securityBallot = evaluateSecurity(memoryDoc);
  const devopsBallot = evaluateDevops(memoryDoc, activeMemories);

  const votes = [architectBallot, securityBallot, devopsBallot];

  // 2. Calculate Quorum & Veto Boundaries
  const approvalCount = votes.filter(v => v.vote === 'approve').length;
  const hasHardVeto = votes.some(v => v.veto === true);
  const approvalRate = parseFloat((approvalCount / votes.length).toFixed(2));
  const quorumReached = !hasHardVeto && approvalRate >= 0.67;

  const status = quorumReached ? 'ratified' : 'rejected';

  const proposal = {
    id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    memoryId: memoryDoc._id ? memoryDoc._id.toString() : null,
    statement: memoryDoc.content?.statement || memoryDoc.decision || memoryDoc.topic,
    topic: memoryDoc.topic || 'General',
    proposer: memoryDoc.ownerId || options.proposer || 'u_sarah',
    workspaceId,
    status,
    quorumReached,
    approvalRate,
    approvalCount,
    totalVoters: votes.length,
    hasHardVeto,
    votes,
    dissentingViews: votes.filter(v => v.vote === 'reject').map(v => `${v.agentName}: ${v.rationale}`),
    evaluatedAt: new Date().toISOString()
  };

  // 3. Persist proposal
  inMemoryConsensusStore.unshift(proposal);

  const database = getDb();
  if (database && isMongoConnected()) {
    try {
      await database.collection('consensus_proposals').insertOne(proposal);
    } catch (e) {
      console.warn('[MongoDB] Proposal persistence notice:', e.message);
    }
  }

  realtimeSync.broadcast({
    operationType: 'consensus',
    collection: 'consensus_proposals',
    documentId: proposal.id,
    topic: proposal.topic,
    summary: `Quorum Consensus ${status.toUpperCase()} (${Math.round(approvalRate * 100)}%): "${proposal.statement.slice(0, 60)}"`,
    status,
    scope: memoryDoc.scope || 'workspace',
    ownerId: memoryDoc.ownerId || 'system'
  });

  // 4. Update memory document with consensus ratification status if persisted
  if (memoryDoc._id) {
    try {
      await updateMemoryDocument(memoryDoc._id, {
        confirmation: quorumReached ? 'confirmed' : 'rejected_quorum',
        consensus: {
          status,
          quorumReached,
          approvalRate,
          evaluatedAt: proposal.evaluatedAt
        }
      });
    } catch (e) {}
  }

  return proposal;
}

/**
 * Returns historical list of consensus votes
 */
export async function getConsensusHistory(workspaceId = 'ws_core') {
  const database = getDb();
  if (database && isMongoConnected()) {
    try {
      const docs = await database.collection('consensus_proposals')
        .find({ workspaceId })
        .sort({ evaluatedAt: -1 })
        .limit(20)
        .toArray();
      if (docs.length > 0) return docs;
    } catch (e) {}
  }

  if (inMemoryConsensusStore.length > 0) {
    return inMemoryConsensusStore.filter(p => p.workspaceId === workspaceId);
  }

  // Default seed proposals
  const defaultSeeds = [
    {
      id: 'prop_seed_001',
      memoryId: 'seed_mem_redis',
      statement: 'We have now approved Redis for caching, but MongoDB Atlas must remain our primary database.',
      topic: 'Infrastructure',
      proposer: 'u_sarah',
      workspaceId: 'ws_core',
      status: 'ratified',
      quorumReached: true,
      approvalRate: 1.0,
      approvalCount: 3,
      totalVoters: 3,
      hasHardVeto: false,
      votes: [
        {
          agentId: 'agent_architect',
          agentName: 'Atlas Architect',
          role: 'System Architecture',
          vote: 'approve',
          confidence: 0.98,
          rationale: 'Redis caching tier is architecturally compatible with primary MongoDB Atlas document persistence.'
        },
        {
          agentId: 'agent_security',
          agentName: 'Sentinel Guard',
          role: 'Security & Privacy',
          vote: 'approve',
          confidence: 0.97,
          rationale: 'Passed zero-trust security audit: Sanitized payload with zero credential exposure.'
        },
        {
          agentId: 'agent_devops',
          agentName: 'Pipeline Marshal',
          role: 'Release Governance',
          vote: 'approve',
          confidence: 0.96,
          rationale: 'Adheres to sprint release governance protocols and automated CI delivery gates.'
        }
      ],
      dissentingViews: [],
      evaluatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'prop_seed_002',
      memoryId: 'seed_mem_veto',
      statement: 'Deploy hotfix directly to production cluster immediately without waiting for freeze window.',
      topic: 'Deployment',
      proposer: 'u_marcus',
      workspaceId: 'ws_core',
      status: 'rejected',
      quorumReached: false,
      approvalRate: 0.33,
      approvalCount: 1,
      totalVoters: 3,
      hasHardVeto: true,
      votes: [
        {
          agentId: 'agent_architect',
          agentName: 'Atlas Architect',
          role: 'System Architecture',
          vote: 'approve',
          confidence: 0.85,
          rationale: 'Hotfix patch syntax adheres to service framework.'
        },
        {
          agentId: 'agent_security',
          agentName: 'Sentinel Guard',
          role: 'Security & Privacy',
          vote: 'reject',
          veto: false,
          confidence: 0.92,
          rationale: 'Bypassing pipeline gates skips automated static vulnerability scanning.'
        },
        {
          agentId: 'agent_devops',
          agentName: 'Pipeline Marshal',
          role: 'Release Governance',
          vote: 'reject',
          veto: true,
          confidence: 1.0,
          rationale: 'CRITICAL PIPELINE VETO: Violates active deployment freeze rule valid until November 5, 2026.'
        }
      ],
      dissentingViews: [
        'Sentinel Guard: Bypassing pipeline gates skips automated static vulnerability scanning.',
        'Pipeline Marshal: CRITICAL PIPELINE VETO: Violates active deployment freeze rule valid until November 5, 2026.'
      ],
      evaluatedAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  inMemoryConsensusStore.push(...defaultSeeds);
  return defaultSeeds;
}

/**
 * Returns quorum stats
 */
export async function getConsensusStats(workspaceId = 'ws_core') {
  const history = await getConsensusHistory(workspaceId);
  const total = history.length;
  const ratified = history.filter(p => p.status === 'ratified').length;
  const rejected = history.filter(p => p.status === 'rejected').length;
  const vetoes = history.filter(p => p.hasHardVeto).length;

  return {
    totalProposals: total,
    ratifiedCount: ratified,
    rejectedCount: rejected,
    vetoCount: vetoes,
    quorumThreshold: '67% (2 of 3 agents)',
    activeAgents: AGENT_PERSONAS.length
  };
}
