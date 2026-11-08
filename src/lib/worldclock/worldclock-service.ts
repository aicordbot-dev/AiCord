/**
 * src/lib/worldclock/worldclock-service.ts
 * Visual World Clock & Team Availability Overlap Engine for AiCord.
 *
 * Responsibilities:
 * - Timezone normalization and validation with IANA and alias resolution
 * - Member local time formatting (12h, 24h, UTC offset, day/night emoji)
 * - 24-hour UTC active waking hours mapping and ASCII timeline rendering
 * - Multi-member meeting availability and golden hours overlap algorithm
 * - Embed generators for server world clock dashboard and meeting overlap finder
 * - Zero-database in-memory test store for complete unit test isolation
 */

import { connectDB } from '@/lib/db';
import {
  UserTimezone,
  type IUserTimezone,
  type IActiveHours,
} from '@/models';
import type { DiscordEmbed } from '@/lib/discord/embeds';

export type { IUserTimezone, IActiveHours };

export interface FormattedLocalTime {
  timezone: string;
  local12: string;
  local24: string;
  offsetString: string;
  offsetMinutes: number;
  isDaytime: boolean;
  icon: string;
  hour: number;
  minute: number;
  formattedFull: string;
}

export interface MemberOverlapSummary {
  userId: string;
  userTag: string;
  timezone: string;
  activeHours: IActiveHours;
  currentLocalTime: string;
  utcOffset: string;
  dayNightIcon: string;
  activeTimeline: string;
}

export interface OverlapWindow {
  startUtc: number;
  endUtc: number;
  duration: number;
  localTimes: Record<string, string>;
}

export interface OverlapResult {
  hasOverlap: boolean;
  overlapWindows: OverlapWindow[];
  timelineVisual: string;
  members: MemberOverlapSummary[];
  searchedDurationHours: number;
}

// ─── Supported Common Timezone Aliases ─────────────────────────────────────────

export const TIMEZONE_ALIASES: Record<string, string> = {
  UTC: 'UTC',
  GMT: 'UTC',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  ET: 'America/New_York',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  CT: 'America/Chicago',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  MT: 'America/Denver',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  PT: 'America/Los_Angeles',
  AKST: 'America/Anchorage',
  AKDT: 'America/Anchorage',
  HST: 'Pacific/Honolulu',
  CET: 'Europe/Paris',
  CEST: 'Europe/Paris',
  BST: 'Europe/London',
  WET: 'Europe/Lisbon',
  WEST: 'Europe/Lisbon',
  EET: 'Europe/Athens',
  EEST: 'Europe/Athens',
  MSK: 'Europe/Moscow',
  JST: 'Asia/Tokyo',
  KST: 'Asia/Seoul',
  PKT: 'Asia/Karachi',
  IST: 'Asia/Kolkata',
  AEST: 'Australia/Sydney',
  AEDT: 'Australia/Sydney',
  ACST: 'Australia/Adelaide',
  ACDT: 'Australia/Adelaide',
  AWST: 'Australia/Perth',
  NZST: 'Pacific/Auckland',
  NZDT: 'Pacific/Auckland',
  HKT: 'Asia/Hong_Kong',
  SGT: 'Asia/Singapore',
  ICT: 'Asia/Bangkok',
  GST: 'Asia/Dubai',
};

// ─── In-Memory Test Store ─────────────────────────────────────────────────────

let testMode = false;
const testTimezones = new Map<string, IUserTimezone>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function isTestMode(): boolean {
  return testMode;
}

export function clearTestStore(): void {
  testTimezones.clear();
}

export function setTestTimezone(
  record: Partial<IUserTimezone> & { guildId: string; userId: string; timezone: string },
): void {
  const key = `${record.guildId}:${record.userId}`;
  const canonicalTz = normalizeTimezone(record.timezone);
  const activeHours: IActiveHours = {
    startHour: record.activeHours?.startHour ?? 9,
    endHour: record.activeHours?.endHour ?? 22,
  };

  const doc: IUserTimezone = Object.assign(
    {
      guildId: record.guildId,
      userId: record.userId,
      userTag: record.userTag || 'Member',
      timezone: canonicalTz,
      activeHours,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IUserTimezone,
    record,
    { timezone: canonicalTz, activeHours },
  );

  testTimezones.set(key, doc);
}

export function getTestTimezone(guildId: string, userId: string): IUserTimezone | undefined {
  return testTimezones.get(`${guildId}:${userId}`);
}

// ─── Timezone Normalization & Validation ──────────────────────────────────────

/**
 * Normalizes input string to canonical IANA timezone name.
 * Resolves aliases (e.g. EST -> America/New_York) and verifies validity via Intl.DateTimeFormat.
 * Throws an Error if timezone is unrecognized or invalid.
 */
export function normalizeTimezone(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Timezone cannot be empty.');
  }

  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();

  const alias = TIMEZONE_ALIASES[upper];
  const candidate = alias || trimmed;

  try {
    const formatter = new Intl.DateTimeFormat(undefined, { timeZone: candidate });
    if (alias) {
      return alias;
    }
    return formatter.resolvedOptions().timeZone || candidate;
  } catch {
    throw new Error(
      `Invalid or unrecognized timezone: "${input}". Please provide a valid IANA timezone (e.g. "America/New_York", "Europe/London", "Asia/Tokyo") or supported abbreviation (e.g. EST, PST, CET, JST, UTC, IST).`,
    );
  }
}

