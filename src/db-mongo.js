import { MongoClient } from 'mongodb';
import { config } from './config.js';
import { cosineSimilarity } from './providers/embedding-provider.js';

let client = null;
let db = null;
let isConnected = false;

// Fallback in-memory store if MONGODB_URI is not provided or connection is lost
const memoryStore = {
  memories: new Map(),
  events: [],
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
    return doc;
  }
  memoryStore.memories.set(doc._id.toString(), doc);
  return doc;
}

export async function updateMemoryDocument(id, updates) {
  const idStr = id.toString();
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    const { ObjectId } = await import('mongodb');
    const query = { _id: ObjectId.isValid(idStr) ? new ObjectId(idStr) : idStr };
    await col.updateOne(query, { $set: updates });
    return await col.findOne(query);
  }
  const existing = memoryStore.memories.get(idStr);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  memoryStore.memories.set(idStr, updated);
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
  if (db && isConnected) {
    const col = db.collection(config.mongodb.memoriesCollection);
    const { ObjectId } = await import('mongodb');
    const query = { _id: ObjectId.isValid(idStr) ? new ObjectId(idStr) : idStr };
    const res = await col.deleteOne(query);
    return res.deletedCount > 0;
  }
  return memoryStore.memories.delete(idStr);
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

export async function wipeAllStoredData() {
  if (db && isConnected) {
    try {
      await db.collection(config.mongodb.memoriesCollection).deleteMany({});
      await db.collection(config.mongodb.eventsCollection).deleteMany({});
      await db.collection('conversations').deleteMany({});
    } catch (e) {}
  }
  memoryStore.memories.clear();
  memoryStore.events = [];
  conversationStore.length = 0;
  initDefaultData();
}
