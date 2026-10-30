import { MongoClient } from 'mongodb';
import { config } from './config.js';
import { cosineSimilarity } from './providers/embedding-provider.js';
import { realtimeSync } from './realtime-sync.js';

let client = null;
let db = null;
let isConnected = false;

// Fallback in-memory store if MONGODB_URI is not provided or connection is lost
const memoryStore = {
  memories: new Map(),
  events: [],
  feedback: [],
  users: new Map(),
  workspaces: new Map(),
  channels: [
    { id: 'architecture', name: '#architecture', description: 'Technical design & persistent decisions' },
    { id: 'sprint-planning', name: '#sprint-planning', 'description': 'Deadlines, assumptions & temporary rules' },
    { id: 'ask-assistant', name: '#ask-assistant', 'description': 'Query team memory across sessions' }
  ]
};

/**
 * Initializes connection to MongoDB Atlas or initializes resilient in-memory replica
 */
export async function initMongo() {
  if (isConnected && db) return db;

  const uri = config.mongodb.uri;
  if (!uri) {
    console.log('[MongoDB] MONGODB_URI not provided. Running with local MongoDB document engine (Atlas ready).');
    initDefaultData();
    return null;
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    await client.connect();
    db = client.db(config.mongodb.dbName);
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to Atlas database: "${config.mongodb.dbName}"`);

    await setupIndexes(db);
    await realtimeSync.init(db, config.mongodb.memoriesCollection);
    return db;
  } catch (err) {
    console.warn(`[MongoDB] Could not connect to Atlas (${err.message}). Using local document engine.`);
    initDefaultData();
    return null;
  }
}

export function getDb() {
  return db;
}

export function isMongoConnected() {
  return isConnected;
}

/**
 * Creates normal collections and indexes, including the TTL index on purgeAt
 */
export async function setupIndexes(database) {
  if (!database) return;
  try {
    const memoriesCol = database.collection(config.mongodb.memoriesCollection);
    const eventsCol = database.collection(config.mongodb.eventsCollection);

    // 1. TTL Index for eventual physical cleanup
    await memoriesCol.createIndex(
      { purgeAt: 1 },
      { expireAfterSeconds: 0, name: 'ttl_purge_index' }
    );

    // 2. Query compound indexes for owner and workspace lookups
    await memoriesCol.createIndex(
      { ownerId: 1, status: 1, type: 1, updatedAt: -1 },
      { name: 'idx_owner_status_type' }
    );
    await memoriesCol.createIndex(
      { workspaceId: 1, status: 1, type: 1, updatedAt: -1 },
      { name: 'idx_workspace_status' }
    );

    // 3. Source reference index
    await memoriesCol.createIndex(
      { 'source.messageId': 1 },
      { name: 'idx_source_message' }
    );

    // 4. Events collection index
    await eventsCol.createIndex(
      { memoryId: 1, timestamp: -1 },
      { name: 'idx_event_memory' }
    );

    // 5. Training feedback collection init
    const feedbackCol = database.collection('training_feedback');
    const fbCount = await feedbackCol.countDocuments({});
    if (fbCount === 0) {
      await feedbackCol.insertMany([
        {
          _id: 'fb_seed_001',
          messageId: 'msg_seed_1',
          query: 'Design a background job system for scheduled notifications.',
          chosenAnswer: 'Based on stored memory, we have an active constraint: "Do not introduce Redis without approval". Therefore, we should build the background job system using MongoDB Change Streams.',
          rejectedAnswer: 'For background job systems, a standard solution often employs Redis with BullMQ or Celery for rapid distributed task execution.',
          rating: 1,
          reasonTag: 'adhered_to_constraint',
          memoryIds: [],
          workspaceId: 'ws_core',
          userId: 'u_sarah',
          timestamp: new Date()
        },
        {
          _id: 'fb_seed_002',
          messageId: 'msg_seed_2',
          query: 'Can we use Redis for caching?',
          chosenAnswer: 'Based on stored team memory: We have now approved Redis for caching, but MongoDB Atlas must remain our primary database.',
          rejectedAnswer: 'Standard infrastructure architectures commonly integrate Redis for caching without restriction.',
          rating: 1,
          reasonTag: 'adhered_to_constraint',
          memoryIds: [],
          workspaceId: 'ws_core',
          userId: 'u_sarah',
          timestamp: new Date()
        }
      ]);
    }

    console.log('[MongoDB] Collections and standard indexes (including TTL index) verified.');
  } catch (err) {
    console.warn('[MongoDB] Index creation notice:', err.message);
  }
}

function initDefaultData() {
  if (memoryStore.users.size === 0) {
    const now = new Date().toISOString();
    const defaultUsers = [
      { id: 'u_sarah', name: 'Sarah Jenkins', role: 'Tech Lead', workspaceId: 'ws_core', avatar: 'SJ' },
      { id: 'u_alex', name: 'Alex Rivera', role: 'Backend Lead', workspaceId: 'ws_core', avatar: 'AR' },
      { id: 'u_marcus', name: 'Marcus Chen', role: 'Product Manager', workspaceId: 'ws_core', avatar: 'MC' },
      { id: 'u_elena', name: 'Elena Rostova', role: 'Frontend Dev', workspaceId: 'ws_core', avatar: 'ER' }
    ];
    defaultUsers.forEach(u => memoryStore.users.set(u.id, u));

    memoryStore.workspaces.set('ws_core', {
      id: 'ws_core',
      name: 'Apollo Core Engineering',
      description: 'Backend, Frontend, and Data Systems Team',
      createdAt: now
    });

    if (memoryStore.feedback.length === 0) {
      memoryStore.feedback.push({
        _id: 'fb_seed_001',
        messageId: 'msg_seed_1',
        query: 'Design a background job system for scheduled notifications.',
        chosenAnswer: 'Based on stored memory, we have an active constraint: "Do not introduce Redis without approval". Therefore, we should build the background job system using MongoDB Change Streams.',
        rejectedAnswer: 'For background job systems, a standard solution often employs Redis with BullMQ or Celery for rapid distributed task execution.',
        rating: 1,
        reasonTag: 'adhered_to_constraint',
        memoryIds: [],
        workspaceId: 'ws_core',
        userId: 'u_sarah',
        timestamp: new Date()
      });
      memoryStore.feedback.push({
        _id: 'fb_seed_002',
        messageId: 'msg_seed_2',
        query: 'Can we use Redis for caching?',
        chosenAnswer: 'Based on stored team memory: We have now approved Redis for caching, but MongoDB Atlas must remain our primary database.',
        rejectedAnswer: 'Standard infrastructure architectures commonly integrate Redis for caching without restriction.',
        rating: 1,
        reasonTag: 'adhered_to_constraint',
        memoryIds: [],
        workspaceId: 'ws_core',
        userId: 'u_sarah',
        timestamp: new Date()
      });
    }
  }
}

/**
 * -------------------------------------------------------------
 * MEMORY REPOSITORY OPERATIONS (MONGODB / LOCAL FALLBACK)
 * -------------------------------------------------------------
 */

export async function insertMemoryDocument(doc) {
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    await col.insertOne(doc);
  } else {
    memoryStore.memories.set(doc._id.toString(), doc);
  }

  realtimeSync.broadcast({
    operationType: 'insert',
    collection: 'memories',
    documentId: doc._id?.toString(),
    topic: doc.topic,
    summary: doc.content?.statement || 'New memory directive formed',
    status: doc.status || 'active',
    scope: doc.scope,
    ownerId: doc.ownerId
  });

  return doc;
}

export async function updateMemoryDocument(id, updates) {
  const idStr = id.toString();
  let updated = null;
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    const { ObjectId } = await import('mongodb');
    const query = { _id: ObjectId.isValid(idStr) ? new ObjectId(idStr) : idStr };
    await col.updateOne(query, { $set: updates });
    updated = await col.findOne(query);
  } else {
    const existing = memoryStore.memories.get(idStr);
    if (!existing) return null;
    updated = { ...existing, ...updates };
    memoryStore.memories.set(idStr, updated);
  }

  if (updated) {
    realtimeSync.broadcast({
      operationType: updates.status === 'superseded' ? 'supersede' : 'update',
      collection: 'memories',
      documentId: idStr,
      topic: updated.topic || 'General',
      summary: updated.content?.statement || `Memory directive ${idStr} updated`,
      status: updated.status || 'active',
      scope: updated.scope,
      ownerId: updated.ownerId
    });
  }

  return updated;
}

export async function getMemoryById(id) {
  const idStr = id.toString();
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    const { ObjectId } = await import('mongodb');
    const query = { _id: ObjectId.isValid(idStr) ? new ObjectId(idStr) : idStr };
    return await col.findOne(query);
  }
  return memoryStore.memories.get(idStr) || null;
}

export async function findMemories(filter = {}, options = {}) {
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    return await col.find(filter).sort(options.sort || { updatedAt: -1 }).toArray();
  }
  let results = Array.from(memoryStore.memories.values());
  
  if (filter.status) {
    results = results.filter(m => m.status === filter.status);
  }
  if (filter.workspaceId) {
    results = results.filter(m => m.workspaceId === filter.workspaceId);
  }
  if (filter.ownerId) {
    results = results.filter(m => m.ownerId === filter.ownerId);
  }
  if (filter.type) {
    results = results.filter(m => m.type === filter.type);
  }
  return results;
}

export async function deleteMemoryDocument(id) {
  const idStr = id.toString();
  let deleted = false;
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    const { ObjectId } = await import('mongodb');
    const query = { _id: ObjectId.isValid(idStr) ? new ObjectId(idStr) : idStr };
    const res = await col.deleteOne(query);
    deleted = res.deletedCount > 0;
  } else {
    deleted = memoryStore.memories.delete(idStr);
  }

  if (deleted) {
    realtimeSync.broadcast({
      operationType: 'delete',
      collection: 'memories',
      documentId: idStr,
      summary: `Memory directive ${idStr} permanently purged`,
      status: 'purged'
    });
  }

  return deleted;
}

export async function recordMemoryEvent(event) {
  event.timestamp = event.timestamp || new Date();
  if (db && isConnected) {
    const col = db.collection(config.mongodb.eventsCollection);
    await col.insertOne(event);
    return event;
  }
  memoryStore.events.push(event);
  return event;
}

export async function getMemoryEvents(memoryId = null) {
  if (db && isConnected) {
    const col = db.collection(config.mongodb.eventsCollection);
    const query = memoryId ? { memoryId: memoryId.toString() } : {};
    return await col.find(query).sort({ timestamp: -1 }).limit(100).toArray();
  }
  if (memoryId) {
    return memoryStore.events.filter(e => e.memoryId === memoryId.toString()).reverse();
  }
  return [...memoryStore.events].reverse().slice(0, 100);
}

/**
 * -------------------------------------------------------------
 * MONGODB ATLAS $vectorSearch EXECUTION
 * -------------------------------------------------------------
 */
export async function executeAtlasVectorSearch({
  queryVector,
  limit = 8,
  numCandidates = 100,
  filter = {}
}) {
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    
    const pipeline = [
      {
        $vectorSearch: {
          index: config.mongodb.vectorIndexName,
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: numCandidates,
          limit: limit,
          filter: filter
        }
      },
      {
        $project: {
          scope: 1,
          ownerId: 1,
          workspaceId: 1,
          createdBy: 1,
          type: 1,
          topic: 1,
          content: 1,
          tags: 1,
          source: 1,
          confidence: 1,
          sensitivity: 1,
          status: 1,
          validFrom: 1,
          validUntil: 1,
          supersedesId: 1,
          supersededBy: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    try {
      const results = await col.aggregate(pipeline).toArray();
      return results;
    } catch (vectorSearchErr) {
      console.warn(`[MongoDB $vectorSearch] Atlas Vector Search call notice (${vectorSearchErr.message}). Evaluating with document collection.`);
    }
  }

  // Resilient fallback: performs exact cosine calculation over candidate documents
  let candidates = [];
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    const dbFilter = {};
    if (filter.status) dbFilter.status = filter.status;
    if (filter.workspaceId) dbFilter.workspaceId = filter.workspaceId;
    if (filter.ownerId) dbFilter.ownerId = filter.ownerId;
    candidates = await col.find(dbFilter).toArray();
  } else {
    candidates = Array.from(memoryStore.memories.values());
    if (filter.status) {
      candidates = candidates.filter(c => c.status === filter.status);
    }
    if (filter.workspaceId) {
      candidates = candidates.filter(c => c.workspaceId === filter.workspaceId);
    }
    if (filter.ownerId) {
      candidates = candidates.filter(c => c.ownerId === filter.ownerId);
    }
  }

  const scored = candidates.map(c => {
    const score = cosineSimilarity(queryVector, c.embedding);
    return {
      _id: c._id,
      scope: c.scope,
      ownerId: c.ownerId,
      workspaceId: c.workspaceId,
      createdBy: c.createdBy,
      type: c.type,
      topic: c.topic,
      content: c.content,
      tags: c.tags,
      source: c.source,
      confidence: c.confidence,
      sensitivity: c.sensitivity,
      status: c.status,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      supersedesId: c.supersedesId,
      supersededBy: c.supersededBy,
      score: parseFloat(score.toFixed(4))
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// In-memory conversation store for team channels
const conversationStore = [];

export async function insertMessage(msg) {
  if (db && isConnected) {
    try {
      await db.collection('conversations').insertOne(msg);
      return msg;
    } catch (e) {}
  }
  conversationStore.push(msg);
  return msg;
}

export async function getMessages(channel, workspaceId) {
  if (db && isConnected) {
    try {
      const msgs = await db.collection('conversations')
        .find({ channel, workspaceId })
        .sort({ timestamp: 1 })
        .toArray();
      if (msgs.length > 0) return msgs;
    } catch (e) {}
  }
  return conversationStore.filter(m => m.channel === channel && (!workspaceId || m.workspaceId === workspaceId));
}

// User & Workspace queries
export function getAllUsers() {
  initDefaultData();
  return Array.from(memoryStore.users.values());
}

export function getUserById(id) {
  initDefaultData();
  return memoryStore.users.get(id) || null;
}

export function getAllWorkspaces() {
  initDefaultData();
  return Array.from(memoryStore.workspaces.values());
}

export function getChannels() {
  return memoryStore.channels;
}

export async function wipeAllStoredData(includeFeedback = false) {
  if (db && isConnected) {
    try {
      await db.collection(config.mongodb.memoriesCollection).deleteMany({});
      await db.collection(config.mongodb.eventsCollection).deleteMany({});
      await db.collection('conversations').deleteMany({});
      if (includeFeedback) {
        await db.collection('training_feedback').deleteMany({});
      }
    } catch (e) {}
  }
  memoryStore.memories.clear();
  memoryStore.events = [];
  if (includeFeedback) {
    memoryStore.feedback = [];
  }
  conversationStore.length = 0;
  initDefaultData();
}

/**
 * -------------------------------------------------------------
 * ACTIVE REINFORCEMENT & DPO TRAINING DATASET ENGINE
 * -------------------------------------------------------------
 */

export async function recordFeedback(doc) {
  const item = {
    _id: doc._id || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    messageId: doc.messageId || null,
    query: doc.query || '',
    chosenAnswer: doc.chosenAnswer || '',
    rejectedAnswer: doc.rejectedAnswer || '',
    rating: doc.rating === -1 ? -1 : 1, // 1 for positive adherence, -1 for negative
    reasonTag: doc.reasonTag || (doc.rating === 1 ? 'adhered_to_constraint' : 'hallucination_or_unwanted'),
    memoryIds: doc.memoryIds || [],
    workspaceId: doc.workspaceId || 'ws_core',
    userId: doc.userId || 'u_sarah',
    timestamp: new Date()
  };

  // 1. Persist feedback event
  if (db && isConnected) {
    try {
      await db.collection('training_feedback').insertOne(item);
    } catch (e) {}
  }
  memoryStore.feedback.push(item);

  // 2. Calibrate memory confidence dynamically based on reinforcement signal
  if (item.memoryIds && item.memoryIds.length > 0) {
    for (const memId of item.memoryIds) {
      await calibrateMemoryConfidence(memId, item.rating);
    }
  }

  return item;
}

export async function calibrateMemoryConfidence(memoryId, rating) {
  const mem = await getMemoryById(memoryId);
  if (!mem) return null;

  let currentConf = typeof mem.confidence === 'number' ? mem.confidence : 0.95;
  let up = mem.reinforcementUp || 0;
  let down = mem.reinforcementDown || 0;

  if (rating === 1) {
    currentConf = Math.min(0.99, parseFloat((currentConf + 0.02).toFixed(4)));
    up += 1;
  } else {
    currentConf = Math.max(0.60, parseFloat((currentConf - 0.06).toFixed(4)));
    down += 1;
  }

  const updates = {
    confidence: currentConf,
    reinforcementUp: up,
    reinforcementDown: down,
    needsVerification: currentConf < 0.75,
    updatedAt: new Date()
  };

  await updateMemoryDocument(mem._id, updates);
  return { id: memoryId, confidence: currentConf, needsVerification: updates.needsVerification };
}

export async function getFeedbackList(limit = 50) {
  if (db && isConnected) {
    try {
      const items = await db.collection('training_feedback')
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      return items;
    } catch (e) {}
  }
  return [...memoryStore.feedback].reverse().slice(0, limit);
}

export async function getTrainingStats() {
  const feedback = await getFeedbackList(500);
  const positive = feedback.filter(f => f.rating === 1).length;
  const negative = feedback.filter(f => f.rating === -1).length;
  const total = feedback.length;
  const adherenceRate = total > 0 ? Math.round((positive / total) * 100) : 100;

  let memories = await findMemories({});
  const calibratedCount = memories.filter(m => (m.reinforcementUp || 0) > 0 || (m.reinforcementDown || 0) > 0).length;

  return {
    totalFeedback: total,
    positiveCount: positive,
    negativeCount: negative,
    adherenceRate: adherenceRate,
    dpoPairsCount: total,
    calibratedMemoriesCount: calibratedCount
  };
}

export async function exportDpoDataset() {
  const feedback = await getFeedbackList(1000);
  return feedback.map(f => ({
    prompt: f.query,
    chosen: f.rating === 1 ? f.chosenAnswer : f.rejectedAnswer,
    rejected: f.rating === 1 ? f.rejectedAnswer : f.chosenAnswer,
    system: "You are SynapseMem 2.0 AI Agent. Strictly adhere to verified persistent team constraints and architectural consensus.",
    metadata: {
      feedbackId: f._id,
      rating: f.rating,
      reasonTag: f.reasonTag,
      memoryIds: f.memoryIds,
      timestamp: f.timestamp
    }
  }));
}

export async function exportVoyagePairs() {
  const feedback = await getFeedbackList(1000);
  const pairs = [];
  for (const f of feedback) {
    if (f.rating === 1) {
      pairs.push({
        query: f.query,
        positive: f.chosenAnswer,
        negative: f.rejectedAnswer
      });
    }
  }
  return pairs;
}

/**
 * -------------------------------------------------------------
 * KNOWLEDGE GRAPH & MONGODB $graphLookup ENGINE (GRAPHRAG)
 * -------------------------------------------------------------
 */

export async function addMemoryRelation(sourceId, targetId, type = 'related_to', label = 'Related') {
  const source = await getMemoryById(sourceId);
  const target = await getMemoryById(targetId);
  if (!source || !target) return null;

  const sRel = source.relations || [];
  if (!sRel.some(r => r.targetId === targetId.toString())) {
    sRel.push({ targetId: targetId.toString(), type, label });
    await updateMemoryDocument(sourceId, { relations: sRel });
  }

  const reciprocalType = type === 'supersedes' ? 'superseded_by' : (type === 'depends_on' ? 'depended_by' : type);
  const tRel = target.relations || [];
  if (!tRel.some(r => r.targetId === sourceId.toString())) {
    tRel.push({ targetId: sourceId.toString(), type: reciprocalType, label: `Reciprocal: ${label}` });
    await updateMemoryDocument(targetId, { relations: tRel });
  }

  realtimeSync.broadcast({
    operationType: 'graph_link',
    collection: 'memories',
    documentId: sourceId,
    topic: source.topic || 'Architecture',
    summary: `Graph relationship established: [${label || type}] -> #${targetId}`,
    status: 'active'
  });

  return { sourceId, targetId, type, label };
}

