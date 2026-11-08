/**
 * src/commands/giveaway.ts
 * Interactive Giveaways & Raffles Slash Command & Component Handlers for AiCord.
 *
 * Subcommands:
 * - /giveaway start: starts a new giveaway (requires MANAGE_GUILD)
 * - /giveaway end: manually concludes a giveaway and draws winners (requires MANAGE_GUILD)
 * - /giveaway reroll: rerolls new winner(s) for an ended giveaway (requires MANAGE_GUILD)
 * - /giveaway list: lists active giveaways in the server (requires MANAGE_GUILD)
 *
 * Interactive Component Routing:
 * - handleGiveawayComponent(): handles gw_enter:<messageId> button toggle
 */

import {
  ApplicationCommandOptionType,
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
  clampEmbed,
  Colors,
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  createGiveaway,
  getGiveaway,
  listActiveGiveaways,
  enterGiveaway,
  endGiveaway,
  rerollGiveaway,
  parseDuration,
  buildGiveawayEmbed,
  buildEndedGiveawayEmbed,
  buildGiveawayComponents,
  isTestMode,
} from '@/lib/giveaways/giveaway-service';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleGiveawayCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const channelId = interaction.channel_id ?? '';
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const memberPerms = interaction.member?.permissions ?? '0';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  // Permission check: requires MANAGE_GUILD
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to manage giveaways.',
        ),
      ],
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
    case 'start':
      await handleGiveawayStart(token, guildId, channelId, userId, subOptions);
      break;

    case 'end':
      await handleGiveawayEnd(token, guildId, subOptions);
      break;

    case 'reroll':
      await handleGiveawayReroll(token, guildId, subOptions);
      break;

    case 'list':
      await handleGiveawayList(token, guildId);
      break;

    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /giveaway subcommand: "${subcommand?.name ?? 'unknown'}".`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Subcommand: /giveaway start ──────────────────────────────────────────────

export async function handleGiveawayStart(
  token: string,
  guildId: string,
  currentChannelId: string,
  userId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const prize = getOption<string>(options, 'prize');
  const durationStr = getOption<string>(options, 'duration');
  const winnersCount = Math.max(1, getOption<number>(options, 'winners') ?? 1);
  const targetChannelId = getOption<string>(options, 'channel') || currentChannelId;
  const minLevel = getOption<number>(options, 'min_level');
  const requiredRoleId = getOption<string>(options, 'required_role');

  if (!prize || !durationStr) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Arguments', 'Both **prize** and **duration** are required.')],
      ephemeral: true,
    });
    return;
  }

  let durationMs: number;
  try {
    durationMs = parseDuration(durationStr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid duration format';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Duration', msg)],
      ephemeral: true,
    });
    return;
  }

  try {
    let messageId: string | undefined;

    if (!isTestMode()) {
      const rest = getDiscordRest();

      // Post initial placeholder message to target channel to obtain Discord message ID
      const postRes = (await discordApiCall(() =>
        rest.post(Routes.channelMessages(targetChannelId), {
          body: {
            embeds: [
              clampEmbed({
                title: `🎉 GIVEAWAY: ${prize} 🎉`,
                description: 'Initializing giveaway...',
                color: Colors.PRIMARY,
              }),
            ],
          },
        }),
      )) as { id: string };

      messageId = postRes.id;

      // Register giveaway in database
      const giveaway = await createGiveaway({
        guildId,
        channelId: targetChannelId,
        hostId: userId,
        prize,
        durationMs,
        winnersCount,
        minLevel,
        requiredRoleId,
        messageId,
      });

      // Update message with final embed and interactive entry button
      await discordApiCall(() =>
        rest.patch(Routes.channelMessage(targetChannelId, messageId!), {
          body: {
            embeds: [buildGiveawayEmbed(giveaway)],
            components: buildGiveawayComponents(giveaway),
          },
        }),
      );
    } else {
      await createGiveaway({
        guildId,
        channelId: targetChannelId,
        hostId: userId,
        prize,
        durationMs,
        winnersCount,
        minLevel,
        requiredRoleId,
      });
    }

    const unixEnds = Math.floor((Date.now() + durationMs) / 1000);
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Giveaway Started!',
          `🎉 Giveaway for **${prize}** has been posted to <#${targetChannelId}>!\n⏳ **Ends:** <t:${unixEnds}:R> (<t:${unixEnds}:f>)\n🏆 **Winners:** ${winnersCount}`,
        ),
      ],
      ephemeral: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to start giveaway';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Giveaway Start Error', msg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /giveaway end ────────────────────────────────────────────────

