/**
 * src/lib/modmail/modmail-service.ts
 * Anonymous Modmail Relay Engine for AiCord.
 *
 * Capabilities:
 * - In-memory test store (enableTestMode, clearTestStore, isTestMode, setTestConfig, getTestConfig, setTestThread, getTestThread)
 * - Server Modmail Configuration & Canned Responses CRUD
 * - Thread Lifecycle: openModmailThread, getModmailThreadByChannel, getModmailThreadById, updateModmailThreadChannel
 * - Single open thread constraint per user in guild
 * - Message Relay: addMessageToThread with anonymous or named staff replies
 * - Thread Closure: closeModmailThread with HTML and Markdown transcripts
 * - Discord Embed Builders & Channel Specifications (permission containment)
 */

import { connectDB } from '@/lib/db';
import {
  ModmailConfig,
  ModmailThread,
  type IModmailConfig,
  type IModmailThread,
  type IModmailMessage,
  type ICannedResponse,
  type ModmailStatus,
} from '@/models';
import { type DiscordEmbed, clampEmbed, Colors } from '@/lib/discord/embeds';
import {
  type ActionRow,
  type ButtonComponent,
  buildActionRow,
  buildButton,
} from '@/lib/discord/interaction-response';
import { PermissionFlags } from '@/lib/discord/permissions';

