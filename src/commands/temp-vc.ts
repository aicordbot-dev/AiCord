/**
 * src/commands/temp-vc.ts
 * Dynamic Temporary Auto-Voice Rooms ("Join-to-Create") Slash Commands & Component Handlers for AiCord.
 *
 * Subcommands:
 * - /temp-vc setup: configure Join-to-Create hub channel, category, naming pattern, and default capacity (MANAGE_CHANNELS / MANAGE_GUILD)
 * - /temp-vc create: spawn an on-demand temporary voice room
 * - /temp-vc lock: lock room preventing other members from connecting
 * - /temp-vc unlock: open room allowing server members to join
 * - /temp-vc limit: configure maximum concurrent member slots (0-99)
 * - /temp-vc rename: customize the room name
 * - /temp-vc transfer: hand off room ownership to another member
 * - /temp-vc status: view interactive room controls dashboard
 *
 * Component Handler:
 * - handleTempVoiceComponent(): routes tvc_lock, tvc_limit, tvc_rename, tvc_status button actions
 */

import {
  ApplicationCommandOptionType,
  ChannelType,
  Routes,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import {
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  getTempVoiceConfig,
  setTempVoiceConfig,
  createTempVoiceRoom,
  getTempVoiceRoom,
  getTempVoiceRoomByOwner,
  toggleRoomLock,
  setRoomLimit,
  renameRoom,
  transferRoomOwnership,
  buildRoomDashboardEmbed,
  buildRoomDashboardComponents,
  isTestMode,
  type ITempVoiceRoom,
} from '@/lib/temp-vc/temp-vc-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }>,
  name: string,
): T | undefined {
  return options?.find((o) => o.name === name)?.value as T | undefined;
}

/**
 * Resolves the target temporary room:
 * 1. Explicit channel option provided in command
 * 2. Channel where command was invoked
 * 3. Room owned by the invoking user
 */
async function resolveTargetRoom(
  guildId: string,
  userId: string,
  explicitChannelId?: string,
  fallbackChannelId?: string,
): Promise<ITempVoiceRoom | null> {
  if (explicitChannelId) {
    return await getTempVoiceRoom(guildId, explicitChannelId);
  }
  if (fallbackChannelId) {
    const room = await getTempVoiceRoom(guildId, fallbackChannelId);
    if (room) return room;
  }
  return await getTempVoiceRoomByOwner(guildId, userId);
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleTempVoiceSetupSubcommand(
  guildId: string,
  token: string,
  memberPerms: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const hasSetupPerms =
    hasPermission(memberPerms, PermissionFlags.MANAGE_CHANNELS) ||
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  if (!hasSetupPerms) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need `MANAGE_CHANNELS` or `MANAGE_GUILD` permission to configure Join-to-Create voice channels.',
        ),
      ],
    });
    return;
  }

  const hubChannelId = getOption<string>(subOptions, 'hub_channel');
  const categoryId = getOption<string>(subOptions, 'category');
  const defaultLimit = getOption<number>(subOptions, 'default_limit') ?? 0;
  const namingScheme = getOption<string>(subOptions, 'naming_scheme') ?? "{username}'s Lounge";

  if (!hubChannelId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Hub Channel Required', 'Please provide a valid voice channel as the Join-to-Create hub.')],
    });
    return;
  }

  try {
    const config = await setTempVoiceConfig(guildId, {
      hubChannelId,
      categoryId,
      defaultLimit: Math.max(0, Math.min(99, Math.floor(defaultLimit))),
      namingScheme,
      enabled: true,
    });

    const description = [
      '**Join-to-Create Auto-Voice is now active!**',
      '',
      `• **Hub Voice Channel**: <#${config.hubChannelId}>`,
      config.categoryId ? `• **Spawn Category**: <#${config.categoryId}>` : '• **Spawn Category**: *(Same as hub channel)*',
      `• **Default User Limit**: ${config.defaultLimit > 0 ? `${config.defaultLimit} users` : 'Unlimited'}`,
      `• **Naming Pattern**: \`${config.namingScheme}\``,
      '',
      'Whenever members join the hub voice channel or run `/temp-vc create`, a private temporary voice room will automatically be created.',
    ].join('\n');

    await editInteractionResponse(token, {
      embeds: [successEmbed('Join-to-Create Configured', description)],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save temporary voice configuration.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Configuration Error', message)],
    });
  }
}

