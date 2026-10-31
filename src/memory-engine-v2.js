import { ObjectId } from 'mongodb';
import { embedDocuments } from './providers/embedding-provider.js';
import {
  insertMemoryDocument,
  updateMemoryDocument,
  findMemories,
  getMemoryById,
  recordMemoryEvent
} from './db-mongo.js';
import { config } from './config.js';

let simulatedClock = null;

/**
 * Returns current application time (respects Time Machine in demo mode)
 */
export function getAppNow() {
  if (config.demoMode && simulatedClock) {
    return new Date(simulatedClock);
  }
  return new Date();
}

export function setSimulatedTime(isoString) {
  if (!config.demoMode) {
    throw new Error('Simulated clock is disabled in production mode');
  }
  simulatedClock = isoString ? new Date(isoString) : null;
  return getAppNow();
}

/**
 * Privacy Gate: Refuse to persist secrets, credentials, or sensitive tokens
 */
export function checkPrivacyFilter(text) {
  const secretPatterns = [
    /bearer\s+[A-Za-z0-9_\-\.]{20,}/i,
    /api[_\-\s]?key\s*[:=]\s*[A-Za-z0-9_\-]{16,}/i,
    /password\s*[:=]\s*['"][^'"]+['"]/i,
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    /\b(?:ghp|glpat|xoxb|xoxp|sk_live)_[A-Za-z0-9]{20,}\b/
  ];

  for (const pattern of secretPatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: 'Message contains credentials, API keys, or private security tokens.'
      };
    }
  }

  return { safe: true };
}

/**
 * Parses temporal statements for logical validity
 */
