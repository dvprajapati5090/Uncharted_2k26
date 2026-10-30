// Frontend Application Logic for SynapseMem
let currentChannel = 'architecture';
let channels = [];
let memories = [];
let activeInspectData = null;
let currentSimulatedTime = '2026-10-30T10:00:00.000Z';
let ledgerFilter = 'all';

// DOM Elements
const channelListEl = document.getElementById('channel-list');
const messagesContainerEl = document.getElementById('messages-container');
const chatFormEl = document.getElementById('chat-form');
const chatInputEl = document.getElementById('chat-input');
const senderSelectEl = document.getElementById('sender-select');
const activeChannelNameEl = document.getElementById('active-channel-name');
const activeChannelDescEl = document.getElementById('active-channel-desc');
const currentSimTimeEl = document.getElementById('current-sim-time-display');

// Inspect Panel Elements
const inspectPanelEl = document.getElementById('inspect-panel');
const inspectEmptyEl = document.getElementById('inspect-empty');
const inspectDetailsEl = document.getElementById('inspect-details');
const inspectQueryTextEl = document.getElementById('inspect-query-text');
const inspectTimestampEl = document.getElementById('inspect-timestamp');
const inspectIntentBadgeEl = document.getElementById('inspect-intent-badge');
const inspectFiltersListEl = document.getElementById('inspect-filters-list');
const inspectSelectedListEl = document.getElementById('inspect-selected-list');
const inspectSelectedCountEl = document.getElementById('inspect-selected-count');
const inspectRejectedListEl = document.getElementById('inspect-rejected-list');
const inspectRejectedCountEl = document.getElementById('inspect-rejected-count');
const inspectPromptRawEl = document.getElementById('inspect-prompt-raw');

// Views & Ledger Elements
const viewChatEl = document.getElementById('view-chat');
const viewLedgerEl = document.getElementById('view-ledger');
const viewCodingEl = document.getElementById('view-coding');
const tabChatBtn = document.getElementById('tab-chat-btn');
const tabLedgerBtn = document.getElementById('tab-ledger-btn');
const tabCodingBtn = document.getElementById('tab-coding-btn');
const memoriesGridEl = document.getElementById('memories-grid');
const memoryCountBadgeEl = document.getElementById('memory-count-badge');
const statActiveCountEl = document.getElementById('stat-active-count');
const statSupersededCountEl = document.getElementById('stat-superseded-count');
const statExpiredCountEl = document.getElementById('stat-expired-count');

// Team Coding Guard Elements
const codingTokensSavedEl = document.getElementById('coding-tokens-saved');
const codingCollisionsPreventedEl = document.getElementById('coding-collisions-prevented');
const codingActiveClaimsEl = document.getElementById('coding-active-claims');
const tokensSavedNavBadgeEl = document.getElementById('tokens-saved-nav-badge');
const codingPromptInputEl = document.getElementById('coding-prompt-input');
const codingCandidateSelectEl = document.getElementById('coding-candidate-select');
const btnCheckCollisionEl = document.getElementById('btn-check-collision');
const btnClaimTaskEl = document.getElementById('btn-claim-task');
const collisionRadarCardEl = document.getElementById('collision-radar-card');
const radarStatusBadgeEl = document.getElementById('radar-status-badge');
const radarMessageEl = document.getElementById('radar-message');
const radarRecommendationEl = document.getElementById('radar-recommendation');
const radarSimilarityPctEl = document.getElementById('radar-similarity-pct');
const radarSimilarityBarEl = document.getElementById('radar-similarity-bar');
const radarFilesOverlapEl = document.getElementById('radar-files-overlap');
const radarActionButtonsEl = document.getElementById('radar-action-buttons');
const btnAdoptTaskEl = document.getElementById('btn-adopt-task');
const codingTasksListEl = document.getElementById('coding-tasks-list');
const codeViewerTitleEl = document.getElementById('code-viewer-title');
const codeViewerAuthorEl = document.getElementById('code-viewer-author');
const codeViewerContentEl = document.getElementById('code-viewer-content');

let currentCollisionMatch = null;

// Modal Elements
const memoryModalEl = document.getElementById('memory-modal');
const memoryFormEl = document.getElementById('memory-form');
const modalTitleEl = document.getElementById('modal-title');

