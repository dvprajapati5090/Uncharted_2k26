// SynapseMem — Team Memory Assistant & Chatbot
// State Management
let currentTeam = null;
let currentUser = null;
let currentChannel = 'architecture';
let channels = [];
let memories = [];
let teamMembers = [];
let allTeams = [];
let activeInspectData = null;
let ledgerFilter = 'all';
let currentSimulatedTime = '2026-10-30T10:00:00.000Z';
let currentCollisionMatch = null;

// DOM Elements
const authModalEl = document.getElementById('auth-modal');
const authTeamSelectEl = document.getElementById('auth-team-select');
const authUserSelectEl = document.getElementById('auth-user-select');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authNewTeamBtn = document.getElementById('auth-new-team-btn');
const authNewUserBtn = document.getElementById('auth-new-user-btn');

// Header Profile & Team Elements
const headerTeamNameEl = document.getElementById('header-team-name');
const headerUserNameEl = document.getElementById('header-user-name');
const headerUserRoleEl = document.getElementById('header-user-role');
const headerUserAvatarEl = document.getElementById('header-user-avatar');
const teamDropdownBtn = document.getElementById('team-dropdown-btn');
const teamDropdownMenu = document.getElementById('team-dropdown-menu');
const teamMenuListEl = document.getElementById('team-menu-list');
const userDropdownBtn = document.getElementById('user-dropdown-btn');
const userDropdownMenu = document.getElementById('user-dropdown-menu');
const userMenuListEl = document.getElementById('user-menu-list');
const moreOptionsBtn = document.getElementById('more-options-btn');
const moreOptionsMenu = document.getElementById('more-options-menu');

// Views & Navigation Tabs
const tabChatBtn = document.getElementById('tab-chat-btn');
const tabLedgerBtn = document.getElementById('tab-ledger-btn');
const tabCodingBtn = document.getElementById('tab-coding-btn');
const viewChatEl = document.getElementById('view-chat');
const viewLedgerEl = document.getElementById('view-ledger');
const viewCodingEl = document.getElementById('view-coding');
const memoryCountBadgeEl = document.getElementById('memory-count-badge');
const statActiveCountEl = document.getElementById('stat-active-count');

// Chat Elements
const channelListEl = document.getElementById('channel-list');
const messagesContainerEl = document.getElementById('messages-container');
const chatFormEl = document.getElementById('chat-form');
const chatInputEl = document.getElementById('chat-input');
const activeChannelNameEl = document.getElementById('active-channel-name');
const activeChannelIconEl = document.getElementById('active-channel-icon');
const activeChannelDescEl = document.getElementById('active-channel-desc');
const channelModeHintEl = document.getElementById('channel-mode-hint');

// Inspect Drawer Elements
const inspectPanelEl = document.getElementById('inspect-panel');
const inspectEmptyEl = document.getElementById('inspect-empty');
const inspectDetailsEl = document.getElementById('inspect-details');
const inspectQueryTextEl = document.getElementById('inspect-query-text');
const inspectIntentBadgeEl = document.getElementById('inspect-intent-badge');
const inspectTimestampEl = document.getElementById('inspect-timestamp');
const inspectFiltersListEl = document.getElementById('inspect-filters-list');
const inspectSelectedListEl = document.getElementById('inspect-selected-list');
const inspectSelectedCountEl = document.getElementById('inspect-selected-count');
const inspectRejectedListEl = document.getElementById('inspect-rejected-list');
const inspectRejectedCountEl = document.getElementById('inspect-rejected-count');
const inspectPromptRawEl = document.getElementById('inspect-prompt-raw');
const toggleInspectBtn = document.getElementById('toggle-inspect-drawer-btn');
const closeInspectBtn = document.getElementById('close-inspect-btn');

// Memory Ledger Elements
const memoriesGridEl = document.getElementById('memories-grid');
const memoryModalEl = document.getElementById('memory-modal');
const memoryFormEl = document.getElementById('memory-form');
const modalTitleEl = document.getElementById('modal-title');
const btnAddMemoryManual = document.getElementById('btn-add-memory-manual');

// Coding Guard Elements
const codingTokensSavedEl = document.getElementById('coding-tokens-saved');
const codingCollisionsPreventedEl = document.getElementById('coding-collisions-prevented');
const codingPromptInputEl = document.getElementById('coding-prompt-input');
const btnCheckCollisionEl = document.getElementById('btn-check-collision');
const btnClaimTaskEl = document.getElementById('btn-claim-task');
const collisionRadarCardEl = document.getElementById('collision-radar-card');
const radarStatusBadgeEl = document.getElementById('radar-status-badge');
const radarMessageEl = document.getElementById('radar-message');
const radarRecommendationEl = document.getElementById('radar-recommendation');
const radarSimilarityPctEl = document.getElementById('radar-similarity-pct');
const radarSimilarityBarEl = document.getElementById('radar-similarity-bar');
const radarActionButtonsEl = document.getElementById('radar-action-buttons');
const btnAdoptTaskEl = document.getElementById('btn-adopt-task');
const codingTasksListEl = document.getElementById('coding-tasks-list');
const codeViewerTitleEl = document.getElementById('code-viewer-title');
const codeViewerAuthorEl = document.getElementById('code-viewer-author');
const codeViewerContentEl = document.getElementById('code-viewer-content');

