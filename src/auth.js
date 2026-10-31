import crypto from 'node:crypto';
import { getDb } from './db-mongo.js';

// In-memory fallback and mirror registry
const usersByEmail = new Map();
const usersById = new Map();
const workspacesById = new Map();
const sessionsByToken = new Map();

/**
 * Hash password with cryptographic salt and PBKDF2
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored salt:hash
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * Register a new user and create their team workspace in MongoDB
 */
export async function registerUser({ email, password, name, role, teamName }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();
  const cleanTeamName = (teamName || '').trim() || `${cleanName}'s Team`;
  const cleanRole = (role || '').trim() || 'Software Engineer';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (!cleanName) {
    throw new Error('Full name is required.');
  }

  const db = getDb();

  // 1. Check if user already exists in MongoDB or local store
  if (db) {
    try {
      const existing = await db.collection('users').findOne({ email: cleanEmail });
      if (existing) {
        throw new Error('An account with this email already exists. Please sign in.');
      }
    } catch (e) {
      if (e.message.includes('already exists')) throw e;
    }
  } else {
    if (usersByEmail.has(cleanEmail)) {
      throw new Error('An account with this email already exists. Please sign in.');
    }
  }

  // 2. Resolve or create workspace in MongoDB
  const teamId = 'ws_' + cleanTeamName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
  let team = null;

  if (db) {
    try {
      team = await db.collection('workspaces').findOne({ id: teamId });
      if (!team) {
        team = {
          _id: teamId,
          id: teamId,
          name: cleanTeamName,
          description: `${cleanTeamName} Team Workspace`,
          createdAt: new Date().toISOString()
        };
        await db.collection('workspaces').insertOne(team);
      }
    } catch (_) {}
  }

  if (!team) {
    team = workspacesById.get(teamId) || {
      id: teamId,
      name: cleanTeamName,
      description: `${cleanTeamName} Team Workspace`,
      createdAt: new Date().toISOString()
    };
    workspacesById.set(team.id, team);
  }

  // 3. Create user in MongoDB
  const initials = cleanName.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const userId = 'u_' + crypto.randomBytes(6).toString('hex');
  const passwordHash = hashPassword(password);

  const user = {
    id: userId,
    email: cleanEmail,
    name: cleanName,
    role: cleanRole,
    workspaceId: team.id,
    teamName: team.name,
    avatar: initials,
    createdAt: new Date().toISOString()
  };

  if (db) {
    try {
      await db.collection('users').insertOne({
        _id: userId,
        ...user,
        passwordHash
      });
    } catch (_) {}
  }

  // Mirror into local state
  usersByEmail.set(cleanEmail, { ...user, passwordHash });
  usersById.set(userId, user);

  // 4. Issue session token and persist to MongoDB sessions
  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  const sessionDoc = {
    _id: token,
    token,
    userId: user.id,
    email: cleanEmail,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000)
  };

  if (db) {
    try {
      await db.collection('sessions').insertOne(sessionDoc);
    } catch (_) {}
  }
  sessionsByToken.set(token, sessionDoc);

  return { user, team, token };
}

/**
 * Authenticate existing user by email & password from MongoDB
 */
export async function loginUser({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const db = getDb();
  let record = null;

  if (db) {
    try {
      record = await db.collection('users').findOne({ email: cleanEmail });
    } catch (_) {}
  }

  if (!record) {
    record = usersByEmail.get(cleanEmail);
  }

  if (!record) {
    throw new Error('Invalid email or password.');
  }

  const isValid = verifyPassword(password, record.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  let team = null;
  if (db) {
    try {
      team = await db.collection('workspaces').findOne({ id: record.workspaceId });
    } catch (_) {}
  }

  if (!team) {
    team = workspacesById.get(record.workspaceId) || {
      id: record.workspaceId,
      name: record.teamName || 'Workspace',
      description: 'Engineering Workspace'
    };
  }

  const { passwordHash, _id, ...user } = record;

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  const sessionDoc = {
    _id: token,
    token,
    userId: user.id,
    email: user.email,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000)
  };

  if (db) {
    try {
      await db.collection('sessions').insertOne(sessionDoc);
    } catch (_) {}
  }
  sessionsByToken.set(token, sessionDoc);

  return { user, team, token };
}

/**
 * Validate token and return active user & team from MongoDB
 */
export async function getUserByToken(token) {
  if (!token) return null;
  const db = getDb();

  let session = null;
  if (db) {
    try {
      session = await db.collection('sessions').findOne({ token });
    } catch (_) {}
  }
  if (!session) {
    session = sessionsByToken.get(token);
  }
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    if (db) {
      try { await db.collection('sessions').deleteOne({ token }); } catch (_) {}
    }
    sessionsByToken.delete(token);
    return null;
  }

  let user = null;
  if (db) {
    try {
      user = await db.collection('users').findOne({ _id: session.userId });
    } catch (_) {}
  }
  if (!user) {
    user = usersById.get(session.userId);
  }
  if (!user) return null;

  let team = null;
  if (db) {
    try {
      team = await db.collection('workspaces').findOne({ id: user.workspaceId });
    } catch (_) {}
  }
  if (!team) {
    team = workspacesById.get(user.workspaceId);
  }

  const { passwordHash, _id, ...cleanUser } = user;
  return { user: cleanUser, team };
}

/**
 * End session in MongoDB
 */
export async function logoutUser(token) {
  if (!token) return true;
  const db = getDb();
  if (db) {
    try {
      await db.collection('sessions').deleteOne({ token });
    } catch (_) {}
  }
  sessionsByToken.delete(token);
  return true;
}

/**
 * Returns all workspaces from MongoDB
 */
export async function getAllAuthWorkspaces() {
  const db = getDb();
  if (db) {
    try {
      const list = await db.collection('workspaces').find({}).toArray();
      if (list && list.length > 0) return list;
    } catch (_) {}
  }
  return Array.from(workspacesById.values());
}

/**
 * Returns all users for a workspace from MongoDB
 */
export async function getUsersByWorkspace(workspaceId) {
  const db = getDb();
  if (db) {
    try {
      const query = workspaceId ? { workspaceId } : {};
      const list = await db.collection('users').find(query, { projection: { passwordHash: 0 } }).toArray();
      if (list && list.length > 0) return list;
    } catch (_) {}
  }
  const all = Array.from(usersById.values());
  if (!workspaceId) return all;
  return all.filter(u => u.workspaceId === workspaceId);
}
