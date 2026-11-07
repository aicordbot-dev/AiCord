/**
 * src/commands/tickets.ts
 * Interactive Ticket Hub Slash Command & Component Handlers for AiCord.
 *
 * Subcommands:
 * - /ticket panel: creates a ticket panel (requires MANAGE_GUILD)
 * - /ticket close [reason]: closes the current ticket
 * - /ticket add <user>: adds member to current ticket channel permissions
 * - /ticket remove <user>: removes member from current ticket channel permissions
 * - /ticket stats: shows server ticket statistics
 *
 * Interactive Component Routing:
 * - handleTicketComponent(): routes ticket_create, ticket_claim, ticket_close, and ticket_rate
 */

import {
  ApplicationCommandOptionType,
  Routes,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, clampEmbed } from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  createTicketPanel,
  buildTicketPanelEmbed,
  openTicket,
  claimTicket,
  closeTicket,
  rateTicket,
  getTicketStats,
  buildTicketStatsEmbed,
  getTicketByChannel,
  updateTicketChannelId,
  isTestMode,
} from '@/lib/tickets/ticket-service';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleTicketCommand(
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

  const options = (interaction.data as { options?: Array<{ name: string; options?: Array<{ name: string; value: unknown }> }> })?.options ?? [];
  const subcommand = options[0];
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'panel':
      await handleTicketPanelSubcommand(token, guildId, channelId, memberPerms, subOptions);
      break;
    case 'close':
      await handleTicketCloseSubcommand(token, guildId, channelId, userId, subOptions);
      break;
    case 'add':
      await handleTicketAddSubcommand(token, guildId, channelId, subOptions);
      break;
    case 'remove':
      await handleTicketRemoveSubcommand(token, guildId, channelId, subOptions);
      break;
    case 'stats':
      await handleTicketStatsSubcommand(token, guildId);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /ticket subcommand: "${subcommand?.name ?? 'unknown'}".`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Subcommand: /ticket panel ────────────────────────────────────────────────

export async function handleTicketPanelSubcommand(
  token: string,
  guildId: string,
  channelId: string,
  memberPerms: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to create a ticket panel.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const title = getOption<string>(options, 'title') ?? 'Support Ticket Hub';
  const description =
    getOption<string>(options, 'description') ??
    'Need assistance? Click a button below to open a private ticket with our staff team.';
  const categoryId = getOption<string>(options, 'category');
  const supportRoleId = getOption<string>(options, 'support_role');
  const logChannelId = getOption<string>(options, 'log_channel');

  const supportRoleIds = supportRoleId ? [supportRoleId] : [];

  try {
    const panel = await createTicketPanel(guildId, {
      title,
      description,
      channelId,
      categoryId,
      supportRoleIds,
      logChannelId,
    });

    const { embed, components } = buildTicketPanelEmbed(panel);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Create Panel', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /ticket close ────────────────────────────────────────────────

export async function handleTicketCloseSubcommand(
  token: string,
  guildId: string,
  channelId: string,
  userId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const reason = getOption<string>(options, 'reason') ?? 'Closed via /ticket close';

  const ticket = await getTicketByChannel(guildId, channelId);
  if (!ticket) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Not a Ticket Channel',
          'This command can only be used inside an active ticket channel.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (ticket.status === 'closed') {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Already Closed', `Ticket **${ticket.ticketId}** is already closed.`)],
      ephemeral: true,
    });
    return;
  }

  try {
    const result = await closeTicket(guildId, ticket.ticketId, userId, reason);

    await editInteractionResponse(token, {
      embeds: [result.embed],
      components: [result.ratingRow],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Close Ticket', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /ticket add ──────────────────────────────────────────────────

export async function handleTicketAddSubcommand(
  token: string,
  guildId: string,
  channelId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(options, 'user');
  if (!targetUserId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please specify a user to add to the ticket.')],
      ephemeral: true,
    });
    return;
  }

  const ticket = await getTicketByChannel(guildId, channelId);
  if (!ticket) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Not a Ticket Channel',
          'This command can only be used inside an active ticket channel.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    if (!isTestMode()) {
      const rest = getDiscordRest();
      await discordApiCall(() =>
        rest.put(Routes.channelPermission(channelId, targetUserId), {
          body: {
            type: 1, // Member
            allow: (
              PermissionFlags.VIEW_CHANNEL |
              PermissionFlags.SEND_MESSAGES |
              PermissionFlags.READ_MESSAGE_HISTORY |
              PermissionFlags.EMBED_LINKS |
              PermissionFlags.ATTACH_FILES
            ).toString(),
            deny: '0',
          },
        }),
      );
    }

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Member Added',
          `<@${targetUserId}> has been granted access to this ticket channel.`,
        ),
      ],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update channel permissions';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Add Member', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /ticket remove ───────────────────────────────────────────────

export async function handleTicketRemoveSubcommand(
  token: string,
  guildId: string,
  channelId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(options, 'user');
  if (!targetUserId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please specify a user to remove from the ticket.')],
      ephemeral: true,
    });
    return;
  }

  const ticket = await getTicketByChannel(guildId, channelId);
  if (!ticket) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Not a Ticket Channel',
          'This command can only be used inside an active ticket channel.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    if (!isTestMode()) {
      const rest = getDiscordRest();
      await discordApiCall(() =>
        rest.delete(Routes.channelPermission(channelId, targetUserId)),
      );
    }

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Member Removed',
          `<@${targetUserId}> has been removed from this ticket channel.`,
        ),
      ],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update channel permissions';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Remove Member', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /ticket stats ────────────────────────────────────────────────

export async function handleTicketStatsSubcommand(
  token: string,
  guildId: string,
): Promise<void> {
  try {
    const stats = await getTicketStats(guildId);
    const embed = buildTicketStatsEmbed(stats);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve stats';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Stats Error', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Component Interactions Handler ───────────────────────────────────────────

export async function handleTicketComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  _interaction?: APIMessageComponentInteraction,
): Promise<void> {
  const parts = customId.split(':');
  const action = parts[0];

  switch (action) {
    // 1. Open Ticket: ticket_create:<panelId>:<catId>
    case 'ticket_create': {
      const panelId = parts[1];
      const catId = parts[2] || 'general';

      try {
        const result = await openTicket(guildId, userId, catId, panelId);
        let newChannelId = `chan_${result.ticket.ticketId}`;

        if (!isTestMode()) {
          try {
            const rest = getDiscordRest();
            const createdChannel = (await discordApiCall(() =>
              rest.post(Routes.guildChannels(guildId), {
                body: {
                  name: result.channelSpec.name,
                  type: result.channelSpec.type,
                  parent_id: result.channelSpec.parent_id,
                  permission_overwrites: result.channelSpec.permission_overwrites,
                  topic: result.channelSpec.topic,
                },
              }),
            )) as { id: string };

            newChannelId = createdChannel.id;
            await updateTicketChannelId(guildId, result.ticket.ticketId, newChannelId);

            // Post welcome message into the newly created channel
            await discordApiCall(() =>
              rest.post(Routes.channelMessages(newChannelId), {
                body: {
                  embeds: [result.embed],
                  components: result.components,
                },
              }),
            );
          } catch (restErr) {
            console.error('[handleTicketComponent:create] REST channel creation error:', restErr);
          }
        } else {
          await updateTicketChannelId(guildId, result.ticket.ticketId, newChannelId);
        }

        await editInteractionResponse(token, {
          embeds: [
            successEmbed(
              'Ticket Created',
              `Your support ticket **${result.ticket.ticketId}** (${catId}) has been created! Head over to <#${newChannelId}>.`,
            ),
          ],
          ephemeral: true,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to open ticket';
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Ticket Creation Failed', msg)],
          ephemeral: true,
        });
      }
      break;
    }

    // 2. Claim Ticket: ticket_claim:<ticketId>
    case 'ticket_claim': {
      const ticketId = parts[1];

      try {
        const result = await claimTicket(guildId, ticketId, userId);
        await editInteractionResponse(token, {
          embeds: [result.embed],
          components: result.components,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to claim ticket';
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Claim Failed', msg)],
          ephemeral: true,
        });
      }
      break;
    }

    // 3. Close Ticket: ticket_close:<ticketId>
    case 'ticket_close': {
      const ticketId = parts[1];

      try {
        const result = await closeTicket(
          guildId,
          ticketId,
          userId,
          'Closed via interactive button',
        );
        await editInteractionResponse(token, {
          embeds: [result.embed],
          components: [result.ratingRow],
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to close ticket';
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Close Failed', msg)],
          ephemeral: true,
        });
      }
      break;
    }

    // 4. Rate Ticket: ticket_rate:<ticketId>:<stars>
    case 'ticket_rate': {
      const ticketId = parts[1];
      const stars = parseInt(parts[2], 10);

      try {
        const result = await rateTicket(guildId, ticketId, stars);
        await editInteractionResponse(token, {
          embeds: [result.embed],
          components: [result.ratingRow],
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to submit rating';
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Rating Error', msg)],
          ephemeral: true,
        });
      }
      break;
    }

    default:
      console.warn(`[handleTicketComponent] Unrecognized action: ${action}`);
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const ticketCommand: RegisteredCommand = {
  name: 'ticket',
  description: 'Interactive Ticket Hub management, claiming, and satisfaction controls',
  category: 'utility',
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'panel',
      description: 'Create an interactive support ticket panel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'title',
          description: 'Title for the ticket panel',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 256,
        },
        {
          name: 'description',
          description: 'Description and instructions for users opening tickets',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 4096,
        },
        {
          name: 'category',
          description: 'Category channel to create ticket channels under',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
        {
          name: 'support_role',
          description: 'Role allowed to view and manage tickets from this panel',
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
        {
          name: 'log_channel',
          description: 'Channel to log closed ticket transcripts',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
      ],
    },
    {
      name: 'close',
      description: 'Close the current support ticket and generate transcript',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'reason',
          description: 'Reason for closing the ticket',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 1024,
        },
      ],
    },
    {
      name: 'add',
      description: 'Add a user to the current ticket channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'User to add to the ticket',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: 'remove',
      description: 'Remove a user from the current ticket channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'User to remove from the ticket',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: 'stats',
      description: 'Display server ticket metrics, volume, and customer satisfaction (CSAT)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
  ],
  execute: handleTicketCommand,
};
