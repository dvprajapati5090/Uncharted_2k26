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

  // Initialize default channels if not exists
  const channelCount = db.prepare('SELECT count(*) as count FROM channels').get().count;
  if (channelCount === 0) {
    const insertChannel = db.prepare('INSERT INTO channels (id, name, description) VALUES (?, ?, ?)');
    insertChannel.run('architecture', '#architecture', 'Technical design and stack decisions');
    insertChannel.run('sprint-planning', '#sprint-planning', 'Sprint priorities, deadlines, and assumptions');
    insertChannel.run('ask-assistant', '#ask-assistant', 'Query team memory across sessions');
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
      confidence, source_message, channel, tags, vector
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
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
    typeof memory.vector === 'string' ? memory.vector : JSON.stringify(memory.vector || [])
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
      memories_extracted, is_assistant, inspection_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    msg.inspection_data ? JSON.stringify(msg.inspection_data) : null
  );

  return msg;
}

export function getChannelMessages(channel) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM conversations WHERE channel = ? ORDER BY timestamp ASC').all(channel);
  return rows.map(row => ({
    ...row,
    memories_extracted: JSON.parse(row.memories_extracted || '[]'),
    inspection_data: row.inspection_data ? JSON.parse(row.inspection_data) : null,
    is_assistant: Boolean(row.is_assistant)
  }));
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
