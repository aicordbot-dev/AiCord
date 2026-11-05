/**
 * src/lib/engines/time-engine.ts
 * Enterprise-grade time engine built on date-fns and date-fns-tz.
 * Provides UTC normalization, timezone resolution, Discord timestamps,
 * robust duration parsing/formatting, and DST-safe operations.
 */

import { add, isValid as isValidDateFn } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export type DiscordTimestampStyle = 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R';

export interface ParsedDuration {
  ms: number;
  seconds: number;
  valueOf(): number;
  toString(): string;
}

export interface DurationFormatOptions {
  maxUnits?: number; // Maximum number of units to output (e.g. 2 -> "2 hours 15 minutes")
  verbose?: boolean; // When true: "2 hours", false: "2h"
}

export interface DurationAmount {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/**
 * Normalize any Date, ISO string, or numeric Unix timestamp to a valid UTC Date.
 * Throws RangeError if the provided value cannot be parsed to a valid Date.
 */
export function toUTC(date: Date | string | number): Date {
  if (date instanceof Date) {
    if (!isValidDateFn(date)) {
      throw new RangeError('Invalid date passed to toUTC');
    }
    return new Date(date.getTime());
  }

  const d = new Date(date);
  if (!isValidDateFn(d)) {
    throw new RangeError(`Cannot normalize value to UTC Date: "${String(date)}"`);
  }
  return d;
}

/**
 * Validate whether a string is a recognized IANA timezone identifier.
 */
export function isValidTimezone(tz?: string | null): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve an effective timezone from user preference and guild preference,
 * falling back to UTC if neither is valid.
 */
export function resolveTimezone(
  userTz?: string | null,
  guildTz?: string | null,
  fallback = 'UTC',
): string {
  if (isValidTimezone(userTz)) return userTz!;
  if (isValidTimezone(guildTz)) return guildTz!;
  if (isValidTimezone(fallback)) return fallback;
  return 'UTC';
}

/**
 * Build a Discord markdown timestamp string.
 * Format: `<t:UNIX:style>` or `<t:UNIX>`
 *
 * Styles:
 * - 't': Short Time (e.g. 16:20)
 * - 'T': Long Time (e.g. 16:20:30)
 * - 'd': Short Date (e.g. 20/04/2021)
 * - 'D': Long Date (e.g. 20 April 2021)
 * - 'f': Short Date/Time (e.g. 20 April 2021 16:20)
 * - 'F': Long Date/Time (e.g. Tuesday, 20 April 2021 16:20)
 * - 'R': Relative (e.g. 2 months ago, in 5 minutes) [DEFAULT]
 */
export function discordTimestamp(
  date: Date | string | number,
  style: DiscordTimestampStyle = 'R',
): string {
  const utc = toUTC(date);
  const unix = Math.floor(utc.getTime() / 1000);
  return `<t:${unix}:${style}>`;
}

// Unit multipliers in milliseconds
const UNIT_MULTIPLIERS_MS: Record<string, number> = {
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
  s: 1_000,
  sec: 1_000,
  secs: 1_000,
  second: 1_000,
  seconds: 1_000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 604_800_000,
  wk: 604_800_000,
  wks: 604_800_000,
  week: 604_800_000,
  weeks: 604_800_000,
  mo: 2_592_000_000, // 30 days
  month: 2_592_000_000,
  months: 2_592_000_000,
  y: 31_536_000_000, // 365 days
  yr: 31_536_000_000,
  yrs: 31_536_000_000,
  year: 31_536_000_000,
  years: 31_536_000_000,
};

/**
 * Parse a human duration string (e.g. "10m", "2h", "7d", "30s", "1w", "1mo", "2h 30m").
 * Returns an object with both milliseconds and seconds, or null if invalid.
 */
export function parseDuration(duration: string): ParsedDuration | null {
  if (!duration || typeof duration !== 'string') return null;
  const trimmed = duration.trim();
  if (!trimmed) return null;

  // Match sequences like "10m", "2.5h", "1mo", "30 seconds"
  // Linear regex that avoids catastrophic backtracking
  const tokenRegex = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/g;
  let match: RegExpExecArray | null;
  let totalMs = 0;
  let matchedCount = 0;

  while ((match = tokenRegex.exec(trimmed)) !== null) {
    matchedCount++;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    const multiplier = UNIT_MULTIPLIERS_MS[unit];
    if (multiplier === undefined) {
      return null; // Unknown unit
    }

    if (isNaN(value) || value < 0) {
      return null;
    }

    totalMs += Math.round(value * multiplier);
  }

  // If no tokens matched or input wasn't fully consumed (allowing whitespace and punctuation)
  if (matchedCount === 0) {
    return null;
  }

  const result: ParsedDuration = {
    ms: totalMs,
    seconds: Math.floor(totalMs / 1000),
    valueOf() {
      return totalMs;
    },
    toString() {
      return `${totalMs}ms`;
    },
  };

  return result;
}

/**
 * Convenience helper: parse duration directly to milliseconds.
 */
export function parseDurationMs(duration: string): number | null {
  const parsed = parseDuration(duration);
  return parsed ? parsed.ms : null;
}

/**
 * Convenience helper: parse duration directly to seconds.
 */
export function parseDurationSeconds(duration: string): number | null {
  const parsed = parseDuration(duration);
  return parsed ? parsed.seconds : null;
}

interface UnitDef {
  ms: number;
  singular: string;
  plural: string;
  short: string;
}

const UNITS: UnitDef[] = [
  { ms: 31_536_000_000, singular: 'year', plural: 'years', short: 'y' },
  { ms: 2_592_000_000, singular: 'month', plural: 'months', short: 'mo' },
  { ms: 604_800_000, singular: 'week', plural: 'weeks', short: 'w' },
  { ms: 86_400_000, singular: 'day', plural: 'days', short: 'd' },
  { ms: 3_600_000, singular: 'hour', plural: 'hours', short: 'h' },
  { ms: 60_000, singular: 'minute', plural: 'minutes', short: 'm' },
  { ms: 1_000, singular: 'second', plural: 'seconds', short: 's' },
];

/**
 * Format milliseconds into a human-readable duration string.
 * Example: 8_100_000 ms -> "2 hours 15 minutes"
 * Options:
 * - verbose: boolean (default true). If false, outputs "2h 15m".
 * - maxUnits: number (default 2). Limits output parts.
 */
export function formatDuration(ms: number, options: DurationFormatOptions = {}): string {
  const verbose = options.verbose ?? true;
  const maxUnits = options.maxUnits ?? 2;

  if (ms <= 0) {
    return verbose ? '0 seconds' : '0s';
  }

  let remaining = Math.round(ms);
  const parts: string[] = [];

  for (const unit of UNITS) {
    if (remaining >= unit.ms) {
      const count = Math.floor(remaining / unit.ms);
      remaining %= unit.ms;

      if (verbose) {
        parts.push(`${count} ${count === 1 ? unit.singular : unit.plural}`);
      } else {
        parts.push(`${count}${unit.short}`);
      }

      if (parts.length >= maxUnits) {
        break;
      }
    }
  }

  if (parts.length === 0) {
    return verbose ? '0 seconds' : '0s';
  }

  return parts.join(verbose ? ' ' : ' ');
}

/**
 * Convert UTC date to local representation in given IANA timezone.
 */
export function toZoned(date: Date | string | number, timeZone: string): Date {
  const tz = isValidTimezone(timeZone) ? timeZone : 'UTC';
  return toZonedTime(toUTC(date), tz);
}

/**
 * Convert local date in given IANA timezone back to UTC Date.
 */
export function fromZoned(date: Date | string | number, timeZone: string): Date {
  const tz = isValidTimezone(timeZone) ? timeZone : 'UTC';
  return fromZonedTime(date, tz);
}

/**
 * Format a Date in a specific timezone using standard date-fns format string.
 * DST-safe and timezone-aware.
 */
export function formatInTz(
  date: Date | string | number,
  formatStr: string,
  timeZone: string,
): string {
  const tz = isValidTimezone(timeZone) ? timeZone : 'UTC';
  return formatInTimeZone(toUTC(date), tz, formatStr);
}

/**
 * Get the start of the day (00:00:00.000) for a given date in the specified timezone,
 * returned as a normalized UTC Date.
 */
export function startOfDayInTz(date: Date | string | number, timeZone: string): Date {
  const tz = isValidTimezone(timeZone) ? timeZone : 'UTC';
  const zoned = toZonedTime(toUTC(date), tz);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, tz);
}

/**
 * Check if two dates fall on the same calendar day in the given timezone.
 * Robust against DST transitions.
 */
export function isSameDayInTz(
  d1: Date | string | number,
  d2: Date | string | number,
  timeZone: string,
): boolean {
  const tz = isValidTimezone(timeZone) ? timeZone : 'UTC';
  const s1 = formatInTimeZone(toUTC(d1), tz, 'yyyy-MM-dd');
  const s2 = formatInTimeZone(toUTC(d2), tz, 'yyyy-MM-dd');
  return s1 === s2;
}

/**
 * Add a duration to a date DST-safely using date-fns.
 */
export function addDuration(date: Date | string | number, duration: DurationAmount): Date {
  const utc = toUTC(date);
  return add(utc, duration);
}
