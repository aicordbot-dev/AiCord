/**
 * src/lib/discord/ai-action-executor.ts
 * Executes typed AI actions through a whitelist of safe handlers.
 * NEVER executes raw model output — only actions matching the AiActionSchema.
 */

import {
  Routes,
  ChannelType,
  type RESTPostAPIGuildChannelJSONBody,
  type RESTPatchAPIChannelJSONBody,
  type RESTPostAPIGuildRoleJSONBody,
  type RESTPatchAPIGuildRoleJSONBody,
} from 'discord-api-types/v10';
import { getDiscordRest, discordApiCall } from './rest';
import { sanitizeChannelName } from '@/lib/limits';
import type { AiAction } from '@/commands/ai';

const SLEEP_MS = 300;
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface ExecuteResult {
  success: boolean;
  results: string[];
  errors: string[];
}

type ChannelInfo = { id: string; name: string; type: number; parent_id?: string };
type RoleInfo = { id: string; name: string; position: number };

/** Fetch guild channels once and return a name->id map. */
async function getChannelMap(guildId: string): Promise<Map<string, ChannelInfo>> {
  const rest = getDiscordRest();
  const channels = await discordApiCall(() =>
    rest.get(Routes.guildChannels(guildId)) as Promise<ChannelInfo[]>,
  );
  const map = new Map<string, ChannelInfo>();
  for (const ch of channels) {
    map.set(ch.name.toLowerCase(), ch);
  }
  return map;
}

/** Fetch guild roles once and return a name->id map. */
async function getRoleMap(guildId: string): Promise<Map<string, RoleInfo>> {
  const rest = getDiscordRest();
  const roles = await discordApiCall(() =>
    rest.get(Routes.guildRoles(guildId)) as Promise<RoleInfo[]>,
  );
  const map = new Map<string, RoleInfo>();
  for (const role of roles) {
    map.set(role.name.toLowerCase(), role);
  }
  return map;
}

/**
 * Execute a list of validated AI actions against the Discord API.
 */