export async function handleGiveawayEnd(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const messageId = getOption<string>(options, 'message_id');

  if (!messageId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'A giveaway **message_id** is required.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const { winners, giveaway } = await endGiveaway(guildId, messageId.trim());

    if (!isTestMode()) {
      const rest = getDiscordRest();
      try {
        await discordApiCall(() =>
          rest.patch(Routes.channelMessage(giveaway.channelId, giveaway.messageId), {
            body: {
              embeds: [buildEndedGiveawayEmbed(giveaway)],
              components: buildGiveawayComponents(giveaway),
            },
          }),
        );

        const announcement =
          winners.length > 0
            ? `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(', ')}! You won the giveaway for **${giveaway.prize}**!`
            : `The giveaway for **${giveaway.prize}** ended with no eligible entries.`;

        await discordApiCall(() =>
          rest.post(Routes.channelMessages(giveaway.channelId), {
            body: { content: announcement },
          }),
        );
      } catch (restErr) {
        console.error('[handleGiveawayEnd] REST Error:', restErr);
      }
    }

    const winnerMentions =
      winners.length > 0 ? winners.map((id) => `<@${id}>`).join(', ') : 'None';

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Giveaway Ended',
          `The giveaway for **${giveaway.prize}** has been concluded.\n🏆 **Winners:** ${winnerMentions}`,
        ),
      ],
      ephemeral: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to end giveaway';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('End Giveaway Failed', msg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /giveaway reroll ─────────────────────────────────────────────

