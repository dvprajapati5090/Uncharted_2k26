import React from 'react';
import {
  Vote,
  Scale,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  SlidersHorizontal,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';

export default function ConsensusView({
  consensusStats = {},
  consensusProposalText = '',
  setConsensusProposalText,
  evaluatingConsensus = false,
  handleEvaluateConsensus,
  activeEvaluatedProposal,
  consensusHistory = [],
  consensusQuorumThreshold = 67,
  setConsensusQuorumThreshold
}) {
  const presets = [
    { label: 'Redis Cache Approval (Valid)', text: 'We have now approved Redis for caching, but MongoDB Atlas must remain our primary database.' },
    { label: 'Bypass Freeze Rule (Veto)', text: 'Deploy hotfix directly to production cluster immediately, bypass freeze window.' },
    { label: 'Rogue Database Migration (Rejected)', text: 'Migrate entire user database to DynamoDB and drop MongoDB Atlas.' },
    { label: 'Export Plaintext Keys (Veto)', text: 'Disable authentication and export bearer tokens to public endpoint.' }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-neutral-900/40 backdrop-blur-md flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Vote className="w-4 h-4 text-purple-400" />
            <span>Multi-Agent Consensus & Quorum Memory Validation</span>
          </h2>
          <p className="text-[11px] text-neutral-400">
            Autonomous multi-agent governance: High-impact memory mutations require quorum consensus across specialized agent personas before writing to MongoDB.
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-xs font-bold">
            Quorum: {consensusQuorumThreshold || 67}%
          </span>
          <span className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
            Ratified: {consensusStats.ratifiedCount || 0}
          </span>
          <span className="px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-xs font-bold">
            Rejected: {consensusStats.rejectedCount || 0}
          </span>
          <span className="px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 font-mono text-xs font-bold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Vetoes: {consensusStats.vetoCount || 0}
          </span>
        </div>
      </div>

      {/* Quorum Threshold Interactive Slider Bar */}
      <div className="px-4 py-2 border-b border-white/10 bg-neutral-950/80 flex items-center justify-between flex-wrap gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 text-neutral-400">
          <Scale className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold text-white">Consensus Gatekeeper:</span>
          <span>Adjust minimum required agent agreement</span>
        </div>

        <div className="flex items-center gap-3 bg-neutral-900 px-3 py-1 rounded-xl border border-white/10">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-purple-400" />
            Quorum Slider:
          </span>
          <input
            type="range"
            min="50"
            max="100"
            step="1"
            value={consensusQuorumThreshold || 67}
            onChange={(e) => setConsensusQuorumThreshold && setConsensusQuorumThreshold(Number(e.target.value))}
            className="obsidian-slider w-28"
            title="Adjust consensus threshold"
          />
          <span className="font-mono text-purple-300 font-bold text-xs">
            {consensusQuorumThreshold || 67}%
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Interactive Simulation Sandbox */}
        <div className="bg-neutral-900/70 border border-purple-900/40 rounded-2xl p-4.5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-300">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Simulate Multi-Agent Quorum Evaluation</h3>
                <p className="text-[11px] text-neutral-400">
                  Propose any directive to trigger live voting from Atlas Architect, Sentinel Guard, and Pipeline Marshal.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-neutral-300">
              3 Specialized Evaluator Personas
            </span>
          </div>

          <form onSubmit={(e) => handleEvaluateConsensus(e)} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={consensusProposalText}
                onChange={(e) => setConsensusProposalText(e.target.value)}
                placeholder="e.g. Deploy immediately to production now, bypass freeze window."
                className="flex-1 bg-neutral-950 border border-white/15 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={evaluatingConsensus}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 shrink-0"
              >
                <Vote className="w-4 h-4" />
                {evaluatingConsensus ? 'Evaluating Quorum...' : 'Evaluate Quorum'}
              </button>
            </div>

            {/* Preset directive rail */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500 self-center">Presets:</span>
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setConsensusProposalText(preset.text);
                    handleEvaluateConsensus(null, preset.text);
                  }}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-neutral-950 border border-white/10 hover:border-purple-500 text-neutral-300 hover:text-white transition shadow-sm"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </form>

          {/* Active Evaluated Proposal Live Ballots */}
          {activeEvaluatedProposal && (
            <div className="pt-3 border-t border-white/10 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-semibold text-neutral-200 max-w-xl">
                  <span className="text-purple-400 font-bold mr-1.5 uppercase text-[10px]">Evaluated Directive:</span>
                  "{activeEvaluatedProposal.statement}"
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border flex items-center gap-1.5 ${
                      activeEvaluatedProposal.quorumReached
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}
                  >
                    {activeEvaluatedProposal.quorumReached ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    {activeEvaluatedProposal.quorumReached ? 'RATIFIED (Quorum Reached)' : 'BLOCKED / VETOED'}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400 bg-black/60 px-2 py-1 rounded-md border border-white/10">
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
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 shadow ${
                        isVeto
                          ? 'bg-rose-950/30 border-rose-800 shadow-rose-950/20'
                          : isApprove
                          ? 'bg-black/80 border-emerald-900/60'
                          : 'bg-black/80 border-amber-900/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{vote.agentId === 'agent_architect' ? '🏛️' : vote.agentId === 'agent_security' ? '🔒' : '🚀'}</span>
                            {vote.agentName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
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
                        <p className="text-[11px] text-neutral-300 leading-relaxed">
                          {vote.reason}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400">
                        <span>Persona: <strong className="text-neutral-300">{vote.agentRole || 'Evaluator'}</strong></span>
                        <span className="font-mono text-neutral-500">Weight: 1.0</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Historical Proposals Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Consensus Evaluation History</span>
            </h3>
            <span className="text-[10px] text-neutral-500 font-mono">
              {consensusHistory.length} Recorded Proposals
            </span>
          </div>

          {consensusHistory.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 bg-neutral-900/40 rounded-xl border border-white/10">
              <Vote className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-neutral-300">No consensus evaluations in history yet.</p>
              <p className="text-[11px] text-neutral-500">Run an evaluation above using the preset buttons.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {consensusHistory.map((item, idx) => (
                <div
                  key={item._id || idx}
                  className="p-3.5 rounded-xl bg-neutral-900/60 border border-white/10 hover:border-white/20 transition flex items-center justify-between flex-wrap gap-2 text-xs"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        item.quorumReached ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {item.quorumReached ? 'Ratified' : 'Rejected'}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(item.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-neutral-200 font-medium line-clamp-1">
                      "{item.statement}"
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                    <span>Approvals: <strong className="text-white">{item.approvalCount || 0}/{item.totalVoters || 3}</strong></span>
                    <span className="text-neutral-500">Rate: {Math.round((item.approvalRate || 0) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