// Initialize Lucide icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ----------------------------------------------------
// Toast Notifications
// ----------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colors = {
    info: 'bg-indigo-900/90 border-indigo-700 text-indigo-100',
    success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100',
    warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
    error: 'bg-rose-900/90 border-rose-700 text-rose-100'
  };

  toast.className = `toast max-w-sm px-3.5 py-2.5 rounded-lg border shadow-xl flex items-center space-x-2.5 text-xs ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span class="font-medium">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

// ----------------------------------------------------
// Data Fetching
// ----------------------------------------------------
async function loadChannels() {
  try {
    const res = await fetch('/api/channels');
    channels = await res.json();
    renderChannelList();
  } catch (err) {
    console.error('Failed to load channels', err);
  }
}

async function loadMessages() {
  try {
    const res = await fetch(`/api/channels/${currentChannel}/messages`);
    const messages = await res.json();
    renderMessages(messages);
  } catch (err) {
    console.error('Failed to load messages', err);
  }
}

async function loadMemories() {
  try {
    const res = await fetch(`/api/memories?status=${ledgerFilter}`);
    memories = await res.json();
    renderMemoriesGrid();
    updateStats();
  } catch (err) {
    console.error('Failed to load memories', err);
  }
}

async function loadSimulatedTime() {
  try {
    const res = await fetch('/api/time');
    const data = await res.json();
    currentSimulatedTime = data.simulatedTime;
    const d = new Date(currentSimulatedTime);
    currentSimTimeEl.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (err) {
    console.error('Failed to load simulated time', err);
  }
}

function updateStats() {
  const active = memories.filter(m => m.status === 'active').length;
  const superseded = memories.filter(m => m.status === 'superseded').length;
  const expired = memories.filter(m => m.status === 'expired').length;

  statActiveCountEl.textContent = active;
  statSupersededCountEl.textContent = superseded;
  statExpiredCountEl.textContent = expired;
  memoryCountBadgeEl.textContent = memories.length;
}

// ----------------------------------------------------
// Rendering
// ----------------------------------------------------
function renderChannelList() {
  channelListEl.innerHTML = '';
  channels.forEach(ch => {
    const isActive = ch.id === currentChannel;
    const item = document.createElement('button');
    item.className = `w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-xs transition ${
      isActive
        ? 'bg-indigo-950/80 text-white font-semibold border border-indigo-700/50'
        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
    }`;
    item.innerHTML = `
      <div class="flex items-center space-x-2 truncate">
        <span class="${isActive ? 'text-indigo-400 font-bold' : 'text-slate-500'}">#</span>
        <span class="truncate">${ch.id}</span>
      </div>
      ${ch.id === 'ask-assistant' ? '<span class="text-[9px] bg-indigo-900 text-indigo-300 px-1.5 py-0.2 rounded font-bold">RECALL</span>' : ''}
    `;
    item.onclick = () => switchChannel(ch.id);
    channelListEl.appendChild(item);
  });
  refreshIcons();
}

function switchChannel(channelId) {
  currentChannel = channelId;
  const ch = channels.find(c => c.id === channelId) || { name: `#${channelId}`, description: '' };
  activeChannelNameEl.textContent = ch.id;
  activeChannelDescEl.textContent = ch.description;

  const hintEl = document.getElementById('channel-mode-hint');
  if (channelId === 'ask-assistant') {
    hintEl.textContent = '💡 Ask anything: answers come from verified memory, NOT chat history';
    chatInputEl.placeholder = 'Ask a question (e.g. "What database are we using and why?", "When is the demo?")...';
  } else {
    hintEl.textContent = '💡 Share team decisions to store memories, or ask questions to recall';
    chatInputEl.placeholder = 'Share a decision (e.g. "We’re using Postgres because...") or chat with team...';
  }

  renderChannelList();
  loadMessages();
}