// Helper: Refresh Lucide Icons
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// Helper: Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colors = {
    info: 'bg-indigo-900/90 border-indigo-700 text-indigo-100',
    success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100',
    warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
    error: 'bg-rose-900/90 border-rose-700 text-rose-100'
  };

  toast.className = `toast max-w-sm px-3.5 py-2 rounded-lg border shadow-xl flex items-center space-x-2 text-xs ${colors[type] || colors.info}`;
  toast.innerHTML = `<span class="font-medium">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// ----------------------------------------------------
// 1. Team & User Authentication Flow
// ----------------------------------------------------
async function checkAuth() {
  const savedTeam = localStorage.getItem('synapse_team');
  const savedUser = localStorage.getItem('synapse_user');

  if (savedTeam && savedUser) {
    try {
      currentTeam = JSON.parse(savedTeam);
      currentUser = JSON.parse(savedUser);
      updateHeaderProfile();
      await initializeWorkspace();
      return;
    } catch (e) {
      localStorage.removeItem('synapse_team');
      localStorage.removeItem('synapse_user');
    }
  }

  // Open Auth Modal if no valid session
  await openAuthModal();
}

async function openAuthModal() {
  authModalEl.classList.remove('hidden');
  await loadTeamsForAuth();
}

async function loadTeamsForAuth() {
  try {
    const res = await fetch('/api/teams');
    allTeams = await res.json();
    authTeamSelectEl.innerHTML = '';

    allTeams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      authTeamSelectEl.appendChild(opt);
    });

    if (allTeams.length > 0) {
      await loadUsersForTeam(allTeams[0].id);
    }
  } catch (err) {
    console.error('Failed to load teams', err);
  }
}

async function loadUsersForTeam(teamId) {
  try {
    const res = await fetch(`/api/teams/${teamId}/users`);
    teamMembers = await res.json();
    authUserSelectEl.innerHTML = '';

    teamMembers.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.name} (${u.role})`;
      authUserSelectEl.appendChild(opt);
    });

    if (teamMembers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No members yet — click + to add yourself';
      authUserSelectEl.appendChild(opt);
    }
  } catch (err) {
    console.error('Failed to load team users', err);
  }
}

authTeamSelectEl.addEventListener('change', (e) => {
  loadUsersForTeam(e.target.value);
});

authSubmitBtn.addEventListener('click', async () => {
  const teamId = authTeamSelectEl.value;
  const userId = authUserSelectEl.value;

  if (!teamId) {
    showToast('Please select or create a team', 'warning');
    return;
  }

  if (!userId) {
    showToast('Please select or add a member profile', 'warning');
    return;
  }

  const team = allTeams.find(t => t.id === teamId);
  const user = teamMembers.find(u => u.id === userId);

  if (team && user) {
    currentTeam = team;
    currentUser = user;
    localStorage.setItem('synapse_team', JSON.stringify(team));
    localStorage.setItem('synapse_user', JSON.stringify(user));
    authModalEl.classList.add('hidden');
    updateHeaderProfile();
    showToast(`Logged in as ${user.name} on ${team.name}`, 'success');
    await initializeWorkspace();
  }
});

function updateHeaderProfile() {
  if (currentTeam) {
    headerTeamNameEl.textContent = currentTeam.name;
  }
  if (currentUser) {
    headerUserNameEl.textContent = currentUser.name;
    headerUserRoleEl.textContent = currentUser.role;
    headerUserAvatarEl.textContent = currentUser.avatar || currentUser.name.charAt(0);
  }
}

// ----------------------------------------------------
// 2. Dropdowns & Switchers
// ----------------------------------------------------
teamDropdownBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  teamDropdownMenu.classList.toggle('hidden');
  userDropdownMenu.classList.add('hidden');
  moreOptionsMenu.classList.add('hidden');

  if (!teamDropdownMenu.classList.contains('hidden')) {
    const res = await fetch('/api/teams');
    allTeams = await res.json();
    teamMenuListEl.innerHTML = '';
    allTeams.forEach(t => {
      const isCurrent = currentTeam && currentTeam.id === t.id;
      const btn = document.createElement('button');
      btn.className = `w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition ${
        isCurrent ? 'bg-indigo-950/80 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
      }`;
      btn.innerHTML = `
        <span class="truncate">${escapeHtml(t.name)}</span>
        ${isCurrent ? '<i data-lucide="check" class="w-3.5 h-3.5 text-indigo-400"></i>' : ''}
      `;
      btn.onclick = async () => {
        currentTeam = t;
        localStorage.setItem('synapse_team', JSON.stringify(t));
        teamDropdownMenu.classList.add('hidden');
        updateHeaderProfile();
        showToast(`Switched to team workspace: ${t.name}`, 'info');
        await initializeWorkspace();
      };
      teamMenuListEl.appendChild(btn);
    });
    refreshIcons();
  }
});

userDropdownBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  userDropdownMenu.classList.toggle('hidden');
  teamDropdownMenu.classList.add('hidden');
  moreOptionsMenu.classList.add('hidden');

  if (!userDropdownMenu.classList.contains('hidden') && currentTeam) {
    const res = await fetch(`/api/teams/${currentTeam.id}/users`);
    teamMembers = await res.json();
    userMenuListEl.innerHTML = '';
    teamMembers.forEach(u => {
      const isCurrent = currentUser && currentUser.id === u.id;
      const btn = document.createElement('button');
      btn.className = `w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition ${
        isCurrent ? 'bg-indigo-950/80 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
      }`;
      btn.innerHTML = `
        <div class="truncate">
          <span class="font-medium text-slate-200 block">${escapeHtml(u.name)}</span>
          <span class="text-[10px] text-slate-400 block">${escapeHtml(u.role)}</span>
        </div>
        ${isCurrent ? '<i data-lucide="check" class="w-3.5 h-3.5 text-indigo-400"></i>' : ''}
      `;
      btn.onclick = () => {
        currentUser = u;
        localStorage.setItem('synapse_user', JSON.stringify(u));
        userDropdownMenu.classList.add('hidden');
        updateHeaderProfile();
        showToast(`Active member: ${u.name}`, 'info');
      };
      userMenuListEl.appendChild(btn);
    });
    refreshIcons();
  }
});

moreOptionsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  moreOptionsMenu.classList.toggle('hidden');
  teamDropdownMenu.classList.add('hidden');
  userDropdownMenu.classList.add('hidden');
});

// Close dropdowns on outside click
document.addEventListener('click', () => {
  teamDropdownMenu.classList.add('hidden');
  userDropdownMenu.classList.add('hidden');
  moreOptionsMenu.classList.add('hidden');
});

// Logout / Switch Workspace
document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('synapse_user');
  userDropdownMenu.classList.add('hidden');
  openAuthModal();
});

// Create Team Modal
const createTeamModal = document.getElementById('create-team-modal');
document.getElementById('btn-create-team-modal').onclick = () => {
  createTeamModal.classList.remove('hidden');
  teamDropdownMenu.classList.add('hidden');
};
authNewTeamBtn.onclick = () => createTeamModal.classList.remove('hidden');
document.getElementById('close-create-team-btn').onclick = () => createTeamModal.classList.add('hidden');
document.getElementById('cancel-create-team-btn').onclick = () => createTeamModal.classList.add('hidden');

document.getElementById('create-team-form').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-team-name').value.trim();
  const desc = document.getElementById('new-team-desc').value.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc })
    });
    const newTeam = await res.json();
    createTeamModal.classList.add('hidden');
    document.getElementById('new-team-name').value = '';
    document.getElementById('new-team-desc').value = '';

    currentTeam = newTeam;
    localStorage.setItem('synapse_team', JSON.stringify(newTeam));
    updateHeaderProfile();
    showToast(`Created team "${newTeam.name}"`, 'success');
    await loadTeamsForAuth();
    await initializeWorkspace();
  } catch (err) {
    showToast('Failed to create team', 'error');
  }
};

// Create User Modal
const createUserModal = document.getElementById('create-user-modal');
document.getElementById('btn-add-user-modal').onclick = () => {
  createUserModal.classList.remove('hidden');
  userDropdownMenu.classList.add('hidden');
};
authNewUserBtn.onclick = () => createUserModal.classList.remove('hidden');
document.getElementById('close-create-user-btn').onclick = () => createUserModal.classList.add('hidden');
document.getElementById('cancel-create-user-btn').onclick = () => createUserModal.classList.add('hidden');

