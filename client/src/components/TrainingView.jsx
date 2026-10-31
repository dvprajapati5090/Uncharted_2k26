import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Sparkles,
  Download,
  TrendingUp,
  Award,
  BrainCircuit,
  ShieldCheck,
  CheckCircle2,
  X,
  ThumbsUp,
  ThumbsDown,
  Search,
  Filter,
  SlidersHorizontal
} from 'lucide-react';

export default function TrainingView({
  trainingStats = {},
  feedbackList = [],
  onGenerateSynthetic,
  onFeedback
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'adhered' | 'violated'
  const [searchQuery, setSearchQuery] = useState('');

  // Filter feedback items
  const filteredList = useMemo(() => {
    return feedbackList.filter((item) => {
      if (filterMode === 'adhered' && item.rating !== 1) return false;
      if (filterMode === 'violated' && item.rating !== -1) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = item.query?.toLowerCase().includes(q);
        const matchesChosen = item.chosenAnswer?.toLowerCase().includes(q);
        const matchesRejected = item.rejectedAnswer?.toLowerCase().includes(q);
        if (!matchesQuery && !matchesChosen && !matchesRejected) return false;
      }

      return true;
    });
  }, [feedbackList, filterMode, searchQuery]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-neutral-900/40 backdrop-blur-md flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Active Reinforcement & DPO Training Pipeline</span>
          </h2>
          <p className="text-[11px] text-neutral-400">
            Continuous memory calibration: Human-in-the-loop feedback weights authoritative memories and exports paired tuples for LLM fine-tuning.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onGenerateSynthetic}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
            title="Generate synthetic RLHF training pairs from stored memories"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate RLHF Sample</span>
          </button>

          <a
            href="/api/training/dpo-dataset.jsonl"
            download="synapsemem-dpo-dataset.jsonl"
            className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition shadow"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export DPO (.jsonl)</span>
          </a>

          <a
            href="/api/training/voyage-pairs.jsonl"
            download="synapsemem-voyage-pairs.jsonl"
            className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/15 text-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition shadow"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span>Export Voyage Pairs</span>
          </a>
        </div>
      </div>

      {/* Metrics Row with Progress Sliders */}
      <div className="p-4 border-b border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-900/20 shrink-0">
        {/* Adherence Rate Metric */}
        <div className="bg-neutral-900/90 border border-white/10 p-3.5 rounded-xl space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
            <span>Adherence Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {trainingStats.adherenceRate || 100}%
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${trainingStats.adherenceRate || 100}%` }}
            />
          </div>
          <div className="text-[10px] text-neutral-500">Constraint satisfaction ratio</div>
        </div>

        {/* DPO Pairs Ready */}
        <div className="bg-neutral-900/90 border border-white/10 p-3.5 rounded-xl space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
            <span>DPO Pairs Ready</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {trainingStats.dpoPairsCount || feedbackList.length || 0}
          </div>
          <div className="text-[10px] text-neutral-500">Chosen vs. Rejected tuples</div>
        </div>

        {/* Calibrated Memories */}
        <div className="bg-neutral-900/90 border border-white/10 p-3.5 rounded-xl space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
            <span>Calibrated Memories</span>
            <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-neutral-200">
            {trainingStats.calibratedMemoriesCount || 0}
          </div>
          <div className="text-[10px] text-neutral-500">Weighted by human reinforcement</div>
        </div>

        {/* Target Models */}
        <div className="bg-neutral-900/90 border border-white/10 p-3.5 rounded-xl space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
            <span>Target Format</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-300 truncate pt-1">
            Llama-3 • Gemini • Voyage
          </div>
          <div className="text-[10px] text-neutral-500">Direct fine-tuning format</div>
        </div>
      </div>

      {/* Filter Segmented Slider Bar */}
      <div className="px-4 py-2.5 border-b border-white/10 bg-neutral-950 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
        <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-white/10">
          {[
            { id: 'all', label: 'All Pairs', count: feedbackList.length },
            { id: 'adhered', label: 'Memory Grounded (+2%)', count: feedbackList.filter(f => f.rating === 1).length },
            { id: 'violated', label: 'Violations (-6%)', count: feedbackList.filter(f => f.rating === -1).length }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterMode(item.id)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterMode === item.id
                  ? 'bg-white text-black font-semibold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>{item.label}</span>
              <span className={`ml-1.5 text-[10px] font-mono ${filterMode === item.id ? 'text-black/80 font-bold' : 'text-neutral-500'}`}>
                ({item.count})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompt or answers..."
            className="bg-neutral-900 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 w-44 md:w-56"
          />
        </div>
      </div>

      {/* Live Dataset Table / Cards Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 space-y-3">
            <GraduationCap className="w-10 h-10 mx-auto text-neutral-600 animate-pulse" />
            <p className="text-xs font-semibold text-neutral-300">No reinforcement tuples match your filters.</p>
            <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
              Click 👍 (Good) or 👎 (Bad) on assistant answers in Chatbot to record reinforcement, or click "Generate RLHF Sample" above.
            </p>
          </div>
        ) : (
          filteredList.map((item, idx) => (
            <div
              key={item._id || idx}
              className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-3 shadow-md hover:border-white/20 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 border ${
                      item.rating === 1
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}
                  >
                    {item.rating === 1 ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                    {item.rating === 1 ? 'Adhered to Memory (+2%)' : 'Constraint Violated (-6%)'}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Workspace: {item.workspaceId || 'ws_core'}
                </span>
              </div>

              {/* Prompt */}
              <div className="text-xs font-semibold text-neutral-200">
                <span className="text-neutral-400 font-bold mr-1.5 uppercase text-[10px]">Prompt Query:</span>
                "{item.query}"
              </div>

              {/* Comparison Split Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                {/* Chosen (Memory Grounded) */}
                <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-900/60 space-y-1.5">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Chosen (Memory Grounded)</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed text-xs">
                    {item.chosenAnswer}
                  </p>
                </div>

                {/* Rejected (Baseline Hallucination) */}
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/50 space-y-1.5">
                  <div className="text-[10px] font-bold text-rose-400 uppercase flex items-center gap-1">
                    <X className="w-3.5 h-3.5" />
                    <span>Rejected (Baseline Hallucination)</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed italic text-xs">
                    {item.rejectedAnswer}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