function renderMessages(messages) {
  messagesContainerEl.innerHTML = '';

  if (messages.length === 0) {
    messagesContainerEl.innerHTML = `
      <div class="text-center py-16 text-slate-500 space-y-2">
        <i data-lucide="message-square-dashed" class="w-8 h-8 mx-auto text-slate-600"></i>
        <p class="text-sm font-medium">No messages in #${currentChannel} yet.</p>
        <p class="text-xs text-slate-500">Send a message or test one of the quick scenario buttons above!</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  messages.forEach(msg => {
    const isAssistant = msg.is_assistant;
    const msgEl = document.createElement('div');
    msgEl.className = `flex flex-col space-y-1 ${isAssistant ? 'bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-xl' : 'p-2'}`;

    // Sender Header
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msgEl.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
          isAssistant ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'
        }">
          ${isAssistant ? '🤖' : msg.sender.charAt(0)}
        </div>
        <span class="text-xs font-bold ${isAssistant ? 'text-indigo-300' : 'text-slate-200'}">${msg.sender}</span>
        <span class="text-[10px] text-slate-500">${timeStr}</span>
        ${isAssistant ? '<span class="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">Memory-Grounded</span>' : ''}
      </div>

      <!-- Message Text -->
      <div class="text-xs text-slate-200 pl-8 leading-relaxed">
        ${escapeHtml(msg.text)}
      </div>
    `;

    // 1. Extracted Memory Chip (for team messages that contained a decision)
    if (!isAssistant && msg.memories_extracted && msg.memories_extracted.length > 0) {
      const chipContainer = document.createElement('div');
      chipContainer.className = 'pl-8 pt-1 flex items-center gap-2';

      msg.memories_extracted.forEach(memId => {
        const mem = memories.find(m => m.id === memId);
        const memTopic = mem ? mem.topic : 'Decision';
        const memDecision = mem ? mem.decision : 'New Structured Memory';

        const chip = document.createElement('div');
        chip.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 shadow-sm memory-pulse-card cursor-pointer hover:bg-emerald-900/60 transition';
        chip.innerHTML = `
          <i data-lucide="brain" class="w-3.5 h-3.5 text-emerald-400"></i>
          <span>Memory Extracted: <strong>${escapeHtml(memTopic)}</strong></span>
          <span class="text-emerald-400/80 text-[10px] ml-1">View</span>
        `;
        chip.onclick = () => openMemoryInLedger(memId);
        chipContainer.appendChild(chip);
      });

      msgEl.appendChild(chipContainer);
    }

    // 2. Inspect Button (for Assistant replies)
    if (isAssistant && msg.inspection_data) {
      const inspectFooter = document.createElement('div');
      inspectFooter.className = 'pl-8 pt-2 flex items-center justify-between';

      const inspectBtn = document.createElement('button');
      const score = msg.inspection_data.retrieved_memories && msg.inspection_data.retrieved_memories[0]
        ? Math.round(msg.inspection_data.retrieved_memories[0].score * 100)
        : null;

      inspectBtn.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 transition shadow-sm';
      inspectBtn.innerHTML = `
        <i data-lucide="scan-eye" class="w-3.5 h-3.5 text-indigo-400"></i>
        <span>Inspect Retrieval</span>
        ${score ? `<span class="px-1.5 py-0.2 rounded bg-indigo-950 text-emerald-400 font-mono text-[10px] border border-emerald-900">${score}% Match</span>` : ''}
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

function renderMemoriesGrid() {
  memoriesGridEl.innerHTML = '';

  if (memories.length === 0) {
    memoriesGridEl.innerHTML = `
      <div class="col-span-full text-center py-16 text-slate-500">
        <i data-lucide="database" class="w-8 h-8 mx-auto text-slate-600 mb-2"></i>
        <p class="text-sm font-medium">No memories found for filter "${ledgerFilter}".</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  memories.forEach(mem => {
    const card = document.createElement('div');
    card.className = `memory-card bg-slate-950 border rounded-xl p-3.5 flex flex-col justify-between space-y-3 ${
      mem.status === 'active'
        ? 'border-emerald-800/50 shadow-emerald-950/20'
        : mem.status === 'superseded'
        ? 'border-amber-800/50 shadow-amber-950/20'
        : 'border-slate-800 shadow-slate-950/20 opacity-80'
    }`;

    // Status Badges
    const statusBadges = {
      active: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">ACTIVE</span>',
      superseded: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">SUPERSEDED</span>',
      expired: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">EXPIRED</span>'
    };

    const typeBadges = {
      decision: '<span class="text-[10px] text-indigo-400 font-medium">Decision</span>',
      assumption: '<span class="text-[10px] text-cyan-400 font-medium">Assumption</span>',
      deadline: '<span class="text-[10px] text-rose-400 font-medium">Deadline</span>'
    };

    let lineageText = '';
    if (mem.superseded_by) {
      lineageText = `<div class="text-[10px] text-amber-400/90 font-medium flex items-center gap-1 mt-1">
        <i data-lucide="arrow-right" class="w-3 h-3"></i> Superseded by newer decision
      </div>`;
    } else if (mem.supersedes_id) {
      lineageText = `<div class="text-[10px] text-emerald-400/90 font-medium flex items-center gap-1 mt-1">
        <i data-lucide="git-branch" class="w-3 h-3"></i> Replaced older decision
      </div>`;
    }

    let expiryText = '';
    if (mem.valid_until) {
      const expDate = new Date(mem.valid_until);
      const isPast = new Date(currentSimulatedTime) > expDate;
      expiryText = `<div class="text-[10px] ${isPast ? 'text-rose-400 line-through' : 'text-slate-400'} flex items-center gap-1 mt-0.5">
        <i data-lucide="clock" class="w-3 h-3"></i> Valid until: ${expDate.toLocaleDateString()} ${expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>`;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-1.5">
            <span class="font-bold text-xs text-white">${escapeHtml(mem.topic)}</span>
            ${typeBadges[mem.type] || ''}
          </div>
          ${statusBadges[mem.status] || ''}
        </div>

        <p class="text-xs font-semibold text-slate-100 leading-snug mb-1">
          ${escapeHtml(mem.decision)}
        </p>

        ${mem.reason ? `
          <div class="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 mb-2">
            <span class="text-slate-500 font-medium">Why:</span> ${escapeHtml(mem.reason)}
          </div>
        ` : ''}

        ${lineageText}
        ${expiryText}
      </div>

      <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div>
          <span>Owner: <strong>${escapeHtml(mem.owner || 'Team')}</strong></span>
        </div>
        <div class="flex items-center space-x-1">
          <button class="btn-edit-memory px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300" title="Edit / Correct this memory">
            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
          </button>
          <button class="btn-delete-memory px-2 py-0.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400" title="Delete memory">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;

    // Bind Edit and Delete handlers
    card.querySelector('.btn-edit-memory').onclick = () => openEditMemoryModal(mem);
    card.querySelector('.btn-delete-memory').onclick = () => confirmDeleteMemory(mem.id);

    memoriesGridEl.appendChild(card);
  });

  refreshIcons();
}

function openMemoryInLedger(memId) {
  switchToLedger();
  setTimeout(() => {
    const card = Array.from(document.querySelectorAll('.memory-card')).find(el => el.textContent.includes(memId));
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('memory-pulse-card');
    }
  }, 100);
}

// ----------------------------------------------------
// The Inspect Panel (Explains Itself)
// ----------------------------------------------------
function showInspection(inspection) {
  if (!inspection) return;
  activeInspectData = inspection;

  // Reveal details, hide empty
  inspectEmptyEl.classList.add('hidden');
  inspectDetailsEl.classList.remove('hidden');

  // Open drawer if collapsed
  inspectPanelEl.classList.remove('hidden');

  // Query and Intent
  inspectQueryTextEl.textContent = `"${inspection.query}"`;
  inspectIntentBadgeEl.textContent = inspection.is_asking_history ? 'Historical Recall Intent' : 'Active State Intent';
  inspectTimestampEl.textContent = new Date(inspection.evaluated_at).toLocaleTimeString();

  // Filters Evaluated
  inspectFiltersListEl.innerHTML = '';
  inspection.active_filters.forEach(f => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800/80';
    item.innerHTML = `
      <span class="text-slate-400">${f.name}: <span class="text-indigo-300">${escapeHtml(f.rule)}</span></span>
      <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">${f.status}</span>
    `;
    inspectFiltersListEl.appendChild(item);
  });

  // Selected Memories
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
          <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">USED</span>
        </div>

        ${m.reason ? `<div class="text-[11px] text-slate-300">Why: ${escapeHtml(m.reason)}</div>` : ''}

        <!-- Similarity Metric Progress Bar -->
        <div class="space-y-1 pt-1">
          <div class="flex items-center justify-between text-[10px] text-slate-400">
            <span>Cosine Similarity: <strong>${m.denseSimilarity || m.score}</strong></span>
            <span class="font-mono text-emerald-400 font-bold">${scorePct}% Match</span>
          </div>
          <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div class="progress-bar-fill h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full" style="width: ${scorePct}%"></div>
          </div>
          <div class="flex items-center justify-between text-[9px] text-slate-500 font-mono">
            <span>BM25 Overlap: ${m.bm25Score || 0}</span>
            <span>Owner: ${escapeHtml(m.owner || 'Team')}</span>
          </div>
        </div>
      `;
      inspectSelectedListEl.appendChild(card);
    });
  }

  // Rejected / Superseded Memories
  inspectRejectedListEl.innerHTML = '';
  const rejected = inspection.rejected_memories || [];
  inspectRejectedCountEl.textContent = rejected.length;

  if (rejected.length === 0) {
    inspectRejectedListEl.innerHTML = '<div class="text-slate-500 italic p-2">No candidate memories were rejected.</div>';
  } else {
    rejected.forEach(m => {
      const card = document.createElement('div');
      card.className = 'p-2 rounded-lg bg-slate-950 border border-amber-900/40 space-y-1 opacity-90';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-semibold text-slate-300">${escapeHtml(m.topic)}: ${escapeHtml(m.decision)}</span>
          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-800 uppercase">${m.status}</span>
        </div>
        <div class="text-[10px] text-rose-300 font-mono">
          Filtered Out Reason: ${escapeHtml(m.rejection_reason || 'Did not pass active status filter')}
        </div>
      `;
      inspectRejectedListEl.appendChild(card);
    });
  }

  // Raw Prompt Payload
  inspectPromptRawEl.textContent = JSON.stringify(inspection.prompt_payload, null, 2);
  refreshIcons();
}

