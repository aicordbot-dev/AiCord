/**
 * src/lib/tickets/ticket-service.ts
 * Interactive Ticket Hub Engine for AiCord.
 *
 * Capabilities:
 * - In-memory test store (enableTestMode, clearTestStore) for zero-network testing
 * - Entitlement gating: calls checkFeatureAccess(guildId, 'maxTickets')
 *   (Free tier: 3 open tickets, Pro tier: 25 open tickets, Ultimate/Lifetime: unlimited)
 * - Dynamic panel creation and interactive embed generation
 * - Ticket lifecycle: open, claim, close, markdown/html transcript generation
 * - 5-star CSAT customer satisfaction ratings
 * - Channel specification generator with permission containment
 * - Ticket analytics and stats aggregation
 */

import { ChannelType } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import {
  Ticket,
  TicketPanel,
  type ITicket,
  type ITicketPanel,
  type TicketPanelCategory,
  type TicketStatus,
} from '@/models';
import { checkFeatureAccess } from '@/lib/premium/entitlements';
import { Colors, clampEmbed, type DiscordEmbed, successEmbed } from '@/lib/discord/embeds';
import {
  buildButton,
  buildActionRow,
  type ActionRow,
  type ButtonComponent,
} from '@/lib/discord/interaction-response';
import { PermissionFlags } from '@/lib/discord/permissions';
import { sanitizeChannelName } from '@/lib/limits';

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
const testPanels = new Map<string, ITicketPanel>();
const testTickets = new Map<string, ITicket>();
const ticketCounters = new Map<string, number>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testPanels.clear;
  testPanels.clear();
  testTickets.clear();
  ticketCounters.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestTicket(ticket: ITicket): void {
  testTickets.set(ticket.ticketId, ticket);
}

