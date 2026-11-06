/**
 * src/commands/levels.ts
 * Slash Commands for Phase 23 Levels & XP Progression System.
 *
 * Implements:
 * - /rank [user]: Displays user's rank card (or target member).
 * - /leaderboard [page]: Displays server leaderboard with interactive pagination buttons.
 * - /level-rewards add <level> <role>: Adds a role reward.
 * - /level-rewards list: Displays configured role rewards.
 * - /level-rewards remove <level>: Removes a role reward.
 * - /level-config view / set: Configures announcement channel, DM notifications, and XP multipliers.
 *
 * RegisteredCommand compliant with category: 'levels'.
 */

import {
  ApplicationCommandOptionType,
  ChannelType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, infoEmbed } from '@/lib/discord/embeds';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  getUserRank,
  getLeaderboard,
  getLevelConfig,
  updateLevelConfig,
  configureLevelReward,
  removeLevelReward,
} from '@/lib/levels/xp-service';
import {
  buildRankCardEmbed,
  buildLeaderboardEmbed,
} from '@/lib/levels/level-embeds';
import type { DiscordActionRowComponent } from '@/lib/engines/pagination';

// Helper to extract option value
function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }> | undefined,
  name: string,
): T | undefined {
  if (!options) return undefined;
  const match = options.find((o) => o.name === name);
  return match ? (match.value as T) : undefined;
}

// ─── Pagination Button Builder ────────────────────────────────────────────

export function buildLeaderboardPaginationRow(
  currentPage: number,
  totalPages: number,
): DiscordActionRowComponent {
  const safePage = Math.max(1, currentPage);
  const safeTotal = Math.max(1, totalPages);
  const isFirst = safePage <= 1;
  const isLast = safePage >= safeTotal;

  return {
    type: 1, // ActionRow
    components: [
      {
        type: 2, // Button
        style: 2, // Secondary
        label: '«',
        custom_id: 'leaderboard:1',
        disabled: isFirst,
      },
      {
        type: 2,
        style: 2,
        label: '‹',
        custom_id: `leaderboard:${Math.max(1, safePage - 1)}`,
        disabled: isFirst,
      },
      {
        type: 2,
        style: 2,
        label: `${safePage} / ${safeTotal}`,
        custom_id: `leaderboard:${safePage}`,
        disabled: true,
      },
      {
        type: 2,
        style: 2,
        label: '›',
        custom_id: `leaderboard:${Math.min(safeTotal, safePage + 1)}`,
        disabled: isLast,
      },
      {
        type: 2,
        style: 2,
        label: '»',
        custom_id: `leaderboard:${safeTotal}`,
        disabled: isLast,
      },
    ],
  };
}

// ─── Interaction Handlers ─────────────────────────────────────────────────

