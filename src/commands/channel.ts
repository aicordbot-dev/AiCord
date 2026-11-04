/**
 * src/commands/channel.ts
 * Handles /channel subcommands: create, delete, lock, unlock, slowmode.
 */

import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { Routes, ChannelType } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed } from '@/lib/discord/embeds';
import { sanitizeChannelName } from '@/lib/limits';
import { PermissionFlags } from '@/lib/discord/permissions';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

export async function handleChannelCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();

  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const currentChannelId = interaction.channel_id ?? '';
  const options = interaction.data.options ?? [];

  const subcommand = options[0] as { name: string; options?: Array<{ name: string; value: unknown }> };
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'create':
      await handleChannelCreate(token, guildId, subOptions);
      break;
    case 'delete':
      await handleChannelDelete(token, guildId, subOptions, currentChannelId);
      break;
    case 'lock':
      await handleChannelLock(token, guildId, subOptions, currentChannelId, true);
      break;
    case 'unlock':
      await handleChannelLock(token, guildId, subOptions, currentChannelId, false);
      break;
    case 'slowmode':
      await handleChannelSlowmode(token, guildId, subOptions, currentChannelId);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown subcommand', `Unknown channel subcommand: ${subcommand?.name}`)],
        ephemeral: true,
      });
  }
}

async function handleChannelCreate(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const name = getOption<string>(options, 'name');
  if (!name) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing Name', 'Please provide a channel name.')], ephemeral: true });
    return;
  }

  const typeStr = getOption<string>(options, 'type') ?? 'text';
  const categoryId = getOption<string>(options, 'category');
  const isPrivate = getOption<boolean>(options, 'private') ?? false;

  const channelTypeMap: Record<string, ChannelType> = {
    text: ChannelType.GuildText,
    voice: ChannelType.GuildVoice,
    forum: ChannelType.GuildForum,
    announcement: ChannelType.GuildAnnouncement,
  };

  const permissionOverwrites = isPrivate
    ? [{ id: guildId, type: 0, allow: '0', deny: PermissionFlags.VIEW_CHANNEL.toString() }]
    : [];

  try {
    const rest = getDiscordRest();
    const channel = await discordApiCall(() =>
      rest.post(Routes.guildChannels(guildId), {
        body: {
          name: sanitizeChannelName(name),
          type: channelTypeMap[typeStr] ?? ChannelType.GuildText,
          parent_id: categoryId,
          permission_overwrites: permissionOverwrites,
        },
      }) as Promise<{ id: string; name: string }>,
    );

    await editInteractionResponse(token, {
      embeds: [successEmbed('Channel Created', `Created <#${channel.id}> successfully.${isPrivate ? ' 🔒 Private' : ''}`)],
    });
  } catch (err) {
    console.error('[/channel create] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Create Channel', 'Could not create the channel. Check my permissions.')],
    });
  }
}

async function handleChannelDelete(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
  currentChannelId: string,
): Promise<void> {
  const channelId = getOption<string>(options, 'channel') ?? currentChannelId;

  try {
    const rest = getDiscordRest();
    await discordApiCall(() => rest.delete(Routes.channel(channelId)));
    await editInteractionResponse(token, {
      embeds: [successEmbed('Channel Deleted', 'The channel has been deleted.')],
    });
  } catch (err) {
    console.error('[/channel delete] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Delete Channel', 'Could not delete the channel.')],
    });
  }
}

async function handleChannelLock(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
  currentChannelId: string,
  lock: boolean,
): Promise<void> {
  const channelId = getOption<string>(options, 'channel') ?? currentChannelId;
  const reason = getOption<string>(options, 'reason');

  const SEND_MESSAGES = PermissionFlags.SEND_MESSAGES;

  try {
    const rest = getDiscordRest();
    await discordApiCall(() =>
      rest.put(Routes.channelPermission(channelId, guildId), {
        body: {
          type: 0,
          allow: '0',
          deny: lock ? SEND_MESSAGES.toString() : '0',
        },
      }),
    );

    const action = lock ? 'locked' : 'unlocked';
    await editInteractionResponse(token, {
      embeds: [successEmbed(
        `Channel ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        `<#${channelId}> has been ${action}.${reason ? `\n**Reason:** ${reason}` : ''}`,
      )],
    });
  } catch (err) {
    console.error(`[/channel ${lock ? 'lock' : 'unlock'}] Error:`, err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed(`Failed to ${lock ? 'Lock' : 'Unlock'} Channel`, 'Could not update channel permissions.')],
    });
  }
}

async function handleChannelSlowmode(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
  currentChannelId: string,
): Promise<void> {
  const seconds = getOption<number>(options, 'seconds') ?? 0;
  const channelId = getOption<string>(options, 'channel') ?? currentChannelId;

  try {
    const rest = getDiscordRest();
    await discordApiCall(() =>
      rest.patch(Routes.channel(channelId), {
        body: { rate_limit_per_user: seconds },
      }),
    );

    const msg = seconds === 0
      ? `Slowmode has been disabled in <#${channelId}>.`
      : `Slowmode set to **${seconds}s** in <#${channelId}>.`;

    await editInteractionResponse(token, {
      embeds: [successEmbed('Slowmode Updated', msg)],
    });
  } catch (err) {
    console.error('[/channel slowmode] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Set Slowmode', 'Could not update the channel.')],
    });
  }
}
