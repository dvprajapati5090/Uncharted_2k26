import crypto from 'node:crypto';
import {
  insertCodeTask,
  updateCodeTask,
  getAllCodeTasks,
  getCodeTaskById,
  getCodingStats
} from './db.js';
import {
  generateEmbedding,
  cosineSimilarity,
  computeBM25,
  filterKeywords,
  tokenize
} from './vector-search.js';

// Pre-defined code templates for realistic AI code generation in collaborative coding
const SAMPLE_CODE_SNIPPETS = {
  db_pool: `// src/db/pool.js - PostgreSQL Connection Pool with Exponential Backoff
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE || 'team_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
});

export async function queryWithRetry(text, params, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      const delay = Math.pow(2, attempt) * 200;
      console.warn(\`Query retry \${attempt}/\${maxRetries} after \${delay}ms...\`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}`,

  auth_jwt: `// src/middleware/auth.js - JWT Authentication & Refresh Token Rotation
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_prod';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev_refresh_secret';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalid or expired', code: 'TOKEN_EXPIRED' });
    }
    req.user = user;
    next();
  });
}

export function generateTokens(payload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}`,

  user_ui: `// src/components/UserProfile.jsx - Tailwind CSS User Profile Component
import React from 'react';

export default function UserProfile({ user }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md mx-auto shadow-xl">
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
          {user.name?.charAt(0) || 'U'}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{user.name}</h3>
          <p className="text-sm text-slate-400">{user.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            {user.role || 'Team Member'}
          </span>
        </div>
      </div>
    </div>
  );
}`,

  docker_setup: `# docker-compose.yml - Multi-container development environment
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  pgdata:
`
};

/**
 * Infer target files based on keywords in prompt
 */
export function inferTargetFiles(prompt) {
  const lower = prompt.toLowerCase();
  const files = [];

  if (lower.includes('postgres') || lower.includes('database') || lower.includes('pool') || lower.includes('sql') || lower.includes('query')) {
    files.push('src/db/pool.js', 'src/db/client.js');
  }
  if (lower.includes('auth') || lower.includes('jwt') || lower.includes('token') || lower.includes('login') || lower.includes('password')) {
    files.push('src/middleware/auth.js', 'src/routes/auth.js');
  }
  if (lower.includes('ui') || lower.includes('react') || lower.includes('component') || lower.includes('tailwind') || lower.includes('profile')) {
    files.push('src/components/UserProfile.jsx');
  }
  if (lower.includes('docker') || lower.includes('compose') || lower.includes('redis') || lower.includes('container')) {
    files.push('docker-compose.yml');
  }
  if (lower.includes('migration') || lower.includes('schema') || lower.includes('tables')) {
    files.push('src/db/migrations/001_init.sql');
  }

  if (files.length === 0) {
    files.push('src/index.js');
  }

  return Array.from(new Set(files));
}

/**
 * Clean 1-sentence intent summary
 */
export function summarizeIntent(prompt) {
  let clean = prompt
    .replace(/^create\s+a\s+/i, '')
    .replace(/^build\s+a\s+/i, '')
    .replace(/^implement\s+a\s+/i, '')
    .replace(/^write\s+a\s+/i, '')
    .trim();
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  return clean.length > 70 ? clean.slice(0, 67) + '...' : clean;
}

/**
 * Compare incoming candidate prompt against active and past tasks
 * Evaluates semantic collision, file collision, and token saving potential
 */
