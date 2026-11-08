/**
 * src/commands/confess.ts
 * Anonymous Confessions & Mutual Matchmaker Slash Commands & Component Handlers for AiCord.
 *
 * Subcommands:
 * - /confess send: anonymously submit a confession to the server with reaction buttons
 * - /confess crush: secretly record a crush on a server member (celebratory DM/ephemeral on mutual match)
 * - /confess config: configure channel, profanity filtering, and service status (requires MANAGE_GUILD)
 * - /confess top: view server's top-voted confessions
 *
 * Interactive Component Routing:
 * - handleConfessionComponent(): handles confess_vote:<confessionId>:<voteType> button interactions
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
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  submitConfession,
  registerCrush,
  getConfessionConfig,
  setConfessionConfig,
  getTopConfessions,
  voteConfession,
  buildConfessionEmbed,
  buildConfessionComponents,
  isTestMode,
  VOTE_LABELS,
  type ConfessionVoteType,
} from '@/lib/confessions/confession-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleConfessSendSubcommand(
  guildId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const content = getOption<string>(subOptions, 'message') || '';
  const replyToId = getOption<number>(subOptions, 'reply_to');

  const config = await getConfessionConfig(guildId);
  if (!config.enabled) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Confessions Disabled',
          'Anonymous confessions are currently disabled in this server.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (!config.channelId) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Channel Not Configured',
          'The confessions channel has not been set up yet. Ask an admin to run `/confess config channel:#channel`.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    const confession = await submitConfession(guildId, content, replyToId);
    const confessionEmbed = buildConfessionEmbed(confession);
    const confessionComponents = buildConfessionComponents(confession);

    // Post to confession channel via Discord REST if not in test mode
    if (!isTestMode()) {
      const rest = getDiscordRest();
      await discordApiCall(() =>
        rest.post(Routes.channelMessages(config.channelId), {
          body: {
            embeds: [confessionEmbed],
            components: confessionComponents,
          },
        }),
      );
    }

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Confession Sent 💌',
          `Your anonymous confession **#${confession.confessionId}** has been posted to <#${config.channelId}>!`,
        ),
      ],
      ephemeral: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit confession.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Submission Error', message)],
      ephemeral: true,
    });
  }
}

export async function handleConfessCrushSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const crushUserId = getOption<string>(subOptions, 'user');

  if (!crushUserId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'Please specify a valid member for your crush.')],
      ephemeral: true,
    });
    return;
  }

  if (crushUserId === userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Crush', 'You cannot set a crush on yourself!')],
      ephemeral: true,
    });
    return;
  }

  try {
    const result = await registerCrush(guildId, userId, crushUserId);

    if (result.isMatch) {
      // Mutual Match celebration!
      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            '💘 Mutual Crush Match!',
            `**OMG! It\'s a Match!** 🎉\n\nYou and <@${crushUserId}> have both confessed a crush on each other!\n\nDon\'t be shy — go ahead and say hello! 💕`,
          ),
        ],
        ephemeral: true,
      });

      // Try delivering notification DM to the matched user if not in test mode
      if (!isTestMode()) {
        try {
          const rest = getDiscordRest();
          const dmChannel = (await discordApiCall(() =>
            rest.post(Routes.userChannels(), {
              body: { recipient_id: crushUserId },
            }),
          )) as { id: string };

          if (dmChannel?.id) {
            await discordApiCall(() =>
              rest.post(Routes.channelMessages(dmChannel.id), {
                body: {
                  embeds: [
                    successEmbed(
                      '💘 Mutual Crush Match!',
                      `**Congratulations! It\'s a Match!** 🎉\n\nYou and <@${userId}> have both confessed a crush on each other in the server! 💕`,
                    ),
                  ],
                },
              }),
            );
          }
        } catch {
          // Silently ignore DM errors (user may have DMs closed)
        }
      }
    } else {
      // Unilateral crush recorded securely
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'Secret Crush Recorded 💖',
            `Your secret crush on <@${crushUserId}> has been privately stored! 🔒\n\nNobody else can see this. If <@${crushUserId}> also runs \`/confess crush\` and selects you, both of you will receive a match celebration! ✨`,
          ),
        ],
        ephemeral: true,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record crush.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', message)],
      ephemeral: true,
    });
  }
}

export async function handleConfessConfigSubcommand(
  guildId: string,
  token: string,
  memberPerms: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to configure confessions.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const channelId = getOption<string>(subOptions, 'channel');
  const filterProfanity = getOption<boolean>(subOptions, 'filter_profanity');
  const enabled = getOption<boolean>(subOptions, 'enabled');

  const updates: Partial<{
    channelId: string;
    filterProfanity: boolean;
    enabled: boolean;
  }> = {};

  if (channelId !== undefined) updates.channelId = channelId;
  if (filterProfanity !== undefined) updates.filterProfanity = filterProfanity;
  if (enabled !== undefined) updates.enabled = enabled;

  const config =
    Object.keys(updates).length > 0
      ? await setConfessionConfig(guildId, updates)
      : await getConfessionConfig(guildId);

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        'Confessions Configuration',
        `Anonymous confessions settings for this server:\n\n` +
          `• **Channel:** ${config.channelId ? `<#${config.channelId}>` : '*Not configured*'}\n` +
          `• **Profanity Filter:** ${config.filterProfanity ? '✅ Enabled' : '❌ Disabled'}\n` +
          `• **Status:** ${config.enabled ? '✅ Active' : '❌ Disabled'}`,
      ),
    ],
    ephemeral: true,
  });
}

export async function handleConfessTopSubcommand(
  guildId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const limit = getOption<number>(subOptions, 'limit') ?? 5;
  const confessions = await getTopConfessions(guildId, limit);

  if (confessions.length === 0) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          'No Confessions Yet',
          'There are no approved confessions in this server yet.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const fields = confessions.map((c, index) => {
    const wholesome = c.votes?.wholesome?.length || 0;
    const funny = c.votes?.funny?.length || 0;
    const redFlag = c.votes?.redFlag?.length || 0;
    const total = wholesome + funny + redFlag;
    const truncated =
      c.content.length > 100 ? `${c.content.slice(0, 97)}...` : c.content;

    return {
      name: `#${index + 1} • Confession #${c.confessionId} (${total} total votes)`,
      value: `"${truncated}"\n❤️ ${wholesome} | 😂 ${funny} | 🚩 ${redFlag}`,
      inline: false,
    };
  });

  await editInteractionResponse(token, {
    embeds: [
      {
        title: '🏆 Top Server Confessions',
        description: `Here are the top ${confessions.length} confessions ranked by total community reactions:`,
        fields,
        color: 0xff75a0,
      },
    ],
  });
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleConfessCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
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
          options?: Array<{ name: string; value?: unknown }>;
        }>;
      }
    )?.options ?? [];

  const subcommand = options[0];
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'send':
      await handleConfessSendSubcommand(guildId, token, subOptions);
      break;
    case 'crush':
      await handleConfessCrushSubcommand(guildId, userId, token, subOptions);
      break;
    case 'config':
      await handleConfessConfigSubcommand(guildId, token, memberPerms, subOptions);
      break;
    case 'top':
      await handleConfessTopSubcommand(guildId, token, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Command', 'Unknown confession subcommand.')],
        ephemeral: true,
      });
      break;
  }
}

// ─── Component Interaction Handler ────────────────────────────────────────────

export async function handleConfessionComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const parts = customId.split(':');
  if (parts.length !== 3 || parts[0] !== 'confess_vote') {
    return;
  }

  const confessionId = parseInt(parts[1], 10);
  const voteType = parts[2] as ConfessionVoteType;

  if (isNaN(confessionId) || !['wholesome', 'funny', 'redFlag'].includes(voteType)) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'Invalid confession voting action.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const updated = await voteConfession(guildId, confessionId, userId, voteType);

    // Update message button counters via REST if not in test mode
    const channelId = component.channel_id ?? component.message?.channel_id;
    const messageId = component.message?.id;

    if (!isTestMode() && channelId && messageId) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.patch(Routes.channelMessage(channelId, messageId), {
            body: {
              components: buildConfessionComponents(updated),
            },
          }),
        );
      } catch (patchErr) {
        console.error(
          '[handleConfessionComponent] REST Error updating vote buttons:',
          patchErr,
        );
      }
    }

    const voteMeta = VOTE_LABELS[voteType] || { label: voteType, emoji: '✨' };

    if (updated.toggledOn) {
      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Vote Recorded',
            `You voted **${voteMeta.emoji} ${voteMeta.label}** on Confession #${confessionId}!`,
          ),
        ],
        ephemeral: true,
      });
    } else {
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'Vote Removed',
            `You removed your **${voteMeta.emoji} ${voteMeta.label}** vote on Confession #${confessionId}.`,
          ),
        ],
        ephemeral: true,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record vote.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Vote Error', message)],
      ephemeral: true,
    });
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const confessCommand: RegisteredCommand = {
  name: 'confess',
  description: 'Anonymous confessions and mutual crush matchmaking',
  category: 'fun',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 15_000 },
  options: [
    {
      name: 'send',
      description: 'Submit an anonymous confession to the server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'message',
          description: 'Your anonymous confession (10-1000 characters)',
          type: ApplicationCommandOptionType.String,
          required: true,
          min_length: 10,
          max_length: 1000,
        },
        {
          name: 'reply_to',
          description: 'ID of confession you are replying to',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
        },
      ],
    },
    {
      name: 'crush',
      description: 'Secretly register a crush on a server member (only reveals if mutual!)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The member you have a secret crush on',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: 'config',
      description: 'Configure anonymous confessions settings (Admin only)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Channel where anonymous confessions are posted',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
        {
          name: 'filter_profanity',
          description: 'Whether to automatically filter profanity',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
        {
          name: 'enabled',
          description: 'Enable or disable anonymous confessions',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: 'top',
      description: 'View the most popular confessions in the server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'limit',
          description: 'Number of top confessions to display (default: 5)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 25,
        },
      ],
    },
  ],
  execute: handleConfessCommand,
};