export async function getMemoryGraph(workspaceId = 'ws_core') {
  const memories = await findMemories({ workspaceId });
  const nodes = [];
  const edges = [];
  const edgeKeySet = new Set();

  for (const mem of memories) {
    const memId = mem._id.toString();
    nodes.push({
      id: memId,
      label: mem.content?.statement || mem.topic,
      statement: mem.content?.statement || mem.topic,
      decision: mem.content?.statement || mem.topic,
      topic: mem.topic,
      status: mem.status,
      type: mem.type,
      confidence: mem.confidence || 0.95,
      owner: mem.ownerId || 'Team',
      reason: mem.content?.reason || '',
      validUntil: mem.validUntil,
      reinforcementUp: mem.reinforcementUp || 0,
      reinforcementDown: mem.reinforcementDown || 0
    });

    // 1. Direct explicit relations
    if (Array.isArray(mem.relations)) {
      for (const rel of mem.relations) {
        const key = `${memId}->${rel.targetId}:${rel.type}`;
        if (!edgeKeySet.has(key)) {
          edgeKeySet.add(key);
          edges.push({
            id: `edge_${memId}_${rel.targetId}`,
            source: memId,
            target: rel.targetId,
            type: rel.type,
            label: rel.label || rel.type
          });
        }
      }
    }

    // 2. Lineage relation from supersedesId
    if (mem.supersedesId) {
      const key = `${memId}->${mem.supersedesId}:supersedes`;
      if (!edgeKeySet.has(key)) {
        edgeKeySet.add(key);
        edges.push({
          id: `edge_sup_${memId}_${mem.supersedesId}`,
          source: memId,
          target: mem.supersedesId,
          type: 'supersedes',
          label: 'Supersedes'
        });
      }
    }
  }

  // 3. Infer semantic architectural relationships across nodes if no edges exist
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const a = memories[i];
      const b = memories[j];
      const aId = a._id.toString();
      const bId = b._id.toString();
      const aText = (a.content?.statement || '').toLowerCase();
      const bText = (b.content?.statement || '').toLowerCase();

      // Check MongoDB <-> Redis caching relationship
      if ((aText.includes('mongo') && bText.includes('redis')) || (aText.includes('redis') && bText.includes('mongo'))) {
        const key1 = `${aId}->${bId}:integrates_with`;
        const key2 = `${bId}->${aId}:integrates_with`;
        if (!edgeKeySet.has(key1) && !edgeKeySet.has(key2)) {
          edgeKeySet.add(key1);
          edges.push({
            id: `edge_sem_${aId}_${bId}`,
            source: aText.includes('mongo') ? aId : bId,
            target: aText.includes('mongo') ? bId : aId,
            type: 'depends_on',
            label: 'Caching layer'
          });
        }
      }

      // Check Stack <-> Deployment governance
      if (b.topic === 'Deployment' && a.topic !== 'Deployment') {
        const key = `${bId}->${aId}:governs`;
        if (!edgeKeySet.has(key)) {
          edgeKeySet.add(key);
          edges.push({
            id: `edge_gov_${bId}_${aId}`,
            source: bId,
            target: aId,
            type: 'constrains',
            label: 'Freeze constraint'
          });
        }
      }
    }
  }

  const activeCount = nodes.filter(n => n.status === 'active').length;
  const supersededCount = nodes.filter(n => n.status === 'superseded').length;
  const expiredCount = nodes.filter(n => n.status === 'expired').length;

  return {
    nodes,
    edges,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      activeCount,
      supersededCount,
      expiredCount
    }
  };
}

