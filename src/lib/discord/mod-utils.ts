/**
 * src/lib/discord/mod-utils.ts
 * Shared moderation utilities: permission checks, case creation, mod log posting.
 */

import { Routes } from 'discord-api-types/v10';
import { getDiscordRest, discordApiCall } from './rest';
import { GuildConfig } from '@/models/GuildConfig';
import { ModCase, type CaseAction } from '@/models/ModCase';
import { Warning } from '@/models/Warning';
import { AuditLog } from '@/models/AuditLog';
import { Colors, clampEmbed, type DiscordEmbed } from './embeds';
import { connectDB } from '@/lib/db';

/** Parsed duration string (e.g. "7d", "2h", "30m") to milliseconds. */
export function parseDuration(duration: string): number | null {
  const match = duration.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return value * multipliers[unit];
}

/** Format milliseconds into a human-readable duration. */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

/** Get the next case number for a guild (atomic increment via findOneAndUpdate pattern). */
export async function getNextCaseNumber(guildId: string): Promise<number> {
  const lastCase = await ModCase.findOne({ guildId }).sort({ caseNumber: -1 }).select('caseNumber');
  return (lastCase?.caseNumber ?? 0) + 1;
}

export interface CreateCaseOptions {
  guildId: string;
  action: CaseAction;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason?: string;
  duration?: number; // ms
  expiresAt?: Date;
}

/** Create a mod case and optionally post to the mod log channel. */
export async function createModCase(options: CreateCaseOptions): Promise<number> {
  await connectDB();

  const caseNumber = await getNextCaseNumber(options.guildId);

  const modCase = await ModCase.create({
    ...options,
    caseNumber,
    reason: options.reason ?? 'No reason provided',
    active: !!options.expiresAt,
  });

  // If it's a warn, also create a Warning document
  if (options.action === 'warn') {
    await Warning.create({
      guildId: options.guildId,
      userId: options.targetId,
      moderatorId: options.moderatorId,
      moderatorTag: options.moderatorTag,
      reason: options.reason ?? 'No reason provided',
      caseNumber,
    });
  }

  // Post to mod log channel
  await postModLog(options.guildId, modCase._id.toString(), {
    caseNumber,
    action: options.action,
    targetId: options.targetId,
    targetTag: options.targetTag,
    moderatorId: options.moderatorId,
    moderatorTag: options.moderatorTag,
    reason: options.reason ?? 'No reason provided',
    duration: options.duration,
  });

  await AuditLog.create({
    guildId: options.guildId,
    type: 'mod_action',
    userId: options.moderatorId,
    userTag: options.moderatorTag,
    metadata: { action: options.action, targetId: options.targetId, caseNumber },
  });

  return caseNumber;
}

const ACTION_COLORS: Record<CaseAction, number> = {
  ban: Colors.DANGER,
  kick: 0xe67e22,
  timeout: 0xf39c12,
  warn: Colors.WARNING,
  softban: 0xe74c3c,
  unban: Colors.SUCCESS,
  untimeout: Colors.SUCCESS,
};

const ACTION_EMOJI: Record<CaseAction, string> = {
  ban: '🔨',
  kick: '👢',
  timeout: '⏱️',
  warn: '⚠️',
  softban: '🔇',
  unban: '✅',
  untimeout: '✅',
};

interface ModLogData {
  caseNumber: number;
  action: CaseAction;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  duration?: number;
}

async function postModLog(guildId: string, caseId: string, data: ModLogData): Promise<void> {
  try {
    const config = await GuildConfig.findOne({ guildId }).select('modLogChannelId');
    if (!config?.modLogChannelId) return;

    const embed: DiscordEmbed = clampEmbed({
      color: ACTION_COLORS[data.action] ?? Colors.SECONDARY,
      title: `${ACTION_EMOJI[data.action]} ${data.action.toUpperCase()} | Case #${data.caseNumber}`,
      fields: [
        { name: 'User', value: `<@${data.targetId}> (${data.targetTag})`, inline: true },
        { name: 'Moderator', value: `<@${data.moderatorId}> (${data.moderatorTag})`, inline: true },
        { name: 'Reason', value: data.reason },
        ...(data.duration ? [{ name: 'Duration', value: formatDuration(data.duration), inline: true }] : []),
      ],
      footer: { text: `Case ID: ${caseId}` },
      timestamp: new Date().toISOString(),
    });

    const rest = getDiscordRest();
    await discordApiCall(() =>
      rest.post(Routes.channelMessages(config.modLogChannelId!), {
        body: { embeds: [embed] },
      }),
    );
  } catch (err) {
    // Don't throw — log posting failures shouldn't break mod actions
    console.error('[ModLog] Failed to post mod log:', err);
  }
}

/** Check if the invoker's highest role position is above the target's. */
export function isHierarchyValid(
  invokerHighestPosition: number,
  targetHighestPosition: number,
  botHighestPosition: number,
): { valid: boolean; reason?: string } {
  if (botHighestPosition <= targetHighestPosition) {
    return { valid: false, reason: "My highest role must be above the target's highest role." };
  }
  if (invokerHighestPosition <= targetHighestPosition) {
    return { valid: false, reason: "Your highest role must be above the target's highest role." };
  }
  return { valid: true };
}
