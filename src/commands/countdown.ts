/**
 * src/commands/countdown.ts
 * Dynamic Real-Time Event Countdown Clocks Slash Commands & Component Handlers for AiCord.
 *
 * Subcommands:
 * - /countdown create: create a new dynamic real-time event countdown clock
 * - /countdown list: list active server countdowns sorted by nearest target date
 * - /countdown check: view live clock, time remaining, and progress bar for a countdown
 * - /countdown delete: delete a countdown (creator or moderator)
 *
 * Component Handler:
 * - handleCountdownComponent(): routes cd_refresh button actions to update countdown embed
 */

import {
  ApplicationCommandOptionType,
  ChannelType,
  Routes,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
  type APIEmbed,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import {
  successEmbed,
  errorEmbed,
  infoEmbed,
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  createCountdown,
  getCountdown,
  listCountdowns,
  deleteCountdown,
  calculateTimeRemaining,
  buildCountdownEmbed,
  buildCountdownComponents,
  isTestMode,
} from '@/lib/countdown/countdown-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown }>,
  name: string,
): T | undefined {
  return options?.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleCountdownCreateSubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
  options: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const userId = (interaction.member?.user?.id || interaction.user?.id)!;
  const currentChannelId = interaction.channel_id;

  const title = getOption<string>(options, 'title');
  const target = getOption<string>(options, 'target');
  const channel = getOption<string>(options, 'channel');
  const notifyRole = getOption<string>(options, 'notify_role');
  const description = getOption<string>(options, 'description');

  if (!title || !target) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Arguments', 'Both **title** and **target** are required.')],
      ephemeral: true,
    });
    return;
  }

  const targetChannelId = channel || currentChannelId;

  try {
    const countdown = await createCountdown({
      guildId,
      channelId: targetChannelId,
      creatorId: userId,
      title,
      targetInput: target,
      description,
      notifyRoleId: notifyRole,
    });

    const embed = buildCountdownEmbed(countdown);
    const components = buildCountdownComponents(countdown.countdownId);

    if (!isTestMode() && channel && channel !== currentChannelId) {
      // Post to the target channel via REST API
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.post(Routes.channelMessages(targetChannelId), {
            body: { embeds: [embed], components },
          }),
        );
      } catch (restErr) {
        console.error('[Countdown] Failed to post countdown embed to target channel:', restErr);
      }

      const targetUnix = Math.floor(countdown.targetDate.getTime() / 1000);
      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Countdown Created!',
            `⏳ Countdown for **${countdown.title}** has been posted to <#${targetChannelId}>!\n` +
              `🎯 **Target:** <t:${targetUnix}:F> (<t:${targetUnix}:R>)\n` +
              `🆔 **ID:** \`${countdown.countdownId}\``,
          ),
        ],
      });
      return;
    }

    // Default: respond directly with the interactive countdown clock
    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create countdown.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Countdown Creation Failed', msg)],
      ephemeral: true,
    });
  }
}

export async function handleCountdownListSubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id!;
  const token = interaction.token;

  try {
    const countdowns = await listCountdowns(guildId, false);

    if (countdowns.length === 0) {
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'Active Countdowns',
            'There are no active countdowns in this server.\nUse `/countdown create` to set one up!',
          ),
        ],
      });
      return;
    }

    const lines = countdowns.slice(0, 15).map((cd) => {
      const targetUnix = Math.floor(new Date(cd.targetDate).getTime() / 1000);
      const rem = calculateTimeRemaining(new Date(cd.targetDate));
      return (
        `• **${cd.title}** (\`${cd.countdownId}\`)\n` +
        `  🎯 <t:${targetUnix}:R> (<t:${targetUnix}:f>) • Channel: <#${cd.channelId}>\n` +
        `  ⏱️ \`${rem.days}d ${rem.hours}h ${rem.minutes}m ${rem.seconds}s\` remaining`
      );
    });

    const embed: APIEmbed = {
      title: `⏳ Active Server Countdowns (${countdowns.length})`,
      description: lines.join('\n\n'),
      color: 0x5865f2,
      footer: {
        text: 'Use /countdown check id:<ID> to view the full interactive clock',
      },
    };

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list countdowns.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to List Countdowns', msg)],
      ephemeral: true,
    });
  }
}

