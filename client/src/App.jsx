import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Building2,
  ChevronDown,
  Bot,
  Database,
  ScanEye,
  Send,
  Plus,
  PlayCircle,
  History,
  Trash2,
  Clock,
  Split,
  Edit2,
  X,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Filter,
  UserCheck
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ledger'
  const [currentChannel, setCurrentChannel] = useState('architecture');
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [memories, setMemories] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeTeam, setActiveTeam] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [activeInspection, setActiveInspection] = useState(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editMemory, setEditMemory] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const [formTopic, setFormTopic] = useState('');
  const [formDecision, setFormDecision] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formValidUntil, setFormValidUntil] = useState('');

  const messagesEndRef = useRef(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Initial Load
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const teamRes = await fetch('/api/teams');
      const teams = await teamRes.json();
      setAllTeams(teams);

      const team = teams[0] || { id: 'ws_core', name: 'Apollo Core Engineering' };
      setActiveTeam(team);

      const userRes = await fetch(`/api/teams/${team.id}/users`);
      const users = await userRes.json();
      setTeamMembers(users);
      setActiveUser(users[0] || { id: 'u_sarah', name: 'Sarah Jenkins', role: 'Tech Lead', avatar: 'SJ' });

      const chanRes = await fetch('/api/channels');
      const chans = await chanRes.json();
      setChannels(chans);

      loadMemories();
    } catch (err) {
      console.error('Initialization error:', err);
    }
  };

  // 2. Fetch Messages on Channel/Team Change
  useEffect(() => {
    if (activeTeam) {
      loadMessages();
    }
  }, [currentChannel, activeTeam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!activeTeam) return;
    try {
      const res = await fetch(`/api/channels/${currentChannel}/messages?teamId=${activeTeam.id}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const loadMemories = async () => {
    try {
      const res = await fetch(`/api/memories?status=${ledgerFilter}`);
      const data = await res.json();
      setMemories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
  };

  // 3. Message Send Handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await fetch(`/api/channels/${currentChannel}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          sender: activeUser?.name || 'Sarah Jenkins',
          userId: activeUser?.id || 'u_sarah',
          teamId: activeTeam?.id || 'ws_core'
        })
      });

      const data = await res.json();

      if (data.extractedMemory) {
        showToast(`🧠 Stored Decision: "${data.extractedMemory.topic}"`, 'success');
        if (data.supersededMemory) {
          showToast(`🔄 Superseded: "${data.supersededMemory.decision}"`, 'warning');
        }
        loadMemories();
      }

      if (data.assistantMessage?.inspection_data) {
        setActiveInspection(data.assistantMessage.inspection_data);
      }

      loadMessages();
    } catch (err) {
      showToast('Failed to send message', 'error');
    }
  };

  // 4. Guided 5-Step Demo
  const handleRunGuidedDemo = async () => {
    showToast('🚀 Running Guided 5-Step Agentic Memory Demo...', 'info');

    // Step 1: Wipe & Seed
    await fetch('/api/demo/seed', { method: 'POST' });
    showToast('Step 1: Taught Project Atlas stack & Redis restriction', 'success');
    await loadMemories();
    await loadMessages();

    // Step 2: Switch to Chatbot and query
    setTimeout(() => {
      setCurrentChannel('ask-assistant');
      setInputText('Design a background job system for scheduled notifications.');
      showToast('Step 2: Asking question to demonstrate behavioral adaptation...', 'info');
    }, 1200);
  };

  // 5. Memory CRUD & Time Machine
  const handleSaveMemory = async (e) => {
    e.preventDefault();
    const payload = {
      topic: formTopic,
      decision: formDecision,
      reason: formReason,
      status: formStatus,
      valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : null,
      teamId: activeTeam?.id || 'ws_core',
      owner: activeUser?.id || 'u_sarah'
    };

    try {
      if (editMemory) {
        await fetch(`/api/memories/${editMemory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Memory updated', 'success');
      } else {
        await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Memory created', 'success');
      }

      setAddModalOpen(false);
      setEditMemory(null);
      loadMemories();
    } catch (err) {
      showToast('Error saving memory', 'error');
    }
  };

  const handleDeleteMemory = async (id) => {
    if (!confirm('Permanently purge this memory from MongoDB?')) return;
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      showToast('Memory document and vector purged', 'warning');
      loadMemories();
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  const handleTimeTravel = async (days) => {
    const target = new Date('2026-10-30T10:00:00.000Z');
    target.setDate(target.getDate() + days);
    try {
      await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isoString: target.toISOString() })
      });
      showToast(`Time Machine advanced ${days === 0 ? 'Reset to Today' : '+' + days + ' days'}!`, 'info');
      setTimeMachineOpen(false);
      loadMemories();
    } catch (err) {
      showToast('Time travel error', 'error');
    }
  };

  const openAddModal = (mem = null) => {
    if (mem) {
      setEditMemory(mem);
      setFormTopic(mem.topic);
      setFormDecision(mem.decision);
      setFormReason(mem.reason || '');
      setFormStatus(mem.status || 'active');
      setFormValidUntil(mem.valid_until ? new Date(mem.valid_until).toISOString().slice(0, 16) : '');
    } else {
      setEditMemory(null);
      setFormTopic('');
      setFormDecision('');
      setFormReason('');
      setFormStatus('active');
      setFormValidUntil('');
    }
    setAddModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 select-none">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700' :
          toast.type === 'warning' ? 'bg-amber-950/90 text-amber-300 border-amber-700' :
          'bg-indigo-950/90 text-indigo-200 border-indigo-700'
        }`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              SynapseMem 2.0
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800/80">MongoDB Atlas</span>
            </div>
            <div className="text-[10px] text-slate-400">Memory Operating System for AI Agents</div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition ${
              activeTab === 'chat' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-300" /> Chatbot
          </button>
          <button
            onClick={() => { setActiveTab('ledger'); loadMemories(); }}
            className={`px-4 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition ${
              activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-300" /> Memory Ledger
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
              {memories.length}
            </span>
          </button>
        </nav>

        {/* Right Menu & User */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleRunGuidedDemo}
            className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 font-semibold text-xs flex items-center gap-1.5 transition"
            title="Run 5-Step Demo"
          >
            <PlayCircle className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Guided Demo</span>
          </button>

          <button
            onClick={() => setTimeMachineOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition"
            title="Time Machine (Temporal Expiry)"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={() => setInspectOpen(!inspectOpen)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              inspectOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <ScanEye className="w-4 h-4 text-indigo-300" />
            <span className="hidden sm:inline">Inspect</span>
          </button>

          {/* Active User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow">
              {activeUser?.avatar || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <span className="block text-xs font-bold text-slate-200 leading-tight">{activeUser?.name}</span>
              <span className="block text-[10px] text-slate-400 leading-tight">{activeUser?.role}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: CHATBOT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Channels Sidebar */}
            <aside className="w-56 border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Channels</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3" /> MongoDB
                </span>
              </div>
              <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                {channels.map((ch) => {
                  const isBot = ch.id === 'ask-assistant';
                  const isActive = ch.id === currentChannel;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setCurrentChannel(ch.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition ${
                        isActive
                          ? 'bg-indigo-950/80 text-white font-semibold border border-indigo-700/50'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={isActive ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
                          {isBot ? '🤖' : '#'}
                        </span>
                        <span className="truncate">{isBot ? 'AI Assistant' : ch.id}</span>
                      </div>
                      {isBot && (
                        <span className="text-[9px] bg-indigo-900/80 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase">
                          Recall
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-800 bg-slate-900/30 text-[11px] text-slate-400 flex items-center justify-between">
                <span>1024D Voyage Vectors</span>
                <span className="font-bold text-emerald-400">Active</span>
              </div>
            </aside>

            {/* Chat Stream Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/50">
              {/* Channel Header */}
              <div className="h-11 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold text-xs">{currentChannel === 'ask-assistant' ? '🤖' : '#'}</span>
                  <span className="font-bold text-xs text-slate-200">{currentChannel}</span>
                  <span className="text-[11px] text-slate-400 border-l border-slate-700 pl-2 hidden sm:inline">
                    {currentChannel === 'ask-assistant'
                      ? 'Queries MongoDB Atlas using $vectorSearch with zero chat history injected'
                      : 'Decisions and constraints are structured and embedded into MongoDB'}
                  </span>
                </div>
                <div className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Agentic Memory Active</span>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 space-y-2">
                    <MessageSquare className="w-9 h-9 mx-auto text-slate-600" />
                    <p className="text-xs font-semibold text-slate-400">No messages in #{currentChannel} yet.</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      {currentChannel === 'ask-assistant'
                        ? 'Ask any question to test persistent memory grounding and behavioral adaptation.'
                        : 'Post a decision like "For Project Atlas, we use MongoDB..." to extract a structured memory.'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col space-y-1.5 ${
                        msg.is_assistant ? 'bg-indigo-950/20 border border-indigo-900/50 p-3.5 rounded-xl shadow-lg' : 'p-2'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            msg.is_assistant ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {msg.is_assistant ? '🤖' : msg.sender?.charAt(0)}
                        </div>
                        <span className={`text-xs font-bold ${msg.is_assistant ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.is_assistant && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">
                            Memory Grounded
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-200 pl-8 leading-relaxed font-normal">{msg.text}</div>

                      {/* Dual-Mode Baseline Contrast Box */}
                      {msg.is_assistant && msg.withoutMemoryAnswer && (
                        <div className="mt-2.5 mx-8 p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-slate-400 font-semibold">
                            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                              <Split className="w-3.5 h-3.5" /> Dual-Mode Baseline: "Without Memory"
                            </span>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                              Contrast
                            </span>
                          </div>
                          <p className="text-slate-400 leading-normal italic">{msg.withoutMemoryAnswer}</p>
                        </div>
                      )}

                      {/* Memory Extracted Badge */}
                      {!msg.is_assistant && msg.memories_extracted?.length > 0 && (
                        <div className="pl-8 pt-1 flex items-center gap-2">
                          <div
                            onClick={() => { setActiveTab('ledger'); loadMemories(); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 shadow cursor-pointer hover:bg-emerald-900 transition memory-pulse-card"
                          >
                            <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Memory Persisted to MongoDB Atlas</span>
                          </div>
                        </div>
                      )}

                      {/* Inspect Button */}
                      {msg.is_assistant && msg.inspection_data && (
                        <div className="pl-8 pt-1">
                          <button
                            onClick={() => {
                              setActiveInspection(msg.inspection_data);
                              setInspectOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 transition"
                          >
                            <ScanEye className="w-3 h-3 text-indigo-400" />
                            <span>Inspect Retrieval Metrics</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/80">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      currentChannel === 'ask-assistant'
                        ? 'Ask the assistant (e.g. "Design a background job system...", "What database are we using?")...'
                        : 'Share a team decision or constraint (e.g. "Do not introduce Redis without approval")...'
                    }
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: MEMORY LEDGER */}
        {activeTab === 'ledger' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" /> Structured Memory Ledger (MongoDB Atlas)
                </h2>
                <p className="text-[11px] text-slate-400">Every memory is an authoritative document with 1024D Voyage embeddings.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs">
                  {['all', 'active', 'superseded', 'expired'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLedgerFilter(filter)}
                      className={`px-3 py-1 rounded-lg font-medium capitalize transition ${
                        ledgerFilter === filter ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => openAddModal()}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-4 h-4" /> Add Decision
                </button>
              </div>
            </div>

            {/* Memory Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {memories.length === 0 ? (
                <div className="text-center py-24 text-slate-500 space-y-2">
                  <Database className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">No memory documents found.</p>
                  <p className="text-[11px] text-slate-500">Post a decision in chat or click "+ Add Decision".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {memories.map((mem) => {
                    const isPast = mem.valid_until && new Date() > new Date(mem.valid_until);
                    return (
                      <div
                        key={mem.id}
                        className={`memory-card bg-slate-900 border rounded-xl p-4 flex flex-col justify-between space-y-3 ${
                          mem.status === 'active'
                            ? 'border-emerald-800/40 shadow-emerald-950/20'
                            : mem.status === 'superseded'
                            ? 'border-amber-800/40 shadow-amber-950/20'
                            : 'border-slate-800 opacity-80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-xs text-white">{mem.topic}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                mem.status === 'active'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : mem.status === 'superseded'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {mem.status}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-100 mb-1">{mem.decision}</p>
                          {mem.reason && (
                            <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                              <span className="text-slate-500 font-medium">Why:</span> {mem.reason}
                            </div>
                          )}

                          {mem.superseded_by && (
                            <div className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-2">
                              <ArrowRight className="w-3 h-3" /> Superseded by newer directive
                            </div>
                          )}

                          {mem.valid_until && (
                            <div
                              className={`text-[10px] font-medium flex items-center gap-1 mt-1.5 ${
                                isPast ? 'text-rose-400' : 'text-indigo-400'
                              }`}
                            >
                              <Clock className="w-3 h-3" /> {isPast ? 'Expired:' : 'Valid until:'}{' '}
                              {new Date(mem.valid_until).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Owner: <strong className="text-slate-300">{mem.owner}</strong></span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openAddModal(mem)}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                              title="Edit decision"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMemory(mem.id)}
                              className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                              title="Forget / Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SIDEBAR: INSPECT PANEL */}
        {inspectOpen && (
          <aside className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col shrink-0 overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <ScanEye className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Inspect Retrieval</span>
              </div>
              <button onClick={() => setInspectOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {!activeInspection ? (
                <div className="text-center py-20 text-slate-500 space-y-2">
                  <ScanEye className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="font-semibold text-slate-400">No Query Inspected Yet</p>
                  <p className="text-[11px] text-slate-500">Ask any question in #ask-assistant to inspect real $vectorSearch scores.</p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Query Evaluated</div>
                    <div className="text-xs font-semibold text-white">"{activeInspection.query}"</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-1">Index: {activeInspection.vectorIndex} (1024D)</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                      <span>Selected Memories (Grounding)</span>
                      <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold">
                        {activeInspection.selectedCount || 0}
                      </span>
                    </div>
                    {activeInspection.selectedMemories?.map((m) => (
                      <div key={m.id} className="p-3 rounded-xl bg-slate-900 border border-emerald-900/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{m.topic}: {m.statement}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            USED
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Similarity Score:</span>
                          <span className="font-mono text-emerald-400 font-bold">{Math.round((m.score || 0.8) * 100)}% Match</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {activeInspection.rejectedMemories?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                        <span>Rejected Candidates</span>
                        <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 rounded font-bold">
                          {activeInspection.rejectedCount}
                        </span>
                      </div>
                      {activeInspection.rejectedMemories.map((r, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-900/40 text-[11px] space-y-1">
                          <div className="font-semibold text-slate-300">{r.topic}</div>
                          <div className="text-[10px] text-rose-300 font-mono">Reason: {r.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
                    <div className="font-bold text-slate-300">Prompt Proof:</div>
                    <div>Chat history injected: <span className="text-emerald-400 font-bold">false</span></div>
                    <div>Memory IDs injected: {activeInspection.promptPayload?.memory_records_injected?.join(', ') || 'none'}</div>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* MODAL: TIME MACHINE SIMULATOR */}
      {timeMachineOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" /> Time Machine Simulator
              </h3>
              <button onClick={() => setTimeMachineOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-400 text-xs">Advance application time to verify how temporary assumptions automatically expire.</p>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => handleTimeTravel(0)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-left flex items-center justify-between font-medium"
              >
                <span>Reset to Today (Oct 30, 2026)</span>
                <span className="text-indigo-400 font-bold">Reset</span>
              </button>
              <button
                onClick={() => handleTimeTravel(7)}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-left flex items-center justify-between font-bold"
              >
                <span>Fast-Forward +7 Days (Nov 6, 2026)</span>
                <span className="text-amber-400">+7d</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MEMORY */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" /> {editMemory ? 'Edit Decision' : 'Add Decision to MongoDB'}
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Topic / Category</label>
                <input
                  type="text"
                  required
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="e.g. Database, Infrastructure, Frontend"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Decision / Statement</label>
                <textarea
                  rows="2"
                  required
                  value={formDecision}
                  onChange={(e) => setFormDecision(e.target.value)}
                  placeholder="e.g. We use MongoDB Atlas as our primary database."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason / Rationale</label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Flexible document structure and vector search capability"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="superseded">Superseded</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valid Until (Expiry)</label>
                  <input
                    type="datetime-local"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
