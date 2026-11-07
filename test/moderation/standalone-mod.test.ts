/**
 * test/moderation/standalone-mod.test.ts
 * Unit tests for Standalone Moderation Commands (/ban, /kick, /timeout, /warn, /purge):
 * - Central registry lookup and registration
 * - Default member permission bitfields
 * - Standalone argument parsing and delegation to core mod handlers
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { ApplicationCommandOptionType, Routes } from 'discord-api-types/v10';
import {
  banCommand,
  kickCommand,
  timeoutCommand,
  warnCommand,
  purgeCommand,
  handleStandaloneBan,
  handleStandaloneKick,
  handleStandaloneTimeout,
  handleStandaloneWarn,
  handleStandalonePurge,
} from '@/commands/standalone-mod';
import {
  getCommand,
  registerStandaloneModCommands,
} from '@/lib/discord/command-registry';
import { setResponseHandler, type InteractionResponseOptions } from '@/lib/discord/interaction-response';
import { setDiscordRest, resetDiscordRest } from '@/lib/discord/rest';
import { PermissionFlags } from '@/lib/discord/permissions';
import { ModCase } from '@/models/ModCase';
import { Warning } from '@/models/Warning';
import { GuildConfig } from '@/models/GuildConfig';
import { AuditLog } from '@/models/AuditLog';
import type { REST } from '@discordjs/rest';

describe('Standalone Moderation Commands Suite', () => {
  const GUILD_ID = 'guild_standalone_111';
  const MOD_ID = 'mod_standalone_222';
  const MOD_TAG = 'Staff#9999';
  const TARGET_USER_ID = 'target_user_333';
  const BOT_ID = '123456789012345678';
  const TOKEN = 'mock_interaction_token_standalone';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];
  let restCalls: Array<{ method: string; route: string; body?: unknown }> = [];
  let createdCases: Array<any> = [];

  const originalModCaseCreate = ModCase.create;
  const originalModCaseFindOne = ModCase.findOne;
  const originalWarningCreate = Warning.create;
  const originalWarningCountDocuments = Warning.countDocuments;
  const originalGuildConfigFindOne = GuildConfig.findOne;
  const originalAuditLogCreate = AuditLog.create;

  const defaultRoles = [
    { id: 'role_target', name: 'Member', position: 5 },
    { id: 'role_mod', name: 'Moderator', position: 25 },
    { id: 'role_bot', name: 'AiCord', position: 35, tags: { bot_id: BOT_ID } },
  ];

  beforeEach(() => {
    registerStandaloneModCommands();
    interceptedResponses = [];
    restCalls = [];
    createdCases = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });

    ModCase.create = (async (data: any) => {
      const doc = { ...data, _id: 'case_standalone_' + (createdCases.length + 1) };
      createdCases.push(doc);
      return doc;
    }) as any;

    ModCase.findOne = (() => ({
      sort: () => ({
        select: async () => ({ caseNumber: createdCases.length }),
      }),
    })) as any;

    Warning.create = (async (data: any) => data) as any;
    Warning.countDocuments = (async () => 1) as any;

    GuildConfig.findOne = (() => ({
      select: async () => null,
    })) as any;

    AuditLog.create = (async () => ({})) as any;

    const mockRest = {
      get: async (route: string) => {
        restCalls.push({ method: 'GET', route });
        if (route === Routes.guild(GUILD_ID)) return { id: GUILD_ID, owner_id: 'owner_001' };
        if (route === Routes.guildRoles(GUILD_ID)) return defaultRoles;
        if (route === Routes.guildMember(GUILD_ID, BOT_ID)) return { roles: ['role_bot'] };
        if (route === Routes.guildMember(GUILD_ID, TARGET_USER_ID)) {
          return {
            roles: ['role_target'],
            user: { id: TARGET_USER_ID, username: 'TargetUser', discriminator: '0001' },
          };
        }
        if (route === Routes.user(TARGET_USER_ID)) {
          return { id: TARGET_USER_ID, username: 'TargetUser', discriminator: '0001' };
        }
        if (route === Routes.channelMessages('channel_purge_777')) {
          return [
            { id: 'msg_1', author: { id: TARGET_USER_ID }, timestamp: new Date().toISOString() },
            { id: 'msg_2', author: { id: TARGET_USER_ID }, timestamp: new Date().toISOString() },
            { id: 'msg_3', author: { id: 'other_user' }, timestamp: new Date().toISOString() },
          ];
        }
        return {};
      },
      post: async (route: string, options?: { body?: unknown }) => {
        restCalls.push({ method: 'POST', route, body: options?.body });
        return {};
      },
      put: async (route: string, options?: { body?: unknown }) => {
        restCalls.push({ method: 'PUT', route, body: options?.body });
        return {};
      },
      patch: async (route: string, options?: { body?: unknown }) => {
        restCalls.push({ method: 'PATCH', route, body: options?.body });
        return {};
      },
      delete: async (route: string) => {
        restCalls.push({ method: 'DELETE', route });
        return {};
      },
    } as unknown as REST;

    setDiscordRest(mockRest);
  });

  afterEach(() => {
    resetDiscordRest();
    setResponseHandler(null);
    ModCase.create = originalModCaseCreate;
    ModCase.findOne = originalModCaseFindOne;
    Warning.create = originalWarningCreate;
    Warning.countDocuments = originalWarningCountDocuments;
    GuildConfig.findOne = originalGuildConfigFindOne;
    AuditLog.create = originalAuditLogCreate;
  });

  // ─── 1. Central Registry & Permission Bitfields ──────────────────────────

  describe('Registry & Permission Bitfields', () => {
    it('registers all 5 standalone moderation commands in Central Command Registry', () => {
      const ban = getCommand('ban');
      assert.ok(ban);
      assert.equal(ban.default_member_permissions, PermissionFlags.BAN_MEMBERS.toString());
      assert.equal(ban.category, 'moderation');

      const kick = getCommand('kick');
      assert.ok(kick);
      assert.equal(kick.default_member_permissions, PermissionFlags.KICK_MEMBERS.toString());
      assert.equal(kick.category, 'moderation');

      const timeout = getCommand('timeout');
      assert.ok(timeout);
      assert.equal(timeout.default_member_permissions, PermissionFlags.MODERATE_MEMBERS.toString());
      assert.equal(timeout.category, 'moderation');

      const warn = getCommand('warn');
      assert.ok(warn);
      assert.equal(warn.default_member_permissions, PermissionFlags.MODERATE_MEMBERS.toString());
      assert.equal(warn.category, 'moderation');

      const purge = getCommand('purge');
      assert.ok(purge);
      assert.equal(purge.default_member_permissions, PermissionFlags.MANAGE_MESSAGES.toString());
      assert.equal(purge.category, 'moderation');
    });
  });

  // ─── 2. Standalone Command Delegation & Argument Mapping ─────────────────

  describe('Standalone Command Execution & Delegation', () => {
    it('executes standalone /ban: extracts options and delegates to handleBan', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.BAN_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'ban',
          options: [
            { name: 'user', value: TARGET_USER_ID },
            { name: 'reason', value: 'Breaking server rules' },
            { name: 'delete_days', value: 2 },
          ],
        },
      } as any;

      await handleStandaloneBan(interaction);

      const putCall = restCalls.find((c) => c.method === 'PUT');
      assert.ok(putCall);
      assert.equal(putCall.route, Routes.guildBan(GUILD_ID, TARGET_USER_ID));
      assert.equal((putCall.body as any).delete_message_seconds, 2 * 86400);

      assert.equal(createdCases.length, 1);
      assert.equal(createdCases[0].action, 'ban');
      assert.equal(createdCases[0].reason, 'Breaking server rules');

      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('User Banned'));
    });

    it('executes standalone /kick: extracts options and delegates to handleKick', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.KICK_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'kick',
          options: [
            { name: 'user', value: TARGET_USER_ID },
            { name: 'reason', value: 'Inactivity cleanup' },
          ],
        },
      } as any;

      await handleStandaloneKick(interaction);

      const deleteCall = restCalls.find((c) => c.method === 'DELETE');
      assert.ok(deleteCall);
      assert.equal(deleteCall.route, Routes.guildMember(GUILD_ID, TARGET_USER_ID));

      assert.equal(createdCases.length, 1);
      assert.equal(createdCases[0].action, 'kick');
      assert.equal(createdCases[0].reason, 'Inactivity cleanup');

      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('User Kicked'));
    });

    it('executes standalone /timeout: extracts options and delegates to handleTimeout', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MODERATE_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'timeout',
          options: [
            { name: 'user', value: TARGET_USER_ID },
            { name: 'duration', value: '1h' },
            { name: 'reason', value: 'Excessive spamming' },
          ],
        },
      } as any;

      await handleStandaloneTimeout(interaction);

      const patchCall = restCalls.find((c) => c.method === 'PATCH');
      assert.ok(patchCall);
      assert.equal(patchCall.route, Routes.guildMember(GUILD_ID, TARGET_USER_ID));

      assert.equal(createdCases.length, 1);
      assert.equal(createdCases[0].action, 'timeout');
      assert.equal(createdCases[0].duration, 3600000);

      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('User Timed Out'));
    });

    it('executes standalone /warn: extracts options and delegates to handleWarn', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MODERATE_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'warn',
          options: [
            { name: 'user', value: TARGET_USER_ID },
            { name: 'reason', value: 'First offense warning' },
          ],
        },
      } as any;

      await handleStandaloneWarn(interaction);

      assert.equal(createdCases.length, 1);
      assert.equal(createdCases[0].action, 'warn');
      assert.equal(createdCases[0].reason, 'First offense warning');

      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('User Warned'));
    });

    it('executes standalone /purge: extracts options and delegates to handlePurge', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        channel_id: 'channel_purge_777',
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MANAGE_MESSAGES.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'purge',
          options: [
            { name: 'amount', value: 5 },
            { name: 'user', value: TARGET_USER_ID },
          ],
        },
      } as any;

      await handleStandalonePurge(interaction);

      const postCall = restCalls.find((c) => c.method === 'POST');
      assert.ok(postCall);
      assert.equal(postCall.route, Routes.channelBulkDelete('channel_purge_777'));
      assert.deepEqual((postCall.body as any).messages, ['msg_1', 'msg_2']);

      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Messages Purged'));
    });
  });
});
