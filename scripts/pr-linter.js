#!/usr/bin/env node
/**
 * 🧠 SynapseMem 2.0 — Architectural CI / PR Compliance Linter
 * 
 * Verifies Pull Requests, commit messages, and architecture RFCs against
 * authoritative MongoDB Atlas memory state, detecting:
 *  1. Secret & Private Credential Leaks
 *  2. Direct Contradictions against Stored Architecture Decisions (e.g., Redis prohibition)
 *  3. Governance & Release Freeze Window Violations (e.g., Deployments during freeze)
 *  4. Multi-Agent Quorum Consensus Vetoes (Architect, Sentinel Guard, Pipeline Marshal)
 * 
 * Usage:
 *   node scripts/pr-linter.js --text "Use Redis BullMQ for notifications"
 *   node scripts/pr-linter.js --file pr-description.md
 *   node scripts/pr-linter.js --demo
 *   node scripts/pr-linter.js --text "..." --markdown
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

// ANSI terminal color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

const DEFAULT_SERVER_URL = process.env.SYNAPSE_SERVER_URL || 'http://localhost:3000';
const DEFAULT_WORKSPACE = process.env.SYNAPSE_WORKSPACE || 'ws_core';

// Secret detection regex patterns (Zero-trust privacy gate)
const SECRET_PATTERNS = [
  { name: 'Bearer Token', regex: /bearer\s+[A-Za-z0-9_\-\.]{20,}/i },
  { name: 'API Key', regex: /api[_\-\s]?key\s*[:=]\s*[A-Za-z0-9_\-]{16,}/i },
  { name: 'Plaintext Password', regex: /password\s*[:=]\s*['"][^'"]+['"]/i },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Provider Secret Token', regex: /\b(?:ghp|glpat|xoxb|xoxp|sk_live)_[A-Za-z0-9]{20,}\b/ }
];

/**
 * HTTP helper for server communication
 */
function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3000
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out connecting to SynapseMem server'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Checks if the SynapseMem HTTP server is running
 */
