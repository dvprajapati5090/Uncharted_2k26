import crypto from 'node:crypto';
import {
  insertMemory,
  getAllMemories,
  updateMemory,
  getMemoryById,
  deleteMemory,
  getSetting,
  setSetting,
  logAudit
} from './db.js';
import { generateEmbedding, tokenize } from './vector-search.js';

// Topic Classification patterns
const TOPIC_PATTERNS = [
  { topic: 'Database', keywords: ['database', 'db', 'postgres', 'postgresql', 'mongo', 'mongodb', 'sqlite', 'mysql', 'sql', 'nosql', 'redis', 'dynamodb'] },
  { topic: 'Frontend', keywords: ['frontend', 'ui', 'client', 'react', 'vue', 'nextjs', 'tailwind', 'css', 'components', 'web'] },
  { topic: 'Backend', keywords: ['backend', 'server', 'api', 'node', 'express', 'python', 'fastapi', 'rest', 'graphql', 'endpoint'] },
  { topic: 'DevOps & Hosting', keywords: ['docker', 'kubernetes', 'deploy', 'deployment', 'hosting', 'vercel', 'aws', 'cloud', 'render', 'gcp'] },
  { topic: 'Auth & Security', keywords: ['auth', 'authentication', 'login', 'oauth', 'jwt', 'session', 'security', 'sso', 'passwords'] },
  { topic: 'Demo & Timeline', keywords: ['demo', 'deadline', 'friday', 'sprint', 'schedule', 'milestone', 'launch', 'release', 'freeze', 'timeline'] },
  { topic: 'Architecture', keywords: ['architecture', 'monolith', 'microservices', 'event-driven', 'queue', 'kafka', 'pubsub'] }
];

/**
 * Get current system time or simulated time
 */
export function getCurrentTime() {
  const simulated = getSetting('simulated_date');
  if (simulated) {
    const d = new Date(simulated);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Set simulated time (for Time Machine testing)
 */
export function setSimulatedTime(isoString) {
  setSetting('simulated_date', isoString);
  refreshMemoryExpirations();
  return getCurrentTime();
}

/**
 * Parse relative temporal dates like "Friday", "this Friday", "tomorrow", "Nov 5"
 */
export function parseTemporalValidity(text, baseDate = getCurrentTime()) {
  const lower = text.toLowerCase();
  const result = {
    isTemporal: false,
    validUntil: null,
    inferredType: 'decision'
  };

  // Day of week mapping
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    if (lower.includes(day)) {
      result.isTemporal = true;
      result.inferredType = lower.includes('demo') || lower.includes('deadline') ? 'deadline' : 'assumption';

      // Calculate next occurrence of this day
      const currentDay = baseDate.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7; // coming Friday or target day

      const targetDate = new Date(baseDate);
      targetDate.setDate(targetDate.getDate() + diff);
      targetDate.setHours(18, 0, 0, 0); // end of business day 6 PM
      result.validUntil = targetDate.toISOString();
      return result;
    }
  }

  // "tomorrow"
  if (lower.includes('tomorrow')) {
    result.isTemporal = true;
    result.inferredType = 'assumption';
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(18, 0, 0, 0);
    result.validUntil = targetDate.toISOString();
    return result;
  }

  // "in X days"
  const inDaysMatch = lower.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch) {
    result.isTemporal = true;
    result.inferredType = 'assumption';
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + parseInt(inDaysMatch[1], 10));
    result.validUntil = targetDate.toISOString();
    return result;
  }

  // "until [Month] [Day]" e.g., "until Nov 5", "until November 15"
  const monthMatch = lower.match(/(?:until|by|before)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/);
  if (monthMatch) {
    result.isTemporal = true;
    result.inferredType = 'deadline';
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.indexOf(monthMatch[1].slice(0, 3));
    const dayNum = parseInt(monthMatch[2], 10);
    const targetDate = new Date(baseDate.getFullYear(), monthIndex, dayNum, 18, 0, 0);
    result.validUntil = targetDate.toISOString();
    return result;
  }

  // Assumption markers without explicit date
  if (lower.includes('assumption') || lower.includes('assuming that') || lower.includes('temporary') || lower.includes('for now')) {
    result.isTemporal = true;
    result.inferredType = 'assumption';
    // default to 7 days expiry
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + 7);
    result.validUntil = targetDate.toISOString();
    return result;
  }

  return result;
}