export async function handleGiveawayReroll(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const messageId = getOption<string>(options, 'message_id');
  const count =
    getOption<number>(options, 'winners') ??
    getOption<number>(options, 'count') ??
    1;

  if (!messageId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'A giveaway **message_id** is required.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const { newWinners, giveaway } = await rerollGiveaway(
      guildId,
      messageId.trim(),
      count,
    );

    if (newWinners.length === 0) {
      await editInteractionResponse(token, {
        embeds: [
          warningEmbed(
            'Reroll Warning',
            `Could not pick new winners for **${giveaway.prize}**. There are no eligible entries.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (!isTestMode()) {
      const rest = getDiscordRest();
      try {
        await discordApiCall(() =>
          rest.patch(Routes.channelMessage(giveaway.channelId, giveaway.messageId), {
            body: {
              embeds: [buildEndedGiveawayEmbed(giveaway)],
              components: buildGiveawayComponents(giveaway),
            },
          }),
        );

        const announcement = `🎉 **REROLL!** Congratulations ${newWinners.map((id) => `<@${id}>`).join(', ')}! You won the reroll for **${giveaway.prize}**!`;

        await discordApiCall(() =>
          rest.post(Routes.channelMessages(giveaway.channelId), {
            body: { content: announcement },
          }),
        );
      } catch (restErr) {
        console.error('[handleGiveawayReroll] REST Error:', restErr);
      }
    }

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Giveaway Rerolled',
          `Rerolled **${newWinners.length}** new winner(s) for **${giveaway.prize}**!\n🏆 **New Winners:** ${newWinners.map((id) => `<@${id}>`).join(', ')}`,
        ),
      ],
      ephemeral: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reroll giveaway';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Reroll Failed', msg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /giveaway list ───────────────────────────────────────────────

export async function handleGiveawayList(
  token: string,
  guildId: string,
): Promise<void> {
  const giveaways = await listActiveGiveaways(guildId);

  if (giveaways.length === 0) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          'Active Giveaways',
          'There are no active giveaways running in this server. Use `/giveaway start` to create one!',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const lines = giveaways.map((g, idx) => {
    const unixEnds = Math.floor(new Date(g.endsAt).getTime() / 1000);
    const reqs: string[] = [];
    if (g.requirements?.minLevel) {
      reqs.push(`Level ${g.requirements.minLevel}+`);
    }
    if (g.requirements?.requiredRoleId) {
      reqs.push(`<@&${g.requirements.requiredRoleId}>`);
    }
    const reqText = reqs.length > 0 ? ` • Reqs: ${reqs.join(', ')}` : '';

    return (
      `**${idx + 1}. ${g.prize}** in <#${g.channelId}>\n` +
      `> ⏳ Ends: <t:${unixEnds}:R> • 🏆 Winners: **${g.winnersCount}** • 👥 Entries: **${g.entries.length}**${reqText}\n` +
      `> ID: \`${g.messageId}\``
    );
  });

  await editInteractionResponse(token, {
    embeds: [
      clampEmbed({
        title: `Active Giveaways (${giveaways.length})`,
        description: lines.join('\n\n'),
        color: Colors.PRIMARY,
        footer: {
          text: 'AiCord Giveaways • Use /giveaway end or reroll with message ID',
        },
      }),
    ],
    ephemeral: true,
  });
}

// ─── Component Router ─────────────────────────────────────────────────────────

export async function handleGiveawayComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const [action, messageId] = customId.split(':');

  if (action !== 'gw_enter' || !messageId) {
    return;
  }

  // Extract member roles
  const userRoles: string[] = component.member?.roles ?? [];

  // Extract member level from component mock or XP service
  let userLevel =
    (component as unknown as { memberLevel?: number }).memberLevel ?? 0;
  if (!userLevel && !isTestMode()) {
    try {
      const { getUserRank } = await import('@/lib/levels/xp-service');
      const rank = await getUserRank(guildId, userId);
      userLevel = rank.userLevel?.level ?? 0;
    } catch {
      userLevel = 0;
    }
  }

  const result = await enterGiveaway(
    guildId,
    messageId,
    userId,
    userLevel,
    userRoles,
  );

  // Update button counter on the giveaway message
  if (!isTestMode() && result.giveaway) {
    const rest = getDiscordRest();
    try {
      await discordApiCall(() =>
        rest.patch(
          Routes.channelMessage(result.giveaway!.channelId, result.giveaway!.messageId),
          {
            body: {
              components: buildGiveawayComponents(result.giveaway!),
            },
          },
        ),
      );
    } catch (restErr) {
      console.error(
        '[handleGiveawayComponent] REST Error updating message button:',
        restErr,
      );
    }
  }

  // Ephemeral confirmation response
  switch (result.status) {
    case 'entered':
      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Giveaway Entered',
            `🎉 You entered the giveaway for **${result.giveaway?.prize}**! Good luck! (Total entries: ${result.entryCount})`,
          ),
        ],
        ephemeral: true,
      });
      break;

    case 'left':
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'Giveaway Left',
            `👋 You left the giveaway for **${result.giveaway?.prize}**. (Total entries: ${result.entryCount})`,
          ),
        ],
        ephemeral: true,
      });
      break;

    case 'level_too_low':
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Level Requirement Not Met',
            `You must be at least Level ${result.giveaway?.requirements.minLevel} to enter this giveaway! (Your level: ${userLevel})`,
          ),
        ],
        ephemeral: true,
      });
      break;

    case 'missing_role':
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Role Requirement Not Met',
            `You must have the <@&${result.giveaway?.requirements.requiredRoleId}> role to enter this giveaway!`,
          ),
        ],
        ephemeral: true,
      });
      break;

    case 'ended':
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed('Giveaway Ended', 'This giveaway has already concluded.'),
        ],
        ephemeral: true,
      });
      break;

    case 'not_found':
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed('Giveaway Not Found', 'This giveaway could not be found.'),
        ],
        ephemeral: true,
      });
      break;
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const giveawayCommand: RegisteredCommand = {
  name: 'giveaway',
  description: 'Interactive Giveaways & Raffles suite management and controls',
  category: 'utility',
  default_member_permissions: PermissionFlags.MANAGE_GUILD.toString(),
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'start',
      description: 'Start a new interactive giveaway',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'prize',
          description: 'The prize to be given away',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 256,
        },
        {
          name: 'duration',
          description: 'Duration of the giveaway (e.g. 30s, 10m, 2h, 7d)',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 64,
        },
        {
          name: 'winners',
          description: 'Number of winners to draw (default: 1)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 50,
        },
        {
          name: 'channel',
          description: 'Channel to host the giveaway in (default: current channel)',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
        {
          name: 'min_level',
          description: 'Minimum level required to enter the giveaway',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
        },
        {
          name: 'required_role',
          description: 'Role required to enter the giveaway',
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
      ],
    },
    {
      name: 'end',
      description: 'Manually end an active giveaway and draw winners immediately',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'message_id',
          description: 'The message ID of the giveaway to end',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'reroll',
      description: 'Reroll new winner(s) for an ended giveaway',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'message_id',
          description: 'The message ID of the giveaway to reroll',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'winners',
          description: 'Number of new winners to draw (default: 1)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 50,
        },
      ],
    },
    {
      name: 'list',
      description: 'List all active giveaways in the server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
  ],
  execute: handleGiveawayCommand,
};
