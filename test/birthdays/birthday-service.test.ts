/**
 * test/birthdays/birthday-service.test.ts
 * Unit tests for Automated Birthday Celebrations Engine:
 * - Date validation (1-12 months, leap year handling, month length limits)
 * - Setting, retrieving, and updating member birthdays
 * - Birthday deletion mechanics
 * - Days remaining calculation (today = 0, tomorrow = 1, next year rollover)
 * - Upcoming birthdays retrieval and formatting
 * - Server configuration management
 * - Celebration trigger, 24-hour TempAction scheduling, and same-year duplicate prevention
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDate,
  calculateDaysUntilBirthday,
  setUserBirthday,
  getUserBirthday,
  deleteUserBirthday,
  getUpcomingBirthdays,
  setBirthdayConfig,
  getBirthdayConfig,
  buildBirthdayCelebrationEmbed,
  buildUpcomingBirthdaysEmbed,
  checkAndTriggerBirthdays,
  triggerDailyBirthdaysForAllGuilds,
  enableTestMode,
  clearTestStore,
  setTestBirthday,
  setTestConfig,
  getTestTempActions,
} from '@/lib/birthdays/birthday-service';

describe('Birthday Celebrations — Service Engine', () => {
  const GUILD_ID = 'guild_bday_1001';
  const USER_ALICE = 'user_alice_101';
  const USER_BOB = 'user_bob_102';
  const USER_CHARLIE = 'user_charlie_103';
  const ROLE_BDAY_STAR = 'role_bday_star_888';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('validateDate()', () => {
    it('accepts valid dates across standard months', () => {
      assert.strictEqual(validateDate(1, 15).valid, true);
      assert.strictEqual(validateDate(3, 31).valid, true);
      assert.strictEqual(validateDate(7, 4).valid, true);
      assert.strictEqual(validateDate(12, 25).valid, true);
    });

    it('accepts February 29 to accommodate leap years', () => {
      const feb29 = validateDate(2, 29);
      assert.strictEqual(feb29.valid, true);
    });

    it('rejects February 30 and above', () => {
      const feb30 = validateDate(2, 30);
      assert.strictEqual(feb30.valid, false);
      assert.ok(feb30.reason?.includes('February'));
    });

    it('rejects 31st on 30-day months (Apr, Jun, Sep, Nov)', () => {
      const apr31 = validateDate(4, 31);
      assert.strictEqual(apr31.valid, false);
      assert.ok(apr31.reason?.includes('30 days'));

      const jun31 = validateDate(6, 31);
      assert.strictEqual(jun31.valid, false);

      const sep31 = validateDate(9, 31);
      assert.strictEqual(sep31.valid, false);

      const nov31 = validateDate(11, 31);
      assert.strictEqual(nov31.valid, false);
    });

    it('rejects invalid months (< 1 or > 12 or non-integer)', () => {
      assert.strictEqual(validateDate(0, 15).valid, false);
      assert.strictEqual(validateDate(13, 10).valid, false);
      assert.strictEqual(validateDate(-1, 5).valid, false);
      assert.strictEqual(validateDate(2.5, 10).valid, false);
    });

    it('rejects invalid days (< 1 or > 31 or non-integer)', () => {
      assert.strictEqual(validateDate(5, 0).valid, false);
      assert.strictEqual(validateDate(5, -3).valid, false);
      assert.strictEqual(validateDate(5, 32).valid, false);
      assert.strictEqual(validateDate(5, 12.5).valid, false);
    });
  });

  describe('setUserBirthday() & getUserBirthday()', () => {
    it('successfully registers and retrieves a member birthday', async () => {
      const saved = await setUserBirthday(GUILD_ID, USER_ALICE, 5, 20, 'America/New_York');
      assert.strictEqual(saved.guildId, GUILD_ID);
      assert.strictEqual(saved.userId, USER_ALICE);
      assert.strictEqual(saved.month, 5);
      assert.strictEqual(saved.day, 20);
      assert.strictEqual(saved.timezone, 'America/New_York');

      const retrieved = await getUserBirthday(GUILD_ID, USER_ALICE);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.month, 5);
      assert.strictEqual(retrieved.day, 20);
      assert.strictEqual(retrieved.timezone, 'America/New_York');
    });

    it('defaults timezone to UTC if omitted or whitespace', async () => {
      const saved = await setUserBirthday(GUILD_ID, USER_BOB, 8, 14);
      assert.strictEqual(saved.timezone, 'UTC');
    });

    it('updates an existing birthday with new date and timezone', async () => {
      await setUserBirthday(GUILD_ID, USER_ALICE, 3, 10, 'UTC');
      const updated = await setUserBirthday(GUILD_ID, USER_ALICE, 11, 28, 'Europe/London');

      assert.strictEqual(updated.month, 11);
      assert.strictEqual(updated.day, 28);
      assert.strictEqual(updated.timezone, 'Europe/London');

      const fetched = await getUserBirthday(GUILD_ID, USER_ALICE);
      assert.strictEqual(fetched?.month, 11);
      assert.strictEqual(fetched?.day, 28);
    });

    it('throws an error when setting an invalid birthday date', async () => {
      await assert.rejects(
        () => setUserBirthday(GUILD_ID, USER_ALICE, 2, 31),
        /February has a maximum of 29 days/,
      );
    });

    it('returns null when retrieving non-existent birthday', async () => {
      const result = await getUserBirthday(GUILD_ID, 'non_existent_user');
      assert.strictEqual(result, null);
    });
  });

  describe('deleteUserBirthday()', () => {
    it('deletes an existing birthday and returns true', async () => {
      await setUserBirthday(GUILD_ID, USER_ALICE, 4, 12);
      const deleted = await deleteUserBirthday(GUILD_ID, USER_ALICE);
      assert.strictEqual(deleted, true);

      const after = await getUserBirthday(GUILD_ID, USER_ALICE);
      assert.strictEqual(after, null);
    });

    it('returns false when deleting a non-existent birthday', async () => {
      const deleted = await deleteUserBirthday(GUILD_ID, 'ghost_user');
      assert.strictEqual(deleted, false);
    });
  });

  describe('calculateDaysUntilBirthday()', () => {
    const fixedNow = new Date('2026-06-15T12:00:00Z');

    it('returns 0 when birthday is today', () => {
      const days = calculateDaysUntilBirthday(6, 15, fixedNow);
      assert.strictEqual(days, 0);
    });

    it('returns 1 when birthday is tomorrow', () => {
      const days = calculateDaysUntilBirthday(6, 16, fixedNow);
      assert.strictEqual(days, 1);
    });

    it('computes positive days remaining later in the same year', () => {
      const days = calculateDaysUntilBirthday(6, 25, fixedNow);
      assert.strictEqual(days, 10);

      const decDays = calculateDaysUntilBirthday(12, 31, fixedNow);
      assert.strictEqual(decDays, 199);
    });

    it('rolls over to next year when birthday has already passed this year', () => {
      // June 14 already passed yesterday
      const days = calculateDaysUntilBirthday(6, 14, fixedNow);
      assert.strictEqual(days, 364); // 2027 is non-leap year

      // Jan 1 passed earlier this year
      const janDays = calculateDaysUntilBirthday(1, 1, fixedNow);
      assert.ok(janDays > 190 && janDays < 210);
    });
  });

  describe('getUpcomingBirthdays() & buildUpcomingBirthdaysEmbed()', () => {
    const referenceDate = new Date('2026-05-10T00:00:00Z');

    it('sorts upcoming birthdays in ascending order by days remaining and respects limit', async () => {
      setTestBirthday({ guildId: GUILD_ID, userId: USER_ALICE, month: 5, day: 12 }); // in 2 days
      setTestBirthday({ guildId: GUILD_ID, userId: USER_BOB, month: 5, day: 10 }); // today (0 days)
      setTestBirthday({ guildId: GUILD_ID, userId: USER_CHARLIE, month: 5, day: 25 }); // in 15 days

      const upcoming = await getUpcomingBirthdays(GUILD_ID, 2, referenceDate);
      assert.strictEqual(upcoming.length, 2);
      assert.strictEqual(upcoming[0].userId, USER_BOB);
      assert.strictEqual(upcoming[0].daysUntil, 0);
      assert.strictEqual(upcoming[1].userId, USER_ALICE);
      assert.strictEqual(upcoming[1].daysUntil, 2);
    });

    it('builds empty state upcoming embed when no birthdays registered', () => {
      const embed = buildUpcomingBirthdaysEmbed('AiCord Testing Guild', []);
      assert.ok(embed.title?.includes('AiCord Testing Guild'));
      assert.ok(embed.description?.includes('No upcoming birthdays registered'));
    });

    it('builds rich list upcoming embed with Today, Tomorrow, and day countdowns', () => {
      const list = [
        { userId: USER_BOB, month: 5, day: 10, daysUntil: 0 },
        { userId: USER_ALICE, month: 5, day: 11, daysUntil: 1 },
        { userId: USER_CHARLIE, month: 5, day: 24, daysUntil: 14 },
      ];

      const embed = buildUpcomingBirthdaysEmbed('AiCord Testing Guild', list);
      assert.ok(embed.description?.includes('Today! 🎂'));
      assert.ok(embed.description?.includes('Tomorrow 🎈'));
      assert.ok(embed.description?.includes('in **14 days**'));
      assert.ok(embed.description?.includes(`<@${USER_BOB}>`));
    });
  });

  describe('setBirthdayConfig() & getBirthdayConfig()', () => {
    it('returns default configuration for unconfigured server', async () => {
      const config = await getBirthdayConfig('unconfigured_guild');
      assert.strictEqual(config.enabled, true);
      assert.strictEqual(config.pingRole, false);
      assert.strictEqual(config.channelId, undefined);
      assert.strictEqual(config.roleId, undefined);
    });

    it('persists and updates celebration settings partially', async () => {
      await setBirthdayConfig(GUILD_ID, {
        channelId: 'channel_bday_999',
        roleId: ROLE_BDAY_STAR,
        message: 'Happy Birthday {user}! Enjoy your day!',
        pingRole: true,
      });

      const fetched = await getBirthdayConfig(GUILD_ID);
      assert.strictEqual(fetched.channelId, 'channel_bday_999');
      assert.strictEqual(fetched.roleId, ROLE_BDAY_STAR);
      assert.strictEqual(fetched.message, 'Happy Birthday {user}! Enjoy your day!');
      assert.strictEqual(fetched.pingRole, true);
      assert.strictEqual(fetched.enabled, true);

      // Disable partially
      await setBirthdayConfig(GUILD_ID, { enabled: false });
      const disabled = await getBirthdayConfig(GUILD_ID);
      assert.strictEqual(disabled.enabled, false);
      assert.strictEqual(disabled.channelId, 'channel_bday_999');
    });
  });

  describe('checkAndTriggerBirthdays() & TempAction 24h Role Grants', () => {
    const today = new Date('2026-07-22T08:00:00Z');

    it('triggers birthday celebration, grants role, and schedules 24h TempAction', async () => {
      setTestConfig({
        guildId: GUILD_ID,
        enabled: true,
        channelId: 'channel_announcements',
        roleId: ROLE_BDAY_STAR,
        message: 'Massive happy birthday to {user}! 🎉',
      });

      setTestBirthday({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        month: 7,
        day: 22,
      });

      const results = await checkAndTriggerBirthdays(GUILD_ID, today);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].userId, USER_ALICE);
      assert.strictEqual(results[0].roleGranted, true);
      assert.strictEqual(results[0].tempActionScheduled, true);
      assert.ok(results[0].embed.description?.includes(`<@${USER_ALICE}>`));

      // Verify TempAction 24h expiration
      const tempActions = getTestTempActions();
      assert.strictEqual(tempActions.length, 1);
      assert.strictEqual(tempActions[0].guildId, GUILD_ID);
      assert.strictEqual(tempActions[0].userId, USER_ALICE);
      assert.strictEqual(tempActions[0].roleId, ROLE_BDAY_STAR);
      assert.strictEqual(tempActions[0].type, 'temp_role');

      const expectedExpiresAt = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      assert.strictEqual(
        tempActions[0].expiresAt?.toISOString(),
        expectedExpiresAt.toISOString(),
      );
    });

    it('prevents duplicate celebrations in the same calendar year', async () => {
      setTestConfig({
        guildId: GUILD_ID,
        enabled: true,
        roleId: ROLE_BDAY_STAR,
      });

      setTestBirthday({
        guildId: GUILD_ID,
        userId: USER_BOB,
        month: 7,
        day: 22,
      });

      // First run: triggers celebration
      const firstRun = await checkAndTriggerBirthdays(GUILD_ID, today);
      assert.strictEqual(firstRun.length, 1);

      // Second run on same day: should skip already celebrated user
      const secondRun = await checkAndTriggerBirthdays(GUILD_ID, today);
      assert.strictEqual(secondRun.length, 0);
    });

    it('does not trigger celebrations when celebrations are disabled', async () => {
      setTestConfig({
        guildId: GUILD_ID,
        enabled: false,
      });

      setTestBirthday({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        month: 7,
        day: 22,
      });

      const results = await checkAndTriggerBirthdays(GUILD_ID, today);
      assert.strictEqual(results.length, 0);
    });

    it('triggerDailyBirthdaysForAllGuilds() processes all guilds with active birthdays', async () => {
      const GUILD_2 = 'guild_bday_2002';

      setTestConfig({ guildId: GUILD_ID, enabled: true });
      setTestConfig({ guildId: GUILD_2, enabled: true });

      setTestBirthday({ guildId: GUILD_ID, userId: USER_ALICE, month: 7, day: 22 });
      setTestBirthday({ guildId: GUILD_2, userId: USER_CHARLIE, month: 7, day: 22 });

      const all = await triggerDailyBirthdaysForAllGuilds(today);
      assert.strictEqual(all.length, 2);
    });
  });
});