export async function handleTempVoiceCreateSubcommand(
  guildId: string,
  userId: string,
  userTag: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const customName = getOption<string>(subOptions, 'name');
  const customLimit = getOption<number>(subOptions, 'limit');

  try {
    const { channelSpec, room } = await createTempVoiceRoom(
      guildId,
      userId,
      userTag,
      customName,
      customLimit,
    );

    let finalChannelId = room.channelId;

    if (!isTestMode()) {
      try {
        const rest = getDiscordRest();
        const createdChannel = (await discordApiCall(() =>
          rest.post(Routes.guildChannels(guildId), {
            body: channelSpec,
          }),
        )) as { id: string };

        if (createdChannel?.id) {
          finalChannelId = createdChannel.id;
          room.channelId = finalChannelId;
        }
      } catch (restErr) {
        console.error('[temp-vc create] REST Error creating voice channel:', restErr);
      }
    }

    const embed = buildRoomDashboardEmbed(room);
    const components = buildRoomDashboardComponents(room);

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Voice Room Created!',
          `Your temporary voice channel **${room.name}** is ready: <#${finalChannelId}>.\nUse the dashboard below to manage permissions, user limits, and status.`,
        ),
        embed,
      ],
      components,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create temporary voice room.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Voice Creation Error', message)],
    });
  }
}

export async function handleTempVoiceLockSubcommand(
  guildId: string,
  userId: string,
  token: string,
  memberPerms: string,
  commandChannelId: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const targetChannelId = getOption<string>(subOptions, 'channel');
  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_CHANNELS) ||
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  const room = await resolveTargetRoom(guildId, userId, targetChannelId, commandChannelId);
  if (!room) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Room Not Found',
          'Could not find an active temporary voice room. Specify the channel or run this command while owning an active room.',
        ),
      ],
    });
    return;
  }

  if (room.isLocked) {
    await editInteractionResponse(token, {
      embeds: [infoEmbed('Already Locked', `**${room.name}** (<#${room.channelId}>) is already locked.`)],
    });
    return;
  }

  try {
    const { room: updatedRoom, overwrite } = await toggleRoomLock(
      guildId,
      room.channelId,
      userId,
      isMod,
    );

    if (!isTestMode()) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.put(Routes.channelPermission(room.channelId, overwrite.id), {
            body: overwrite,
          }),
        );
      } catch (restErr) {
        console.error('[temp-vc lock] REST Error applying lock overwrite:', restErr);
      }
    }

    const embed = buildRoomDashboardEmbed(updatedRoom);
    const components = buildRoomDashboardComponents(updatedRoom);

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Room Locked 🔒',
          `**${updatedRoom.name}** has been locked. New members cannot connect to this channel unless unlocked.`,
        ),
        embed,
      ],
      components,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to lock temporary voice room.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Lock Error', message)],
    });
  }
}

export async function handleTempVoiceUnlockSubcommand(
  guildId: string,
  userId: string,
  token: string,
  memberPerms: string,
  commandChannelId: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const targetChannelId = getOption<string>(subOptions, 'channel');
  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_CHANNELS) ||
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  const room = await resolveTargetRoom(guildId, userId, targetChannelId, commandChannelId);
  if (!room) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Room Not Found',
          'Could not find an active temporary voice room. Specify the channel or run this command while owning an active room.',
        ),
      ],
    });
    return;
  }

  if (!room.isLocked) {
    await editInteractionResponse(token, {
      embeds: [infoEmbed('Already Unlocked', `**${room.name}** (<#${room.channelId}>) is already unlocked.`)],
    });
    return;
  }

  try {
    const { room: updatedRoom, overwrite } = await toggleRoomLock(
      guildId,
      room.channelId,
      userId,
      isMod,
    );

    if (!isTestMode()) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.put(Routes.channelPermission(room.channelId, overwrite.id), {
            body: overwrite,
          }),
        );
      } catch (restErr) {
        console.error('[temp-vc unlock] REST Error removing lock overwrite:', restErr);
      }
    }

    const embed = buildRoomDashboardEmbed(updatedRoom);
    const components = buildRoomDashboardComponents(updatedRoom);

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Room Unlocked 🔓',
          `**${updatedRoom.name}** is now unlocked. Server members are free to join.`,
        ),
        embed,
      ],
      components,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to unlock temporary voice room.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Unlock Error', message)],
    });
  }
}