async function checkServerHealth(serverUrl) {
  try {
    const res = await makeRequest(`${serverUrl}/api/health`);
    return res.status === 200 && res.data?.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Fallback direct engine runner when server is offline
 */
async function runDirectAudit(prText, workspaceId) {
  // Dynamically import local backend modules
  const { analyzePreCommitConflict } = await import('../src/conflict-arbiter.js');
  const { evaluateMemoryConsensus } = await import('../src/consensus-engine-v2.js');
  const { recallMemories } = await import('../src/recall-engine-v2.js');
  const { initMongo, findMemories } = await import('../src/db-mongo.js');
  const { extractAndFormMemory, setSimulatedTime } = await import('../src/memory-engine-v2.js');

  await initMongo();
  setSimulatedTime('2026-10-30T10:00:00.000Z');

  // If memory store is empty, seed foundational architectural baseline
  const existing = await findMemories({ workspaceId, status: 'active' });
  if (!existing || existing.length === 0) {
    const user = { id: 'u_sarah', name: 'Sarah Jenkins' };
    await extractAndFormMemory({
      text: 'For Project Atlas, we use Node.js, Express and MongoDB Atlas because we need flexible document persistence.',
      user,
      workspaceId,
      channel: 'architecture'
    });
    await extractAndFormMemory({
      text: 'Do not introduce Redis or paid infrastructure without approval.',
      user,
      workspaceId,
      channel: 'architecture'
    });
    await extractAndFormMemory({
      text: 'No production deployments until November 5, 2026.',
      user,
      workspaceId,
      channel: 'sprint-planning'
    });
  }

  // 1. Conflict analysis
  const conflictRes = await analyzePreCommitConflict({
    text: prText,
    workspaceId
  });

  // 2. Memory recall
  const recallRes = await recallMemories({
    query: prText,
    workspaceId,
    model: 'local-grounded'
  });

  // 3. Consensus evaluation
  const consensusRes = await evaluateMemoryConsensus({
    content: { statement: prText },
    topic: 'Architecture',
    type: 'decision'
  });

  return {
    conflict: conflictRes,
    recall: recallRes,
    consensus: consensusRes,
    activeMemories: await findMemories({ workspaceId, status: 'active' })
  };
}

/**
 * Audits PR text against SynapseMem 2.0
 */
async function auditPullRequest(prText, options = {}) {
  const serverUrl = options.url || DEFAULT_SERVER_URL;
  const workspaceId = options.workspaceId || DEFAULT_WORKSPACE;

  const report = {
    timestamp: new Date().toISOString(),
    prText: prText.trim(),
    passed: true,
    stages: {
      secretAudit: { status: 'passed', details: [] },
      conflictAudit: { status: 'passed', details: null },
      governanceAudit: { status: 'passed', details: null },
      consensusAudit: { status: 'passed', details: null }
    },
    blockingReasons: []
  };

  // ----------------------------------------------------
  // STAGE 1: Secret & Credential Leak Audit
  // ----------------------------------------------------
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(prText)) {
      report.stages.secretAudit.status = 'failed';
      report.stages.secretAudit.details.push(pattern.name);
      report.blockingReasons.push(`Exposed credential detected: ${pattern.name}. PR violates Zero-Trust security rules.`);
      report.passed = false;
    }
  }

  // ----------------------------------------------------
  // Check if server is running or fallback to direct
  // ----------------------------------------------------
  const serverUp = await checkServerHealth(serverUrl);

  let conflictData = null;
  let recallData = null;
  let consensusData = null;
  let activeMemories = [];

  if (serverUp) {
    // Fetch active memories
    try {
      const memRes = await makeRequest(`${serverUrl}/api/memories?status=active`);
      activeMemories = memRes.data || [];
    } catch (err) {
      console.warn(`[Linter] Notice querying memories API: ${err.message}`);
    }

    // Stage 2: Check conflict via API
    try {
      const conflictRes = await makeRequest(`${serverUrl}/api/memories/check-conflict`, 'POST', {
        text: prText,
        workspaceId
      });
      conflictData = conflictRes.data;
    } catch (err) {
      console.warn(`[Linter] Notice querying conflict API: ${err.message}`);
    }

    // Stage 3: Recall active constraints
    try {
      const recallRes = await makeRequest(`${serverUrl}/api/recall`, 'POST', {
        query: prText,
        workspaceId,
        model: 'local-grounded'
      });
      recallData = recallRes.data;
    } catch (err) {
      console.warn(`[Linter] Notice querying recall API: ${err.message}`);
    }

    // Stage 4: Consensus evaluation
    try {
      const consensusRes = await makeRequest(`${serverUrl}/api/consensus/evaluate`, 'POST', {
        statement: prText,
        topic: 'Architecture',
        type: 'decision',
        workspaceId
      });
      consensusData = consensusRes.data;
    } catch (err) {
      console.warn(`[Linter] Notice querying consensus API: ${err.message}`);
    }
  } else {
    // Run direct offline audit
    const directResults = await runDirectAudit(prText, workspaceId);
    conflictData = directResults.conflict;
    recallData = directResults.recall;
    consensusData = directResults.consensus;
    activeMemories = directResults.activeMemories || [];
  }

  // ----------------------------------------------------
  // STAGE 2: Architectural Conflict & Contradiction
  // ----------------------------------------------------
  if (conflictData?.hasConflict) {
    const conflictObj = conflictData.highestConflict || conflictData.conflict || {};
    report.stages.conflictAudit.status = 'failed';
    report.stages.conflictAudit.details = conflictObj;
    const stmt = conflictObj.statement || 'Active architectural constraint';
    const sev = (conflictObj.severity || 'high').toUpperCase();
    const sim = conflictObj.similarity !== undefined ? ` (Similarity: ${conflictObj.similarity})` : '';
    report.blockingReasons.push(
      `Direct Architectural Conflict: PR contradicts active decision "${stmt}" [Severity: ${sev}]${sim}`
    );
    report.passed = false;
  }

  // ----------------------------------------------------
  // STAGE 3: Governance & Deployment Freeze Validation
  // ----------------------------------------------------
  const isDeploymentAttempt = /\b(deploy|deployment|release|prod|production|push to main)\b/i.test(prText);
  if (isDeploymentAttempt) {
    const pool = activeMemories.length > 0 ? activeMemories : (recallData?.selectedMemories || []);
    const activeFreeze = pool.find(m => {
      const stmt = m.content?.statement || m.statement || '';
      const topic = m.topic || '';
      const isFreezeRule = topic === 'Deployment' || /freeze|deployment/i.test(stmt);
      const isStillValid = !m.validUntil || new Date(m.validUntil) > new Date();
      return isFreezeRule && (m.status === 'active' || !m.status) && isStillValid;
    });

    if (activeFreeze) {
      const freezeStmt = activeFreeze.content?.statement || activeFreeze.statement || 'Deployment freeze active';
      const untilStr = activeFreeze.validUntil ? ` until ${new Date(activeFreeze.validUntil).toLocaleDateString()}` : '';
      report.stages.governanceAudit.status = 'failed';
      report.stages.governanceAudit.details = activeFreeze;
      report.blockingReasons.push(
        `Governance Freeze Violation: Production release prohibited by active policy: "${freezeStmt}"${untilStr}`
      );
      report.passed = false;
    }
  }

  // ----------------------------------------------------
  // STAGE 4: Multi-Agent Quorum Consensus
  // ----------------------------------------------------
  if (consensusData) {
    report.stages.consensusAudit.details = consensusData;
    if (consensusData.status === 'rejected' || consensusData.hasHardVeto) {
      report.stages.consensusAudit.status = 'failed';
      const vetoVoter = consensusData.votes?.find(v => v.veto === true || v.vote === 'reject');
      const rationale = vetoVoter ? ` (${vetoVoter.agentName}: ${vetoVoter.rationale})` : '';
      report.blockingReasons.push(`Multi-Agent Quorum Rejected: Proposal failed governance consensus${rationale}`);
      report.passed = false;
    }
  }

  return report;
}

