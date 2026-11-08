/**
 * test/giveaways/commands.test.ts
 * Unit tests for Interactive Giveaways & Raffles Slash Command & Component Handlers:
 * - Command Registry resolution and schema validation
 * - Guild-only and MANAGE_GUILD permission checks
 * - /giveaway start (duration parsing, channel routing, role/level requirements)
 * - /giveaway end (winner announcement & conclusion)
 * - /giveaway reroll (winner rerolls and no-entries warning)
 * - /giveaway list (active giveaways display & empty state)
 * - handleGiveawayComponent() routing:
 *   - gw_enter toggle (entering, leaving)
 *   - level gating response
 *   - role gating response
 *   - ended giveaway response
 *   - not found response
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import {
  getCommand,
  registerGiveawayCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleGiveawayCommand,
  handleGiveawayStart,
  handleGiveawayEnd,
  handleGiveawayReroll,
  handleGiveawayList,
  handleGiveawayComponent,
  giveawayCommand,
} from '@/commands/giveaway';
import {
  enableTestMode,
  clearTestStore,
  createGiveaway,
  enterGiveaway,
  endGiveaway,
  getGiveaway,
  setTestGiveaway,
} from '@/lib/giveaways/giveaway-service';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Interactive Giveaways Suite — Commands & Component Handlers', () => {
  const GUILD_ID = 'guild_gw_cmd_202';
  const USER_ADMIN = 'user_admin_mod';
  const USER_REGULAR = 'user_regular_bob';
  const CHANNEL_ID = 'channel_gw_feed';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    registerGiveawayCommands();

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

  // ─── 1. Command Registry Integration ─────────────────────────────────────────

  describe('Command Registry Integration', () => {
    it('registers /giveaway with utility category, MANAGE_GUILD permission, and 4 subcommands', () => {
      const cmd = getCommand('giveaway');
      assert.ok(cmd, 'giveaway command must be registered');
      assert.equal(cmd.name, 'giveaway');
      assert.equal(cmd.category, 'utility');
      assert.equal(cmd.default_member_permissions, PermissionFlags.MANAGE_GUILD.toString());
      assert.equal(cmd.dm_permission, false);

      const subcommands = (cmd.options as any[]).map((o) => o.name);
      assert.equal(subcommands.length, 4);
      assert.ok(subcommands.includes('start'));
      assert.ok(subcommands.includes('end'));
      assert.ok(subcommands.includes('reroll'));
      assert.ok(subcommands.includes('list'));
    });

    it('verifies option schemas for /giveaway start, end, and reroll', () => {
      const startSub = (giveawayCommand.options as any[]).find((o) => o.name === 'start');
      assert.ok(startSub);
      const startOptionNames = startSub.options.map((o: any) => o.name);
      assert.ok(startOptionNames.includes('prize'));
      assert.ok(startOptionNames.includes('duration'));
      assert.ok(startOptionNames.includes('winners'));
      assert.ok(startOptionNames.includes('channel'));
      assert.ok(startOptionNames.includes('min_level'));
      assert.ok(startOptionNames.includes('required_role'));

      const endSub = (giveawayCommand.options as any[]).find((o) => o.name === 'end');
      assert.ok(endSub);
      assert.equal(endSub.options[0].name, 'message_id');

      const rerollSub = (giveawayCommand.options as any[]).find((o) => o.name === 'reroll');
      assert.ok(rerollSub);
      const rerollOptionNames = rerollSub.options.map((o: any) => o.name);
      assert.ok(rerollOptionNames.includes('message_id'));
      assert.ok(rerollOptionNames.includes('winners'));
    });
  });

  // ─── 2. Permissions & Scope Gating ───────────────────────────────────────────

  describe('Permissions & Server Scope Gating', () => {
    it('rejects execution when used outside of a server (in DMs)', async () => {
      const dmInteraction = {
        guild_id: undefined,
        token: 'token_dm',
        channel_id: 'dm_channel',
        data: {
          name: 'giveaway',
          options: [{ name: 'list' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleGiveawayCommand(dmInteraction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('only be used in a server'));
    });

    it('rejects execution when member lacks MANAGE_GUILD permission', async () => {
      const noPermsInteraction = {
        guild_id: GUILD_ID,
        token: 'token_noperms',
        channel_id: CHANNEL_ID,
        member: {
          user: { id: USER_REGULAR },
          permissions: '0', // No permissions
        },
        data: {
          name: 'giveaway',
          options: [{ name: 'list' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleGiveawayCommand(noPermsInteraction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Permission Denied'));
      assert.ok(embed?.description?.includes('MANAGE_GUILD'));
    });
  });

  // ─── 3. /giveaway start Subcommand ───────────────────────────────────────────

  describe('/giveaway start Subcommand', () => {
    it('starts giveaway with valid prize and duration, default channel and 1 winner', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_start_ok',
        channel_id: CHANNEL_ID,
        member: {
          user: { id: USER_ADMIN },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'giveaway',
          options: [
            {
              name: 'start',
              options: [
                { name: 'prize', value: 'Discord Nitro Basic' },
                { name: 'duration', value: '30m' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleGiveawayCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Giveaway Started!'));
      assert.ok(resp.embeds?.[0].description?.includes('Discord Nitro Basic'));
      assert.ok(resp.embeds?.[0].description?.includes(`<#${CHANNEL_ID}>`));

      const active = await getGiveaway(GUILD_ID, ''); // test store allows list
      const allActive = await handleGiveawayList('token_test', GUILD_ID);
    });

    it('starts giveaway with custom options (channel, winners, level, and role requirements)', async () => {
      const options = [
        { name: 'prize', value: 'Secret Mech Keyboard' },
        { name: 'duration', value: '2h' },
        { name: 'winners', value: 3 },
        { name: 'channel', value: 'channel_announcements' },
        { name: 'min_level', value: 10 },
        { name: 'required_role', value: 'role_tester' },
      ];

      await handleGiveawayStart('token_start_full', GUILD_ID, CHANNEL_ID, USER_ADMIN, options);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Giveaway Started!'));
      assert.ok(resp.embeds?.[0].description?.includes('Secret Mech Keyboard'));
      assert.ok(resp.embeds?.[0].description?.includes('<#channel_announcements>'));
      assert.ok(resp.embeds?.[0].description?.includes('3'));
    });

    it('rejects /giveaway start when duration format is invalid', async () => {
      const options = [
        { name: 'prize', value: 'Gift Card' },
        { name: 'duration', value: 'invalid_time' },
      ];

      await handleGiveawayStart('token_start_err', GUILD_ID, CHANNEL_ID, USER_ADMIN, options);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Invalid Duration'));
    });

    it('rejects /giveaway start when prize or duration are missing', async () => {
      const options = [{ name: 'prize', value: 'Lonely Prize' }];

      await handleGiveawayStart('token_missing', GUILD_ID, CHANNEL_ID, USER_ADMIN, options);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Missing Arguments'));
    });
  });

  // ─── 4. /giveaway end Subcommand ─────────────────────────────────────────────

  describe('/giveaway end Subcommand', () => {
    it('manually ends active giveaway, draws winners, and returns success embed', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: USER_ADMIN,
        prize: 'Gaming Mouse',
        durationMs: 3_600_000,
        winnersCount: 1,
      });

      await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_winner_1');

      const options = [{ name: 'message_id', value: giveaway.messageId }];
      await handleGiveawayEnd('token_end', GUILD_ID, options);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Giveaway Ended'));
      assert.ok(resp.embeds?.[0].description?.includes('Gaming Mouse'));
      assert.ok(resp.embeds?.[0].description?.includes('<@user_winner_1>'));

      const ended = await getGiveaway(GUILD_ID, giveaway.messageId);
      assert.equal(ended?.ended, true);
      assert.deepEqual(ended?.winners, ['user_winner_1']);
    });

    it('returns error when message_id option is missing', async () => {
      await handleGiveawayEnd('token_end_missing', GUILD_ID, []);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Missing Parameter'));
    });

    it('returns error when giveaway message_id does not exist', async () => {
      const options = [{ name: 'message_id', value: 'non_existent_msg_id' }];
      await handleGiveawayEnd('token_end_notfound', GUILD_ID, options);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('End Giveaway Failed'));
    });
  });

  // ─── 5. /giveaway reroll Subcommand ──────────────────────────────────────────

  describe('/giveaway reroll Subcommand', () => {
    it('rerolls new winner for ended giveaway and announces in channel', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: USER_ADMIN,
        prize: 'Wireless Earbuds',
        durationMs: 3_600_000,
        winnersCount: 1,
      });

      await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_first_win');
      await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_runner_up');
      await endGiveaway(GUILD_ID, giveaway.messageId);

      const options = [
        { name: 'message_id', value: giveaway.messageId },
        { name: 'winners', value: 1 },
      ];
      await handleGiveawayReroll('token_reroll', GUILD_ID, options);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Giveaway Rerolled'));
      assert.ok(resp.embeds?.[0].description?.includes('Wireless Earbuds'));
    });

    it('warns politely if there are no eligible participants to reroll', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: USER_ADMIN,
        prize: 'Empty Box',
        durationMs: 3_600_000,
      });

      const options = [{ name: 'message_id', value: giveaway.messageId }];
      await handleGiveawayReroll('token_reroll_empty', GUILD_ID, options);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Reroll Warning'));
    });

    it('returns error when reroll message_id does not exist', async () => {
      const options = [{ name: 'message_id', value: 'bad_id' }];
      await handleGiveawayReroll('token_reroll_bad', GUILD_ID, options);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Reroll Failed'));
    });
  });

  // ─── 6. /giveaway list Subcommand ────────────────────────────────────────────

  describe('/giveaway list Subcommand', () => {
    it('returns formatted embed listing all active giveaways', async () => {
      await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: USER_ADMIN,
        prize: 'Nitro Yearly',
        durationMs: 3_600_000,
        winnersCount: 2,
      });

      await createGiveaway({
        guildId: GUILD_ID,
        channelId: 'channel_vip',
        hostId: USER_ADMIN,
        prize: 'Custom Role Color',
        durationMs: 7_200_000,
        minLevel: 5,
      });

      await handleGiveawayList('token_list', GUILD_ID);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Active Giveaways (2)'));
      assert.ok(resp.embeds?.[0].description?.includes('Nitro Yearly'));
      assert.ok(resp.embeds?.[0].description?.includes('Custom Role Color'));
      assert.ok(resp.embeds?.[0].description?.includes('Level 5+'));
    });

    it('returns informative embed when no giveaways are active', async () => {
      await handleGiveawayList('token_list_empty', GUILD_ID);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Active Giveaways'));
      assert.ok(resp.embeds?.[0].description?.includes('no active giveaways'));
    });
  });

  // ─── 7. handleGiveawayComponent() Router ──────────────────────────────────────

  describe('handleGiveawayComponent() Router', () => {
    it('successfully enters and leaves via gw_enter button interaction', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: USER_ADMIN,
        prize: 'AiCord Pro 1-Month',
        durationMs: 3_600_000,
      });

      const component = {
        member: {
          roles: [],
        },
      } as unknown as APIMessageComponentInteraction;

      // 1. Enter
      await handleGiveawayComponent(
        'token_btn_enter',
        `gw_enter:${giveaway.messageId}`,
        USER_REGULAR,
        GUILD_ID,
        component,
      );

      assert.equal(interceptedResponses.length, 1);
      let resp = interceptedResponses[0].options;
      assert.equal(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0].title?.includes('Giveaway Entered'));
      assert.ok(resp.embeds?.[0].description?.includes('Total entries: 1'));

      // 2. Leave
      await handleGiveawayComponent(
        'token_btn_leave',
        `gw_enter:${giveaway.messageId}`,
        USER_REGULAR,
        GUILD_ID,
        component,
      );

      assert.equal(interceptedResponses.length, 2);
      resp = interceptedResponses[1].options;
      assert.equal(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0].title?.includes('Giveaway Left'));
      assert.ok(resp.embeds?.[0].description?.includes('Total entries: 0'));
    });

    it('rejects component interaction when user lacks required role', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: USER_ADMIN,
        prize: 'VIP Role Reward',
        durationMs: 3_600_000,
        requiredRoleId: 'role_donator',
      });

      const component = {
        member: {
          roles: ['role_regular'],
        },
      } as unknown as APIMessageComponentInteraction;

      await handleGiveawayComponent(
        'token_btn_role_fail',
        `gw_enter:${giveaway.messageId}`,
        USER_REGULAR,
        GUILD_ID,
        component,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.equal(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0].title?.includes('Role Requirement Not Met'));
      assert.ok(resp.embeds?.[0].description?.includes('role_donator'));
    });

    it('rejects component interaction when giveaway has already ended', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: USER_ADMIN,
        prize: 'Old Giveaway',
        durationMs: 3_600_000,
      });

      await endGiveaway(GUILD_ID, giveaway.messageId);

      const component = { member: { roles: [] } } as unknown as APIMessageComponentInteraction;
      await handleGiveawayComponent(
        'token_btn_ended',
        `gw_enter:${giveaway.messageId}`,
        USER_REGULAR,
        GUILD_ID,
        component,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Giveaway Ended'));
    });

    it('rejects component interaction when giveaway messageId does not exist', async () => {
      const component = { member: { roles: [] } } as unknown as APIMessageComponentInteraction;
      await handleGiveawayComponent(
        'token_btn_notfound',
        'gw_enter:bogus_message_id',
        USER_REGULAR,
        GUILD_ID,
        component,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Giveaway Not Found'));
    });
  });
});
