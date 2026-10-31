import crypto from 'node:crypto';

// In-memory user & credential registry
const usersByEmail = new Map();
const usersById = new Map();
const workspacesById = new Map();
const sessionsByToken = new Map();

/**
 * Hash password with PBKDF2
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
 * Register a new user and create their team workspace
 */
export function registerUser({ email, password, name, role, teamName }) {
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
  if (usersByEmail.has(cleanEmail)) {
    throw new Error('An account with this email already exists. Please sign in.');
  }

  // 1. Resolve or create workspace
  let teamId = 'ws_' + cleanTeamName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
  let team = workspacesById.get(teamId);
  if (!team) {
    team = {
      id: teamId,
      name: cleanTeamName,
      description: `${cleanTeamName} Engineering Workspace`,
      createdAt: new Date().toISOString()
    };
    workspacesById.set(team.id, team);
  }

  // 2. Create user record
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

  usersByEmail.set(cleanEmail, { ...user, passwordHash });
  usersById.set(userId, user);

  // 3. Issue session token
  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  sessionsByToken.set(token, { userId, email: cleanEmail, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });

  return { user, team, token };
}

/**
 * Authenticate existing user by email & password
 */
export function loginUser({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const record = usersByEmail.get(cleanEmail);
  if (!record) {
    throw new Error('Invalid email or password.');
  }

  const isValid = verifyPassword(password, record.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  const team = workspacesById.get(record.workspaceId) || {
    id: record.workspaceId,
    name: record.teamName || 'Workspace',
    description: 'Engineering Workspace'
  };

  const { passwordHash, ...user } = record;

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  sessionsByToken.set(token, { userId: user.id, email: user.email, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });

  return { user, team, token };
}

/**
 * Validate token and return active user & team
 */
export function getUserByToken(token) {
  if (!token) return null;
  const session = sessionsByToken.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) sessionsByToken.delete(token);
    return null;
  }
  const user = usersById.get(session.userId);
  if (!user) return null;
  const team = workspacesById.get(user.workspaceId);
  return { user, team };
}

/**
 * End session
 */
export function logoutUser(token) {
  if (token) {
    sessionsByToken.delete(token);
  }
  return true;
}

/**
 * Returns all workspaces
 */
export function getAllAuthWorkspaces() {
  return Array.from(workspacesById.values());
}

/**
 * Returns all users for a workspace
 */
export function getUsersByWorkspace(workspaceId) {
  const all = Array.from(usersById.values());
  if (!workspaceId) return all;
  return all.filter(u => u.workspaceId === workspaceId);
}

// Pre-register demo accounts for 1-click test buttons
try {
  registerUser({
    email: 'lead@demo.com',
    password: 'password123',
    name: 'Sarah Jenkins',
    role: 'Tech Lead',
    teamName: 'Apollo Engineering'
  });
  registerUser({
    email: 'cand.a@demo.com',
    password: 'password123',
    name: 'Candidate A',
    role: 'Sprint Developer',
    teamName: 'Alpha Hackathon Sprint'
  });
  registerUser({
    email: 'cand.b@demo.com',
    password: 'password123',
    name: 'Candidate B',
    role: 'Backend Engineer',
    teamName: 'Alpha Hackathon Sprint'
  });
} catch (_) {}