export async function handleTempVoiceLimitSubcommand(
  guildId: string,
  userId: string,
  token: string,
  memberPerms: string,
  commandChannelId: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const slots = getOption<number>(subOptions, 'slots');
  const targetChannelId = getOption<string>(subOptions, 'channel');
  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_CHANNELS) ||
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  if (slots === undefined || slots === null) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Slots Required', 'Please specify the maximum slots (0-99, 0 = unlimited).')],
    });
    return;
  }

  const room = await resolveTargetRoom(guildId, userId, targetChannelId, commandChannelId);
  if (!room) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Room Not Found',
          'Could not find an active temporary voice room. Specify the channel or run this command while owning an active room.',
        ),
      ],
    });
    return;
  }

  try {
    const updated = await setRoomLimit(guildId, room.channelId, userId, slots, isMod);

    if (!isTestMode()) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.patch(Routes.channel(room.channelId), {
            body: { user_limit: updated.userLimit },
          }),
        );
      } catch (restErr) {
        console.error('[temp-vc limit] REST Error updating channel user limit:', restErr);
      }
    }

    const embed = buildRoomDashboardEmbed(updated);
    const components = buildRoomDashboardComponents(updated);

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Slot Limit Updated 👥',
          `Voice capacity for **${updated.name}** set to **${updated.userLimit > 0 ? `${updated.userLimit} Users` : 'Unlimited'}**.`,
        ),
        embed,
      ],
      components,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update user limit.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Limit Error', message)],
    });
  }
}

export async function handleTempVoiceRenameSubcommand(
  guildId: string,
  userId: string,
  token: string,
  memberPerms: string,
  commandChannelId: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const newName = getOption<string>(subOptions, 'name');
  const targetChannelId = getOption<string>(subOptions, 'channel');
  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_CHANNELS) ||
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  if (!newName) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Name Required', 'Please provide a valid new title for the room.')],
    });
    return;
  }

  const room = await resolveTargetRoom(guildId, userId, targetChannelId, commandChannelId);
  if (!room) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Room Not Found',
          'Could not find an active temporary voice room. Specify the channel or run this command while owning an active room.',
        ),
      ],
    });
    return;
  }

  try {
    const updated = await renameRoom(guildId, room.channelId, userId, newName, isMod);

    if (!isTestMode()) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.patch(Routes.channel(room.channelId), {
            body: { name: updated.name },
          }),
        );
      } catch (restErr) {
        console.error('[temp-vc rename] REST Error updating channel name:', restErr);
      }
    }

    const embed = buildRoomDashboardEmbed(updated);
    const components = buildRoomDashboardComponents(updated);

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Room Renamed ✏️',
          `Voice room title has been updated to **${updated.name}**.`,
        ),
        embed,
      ],
      components,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rename temporary voice room.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Rename Error', message)],
    });
  }
}

export async function handleTempVoiceTransferSubcommand(
  guildId: string,
  userId: string,
  token: string,
  memberPerms: string,
  commandChannelId: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const newOwnerId = getOption<string>(subOptions, 'new_owner');
  const targetChannelId = getOption<string>(subOptions, 'channel');
  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_CHANNELS) ||
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  if (!newOwnerId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('New Owner Required', 'Please mention the server member to transfer room ownership to.')],
    });
    return;
  }

  const room = await resolveTargetRoom(guildId, userId, targetChannelId, commandChannelId);
  if (!room) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Room Not Found',
          'Could not find an active temporary voice room. Specify the channel or run this command while owning an active room.',
        ),
      ],
    });
    return;
  }

  try {
    const updated = await transferRoomOwnership(
      guildId,
      room.channelId,
      userId,
      newOwnerId,
      'Member',
      isMod,
    );

    const embed = buildRoomDashboardEmbed(updated);
    const components = buildRoomDashboardComponents(updated);

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Ownership Transferred 👑',
          `Ownership of **${updated.name}** has been transferred to <@${newOwnerId}>. They now have full room management privileges.`,
        ),
        embed,
      ],
      components,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to transfer room ownership.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Transfer Error', message)],
    });
  }
}

export async function handleTempVoiceStatusSubcommand(
  guildId: string,
  userId: string,
  token: string,
  commandChannelId: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const targetChannelId = getOption<string>(subOptions, 'channel');

  const room = await resolveTargetRoom(guildId, userId, targetChannelId, commandChannelId);
  if (!room) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Room Not Found',
          'Could not find an active temporary voice room. Specify the channel or run this command while owning an active room.',
        ),
      ],
    });
    return;
  }

  const embed = buildRoomDashboardEmbed(room);
  const components = buildRoomDashboardComponents(room);

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