export async function handleLeaderboardInteraction(
  token: string,
  guildId: string,
  targetPage: number,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const existingTitle = component.message?.embeds?.[0]?.title;
  let guildName = 'Server';
  if (existingTitle && existingTitle.includes(' — XP Leaderboard')) {
    guildName = existingTitle.replace('🏆 ', '').replace(' — XP Leaderboard', '').trim();
  }

  const { entries, page, totalPages } = await getLeaderboard(guildId, targetPage, 10);
  const embed = buildLeaderboardEmbed({ id: guildId, name: guildName }, entries, page, totalPages);
  const components = totalPages > 1 ? [buildLeaderboardPaginationRow(page, totalPages)] : [];

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

// ─── /rank Command ────────────────────────────────────────────────────────

export async function handleRankCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;

  const targetUserId =
    (getOption<string>(options, 'user')) ||
    (interaction.member?.user?.id ?? interaction.user?.id ?? '');

  const resolved = interaction.data.resolved as {
    users?: Record<string, { id: string; username: string; avatar?: string }>;
  } | undefined;

  const resolvedUser = resolved?.users?.[targetUserId];
  const fallbackUser = interaction.member?.user ?? interaction.user;

  const username =
    resolvedUser?.username ??
    (targetUserId === fallbackUser?.id ? fallbackUser?.username : 'Member') ??
    'Member';

  const avatar = resolvedUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${targetUserId}/${resolvedUser.avatar}.png`
    : undefined;

  const rankResult = await getUserRank(guildId, targetUserId);

  const embed = buildRankCardEmbed(
    {
      id: targetUserId,
      username,
      tag: username,
      avatar,
    },
    {
      rank: rankResult.rank,
      level: rankResult.levelData.level,
      xp: rankResult.userLevel?.xp ?? 0,
      xpIntoLevel: rankResult.levelData.xpIntoLevel,
      xpForNextLevel: rankResult.levelData.xpForNextLevel,
      progressPercent: rankResult.levelData.progressPercent,
      totalMessages: rankResult.userLevel?.totalMessages ?? 0,
      voiceSeconds: rankResult.userLevel?.voiceSeconds ?? 0,
    },
    { id: guildId, name: 'Server' },
  );

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

export const rankCommand: RegisteredCommand = {
  name: 'rank',
  description: "Display your or another member's XP level, rank, and progression",
  category: 'levels',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'user',
      description: 'The member whose rank you want to view (defaults to yourself)',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  execute: handleRankCommand,
};

// ─── /leaderboard Command ─────────────────────────────────────────────────

export async function handleLeaderboardCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;

  const requestedPage = getOption<number>(options, 'page') ?? 1;
  const page = Math.max(1, requestedPage);

  const { entries, totalPages } = await getLeaderboard(guildId, page, 10);
  const embed = buildLeaderboardEmbed({ id: guildId, name: 'Server' }, entries, page, totalPages);
  const components = totalPages > 1 ? [buildLeaderboardPaginationRow(page, totalPages)] : [];

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

export const leaderboardCommand: RegisteredCommand = {
  name: 'leaderboard',
  description: 'View the server XP and level leaderboard',
  category: 'levels',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'page',
      description: 'The leaderboard page number to display',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 1,
    },
  ],
  execute: handleLeaderboardCommand,
};

// ─── /level-rewards Command ───────────────────────────────────────────────

export async function handleLevelRewardsCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const options = interaction.data.options as Array<{
    name: string;
    options?: Array<{ name: string; value?: unknown }>;
  }> | undefined;

  const subcommand = options?.[0];
  const subOptions = subcommand?.options;

  switch (subcommand?.name) {
    case 'add': {
      const level = getOption<number>(subOptions, 'level');
      const roleId = getOption<string>(subOptions, 'role');

      if (!level || !roleId) {
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Invalid Arguments', 'Please specify both a target level and a role.')],
        });
        return;
      }

      const resolved = interaction.data.resolved as {
        roles?: Record<string, { id: string; name: string }>;
      } | undefined;
      const roleName = resolved?.roles?.[roleId]?.name ?? `Role ${roleId}`;

      await configureLevelReward(guildId, level, roleId, roleName);

      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Role Reward Configured',
            `Members reaching **Level ${level}** will now automatically receive the **${roleName}** (<@&${roleId}>) role!`,
          ),
        ],
      });
      break;
    }

    case 'list': {
      const config = await getLevelConfig(guildId);
      const rewards = config.levelRewards ?? [];

      if (rewards.length === 0) {
        await editInteractionResponse(token, {
          embeds: [
            infoEmbed(
              'No Role Rewards Configured',
              'This server has no level role rewards set yet.\nUse `/level-rewards add <level> <role>` to configure one!',
            ),
          ],
        });
        return;
      }

      const rewardLines = rewards
        .map((r) => `• **Level ${r.level}** ➔ <@&${r.roleId}> (\`${r.roleName}\`)`)
        .join('\n');

      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            '🏆 Configured Level Role Rewards',
            `When members level up, they automatically receive the following roles:\n\n${rewardLines}`,
          ),
        ],
      });
      break;
    }

    case 'remove': {
      const level = getOption<number>(subOptions, 'level');
      if (typeof level !== 'number') {
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Invalid Arguments', 'Please specify the level of the reward to remove.')],
        });
        return;
      }

      await removeLevelReward(guildId, level);

      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Role Reward Removed',
            `Successfully removed the role reward for **Level ${level}**.`,
          ),
        ],
      });
      break;
    }

    default: {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Subcommand', 'Please specify a valid subcommand: add, list, or remove.')],
      });
    }
  }
}

export const levelRewardsCommand: RegisteredCommand = {
  name: 'level-rewards',
  description: 'Manage automated role rewards for reaching levels',
  category: 'levels',
  default_member_permissions: PermissionFlags.MANAGE_ROLES.toString(),
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'add',
      description: 'Add or update an automated role reward for reaching a level',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'level',
          description: 'The level required to unlock this role',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
        },
        {
          name: 'role',
          description: 'The role to award to members',
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: 'list',
      description: 'Display all configured automated level role rewards',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'remove',
      description: 'Remove a role reward for a specific level',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'level',
          description: 'The level whose role reward should be removed',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
        },
      ],
    },
  ],
  execute: handleLevelRewardsCommand,
};