export function setTestPanel(panel: ITicketPanel): void {
  testPanels.set(panel.panelId, panel);
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TicketMessage {
  author: string;
  authorId?: string;
  content: string;
  timestamp?: Date | string;
}

export interface CreatePanelInput {
  title: string;
  description: string;
  panelId?: string;
  channelId?: string;
  messageId?: string;
  categories?: TicketPanelCategory[];
  supportRoleIds?: string[];
  logChannelId?: string;
  categoryId?: string;
  namingScheme?: string;
}

export interface ChannelPermissionOverwrite {
  id: string;
  type: number; // 0 for role, 1 for member
  allow: string;
  deny: string;
}

export interface TicketChannelSpec {
  name: string;
  type: ChannelType;
  parent_id?: string;
  permission_overwrites: ChannelPermissionOverwrite[];
  topic?: string;
}

export interface OpenTicketResult {
  ticket: ITicket;
  channelSpec: TicketChannelSpec;
  embed: DiscordEmbed;
  components: ActionRow[];
}

export interface TicketStats {
  total: number;
  open: number;
  claimed: number;
  closed: number;
  avgRating: number;
  ratingCount: number;
}

// ─── Helper: Sequential Ticket ID ─────────────────────────────────────────────

async function getNextTicketNumber(guildId: string): Promise<number> {
  if (isTestMode()) {
    const current = ticketCounters.get(guildId) ?? 0;
    const next = current + 1;
    ticketCounters.set(guildId, next);
    return next;
  }

  await connectDB();
  const count = await Ticket.countDocuments({ guildId });
  return count + 1;
}

// ─── Open Ticket Count ────────────────────────────────────────────────────────

export async function getOpenTicketCount(guildId: string): Promise<number> {
  if (isTestMode()) {
    return Array.from(testTickets.values()).filter(
      (t) => t.guildId === guildId && t.status !== 'closed',
    ).length;
  }

  await connectDB();
  return Ticket.countDocuments({
    guildId,
    status: { $in: ['open', 'claimed'] },
  });
}

// ─── 1. Create Ticket Panel ───────────────────────────────────────────────────

export async function createTicketPanel(
  guildId: string,
  data: CreatePanelInput,
): Promise<ITicketPanel> {
  if (!guildId) {
    throw new Error('guildId is required to create a ticket panel');
  }
  if (!data.title?.trim()) {
    throw new Error('Panel title is required');
  }
  if (!data.description?.trim()) {
    throw new Error('Panel description is required');
  }

  const panelId = data.panelId || `panel_${Math.random().toString(36).substring(2, 9)}`;
  const channelId = data.channelId || '0';
  const namingScheme = data.namingScheme || 'ticket-{number}';
  const supportRoleIds = data.supportRoleIds ?? [];
  const categories: TicketPanelCategory[] =
    data.categories && data.categories.length > 0
      ? data.categories
      : [
          {
            id: 'general',
            label: 'General Support',
            emoji: '🎫',
            description: 'General support and inquiries',
          },
        ];

  if (isTestMode()) {
    const panelObj = {
      guildId,
      panelId,
      channelId,
      messageId: data.messageId,
      title: data.title.trim(),
      description: data.description.trim(),
      categories,
      supportRoleIds,
      logChannelId: data.logChannelId,
      categoryId: data.categoryId,
      namingScheme,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ITicketPanel;

    testPanels.set(panelId, panelObj);
    return panelObj;
  }

  await connectDB();
  const panel = await TicketPanel.create({
    guildId,
    panelId,
    channelId,
    messageId: data.messageId,
    title: data.title.trim(),
    description: data.description.trim(),
    categories,
    supportRoleIds,
    logChannelId: data.logChannelId,
    categoryId: data.categoryId,
    namingScheme,
  });

  return panel;
}

// ─── 2. Build Ticket Panel Embed & Components ─────────────────────────────────

export function buildTicketPanelEmbed(panel: ITicketPanel): {
  embed: DiscordEmbed;
  components: ActionRow[];
} {
  const fields = panel.categories.map((cat) => ({
    name: `${cat.emoji ? cat.emoji + ' ' : ''}${cat.label}`,
    value: cat.description || 'Click the button below to open a ticket.',
    inline: false,
  }));

  const embed: DiscordEmbed = clampEmbed({
    title: panel.title,
    description: panel.description,
    color: Colors.PRIMARY,
    fields: fields.length > 0 ? fields : undefined,
    footer: {
      text: 'AiCord Ticket Hub • Select a category below to get help from our staff',
    },
  });

  const rows: ActionRow[] = [];
  const categories = panel.categories ?? [];

  for (let i = 0; i < categories.length && i < 25; i += 5) {
    const chunk = categories.slice(i, i + 5);
    const buttons = chunk.map((cat) =>
      buildButton({
        style: 1, // Primary (Blurple)
        label: cat.label,
        emoji: cat.emoji,
        customId: `ticket_create:${panel.panelId}:${cat.id}`,
      }),
    );
    rows.push(buildActionRow(...buttons));
  }

  // If no categories configured, provide a default ticket button
  if (rows.length === 0) {
    rows.push(
      buildActionRow(
        buildButton({
          style: 1,
          label: 'Create Ticket',
          emoji: '🎫',
          customId: `ticket_create:${panel.panelId}:general`,
        }),
      ),
    );
  }

  return { embed, components: rows };
}

// ─── 3. Channel Specification Generator ───────────────────────────────────────

export function buildTicketChannelSpec(
  guildId: string,
  ticket: ITicket,
  panel?: ITicketPanel | null,
): TicketChannelSpec {
  const namingScheme = panel?.namingScheme || 'ticket-{number}';
  const rawNumber = ticket.ticketId.replace(/^ticket-/, '');
  const formattedName = sanitizeChannelName(
    namingScheme.replace('{number}', rawNumber),
  );

  const overwrites: ChannelPermissionOverwrite[] = [
    // 1. Deny @everyone
    {
      id: guildId,
      type: 0, // Role
      allow: '0',
      deny: PermissionFlags.VIEW_CHANNEL.toString(),
    },
    // 2. Allow ticket owner
    {
      id: ticket.userId,
      type: 1, // Member
      allow: (
        PermissionFlags.VIEW_CHANNEL |
        PermissionFlags.SEND_MESSAGES |
        PermissionFlags.READ_MESSAGE_HISTORY |
        PermissionFlags.EMBED_LINKS |
        PermissionFlags.ATTACH_FILES
      ).toString(),
      deny: '0',
    },
  ];

  // 3. Allow support roles
  if (panel?.supportRoleIds && panel.supportRoleIds.length > 0) {
    for (const roleId of panel.supportRoleIds) {
      if (roleId) {
        overwrites.push({
          id: roleId,
          type: 0, // Role
          allow: (
            PermissionFlags.VIEW_CHANNEL |
            PermissionFlags.SEND_MESSAGES |
            PermissionFlags.READ_MESSAGE_HISTORY |
            PermissionFlags.EMBED_LINKS |
            PermissionFlags.ATTACH_FILES |
            PermissionFlags.MANAGE_MESSAGES
          ).toString(),
          deny: '0',
        });
      }
    }
  }

  return {
    name: formattedName || `ticket-${rawNumber}`,
    type: ChannelType.GuildText,
    parent_id: panel?.categoryId || undefined,
    permission_overwrites: overwrites,
    topic: `Ticket ${ticket.ticketId} | User: <@${ticket.userId}> | Category: ${ticket.category}`,
  };
}

// ─── 4. Open Ticket ───────────────────────────────────────────────────────────

export async function openTicket(
  guildId: string,
  userId: string,
  category: string,
  panelId?: string,
  channelId: string = '',
): Promise<OpenTicketResult> {
  if (!guildId) {
    throw new Error('guildId is required to open a ticket');
  }
  if (!userId) {
    throw new Error('userId is required to open a ticket');
  }

  // 1. Entitlement Gating Check
  const access = await checkFeatureAccess(guildId, 'maxTickets');
  if (!access.allowed && access.limit === 0) {
    throw new Error(
      `Tickets are disabled for this server tier (${access.tier}). Upgrade with /premium to unlock the Interactive Ticket Hub.`,
    );
  }

  if (access.limit !== undefined && access.limit !== -1) {
    const currentOpen = await getOpenTicketCount(guildId);
    if (currentOpen >= access.limit) {
      throw new Error(
        `Ticket quota reached: ${currentOpen}/${access.limit} open tickets for tier ${access.tier.toUpperCase()}. Upgrade tier with /premium to open more tickets.`,
      );
    }
  }

  // 2. Sequential Ticket Number
  const nextNumber = await getNextTicketNumber(guildId);
  const ticketId = `ticket-${String(nextNumber).padStart(4, '0')}`;

  // 3. Resolve Panel if provided
  let panel: ITicketPanel | null = null;
  if (panelId) {
    if (isTestMode()) {
      panel = testPanels.get(panelId) ?? null;
    } else {
      await connectDB();
      panel = await TicketPanel.findOne({ guildId, panelId });
    }
  }

  // 4. Create Ticket Record
  let ticket: ITicket;
  if (isTestMode()) {
    ticket = {
      guildId,
      ticketId,
      channelId,
      userId,
      panelId,
      category,
      status: 'open' as TicketStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ITicket;
    testTickets.set(ticketId, ticket);
  } else {
    await connectDB();
    ticket = await Ticket.create({
      guildId,
      ticketId,
      channelId,
      userId,
      panelId,
      category,
      status: 'open',
    });
  }

  // 5. Build Channel Spec & Welcome Embed
  const channelSpec = buildTicketChannelSpec(guildId, ticket, panel);
  const welcome = buildTicketWelcomeEmbed(ticket, panel);

  return {
    ticket,
    channelSpec,
    embed: welcome.embed,
    components: welcome.components,
  };
}

// ─── 5. Build Ticket Welcome Embed ────────────────────────────────────────────

export function buildTicketWelcomeEmbed(
  ticket: ITicket,
  panel?: ITicketPanel | null,
): {
  embed: DiscordEmbed;
  components: ActionRow[];
} {
  const isClaimed = ticket.status === 'claimed';
  const color = isClaimed ? Colors.SUCCESS : Colors.PRIMARY;

  const fields = [
    { name: '🎫 Ticket ID', value: `\`${ticket.ticketId}\``, inline: true },
    { name: '📂 Category', value: ticket.category, inline: true },
    {
      name: '📊 Status',
      value: isClaimed ? '🟢 Claimed' : '🟡 Open',
      inline: true,
    },
    { name: '👤 Opened By', value: `<@${ticket.userId}>`, inline: true },
  ];

  if (ticket.claimedBy) {
    fields.push({
      name: '🙋 Claimed By',
      value: `<@${ticket.claimedBy}>`,
      inline: true,
    });
  }

  if (panel?.supportRoleIds && panel.supportRoleIds.length > 0) {
    fields.push({
      name: '🛡️ Support Roles',
      value: panel.supportRoleIds.map((r) => `<@&${r}>`).join(' '),
      inline: false,
    });
  }

  const embed: DiscordEmbed = clampEmbed({
    title: `🎫 Ticket ${ticket.ticketId} — Support Session`,
    description: `Welcome <@${ticket.userId}>! Support staff has been notified and will assist you shortly.\nPlease describe your issue or question in detail.`,
    color,
    fields,
    footer: {
      text: 'AiCord Ticket Hub • Staff can claim or close this ticket with the buttons below',
    },
    timestamp: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString(),
  });

  const claimButton: ButtonComponent = buildButton({
    style: 1, // Primary
    label: isClaimed ? 'Claimed' : 'Claim Ticket',
    emoji: isClaimed ? '✅' : '🙋',
    customId: `ticket_claim:${ticket.ticketId}`,
    disabled: isClaimed,
  });

  const closeButton: ButtonComponent = buildButton({
    style: 4, // Danger
    label: 'Close Ticket',
    emoji: '🔒',
    customId: `ticket_close:${ticket.ticketId}`,
  });

  return {
    embed,
    components: [buildActionRow(claimButton, closeButton)],
  };
}

// ─── 6. Claim Ticket ──────────────────────────────────────────────────────────

export async function claimTicket(
  guildId: string,
  ticketId: string,
  staffUserId: string,
): Promise<{
  ticket: ITicket;
  embed: DiscordEmbed;
  components: ActionRow[];
}> {
  if (!guildId) throw new Error('guildId is required to claim a ticket');
  if (!ticketId) throw new Error('ticketId is required to claim a ticket');
  if (!staffUserId) throw new Error('staffUserId is required to claim a ticket');

  let ticket: ITicket | null = null;
  if (isTestMode()) {
    ticket = testTickets.get(ticketId) ?? null;
  } else {
    await connectDB();
    ticket = await Ticket.findOne({ guildId, ticketId });
  }

  if (!ticket) {
    throw new Error(`Ticket "${ticketId}" not found in server`);
  }
  if (ticket.status === 'closed') {
    throw new Error(`Cannot claim closed ticket "${ticketId}"`);
  }

  ticket.status = 'claimed';
  ticket.claimedBy = staffUserId;
  ticket.claimedAt = new Date();
  ticket.updatedAt = new Date();

  if (isTestMode()) {
    testTickets.set(ticketId, ticket);
  } else {
    await ticket.save();
  }

  // Resolve panel for support roles display if present
  let panel: ITicketPanel | null = null;
  if (ticket.panelId) {
    if (isTestMode()) {
      panel = testPanels.get(ticket.panelId) ?? null;
    } else {
      panel = await TicketPanel.findOne({ guildId, panelId: ticket.panelId });
    }
  }

  const welcome = buildTicketWelcomeEmbed(ticket, panel);
  return {
    ticket,
    embed: welcome.embed,
    components: welcome.components,
  };
}

// ─── 7. Close Ticket & Markdown Transcript Generation ─────────────────────────

export function generateMarkdownTranscript(
  ticket: ITicket,
  messages: TicketMessage[] = [],
  closedBy?: string,
  reason?: string,
): string {
  const lines: string[] = [
    `# 🎫 AiCord Support Ticket Transcript — ${ticket.ticketId}`,
    `------------------------------------------------------------`,
    `**Ticket ID:** ${ticket.ticketId}`,
    `**Guild ID:** ${ticket.guildId}`,
    `**Category:** ${ticket.category}`,
    `**Opened By:** <@${ticket.userId}> (${ticket.userId})`,
    `**Claimed By:** ${ticket.claimedBy ? `<@${ticket.claimedBy}> (${ticket.claimedBy})` : 'Unclaimed'}`,
    `**Closed By:** ${closedBy ? `<@${closedBy}> (${closedBy})` : 'System'}`,
    `**Close Reason:** ${reason || ticket.closeReason || 'No reason provided'}`,
    `**Created At:** ${ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString()}`,
    `**Closed At:** ${new Date().toISOString()}`,
    `------------------------------------------------------------`,
    `## Conversation History (${messages.length} messages)`,
    ``,
  ];

  if (messages.length === 0) {
    lines.push('*No messages recorded in ticket session.*');
  } else {
    for (const msg of messages) {
      const timeStr = msg.timestamp
        ? new Date(msg.timestamp).toISOString().replace('T', ' ').substring(0, 19)
        : new Date().toISOString().replace('T', ' ').substring(0, 19);
      lines.push(`[${timeStr}] ${msg.author}: ${msg.content}`);
    }
  }

  lines.push('');
  lines.push(`------------------------------------------------------------`);
  lines.push(`AiCord Interactive Ticket Hub • Generated automatically`);

  return lines.join('\n');
}

export function generateHtmlTranscript(
  ticket: ITicket,
  messages: TicketMessage[] = [],
  closedBy?: string,
  reason?: string,
): string {
  const messageItems =
    messages.length === 0
      ? '<p class="empty-msg">No messages recorded in ticket session.</p>'
      : messages
          .map((m) => {
            const timeStr = m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString()
              : '';
            return `<div class="message">
              <span class="author">${escapeHtml(m.author)}</span>
              <span class="time">${escapeHtml(timeStr)}</span>
              <div class="content">${escapeHtml(m.content)}</div>
            </div>`;
          })
          .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ticket Transcript — ${ticket.ticketId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #2f3136; color: #dcddde; padding: 24px; margin: 0; }
    .header { background: #202225; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    h1 { color: #5865f2; margin: 0 0 10px 0; font-size: 22px; }
    .meta { font-size: 14px; line-height: 1.6; color: #b9bbbe; }
    .message { background: #36393f; padding: 12px; border-radius: 6px; margin-bottom: 10px; }
    .author { font-weight: bold; color: #ffffff; margin-right: 8px; }
    .time { font-size: 11px; color: #72767d; }
    .content { margin-top: 6px; font-size: 14px; white-space: pre-wrap; }
    .empty-msg { color: #72767d; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ticket ${escapeHtml(ticket.ticketId)} — Transcript</h1>
    <div class="meta">
      <div><strong>Category:</strong> ${escapeHtml(ticket.category)}</div>
      <div><strong>Opened By:</strong> ${escapeHtml(ticket.userId)}</div>
      <div><strong>Closed By:</strong> ${escapeHtml(closedBy || 'System')}</div>
      <div><strong>Reason:</strong> ${escapeHtml(reason || 'No reason provided')}</div>
    </div>
  </div>
  <div class="messages">
    ${messageItems}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function closeTicket(
  guildId: string,
  ticketId: string,
  closedByUserId: string,
  reason?: string,
  messages?: TicketMessage[],
): Promise<{
  ticket: ITicket;
  embed: DiscordEmbed;
  ratingRow: ActionRow;
  transcript: string;
}> {
  if (!guildId) throw new Error('guildId is required to close a ticket');
  if (!ticketId) throw new Error('ticketId is required to close a ticket');
  if (!closedByUserId) throw new Error('closedByUserId is required to close a ticket');

  let ticket: ITicket | null = null;
  if (isTestMode()) {
    ticket = testTickets.get(ticketId) ?? null;
  } else {
    await connectDB();
    ticket = await Ticket.findOne({ guildId, ticketId });
  }

  if (!ticket) {
    throw new Error(`Ticket "${ticketId}" not found in server`);
  }
  if (ticket.status === 'closed') {
    throw new Error(`Ticket "${ticketId}" is already closed`);
  }

  const transcript = generateMarkdownTranscript(
    ticket,
    messages ?? [],
    closedByUserId,
    reason,
  );

  ticket.status = 'closed';
  ticket.closedBy = closedByUserId;
  ticket.closedAt = new Date();
  ticket.closeReason = reason || 'No reason provided';
  ticket.transcript = transcript;
  ticket.updatedAt = new Date();

  if (isTestMode()) {
    testTickets.set(ticketId, ticket);
  } else {
    await ticket.save();
  }

  const embed: DiscordEmbed = clampEmbed({
    title: `🔒 Ticket Closed — ${ticket.ticketId}`,
    description: `This support ticket has been closed.\n\n**Closed By:** <@${closedByUserId}>\n**Reason:** ${ticket.closeReason}\n\n**Customer Satisfaction:**\nPlease rate your support experience below!`,
    color: Colors.DANGER,
    fields: [
      { name: '🎫 Ticket ID', value: `\`${ticket.ticketId}\``, inline: true },
      { name: '📂 Category', value: ticket.category, inline: true },
      { name: '👤 Owner', value: `<@${ticket.userId}>`, inline: true },
    ],
    footer: {
      text: 'AiCord Ticket Hub • Transcript has been generated and archived',
    },
  });

  const ratingRow = buildRatingActionRow(ticket.ticketId);

  return {
    ticket,
    embed,
    ratingRow,
    transcript,
  };
}

// ─── 8. CSAT Customer Rating & Action Row ─────────────────────────────────────

export function buildRatingActionRow(
  ticketId: string,
  selectedRating?: number,
): ActionRow {
  const disabled = typeof selectedRating === 'number';

  const buttons = [1, 2, 3, 4, 5].map((stars) => {
    const isSelected = selectedRating === stars;
    return buildButton({
      style: isSelected ? 3 : 2, // 3: Success (Green) for selected, 2: Secondary (Gray)
      label: `${'⭐'.repeat(stars)} ${stars}`,
      customId: `ticket_rate:${ticketId}:${stars}`,
      disabled,
    });
  });

  return buildActionRow(...buttons);
}

export async function rateTicket(
  guildId: string,
  ticketId: string,
  rating: number,
): Promise<{
  ticket: ITicket;
  embed: DiscordEmbed;
  ratingRow: ActionRow;
}> {
  if (!guildId) throw new Error('guildId is required to rate a ticket');
  if (!ticketId) throw new Error('ticketId is required to rate a ticket');
  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new Error('Rating must be an integer between 1 and 5 stars');
  }

  let ticket: ITicket | null = null;
  if (isTestMode()) {
    ticket = testTickets.get(ticketId) ?? null;
  } else {
    await connectDB();
    ticket = await Ticket.findOne({ guildId, ticketId });
  }

  if (!ticket) {
    throw new Error(`Ticket "${ticketId}" not found in server`);
  }

  ticket.rating = rating;
  ticket.updatedAt = new Date();

  if (isTestMode()) {
    testTickets.set(ticketId, ticket);
  } else {
    await ticket.save();
  }

  const embed: DiscordEmbed = successEmbed(
    'Rating Submitted',
    `Thank you for your feedback! You rated ticket **${ticket.ticketId}** with **${'⭐'.repeat(rating)} (${rating}/5 stars)**.`,
  );

  const ratingRow = buildRatingActionRow(ticket.ticketId, rating);

  return {
    ticket,
    embed,
    ratingRow,
  };
}

// ─── 9. Ticket Statistics ─────────────────────────────────────────────────────

export async function getTicketStats(guildId: string): Promise<TicketStats> {
  if (!guildId) {
    throw new Error('guildId is required to retrieve ticket stats');
  }

  if (isTestMode()) {
    const serverTickets = Array.from(testTickets.values()).filter(
      (t) => t.guildId === guildId,
    );
    const total = serverTickets.length;
    const open = serverTickets.filter((t) => t.status === 'open').length;
    const claimed = serverTickets.filter((t) => t.status === 'claimed').length;
    const closed = serverTickets.filter((t) => t.status === 'closed').length;

    const ratedTickets = serverTickets.filter(
      (t) => typeof t.rating === 'number' && t.rating > 0,
    );
    const ratingCount = ratedTickets.length;
    const avgRating =
      ratingCount > 0
        ? ratedTickets.reduce((acc, t) => acc + (t.rating ?? 0), 0) / ratingCount
        : 0;

    return { total, open, claimed, closed, avgRating, ratingCount };
  }

  await connectDB();
  const serverTickets = await Ticket.find({ guildId });
  const total = serverTickets.length;
  const open = serverTickets.filter((t) => t.status === 'open').length;
  const claimed = serverTickets.filter((t) => t.status === 'claimed').length;
  const closed = serverTickets.filter((t) => t.status === 'closed').length;

  const ratedTickets = serverTickets.filter(
    (t) => typeof t.rating === 'number' && t.rating > 0,
  );
  const ratingCount = ratedTickets.length;
  const avgRating =
    ratingCount > 0
      ? ratedTickets.reduce((acc, t) => acc + (t.rating ?? 0), 0) / ratingCount
      : 0;

  return { total, open, claimed, closed, avgRating, ratingCount };
}

export function buildTicketStatsEmbed(
  stats: TicketStats,
  serverName?: string,
): DiscordEmbed {
  const roundedStars = Math.round(stats.avgRating);
  const starsDisplay =
    stats.ratingCount > 0
      ? `${'⭐'.repeat(roundedStars)} **${stats.avgRating.toFixed(1)} / 5.0** (${stats.ratingCount} reviews)`
      : 'No ratings submitted yet';

  return clampEmbed({
    title: `📊 Ticket Hub Statistics — ${serverName || 'Server'}`,
    description: 'Overview of customer support volume, resolution rate, and satisfaction metrics.',
    color: Colors.INFO,
    fields: [
      { name: '🟡 Open Tickets', value: `${stats.open}`, inline: true },
      { name: '🟢 Claimed Tickets', value: `${stats.claimed}`, inline: true },
      { name: '🔒 Closed Tickets', value: `${stats.closed}`, inline: true },
      { name: '📁 Total Tickets', value: `${stats.total}`, inline: true },
      {
        name: '⭐ CSAT Customer Satisfaction',
        value: starsDisplay,
        inline: false,
      },
    ],
    footer: {
      text: 'AiCord Ticket Hub • Empowering Community Support',
    },
    timestamp: new Date().toISOString(),
  });
}

// ─── 10. Query Helpers ────────────────────────────────────────────────────────

export async function getTicket(
  guildId: string,
  ticketId: string,
): Promise<ITicket | null> {
  if (isTestMode()) {
    const ticket = testTickets.get(ticketId);
    return ticket && ticket.guildId === guildId ? ticket : null;
  }
  await connectDB();
  return Ticket.findOne({ guildId, ticketId });
}

export async function getTicketByChannel(
  guildId: string,
  channelId: string,
): Promise<ITicket | null> {
  if (isTestMode()) {
    for (const ticket of testTickets.values()) {
      if (ticket.guildId === guildId && ticket.channelId === channelId) {
        return ticket;
      }
    }
    return null;
  }
  await connectDB();
  return Ticket.findOne({ guildId, channelId });
}

export async function getTicketPanel(
  guildId: string,
  panelId: string,
): Promise<ITicketPanel | null> {
  if (isTestMode()) {
    const panel = testPanels.get(panelId);
    return panel && panel.guildId === guildId ? panel : null;
  }
  await connectDB();
  return TicketPanel.findOne({ guildId, panelId });
}

export async function updateTicketChannelId(
  guildId: string,
  ticketId: string,
  channelId: string,
): Promise<ITicket | null> {
  if (isTestMode()) {
    const ticket = testTickets.get(ticketId);
    if (ticket && ticket.guildId === guildId) {
      ticket.channelId = channelId;
      ticket.updatedAt = new Date();
      return ticket;
    }
    return null;
  }
  await connectDB();
  return Ticket.findOneAndUpdate(
    { guildId, ticketId },
    { $set: { channelId, updatedAt: new Date() } },
    { new: true },
  );
}