export async function traverseGraphRAG(startMemoryId, maxDepth = 2) {
  const root = await getMemoryById(startMemoryId);
  if (!root) return { root: null, neighbors: [], graphContextText: '' };

  const idStr = root._id.toString();
  const graph = await getMemoryGraph(root.workspaceId);

  // BFS traversal up to maxDepth
  const visited = new Set([idStr]);
  const queue = [{ id: idStr, depth: 0 }];
  const neighbors = [];

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    const connectedEdges = graph.edges.filter(e => e.source === id || e.target === id);
    for (const edge of connectedEdges) {
      const neighborId = edge.source === id ? edge.target : edge.source;
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const neighborNode = graph.nodes.find(n => n.id === neighborId);
        if (neighborNode) {
          neighbors.push({
            node: neighborNode,
            relationship: edge.label,
            label: edge.label,
            type: edge.type,
            direction: edge.source === id ? 'outgoing' : 'incoming',
            depth: depth + 1
          });
          queue.push({ id: neighborId, depth: depth + 1 });
        }
      }
    }
  }

  // Format Graph Context for prompt injection
  const lineageLines = neighbors.map(n => 
    `• Linked (${n.relationship}) [${n.node.status.toUpperCase()}]: "${n.node.label}" (Confidence: ${Math.round(n.node.confidence * 100)}%)`
  );

  const graphContextText = lineageLines.length > 0
    ? `\n[Architectural Knowledge Graph Lineage (${neighbors.length} connected nodes)]:\n` + lineageLines.join('\n')
    : '';

  return {
    root,
    neighbors,
    graphContextText
  };
}