// ─── /level-config Command ────────────────────────────────────────────────

export async function handleLevelConfigCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const options = interaction.data.options as Array<{
    name: string;
    options?: Array<{ name: string; value?: unknown }>;
  }> | undefined;

  const subcommand = options?.[0];
  const subOptions = subcommand?.options;

  switch (subcommand?.name) {
    case 'view': {
      const config = await getLevelConfig(guildId);
      const channelText = config.announcementChannelId
        ? `<#${config.announcementChannelId}>`
        : '*Disabled (no announcement channel set)*';
      const dmText = config.dmNotifications ? 'Enabled ✅' : 'Disabled ❌';
      const multiplierText = `${config.xpMultiplier ?? 1.0}x`;
      const templateText = config.announcementTemplate
        ? `\`${config.announcementTemplate}\``
        : '*Default announcement template*';
      const ignoredChanText = config.ignoredChannels && config.ignoredChannels.length > 0
        ? config.ignoredChannels.map((c) => `<#${c}>`).join(', ')
        : '*None*';
      const ignoredRoleText = config.ignoredRoles && config.ignoredRoles.length > 0
        ? config.ignoredRoles.map((r) => `<@&${r}>`).join(', ')
        : '*None*';

      await editInteractionResponse(token, {
        embeds: [
          {
            title: '⚙️ Level Progression Configuration',
            color: 0x5865f2,
            fields: [
              { name: '📢 Announcement Channel', value: channelText, inline: true },
              { name: '📬 DM Notifications', value: dmText, inline: true },
              { name: '⚡ XP Multiplier', value: multiplierText, inline: true },
              { name: '📝 Level-Up Template', value: templateText, inline: false },
              { name: '🔇 Ignored Channels', value: ignoredChanText, inline: true },
              { name: '🚫 Ignored Roles', value: ignoredRoleText, inline: true },
            ],
            footer: { text: 'Use /level-config set to modify these settings' },
          },
        ],
      });
      break;
    }

    case 'set': {
      const channelId = getOption<string>(subOptions, 'channel');
      const dm = getOption<boolean>(subOptions, 'dm');
      const multiplier = getOption<number>(subOptions, 'multiplier');
      const template = getOption<string>(subOptions, 'template');

      if (
        channelId === undefined &&
        dm === undefined &&
        multiplier === undefined &&
        template === undefined
      ) {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed(
              'No Settings Provided',
              'Please provide at least one setting to update (channel, dm, multiplier, or template).',
            ),
          ],
        });
        return;
      }

      const updates: Record<string, unknown> = {};
      const changes: string[] = [];

      if (channelId !== undefined) {
        updates.announcementChannelId = channelId;
        changes.push(`• Announcement Channel: <#${channelId}>`);
      }
      if (dm !== undefined) {
        updates.dmNotifications = dm;
        changes.push(`• DM Notifications: ${dm ? 'Enabled' : 'Disabled'}`);
      }
      if (multiplier !== undefined) {
        updates.xpMultiplier = multiplier;
        changes.push(`• XP Multiplier: ${multiplier}x`);
      }
      if (template !== undefined) {
        updates.announcementTemplate = template;
        changes.push(`• Custom Template: \`${template}\``);
      }

      await updateLevelConfig(guildId, updates);

      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Level Configuration Updated',
            `Successfully updated the following settings:\n\n${changes.join('\n')}`,
          ),
        ],
      });
      break;
    }

    default: {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Subcommand', 'Please choose either `/level-config view` or `/level-config set`.')],
      });
    }
  }
}

export const levelConfigCommand: RegisteredCommand = {
  name: 'level-config',
  description: 'Configure level-up announcements, DM notifications, and XP multipliers',
  category: 'levels',
  default_member_permissions: PermissionFlags.MANAGE_GUILD.toString(),
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'view',
      description: 'View current level system configuration and active multipliers',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'set',
      description: 'Update level-up announcement channel, DM alerts, or XP multipliers',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'The channel to post level-up announcements in',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
          required: false,
        },
        {
          name: 'dm',
          description: 'Whether to send direct messages to users when they level up',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
        {
          name: 'multiplier',
          description: 'Server XP multiplier (e.g. 1.5, 2.0)',
          type: ApplicationCommandOptionType.Number,
          required: false,
          min_value: 0.1,
          max_value: 10.0,
        },
        {
          name: 'template',
          description: 'Custom level-up message template (supports {user.mention}, {level}, etc.)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
  ],
  execute: handleLevelConfigCommand,
};
