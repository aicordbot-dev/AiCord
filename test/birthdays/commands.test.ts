/**
 * test/birthdays/commands.test.ts
 * Unit tests for Automated Birthday Celebrations Slash Command Suite:
 * - Central Command Registry lookup & subcommands schema verification
 * - /birthday set (valid parameters, invalid month, invalid day)
 * - /birthday view (self and target member lookup with countdowns)
 * - /birthday remove (successful removal and unregistered state)
 * - /birthday upcoming (empty state and populated calendar list)
 * - /birthday config (MANAGE_GUILD permission check & setting updates)
 * - /birthday test (MANAGE_GUILD permission check & celebration preview)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { getCommand, registerBirthdayCommands } from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleBirthdayCommand,
  handleBirthdaySetSubcommand,
  handleBirthdayViewSubcommand,
  handleBirthdayRemoveSubcommand,
  handleBirthdayUpcomingSubcommand,
  handleBirthdayConfigSubcommand,
  handleBirthdayTestSubcommand,
} from '@/commands/birthdays';
import {
  enableTestMode,
  clearTestStore,
  setUserBirthday,
  getUserBirthday,
  getBirthdayConfig,
} from '@/lib/birthdays/birthday-service';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Birthday Celebrations — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_bday_cmd_505';
  const USER_ADMIN = 'user_admin_99';
  const USER_ALICE = 'user_alice_88';
  const USER_BOB = 'user_bob_77';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

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

  // ─── 1. Registry Lookup ──────────────────────────────────────────────────────

  describe('Command Registry Integration', () => {
    it('registers /birthday with utility category and 6 subcommands', () => {
      registerBirthdayCommands();
      const cmd = getCommand('birthday');
      assert.ok(cmd, 'birthday command should be found in registry');
      assert.strictEqual(cmd.name, 'birthday');
      assert.strictEqual(cmd.category, 'utility');
      assert.strictEqual(cmd.options?.length, 6);

      const subcommands = (cmd.options as Array<{ name: string }>).map((o) => o.name);
      assert.ok(subcommands.includes('set'));
      assert.ok(subcommands.includes('view'));
      assert.ok(subcommands.includes('remove'));
      assert.ok(subcommands.includes('upcoming'));
      assert.ok(subcommands.includes('config'));
      assert.ok(subcommands.includes('test'));
    });
  });

  // ─── 2. /birthday set ────────────────────────────────────────────────────────

  describe('/birthday set Subcommand', () => {
    it('registers birthday with valid month, day, and timezone', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_set_valid',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [
            {
              name: 'set',
              options: [
                { name: 'month', value: 8 },
                { name: 'day', value: 15 },
                { name: 'timezone', value: 'America/New_York' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Birthday Registered!'));
      assert.ok(resp.embeds?.[0].description?.includes('August 15'));
      assert.ok(resp.embeds?.[0].description?.includes('America/New_York'));

      const saved = await getUserBirthday(GUILD_ID, USER_ALICE);
      assert.strictEqual(saved?.month, 8);
      assert.strictEqual(saved?.day, 15);
      assert.strictEqual(saved?.timezone, 'America/New_York');
    });

    it('rejects registration with invalid month (> 12)', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_set_invalid_month',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [
            {
              name: 'set',
              options: [
                { name: 'month', value: 14 },
                { name: 'day', value: 10 },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Invalid Date'));
      assert.ok(resp.embeds?.[0].description?.includes('between 1 and 12'));
    });

    it('rejects registration with invalid day (e.g. 31 on 30-day month)', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_set_invalid_day',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [
            {
              name: 'set',
              options: [
                { name: 'month', value: 4 }, // April
                { name: 'day', value: 31 },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Invalid Date'));
      assert.ok(resp.embeds?.[0].description?.includes('30 days'));
    });
  });

  // ─── 3. /birthday view ───────────────────────────────────────────────────────

  describe('/birthday view Subcommand', () => {
    it('returns error when self birthday is not registered', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_view_self_none',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [{ name: 'view', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('No Birthday Found'));
      assert.ok(resp.embeds?.[0].description?.includes("haven't registered"));
    });

    it('returns birthday profile when self birthday is registered', async () => {
      await setUserBirthday(GUILD_ID, USER_ALICE, 10, 25, 'UTC');

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_view_self_found',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [{ name: 'view', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Birthday Profile'));
      assert.ok(resp.embeds?.[0].description?.includes('October 25'));
      assert.ok(resp.embeds?.[0].description?.includes(`<@${USER_ALICE}>`));
    });

    it('returns target member birthday when requested', async () => {
      await setUserBirthday(GUILD_ID, USER_BOB, 3, 14, 'Europe/Berlin');

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_view_target',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [
            {
              name: 'view',
              options: [{ name: 'user', value: USER_BOB }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].description?.includes(`<@${USER_BOB}>`));
      assert.ok(resp.embeds?.[0].description?.includes('March 14'));
    });
  });

  // ─── 4. /birthday remove ─────────────────────────────────────────────────────

  describe('/birthday remove Subcommand', () => {
    it('successfully removes registered birthday', async () => {
      await setUserBirthday(GUILD_ID, USER_ALICE, 6, 1);

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_remove_success',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [{ name: 'remove', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Birthday Removed'));

      const found = await getUserBirthday(GUILD_ID, USER_ALICE);
      assert.strictEqual(found, null);
    });

    it('returns error when user has no birthday registered', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_remove_none',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [{ name: 'remove', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Not Registered'));
    });
  });

  // ─── 5. /birthday upcoming ───────────────────────────────────────────────────

  describe('/birthday upcoming Subcommand', () => {
    it('returns empty upcoming birthdays embed when server has no registered dates', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_upcoming_empty',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [{ name: 'upcoming', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Upcoming Birthdays'));
      assert.ok(resp.embeds?.[0].description?.includes('No upcoming birthdays registered'));
    });

    it('returns populated upcoming birthdays embed with members list', async () => {
      await setUserBirthday(GUILD_ID, USER_ALICE, 12, 1);
      await setUserBirthday(GUILD_ID, USER_BOB, 12, 2);

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_upcoming_list',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [{ name: 'upcoming', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Upcoming Birthdays'));
      assert.ok(resp.embeds?.[0].description?.includes(`<@${USER_ALICE}>`));
      assert.ok(resp.embeds?.[0].description?.includes(`<@${USER_BOB}>`));
    });
  });

  // ─── 6. /birthday config ─────────────────────────────────────────────────────

  describe('/birthday config Subcommand', () => {
    it('rejects configuration changes when member lacks MANAGE_GUILD', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_cfg_denied',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [
            {
              name: 'config',
              options: [{ name: 'enabled', value: false }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Permission Denied'));
    });

    it('updates celebration settings when member has MANAGE_GUILD permission', async () => {
      const adminPerms = String(PermissionFlags.MANAGE_GUILD);
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_cfg_success',
        member: { user: { id: USER_ADMIN }, permissions: adminPerms },
        data: {
          name: 'birthday',
          options: [
            {
              name: 'config',
              options: [
                { name: 'channel', value: 'channel_bday_123' },
                { name: 'role', value: 'role_star_555' },
                { name: 'message', value: 'Cheers to {user}! 🎉' },
                { name: 'enabled', value: true },
                { name: 'ping_role', value: true },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Birthday Settings Updated'));
      assert.ok(resp.embeds?.[0].description?.includes('<#channel_bday_123>'));
      assert.ok(resp.embeds?.[0].description?.includes('<@&role_star_555>'));

      const config = await getBirthdayConfig(GUILD_ID);
      assert.strictEqual(config.channelId, 'channel_bday_123');
      assert.strictEqual(config.roleId, 'role_star_555');
      assert.strictEqual(config.message, 'Cheers to {user}! 🎉');
      assert.strictEqual(config.pingRole, true);
    });
  });

  // ─── 7. /birthday test ───────────────────────────────────────────────────────

  describe('/birthday test Subcommand', () => {
    it('rejects test command when member lacks MANAGE_GUILD', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_test_denied',
        member: { user: { id: USER_ALICE }, permissions: '0' },
        data: {
          name: 'birthday',
          options: [{ name: 'test', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Permission Denied'));
    });

    it('sends celebration preview when member has MANAGE_GUILD permission', async () => {
      const adminPerms = String(PermissionFlags.MANAGE_GUILD);
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_test_success',
        member: { user: { id: USER_ADMIN }, permissions: adminPerms },
        data: {
          name: 'birthday',
          options: [{ name: 'test', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBirthdayCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.content?.includes('Birthday Celebration Test Triggered!'));
      assert.ok(resp.embeds?.[0].title?.includes('Happy Birthday!'));
      assert.ok(resp.embeds?.[0].description?.includes(`<@${USER_ADMIN}>`));
    });
  });
});