/**
 * Checks whether an input timezone string is valid.
 */
export function isValidTimezone(input: string): boolean {
  try {
    normalizeTimezone(input);
    return true;
  } catch {
    return false;
  }
}

// ─── Local Time Formatting ────────────────────────────────────────────────────

/**
 * Computes offset in minutes between UTC and a given timezone for a specified date.
 */
export function getTimezoneOffsetMinutes(timezone: string, date: Date = new Date()): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
}

/**
 * Formats offset in minutes into string format, e.g. "UTC-5" or "UTC+5:30".
 */
export function formatOffsetString(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) {
    return `UTC${sign}${hours}`;
  }
  return `UTC${sign}${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formats a user's current local time in their timezone:
 * returns 12h, 24h, UTC offset, and day/night icon (☀️ daytime 06:00-18:00, 🌙 nighttime 18:00-06:00).
 */
export function formatUserLocalTime(
  timezone: string,
  date: Date = new Date(),
): FormattedLocalTime {
  const canonicalTz = normalizeTimezone(timezone);

  const parts24 = new Intl.DateTimeFormat('en-US', {
    timeZone: canonicalTz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour24Str = parts24.find((p) => p.type === 'hour')?.value ?? '00';
  const minStr = parts24.find((p) => p.type === 'minute')?.value ?? '00';
  const hour = parseInt(hour24Str, 10);
  const minute = parseInt(minStr, 10);
  const local24 = `${hour24Str}:${minStr}`;

  const parts12 = new Intl.DateTimeFormat('en-US', {
    timeZone: canonicalTz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const hour12Str = parts12.find((p) => p.type === 'hour')?.value ?? '12';
  const dayPeriod =
    parts12.find((p) => p.type === 'dayPeriod')?.value?.toUpperCase() ??
    (hour >= 12 ? 'PM' : 'AM');
  const local12 = `${hour12Str}:${minStr} ${dayPeriod}`;

  const offsetMinutes = getTimezoneOffsetMinutes(canonicalTz, date);
  const offsetString = formatOffsetString(offsetMinutes);

  // ☀️ daytime 06:00-18:00, 🌙 nighttime 18:00-06:00
  const isDaytime = hour >= 6 && hour < 18;
  const icon = isDaytime ? '☀️' : '🌙';

  const formattedFull = `${local24} (${local12}) ${offsetString} ${icon}`;

  return {
    timezone: canonicalTz,
    local12,
    local24,
    offsetString,
    offsetMinutes,
    isDaytime,
    icon,
    hour,
    minute,
    formattedFull,
  };
}

// ─── Database Operations ──────────────────────────────────────────────────────

/**
 * Validates and sets member timezone and optional active waking hours.
 */
export async function setUserTimezone(
  guildId: string,
  userId: string,
  userTag: string,
  timezoneInput: string,
  activeHours?: { startHour?: number; endHour?: number },
): Promise<IUserTimezone> {
  const canonicalTz = normalizeTimezone(timezoneInput);

  let startHour = 9;
  let endHour = 22;

  if (activeHours) {
    if (activeHours.startHour !== undefined) {
      if (
        !Number.isInteger(activeHours.startHour) ||
        activeHours.startHour < 0 ||
        activeHours.startHour > 23
      ) {
        throw new Error('Start hour must be an integer between 0 and 23.');
      }
      startHour = activeHours.startHour;
    }
    if (activeHours.endHour !== undefined) {
      if (
        !Number.isInteger(activeHours.endHour) ||
        activeHours.endHour < 0 ||
        activeHours.endHour > 23
      ) {
        throw new Error('End hour must be an integer between 0 and 23.');
      }
      endHour = activeHours.endHour;
    }
  }

  const hoursConfig: IActiveHours = { startHour, endHour };

  if (testMode) {
    const key = `${guildId}:${userId}`;
    const existing = testTimezones.get(key);
    const updated = Object.assign(
      {
        guildId,
        userId,
        userTag: userTag || existing?.userTag || 'Member',
        timezone: canonicalTz,
        activeHours: hoursConfig,
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
      } as unknown as IUserTimezone,
      existing,
      {
        userTag: userTag || existing?.userTag || 'Member',
        timezone: canonicalTz,
        activeHours: hoursConfig,
        updatedAt: new Date(),
      },
    );
    testTimezones.set(key, updated);
    return updated;
  }

  await connectDB();
  const record = await UserTimezone.findOneAndUpdate(
    { guildId, userId },
    {
      $set: {
        userTag: userTag || 'Member',
        timezone: canonicalTz,
        activeHours: hoursConfig,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return record;
}

/**
 * Retrieves a member's timezone configuration.
 */
export async function getUserTimezone(
  guildId: string,
  userId: string,
): Promise<IUserTimezone | null> {
  if (testMode) {
    return testTimezones.get(`${guildId}:${userId}`) || null;
  }

  await connectDB();
  return UserTimezone.findOne({ guildId, userId });
}

/**
 * Lists all registered member timezones in a guild.
 */
export async function listGuildTimezones(guildId: string): Promise<IUserTimezone[]> {
  if (testMode) {
    return Array.from(testTimezones.values())
      .filter((t) => t.guildId === guildId)
      .sort((a, b) => (a.userTag || '').localeCompare(b.userTag || ''));
  }

  await connectDB();
  return UserTimezone.find({ guildId }).sort({ userTag: 1 });
}

// ─── Availability & Overlap Finder ────────────────────────────────────────────

/**
 * Determines whether a local hour falls inside active waking hours.
 */
export function isHourActive(localHour: number, startHour: number, endHour: number): boolean {
  if (startHour === endHour) {
    return true; // 24-hour active
  }
  if (startHour < endHour) {
    return localHour >= startHour && localHour < endHour;
  }
  // Wraparound schedule (e.g. night shift 20:00 to 04:00)
  return localHour >= startHour || localHour < endHour;
}

/**
 * Computes local hour (0-23) in a timezone for a specific UTC hour.
 */
export function getLocalHourForUtcHour(
  utcHour: number,
  timezone: string,
  referenceDate: Date = new Date(),
): number {
  const d = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      utcHour,
      0,
      0,
    ),
  );
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(d);
  const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
  return parseInt(hourPart, 10) % 24;
}

/**
 * Formats a UTC hour into "HH:00" in target timezone.
 */
export function formatUtcHourInTz(
  utcHour: number,
  timezone: string,
  referenceDate: Date = new Date(),
): string {
  const d = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      utcHour,
      0,
      0,
    ),
  );
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

/**
 * Renders a 24-hour boolean array into an ASCII visual bar:
 * e.g. [░░░░████████████░░░░]
 */
export function render24HourBar(hours: boolean[]): string {
  const bar = hours.map((h) => (h ? '█' : '░')).join('');
  return `[${bar}]`;
}

/**
 * Cross-references member active waking hours to find common team meeting availability windows.
 */
export async function findMeetingOverlap(
  guildId: string,
  userIds?: string[],
  durationHours: number = 1,
  referenceDate: Date = new Date(),
): Promise<OverlapResult> {
  if (durationHours < 1 || durationHours > 24) {
    throw new Error('Meeting duration must be between 1 and 24 hours.');
  }

  // 1. Fetch target members
  let members: IUserTimezone[];
  if (userIds && userIds.length > 0) {
    const uniqueIds = Array.from(new Set(userIds));
    if (testMode) {
      members = uniqueIds
        .map((uid) => testTimezones.get(`${guildId}:${uid}`))
        .filter((m): m is IUserTimezone => Boolean(m));
    } else {
      await connectDB();
      members = await UserTimezone.find({ guildId, userId: { $in: uniqueIds } });
    }
  } else {
    members = await listGuildTimezones(guildId);
  }

  if (members.length === 0) {
    return {
      hasOverlap: false,
      overlapWindows: [],
      timelineVisual: render24HourBar(Array(24).fill(false)),
      members: [],
      searchedDurationHours: durationHours,
    };
  }

  // 2. Build 24-hour UTC active array for each member
  const memberSummaries: MemberOverlapSummary[] = [];
  const memberActiveArrays: boolean[][] = [];

  for (const m of members) {
    const utcActive: boolean[] = [];
    const startHour = m.activeHours?.startHour ?? 9;
    const endHour = m.activeHours?.endHour ?? 22;

    for (let h = 0; h < 24; h++) {
      const localH = getLocalHourForUtcHour(h, m.timezone, referenceDate);
      utcActive.push(isHourActive(localH, startHour, endHour));
    }
    memberActiveArrays.push(utcActive);

    const formatted = formatUserLocalTime(m.timezone, referenceDate);
    memberSummaries.push({
      userId: m.userId,
      userTag: m.userTag,
      timezone: m.timezone,
      activeHours: { startHour, endHour },
      currentLocalTime: `${formatted.local24} (${formatted.local12})`,
      utcOffset: formatted.offsetString,
      dayNightIcon: formatted.icon,
      activeTimeline: render24HourBar(utcActive),
    });
  }

  // 3. Compute overlap across all members for each UTC hour (0..23)
  const allActiveUtc: boolean[] = [];
  for (let h = 0; h < 24; h++) {
    const allActive = memberActiveArrays.every((arr) => arr[h]);
    allActiveUtc.push(allActive);
  }

  // 4. Identify contiguous overlap windows of length >= durationHours
  const overlapWindows: OverlapWindow[] = [];
  let i = 0;
  while (i < 24) {
    if (allActiveUtc[i]) {
      const start = i;
      while (i < 24 && allActiveUtc[i]) {
        i++;
      }
      const end = i;
      const length = end - start;
      if (length >= durationHours) {
        // Build localTimes for each member
        const localTimes: Record<string, string> = {};
        for (const m of members) {
          const startLocal = formatUtcHourInTz(start, m.timezone, referenceDate);
          const endLocal = formatUtcHourInTz(end, m.timezone, referenceDate);
          const localStr = `${startLocal} - ${endLocal}`;
          localTimes[m.userId] = localStr;
          localTimes[m.userTag] = localStr;
        }

        overlapWindows.push({
          startUtc: start,
          endUtc: end,
          duration: length,
          localTimes,
        });
      }
    } else {
      i++;
    }
  }

  const timelineVisual = render24HourBar(allActiveUtc);

  return {
    hasOverlap: overlapWindows.length > 0,
    overlapWindows,
    timelineVisual,
    members: memberSummaries,
    searchedDurationHours: durationHours,
  };
}

// ─── Embed Presentation Builders ──────────────────────────────────────────────

/**
 * Builds the World Clock dashboard embed listing all registered members.
 */
export function buildWorldClockEmbed(
  guildName: string,
  members: IUserTimezone[],
  date: Date = new Date(),
): DiscordEmbed {
  if (members.length === 0) {
    return {
      title: `🌍 World Clock Dashboard — ${guildName}`,
      description:
        'No members have registered their timezone yet!\n\nUse `/worldclock set timezone:<name>` to register your timezone and join the dashboard.',
      color: 0x3498db,
      footer: { text: 'AiCord World Clock Engine' },
      timestamp: date.toISOString(),
    };
  }

  const lines = members.map((m) => {
    const formatted = formatUserLocalTime(m.timezone, date);
    return `${formatted.icon} **${m.userTag}**: \`${formatted.local24}\` (${formatted.local12}) • \`${formatted.offsetString}\` • *${m.timezone}*`;
  });

  const utcNow = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return {
    title: `🌍 World Clock Dashboard — ${guildName}`,
    description: lines.join('\n'),
    color: 0x3498db,
    fields: [
      {
        name: '🌐 Reference Clock',
        value: `\`${utcNow} UTC\` • Registered Members: **${members.length}**`,
        inline: false,
      },
    ],
    footer: {
      text: 'AiCord World Clock • ☀️ Daytime (06:00-18:00) | 🌙 Nighttime (18:00-06:00)',
    },
    timestamp: date.toISOString(),
  };
}

