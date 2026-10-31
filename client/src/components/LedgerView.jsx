import React, { useState, useMemo } from 'react';
import {
  Database,
  Layers,
  Network,
  FolderTree,
  Boxes,
  Plus,
  Link2,
  Search,
  SlidersHorizontal,
  Clock,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  GitPullRequest,
  GitBranch,
  Edit2,
  Trash2,
  X,
  ScanEye,
  CheckCircle2,
  ShieldAlert,
  BrainCircuit,
  ExternalLink,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function LedgerView({
  memories = [],
  ledgerView = 'cards',
  setLedgerView,
  ledgerFilter = 'all',
  setLedgerFilter,
  ledgerConfidenceMin = 50,
  setLedgerConfidenceMin,
  onOpenAddModal,
  onEditMemory,
  onDeleteMemory,
  onSyncAdrToGitHub,
  isSyncingAdr,
  onRecluster,
  isClustering,
  onOpenLinkModal,
  graphData,
  selectedGraphNode,
  setSelectedGraphNode,
  graphLineage,
  loadGraphLineage = () => {},
  hierarchyData,
  selectedCluster,
  setSelectedCluster,
  hierarchySearchQuery,
  setHierarchySearchQuery,
  hierarchySearchResult,
  handleHierarchySearch
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemoryDetail, setSelectedMemoryDetail] = useState(null);

  // Filter memories by status, confidence, and search query
  const filteredMemories = useMemo(() => {
    return memories.filter((mem) => {
      // Status filter
      if (ledgerFilter !== 'all') {
        if (ledgerFilter === 'expired') {
          const isPast = mem.valid_until && new Date() > new Date(mem.valid_until);
          if (!isPast && mem.status !== 'expired') return false;
        } else if (mem.status !== ledgerFilter) {
          return false;
        }
      }

      // Confidence slider filter
      const conf = Math.round((mem.confidence || 0.95) * 100);
      if (conf < ledgerConfidenceMin) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTopic = mem.topic?.toLowerCase().includes(q);
        const matchesDecision = mem.decision?.toLowerCase().includes(q);
        const matchesReason = mem.reason?.toLowerCase().includes(q);
        const matchesOwner = mem.owner?.toLowerCase().includes(q);
        if (!matchesTopic && !matchesDecision && !matchesReason && !matchesOwner) {
          return false;
        }
      }

      return true;
    });
  }, [memories, ledgerFilter, ledgerConfidenceMin, searchQuery]);

  // Counts for filters
  const counts = useMemo(() => {
    const total = memories.length;
    const active = memories.filter(m => m.status === 'active').length;
    const superseded = memories.filter(m => m.status === 'superseded').length;
    const expired = memories.filter(m => (m.valid_until && new Date() > new Date(m.valid_until)) || m.status === 'expired').length;
    return { total, active, superseded, expired };
  }, [memories]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black text-white relative">
      {/* Sleek Sub-Header with Instant Search & Segmented Controls */}
      <div className="p-4 border-b border-white/10 bg-neutral-950/90 backdrop-blur-md flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Structured Memory Ledger</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-mono border border-white/15">
                {filteredMemories.length} / {memories.length} Directives
              </span>
            </h2>
            <p className="text-[11px] text-neutral-400">
              Authoritative architectural decisions indexed in MongoDB Atlas with 1024D Voyage dense vectors.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search decisions, tags..."
              className="bg-neutral-900 border border-white/15 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 w-44 md:w-56 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* View Segmented Pill Switcher */}
          <div className="bg-neutral-950 p-1 rounded-xl border border-white/15 flex text-xs shadow-inner">
            <button
              onClick={() => setLedgerView('cards')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                ledgerView === 'cards' ? 'bg-white text-black font-semibold shadow' : 'text-neutral-400 hover:text-white'
              }`}
              title="Cards Grid View"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setLedgerView('graph')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                ledgerView === 'graph' ? 'bg-white text-black font-semibold shadow' : 'text-neutral-400 hover:text-white'
              }`}
              title="Interactive Knowledge Graph"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Graph</span>
            </button>
            <button
              onClick={() => setLedgerView('hierarchy')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                ledgerView === 'hierarchy' ? 'bg-white text-black font-semibold shadow' : 'text-neutral-400 hover:text-white'
              }`}
              title="Domain Clusters & Hierarchy"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Domains</span>
            </button>
          </div>

          {/* Contextual Action Buttons */}
          {ledgerView === 'graph' && (
            <button
              onClick={onOpenLinkModal}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 flex items-center gap-1.5 transition shadow"
            >
              <Link2 className="w-3.5 h-3.5" /> Link Lineage
            </button>
          )}

          {ledgerView === 'hierarchy' && (
            <button
              onClick={onRecluster}
              disabled={isClustering}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 flex items-center gap-1.5 transition shadow disabled:opacity-50"
            >
              <Boxes className="w-3.5 h-3.5" /> {isClustering ? 'Clustering...' : 'Re-cluster'}
            </button>
          )}

          <button
            onClick={() => onOpenAddModal && onOpenAddModal()}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 flex items-center gap-1.5 transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Decision</span>
          </button>
        </div>
      </div>

      {/* Filter Chips & Confidence Slider Bar (When in Cards View) */}
      {ledgerView === 'cards' && (
        <div className="px-4 py-2 border-b border-white/10 bg-neutral-950/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All', count: counts.total },
              { id: 'active', label: 'Active', count: counts.active },
              { id: 'superseded', label: 'Superseded', count: counts.superseded },
              { id: 'expired', label: 'Expired', count: counts.expired }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setLedgerFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  ledgerFilter === f.id
                    ? 'bg-white/20 text-white border border-white/30 font-semibold shadow'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  ledgerFilter === f.id ? 'bg-white text-black font-bold' : 'bg-white/10 text-neutral-300'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Inline Slider: Min Confidence */}
          <div className="flex items-center gap-2.5 bg-neutral-900/80 px-3 py-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
              Min Confidence:
            </span>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={ledgerConfidenceMin}
              onChange={(e) => setLedgerConfidenceMin(Number(e.target.value))}
              className="obsidian-slider w-24"
              title="Filter by confidence rating"
            />
            <span className="font-mono text-emerald-400 font-bold text-xs">
              {ledgerConfidenceMin}%
            </span>
          </div>
        </div>
      )}

      {/* VIEW A: CARDS GRID */}
      {ledgerView === 'cards' && (
        <div className="flex-1 overflow-y-auto p-4">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-24 text-neutral-500 space-y-3">
              <Database className="w-10 h-10 mx-auto text-neutral-600 animate-pulse" />
              <p className="text-xs font-semibold text-neutral-300">No memory directives match your criteria.</p>
              <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                Try clearing search filters or lowering the minimum confidence slider.
              </p>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setLedgerFilter('all'); setLedgerConfidenceMin(50); }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredMemories.map((mem) => {
                const isPast = mem.valid_until && new Date() > new Date(mem.valid_until);
                const confPercent = Math.round((mem.confidence || 0.95) * 100);

                return (
                  <div
                    key={mem.id}
                    onClick={() => setSelectedMemoryDetail(mem)}
                    className={`obsidian-card rounded-2xl p-4 flex flex-col justify-between space-y-3 cursor-pointer group relative ${
                      mem.status === 'active'
                        ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                        : mem.status === 'superseded'
                        ? 'border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-950/20'
                        : 'border-white/10 hover:border-white/25 opacity-75'
                    }`}
                  >
                    <div>
                      {/* Topic & Status Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-emerald-400 transition-colors" />
                          {mem.topic}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
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

                      {/* Decision Text */}
                      <p className="text-xs font-semibold text-neutral-100 mb-2 leading-relaxed">
                        {mem.decision}
                      </p>

                      {/* Reason / Context Callout */}
                      {mem.reason && (
                        <div className="text-[11px] text-neutral-300 bg-black/60 p-2.5 rounded-xl border border-white/10 space-y-0.5">
                          <span className="text-neutral-500 font-semibold uppercase text-[9px] tracking-wider block">
                            Rationale:
                          </span>
                          <p className="leading-snug">{mem.reason}</p>
                        </div>
                      )}

                      {/* Lineage Override Alert */}
                      {mem.superseded_by && (
                        <div className="text-[10px] text-amber-300 font-medium flex items-center gap-1.5 mt-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                          <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Superseded by newer team consensus</span>
                        </div>
                      )}

                      {/* Temporal Freeze Validity */}
                      {mem.valid_until && (
                        <div
                          className={`text-[10px] font-medium flex items-center gap-1.5 mt-2 ${
                            isPast ? 'text-rose-400' : 'text-neutral-400'
                          }`}
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{isPast ? 'Expired:' : 'Valid until:'}{' '}
                            {new Date(mem.valid_until).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Owner, Confidence Slider Bar, Actions */}
                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span>By: <strong className="text-neutral-200 font-semibold">{mem.owner}</strong></span>
                        <div className="flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded-md border border-white/10">
                          <div className="w-8 bg-neutral-800 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${confPercent}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-neutral-300 font-bold">{confPercent}%</span>
                        </div>

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

                      {/* Quick Inspect Button */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSyncAdrToGitHub && onSyncAdrToGitHub(mem)}
                          disabled={isSyncingAdr}
                          className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-emerald-300 transition"
                          title="Sync as Living ADR PR on GitHub"
                        >
                          <GitPullRequest className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedMemoryDetail(mem)}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-[10px] font-semibold transition"
                          title="Inspect Details & Vector Dimensionality"
                        >
                          Inspect →
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

      {/* VIEW B: KNOWLEDGE GRAPH VIEW */}
      {ledgerView === 'graph' && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Network className="w-4 h-4 text-purple-400" />
                    Architectural Knowledge Graph (GraphRAG Lineage)
                  </h3>
                  <p className="text-[10px] text-neutral-400">
                    Active directed edges connect foundational team directives, override chains, and dependency constraints.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  {graphData.nodes?.length || 0} Nodes • {graphData.edges?.length || 0} Lineage Edges
                </span>
              </div>

              {/* Node Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {graphData.nodes?.map((node) => {
                  const isSelected = selectedGraphNode?.id === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        setSelectedGraphNode(node);
                        loadGraphLineage && loadGraphLineage(node.id);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/30'
                          : 'bg-black/60 border-white/10 hover:border-white/20 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-white">{node.label}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                          node.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                        }`}>
                          {node.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                        {node.decision}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lineage Traversal Inspector */}
            {selectedGraphNode && (
              <div className="bg-neutral-900/80 border border-purple-900/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    Multi-Hop Graph Lineage Traversal for #{selectedGraphNode.id?.slice(-6)}
                  </h4>
                  <button onClick={() => setSelectedGraphNode(null)} className="text-neutral-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1.5">
                    <div className="font-semibold text-neutral-400 text-[10px] uppercase">Upstream Dependencies</div>
                    {graphLineage?.upstream?.length === 0 ? (
                      <p className="text-neutral-500 italic text-[11px]">No upstream dependencies recorded.</p>
                    ) : (
                      graphLineage?.upstream?.map((u, i) => (
                        <div key={i} className="text-[11px] text-neutral-200 flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-purple-400" />
                          <span>[{u.type}] {u.targetTopic || u.targetId}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1.5">
                    <div className="font-semibold text-neutral-400 text-[10px] uppercase">Downstream Dependents</div>
                    {graphLineage?.downstream?.length === 0 ? (
                      <p className="text-neutral-500 italic text-[11px]">No downstream dependents recorded.</p>
                    ) : (
                      graphLineage?.downstream?.map((d, i) => (
                        <div key={i} className="text-[11px] text-neutral-200 flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                          <span>[{d.type}] {d.sourceTopic || d.sourceId}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW C: DOMAIN HIERARCHY CLUSTERS */}
      {ledgerView === 'hierarchy' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-emerald-400" />
                  Hierarchical Multi-Vector Domain Clusters
                </h3>
                <p className="text-[10px] text-neutral-400">
                  Groups low-level directives under macro architectural domains for two-tier hierarchical routing.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {hierarchyData.clusters?.length || 0} Macro Domains • {hierarchyData.summary?.totalDecisions || 0} Clustered Decisions
              </span>
            </div>

            {/* Clusters List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {hierarchyData.clusters?.map((cluster) => {
                const isSelected = selectedCluster?.id === cluster.id;
                return (
                  <div
                    key={cluster.id}
                    onClick={() => setSelectedCluster(isSelected ? null : cluster)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-neutral-900 border-emerald-500/60 shadow-lg'
                        : 'bg-black/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-white flex items-center gap-2">
                        <span>📁</span> {cluster.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                        {cluster.decisions?.length || 0} decisions
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mb-3">{cluster.description}</p>

                    {/* Nested decisions */}
                    <div className="space-y-1.5 pl-2 border-l border-white/10">
                      {cluster.decisions?.slice(0, 3).map((d, dIdx) => (
                        <div key={dIdx} className="text-[10px] text-neutral-300 truncate">
                          • {d.decision || d.topic}
                        </div>
                      ))}
                      {(cluster.decisions?.length || 0) > 3 && (
                        <div className="text-[9px] text-neutral-500 italic">
                          +{cluster.decisions.length - 3} more decisions...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER MEMORY DETAIL & INSPECTOR DRAWER */}
      {selectedMemoryDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-neutral-900 border-l border-white/15 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 text-xs">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 bg-neutral-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Directive Inspector: {selectedMemoryDetail.topic}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMemoryDetail(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-950">
              {/* Status and Confidence Bar */}
              <div className="p-3 bg-neutral-900/90 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedMemoryDetail.status === 'active'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {selectedMemoryDetail.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Confidence Rating</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {Math.round((selectedMemoryDetail.confidence || 0.95) * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Author / Owner</span>
                  <span className="text-white font-semibold">{selectedMemoryDetail.owner || 'Lead'}</span>
                </div>
              </div>

              {/* Full Decision Statement */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-neutral-400">Authoritative Directive</span>
                <div className="p-3.5 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs font-semibold leading-relaxed">
                  {selectedMemoryDetail.decision}
                </div>
              </div>

              {/* Rationale Context */}
              {selectedMemoryDetail.reason && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Architectural Context & Why</span>
                  <div className="p-3 bg-neutral-900/80 border border-white/10 rounded-xl text-neutral-300 text-xs leading-relaxed">
                    {selectedMemoryDetail.reason}
                  </div>
                </div>
              )}

              {/* Vector Dimensionality Preview (1024D Voyage Visualizer) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">
                    1024D Dense Vector Embedding Preview
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400">
                    Model: voyage-4 (1024 dimensions)
                  </span>
                </div>
                <div className="p-3 bg-black/80 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-end gap-1 h-12 w-full pt-2">
                    {Array.from({ length: 32 }).map((_, i) => {
                      const pseudoVal = Math.abs(Math.sin((i + 1) * 2.3 + (selectedMemoryDetail.topic?.length || 5)));
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-emerald-400/80 hover:bg-emerald-300 rounded-t transition-all"
                          style={{ height: `${Math.max(15, Math.round(pseudoVal * 100))}%` }}
                          title={`Dim [${i * 32}..${(i + 1) * 32}]: ${pseudoVal.toFixed(4)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                    <span>Index: memory_vector_index</span>
                    <span>MongoDB Atlas $vectorSearch</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    const mem = selectedMemoryDetail;
                    setSelectedMemoryDetail(null);
                    onEditMemory && onEditMemory(mem);
                  }}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold flex items-center gap-1.5 transition text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Directive</span>
                </button>

                <button
                  onClick={() => {
                    onSyncAdrToGitHub && onSyncAdrToGitHub(selectedMemoryDetail);
                  }}
                  disabled={isSyncingAdr}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition text-xs disabled:opacity-50"
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>{isSyncingAdr ? 'Opening PR...' : 'Sync Living ADR PR'}</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this directive from MongoDB?')) {
                      const id = selectedMemoryDetail.id;
                      setSelectedMemoryDetail(null);
                      onDeleteMemory && onDeleteMemory(id);
                    }
                  }}
                  className="p-2 rounded-xl hover:bg-rose-950/60 text-rose-400 border border-rose-900/40 hover:border-rose-700 transition"
                  title="Delete from MongoDB"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