export async function handleCountdownCheckSubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
  options: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const id = getOption<string>(options, 'id');

  if (!id) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please provide a countdown ID.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const countdown = await getCountdown(guildId, id);
    if (!countdown) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Countdown Not Found',
            `No countdown found with ID \`${id}\`. Use \`/countdown list\` to view active countdowns.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = buildCountdownEmbed(countdown);
    const components = buildCountdownComponents(countdown.countdownId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to check countdown.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', msg)],
      ephemeral: true,
    });
  }
}

export async function handleCountdownDeleteSubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
  options: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const userId = (interaction.member?.user?.id || interaction.user?.id)!;
  const id = getOption<string>(options, 'id');

  if (!id) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please provide a countdown ID.')],
      ephemeral: true,
    });
    return;
  }

  const memberPerms = (interaction.member?.permissions as string) || '0';
  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.MANAGE_MESSAGES) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  try {
    const deleted = await deleteCountdown(guildId, id, userId, isMod);
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Countdown Deleted',
          `Successfully deleted countdown **${deleted.title}** (\`${deleted.countdownId}\`).`,
        ),
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete countdown.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Delete Failed', msg)],
      ephemeral: true,
    });
  }
}

// ─── Main Slash Command Router ────────────────────────────────────────────────

export async function handleCountdownCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id;

  if (!guildId || !userId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed('Server Required', 'The /countdown command can only be used within a server.'),
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
  const subOptions = (subcommand?.options || []) as Array<{ name: string; value?: unknown }>;

  switch (subName) {
    case 'create':
      await handleCountdownCreateSubcommand(interaction, subOptions);
      break;
    case 'list':
      await handleCountdownListSubcommand(interaction);
      break;
    case 'check':
      await handleCountdownCheckSubcommand(interaction, subOptions);
      break;
    case 'delete':
      await handleCountdownDeleteSubcommand(interaction, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Subcommand', `Subcommand "${subName}" is not recognized.`)],
      });
      break;
  }
}

// ─── Interactive Component Handler ────────────────────────────────────────────

export async function handleCountdownComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  if (customId.startsWith('cd_refresh:')) {
    const countdownId = customId.split(':')[1];
    const countdown = await getCountdown(guildId, countdownId);

    if (!countdown) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Countdown Not Found',
            'This countdown was not found or may have been deleted.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = buildCountdownEmbed(countdown);
    const components = buildCountdownComponents(countdown.countdownId);

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
  }
}

// ─── Command Registration Definition ──────────────────────────────────────────

export const countdownCommand: RegisteredCommand = {
  name: 'countdown',
  description: 'Dynamic real-time event countdown clocks and visual timers',
  category: 'utility',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  execute: handleCountdownCommand,
  options: [
    {
      name: 'create',
      description: 'Create a new real-time event countdown clock',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'title',
          description: 'Event title / milestone name (1-100 characters)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'target',
          description: 'Target date (e.g. 30m, 2h, 3d, 1w or ISO 2026-12-31T00:00:00Z)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'channel',
          description: 'Channel to post countdown in (defaults to current channel)',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
          required: false,
        },
        {
          name: 'notify_role',
          description: 'Role to notify when event countdown reaches zero',
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
        {
          name: 'description',
          description: 'Additional event details or description (max 1000 characters)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'list',
      description: 'List active event countdowns in this server',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'check',
      description: 'Check status and time remaining for a specific countdown',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'id',
          description: 'Countdown ID (e.g. cd-XXXX)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'delete',
      description: 'Delete an event countdown (creator or moderator)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'id',
          description: 'Countdown ID (e.g. cd-XXXX)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
};