/**
 * Builds the single-member timezone view embed.
 */
export function buildUserTimezoneEmbed(
  guildName: string,
  member: IUserTimezone,
  date: Date = new Date(),
): DiscordEmbed {
  const formatted = formatUserLocalTime(member.timezone, date);
  const startHour = member.activeHours?.startHour ?? 9;
  const endHour = member.activeHours?.endHour ?? 22;

  const utcActive: boolean[] = [];
  for (let h = 0; h < 24; h++) {
    const localH = getLocalHourForUtcHour(h, member.timezone, date);
    utcActive.push(isHourActive(localH, startHour, endHour));
  }
  const timeline = render24HourBar(utcActive);

  return {
    title: `${formatted.icon} World Clock — ${member.userTag}`,
    description: `Timezone and availability schedule for **${member.userTag}** in **${guildName}**.`,
    color: formatted.isDaytime ? 0xf1c40f : 0x34495e,
    fields: [
      {
        name: '🕒 Current Local Time',
        value: `\`${formatted.local24}\` (${formatted.local12}) • **${formatted.offsetString}**`,
        inline: true,
      },
      {
        name: '🌐 IANA Timezone',
        value: `\`${member.timezone}\``,
        inline: true,
      },
      {
        name: '⚡ Active Waking Hours',
        value: `\`${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00\` local`,
        inline: true,
      },
      {
        name: '📊 24-Hour UTC Availability Timeline',
        value: `\`\`\`text\nUTC: 00  03  06  09  12  15  18  21  24\nDay: ${timeline}\n\`\`\``,
        inline: false,
      },
    ],
    footer: { text: 'AiCord World Clock & Availability Engine' },
    timestamp: date.toISOString(),
  };
}