// ─── Component Interaction Handler ────────────────────────────────────────────

export async function handleTempVoiceComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const parts = customId.split(':');
  if (parts.length < 2) return;

  const action = parts[0];
  const channelId = parts[1];

  const memberPerms = (component.member?.permissions as string) || '0';
  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_CHANNELS) ||
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  try {
    switch (action) {
      case 'tvc_lock': {
        const { room: updatedRoom, overwrite } = await toggleRoomLock(
          guildId,
          channelId,
          userId,
          isMod,
        );

        if (!isTestMode()) {
          try {
            const rest = getDiscordRest();
            await discordApiCall(() =>
              rest.put(Routes.channelPermission(channelId, overwrite.id), {
                body: overwrite,
              }),
            );
          } catch (restErr) {
            console.error('[handleTempVoiceComponent] REST Error updating lock permission:', restErr);
          }
        }

        const embed = buildRoomDashboardEmbed(updatedRoom);
        const components = buildRoomDashboardComponents(updatedRoom);

        const msgChannelId = component.channel_id ?? component.message?.channel_id;
        const msgId = component.message?.id;
        if (!isTestMode() && msgChannelId && msgId) {
          try {
            const rest = getDiscordRest();
            await discordApiCall(() =>
              rest.patch(Routes.channelMessage(msgChannelId, msgId), {
                body: { embeds: [embed], components },
              }),
            );
          } catch {
            // Ignore background patch error
          }
        }

        await editInteractionResponse(token, {
          embeds: [embed],
          components,
        });
        break;
      }

      case 'tvc_limit': {
        const room = await getTempVoiceRoom(guildId, channelId);
        if (!room) {
          throw new Error('Temp voice room not found.');
        }

        const cycleLimits = [0, 2, 4, 8, 10, 20];
        const currentIndex = cycleLimits.indexOf(room.userLimit);
        const nextLimit = cycleLimits[(currentIndex + 1) % cycleLimits.length] ?? 0;

        const updatedRoom = await setRoomLimit(guildId, channelId, userId, nextLimit, isMod);

        if (!isTestMode()) {
          try {
            const rest = getDiscordRest();
            await discordApiCall(() =>
              rest.patch(Routes.channel(channelId), {
                body: { user_limit: updatedRoom.userLimit },
              }),
            );
          } catch (restErr) {
            console.error('[handleTempVoiceComponent] REST Error updating user limit:', restErr);
          }
        }

        const embed = buildRoomDashboardEmbed(updatedRoom);
        const components = buildRoomDashboardComponents(updatedRoom);

        const msgChannelId = component.channel_id ?? component.message?.channel_id;
        const msgId = component.message?.id;
        if (!isTestMode() && msgChannelId && msgId) {
          try {
            const rest = getDiscordRest();
            await discordApiCall(() =>
              rest.patch(Routes.channelMessage(msgChannelId, msgId), {
                body: { embeds: [embed], components },
              }),
            );
          } catch {
            // Ignore background patch error
          }
        }

        await editInteractionResponse(token, {
          embeds: [embed],
          components,
        });
        break;
      }

      case 'tvc_status': {
        const room = await getTempVoiceRoom(guildId, channelId);
        if (!room) {
          throw new Error('Temp voice room not found.');
        }

        const embed = buildRoomDashboardEmbed(room);
        const components = buildRoomDashboardComponents(room);

        await editInteractionResponse(token, {
          embeds: [embed],
          components,
        });
        break;
      }

      case 'tvc_rename': {
        await editInteractionResponse(token, {
          embeds: [
            infoEmbed(
              'Rename Voice Room',
              `To rename this room, run:\n\`/temp-vc rename name:<new name> channel:<#${channelId}>\``,
            ),
          ],
          ephemeral: true,
        });
        break;
      }

      default:
        throw new Error(`Unknown temp voice action: ${action}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Action failed.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Voice Control Error', message)],
      ephemeral: true,
    });
  }
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleTempVoiceCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id || '';
  const userTag = interaction.member?.user?.username || interaction.user?.username || 'Member';
  const channelId = interaction.channel_id || '';
  const memberPerms = interaction.member?.permissions ?? '0';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Server Required',
          'The /temp-vc command can only be used within a server.',
        ),
      ],
    });
    return;
  }

  const options = (interaction.data?.options || []) as Array<{
    name: string;
    type: number;
    value?: unknown;
    options?: Array<{ name: string; value?: unknown }>;
  }>;

  const subcommand = options[0];
  const subName = subcommand?.name;
  const subOptions = (subcommand?.options || []) as Array<{
    name: string;
    value?: unknown;
  }>;

  switch (subName) {
    case 'setup':
      await handleTempVoiceSetupSubcommand(guildId, token, memberPerms, subOptions);
      break;
    case 'create':
      await handleTempVoiceCreateSubcommand(guildId, userId, userTag, token, subOptions);
      break;
    case 'lock':
      await handleTempVoiceLockSubcommand(guildId, userId, token, memberPerms, channelId, subOptions);
      break;
    case 'unlock':
      await handleTempVoiceUnlockSubcommand(guildId, userId, token, memberPerms, channelId, subOptions);
      break;
    case 'limit':
      await handleTempVoiceLimitSubcommand(guildId, userId, token, memberPerms, channelId, subOptions);
      break;
    case 'rename':
      await handleTempVoiceRenameSubcommand(guildId, userId, token, memberPerms, channelId, subOptions);
      break;
    case 'transfer':
      await handleTempVoiceTransferSubcommand(guildId, userId, token, memberPerms, channelId, subOptions);
      break;
    case 'status':
      await handleTempVoiceStatusSubcommand(guildId, userId, token, channelId, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Subcommand "${subName}" is not recognized.`,
          ),
        ],
      });
      break;
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const tempVcCommand: RegisteredCommand = {
  name: 'temp-vc',
  description: 'Dynamic Temporary Auto-Voice Rooms ("Join-to-Create") and owner controls',
  category: 'utility',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'setup',
      description: 'Configure Join-to-Create hub channel, category, naming pattern, and default limit',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'hub_channel',
          description: 'The Join-to-Create voice channel members join to spawn temporary rooms',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildVoice],
          required: true,
        },
        {
          name: 'category',
          description: 'Category where spawned temporary voice channels will be created',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildCategory],
          required: false,
        },
        {
          name: 'default_limit',
          description: 'Default user limit for spawned rooms (0-99, 0 = unlimited)',
          type: ApplicationCommandOptionType.Integer,
          min_value: 0,
          max_value: 99,
          required: false,
        },
        {
          name: 'naming_scheme',
          description: 'Naming pattern with {username} token (default: "{username}\'s Lounge")',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'create',
      description: 'Spawn an on-demand temporary voice room right now',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'name',
          description: 'Custom room name (supports {username})',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'limit',
          description: 'User limit (0-99, 0 = unlimited)',
          type: ApplicationCommandOptionType.Integer,
          min_value: 0,
          max_value: 99,
          required: false,
        },
      ],
    },
    {
      name: 'lock',
      description: 'Lock your temporary voice room to prevent other members from joining',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Voice room to lock (defaults to your active room)',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildVoice],
          required: false,
        },
      ],
    },
    {
      name: 'unlock',
      description: 'Unlock your temporary voice room allowing server members to join',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Voice room to unlock (defaults to your active room)',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildVoice],
          required: false,
        },
      ],
    },
    {
      name: 'limit',
      description: 'Configure maximum member capacity for your temporary voice room',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'slots',
          description: 'Maximum user slots (0-99, 0 = unlimited)',
          type: ApplicationCommandOptionType.Integer,
          min_value: 0,
          max_value: 99,
          required: true,
        },
        {
          name: 'channel',
          description: 'Voice room to configure (defaults to your active room)',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildVoice],
          required: false,
        },
      ],
    },
    {
      name: 'rename',
      description: 'Customize the title of your temporary voice room',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'name',
          description: 'New title for your voice room (1-100 characters)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'channel',
          description: 'Voice room to rename (defaults to your active room)',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildVoice],
          required: false,
        },
      ],
    },
    {
      name: 'transfer',
      description: 'Hand off ownership and control of your room to another member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'new_owner',
          description: 'Server member to transfer room ownership to',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: 'channel',
          description: 'Voice room to transfer (defaults to your active room)',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildVoice],
          required: false,
        },
      ],
    },
    {
      name: 'status',
      description: 'View interactive controls dashboard and statistics for your voice room',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Voice room to view (defaults to your active room)',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildVoice],
          required: false,
        },
      ],
    },
  ],
  execute: handleTempVoiceCommand,
};
