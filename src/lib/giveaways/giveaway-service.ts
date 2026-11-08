/**
 * src/lib/giveaways/giveaway-service.ts
 * Interactive Giveaways & Raffles Suite Engine for AiCord.
 *
 * Capabilities:
 * - In-memory test store (enableTestMode, clearTestStore, setTestGiveaway, getTestGiveaway)
 * - Duration parsing (s, m, h, d)
 * - Giveaway lifecycle: creation, active listing, entry toggling, ending, and winner rerolling
 * - Level and Role gating verification
 * - Fair duplicate-free random winner drawing
 * - Eye-catching Discord embeds and interactive entry button components
 */

import { connectDB } from '@/lib/db';
import { Giveaway, type IGiveaway, type IGiveawayRequirements } from '@/models';
import { Colors, clampEmbed, type DiscordEmbed } from '@/lib/discord/embeds';
import {
  buildButton,
  buildActionRow,
  type ActionRow,
} from '@/lib/discord/interaction-response';

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
const testGiveaways = new Map<string, IGiveaway>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testGiveaways.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestGiveaway(giveaway: IGiveaway): void {
  if (!giveaway.save) {
    (giveaway as unknown as { save: () => Promise<IGiveaway> }).save = async function () {
      testGiveaways.set(giveaway.messageId, giveaway);
      return giveaway;
    };
  }
  testGiveaways.set(giveaway.messageId, giveaway);
}

export function getTestGiveaway(messageId: string): IGiveaway | undefined {
  return testGiveaways.get(messageId);
}

// ─── Duration Parser ──────────────────────────────────────────────────────────

/**
 * Parses duration strings like "30s", "10m", "2h", "7d", or "1d 2h" into milliseconds.
 * Throws an Error if format is invalid or total duration <= 0.
 */
export function parseDuration(str: string): number {
  if (!str || typeof str !== 'string') {
    throw new Error('Invalid duration format. Must be a non-empty string.');
  }

  const trimmed = str.trim();
  const tokenRegex = /(\d+)\s*([smhd])/gi;
  const matches = [...trimmed.matchAll(tokenRegex)];

  if (matches.length === 0) {
    throw new Error(
      `Invalid duration format: "${str}". Accepted units are s (seconds), m (minutes), h (hours), d (days). Example: 30s, 10m, 2h, 7d.`,
    );
  }

  // Ensure there are no stray non-matching characters other than spaces
  const remaining = trimmed.replace(tokenRegex, '').trim();
  if (remaining.length > 0) {
    throw new Error(
      `Invalid duration format: "${str}". Accepted units are s (seconds), m (minutes), h (hours), d (days). Example: 30s, 10m, 2h, 7d.`,
    );
  }

  let totalMs = 0;
  for (const match of matches) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's':
        totalMs += value * 1_000;
        break;
      case 'm':
        totalMs += value * 60 * 1_000;
        break;
      case 'h':
        totalMs += value * 60 * 60 * 1_000;
        break;
      case 'd':
        totalMs += value * 24 * 60 * 60 * 1_000;
        break;
    }
  }

  if (totalMs <= 0) {
    throw new Error('Duration must be greater than zero.');
  }

  return totalMs;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CreateGiveawayParams {
  guildId: string;
  channelId: string;
  hostId: string;
  prize: string;
  durationMs: number;
  winnersCount?: number;
  minLevel?: number;
  requiredRoleId?: string;
  messageId?: string;
}

export type EnterGiveawayStatus =
  | 'entered'
  | 'left'
  | 'ended'
  | 'level_too_low'
  | 'missing_role'
  | 'not_found';

export interface EnterGiveawayResult {
  status: EnterGiveawayStatus;
  entryCount: number;
  giveaway?: IGiveaway;
}

export interface EndGiveawayResult {
  winners: string[];
  giveaway: IGiveaway;
}

export interface RerollGiveawayResult {
  newWinners: string[];
  giveaway: IGiveaway;
}

// ─── Winner Selection Helper ──────────────────────────────────────────────────

/**
 * Draws `count` unique random winners from entries, excluding any user IDs in `exclude`.
 */
export function drawRandomWinners(
  entries: string[],
  count: number,
  exclude: string[] = [],
): string[] {
  const eligible = entries.filter((id) => !exclude.includes(id));
  if (eligible.length === 0) return [];

  const pool = [...eligible];
  const drawn: string[] = [];
  const targetCount = Math.min(count, pool.length);

  for (let i = 0; i < targetCount; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    drawn.push(pool[randomIndex]);
    pool.splice(randomIndex, 1);
  }

  return drawn;
}

// ─── Mock Document Factory ────────────────────────────────────────────────────