/**
 * Builds the team meeting overlap embed with visual timeline comparison.
 */
export function buildMeetingOverlapEmbed(
  overlapResult: OverlapResult,
  durationHours: number = 1,
): DiscordEmbed {
  if (overlapResult.members.length === 0) {
    return {
      title: '🤝 Team Meeting Overlap Finder',
      description:
        'No member timezone data was found. Use `/worldclock set` to configure timezones before finding overlaps.',
      color: 0xe74c3c,
      footer: { text: 'AiCord Availability Engine' },
    };
  }

  // Build ASCII comparison table
  const tableRows: string[] = [];
  tableRows.push('UTC: 00  03  06  09  12  15  18  21  24');
  tableRows.push(`ALL: ${overlapResult.timelineVisual}`);
  for (const m of overlapResult.members) {
    const tag = (m.userTag || 'User').slice(0, 4).padEnd(4, ' ');
    tableRows.push(`${tag}: ${m.activeTimeline}`);
  }
  const asciiBlock = `\`\`\`text\n${tableRows.join('\n')}\n\`\`\``;

  if (!overlapResult.hasOverlap) {
    return {
      title: `⚠️ Team Meeting Overlap — No ${durationHours}h Window Found`,
      description: `Could not find a contiguous **${durationHours}-hour** window where all **${overlapResult.members.length}** participants are awake and active simultaneously.`,
      color: 0xe67e22,
      fields: [
        {
          name: '📊 24-Hour Availability Grid',
          value: asciiBlock,
          inline: false,
        },
        {
          name: '💡 Recommendations',
          value:
            '• Shorten the meeting duration (e.g. 1 hour).\n• Adjust member active waking hours with `/worldclock set`.\n• Consider conducting asynchronous check-ins or split team sessions.',
          inline: false,
        },
      ],
      footer: { text: 'AiCord Availability Engine • █ Active | ░ Offline' },
    };
  }

  // Windows list
  const windowLines = overlapResult.overlapWindows.map((w, index) => {
    const startStr = `${String(w.startUtc).padStart(2, '0')}:00`;
    const endStr = `${String(w.endUtc).padStart(2, '0')}:00`;
    const conversions = overlapResult.members
      .map((m) => `**${m.userTag}**: \`${w.localTimes[m.userId] || w.localTimes[m.userTag]}\``)
      .join(' | ');

    return `**Window #${index + 1}**: \`${startStr} - ${endStr} UTC\` (${w.duration}h duration)\n└ ${conversions}`;
  });

  return {
    title: `🤝 Team Meeting Overlap Finder — ${durationHours}h Golden Hours`,
    description: `✨ Found **${overlapResult.overlapWindows.length}** golden hour window(s) across **${overlapResult.members.length}** team participants!`,
    color: 0x2ecc71,
    fields: [
      {
        name: '📅 Golden Overlap Windows (UTC & Local)',
        value: windowLines.join('\n\n'),
        inline: false,
      },
      {
        name: '📊 24-Hour Availability Grid',
        value: asciiBlock,
        inline: false,
      },
      {
        name: '👥 Participants',
        value: overlapResult.members
          .map(
            (m) =>
              `${m.dayNightIcon} **${m.userTag}**: \`${m.currentLocalTime}\` (${m.utcOffset}) • Active \`${String(m.activeHours.startHour).padStart(2, '0')}:00-${String(m.activeHours.endHour).padStart(2, '0')}:00\``,
          )
          .join('\n'),
        inline: false,
      },
    ],
    footer: { text: 'AiCord Availability Engine • █ Available | ░ Offline' },
  };
}
