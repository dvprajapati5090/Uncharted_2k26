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
  getMessages,
  recordFeedback,
  getFeedbackList,
  getTrainingStats,
  exportDpoDataset,
  exportVoyagePairs,
  getMemoryGraph,
  traverseGraphRAG,
  addMemoryRelation,
  buildHierarchicalClusters,
  searchHierarchicalMemories
} from './db-mongo.js';
import {
  extractAndFormMemory,
  getAppNow,
  setSimulatedTime,
  refreshExpirations,
  handleSuperseding
} from './memory-engine-v2.js';
import { recallMemories } from './recall-engine-v2.js';
import { embedDocuments } from './providers/embedding-provider.js';
import {
  AVAILABLE_MODELS,
  setRuntimeKey,
  getRuntimeKey,
  generateMultiModelAnswer,
  testLlmConnection
} from './providers/llm-provider.js';
import {
  evaluateMemoryConsensus,
  getConsensusHistory,
  getConsensusStats,
  AGENT_PERSONAS
} from './consensus-engine-v2.js';
import { realtimeSync } from './realtime-sync.js';
import { runLiveBenchmark, getLatestBenchmark } from './benchmark-engine.js';
import { analyzePreCommitConflict, executeConflictResolution } from './conflict-arbiter.js';
import { generateEnterpriseAdrDossier } from './dossier-exporter.js';
import {
  registerUser,
  loginUser,
  getUserByToken,
  logoutUser,
  getAllAuthWorkspaces,
  getUsersByWorkspace
} from './auth.js';

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
    // ----------------------------------------------------
    // AUTHENTICATION (EMAIL & PASSWORD REGISTER / LOGIN)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      try {
        const body = await parseBody(req);
        const result = registerUser(body);
        return sendJson(res, 201, { success: true, ...result });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      try {
        const body = await parseBody(req);
        const result = loginUser(body);
        return sendJson(res, 200, { success: true, ...result });
      } catch (err) {
        return sendJson(res, 401, { error: err.message });
      }
    }

    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-auth-token'];
      const data = getUserByToken(token);
      if (!data) {
        return sendJson(res, 401, { error: 'Not authenticated' });
      }
      return sendJson(res, 200, { success: true, ...data });
    }

    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-auth-token'];
      logoutUser(token);
      return sendJson(res, 200, { success: true });
    }

    // 1. WORKSPACES (TEAMS) & USERS
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/teams') {
      const authWs = getAllAuthWorkspaces();
      const workspaces = authWs.length > 0 ? authWs : getAllWorkspaces();
      return sendJson(res, 200, workspaces);
    }

    if (req.method === 'GET' && pathname.startsWith('/api/teams/') && pathname.endsWith('/users')) {
      const teamId = pathname.split('/')[3];
      const authUsers = getUsersByWorkspace(teamId);
      const users = authUsers.length > 0 ? authUsers : getAllUsers();
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
          workspaceId,
          model: body.model || 'gemini-2.5-flash',
          apiKey: body.apiKey || ''
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
        isHistorical: body.isHistorical || false,
        model: body.model || 'gemini-2.5-flash',
        apiKey: body.apiKey || ''
      });

      return sendJson(res, 200, {
        answer: result.answer,
        withoutMemoryAnswer: result.withoutMemoryAnswer,
        selectedMemories: result.selectedMemories.map(formatMemoryForUI),
        inspection: result.trace
      });
    }

    // ----------------------------------------------------
    // 4.1. LIVE STREAMING GROUNDING ENDPOINT (SSE)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/chat/stream') {
      const body = await parseBody(req);
      const query = (body.query || body.text || '').trim();
      if (!query) return sendJson(res, 400, { error: 'Query is required' });

      const user = { id: body.userId || 'u_sarah' };
      const workspaceId = body.workspaceId || 'ws_core';
      const model = body.model || 'gemini-2.5-flash';
      const apiKey = (body.apiKey || '').trim();

      // If client supplied an active API key in chat request, persist to runtime store
      if (apiKey) {
        const provider = model.includes('claude') ? 'claude' : 'gemini';
        setRuntimeKey(provider, apiKey);
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      try {
        const recallResult = await recallMemories({
          query,
          user,
          workspaceId,
          model,
          apiKey
        });

        // 1. Emit grounding trace metadata
        res.write(`event: grounding\ndata: ${JSON.stringify(recallResult.trace)}\n\n`);

        // 2. Stream answer tokens with live pacing
        const answer = recallResult.answer || '';
        const words = answer.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          res.write(`event: token\ndata: ${JSON.stringify({ chunk, index: i })}\n\n`);
          await new Promise(r => setTimeout(r, 22));
        }

        // 3. Emit done event
        res.write(`event: done\ndata: ${JSON.stringify({
          answer: recallResult.answer,
          withoutMemoryAnswer: recallResult.withoutMemoryAnswer,
          trace: recallResult.trace
        })}\n\n`);
      } catch (err) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      }

      return res.end();
    }

    // ----------------------------------------------------
    // 4.2. MULTI-MODEL LLM CONFIGURATION API
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/llm/models') {
      return sendJson(res, 200, {
        models: AVAILABLE_MODELS,
        activeKeys: {
          hasGeminiKey: !!getRuntimeKey('gemini'),
          hasClaudeKey: !!getRuntimeKey('claude')
        }
      });
    }

    if (req.method === 'POST' && pathname === '/api/llm/keys') {
      const body = await parseBody(req);
      if (body.provider && typeof body.key === 'string') {
        setRuntimeKey(body.provider, body.key);
      }
      return sendJson(res, 200, {
        success: true,
        activeKeys: {
          hasGeminiKey: !!getRuntimeKey('gemini'),
          hasClaudeKey: !!getRuntimeKey('claude')
        }
      });
    }

    if (req.method === 'POST' && pathname === '/api/llm/test') {
      const body = await parseBody(req);
      const provider = body.provider || 'gemini';
      const key = (body.key || getRuntimeKey(provider) || '').trim();

      if (!key) {
        return sendJson(res, 400, { success: false, error: `No API key provided for ${provider}. Please enter a key.` });
      }

      try {
        const testRes = await testLlmConnection({ provider, apiKey: key });
        setRuntimeKey(provider, key);
        return sendJson(res, 200, testRes);
      } catch (err) {
        return sendJson(res, 400, { success: false, error: err.message });
      }
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

      const validUntilDate = body.valid_until ? new Date(body.valid_until) : null;
      let initialStatus = body.status || 'active';
      if (validUntilDate && validUntilDate <= getAppNow()) {
        initialStatus = 'expired';
      }

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
        status: initialStatus,
        createdAt: getAppNow(),
        updatedAt: getAppNow(),
        validFrom: getAppNow(),
        validUntil: validUntilDate,
        purgeAt: validUntilDate ? new Date(validUntilDate.getTime() + (7 * 24 * 3600 * 1000)) : null,
        supersedesId: null,
        supersededBy: null,
        version: 1,
        embedding: embeddings[0],
        embeddingModel: config.embedding.model,
        embeddingDimensions: config.embedding.dimensions
      };

      if (initialStatus === 'active') {
        await handleSuperseding(doc);
      }

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
      if (body.valid_until !== undefined) {
        const d = body.valid_until ? new Date(body.valid_until) : null;
        updates.validUntil = d;
        if (d && d <= getAppNow()) {
          updates.status = 'expired';
        }
      }

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
    // 6.5. ACTIVE REINFORCEMENT & DPO TRAINING DATASET API
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/feedback') {
      const body = await parseBody(req);
      const feedback = await recordFeedback(body);
      const stats = await getTrainingStats();
      return sendJson(res, 201, {
        success: true,
        feedback,
        stats
      });
    }

    if (req.method === 'GET' && pathname === '/api/training/stats') {
      const stats = await getTrainingStats();
      return sendJson(res, 200, stats);
    }

    if (req.method === 'GET' && pathname === '/api/training/feedback') {
      const items = await getFeedbackList();
      return sendJson(res, 200, items);
    }

    if (req.method === 'GET' && pathname === '/api/training/dpo-dataset.jsonl') {
      const dataset = await exportDpoDataset();
      const jsonl = dataset.map(d => JSON.stringify(d)).join('\n');
      res.writeHead(200, {
        'Content-Type': 'application/x-jsonlines; charset=utf-8',
        'Content-Disposition': 'attachment; filename="synapsemem-dpo-dataset.jsonl"'
      });
      return res.end(jsonl);
    }

    if (req.method === 'GET' && pathname === '/api/training/voyage-pairs.jsonl') {
      const pairs = await exportVoyagePairs();
      const jsonl = pairs.map(p => JSON.stringify(p)).join('\n');
      res.writeHead(200, {
        'Content-Type': 'application/x-jsonlines; charset=utf-8',
        'Content-Disposition': 'attachment; filename="synapsemem-voyage-pairs.jsonl"'
      });
      return res.end(jsonl);
    }

    if (req.method === 'POST' && pathname === '/api/training/generate-synthetic') {
      const memories = await findMemories({ status: 'active' });
      const created = [];
      for (const m of memories.slice(0, 3)) {
        let q = `What is our policy on ${m.topic.toLowerCase()}?`;
        if (m.topic === 'Infrastructure') q = 'Design a background job system for scheduled notifications.';
        else if (m.topic === 'Database') q = 'What database are we using for Project Atlas?';
        else if (m.topic === 'Deployment') q = 'Are there any active deployment freeze rules?';

        const fb = await recordFeedback({
          query: q,
          chosenAnswer: `Based on stored memory: "${m.content.statement}".`,
          rejectedAnswer: `A generic default pattern suggests standard commercial tooling.`,
          rating: 1,
          reasonTag: 'adhered_to_constraint',
          memoryIds: [m._id.toString()],
          workspaceId: m.workspaceId
        });
        created.push(fb);
      }
      const stats = await getTrainingStats();
      return sendJson(res, 201, { status: 'synthetic_pairs_generated', count: created.length, stats });
    }

    // ----------------------------------------------------
    // 6.8. KNOWLEDGE GRAPH & GRAPHRAG LINEAGE API
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/graph') {
      const workspaceId = parsedUrl.searchParams.get('workspaceId') || 'ws_core';
      const graph = await getMemoryGraph(workspaceId);
      return sendJson(res, 200, graph);
    }

    if (req.method === 'GET' && pathname.startsWith('/api/graph/') && !pathname.endsWith('/link')) {
      const id = pathname.split('/')[3];
      const result = await traverseGraphRAG(id, 2);
      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && pathname === '/api/graph/link') {
      const body = await parseBody(req);
      const link = await addMemoryRelation(body.sourceId, body.targetId, body.type, body.label);
      return sendJson(res, 201, { success: true, link });
    }

    // ----------------------------------------------------
    // 6.9. HIERARCHICAL MULTI-VECTOR & DOMAIN CLUSTERING API
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/hierarchy') {
      const workspaceId = parsedUrl.searchParams.get('workspaceId') || 'ws_core';
      const hierarchy = await buildHierarchicalClusters(workspaceId);
      return sendJson(res, 200, hierarchy);
    }

    if (req.method === 'POST' && pathname === '/api/hierarchy/recluster') {
      const body = await parseBody(req).catch(() => ({}));
      const workspaceId = body.workspaceId || 'ws_core';
      const hierarchy = await buildHierarchicalClusters(workspaceId);
      return sendJson(res, 200, { success: true, hierarchy });
    }

    if (req.method === 'GET' && pathname === '/api/hierarchy/search') {
      const q = parsedUrl.searchParams.get('q') || '';
      const workspaceId = parsedUrl.searchParams.get('workspaceId') || 'ws_core';
      const searchResult = await searchHierarchicalMemories({ query: q, workspaceId });
      return sendJson(res, 200, searchResult);
    }

    // ----------------------------------------------------
    // 6.10. MULTI-AGENT CONSENSUS & QUORUM VALIDATION API
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/consensus') {
      const workspaceId = parsedUrl.searchParams.get('workspaceId') || 'ws_core';
      const history = await getConsensusHistory(workspaceId);
      const stats = await getConsensusStats(workspaceId);
      return sendJson(res, 200, {
        history,
        stats,
        personas: AGENT_PERSONAS
      });
    }

    if (req.method === 'POST' && pathname === '/api/consensus/evaluate') {
      const body = await parseBody(req);
      const candidate = {
        content: { statement: body.statement },
        topic: body.topic || 'Infrastructure',
        ownerId: body.proposer || 'u_sarah',
        workspaceId: body.workspaceId || 'ws_core'
      };
      const result = await evaluateMemoryConsensus(candidate, {
        proposer: body.proposer || 'u_sarah',
        workspaceId: body.workspaceId || 'ws_core'
      });
      return sendJson(res, 201, result);
    }

    // ----------------------------------------------------
    // 6.11. REALTIME CHANGE STREAMS & MULTI-AGENT SYNC API
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/realtime/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      realtimeSync.addClient(res);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/realtime/history') {
      return sendJson(res, 200, {
        history: realtimeSync.getHistory(),
        stats: realtimeSync.getStats()
      });
    }

    if (req.method === 'POST' && pathname === '/api/realtime/broadcast') {
      const body = await parseBody(req);
      const event = realtimeSync.broadcast(body);
      return sendJson(res, 201, { success: true, event });
    }

    // ----------------------------------------------------
    // 6.12. BENCHMARK & COMPARATIVE EVALUATION API
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/benchmark/latest') {
      return sendJson(res, 200, getLatestBenchmark());
    }

    if (req.method === 'POST' && pathname === '/api/benchmark/run') {
      const body = await parseBody(req).catch(() => ({}));
      const results = await runLiveBenchmark(body);
      return sendJson(res, 200, results);
    }

    // ----------------------------------------------------
    // 6.13. SEMANTIC CONFLICT ARBITER & PRE-COMMIT SHIELD API
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/memories/check-conflict') {
      const body = await parseBody(req);
      const analysis = await analyzePreCommitConflict({
        text: body.text || '',
        statement: body.statement || '',
        topic: body.topic || '',
        workspaceId: body.workspaceId || 'ws_core',
        userId: body.userId || 'u_sarah'
      });
      return sendJson(res, 200, analysis);
    }

    if (req.method === 'POST' && pathname === '/api/memories/resolve-conflict') {
      const body = await parseBody(req);
      const resolution = await executeConflictResolution({
        strategy: body.strategy || 'supersede',
        candidateMemory: body.candidateMemory || {},
        conflictingMemoryId: body.conflictingMemoryId,
        user: { id: body.userId || 'u_sarah' }
      });
      return sendJson(res, 200, resolution);
    }

    // ----------------------------------------------------
    // 6.14. ENTERPRISE ADR & MEMORY DOSSIER EXPORT API
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/export/adr-dossier') {
      const workspaceId = parsedUrl.searchParams.get('workspaceId') || 'ws_core';
      const format = parsedUrl.searchParams.get('format') || 'json';
      const dossier = await generateEnterpriseAdrDossier(workspaceId);

      if (format === 'markdown') {
        res.writeHead(200, {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${dossier.filename}"`,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(dossier.markdown);
        return;
      }

      return sendJson(res, 200, { success: true, dossier });
    }

    // ----------------------------------------------------
    // 7. SEED & WIPE
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/wipe') {
      await wipeAllStoredData();
      return sendJson(res, 200, { message: 'Memory store wiped successfully.' });
    }

    if (req.method === 'POST' && pathname === '/api/demo/seed') {
      const body = await parseBody(req).catch(() => ({}));
      // Only wipe if explicitly asked (e.g. hard reset)
      if (body.wipeAll) {
        await wipeAllStoredData();
      }
      setSimulatedTime('2026-10-30T10:00:00.000Z');

      // Ensure foundational demo memories exist without wiping user-created memories
      const existing = await findMemories({ workspaceId: 'ws_core' });
      const hasNodeDb = existing.some(m => m.content?.statement?.includes('Node.js'));
      const hasRedis = existing.some(m => m.content?.statement?.includes('Redis'));
      const hasDeploy = existing.some(m => m.content?.statement?.includes('production deployments'));

      if (!hasNodeDb) {
        await extractAndFormMemory({
          text: 'For Project Atlas, we use Node.js, Express and MongoDB Atlas.',
          user: { id: 'u_sarah', name: 'Sarah Jenkins' },
          workspaceId: 'ws_core',
          channel: 'architecture'
        });
      }

      if (!hasRedis) {
        await extractAndFormMemory({
          text: 'Do not introduce Redis or paid infrastructure without approval.',
          user: { id: 'u_sarah', name: 'Sarah Jenkins' },
          workspaceId: 'ws_core',
          channel: 'architecture'
        });
      }

      if (!hasDeploy) {
        await extractAndFormMemory({
          text: 'No production deployments until November 5, 2026.',
          user: { id: 'u_marcus', name: 'Marcus Chen' },
          workspaceId: 'ws_core',
          channel: 'sprint-planning'
        });
      }

      const totalCount = (await findMemories({ workspaceId: 'ws_core' })).length;
      return sendJson(res, 200, { status: 'seeded', count: totalCount });
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
  try {
    const existing = await findMemories({ workspaceId: 'ws_core' });
    if (existing.length < 2) {
      console.log('[Startup] Auto-seeding foundational team architectural directives into MongoDB...');
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
    }
  } catch (err) {
    console.warn('[Startup] Memory auto-seed check note:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🧠 SynapseMem 2.0 (MongoDB Atlas Engine) on http://localhost:${PORT}`);
    console.log(`Embeddings: ${config.embedding.provider} (${config.embedding.dimensions}D)`);
    console.log(`=======================================================`);
  });
}

start();
