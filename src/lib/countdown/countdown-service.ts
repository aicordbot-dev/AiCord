/**
 * src/lib/countdown/countdown-service.ts
 * Dynamic Real-Time Event Countdown Clocks Service Engine for AiCord.
 *
 * Responsibilities:
 * - In-memory test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestCountdown, getTestCountdown)
 * - Date & Duration Parser (supports 30m, 2h, 3d, 7d, 2w, ISO strings, future validation)
 * - CRUD operations for countdowns (create, get, list, delete with mod/creator auth)
 * - Time remaining breakdown calculation (days, hours, minutes, seconds)
 * - ASCII elapsed progress bar generation ([████████░░] 80%)
 * - Discord embed presentation builder with Discord live timestamps (<t:TIMESTAMP:R>)
 * - Interactive refresh button component generator (custom_id: cd_refresh:cd-XXXX)
 */

import {
  type APIEmbed,
  type APIActionRowComponent,
  type APIButtonComponent,
  ButtonStyle,
  ComponentType,
} from 'discord-api-types/v10';
import { EventCountdown, type IEventCountdown } from '@/models/EventCountdown';

export type { IEventCountdown };

// ─── In-Memory Test Store ───────────────────────────────────────────────────

let testMode = false;
const testCountdowns = new Map<string, IEventCountdown>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testCountdowns.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestCountdown(
  guildIdOrData: string | (Partial<IEventCountdown> & { guildId: string; countdownId: string }),
  countdownIdOrData?: string | Partial<IEventCountdown>,
  extraData?: Partial<IEventCountdown>,
): IEventCountdown {
  let guildId: string;
  let countdownId: string;
  let data: Partial<IEventCountdown>;

  if (typeof guildIdOrData === 'object') {
    guildId = guildIdOrData.guildId;
    countdownId = guildIdOrData.countdownId;
    data = guildIdOrData;
  } else if (typeof countdownIdOrData === 'string') {
    guildId = guildIdOrData;
    countdownId = countdownIdOrData;
    data = extraData || {};
  } else {
    guildId = guildIdOrData;
    data = countdownIdOrData || {};
    countdownId = data.countdownId || generateCountdownId();
  }

  const key = `${guildId}:${countdownId}`;
  const now = new Date();
  const countdown = {
    guildId,
    countdownId,
    channelId: data.channelId || 'chan_default',
    messageId: data.messageId,
    creatorId: data.creatorId || 'user_default',
    title: (data.title || 'Untitled Event').trim(),
    description: data.description,
    targetDate: data.targetDate ? new Date(data.targetDate) : new Date(now.getTime() + 3600000),
    notifyRoleId: data.notifyRoleId,
    completed: data.completed ?? false,
    createdAt: data.createdAt ? new Date(data.createdAt) : now,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : now,
  } as unknown as IEventCountdown;

  testCountdowns.set(key, countdown);
  return countdown;
}

export function getTestCountdown(
  guildId: string,
  countdownId: string,
): IEventCountdown | undefined {
  return testCountdowns.get(`${guildId}:${countdownId}`);
}

// ─── Unique ID Generator ────────────────────────────────────────────────────

export function generateCountdownId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `cd-${code}`;
}

// ─── Date & Duration Parser ─────────────────────────────────────────────────

const COMPOUND_RELATIVE_REGEX = /^(\d+\s*(?:s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?|w|wk|weeks?|mo|months?|y|yr|years?)\s*)+$/i;
const TOKEN_REGEX = /(\d+)\s*([a-zA-Z]+)/g;

/**
 * Parses a target date from relative duration offsets (e.g. 30m, 2h, 3d, 7d, 2w)
 * or standard ISO date strings (e.g. 2026-12-31T00:00:00Z).
 * Validates that the parsed target date is in the future.
 */