document.getElementById('create-user-form').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-user-name').value.trim();
  const role = document.getElementById('new-user-role').value.trim();
  const teamId = currentTeam ? currentTeam.id : authTeamSelectEl.value;

  if (!name || !teamId) return;

  try {
    const res = await fetch(`/api/teams/${teamId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role })
    });
    const newUser = await res.json();
    createUserModal.classList.add('hidden');
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-role').value = '';

    currentUser = newUser;
    localStorage.setItem('synapse_user', JSON.stringify(newUser));
    updateHeaderProfile();
    showToast(`Added member ${newUser.name}`, 'success');
    await loadUsersForTeam(teamId);
  } catch (err) {
    showToast('Failed to add user', 'error');
  }
};

// ----------------------------------------------------
// 3. Workspace Initialization & Channels
// ----------------------------------------------------
async function initializeWorkspace() {
  await loadChannels();
  await loadMemories();
  await loadMessages();
  await loadCodingStats();
  await loadCodingTasks();
}

async function loadChannels() {
  try {
    const res = await fetch('/api/channels');
    channels = await res.json();
    renderChannelList();
  } catch (err) {
    console.error('Failed to load channels', err);
  }
}

function renderChannelList() {
  channelListEl.innerHTML = '';

  // Add standard channels
  channels.forEach(ch => {
    const isActive = ch.id === currentChannel;
    const isBot = ch.id === 'ask-assistant';
    const item = document.createElement('button');
    item.className = `w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition ${
      isActive
        ? 'bg-indigo-950/80 text-white font-semibold border border-indigo-700/50'
        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
    }`;

    item.innerHTML = `
      <div class="flex items-center space-x-2 truncate">
        <span class="${isActive ? 'text-indigo-400 font-bold' : 'text-slate-500'}">
          ${isBot ? '🤖' : '#'}
        </span>
        <span class="truncate">${isBot ? 'Memory Chatbot' : ch.id}</span>
      </div>
      ${isBot ? '<span class="text-[9px] bg-indigo-900/80 text-indigo-300 px-1.5 py-0.2 rounded font-bold uppercase">AI</span>' : ''}
    `;
    item.onclick = () => switchChannel(ch.id);
    channelListEl.appendChild(item);
  });

  refreshIcons();
}

function switchChannel(channelId) {
  currentChannel = channelId;
  const isBot = channelId === 'ask-assistant';

  activeChannelIconEl.textContent = isBot ? '🤖' : '#';
  activeChannelNameEl.textContent = isBot ? 'Memory Chatbot' : channelId;

  if (isBot) {
    activeChannelDescEl.textContent = 'Answers questions strictly from stored team decisions, not chat logs.';
    channelModeHintEl.textContent = 'Ask any question to the memory assistant';
    chatInputEl.placeholder = 'Ask the chatbot (e.g. "What database are we using and why?", "When is the demo?")...';
  } else {
    activeChannelDescEl.textContent = channelId === 'architecture' ? 'Technical design & stack choices' : 'Sprint priorities & deadlines';
    channelModeHintEl.textContent = 'Decisions are automatically extracted & stored';
    chatInputEl.placeholder = 'Share a decision (e.g. "We’re using Postgres because...") or chat with team...';
  }

  renderChannelList();
  loadMessages();
}

// ----------------------------------------------------
// 4. Chat Messages & AI Chatbot Interaction
// ----------------------------------------------------
async function loadMessages() {
  if (!currentTeam) return;
  try {
    const res = await fetch(`/api/channels/${currentChannel}/messages?teamId=${currentTeam.id}`);
    const messages = await res.json();
    renderMessages(messages);
  } catch (err) {
    console.error('Failed to load messages', err);
  }
}

function renderMessages(messages) {
  messagesContainerEl.innerHTML = '';

  if (messages.length === 0) {
    const isBot = currentChannel === 'ask-assistant';
    messagesContainerEl.innerHTML = `
      <div class="text-center py-16 text-slate-500 space-y-2">
        <i data-lucide="${isBot ? 'bot' : 'message-square'}" class="w-8 h-8 mx-auto text-slate-600"></i>
        <p class="text-xs font-semibold text-slate-400">
          ${isBot ? 'Start a conversation with the Memory Chatbot' : `No messages in #${currentChannel} yet.`}
        </p>
        <p class="text-[11px] text-slate-500 max-w-sm mx-auto">
          ${isBot ? 'Ask about any architectural decision, tech stack choice, or deadline recorded by your team.' : 'Share team decisions or agreements. The assistant will automatically remember them!'}
        </p>
      </div>
    `;
    refreshIcons();
    return;
  }

  messages.forEach(msg => {
    const isAssistant = msg.is_assistant;
    const msgEl = document.createElement('div');
    msgEl.className = `flex flex-col space-y-1 ${isAssistant ? 'bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-xl' : 'p-2'}`;

    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msgEl.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
          isAssistant ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'
        }">
          ${isAssistant ? '🤖' : msg.sender.charAt(0)}
        </div>
        <span class="text-xs font-bold ${isAssistant ? 'text-indigo-300' : 'text-slate-200'}">${escapeHtml(msg.sender)}</span>
        <span class="text-[10px] text-slate-500">${timeStr}</span>
        ${isAssistant ? '<span class="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">Memory-Grounded</span>' : ''}
      </div>

      <div class="text-xs text-slate-200 pl-8 leading-relaxed">
        ${escapeHtml(msg.text)}
      </div>
    `;

    // Extracted Memory Chip for user messages
    if (!isAssistant && msg.memories_extracted && msg.memories_extracted.length > 0) {
      const chipContainer = document.createElement('div');
      chipContainer.className = 'pl-8 pt-1 flex items-center gap-2';

      msg.memories_extracted.forEach(memId => {
        const mem = memories.find(m => m.id === memId);
        const memTopic = mem ? mem.topic : 'Decision';

        const chip = document.createElement('div');
        chip.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 shadow-sm memory-pulse-card cursor-pointer hover:bg-emerald-900/60 transition';
        chip.innerHTML = `
          <i data-lucide="brain" class="w-3 h-3 text-emerald-400"></i>
          <span>Memory Saved: <strong>${escapeHtml(memTopic)}</strong></span>
        `;
        chip.onclick = () => switchToLedger();
        chipContainer.appendChild(chip);
      });

      msgEl.appendChild(chipContainer);
    }

    // Inspect Button for Assistant replies
    if (isAssistant && msg.inspection_data) {
      const inspectFooter = document.createElement('div');
      inspectFooter.className = 'pl-8 pt-1 flex items-center justify-between';

      const inspectBtn = document.createElement('button');
      const score = msg.inspection_data.retrieved_memories && msg.inspection_data.retrieved_memories[0]
        ? Math.round(msg.inspection_data.retrieved_memories[0].score * 100)
        : null;

      inspectBtn.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 transition';
      inspectBtn.innerHTML = `
        <i data-lucide="scan-eye" class="w-3 h-3 text-indigo-400"></i>
        <span>Inspect Retrieval</span>
        ${score ? `<span class="px-1 rounded bg-indigo-950 text-emerald-400 font-mono text-[9px] border border-emerald-900">${score}% Match</span>` : ''}
      `;
      inspectBtn.onclick = () => showInspection(msg.inspection_data);
      inspectFooter.appendChild(inspectBtn);

      msgEl.appendChild(inspectFooter);
    }

    messagesContainerEl.appendChild(msgEl);
  });

  messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight;
  refreshIcons();
}

chatFormEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInputEl.value.trim();
  const sender = currentUser ? currentUser.name : 'Team Member';
  const teamId = currentTeam ? currentTeam.id : 'team_engineering';

  if (!text) return;

  chatInputEl.value = '';

  try {
    const res = await fetch(`/api/channels/${currentChannel}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sender, teamId })
    });

    const data = await res.json();

    if (data.extractedMemory) {
      showToast(`🧠 Stored Decision: "${data.extractedMemory.topic}"`, 'success');
      if (data.supersededMemory) {
        showToast(`🔄 Superseded: "${data.supersededMemory.decision}"`, 'warning');
      }
      loadMemories();
    }

    if (data.assistantMessage && data.assistantMessage.inspection_data) {
      showInspection(data.assistantMessage.inspection_data);
    }

    loadMessages();
  } catch (err) {
    showToast('Failed to send message', 'error');
  }
});

// ----------------------------------------------------
// 5. The Inspect Drawer (Explains Itself)
// ----------------------------------------------------
function showInspection(inspection) {
  if (!inspection) return;
  activeInspectData = inspection;

  inspectEmptyEl.classList.add('hidden');
  inspectDetailsEl.classList.remove('hidden');
  inspectPanelEl.classList.remove('hidden');

  inspectQueryTextEl.textContent = `"${inspection.query}"`;
  inspectIntentBadgeEl.textContent = inspection.is_asking_history ? 'Historical Recall' : 'Active State';
  inspectTimestampEl.textContent = new Date(inspection.evaluated_at).toLocaleTimeString();

  inspectFiltersListEl.innerHTML = '';
  inspection.active_filters.forEach(f => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800 text-[10px]';
    item.innerHTML = `
      <span class="text-slate-400">${f.name}: <span class="text-indigo-300 font-mono">${escapeHtml(f.rule)}</span></span>
      <span class="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">${f.status}</span>
    `;
    inspectFiltersListEl.appendChild(item);
  });

  inspectSelectedListEl.innerHTML = '';
  const selected = inspection.retrieved_memories || [];
  inspectSelectedCountEl.textContent = selected.length;

  if (selected.length === 0) {
    inspectSelectedListEl.innerHTML = '<div class="text-slate-500 italic p-2">None matched active filters.</div>';
  } else {
    selected.forEach(m => {
      const card = document.createElement('div');
      const scorePct = Math.round(m.score * 100);
      card.className = 'p-2.5 rounded-lg bg-slate-950 border border-emerald-900/60 space-y-1.5';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold text-white">${escapeHtml(m.topic)}: ${escapeHtml(m.decision)}</span>
          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">USED</span>
        </div>
        ${m.reason ? `<div class="text-[10px] text-slate-300">Why: ${escapeHtml(m.reason)}</div>` : ''}
        <div class="space-y-1 pt-1">
          <div class="flex items-center justify-between text-[10px] text-slate-400">
            <span>Similarity:</span>
            <span class="font-mono text-emerald-400 font-bold">${scorePct}% Match</span>
          </div>
          <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full" style="width: ${scorePct}%"></div>
          </div>
        </div>
      `;
      inspectSelectedListEl.appendChild(card);
    });
  }

  inspectRejectedListEl.innerHTML = '';
  const rejected = inspection.rejected_memories || [];
  inspectRejectedCountEl.textContent = rejected.length;

  if (rejected.length === 0) {
    inspectRejectedListEl.innerHTML = '<div class="text-slate-500 italic p-2">No memories rejected.</div>';
  } else {
    rejected.forEach(m => {
      const card = document.createElement('div');
      card.className = 'p-2 rounded-lg bg-slate-950 border border-amber-900/40 space-y-1 opacity-90';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-semibold text-slate-300">${escapeHtml(m.topic)}: ${escapeHtml(m.decision)}</span>
          <span class="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-400 uppercase">${m.status}</span>
        </div>
        <div class="text-[10px] text-rose-300 font-mono">
          Reason: ${escapeHtml(m.rejection_reason || 'Inactive')}
        </div>
      `;
      inspectRejectedListEl.appendChild(card);
    });
  }

  inspectPromptRawEl.textContent = JSON.stringify(inspection.prompt_payload, null, 2);
  refreshIcons();
}

toggleInspectBtn.onclick = () => inspectPanelEl.classList.toggle('hidden');
closeInspectBtn.onclick = () => inspectPanelEl.classList.add('hidden');

// ----------------------------------------------------
// 6. View Tabs Switcher (Chat vs Ledger vs Coding)
// ----------------------------------------------------
function switchToChat() {
  viewChatEl.classList.remove('hidden');
  viewLedgerEl.classList.add('hidden');
  viewCodingEl.classList.add('hidden');
  tabChatBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-white bg-indigo-600 flex items-center gap-1.5 transition shadow-sm';
  tabLedgerBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition';
  tabCodingBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition';
}

function switchToLedger() {
  viewChatEl.classList.add('hidden');
  viewLedgerEl.classList.remove('hidden');
  viewCodingEl.classList.add('hidden');
  tabLedgerBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-white bg-indigo-600 flex items-center gap-1.5 transition shadow-sm';
  tabChatBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition';
  tabCodingBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition';
  loadMemories();
}

function switchToCoding() {
  viewChatEl.classList.add('hidden');
  viewLedgerEl.classList.add('hidden');
  viewCodingEl.classList.remove('hidden');
  tabCodingBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-white bg-emerald-600 flex items-center gap-1.5 transition shadow-sm';
  tabChatBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition';
  tabLedgerBtn.className = 'px-3.5 py-1 rounded-md font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition';
  loadCodingStats();
  loadCodingTasks();
}

tabChatBtn.onclick = switchToChat;
tabLedgerBtn.onclick = switchToLedger;
tabCodingBtn.onclick = switchToCoding;

// ----------------------------------------------------
// 7. Structured Memory Ledger Operations
// ----------------------------------------------------
async function loadMemories() {
  if (!currentTeam) return;
  try {
    const res = await fetch(`/api/memories?status=${ledgerFilter}&teamId=${currentTeam.id}`);
    memories = await res.json();
    renderMemoriesGrid();
    updateStats();
  } catch (err) {
    console.error('Failed to load memories', err);
  }
}

function updateStats() {
  const active = memories.filter(m => m.status === 'active').length;
  statActiveCountEl.textContent = `${active} Active`;
  memoryCountBadgeEl.textContent = memories.length;
}

function renderMemoriesGrid() {
  memoriesGridEl.innerHTML = '';

  if (memories.length === 0) {
    memoriesGridEl.innerHTML = `
      <div class="col-span-full text-center py-16 text-slate-500">
        <i data-lucide="database" class="w-8 h-8 mx-auto text-slate-600 mb-2"></i>
        <p class="text-xs font-semibold text-slate-400">No decisions recorded in ${currentTeam?.name || 'this team'}.</p>
        <p class="text-[11px] text-slate-500 mt-1">Post a decision in chat or click "+ Add Decision".</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  memories.forEach(mem => {
    const card = document.createElement('div');
    card.className = `memory-card bg-slate-900 border rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 ${
      mem.status === 'active'
        ? 'border-emerald-800/40 shadow-emerald-950/20'
        : mem.status === 'superseded'
        ? 'border-amber-800/40 shadow-amber-950/20'
        : 'border-slate-800 opacity-80'
    }`;

    const statusBadges = {
      active: '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">ACTIVE</span>',
      superseded: '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">SUPERSEDED</span>',
      expired: '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">EXPIRED</span>'
    };

    let lineageText = '';
    if (mem.superseded_by) {
      lineageText = `<div class="text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
        <i data-lucide="arrow-right" class="w-3 h-3"></i> Superseded by newer decision
      </div>`;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-bold text-xs text-white">${escapeHtml(mem.topic)}</span>
          ${statusBadges[mem.status] || ''}
        </div>
        <p class="text-xs font-semibold text-slate-100 mb-1">${escapeHtml(mem.decision)}</p>
        ${mem.reason ? `<div class="text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80"><span class="text-slate-500 font-medium">Why:</span> ${escapeHtml(mem.reason)}</div>` : ''}
        ${lineageText}
      </div>
      <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Owner: <strong>${escapeHtml(mem.owner || 'Team')}</strong></span>
        <div class="flex items-center space-x-1">
          <button class="btn-edit-memory p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200" title="Edit decision"><i data-lucide="edit-2" class="w-3 h-3"></i></button>
          <button class="btn-delete-memory p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400" title="Delete decision"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
        </div>
      </div>
    `;

    card.querySelector('.btn-edit-memory').onclick = () => openEditMemoryModal(mem);
    card.querySelector('.btn-delete-memory').onclick = () => confirmDeleteMemory(mem.id);
    memoriesGridEl.appendChild(card);
  });

  refreshIcons();
}

document.querySelectorAll('.ledger-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ledger-filter-btn').forEach(b => {
      b.className = 'ledger-filter-btn px-2.5 py-1 rounded-md font-medium text-slate-400 hover:text-slate-200';
    });
    btn.className = 'ledger-filter-btn px-2.5 py-1 rounded-md font-medium text-white bg-indigo-600';
    ledgerFilter = btn.getAttribute('data-filter');
    loadMemories();
  });
});

function openAddMemoryModal() {
  modalTitleEl.innerHTML = '<i data-lucide="plus-circle" class="w-4 h-4 text-emerald-400"></i> Add Decision';
  document.getElementById('form-memory-id').value = '';
  document.getElementById('form-topic').value = '';
  document.getElementById('form-decision').value = '';
  document.getElementById('form-reason').value = '';
  document.getElementById('form-owner').value = currentUser ? currentUser.name : 'Team';
  document.getElementById('form-status').value = 'active';
  memoryModalEl.classList.remove('hidden');
  refreshIcons();
}

function openEditMemoryModal(mem) {
  modalTitleEl.innerHTML = '<i data-lucide="edit-3" class="w-4 h-4 text-indigo-400"></i> Edit Decision';
  document.getElementById('form-memory-id').value = mem.id;
  document.getElementById('form-topic').value = mem.topic;
  document.getElementById('form-decision').value = mem.decision;
  document.getElementById('form-reason').value = mem.reason || '';
  document.getElementById('form-owner').value = mem.owner || 'Team';
  document.getElementById('form-status').value = mem.status || 'active';
  memoryModalEl.classList.remove('hidden');
  refreshIcons();
}

btnAddMemoryManual.onclick = openAddMemoryModal;
document.getElementById('modal-close-btn').onclick = () => memoryModalEl.classList.add('hidden');
document.getElementById('modal-cancel-btn').onclick = () => memoryModalEl.classList.add('hidden');

memoryFormEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('form-memory-id').value;
  const topic = document.getElementById('form-topic').value.trim();
  const decision = document.getElementById('form-decision').value.trim();
  const reason = document.getElementById('form-reason').value.trim();
  const owner = document.getElementById('form-owner').value.trim();
  const status = document.getElementById('form-status').value;
  const teamId = currentTeam ? currentTeam.id : 'team_engineering';

  const payload = { topic, decision, reason, owner, status, teamId };

  try {
    if (id) {
      await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Decision updated', 'success');
    } else {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Decision recorded', 'success');
    }
    memoryModalEl.classList.add('hidden');
    loadMemories();
  } catch (err) {
    showToast('Failed to save decision', 'error');
  }
});

async function confirmDeleteMemory(id) {
  if (!confirm('Delete this decision record?')) return;
  try {
    await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    showToast('Decision deleted', 'warning');
    loadMemories();
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
}

// ----------------------------------------------------
// 8. Collaborative Coding & Token Guard
// ----------------------------------------------------
async function loadCodingStats() {
  if (!currentTeam) return;
  try {
    const res = await fetch(`/api/coding/stats?teamId=${currentTeam.id}`);
    const stats = await res.json();
    codingTokensSavedEl.textContent = stats.totalTokensSaved.toLocaleString();
    codingCollisionsPreventedEl.textContent = stats.collisionsPrevented;
  } catch (err) {
    console.error('Failed to load coding stats', err);
  }
}

async function loadCodingTasks() {
  if (!currentTeam) return;
  try {
    const res = await fetch(`/api/coding/tasks?teamId=${currentTeam.id}`);
    const tasks = await res.json();
    renderCodingTasks(tasks);
  } catch (err) {
    console.error('Failed to load coding tasks', err);
  }
}

function renderCodingTasks(tasks) {
  codingTasksListEl.innerHTML = '';
  if (!tasks || tasks.length === 0) {
    codingTasksListEl.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-xs">
        <i data-lucide="inbox" class="w-6 h-6 mx-auto mb-1 text-slate-600"></i>
        No active coding tasks claimed yet in ${currentTeam?.name || 'team'}.
      </div>
    `;
    refreshIcons();
    return;
  }

  tasks.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = `p-2.5 rounded-xl border bg-slate-950 cursor-pointer transition hover:border-emerald-600/50 space-y-1 ${
      t.status === 'in_progress' ? 'border-amber-800/60' : t.status === 'deduplicated' ? 'border-indigo-800/60' : 'border-slate-800'
    }`;

    card.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-white">${escapeHtml(t.candidate_id)}</span>
        <span class="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
          t.status === 'in_progress' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
        }">${t.status}</span>
      </div>
      <div class="text-[11px] font-semibold text-slate-300 truncate">${escapeHtml(t.intent_summary)}</div>
      <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
        <span>Files: <span class="text-emerald-400">${(t.target_files || []).join(', ')}</span></span>
        ${t.tokens_saved > 0 ? `<span class="text-emerald-400 font-bold">+${t.tokens_saved} Saved</span>` : ''}
      </div>
    `;

    card.onclick = () => viewTaskCode(t);
    codingTasksListEl.appendChild(card);
    if (idx === 0) viewTaskCode(t);
  });

  refreshIcons();
}

function viewTaskCode(task) {
  codeViewerTitleEl.textContent = task.intent_summary;
  codeViewerAuthorEl.textContent = `Author: ${task.candidate_id}`;
  codeViewerContentEl.textContent = task.result_code || '// Code generated/adopted';
}

btnCheckCollisionEl.onclick = async () => {
  const prompt = codingPromptInputEl.value.trim();
  const candidateId = currentUser ? currentUser.name : 'Candidate';
  const teamId = currentTeam ? currentTeam.id : 'team_engineering';

  if (!prompt) {
    showToast('Enter a prompt to check', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/coding/check-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, candidateId, teamId })
    });
    const analysis = await res.json();
    currentCollisionMatch = analysis;

    collisionRadarCardEl.classList.remove('hidden');

    if (analysis.status === 'HIGH_COLLISION') {
      radarStatusBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800';
      radarStatusBadgeEl.textContent = 'HIGH COLLISION DETECTED';
      radarActionButtonsEl.classList.remove('hidden');
      btnAdoptTaskEl.textContent = `Adopt ${analysis.matchedTask.candidate_id}'s Work (Save ~${analysis.estimatedSavings} Tokens)`;
    } else {
      radarStatusBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800';
      radarStatusBadgeEl.textContent = 'UNIQUE NOVEL TASK';
      radarActionButtonsEl.classList.add('hidden');
    }

    radarMessageEl.textContent = analysis.message;
    radarRecommendationEl.textContent = analysis.recommendation;
    radarSimilarityPctEl.textContent = `${Math.round(analysis.highestSimilarity * 100)}% Match`;
    radarSimilarityBarEl.style.width = `${Math.round(analysis.highestSimilarity * 100)}%`;
  } catch (err) {
    showToast('Failed to check collision', 'error');
  }
};

btnClaimTaskEl.onclick = async () => {
  const prompt = codingPromptInputEl.value.trim();
  const candidateId = currentUser ? currentUser.name : 'Candidate';
  const teamId = currentTeam ? currentTeam.id : 'team_engineering';

  if (!prompt) return;

  try {
    const res = await fetch('/api/coding/claim-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, candidateId, teamId, status: 'in_progress' })
    });
    const data = await res.json();
    showToast(`Claimed task for ${candidateId}`, 'success');
    codingPromptInputEl.value = '';
    collisionRadarCardEl.classList.add('hidden');
    loadCodingStats();
    loadCodingTasks();
    if (data.task) viewTaskCode(data.task);
  } catch (err) {
    showToast('Failed to claim task', 'error');
  }
};