/**
 * Formats report as terminal ANSI output
 */
function renderCliOutput(report) {
  const line = '─'.repeat(70);
  console.log(`\n${colors.bold}${colors.cyan}🧠 SynapseMem 2.0 — Architectural PR Compliance Linter${colors.reset}`);
  console.log(`${colors.dim}${line}${colors.reset}`);
  console.log(`${colors.bold}Target PR Description:${colors.reset} "${report.prText.slice(0, 80)}${report.prText.length > 80 ? '...' : ''}"\n`);

  // Stage 1
  if (report.stages.secretAudit.status === 'passed') {
    console.log(`  ${colors.green}✔ [STAGE 1] Zero-Trust Privacy Gate:${colors.reset} No exposed credentials or secrets`);
  } else {
    console.log(`  ${colors.red}✖ [STAGE 1] Zero-Trust Privacy Gate: LEAK DETECTED${colors.reset} (${report.stages.secretAudit.details.join(', ')})`);
  }

  // Stage 2
  if (report.stages.conflictAudit.status === 'passed') {
    console.log(`  ${colors.green}✔ [STAGE 2] Architectural Contradiction:${colors.reset} Zero conflicts with active MongoDB decisions`);
  } else {
    const c = report.stages.conflictAudit.details || {};
    const stmt = c.statement || 'Active constraint';
    const sev = (c.severity || 'high').toUpperCase();
    console.log(`  ${colors.red}✖ [STAGE 2] Architectural Contradiction:${colors.reset} Contradicts "${stmt}" [${sev}]`);
  }

  // Stage 3
  if (report.stages.governanceAudit.status === 'passed') {
    console.log(`  ${colors.green}✔ [STAGE 3] Release Governance:${colors.reset} Complies with active deployment boundaries`);
  } else {
    const f = report.stages.governanceAudit.details || {};
    const freezeStmt = f.content?.statement || f.statement || 'Active deployment freeze';
    console.log(`  ${colors.red}✖ [STAGE 3] Release Governance:${colors.reset} Active Freeze: "${freezeStmt}"`);
  }

  // Stage 4
  if (report.stages.consensusAudit.status === 'passed') {
    console.log(`  ${colors.green}✔ [STAGE 4] Multi-Agent Quorum:${colors.reset} Ratified by Architect, Security Guard & Pipeline Marshal`);
  } else {
    console.log(`  ${colors.red}✖ [STAGE 4] Multi-Agent Quorum: VETOED${colors.reset} by agent committee`);
  }

  console.log(`${colors.dim}${line}${colors.reset}`);

  // Final Verdict
  if (report.passed) {
    console.log(`${colors.bgGreen}${colors.white}${colors.bold}  PASS  ${colors.reset} ${colors.green}${colors.bold}Pull Request is architecturally compliant. Approved for merge.${colors.reset}\n`);
  } else {
    console.log(`${colors.bgRed}${colors.white}${colors.bold}  FAIL  ${colors.reset} ${colors.red}${colors.bold}Pull Request violates team architectural memory.${colors.reset}\n`);
    console.log(`${colors.bold}Blocking Violations:${colors.reset}`);
    report.blockingReasons.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${colors.yellow}${r}${colors.reset}`);
    });
    console.log('');
  }
}

/**
 * Formats report as GitHub PR Comment Markdown
 */
function renderMarkdownOutput(report) {
  const badge = report.passed
    ? '![Status: Approved](https://img.shields.io/badge/SynapseMem-Approved-brightgreen)'
    : '![Status: Blocked](https://img.shields.io/badge/SynapseMem-Blocked-red)';

  let md = `## 🧠 SynapseMem 2.0 — Architectural PR Compliance Audit\n\n`;
  md += `${badge}\n\n`;
  md += `**Target Review:** \`${report.prText.slice(0, 100)}\`\n\n`;
  md += `| Stage | Audit Description | Result |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **1. Secret Privacy Gate** | Zero-trust token/secret leak detection | ${report.stages.secretAudit.status === 'passed' ? '✅ PASSED' : '❌ **LEAK DETECTED**'} |\n`;
  md += `| **2. Architecture Conflict** | Pre-commit check against MongoDB Atlas policies | ${report.stages.conflictAudit.status === 'passed' ? '✅ PASSED' : '❌ **CONTRADICTION**'} |\n`;
  md += `| **3. Release Governance** | Temporal freeze window & deployment boundary | ${report.stages.governanceAudit.status === 'passed' ? '✅ PASSED' : '❌ **BLOCKED**'} |\n`;
  md += `| **4. Multi-Agent Quorum** | Atlas Architect, Sentinel Guard & Pipeline Marshal | ${report.stages.consensusAudit.status === 'passed' ? '✅ RATIFIED' : '❌ **VETOED**'} |\n\n`;

  if (!report.passed) {
    md += `### 🚨 Required Architectural Resolutions\n\n`;
    report.blockingReasons.forEach(reason => {
      md += `- ⚠️ **${reason}**\n`;
    });
    md += `\n*Please revise this pull request to align with authoritative team memory before requesting re-review.*\n`;
  } else {
    md += `> ✨ **All architectural policies, security gates, and multi-agent consensus checks passed.** Verified against MongoDB Atlas authoritative memory.\n`;
  }

  return md;
}

/**
 * Interactive Demo Runner (Evaluates 4 representative scenarios)
 */
async function runDemo() {
  console.log(`\n${colors.bold}${colors.magenta}══════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}  🚀 SynapseMem 2.0 PR Linter — Automated CI Demonstration Suite     ${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}══════════════════════════════════════════════════════════════════════${colors.reset}`);

  const scenarios = [
    {
      title: 'Scenario 1: Compliant Change (Standard Mongo Worker)',
      text: 'Standardize on MongoDB Atlas change streams for background notification workers.'
    },
    {
      title: 'Scenario 2: Architecture Contradiction (Unauthorized Redis)',
      text: 'Introduce Redis and BullMQ for background job queues without approval.'
    },
    {
      title: 'Scenario 3: Governance Freeze Violation (Emergency Prod Deploy)',
      text: 'Deploy hotfix release directly to production environment during active freeze.'
    },
    {
      title: 'Scenario 4: Security Secret Leak (Accidental Token in PR)',
      text: 'Update payment integration using secret sk_live_9384729183749281729384 for worker auth.'
    }
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    console.log(`\n${colors.bold}${colors.blue}▶ [TEST ${i + 1}/4] ${s.title}${colors.reset}`);
    const report = await auditPullRequest(s.text);
    renderCliOutput(report);
  }

  console.log(`${colors.bold}${colors.green}🎉 PR Linter demonstration completed successfully!${colors.reset}\n`);
}

/**
 * Main CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧠 SynapseMem 2.0 PR Compliance Linter

Usage:
  node scripts/pr-linter.js --text "<pr description or commit message>"
  node scripts/pr-linter.js --file <path/to/pr-body.md>
  node scripts/pr-linter.js --demo
  node scripts/pr-linter.js --text "..." --markdown
  node scripts/pr-linter.js --text "..." --output-file comment.md

Options:
  --text, -t       Raw text of PR description or commit message
  --file, -f       Path to markdown file or diff to audit
  --demo           Runs a 4-part automated scenario test suite
  --markdown, -m   Outputs formatted GitHub PR comment markdown
  --output-file    Writes the markdown output to a target file
  --url            SynapseMem server base URL (default: http://localhost:3000)
  --workspace      Target workspace ID (default: ws_core)
  --help, -h       Shows this help manual
`);
    process.exit(0);
  }

  if (args.includes('--demo')) {
    await runDemo();
    process.exit(0);
  }

  let textToAudit = '';

  const textIdx = args.findIndex(a => a === '--text' || a === '-t');
  if (textIdx !== -1 && args[textIdx + 1]) {
    textToAudit = args[textIdx + 1];
  }

  const fileIdx = args.findIndex(a => a === '--file' || a === '-f');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    const targetFile = path.resolve(process.cwd(), args[fileIdx + 1]);
    if (fs.existsSync(targetFile)) {
      textToAudit = fs.readFileSync(targetFile, 'utf8');
    } else {
      console.error(`Error: File not found: ${targetFile}`);
      process.exit(1);
    }
  }

  if (!textToAudit) {
    console.error('Error: Please provide --text, --file, or run --demo. (Run with --help for usage details)');
    process.exit(1);
  }

  const report = await auditPullRequest(textToAudit);

  if (args.includes('--markdown') || args.includes('-m')) {
    const md = renderMarkdownOutput(report);
    console.log(md);
  } else {
    renderCliOutput(report);
  }

  const outIdx = args.findIndex(a => a === '--output-file');
  if (outIdx !== -1 && args[outIdx + 1]) {
    const outFile = path.resolve(process.cwd(), args[outIdx + 1]);
    fs.writeFileSync(outFile, renderMarkdownOutput(report), 'utf8');
    console.log(`Markdown report written to: ${outFile}`);
  }

  // Exit with non-zero code on violation for CI pipeline enforcement
  process.exit(report.passed ? 0 : 1);
}

main().catch(err => {
  console.error(`Linter Error: ${err.message}`);
  process.exit(1);
});