function createMockGiveaway(data: Partial<IGiveaway>): IGiveaway {
  const doc = {
    guildId: data.guildId ?? '',
    channelId: data.channelId ?? '',
    messageId: data.messageId ?? `gw_msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    prize: data.prize ?? 'Mystery Prize',
    winnersCount: data.winnersCount ?? 1,
    hostId: data.hostId ?? '',
    endsAt: data.endsAt ?? new Date(Date.now() + 3600000),
    ended: data.ended ?? false,
    entries: data.entries ? [...data.entries] : [],
    winners: data.winners ? [...data.winners] : [],
    requirements: data.requirements ? { ...data.requirements } : {},
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
    save: async function () {
      testGiveaways.set(this.messageId, this as unknown as IGiveaway);
      return this;
    },
  };

  return doc as unknown as IGiveaway;
}

// ─── Giveaway Lifecycle Methods ───────────────────────────────────────────────

/**
 * Creates and saves a new giveaway record.
 */
export async function createGiveaway(params: CreateGiveawayParams): Promise<IGiveaway> {
  const winnersCount = Math.max(1, params.winnersCount ?? 1);
  const endsAt = new Date(Date.now() + params.durationMs);
  const messageId =
    params.messageId ||
    `gw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const requirements: IGiveawayRequirements = {};
  if (typeof params.minLevel === 'number' && params.minLevel > 0) {
    requirements.minLevel = params.minLevel;
  }
  if (params.requiredRoleId && params.requiredRoleId.trim()) {
    requirements.requiredRoleId = params.requiredRoleId.trim();
  }

  if (testMode) {
    const mock = createMockGiveaway({
      guildId: params.guildId,
      channelId: params.channelId,
      messageId,
      prize: params.prize,
      winnersCount,
      hostId: params.hostId,
      endsAt,
      ended: false,
      entries: [],
      winners: [],
      requirements,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testGiveaways.set(messageId, mock);
    return mock;
  }

  await connectDB();
  const giveaway = await Giveaway.create({
    guildId: params.guildId,
    channelId: params.channelId,
    messageId,
    prize: params.prize,
    winnersCount,
    hostId: params.hostId,
    endsAt,
    ended: false,
    entries: [],
    winners: [],
    requirements,
  });

  return giveaway;
}

/**
 * Fetches a giveaway by guildId and messageId.
 */
export async function getGiveaway(
  guildId: string,
  messageId: string,
): Promise<IGiveaway | null> {
  if (testMode) {
    const found = testGiveaways.get(messageId);
    if (found && found.guildId === guildId) {
      return found;
    }
    return null;
  }

  await connectDB();
  return Giveaway.findOne({ guildId, messageId });
}

/**
 * Lists all active (non-ended) giveaways in a guild.
 */
export async function listActiveGiveaways(guildId: string): Promise<IGiveaway[]> {
  if (testMode) {
    return Array.from(testGiveaways.values())
      .filter((g) => g.guildId === guildId && !g.ended)
      .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  }

  await connectDB();
  return Giveaway.find({ guildId, ended: false }).sort({ endsAt: 1 });
}

/**
 * Enters or leaves a giveaway (toggle mechanic) with requirement checks.
 */
export async function enterGiveaway(
  guildId: string,
  messageId: string,
  userId: string,
  userLevel?: number,
  userRoleIds?: string[],
): Promise<EnterGiveawayResult> {
  const giveaway = await getGiveaway(guildId, messageId);
  if (!giveaway) {
    return { status: 'not_found', entryCount: 0 };
  }

  const isExpired = Date.now() > new Date(giveaway.endsAt).getTime();
  if (giveaway.ended || isExpired) {
    return {
      status: 'ended',
      entryCount: giveaway.entries.length,
      giveaway,
    };
  }

  // 1. Check Level Requirement
  if (
    typeof giveaway.requirements?.minLevel === 'number' &&
    giveaway.requirements.minLevel > 0
  ) {
    const level = userLevel ?? 0;
    if (level < giveaway.requirements.minLevel) {
      return {
        status: 'level_too_low',
        entryCount: giveaway.entries.length,
        giveaway,
      };
    }
  }

  // 2. Check Role Requirement
  if (giveaway.requirements?.requiredRoleId) {
    const requiredRole = giveaway.requirements.requiredRoleId;
    if (!userRoleIds || !userRoleIds.includes(requiredRole)) {
      return {
        status: 'missing_role',
        entryCount: giveaway.entries.length,
        giveaway,
      };
    }
  }

  // 3. Toggle Entry: if already entered, remove; otherwise add
  const existingIndex = giveaway.entries.indexOf(userId);
  let status: EnterGiveawayStatus;

  if (existingIndex >= 0) {
    giveaway.entries.splice(existingIndex, 1);
    status = 'left';
  } else {
    giveaway.entries.push(userId);
    status = 'entered';
  }

  if (typeof giveaway.save === 'function') {
    await giveaway.save();
  } else if (testMode) {
    testGiveaways.set(giveaway.messageId, giveaway);
  }

  return {
    status,
    entryCount: giveaway.entries.length,
    giveaway,
  };
}

/**
 * Ends a giveaway, draws unique winners randomly up to winnersCount, and marks ended.
 */
export async function endGiveaway(
  guildId: string,
  messageId: string,
): Promise<EndGiveawayResult> {
  const giveaway = await getGiveaway(guildId, messageId);
  if (!giveaway) {
    throw new Error(`Giveaway with message ID "${messageId}" not found.`);
  }

  giveaway.ended = true;

  if (giveaway.entries.length === 0) {
    giveaway.winners = [];
  } else {
    giveaway.winners = drawRandomWinners(giveaway.entries, giveaway.winnersCount);
  }

  if (typeof giveaway.save === 'function') {
    await giveaway.save();
  } else if (testMode) {
    testGiveaways.set(giveaway.messageId, giveaway);
  }

  return {
    winners: giveaway.winners,
    giveaway,
  };
}

/**
 * Randomly rerolls `count` new winner(s) from entries, excluding existing winners if possible.
 */
export async function rerollGiveaway(
  guildId: string,
  messageId: string,
  count = 1,
): Promise<RerollGiveawayResult> {
  const giveaway = await getGiveaway(guildId, messageId);
  if (!giveaway) {
    throw new Error(`Giveaway with message ID "${messageId}" not found.`);
  }

  const rerollCount = Math.max(1, count);

  if (giveaway.entries.length === 0) {
    return {
      newWinners: [],
      giveaway,
    };
  }

  // Attempt to draw from non-winners first
  let newWinners = drawRandomWinners(giveaway.entries, rerollCount, giveaway.winners);

  // If all participants were already winners, fall back to whole pool
  if (newWinners.length === 0) {
    newWinners = drawRandomWinners(giveaway.entries, rerollCount, []);
  }

  giveaway.winners = newWinners;

  if (typeof giveaway.save === 'function') {
    await giveaway.save();
  } else if (testMode) {
    testGiveaways.set(giveaway.messageId, giveaway);
  }

  return {
    newWinners,
    giveaway,
  };
}

// ─── Embed & Component Builders ───────────────────────────────────────────────

/**
 * Builds an eye-catching embed for an active giveaway.
 */
export function buildGiveawayEmbed(giveaway: IGiveaway): DiscordEmbed {
  const unixEnds = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);

  const reqLines: string[] = [];
  if (
    typeof giveaway.requirements?.minLevel === 'number' &&
    giveaway.requirements.minLevel > 0
  ) {
    reqLines.push(`⭐ **Minimum Level:** Level ${giveaway.requirements.minLevel}`);
  }
  if (giveaway.requirements?.requiredRoleId) {
    reqLines.push(`🛡️ **Required Role:** <@&${giveaway.requirements.requiredRoleId}>`);
  }

  const descriptionLines: string[] = [
    `Click the button below to enter or leave!`,
    '',
    `⏳ **Ends:** <t:${unixEnds}:R> (<t:${unixEnds}:f>)`,
    `👑 **Hosted by:** <@${giveaway.hostId}>`,
    `🏆 **Winners:** **${giveaway.winnersCount}**`,
    `👥 **Entries:** **${giveaway.entries.length}**`,
  ];

  if (reqLines.length > 0) {
    descriptionLines.push('', `📋 **Entry Requirements:**`, ...reqLines);
  }

  return clampEmbed({
    title: `🎉 GIVEAWAY: ${giveaway.prize} 🎉`,
    description: descriptionLines.join('\n'),
    color: Colors.PRIMARY,
    footer: {
      text: `${giveaway.winnersCount} Winner${giveaway.winnersCount === 1 ? '' : 's'} • Good luck!`,
    },
    timestamp: new Date(giveaway.endsAt).toISOString(),
  });
}

/**
 * Builds an embed for a concluded giveaway displaying winner mentions and final stats.
 */
export function buildEndedGiveawayEmbed(giveaway: IGiveaway): DiscordEmbed {
  const unixEnds = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);

  const winnerMentions =
    giveaway.winners.length > 0
      ? giveaway.winners.map((id) => `<@${id}>`).join(', ')
      : '*No eligible winners*';

  const descriptionLines: string[] = [
    `This giveaway has concluded!`,
    '',
    `🏆 **Winner${giveaway.winners.length === 1 ? '' : 's'}:** ${winnerMentions}`,
    `👑 **Hosted by:** <@${giveaway.hostId}>`,
    `👥 **Total Entries:** **${giveaway.entries.length}**`,
    `🏁 **Ended:** <t:${unixEnds}:R>`,
  ];

  return clampEmbed({
    title: `🎉 GIVEAWAY ENDED: ${giveaway.prize} 🎉`,
    description: descriptionLines.join('\n'),
    color: giveaway.winners.length > 0 ? Colors.SUCCESS : Colors.SECONDARY,
    footer: {
      text: 'Giveaway Concluded',
    },
    timestamp: new Date(giveaway.endsAt).toISOString(),
  });
}

/**
 * Builds the interactive action row with the Enter button.
 */
export function buildGiveawayComponents(giveaway: IGiveaway): ActionRow[] {
  return [
    buildActionRow(
      buildButton({
        style: 3, // Success / green
        label: `🎉 Enter (${giveaway.entries.length})`,
        customId: `gw_enter:${giveaway.messageId}`,
        disabled: giveaway.ended,
      }),
    ),
  ];
}