// ----------------------------------------------------
// Message Submission
// ----------------------------------------------------
chatFormEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInputEl.value.trim();
  const sender = senderSelectEl.value;

  if (!text) return;

  chatInputEl.value = '';

  try {
    const res = await fetch(`/api/channels/${currentChannel}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sender })
    });

    const data = await res.json();

    if (data.extractedMemory) {
      showToast(`🧠 Memory Stored: "${data.extractedMemory.topic}"`, 'success');
      if (data.supersededMemory) {
        showToast(`🔄 Superseded previous decision: "${data.supersededMemory.decision}"`, 'warning');
      }
      loadMemories();
    }

    if (data.assistantMessage && data.assistantMessage.inspection_data) {
      showInspection(data.assistantMessage.inspection_data);
    }

    loadMessages();
  } catch (err) {
    console.error('Failed to send message', err);
    showToast('Failed to send message', 'error');
  }
});

// Quick Prompt Buttons
document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    chatInputEl.value = btn.getAttribute('data-text');
    chatFormEl.dispatchEvent(new Event('submit'));
  });
});

// ----------------------------------------------------
// View Switching (Chat vs Ledger vs Coding Guard)
// ----------------------------------------------------
function switchToChat() {
  viewChatEl.classList.remove('hidden');
  viewLedgerEl.classList.add('hidden');
  viewCodingEl.classList.add('hidden');
  tabChatBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white flex items-center gap-1.5 shadow';
  tabLedgerBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5';
  tabCodingBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5';
}

function switchToLedger() {
  viewChatEl.classList.add('hidden');
  viewLedgerEl.classList.remove('hidden');
  viewCodingEl.classList.add('hidden');
  tabLedgerBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white flex items-center gap-1.5 shadow';
  tabChatBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5';
  tabCodingBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5';
  loadMemories();
}

function switchToCoding() {
  viewChatEl.classList.add('hidden');
  viewLedgerEl.classList.add('hidden');
  viewCodingEl.classList.remove('hidden');
  tabCodingBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white flex items-center gap-1.5 shadow';
  tabChatBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5';
  tabLedgerBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5';
  loadCodingStats();
  loadCodingTasks();
}

tabChatBtn.onclick = switchToChat;
tabLedgerBtn.onclick = switchToLedger;
tabCodingBtn.onclick = switchToCoding;

// ----------------------------------------------------
// Collaborative Coding & Prompt Collision Guard Logic
// ----------------------------------------------------
async function loadCodingStats() {
  try {
    const res = await fetch('/api/coding/stats');
    const stats = await res.json();
    codingTokensSavedEl.textContent = stats.totalTokensSaved.toLocaleString();
    codingCollisionsPreventedEl.textContent = stats.collisionsPrevented;
    codingActiveClaimsEl.textContent = stats.activeClaims;
    tokensSavedNavBadgeEl.textContent = `${stats.totalTokensSaved.toLocaleString()} Tokens Saved`;
  } catch (err) {
    console.error('Failed to load coding stats', err);
  }
}

async function loadCodingTasks() {
  try {
    const res = await fetch('/api/coding/tasks');
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
      <div class="text-center py-10 text-slate-500 text-xs">
        <i data-lucide="inbox" class="w-6 h-6 mx-auto mb-1 text-slate-600"></i>
        No active coding tasks claimed yet.
      </div>
    `;
    refreshIcons();
    return;
  }

  tasks.forEach((t, index) => {
    const card = document.createElement('div');
    const isFirst = index === 0;
    
    // Status badges
    const statusBadges = {
      in_progress: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">IN PROGRESS</span>',
      completed: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">COMPLETED</span>',
      deduplicated: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">DEDUPLICATED (SAVED)</span>'
    };

    card.className = `p-3 rounded-xl border bg-slate-950 cursor-pointer transition hover:border-emerald-600/50 space-y-1.5 ${
      t.status === 'in_progress' ? 'border-amber-800/60 shadow-amber-950/20' : t.status === 'deduplicated' ? 'border-indigo-800/60' : 'border-slate-800'
    }`;

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-[10px]">
            ${t.candidate_id.charAt(0)}
          </div>
          <span class="font-bold text-xs text-white">${escapeHtml(t.candidate_id)}</span>
          <span class="text-[10px] text-slate-400">(${escapeHtml(t.candidate_role)})</span>
        </div>
        ${statusBadges[t.status] || ''}
      </div>

      <div class="text-xs font-semibold text-slate-200">
        ${escapeHtml(t.intent_summary)}
      </div>

      <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
        <div>Files: <span class="text-emerald-400 font-semibold">${(t.target_files || []).join(', ') || 'src/'}</span></div>
        ${t.tokens_saved > 0 ? `<div class="text-emerald-400 font-bold">+${t.tokens_saved} Tokens Saved</div>` : `<div>${t.tokens_estimated} Tokens</div>`}
      </div>
    `;

    card.onclick = () => viewTaskCode(t);
    codingTasksListEl.appendChild(card);

    if (isFirst) {
      viewTaskCode(t);
    }
  });

  refreshIcons();
}

function viewTaskCode(task) {
  codeViewerTitleEl.innerHTML = `<i data-lucide="file-code" class="w-3.5 h-3.5 text-indigo-400"></i> ${escapeHtml(task.intent_summary)}`;
  codeViewerAuthorEl.textContent = `Author: ${task.candidate_id} (${task.status.toUpperCase()})`;
  codeViewerContentEl.textContent = task.result_code || '// No generated code recorded for this task';
  refreshIcons();
}

// Pre-Flight Collision Check
async function handleCheckCollision() {
  const prompt = codingPromptInputEl.value.trim();
  const candidateId = codingCandidateSelectEl.value;

  if (!prompt) {
    showToast('Please enter a prompt to evaluate', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/coding/check-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, candidateId })
    });

    const analysis = await res.json();
    currentCollisionMatch = analysis;

    // Reveal Radar Card
    collisionRadarCardEl.classList.remove('hidden');

    // Status Badges & Colors
    if (analysis.status === 'HIGH_COLLISION') {
      radarStatusBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800';
      radarStatusBadgeEl.textContent = 'HIGH COLLISION DETECTED';
      radarSimilarityBarEl.className = 'h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500';
      radarActionButtonsEl.classList.remove('hidden');
      btnAdoptTaskEl.textContent = `Adopt ${analysis.matchedTask.candidate_id}'s Work (Save ~${analysis.estimatedSavings} Tokens)`;
    } else if (analysis.status === 'SYNERGY_OVERLAP') {
      radarStatusBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800';
      radarStatusBadgeEl.textContent = 'SYNERGY OVERLAP';
      radarSimilarityBarEl.className = 'h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500';
      radarActionButtonsEl.classList.add('hidden');
    } else {
      radarStatusBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800';
      radarStatusBadgeEl.textContent = 'APPROVED NOVEL TASK';
      radarSimilarityBarEl.className = 'h-full bg-emerald-500 rounded-full transition-all duration-500';
      radarActionButtonsEl.classList.add('hidden');
    }

    radarMessageEl.textContent = analysis.message;
    radarRecommendationEl.textContent = analysis.recommendation;
    radarSimilarityPctEl.textContent = `${Math.round(analysis.highestSimilarity * 100)}% Match`;
    radarSimilarityBarEl.style.width = `${Math.round(analysis.highestSimilarity * 100)}%`;
    radarFilesOverlapEl.textContent = (analysis.proposedFiles || []).join(', ') || 'src/index.js';

    refreshIcons();
  } catch (err) {
    console.error('Failed to check collision', err);
    showToast('Failed to check collision', 'error');
  }
}

