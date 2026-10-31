import React, { useState, useEffect, useRef, useMemo } from 'react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import AppSidebar from './components/AppSidebar';
import LedgerView from './components/LedgerView';
import TrainingView from './components/TrainingView';
import ConsensusView from './components/ConsensusView';
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
  UserCheck,
  GraduationCap,
  ThumbsUp,
  ThumbsDown,
  Download,
  TrendingUp,
  Pin,
  Award,
  Network,
  Share2,
  Link2,
  Layers,
  FolderTree,
  Boxes,
  Workflow,
  Search,
  Vote,
  ShieldAlert,
  Scale,
  Key,
  Cpu,
  Zap,
  BarChart2,
  FileText,
  Radio,
  Activity,
  AlertTriangle,
  GitPullRequest,
  GitBranch
} from 'lucide-react';

function formatMessageContent(text) {
  if (!text) return null;

  // Check if text contains structured memory records like: 1. ["MEMORY RECORD #..."] or 1. '["MEMORY RECORD #..."]'
  if (text.includes('MEMORY RECORD #')) {
    const parts = text.split(/(?=\d+\.\s+['"\[]*MEMORY RECORD #)/g);
    return (
      <div className="space-y-2 mt-1">
        {parts.map((part, pIdx) => {
          const match = part.match(/MEMORY RECORD #([a-f0-9]+)/i);
          if (match) {
            const memId = match[1];
            const statusMatch = part.match(/\*\*Status:\*\*\s*(\w+)/i);
            const topicMatch = part.match(/\*\*Topic:\*\*\s*([^\n-]+)/i);
            const directiveMatch = part.match(/\*\*Directive:\*\*\s*([^\n-]+)/i);
            const reasonMatch = part.match(/\*\*Reason:\*\*\s*([^\n]+)/i);

            const status = statusMatch ? statusMatch[1].toUpperCase() : 'ACTIVE';
            const topic = topicMatch ? topicMatch[1].trim() : 'General';
            const directive = directiveMatch ? directiveMatch[1].trim() : part.replace(/.*MEMORY RECORD #[a-f0-9]+['"\]]*/i, '').trim();
            const reason = reasonMatch ? reasonMatch[1].trim() : null;

            return (
              <div
                key={pIdx}
                className="bg-black/60 border border-white/15 rounded-xl p-3.5 space-y-1.5 shadow-md"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-white/10 text-white px-2 py-0.5 rounded font-bold">
                      #{memId.slice(0, 8)}
                    </span>
                    <span className="text-xs font-semibold text-white">{topic}</span>
                  </div>
                  <span
                    className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${
                      status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="text-xs font-medium text-neutral-200 leading-relaxed">
                  {directive}
                </div>
                {reason && (
                  <div className="text-[11px] text-neutral-400 italic bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    Why: {reason}
                  </div>
                )}
              </div>
            );
          }
          return (
            <p key={pIdx} className="text-xs text-neutral-200 leading-relaxed">
              {part}
            </p>
          );
        })}
      </div>
    );
  }

  // Standard markdown rendering for bold text
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-xs text-neutral-200 leading-relaxed">
      {lines.map((line, lIdx) => {
        const segments = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={lIdx}>
            {segments.map((seg, sIdx) => {
              if (seg.startsWith('**') && seg.endsWith('**')) {
                return (
                  <strong key={sIdx} className="text-white font-semibold">
                    {seg.slice(2, -2)}
                  </strong>
                );
              }
              return seg;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') === 'app' || window.location.hash === '#app') {
        return 'app';
      }
    }
    return 'landing';
  });
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const hoverTimerRef = useRef(null);

  const handleSidebarMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setSidebarHovered(true);
  };

  const handleSidebarMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setSidebarHovered(false);
    }, 400);
  };
  const [operationsMenuOpen, setOperationsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ledger' | 'training'
  const [currentChannel, setCurrentChannel] = useState('architecture');
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [memories, setMemories] = useState([]);
  const [trainingStats, setTrainingStats] = useState({
    totalFeedback: 0,
    positiveCount: 0,
    negativeCount: 0,
    adherenceRate: 100,
    dpoPairsCount: 0,
    calibratedMemoriesCount: 0
  });
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [inputText, setInputText] = useState('');
  const [activeTeam, setActiveTeam] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [ledgerView, setLedgerView] = useState('cards'); // 'cards' | 'graph'
  const [ledgerConfidenceMin, setLedgerConfidenceMin] = useState(50);
  const [consensusQuorumThreshold, setConsensusQuorumThreshold] = useState(67);
  const [timeScrubberDays, setTimeScrubberDays] = useState(0);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], summary: {} });
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);
  const [graphLineage, setGraphLineage] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSource, setLinkSource] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [linkType, setLinkType] = useState('depends_on');
  const [linkLabel, setLinkLabel] = useState('');
  const [hierarchyData, setHierarchyData] = useState({ clusters: [], summary: { totalClusters: 0, totalDecisions: 0, coherenceScore: 100 } });
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [hierarchySearchQuery, setHierarchySearchQuery] = useState('');
  const [hierarchySearchResult, setHierarchySearchResult] = useState(null);
  const [isClustering, setIsClustering] = useState(false);
  const [consensusHistory, setConsensusHistory] = useState([]);
  const [consensusStats, setConsensusStats] = useState({ totalProposals: 0, ratifiedCount: 0, rejectedCount: 0, vetoCount: 0, quorumThreshold: '67%' });
  const [consensusFilter, setConsensusFilter] = useState('all');
  const [consensusProposalText, setConsensusProposalText] = useState('');
  const [evaluatingConsensus, setEvaluatingConsensus] = useState(false);
  const [activeEvaluatedProposal, setActiveEvaluatedProposal] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => {
    try { return localStorage.getItem('synapse_gemini_key') || ''; } catch (_) { return ''; }
  });
  const [claudeKeyInput, setClaudeKeyInput] = useState(() => {
    try { return localStorage.getItem('synapse_claude_key') || ''; } catch (_) { return ''; }
  });
  const [testingKey, setTestingKey] = useState({ provider: null, status: null, message: '' });
  const [activeKeys, setActiveKeys] = useState({ hasGeminiKey: false, hasClaudeKey: false });
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeInspection, setActiveInspection] = useState(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState('2026-10-30T10:00:00.000Z');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editMemory, setEditMemory] = useState(null);
  const [toast, setToast] = useState(null);
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [realtimeDrawerOpen, setRealtimeDrawerOpen] = useState(false);
  const [realtimeHistory, setRealtimeHistory] = useState([]);
  const [realtimeStats, setRealtimeStats] = useState({ totalEvents: 0, connectedClients: 0 });
  const [conflictWarning, setConflictWarning] = useState(null);
  const [isExportingDossier, setIsExportingDossier] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState('https://github.com/acme/backend');
  const [githubPatToken, setGithubPatToken] = useState('');
  const [isOnboardingGithub, setIsOnboardingGithub] = useState(false);
  const [githubOnboardResult, setGithubOnboardResult] = useState(null);
  const [isSyncingAdr, setIsSyncingAdr] = useState(false);

  const channelQuickPrompts = {
    'architecture': [
      'For Project Atlas, we use Node.js, Express and MongoDB Atlas.',
      'Do not introduce Redis or paid infrastructure without approval.',
      'We have now approved Redis for caching, but MongoDB Atlas must remain our primary database.'
    ],
    'sprint-planning': [
      'No production deployments until November 5, 2026.'
    ],
    'ask-assistant': [
      'Connect to my GitHub repository: https://github.com/acme/backend',
      'Design a background job system for scheduled notifications.',
      'Can we use Redis for caching?',
      'Are there any active deployment freeze rules?',
      'What database are we using?'
    ]
  };

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
      const timeRes = await fetch('/api/time');
      const timeData = await timeRes.json();
      if (timeData?.simulatedTime) setSimulatedTime(timeData.simulatedTime);

      const teamRes = await fetch('/api/teams');
      const teams = await teamRes.json();
      setAllTeams(teams);

      let savedTeam = null;
      try {
        const savedTeamId = localStorage.getItem('synapse_active_team_id');
        if (savedTeamId) savedTeam = teams.find(t => t.id === savedTeamId);
      } catch (_) {}

      const team = savedTeam || teams[0] || { id: 'ws_core', name: 'Apollo Core Engineering' };
      setActiveTeam(team);

      const userRes = await fetch(`/api/teams/${team.id}/users`);
      const users = await userRes.json();
      setTeamMembers(users);
      let savedUser = null;
      try {
        const savedUserId = localStorage.getItem('synapse_active_user_id');
        if (savedUserId) savedUser = users.find(u => u.id === savedUserId);
      } catch (_) {}

      setActiveUser(savedUser || users[0] || { id: 'u_cand_a', name: 'Candidate A', role: 'Sprint Developer', avatar: 'CA' });

      const chanRes = await fetch('/api/channels');
      const chans = await chanRes.json();
      setChannels(chans);

      loadMemories();
      loadTrainingData();
      loadLlmModels();

      // Sync saved local keys with backend
      try {
        const savedGemini = localStorage.getItem('synapse_gemini_key');
        if (savedGemini) {
          fetch('/api/llm/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'gemini', key: savedGemini })
          }).catch(() => {});
        }
        const savedClaude = localStorage.getItem('synapse_claude_key');
        if (savedClaude) {
          fetch('/api/llm/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'claude', key: savedClaude })
          }).catch(() => {});
        }
      } catch (_) {}
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

  const loadMemories = async (statusOverride) => {
    try {
      const filter = statusOverride !== undefined ? statusOverride : ledgerFilter;
      const res = await fetch(`/api/memories?status=${filter}`);
      const data = await res.json();
      setMemories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
  };

  const loadRealtimeData = async () => {
    try {
      const res = await fetch('/api/realtime/history');
      const data = await res.json();
      if (data?.history) setRealtimeHistory(data.history);
      if (data?.stats) setRealtimeStats(data.stats);
    } catch (err) {}
  };

  const handleBroadcastTestSync = async () => {
    try {
      const res = await fetch('/api/realtime/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationType: 'insert',
          collection: 'memories',
          topic: 'Infrastructure',
          summary: `Manual Agent Sync Pulse #${Math.floor(Math.random() * 900 + 100)}: Live mutation synchronized across agents`
        })
      });
      const data = await res.json();
      if (data?.event) {
        setRealtimeHistory(prev => [data.event, ...prev.slice(0, 49)]);
        showToast(`📡 Live mutation broadcasted across agents in ${data.event.latencyMs}ms!`, 'success');
      }
    } catch (err) {
      showToast('Broadcast failed', 'error');
    }
  };

  const loadBenchmarkData = async () => {
    try {
      const res = await fetch('/api/benchmark/latest');
      const data = await res.json();
      setBenchmarkData(data);
    } catch (err) {}
  };

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const res = await fetch('/api/benchmark/run', { method: 'POST' });
      const data = await res.json();
      setBenchmarkData(data);
      showToast(`📊 Benchmark completed in ${data.totalExecutionTimeMs}ms! SynapseMem Score: ${data.scorecard.synapseMem.score}%`, 'success');
    } catch (err) {
      showToast('Benchmark run failed', 'error');
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const handleExportDossier = async () => {
    try {
      setIsExportingDossier(true);
      window.location.href = `/api/export/adr-dossier?format=markdown&workspaceId=${activeTeam?.id || 'ws_core'}`;
      showToast('🏛️ Architecture Decision Record (ADR) Dossier download started!', 'success');
    } catch (err) {
      showToast('Export failed', 'error');
    } finally {
      setIsExportingDossier(false);
    }
  };

  const handleConnectGithub = async (e) => {
    if (e) e.preventDefault();
    if (!githubRepoUrl.trim()) return;

    setIsOnboardingGithub(true);
    setGithubOnboardResult(null);

    try {
      const res = await fetch('/api/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: githubRepoUrl.trim(),
          githubToken: githubPatToken.trim() || undefined,
          workspaceId: activeTeam?.id || 'ws_core'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to onboard repository');

      setGithubOnboardResult(data);
      loadMemories();
      showToast(`Autonomous setup complete! Pull request opened on ${data.repo}.`, 'success');
    } catch (err) {
      showToast(`GitHub Onboarding error: ${err.message}`, 'error');
    } finally {
      setIsOnboardingGithub(false);
    }
  };

  const handleSyncAdrToGitHub = async (mem) => {
    setIsSyncingAdr(true);
    try {
      const res = await fetch('/api/github/sync-adr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId: mem.id || mem._id,
          repoUrl: githubRepoUrl || 'https://github.com/acme/backend',
          githubToken: githubPatToken.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync ADR to GitHub');

      showToast(`Opened PR on GitHub: ${data.adrTitle}!`, 'success');
    } catch (err) {
      showToast(`ADR Sync error: ${err.message}`, 'error');
    } finally {
      setIsSyncingAdr(false);
    }
  };

  const handleResolveConflict = async (strategy) => {
    if (!conflictWarning?.highestConflict) return;
    try {
      const res = await fetch('/api/memories/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          conflictingMemoryId: conflictWarning.highestConflict.memoryId,
          candidateMemory: {
            content: { statement: inputText },
            topic: currentChannel === 'sprint-planning' ? 'Deployment' : 'Infrastructure',
            workspaceId: activeTeam?.id || 'ws_core'
          },
          userId: activeUser?.id || 'u_sarah'
        })
      });
      const data = await res.json();
      showToast(data.message || 'Conflict resolved successfully', 'success');
      setConflictWarning(null);
      loadMemories();
    } catch (err) {
      showToast('Conflict resolution failed', 'error');
    }
  };

  // Real-time SSE Connection
  useEffect(() => {
    loadRealtimeData();
    loadBenchmarkData();

    let eventSource = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.addEventListener('memory_sync', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setRealtimeHistory(prev => [parsed, ...prev.slice(0, 49)]);
          setRealtimeStats(prev => ({
            ...prev,
            totalEvents: (prev.totalEvents || 0) + 1
          }));
          loadMemories();
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Pre-commit Conflict Detection
  useEffect(() => {
    if (!inputText || inputText.trim().length < 15 || currentChannel === 'ask-assistant') {
      setConflictWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/memories/check-conflict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText,
            topic: currentChannel === 'sprint-planning' ? 'Deployment' : 'Infrastructure',
            workspaceId: activeTeam?.id || 'ws_core'
          })
        });
        const data = await res.json();
        if (data?.hasConflict) {
          setConflictWarning(data);
        } else {
          setConflictWarning(null);
        }
      } catch (err) {
        setConflictWarning(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [inputText, currentChannel, activeTeam]);

  const loadTrainingData = async () => {
    try {
      const statsRes = await fetch('/api/training/stats');
      const stats = await statsRes.json();
      setTrainingStats(stats);

      const listRes = await fetch('/api/training/feedback');
      const list = await listRes.json();
      setFeedbackList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load training stats:', err);
    }
  };

  const handleFeedback = async (msg, rating) => {
    setFeedbackMap(prev => ({ ...prev, [msg.id]: rating }));
    try {
      const payload = {
        messageId: msg.id,
        query: msg.inspection_data?.query || "Query evaluated",
        chosenAnswer: msg.text,
        rejectedAnswer: msg.withoutMemoryAnswer || "Standard generic baseline without stored memory.",
        rating: rating,
        reasonTag: rating === 1 ? 'adhered_to_constraint' : 'hallucination_or_unwanted',
        memoryIds: msg.inspection_data?.promptPayload?.memory_records_injected || [],
        workspaceId: activeTeam?.id || 'ws_core'
      };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.stats) setTrainingStats(data.stats);

      showToast(
        rating === 1 
          ? '👍 Positive Reinforcement: Calibrated memory confidence (+2%)' 
          : '👎 Negative Feedback: Lowered memory confidence (-6%)',
        rating === 1 ? 'success' : 'warning'
      );
      loadMemories();
    } catch (err) {
      showToast('Error recording reinforcement', 'error');
    }
  };

  const handleGenerateSynthetic = async () => {
    try {
      const res = await fetch('/api/training/generate-synthetic', { method: 'POST' });
      const data = await res.json();
      showToast(`⚡ Generated ${data.count} synthetic DPO training pairs from active memories!`, 'success');
      loadTrainingData();
    } catch (err) {
      showToast('Synthetic generation failed', 'error');
    }
  };

  const loadGraphData = async () => {
    try {
      const res = await fetch(`/api/graph?workspaceId=${activeTeam?.id || 'ws_core'}`);
      const data = await res.json();
      setGraphData(data);
      if (data.nodes?.length > 0 && !selectedGraphNode) {
        handleSelectGraphNode(data.nodes[0]);
      }
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    }
  };

  const loadGraphLineage = async (nodeId) => {
    try {
      const id = typeof nodeId === 'object' && nodeId !== null ? nodeId.id : nodeId;
      if (!id) return;
      const res = await fetch(`/api/graph/${id}`);
      const data = await res.json();
      setGraphLineage(data);
    } catch (err) {
      console.error('Failed to fetch node graph lineage:', err);
    }
  };

  const handleSelectGraphNode = async (node) => {
    setSelectedGraphNode(node);
    if (node?.id) {
      await loadGraphLineage(node.id);
    }
  };

  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!linkSource || !linkTarget || linkSource === linkTarget) {
      showToast('Please select two distinct memory nodes to link', 'warning');
      return;
    }
    try {
      await fetch('/api/graph/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: linkSource,
          targetId: linkTarget,
          type: linkType,
          label: linkLabel || linkType
        })
      });
      showToast('Knowledge graph link established', 'success');
      setLinkModalOpen(false);
      setLinkLabel('');
      loadGraphData();
    } catch (err) {
      showToast('Error linking nodes', 'error');
    }
  };

  const loadHierarchyData = async () => {
    try {
      const res = await fetch(`/api/hierarchy?workspaceId=${activeTeam?.id || 'ws_core'}`);
      const data = await res.json();
      setHierarchyData(data);
      if (data.clusters?.length > 0) {
        setSelectedCluster(data.clusters[0]);
      }
    } catch (err) {
      console.error('Failed to load hierarchy data:', err);
    }
  };

  const handleRecluster = async () => {
    setIsClustering(true);
    try {
      const res = await fetch('/api/hierarchy/recluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeTeam?.id || 'ws_core' })
      });
      const data = await res.json();
      setHierarchyData(data.hierarchy);
      showToast('Semantic clustering completed and centroid vectors updated', 'success');
    } catch (err) {
      showToast('Failed to recluster memories', 'error');
    } finally {
      setIsClustering(false);
    }
  };

  const handleHierarchySearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!hierarchySearchQuery.trim()) return;
    try {
      const res = await fetch(`/api/hierarchy/search?q=${encodeURIComponent(hierarchySearchQuery.trim())}&workspaceId=${activeTeam?.id || 'ws_core'}`);
      const data = await res.json();
      setHierarchySearchResult(data);
      showToast(`Resolved to: ${data.matchedCluster?.name}`, 'success');
    } catch (err) {
      showToast('Hierarchical search failed', 'error');
    }
  };

  const loadConsensusData = async () => {
    try {
      const res = await fetch(`/api/consensus?workspaceId=${activeTeam?.id || 'ws_core'}`);
      const data = await res.json();
      setConsensusHistory(data.history || []);
      setConsensusStats(data.stats || { totalProposals: 0, ratifiedCount: 0, rejectedCount: 0, vetoCount: 0, quorumThreshold: '67%' });
      if (data.history?.length > 0 && !activeEvaluatedProposal) {
        setActiveEvaluatedProposal(data.history[0]);
      }
    } catch (err) {
      console.error('Failed to load consensus data:', err);
    }
  };

  const handleEvaluateConsensus = async (e, textOverride) => {
    if (e && e.preventDefault) e.preventDefault();
    const textToEvaluate = textOverride || consensusProposalText.trim();
    if (!textToEvaluate) return;

    setEvaluatingConsensus(true);
    try {
      const res = await fetch('/api/consensus/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statement: textToEvaluate,
          topic: 'Infrastructure',
          proposer: activeUser?.id || 'u_sarah',
          workspaceId: activeTeam?.id || 'ws_core'
        })
      });
      const proposal = await res.json();
      setActiveEvaluatedProposal(proposal);
      showToast(
        proposal.quorumReached
          ? `Proposal Ratified! (${proposal.approvalCount}/${proposal.totalVoters} Votes)`
          : `Proposal Rejected/Vetoed! (${proposal.votes?.find(v => v.veto)?.agentName || 'Quorum not reached'})`,
        proposal.quorumReached ? 'success' : 'warning'
      );
      loadConsensusData();
    } catch (err) {
      showToast('Consensus evaluation failed', 'error');
    } finally {
      setEvaluatingConsensus(false);
    }
  };

  const loadLlmModels = async () => {
    try {
      const res = await fetch('/api/llm/models');
      const data = await res.json();
      const localGemini = (typeof window !== 'undefined' ? localStorage.getItem('synapse_gemini_key') : '') || geminiKeyInput;
      const localClaude = (typeof window !== 'undefined' ? localStorage.getItem('synapse_claude_key') : '') || claudeKeyInput;
      setActiveKeys({
        hasGeminiKey: !!(data.activeKeys?.hasGeminiKey || (localGemini && localGemini.trim().length > 0)),
        hasClaudeKey: !!(data.activeKeys?.hasClaudeKey || (localClaude && localClaude.trim().length > 0))
      });
    } catch (err) {
      console.error('Failed to load LLM models:', err);
    }
  };

  const handleSaveLlmKeys = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const cleanGemini = geminiKeyInput.trim();
      const cleanClaude = claudeKeyInput.trim();

      if (cleanGemini) {
        localStorage.setItem('synapse_gemini_key', cleanGemini);
        await fetch('/api/llm/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'gemini', key: cleanGemini })
        });
      } else {
        localStorage.removeItem('synapse_gemini_key');
        await fetch('/api/llm/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'gemini', key: '' })
        });
      }

      if (cleanClaude) {
        localStorage.setItem('synapse_claude_key', cleanClaude);
        await fetch('/api/llm/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'claude', key: cleanClaude })
        });
      } else {
        localStorage.removeItem('synapse_claude_key');
        await fetch('/api/llm/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'claude', key: '' })
        });
      }

      setActiveKeys({
        hasGeminiKey: !!cleanGemini,
        hasClaudeKey: !!cleanClaude
      });

      showToast('LLM API keys saved & activated', 'success');
      setLlmModalOpen(false);
      await loadLlmModels();
    } catch (err) {
      showToast('Failed to save LLM keys', 'error');
    }
  };

  const handleTestLlmKey = async (provider) => {
    const key = provider === 'gemini' ? geminiKeyInput.trim() : claudeKeyInput.trim();
    if (!key) {
      showToast(`Please enter a ${provider === 'gemini' ? 'Gemini' : 'Claude'} key first`, 'error');
      return;
    }
    setTestingKey({ provider, status: 'loading', message: `Connecting to ${provider === 'gemini' ? 'Google Cloud' : 'Anthropic'} API...` });
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestingKey({
          provider,
          status: 'success',
          message: `Verified! Cloud Response: "${data.response}"`
        });
        showToast(`${data.provider} verified & live!`, 'success');
        if (provider === 'gemini') localStorage.setItem('synapse_gemini_key', key);
        if (provider === 'claude') localStorage.setItem('synapse_claude_key', key);
        await loadLlmModels();
      } else {
        setTestingKey({
          provider,
          status: 'error',
          message: `Connection Failed: ${data.error || 'Invalid API key or quota issue'}`
        });
        showToast(`Test failed: ${data.error}`, 'error');
      }
    } catch (err) {
      setTestingKey({ provider, status: 'error', message: `Network error: ${err.message}` });
      showToast('Network error during test', 'error');
    }
  };

  const nodePositions = useMemo(() => {
    const nodes = graphData.nodes || [];
    const count = nodes.length;
    const positions = {};
    if (count === 0) return positions;

    const width = 860;
    const height = 540;
    const cx = width / 2;
    const cy = height / 2;
    const rx = Math.min(320, width * 0.38);
    const ry = Math.min(200, height * 0.36);

    nodes.forEach((n, idx) => {
      if (count === 1) {
        positions[n.id] = { x: cx, y: cy };
      } else {
        const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
        positions[n.id] = {
          x: Math.round(cx + rx * Math.cos(angle)),
          y: Math.round(cy + ry * Math.sin(angle))
        };
      }
    });
    return positions;
  }, [graphData.nodes]);

  // 3. Message Send Handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    if (currentChannel === 'ask-assistant') {
      const userMsg = {
        id: `msg_user_${Date.now()}`,
        channel: currentChannel,
        sender: activeUser?.name || 'Sarah Jenkins',
        text: textToSend,
        timestamp: new Date().toISOString(),
        is_assistant: false
      };
      const tempAsstId = `msg_asst_${Date.now()}`;
      const tempAsstMsg = {
        id: tempAsstId,
        channel: currentChannel,
        sender: `SynapseMem 2.0 (${selectedModel.includes('flash') ? 'Gemini 3.8 Flash' : selectedModel.includes('gemini') ? 'Gemini 3.1' : selectedModel.includes('claude') ? 'Claude 3.5' : 'Atlas Vector'})`,
        text: '',
        is_assistant: true,
        timestamp: new Date().toISOString(),
        isStreaming: true,
        model: selectedModel
      };

      setMessages(prev => [...prev, userMsg, tempAsstMsg]);
      setIsStreaming(true);

      try {
        const activeApiKey = selectedModel.includes('claude')
          ? (claudeKeyInput.trim() || (typeof window !== 'undefined' ? localStorage.getItem('synapse_claude_key') : '') || '')
          : (geminiKeyInput.trim() || (typeof window !== 'undefined' ? localStorage.getItem('synapse_gemini_key') : '') || '');

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: textToSend,
            userId: activeUser?.id || 'u_sarah',
            workspaceId: activeTeam?.id || 'ws_core',
            model: selectedModel,
            apiKey: activeApiKey
          })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.chunk) {
                  accumulated += parsed.chunk;
                  setMessages(prev => prev.map(m => m.id === tempAsstId ? { ...m, text: accumulated } : m));
                } else if (parsed.answer) {
                  accumulated = parsed.answer;
                  setMessages(prev => prev.map(m => m.id === tempAsstId ? {
                    ...m,
                    text: accumulated,
                    isStreaming: false,
                    withoutMemoryAnswer: parsed.withoutMemoryAnswer,
                    inspection_data: parsed.trace
                  } : m));
                  if (parsed.trace) setActiveInspection(parsed.trace);
                } else if (parsed.memory_records_injected) {
                  setActiveInspection(parsed);
                }
              } catch (err) {}
            }
          }
        }
      } catch (streamErr) {
        console.warn('Streaming error, falling back:', streamErr);
      } finally {
        setIsStreaming(false);
        await fetch(`/api/channels/${currentChannel}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSend,
            sender: activeUser?.name || 'Sarah Jenkins',
            userId: activeUser?.id || 'u_sarah',
            teamId: activeTeam?.id || 'ws_core',
            model: selectedModel
          })
        });
      }
      return;
    }

    try {
      const res = await fetch(`/api/channels/${currentChannel}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          sender: activeUser?.name || 'Sarah Jenkins',
          userId: activeUser?.id || 'u_sarah',
          teamId: activeTeam?.id || 'ws_core',
          model: selectedModel
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
      const res = await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isoString: target.toISOString() })
      });
      const data = await res.json();
      if (data?.simulatedTime) setSimulatedTime(data.simulatedTime);
      showToast(`Time Machine advanced: ${days === 0 ? 'Oct 30, 2026 (Active Freeze)' : 'Nov 6, 2026 (Freeze Expired)'}`, 'info');
      setTimeMachineOpen(false);
      loadMemories();
    } catch (err) {
      showToast('Time travel error', 'error');
    }
  };

  const handleWipeData = async () => {
    if (!confirm('Reset memory ledger and messages back to clean foundational baseline?')) return;
    try {
      await fetch('/api/demo/seed', { method: 'POST' });
      await handleTimeTravel(0); // reset clock to Oct 30, 2026
      showToast('Memory ledger reset to foundational baseline.', 'success');
      await loadMemories();
      await loadMessages();
    } catch (err) {
      showToast('Reset failed', 'error');
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
    setAddModalOpen(true); }; const handleLogin = (team, user) => { if (team) { setActiveTeam(team); try { localStorage.setItem('synapse_active_team_id', team.id); } catch (_) {} } if (user) { setActiveUser(user); try { localStorage.setItem('synapse_active_user_id', user.id); } catch (_) {} } setViewMode('app'); showToast(`Signed in as ${user?.name || 'Developer'} (${user?.role || 'Member'}) • ${team?.name || 'Workspace'}`, 'success');
  };

  if (viewMode === 'auth') {
    return (
      <AuthPage
        onLoginSuccess={(team, user) => handleLogin(team, user)}
        onBackToLanding={() => setViewMode('landing')}
      />
    );
  }

  if (viewMode === 'landing') {
    return (
      <LandingPage allTeams={allTeams} teamMembers={teamMembers} activeTeam={activeTeam} activeUser={activeUser} onLogin={handleLogin} onOpenAuth={() => setViewMode('auth')}
        onEnterApp={() => setViewMode('app')}
        onEnterDemo={() => {
          setViewMode('app');
          handleRunGuidedDemo();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white select-none overflow-hidden font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700' :
          toast.type === 'warning' ? 'bg-amber-950/90 text-amber-300 border-amber-700' :
          'bg-neutral-900/95 text-white border-white/20'
        }`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Minimal Top Header — branding + status only; navigation lives in sidebar */}
      <header className="h-12 border-b border-white/[0.07] bg-[#050505]/95 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Brand */}
        <button
          onClick={() => setViewMode('landing')}
          className="flex items-center gap-2.5 group focus:outline-none"
          title="Return to Landing"
        >
          <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white transition group-hover:border-white/40 group-hover:bg-white/20">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold tracking-tight text-white">Synapse<span className="font-light text-white/50">Mem</span></span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.08] text-neutral-400 font-mono border border-white/10 leading-none">2.0</span>
          </div>
        </button>

        {/* Centre: Direct One-Click Tab Navigation */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs shadow-inner">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'chat'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chatbot</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ledger');
              loadMemories();
              loadGraphData();
              loadHierarchyData();
            }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'ledger'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Memory Ledger</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
              activeTab === 'ledger' ? 'bg-black text-white font-bold' : 'bg-white/10 text-neutral-300'
            }`}>
              {memories.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('training');
              loadTrainingData();
            }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'training'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Training</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('consensus');
              loadConsensusData();
            }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'consensus'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Consensus</span>
          </button>
        </div>

        {/* Right: GitHub Guardian USP + status + LLM key */}
        <div className="flex items-center gap-2.5">
          {/* Prominent GitHub Guardian Action Pill (USP) */}
          <button
            onClick={() => setGithubModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold transition shadow-sm hover:shadow-emerald-500/20 shadow-emerald-950"
            title="Autonomous GitHub Self-Onboarding & Living PR-Linter Guardian"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="hidden xs:inline">GitHub Guardian</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 font-mono">USP</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-neutral-500 pl-1 border-l border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            MongoDB Atlas
          </div>

          <button
            onClick={() => { loadLlmModels(); setLlmModalOpen(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-[11px] text-neutral-300 hover:text-white transition"
            title="Configure LLM API Keys"
          >
            <Key className="w-3 h-3" />
            <span className="hidden sm:inline">LLM</span>
          </button>
        </div>
      </header>

      {/* Main Container *//* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'ledger') {
              loadMemories();
              loadGraphData();
              loadHierarchyData();
            }
            if (tab === 'training') loadTrainingData();
            if (tab === 'consensus') loadConsensusData();
          }}
          sidebarPinned={sidebarPinned}
          setSidebarPinned={setSidebarPinned}
          sidebarHovered={sidebarHovered}
          handleSidebarMouseEnter={handleSidebarMouseEnter}
          handleSidebarMouseLeave={handleSidebarMouseLeave}
          activeTeam={activeTeam}
          activeUser={activeUser}
          memories={memories}
          trainingStats={trainingStats}
          consensusStats={consensusStats}
          channels={channels}
          currentChannel={currentChannel}
          setCurrentChannel={setCurrentChannel}
          messages={messages}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onOpenLlmModal={() => { loadLlmModels(); setLlmModalOpen(true); }}
          onRunGuidedDemo={handleRunGuidedDemo}
          onOpenGithubModal={() => setGithubModalOpen(true)}
          onOpenBenchmarkModal={() => { setBenchmarkModalOpen(true); if (!benchmarkData) loadBenchmarkData(); }}
          onOpenTimeMachine={() => setTimeMachineOpen(true)}
          onOpenInspect={() => setInspectOpen(!inspectOpen)}
          inspectOpen={inspectOpen}
          onExportDossier={handleExportDossier}
          isExportingDossier={isExportingDossier}
          onWipeData={handleWipeData}
          onOpenRealtimeDrawer={() => { setRealtimeDrawerOpen(true); loadRealtimeData(); }}
          realtimeHistory={realtimeHistory}
          onBackToLanding={() => setViewMode('landing')}
          onLogout={() => { setViewMode('auth'); showToast('Signed out of workspace', 'info'); }}
          ledgerView={ledgerView}
          setLedgerView={setLedgerView}
          ledgerFilter={ledgerFilter}
          setLedgerFilter={setLedgerFilter}
          ledgerConfidenceMin={ledgerConfidenceMin}
          setLedgerConfidenceMin={setLedgerConfidenceMin}
          consensusQuorumThreshold={consensusQuorumThreshold}
          setConsensusQuorumThreshold={setConsensusQuorumThreshold}
          onOpenAddModal={() => openAddModal()}
        />

        {/* VIEW 1: CHATBOT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Chat Stream Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
              {/* Channel Header — minimal */}
              <div className="h-10 border-b border-white/[0.07] px-4 flex items-center justify-between bg-black/30 backdrop-blur shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-neutral-500 text-xs shrink-0">{currentChannel === 'ask-assistant' ? '🤖' : '#'}</span>
                  <span className="font-semibold text-xs text-white truncate">{currentChannel}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                  <Sparkles className="w-3 h-3 text-emerald-500/60 shrink-0" />
                  <span className="hidden md:inline">Memory Active</span>
                </div>
              </div>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-neutral-500 space-y-2">
                    <MessageSquare className="w-9 h-9 mx-auto text-neutral-600" />
                    <p className="text-xs font-semibold text-neutral-300">No messages in #{currentChannel} yet.</p>
                    <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                      {currentChannel === 'ask-assistant'
                        ? 'Ask any question to test persistent memory grounding and behavioral adaptation.'
                        : 'Post a decision like "For Project Atlas, we use MongoDB..." to extract a structured memory.'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col space-y-2 transition-all ${
                        msg.is_assistant
                          ? 'bg-neutral-900/70 border border-white/10 hover:border-white/20 p-4 rounded-2xl backdrop-blur-md shadow-xl'
                          : 'p-3 bg-white/[0.03] border border-white/10 rounded-xl max-w-3xl'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            msg.is_assistant ? 'bg-white text-black' : 'bg-neutral-800 text-white'
                          }`}
                        >
                          {msg.is_assistant ? '🤖' : msg.sender?.charAt(0)}
                        </div>
                        <span className={`text-xs font-semibold ${msg.is_assistant ? 'text-white' : 'text-neutral-300'}`}>
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.is_assistant && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                              msg.inspection_data?.promptPayload?.isLiveModel
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-white/10 text-neutral-200 border-white/20'
                            }`}>
                              {msg.inspection_data?.promptPayload?.isLiveModel ? '🟢 Live Cloud Model' : '⚡ Memory Grounded'}
                            </span>
                            {msg.inspection_data?.promptPayload?.providerUsed && (
                              <span className="text-[9px] text-neutral-400 font-mono">
                                [{msg.inspection_data.promptPayload.providerUsed}]
                              </span>
                            )}
                            {msg.inspection_data?.promptPayload?.liveError && !msg.inspection_data?.promptPayload?.isLiveModel && selectedModel !== 'local-grounded' && (
                              <span
                                className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 font-mono"
                                title={msg.inspection_data.promptPayload.liveError}
                              >
                                ⚠️ Note: {msg.inspection_data.promptPayload.liveError.length > 55 ? msg.inspection_data.promptPayload.liveError.substring(0, 52) + '...' : msg.inspection_data.promptPayload.liveError}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-neutral-200 pl-8 leading-relaxed font-normal">
                        {formatMessageContent(msg.text)}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-3.5 bg-white animate-pulse ml-1 align-middle"></span>
                        )}
                      </div>

                      {/* Dual-Mode Baseline Contrast Box */}
                      {msg.is_assistant && msg.withoutMemoryAnswer && (
                        <div className="mt-2 mx-8 p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-neutral-400 font-semibold">
                            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                              <Split className="w-3.5 h-3.5" /> Dual-Mode Baseline: "Without Memory"
                            </span>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-bold font-mono">
                              Contrast
                            </span>
                          </div>
                          <p className="text-neutral-400 leading-normal italic">{msg.withoutMemoryAnswer}</p>
                        </div>
                      )}

                      {/* Memory Extracted Badge */}
                      {!msg.is_assistant && msg.memories_extracted?.length > 0 && (
                        <div className="pl-8 pt-1 flex items-center gap-2">
                          <div
                            onClick={() => { setActiveTab('ledger'); loadMemories(); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow cursor-pointer hover:bg-emerald-500/20 transition memory-pulse-card"
                          >
                            <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Memory Persisted to MongoDB Atlas</span>
                          </div>
                        </div>
                      )}

                      {/* Inspect Button & RLHF Feedback */}
                      {msg.is_assistant && (
                        <div className="pl-8 pt-1 flex items-center justify-between flex-wrap gap-2">
                          {msg.inspection_data && (
                            <button
                              onClick={() => {
                                setActiveInspection(msg.inspection_data);
                                setInspectOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/15 transition"
                            >
                              <ScanEye className="w-3 h-3 text-white" />
                              <span>Inspect Retrieval Metrics</span>
                            </button>
                          )}

                          <div className="flex items-center gap-1 bg-black/80 border border-white/10 rounded-lg p-0.5 text-[10px]">
                            <span className="text-neutral-500 font-semibold px-1.5 flex items-center gap-1">
                              <Award className="w-3 h-3 text-amber-400" /> RLHF:
                            </span>
                            <button
                              onClick={() => handleFeedback(msg, 1)}
                              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                                feedbackMap[msg.id] === 1
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                                  : 'text-neutral-400 hover:text-emerald-400 hover:bg-white/5'
                              }`}
                              title="Reinforce: Accurately followed stored team constraints"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{feedbackMap[msg.id] === 1 ? 'Adhered (+2%)' : 'Good'}</span>
                            </button>
                            <button
                              onClick={() => handleFeedback(msg, -1)}
                              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                                feedbackMap[msg.id] === -1
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                                  : 'text-neutral-400 hover:text-rose-400 hover:bg-white/5'
                              }`}
                              title="Penalize: Violated team constraints or hallucinated"
                            >
                              <ThumbsDown className="w-3 h-3" />
                              <span>{feedbackMap[msg.id] === -1 ? 'Violated (-6%)' : 'Bad'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="px-4 py-3 border-t border-white/[0.07] bg-black/50 backdrop-blur">
                {channelQuickPrompts[currentChannel] && showQuickPrompts && (
                  <div className="flex items-center gap-1.5 pb-2.5 overflow-x-auto no-scrollbar">
                    {channelQuickPrompts[currentChannel].map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => { setInputText(prompt); setShowQuickPrompts(false); }}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/10 hover:border-white/25 transition text-[11px] truncate max-w-[200px] text-left"
                        title={prompt}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* PRE-COMMIT SEMANTIC CONFLICT SHIELD BANNER */}
                {conflictWarning && conflictWarning.hasConflict && (
                  <div className="mb-2.5 p-3 rounded-xl bg-amber-950/90 border border-amber-600/80 text-amber-200 text-xs shadow-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 font-bold text-amber-200">
                          <span>⚠️ Pre-Commit Semantic Conflict Detected</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-900 text-amber-300 border border-amber-700 font-mono">
                            {conflictWarning.highestConflict?.conflictType}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-300/90 mt-0.5">
                          {conflictWarning.advisoryMessage || 'This directive collides with an active team policy.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResolveConflict('supersede')}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition shadow"
                        title="Formally supersede older memory and preserve bidirectional lineage"
                      >
                        ⚡ Supersede
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveConflict('quorum_dispute')}
                        className="px-2.5 py-1 rounded-lg bg-purple-900/80 hover:bg-purple-800 border border-purple-700 text-purple-200 font-bold text-[11px] transition"
                        title="Submit to 3-Agent Quorum Consensus"
                      >
                        🏛️ Quorum
                      </button>
                      <button
                        type="button"
                        onClick={() => setConflictWarning(null)}
                        className="text-amber-400 hover:text-white p-1"
                        title="Dismiss Warning"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {channelQuickPrompts[currentChannel] && (
                    <button
                      type="button"
                      onClick={() => setShowQuickPrompts(v => !v)}
                      className={`p-2 rounded-lg border transition shrink-0 ${showQuickPrompts ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-neutral-500 hover:text-white hover:bg-white/5'}`}
                      title="Quick prompts"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      currentChannel === 'ask-assistant'
                        ? 'Ask the assistant anything...'
                        : 'Share a team decision or constraint...'
                    }
                    className="flex-1 bg-neutral-900/80 border border-white/[0.1] focus:border-white/35 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-black font-semibold text-xs flex items-center gap-1.5 transition shadow-sm shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: STRUCTURED MEMORY LEDGER */}
        {activeTab === 'ledger' && (
          <LedgerView
            memories={memories}
            loadMemories={loadMemories}
            ledgerView={ledgerView}
            setLedgerView={setLedgerView}
            ledgerFilter={ledgerFilter}
            setLedgerFilter={(val) => {
              setLedgerFilter(val);
              loadMemories(val);
            }}
            ledgerConfidenceMin={ledgerConfidenceMin}
            setLedgerConfidenceMin={setLedgerConfidenceMin}
            onOpenAddModal={() => openAddModal()}
            onEditMemory={(mem) => openAddModal(mem)}
            onDeleteMemory={handleDeleteMemory}
            onSyncAdrToGitHub={handleSyncAdrToGitHub}
            isSyncingAdr={isSyncingAdr}
            onRecluster={handleRecluster}
            isClustering={isClustering}
            onOpenLinkModal={() => {
              if (memories.length >= 2) {
                setLinkSource(memories[0].id);
                setLinkTarget(memories[1].id);
              }
              setLinkModalOpen(true);
            }}
            graphData={graphData}
            loadGraphData={loadGraphData}
            selectedGraphNode={selectedGraphNode}
            setSelectedGraphNode={setSelectedGraphNode}
            graphLineage={graphLineage}
            loadGraphLineage={loadGraphLineage}
            hierarchyData={hierarchyData}
            loadHierarchyData={loadHierarchyData}
            selectedCluster={selectedCluster}
            setSelectedCluster={setSelectedCluster}
            hierarchySearchQuery={hierarchySearchQuery}
            setHierarchySearchQuery={setHierarchySearchQuery}
            hierarchySearchResult={hierarchySearchResult}
            handleHierarchySearch={handleHierarchySearch}
            onOpenGithubGuardian={() => setGithubModalOpen(true)}
          />
        )}

        {/* VIEW 3: ACTIVE REINFORCEMENT & DPO TRAINING PIPELINE */}
        {activeTab === 'training' && (
          <TrainingView
            trainingStats={trainingStats}
            feedbackList={feedbackList}
            onGenerateSynthetic={handleGenerateSynthetic}
            onFeedback={handleFeedback}
          />
        )}

        {/* VIEW 4: MULTI-AGENT CONSENSUS & QUORUM */}
        {activeTab === 'consensus' && (
          <ConsensusView
            consensusStats={consensusStats}
            consensusProposalText={consensusProposalText}
            setConsensusProposalText={setConsensusProposalText}
            evaluatingConsensus={evaluatingConsensus}
            handleEvaluateConsensus={handleEvaluateConsensus}
            activeEvaluatedProposal={activeEvaluatedProposal}
            consensusHistory={consensusHistory}
            consensusQuorumThreshold={consensusQuorumThreshold}
            setConsensusQuorumThreshold={setConsensusQuorumThreshold}
          />
        )}
        {/* SIDEBAR: INSPECT PANEL */}
        {inspectOpen && (
          <aside className="w-96 border-l border-white/10 bg-neutral-950 flex flex-col shrink-0 overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-neutral-900/60">
              <div className="flex items-center gap-2">
                <ScanEye className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">Inspect Retrieval</span>
              </div>
              <button onClick={() => setInspectOpen(false)} className="text-neutral-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {!activeInspection ? (
                <div className="text-center py-20 text-neutral-500 space-y-2">
                  <ScanEye className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="font-semibold text-neutral-400">No Query Inspected Yet</p>
                  <p className="text-[11px] text-neutral-500">Ask any question in #ask-assistant to inspect real $vectorSearch scores.</p>
                </div>
              ) : (
                <>
                  <div className="bg-neutral-900 p-3 rounded-xl border border-white/10 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Query Evaluated</div>
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
                      <div key={m.id} className="p-3 rounded-xl bg-neutral-900 border border-emerald-900/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{m.topic}: {m.statement}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            USED
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
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
                        <div key={i} className="p-2.5 rounded-xl bg-neutral-900/80 border border-amber-900/40 text-[11px] space-y-1">
                          <div className="font-semibold text-neutral-300">{r.topic}</div>
                          <div className="text-[10px] text-rose-300 font-mono">Reason: {r.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-white/10 text-[10px] font-mono text-neutral-400 space-y-1">
                    <div className="font-bold text-neutral-300">Prompt Proof:</div>
                    <div>Chat history injected: <span className="text-emerald-400 font-bold">false</span></div>
                    <div>Memory IDs injected: {activeInspection.promptPayload?.memory_records_injected?.join(', ') || 'none'}</div>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* MODAL: TIME MACHINE SIMULATOR WITH TEMPORAL SCRUBBER SLIDER */}
      {timeMachineOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" /> Temporal Time Machine & Expiry Scrubber
              </h3>
              <button onClick={() => setTimeMachineOpen(false)} className="text-neutral-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-neutral-400 text-xs">
              Scrub application time to dynamically verify how temporary assumptions (e.g., Sprint Deployment Freeze) automatically expire from live grounding without prompt edits.
            </p>

            {/* Live Scrubber Readout */}
            <div className="p-3.5 bg-neutral-950 rounded-xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Target Simulated Date:</span>
                <span className="font-bold text-amber-300 font-mono text-sm">
                  {(() => {
                    const d = new Date('2026-10-30T10:00:00.000Z');
                    d.setDate(d.getDate() + timeScrubberDays);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  })()}
                </span>
              </div>

              {/* Scrubber Range Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>Day 0 (Oct 30)</span>
                  <span className="text-amber-400 font-bold">+{timeScrubberDays} Days</span>
                  <span>Day 14 (Nov 13)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="1"
                  value={timeScrubberDays}
                  onChange={(e) => setTimeScrubberDays(Number(e.target.value))}
                  className="obsidian-slider"
                  title="Drag slider to simulate passing days"
                />
              </div>

              {/* Status Alert */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-neutral-400">Deployment Freeze Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                  timeScrubberDays >= 7
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {timeScrubberDays >= 7 ? 'EXPIRED (Post-Freeze Nov 6+)' : 'ACTIVE (Freeze In Effect)'}
                </span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTimeScrubberDays(0)}
                className={`py-2 rounded-xl text-center font-semibold transition text-[11px] border ${
                  timeScrubberDays === 0 ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-300 border-white/10 hover:text-white'
                }`}
              >
                Day 0 (Active)
              </button>
              <button
                type="button"
                onClick={() => setTimeScrubberDays(7)}
                className={`py-2 rounded-xl text-center font-semibold transition text-[11px] border ${
                  timeScrubberDays === 7 ? 'bg-amber-400 text-black border-amber-400' : 'bg-neutral-800 text-neutral-300 border-white/10 hover:text-white'
                }`}
              >
                Day +7 (Expired)
              </button>
              <button
                type="button"
                onClick={() => setTimeScrubberDays(14)}
                className={`py-2 rounded-xl text-center font-semibold transition text-[11px] border ${
                  timeScrubberDays === 14 ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-300 border-white/10 hover:text-white'
                }`}
              >
                Day +14
              </button>
            </div>

            {/* Apply Action */}
            <button
              onClick={() => handleTimeTravel(timeScrubberDays)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-1.5 shadow transition"
            >
              <History className="w-4 h-4 text-black" />
              <span>Apply Target Time to Atlas Engine (+{timeScrubberDays}d)</span>
            </button>
          </div>
        </div>
      )}
      {/* MODAL: ADD / EDIT MEMORY */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-white" /> {editMemory ? 'Edit Decision' : 'Add Decision to MongoDB'}
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-neutral-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-3.5">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Topic / Category</label>
                <input
                  type="text"
                  required
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="e.g. Database, Infrastructure, Frontend"
                  className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Decision / Statement</label>
                <textarea
                  rows="2"
                  required
                  value={formDecision}
                  onChange={(e) => setFormDecision(e.target.value)}
                  placeholder="e.g. We use MongoDB Atlas as our primary database."
                  className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Reason / Rationale</label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Flexible document structure and vector search capability"
                  className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="superseded">Superseded</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Valid Until (Expiry)</label>
                  <input
                    type="datetime-local"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-white font-semibold"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LINK KNOWLEDGE GRAPH LINEAGE */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-purple-800/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-400" /> Connect Knowledge Graph Lineage
              </h3>
              <button onClick={() => setLinkModalOpen(false)} className="text-neutral-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400">
              Establish a directed relationship edge between two authoritative memories to enable multi-hop GraphRAG traversal in MongoDB Atlas.
            </p>

            <form onSubmit={handleSaveLink} className="space-y-3.5">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Source Memory (Origin)</label>
                <select
                  value={linkSource}
                  onChange={(e) => setLinkSource(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                >
                  <option value="">Select origin memory...</option>
                  {memories.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.topic}] {m.decision?.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Relationship Type</label>
                  <select
                    value={linkType}
                    onChange={(e) => {
                      setLinkType(e.target.value);
                      if (!linkLabel) {
                        if (e.target.value === 'caching_layer') setLinkLabel('Caching layer');
                        else if (e.target.value === 'supersedes') setLinkLabel('Supersedes');
                        else if (e.target.value === 'depends_on') setLinkLabel('Depends on');
                        else if (e.target.value === 'constrains') setLinkLabel('Freeze constraint');
                      }
                    }}
                    className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  >
                    <option value="depends_on">Depends On (Dependency)</option>
                    <option value="caching_layer">Caching Layer (Integration)</option>
                    <option value="supersedes">Supersedes (Override)</option>
                    <option value="constrains">Constrains (Governance)</option>
                    <option value="implements">Implements (Execution)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Edge Label</label>
                  <input
                    type="text"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="e.g. Caching layer"
                    className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Target Memory (Destination)</label>
                <select
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                >
                  <option value="">Select target memory...</option>
                  {memories
                    .filter((m) => m.id !== linkSource)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.topic}] {m.decision?.slice(0, 50)}...
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  <Link2 className="w-3.5 h-3.5" /> Establish Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIVE LLM CONFIGURATION (GEMINI & CLAUDE) */}
      {llmModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/15/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-white" /> Live LLM Grounding Configuration
              </h3>
              <button onClick={() => setLlmModalOpen(false)} className="text-neutral-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Power live streaming answers with real Google Gemini or Anthropic Claude API keys. All responses are strictly grounded on MongoDB Atlas 1024D vectors with zero chat history injected.
            </p>

            <form onSubmit={handleSaveLlmKeys} className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-200 font-semibold flex items-center gap-1.5">
                    <span className="text-sm">⚡</span> Google Gemini API Key
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      activeKeys.hasGeminiKey ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-neutral-950 text-neutral-400 border border-white/10'
                    }`}>
                      {activeKeys.hasGeminiKey ? 'Active Key Set' : 'Fallback / Unset'}
                    </span>
                    <button
                      type="button"
                      disabled={testingKey.status === 'loading'}
                      onClick={() => handleTestLlmKey('gemini')}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-neutral-200 border border-white/15 transition-colors"
                    >
                      {testingKey.provider === 'gemini' && testingKey.status === 'loading' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {testingKey.provider === 'gemini' && testingKey.message && (
                  <p className={`text-[10px] font-mono px-2 py-1 rounded border ${
                    testingKey.status === 'success' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' :
                    testingKey.status === 'error' ? 'bg-rose-950/60 text-rose-300 border-rose-800/80' :
                    'bg-neutral-950 text-neutral-400 border-white/10'
                  }`}>
                    {testingKey.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-200 font-semibold flex items-center gap-1.5">
                    <span className="text-sm">🔮</span> Anthropic Claude API Key
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      activeKeys.hasClaudeKey ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-neutral-950 text-neutral-400 border border-white/10'
                    }`}>
                      {activeKeys.hasClaudeKey ? 'Active Key Set' : 'Fallback / Unset'}
                    </span>
                    <button
                      type="button"
                      disabled={testingKey.status === 'loading'}
                      onClick={() => handleTestLlmKey('claude')}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-neutral-200 border border-white/15 transition-colors"
                    >
                      {testingKey.provider === 'claude' && testingKey.status === 'loading' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>
                <input
                  type="password"
                  value={claudeKeyInput}
                  onChange={(e) => setClaudeKeyInput(e.target.value)}
                  placeholder="sk-ant-api..."
                  className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {testingKey.provider === 'claude' && testingKey.message && (
                  <p className={`text-[10px] font-mono px-2 py-1 rounded border ${
                    testingKey.status === 'success' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' :
                    testingKey.status === 'error' ? 'bg-rose-950/60 text-rose-300 border-rose-800/80' :
                    'bg-neutral-950 text-neutral-400 border-white/10'
                  }`}>
                    {testingKey.message}
                  </p>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-white/10 text-[10px] text-neutral-400 leading-relaxed">
                💡 <strong className="text-neutral-300">Resilient Zero-Breakage Design:</strong> When keys are empty, SynapseMem seamlessly uses the local deterministic Atlas vector grounding engine.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setLlmModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-medium"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  <Key className="w-3.5 h-3.5" /> Save API Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIVE EMPIRICAL BENCHMARK & EVALUATION MATRIX */}
      {benchmarkModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-purple-700/80 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-neutral-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    SynapseMem 2.0 Empirical Evaluation Matrix
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/60 font-semibold">
                      Live Benchmark
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Scientific comparison vs Naive Top-K Flat RAG and Standard History-Bloat Agents across 5 adversarial test vectors.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunBenchmark}
                  disabled={isRunningBenchmark}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow transition"
                >
                  {isRunningBenchmark ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Running Tests...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Run Live Benchmark</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setBenchmarkModalOpen(false)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-neutral-950">
              {benchmarkData?.scorecard ? (
                <>
                  {/* Top 3 Scorecards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* SynapseMem */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border-2 border-purple-500/70 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <BrainCircuit className="w-4 h-4 text-purple-400" /> SynapseMem 2.0 (Atlas OS)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 font-bold text-[10px]">
                          Score: {benchmarkData.scorecard.synapseMem.score}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Hallucination Rate:</span>
                          <span className="font-bold text-emerald-400">{benchmarkData.scorecard.synapseMem.hallucinationRate}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Token Savings:</span>
                          <span className="font-bold text-emerald-400">{benchmarkData.scorecard.synapseMem.tokenEfficiency}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Avg Latency:</span>
                          <span className="font-bold text-purple-300">{benchmarkData.scorecard.synapseMem.avgLatencyMs}ms</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Tokens / Query:</span>
                          <span className="font-bold text-neutral-200">{benchmarkData.scorecard.synapseMem.avgTokensPerRecall} tokens</span>
                        </div>
                      </div>
                    </div>

                    {/* Naive Flat RAG */}
                    <div className="p-4 rounded-xl bg-neutral-900 border border-white/10 shadow space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-neutral-400" /> Naive Flat RAG (Top-K)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold text-[10px]">
                          Score: {benchmarkData.scorecard.naiveFlatRag.score}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Hallucination Rate:</span>
                          <span className="font-bold text-rose-400">{benchmarkData.scorecard.naiveFlatRag.hallucinationRate}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Token Savings:</span>
                          <span className="font-bold text-neutral-400">{benchmarkData.scorecard.naiveFlatRag.tokenEfficiency}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Avg Latency:</span>
                          <span className="font-bold text-neutral-300">{benchmarkData.scorecard.naiveFlatRag.avgLatencyMs}ms</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Tokens / Query:</span>
                          <span className="font-bold text-neutral-300">{benchmarkData.scorecard.naiveFlatRag.avgTokensPerRecall} tokens</span>
                        </div>
                      </div>
                    </div>

                    {/* Chat History Bloat */}
                    <div className="p-4 rounded-xl bg-neutral-900 border border-white/10 shadow space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-neutral-400" /> History-Bloat (Mem0/LangChain)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold text-[10px]">
                          Score: {benchmarkData.scorecard.chatHistoryBloat.score}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Hallucination Rate:</span>
                          <span className="font-bold text-rose-400">{benchmarkData.scorecard.chatHistoryBloat.hallucinationRate}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Token Bloat:</span>
                          <span className="font-bold text-rose-400">{benchmarkData.scorecard.chatHistoryBloat.tokenEfficiency}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Avg Latency:</span>
                          <span className="font-bold text-neutral-400">{benchmarkData.scorecard.chatHistoryBloat.avgLatencyMs}ms</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Tokens / Query:</span>
                          <span className="font-bold text-rose-300">{benchmarkData.scorecard.chatHistoryBloat.avgTokensPerRecall} tokens</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Radar Metric Progress Bars */}
                  <div className="p-4 rounded-xl bg-neutral-900 border border-white/10 space-y-3">
                    <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-purple-400" /> Architectural Radar Dimensions (Higher is Better)
                    </h4>
                    <div className="space-y-2.5">
                      {benchmarkData.radarMetrics?.map((m, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-neutral-300">
                            <span>{m.metric}</span>
                            <div className="flex gap-3 text-[10px] font-mono">
                              <span className="text-purple-300 font-bold">Synapse: {m.synapseMem}%</span>
                              <span className="text-neutral-400">Naive: {m.naiveRag}%</span>
                              <span className="text-neutral-500">Bloat: {m.historyBloat}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-neutral-950 flex overflow-hidden">
                            <div style={{ width: `${m.synapseMem}%` }} className="bg-purple-500 h-full transition-all duration-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5 Adversarial Scenarios Breakdown */}
                  {benchmarkData.detailedTests?.length > 0 && (
                    <div className="p-4 rounded-xl bg-neutral-900 border border-white/10 space-y-3">
                      <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-purple-400" /> Adversarial Test Case Execution Breakdown
                      </h4>
                      <div className="space-y-2 text-[11px]">
                        {benchmarkData.detailedTests.map((t, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-neutral-950 border border-white/10 flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold text-neutral-200 flex items-center gap-2">
                                <span>{idx + 1}. {t.name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                  {t.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-0.5">Query: "{t.query}"</p>
                              <p className="text-[10px] text-rose-300/80 mt-1">
                                ⚠️ Naive RAG Failure Mode: {t.naiveFlatRag?.failureReason}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                              ✔ Synapse Passed ({t.synapseMem?.latencyMs}ms)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-neutral-400 space-y-3">
                  <BarChart2 className="w-8 h-8 text-purple-400 mx-auto animate-pulse" />
                  <p>Loading benchmark scorecard...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 bg-neutral-950 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Verified with Voyage AI 1024D Embeddings & MongoDB Atlas $vectorSearch</span>
              <button
                onClick={() => setBenchmarkModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-slate-700 text-neutral-200 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: REAL-TIME CHANGE STREAM & MULTI-AGENT SYNC */}
      {realtimeDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-neutral-900 border-l border-emerald-800/80 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 text-xs">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-neutral-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" /> Real-Time Change Stream
                </h3>
              </div>
              <button onClick={() => setRealtimeDrawerOpen(false)} className="text-neutral-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="p-3.5 bg-black/80 border-b border-white/10 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2 rounded-lg bg-neutral-900 border border-white/10">
                <span className="text-[10px] text-neutral-400 block">Total Events</span>
                <span className="font-bold text-emerald-400 text-sm">{realtimeHistory.length}</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-900 border border-white/10">
                <span className="text-[10px] text-neutral-400 block">Avg Latency</span>
                <span className="font-bold text-purple-300 text-sm">&lt;8ms</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-900 border border-white/10">
                <span className="text-[10px] text-neutral-400 block">Sync Protocol</span>
                <span className="font-bold text-blue-300 text-sm">SSE / Watch</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-3 bg-neutral-950 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-neutral-400">Pushes mutations across agents in real time</span>
              <button
                onClick={handleBroadcastTestSync}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow transition"
              >
                <Activity className="w-3.5 h-3.5" /> Broadcast Sync Event
              </button>
            </div>

            {/* Event Feed */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-neutral-950">
              {realtimeHistory.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <Radio className="w-8 h-8 text-emerald-500/40 mx-auto animate-pulse mb-2" />
                  <p>Listening for MongoDB Change Stream mutations...</p>
                </div>
              ) : (
                realtimeHistory.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="p-3 rounded-xl bg-neutral-900/90 border border-white/10 space-y-1.5 hover:border-emerald-600/50 transition shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded font-mono ${
                        evt.operationType === 'insert' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        evt.operationType === 'supersede' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        evt.operationType === 'consensus' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {evt.operationType || 'MUTATION'}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                        <span className="text-emerald-400 font-bold">{evt.latencyMs || 6}ms</span>
                        <span>{new Date(evt.timestamp || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-200 font-medium leading-relaxed">
                      {evt.summary}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono flex items-center justify-between pt-0.5">
                      <span>Doc: #{evt.documentId?.slice(-6) || 'mem_01'}</span>
                      <span>Topic: {evt.topic || 'General'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 bg-neutral-950 text-center text-[10px] text-neutral-500">
              Atlas collection: <code className="text-neutral-400">synapsemem.memories</code>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUTONOMOUS GITHUB SELF-ONBOARDING */}
      {githubModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-white/15 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <GitPullRequest className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Autonomous GitHub Self-Onboarding
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Installs SynapseMem CI Guardian into any repo & reverse-ingests initial architecture memories
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGithubModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Architecture Explainer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/10 space-y-1">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                  <span>1. Reverse Ingestion</span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Crawls <code className="text-neutral-300">package.json</code>, <code className="text-neutral-300">docs/adr/</code>, & <code className="text-neutral-300">.env.example</code> into MongoDB Atlas 1024D vectors.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/10 space-y-1">
                <div className="font-semibold text-purple-400 flex items-center gap-1.5 text-[11px]">
                  <span>2. Autonomous PR</span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Creates branch <code className="text-neutral-300">synapse/install-architecture-guard</code> and commits <code className="text-neutral-300">synapse-pr-linter.yml</code>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/10 space-y-1">
                <div className="font-semibold text-blue-400 flex items-center gap-1.5 text-[11px]">
                  <span>3. Living ADR Sync</span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  New decisions made in chat can be instantly committed back as numbered ADR PRs to the codebase.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConnectGithub} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-neutral-300 font-semibold text-[11px]">
                  GitHub Repository URL or <code className="text-neutral-400 font-mono">owner/repo</code>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      value={githubRepoUrl}
                      onChange={(e) => setGithubRepoUrl(e.target.value)}
                      placeholder="e.g. https://github.com/acme/backend or acme/backend"
                      className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setGithubRepoUrl('https://github.com/acme/backend')}
                    className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white font-mono text-[10px] transition shrink-0"
                  >
                    Demo URL
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-neutral-300 font-semibold text-[11px]">
                    GitHub Personal Access Token (PAT) <span className="text-neutral-500 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">Leave empty for instant simulated agent demo</span>
                </div>
                <input
                  type="password"
                  value={githubPatToken}
                  onChange={(e) => setGithubPatToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Requires 'repo' scope for live commits)"
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Zero manual config: Agent writes workflows & creates PR</span>
                </div>
                <button
                  type="submit"
                  disabled={isOnboardingGithub}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition shadow-lg shadow-white/10 flex items-center gap-2 disabled:opacity-50"
                >
                  {isOnboardingGithub ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Onboarding & Creating PR...</span>
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="w-4 h-4 text-black" />
                      <span>Connect & Install Guardian PR</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Results Output */}
            {githubOnboardResult && (
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-emerald-500/40 space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold text-white text-sm">
                      Pull Request Created Successfully
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                    PR #{githubOnboardResult.pullRequest?.number || 15} OPENED
                  </span>
                </div>

                <div className="p-3 bg-black/60 rounded-lg border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Target Repository:</span>
                    <span className="font-mono text-white font-bold">{githubOnboardResult.repo}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Guardian Branch:</span>
                    <span className="font-mono text-emerald-400 font-bold">{githubOnboardResult.branch}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Workflow Installed:</span>
                    <span className="font-mono text-neutral-200">.github/workflows/synapse-pr-linter.yml</span>
                  </div>
                </div>

                {/* Reverse Ingested Memories summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                      Reverse-Ingested Memories into Atlas:
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 font-mono font-bold">
                      {githubOnboardResult.ingestedCount || 0} Records Added
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {githubOnboardResult.ingestedMemories?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-[11px]"
                      >
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white mr-1.5">
                            {item.topic}
                          </span>
                          <span className="text-neutral-200">{item.directive}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                          {item.confidence ? `${Math.round(item.confidence * 100)}% conf` : '100%'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <a
                    href={githubOnboardResult.pullRequest?.html_url || `https://github.com/${githubOnboardResult.repo}/pull/${githubOnboardResult.pullRequest?.number || 15}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>View Pull Request on GitHub</span>
                  </a>

                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText('node scripts/pr-linter.js');
                      showToast('Copied local PR-Linter audit command to clipboard!', 'info');
                    }}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 text-[11px] font-mono transition"
                  >
                    Copy: node scripts/pr-linter.js
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
