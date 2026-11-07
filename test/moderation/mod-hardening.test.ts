/**
 * test/moderation/mod-hardening.test.ts
 * Unit tests for Moderation Suite Hardening:
 * - /mod unban: REST deletion, ModCase creation ('unban'), TempAction deactivation
 * - /mod untimeout: REST patch (communication_disabled_until: null), ModCase creation ('untimeout'), TempAction deactivation
 * - /mod softban: hierarchy validation, ban message purge + immediate unban, ModCase creation ('softban')
 * - /mod clearwarnings: deactivates active user warnings, reports cleared count
 * - Hierarchy enforcement (PermissionEngine.canActOn):
 *   - Self-target rejection (SELF_TARGET)
 *   - Bot-target rejection (BOT_SELF_TARGET)
 *   - Server owner immunity (TARGET_IS_OWNER)
 *   - Moderator hierarchy check (INVOKER_ROLE_HIERARCHY)
 *   - Bot hierarchy check (BOT_ROLE_HIERARCHY)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { ApplicationCommandOptionType, Routes } from 'discord-api-types/v10';
import {
  handleModCommand,
  modCommand,
  handleUnban,
  handleUntimeout,
  handleSoftban,
  handleClearWarnings,
  handleBan,
  handleKick,
  handleTimeout,
} from '@/commands/mod';
import { setResponseHandler, type InteractionResponseOptions } from '@/lib/discord/interaction-response';
import { setDiscordRest, resetDiscordRest } from '@/lib/discord/rest';
import { PermissionFlags } from '@/lib/discord/permissions';
import { ModCase } from '@/models/ModCase';
import { Warning } from '@/models/Warning';
import { TempAction } from '@/models/TempAction';
import { GuildConfig } from '@/models/GuildConfig';
import { AuditLog } from '@/models/AuditLog';
import type { REST } from '@discordjs/rest';

describe('Moderation Suite Hardening', () => {
  const GUILD_ID = 'guild_mod_999';
  const OWNER_ID = 'user_owner_001';
  const MOD_ID = 'user_mod_002';
  const MOD_TAG = 'Moderator#1234';
  const BOT_ID = '123456789012345678';
  const TARGET_USER_ID = 'user_target_003';
  const TARGET_USER_TAG = 'Troublemaker#5678';
  const TOKEN = 'mock_interaction_token_mod';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];
  let restCalls: Array<{ method: string; route: string; body?: unknown }> = [];
  let createdCases: Array<any> = [];
  let tempActionUpdates: Array<{ filter: any; update: any }> = [];
  let warningUpdates: Array<{ filter: any; update: any }> = [];

  const originalModCaseCreate = ModCase.create;
  const originalModCaseFindOne = ModCase.findOne;
  const originalTempActionUpdateMany = TempAction.updateMany;
  const originalWarningUpdateMany = Warning.updateMany;
  const originalGuildConfigFindOne = GuildConfig.findOne;
  const originalAuditLogCreate = AuditLog.create;

  // Default roles setup:
  // target: position 10
  // mod: position 20
  // bot: position 30
  // admin: position 40
  const defaultRoles = [
    { id: 'role_target', name: 'Member', position: 10 },
    { id: 'role_mod', name: 'Staff Mod', position: 20 },
    { id: 'role_bot', name: 'AiCord', position: 30, tags: { bot_id: BOT_ID } },
    { id: 'role_admin', name: 'Server Admin', position: 40 },
  ];

  beforeEach(() => {
    interceptedResponses = [];
    restCalls = [];
    createdCases = [];
    tempActionUpdates = [];
    warningUpdates = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });

    // Mock ModCase
    ModCase.create = (async (data: any) => {
      const doc = { ...data, _id: 'case_id_' + (createdCases.length + 1) };
      createdCases.push(doc);
      return doc;
    }) as any;

    ModCase.findOne = (() => ({
      sort: () => ({
        select: async () => ({ caseNumber: createdCases.length }),
      }),
    })) as any;

    // Mock TempAction
    TempAction.updateMany = (async (filter: any, update: any) => {
      tempActionUpdates.push({ filter, update });
      return { modifiedCount: 1 };
    }) as any;

    // Mock Warning
    Warning.updateMany = (async (filter: any, update: any) => {
      warningUpdates.push({ filter, update });
      return { modifiedCount: 3 };
    }) as any;

    // Mock GuildConfig
    GuildConfig.findOne = (() => ({
      select: async () => null,
    })) as any;

    // Mock AuditLog
    AuditLog.create = (async () => ({})) as any;

    // Default REST mock
    const mockRest = {
      get: async (route: string) => {
        restCalls.push({ method: 'GET', route });
        if (route === Routes.guild(GUILD_ID)) {
          return { id: GUILD_ID, owner_id: OWNER_ID };
        }
        if (route === Routes.guildRoles(GUILD_ID)) {
          return defaultRoles;
        }
        if (route === Routes.guildMember(GUILD_ID, BOT_ID)) {
          return { roles: ['role_bot'] };
        }
        if (route === Routes.guildMember(GUILD_ID, TARGET_USER_ID)) {
          return {
            roles: ['role_target'],
            user: { id: TARGET_USER_ID, username: 'Troublemaker', discriminator: '5678' },
          };
        }
        if (route === Routes.user(TARGET_USER_ID)) {
          return { id: TARGET_USER_ID, username: 'Troublemaker', discriminator: '5678' };
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
    TempAction.updateMany = originalTempActionUpdateMany;
    Warning.updateMany = originalWarningUpdateMany;
    GuildConfig.findOne = originalGuildConfigFindOne;
    AuditLog.create = originalAuditLogCreate;
  });

  // ─── 1. /mod unban ───────────────────────────────────────────────────────

  describe('/mod unban Subcommand', () => {
    it('executes REST delete on guildBan, creates unban ModCase, and marks TempAction processed', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.BAN_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'unban',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'user_id', value: 'banned_user_123' },
                { name: 'reason', value: 'Appeal accepted' },
              ],
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      const deleteCall = restCalls.find((c) => c.method === 'DELETE');
      assert.ok(deleteCall);
      assert.equal(deleteCall.route, Routes.guildBan(GUILD_ID, 'banned_user_123'));

      assert.equal(createdCases.length, 1);
      assert.equal(createdCases[0].action, 'unban');
      assert.equal(createdCases[0].targetId, 'banned_user_123');
      assert.equal(createdCases[0].reason, 'Appeal accepted');

      assert.equal(tempActionUpdates.length, 1);
      assert.deepEqual(tempActionUpdates[0].update, { $set: { processed: true } });

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('User Unbanned'));
    });

    it('rejects /mod unban when moderator lacks BAN_MEMBERS permission', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: '0', // No ban perms
          roles: ['role_mod'],
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'unban',
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: 'user_id', value: 'banned_user_123' }],
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      assert.equal(restCalls.filter((c) => c.method === 'DELETE').length, 0);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Missing Permission'));
    });
  });

  // ─── 2. /mod untimeout ───────────────────────────────────────────────────

  describe('/mod untimeout Subcommand', () => {
    it('executes REST patch with communication_disabled_until null, creates untimeout ModCase, and updates TempAction', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MODERATE_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'untimeout',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'user', value: TARGET_USER_ID },
                { name: 'reason', value: 'Good behavior' },
              ],
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      const patchCall = restCalls.find((c) => c.method === 'PATCH');
      assert.ok(patchCall);
      assert.equal(patchCall.route, Routes.guildMember(GUILD_ID, TARGET_USER_ID));
      assert.deepEqual(patchCall.body, { communication_disabled_until: null });

      assert.equal(createdCases.length, 1);
      assert.equal(createdCases[0].action, 'untimeout');
      assert.equal(createdCases[0].targetId, TARGET_USER_ID);
      assert.equal(createdCases[0].reason, 'Good behavior');

      assert.equal(tempActionUpdates.length, 1);
      assert.equal(tempActionUpdates[0].filter.type, 'temp_timeout');

      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Timeout Removed'));
    });
  });

  // ─── 3. /mod softban ─────────────────────────────────────────────────────

  describe('/mod softban Subcommand', () => {
    it('bans target with delete_message_seconds then immediately unbans them, creating softban ModCase', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.BAN_MEMBERS.toString(),
          roles: ['role_mod'], // Pos 20 > Pos 10
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'softban',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'user', value: TARGET_USER_ID },
                { name: 'reason', value: 'Purge spam messages' },
                { name: 'delete_days', value: 3 },
              ],
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      const putCall = restCalls.find((c) => c.method === 'PUT');
      assert.ok(putCall);
      assert.equal(putCall.route, Routes.guildBan(GUILD_ID, TARGET_USER_ID));
      assert.equal((putCall.body as any).delete_message_seconds, 3 * 86400);

      const deleteCall = restCalls.find((c) => c.method === 'DELETE');
      assert.ok(deleteCall);
      assert.equal(deleteCall.route, Routes.guildBan(GUILD_ID, TARGET_USER_ID));

      assert.equal(createdCases.length, 1);
      assert.equal(createdCases[0].action, 'softban');
      assert.equal(createdCases[0].targetId, TARGET_USER_ID);

      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('User Softbanned'));
    });
  });

  // ─── 4. /mod clearwarnings ───────────────────────────────────────────────

  describe('/mod clearwarnings Subcommand', () => {
    it('deactivates active warnings and reports count cleared', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.MODERATE_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'clearwarnings',
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                { name: 'user', value: TARGET_USER_ID },
                { name: 'reason', value: 'Fresh start granted' },
              ],
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      assert.equal(warningUpdates.length, 1);
      assert.deepEqual(warningUpdates[0].filter, {
        guildId: GUILD_ID,
        userId: TARGET_USER_ID,
        active: true,
      });
      assert.deepEqual(warningUpdates[0].update, { $set: { active: false } });

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Warnings Cleared'));
      assert.ok(embed?.description?.includes('Cleared **3** active warning(s)'));
    });
  });

  // ─── 5. Role Hierarchy Enforcement (canActOn) ────────────────────────────

  describe('Role Hierarchy & Immunity Enforcement across Moderation Actions', () => {
    it('blocks self-targeting on moderation actions (SELF_TARGET)', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.BAN_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'ban',
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: 'user', value: MOD_ID }], // Target self!
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      assert.equal(createdCases.length, 0);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.description?.includes('cannot perform this moderation action on yourself'));
    });

    it('blocks targeting the bot itself (BOT_SELF_TARGET)', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.KICK_MEMBERS.toString(),
          roles: ['role_mod'],
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'kick',
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: 'user', value: BOT_ID }], // Target bot!
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      assert.equal(createdCases.length, 0);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.description?.includes('cannot perform this moderation action on itself'));
    });

    it('blocks moderating the server owner (TARGET_IS_OWNER)', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.BAN_MEMBERS.toString(),
          roles: ['role_admin'],
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'ban',
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: 'user', value: OWNER_ID }], // Server owner
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      assert.equal(createdCases.length, 0);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.description?.includes('server owner has immunity'));
    });

    it('blocks moderation when invoker role hierarchy is equal to or below target (INVOKER_ROLE_HIERARCHY)', async () => {
      // Mock target having admin role (position 40) while mod has role_mod (position 20)
      const mockRest = {
        get: async (route: string) => {
          if (route === Routes.guild(GUILD_ID)) return { id: GUILD_ID, owner_id: OWNER_ID };
          if (route === Routes.guildRoles(GUILD_ID)) return defaultRoles;
          if (route === Routes.guildMember(GUILD_ID, BOT_ID)) return { roles: ['role_bot'] };
          if (route === Routes.guildMember(GUILD_ID, TARGET_USER_ID)) {
            return {
              roles: ['role_admin'], // Position 40!
              user: { id: TARGET_USER_ID, username: 'AdminTarget', discriminator: '0000' },
            };
          }
          return {};
        },
      } as unknown as REST;
      setDiscordRest(mockRest);

      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: MOD_ID, username: MOD_TAG },
          permissions: PermissionFlags.BAN_MEMBERS.toString(),
          roles: ['role_mod'], // Position 20 < Target Position 40
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'ban',
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: 'user', value: TARGET_USER_ID }],
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      assert.equal(createdCases.length, 0);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Action Denied'));
      assert.ok(embed?.description?.includes('strictly higher'));
    });

    it('blocks moderation when bot role hierarchy is equal to or below target (BOT_ROLE_HIERARCHY)', async () => {
      // Target has role_admin (pos 40), Mod is guild owner, Bot has role_bot (pos 30 < 40)
      const mockRest = {
        get: async (route: string) => {
          if (route === Routes.guild(GUILD_ID)) return { id: GUILD_ID, owner_id: OWNER_ID };
          if (route === Routes.guildRoles(GUILD_ID)) return defaultRoles;
          if (route === Routes.guildMember(GUILD_ID, BOT_ID)) return { roles: ['role_bot'] }; // 30
          if (route === Routes.guildMember(GUILD_ID, TARGET_USER_ID)) {
            return {
              roles: ['role_admin'], // 40
              user: { id: TARGET_USER_ID, username: 'HigherThanBot', discriminator: '0000' },
            };
          }
          return {};
        },
      } as unknown as REST;
      setDiscordRest(mockRest);

      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: {
          user: { id: OWNER_ID, username: 'Owner' }, // Owner bypasses invoker check
          permissions: PermissionFlags.BAN_MEMBERS.toString(),
          roles: ['role_admin'],
        },
        data: {
          name: 'mod',
          options: [
            {
              name: 'ban',
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: 'user', value: TARGET_USER_ID }],
            },
          ],
        },
      } as any;

      await handleModCommand(interaction);

      assert.equal(createdCases.length, 0);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Action Denied'));
      assert.ok(embed?.description?.includes("AiCord's highest role"));
    });
  });
});