export function checkPromptCollision(candidateId, prompt, options = {}) {
  if (!prompt || prompt.trim().length < 5) {
    return { error: 'Prompt must be at least 5 characters' };
  }

  const queryVector = generateEmbedding(prompt);
  const qTokens = filterKeywords(tokenize(prompt));
  const proposedFiles = inferTargetFiles(prompt);
  const allTasks = getAllCodeTasks({ team_id: options.teamId || null });

  const activeTasks = allTasks.filter(t => t.status === 'in_progress');
  const pastTasks = allTasks.filter(t => t.status === 'completed' || t.status === 'deduplicated');

  let bestMatch = null;
  let highestScore = 0;
  let fileCollision = false;

  // 1. Check against Active (In-Progress) Tasks first (highest duplication danger)
  for (const task of activeTasks) {
    // Skip candidate comparing against their own identical task
    if (task.candidate_id === candidateId && task.prompt.trim() === prompt.trim()) {
      continue;
    }

    let taskVec = task.vector;
    if (typeof taskVec === 'string') {
      try { taskVec = JSON.parse(taskVec); } catch { taskVec = null; }
    }
    if (!taskVec || taskVec.length === 0) {
      taskVec = generateEmbedding(task.prompt);
    }

    const denseSim = cosineSimilarity(queryVector, taskVec);
    const bm25 = computeBM25(qTokens, task.prompt);

    // Check shared target files
    const sharedFiles = (task.target_files || []).filter(f => proposedFiles.includes(f));
    const fileBoost = sharedFiles.length > 0 ? 0.20 : 0.0;

    let hybrid = (denseSim * 0.60) + (bm25.score * 0.25) + fileBoost;
    hybrid = Math.max(0, Math.min(1.0, hybrid));

    if (hybrid > highestScore) {
      highestScore = hybrid;
      bestMatch = {
        task,
        denseSimilarity: parseFloat(denseSim.toFixed(3)),
        bm25Score: parseFloat(bm25.score.toFixed(3)),
        hybridScore: parseFloat(hybrid.toFixed(3)),
        sharedFiles,
        matchedTokens: bm25.matchedTerms
      };
      if (sharedFiles.length > 0) fileCollision = true;
    }
  }

  // 2. Also check against Completed Tasks if no high active collision
  if (highestScore < 0.70) {
    for (const task of pastTasks) {
      let taskVec = task.vector;
      if (typeof taskVec === 'string') {
        try { taskVec = JSON.parse(taskVec); } catch { taskVec = null; }
      }
      if (!taskVec || taskVec.length === 0) taskVec = generateEmbedding(task.prompt);

      const denseSim = cosineSimilarity(queryVector, taskVec);
      const bm25 = computeBM25(qTokens, task.prompt);
      const sharedFiles = (task.target_files || []).filter(f => proposedFiles.includes(f));
      const fileBoost = sharedFiles.length > 0 ? 0.15 : 0.0;

      let hybrid = (denseSim * 0.55) + (bm25.score * 0.30) + fileBoost;
      hybrid = Math.max(0, Math.min(1.0, hybrid));

      if (hybrid > highestScore) {
        highestScore = hybrid;
        bestMatch = {
          task,
          denseSimilarity: parseFloat(denseSim.toFixed(3)),
          bm25Score: parseFloat(bm25.score.toFixed(3)),
          hybridScore: parseFloat(hybrid.toFixed(3)),
          sharedFiles,
          matchedTokens: bm25.matchedTerms
        };
        if (sharedFiles.length > 0) fileCollision = true;
      }
    }
  }

  // 3. Determine Collision Status & Guidance
  let status = 'APPROVED_UNIQUE';
  let message = 'No duplicate work detected. This task is safe to execute and claim!';
  let estimatedTokens = 3500;
  let estimatedSavings = 0;
  let recommendation = 'Execute task and allocate component lock to yourself.';

  if (highestScore >= 0.70 || (highestScore >= 0.60 && fileCollision)) {
    status = 'HIGH_COLLISION';
    estimatedSavings = estimatedTokens;
    const ownerName = bestMatch.task.candidate_id;
    const taskState = bestMatch.task.status === 'in_progress' ? 'currently building' : 'already completed';
    message = `⚠️ Token Guard Alert! ${ownerName} is ${taskState} this exact functionality (${Math.round(highestScore * 100)}% overlap).`;
    recommendation = `Avoid wasting ~${estimatedSavings} tokens. Adopt ${ownerName}'s code or pivot to an unblocked sub-task.`;
  } else if (highestScore >= 0.45) {
    status = 'SYNERGY_OVERLAP';
    estimatedSavings = Math.round(estimatedTokens * 0.45);
    message = `💡 Collaboration Synergy: ${bestMatch.task.candidate_id} is working on related components (${Math.round(highestScore * 100)}% match).`;
    recommendation = `Coordinate boundaries to prevent merge conflicts. Shared files: ${bestMatch.sharedFiles.join(', ') || 'related modules'}.`;
  }

  return {
    status,
    candidateId,
    prompt,
    intentSummary: summarizeIntent(prompt),
    proposedFiles,
    highestSimilarity: parseFloat(highestScore.toFixed(3)),
    matchedTask: bestMatch ? bestMatch.task : null,
    matchedMetrics: bestMatch,
    fileCollision,
    estimatedTokens,
    estimatedSavings,
    message,
    recommendation
  };
}

