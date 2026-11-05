/**
 * test/engines/time-engine.test.ts
 * Unit tests for Time Engine: UTC normalization, timezone resolution,
 * Discord timestamps, duration parsing/formatting, and DST-safe operations.
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toUTC,
  isValidTimezone,
  resolveTimezone,
  discordTimestamp,
  parseDuration,
  parseDurationMs,
  parseDurationSeconds,
  formatDuration,
  formatInTz,
  isSameDayInTz,
  startOfDayInTz,
  addDuration,
} from '@/lib/engines/time-engine';

describe('Time Engine', () => {
  describe('toUTC()', () => {
    it('normalizes Date objects, ISO strings, and Unix timestamps', () => {
      const dateObj = new Date('2026-11-04T12:00:00Z');
      const isoStr = '2026-11-04T12:00:00Z';
      const numTs = dateObj.getTime();

      const d1 = toUTC(dateObj);
      const d2 = toUTC(isoStr);
      const d3 = toUTC(numTs);

      assert.equal(d1.toISOString(), '2026-11-04T12:00:00.000Z');
      assert.equal(d2.toISOString(), '2026-11-04T12:00:00.000Z');
      assert.equal(d3.toISOString(), '2026-11-04T12:00:00.000Z');
    });

    it('throws RangeError for invalid date representations', () => {
      assert.throws(() => toUTC('not-a-valid-date'), {
        name: 'RangeError',
      });
      assert.throws(() => toUTC(new Date('invalid')), {
        name: 'RangeError',
      });
    });
  });

  describe('Timezone Resolution', () => {
    it('validates IANA timezones accurately', () => {
      assert.ok(isValidTimezone('America/New_York'));
      assert.ok(isValidTimezone('UTC'));
      assert.ok(isValidTimezone('Europe/London'));
      assert.ok(isValidTimezone('Asia/Tokyo'));

      assert.ok(!isValidTimezone('Invalid/Zone_Name_123'));
      assert.ok(!isValidTimezone(''));
      assert.ok(!isValidTimezone(null));
      assert.ok(!isValidTimezone(undefined));
    });

    it('resolves timezone precedence (user > guild > fallback > UTC)', () => {
      // User set
      assert.equal(
        resolveTimezone('America/Chicago', 'Europe/Paris', 'UTC'),
        'America/Chicago',
      );
      // User invalid -> Guild used
      assert.equal(
        resolveTimezone('invalid_tz', 'Europe/Paris', 'UTC'),
        'Europe/Paris',
      );
      // User & Guild invalid -> Fallback used
      assert.equal(
        resolveTimezone(null, undefined, 'Asia/Singapore'),
        'Asia/Singapore',
      );
      // All invalid -> default UTC
      assert.equal(resolveTimezone(null, null, 'invalid_fallback'), 'UTC');
    });
  });

  describe('Discord Markdown Timestamps', () => {
    it('generates standard Discord markdown timestamps', () => {
      const fixed = new Date('2026-11-04T12:00:00Z');
      const unix = Math.floor(fixed.getTime() / 1000);

      assert.equal(discordTimestamp(fixed), `<t:${unix}:R>`);
      assert.equal(discordTimestamp(fixed, 'F'), `<t:${unix}:F>`);
      assert.equal(discordTimestamp(fixed, 'd'), `<t:${unix}:d>`);
      assert.equal(discordTimestamp(fixed, 't'), `<t:${unix}:t>`);
    });
  });

  describe('Duration Parser', () => {
    it('parses single unit duration tokens to milliseconds and seconds', () => {
      const d10m = parseDuration('10m');
      assert.ok(d10m);
      assert.equal(d10m.ms, 600_000);
      assert.equal(d10m.seconds, 600);
      assert.equal(Number(d10m), 600_000);

      const d2h = parseDuration('2h');
      assert.ok(d2h);
      assert.equal(d2h.ms, 7_200_000);
      assert.equal(d2h.seconds, 7_200);

      const d7d = parseDuration('7d');
      assert.ok(d7d);
      assert.equal(d7d.ms, 604_800_000);

      const d30s = parseDuration('30s');
      assert.ok(d30s);
      assert.equal(d30s.ms, 30_000);

      const d1w = parseDuration('1w');
      assert.ok(d1w);
      assert.equal(d1w.ms, 604_800_000);

      const d1mo = parseDuration('1mo');
      assert.ok(d1mo);
      assert.equal(d1mo.ms, 2_592_000_000);
    });

    it('parses compound durations like "2h 15m 30s"', () => {
      const compound = parseDuration('2h 15m 30s');
      assert.ok(compound);
      assert.equal(compound.ms, 7_200_000 + 900_000 + 30_000);
      assert.equal(compound.seconds, 7_200 + 900 + 30);
    });

    it('supports helper functions parseDurationMs and parseDurationSeconds', () => {
      assert.equal(parseDurationMs('5m'), 300_000);
      assert.equal(parseDurationSeconds('5m'), 300);
      assert.equal(parseDurationMs('invalid_xyz'), null);
    });

    it('returns null on invalid inputs', () => {
      assert.equal(parseDuration(''), null);
      assert.equal(parseDuration('unknown'), null);
      assert.equal(parseDuration('123'), null);
    });
  });

  describe('Duration Formatter', () => {
    it('formats milliseconds to human readable strings', () => {
      // 2 hours 15 minutes
      assert.equal(formatDuration(8_100_000), '2 hours 15 minutes');

      // 1 day
      assert.equal(formatDuration(86_400_000), '1 day');

      // 1 hour
      assert.equal(formatDuration(3_600_000), '1 hour');

      // 1 minute
      assert.equal(formatDuration(60_000), '1 minute');

      // 30 seconds
      assert.equal(formatDuration(30_000), '30 seconds');

      // 0 seconds
      assert.equal(formatDuration(0), '0 seconds');
    });

    it('supports concise mode (verbose: false)', () => {
      assert.equal(formatDuration(8_100_000, { verbose: false }), '2h 15m');
      assert.equal(formatDuration(30_000, { verbose: false }), '30s');
    });

    it('respects maxUnits option', () => {
      // 1 day + 2 hours + 30 minutes
      const ms = 86_400_000 + 7_200_000 + 1_800_000;
      assert.equal(formatDuration(ms, { maxUnits: 1 }), '1 day');
      assert.equal(formatDuration(ms, { maxUnits: 2 }), '1 day 2 hours');
    });
  });

  describe('DST-Safe Date Operations', () => {
    it('formats date in specific timezone', () => {
      const utc = new Date('2026-11-04T12:00:00Z');
      const formatted = formatInTz(utc, 'yyyy-MM-dd HH:mm', 'America/New_York');
      assert.equal(formatted, '2026-11-04 07:00');
    });

    it('checks whether two timestamps fall on the same day in timezone', () => {
      // 2026-11-04 03:00 UTC is 2026-11-03 23:00 EDT in New York
      const d1 = new Date('2026-11-04T03:00:00Z');
      // 2026-11-04 12:00 UTC is 2026-11-04 07:00 EDT in New York
      const d2 = new Date('2026-11-04T12:00:00Z');

      // In UTC, both are on Nov 4
      assert.ok(isSameDayInTz(d1, d2, 'UTC'));

      // In New York, d1 is Nov 3 and d2 is Nov 4
      assert.ok(!isSameDayInTz(d1, d2, 'America/New_York'));
    });

    it('computes start of day in timezone accurately', () => {
      const utc = new Date('2026-11-04T15:30:00Z');
      const startOfDay = startOfDayInTz(utc, 'America/New_York');

      const formatted = formatInTz(startOfDay, 'yyyy-MM-dd HH:mm:ss', 'America/New_York');
      assert.equal(formatted, '2026-11-04 00:00:00');
    });

    it('adds duration to date correctly', () => {
      const start = new Date('2026-11-04T12:00:00Z');
      const result = addDuration(start, { days: 2, hours: 3 });
      assert.equal(result.toISOString(), '2026-11-06T15:00:00.000Z');
    });
  });
});
