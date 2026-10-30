import { clearAllMemories, clearChannelMessages, insertConversationMessage } from './db.js';
import { processMessageForMemory, setSimulatedTime } from './memory-engine.js';

export function seedDemoData() {
  clearAllMemories();
  clearChannelMessages('architecture');
  clearChannelMessages('sprint-planning');
  clearChannelMessages('ask-assistant');

  // Set base date to 2026-10-30T10:00:00Z
  setSimulatedTime('2026-10-30T10:00:00.000Z');

  // 1. Initial Postgres decision in #architecture
  const msg1 = {
    id: 'msg_seed_1',
    channel: 'architecture',
    sender: 'Sarah (Tech Lead)',
    sender_role: 'team',
    text: "We’re using Postgres because the team knows SQL and we need ACID compliance.",
    timestamp: '2026-10-15T14:20:00.000Z'
  };
  const res1 = processMessageForMemory(msg1.text, msg1.sender, msg1.channel);
  msg1.memories_extracted = res1.extracted ? [res1.extracted.id] : [];
  insertConversationMessage(msg1);

  // 2. React + Tailwind decision in #architecture
  const msg2 = {
    id: 'msg_seed_2',
    channel: 'architecture',
    sender: 'Elena (Frontend Dev)',
    sender_role: 'team',
    text: "We’re using React with Tailwind CSS because of rapid UI component prototyping.",
    timestamp: '2026-10-18T09:15:00.000Z'
  };
  const res2 = processMessageForMemory(msg2.text, msg2.sender, msg2.channel);
  msg2.memories_extracted = res2.extracted ? [res2.extracted.id] : [];
  insertConversationMessage(msg2);

  // 3. Demo assumption in #sprint-planning (temporal deadline)
  const msg3 = {
    id: 'msg_seed_3',
    channel: 'sprint-planning',
    sender: 'Marcus (Product Manager)',
    sender_role: 'team',
    text: "The demo is on Friday because executive stakeholders are visiting.",
    timestamp: '2026-10-25T11:00:00.000Z'
  };
  const res3 = processMessageForMemory(msg3.text, msg3.sender, msg3.channel);
  msg3.memories_extracted = res3.extracted ? [res3.extracted.id] : [];
  insertConversationMessage(msg3);

  // 4. Auth0 decision
  const msg4 = {
    id: 'msg_seed_4',
    channel: 'architecture',
    sender: 'David (SecOps)',
    sender_role: 'team',
    text: "We decided on Auth0 for authentication because we need enterprise SSO and RBAC.",
    timestamp: '2026-10-26T16:40:00.000Z'
  };
  const res4 = processMessageForMemory(msg4.text, msg4.sender, msg4.channel);
  msg4.memories_extracted = res4.extracted ? [res4.extracted.id] : [];
  insertConversationMessage(msg4);

  return { status: 'seeded', count: 4 };
}