// Claim & Execute Task
async function handleClaimTask() {
  const prompt = codingPromptInputEl.value.trim();
  const candidateId = codingCandidateSelectEl.value;

  if (!prompt) {
    showToast('Please enter a prompt to claim', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/coding/claim-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, candidateId, candidateRole: 'Developer', status: 'in_progress' })
    });

    const data = await res.json();
    showToast(`Task Claimed! ${candidateId} allocated to work board.`, 'success');
    codingPromptInputEl.value = '';
    collisionRadarCardEl.classList.add('hidden');
    loadCodingStats();
    loadCodingTasks();
    if (data.task) viewTaskCode(data.task);
  } catch (err) {
    console.error('Failed to claim task', err);
    showToast('Failed to claim task', 'error');
  }
}

// Adopt Task (Zero Token Spend)
async function handleAdoptTask() {
  if (!currentCollisionMatch || !currentCollisionMatch.matchedTask) {
    showToast('No matched task to adopt', 'warning');
    return;
  }

  const candidateId = codingCandidateSelectEl.value;
  const existingTaskId = currentCollisionMatch.matchedTask.id;
  const currentPrompt = codingPromptInputEl.value.trim();

  try {
    const res = await fetch('/api/coding/adopt-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, existingTaskId, currentPrompt })
    });

    const data = await res.json();
    showToast(data.message, 'success');
    collisionRadarCardEl.classList.add('hidden');
    codingPromptInputEl.value = '';
    loadCodingStats();
    loadCodingTasks();
    if (data.adoptedTask) viewTaskCode(data.adoptedTask);
  } catch (err) {
    console.error('Failed to adopt task', err);
    showToast('Failed to adopt task', 'error');
  }
}