export function parseTargetDate(input: string, now?: Date): Date {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    throw new Error('Target date or duration cannot be empty.');
  }

  const baseNow = now ? new Date(now) : new Date();

  // 1. Check relative duration offset
  if (COMPOUND_RELATIVE_REGEX.test(trimmed)) {
    let totalMs = 0;
    const matches = Array.from(trimmed.matchAll(TOKEN_REGEX));

    for (const match of matches) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 's':
        case 'sec':
        case 'second':
        case 'seconds':
          totalMs += amount * 1000;
          break;
        case 'm':
        case 'min':
        case 'minute':
        case 'minutes':
          totalMs += amount * 60 * 1000;
          break;
        case 'h':
        case 'hr':
        case 'hour':
        case 'hours':
          totalMs += amount * 3600 * 1000;
          break;
        case 'd':
        case 'day':
        case 'days':
          totalMs += amount * 86400 * 1000;
          break;
        case 'w':
        case 'wk':
        case 'week':
        case 'weeks':
          totalMs += amount * 7 * 86400 * 1000;
          break;
        case 'mo':
        case 'month':
        case 'months':
          totalMs += amount * 30 * 86400 * 1000;
          break;
        case 'y':
        case 'yr':
        case 'year':
        case 'years':
          totalMs += amount * 365 * 86400 * 1000;
          break;
        default:
          throw new Error(`Unsupported duration unit: ${unit}`);
      }
    }

    if (totalMs <= 0) {
      throw new Error('Duration offset must be greater than zero.');
    }

    const targetDate = new Date(baseNow.getTime() + totalMs);
    return targetDate;
  }

  // 2. Reject pure numbers without date formatting
  if (/^\d+$/.test(trimmed)) {
    throw new Error(
      'Invalid date or duration format. Use relative offsets (e.g. 30m, 2h, 3d, 1w) or ISO date (YYYY-MM-DDTHH:mm:ssZ).',
    );
  }

  // 3. Parse standard ISO / date string
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    throw new Error(
      'Invalid date or duration format. Use relative offsets (e.g. 30m, 2h, 3d, 1w) or ISO date (YYYY-MM-DDTHH:mm:ssZ).',
    );
  }

  // 4. Validate target date is in the future
  if (parsed.getTime() <= baseNow.getTime()) {
    throw new Error('Target date must be in the future.');
  }

  return parsed;
}

// ─── Time Calculations & Visual Builders ─────────────────────────────────────

export interface ITimeRemaining {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

/**
 * Calculates remaining time components between now and the target date.
 */
export function calculateTimeRemaining(
  targetDate: Date,
  now?: Date,
): ITimeRemaining {
  const baseNow = now ? new Date(now) : new Date();
  const diffMs = targetDate.getTime() - baseNow.getTime();
  const isPast = diffMs <= 0;
  const remainingMs = Math.max(0, diffMs);
  const totalSeconds = Math.floor(remainingMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { totalSeconds, days, hours, minutes, seconds, isPast };
}

/**
 * Renders a proportional ASCII progress bar representing elapsed time.
 * Example output: `[████████░░] 80%`
 */
export function renderProgressBar(
  createdAt: Date,
  targetDate: Date,
  now?: Date,
  length: number = 10,
): string {
  const baseNow = now ? new Date(now) : new Date();
  const totalDuration = targetDate.getTime() - createdAt.getTime();
  const elapsed = baseNow.getTime() - createdAt.getTime();

  let percent = 0;
  if (totalDuration <= 0) {
    percent = 100;
  } else if (elapsed <= 0) {
    percent = 0;
  } else if (elapsed >= totalDuration) {
    percent = 100;
  } else {
    percent = Math.floor((elapsed / totalDuration) * 100);
  }

  const fraction = percent / 100;
  const filled = Math.min(length, Math.max(0, Math.round(fraction * length)));
  const empty = Math.max(0, length - filled);

  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
}

/**
 * Builds the rich Discord countdown embed featuring live timestamps (<t:TIMESTAMP:R>)
 * and ASCII progress indicators.
 */
export function buildCountdownEmbed(
  countdown: IEventCountdown,
  now?: Date,
): APIEmbed {
  const baseNow = now ? new Date(now) : new Date();
  const targetUnix = Math.floor(countdown.targetDate.getTime() / 1000);
  const remaining = calculateTimeRemaining(countdown.targetDate, baseNow);
  const createdAt = countdown.createdAt || new Date(countdown.targetDate.getTime() - 86400000);
  const progressBar = renderProgressBar(createdAt, countdown.targetDate, baseNow);

  const lines: string[] = [];

  if (countdown.description && countdown.description.trim().length > 0) {
    lines.push(countdown.description.trim());
    lines.push('');
  }

  lines.push(`🎯 **Target Date:** <t:${targetUnix}:F> (<t:${targetUnix}:R>)`);
  lines.push(
    `⏱️ **Time Remaining:** ${
      remaining.isPast
        ? '🎉 **Event Reached / Completed!**'
        : `\`${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s\` remaining`
    }`,
  );
  lines.push(`📊 **Progress:** \`${progressBar}\` Time Elapsed`);

  if (countdown.notifyRoleId) {
    lines.push(`🔔 **Role Notification:** <@&${countdown.notifyRoleId}>`);
  }

  return {
    title: `⏳ Event Countdown: ${countdown.title}`,
    description: lines.join('\n'),
    color: remaining.isPast ? 0xED4245 : 0x5865F2,
    footer: {
      text: `ID: ${countdown.countdownId} • Created by <@${countdown.creatorId}>`,
    },
    timestamp: countdown.targetDate.toISOString(),
  };
}

/**
 * Builds the interactive button components for countdown live refresh.
 */
export function buildCountdownComponents(
  countdownId: string,
): APIActionRowComponent<APIButtonComponent>[] {
  return [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ButtonStyle.Primary,
          label: '🔄 Refresh Countdown',
          custom_id: `cd_refresh:${countdownId}`,
        },
      ],
    },
  ];
}

