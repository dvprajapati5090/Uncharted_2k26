import React from 'react';
import {
  Bot,
  Database,
  GraduationCap,
  Vote,
  PlayCircle,
  Radio,
  BarChart2,
  History,
  ScanEye,
  GitPullRequest,
  FileText,
  Trash2,
  Key,
  Zap,
  Building2,
  Pin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders,
  SlidersHorizontal,
  LogOut,
  Layers,
  Network,
  FolderTree,
  Scale
} from 'lucide-react';

export default function AppSidebar({
  activeTab,
  setActiveTab,
  sidebarPinned,
  setSidebarPinned,
  sidebarHovered,
  handleSidebarMouseEnter,
  handleSidebarMouseLeave,
  activeTeam,
  activeUser,
  memories = [],
  trainingStats = {},
  consensusStats = {},
  channels = [],
  currentChannel,
  setCurrentChannel,
  messages = [],
  selectedModel,
  setSelectedModel,
  onOpenLlmModal,
  onRunGuidedDemo,
  onOpenGithubModal,
  onOpenBenchmarkModal,
  onOpenTimeMachine,
  onOpenInspect,
  inspectOpen,
  onExportDossier,
  isExportingDossier,
  onWipeData,
  onOpenRealtimeDrawer,
  realtimeHistory = [],
  onBackToLanding,
  onLogout,
  ledgerView,
  setLedgerView,
  ledgerFilter,
  setLedgerFilter,
  ledgerConfidenceMin,
  setLedgerConfidenceMin,
  consensusQuorumThreshold,
  setConsensusQuorumThreshold,
  onOpenAddModal
}) {
  const isExpanded = sidebarPinned || sidebarHovered;

  return (
    <aside
      className={`premium-sidebar-container select-none shrink-0 ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
    >
      <div className="w-[260px] h-full flex flex-col justify-between bg-[#050505] shrink-0">
        {/* Top: Header & Primary Navigation */}
        <div className="flex flex-col overflow-y-auto no-scrollbar flex-1">
          {/* Workspace Switcher Header */}
          <div className="h-14 px-3 border-b border-white/10 flex items-center justify-between bg-black/60 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                onClick={() => setSidebarPinned(!sidebarPinned)}
                className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer hover:border-white/40 transition"
                title={sidebarPinned ? 'Sidebar Locked (Click to unpin)' : 'Click to lock sidebar'}
              >
                <Building2 className="w-4 h-4 text-white" />
              </div>
              {isExpanded && (
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>{activeTeam?.name || "Atlas Core Engineers"}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    Tenant: {activeTeam?.id || 'ws_core'}
                  </div>
                </div>
              )}
            </div>

            {isExpanded && (
              <button
                onClick={() => setSidebarPinned(!sidebarPinned)}
                className={`p-1.5 rounded-lg text-xs transition border ${
                  sidebarPinned
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
                title={sidebarPinned ? 'Unpin Sidebar (Auto-collapse on leave)' : 'Pin Sidebar Open'}
              >
                <Pin className={`w-3.5 h-3.5 ${sidebarPinned ? 'text-white' : 'text-neutral-400'}`} />
              </button>
            )}
          </div>

          {/* Primary View Navigation */}
          <div className="p-2 space-y-1 border-b border-white/10">
            {isExpanded && (
              <div className="px-2 pt-1 pb-1.5 text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                <span>Core Windows</span>
                <span className="text-[9px] text-neutral-500 font-mono">v2.0</span>
              </div>
            )}

            {/* Chatbot Tab */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition ${
                activeTab === 'chat'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                  : 'text-neutral-300 hover:bg-white/5 hover:text-white'
              }`}
              title="Interactive Chatbot & Behavioral Grounding"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Bot className={`w-4 h-4 shrink-0 ${activeTab === 'chat' ? 'text-black' : 'text-neutral-400'}`} />
                {isExpanded && <span className="truncate">Chatbot</span>}
              </div>
              {isExpanded && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  activeTab === 'chat' ? 'bg-black text-white' : 'bg-white/10 text-neutral-300'
                }`}>
                  Recall
                </span>
              )}
            </button>

            {/* Memory Ledger Tab */}
            <button
              onClick={() => setActiveTab('ledger')}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition ${
                activeTab === 'ledger'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                  : 'text-neutral-300 hover:bg-white/5 hover:text-white'
              }`}
              title="Structured Memory Ledger & Knowledge Graph"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Database className={`w-4 h-4 shrink-0 ${activeTab === 'ledger' ? 'text-black' : 'text-neutral-400'}`} />
                {isExpanded && <span className="truncate">Memory Ledger</span>}
              </div>
              {isExpanded && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'ledger' ? 'bg-black text-white' : 'bg-white/10 text-neutral-300'
                }`}>
                  {memories.length}
                </span>
              )}
            </button>

            {/* Training & DPO Tab */}
            <button
              onClick={() => setActiveTab('training')}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition ${
                activeTab === 'training'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                  : 'text-neutral-300 hover:bg-white/5 hover:text-white'
              }`}
              title="Active Reinforcement & DPO Fine-Tuning"
            >
              <div className="flex items-center gap-2.5 truncate">
                <GraduationCap className={`w-4 h-4 shrink-0 ${activeTab === 'training' ? 'text-black' : 'text-neutral-400'}`} />
                {isExpanded && <span className="truncate">Training & DPO</span>}
              </div>
              {isExpanded && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'training' ? 'bg-black text-white' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {trainingStats.dpoPairsCount || 0}
                </span>
              )}
            </button>

            {/* Consensus Quorum Tab */}
            <button
              onClick={() => setActiveTab('consensus')}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition ${
                activeTab === 'consensus'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                  : 'text-neutral-300 hover:bg-white/5 hover:text-white'
              }`}
              title="Multi-Agent Consensus & Quorum Memory Validation"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Vote className={`w-4 h-4 shrink-0 ${activeTab === 'consensus' ? 'text-black' : 'text-neutral-400'}`} />
                {isExpanded && <span className="truncate">Consensus Quorum</span>}
              </div>
              {isExpanded && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'consensus' ? 'bg-black text-white' : 'bg-purple-950 text-purple-300 border border-purple-800'
                }`}>
                  {consensusStats.ratifiedCount || 0}
                </span>
              )}
            </button>
          </div>

          {/* Contextual Sub-Menu Controls based on Active Tab */}
          {isExpanded && (
            <div className="p-3 border-b border-white/10 space-y-2.5">
              {/* If Chatbot Active */}
              {activeTab === 'chat' && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Chat Channels</span>
                    <span className="text-emerald-400 text-[9px] font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                    </span>
                  </div>
                  <div className="space-y-1">
                    {channels.map((ch) => {
                      const isBot = ch.id === 'ask-assistant';
                      const isActive = ch.id === currentChannel;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => setCurrentChannel(ch.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition ${
                            isActive
                              ? 'bg-white/15 text-white font-semibold border border-white/20'
                              : 'text-neutral-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs">{isBot ? '🤖' : '#'}</span>
                            <span className="truncate">{isBot ? 'AI Assistant' : ch.id}</span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {messages.filter(m => m.channel === ch.id).length || ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* If Memory Ledger Active */}
              {activeTab === 'ledger' && (
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Ledger View</span>
                    <button
                      onClick={() => onOpenAddModal && onOpenAddModal()}
                      className="text-[10px] text-white hover:text-emerald-300 font-semibold underline flex items-center gap-1"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Sub-View Switcher */}
                  <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl border border-white/10 text-[10px]">
                    <button
                      onClick={() => setLedgerView && setLedgerView('cards')}
                      className={`py-1 rounded font-medium text-center transition ${
                        ledgerView === 'cards' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setLedgerView && setLedgerView('graph')}
                      className={`py-1 rounded font-medium text-center transition ${
                        ledgerView === 'graph' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Graph
                    </button>
                    <button
                      onClick={() => setLedgerView && setLedgerView('hierarchy')}
                      className={`py-1 rounded font-medium text-center transition ${
                        ledgerView === 'hierarchy' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Domains
                    </button>
                  </div>

                  {/* Confidence Threshold Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
                        Min Confidence:
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {ledgerConfidenceMin || 50}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={ledgerConfidenceMin || 50}
                      onChange={(e) => setLedgerConfidenceMin && setLedgerConfidenceMin(Number(e.target.value))}
                      className="obsidian-slider"
                      title="Filter memories by minimum confidence threshold"
                    />
                    <div className="flex justify-between text-[8px] text-neutral-500 font-mono">
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* If Training & DPO Active */}
              {activeTab === 'training' && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Feedback Calibration</span>
                    <span className="text-emerald-400 font-mono text-[10px] font-bold">
                      {trainingStats.adherenceRate || 100}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden border border-white/10">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${trainingStats.adherenceRate || 100}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight">
                    Calibrated: <strong className="text-white">{trainingStats.calibratedMemoriesCount || 0}</strong> directives
                  </div>
                </div>
              )}

              {/* If Consensus Quorum Active */}
              {activeTab === 'consensus' && (
                <div className="space-y-2.5">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Quorum Threshold</span>
                    <span className="text-purple-300 font-mono text-[10px] font-bold">
                      {consensusQuorumThreshold || 67}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={consensusQuorumThreshold || 67}
                    onChange={(e) => setConsensusQuorumThreshold && setConsensusQuorumThreshold(Number(e.target.value))}
                    className="obsidian-slider"
                    title="Required consensus agreement across agents"
                  />
                  <div className="flex justify-between text-[8px] text-neutral-500 font-mono">
                    <span>50% (Simple)</span>
                    <span>67% (Quorum)</span>
                    <span>100% (Unanimous)</span>
                  </div>
                  <div className="pt-1 text-[10px] text-neutral-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>🏛️ Atlas Architect</span>
                      <span className="text-emerald-400 font-mono">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>🔒 Sentinel Guard</span>
                      <span className="text-emerald-400 font-mono">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>🚀 Pipeline Marshal</span>
                      <span className="text-emerald-400 font-mono">Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Operational Tools & Diagnostics */}
          <div className="p-2 space-y-1">
            {isExpanded && (
              <div className="px-2 pt-1 pb-1 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                <span>Tools & Operations</span>
              </div>
            )}

            <button
              onClick={onRunGuidedDemo}
              className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition"
              title="Run 5-Step Architecture Verification Demo"
            >
              <PlayCircle className="w-3.5 h-3.5 text-white shrink-0" />
              {isExpanded && <span>Guided Demo</span>}
            </button>

            <button
              onClick={onOpenRealtimeDrawer}
              className="w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition"
              title="Real-Time Change Stream Sync"
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {isExpanded && <span>Live Sync Stream</span>}
              </div>
              {isExpanded && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              onClick={onOpenBenchmarkModal}
              className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition"
              title="Scientific Live Benchmark vs Naive RAG"
            >
              <BarChart2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              {isExpanded && <span>Benchmark Matrix</span>}
            </button>

            <button
              onClick={onOpenTimeMachine}
              className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition"
              title="Temporal Time Machine & TTL Simulator"
            >
              <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {isExpanded && <span>Time Machine</span>}
            </button>

            <button
              onClick={onOpenInspect}
              className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition"
              title="Inspect 1024D Voyage Vectors"
            >
              <ScanEye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {isExpanded && <span>{inspectOpen ? 'Close Inspector' : 'Vector Inspector'}</span>}
            </button>

            <button
              onClick={onOpenGithubModal}
              className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition"
              title="Autonomous GitHub Repo Onboarding & PR Guardian"
            >
              <GitPullRequest className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {isExpanded && <span>GitHub Guardian PR</span>}
            </button>

            <button
              onClick={onExportDossier}
              disabled={isExportingDossier}
              className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
              title="Download formatted ADR Markdown Dossier"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              {isExpanded && <span>{isExportingDossier ? 'Exporting...' : 'Export ADR Dossier'}</span>}
            </button>

            <button
              onClick={onWipeData}
              className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 transition"
              title="Re-seed clean architectural directives"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              {isExpanded && <span>Reset Baseline</span>}
            </button>
          </div>
        </div>

        {/* Bottom Section: Model Picker & User Profile */}
        <div className="p-3 border-t border-white/10 bg-black/60 space-y-2.5 shrink-0">
          {/* Model Selector */}
          {isExpanded ? (
            <div className="flex items-center justify-between bg-neutral-950 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent text-white text-[11px] font-medium focus:outline-none cursor-pointer truncate max-w-[130px]"
                >
                  <option value="gemini-3-flash-preview" className="bg-neutral-900 text-white">Gemini 3 Flash</option>
                  <option value="gemini-3.1-flash-lite" className="bg-neutral-900 text-white">Gemini 3.1 Flash</option>
                  <option value="claude-3-5-sonnet" className="bg-neutral-900 text-white">Claude 3.5</option>
                  <option value="local-grounded" className="bg-neutral-900 text-white">Local Atlas Engine</option>
                </select>
              </div>
              <button
                onClick={onOpenLlmModal}
                className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition"
                title="Configure LLM API Keys"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLlmModal}
              className="w-full flex items-center justify-center p-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-300 hover:text-white"
              title="Configure Model & API Keys"
            >
              <Zap className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* User Profile Card & Sign Out */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-white text-black font-bold flex items-center justify-center text-xs shadow shrink-0">
                {activeUser?.avatar || 'U'}
              </div>
              {isExpanded && (
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-neutral-200 truncate leading-tight">
                    {activeUser?.name || 'Developer'}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate leading-tight">
                    {activeUser?.role || 'Member'}
                  </div>
                </div>
              )}
            </div>

            {isExpanded && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-rose-300 transition"
                title="Log Out / Switch Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pin / Collapse Slider Toggle Button */}
          {isExpanded && (
            <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
              <span>{sidebarPinned ? 'Sidebar Locked' : 'Auto-Collapse'}</span>
              <button
                onClick={() => setSidebarPinned(!sidebarPinned)}
                className="text-neutral-400 hover:text-white underline cursor-pointer"
              >
                {sidebarPinned ? 'Auto-hide' : 'Pin Open'}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