btnCheckCollisionEl.onclick = handleCheckCollision;
btnClaimTaskEl.onclick = handleClaimTask;
btnAdoptTaskEl.onclick = handleAdoptTask;

// Quick Prompt Fill in Coding Guard
document.querySelectorAll('.coding-quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    codingPromptInputEl.value = btn.getAttribute('data-prompt');
    handleCheckCollision();
  });
});

// Scenario Button: Candidate A & B Collision Demo
document.getElementById('btn-scenario-token-guard').onclick = async () => {
  switchToCoding();
  showToast('Starting Token Guard Demo: Seeding Candidate A on DB Pool...', 'info');

  try {
    await fetch('/api/coding/demo-collision', { method: 'POST' });
    await loadCodingStats();
    await loadCodingTasks();

    codingCandidateSelectEl.value = 'Candidate B';
    codingPromptInputEl.value = 'Implement postgres connection pool with retry mechanism and error handler in express';
    
    setTimeout(() => {
      handleCheckCollision();
      showToast('⚠️ Collision Intercepted: Candidate A is already building this! Zero tokens wasted.', 'warning');
    }, 600);
  } catch (err) {
    console.error('Demo collision failed', err);
  }
};

// Ledger Filters
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

// ----------------------------------------------------
// Modal & Memory CRUD
// ----------------------------------------------------
function openAddMemoryModal() {
  modalTitleEl.innerHTML = '<i data-lucide="plus-circle" class="w-4 h-4 text-emerald-400"></i> Add New Memory';
  document.getElementById('form-memory-id').value = '';
  document.getElementById('form-topic').value = '';
  document.getElementById('form-decision').value = '';
  document.getElementById('form-reason').value = '';
  document.getElementById('form-owner').value = 'Team';
  document.getElementById('form-status').value = 'active';
  document.getElementById('form-type').value = 'decision';
  document.getElementById('form-valid-until').value = '';
  memoryModalEl.classList.remove('hidden');
  refreshIcons();
}