/**
 * Submit and claim work
 */
export function claimAndExecuteTask(candidateId, prompt, options = {}) {
  const analysis = checkPromptCollision(candidateId, prompt);
  const targetFiles = inferTargetFiles(prompt);
  const intentSummary = summarizeIntent(prompt);
  const vector = generateEmbedding(prompt);

  // Generate appropriate code output based on task
  let resultCode = '';
  const lower = prompt.toLowerCase();
  if (lower.includes('postgres') || lower.includes('database') || lower.includes('pool')) {
    resultCode = SAMPLE_CODE_SNIPPETS.db_pool;
  } else if (lower.includes('auth') || lower.includes('jwt') || lower.includes('token')) {
    resultCode = SAMPLE_CODE_SNIPPETS.auth_jwt;
  } else if (lower.includes('ui') || lower.includes('profile') || lower.includes('react')) {
    resultCode = SAMPLE_CODE_SNIPPETS.user_ui;
  } else if (lower.includes('docker') || lower.includes('compose')) {
    resultCode = SAMPLE_CODE_SNIPPETS.docker_setup;
  } else {
    resultCode = `// Generated Code for: ${intentSummary}\n// Author: ${candidateId}\nexport function executeTask() {\n  console.log("Executing ${intentSummary}");\n  return { success: true, timestamp: "${new Date().toISOString()}" };\n}`;
  }

  const taskId = `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const taskRecord = {
    id: taskId,
    candidate_id: candidateId,
    candidate_role: options.candidateRole || 'Developer',
    prompt,
    intent_summary: intentSummary,
    target_files: targetFiles,
    status: options.status || 'in_progress',
    tokens_estimated: 3500,
    tokens_saved: 0,
    matched_task_id: analysis.matchedTask ? analysis.matchedTask.id : null,
    similarity_score: analysis.highestSimilarity,
    created_at: new Date().toISOString(),
    completed_at: null,
    result_code: resultCode,
    vector,
    team_id: options.teamId || 'team_engineering'
  };

  const saved = insertCodeTask(taskRecord);

  return {
    task: saved,
    analysis
  };
}

/**
 * Resolve collision: Adopt existing work, saving tokens
 */
export function adoptExistingTask(candidateId, existingTaskId, currentPrompt) {
  const existing = getCodeTaskById(existingTaskId);
  if (!existing) return { error: 'Existing task not found' };

  const tokensSaved = 3500;
  const taskId = `task_dedup_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const adoptedRecord = {
    id: taskId,
    candidate_id: candidateId,
    candidate_role: 'Developer',
    prompt: currentPrompt || `Adopted ${existing.intent_summary}`,
    intent_summary: `Reused ${existing.candidate_id}'s: ${existing.intent_summary}`,
    target_files: existing.target_files,
    status: 'deduplicated',
    tokens_estimated: 0,
    tokens_saved: tokensSaved,
    matched_task_id: existing.id,
    similarity_score: 0.95,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    result_code: `// ADOPTED FROM ${existing.candidate_id} (Zero Tokens Spent!)\n// Original Task ID: ${existing.id}\n${existing.result_code}`,
    vector: existing.vector
  };

  const saved = insertCodeTask(adoptedRecord);

  return {
    adoptedTask: saved,
    originalTask: existing,
    tokensSaved,
    message: `🎉 Success! Adopted ${existing.candidate_id}'s work without executing redundant AI inference. Saved ~${tokensSaved} tokens!`
  };
}
