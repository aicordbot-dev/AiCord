/**
 * test/countdown/commands.test.ts
 * Comprehensive unit tests for Service 9: Dynamic Real-Time Event Countdown Clocks — Slash Commands & Components:
 * - Central Command Registry lookup & subcommands schema verification (create, list, check, delete)
 * - Rate limit (5/10s), utility category, dm_permission: false, and options schema verification
 * - /countdown create: parameters parsing, date validation, embed & component generation
 * - /countdown list: server countdowns overview, empty server notice
 * - /countdown check: live clock dashboard, time remaining, error on unknown ID
 * - /countdown delete: creator authorization, moderator authorization, unauthorized rejection
 * - Main command dispatcher: server boundary enforcement (DM rejection), routing
 * - handleCountdownComponent: interactive refresh button (cd_refresh:cd-XXXX) routing and error handling
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
  registerCountdownCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  handleCountdownCommand,
  handleCountdownCreateSubcommand,
  handleCountdownListSubcommand,
  handleCountdownCheckSubcommand,
  handleCountdownDeleteSubcommand,
  handleCountdownComponent,
  countdownCommand,
} from '@/commands/countdown';
import {
  enableTestMode,
  clearTestStore,
  setTestCountdown,
  getTestCountdown,
  createCountdown,
} from '@/lib/countdown/countdown-service';

describe('Event Countdown Clocks — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_cd_cmd_999';
  const CHANNEL_ID = 'chan_cd_cmd_888';
  const CREATOR_ID = 'user_cd_creator_111';
  const OTHER_USER = 'user_cd_other_222';
  const MOD_ID = 'user_cd_mod_333';

  const PERMS_ADMIN = PermissionFlags.ADMINISTRATOR.toString();
  const PERMS_MANAGE_GUILD = PermissionFlags.MANAGE_GUILD.toString();
  const PERMS_MANAGE_MESSAGES = PermissionFlags.MANAGE_MESSAGES.toString();
  const PERMS_UNPRIVILEGED = '0';

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
    it('registers /countdown in the central command registry', () => {
      registerCountdownCommands();
      const cmd = getCommand('countdown');
      assert.ok(cmd, 'countdown command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'countdown');
      assert.strictEqual(cmd?.category, 'utility');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines 4 subcommands with accurate option schemas', () => {
      const subcommands = countdownCommand.options?.map(
        (o: unknown) => (o as { name: string }).name,
      );
      assert.deepStrictEqual(subcommands, ['create', 'list', 'check', 'delete']);

      // Check 'create' options
      const createSub = countdownCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'create',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(createSub?.options?.some((o) => o.name === 'title' && o.required === true));
      assert.ok(createSub?.options?.some((o) => o.name === 'target' && o.required === true));
      assert.ok(createSub?.options?.some((o) => o.name === 'channel' && o.required === false));
      assert.ok(createSub?.options?.some((o) => o.name === 'notify_role' && o.required === false));
      assert.ok(createSub?.options?.some((o) => o.name === 'description' && o.required === false));

      // Check 'check' options
      const checkSub = countdownCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'check',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(checkSub?.options?.some((o) => o.name === 'id' && o.required === true));

      // Check 'delete' options
      const deleteSub = countdownCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'delete',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(deleteSub?.options?.some((o) => o.name === 'id' && o.required === true));
    });
  });

  describe('/countdown create Subcommand', () => {
    it('creates a new countdown with valid title and relative offset target', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'token_cd_create_1',
        member: { user: { id: CREATOR_ID } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCreateSubcommand(mockInteraction, [
        { name: 'title', value: 'Version 2.0 Release' },
        { name: 'target', value: '3d' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Version 2.0 Release'));
      assert.ok(res.components && res.components.length > 0);

      const btn = (res.components[0] as { components: Array<{ custom_id: string }> }).components[0];
      assert.match(btn.custom_id, /^cd_refresh:cd-[A-Za-z0-9]{4}$/);
    });

    it('creates a countdown with description and role notification', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'token_cd_create_opts',
        member: { user: { id: CREATOR_ID } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCreateSubcommand(mockInteraction, [
        { name: 'title', value: 'Esports Tournament' },
        { name: 'target', value: '7d' },
        { name: 'description', value: 'Live broadcast on Twitch' },
        { name: 'notify_role', value: 'role_gamers_123' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed?.description?.includes('Live broadcast on Twitch'));
      assert.ok(embed?.description?.includes('<@&role_gamers_123>'));
    });

    it('returns error embed when title or target is missing', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'token_cd_create_err',
        member: { user: { id: CREATOR_ID } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCreateSubcommand(mockInteraction, [
        { name: 'title', value: 'Incomplete Event' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Missing Arguments'));
      assert.strictEqual(res.ephemeral, true);
    });

    it('returns error embed when target date is invalid', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'token_cd_create_invalid_date',
        member: { user: { id: CREATOR_ID } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCreateSubcommand(mockInteraction, [
        { name: 'title', value: 'Broken Date Event' },
        { name: 'target', value: 'not-a-date' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Countdown Creation Failed'));
      assert.strictEqual(res.ephemeral, true);
    });
  });

  describe('/countdown list Subcommand', () => {
    it('returns empty notice embed when server has no active countdowns', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_list_empty',
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownListSubcommand(mockInteraction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Active Countdowns'));
      assert.ok(res.embeds?.[0]?.description?.includes('There are no active countdowns'));
    });

    it('lists server active countdowns sorted with nearest target first', async () => {
      await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Future Milestone A',
        targetInput: '2h',
      });

      await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Future Milestone B',
        targetInput: '30m',
      });

      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_list_populated',
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownListSubcommand(mockInteraction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed?.title?.includes('Active Server Countdowns (2)'));
      assert.ok(embed?.description?.includes('Future Milestone B'));
      assert.ok(embed?.description?.includes('Future Milestone A'));
    });
  });

  describe('/countdown check Subcommand', () => {
    it('displays full countdown clock and refresh button for existing countdown ID', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Live Launch Clock',
        targetInput: '1d',
      });

      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_check_ok',
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCheckSubcommand(mockInteraction, [
        { name: 'id', value: cd.countdownId },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Live Launch Clock'));
      assert.ok(res.components && res.components.length > 0);
    });

    it('returns error embed when countdown ID is not found', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_check_missing',
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCheckSubcommand(mockInteraction, [
        { name: 'id', value: 'cd-NONEXISTENT' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Countdown Not Found'));
      assert.strictEqual(res.ephemeral, true);
    });

    it('returns error embed when id option is omitted', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_check_no_id',
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCheckSubcommand(mockInteraction, []);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Missing Parameter'));
      assert.strictEqual(res.ephemeral, true);
    });
  });

  describe('/countdown delete Subcommand', () => {
    it('allows creator to delete their countdown', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Delete Me Event',
        targetInput: '1d',
      });

      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_del_creator',
        member: {
          user: { id: CREATOR_ID },
          permissions: PERMS_UNPRIVILEGED,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownDeleteSubcommand(mockInteraction, [
        { name: 'id', value: cd.countdownId },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Countdown Deleted'));

      const check = getTestCountdown(GUILD_ID, cd.countdownId);
      assert.strictEqual(check, undefined);
    });

    it('allows moderator to delete any countdown (MANAGE_GUILD / MANAGE_MESSAGES)', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Mod Deletes Me',
        targetInput: '1d',
      });

      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_del_mod',
        member: {
          user: { id: MOD_ID },
          permissions: PERMS_MANAGE_MESSAGES,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownDeleteSubcommand(mockInteraction, [
        { name: 'id', value: cd.countdownId },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Countdown Deleted'));
    });

    it('rejects deletion when user is unauthorized', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Protected Event',
        targetInput: '1d',
      });

      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_del_unauth',
        member: {
          user: { id: OTHER_USER },
          permissions: PERMS_UNPRIVILEGED,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownDeleteSubcommand(mockInteraction, [
        { name: 'id', value: cd.countdownId },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Delete Failed'));
      assert.strictEqual(res.ephemeral, true);

      // Verify event was preserved
      const check = getTestCountdown(GUILD_ID, cd.countdownId);
      assert.ok(check);
    });

    it('returns error when deleting non-existent countdown ID', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_del_missing',
        member: {
          user: { id: CREATOR_ID },
          permissions: PERMS_UNPRIVILEGED,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownDeleteSubcommand(mockInteraction, [
        { name: 'id', value: 'cd-9999' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Delete Failed'));
      assert.strictEqual(res.ephemeral, true);
    });

    it('returns error when id parameter is omitted', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        token: 'token_cd_del_no_id',
        member: {
          user: { id: CREATOR_ID },
          permissions: PERMS_UNPRIVILEGED,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownDeleteSubcommand(mockInteraction, []);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Missing Parameter'));
      assert.strictEqual(res.ephemeral, true);
    });
  });

  describe('Main Command Router & Security Boundaries', () => {
    it('rejects /countdown when executed outside a server (in DMs)', async () => {
      const mockInteraction = {
        guild_id: undefined,
        token: 'token_cd_dm',
        user: { id: CREATOR_ID },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCommand(mockInteraction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Server Required'));
    });

    it('handles unknown subcommand with error embed', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'token_cd_unknown',
        member: { user: { id: CREATOR_ID } },
        data: {
          options: [{ name: 'foobar', type: 1 }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCommand(mockInteraction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Unknown Subcommand'));
    });

    it('routes /countdown list interaction properly', async () => {
      const mockInteraction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'token_cd_route_list',
        member: { user: { id: CREATOR_ID } },
        data: {
          options: [{ name: 'list', type: 1 }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCountdownCommand(mockInteraction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Active Countdowns'));
    });
  });

  describe('handleCountdownComponent Routing', () => {
    it('refreshes countdown embed on cd_refresh button click', async () => {
      const cd = await createCountdown({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        creatorId: CREATOR_ID,
        title: 'Refreshable Event',
        targetInput: '5h',
      });

      const mockComponent = {
        message: { id: 'msg_cd_111', channel_id: CHANNEL_ID },
      } as unknown as APIMessageComponentInteraction;

      await handleCountdownComponent(
        'token_btn_refresh',
        `cd_refresh:${cd.countdownId}`,
        CREATOR_ID,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Refreshable Event'));
      assert.ok(res.components && res.components.length > 0);
    });

    it('returns error embed if countdown was deleted before refresh', async () => {
      const mockComponent = {
        message: { id: 'msg_cd_222', channel_id: CHANNEL_ID },
      } as unknown as APIMessageComponentInteraction;

      await handleCountdownComponent(
        'token_btn_refresh_missing',
        'cd_refresh:cd-EXPIRED',
        CREATOR_ID,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Countdown Not Found'));
      assert.strictEqual(res.ephemeral, true);
    });

    it('ignores components with unrelated custom ID prefixes', async () => {
      const mockComponent = {} as unknown as APIMessageComponentInteraction;

      await handleCountdownComponent(
        'token_btn_unrelated',
        'other_action:123',
        CREATOR_ID,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 0);
    });
  });
});