function openEditMemoryModal(mem) {
  modalTitleEl.innerHTML = '<i data-lucide="edit-3" class="w-4 h-4 text-indigo-400"></i> Edit / Correct Memory';
  document.getElementById('form-memory-id').value = mem.id;
  document.getElementById('form-topic').value = mem.topic;
  document.getElementById('form-decision').value = mem.decision;
  document.getElementById('form-reason').value = mem.reason || '';
  document.getElementById('form-owner').value = mem.owner || 'Team';
  document.getElementById('form-status').value = mem.status || 'active';
  document.getElementById('form-type').value = mem.type || 'decision';
  document.getElementById('form-valid-until').value = mem.valid_until ? mem.valid_until.slice(0, 16) : '';
  memoryModalEl.classList.remove('hidden');
  refreshIcons();
}

function closeModal() {
  memoryModalEl.classList.add('hidden');
}

document.getElementById('btn-add-memory-manual').onclick = openAddMemoryModal;
document.getElementById('modal-close-btn').onclick = closeModal;
document.getElementById('modal-cancel-btn').onclick = closeModal;

memoryFormEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('form-memory-id').value;
  const topic = document.getElementById('form-topic').value.trim();
  const decision = document.getElementById('form-decision').value.trim();
  const reason = document.getElementById('form-reason').value.trim();
  const owner = document.getElementById('form-owner').value.trim();
  const status = document.getElementById('form-status').value;
  const type = document.getElementById('form-type').value;
  const validUntilInput = document.getElementById('form-valid-until').value;
  const valid_until = validUntilInput ? new Date(validUntilInput).toISOString() : null;

  const payload = { topic, decision, reason, owner, status, type, valid_until };

  try {
    if (id) {
      // Update
      await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Memory corrected successfully', 'success');
    } else {
      // Create
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('New memory created', 'success');
    }

    closeModal();
    loadMemories();
  } catch (err) {
    console.error('Save memory failed', err);
    showToast('Failed to save memory', 'error');
  }
});

async function confirmDeleteMemory(id) {
  if (!confirm('Are you sure you want to delete this memory record?')) return;
  try {
    await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    showToast('Memory deleted', 'warning');
    loadMemories();
  } catch (err) {
    console.error('Delete memory failed', err);
    showToast('Failed to delete memory', 'error');
  }
}

