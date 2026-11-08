/**
 * test/worldclock/commands.test.ts
 * Unit tests for Visual World Clock & Team Availability Overlap Finder — Slash Commands:
 * - Central Command Registry lookup & subcommands schema verification (set, view, list, meet, standalone meet)
 * - Rate limit (5/10s), utility category, dm_permission: false, and options schema verification
 * - /worldclock set: timezone saving, active hours configuration, and invalid timezone error handling
 * - /worldclock view: self & target member local time view, unconfigured user handling
 * - /worldclock list: server-wide world clock dashboard and empty guild notice
 * - /worldclock meet: team availability overlap calculation, user mention parsing, and disjoint schedule notice
 * - Standalone /meet command execution and DM rejection
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import {
  getCommand,
  registerWorldClockCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleWorldClockCommand,
  handleMeetStandaloneCommand,
  handleWorldClockSetSubcommand,
  handleWorldClockViewSubcommand,
  handleWorldClockListSubcommand,
  handleWorldClockMeetSubcommand,
  parseUserIds,
  worldclockCommand,
  meetCommand,
} from '@/commands/worldclock';
import {
  enableTestMode,
  clearTestStore,
  setTestTimezone,
  getUserTimezone,
} from '@/lib/worldclock/worldclock-service';

describe('World Clock & Overlap Finder — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_clock_cmd_999';
  const USER_ALICE = 'user_alice_111';
  const USER_BOB = 'user_bob_222';
  const USER_CHARLIE = 'user_charlie_333';

  let interceptedResponses: Array<{
    token: string;
    options: InteractionResponseOptions;
  }> = [];

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();

    interceptedResponses = [];
    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });
  });

  afterEach(() => {
    setResponseHandler(null);
    clearTestStore();
    enableTestMode(false);
  });

  describe('Command Registry Integration & Schema', () => {
    it('registers /worldclock in the central command registry', () => {
      registerWorldClockCommands();
      const cmd = getCommand('worldclock');
      assert.ok(cmd, 'worldclock command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'worldclock');
      assert.strictEqual(cmd?.category, 'utility');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('registers standalone /meet in the central command registry', () => {
      registerWorldClockCommands();
      const cmd = getCommand('meet');
      assert.ok(cmd, 'meet command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'meet');
      assert.strictEqual(cmd?.category, 'utility');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines all 4 required subcommands with valid option schemas for /worldclock', () => {
      const subcommands = worldclockCommand.options?.map((o: unknown) => (o as { name: string }).name);
      assert.deepStrictEqual(subcommands, ['set', 'view', 'list', 'meet']);

      // Verify 'set' subcommand options
      const setSub = worldclockCommand.options?.find((o: unknown) => (o as { name: string }).name === 'set');
      const setOpts = (setSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(setOpts?.some((o) => o.name === 'timezone' && o.required === true));
      assert.ok(setOpts?.some((o) => o.name === 'start_hour' && o.required === false));
      assert.ok(setOpts?.some((o) => o.name === 'end_hour' && o.required === false));

      // Verify 'view' subcommand options
      const viewSub = worldclockCommand.options?.find((o: unknown) => (o as { name: string }).name === 'view');
      const viewOpts = (viewSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(viewOpts?.some((o) => o.name === 'user' && o.required === false));

      // Verify 'list' subcommand options
      const listSub = worldclockCommand.options?.find((o: unknown) => (o as { name: string }).name === 'list');
      const listOpts = (listSub as { options?: unknown[] })?.options;
      assert.strictEqual(listOpts?.length, 0);

      // Verify 'meet' subcommand options
      const meetSub = worldclockCommand.options?.find((o: unknown) => (o as { name: string }).name === 'meet');
      const meetOpts = (meetSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(meetOpts?.some((o) => o.name === 'duration_hours' && o.required === true));
      assert.ok(meetOpts?.some((o) => o.name === 'users' && o.required === false));
    });

    it('parses user mentions and IDs correctly via parseUserIds', () => {
      const parsed = parseUserIds('<@111222333444555666> <@!777888999000111222>, 999000111222333444');
      assert.strictEqual(parsed.length, 3);
      assert.strictEqual(parsed[0], '111222333444555666');
      assert.strictEqual(parsed[1], '777888999000111222');
      assert.strictEqual(parsed[2], '999000111222333444');

      assert.deepStrictEqual(parseUserIds(''), []);
      assert.deepStrictEqual(parseUserIds(undefined), []);
    });
  });

  describe('/worldclock set Subcommand', () => {
    it('saves user timezone with default active waking hours', async () => {
      await handleWorldClockSetSubcommand(
        GUILD_ID,
        USER_ALICE,
        'Alice',
        'token_set_1',
        [{ name: 'timezone', value: 'EST' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Timezone Saved'));
      assert.ok(embed?.description?.includes('America/New_York'));
      assert.ok(embed?.description?.includes('Active Hours'));

      const saved = await getUserTimezone(GUILD_ID, USER_ALICE);
      assert.ok(saved);
      assert.strictEqual(saved?.timezone, 'America/New_York');
      assert.strictEqual(saved?.activeHours.startHour, 9);
      assert.strictEqual(saved?.activeHours.endHour, 22);
    });

    it('saves user timezone with custom active waking hours', async () => {
      await handleWorldClockSetSubcommand(
        GUILD_ID,
        USER_BOB,
        'Bob',
        'token_set_2',
        [
          { name: 'timezone', value: 'Europe/London' },
          { name: 'start_hour', value: 8 },
          { name: 'end_hour', value: 17 },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const saved = await getUserTimezone(GUILD_ID, USER_BOB);
      assert.strictEqual(saved?.activeHours.startHour, 8);
      assert.strictEqual(saved?.activeHours.endHour, 17);
    });

    it('returns error embed when timezone is invalid or unrecognized', async () => {
      await handleWorldClockSetSubcommand(
        GUILD_ID,
        USER_ALICE,
        'Alice',
        'token_set_bad',
        [{ name: 'timezone', value: 'Mars/Olympus' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Invalid Timezone'));
      assert.ok(embed?.description?.includes('Invalid or unrecognized timezone'));
    });

    it('returns error embed when timezone option is missing', async () => {
      await handleWorldClockSetSubcommand(
        GUILD_ID,
        USER_ALICE,
        'Alice',
        'token_set_empty',
        [],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Timezone Required'));
    });
  });

  describe('/worldclock view Subcommand', () => {
    it('displays self timezone and schedule when configured', async () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        userTag: 'Alice',
        timezone: 'EST',
      });

      await handleWorldClockViewSubcommand(GUILD_ID, USER_ALICE, 'token_view_1', []);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Alice'));
      assert.ok(embed?.fields?.some((f) => f.name.includes('Current Local Time')));
      assert.ok(embed?.fields?.some((f) => f.name.includes('IANA Timezone')));
    });

    it('displays target member timezone and schedule', async () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_BOB,
        userTag: 'Bob',
        timezone: 'Europe/London',
      });

      await handleWorldClockViewSubcommand(GUILD_ID, USER_ALICE, 'token_view_2', [
        { name: 'user', value: USER_BOB },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Bob'));
    });

    it('returns informative notice when viewing unconfigured self', async () => {
      await handleWorldClockViewSubcommand(GUILD_ID, 'user_unregistered', 'token_view_unreg', []);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Timezone Not Configured'));
      assert.ok(embed?.description?.includes('You have not set your timezone yet'));
    });

    it('returns informative notice when viewing unconfigured target member', async () => {
      await handleWorldClockViewSubcommand(GUILD_ID, USER_ALICE, 'token_view_other_unreg', [
        { name: 'user', value: 'user_other_unreg' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Timezone Not Configured'));
      assert.ok(embed?.description?.includes('This member has not configured their timezone yet'));
    });
  });

  describe('/worldclock list Subcommand', () => {
    it('displays server world clock dashboard with all members', async () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        userTag: 'Alice',
        timezone: 'America/New_York',
      });
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_BOB,
        userTag: 'Bob',
        timezone: 'Europe/London',
      });

      await handleWorldClockListSubcommand(GUILD_ID, 'token_list_1');

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('World Clock Dashboard'));
      assert.ok(embed?.description?.includes('Alice'));
      assert.ok(embed?.description?.includes('Bob'));
    });

    it('displays empty guild notice when no members have set timezone', async () => {
      await handleWorldClockListSubcommand(GUILD_ID, 'token_list_empty');

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('No members have registered their timezone yet'));
    });
  });

  describe('/worldclock meet Subcommand', () => {
    it('finds meeting golden hours across all guild members', async () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        userTag: 'Alice',
        timezone: 'America/New_York',
      });
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_BOB,
        userTag: 'Bob',
        timezone: 'Europe/London',
      });

      await handleWorldClockMeetSubcommand(GUILD_ID, USER_ALICE, 'token_meet_1', [
        { name: 'duration_hours', value: 2 },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Golden Hours'));
      assert.ok(embed?.fields?.some((f) => f.name.includes('Golden Overlap Windows')));
    });

    it('cross-references specific mentioned members', async () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        userTag: 'Alice',
        timezone: 'America/New_York',
      });
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_BOB,
        userTag: 'Bob',
        timezone: 'Europe/London',
      });
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_CHARLIE,
        userTag: 'Charlie',
        timezone: 'Asia/Tokyo',
      });

      // Meeting between Alice and Bob only (excluding Charlie)
      await handleWorldClockMeetSubcommand(GUILD_ID, USER_ALICE, 'token_meet_2', [
        { name: 'duration_hours', value: 1 },
        { name: 'users', value: `<@${USER_ALICE}> <@${USER_BOB}>` },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Golden Hours'));
      assert.ok(embed?.description?.includes('**2** team participants'));
    });

    it('displays warning embed with recommendations when timezones do not overlap', async () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        userTag: 'Alice',
        timezone: 'America/New_York',
      });
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_BOB,
        userTag: 'Bob',
        timezone: 'Europe/London',
      });
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_CHARLIE,
        userTag: 'Charlie',
        timezone: 'Asia/Tokyo',
      });

      // 3-way disjoint waking hours
      await handleWorldClockMeetSubcommand(GUILD_ID, USER_ALICE, 'token_meet_disjoint', [
        { name: 'duration_hours', value: 1 },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('No 1h Window Found'));
      assert.ok(embed?.fields?.some((f) => f.name.includes('Recommendations')));
    });
  });

  describe('Main Command Router & Standalone /meet', () => {
    it('routes slash command interactions to proper subcommands', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_router_1',
        member: { user: { id: USER_ALICE, username: 'Alice' } },
        data: {
          options: [
            {
              name: 'set',
              type: 1,
              options: [{ name: 'timezone', value: 'EST' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleWorldClockCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Timezone Saved'));
    });

    it('rejects /worldclock when executed outside a server (in DMs)', async () => {
      const interaction = {
        token: 'token_dm',
        user: { id: USER_ALICE, username: 'Alice' },
        data: { options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleWorldClockCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Server Required'));
    });

    it('handles standalone /meet slash command', async () => {
      setTestTimezone({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        userTag: 'Alice',
        timezone: 'America/New_York',
      });

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_standalone_meet',
        member: { user: { id: USER_ALICE, username: 'Alice' } },
        data: {
          options: [{ name: 'duration_hours', value: 1 }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleMeetStandaloneCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Golden Hours'));
    });

    it('rejects standalone /meet when executed in DMs', async () => {
      const interaction = {
        token: 'token_meet_dm',
        user: { id: USER_ALICE, username: 'Alice' },
        data: { options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleMeetStandaloneCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Server Required'));
    });
  });
});
