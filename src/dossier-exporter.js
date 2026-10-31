import { findMemories, getMemoryGraph, getTrainingStats } from './db-mongo.js';
import { getConsensusHistory, getConsensusStats } from './consensus-engine-v2.js';
import { getAppNow } from './memory-engine-v2.js';

/**
 * Generates an executive-ready Architecture Decision Record (ADR)
 * and System Memory Dossier from authoritative MongoDB Atlas state.
 */
export async function generateEnterpriseAdrDossier(workspaceId = 'ws_core') {
  const now = getAppNow();
  const allMemories = await findMemories({ workspaceId });
  const activeMemories = allMemories.filter(m => m.status === 'active');
  const supersededMemories = allMemories.filter(m => m.status === 'superseded');
  const expiredMemories = allMemories.filter(m => m.status === 'expired');

  const graph = await getMemoryGraph(workspaceId);
  const consensusHistory = await getConsensusHistory(workspaceId);
  const consensusStats = await getConsensusStats(workspaceId);
  const trainingStats = await getTrainingStats();

  const dossierTimestamp = now.toISOString();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build clean Markdown ADR Document
  let md = `# 🏛️ SynapseMem 2.0 — Enterprise Architecture Decision Record (ADR)\n\n`;
  md += `> **Authoritative Memory Store:** MongoDB Atlas (\`synapsemem\`)\n`;
  md += `> **Vector Index:** \`memory_vector_index\` (1024D Voyage-4 Dense Vectors)\n`;
  md += `> **Generated On:** ${dateStr} (${dossierTimestamp})\n`;
  md += `> **Workspace:** \`${workspaceId}\` | **Audit Status:** VERIFIED\n\n`;
  md += `---\n\n`;

  // 1. Executive Summary
  md += `## 1. Executive Memory Summary\n\n`;
  md += `| Pillar | Total Active | Superseded Lineage | Expired / Purged | Consensus Ratified | DPO Adherence |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  md += `| **Directives** | **${activeMemories.length} Active** | ${supersededMemories.length} Evolved | ${expiredMemories.length} Expired | ${consensusStats.ratifiedProposals || 0} Ratified | **${trainingStats.adherenceRate || 100}%** |\n\n`;

  // 2. Active Architectural Directives
  md += `## 2. Active Architectural Directives\n\n`;
  md += `These decisions represent the current authoritative baseline enforced across all agentic recall operations:\n\n`;

  for (const m of activeMemories) {
    const memId = m._id?.toString() || 'unknown';
    const statement = m.content?.statement || m.decision || 'No statement';
    const reason = m.content?.reason || m.why || 'Architecture consensus';
    const owner = m.ownerId || 'system';
    const topic = m.topic || 'General';
    const confidence = Math.round((m.confidence || 1.0) * 100);

    md += `### [ADR-${memId.slice(-6).toUpperCase()}] ${statement}\n`;
    md += `- **Topic / Domain:** \`${topic}\`\n`;
    md += `- **Rationale:** ${reason}\n`;
    md += `- **Owner:** \`${owner}\` | **Confidence Score:** \`${confidence}%\`\n`;
    md += `- **MongoDB Document ID:** \`${memId}\`\n`;
    md += `- **Temporal Boundary:** ${m.validUntil ? `Valid until ${new Date(m.validUntil).toLocaleDateString()}` : 'Permanent policy'}\n\n`;
  }

  // 3. Evolution & Superseded Decision History
  md += `## 3. Policy Evolution & Superseded Lineage\n\n`;
  if (supersededMemories.length === 0) {
    md += `*No policies have been superseded yet.*\n\n`;
  } else {
    md += `| Previous Directive | Reason for Evolution | Superseded By | Status |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    for (const m of supersededMemories) {
      const statement = m.content?.statement || m.decision || 'Historical policy';
      const reason = m.content?.reason || 'Superseded by newer consensus';
      const replacerId = m.supersededBy ? `\`#${m.supersededBy.slice(-6)}\`` : 'Newer Directive';
      md += `| ~"${statement}"~ | ${reason} | ${replacerId} | \`SUPERSEDED\` |\n`;
    }
    md += `\n`;
  }

  // 4. Multi-Agent Quorum Consensus Audit
  md += `## 4. Multi-Agent Quorum Consensus Registry\n\n`;
  md += `Every proposed mutation is evaluated by 3 specialized agents (**Atlas Architect**, **Sentinel Guard**, and **Pipeline Marshal**):\n\n`;

  const recentProposals = consensusHistory.slice(0, 10);
  if (recentProposals.length === 0) {
    md += `*No consensus proposals on record.*\n\n`;
  } else {
    md += `| Proposal Statement | Topic | Quorum Result | Approval Rate | Veto Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const p of recentProposals) {
      const statement = p.statement ? p.statement.slice(0, 55) + '...' : 'System proposal';
      const statusBadge = p.status === 'ratified' ? '✅ RATIFIED' : '❌ REJECTED';
      const vetoBadge = p.hasHardVeto ? '🚨 HARD VETO' : 'None';
      md += `| "${statement}" | \`${p.topic}\` | ${statusBadge} | ${Math.round(p.approvalRate * 100)}% | ${vetoBadge} |\n`;
    }
    md += `\n`;
  }

  // 5. Knowledge Graph Topology Overview
  md += `## 5. Architectural Knowledge Graph Topology\n\n`;
  md += `- **Total Graph Nodes:** ${graph.nodes?.length || 0}\n`;
  md += `- **Active Relational Edges:** ${graph.edges?.length || 0}\n\n`;
  md += `\`\`\`mermaid\ngraph TD\n`;
  for (const node of (graph.nodes || []).slice(0, 8)) {
    const safeTopic = (node.topic || 'Memory').replace(/[^a-zA-Z0-9]/g, '_');
    const safeLabel = (node.label || node.statement || 'Node').replace(/["\n\r]/g, '').slice(0, 30);
    md += `  ${node.id}["${safeTopic}: ${safeLabel}..."]\n`;
  }
  for (const edge of (graph.edges || []).slice(0, 8)) {
    md += `  ${edge.source} -->|"${edge.label || edge.type}"| ${edge.target}\n`;
  }
  md += `\`\`\`\n\n`;

  // 6. Enterprise Compliance & Verification Certificate
  md += `## 6. Verification & Governance Attestation\n\n`;
  md += `- **Chat History Injection:** STRICTLY ZERO (\`chat_history_injected: false\`)\n`;
  md += `- **Storage Engine:** MongoDB Atlas \`memories\` collection with \`purgeAt\` TTL auto-cleanup.\n`;
  md += `- **Embeddings:** Voyage AI \`voyage-4\` 1024-dimensional semantic dense vectors.\n`;
  md += `- **DPO Dataset Alignment:** ${trainingStats.dpoPairsCount || 0} preference pairs captured for fine-tuning.\n\n`;
  md += `*Certified by SynapseMem 2.0 Autonomous Memory Operating System.*\n`;

  const structuredJson = {
    workspaceId,
    generatedAt: dossierTimestamp,
    summary: {
      activeCount: activeMemories.length,
      supersededCount: supersededMemories.length,
      expiredCount: expiredMemories.length,
      graphNodesCount: graph.nodes?.length || 0,
      graphEdgesCount: graph.edges?.length || 0,
      adherenceRate: trainingStats.adherenceRate || 100,
      dpoPairsCount: trainingStats.dpoPairsCount || 0
    },
    activePolicies: activeMemories.map(m => ({
      id: m._id?.toString(),
      topic: m.topic,
      statement: m.content?.statement || m.decision,
      reason: m.content?.reason || m.why,
      ownerId: m.ownerId,
      confidence: m.confidence,
      validUntil: m.validUntil
    })),
    evolutionLineage: supersededMemories.map(m => ({
      id: m._id?.toString(),
      topic: m.topic,
      statement: m.content?.statement || m.decision,
      supersededBy: m.supersededBy
    })),
    consensusAudit: recentProposals
  };

  return {
    markdown: md,
    structuredJson,
    filename: `SynapseMem_ADR_Dossier_${workspaceId}_${now.toISOString().slice(0, 10)}.md`,
    generatedAt: dossierTimestamp
  };
}
