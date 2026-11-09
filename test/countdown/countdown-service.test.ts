/**
 * test/countdown/countdown-service.test.ts
 * Comprehensive unit tests for Service 9: Dynamic Real-Time Event Countdown Clocks — Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestCountdown, getTestCountdown)
 * - Date & Duration Parser (supports 30m, 2h, 3d, 7d, 2w, ISO strings, past date rejection, invalid string rejection)
 * - Countdown creation, ID formatting (/^cd-[A-Za-z0-9]{4}$/), title and description boundaries
 * - Countdown retrieval and guild isolation
 * - Active countdown listing sorted by nearest target date first and completion filtering
 * - Deletion mechanics with creator vs moderator authorization and unauthorized rejection
 * - Time remaining breakdown calculation (days, hours, minutes, seconds, isPast)
 * - Elapsed proportional ASCII progress bar rendering (0%, 50%, 80%, 100%)
 * - Discord embed builder (relative/exact timestamps, progress bar, role notice) & interactive button components
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestCountdown,
  getTestCountdown,
  generateCountdownId,
  parseTargetDate,
  calculateTimeRemaining,
  renderProgressBar,
  buildCountdownEmbed,
  buildCountdownComponents,
  createCountdown,
  getCountdown,
  listCountdowns,
  deleteCountdown,
  type IEventCountdown,
} from '@/lib/countdown/countdown-service';

describe('Event Countdown Clocks — Service Engine', () => {
  const GUILD_ID = 'guild_cd_test_001';
  const OTHER_GUILD = 'guild_cd_test_002';
  const CHANNEL_ID = 'chan_cd_test_100';
  const CREATOR_ID = 'user_cd_creator_111';
  const OTHER_USER = 'user_cd_other_222';
  const MOD_ID = 'user_cd_mod_333';

  // Fixed reference base time for deterministic tests: 2026-11-09T12:00:00.000Z
  const BASE_NOW = new Date('2026-11-09T12:00:00.000Z');

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

    it('sets and retrieves test countdowns', () => {
      const cd = setTestCountdown(GUILD_ID, 'cd-TEST', {
        title: 'Launch Day',
        creatorId: CREATOR_ID,
        channelId: CHANNEL_ID,
      });

      assert.strictEqual(cd.countdownId, 'cd-TEST');
      assert.strictEqual(cd.title, 'Launch Day');

      const retrieved = getTestCountdown(GUILD_ID, 'cd-TEST');
      assert.ok(retrieved);
      assert.strictEqual(retrieved?.countdownId, 'cd-TEST');
    });

    it('clears test store completely', () => {
      setTestCountdown(GUILD_ID, 'cd-0001', { title: 'Event 1' });
      setTestCountdown(GUILD_ID, 'cd-0002', { title: 'Event 2' });

      clearTestStore();
      assert.strictEqual(getTestCountdown(GUILD_ID, 'cd-0001'), undefined);
      assert.strictEqual(getTestCountdown(GUILD_ID, 'cd-0002'), undefined);
    });
  });

  describe('Date & Duration Parser (parseTargetDate)', () => {
    it('parses relative offset: 30m', () => {
      const target = parseTargetDate('30m', BASE_NOW);
      const expected = new Date(BASE_NOW.getTime() + 30 * 60 * 1000);
      assert.strictEqual(target.getTime(), expected.getTime());
    });

    it('parses relative offset: 2h', () => {
      const target = parseTargetDate('2h', BASE_NOW);
      const expected = new Date(BASE_NOW.getTime() + 2 * 3600 * 1000);
      assert.strictEqual(target.getTime(), expected.getTime());
    });

    it('parses relative offset: 3d', () => {
      const target = parseTargetDate('3d', BASE_NOW);
      const expected = new Date(BASE_NOW.getTime() + 3 * 86400 * 1000);
      assert.strictEqual(target.getTime(), expected.getTime());
    });

    it('parses relative offset: 7d', () => {
      const target = parseTargetDate('7d', BASE_NOW);
      const expected = new Date(BASE_NOW.getTime() + 7 * 86400 * 1000);
      assert.strictEqual(target.getTime(), expected.getTime());
    });

    it('parses relative offset: 2w', () => {
      const target = parseTargetDate('2w', BASE_NOW);
      const expected = new Date(BASE_NOW.getTime() + 14 * 86400 * 1000);
      assert.strictEqual(target.getTime(), expected.getTime());
    });

    it('parses relative offsets case-insensitively (30M, 2H, 3D, 7D, 2W)', () => {
      assert.strictEqual(
        parseTargetDate('30M', BASE_NOW).getTime(),
        new Date(BASE_NOW.getTime() + 30 * 60 * 1000).getTime(),
      );
      assert.strictEqual(
        parseTargetDate('2H', BASE_NOW).getTime(),
        new Date(BASE_NOW.getTime() + 2 * 3600 * 1000).getTime(),
      );
      assert.strictEqual(
        parseTargetDate('3D', BASE_NOW).getTime(),
        new Date(BASE_NOW.getTime() + 3 * 86400 * 1000).getTime(),
      );
      assert.strictEqual(
        parseTargetDate('7D', BASE_NOW).getTime(),
        new Date(BASE_NOW.getTime() + 7 * 86400 * 1000).getTime(),
      );
      assert.strictEqual(
        parseTargetDate('2W', BASE_NOW).getTime(),
        new Date(BASE_NOW.getTime() + 14 * 86400 * 1000).getTime(),
      );
    });

    it('parses compound duration offsets (e.g. 1d 2h)', () => {
      const target = parseTargetDate('1d 2h', BASE_NOW);
      const expected = new Date(BASE_NOW.getTime() + (86400 + 7200) * 1000);
      assert.strictEqual(target.getTime(), expected.getTime());
    });

    it('parses standard ISO date and time strings (YYYY-MM-DDTHH:mm:ssZ)', () => {
      const isoInput = '2026-12-31T23:59:59.000Z';
      const target = parseTargetDate(isoInput, BASE_NOW);
      assert.strictEqual(target.toISOString(), isoInput);
    });

    it('parses standard date string (YYYY-MM-DD)', () => {
      const dateInput = '2026-12-31';
      const target = parseTargetDate(dateInput, BASE_NOW);
      assert.strictEqual(target.getTime() > BASE_NOW.getTime(), true);
    });

    it('rejects target date in the past with a descriptive error', () => {
      const pastDate = '2025-01-01T00:00:00.000Z';
      assert.throws(
        () => parseTargetDate(pastDate, BASE_NOW),
        /Target date must be in the future/i,
      );
    });

    it('rejects unparseable or gibberish input', () => {
      assert.throws(
        () => parseTargetDate('not-a-valid-date-or-duration', BASE_NOW),
        /Invalid date or duration format/i,
      );
      assert.throws(
        () => parseTargetDate('abc', BASE_NOW),
        /Invalid date or duration format/i,
      );
    });

    it('rejects pure numbers without date formatting', () => {
      assert.throws(
        () => parseTargetDate('12345678', BASE_NOW),
        /Invalid date or duration format/i,
      );
    });

    it('rejects empty or whitespace-only strings', () => {
      assert.throws(
        () => parseTargetDate('', BASE_NOW),
        /cannot be empty/i,
      );
      assert.throws(
        () => parseTargetDate('   ', BASE_NOW),
        /cannot be empty/i,
      );
    });
  });

  describe('Countdown Creation & Unique ID Generation', () => {
    it('generates unique countdown ID formatted as cd-XXXX', () => {
      const id1 = generateCountdownId();
      const id2 = generateCountdownId();
      const pattern = /^cd-[A-Za-z0-9]{4}$/;

      assert.match(id1, pattern);
      assert.match(id2, pattern);
      assert.notStrictEqual(id1, id2);
    });

    it('creates countdown with valid parameters and defaults', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Community Game Night',
        targetInput: '2h',
        description: 'Join us for Jackbox and Among Us!',
        notifyRoleId: 'role_gamers_777',
        now: BASE_NOW,
      });

      assert.ok(cd);
      assert.match(cd.countdownId, /^cd-[A-Za-z0-9]{4}$/);
      assert.strictEqual(cd.guildId, GUILD_ID);
      assert.strictEqual(cd.channelId, CHANNEL_ID);
      assert.strictEqual(cd.creatorId, CREATOR_ID);
      assert.strictEqual(cd.title, 'Community Game Night');
      assert.strictEqual(cd.description, 'Join us for Jackbox and Among Us!');
      assert.strictEqual(cd.notifyRoleId, 'role_gamers_777');
      assert.strictEqual(cd.completed, false);
      assert.strictEqual(
        cd.targetDate.getTime(),
        BASE_NOW.getTime() + 2 * 3600 * 1000,
      );
    });

    it('trims whitespace from title', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: '   Trimmed Event Title   ',
        targetInput: '1d',
        now: BASE_NOW,
      });

      assert.strictEqual(cd.title, 'Trimmed Event Title');
    });

    it('rejects empty or whitespace-only title', async () => {
      await assert.rejects(
        async () =>
          createCountdown({
            guildId: GUILD_ID,
            channelId: CHANNEL_ID,
            creatorId: CREATOR_ID,
            title: '   ',
            targetInput: '1h',
            now: BASE_NOW,
          }),
        /Title must be between 1 and 100 characters/i,
      );
    });

    it('rejects title longer than 100 characters', async () => {
      await assert.rejects(
        async () =>
          createCountdown({
            guildId: GUILD_ID,
            channelId: CHANNEL_ID,
            creatorId: CREATOR_ID,
            title: 'A'.repeat(101),
            targetInput: '1h',
            now: BASE_NOW,
          }),
        /Title must be between 1 and 100 characters/i,
      );
    });

    it('rejects description longer than 1000 characters', async () => {
      await assert.rejects(
        async () =>
          createCountdown({
            guildId: GUILD_ID,
            channelId: CHANNEL_ID,
            creatorId: CREATOR_ID,
            title: 'Valid Title',
            description: 'D'.repeat(1001),
            targetInput: '1h',
            now: BASE_NOW,
          }),
        /Description cannot exceed 1000 characters/i,
      );
    });
  });

  describe('Countdown Retrieval & Guild Isolation', () => {
    it('retrieves existing countdown by guild and countdownId', async () => {
      const created = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Server Birthday',
        targetInput: '7d',
        now: BASE_NOW,
      });

      const retrieved = await getCountdown(GUILD_ID, created.countdownId);
      assert.ok(retrieved);
      assert.strictEqual(retrieved?.countdownId, created.countdownId);
      assert.strictEqual(retrieved?.title, 'Server Birthday');
    });

    it('returns null for non-existent countdown ID', async () => {
      const retrieved = await getCountdown(GUILD_ID, 'cd-NONE');
      assert.strictEqual(retrieved, null);
    });

    it('does not leak countdown across guilds', async () => {
      const created = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Secret Event',
        targetInput: '3d',
        now: BASE_NOW,
      });

      const otherGuildResult = await getCountdown(OTHER_GUILD, created.countdownId);
      assert.strictEqual(otherGuildResult, null);
    });
  });

  describe('Active Countdowns Listing (listCountdowns)', () => {
    it('sorts active countdowns with nearest target date first', async () => {
      // 3d from now
      await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Later Event',
        targetInput: '3d',
        now: BASE_NOW,
      });

      // 30m from now (nearest)
      await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Soonest Event',
        targetInput: '30m',
        now: BASE_NOW,
      });

      // 1d from now (middle)
      await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Middle Event',
        targetInput: '1d',
        now: BASE_NOW,
      });

      const list = await listCountdowns(GUILD_ID, false);
      assert.strictEqual(list.length, 3);
      assert.strictEqual(list[0].title, 'Soonest Event');
      assert.strictEqual(list[1].title, 'Middle Event');
      assert.strictEqual(list[2].title, 'Later Event');
    });

    it('excludes completed countdowns by default', async () => {
      const active = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Active Event',
        targetInput: '2h',
        now: BASE_NOW,
      });

      setTestCountdown(GUILD_ID, 'cd-DONE', {
        title: 'Completed Event',
        completed: true,
        targetDate: new Date(BASE_NOW.getTime() - 10000),
      });

      const listDefault = await listCountdowns(GUILD_ID, false);
      assert.strictEqual(listDefault.length, 1);
      assert.strictEqual(listDefault[0].countdownId, active.countdownId);

      const listWithCompleted = await listCountdowns(GUILD_ID, true);
      assert.strictEqual(listWithCompleted.length, 2);
    });

    it('returns empty array when guild has no countdowns', async () => {
      const list = await listCountdowns(GUILD_ID);
      assert.deepStrictEqual(list, []);
    });
  });

  describe('Delete Countdown Mechanics & Authorization', () => {
    it('allows creator to delete their own countdown', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Creator Event',
        targetInput: '1d',
        now: BASE_NOW,
      });

      const deleted = await deleteCountdown(GUILD_ID, cd.countdownId, CREATOR_ID, false);
      assert.strictEqual(deleted.countdownId, cd.countdownId);

      const check = await getCountdown(GUILD_ID, cd.countdownId);
      assert.strictEqual(check, null);
    });

    it('allows moderator to delete any countdown (isMod = true)', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Community Event',
        targetInput: '1d',
        now: BASE_NOW,
      });

      const deleted = await deleteCountdown(GUILD_ID, cd.countdownId, MOD_ID, true);
      assert.strictEqual(deleted.countdownId, cd.countdownId);

      const check = await getCountdown(GUILD_ID, cd.countdownId);
      assert.strictEqual(check, null);
    });

    it('rejects deletion when user is neither creator nor moderator', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Protected Event',
        targetInput: '1d',
        now: BASE_NOW,
      });

      await assert.rejects(
        async () => deleteCountdown(GUILD_ID, cd.countdownId, OTHER_USER, false),
        /Unauthorized: You are not the creator of this countdown and lack moderator permissions/i,
      );

      // Verify countdown was not deleted
      const check = await getCountdown(GUILD_ID, cd.countdownId);
      assert.ok(check);
    });

    it('rejects deletion for non-existent countdown ID', async () => {
      await assert.rejects(
        async () => deleteCountdown(GUILD_ID, 'cd-NONE', CREATOR_ID, true),
        /Countdown not found/i,
      );
    });
  });

  describe('Time Remaining Calculation (calculateTimeRemaining)', () => {
    it('computes exact days, hours, minutes, and seconds for future date', () => {
      // Exactly 2 days, 3 hours, 4 minutes, 5 seconds
      const offsetMs = (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000;
      const target = new Date(BASE_NOW.getTime() + offsetMs);

      const remaining = calculateTimeRemaining(target, BASE_NOW);
      assert.strictEqual(remaining.isPast, false);
      assert.strictEqual(remaining.days, 2);
      assert.strictEqual(remaining.hours, 3);
      assert.strictEqual(remaining.minutes, 4);
      assert.strictEqual(remaining.seconds, 5);
      assert.strictEqual(remaining.totalSeconds, 2 * 86400 + 3 * 3600 + 4 * 60 + 5);
    });

    it('returns isPast: true and zero units when target date is in the past', () => {
      const past = new Date(BASE_NOW.getTime() - 10000);
      const remaining = calculateTimeRemaining(past, BASE_NOW);

      assert.strictEqual(remaining.isPast, true);
      assert.strictEqual(remaining.totalSeconds, 0);
      assert.strictEqual(remaining.days, 0);
      assert.strictEqual(remaining.hours, 0);
      assert.strictEqual(remaining.minutes, 0);
      assert.strictEqual(remaining.seconds, 0);
    });

    it('returns isPast: true when target date equals current timestamp', () => {
      const remaining = calculateTimeRemaining(BASE_NOW, BASE_NOW);
      assert.strictEqual(remaining.isPast, true);
      assert.strictEqual(remaining.totalSeconds, 0);
    });
  });

  describe('Proportional ASCII Progress Bar (renderProgressBar)', () => {
    it('renders 0% progress at creation time', () => {
      const createdAt = new Date('2026-11-09T10:00:00.000Z');
      const targetDate = new Date('2026-11-09T20:00:00.000Z');
      const now = new Date('2026-11-09T10:00:00.000Z');

      const bar = renderProgressBar(createdAt, targetDate, now, 10);
      assert.strictEqual(bar, '[░░░░░░░░░░] 0%');
    });

    it('renders 50% progress halfway through event duration', () => {
      const createdAt = new Date('2026-11-09T10:00:00.000Z');
      const targetDate = new Date('2026-11-09T20:00:00.000Z');
      const now = new Date('2026-11-09T15:00:00.000Z');

      const bar = renderProgressBar(createdAt, targetDate, now, 10);
      assert.strictEqual(bar, '[█████░░░░░] 50%');
    });

    it('renders 80% progress bar accurately ([████████░░] 80%)', () => {
      const createdAt = new Date('2026-11-09T10:00:00.000Z');
      const targetDate = new Date('2026-11-09T20:00:00.000Z');
      const now = new Date('2026-11-09T18:00:00.000Z');

      const bar = renderProgressBar(createdAt, targetDate, now, 10);
      assert.strictEqual(bar, '[████████░░] 80%');
    });

    it('renders 100% progress when target date has been reached or passed', () => {
      const createdAt = new Date('2026-11-09T10:00:00.000Z');
      const targetDate = new Date('2026-11-09T20:00:00.000Z');
      const now = new Date('2026-11-09T22:00:00.000Z');

      const bar = renderProgressBar(createdAt, targetDate, now, 10);
      assert.strictEqual(bar, '[██████████] 100%');
    });

    it('supports custom progress bar length', () => {
      const createdAt = new Date('2026-11-09T10:00:00.000Z');
      const targetDate = new Date('2026-11-09T20:00:00.000Z');
      const now = new Date('2026-11-09T15:00:00.000Z');

      const bar = renderProgressBar(createdAt, targetDate, now, 20);
      assert.strictEqual(bar, `[${'█'.repeat(10)}${'░'.repeat(10)}] 50%`);
    });
  });

  describe('Discord Embed & Interactive Button Components', () => {
    it('builds rich countdown embed with title, relative timestamps, and progress bar', () => {
      const target = new Date(BASE_NOW.getTime() + 2 * 3600 * 1000);
      const countdown = {
        guildId: GUILD_ID,
        countdownId: 'cd-EMBD',
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Championship Finals',
        description: 'Grand finals match between Team A and Team B',
        targetDate: target,
        notifyRoleId: 'role_champs_999',
        completed: false,
        createdAt: new Date(BASE_NOW.getTime() - 2 * 3600 * 1000), // 50% elapsed
      } as unknown as IEventCountdown;

      const embed = buildCountdownEmbed(countdown, BASE_NOW);
      const targetUnix = Math.floor(target.getTime() / 1000);

      assert.strictEqual(embed.title, '⏳ Event Countdown: Championship Finals');
      assert.ok(embed.description?.includes('Grand finals match between Team A and Team B'));
      assert.ok(embed.description?.includes(`<t:${targetUnix}:R>`));
      assert.ok(embed.description?.includes(`<t:${targetUnix}:F>`));
      assert.ok(embed.description?.includes('[█████░░░░░] 50%'));
      assert.ok(embed.description?.includes('2h 0m 0s` remaining'));
      assert.ok(embed.description?.includes('<@&role_champs_999>'));
      assert.strictEqual(embed.footer?.text, `ID: cd-EMBD • Created by <@${CREATOR_ID}>`);
      assert.strictEqual(embed.color, 0x5865f2);
    });

    it('builds completed / reached embed styling when event is in the past', () => {
      const past = new Date(BASE_NOW.getTime() - 3600000);
      const countdown = {
        guildId: GUILD_ID,
        countdownId: 'cd-PAST',
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Past Event',
        targetDate: past,
        completed: true,
        createdAt: new Date(BASE_NOW.getTime() - 7200000),
      } as unknown as IEventCountdown;

      const embed = buildCountdownEmbed(countdown, BASE_NOW);

      assert.strictEqual(embed.title, '⏳ Event Countdown: Past Event');
      assert.ok(embed.description?.includes('Event Reached / Completed!'));
      assert.strictEqual(embed.color, 0xed4245);
    });

    it('builds interactive button action row with Refresh Countdown button', () => {
      const components = buildCountdownComponents('cd-BTN1');

      assert.strictEqual(components.length, 1);
      const row = components[0];
      assert.strictEqual(row.components.length, 1);

      const btn = row.components[0] as { label?: string; custom_id?: string };
      assert.strictEqual(btn.label, '🔄 Refresh Countdown');
      assert.strictEqual(btn.custom_id, 'cd_refresh:cd-BTN1');
    });
  });
});