// -------------------------------------------------------------
// 7. HIERARCHICAL MULTI-VECTOR & SEMANTIC DOMAIN CLUSTERING
// -------------------------------------------------------------

export function computeCentroidVector(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) return null;
  const valid = vectors.filter(v => Array.isArray(v) && v.length === 1024);
  if (valid.length === 0) return null;

  const dims = 1024;
  const centroid = new Array(dims).fill(0);
  for (const v of valid) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += v[i];
    }
  }
  let sumSq = 0;
  for (let i = 0; i < dims; i++) {
    centroid[i] /= valid.length;
    sumSq += centroid[i] * centroid[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dims; i++) {
    centroid[i] = parseFloat((centroid[i] / norm).toFixed(6));
  }
  return centroid;
}

const DOMAIN_DEFINITIONS = [
  {
    id: 'domain_persistence',
    name: 'Persistence & Data Layer',
    topic: 'Infrastructure',
    keywords: ['mongodb', 'mongo', 'atlas', 'database', 'redis', 'cache', 'caching', 'storage', 'postgres', 'sql', 'nosql', 'db'],
    macroDirective: 'Authoritative data persistence is governed by MongoDB Atlas. Redis is provisioned as high-performance cache with strict approval boundaries.'
  },
  {
    id: 'domain_deployment',
    name: 'Release & Delivery Governance',
    topic: 'Deployment',
    keywords: ['deploy', 'deployment', 'freeze', 'release', 'production', 'prod', 'canary', 'pipeline', 'cicd'],
    macroDirective: 'Production deployments enforce automated CI gates and temporal freeze periods during sprint releases.'
  },
  {
    id: 'domain_devex',
    name: 'Developer Ergonomics & Standards',
    topic: 'Architecture',
    keywords: ['ide', 'theme', 'vim', 'contrast', 'editor', 'linter', 'eslint', 'standards', 'formatting', 'keybindings'],
    macroDirective: 'Developer environment adheres to team ergonomics, high-contrast themes, and unified workspace keybindings.'
  },
  {
    id: 'domain_core',
    name: 'Core Application Architecture',
    topic: 'Core',
    keywords: ['node', 'express', 'backend', 'service', 'api', 'framework', 'architecture'],
    macroDirective: 'Core microservices utilize modular Express routers with strict schema-first boundaries.'
  }
];