// ----------------------------------------------------
// Time Machine & Date Advancing
// ----------------------------------------------------
async function setTime(isoString) {
  try {
    const res = await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isoString })
    });
    const data = await res.json();
    currentSimulatedTime = data.simulatedTime;
    const d = new Date(currentSimulatedTime);
    currentSimTimeEl.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    showToast(`Time Machine: Simulated date is now ${d.toLocaleDateString()}`, 'info');
    loadMemories();
  } catch (err) {
    console.error('Failed to set time', err);
  }
}

document.getElementById('time-today-btn').onclick = () => {
  setTime('2026-10-30T10:00:00.000Z');
};

document.getElementById('time-nextweek-btn').onclick = () => {
  // Advance 7 days past Friday (e.g. Nov 6, 2026) to demonstrate expiration
  setTime('2026-11-06T19:00:00.000Z');
};

// Toggle Inspect Panel
document.getElementById('toggle-inspect-drawer-btn').onclick = () => {
  inspectPanelEl.classList.toggle('hidden');
};
document.getElementById('close-inspect-btn').onclick = () => {
  inspectPanelEl.classList.add('hidden');
};

// ----------------------------------------------------
// Interactive Guided Demo Scenarios
// ----------------------------------------------------

// Scenario 1: Postgres ➔ MongoDB Superseding & Recall
document.getElementById('btn-scenario-db').onclick = async () => {
  switchToChat();
  switchChannel('architecture');
  showToast('Starting Demo: Postgres ➔ Mongo Switch', 'info');

  // Step 1: Send Postgres decision
  chatInputEl.value = "We’re using Postgres because the team knows SQL.";
  senderSelectEl.value = "Sarah (Tech Lead)";
  chatFormEl.dispatchEvent(new Event('submit'));

  setTimeout(() => {
    // Step 2: Ask database question
    switchChannel('ask-assistant');
    chatInputEl.value = "What database are we using and why?";
    senderSelectEl.value = "Alex (Backend Dev)";
    chatFormEl.dispatchEvent(new Event('submit'));

    setTimeout(() => {
      // Step 3: Switch to MongoDB
      switchChannel('architecture');
      chatInputEl.value = "Actually, we’re switching to MongoDB because we need flexible JSON schema.";
      senderSelectEl.value = "Sarah (Tech Lead)";
      chatFormEl.dispatchEvent(new Event('submit'));

      setTimeout(() => {
        // Step 4: Ask database question again
        switchChannel('ask-assistant');
        chatInputEl.value = "What database are we using and why?";
        senderSelectEl.value = "Alex (Backend Dev)";
        chatFormEl.dispatchEvent(new Event('submit'));
        showToast('Demo Complete: Postgres superseded, Mongo recalled, Inspect open!', 'success');
      }, 1500);
    }, 1500);
  }, 1000);
};

// Scenario 2: Temporal Expiry
document.getElementById('btn-scenario-expiry').onclick = async () => {
  switchToChat();
  // Set date to Thursday before Friday demo
  await setTime('2026-10-29T10:00:00.000Z');
  switchChannel('sprint-planning');
  showToast('Starting Demo: Demo Expiry (Date set to Oct 29)', 'info');

  chatInputEl.value = "The demo is on Friday because executive stakeholders are visiting.";
  senderSelectEl.value = "Marcus (Product Manager)";
  chatFormEl.dispatchEvent(new Event('submit'));

  setTimeout(() => {
    // Ask when demo is
    switchChannel('ask-assistant');
    chatInputEl.value = "When is the demo?";
    senderSelectEl.value = "Elena (Frontend Dev)";
    chatFormEl.dispatchEvent(new Event('submit'));

    setTimeout(async () => {
      // Fast forward time past Friday!
      await setTime('2026-11-06T19:00:00.000Z');
      showToast('Fast-forwarded past Friday! Demo memory has expired.', 'warning');

      setTimeout(() => {
        // Ask again
        chatInputEl.value = "When is the demo?";
        senderSelectEl.value = "Elena (Frontend Dev)";
        chatFormEl.dispatchEvent(new Event('submit'));
      }, 1200);
    }, 1500);
  }, 1000);
};

// Wipe All Data to start 100% clean from scratch
document.getElementById('btn-seed-reset').onclick = async () => {
  if (!confirm('Wipe all data and start completely fresh from scratch?')) return;
  try {
    await fetch('/api/wipe', { method: 'POST' });
    showToast('All prebuilt data wiped! Starting completely clean from scratch.', 'success');
    loadChannels();
    loadMemories();
    loadMessages();
    loadSimulatedTime();
    loadCodingStats();
    loadCodingTasks();
  } catch (err) {
    console.error('Failed to wipe data', err);
  }
};

// Helper: Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ----------------------------------------------------
// App Boot
// ----------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
  await loadChannels();
  await loadSimulatedTime();
  await loadMemories();
  await loadCodingStats();
  switchChannel('architecture');
});
