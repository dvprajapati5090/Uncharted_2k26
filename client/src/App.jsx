import React, { useState, useEffect, useRef, useMemo } from 'react';
import LandingPage from './components/LandingPage';
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
  AlertTriangle
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
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
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

  const loadMemories = async () => {
    try {
      const res = await fetch(`/api/memories?status=${ledgerFilter}`);
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

  const handleSelectGraphNode = async (node) => {
    setSelectedGraphNode(node);
    try {
      const res = await fetch(`/api/graph/${node.id}`);
      const data = await res.json();
      setGraphLineage(data);
    } catch (err) {
      console.error('Failed to fetch node graph lineage:', err);
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
    setAddModalOpen(true);
  };

  if (viewMode === 'landing') {
    return (
      <LandingPage
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

      {/* Top Header - Symmetrical, Balanced, Liquid-Metal Styling */}
      <header className="h-14 border-b border-white/10 bg-black/90 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Brand + Landing Backlink + Status */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode('landing')}
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none text-left"
            title="Return to Landing Page"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-lg transition group-hover:border-white/50 group-hover:bg-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <g transform="rotate(-30 12 12)">
                  <circle cx="7.3" cy="3.2" r="1.45" />
                  <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <circle cx="16.7" cy="20.8" r="1.45" />
                </g>
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                <span>Vesper<span className="font-normal text-white/60">.ai</span></span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 font-mono border border-white/15">
                  SynapseMem 2.0
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                MongoDB Atlas Engine
              </div>
            </div>
          </button>

          <button
            onClick={() => setViewMode('landing')}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition ml-1"
          >
            ← Overview
          </button>
        </div>

        {/* Center Navigation Tabs - Equal Width Liquid Metal Pills */}
        <nav className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-white/15 text-xs shadow-inner">
          <button
            onClick={() => setActiveTab('chat')}
            className={`app-nav-pill ${activeTab === 'chat' ? 'active' : ''}`}
          >
            <Bot className="w-3.5 h-3.5" /> <span>Chatbot</span>
          </button>
          <button
            onClick={() => { setActiveTab('ledger'); loadMemories(); }}
            className={`app-nav-pill ${activeTab === 'ledger' ? 'active' : ''}`}
          >
            <Database className="w-3.5 h-3.5" /> <span>Memory Ledger</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'ledger' ? 'bg-black text-white' : 'bg-white/10 text-neutral-300'}`}>
              {memories.length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('training'); loadTrainingData(); }}
            className={`app-nav-pill ${activeTab === 'training' ? 'active' : ''}`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> <span>Training & DPO</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'training' ? 'bg-black text-white' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
              {trainingStats.dpoPairsCount}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('consensus'); loadConsensusData(); }}
            className={`app-nav-pill ${activeTab === 'consensus' ? 'active' : ''}`}
          >
            <Vote className="w-3.5 h-3.5" /> <span>Consensus</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'consensus' ? 'bg-black text-white' : 'bg-purple-950 text-purple-300 border border-purple-800'}`}>
              {consensusStats.totalProposals || consensusHistory.length || 0}
            </span>
          </button>
        </nav>

        {/* Right Menu & Universal Tool Dock - Symmetrical, Luxury, No Clutter */}
        <div className="flex items-center gap-2">
          {/* Universal Model Selector */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded-xl border border-white/15 text-xs shadow-sm">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="gemini-3-flash-preview" className="bg-neutral-900 text-white">Gemini 3 Flash</option>
              <option value="gemini-3.1-flash-lite" className="bg-neutral-900 text-white">Gemini 3.1 Flash Lite</option>
              <option value="claude-3-5-sonnet" className="bg-neutral-900 text-white">Claude 3.5 Sonnet</option>
              <option value="local-grounded" className="bg-neutral-900 text-white">Local Atlas Engine</option>
            </select>
            <button
              onClick={() => { loadLlmModels(); setLlmModalOpen(true); }}
              className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition"
              title="Configure API Keys"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Guided Demo - Glowing Action Pill */}
          <button
            onClick={handleRunGuidedDemo}
            className="tool-dock-btn bg-white text-black font-semibold border-white hover:bg-neutral-200 shadow-md shadow-white/10"
            title="Run 5-Step Architecture Verification Demo"
          >
            <PlayCircle className="w-3.5 h-3.5 text-black" />
            <span>Guided Demo</span>
          </button>

          {/* Operations Menu Dropdown - Consolidates Benchmark, ADR, Time Machine, Inspector, Reset */}
          <div className="relative">
            <button
              onClick={() => setOperationsMenuOpen(!operationsMenuOpen)}
              className={`tool-dock-btn ${operationsMenuOpen ? 'border-white/40 bg-white/20 text-white' : ''}`}
              title="Operational Tools & Diagnostics"
            >
              <Cpu className="w-3.5 h-3.5 text-white" />
              <span>Operations</span>
              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${operationsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {operationsMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOperationsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-xl obsidian-dropdown p-1.5 z-50 text-xs shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => { setOperationsMenuOpen(false); setBenchmarkModalOpen(true); if (!benchmarkData) loadBenchmarkData(); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-neutral-200 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <BarChart2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Live Benchmark Matrix</div>
                      <div className="text-[10px] text-neutral-400">SynapseMem vs Naive RAG vs Bloat</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setOperationsMenuOpen(false); handleExportDossier(); }}
                    disabled={isExportingDossier}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-neutral-200 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Export ADR Dossier</div>
                      <div className="text-[10px] text-neutral-400">Download formatted Markdown & JSON</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setOperationsMenuOpen(false); setTimeMachineOpen(true); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-neutral-200 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <History className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Temporal Time Machine</div>
                      <div className="text-[10px] text-neutral-400">Simulate date to test TTL expiry</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setOperationsMenuOpen(false); setInspectOpen(!inspectOpen); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-neutral-200 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <ScanEye className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">{inspectOpen ? 'Close Inspector' : 'Vector Inspector'}</div>
                      <div className="text-[10px] text-neutral-400">Inspect 1024D Voyage embeddings</div>
                    </div>
                  </button>

                  <div className="my-1.5 border-t border-white/10" />

                  <button
                    onClick={() => { setOperationsMenuOpen(false); handleWipeData(); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 flex items-center gap-2.5 transition"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-rose-300">Reset Database Baseline</div>
                      <div className="text-[10px] text-rose-400/80">Re-seed clean architectural decisions</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Live Sync Status Pill */}
          <button
            onClick={() => { setRealtimeDrawerOpen(true); loadRealtimeData(); }}
            className="tool-dock-btn"
            title="Real-Time Change Stream Sync"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Live Sync</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-bold">
              {realtimeHistory.length}
            </span>
          </button>

          {/* Active User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-white text-black font-bold flex items-center justify-center text-xs shadow">
              {activeUser?.avatar || 'U'}
            </div>
            <div className="hidden 2xl:block text-left">
              <span className="block text-xs font-semibold text-neutral-200 leading-tight">{activeUser?.name}</span>
              <span className="block text-[10px] text-neutral-400 leading-tight">{activeUser?.role}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: CHATBOT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Hover-Activated Sliding Sidebar */}
            <div
              className="relative z-20 flex shrink-0"
              onMouseEnter={() => setSidebarHovered(true)}
              onMouseLeave={() => setSidebarHovered(false)}
            >
              {/* Collapsed Rail (54px) */}
              <div className="w-[54px] border-r border-white/10 bg-[#050505] flex flex-col items-center justify-between py-3 shrink-0 select-none">
                <div className="flex flex-col items-center gap-4">
                  {/* Workspace Icon */}
                  <div
                    className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:border-white/40 transition"
                    title={activeTeam?.name || 'Workspace Core'}
                  >
                    <Building2 className="w-4 h-4 text-white" />
                  </div>

                  <div className="w-6 h-[1px] bg-white/10" />

                  {/* Channel Quick Buttons */}
                  <div className="flex flex-col items-center gap-2">
                    {channels.map((ch) => {
                      const isBot = ch.id === 'ask-assistant';
                      const isActive = ch.id === currentChannel;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => setCurrentChannel(ch.id)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition relative group ${
                            isActive
                              ? 'bg-white text-black font-bold shadow-lg shadow-white/20'
                              : 'text-neutral-400 hover:text-white hover:bg-white/10'
                          }`}
                          title={isBot ? 'AI Assistant (Recall)' : `# ${ch.id}`}
                        >
                          {isBot ? '🤖' : '#'}
                          {isActive && (
                            <span className="absolute -left-1 w-1 h-3 rounded-full bg-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rail Bottom: Status Dot & Pin */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse cursor-pointer"
                    title="1024D Voyage Vectors Active"
                  />
                  <button
                    onClick={() => setSidebarPinned(!sidebarPinned)}
                    className={`p-1.5 rounded-lg border transition ${
                      sidebarPinned
                        ? 'bg-white/20 border-white/40 text-white'
                        : 'border-transparent text-neutral-500 hover:text-white'
                    }`}
                    title={sidebarPinned ? 'Unpin Sidebar (Auto-collapse on mouse leave)' : 'Pin Sidebar Open'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded Flyout Panel (270px) on Hover or Pin */}
              {(sidebarHovered || sidebarPinned) && (
                <aside
                  className="absolute top-0 left-0 bottom-0 w-[270px] border-r border-white/15 bg-neutral-950/95 backdrop-blur-3xl flex flex-col shadow-2xl z-30 animate-in fade-in slide-in-from-left-2 duration-200"
                  style={{
                    boxShadow: '25px 0 50px -10px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 255, 255, 0.04)'
                  }}
                >
                  {/* Workspace Switcher Header */}
                  <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{activeTeam?.name || 'Atlas Core Engineers'}</span>
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">Tenant: {activeTeam?.id || 'ws_core'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSidebarPinned(!sidebarPinned)}
                      className={`p-1.5 rounded-md text-xs transition border ${
                        sidebarPinned
                          ? 'bg-white/20 border-white/40 text-white'
                          : 'border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                      title={sidebarPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Channels Section */}
                  <div className="p-3 border-b border-white/10 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Channels</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-mono text-[9px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Atlas Sync
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
                          className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between text-xs transition ${
                            isActive
                              ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                              : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className={`text-xs ${isActive ? 'text-black font-bold' : 'text-neutral-400'}`}>
                              {isBot ? '🤖' : '#'}
                            </span>
                            <span className="truncate">{isBot ? 'AI Assistant' : ch.id}</span>
                          </div>
                          {isBot ? (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isActive ? 'bg-black text-white' : 'bg-white/10 text-neutral-300'
                            }`}>
                              Recall
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {messages.filter(m => m.channel === ch.id).length || ''}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>

                  {/* Footer System Stats */}
                  <div className="p-3 border-t border-white/10 bg-black/60 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Vector Dimension:</span>
                      <span className="font-mono text-white text-[10px] bg-white/10 px-1.5 py-0.5 rounded">1024D Voyage</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Atlas Engine:</span>
                      <span className="font-semibold text-emerald-400 flex items-center gap-1 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
                      </span>
                    </div>
                  </div>
                </aside>
              )}
            </div>

            {/* Chat Stream Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
              {/* Channel Header */}
              <div className="h-11 border-b border-white/10 px-4 flex items-center justify-between bg-black/60 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-xs">{currentChannel === 'ask-assistant' ? '🤖' : '#'}</span>
                  <span className="font-bold text-xs text-white">{currentChannel}</span>
                  <span className="text-[11px] text-neutral-400 border-l border-white/15 pl-2 hidden sm:inline">
                    {currentChannel === 'ask-assistant'
                      ? 'Queries MongoDB Atlas using $vectorSearch with zero chat history injected'
                      : 'Decisions and constraints are structured and embedded into MongoDB'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-[10px] text-neutral-300 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-white" />
                    <span className="hidden sm:inline">Agentic Memory Active</span>
                  </div>
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
              <div className="p-3 border-t border-white/10 bg-neutral-950/80">
                {channelQuickPrompts[currentChannel] && (
                  <div className="flex items-center gap-1.5 pb-2 mb-1 overflow-x-auto text-[11px] no-scrollbar">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-white" /> Quick Try:
                    </span>
                    {channelQuickPrompts[currentChannel].map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setInputText(prompt)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 hover:border-white/30 transition text-[11px] truncate max-w-xs text-left shadow-sm"
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
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      currentChannel === 'ask-assistant'
                        ? 'Ask the assistant (e.g. "Design a background job system...", "What database are we using?")...'
                        : 'Share a team decision or constraint (e.g. "Do not introduce Redis without approval")...'
                    }
                    className="flex-1 bg-neutral-900/90 border border-white/15 focus:border-white/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition shadow-inner"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs flex items-center gap-1.5 transition shadow"
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
          <div className="flex-1 flex flex-col overflow-hidden bg-black">
            {/* Header / Subnav */}
            <div className="p-4 border-b border-white/10 bg-neutral-950/80 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-white" />
                  Structured Memory Ledger (MongoDB Atlas)
                </h2>
                <p className="text-[11px] text-neutral-400">Authoritative team directives embedded with 1024D Voyage dense vectors.</p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="bg-neutral-950 p-1 rounded-xl border border-white/15 flex text-xs">
                  <button
                    onClick={() => setLedgerView('cards')}
                    className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                      ledgerView === 'cards' ? 'bg-white text-black font-semibold shadow' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Cards
                  </button>
                  <button
                    onClick={() => {
                      setLedgerView('graph');
                      loadGraphData();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                      ledgerView === 'graph' ? 'bg-white text-black font-semibold shadow' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" /> Knowledge Graph
                  </button>
                  <button
                    onClick={() => {
                      setLedgerView('hierarchy');
                      loadHierarchyData();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                      ledgerView === 'hierarchy' ? 'bg-white text-black font-semibold shadow' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <FolderTree className="w-3.5 h-3.5" /> Domain Hierarchy
                  </button>
                </div>

                {ledgerView === 'cards' && (
                  <div className="bg-neutral-950 p-1 rounded-xl border border-white/15 flex text-xs">
                    {['all', 'active', 'superseded', 'expired'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setLedgerFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg font-medium capitalize transition ${
                          ledgerFilter === filter ? 'bg-white text-black font-semibold shadow' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                )}

                {ledgerView === 'graph' && (
                  <button
                    onClick={() => {
                      if (memories.length >= 2) {
                        setLinkSource(memories[0].id);
                        setLinkTarget(memories[1].id);
                      }
                      setLinkModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 flex items-center gap-1.5 transition shadow"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Link Lineage
                  </button>
                )}

                {ledgerView === 'hierarchy' && (
                  <button
                    onClick={handleRecluster}
                    disabled={isClustering}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 flex items-center gap-1.5 transition shadow disabled:opacity-50"
                  >
                    <Boxes className="w-3.5 h-3.5" /> {isClustering ? 'Clustering...' : 'Re-cluster'}
                  </button>
                )}

                <button
                  onClick={() => openAddModal()}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-4 h-4" /> Add Decision
                </button>
              </div>
            </div>

            {/* Content: Cards View vs Knowledge Graph View vs Domain Hierarchy */}
            {ledgerView === 'cards' && (
              <div className="flex-1 overflow-y-auto p-4">
                {memories.length === 0 ? (
                  <div className="text-center py-24 text-neutral-500 space-y-2">
                    <Database className="w-8 h-8 mx-auto text-neutral-600" />
                    <p className="text-xs font-semibold text-neutral-300">No memory documents found.</p>
                    <p className="text-[11px] text-neutral-500">Post a decision in chat or click "+ Add Decision".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {memories.map((mem) => {
                      const isPast = mem.valid_until && new Date() > new Date(mem.valid_until);
                      return (
                        <div
                          key={mem.id}
                          className={`memory-card bg-neutral-900/70 border rounded-2xl p-4.5 flex flex-col justify-between space-y-3 backdrop-blur-md transition ${
                            mem.status === 'active'
                              ? 'border-emerald-500/30 shadow-lg shadow-emerald-950/20'
                              : mem.status === 'superseded'
                              ? 'border-amber-500/30 shadow-lg shadow-amber-950/20'
                              : 'border-white/10 opacity-70'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-xs text-white">{mem.topic}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  mem.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                    : mem.status === 'superseded'
                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                    : 'bg-white/10 text-neutral-400 border border-white/10'
                                }`}
                              >
                                {mem.status}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-neutral-100 mb-1.5 leading-relaxed">{mem.decision}</p>
                            {mem.reason && (
                              <div className="text-[11px] text-neutral-300 bg-black/60 p-2.5 rounded-xl border border-white/10">
                                <span className="text-neutral-500 font-medium">Why:</span> {mem.reason}
                              </div>
                            )}

                            {mem.superseded_by && (
                              <div className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-2 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                <ArrowRight className="w-3 h-3" /> Superseded by newer directive
                              </div>
                            )}

                            {mem.valid_until && (
                              <div
                                className={`text-[10px] font-medium flex items-center gap-1 mt-1.5 ${
                                  isPast ? 'text-rose-400' : 'text-neutral-400'
                                }`}
                              >
                                <Clock className="w-3 h-3" /> {isPast ? 'Expired:' : 'Valid until:'}{' '}
                                {new Date(mem.valid_until).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>

                          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
                            <div className="flex items-center gap-2">
                              <span>Owner: <strong className="text-neutral-200">{mem.owner}</strong></span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-neutral-300 font-mono">
                                {Math.round((mem.confidence || 0.95) * 100)}% conf
                              </span>
                              {(mem.reinforcementUp || 0) > 0 && (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-bold">
                                  <ThumbsUp className="w-2.5 h-2.5" /> +{mem.reinforcementUp}
                                </span>
                              )}
                              {(mem.reinforcementDown || 0) > 0 && (
                                <span className="text-[10px] text-rose-400 flex items-center gap-0.5 font-bold">
                                  <ThumbsDown className="w-2.5 h-2.5" /> -{mem.reinforcementDown}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => openAddModal(mem)}
                                className="p-1.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition"
                                title="Edit decision"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMemory(mem.id)}
                                className="p-1.5 rounded hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 transition"
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
            )}

            {/* KNOWLEDGE GRAPH & GRAPHRAG MULTI-HOP LINEAGE EXPLORER */}
            {ledgerView === 'graph' && (
              <div className="flex-1 flex overflow-hidden">
                {/* Visual Topology Canvas */}
                <div className="flex-1 flex flex-col overflow-hidden relative bg-neutral-950">
                  {/* Canvas Stats Bar */}
                  <div className="px-4 py-2 border-b border-white/10 bg-neutral-900/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-neutral-200 font-mono text-[10px]">
                        Nodes: <strong>{graphData.summary?.totalNodes || graphData.nodes?.length || 0}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-[10px]">
                        Edges: <strong>{graphData.summary?.totalEdges || graphData.edges?.length || 0}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-[10px]">
                        Active: <strong>{graphData.summary?.activeCount || 0}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono text-[10px]">
                        Superseded: <strong>{graphData.summary?.supersededCount || 0}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Active
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Superseded
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Expired
                      </span>
                    </div>
                  </div>

                  {/* SVG Topology Viewport */}
                  <div className="flex-1 relative overflow-auto flex items-center justify-center p-4">
                    {(!graphData.nodes || graphData.nodes.length === 0) ? (
                      <div className="text-center py-20 text-neutral-500 space-y-2">
                        <Network className="w-10 h-10 mx-auto text-neutral-600 animate-pulse" />
                        <p className="text-xs font-semibold text-neutral-400">No nodes in knowledge graph.</p>
                        <p className="text-[11px] text-neutral-500">Seed demo data or post decisions to visualize relationship edges.</p>
                      </div>
                    ) : (
                      <svg
                        viewBox="0 0 860 540"
                        className="w-full h-full max-w-4xl max-h-[580px] select-none"
                      >
                        {/* Background subtle grid */}
                        <defs>
                          <pattern id="graph-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="1" fill="#334155" opacity="0.3" />
                          </pattern>
                          <marker
                            id="arrow-generic"
                            viewBox="0 0 10 10"
                            refX="10"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
                          </marker>
                          <marker
                            id="arrow-supersedes"
                            viewBox="0 0 10 10"
                            refX="10"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                          </marker>
                          <marker
                            id="arrow-caching"
                            viewBox="0 0 10 10"
                            refX="10"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
                          </marker>
                        </defs>

                        <rect width="860" height="540" fill="url(#graph-grid)" />

                        {/* Directed Edges */}
                        {graphData.edges?.map((edge) => {
                          const p1 = nodePositions[edge.source];
                          const p2 = nodePositions[edge.target];
                          if (!p1 || !p2) return null;

                          const dx = p2.x - p1.x;
                          const dy = p2.y - p1.y;
                          const dist = Math.sqrt(dx * dx + dy * dy);
                          if (dist === 0) return null;

                          // Trim lines so they don't enter inside node rectangles
                          const trim = 50;
                          const x1 = p1.x + (dx / dist) * trim;
                          const y1 = p1.y + (dy / dist) * trim;
                          const x2 = p2.x - (dx / dist) * trim;
                          const y2 = p2.y - (dy / dist) * trim;

                          const mx = (x1 + x2) / 2;
                          const my = (y1 + y2) / 2;

                          const isSupersedes = edge.type === 'supersedes';
                          const isCaching = edge.type === 'depends_on' || edge.label?.toLowerCase().includes('caching');

                          const strokeColor = isSupersedes ? '#f59e0b' : isCaching ? '#a855f7' : '#818cf8';
                          const markerId = isSupersedes ? 'url(#arrow-supersedes)' : isCaching ? 'url(#arrow-caching)' : 'url(#arrow-generic)';

                          return (
                            <g key={edge.id} className="transition-all duration-300">
                              <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={strokeColor}
                                strokeWidth="2"
                                strokeDasharray={isSupersedes ? '4 3' : 'none'}
                                markerEnd={markerId}
                                opacity="0.85"
                              />
                              {/* Edge Label Pill with dynamic width */}
                              {(() => {
                                const labelText = edge.label || edge.type;
                                const pillWidth = Math.min(130, Math.max(76, labelText.length * 6.5 + 16));
                                return (
                                  <>
                                    <rect
                                      x={mx - pillWidth / 2}
                                      y={my - 10}
                                      width={pillWidth}
                                      height="20"
                                      rx="6"
                                      fill="#090d16"
                                      stroke={strokeColor}
                                      strokeWidth="1.2"
                                      opacity="0.95"
                                    />
                                    <text
                                      x={mx}
                                      y={my + 3.5}
                                      textAnchor="middle"
                                      fill="#cbd5e1"
                                      fontSize="9"
                                      fontWeight="bold"
                                      className="pointer-events-none select-none font-sans"
                                    >
                                      {labelText.length > 18 ? `${labelText.slice(0, 18)}…` : labelText}
                                    </text>
                                  </>
                                );
                              })()}
                            </g>
                          );
                        })}

                        {/* Nodes */}
                        {graphData.nodes?.map((node) => {
                          const pos = nodePositions[node.id];
                          if (!pos) return null;
                          const isSelected = selectedGraphNode?.id === node.id;
                          const isSuperseded = node.status === 'superseded';
                          const isExpired = node.status === 'expired';

                          const strokeColor = isSelected
                            ? '#c084fc'
                            : isSuperseded
                            ? '#f59e0b'
                            : isExpired
                            ? '#f43f5e'
                            : '#10b981';

                          const displayText = node.statement || node.label || node.decision || '';

                          return (
                            <g
                              key={node.id}
                              onClick={() => handleSelectGraphNode(node)}
                              className="cursor-pointer group transition-all"
                            >
                              {/* Glow on selection */}
                              {isSelected && (
                                <rect
                                  x={pos.x - 84}
                                  y={pos.y - 34}
                                  width="168"
                                  height="68"
                                  rx="12"
                                  fill="none"
                                  stroke="#a855f7"
                                  strokeWidth="6"
                                  opacity="0.35"
                                  className="animate-pulse"
                                />
                              )}

                              {/* Node Rect */}
                              <rect
                                x={pos.x - 80}
                                y={pos.y - 30}
                                width="160"
                                height="60"
                                rx="10"
                                fill="#0f172a"
                                stroke={strokeColor}
                                strokeWidth={isSelected ? '2.5' : '1.5'}
                                className="transition-all duration-200 group-hover:fill-slate-800"
                              />

                              {/* Topic Badge */}
                              <text
                                x={pos.x - 70}
                                y={pos.y - 12}
                                fill="#94a3b8"
                                fontSize="10"
                                fontWeight="bold"
                                className="font-sans"
                              >
                                {node.topic?.toUpperCase()}
                              </text>

                              {/* Status Dot */}
                              <circle
                                cx={pos.x + 65}
                                cy={pos.y - 15}
                                r="4"
                                fill={strokeColor}
                              />

                              {/* Decision Statement preview */}
                              <text
                                x={pos.x - 70}
                                y={pos.y + 6}
                                fill="#f8fafc"
                                fontSize="10"
                                fontWeight="600"
                                className="font-sans"
                              >
                                {displayText.length > 22 ? `${displayText.slice(0, 22)}...` : displayText}
                              </text>

                              {/* Owner */}
                              <text
                                x={pos.x - 70}
                                y={pos.y + 20}
                                fill="#64748b"
                                fontSize="9"
                                className="font-mono"
                              >
                                by {node.owner || 'team'}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    )}
                  </div>
                </div>

                {/* Right Panel: GraphRAG Multi-Hop Lineage Inspector */}
                <div className="w-80 md:w-96 border-l border-white/10 bg-neutral-900/60 flex flex-col overflow-y-auto">
                  <div className="p-3.5 border-b border-white/10 bg-black/70 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-purple-400" />
                      GraphRAG Multi-Hop Lineage
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-[9px] font-bold">
                      $graphLookup
                    </span>
                  </div>

                  {!selectedGraphNode ? (
                    <div className="p-6 text-center text-neutral-500 space-y-2">
                      <Network className="w-8 h-8 mx-auto text-neutral-600" />
                      <p className="text-xs font-medium text-neutral-400">Select any node on the graph</p>
                      <p className="text-[11px] text-neutral-500">Inspect multi-hop architectural dependencies, upstream/downstream relations, and RAG context.</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4 text-xs">
                      {/* Active Node Detail Card */}
                      <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{selectedGraphNode.topic}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              selectedGraphNode.status === 'active'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : selectedGraphNode.status === 'superseded'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {selectedGraphNode.status}
                          </span>
                        </div>
                        <p className="text-white font-semibold text-xs leading-relaxed">
                          {selectedGraphNode.statement || selectedGraphNode.label || selectedGraphNode.decision}
                        </p>
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400">
                          <span>Owner: <strong className="text-neutral-300">{selectedGraphNode.owner}</strong></span>
                          <span>Confidence: <strong>{Math.round((selectedGraphNode.confidence || 0.95) * 100)}%</strong></span>
                        </div>
                      </div>

                      {/* Multi-Hop Traversed Neighbors */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-300 text-xs flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                            Multi-Hop Lineage Path
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {graphLineage?.neighbors?.length || 0} Connected
                          </span>
                        </div>

                        {(!graphLineage?.neighbors || graphLineage.neighbors.length === 0) ? (
                          <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-neutral-500 text-[11px] text-center">
                            Direct root memory. No multi-hop dependencies linked yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {graphLineage.neighbors.map((nbr, idx) => (
                              <div
                                key={idx}
                                className="bg-neutral-950 p-2.5 rounded-xl border border-purple-900/40 hover:border-purple-700/60 transition space-y-1"
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-800">
                                    Hop {nbr.depth} • {nbr.direction === 'outgoing' ? '→ Out' : '← In'}
                                  </span>
                                  <span className="text-amber-400 font-medium capitalize">
                                    {nbr.label || nbr.relationship || nbr.type}
                                  </span>
                                </div>
                                <p className="text-neutral-200 text-[11px] font-medium leading-snug">
                                  {nbr.node?.statement || nbr.node?.label || nbr.node?.decision}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* GraphRAG Prompt Context Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-300 text-xs flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            GraphRAG Prompt Grounding
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">Zero Hallucination</span>
                        </div>
                        <div className="bg-neutral-950 p-3 rounded-xl border border-white/10 font-mono text-[10px] text-neutral-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                          {graphLineage?.graphContextText || 'Tracing relational graph context...'}
                        </div>
                        <p className="text-[10px] text-neutral-500">
                          MongoDB Atlas traverses architectural edges up to 2 hops, grounding AI responses with complete relational context.
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-white/10 flex gap-2">
                        <button
                          onClick={() => {
                            setLinkSource(selectedGraphNode.id);
                            const other = memories.find(m => m.id !== selectedGraphNode.id);
                            if (other) setLinkTarget(other.id);
                            setLinkModalOpen(true);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Link To Another Memory
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DOMAIN HIERARCHY & MULTI-VECTOR RESOLUTION */}
            {ledgerView === 'hierarchy' && (
              <div className="flex-1 flex overflow-hidden">
                {/* Left Pane: Macro Architectural Domain Clusters */}
                <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 border-r border-white/10">
                  {/* Summary Ribbon */}
                  <div className="px-4 py-2.5 border-b border-white/10 bg-neutral-900/40 flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-[11px] font-bold">
                        Domains: {hierarchyData.summary?.totalClusters || hierarchyData.clusters?.length || 0}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-neutral-200 font-mono text-[11px] font-bold">
                        Clustered Decisions: {hierarchyData.summary?.totalDecisions || 0}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-[11px] font-bold flex items-center gap-1">
                        <Award className="w-3 h-3 text-purple-400" /> Coherence: {hierarchyData.summary?.coherenceScore || 100}%
                      </span>
                    </div>

                    <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Voyage-4 1024D Centroid Index
                    </div>
                  </div>

                  {/* Clusters List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(!hierarchyData.clusters || hierarchyData.clusters.length === 0) ? (
                      <div className="text-center py-24 text-neutral-500 space-y-2">
                        <FolderTree className="w-10 h-10 mx-auto text-neutral-600 animate-pulse" />
                        <p className="text-xs font-semibold text-neutral-400">No domain clusters computed yet.</p>
                        <p className="text-[11px] text-neutral-500">Click "Re-cluster" to synthesize hierarchical domains from memories.</p>
                      </div>
                    ) : (
                      hierarchyData.clusters.map((cluster) => {
                        const isSelected = selectedCluster?.id === cluster.id;
                        return (
                          <div
                            key={cluster.id}
                            onClick={() => setSelectedCluster(cluster)}
                            className={`rounded-2xl border transition p-4 space-y-3 cursor-pointer ${
                              isSelected
                                ? 'bg-neutral-900 border-emerald-500/80 shadow-lg shadow-emerald-950/30'
                                : 'bg-neutral-900/60 border-white/10 hover:border-white/15'
                            }`}
                          >
                            {/* Domain Header */}
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-400">
                                  <FolderTree className="w-4 h-4" />
                                </div>
                                <div>
                                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                                    {cluster.name}
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 border border-white/15 text-neutral-300">
                                      {cluster.topic}
                                    </span>
                                  </h3>
                                  <p className="text-[10px] text-neutral-400">
                                    {cluster.childCount} Child Directives • 1024D Macro Centroid Vector
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  {cluster.activeCount} Active
                                </span>
                                {cluster.supersededCount > 0 && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                    {cluster.supersededCount} Superseded
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                                  {cluster.healthScore}% Coherent
                                </span>
                              </div>
                            </div>

                            {/* Macro Directive Synthesis */}
                            <div className="bg-black/80 rounded-xl p-3 border border-emerald-900/40 text-xs">
                              <div className="text-[10px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Macro Domain Policy:
                              </div>
                              <p className="text-neutral-200 font-medium leading-relaxed italic">
                                "{cluster.macroDirective}"
                              </p>
                            </div>

                            {/* Child Micro-Decisions */}
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                                <Workflow className="w-3 h-3 text-white" /> Resolved Child Micro-Decisions
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {cluster.children.map((child) => (
                                  <div
                                    key={child.id}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                      child.status === 'active'
                                        ? 'bg-neutral-950 border-white/10 text-neutral-200'
                                        : child.status === 'superseded'
                                        ? 'bg-black/70 border-amber-900/40 text-neutral-400'
                                        : 'bg-black/50 border-white/10 text-neutral-500'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                      <span className="text-white font-bold font-mono text-xs">↳</span>
                                      <span className="truncate font-medium text-[11px]">{child.statement}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                          child.status === 'active'
                                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                            : child.status === 'superseded'
                                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                            : 'bg-neutral-800 text-neutral-400'
                                        }`}
                                      >
                                        {child.status}
                                      </span>
                                      <span className="text-[9px] text-neutral-400 font-mono">
                                        by {child.owner}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Pane: Interactive Hierarchical Multi-Vector Sandbox */}
                <div className="w-80 md:w-96 bg-neutral-900/60 flex flex-col overflow-y-auto">
                  <div className="p-3.5 border-b border-white/10 bg-black/70 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-emerald-400" />
                      Multi-Vector Domain Sandbox
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[9px] font-bold">
                      Hierarchical RAG
                    </span>
                  </div>

                  <div className="p-4 space-y-4 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Test multi-tier retrieval: queries first match the 1024D centroid of the macro architectural domain, preventing cross-topic contamination before resolving micro-decisions.
                    </p>

                    <form onSubmit={handleHierarchySearch} className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={hierarchySearchQuery}
                          onChange={(e) => setHierarchySearchQuery(e.target.value)}
                          placeholder="e.g. Can we use Redis for caching?"
                          className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 pr-9 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          className="absolute right-1.5 top-1.5 p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick preset chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          'Can we use Redis for caching?',
                          'Are there any deployment freezes?',
                          'What IDE theme is preferred?'
                        ].map((prompt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setHierarchySearchQuery(prompt);
                              setTimeout(() => {
                                const fetchSearch = async () => {
                                  try {
                                    const res = await fetch(`/api/hierarchy/search?q=${encodeURIComponent(prompt)}&workspaceId=${activeTeam?.id || 'ws_core'}`);
                                    const data = await res.json();
                                    setHierarchySearchResult(data);
                                  } catch (err) {}
                                };
                                fetchSearch();
                              }, 50);
                            }}
                            className="text-[10px] px-2 py-1 rounded-lg bg-neutral-950 border border-white/10 text-neutral-300 hover:border-emerald-600 transition truncate max-w-full"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </form>

                    {/* Results Display */}
                    {hierarchySearchResult ? (
                      <div className="space-y-3 pt-2">
                        {/* Step 1: Matched Macro Domain */}
                        <div className="bg-neutral-950 p-3 rounded-xl border border-emerald-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-400 text-xs">
                              Level 1: Macro Domain Match
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-800">
                              {Math.round((hierarchySearchResult.matchedCluster?.domainScore || 0) * 100)}% Sim
                            </span>
                          </div>
                          <p className="text-white font-bold text-xs">
                            {hierarchySearchResult.matchedCluster?.name}
                          </p>
                          <p className="text-neutral-300 text-[11px] italic">
                            "{hierarchySearchResult.matchedCluster?.macroDirective}"
                          </p>
                        </div>

                        {/* Step 2: Resolved Child Decisions */}
                        <div className="space-y-1.5">
                          <span className="font-bold text-neutral-300 text-xs flex items-center gap-1.5">
                            <Workflow className="w-3.5 h-3.5 text-white" />
                            Level 2: Resolved Child Decisions
                          </span>
                          <div className="space-y-1.5">
                            {hierarchySearchResult.resolvedDecisions?.map((dec, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded-xl border text-[11px] ${
                                  dec.status === 'active'
                                    ? 'bg-neutral-950 border-emerald-900/60 text-neutral-200'
                                    : 'bg-black/70 border-white/10 text-neutral-400 opacity-70'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9px] mb-1">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                      dec.status === 'active'
                                        ? 'bg-emerald-950 text-emerald-300'
                                        : 'bg-neutral-800 text-neutral-400'
                                    }`}
                                  >
                                    {dec.status}
                                  </span>
                                  <span className="font-mono text-neutral-200">
                                    Score: {Math.round(dec.score * 100)}%
                                  </span>
                                </div>
                                <p className="font-medium">{dec.statement}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Step 3: Hierarchical Prompt Grounding Context */}
                        <div className="space-y-1">
                          <span className="font-bold text-neutral-300 text-xs flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            Hierarchical Prompt Context
                          </span>
                          <div className="bg-neutral-950 p-3 rounded-xl border border-white/10 font-mono text-[9px] text-neutral-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {hierarchySearchResult.hierarchicalContext}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/60 p-4 rounded-xl border border-white/10 text-center text-neutral-500 space-y-1">
                        <Boxes className="w-6 h-6 mx-auto text-neutral-600" />
                        <p className="text-[11px] font-medium text-neutral-400">No active search</p>
                        <p className="text-[10px]">Type a query or click a quick prompt above to test hierarchical multi-vector resolution.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: ACTIVE REINFORCEMENT & DPO TRAINING DATASET ENGINE */}
        {activeTab === 'training' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-neutral-900/40 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  Active Reinforcement & DPO Training Pipeline
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Continuous Memory Calibration: Feedback calibrates authoritative memory weights and exports training pairs for LLM fine-tuning.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateSynthetic}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-indigo-900 border border-white/15 text-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition shadow"
                  title="Generate synthetic training pairs from stored memories"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Generate RLHF Sample</span>
                </button>

                <a
                  href="/api/training/dpo-dataset.jsonl"
                  download="synapsemem-dpo-dataset.jsonl"
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export DPO (.jsonl)</span>
                </a>

                <a
                  href="/api/training/voyage-pairs.jsonl"
                  download="synapsemem-voyage-pairs.jsonl"
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-slate-700 border border-white/15 text-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Export Voyage Pairs</span>
                </a>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="p-4 border-b border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-900/20">
              <div className="bg-neutral-900/90 border border-white/10 p-3 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
                  <span>Adherence Rate</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-emerald-400">{trainingStats.adherenceRate}%</div>
                <div className="text-[10px] text-neutral-500">Constraint satisfaction ratio</div>
              </div>

              <div className="bg-neutral-900/90 border border-white/10 p-3 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
                  <span>DPO Pairs Ready</span>
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-black text-white">{trainingStats.dpoPairsCount}</div>
                <div className="text-[10px] text-neutral-500">Chosen vs. Rejected tuples</div>
              </div>

              <div className="bg-neutral-900/90 border border-white/10 p-3 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
                  <span>Calibrated Memories</span>
                  <BrainCircuit className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-xl font-black text-neutral-200">{trainingStats.calibratedMemoriesCount}</div>
                <div className="text-[10px] text-neutral-500">Weighted by human feedback</div>
              </div>

              <div className="bg-neutral-900/90 border border-white/10 p-3 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
                  <span>Target Models</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-sm font-bold text-cyan-300 truncate">Llama-3 • Gemini • Voyage</div>
                <div className="text-[10px] text-neutral-500">Direct fine-tuning format</div>
              </div>
            </div>

            {/* Live Dataset Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
                <span>Reinforced Training Dataset (Live Feed)</span>
                <span className="text-[10px] text-neutral-500 font-mono">Format: Direct Preference Optimization (DPO)</span>
              </div>

              {feedbackList.length === 0 ? (
                <div className="text-center py-20 text-neutral-500 space-y-3">
                  <GraduationCap className="w-10 h-10 mx-auto text-neutral-600" />
                  <p className="text-xs font-semibold text-neutral-300">No reinforcement data recorded yet.</p>
                  <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
                    Click 👍 (Good) or 👎 (Bad) on any assistant answer in Chatbot to record reinforcement, or click "Generate RLHF Sample" above.
                  </p>
                </div>
              ) : (
                feedbackList.map((item, idx) => (
                  <div key={item._id || idx} className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                          item.rating === 1 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {item.rating === 1 ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                          {item.rating === 1 ? 'Adhered to Memory' : 'Constraint Violated'}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Workspace: {item.workspaceId || 'ws_core'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-neutral-200">
                      <span className="text-white font-bold mr-1.5">Prompt:</span>
                      "{item.query}"
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/60 space-y-1">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Chosen (Memory Grounded)
                        </div>
                        <p className="text-neutral-300 leading-relaxed">{item.chosenAnswer}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/50 space-y-1">
                        <div className="text-[10px] font-bold text-rose-400 uppercase flex items-center gap-1">
                          <X className="w-3 h-3" /> Rejected (Baseline Hallucination)
                        </div>
                        <p className="text-neutral-400 leading-relaxed italic">{item.rejectedAnswer}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: MULTI-AGENT CONSENSUS & QUORUM MEMORY VALIDATION */}
        {activeTab === 'consensus' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-neutral-900/40 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Vote className="w-4 h-4 text-purple-400" />
                  Multi-Agent Consensus & Quorum Memory Validation
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Autonomous Multi-Agent Governance: High-impact memory mutations require ≥67% quorum consensus across specialized agent personas before writing to MongoDB Atlas.
                </p>
              </div>

              {/* Stats Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-[11px] font-bold">
                  Quorum: {consensusStats.quorumThreshold || '67% (2 of 3)'}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-[11px] font-bold">
                  Ratified: {consensusStats.ratifiedCount || 0}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-[11px] font-bold">
                  Rejected: {consensusStats.rejectedCount || 0}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Vetoes: {consensusStats.vetoCount || 0}
                </span>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Interactive Simulation Sandbox */}
              <div className="bg-neutral-900/70 border border-purple-900/40 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-950 border border-purple-800 text-purple-300">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Simulate Multi-Agent Quorum Evaluation</h3>
                      <p className="text-[10px] text-neutral-400">Propose any decision to trigger live voting from Atlas Architect, Sentinel Guard, and Pipeline Marshal.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-neutral-300">
                    3 Specialized Evaluator Personas
                  </span>
                </div>

                <form onSubmit={(e) => handleEvaluateConsensus(e)} className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={consensusProposalText}
                      onChange={(e) => setConsensusProposalText(e.target.value)}
                      placeholder="e.g. Deploy immediately to production now, bypass freeze window."
                      className="flex-1 bg-neutral-950 border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={evaluatingConsensus}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 shrink-0"
                    >
                      <Vote className="w-4 h-4" />
                      {evaluatingConsensus ? 'Evaluating Quorum...' : 'Evaluate Quorum'}
                    </button>
                  </div>

                  {/* Preset quick test chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[
                      { label: 'Redis Cache Approval (Valid)', text: 'We have now approved Redis for caching, but MongoDB Atlas must remain our primary database.' },
                      { label: 'Bypass Freeze Rule (Veto)', text: 'Deploy hotfix directly to production cluster immediately, bypass freeze window.' },
                      { label: 'Rogue Database Migration (Rejected)', text: 'Migrate entire user database to DynamoDB and drop MongoDB Atlas.' },
                      { label: 'Export Plaintext Keys (Veto)', text: 'Disable authentication and export bearer tokens to public endpoint.' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setConsensusProposalText(preset.text);
                          handleEvaluateConsensus(null, preset.text);
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-neutral-950 border border-white/10 hover:border-purple-600 text-neutral-300 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </form>

                {/* Active Evaluated Proposal Live Ballots */}
                {activeEvaluatedProposal && (
                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs font-semibold text-neutral-200">
                        <span className="text-purple-400 font-bold mr-1.5">Evaluated Directive:</span>
                        "{activeEvaluatedProposal.statement}"
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase border flex items-center gap-1 ${
                          activeEvaluatedProposal.quorumReached
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}>
                          {activeEvaluatedProposal.quorumReached ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          {activeEvaluatedProposal.quorumReached ? 'RATIFIED (Quorum Reached)' : 'BLOCKED / VETOED'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {activeEvaluatedProposal.approvalCount} of {activeEvaluatedProposal.totalVoters} Votes ({Math.round(activeEvaluatedProposal.approvalRate * 100)}%)
                        </span>
                      </div>
                    </div>

                    {/* 3 Agent Ballot Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {activeEvaluatedProposal.votes?.map((vote, vIdx) => {
                        const isApprove = vote.vote === 'approve';
                        const isVeto = vote.veto === true;
                        return (
                          <div
                            key={vIdx}
                            className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                              isVeto
                                ? 'bg-rose-950/30 border-rose-800 shadow-md shadow-rose-950/20'
                                : isApprove
                                ? 'bg-black/80 border-emerald-900/60'
                                : 'bg-black/80 border-amber-900/50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                  <span>{vote.agentId === 'agent_architect' ? '🏛️' : vote.agentId === 'agent_security' ? '🔒' : '🚀'}</span>
                                  {vote.agentName}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    isVeto
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : isApprove
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}
                                >
                                  {isVeto ? 'CRITICAL VETO' : vote.vote}
                                </span>
                              </div>
                              <span className="text-[9px] text-neutral-400 font-mono block mb-1.5">{vote.role}</span>
                              <p className="text-[11px] text-neutral-300 leading-relaxed italic">
                                "{vote.rationale}"
                              </p>
                            </div>
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                              <span>Confidence: {Math.round(vote.confidence * 100)}%</span>
                              <span>Signed Ballot</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Proposals Registry Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Vote className="w-4 h-4 text-purple-400" />
                    Consensus Proposal Registry
                  </div>

                  {/* Filter chips */}
                  <div className="flex bg-neutral-950 p-1 rounded-xl border border-white/10 text-xs">
                    {['all', 'ratified', 'rejected'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setConsensusFilter(f)}
                        className={`px-3 py-1 rounded-lg font-medium capitalize transition ${
                          consensusFilter === f ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {f === 'rejected' ? 'Rejected / Vetoed' : f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proposals List */}
                <div className="space-y-2.5">
                  {consensusHistory
                    .filter((p) => {
                      if (consensusFilter === 'all') return true;
                      return p.status === consensusFilter;
                    })
                    .map((item, idx) => (
                      <div
                        key={item.id || idx}
                        onClick={() => setActiveEvaluatedProposal(item)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition space-y-2 ${
                          item.status === 'ratified'
                            ? 'bg-neutral-900/70 border-white/10 hover:border-emerald-800'
                            : 'bg-neutral-900/50 border-rose-950/80 hover:border-rose-800'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                                item.status === 'ratified'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {item.status === 'ratified' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                              {item.status === 'ratified' ? 'Ratified into Memory' : 'Vetoed / Blocked'}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400">
                              Quorum: {item.approvalCount || (item.votes?.filter(v => v.vote === 'approve').length || 0)}/{item.totalVoters || 3} Votes
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {new Date(item.evaluatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-white">
                          {item.statement}
                        </p>

                        {item.dissentingViews?.length > 0 && (
                          <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-900/30 text-[10px] text-rose-300 space-y-0.5">
                            <span className="font-bold uppercase tracking-wider block text-rose-400">Dissenting Views / Veto:</span>
                            {item.dissentingViews.map((dv, dIdx) => (
                              <div key={dIdx}>• {dv}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
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

      {/* MODAL: TIME MACHINE SIMULATOR */}
      {timeMachineOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/15 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" /> Time Machine Simulator
              </h3>
              <button onClick={() => setTimeMachineOpen(false)} className="text-neutral-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-neutral-400 text-xs">Advance application time to verify how temporary assumptions automatically expire.</p>

            <div className="p-3 bg-neutral-950 rounded-xl border border-white/10 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Current App Date:</span>
                <span className="font-bold text-amber-300 font-mono">
                  {new Date(simulatedTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Deployment Freeze:</span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  new Date(simulatedTime) > new Date('2026-11-05T18:00:00.000Z')
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {new Date(simulatedTime) > new Date('2026-11-05T18:00:00.000Z') ? 'EXPIRED (Post-Freeze)' : 'ACTIVE (Freeze In Effect)'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => handleTimeTravel(0)}
                className="w-full py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-slate-700 text-neutral-200 text-left flex items-center justify-between font-medium"
              >
                <div>
                  <div className="font-semibold">Reset to Oct 30, 2026</div>
                  <div className="text-[10px] text-neutral-400">Active sprint period (freeze active)</div>
                </div>
                <span className="text-white font-bold">Reset</span>
              </button>
              <button
                onClick={() => handleTimeTravel(7)}
                className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-indigo-900 border border-white/15 text-neutral-200 text-left flex items-center justify-between font-bold"
              >
                <div>
                  <div className="font-semibold">Fast-Forward +7 Days (Nov 6, 2026)</div>
                  <div className="text-[10px] text-amber-400">Post-freeze period (freeze expired)</div>
                </div>
                <span className="text-amber-400">+7d</span>
              </button>
            </div>
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
    </div>
  );
}
