/**
 * test/moderation/role-channel-edit.test.ts
 * Unit tests for Role and Channel Enhancements:
 * - /role edit: hex color parsing, hoist/mentionable flags, role hierarchy enforcement (canActOn)
 * - /channel edit: name, topic, slowmode validation, nsfw, category parenting
 * - Error isolation and polite responses
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { ApplicationCommandOptionType, Routes } from 'discord-api-types/v10';
import { handleRoleCommand, roleCommand } from '@/commands/role';
import { handleChannelCommand, channelCommand } from '@/commands/channel';
import { setResponseHandler, type InteractionResponseOptions } from '@/lib/discord/interaction-response';
import { setDiscordRest, resetDiscordRest } from '@/lib/discord/rest';
import { PermissionFlags } from '@/lib/discord/permissions';
import type { REST } from '@discordjs/rest';

describe('Role & Channel Edit Suite', () => {
  const GUILD_ID = 'guild_edit_123';
  const MOD_ID = 'mod_editor_456';
  const BOT_ID = '123456789012345678';
  const TOKEN = 'mock_interaction_token_edit';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];
  let restCalls: Array<{ method: string; route: string; body?: unknown }> = [];

  // Default mock roles setup:
  // Role 1: target role (position 10)
  // Role 2: mod role (position 20)
  // Role 3: bot role (position 30)
  // Role 4: high admin role (position 40)
  const defaultRoles = [
    { id: 'role_target', name: 'Member Role', position: 10 },
    { id: 'role_mod', name: 'Moderator', position: 20 },
    { id: 'role_bot', name: 'AiCord Bot', position: 30, tags: { bot_id: BOT_ID } },
    { id: 'role_admin', name: 'Admin Role', position: 40 },
  ];

  beforeEach(() => {
    interceptedResponses = [];
    restCalls = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });

    const mockRest = {
      get: async (route: string) => {
        restCalls.push({ method: 'GET', route });
        if (route === Routes.guildRoles(GUILD_ID)) {
          return defaultRoles;
        }
        if (route === Routes.guildMember(GUILD_ID, BOT_ID)) {
          return { roles: ['role_bot'] };
        }
        if (route === Routes.guild(GUILD_ID)) {
          return { id: GUILD_ID, owner_id: 'owner_999' };
        }
        return {};
      },
      patch: async (route: string, options?: { body?: unknown }) => {
        restCalls.push({ method: 'PATCH', route, body: options?.body });
        return { id: 'edited_id', ...((options?.body as any) || {}) };
      },
    } as unknown as REST;

    setDiscordRest(mockRest);
  });

  afterEach(() => {
    resetDiscordRest();
    setResponseHandler(null);
  });

  // ─── 1. /role edit ───────────────────────────────────────────────────────

  describe('/role edit Subcommand', () => {
    it('verifies /role edit is declared in roleCommand options', () => {
      const editSub = (roleCommand.options as any[]).find((o) => o.name === 'edit');
      assert.ok(editSub);
      assert.equal(editSub.type, ApplicationCommandOptionType.Subcommand);
      const subOptionNames = editSub.options.map((o: any) => o.name);
      assert.ok(subOptionNames.includes('role'));
      assert.ok(subOptionNames.includes('name'));
      assert.ok(subOptionNames.includes('color'));
      assert.ok(subOptionNames.includes('hoist'));
      assert.ok(subOptionNames.includes('mentionable'));
    });

    it('updates role name, hex color (#FF0000), hoist, and mentionable when hierarchy check passes', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID },
          roles: ['role_mod'], // Position 20, higher than target (10)
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'role',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'role', value: 'role_target' },
                { name: 'name', value: 'Updated Member' },
                { name: 'color', value: '#FF0000' },
                { name: 'hoist', value: true },
                { name: 'mentionable', value: true },
              ],
            },
          ],
        },
      } as any;

      await handleRoleCommand(interaction);

      const patchCall = restCalls.find((c) => c.method === 'PATCH');
      assert.ok(patchCall);
      assert.equal(patchCall.route, Routes.guildRole(GUILD_ID, 'role_target'));
      assert.deepEqual(patchCall.body, {
        name: 'Updated Member',
        color: 0xff0000, // 16711680
        hoist: true,
        mentionable: true,
      });

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Role Updated'));
    });

    it('accepts hex color without leading hash (e.g. "00FF00")', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID },
          roles: ['role_mod'],
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'role',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'role', value: 'role_target' },
                { name: 'color', value: '00FF00' },
              ],
            },
          ],
        },
      } as any;

      await handleRoleCommand(interaction);

      const patchCall = restCalls.find((c) => c.method === 'PATCH');
      assert.ok(patchCall);
      assert.equal((patchCall.body as any).color, 0x00ff00);
    });

    it('rejects invalid hex color format with polite error embed', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID },
          roles: ['role_mod'],
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'role',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'role', value: 'role_target' },
                { name: 'color', value: 'invalid_color_code' },
              ],
            },
          ],
        },
      } as any;

      await handleRoleCommand(interaction);

      assert.equal(restCalls.filter((c) => c.method === 'PATCH').length, 0);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Invalid Color'));
    });

    it('rejects /role edit when no editable fields are provided', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID },
          roles: ['role_mod'],
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'role',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: 'role', value: 'role_target' }],
            },
          ],
        },
      } as any;

      await handleRoleCommand(interaction);

      assert.equal(restCalls.filter((c) => c.method === 'PATCH').length, 0);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Missing Options'));
    });

    it('enforces role hierarchy: rejects edit when moderator highest role is below or equal to target role', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID },
          roles: ['role_mod'], // Mod has position 20, but target role_admin has position 40!
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'role',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'role', value: 'role_admin' }, // Higher position than invoker!
                { name: 'name', value: 'Hacked Admin' },
              ],
            },
          ],
        },
      } as any;

      await handleRoleCommand(interaction);

      assert.equal(restCalls.filter((c) => c.method === 'PATCH').length, 0);
      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Action Denied'));
      assert.ok(embed?.description?.includes('strictly higher'));
    });

    it('enforces bot hierarchy: rejects edit when bot highest role is below or equal to target role', async () => {
      // Mock bot with role position 5 (lower than target role position 10)
      const mockRest = {
        get: async (route: string) => {
          if (route === Routes.guildRoles(GUILD_ID)) {
            return [
              { id: 'role_target', name: 'Member Role', position: 10 },
              { id: 'role_owner_like', name: 'Moderator', position: 50 },
            ];
          }
          if (route === Routes.guildMember(GUILD_ID, BOT_ID)) {
            return { roles: [] }; // Bot has no roles -> position 0
          }
          return {};
        },
        patch: async () => ({}),
      } as unknown as REST;
      setDiscordRest(mockRest);

      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID },
          roles: ['role_owner_like'], // Mod is high
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'role',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'role', value: 'role_target' },
                { name: 'name', value: 'Target' },
              ],
            },
          ],
        },
      } as any;

      await handleRoleCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Action Denied'));
      assert.ok(embed?.description?.includes("AiCord's highest role"));
    });
  });

  // ─── 2. /channel edit ────────────────────────────────────────────────────

  describe('/channel edit Subcommand', () => {
    it('verifies /channel edit is declared in channelCommand options', () => {
      const editSub = (channelCommand.options as any[]).find((o) => o.name === 'edit');
      assert.ok(editSub);
      assert.equal(editSub.type, ApplicationCommandOptionType.Subcommand);
      const subOptionNames = editSub.options.map((o: any) => o.name);
      assert.ok(subOptionNames.includes('channel'));
      assert.ok(subOptionNames.includes('name'));
      assert.ok(subOptionNames.includes('topic'));
      assert.ok(subOptionNames.includes('slowmode'));
      assert.ok(subOptionNames.includes('nsfw'));
      assert.ok(subOptionNames.includes('category'));
    });

    it('updates channel name, topic, slowmode, nsfw, and category', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        channel_id: 'channel_current_555',
        member: {
          user: { id: MOD_ID },
          permissions: PermissionFlags.MANAGE_CHANNELS.toString(),
          roles: [],
        },
        data: {
          name: 'channel',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'channel', value: 'channel_target_123' },
                { name: 'name', value: 'general-chat' },
                { name: 'topic', value: 'Welcome to the server!' },
                { name: 'slowmode', value: 10 },
                { name: 'nsfw', value: true },
                { name: 'category', value: 'cat_parent_999' },
              ],
            },
          ],
        },
      } as any;

      await handleChannelCommand(interaction);

      const patchCall = restCalls.find((c) => c.method === 'PATCH');
      assert.ok(patchCall);
      assert.equal(patchCall.route, Routes.channel('channel_target_123'));
      assert.deepEqual(patchCall.body, {
        name: 'general-chat',
        topic: 'Welcome to the server!',
        rate_limit_per_user: 10,
        nsfw: true,
        parent_id: 'cat_parent_999',
      });

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Channel Updated'));
    });

    it('rejects invalid slowmode (< 0 or > 21600)', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        data: {
          name: 'channel',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'channel', value: 'channel_123' },
                { name: 'slowmode', value: 30000 }, // > 21600
              ],
            },
          ],
        },
      } as any;

      await handleChannelCommand(interaction);

      assert.equal(restCalls.filter((c) => c.method === 'PATCH').length, 0);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Invalid Slowmode'));
    });

    it('rejects /channel edit when no properties are provided', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        data: {
          name: 'channel',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: 'channel', value: 'channel_123' }],
            },
          ],
        },
      } as any;

      await handleChannelCommand(interaction);

      assert.equal(restCalls.filter((c) => c.method === 'PATCH').length, 0);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Missing Options'));
    });
  });
});