export async function buildHierarchicalClusters(workspaceId = 'ws_core') {
  const memories = await findMemories({ workspaceId });
  if (!memories || memories.length === 0) {
    return {
      clusters: [],
      summary: { totalClusters: 0, totalDecisions: 0, coherenceScore: 100 }
    };
  }

  // Group child memories into domains
  const clusterBuckets = new Map();
  for (const def of DOMAIN_DEFINITIONS) {
    clusterBuckets.set(def.id, {
      id: def.id,
      name: def.name,
      topic: def.topic,
      macroDirective: def.macroDirective,
      keywords: def.keywords,
      children: []
    });
  }

  // Catch-all bucket for unmatched topics
  const unclassifiedBucket = {
    id: 'domain_general',
    name: 'General Architectural Principles',
    topic: 'Architecture',
    macroDirective: 'Standard cross-cutting architectural principles and conventions.',
    keywords: [],
    children: []
  };

  for (const mem of memories) {
    const text = ((mem.content?.statement || '') + ' ' + (mem.topic || '')).toLowerCase();
    let matched = false;

    for (const def of DOMAIN_DEFINITIONS) {
      const hit = def.keywords.some(kw => text.includes(kw)) || mem.topic === def.topic;
      if (hit) {
        clusterBuckets.get(def.id).children.push(mem);
        matched = true;
        break;
      }
    }

    if (!matched) {
      unclassifiedBucket.children.push(mem);
    }
  }

  if (unclassifiedBucket.children.length > 0) {
    clusterBuckets.set(unclassifiedBucket.id, unclassifiedBucket);
  }

  // Filter out empty clusters and compute centroid multi-vectors
  const activeClusters = [];
  let totalDecisions = 0;

  for (const [id, cluster] of clusterBuckets.entries()) {
    if (cluster.children.length === 0) continue;
    totalDecisions += cluster.children.length;

    const childEmbeddings = cluster.children.map(m => m.embedding).filter(Boolean);
    const macroVector = computeCentroidVector(childEmbeddings) || (cluster.children[0]?.embedding);

    const activeCount = cluster.children.filter(m => m.status === 'active').length;
    const supersededCount = cluster.children.filter(m => m.status === 'superseded').length;
    const expiredCount = cluster.children.filter(m => m.status === 'expired').length;

    // Coherence score based on active clarity vs conflict ratio
    const healthScore = Math.min(99, Math.max(90, Math.round(98 - (supersededCount * 2))));

    const mappedChildren = cluster.children.map(m => ({
      id: m._id.toString(),
      statement: m.content?.statement || m.topic,
      topic: m.topic,
      status: m.status,
      type: m.type,
      owner: m.ownerId || 'team',
      confidence: m.confidence || 0.95,
      validUntil: m.validUntil,
      reinforcementUp: m.reinforcementUp || 0,
      reinforcementDown: m.reinforcementDown || 0
    }));

    activeClusters.push({
      id: cluster.id,
      name: cluster.name,
      topic: cluster.topic,
      macroDirective: cluster.macroDirective,
      summary: cluster.macroDirective,
      macroVector,
      childCount: cluster.children.length,
      activeCount,
      supersededCount,
      expiredCount,
      healthScore,
      children: mappedChildren
    });
  }

  // If connected to MongoDB, persist macro clusters for aggregation queries
  if (db && isConnected && activeClusters.length > 0) {
    try {
      const col = db.collection('macro_clusters');
      await col.deleteMany({ workspaceId });
      const docsToInsert = activeClusters.map(c => ({
        ...c,
        workspaceId,
        updatedAt: new Date()
      }));
      await col.insertMany(docsToInsert);
    } catch (e) {
      console.warn('[MongoDB] Macro cluster persistence notice:', e.message);
    }
  }

  const overallCoherence = activeClusters.length > 0
    ? Math.round(activeClusters.reduce((sum, c) => sum + c.healthScore, 0) / activeClusters.length)
    : 100;

  return {
    clusters: activeClusters,
    summary: {
      totalClusters: activeClusters.length,
      totalDecisions,
      coherenceScore: overallCoherence
    }
  };
}

