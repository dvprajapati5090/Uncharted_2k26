import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

import { config, validateConfig } from './config.js';
import {
  initMongo,
  findMemories,
  getMemoryById,
  updateMemoryDocument,
  deleteMemoryDocument,
  getMemoryEvents,
  getAllUsers,
  getUserById,
  getAllWorkspaces,
  getChannels,
  wipeAllStoredData,
  insertMessage,
  getMessages
} from './db-mongo.js';
import {
  extractAndFormMemory,
  getAppNow,
  setSimulatedTime,
  refreshExpirations
} from './memory-engine-v2.js';
import { recallMemories } from './recall-engine-v2.js';
import { embedDocuments } from './providers/embedding-provider.js';

validateConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PORT = config.port || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  try {
    // ----------------------------------------------------
    // 0. HEALTH CHECK
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, {
        status: 'healthy',
        engine: 'SynapseMem 2.0 Agentic Memory',
        timestamp: getAppNow().toISOString(),
        mongodb: {
          database: config.mongodb.dbName,
          vectorIndex: config.mongodb.vectorIndexName
        },
        embeddings: {
          provider: config.embedding.provider,
          model: config.embedding.model,
          dimensions: config.embedding.dimensions
        }
      });
    }

    // ----------------------------------------------------
    // 1. WORKSPACES (TEAMS) & USERS
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/teams') {
      const workspaces = getAllWorkspaces();
      return sendJson(res, 200, workspaces);
    }

    if (req.method === 'GET' && pathname.startsWith('/api/teams/') && pathname.endsWith('/users')) {
      const users = getAllUsers();
      return sendJson(res, 200, users);
    }

    // ----------------------------------------------------
    // 2. CHANNELS
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/channels') {
      return sendJson(res, 200, getChannels());
    }

    // ----------------------------------------------------
    // 3. CHANNEL MESSAGES & INTELLIGENT EXTRACTION
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname.startsWith('/api/channels/') && pathname.endsWith('/messages')) {
      const channel = pathname.split('/')[3];
      const workspaceId = parsedUrl.searchParams.get('teamId') || 'ws_core';
      const messages = await getMessages(channel, workspaceId);
      return sendJson(res, 200, messages);
    }

    if (req.method === 'POST' && pathname.startsWith('/api/channels/') && pathname.endsWith('/messages')) {
      const channel = pathname.split('/')[3];
      const body = await parseBody(req);
      const text = (body.text || '').trim();
      const sender = body.sender || 'Sarah Jenkins';
      const user = { id: body.userId || 'u_sarah', name: sender };
      const workspaceId = body.teamId || 'ws_core';

      if (!text) {
        return sendJson(res, 400, { error: 'Message text is required' });
      }

      const isAssistantChannel = channel === 'ask-assistant';
      const isQuery = isAssistantChannel || 
        text.trim().endsWith('?') || 
        /^\?|@assistant|\bwhat\b|\bwhen\b|\bwhy\b|\bwhere\b|\bwho\b|\bhow\b|\bcan we\b|\bcan i\b|\bare there\b|\bis there\b|\bshould we\b|\bdesign\b/i.test(text);

      let extractedResult = { extracted: null, superseded: null };
      if (!isQuery) {
        extractedResult = await extractAndFormMemory({
          text,
          user,
          workspaceId,
          channel
        });
      }

      let assistantMessage = null;
      if (isQuery) {
        const recallResult = await recallMemories({
          query: text,
          user,
          workspaceId
        });

        assistantMessage = {
          id: `msg_asst_${Date.now()}`,
          channel,
          sender: 'SynapseMem 2.0 Agent',
          text: recallResult.answer,
          withoutMemoryAnswer: recallResult.withoutMemoryAnswer,
          is_assistant: true,
          timestamp: new Date(getAppNow().getTime() + 200).toISOString(),
          inspection_data: recallResult.trace
        };
      }

      const userMsg = {
        id: `msg_user_${Date.now()}`,
        channel,
        sender,
        text,
        timestamp: getAppNow().toISOString(),
        is_assistant: false,
        memories_extracted: extractedResult.extracted ? [extractedResult.extracted._id.toString()] : [],
        workspaceId
      };
      await insertMessage(userMsg);

      if (assistantMessage) {
        assistantMessage.workspaceId = workspaceId;
        await insertMessage(assistantMessage);
      }

      return sendJson(res, 201, {
        userMessage: userMsg,
        assistantMessage,
        extractedMemory: extractedResult.extracted ? formatMemoryForUI(extractedResult.extracted) : null,
        supersededMemory: extractedResult.superseded ? formatMemoryForUI(extractedResult.superseded) : null
      });
    }

    // ----------------------------------------------------
    // 4. PERSISTENT RECALL & INSPECT API
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/recall') {
      const body = await parseBody(req);
      const query = (body.query || '').trim();
      if (!query) return sendJson(res, 400, { error: 'Query is required' });

      const user = { id: body.userId || 'u_sarah' };
      const workspaceId = body.workspaceId || 'ws_core';

      const result = await recallMemories({
        query,
        user,
        workspaceId,
        isHistorical: body.isHistorical || false
      });

      return sendJson(res, 200, {
        answer: result.answer,
        withoutMemoryAnswer: result.withoutMemoryAnswer,
        selectedMemories: result.selectedMemories.map(formatMemoryForUI),
        inspection: result.trace
      });
    }

    // ----------------------------------------------------
    // 5. MEMORY LEDGER (CRUD & LIFECYCLE)
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/memories') {
      await refreshExpirations();
      const status = parsedUrl.searchParams.get('status') || 'all';
      const filter = {};
      if (status !== 'all') filter.status = status;

      const memories = await findMemories(filter);
      return sendJson(res, 200, memories.map(formatMemoryForUI));
    }

    if (req.method === 'POST' && pathname === '/api/memories') {
      const body = await parseBody(req);
      const { ObjectId } = await import('mongodb');

      const fullText = `${body.topic}: ${body.decision}. Reason: ${body.reason || ''}`;
      const embeddings = await embedDocuments([fullText]);

      const doc = {
        _id: new ObjectId(),
        scope: body.scope || 'workspace',
        ownerId: body.owner || 'u_sarah',
        workspaceId: body.teamId || 'ws_core',
        createdBy: 'u_sarah',
        type: body.type || 'decision',
        topic: body.topic,
        content: {
          statement: body.decision,
          reason: body.reason || 'Manually added decision'
        },
        tags: [body.topic.toLowerCase()],
        source: { kind: 'manual', channel: 'ledger' },
        confidence: 1.0,
        sensitivity: 'workspace',
        status: body.status || 'active',
        createdAt: getAppNow(),
        updatedAt: getAppNow(),
        validFrom: getAppNow(),
        validUntil: body.valid_until ? new Date(body.valid_until) : null,
        purgeAt: null,
        supersedesId: null,
        supersededBy: null,
        version: 1,
        embedding: embeddings[0],
        embeddingModel: config.embedding.model,
        embeddingDimensions: config.embedding.dimensions
      };

      const saved = await insertMemoryDocument(doc);
      return sendJson(res, 201, formatMemoryForUI(saved));
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/memories/')) {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);

      const updates = { updatedAt: getAppNow() };
      if (body.decision) updates['content.statement'] = body.decision;
      if (body.reason) updates['content.reason'] = body.reason;
      if (body.topic) updates.topic = body.topic;
      if (body.status) updates.status = body.status;
      if (body.valid_until !== undefined) updates.validUntil = body.valid_until ? new Date(body.valid_until) : null;

      // Re-embed if content changed
      if (body.decision || body.reason || body.topic) {
        const text = `${body.topic || ''}: ${body.decision || ''}. Reason: ${body.reason || ''}`;
        const emb = await embedDocuments([text]);
        updates.embedding = emb[0];
      }

      const updated = await updateMemoryDocument(id, updates);
      return sendJson(res, 200, formatMemoryForUI(updated));
    }

    // Permanent Forget / Deletion
    if (req.method === 'DELETE' && pathname.startsWith('/api/memories/')) {
      const id = pathname.split('/')[3];
      const deleted = await deleteMemoryDocument(id);
      return sendJson(res, 200, { success: deleted, forgottenId: id });
    }

    // ----------------------------------------------------
    // 6. TIME MACHINE (SIMULATED CLOCK)
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/time') {
      const expiredCount = await refreshExpirations();
      return sendJson(res, 200, {
        simulatedTime: getAppNow().toISOString(),
        expiredCount
      });
    }

    if (req.method === 'POST' && pathname === '/api/time') {
      const body = await parseBody(req);
      if (!body.isoString) return sendJson(res, 400, { error: 'isoString is required' });
      const newTime = setSimulatedTime(body.isoString);
      await refreshExpirations();
      return sendJson(res, 200, {
        simulatedTime: newTime.toISOString(),
        message: `System simulated time set to ${newTime.toISOString()}`
      });
    }

    // ----------------------------------------------------
    // 7. SEED & WIPE
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/wipe') {
      wipeAllStoredData();
      return sendJson(res, 200, { message: 'Memory store wiped successfully.' });
    }

    if (req.method === 'POST' && pathname === '/api/demo/seed') {
      wipeAllStoredData();
      setSimulatedTime('2026-10-30T10:00:00.000Z');

      // Seed Demo 1: Core stack decisions & constraints
      await extractAndFormMemory({
        text: 'For Project Atlas, we use Node.js, Express and MongoDB Atlas.',
        user: { id: 'u_sarah', name: 'Sarah Jenkins' },
        workspaceId: 'ws_core',
        channel: 'architecture'
      });

      await extractAndFormMemory({
        text: 'Do not introduce Redis or paid infrastructure without approval.',
        user: { id: 'u_sarah', name: 'Sarah Jenkins' },
        workspaceId: 'ws_core',
        channel: 'architecture'
      });

      await extractAndFormMemory({
        text: 'No production deployments until November 5, 2026.',
        user: { id: 'u_marcus', name: 'Marcus Chen' },
        workspaceId: 'ws_core',
        channel: 'sprint-planning'
      });

      return sendJson(res, 200, { status: 'seeded', count: 3 });
    }

    // Static files
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    return sendFile(res, filePath);

  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

function formatMemoryForUI(mem) {
  if (!mem) return null;
  return {
    id: mem._id.toString(),
    topic: mem.topic,
    decision: mem.content?.statement || '',
    reason: mem.content?.reason || '',
    owner: mem.ownerId || 'Team',
    status: mem.status,
    type: mem.type,
    valid_until: mem.validUntil ? new Date(mem.validUntil).toISOString() : null,
    superseded_by: mem.supersededBy,
    supersedes_id: mem.supersedesId,
    confidence: mem.confidence || 0.95
  };
}

// Start Server
async function start() {
  await initMongo();
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🧠 SynapseMem 2.0 (MongoDB Atlas Engine) on http://localhost:${PORT}`);
    console.log(`Embeddings: ${config.embedding.provider} (${config.embedding.dimensions}D)`);
    console.log(`=======================================================`);
  });
}

start();