// ─── Core Service Operations ────────────────────────────────────────────────

export interface ICreateCountdownParams {
  guildId: string;
  channelId: string;
  creatorId: string;
  title: string;
  targetInput: string;
  description?: string;
  notifyRoleId?: string;
  now?: Date;
}

/**
 * Creates and registers a new event countdown clock.
 */
export async function createCountdown(
  params: ICreateCountdownParams,
): Promise<IEventCountdown> {
  const cleanTitle = (params.title || '').trim();
  if (cleanTitle.length === 0 || cleanTitle.length > 100) {
    throw new Error('Title must be between 1 and 100 characters.');
  }

  if (params.description && params.description.length > 1000) {
    throw new Error('Description cannot exceed 1000 characters.');
  }

  const targetDate = parseTargetDate(params.targetInput, params.now);
  const countdownId = generateCountdownId();
  const now = params.now ? new Date(params.now) : new Date();

  if (isTestMode()) {
    return setTestCountdown({
      guildId: params.guildId,
      countdownId,
      channelId: params.channelId,
      creatorId: params.creatorId,
      title: cleanTitle,
      description: params.description?.trim(),
      targetDate,
      notifyRoleId: params.notifyRoleId,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  const countdown = await EventCountdown.create({
    guildId: params.guildId,
    countdownId,
    channelId: params.channelId,
    creatorId: params.creatorId,
    title: cleanTitle,
    description: params.description?.trim(),
    targetDate,
    notifyRoleId: params.notifyRoleId,
    completed: false,
  });

  return countdown;
}

/**
 * Retrieves a specific countdown by guild and countdown ID.
 */
export async function getCountdown(
  guildId: string,
  countdownId: string,
): Promise<IEventCountdown | null> {
  if (isTestMode()) {
    const cd = getTestCountdown(guildId, countdownId);
    return cd || null;
  }

  return EventCountdown.findOne({ guildId, countdownId }).exec();
}

/**
 * Lists active countdowns for a guild, sorted with nearest target date first.
 */
export async function listCountdowns(
  guildId: string,
  includeCompleted: boolean = false,
): Promise<IEventCountdown[]> {
  if (isTestMode()) {
    const list: IEventCountdown[] = [];
    for (const cd of testCountdowns.values()) {
      if (cd.guildId === guildId) {
        if (includeCompleted || !cd.completed) {
          list.push(cd);
        }
      }
    }
    list.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
    return list;
  }

  const query: Record<string, unknown> = { guildId };
  if (!includeCompleted) {
    query.completed = false;
  }

  return EventCountdown.find(query).sort({ targetDate: 1 }).exec();
}

/**
 * Deletes a countdown record, enforcing creator or moderator authorization.
 */
export async function deleteCountdown(
  guildId: string,
  countdownId: string,
  requesterId: string,
  isMod: boolean = false,
): Promise<IEventCountdown> {
  const countdown = await getCountdown(guildId, countdownId);
  if (!countdown) {
    throw new Error('Countdown not found.');
  }

  if (countdown.creatorId !== requesterId && !isMod) {
    throw new Error(
      'Unauthorized: You are not the creator of this countdown and lack moderator permissions.',
    );
  }

  if (isTestMode()) {
    testCountdowns.delete(`${guildId}:${countdownId}`);
    return countdown;
  }

  await EventCountdown.deleteOne({ guildId, countdownId }).exec();
  return countdown;
}
