import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

import {
  getChannels,
  getChannelMessages,
  insertConversationMessage,
  getAllMemories,
  getMemoryById,
  insertMemory,
  updateMemory,
  deleteMemory,
  getAuditLogs,
  getAllCodeTasks,
  getCodeTaskById,
  deleteCodeTask,
  getCodingStats,
  clearAllCodeTasks,
  wipeAllData
} from './db.js';
import {
  processMessageForMemory,
  getCurrentTime,
  setSimulatedTime,
  refreshMemoryExpirations
} from './memory-engine.js';
import { recallFromMemory } from './recall-engine.js';
import { seedDemoData } from './seed-data.js';
import { generateEmbedding } from './vector-search.js';
import {
  checkPromptCollision,
  claimAndExecuteTask,
  adoptExistingTask
} from './prompt-guard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const PORT = process.env.PORT || 3000;

// MIME types dictionary
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
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
  // Enable CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  try {
    // ----------------------------------------------------
    // API ROUTES
    // ----------------------------------------------------

    // 1. GET /api/channels
    if (req.method === 'GET' && pathname === '/api/channels') {
      const channels = getChannels();
      return sendJson(res, 200, channels);
    }

    // 2. GET /api/channels/:channel/messages
    if (req.method === 'GET' && pathname.startsWith('/api/channels/') && pathname.endsWith('/messages')) {
      const channel = pathname.split('/')[3];
      const messages = getChannelMessages(channel);
      return sendJson(res, 200, messages);
    }

    // 3. POST /api/channels/:channel/messages
    if (req.method === 'POST' && pathname.startsWith('/api/channels/') && pathname.endsWith('/messages')) {
      const channel = pathname.split('/')[3];
      const body = await parseBody(req);
      const text = (body.text || '').trim();
      const sender = body.sender || 'User';

      if (!text) {
        return sendJson(res, 400, { error: 'Message text is required' });
      }

      // Check if this is an explicit query to assistant
      const isAssistantChannel = channel === 'ask-assistant';
      const isDirectQuery = isAssistantChannel || /^\?|@assistant|\bwhat\b|\bwhen\b|\bwho\b|\bwhy\b/i.test(text);

      // Create and save user message
      const userMsg = {
        id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        channel,
        sender,
        sender_role: 'team',
        text,
        timestamp: getCurrentTime().toISOString(),
        is_assistant: false
      };

      // 1. Check for memory extraction from this message
      const memoryResult = processMessageForMemory(text, sender, channel);
      userMsg.memories_extracted = memoryResult.extracted ? [memoryResult.extracted.id] : [];
      insertConversationMessage(userMsg);

      let assistantReply = null;

      // 2. If it's a query or in ask-assistant channel, trigger Recall Engine
      if (isDirectQuery && !memoryResult.extracted) {
        const recallResult = await recallFromMemory(text);

        assistantReply = {
          id: `msg_asst_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          channel,
          sender: 'Memory Assistant',
          sender_role: 'assistant',
          text: recallResult.answer,
          timestamp: new Date(getCurrentTime().getTime() + 500).toISOString(),
          is_assistant: true,
          inspection_data: recallResult.inspection,
          memories_extracted: recallResult.selectedMemories.map(m => m.id)
        };

        insertConversationMessage(assistantReply);
      }

      return sendJson(res, 201, {
        userMessage: userMsg,
        assistantMessage: assistantReply,
        extractedMemory: memoryResult.extracted,
        supersededMemory: memoryResult.superseded
      });
    }

    // 4. GET /api/memories (all memories, with filter support)
    if (req.method === 'GET' && pathname === '/api/memories') {
      refreshMemoryExpirations();
      const status = parsedUrl.searchParams.get('status') || 'all';
      const topic = parsedUrl.searchParams.get('topic') || '';
      const type = parsedUrl.searchParams.get('type') || '';
      const memories = getAllMemories({ status, topic, type });
      return sendJson(res, 200, memories);
    }

    // 5. POST /api/memories (Manual creation)
    if (req.method === 'POST' && pathname === '/api/memories') {
      const body = await parseBody(req);
      if (!body.decision || !body.topic) {
        return sendJson(res, 400, { error: 'Topic and Decision are required' });
      }

      const fullText = `${body.topic}: ${body.decision}. Reason: ${body.reason || ''}. Owner: ${body.owner || 'Team'}`;
      const vector = generateEmbedding(fullText);

      const newMemory = {
        id: `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        topic: body.topic,
        decision: body.decision,
        reason: body.reason || '',
        owner: body.owner || 'Team',
        created_at: getCurrentTime().toISOString(),
        updated_at: getCurrentTime().toISOString(),
        type: body.type || 'decision',
        status: body.status || 'active',
        valid_until: body.valid_until || null,
        superseded_by: null,
        supersedes_id: null,
        confidence: 1.0,
        source_message: body.source_message || 'Manually added by user',
        channel: body.channel || 'general',
        tags: body.tags || [body.topic.toLowerCase()],
        vector
      };

      const saved = insertMemory(newMemory);
      return sendJson(res, 201, saved);
    }

    // 6. GET /api/memories/:id
    if (req.method === 'GET' && pathname.startsWith('/api/memories/') && pathname.split('/').length === 4) {
      const id = pathname.split('/')[3];
      const mem = getMemoryById(id);
      if (!mem) return sendJson(res, 404, { error: 'Memory not found' });
      return sendJson(res, 200, mem);
    }

    // 7. PUT /api/memories/:id (User correction & updates)
    if (req.method === 'PUT' && pathname.startsWith('/api/memories/') && pathname.split('/').length === 4) {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);

      // Re-generate vector if decision, topic or reason changed
      if (body.decision || body.topic || body.reason) {
        const current = getMemoryById(id);
        const fullText = `${body.topic || current.topic}: ${body.decision || current.decision}. Reason: ${body.reason || current.reason}. Owner: ${body.owner || current.owner}`;
        body.vector = generateEmbedding(fullText);
      }

      const updated = updateMemory(id, body);
      if (!updated) return sendJson(res, 404, { error: 'Memory not found' });
      return sendJson(res, 200, updated);
    }

    // 8. DELETE /api/memories/:id (User deletion)
    if (req.method === 'DELETE' && pathname.startsWith('/api/memories/') && pathname.split('/').length === 4) {
      const id = pathname.split('/')[3];
      const success = deleteMemory(id);
      if (!success) return sendJson(res, 404, { error: 'Memory not found' });
      return sendJson(res, 200, { success: true, deletedId: id });
    }

    // 9. POST /api/recall (Direct query for assistant recall & inspection)
    if (req.method === 'POST' && pathname === '/api/recall') {
      const body = await parseBody(req);
      const query = (body.query || '').trim();
      if (!query) {
        return sendJson(res, 400, { error: 'Query is required' });
      }

      const result = await recallFromMemory(query);
      return sendJson(res, 200, result);
    }

    // 10. GET /api/time (Get simulated time and expired count)
    if (req.method === 'GET' && pathname === '/api/time') {
      const time = getCurrentTime();
      const expiredCount = refreshMemoryExpirations();
      return sendJson(res, 200, {
        simulatedTime: time.toISOString(),
        expiredCount
      });
    }

    // 11. POST /api/time (Set simulated time for Time Machine / Expiry demo)
    if (req.method === 'POST' && pathname === '/api/time') {
      const body = await parseBody(req);
      if (!body.isoString) {
        return sendJson(res, 400, { error: 'isoString is required' });
      }
      const newTime = setSimulatedTime(body.isoString);
      return sendJson(res, 200, {
        simulatedTime: newTime.toISOString(),
        message: `System simulated time updated to ${newTime.toISOString()}`
      });
    }

    // 12. POST /api/wipe (Wipe all prebuilt and stored data to start 100% from scratch)
    if (req.method === 'POST' && pathname === '/api/wipe') {
      wipeAllData();
      return sendJson(res, 200, { message: 'All data wiped successfully. System is completely blank and ready for fresh input.' });
    }

    // 13. POST /api/demo/seed (Reset and seed demo data)
    if (req.method === 'POST' && pathname === '/api/demo/seed') {
      const resData = seedDemoData();
      return sendJson(res, 200, resData);
    }

    // 13. GET /api/audit (Audit trail)
    if (req.method === 'GET' && pathname === '/api/audit') {
      const memoryId = parsedUrl.searchParams.get('memoryId');
      const logs = getAuditLogs(memoryId);
      return sendJson(res, 200, logs);
    }

    // ----------------------------------------------------
    // TEAM CODING & PROMPT COLLISION GUARD (TOKEN SAVER)
    // ----------------------------------------------------

    // 14. POST /api/coding/check-prompt (Pre-flight check before execution)
    if (req.method === 'POST' && pathname === '/api/coding/check-prompt') {
      const body = await parseBody(req);
      const prompt = (body.prompt || '').trim();
      const candidateId = body.candidateId || 'Candidate B';

      if (!prompt) {
        return sendJson(res, 400, { error: 'Prompt is required' });
      }

      const analysis = checkPromptCollision(candidateId, prompt);
      return sendJson(res, 200, analysis);
    }

    // 15. POST /api/coding/claim-task (Claim task and execute code generation)
    if (req.method === 'POST' && pathname === '/api/coding/claim-task') {
      const body = await parseBody(req);
      const prompt = (body.prompt || '').trim();
      const candidateId = body.candidateId || 'Candidate A';
      const candidateRole = body.candidateRole || 'Developer';

      if (!prompt) {
        return sendJson(res, 400, { error: 'Prompt is required' });
      }

      const result = claimAndExecuteTask(candidateId, prompt, { candidateRole, status: body.status });
      return sendJson(res, 201, result);
    }

    // 16. POST /api/coding/adopt-task (Adopt existing candidate's code & save tokens)
    if (req.method === 'POST' && pathname === '/api/coding/adopt-task') {
      const body = await parseBody(req);
      const candidateId = body.candidateId || 'Candidate B';
      const existingTaskId = body.existingTaskId;
      const currentPrompt = body.currentPrompt;

      if (!existingTaskId) {
        return sendJson(res, 400, { error: 'existingTaskId is required' });
      }

      const result = adoptExistingTask(candidateId, existingTaskId, currentPrompt);
      return sendJson(res, 200, result);
    }

    // 17. GET /api/coding/tasks (Get all active & past team coding tasks)
    if (req.method === 'GET' && pathname === '/api/coding/tasks') {
      const status = parsedUrl.searchParams.get('status');
      const candidateId = parsedUrl.searchParams.get('candidateId');
      const tasks = getAllCodeTasks({ status, candidateId });
      return sendJson(res, 200, tasks);
    }

    // 18. GET /api/coding/stats (Token savings meter & collision prevention metrics)
    if (req.method === 'GET' && pathname === '/api/coding/stats') {
      const stats = getCodingStats();
      return sendJson(res, 200, stats);
    }

    // 19. POST /api/coding/demo-collision (Seed Candidate A & B Collision Demo)
    if (req.method === 'POST' && pathname === '/api/coding/demo-collision') {
      clearAllCodeTasks();

      // Step 1: Candidate A claims PostgreSQL Connection Pool
      const taskA = claimAndExecuteTask(
        'Candidate A',
        'Create a PostgreSQL connection pool with retry logic and error handler in Node.js',
        { candidateRole: 'Backend Lead', status: 'in_progress' }
      );

      // Step 2: Elena claims React User Profile UI
      const taskElena = claimAndExecuteTask(
        'Elena',
        'Build a React user profile card component using Tailwind CSS',
        { candidateRole: 'Frontend Dev', status: 'completed' }
      );

      return sendJson(res, 200, {
        message: 'Collaborative coding scenario seeded! Candidate A is in_progress on PostgreSQL pool.',
        tasks: [taskA.task, taskElena.task]
      });
    }

    // ----------------------------------------------------
    // STATIC FILE SERVING
    // ----------------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // If file doesn't exist, fall back to index.html for SPA
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    return sendFile(res, filePath);

  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

// Server startup (Clean slate - zero prebuilt data)
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🧠 Team Memory Assistant running at http://localhost:${PORT}`);
  console.log(`Clean state: Ready for fresh inputs from scratch.`);
  console.log(`=======================================================`);
});
