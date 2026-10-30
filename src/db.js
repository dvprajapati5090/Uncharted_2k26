import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/memory.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db) {
  // 1. Memories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT,
      owner TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'decision',
      status TEXT NOT NULL DEFAULT 'active',
      valid_until TEXT,
      superseded_by TEXT,
      supersedes_id TEXT,
      confidence REAL DEFAULT 0.95,
      source_message TEXT,
      channel TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      vector TEXT
    );
  `);

  // 2. Conversations Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      sender TEXT NOT NULL,
      sender_role TEXT DEFAULT 'team',
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      memories_extracted TEXT DEFAULT '[]',
      is_assistant INTEGER DEFAULT 0,
      inspection_data TEXT
    );
  `);

  // 3. Channels Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );
  `);

  // 4. Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // 5. Audit Log Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // 6. Collaborative Code Tasks & Prompt Deduplication Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS code_tasks (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      candidate_role TEXT DEFAULT 'Developer',
      prompt TEXT NOT NULL,
      intent_summary TEXT NOT NULL,
      target_files TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'in_progress',
      tokens_estimated INTEGER DEFAULT 3500,
      tokens_saved INTEGER DEFAULT 0,
      matched_task_id TEXT,
      similarity_score REAL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      result_code TEXT,
      vector TEXT
    );
  `);

  // 7. Teams Table (Multi-tenant workspaces)
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 8. Users Table (Team members & candidates)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Developer',
      avatar TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Safely add team_id to existing tables if missing
  try { db.exec("ALTER TABLE memories ADD COLUMN team_id TEXT DEFAULT 'team_engineering'"); } catch(e) {}
  try { db.exec("ALTER TABLE conversations ADD COLUMN team_id TEXT DEFAULT 'team_engineering'"); } catch(e) {}
  try { db.exec("ALTER TABLE code_tasks ADD COLUMN team_id TEXT DEFAULT 'team_engineering'"); } catch(e) {}
  try { db.exec("ALTER TABLE audit_log ADD COLUMN team_id TEXT DEFAULT 'team_engineering'"); } catch(e) {}

  // Initialize default channels if not exists
  const channelCount = db.prepare('SELECT count(*) as count FROM channels').get().count;
  if (channelCount === 0) {
    const insertChannel = db.prepare('INSERT INTO channels (id, name, description) VALUES (?, ?, ?)');
    insertChannel.run('architecture', '#architecture', 'Technical design and stack decisions');
    insertChannel.run('sprint-planning', '#sprint-planning', 'Sprint priorities, deadlines, and assumptions');
    insertChannel.run('ask-assistant', '#ask-assistant', 'Query team memory across sessions');
  }

  // Initialize default teams and users if none exist
  const teamCount = db.prepare('SELECT count(*) as count FROM teams').get().count;
  if (teamCount === 0) {
    const insertTeam = db.prepare('INSERT INTO teams (id, name, description, created_at) VALUES (?, ?, ?, ?)');
    const now = new Date().toISOString();
    insertTeam.run('team_engineering', 'Apollo Core Engineering', 'Backend, frontend, and infra team', now);
    insertTeam.run('team_hackathon', 'Alpha Hackathon Squad', 'Rapid prototyping and candidate sprint', now);

    const insertUser = db.prepare('INSERT INTO users (id, team_id, name, role, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    insertUser.run('u_sarah', 'team_engineering', 'Sarah Jenkins', 'Tech Lead', 'SJ', now);
    insertUser.run('u_alex', 'team_engineering', 'Alex Rivera', 'Backend Dev', 'AR', now);
    insertUser.run('u_marcus', 'team_engineering', 'Marcus Chen', 'Product Manager', 'MC', now);
    insertUser.run('u_elena', 'team_engineering', 'Elena Rostova', 'Frontend Dev', 'ER', now);

    insertUser.run('u_cand_a', 'team_hackathon', 'Candidate A', 'Backend Candidate', 'CA', now);
    insertUser.run('u_cand_b', 'team_hackathon', 'Candidate B', 'Fullstack Candidate', 'CB', now);
  }

  // Set default simulated date if not exists (Oct 30, 2026)
  const dateSetting = db.prepare("SELECT value FROM settings WHERE key = 'simulated_date'").get();
  if (!dateSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('simulated_date', ?)").run('2026-10-30T18:51:58.000Z');
  }
}

// Memory Operations
export function insertMemory(memory) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO memories (
      id, topic, decision, reason, owner, created_at, updated_at,
      type, status, valid_until, superseded_by, supersedes_id,
      confidence, source_message, channel, tags, vector, team_id
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    memory.id,
    memory.topic,
    memory.decision,
    memory.reason || '',
    memory.owner || 'Team',
    memory.created_at || new Date().toISOString(),
    memory.updated_at || new Date().toISOString(),
    memory.type || 'decision',
    memory.status || 'active',
    memory.valid_until || null,
    memory.superseded_by || null,
    memory.supersedes_id || null,
    memory.confidence || 0.95,
    memory.source_message || '',
    memory.channel || 'general',
    JSON.stringify(memory.tags || []),
    typeof memory.vector === 'string' ? memory.vector : JSON.stringify(memory.vector || []),
    memory.team_id || 'team_engineering'
  );

  logAudit('CREATE', memory.id, `Created memory on topic "${memory.topic}": ${memory.decision}`);
  return getMemoryById(memory.id);
}

