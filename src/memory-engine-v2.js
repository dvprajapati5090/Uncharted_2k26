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

  const untilMatch = lower.match(/(?:until|before|by)\s+([a-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
  if (untilMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIdx = monthNames.findIndex(m => untilMatch[1].toLowerCase().startsWith(m));
    if (mIdx !== -1) {
      const year = untilMatch[3] ? parseInt(untilMatch[3], 10) : baseDate.getFullYear();
      const day = parseInt(untilMatch[2], 10);
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
  scope = 'workspace'
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

  const isDecision = /we(?:'re| are) using|decided (?:to|on)|switching to|settled on|will use|\bwe use\b|approved|now approved/i.test(text);
  const isConstraint = /do not|cannot|must not|prohibited|without approval|no production|\bfreeze\b/i.test(text);
  const isPreference = /prefer|preference|we prefer|should be written in/i.test(text);

  if (!isDecision && !isConstraint && !isPreference) {
    return { extracted: null };
  }

  const type = isConstraint ? 'constraint' : (isPreference ? 'preference' : 'decision');
  const temporal = parseTemporalValidity(text);

  let topic = 'Architecture';
  if (/redis|cache|caching/i.test(text)) topic = 'Infrastructure';
  else if (/database|postgres|mongo|sql|nosql/i.test(text)) topic = 'Database';
  else if (/deploy|production|freeze/i.test(text)) topic = 'Deployment';
  else if (/frontend|react|tailwind/i.test(text)) topic = 'Frontend';

  // Statement & reason parsing
  let statement = text;
  let reason = '';
  const reasonMatch = text.match(/\b(?:because|due to|since|as)\b\s*(.*)$/i);
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
    tags: [topic.toLowerCase(), type],
    source: {
      kind: 'conversation',
      channel: channel,
      excerpt: text.length > 120 ? text.slice(0, 117) + '...' : text
    },
    confidence: 0.96,
    sensitivity: scope === 'user' ? 'private' : 'workspace',
    confirmation: 'confirmed',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    validFrom: now,
    validUntil: temporal.validUntil,
    purgeAt: temporal.validUntil ? new Date(temporal.validUntil.getTime() + (7 * 24 * 3600 * 1000)) : null,
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
async function handleSuperseding(newMemory) {
  const activeMemories = await findMemories({
    workspaceId: newMemory.workspaceId,
    status: 'active'
  });

  const newText = (newMemory.content.statement + ' ' + (newMemory.source.excerpt || '')).toLowerCase();
  const isSwitchSignal = /switch|switching|actually|now approved|approved|changed/i.test(newText);

  let targetToSupersede = null;

  for (const existing of activeMemories) {
    if (existing._id.toString() === newMemory._id.toString()) continue;

    // Same topic conflict
    const sameTopic = existing.topic.toLowerCase() === newMemory.topic.toLowerCase();
    
    // Redis approval superseding prior Redis restriction
    const isRedisTransition = existing.topic === 'Infrastructure' &&
      existing.content.statement.toLowerCase().includes('redis') &&
      newText.includes('redis');

    // Database switch
    const isDbSwitch = existing.topic === 'Database' && isSwitchSignal;

    if (isRedisTransition || (sameTopic && isSwitchSignal) || isDbSwitch) {
      targetToSupersede = existing;
      break;
    }
  }

  if (targetToSupersede) {
    const now = getAppNow();
    await updateMemoryDocument(targetToSupersede._id, {
      status: 'superseded',
      supersededBy: newMemory._id.toString(),
      updatedAt: now
    });

    newMemory.supersedesId = targetToSupersede._id.toString();

    await recordMemoryEvent({
      eventId: `evt_sup_${Date.now()}`,
      type: 'MEMORY_SUPERSEDED',
      memoryId: targetToSupersede._id.toString(),
      supersededBy: newMemory._id.toString(),
      actorId: newMemory.createdBy,
      timestamp: now
    });

    return targetToSupersede;
  }

  return null;
}

/**
 * Logical expiry refresh: checks validUntil against current app time
 */
export async function refreshExpirations() {
  const now = getAppNow();
  const memories = await findMemories({ status: 'active' });
  let count = 0;

  for (const mem of memories) {
    if (mem.validUntil && new Date(mem.validUntil) < now) {
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
    }
  }

  return count;
}
