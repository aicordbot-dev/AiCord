/**
 * src/commands/starboard.ts
 * Starboard Community Hall of Fame Slash Command Suite for AiCord.
 *
 * Subcommands:
 * - /starboard config channel:#channel [min_stars:number] [self_star:boolean] [emoji:string] [enabled:boolean] (MANAGE_GUILD)
 * - /starboard top [limit:number] (public Hall of Fame leaderboard)
 * - /starboard stats [user:@user] (author or server starboard stats)
 * - /starboard ignore channel:#channel [remove:boolean] (MANAGE_GUILD)
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import {
  successEmbed,
  errorEmbed,
  infoEmbed,
  clampEmbed,
  type DiscordEmbed,
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import {
  getStarboardConfig,
  setStarboardConfig,
  toggleIgnoredChannel,
  getTopStarredMessages,
  getAuthorStarStats,
  getServerStarStats,
  getStarBadge,
  STARBOARD_COLOR,
  type IStarboardConfig,
} from '@/lib/starboard/starboard-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Main Command Handler ─────────────────────────────────────────────────────

export async function handleStarboardCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const memberPerms = interaction.member?.permissions ?? '0';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  const options =
    (
      interaction.data as {
        options?: Array<{
          name: string;
          options?: Array<{ name: string; value: unknown }>;
        }>;
      }
    )?.options ?? [];
  const subcommand = options[0];
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'config':
      await handleStarboardConfigSubcommand(token, guildId, memberPerms, subOptions);
      break;
    case 'top':
      await handleStarboardTopSubcommand(token, guildId, subOptions);
      break;
    case 'stats':
      await handleStarboardStatsSubcommand(token, guildId, subOptions);
      break;
    case 'ignore':
      await handleStarboardIgnoreSubcommand(token, guildId, memberPerms, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /starboard subcommand: "${subcommand?.name ?? 'unknown'}".`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Subcommand: /starboard config ────────────────────────────────────────────

export async function handleStarboardConfigSubcommand(
  token: string,
  guildId: string,
  memberPerms: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** permission to configure starboard settings.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const channelId = getOption<string>(subOptions, 'channel');
  const minStars = getOption<number>(subOptions, 'min_stars');
  const selfStar = getOption<boolean>(subOptions, 'self_star');
  const emoji = getOption<string>(subOptions, 'emoji');
  const enabled = getOption<boolean>(subOptions, 'enabled');

  if (!channelId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please specify a target starboard channel.')],
      ephemeral: true,
    });
    return;
  }

  const updates: Partial<IStarboardConfig> = { channelId };
  if (minStars !== undefined) updates.minStars = minStars;
  if (selfStar !== undefined) updates.selfStar = selfStar;
  if (emoji !== undefined) updates.emoji = emoji;
  if (enabled !== undefined) updates.enabled = enabled;

  const config = await setStarboardConfig(guildId, updates);

  const embed: DiscordEmbed = {
    color: STARBOARD_COLOR,
    title: '⭐ Starboard Configured',
    description: `Successfully updated the Starboard Hall of Fame settings for this server.`,
    fields: [
      {
        name: 'Channel',
        value: `<#${config.channelId}>`,
        inline: true,
      },
      {
        name: 'Min Stars',
        value: `${config.minStars} ${config.emoji}`,
        inline: true,
      },
      {
        name: 'Self-Starring',
        value: config.selfStar ? 'Allowed' : 'Blocked',
        inline: true,
      },
      {
        name: 'Status',
        value: config.enabled ? 'Enabled' : 'Disabled',
        inline: true,
      },
      {
        name: 'Ignored Channels',
        value:
          config.ignoredChannels && config.ignoredChannels.length > 0
            ? config.ignoredChannels.map((c) => `<#${c}>`).join(', ')
            : 'None',
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  await editInteractionResponse(token, {
    embeds: [clampEmbed(embed)],
  });
}

// ─── Subcommand: /starboard ignore ────────────────────────────────────────────

export async function handleStarboardIgnoreSubcommand(
  token: string,
  guildId: string,
  memberPerms: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** permission to configure ignored starboard channels.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const channelId = getOption<string>(subOptions, 'channel');
  const remove = getOption<boolean>(subOptions, 'remove');

  if (!channelId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please specify a channel to ignore or unignore.')],
      ephemeral: true,
    });
    return;
  }

  const result = await toggleIgnoredChannel(guildId, channelId, remove);

  const embed = result.ignored
    ? successEmbed(
        'Channel Ignored',
        `Messages in <#${channelId}> will no longer be tracked or posted to the starboard.`,
      )
    : successEmbed(
        'Channel Unignored',
        `Messages in <#${channelId}> will now be tracked for the starboard.`,
      );

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

// ─── Subcommand: /starboard top ───────────────────────────────────────────────

export async function handleStarboardTopSubcommand(
  token: string,
  guildId: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const limit = getOption<number>(subOptions, 'limit') ?? 10;
  const topMessages = await getTopStarredMessages(guildId, limit);

  if (topMessages.length === 0) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          'Starboard Hall of Fame',
          'No starred messages found in this server yet! React with stars to celebrate great moments.',
        ),
      ],
    });
    return;
  }

  const lines = topMessages.map((msg, index) => {
    const badge = getStarBadge(msg.starCount);
    const jumpUrl = `https://discord.com/channels/${guildId}/${msg.originalChannelId}/${msg.originalMessageId}`;
    let snippet = msg.content?.trim();
    if (snippet && snippet.length > 50) {
      snippet = `${snippet.substring(0, 47)}...`;
    } else if (!snippet) {
      snippet = msg.attachments.length > 0 ? '*Attachment*' : '*No text content*';
    }

    return `**#${index + 1}** ${badge} **${msg.starCount}** by <@${msg.authorId}> — [Jump to message](${jumpUrl})\n> ${snippet}`;
  });

  const embed: DiscordEmbed = {
    color: STARBOARD_COLOR,
    title: '⭐ Starboard Community Hall of Fame',
    description: lines.join('\n\n'),
    footer: {
      text: `Showing top ${topMessages.length} starred message${topMessages.length === 1 ? '' : 's'}`,
    },
    timestamp: new Date().toISOString(),
  };

  await editInteractionResponse(token, {
    embeds: [clampEmbed(embed)],
  });
}

// ─── Subcommand: /starboard stats ─────────────────────────────────────────────

export async function handleStarboardStatsSubcommand(
  token: string,
  guildId: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(subOptions, 'user');

  if (targetUserId) {
    // Member specific stats
    const stats = await getAuthorStarStats(guildId, targetUserId);
    const topMsgLink = stats.topMessage
      ? `[Jump to top message (${stats.topMessage.starCount} ⭐)](https://discord.com/channels/${guildId}/${stats.topMessage.originalChannelId}/${stats.topMessage.originalMessageId})`
      : 'None yet';

    const embed: DiscordEmbed = {
      color: STARBOARD_COLOR,
      title: '⭐ Member Starboard Statistics',
      fields: [
        {
          name: 'Member',
          value: `<@${targetUserId}>`,
          inline: true,
        },
        {
          name: 'Total Stars Received',
          value: `⭐ **${stats.totalStars}**`,
          inline: true,
        },
        {
          name: 'Hall of Fame Entries',
          value: `🏆 **${stats.messageCount}**`,
          inline: true,
        },
        {
          name: 'Top Starred Message',
          value: topMsgLink,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await editInteractionResponse(token, {
      embeds: [clampEmbed(embed)],
    });
    return;
  }

  // Server-wide overview stats
  const serverStats = await getServerStarStats(guildId);
  const config = await getStarboardConfig(guildId);

  const topAuthorText = serverStats.topAuthor
    ? `<@${serverStats.topAuthor.authorId}> with **${serverStats.topAuthor.totalStars}** ⭐`
    : 'None yet';

  const embed: DiscordEmbed = {
    color: STARBOARD_COLOR,
    title: '⭐ Server Starboard Overview',
    fields: [
      {
        name: 'Starboard Channel',
        value: config?.channelId ? `<#${config.channelId}>` : '*Not configured*',
        inline: true,
      },
      {
        name: 'Hall of Fame Messages',
        value: `🏆 **${serverStats.totalStarredMessages}**`,
        inline: true,
      },
      {
        name: 'Total Stars Awarded',
        value: `⭐ **${serverStats.totalStarsGiven}**`,
        inline: true,
      },
      {
        name: 'Top Starred Member',
        value: topAuthorText,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  await editInteractionResponse(token, {
    embeds: [clampEmbed(embed)],
  });
}

// ─── RegisteredCommand Export ─────────────────────────────────────────────────

export const starboardCommand: RegisteredCommand = {
  name: 'starboard',
  description: 'Community Hall of Fame: celebrate the most popular messages in your server',
  category: 'community',
  options: [
    {
      name: 'config',
      description: 'Configure server starboard channel and star threshold',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'The channel where starboard messages will be posted',
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
        {
          name: 'min_stars',
          description: 'Minimum stars required to post (default: 3)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 100,
        },
        {
          name: 'self_star',
          description: 'Allow users to star their own messages (default: false)',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
        {
          name: 'emoji',
          description: 'Emoji to track for stars (default: ⭐)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'enabled',
          description: 'Enable or disable starboard in this server',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: 'top',
      description: 'View the highest-starred messages in the server Hall of Fame',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'limit',
          description: 'Number of top starred messages to show (default: 10)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 25,
        },
      ],
    },
    {
      name: 'stats',
      description: 'View starboard statistics for a member or the entire server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'Target member to view starboard stats for (defaults to server overview)',
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: 'ignore',
      description: 'Ignore or unignore a channel from starboard tracking',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Target channel to ignore or unignore',
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
        {
          name: 'remove',
          description: 'Set to true to unignore (allow) the channel, false to ignore',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
  ],
  execute: handleStarboardCommand,
};
