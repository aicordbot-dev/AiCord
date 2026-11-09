/**
 * src/commands/clip.ts
 * Community Gaming Clip Competitions & Interactive Highlights Suite for AiCord.
 *
 * Subcommands:
 * - /clip submit: submit a highlight clip to the competition
 * - /clip leaderboard: view weekly top rated gaming clips
 * - /clip crown: crown the weekly winner and award champion role (Admin/Mod)
 * - /clip config: set competition channel, champion role, and enabled toggle (Admin/Mod)
 *
 * Interactive Component Handler:
 * - handleClipComponent: handles clip_vote:<clipId>:<voteType> button interactions
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
  infoEmbed,
  warningEmbed,
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  submitClip,
  getClip,
  voteClip,
  getClipLeaderboard,
  crownWeeklyChampion,
  getClipContestConfig,
  updateClipContestConfig,
  buildClipEmbed,
  buildClipComponents,
  buildChampionEmbed,
  buildLeaderboardEmbed,
  getCurrentWeekString,
  isTestMode,
} from '@/lib/clips/clip-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown }>,
  name: string,
): T | undefined {
  return options?.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleClipSubmitSubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
  options: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const user = interaction.member?.user || interaction.user;
  const userId = user?.id || '';
  const userTag = user?.username || 'Member';
  const currentChannelId = interaction.channel_id;

  const config = await getClipContestConfig(guildId);
  if (config && config.enabled === false) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Contest Disabled',
          'Community gaming clip competitions are currently disabled in this server.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const title = getOption<string>(options, 'title');
  const url = getOption<string>(options, 'url');
  const game = getOption<string>(options, 'game');

  if (!title || !url) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Arguments', 'Both **title** and **url** are required.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const clip = await submitClip({
      guildId,
      userId,
      userTag,
      title,
      clipUrl: url,
      game,
    });

    const embed = buildClipEmbed(clip);
    const components = buildClipComponents(clip);

    // If config defines a dedicated submissions channel and not in test mode, post there
    if (!isTestMode() && config?.channelId && config.channelId !== currentChannelId) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.post(Routes.channelMessages(config.channelId), {
            body: { embeds: [embed], components },
          }),
        );

        await editInteractionResponse(token, {
          embeds: [
            successEmbed(
              'Clip Submitted!',
              `Your clip **"${clip.title}"** has been posted to <#${config.channelId}>! Go check it out and vote! 🎬`,
            ),
          ],
          ephemeral: true,
        });
        return;
      } catch (err) {
        console.warn('[handleClipSubmitSubcommand] Failed to post clip to designated channel:', err);
      }
    }

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit clip.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Submission Error', message)],
      ephemeral: true,
    });
  }
}

export async function handleClipLeaderboardSubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
  options: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const guildId = interaction.guild_id!;
  const token = interaction.token;

  const rawWeek = getOption<string>(options, 'week');
  const week = rawWeek || getCurrentWeekString();
  const rawLimit = getOption<number>(options, 'limit');
  const limit = Math.min(Math.max(rawLimit ?? 10, 1), 25);

  try {
    const clips = await getClipLeaderboard(guildId, week, limit);
    const embed = buildLeaderboardEmbed(week, clips);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve leaderboard.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Leaderboard Error', message)],
      ephemeral: true,
    });
  }
}

export async function handleClipCrownSubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
  options: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const memberPerms = interaction.member?.permissions || '0';

  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to crown weekly champions.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const rawWeek = getOption<string>(options, 'week');
  const week = rawWeek || getCurrentWeekString();

  try {
    const { championClip, championRoleId } = await crownWeeklyChampion(guildId, week);

    if (!championClip) {
      await editInteractionResponse(token, {
        embeds: [
          warningEmbed(
            'No Eligible Clips',
            `No clips with a positive score (> 0 pts) were found for **Week ${week}** to crown as champion.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    // Award champion role via REST if configured and not testMode
    if (!isTestMode() && championRoleId) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.put(Routes.guildMemberRole(guildId, championClip.userId, championRoleId)),
        );
      } catch (roleErr) {
        console.warn('[handleClipCrownSubcommand] Failed to grant champion role:', roleErr);
      }
    }

    const embed = buildChampionEmbed(championClip, championRoleId);
    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to crown weekly champion.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Crowning Error', message)],
      ephemeral: true,
    });
  }
}

export async function handleClipConfigSubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
  options: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const memberPerms = interaction.member?.permissions || '0';

  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to configure clip competitions.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const channel = getOption<string>(options, 'channel');
  const championRole = getOption<string>(options, 'champion_role');
  const enabled = getOption<boolean>(options, 'enabled');

  const updates: Partial<{
    channelId: string;
    championRoleId?: string;
    enabled: boolean;
  }> = {};

  if (channel !== undefined) updates.channelId = channel;
  if (championRole !== undefined) updates.championRoleId = championRole;
  if (enabled !== undefined) updates.enabled = enabled;

  try {
    const config = await updateClipContestConfig(guildId, updates);

    const description = [
      'Clip competition configuration has been updated:',
      '',
      `📢 **Clip Channel:** ${config.channelId ? `<#${config.channelId}>` : '*Current Channel*'}`,
      `👑 **Champion Role:** ${config.championRoleId ? `<@&${config.championRoleId}>` : '*None set*'}`,
      `⚡ **Contest Enabled:** ${config.enabled ? '✅ Yes' : '❌ No'}`,
    ].join('\n');

    await editInteractionResponse(token, {
      embeds: [successEmbed('Clip Competition Configuration', description)],
      ephemeral: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update configuration.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Configuration Error', message)],
      ephemeral: true,
    });
  }
}

// ─── Main Slash Command Router ────────────────────────────────────────────────

export async function handleClipCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Server Only',
          'Community Gaming Clip Competitions can only be used within a server.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const options = interaction.data?.options || [];
  const subcommand = options[0] as
    | { name: string; options?: Array<{ name: string; value?: unknown }> }
    | undefined;

  const subName = subcommand?.name;
  const subOptions = (subcommand?.options || []) as Array<{ name: string; value?: unknown }>;

  switch (subName) {
    case 'submit':
      await handleClipSubmitSubcommand(interaction, subOptions);
      break;
    case 'leaderboard':
      await handleClipLeaderboardSubcommand(interaction, subOptions);
      break;
    case 'crown':
      await handleClipCrownSubcommand(interaction, subOptions);
      break;
    case 'config':
      await handleClipConfigSubcommand(interaction, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Subcommand', `Subcommand "${subName}" is not recognized.`)],
        ephemeral: true,
      });
      break;
  }
}

// ─── Interactive Component Handler ────────────────────────────────────────────

export async function handleClipComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component?: APIMessageComponentInteraction,
): Promise<void> {
  const parts = customId.split(':');
  if (parts.length !== 3 || parts[0] !== 'clip_vote') {
    return;
  }

  const clipId = parts[1];
  const voteType = parts[2] as 'fire' | 'smart' | 'fail';

  if (!['fire', 'smart', 'fail'].includes(voteType)) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Vote', 'Invalid voting category.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const { clip, toggledOn, totalScore } = await voteClip(
      guildId,
      clipId,
      userId,
      voteType,
    );

    const voteLabels: Record<string, string> = {
      fire: 'Fire Play 🔥 (+2 pts)',
      smart: '200 IQ 🧠 (+3 pts)',
      fail: 'Funny Fail 💀 (+1 pt)',
    };
    const label = voteLabels[voteType] || voteType;

    // Update message button counters and embed via REST if available
    const msgChannelId = component?.channel_id ?? component?.message?.channel_id;
    const msgId = component?.message?.id;

    if (!isTestMode() && msgChannelId && msgId) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.patch(Routes.channelMessage(msgChannelId, msgId), {
            body: {
              embeds: [buildClipEmbed(clip)],
              components: buildClipComponents(clip),
            },
          }),
        );
      } catch (patchErr) {
        console.warn('[handleClipComponent] REST Error updating clip buttons:', patchErr);
      }
    }

    if (toggledOn) {
      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Vote Recorded!',
            `You voted **${label}** on **${clip.title}**!\nTotal score is now **${totalScore} pts**.`,
          ),
        ],
        ephemeral: true,
      });
    } else {
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'Vote Retracted',
            `You removed your **${label}** vote on **${clip.title}**.\nTotal score is now **${totalScore} pts**.`,
          ),
        ],
        ephemeral: true,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cast vote.';
    if (message.includes('own clip')) {
      await editInteractionResponse(token, {
        embeds: [warningEmbed('Self-Vote Restricted', message)],
        ephemeral: true,
      });
    } else {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Voting Error', message)],
        ephemeral: true,
      });
    }
  }
}

// ─── Command Registration Definition ──────────────────────────────────────────

export const clipCommand: RegisteredCommand = {
  name: 'clip',
  description: 'Community Gaming Clip Competitions & Highlights',
  category: 'fun',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  execute: handleClipCommand,
  options: [
    {
      name: 'submit',
      description: 'Submit a gaming highlight clip to the competition',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'title',
          description: 'Title of the clip (1-100 characters)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'url',
          description: 'URL to clip (YouTube, Twitch, Streamable, Medal.tv, Discord, .mp4)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'game',
          description: 'Game title (e.g. Valorant, Rocket League, CS2, Fortnite)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'leaderboard',
      description: 'View the top gaming clips and scores for a competition week',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'week',
          description: 'Week code (e.g. 2026-W45, defaults to current week)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'limit',
          description: 'Number of clips to display (default: 10, max: 25)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
      ],
    },
    {
      name: 'crown',
      description: 'Crown the weekly champion clip and award champion role (Admin/Mod)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'week',
          description: 'Week code to crown (defaults to current week)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'config',
      description: 'Configure clip competition channel and champion role (Admin/Mod)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Channel where clip submissions and announcements are posted',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
          required: false,
        },
        {
          name: 'champion_role',
          description: 'Role granted to weekly clip champions',
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
        {
          name: 'enabled',
          description: 'Enable or disable clip competitions',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
  ],
};