export async function executeAiActions(
  guildId: string,
  actions: AiAction[],
): Promise<ExecuteResult> {
  const rest = getDiscordRest();
  const results: string[] = [];
  const errors: string[] = [];

  // Fetch channel and role maps once
  let channelMap = await getChannelMap(guildId);
  let roleMap = await getRoleMap(guildId);

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'create_channel': {
          const channelTypeMap: Record<string, ChannelType> = {
            text: ChannelType.GuildText,
            voice: ChannelType.GuildVoice,
            forum: ChannelType.GuildForum,
            announcement: ChannelType.GuildAnnouncement,
          };
          const parentId = action.parentName
            ? channelMap.get(action.parentName.toLowerCase())?.id
            : undefined;

          const body: RESTPostAPIGuildChannelJSONBody = {
            name: sanitizeChannelName(action.targetName ?? 'new-channel'),
            type: (channelTypeMap[action.channelType ?? 'text'] ?? ChannelType.GuildText) as RESTPostAPIGuildChannelJSONBody['type'],
            parent_id: parentId,
          };

          if (action.isPrivate) {
            body.permission_overwrites = [
              { id: guildId, type: 0, allow: '0', deny: (1n << 10n).toString() },
            ];
          }

          await discordApiCall(() => rest.post(Routes.guildChannels(guildId), { body }));
          channelMap = await getChannelMap(guildId); // Refresh
          results.push(`✅ Created channel #${action.targetName}`);
          break;
        }

        case 'edit_channel':
        case 'rename_channel': {
          const ch = action.targetId
            ? { id: action.targetId }
            : channelMap.get((action.targetName ?? '').toLowerCase());
          if (!ch) throw new Error(`Channel "${action.targetName}" not found`);

          const body: RESTPatchAPIChannelJSONBody = {};
          if (action.newName) body.name = sanitizeChannelName(action.newName);
          if (action.newTopic !== undefined) body.topic = action.newTopic;

          await discordApiCall(() => rest.patch(Routes.channel(ch.id), { body }));
          channelMap = await getChannelMap(guildId);
          results.push(`✅ Edited channel #${action.targetName}`);
          break;
        }

        case 'delete_channel': {
          const ch = action.targetId
            ? { id: action.targetId }
            : channelMap.get((action.targetName ?? '').toLowerCase());
          if (!ch) throw new Error(`Channel "${action.targetName}" not found`);

          await discordApiCall(() => rest.delete(Routes.channel(ch.id)));
          channelMap = await getChannelMap(guildId);
          results.push(`✅ Deleted channel #${action.targetName}`);
          break;
        }

        case 'create_category': {
          const body: RESTPostAPIGuildChannelJSONBody = {
            name: action.targetName ?? 'New Category',
            type: ChannelType.GuildCategory,
          };
          await discordApiCall(() => rest.post(Routes.guildChannels(guildId), { body }));
          channelMap = await getChannelMap(guildId);
          results.push(`✅ Created category ${action.targetName}`);
          break;
        }

        case 'edit_category':
        case 'rename_category': {
          const ch = action.targetId
            ? { id: action.targetId }
            : channelMap.get((action.targetName ?? '').toLowerCase());
          if (!ch) throw new Error(`Category "${action.targetName}" not found`);

          const body: RESTPatchAPIChannelJSONBody = {};
          if (action.newName) body.name = action.newName;

          await discordApiCall(() => rest.patch(Routes.channel(ch.id), { body }));
          channelMap = await getChannelMap(guildId);
          results.push(`✅ Renamed category to ${action.newName}`);
          break;
        }

        case 'delete_category': {
          const ch = action.targetId
            ? { id: action.targetId }
            : channelMap.get((action.targetName ?? '').toLowerCase());
          if (!ch) throw new Error(`Category "${action.targetName}" not found`);

          await discordApiCall(() => rest.delete(Routes.channel(ch.id)));
          channelMap = await getChannelMap(guildId);
          results.push(`✅ Deleted category ${action.targetName}`);
          break;
        }

        case 'create_role': {
          const body: RESTPostAPIGuildRoleJSONBody = {
            name: action.targetName ?? 'New Role',
            color: action.color ?? 0,
          };
          await discordApiCall(() => rest.post(Routes.guildRoles(guildId), { body }));
          roleMap = await getRoleMap(guildId);
          results.push(`✅ Created role @${action.targetName}`);
          break;
        }

        case 'edit_role': {
          const role = action.targetId
            ? { id: action.targetId }
            : roleMap.get((action.targetName ?? '').toLowerCase());
          if (!role) throw new Error(`Role "${action.targetName}" not found`);

          const body: RESTPatchAPIGuildRoleJSONBody = {};
          if (action.newName) body.name = action.newName;
          if (action.color !== undefined) body.color = action.color;

          await discordApiCall(() => rest.patch(Routes.guildRole(guildId, role.id), { body }));
          results.push(`✅ Edited role @${action.targetName}`);
          break;
        }

        case 'delete_role': {
          const role = action.targetId
            ? { id: action.targetId }
            : roleMap.get((action.targetName ?? '').toLowerCase());
          if (!role) throw new Error(`Role "${action.targetName}" not found`);

          await discordApiCall(() => rest.delete(Routes.guildRole(guildId, role.id)));
          roleMap = await getRoleMap(guildId);
          results.push(`✅ Deleted role @${action.targetName}`);
          break;
        }

        case 'assign_role': {
          if (!action.userId) throw new Error('Missing userId for assign_role');
          const role = action.targetId
            ? { id: action.targetId }
            : roleMap.get((action.roleRef ?? action.targetName ?? '').toLowerCase());
          if (!role) throw new Error(`Role "${action.roleRef ?? action.targetName}" not found`);

          await discordApiCall(() =>
            rest.put(Routes.guildMemberRole(guildId, action.userId!, role.id)),
          );
          results.push(`✅ Assigned @${action.roleRef ?? action.targetName} to <@${action.userId}>`);
          break;
        }

        case 'remove_role': {
          if (!action.userId) throw new Error('Missing userId for remove_role');
          const role = action.targetId
            ? { id: action.targetId }
            : roleMap.get((action.roleRef ?? action.targetName ?? '').toLowerCase());
          if (!role) throw new Error(`Role "${action.roleRef ?? action.targetName}" not found`);

          await discordApiCall(() =>
            rest.delete(Routes.guildMemberRole(guildId, action.userId!, role.id)),
          );
          results.push(`✅ Removed @${action.roleRef ?? action.targetName} from <@${action.userId}>`);
          break;
        }

        case 'set_permission_overwrite': {
          const ch = action.targetId
            ? { id: action.targetId }
            : channelMap.get((action.targetName ?? '').toLowerCase());
          if (!ch) throw new Error(`Channel "${action.targetName}" not found`);

          const role = roleMap.get((action.roleRef ?? '').toLowerCase());
          if (!role) throw new Error(`Role "${action.roleRef}" not found`);

          // Safety: never allow ADMINISTRATOR bit
          const ADMIN_BIT = 1n << 3n;
          const allowBits = (action.allow ?? []).reduce((acc: bigint, flag: string) => {
            // Map permission name to bit — simplified mapping
            const bits: Record<string, bigint> = {
              VIEW_CHANNEL: 1n << 10n,
              SEND_MESSAGES: 1n << 11n,
              READ_MESSAGE_HISTORY: 1n << 16n,
              EMBED_LINKS: 1n << 14n,
              ATTACH_FILES: 1n << 15n,
              MANAGE_MESSAGES: 1n << 13n,
              CONNECT: 1n << 20n,
              SPEAK: 1n << 21n,
            };
            return acc | (bits[flag] ?? 0n);
          }, 0n);

          // Safety check: never allow administrator
          const safeAllowBits = allowBits & ~ADMIN_BIT;

          const denyBits = (action.deny ?? []).reduce((acc: bigint, flag: string) => {
            const bits: Record<string, bigint> = {
              VIEW_CHANNEL: 1n << 10n,
              SEND_MESSAGES: 1n << 11n,
              CONNECT: 1n << 20n,
            };
            return acc | (bits[flag] ?? 0n);
          }, 0n);

          await discordApiCall(() =>
            rest.put(Routes.channelPermission(ch.id, role.id), {
              body: { type: 0, allow: safeAllowBits.toString(), deny: denyBits.toString() },
            }),
          );
          results.push(`✅ Updated permissions for @${action.roleRef} in #${action.targetName}`);
          break;
        }

        default:
          errors.push(`Unknown action type`);
      }

      await sleep(SLEEP_MS);
    } catch (err) {
      const message = `❌ ${action.description}: ${String(err)}`;
      errors.push(message);
      results.push(message);
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  };
}