btnAdoptTaskEl.onclick = async () => {
  if (!currentCollisionMatch || !currentCollisionMatch.matchedTask) return;
  const candidateId = currentUser ? currentUser.name : 'Candidate';
  const existingTaskId = currentCollisionMatch.matchedTask.id;
  const currentPrompt = codingPromptInputEl.value.trim();
  const teamId = currentTeam ? currentTeam.id : 'team_engineering';

  try {
    const res = await fetch('/api/coding/adopt-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, existingTaskId, currentPrompt, teamId })
    });
    const data = await res.json();
    showToast(data.message, 'success');
    codingPromptInputEl.value = '';
    collisionRadarCardEl.classList.add('hidden');
    loadCodingStats();
    loadCodingTasks();
    if (data.adoptedTask) viewTaskCode(data.adoptedTask);
  } catch (err) {
    showToast('Failed to adopt task', 'error');
  }
};

// ----------------------------------------------------
// 9. Time Machine Modal & Wipe All Data
// ----------------------------------------------------
const timeMachineModal = document.getElementById('time-machine-modal');
document.getElementById('btn-open-time-machine').onclick = () => {
  timeMachineModal.classList.remove('hidden');
  moreOptionsMenu.classList.add('hidden');
};
document.getElementById('close-time-machine-btn').onclick = () => timeMachineModal.classList.add('hidden');

async function setTime(isoString) {
  try {
    await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isoString })
    });
    showToast(`Simulated time updated!`, 'info');
    timeMachineModal.classList.add('hidden');
    loadMemories();
  } catch (err) {
    console.error('Time update failed', err);
  }
}

document.getElementById('time-today-btn').onclick = () => setTime('2026-10-30T10:00:00.000Z');
document.getElementById('time-nextweek-btn').onclick = () => setTime('2026-11-06T19:00:00.000Z');

// Clear All Data
document.getElementById('btn-seed-reset').onclick = async () => {
  moreOptionsMenu.classList.add('hidden');
  if (!confirm('Wipe all data and start completely fresh from scratch?')) return;
  try {
    await fetch('/api/wipe', { method: 'POST' });
    showToast('All data cleared. Clean slate ready.', 'success');
    await initializeWorkspace();
  } catch (err) {
    showToast('Failed to clear data', 'error');
  }
};

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ----------------------------------------------------
// 10. Application Boot
// ----------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
});