export type {
  IModmailConfig,
  IModmailThread,
  IModmailMessage,
  ICannedResponse,
  ModmailStatus,
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ChannelPermissionOverwrite {
  id: string;
  type: number; // 0: Role, 1: Member
  allow: string;
  deny: string;
}

export interface ModmailChannelSpec {
  name: string;
  topic?: string;
  parent_id?: string;
  permission_overwrites: ChannelPermissionOverwrite[];
}

export interface OpenModmailResult {
  thread: IModmailThread;
  channelSpec: ModmailChannelSpec;
  headerEmbed: DiscordEmbed;
  headerComponents: ActionRow[];
  initialRelayEmbed?: DiscordEmbed;
  threadId: string;
  recipientId: string;
  recipientTag: string;
  status: ModmailStatus;
  category: string;
  channelId: string;
  messages: IModmailMessage[];
  openedAt: Date;
}

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
let threadCounter = 1;
const testConfigs = new Map<string, IModmailConfig>();
const testThreads = new Map<string, IModmailThread>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testConfigs.clear();
  testThreads.clear();
  threadCounter = 1;
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestConfig(config: IModmailConfig): void {
  testConfigs.set(config.guildId, config);
}

export function getTestConfig(guildId: string): IModmailConfig | undefined {
  return testConfigs.get(guildId);
}

export function setTestThread(thread: IModmailThread): void {
  testThreads.set(thread.threadId, thread);
}

export function getTestThread(threadId: string): IModmailThread | undefined {
  return testThreads.get(threadId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDiscordSnowflakeDate(snowflake: string): Date | null {
  try {
    const id = BigInt(snowflake);
    const timestamp = Number((id >> 22n) + 1420070400000n);
    if (isNaN(timestamp) || timestamp < 1420070400000) return null;
    return new Date(timestamp);
  } catch {
    return null;
  }
}

function sanitizeChannelName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return cleaned || 'user';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateThreadId(): string {
  const num = (threadCounter++).toString().padStart(4, '0');
  return `mm-${num}`;
}

// ─── 1. Modmail Configuration Management ──────────────────────────────────────

export async function getModmailConfig(guildId: string): Promise<IModmailConfig> {
  if (!guildId) {
    throw new Error('guildId is required to retrieve modmail config');
  }

  if (isTestMode()) {
    let config = testConfigs.get(guildId);
    if (!config) {
      config = {
        guildId,
        staffRoleIds: [],
        cannedResponses: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as IModmailConfig;
      testConfigs.set(guildId, config);
    }
    return config;
  }

  await connectDB();
  let config = await ModmailConfig.findOne({ guildId });
  if (!config) {
    config = await ModmailConfig.create({
      guildId,
      staffRoleIds: [],
      cannedResponses: [],
      enabled: true,
    });
  }
  return config;
}

export async function setModmailConfig(
  guildId: string,
  updates: Partial<IModmailConfig>,
): Promise<IModmailConfig> {
  if (!guildId) {
    throw new Error('guildId is required to update modmail config');
  }

  if (isTestMode()) {
    const current = await getModmailConfig(guildId);
    const updated = Object.assign(current, updates, { updatedAt: new Date() });
    testConfigs.set(guildId, updated);
    return updated;
  }

  await connectDB();
  const config = await ModmailConfig.findOneAndUpdate(
    { guildId },
    { $set: updates },
    { new: true, upsert: true },
  );
  return config;
}

// ─── 2. Canned Responses Helpers ──────────────────────────────────────────────

export async function addCannedResponse(
  guildId: string,
  name: string,
  content: string,
): Promise<{ name: string; content: string }> {
  if (!guildId) throw new Error('guildId is required');
  if (!name || !name.trim()) throw new Error('name is required');
  if (!content || !content.trim()) throw new Error('content is required');

  const config = await getModmailConfig(guildId);
  const trimmedName = name.trim();
  const trimmedContent = content.trim();

  const existingIdx = config.cannedResponses.findIndex(
    (c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
  );

  if (existingIdx >= 0) {
    config.cannedResponses[existingIdx].content = trimmedContent;
    config.cannedResponses[existingIdx].name = trimmedName;
  } else {
    config.cannedResponses.push({ name: trimmedName, content: trimmedContent });
  }

  await setModmailConfig(guildId, { cannedResponses: config.cannedResponses });
  return { name: trimmedName, content: trimmedContent };
}

export async function removeCannedResponse(
  guildId: string,
  name: string,
): Promise<boolean> {
  if (!guildId) throw new Error('guildId is required');
  if (!name) return false;

  const config = await getModmailConfig(guildId);
  const initialLen = config.cannedResponses.length;
  const filtered = config.cannedResponses.filter(
    (c) => c.name.toLowerCase() !== name.trim().toLowerCase(),
  );

  if (filtered.length === initialLen) {
    return false;
  }

  await setModmailConfig(guildId, { cannedResponses: filtered });
  return true;
}

export async function getCannedResponse(
  guildId: string,
  name: string,
): Promise<{ name: string; content: string } | undefined> {
  if (!guildId || !name) return undefined;
  const config = await getModmailConfig(guildId);
  return config.cannedResponses.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
  );
}

// ─── 3. Modmail Channel Specification & Embed Builders ────────────────────────

export function buildModmailChannelSpec(
  thread: IModmailThread,
  config: IModmailConfig,
): ModmailChannelSpec {
  const channelName = `modmail-${sanitizeChannelName(thread.recipientTag)}`;
  const overwrites: ChannelPermissionOverwrite[] = [
    // 1. Deny @everyone
    {
      id: thread.guildId,
      type: 0,
      allow: '0',
      deny: PermissionFlags.VIEW_CHANNEL.toString(),
    },
  ];

  // 2. Allow staff roles
  for (const roleId of config.staffRoleIds || []) {
    if (roleId) {
      overwrites.push({
        id: roleId,
        type: 0,
        allow: (
          PermissionFlags.VIEW_CHANNEL |
          PermissionFlags.SEND_MESSAGES |
          PermissionFlags.READ_MESSAGE_HISTORY |
          PermissionFlags.EMBED_LINKS |
          PermissionFlags.ATTACH_FILES
        ).toString(),
        deny: '0',
      });
    }
  }

  return {
    name: channelName,
    topic: `Modmail Session | Thread: ${thread.threadId} | Member: ${thread.recipientTag} (${thread.recipientId}) | Category: ${thread.category}`,
    parent_id: config.categoryId || undefined,
    permission_overwrites: overwrites,
  };
}

export function buildStaffHeaderEmbed(thread: IModmailThread): DiscordEmbed & {
  embed: DiscordEmbed;
  components: ActionRow[];
} {
  const snowflakeDate = getDiscordSnowflakeDate(thread.recipientId);
  const accountAgeDisplay = snowflakeDate
    ? `<t:${Math.floor(snowflakeDate.getTime() / 1000)}:R> (<t:${Math.floor(snowflakeDate.getTime() / 1000)}:d>)`
    : 'Unknown';

  const embed: DiscordEmbed = clampEmbed({
    title: `📬 Modmail Thread — ${thread.recipientTag}`,
    description: `A new modmail session has been opened with <@${thread.recipientId}>.\nUse \`/modmail reply\` to communicate with the member.`,
    color: Colors.PRIMARY,
    fields: [
      {
        name: '👤 Recipient',
        value: `<@${thread.recipientId}> (\`${thread.recipientTag}\`)`,
        inline: true,
      },
      {
        name: '🆔 User ID',
        value: `\`${thread.recipientId}\``,
        inline: true,
      },
      {
        name: '🏷️ Category',
        value: `\`${thread.category}\``,
        inline: true,
      },
      {
        name: '📅 Account Age',
        value: accountAgeDisplay,
        inline: true,
      },
      {
        name: '📁 Thread ID',
        value: `\`${thread.threadId}\``,
        inline: true,
      },
      {
        name: '⏱️ Opened',
        value: `<t:${Math.floor(new Date(thread.openedAt).getTime() / 1000)}:R>`,
        inline: true,
      },
    ],
    footer: {
      text: 'AiCord Modmail Relay • Confidential Staff Channel',
    },
    timestamp: new Date(thread.openedAt).toISOString(),
  });

  const closeButton: ButtonComponent = buildButton({
    style: 4, // Danger
    label: 'Close Modmail',
    emoji: '🔒',
    customId: `mm_close:${thread.channelId}`,
  });

  const components = [buildActionRow(closeButton)];

  return Object.assign(embed, {
    embed,
    components,
  });
}

export function buildRelayEmbed(
  content: string,
  isStaff: boolean,
  anonymous: boolean = true,
  authorTag: string = isStaff ? 'Staff' : 'Member',
): DiscordEmbed {
  let authorName: string;
  let footerText: string;
  let color: number;

  if (isStaff) {
    if (anonymous) {
      authorName = 'Staff Team';
      footerText = 'Anonymous Staff Message • AiCord Modmail';
    } else {
      authorName = `${authorTag} (Staff)`;
      footerText = 'Staff Message • AiCord Modmail';
    }
    color = Colors.PRIMARY;
  } else {
    authorName = authorTag;
    footerText = 'Incoming Member Message • AiCord Modmail';
    color = Colors.SUCCESS;
  }

  return clampEmbed({
    author: { name: authorName },
    description: content,
    color,
    footer: { text: footerText },
    timestamp: new Date().toISOString(),
  });
}

// ─── 4. Modmail Transcripts (Markdown & HTML) ─────────────────────────────────

export function generateModmailMarkdownTranscript(thread: IModmailThread): string {
  const lines: string[] = [
    `# 📬 AiCord Modmail Transcript — ${thread.threadId}`,
    `------------------------------------------------------------`,
    `**Thread ID:** ${thread.threadId}`,
    `**Guild ID:** ${thread.guildId}`,
    `**Channel ID:** ${thread.channelId}`,
    `**Category:** ${thread.category}`,
    `**Recipient:** ${thread.recipientTag} (${thread.recipientId})`,
    `**Status:** ${thread.status}`,
    `**Opened At:** ${new Date(thread.openedAt).toISOString()}`,
    `**Closed At:** ${thread.closedAt ? new Date(thread.closedAt).toISOString() : 'N/A'}`,
    `**Closed By:** ${thread.closedBy ? thread.closedBy : 'N/A'}`,
    `**Close Reason:** ${thread.closeReason || 'N/A'}`,
    `------------------------------------------------------------`,
    `## Conversation History (${thread.messages.length} messages)`,
    ``,
  ];

  if (thread.messages.length === 0) {
    lines.push('*No messages recorded in modmail session.*');
  } else {
    for (const msg of thread.messages) {
      const timeStr = msg.timestamp
        ? new Date(msg.timestamp).toISOString().replace('T', ' ').substring(0, 19)
        : new Date().toISOString().replace('T', ' ').substring(0, 19);
      const sender = msg.isStaff
        ? msg.anonymous
          ? 'Staff (Anonymous)'
          : `${msg.authorTag} (Staff)`
        : `${msg.authorTag} (Member)`;
      lines.push(`[${timeStr}] ${sender}: ${msg.content}`);
    }
  }

  lines.push('');
  lines.push(`------------------------------------------------------------`);
  lines.push(`AiCord Anonymous Modmail Relay • Generated automatically`);

  return lines.join('\n');
}

export function generateModmailHtmlTranscript(thread: IModmailThread): string {
  const messageItems =
    thread.messages.length === 0
      ? '<p class="empty-msg">No messages recorded in modmail session.</p>'
      : thread.messages
          .map((m) => {
            const timeStr = m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString()
              : '';
            const sender = m.isStaff
              ? m.anonymous
                ? 'Staff (Anonymous)'
                : `${m.authorTag} (Staff)`
              : `${m.authorTag} (Member)`;
            const roleClass = m.isStaff ? 'staff' : 'user';
            return `<div class="message ${roleClass}">
              <span class="author">${escapeHtml(sender)}</span>
              <span class="time">${escapeHtml(timeStr)}</span>
              <div class="content">${escapeHtml(m.content)}</div>
            </div>`;
          })
          .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Modmail Transcript — ${thread.threadId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #2f3136; color: #dcddde; padding: 24px; margin: 0; }
    .header { background: #202225; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    h1 { color: #5865f2; margin: 0 0 10px 0; font-size: 22px; }
    .meta { font-size: 14px; line-height: 1.6; color: #b9bbbe; }
    .message { background: #36393f; padding: 12px; border-radius: 6px; margin-bottom: 10px; }
    .message.staff { border-left: 4px solid #5865f2; }
    .message.user { border-left: 4px solid #57f287; }
    .author { font-weight: bold; color: #ffffff; margin-right: 8px; }
    .time { font-size: 11px; color: #72767d; }
    .content { margin-top: 6px; font-size: 14px; white-space: pre-wrap; }
    .empty-msg { color: #72767d; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Modmail Thread ${escapeHtml(thread.threadId)} — Transcript</h1>
    <div class="meta">
      <div><strong>Recipient:</strong> ${escapeHtml(thread.recipientTag)} (${escapeHtml(thread.recipientId)})</div>
      <div><strong>Category:</strong> ${escapeHtml(thread.category)}</div>
      <div><strong>Closed By:</strong> ${escapeHtml(thread.closedBy || 'System')}</div>
      <div><strong>Reason:</strong> ${escapeHtml(thread.closeReason || 'No reason provided')}</div>
    </div>
  </div>
  <div class="messages">
    ${messageItems}
  </div>
</body>
</html>`;
}

// ─── 5. Modmail Thread Lifecycle ──────────────────────────────────────────────

export async function openModmailThread(
  guildId: string,
  recipientId: string,
  recipientTag: string = 'Member',
  category: string = 'general',
  initialMessage?: string,
  channelId?: string,
): Promise<IModmailThread & OpenModmailResult> {
  if (!guildId) throw new Error('guildId is required to open a modmail thread');
  if (!recipientId) throw new Error('recipientId is required to open a modmail thread');

  // Enforce single active open thread constraint per user in guild
  let existing: IModmailThread | null = null;
  if (isTestMode()) {
    existing =
      Array.from(testThreads.values()).find(
        (t) => t.guildId === guildId && t.recipientId === recipientId && t.status === 'open',
      ) ?? null;
  } else {
    await connectDB();
    existing = await ModmailThread.findOne({
      guildId,
      recipientId,
      status: 'open',
    });
  }

  if (existing) {
    throw new Error(`User already has an active modmail thread (${existing.threadId})`);
  }

  const threadId = generateThreadId();
  const resolvedChannelId = channelId || threadId;
  const config = await getModmailConfig(guildId);

  const messages: IModmailMessage[] = [];
  if (initialMessage && initialMessage.trim().length > 0) {
    messages.push({
      id: `msg_init_${Date.now()}`,
      authorId: recipientId,
      authorTag: recipientTag,
      isStaff: false,
      anonymous: false,
      content: initialMessage.trim(),
      attachments: [],
      timestamp: new Date(),
    });
  }

  let thread: IModmailThread;
  if (isTestMode()) {
    thread = {
      guildId,
      threadId,
      channelId: resolvedChannelId,
      recipientId,
      recipientTag,
      status: 'open',
      category,
      messages,
      openedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IModmailThread;
    testThreads.set(threadId, thread);
  } else {
    await connectDB();
    thread = await ModmailThread.create({
      guildId,
      threadId,
      channelId: resolvedChannelId,
      recipientId,
      recipientTag,
      status: 'open',
      category,
      messages,
      openedAt: new Date(),
    });
  }

  const channelSpec = buildModmailChannelSpec(thread, config);
  const header = buildStaffHeaderEmbed(thread);
  const initialRelayEmbed = initialMessage
    ? buildRelayEmbed(initialMessage, false, false, recipientTag)
    : undefined;

  const result: OpenModmailResult = {
    thread,
    channelSpec,
    headerEmbed: header.embed,
    headerComponents: header.components,
    initialRelayEmbed,
    threadId: thread.threadId,
    recipientId: thread.recipientId,
    recipientTag: thread.recipientTag,
    status: thread.status,
    category: thread.category,
    channelId: thread.channelId,
    messages: thread.messages,
    openedAt: thread.openedAt,
  };

  return Object.assign(thread, result);
}

export async function getModmailThreadByChannel(
  guildId: string,
  channelId: string,
): Promise<IModmailThread | null> {
  if (!guildId || !channelId) return null;

  if (isTestMode()) {
    for (const thread of testThreads.values()) {
      if (thread.guildId === guildId && thread.channelId === channelId) {
        return thread;
      }
    }
    return null;
  }

  await connectDB();
  return ModmailThread.findOne({ guildId, channelId });
}

export async function getModmailThreadById(
  guildId: string,
  threadId: string,
): Promise<IModmailThread | null> {
  if (!guildId || !threadId) return null;

  if (isTestMode()) {
    const thread = testThreads.get(threadId);
    return thread && thread.guildId === guildId ? thread : null;
  }

  await connectDB();
  return ModmailThread.findOne({ guildId, threadId });
}

export async function updateModmailThreadChannel(
  guildId: string,
  threadId: string,
  channelId: string,
): Promise<IModmailThread | null> {
  if (!guildId || !threadId) return null;

  if (isTestMode()) {
    const thread = testThreads.get(threadId);
    if (thread && thread.guildId === guildId) {
      thread.channelId = channelId;
      thread.updatedAt = new Date();
      return thread;
    }
    return null;
  }

  await connectDB();
  return ModmailThread.findOneAndUpdate(
    { guildId, threadId },
    { $set: { channelId, updatedAt: new Date() } },
    { new: true },
  );
}

export async function addMessageToThread(
  guildId: string,
  channelId: string,
  params: {
    authorId: string;
    authorTag: string;
    isStaff: boolean;
    content: string;
    anonymous?: boolean;
    attachments?: string[];
  },
): Promise<{
  message: IModmailMessage;
  embed: DiscordEmbed;
  thread: IModmailThread;
}> {
  const thread = await getModmailThreadByChannel(guildId, channelId);
  if (!thread) {
    throw new Error(`Modmail thread for channel ${channelId} not found`);
  }
  if (thread.status === 'closed') {
    throw new Error(`Modmail thread ${thread.threadId} is already closed`);
  }

  const anonymous = params.anonymous ?? (params.isStaff ? true : false);
  const message: IModmailMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authorId: params.authorId,
    authorTag: params.authorTag,
    isStaff: params.isStaff,
    anonymous,
    content: params.content,
    attachments: params.attachments ?? [],
    timestamp: new Date(),
  };

  thread.messages.push(message);
  thread.updatedAt = new Date();

  if (isTestMode()) {
    testThreads.set(thread.threadId, thread);
  } else {
    await thread.save();
  }

  const embed = buildRelayEmbed(
    message.content,
    message.isStaff,
    message.anonymous,
    message.authorTag,
  );

  return {
    message,
    embed,
    thread,
  };
}

export async function closeModmailThread(
  guildId: string,
  channelId: string,
  closedBy: string,
  reason?: string,
): Promise<{
  thread: IModmailThread;
  transcriptMd: string;
  transcriptHtml: string;
}> {
  const thread = await getModmailThreadByChannel(guildId, channelId);
  if (!thread) {
    throw new Error(`Modmail thread for channel ${channelId} not found`);
  }
  if (thread.status === 'closed') {
    throw new Error(`Modmail thread ${thread.threadId} is already closed`);
  }

  thread.status = 'closed';
  thread.closedAt = new Date();
  thread.closedBy = closedBy;
  thread.closeReason = reason || 'No reason provided';
  thread.updatedAt = new Date();

  const transcriptMd = generateModmailMarkdownTranscript(thread);
  const transcriptHtml = generateModmailHtmlTranscript(thread);

  if (isTestMode()) {
    testThreads.set(thread.threadId, thread);
  } else {
    await thread.save();
  }

  return {
    thread,
    transcriptMd,
    transcriptHtml,
  };
}