export function updateMemory(id, fields) {
  const db = getDb();
  const current = getMemoryById(id);
  if (!current) return null;

  const updated = {
    ...current,
    ...fields,
    updated_at: new Date().toISOString()
  };

  const stmt = db.prepare(`
    UPDATE memories SET
      topic = ?,
      decision = ?,
      reason = ?,
      owner = ?,
      updated_at = ?,
      type = ?,
      status = ?,
      valid_until = ?,
      superseded_by = ?,
      supersedes_id = ?,
      confidence = ?,
      tags = ?,
      vector = ?
    WHERE id = ?
  `);

  stmt.run(
    updated.topic,
    updated.decision,
    updated.reason || '',
    updated.owner || 'Team',
    updated.updated_at,
    updated.type,
    updated.status,
    updated.valid_until || null,
    updated.superseded_by || null,
    updated.supersedes_id || null,
    updated.confidence,
    typeof updated.tags === 'string' ? updated.tags : JSON.stringify(updated.tags || []),
    typeof updated.vector === 'string' ? updated.vector : JSON.stringify(updated.vector || []),
    id
  );

  logAudit('UPDATE', id, `Updated memory fields: ${Object.keys(fields).join(', ')}`);
  return getMemoryById(id);
}

export function getMemoryById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
  if (!row) return null;
  return formatMemoryRow(row);
}

export function getAllMemories(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM memories WHERE 1=1';
  const params = [];

  if (filters.team_id) {
    sql += ' AND (team_id = ? OR team_id IS NULL)';
    params.push(filters.team_id);
  }

  if (filters.status && filters.status !== 'all') {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.topic) {
    sql += ' AND topic LIKE ?';
    params.push(`%${filters.topic}%`);
  }

  if (filters.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  return rows.map(formatMemoryRow);
}

export function deleteMemory(id) {
  const db = getDb();
  const mem = getMemoryById(id);
  if (!mem) return false;

  db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  logAudit('DELETE', id, `Deleted memory "${mem.decision}"`);
  return true;
}

export function clearAllMemories() {
  const db = getDb();
  db.exec('DELETE FROM memories;');
  db.exec('DELETE FROM audit_log;');
}

export function clearAllConversations() {
  const db = getDb();
  db.exec('DELETE FROM conversations;');
}

export function wipeAllData() {
  const db = getDb();
  db.exec('DELETE FROM memories;');
  db.exec('DELETE FROM conversations;');
  db.exec('DELETE FROM code_tasks;');
  db.exec('DELETE FROM audit_log;');
}

export function clearChannelMessages(channel) {
  const db = getDb();
  db.prepare('DELETE FROM conversations WHERE channel = ?').run(channel);
}

// Conversation Operations
export function insertConversationMessage(msg) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO conversations (
      id, channel, sender, sender_role, text, timestamp,
      memories_extracted, is_assistant, inspection_data, team_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    msg.id,
    msg.channel,
    msg.sender,
    msg.sender_role || 'team',
    msg.text,
    msg.timestamp || new Date().toISOString(),
    JSON.stringify(msg.memories_extracted || []),
    msg.is_assistant ? 1 : 0,
    msg.inspection_data ? JSON.stringify(msg.inspection_data) : null,
    msg.team_id || 'team_engineering'
  );

  return msg;
}

export function getChannelMessages(channel, teamId = 'team_engineering') {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM conversations WHERE channel = ? AND (team_id = ? OR team_id IS NULL) ORDER BY timestamp ASC').all(channel, teamId);
  return rows.map(row => ({
    ...row,
    memories_extracted: JSON.parse(row.memories_extracted || '[]'),
    inspection_data: row.inspection_data ? JSON.parse(row.inspection_data) : null,
    is_assistant: Boolean(row.is_assistant)
  }));
}

// ----------------------------------------------------
// Team & User Workspace Operations
// ----------------------------------------------------
export function createTeam(name, description = '') {
  const db = getDb();
  const id = `team_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO teams (id, name, description, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, name, description, new Date().toISOString());
  return getTeamById(id);
}

export function getAllTeams() {
  const db = getDb();
  return db.prepare('SELECT * FROM teams ORDER BY created_at ASC').all();
}

export function getTeamById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id) || null;
}

export function createUser(teamId, name, role = 'Developer') {
  const db = getDb();
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const avatar = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  db.prepare(`
    INSERT INTO users (id, team_id, name, role, avatar, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, teamId, name, role, avatar, new Date().toISOString());
  return getUserById(id);
}

export function getUsersByTeam(teamId) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE team_id = ? ORDER BY created_at ASC').all(teamId);
}

export function getUserById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

// Channels
export function getChannels() {
  const db = getDb();
  return db.prepare('SELECT * FROM channels').all();
}

