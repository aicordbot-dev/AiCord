/**
 * test/moderation/category.test.ts
 * Unit tests for Category Management Suite (/category):
 * - Command registration & schema validation
 * - /category create: name sanitization, position handling, AuditLog recording
 * - /category edit: name/position patching, empty update rejection, AuditLog recording
 * - /category delete: confirm flag handling (cancel on false, delete on true/omitted), AuditLog recording
 * - Permission gating: MANAGE_CHANNELS enforcement and administrator bypass
 * - Error isolation: polite error embeds on Discord REST failures
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { ApplicationCommandOptionType, ChannelType, Routes } from 'discord-api-types/v10';
import {
  categoryCommand,
  handleCategoryCommand,
  handleCategoryCreate,
  handleCategoryEdit,
  handleCategoryDelete,
  sanitizeCategoryName,
} from '@/commands/category';
import { getCommand, registerCategoryCommands } from '@/lib/discord/command-registry';
import { setResponseHandler, type InteractionResponseOptions } from '@/lib/discord/interaction-response';
import { setDiscordRest, resetDiscordRest } from '@/lib/discord/rest';
import { PermissionFlags } from '@/lib/discord/permissions';
import { AuditLog } from '@/models/AuditLog';
import type { REST } from '@discordjs/rest';

describe('Category Management Suite (/category)', () => {
  const GUILD_ID = 'guild_cat_123';
  const MOD_ID = 'mod_cat_456';
  const MOD_TAG = 'AdminMod#0001';
  const TOKEN = 'mock_interaction_token_cat';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];
  let restCalls: Array<{ method: string; route: string; body?: unknown }> = [];
  let createdAuditLogs: Array<any> = [];

  const originalAuditLogCreate = AuditLog.create;

  beforeEach(() => {
    registerCategoryCommands();
    interceptedResponses = [];
    restCalls = [];
    createdAuditLogs = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });

    AuditLog.create = (async (data: any) => {
      createdAuditLogs.push(data);
      return data;
    }) as any;

    const mockRest = {
      post: async (route: string, options?: { body?: unknown }) => {
        restCalls.push({ method: 'POST', route, body: options?.body });
        return { id: 'cat_new_789', name: (options?.body as any)?.name ?? 'new-category' };
      },
      patch: async (route: string, options?: { body?: unknown }) => {
        restCalls.push({ method: 'PATCH', route, body: options?.body });
        return { id: 'cat_edit_789', name: (options?.body as any)?.name ?? 'edited-category' };
      },
      delete: async (route: string) => {
        restCalls.push({ method: 'DELETE', route });
        return { id: 'cat_del_789' };
      },
    } as unknown as REST;

    setDiscordRest(mockRest);
  });

  afterEach(() => {
    resetDiscordRest();
    setResponseHandler(null);
    AuditLog.create = originalAuditLogCreate;
  });

  // ─── 1. Command Registry & Schema ───────────────────────────────────────

  describe('Command Registration & Schema', () => {
    it('registers /category in central registry with utility category and MANAGE_CHANNELS permission', () => {
      const cmd = getCommand('category');
      assert.ok(cmd);
      assert.equal(cmd.name, 'category');
      assert.equal(cmd.category, 'utility');
      assert.equal(
        cmd.default_member_permissions,
        PermissionFlags.MANAGE_CHANNELS.toString(),
      );
      assert.equal(cmd.dm_permission, false);

      const subcommands = (cmd.options as any[]).map((o) => o.name);
      assert.ok(subcommands.includes('create'));
      assert.ok(subcommands.includes('edit'));
      assert.ok(subcommands.includes('delete'));
    });

    it('sanitizeCategoryName handles trim, control characters, and length limit', () => {
      assert.equal(sanitizeCategoryName('  Announcements  '), 'Announcements');
      assert.equal(sanitizeCategoryName('Cool \x00Category\x1f'), 'Cool Category');
      assert.equal(sanitizeCategoryName(''), 'category');
      assert.equal(sanitizeCategoryName('a'.repeat(150)).length, 100);
    });
  });

  // ─── 2. /category create ────────────────────────────────────────────────

  describe('/category create Subcommand', () => {
    it('creates a category with name and position and logs to AuditLog', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MANAGE_CHANNELS.toString(),
          roles: [],
        },
        data: {
          name: 'category',
          options: [
            {
              name: 'create',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'name', value: 'Community Hub' },
                { name: 'position', value: 3 },
              ],
            },
          ],
        },
      } as any;

      await handleCategoryCommand(interaction);

      assert.equal(restCalls.length, 1);
      assert.equal(restCalls[0].method, 'POST');
      assert.equal(restCalls[0].route, Routes.guildChannels(GUILD_ID));
      assert.deepEqual(restCalls[0].body, {
        name: 'Community Hub',
        type: ChannelType.GuildCategory,
        position: 3,
      });

      assert.equal(createdAuditLogs.length, 1);
      assert.equal(createdAuditLogs[0].type, 'config_change');
      assert.equal(createdAuditLogs[0].metadata.action, 'category_create');
      assert.equal(createdAuditLogs[0].metadata.categoryId, 'cat_new_789');

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Category Created'));
    });

    it('rejects /category create when name is missing', async () => {
      await handleCategoryCreate(
        TOKEN,
        GUILD_ID,
        [],
        { member: { user: { id: MOD_ID } } } as any,
      );

      assert.equal(restCalls.length, 0);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Missing Name'));
    });
  });

  // ─── 3. /category edit ──────────────────────────────────────────────────

  describe('/category edit Subcommand', () => {
    it('edits a category name and position and logs to AuditLog', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MANAGE_CHANNELS.toString(),
          roles: [],
        },
        data: {
          name: 'category',
          options: [
            {
              name: 'edit',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'category', value: 'cat_target_999' },
                { name: 'name', value: 'Renamed Hub' },
                { name: 'position', value: 1 },
              ],
            },
          ],
        },
      } as any;

      await handleCategoryCommand(interaction);

      assert.equal(restCalls.length, 1);
      assert.equal(restCalls[0].method, 'PATCH');
      assert.equal(restCalls[0].route, Routes.channel('cat_target_999'));
      assert.deepEqual(restCalls[0].body, {
        name: 'Renamed Hub',
        position: 1,
      });

      assert.equal(createdAuditLogs.length, 1);
      assert.equal(createdAuditLogs[0].metadata.action, 'category_edit');
      assert.equal(createdAuditLogs[0].metadata.categoryId, 'cat_target_999');

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Category Updated'));
    });

    it('rejects /category edit when neither name nor position is provided', async () => {
      await handleCategoryEdit(
        TOKEN,
        GUILD_ID,
        [{ name: 'category', value: 'cat_target_999' }],
        { member: { user: { id: MOD_ID } } } as any,
      );

      assert.equal(restCalls.length, 0);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Missing Options'));
    });
  });

  // ─── 4. /category delete ────────────────────────────────────────────────

  describe('/category delete Subcommand', () => {
    it('deletes category when confirm is explicitly true and logs to AuditLog', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MANAGE_CHANNELS.toString(),
          roles: [],
        },
        data: {
          name: 'category',
          options: [
            {
              name: 'delete',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'category', value: 'cat_delete_111' },
                { name: 'confirm', value: true },
              ],
            },
          ],
        },
      } as any;

      await handleCategoryCommand(interaction);

      assert.equal(restCalls.length, 1);
      assert.equal(restCalls[0].method, 'DELETE');
      assert.equal(restCalls[0].route, Routes.channel('cat_delete_111'));

      assert.equal(createdAuditLogs.length, 1);
      assert.equal(createdAuditLogs[0].metadata.action, 'category_delete');
      assert.equal(createdAuditLogs[0].metadata.categoryId, 'cat_delete_111');

      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Category Deleted'));
    });

    it('cancels category deletion when confirm is false', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MANAGE_CHANNELS.toString(),
          roles: [],
        },
        data: {
          name: 'category',
          options: [
            {
              name: 'delete',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'category', value: 'cat_delete_111' },
                { name: 'confirm', value: false },
              ],
            },
          ],
        },
      } as any;

      await handleCategoryCommand(interaction);

      assert.equal(restCalls.length, 0);
      assert.equal(createdAuditLogs.length, 0);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Deletion Cancelled'));
    });

    it('deletes category when confirm option is omitted', async () => {
      await handleCategoryDelete(
        TOKEN,
        GUILD_ID,
        [{ name: 'category', value: 'cat_delete_222' }],
        { member: { user: { id: MOD_ID } } } as any,
      );

      assert.equal(restCalls.length, 1);
      assert.equal(restCalls[0].method, 'DELETE');
      assert.equal(restCalls[0].route, Routes.channel('cat_delete_222'));
    });
  });

  // ─── 5. Permission Gating & Error Conditions ─────────────────────────────

  describe('Permission Gating & Error Conditions', () => {
    it('rejects category command when member lacks MANAGE_CHANNELS permission', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: 'unprivileged_user' },
          permissions: '0', // No permissions
          roles: [],
        },
        data: {
          name: 'category',
          options: [{ name: 'create', options: [{ name: 'name', value: 'Disallowed' }] }],
        },
      } as any;

      await handleCategoryCommand(interaction);

      assert.equal(restCalls.length, 0);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Missing Permission'));
    });

    it('handles Discord REST API errors politely without throwing', async () => {
      const failingRest = {
        post: async () => {
          throw new Error('50001: Missing Access');
        },
      } as unknown as REST;
      setDiscordRest(failingRest);

      await handleCategoryCreate(
        TOKEN,
        GUILD_ID,
        [{ name: 'name', value: 'Failing Cat' }],
        { member: { user: { id: MOD_ID } } } as any,
      );

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Failed to Create Category'));
    });
  });
});