/**
 * Detect topic from text
 */
export function inferTopic(text) {
  const lower = text.toLowerCase();
  for (const { topic, keywords } of TOPIC_PATTERNS) {
    if (keywords.some(kw => lower.includes(kw))) {
      return topic;
    }
  }
  return 'General Decision';
}

/**
 * Extract structured memory from a conversational message
 */
export function extractMemoryFromMessage(text, sender = 'Team', channel = 'general') {
  if (!text || text.trim().length < 8) return null;
  const lower = text.toLowerCase().trim();

  // Decision & agreement trigger patterns
  const isDecision = /we['’]re using|we are using|decided (to|on)|we decided|going with|switching to|switch to|chosen|chose|moving to|agreed on|settled on|will use|replace/i.test(text);
  const isAssumption = /assumption|assuming|for now|tentative|demo is|deadline is|launch on|freeze until/i.test(text);

  if (!isDecision && !isAssumption) {
    return null; // Normal chat message, not a memory trigger
  }

  const topic = inferTopic(text);
  const temporal = parseTemporalValidity(text);

  // 1. Reason Extraction
  let reason = '';
  let decisionPart = text;

  // Split on causal conjunctions
  const reasonRegex = /\b(?:because|since|due to|as\s+the|as\s+we|given that|in order to|reason:)\b\s*(.*)$/i;
  const reasonMatch = text.match(reasonRegex);

  if (reasonMatch) {
    reason = reasonMatch[1].trim();
    decisionPart = text.slice(0, reasonMatch.index).trim();
    // Clean trailing punctuation
    decisionPart = decisionPart.replace(/[,;]+$/, '').trim();
    reason = reason.replace(/[.]+$/, '').trim();
    // Capitalize first letter of reason
    if (reason.length > 0) {
      reason = reason.charAt(0).toUpperCase() + reason.slice(1);
    }
  } else if (temporal.isTemporal && (lower.includes('demo') || lower.includes('deadline'))) {
    reason = 'Sprint milestones & team planning';
  } else {
    reason = 'Team consensus';
  }

  // 2. Decision Clean Up
  let cleanDecision = decisionPart
    .replace(/^actually,?\s*/i, '')
    .replace(/^hey team,?\s*/i, '')
    .replace(/^update:?\s*/i, '')
    .trim();

  if (cleanDecision.length > 0) {
    cleanDecision = cleanDecision.charAt(0).toUpperCase() + cleanDecision.slice(1);
  }

  // 3. Owner detection
  let owner = sender || 'Team';
  const ownerMatch = text.match(/(?:owner:|decided by|led by|assigned to)\s*@?([A-Za-z0-9_-]+)/i);
  if (ownerMatch) {
    owner = ownerMatch[1];
  } else if (sender && sender !== 'User') {
    owner = sender;
  }

  // 4. Extract tags
  const tokens = tokenize(text);
  const tags = Array.from(new Set(tokens.filter(t => t.length > 3))).slice(0, 8);
  if (!tags.includes(topic.toLowerCase())) {
    tags.unshift(topic.toLowerCase());
  }

  // 5. Generate Vector Embedding
  const fullTextToEmbed = `${topic}: ${cleanDecision}. Reason: ${reason}. Owner: ${owner}. Tags: ${tags.join(' ')}`;
  const vector = generateEmbedding(fullTextToEmbed);

  const memory = {
    id: `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    topic,
    decision: cleanDecision,
    reason,
    owner,
    created_at: getCurrentTime().toISOString(),
    updated_at: getCurrentTime().toISOString(),
    type: temporal.inferredType,
    status: 'active',
    valid_until: temporal.validUntil,
    superseded_by: null,
    supersedes_id: null,
    confidence: reasonMatch ? 0.98 : 0.91,
    source_message: text,
    channel,
    tags,
    vector
  };

  return memory;
}

/**
 * Detect conflicts and supersede older memories in the same domain
 */
export function processSuperseding(newMemory) {
  const activeMemories = getAllMemories({ status: 'active' });
  const newDecisionLower = newMemory.decision.toLowerCase();
  const newSourceLower = (newMemory.source_message || '').toLowerCase();

  // Explicit superseding signals
  const hasExplicitSwitchSignal = /switch|switching|actually|instead of|replace|moving from|no longer|changed/i.test(newSourceLower);

  let supersededTarget = null;

  for (const existing of activeMemories) {
    // Cannot supersede itself
    if (existing.id === newMemory.id) continue;

    const existingDecisionLower = existing.decision.toLowerCase();

    // Condition 1: Same Topic domain
    const sameTopic = existing.topic.toLowerCase() === newMemory.topic.toLowerCase();

    // Condition 2: Entity collision (e.g. Database: Postgres vs MongoDB)
    const dbCollision = (newMemory.topic === 'Database' && existing.topic === 'Database') &&
      ((newDecisionLower.includes('mongo') && existingDecisionLower.includes('postgres')) ||
       (newDecisionLower.includes('postgres') && existingDecisionLower.includes('mongo')) ||
       (newDecisionLower.includes('sqlite') || newDecisionLower.includes('mysql')));

    // Condition 3: Timeline / Demo collision
    const timelineCollision = (newMemory.topic === 'Demo & Timeline' && existing.topic === 'Demo & Timeline') &&
      (newDecisionLower.includes('demo') && existingDecisionLower.includes('demo'));

    // Condition 4: Explicit switch mention or general topic collision
    if (dbCollision || (sameTopic && hasExplicitSwitchSignal) || (timelineCollision && hasExplicitSwitchSignal)) {
      supersededTarget = existing;
      break;
    }
  }

  if (supersededTarget) {
    // 1. Mark older memory as superseded
    updateMemory(supersededTarget.id, {
      status: 'superseded',
      superseded_by: newMemory.id
    });

    // 2. Link new memory to the superseded ID
    newMemory.supersedes_id = supersededTarget.id;

    logAudit('SUPERSEDE', supersededTarget.id, `Superseded by new memory [${newMemory.id}]: "${newMemory.decision}" (Previous: "${supersededTarget.decision}")`);
  }

  return supersededTarget;
}

/**
 * Check and refresh expirations against current simulated time
 */
export function refreshMemoryExpirations() {
  const now = getCurrentTime();
  const memories = getAllMemories();
  let expiredCount = 0;

  for (const mem of memories) {
    if (mem.valid_until && mem.status === 'active') {
      const expiry = new Date(mem.valid_until);
      if (now > expiry) {
        updateMemory(mem.id, { status: 'expired' });
        logAudit('EXPIRE', mem.id, `Memory automatically expired on ${expiry.toISOString()} (Checked at: ${now.toISOString()})`);
        expiredCount++;
      }
    }
  }

  return expiredCount;
}

/**
 * Process a conversation message: extract memory if present, check superseding, save to DB
 */
export function processMessageForMemory(text, sender = 'Team', channel = 'general') {
  // First ensure expired memories are up to date
  refreshMemoryExpirations();

  const extracted = extractMemoryFromMessage(text, sender, channel);
  if (!extracted) {
    return { extracted: null, superseded: null };
  }

  // Check if this new memory supersedes an older one
  const superseded = processSuperseding(extracted);

  // Save the new memory
  const saved = insertMemory(extracted);

  return {
    extracted: saved,
    superseded
  };
}