export function parseTemporalValidity(text, baseDate = getAppNow()) {
  const lower = text.toLowerCase();
  
  if (lower.includes('friday')) {
    const d = new Date(baseDate);
    const day = d.getDay();
    let diff = 5 - day;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(18, 0, 0, 0);
    return { validUntil: d, isTemporal: true };
  }

  if (lower.includes('tomorrow')) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return { validUntil: d, isTemporal: true };
  }

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // Format 1: until October 30, 2026 / till November 4, 2026
  const untilMatch1 = lower.match(/(?:until|till|before|by|through|up\s+to)\s+([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i);
  if (untilMatch1) {
    const mIdx = monthNames.findIndex(m => untilMatch1[1].toLowerCase().startsWith(m));
    if (mIdx !== -1) {
      const year = untilMatch1[3] ? parseInt(untilMatch1[3], 10) : baseDate.getFullYear();
      const day = parseInt(untilMatch1[2], 10);
      const d = new Date(year, mIdx, day, 18, 0, 0);
      return { validUntil: d, isTemporal: true };
    }
  }

  // Format 2: until 30 October 2026 / 30th Oct / till 4 November 2026
  const untilMatch2 = lower.match(/(?:until|till|before|by|through|up\s+to)\s+(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:,?\s*(\d{4}))?/i);
  if (untilMatch2) {
    const mIdx = monthNames.findIndex(m => untilMatch2[2].toLowerCase().startsWith(m));
    if (mIdx !== -1) {
      const year = untilMatch2[3] ? parseInt(untilMatch2[3], 10) : baseDate.getFullYear();
      const day = parseInt(untilMatch2[1], 10);
      const d = new Date(year, mIdx, day, 18, 0, 0);
      return { validUntil: d, isTemporal: true };
    }
  }

  return { validUntil: null, isTemporal: false };
}

/**
 * Form candidate memory from structured incoming conversation
 */
export async function extractAndFormMemory({
  text,
  user,
  workspaceId,
  channel = 'architecture',
  scope = 'workspace',
  source = null,
  tags = []
}) {
  const privacyCheck = checkPrivacyFilter(text);
  if (!privacyCheck.safe) {
    return { error: privacyCheck.reason, rejected: true };
  }

  // Filter low-value greetings, transient chatter, or queries
  const isGreetingOrFiller = /^(hi|hello|hey|good morning|thanks|thank you|ok|okay|bye)\b/i.test(text.trim());
  if (isGreetingOrFiller && text.trim().length < 25) {
    return { extracted: null, reason: 'Chat filler/greeting ignored.' };
  }

  // Interrogatives and questions must NEVER be extracted as stored decisions or constraints
  const isQuestion = text.trim().endsWith('?') || 
    /^(who|what|where|when|why|how|is|are|can|could|should|would|did)\b/i.test(text.trim()) ||
    /^(do|does)\s+(we|i|you|they|it|anyone|anybody|the)\b/i.test(text.trim());
  if (isQuestion) {
    return { extracted: null, reason: 'Questions and queries are not architectural decisions or constraints.' };
  }

  // 1. Constraint Detection (Negative boundary, prohibition, freeze, or restriction)
  const isConstraint = /\b(?:do\s+not|don't|cannot|can't|must\s+not|should\s+not|never|prohibit(?:ed)?|forbidden|not\s+allowed|without\s+approval|freeze|block(?:ed)?|restrict(?:ed)?|avoid|disallow(?:ed)?|halt(?:ed)?|pause(?:d)?)\b/i.test(text) ||
    /\bno\s+(?:production|deployment|deployments|release|releases|error\s+correction|error\s+corrections|hotfix|hotfixes|change|changes|refactor|migration|push|pushes|feature|features)\b/i.test(text) ||
    /\bno\s+[a-z0-9_\-\s]+\s+(?:until|till|before|by|through)\b/i.test(text);

  // 2. Preference Detection (Developer or individual preference)
  const isPreference = /\b(?:prefer|preference|we\s+prefer|favour|favor|like\s+to|better\s+to|best\s+to|should\s+be\s+written\s+in)\b/i.test(text);

  // 3. Technical Stack / Architectural Keywords
  const hasTechnicalKeyword = /\b(?:react|vue|angular|svelte|nextjs|next\.js|node|express|fastapi|django|flask|spring|python|golang|go|rust|java|mongodb|mongo|postgres|postgresql|mysql|sqlite|redis|kafka|rabbitmq|bullmq|celery|docker|kubernetes|k8s|aws|gcp|azure|tailwind|graphql|rest|grpc|jwt|oauth|caching|cache|database|db|frontend|backend|ui|microservice|monolith|orm|prisma|mongoose|tool|tooling|stack|framework|library)\b/i.test(text);

  // 4. Decision Action Verbs & Structural Declarations
  const hasDecisionVerbs = /\b(?:will\s+be\s+using|will\s+use|are\s+using|we(?:'re|\s+are)?\s+using|using|we\s+use|use|adopt(?:ing|ed)?|standardiz(?:e|ing|ed)|settl(?:ed?|ing)\s+on|switch(?:ing|ed)?\s+to|migrat(?:e|ing|ed)\s+to|chose|chosen|choose|choosing|select(?:ed|ing)?|picked|deploy(?:ing|ed)?|built\s+with|build\s+with|going\s+with|relying\s+on|approved|now\s+approved|agreed\s+on|mandate|standard|choice|policy|rule)\b/i.test(text);

  const hasStructuralAssertion = /\b(?:as\s+our|as\s+out|is\s+our|is\s+the|for\s+(?:our|this)\s+project|our\s+frontend|our\s+backend|our\s+database|our\s+stack|our\s+choice|frontend\s+tool|backend\s+tool|database\s+tool)\b/i.test(text);

  let isDecision = isConstraint ? false : (
    (hasDecisionVerbs && (hasTechnicalKeyword || hasStructuralAssertion)) ||
    (hasStructuralAssertion && hasTechnicalKeyword) ||
    ((channel === 'architecture' || channel === 'sprint-planning') && (hasTechnicalKeyword || hasDecisionVerbs) && text.trim().length >= 15) ||
    /\bwe(?:'re| are) using|decided (?:to|on)|switching to|settled on|will use|\bwe use\b|approved|now approved/i.test(text)
  );

  // If in a dedicated team channel and length is substantive, don't drop directives
  if (!isDecision && !isConstraint && !isPreference) {
    if ((channel === 'architecture' || channel === 'sprint-planning') && text.trim().length >= 12) {
      if (/\b(?:no|freeze|stop|pause|halt|until|till|must|require|deadline|goal)\b/i.test(text)) {
        // Fallback constraint
      } else {
        isDecision = true;
      }
    } else {
      return { extracted: null, reason: 'No architectural directive or constraint pattern identified.' };
    }
  }

  const type = isConstraint ? 'constraint' : (isPreference ? 'preference' : 'decision');
  const temporal = parseTemporalValidity(text);

  let topic = 'Architecture';
  if (/redis|cache|caching|queue|bullmq|celery|kafka|rabbitmq|broker/i.test(text)) topic = 'Infrastructure';
  else if (/database|postgres|mongo|sql|nosql|dynamodb|db/i.test(text)) topic = 'Database';
  else if (/deploy|production|freeze|release|pipeline|ci\/cd|docker|container|kubernetes|k8s|error\s+correction|sprint|hotfix/i.test(text)) topic = channel === 'sprint-planning' ? 'Sprint Planning' : 'Deployment';
  else if (/frontend|react|vue|svelte|angular|next|tailwind|css|ui/i.test(text)) topic = 'Frontend';
  else if (/jwt|auth|oauth|security|token|sanitiz|port|firewall|permission|secret/i.test(text)) topic = 'Security';
  else if (/backend|api|fastapi|express|rest|grpc|service/i.test(text)) topic = 'Backend';
  else if (channel === 'sprint-planning') topic = 'Sprint Planning';

  // Statement & reason parsing
  let statement = text;
  let reason = '';
  const reasonMatch = text.match(/\b(?:because|due to|since|in order to)\b\s*(.*)$/i);
  if (reasonMatch) {
    reason = reasonMatch[1].trim();
    statement = text.slice(0, reasonMatch.index).trim();
  }

  // Clean statement
  statement = statement.replace(/^actually,?\s*/i, '').trim();

  // Generate 1024D embedding using Voyage provider
  const fullEmbeddingText = `${topic}: ${statement}. Reason: ${reason}. Type: ${type}`;
  const embeddings = await embedDocuments([fullEmbeddingText]);
  const vector = embeddings[0];

  const now = getAppNow();
  const memoryDoc = {
    _id: new ObjectId(),
    scope: scope,
    ownerId: user.id,
    workspaceId: workspaceId || 'ws_core',
    createdBy: user.id,
    type: type,
    topic: topic,
    content: {
      statement: statement,
      reason: reason || 'Team architecture consensus',
      normalizedValue: topic.toLowerCase()
    },
    tags: Array.from(new Set([topic.toLowerCase(), type, ...(tags || [])])),
    source: source || {
      kind: 'conversation',
      channel: channel,
      excerpt: text.length > 120 ? text.slice(0, 117) + '...' : text
    },
    confidence: 0.96,
    sensitivity: scope === 'user' ? 'private' : 'workspace',
    confirmation: 'confirmed',
    status: (temporal.validUntil && new Date(temporal.validUntil) <= now) ? 'expired' : 'active',
    createdAt: now,
    updatedAt: now,
    validFrom: now,
    validUntil: temporal.validUntil,
    purgeAt: temporal.validUntil ? new Date(Math.max(Date.now(), temporal.validUntil.getTime()) + (30 * 24 * 3600 * 1000)) : null,
    supersedesId: null,
    supersededBy: null,
    version: 1,
    embedding: vector,
    embeddingModel: config.embedding.model,
    embeddingDimensions: config.embedding.dimensions
  };

  // Check conflict / superseding
  const superseded = await handleSuperseding(memoryDoc);

  await insertMemoryDocument(memoryDoc);
  await recordMemoryEvent({
    eventId: `evt_${Date.now()}`,
    type: 'MEMORY_CREATED',
    memoryId: memoryDoc._id.toString(),
    actorId: user.id,
    scope: memoryDoc.scope,
    timestamp: now
  });

  return {
    extracted: memoryDoc,
    superseded: superseded
  };
}

/**
 * Handle superseding of older decisions with new explicit directives
 */
export async function handleSuperseding(newMemory) {
  const activeMemories = await findMemories({
    workspaceId: newMemory.workspaceId,
    status: 'active'
  });

  const newText = ((newMemory.content?.statement || '') + ' ' + (newMemory.source?.excerpt || '')).toLowerCase();
  const isSwitchSignal = /switch|switching|actually|now approved|approved|changed|extend|reschedule|update|instead of|replace|replacing|migrat(?:e|ing|ion)|moving to|move to|transition|prefer|standardiz(?:e|ing)|will be using|adopt(?:ing|ed)?/i.test(newText);

  let lastSuperseded = null;

  for (const existing of activeMemories) {
    if (existing._id.toString() === newMemory._id.toString()) continue;

    const existingText = (existing.content?.statement || '').toLowerCase();
    const sameTopic = existing.topic.toLowerCase() === newMemory.topic.toLowerCase();
    
    // Redis approval superseding prior Redis restriction
    const isRedisTransition = existing.topic === 'Infrastructure' &&
      existingText.includes('redis') &&
      newText.includes('redis');

    // Database switch (e.g. DynamoDB instead of MongoDB, or any new database directive)
    const isDbSwitch = (existing.topic === 'Database' && newMemory.topic === 'Database') ||
      (existing.topic === 'Database' && isSwitchSignal) ||
      (/mongo|dynamodb|postgres|sql|database|db/i.test(existingText) && /mongo|dynamodb|postgres|sql|database|db/i.test(newText) && isSwitchSignal);

    // Frontend switch
    const isFrontendSwitch = (existing.topic === 'Frontend' && newMemory.topic === 'Frontend') ||
      (/react|vue|angular|svelte|next/i.test(existingText) && /react|vue|angular|svelte|next/i.test(newText));

    // Deployment freeze update / rescheduling (a new deployment freeze replaces any prior active deployment freeze)
    const isDeploymentUpdate = (existing.topic === 'Deployment' && newMemory.topic === 'Deployment') ||
      (/freeze|deployment/i.test(existingText) && /freeze|deployment/i.test(newText));

    if (isRedisTransition || isDeploymentUpdate || isDbSwitch || isFrontendSwitch || (sameTopic && isSwitchSignal)) {
      const now = getAppNow();
      await updateMemoryDocument(existing._id, {
        status: 'superseded',
        supersededBy: newMemory._id.toString(),
        updatedAt: now
      });

      newMemory.supersedesId = existing._id.toString();

      await recordMemoryEvent({
        eventId: `evt_sup_${Date.now()}`,
        type: 'MEMORY_SUPERSEDED',
        memoryId: existing._id.toString(),
        supersededBy: newMemory._id.toString(),
        actorId: newMemory.createdBy,
        timestamp: now
      });

      lastSuperseded = existing;
    }
  }

  return lastSuperseded;
}

/**
 * Logical expiry refresh: checks validUntil against current app time bidirectionally
 */
export async function refreshExpirations() {
  const now = getAppNow();
  const memories = await findMemories({});
  let count = 0;

  for (const mem of memories) {
    if (!mem.validUntil) continue;
    // Superseded directives remain superseded across time
    if (mem.status === 'superseded') continue;

    const expiryDate = new Date(mem.validUntil);
    if (expiryDate <= now && mem.status !== 'expired') {
      await updateMemoryDocument(mem._id, {
        status: 'expired',
        updatedAt: now
      });
      await recordMemoryEvent({
        eventId: `evt_exp_${Date.now()}_${count}`,
        type: 'MEMORY_EXPIRED',
        memoryId: mem._id.toString(),
        timestamp: now
      });
      count++;
    } else if (expiryDate > now && mem.status === 'expired') {
      // Bidirectional time travel: if simulated time moved back before the expiry date, reactivate!
      await updateMemoryDocument(mem._id, {
        status: 'active',
        updatedAt: now
      });
      await recordMemoryEvent({
        eventId: `evt_react_${Date.now()}_${count}`,
        type: 'MEMORY_REACTIVATED',
        memoryId: mem._id.toString(),
        timestamp: now
      });
      count++;
    }
  }

  return count;
}