export async function searchHierarchicalMemories({ query, workspaceId = 'ws_core', limit = 5 }) {
  const { embedQuery } = await import('./providers/embedding-provider.js');
  const queryVector = await embedQuery(query);

  const { clusters } = await buildHierarchicalClusters(workspaceId);
  if (!clusters || clusters.length === 0) {
    return {
      query,
      matchedCluster: null,
      resolvedDecisions: [],
      hierarchicalContext: ''
    };
  }

  // 1. Level 1: Match Macro Architectural Domain using centroid vector
  const scoredClusters = clusters.map(c => {
    const sim = c.macroVector ? cosineSimilarity(queryVector, c.macroVector) : 0;
    return { ...c, domainScore: parseFloat(sim.toFixed(4)) };
  });

  scoredClusters.sort((a, b) => b.domainScore - a.domainScore);
  const bestCluster = scoredClusters[0];

  // 2. Level 2: Drill down into child decisions of the matched domain
  const rawMemories = await findMemories({ workspaceId });
  const childMemDocs = rawMemories.filter(m => bestCluster.children.some(ch => ch.id === m._id.toString()));

  const scoredChildren = childMemDocs.map(m => {
    const sim = m.embedding ? cosineSimilarity(queryVector, m.embedding) : 0;
    return {
      id: m._id.toString(),
      statement: m.content?.statement,
      status: m.status,
      topic: m.topic,
      owner: m.ownerId,
      confidence: m.confidence || 0.95,
      score: parseFloat(sim.toFixed(4)),
      validUntil: m.validUntil
    };
  });

  scoredChildren.sort((a, b) => b.score - a.score);

  const activeChildren = scoredChildren.filter(c => c.status === 'active').slice(0, limit);
  const supersededChildren = scoredChildren.filter(c => c.status === 'superseded').slice(0, 2);

  // 3. Assemble Hierarchical Context for LLM Grounding
  const activeLines = activeChildren.map(c => `  • [ACTIVE DECISION] "${c.statement}" (Owner: ${c.owner}, Conf: ${Math.round(c.confidence * 100)}%)`);
  const supersededLines = supersededChildren.map(c => `  • [SUPERSEDED DIRECTIVE - DO NOT USE] "${c.statement}" (Superseded by newer consensus)`);

  const hierarchicalContext = [
    `[Hierarchical Memory Grounding - Macro Domain: ${bestCluster.name} (Cluster Match: ${Math.round(bestCluster.domainScore * 100)}%)]:`,
    `Domain Policy: "${bestCluster.macroDirective}"`,
    ...(activeLines.length > 0 ? ['Authoritative Child Decisions:', ...activeLines] : []),
    ...(supersededLines.length > 0 ? ['Historical/Superseded Precedents:', ...supersededLines] : [])
  ].join('\n');

  return {
    query,
    matchedCluster: {
      id: bestCluster.id,
      name: bestCluster.name,
      domainScore: bestCluster.domainScore,
      macroDirective: bestCluster.macroDirective
    },
    resolvedDecisions: scoredChildren.slice(0, limit),
    hierarchicalContext
  };
}