// Audit Log
export function logAudit(action, memory_id, details) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (action, memory_id, details, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(action, memory_id, details, new Date().toISOString());
}

export function getAuditLogs(memory_id = null) {
  const db = getDb();
  if (memory_id) {
    return db.prepare('SELECT * FROM audit_log WHERE memory_id = ? ORDER BY timestamp DESC').all(memory_id);
  }
  return db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100').all();
}

// Settings
export function getSetting(key, defaultValue = null) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value) {
  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function formatMemoryRow(row) {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    vector: row.vector ? JSON.parse(row.vector) : []
  };
}

// ----------------------------------------------------
// Collaborative Coding & Prompt Deduplication Operations
// ----------------------------------------------------
export function insertCodeTask(task) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO code_tasks (
      id, candidate_id, candidate_role, prompt, intent_summary,
      target_files, status, tokens_estimated, tokens_saved,
      matched_task_id, similarity_score, created_at, completed_at,
      result_code, vector, team_id
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  stmt.run(
    task.id,
    task.candidate_id,
    task.candidate_role || 'Developer',
    task.prompt,
    task.intent_summary || 'Custom Task',
    JSON.stringify(task.target_files || []),
    task.status || 'in_progress',
    task.tokens_estimated || 3500,
    task.tokens_saved || 0,
    task.matched_task_id || null,
    task.similarity_score || 0.0,
    task.created_at || new Date().toISOString(),
    task.completed_at || null,
    task.result_code || '',
    typeof task.vector === 'string' ? task.vector : JSON.stringify(task.vector || []),
    task.team_id || 'team_engineering'
  );

  return getCodeTaskById(task.id);
}

export function updateCodeTask(id, fields) {
  const db = getDb();
  const current = getCodeTaskById(id);
  if (!current) return null;

  const updated = {
    ...current,
    ...fields
  };

  const stmt = db.prepare(`
    UPDATE code_tasks SET
      candidate_id = ?,
      candidate_role = ?,
      prompt = ?,
      intent_summary = ?,
      target_files = ?,
      status = ?,
      tokens_estimated = ?,
      tokens_saved = ?,
      matched_task_id = ?,
      similarity_score = ?,
      completed_at = ?,
      result_code = ?,
      vector = ?
    WHERE id = ?
  `);

  stmt.run(
    updated.candidate_id,
    updated.candidate_role,
    updated.prompt,
    updated.intent_summary,
    typeof updated.target_files === 'string' ? updated.target_files : JSON.stringify(updated.target_files || []),
    updated.status,
    updated.tokens_estimated,
    updated.tokens_saved,
    updated.matched_task_id || null,
    updated.similarity_score,
    updated.completed_at || null,
    updated.result_code || '',
    typeof updated.vector === 'string' ? updated.vector : JSON.stringify(updated.vector || []),
    id
  );

  return getCodeTaskById(id);
}

export function getCodeTaskById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM code_tasks WHERE id = ?').get(id);
  if (!row) return null;
  return formatCodeTaskRow(row);
}

export function getAllCodeTasks(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM code_tasks WHERE 1=1';
  const params = [];

  if (filters.team_id) {
    sql += ' AND (team_id = ? OR team_id IS NULL)';
    params.push(filters.team_id);
  }

  if (filters.candidate_id) {
    sql += ' AND candidate_id = ?';
    params.push(filters.candidate_id);
  }

  if (filters.status && filters.status !== 'all') {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  return rows.map(formatCodeTaskRow);
}

export function deleteCodeTask(id) {
  const db = getDb();
  db.prepare('DELETE FROM code_tasks WHERE id = ?').run(id);
  return true;
}

export function clearAllCodeTasks() {
  const db = getDb();
  db.exec('DELETE FROM code_tasks;');
}

export function getCodingStats(teamId = null) {
  const db = getDb();
  let sql = 'SELECT * FROM code_tasks WHERE 1=1';
  const params = [];
  if (teamId) {
    sql += ' AND (team_id = ? OR team_id IS NULL)';
    params.push(teamId);
  }
  const tasks = db.prepare(sql).all(...params);
  
  let totalTokensUsed = 0;
  let totalTokensSaved = 0;
  let collisionsPrevented = 0;
  let activeClaims = 0;

  for (const t of tasks) {
    totalTokensSaved += (t.tokens_saved || 0);
    if (t.status === 'in_progress') {
      activeClaims++;
      totalTokensUsed += (t.tokens_estimated || 0);
    } else if (t.status === 'completed') {
      totalTokensUsed += (t.tokens_estimated || 0);
    } else if (t.status === 'deduplicated') {
      collisionsPrevented++;
    }
  }

  return {
    totalTasks: tasks.length,
    activeClaims,
    collisionsPrevented,
    totalTokensSaved,
    totalTokensUsed,
    estimatedCostSaved: (totalTokensSaved / 1000 * 0.02).toFixed(3) // ~$0.02 per 1k tokens
  };
}

function formatCodeTaskRow(row) {
  return {
    ...row,
    target_files: JSON.parse(row.target_files || '[]'),
    vector: row.vector ? JSON.parse(row.vector) : []
  };
}
