/**
 * test/worldclock/worldclock-service.test.ts
 * Comprehensive unit tests for Visual World Clock & Team Availability Overlap Finder — Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestTimezone, getTestTimezone)
 * - Timezone validation and alias mapping (EST, PST, CET, BST, JST, PKT, IST, AEST, UTC, GMT)
 * - Invalid & malformed timezone rejection
 * - Setting and retrieving member timezones with default and custom active hours
 * - Day/night icon (☀️ 06-18, 🌙 18-06) and local time formatting (12h, 24h, UTC offset)
 * - Meeting overlap calculation with 2-4 users across diverse timezones (NY, London, Tokyo, Paris, Chicago)
 * - No-overlap handling when timezones have disjoint waking hours
 * - Contiguous window discovery and duration filtering
 * - 24-hour ASCII visual timeline bar rendering ([░░░░████████████░░░░])
 * - Embed presentation builders (World Clock dashboard, User view, Meeting overlap)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestTimezone,
  getTestTimezone,
  setUserTimezone,
  getUserTimezone,
  listGuildTimezones,
  normalizeTimezone,
  isValidTimezone,
  formatUserLocalTime,
  getTimezoneOffsetMinutes,
  formatOffsetString,
  isHourActive,
  getLocalHourForUtcHour,
  render24HourBar,
  findMeetingOverlap,
  buildWorldClockEmbed,
  buildUserTimezoneEmbed,
  buildMeetingOverlapEmbed,
  TIMEZONE_ALIASES,
} from '@/lib/worldclock/worldclock-service';

describe('World Clock & Overlap Finder — Service Engine', () => {
  const GUILD_ID = 'guild_clock_test_001';
  const OTHER_GUILD = 'guild_clock_test_002';
  const USER_ALICE = 'user_alice_ny';
  const USER_BOB = 'user_bob_london';
  const USER_CHARLIE = 'user_charlie_tokyo';
  const USER_DANA = 'user_dana_chicago';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('Test Store Lifecycle', () => {
    it('manages testMode state correctly', () => {
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
    });

    it('sets and retrieves test timezone record with canonical defaults', () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        userTag: 'Alice',
        timezone: 'EST',
      });

      const record = getTestTimezone(GUILD_ID, USER_ALICE);
      assert.ok(record);
      assert.strictEqual(record.userTag, 'Alice');
      assert.strictEqual(record.timezone, 'America/New_York');
      assert.strictEqual(record.activeHours.startHour, 9);
      assert.strictEqual(record.activeHours.endHour, 22);
    });

    it('clears test store completely', () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        timezone: 'UTC',
      });
      clearTestStore();
      assert.strictEqual(getTestTimezone(GUILD_ID, USER_ALICE), undefined);
    });
  });

  describe('Timezone Normalization & Validation', () => {
    it('resolves all required aliases to compliant IANA timezone identifiers', () => {
      const aliasExpectations: Record<string, string> = {
        UTC: 'UTC',
        GMT: 'UTC',
        EST: 'America/New_York',
        EDT: 'America/New_York',
        CST: 'America/Chicago',
        PST: 'America/Los_Angeles',
        PDT: 'America/Los_Angeles',
        CET: 'Europe/Paris',
        BST: 'Europe/London',
        JST: 'Asia/Tokyo',
        PKT: 'Asia/Karachi',
        IST: 'Asia/Kolkata',
        AEST: 'Australia/Sydney',
      };

      for (const [alias, expected] of Object.entries(aliasExpectations)) {
        const canonical = normalizeTimezone(alias);
        assert.strictEqual(
          canonical,
          expected,
          `Alias ${alias} should resolve to ${expected}, got ${canonical}`,
        );
        assert.strictEqual(isValidTimezone(alias), true);
      }
    });

    it('resolves aliases case-insensitively', () => {
      assert.strictEqual(normalizeTimezone('est'), 'America/New_York');
      assert.strictEqual(normalizeTimezone('pst'), 'America/Los_Angeles');
      assert.strictEqual(normalizeTimezone('jst'), 'Asia/Tokyo');
      assert.strictEqual(normalizeTimezone('cet'), 'Europe/Paris');
    });

    it('accepts direct valid IANA timezone names and canonicalizes casing', () => {
      assert.strictEqual(normalizeTimezone('America/New_York'), 'America/New_York');
      assert.strictEqual(normalizeTimezone('Europe/London'), 'Europe/London');
      assert.strictEqual(normalizeTimezone('Asia/Tokyo'), 'Asia/Tokyo');
      assert.strictEqual(normalizeTimezone('Australia/Sydney'), 'Australia/Sydney');
      assert.strictEqual(normalizeTimezone('america/new_york'), 'America/New_York');
    });

    it('rejects invalid or unrecognizable timezone strings', () => {
      const invalidZones = ['Atlantis/City', 'Moon/Base', 'Mars/Rover', 'NotATimezone', '12345'];
      for (const bad of invalidZones) {
        assert.throws(
          () => normalizeTimezone(bad),
          /Invalid or unrecognized timezone/,
          `Should reject ${bad}`,
        );
        assert.strictEqual(isValidTimezone(bad), false);
      }
    });

    it('rejects empty or whitespace-only inputs', () => {
      assert.throws(() => normalizeTimezone(''), /Timezone cannot be empty/);
      assert.throws(() => normalizeTimezone('   '), /Invalid or unrecognized timezone/);
    });
  });

  describe('Local Time Formatting & Daylight Logic', () => {
    it('computes accurate UTC offset minutes and string representation', () => {
      const winterDate = new Date(Date.UTC(2026, 0, 15, 12, 0, 0)); // Jan 15

      const nyOffset = getTimezoneOffsetMinutes('America/New_York', winterDate);
      assert.strictEqual(nyOffset, -300); // UTC-5
      assert.strictEqual(formatOffsetString(nyOffset), 'UTC-5');

      const tokyoOffset = getTimezoneOffsetMinutes('Asia/Tokyo', winterDate);
      assert.strictEqual(tokyoOffset, 540); // UTC+9
      assert.strictEqual(formatOffsetString(tokyoOffset), 'UTC+9');

      const kolkataOffset = getTimezoneOffsetMinutes('Asia/Kolkata', winterDate);
      assert.strictEqual(kolkataOffset, 330); // UTC+5:30
      assert.strictEqual(formatOffsetString(kolkataOffset), 'UTC+5:30');

      const utcOffset = getTimezoneOffsetMinutes('UTC', winterDate);
      assert.strictEqual(utcOffset, 0);
      assert.strictEqual(formatOffsetString(utcOffset), 'UTC+0');
    });

    it('formats 12h, 24h, and daytime icon ☀️ accurately (06:00 - 18:00)', () => {
      // 14:00 UTC = 09:00 EST in New York (daytime)
      const noonUtc = new Date(Date.UTC(2026, 0, 15, 14, 0, 0));
      const nyTime = formatUserLocalTime('America/New_York', noonUtc);

      assert.strictEqual(nyTime.local24, '09:00');
      assert.strictEqual(nyTime.local12, '9:00 AM');
      assert.strictEqual(nyTime.isDaytime, true);
      assert.strictEqual(nyTime.icon, '☀️');
      assert.strictEqual(nyTime.hour, 9);
      assert.strictEqual(nyTime.minute, 0);
      assert.strictEqual(nyTime.offsetString, 'UTC-5');
      assert.ok(nyTime.formattedFull.includes('☀️'));
    });

    it('formats nighttime icon 🌙 accurately (18:00 - 06:00)', () => {
      // 03:00 UTC = 22:00 EST in New York (nighttime)
      const nightUtc = new Date(Date.UTC(2026, 0, 15, 3, 0, 0));
      const nyTime = formatUserLocalTime('America/New_York', nightUtc);

      assert.strictEqual(nyTime.local24, '22:00');
      assert.strictEqual(nyTime.local12, '10:00 PM');
      assert.strictEqual(nyTime.isDaytime, false);
      assert.strictEqual(nyTime.icon, '🌙');
      assert.strictEqual(nyTime.hour, 22);
      assert.ok(nyTime.formattedFull.includes('🌙'));
    });

    it('verifies daytime boundary conditions at 06:00 and 18:00', () => {
      // 11:00 UTC = 06:00 EST (exact daytime start)
      const morningDate = new Date(Date.UTC(2026, 0, 15, 11, 0, 0));
      const morningTime = formatUserLocalTime('America/New_York', morningDate);
      assert.strictEqual(morningTime.hour, 6);
      assert.strictEqual(morningTime.isDaytime, true);
      assert.strictEqual(morningTime.icon, '☀️');

      // 23:00 UTC = 18:00 EST (exact nighttime start)
      const eveningDate = new Date(Date.UTC(2026, 0, 15, 23, 0, 0));
      const eveningTime = formatUserLocalTime('America/New_York', eveningDate);
      assert.strictEqual(eveningTime.hour, 18);
      assert.strictEqual(eveningTime.isDaytime, false);
      assert.strictEqual(eveningTime.icon, '🌙');
    });
  });

  describe('Member Timezone Persistence & Retrieval', () => {
    it('sets timezone with default active hours (09:00 - 22:00)', async () => {
      const record = await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'EST');
      assert.strictEqual(record.guildId, GUILD_ID);
      assert.strictEqual(record.userId, USER_ALICE);
      assert.strictEqual(record.userTag, 'Alice');
      assert.strictEqual(record.timezone, 'America/New_York');
      assert.strictEqual(record.activeHours.startHour, 9);
      assert.strictEqual(record.activeHours.endHour, 22);

      const fetched = await getUserTimezone(GUILD_ID, USER_ALICE);
      assert.ok(fetched);
      assert.strictEqual(fetched?.timezone, 'America/New_York');
    });

    it('sets timezone with custom active hours', async () => {
      const record = await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'Europe/London', {
        startHour: 10,
        endHour: 20,
      });

      assert.strictEqual(record.activeHours.startHour, 10);
      assert.strictEqual(record.activeHours.endHour, 20);
    });

    it('rejects invalid active hours', async () => {
      await assert.rejects(
        () => setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'UTC', { startHour: -1 }),
        /Start hour must be an integer between 0 and 23/,
      );

      await assert.rejects(
        () => setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'UTC', { endHour: 24 }),
        /End hour must be an integer between 0 and 23/,
      );
    });

    it('lists all members for a guild sorted alphabetically by userTag', async () => {
      await setUserTimezone(GUILD_ID, USER_CHARLIE, 'Charlie', 'JST');
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'EST');
      await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'BST');
      await setUserTimezone(OTHER_GUILD, 'user_other', 'Zack', 'UTC');

      const members = await listGuildTimezones(GUILD_ID);
      assert.strictEqual(members.length, 3);
      assert.strictEqual(members[0].userTag, 'Alice');
      assert.strictEqual(members[1].userTag, 'Bob');
      assert.strictEqual(members[2].userTag, 'Charlie');
    });

    it('returns null for unconfigured user', async () => {
      const result = await getUserTimezone(GUILD_ID, 'unregistered_id');
      assert.strictEqual(result, null);
    });
  });

  describe('24-Hour ASCII Visual Timeline Bar Rendering', () => {
    it('renders exact 24-hour visual bar with delimiters', () => {
      const hours = Array(24).fill(false);
      // Hours 6 through 17 are active (12 hours, 6 offline before, 6 offline after)
      for (let i = 6; i < 18; i++) {
        hours[i] = true;
      }

      const bar = render24HourBar(hours);
      assert.strictEqual(bar, '[░░░░░░████████████░░░░░░]');
      assert.strictEqual(bar.length, 26); // 1 + 24 + 1
    });

    it('renders all-offline and all-active bars accurately', () => {
      assert.strictEqual(render24HourBar(Array(24).fill(false)), `[${'░'.repeat(24)}]`);
      assert.strictEqual(render24HourBar(Array(24).fill(true)), `[${'█'.repeat(24)}]`);
    });
  });

  describe('Team Meeting Overlap & Golden Hours Finder', () => {
    const fixedDate = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));

    it('computes 2-member overlap between New York and London', async () => {
      // Alice in New York (EST, UTC-5): active 09:00 - 22:00 local -> 14:00 - 03:00 UTC
      // Bob in London (GMT, UTC+0): active 09:00 - 22:00 local -> 09:00 - 22:00 UTC
      // Overlap: 14:00 - 22:00 UTC (8 hours contiguous!)
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'EST');
      await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'BST');

      const result = await findMeetingOverlap(GUILD_ID, [USER_ALICE, USER_BOB], 1, fixedDate);

      assert.strictEqual(result.hasOverlap, true);
      assert.strictEqual(result.members.length, 2);
      assert.strictEqual(result.overlapWindows.length, 1);

      const window = result.overlapWindows[0];
      assert.strictEqual(window.startUtc, 14);
      assert.strictEqual(window.endUtc, 22);
      assert.strictEqual(window.duration, 8);

      // Verify local times representation
      assert.ok(window.localTimes[USER_ALICE]);
      assert.ok(window.localTimes['Alice']);
      assert.strictEqual(window.localTimes[USER_ALICE], '09:00 - 17:00');
      assert.strictEqual(window.localTimes[USER_BOB], '14:00 - 22:00');

      // Verify ASCII visual timeline
      assert.ok(result.timelineVisual.includes('█'));
      assert.strictEqual(result.timelineVisual, '[░░░░░░░░░░░░░░████████░░]');
    });

    it('computes 4-member overlap across diverse timezones (NY, Chicago, London, Paris)', async () => {
      // Alice (NY, EST = UTC-5): 09:00-22:00 local -> 14:00-03:00 UTC
      // Dana (Chicago, CST = UTC-6): 09:00-22:00 local -> 15:00-04:00 UTC
      // Bob (London, GMT = UTC+0): 09:00-22:00 local -> 09:00-22:00 UTC
      // Eve (Paris, CET = UTC+1): 09:00-22:00 local -> 08:00-21:00 UTC
      // Expected Common Overlap: 15:00 UTC to 21:00 UTC (6 hours)
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'America/New_York');
      await setUserTimezone(GUILD_ID, USER_DANA, 'Dana', 'America/Chicago');
      await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'Europe/London');
      await setUserTimezone(GUILD_ID, 'user_eve_paris', 'Eve', 'Europe/Paris');

      const result = await findMeetingOverlap(
        GUILD_ID,
        [USER_ALICE, USER_DANA, USER_BOB, 'user_eve_paris'],
        2,
        fixedDate,
      );

      assert.strictEqual(result.hasOverlap, true);
      assert.strictEqual(result.members.length, 4);
      assert.strictEqual(result.overlapWindows.length, 1);

      const window = result.overlapWindows[0];
      assert.strictEqual(window.startUtc, 15);
      assert.strictEqual(window.endUtc, 21);
      assert.strictEqual(window.duration, 6);

      // Verify each member's local time conversions for this golden window
      assert.strictEqual(window.localTimes[USER_ALICE], '10:00 - 16:00');
      assert.strictEqual(window.localTimes[USER_DANA], '09:00 - 15:00');
      assert.strictEqual(window.localTimes[USER_BOB], '15:00 - 21:00');
      assert.strictEqual(window.localTimes['user_eve_paris'], '16:00 - 22:00');
    });

    it('correctly reports hasOverlap: false when 3 members have disjoint waking hours (NY + London + Tokyo)', async () => {
      // Alice (NY): 14:00-03:00 UTC
      // Bob (London): 09:00-22:00 UTC
      // Charlie (Tokyo, JST = UTC+9): 09:00-22:00 local -> 00:00-13:00 UTC
      // NY + London overlap: 14..22 UTC (Tokyo is sleeping 23:00-07:00 local)
      // Tokyo + London overlap: 09..13 UTC (NY is sleeping 04:00-08:00 local)
      // Tokyo + NY overlap: 00..03 UTC (London is sleeping 00:00-03:00 local)
      // 3-way simultaneous overlap is impossible with default 09:00-22:00 waking hours!
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'America/New_York');
      await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'Europe/London');
      await setUserTimezone(GUILD_ID, USER_CHARLIE, 'Charlie', 'Asia/Tokyo');

      const result = await findMeetingOverlap(
        GUILD_ID,
        [USER_ALICE, USER_BOB, USER_CHARLIE],
        1,
        fixedDate,
      );

      assert.strictEqual(result.hasOverlap, false);
      assert.strictEqual(result.overlapWindows.length, 0);
      assert.strictEqual(result.members.length, 3);
      assert.strictEqual(result.timelineVisual, `[${'░'.repeat(24)}]`);
    });

    it('filters out overlap windows shorter than requested durationHours', async () => {
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'America/New_York');
      await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'Europe/London');

      // Normal overlap is 8 hours (14:00 to 22:00 UTC)
      // When searching for a 4-hour meeting: should succeed
      const okResult = await findMeetingOverlap(GUILD_ID, [USER_ALICE, USER_BOB], 4, fixedDate);
      assert.strictEqual(okResult.hasOverlap, true);
      assert.strictEqual(okResult.overlapWindows.length, 1);

      // When searching for a 10-hour meeting: should fail since max window is 8 hours
      const failResult = await findMeetingOverlap(GUILD_ID, [USER_ALICE, USER_BOB], 10, fixedDate);
      assert.strictEqual(failResult.hasOverlap, false);
      assert.strictEqual(failResult.overlapWindows.length, 0);
    });

    it('handles empty guild or no registered members gracefully', async () => {
      const result = await findMeetingOverlap(GUILD_ID, undefined, 1, fixedDate);
      assert.strictEqual(result.hasOverlap, false);
      assert.strictEqual(result.members.length, 0);
      assert.strictEqual(result.overlapWindows.length, 0);
      assert.strictEqual(result.timelineVisual, `[${'░'.repeat(24)}]`);
    });

    it('handles single member self-availability schedule', async () => {
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'EST');
      const result = await findMeetingOverlap(GUILD_ID, [USER_ALICE], 2, fixedDate);

      assert.strictEqual(result.hasOverlap, true);
      assert.strictEqual(result.members.length, 1);
      assert.ok(result.overlapWindows.length >= 1);
    });
  });

  describe('Embed Presentation Builders', () => {
    it('builds rich World Clock dashboard embed with all registered members', async () => {
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'America/New_York');
      await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'Europe/London');

      const members = await listGuildTimezones(GUILD_ID);
      const embed = buildWorldClockEmbed('My Gaming Guild', members);

      assert.ok(embed.title?.includes('World Clock Dashboard'));
      assert.ok(embed.title?.includes('My Gaming Guild'));
      assert.ok(embed.description?.includes('Alice'));
      assert.ok(embed.description?.includes('Bob'));
      assert.ok(embed.fields?.[0].value?.includes('Registered Members: **2**'));
      assert.ok(embed.footer?.text?.includes('Daytime'));
    });

    it('builds empty notice embed when no members have set timezone', () => {
      const embed = buildWorldClockEmbed('Empty Guild', []);
      assert.ok(embed.title?.includes('Empty Guild'));
      assert.ok(embed.description?.includes('No members have registered'));
    });

    it('builds single member timezone view embed with timeline grid', async () => {
      const record = await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'America/New_York');
      const embed = buildUserTimezoneEmbed('Alpha Server', record);

      assert.ok(embed.title?.includes('Alice'));
      assert.ok(embed.description?.includes('Alpha Server'));
      assert.ok(embed.fields?.some((f) => f.name.includes('Current Local Time')));
      assert.ok(embed.fields?.some((f) => f.name.includes('Active Waking Hours')));
      assert.ok(embed.fields?.some((f) => f.name.includes('24-Hour UTC Availability Timeline')));
    });

    it('builds meeting overlap embed with golden windows and comparison grid', async () => {
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'EST');
      await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'BST');

      const overlap = await findMeetingOverlap(GUILD_ID, [USER_ALICE, USER_BOB], 2);
      const embed = buildMeetingOverlapEmbed(overlap, 2);

      assert.ok(embed.title?.includes('Golden Hours'));
      assert.strictEqual(embed.color, 0x2ecc71);
      assert.ok(embed.description?.includes('Found **1** golden hour window'));
      assert.ok(embed.fields?.some((f) => f.name.includes('Golden Overlap Windows')));
      assert.ok(embed.fields?.some((f) => f.name.includes('24-Hour Availability Grid')));
      assert.ok(embed.fields?.some((f) => f.name.includes('Participants')));
    });

    it('builds meeting overlap warning embed with recommendations when no window exists', async () => {
      await setUserTimezone(GUILD_ID, USER_ALICE, 'Alice', 'America/New_York');
      await setUserTimezone(GUILD_ID, USER_BOB, 'Bob', 'Europe/London');
      await setUserTimezone(GUILD_ID, USER_CHARLIE, 'Charlie', 'Asia/Tokyo');

      const overlap = await findMeetingOverlap(GUILD_ID, [USER_ALICE, USER_BOB, USER_CHARLIE], 1);
      const embed = buildMeetingOverlapEmbed(overlap, 1);

      assert.ok(embed.title?.includes('No 1h Window Found'));
      assert.strictEqual(embed.color, 0xe67e22);
      assert.ok(embed.fields?.some((f) => f.name.includes('Recommendations')));
    });
  });
});
