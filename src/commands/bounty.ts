/**
 * src/commands/bounty.ts
 * Community Bounty Board & Escrow Lifecycle Slash Commands & Component Handlers for AiCord.
 *
 * Subcommands:
 * - /bounty create: post a new bounty and lock reward in escrow
 * - /bounty list: list bounties with optional category and status filtering
 * - /bounty view: view details and status of a bounty
 * - /bounty claim: claim an open bounty
 * - /bounty submit: submit work/proof for a claimed bounty
 * - /bounty pay: approve payment and release reward from escrow to claimant
 * - /bounty cancel: cancel bounty and refund reward to creator
 *
 * Interactive Component Routing:
 * - handleBountyComponent(): handles bounty_claim:<id>, bounty_pay:<id>, bounty_cancel:<id>
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
  clampEmbed,
  Colors,
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  createBounty,
  getBounty,
  listBounties,
  claimBounty,
  submitBounty,
  payBounty,
  cancelBounty,
  buildBountyEmbed,
  buildBountyComponents,
  isTestMode,
  BOUNTY_CATEGORY_EMOJIS,
  BOUNTY_STATUS_INDICATORS,
  type BountyCategory,
} from '@/lib/bounty/bounty-service';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }> | undefined,
  name: string,
): T | undefined {
  return options?.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleBountyCreateSubcommand(
  token: string,
  guildId: string,
  userId: string,
  userTag: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const title = getOption<string>(options, 'title');
  const reward = getOption<number>(options, 'reward');
  const description = getOption<string>(options, 'description');
  const category = getOption<BountyCategory>(options, 'category');

  if (!title || !description || reward === undefined) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Missing Parameters',
          'Please provide `title`, `reward`, and `description` to create a bounty.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (reward < 10) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Invalid Reward',
          'Bounty reward must be at least **10 coins**.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    const bounty = await createBounty({
      guildId,
      creatorId: userId,
      creatorTag: userTag,
      title,
      description,
      reward,
      category,
    });

    await editInteractionResponse(token, {
      embeds: [buildBountyEmbed(bounty)],
      components: buildBountyComponents(bounty),
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'insufficient_funds') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Insufficient Funds',
            `You do not have enough coins in your wallet to fund this bounty (Reward: **${reward.toLocaleString()} coins**).`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Creation Failed',
          error.message || 'Could not create bounty. Please try again.',
        ),
      ],
      ephemeral: true,
    });
  }
}

export async function handleBountyListSubcommand(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const category = getOption<string>(options, 'category');
  const status = getOption<string>(options, 'status');

  const bounties = await listBounties(guildId, { category, status });

  if (bounties.length === 0) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          'No Bounties Found',
          'There are currently no bounties matching the specified criteria.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const lines = bounties.slice(0, 10).map((b) => {
    const catBadge = BOUNTY_CATEGORY_EMOJIS[b.category] || '📌 General';
    const statusBadge = BOUNTY_STATUS_INDICATORS[b.status] || b.status.toUpperCase();
    return `• **\`${b.bountyId}\`** — **${b.title}**\n  🪙 **${b.reward.toLocaleString()} Coins** | ${catBadge} | ${statusBadge} | Posted by <@${b.creatorId}>`;
  });

  const embed = clampEmbed({
    title: '📜 Community Bounty Board',
    description: lines.join('\n\n'),
    color: Colors.PRIMARY,
    footer: {
      text: `Showing ${Math.min(bounties.length, 10)} of ${bounties.length} bounties • Use /bounty view to see full details`,
    },
  });

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

export async function handleBountyViewSubcommand(
  token: string,
  guildId: string,
  userId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const id = getOption<string>(options, 'id');
  if (!id) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please provide a valid bounty ID.')],
      ephemeral: true,
    });
    return;
  }

  const bounty = await getBounty(guildId, id);
  if (!bounty) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed('Bounty Not Found', `No bounty was found with ID \`${id}\`.`),
      ],
      ephemeral: true,
    });
    return;
  }

  await editInteractionResponse(token, {
    embeds: [buildBountyEmbed(bounty)],
    components: buildBountyComponents(bounty, userId),
  });
}

export async function handleBountyClaimSubcommand(
  token: string,
  guildId: string,
  userId: string,
  userTag: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const id = getOption<string>(options, 'id');
  if (!id) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please provide a valid bounty ID.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const updated = await claimBounty(guildId, id, userId, userTag);
    await editInteractionResponse(token, {
      embeds: [
        buildBountyEmbed(updated),
      ],
      components: buildBountyComponents(updated, userId),
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'self_claim_blocked') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed('Self-Claim Blocked', 'You cannot claim your own bounty!'),
        ],
        ephemeral: true,
      });
      return;
    }
    if (error.message === 'bounty_not_open') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Bounty Not Open',
            'This bounty is not open for claiming (it may already be claimed or completed).',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Claim Failed',
          error.message === 'bounty_not_found'
            ? `No bounty was found with ID \`${id}\`.`
            : error.message || 'Could not claim bounty.',
        ),
      ],
      ephemeral: true,
    });
  }
}

export async function handleBountySubmitSubcommand(
  token: string,
  guildId: string,
  userId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const id = getOption<string>(options, 'id');
  const proof = getOption<string>(options, 'proof');

  if (!id || !proof) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Missing Parameters',
          'Please provide both `id` and `proof` to submit work.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    const updated = await submitBounty(guildId, id, userId, proof);
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Submission Received',
          `Your work for bounty **\`${updated.bountyId}\`** has been submitted! The creator or a moderator can now review and approve payment.`,
        ),
        buildBountyEmbed(updated),
      ],
      components: buildBountyComponents(updated, userId),
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'not_claimant') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Not Claimant',
            'Only the community member who claimed this bounty can submit work for it.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    if (error.message === 'bounty_not_claimed') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Bounty Not Claimed',
            'This bounty must be claimed before submitting work.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Submission Failed',
          error.message === 'bounty_not_found'
            ? `No bounty was found with ID \`${id}\`.`
            : error.message || 'Could not submit work.',
        ),
      ],
      ephemeral: true,
    });
  }
}

export async function handleBountyPaySubcommand(
  token: string,
  guildId: string,
  userId: string,
  memberPerms: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const id = getOption<string>(options, 'id');
  if (!id) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please provide a valid bounty ID.')],
      ephemeral: true,
    });
    return;
  }

  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  try {
    const updated = await payBounty(guildId, id, userId, isMod);
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Bounty Paid & Completed!',
          `🏆 Reward of 🪙 **${updated.reward.toLocaleString()} Coins** released to <@${updated.claimedBy}>!`,
        ),
        buildBountyEmbed(updated),
      ],
      components: [],
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'unauthorized') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unauthorized',
            'Only the bounty creator or a moderator can approve payment.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    if (error.message === 'bounty_not_claimed') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Bounty Not Claimed',
            'Bounty must be in claimed status to approve payment.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Payment Failed',
          error.message === 'bounty_not_found'
            ? `No bounty was found with ID \`${id}\`.`
            : error.message || 'Could not approve payment.',
        ),
      ],
      ephemeral: true,
    });
  }
}

export async function handleBountyCancelSubcommand(
  token: string,
  guildId: string,
  userId: string,
  memberPerms: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const id = getOption<string>(options, 'id');
  if (!id) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please provide a valid bounty ID.')],
      ephemeral: true,
    });
    return;
  }

  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  try {
    const updated = await cancelBounty(guildId, id, userId, isMod);
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Bounty Cancelled',
          `Bounty **\`${updated.bountyId}\`** was cancelled. 🪙 **${updated.reward.toLocaleString()} Coins** were refunded to <@${updated.creatorId}>.`,
        ),
        buildBountyEmbed(updated),
      ],
      components: [],
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'unauthorized') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unauthorized',
            'Only the bounty creator or a moderator can cancel this bounty.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    if (error.message === 'cannot_cancel') {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Cannot Cancel',
            'This bounty cannot be cancelled (it may already be completed or cancelled).',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Cancellation Failed',
          error.message === 'bounty_not_found'
            ? `No bounty was found with ID \`${id}\`.`
            : error.message || 'Could not cancel bounty.',
        ),
      ],
      ephemeral: true,
    });
  }
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleBountyCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const userTag =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Anonymous';
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
    case 'create':
      await handleBountyCreateSubcommand(
        token,
        guildId,
        userId,
        userTag,
        subOptions,
      );
      break;

    case 'list':
      await handleBountyListSubcommand(token, guildId, subOptions);
      break;

    case 'view':
      await handleBountyViewSubcommand(token, guildId, userId, subOptions);
      break;

    case 'claim':
      await handleBountyClaimSubcommand(
        token,
        guildId,
        userId,
        userTag,
        subOptions,
      );
      break;

    case 'submit':
      await handleBountySubmitSubcommand(token, guildId, userId, subOptions);
      break;

    case 'pay':
      await handleBountyPaySubcommand(
        token,
        guildId,
        userId,
        memberPerms,
        subOptions,
      );
      break;

    case 'cancel':
      await handleBountyCancelSubcommand(
        token,
        guildId,
        userId,
        memberPerms,
        subOptions,
      );
      break;

    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed('Unknown Subcommand', 'Please specify a valid subcommand.'),
        ],
        ephemeral: true,
      });
      break;
  }
}

// ─── Interactive Component Handler ────────────────────────────────────────────

export async function handleBountyComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component?: APIMessageComponentInteraction,
): Promise<void> {
  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'This component can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  const parts = customId.split(':');
  const action = parts[0];
  const bountyId = parts[1];

  if (!bountyId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'Missing bounty identifier.')],
      ephemeral: true,
    });
    return;
  }

  const userTag =
    component?.member?.user?.username ?? component?.user?.username ?? 'Anonymous';
  const memberPerms = component?.member?.permissions ?? '0';
  const isMod =
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  switch (action) {
    case 'bounty_claim': {
      try {
        const updated = await claimBounty(guildId, bountyId, userId, userTag);

        // Update message via Discord REST if not test mode
        if (!isTestMode() && updated.channelId && updated.messageId) {
          const rest = getDiscordRest();
          try {
            await discordApiCall(() =>
              rest.patch(
                Routes.channelMessage(updated.channelId!, updated.messageId!),
                {
                  body: {
                    embeds: [buildBountyEmbed(updated)],
                    components: buildBountyComponents(updated),
                  },
                },
              ),
            );
          } catch (restErr) {
            console.error('[handleBountyComponent] REST update error:', restErr);
          }
        }

        await editInteractionResponse(token, {
          embeds: [buildBountyEmbed(updated)],
          components: buildBountyComponents(updated, userId),
        });
      } catch (err: unknown) {
        const error = err as Error;
        const msg =
          error.message === 'self_claim_blocked'
            ? 'You cannot claim your own bounty!'
            : error.message === 'bounty_not_open'
              ? 'This bounty is no longer open for claiming.'
              : error.message || 'Could not claim bounty.';

        await editInteractionResponse(token, {
          embeds: [errorEmbed('Claim Failed', msg)],
          ephemeral: true,
        });
      }
      break;
    }

    case 'bounty_pay': {
      try {
        const updated = await payBounty(guildId, bountyId, userId, isMod);

        if (!isTestMode() && updated.channelId && updated.messageId) {
          const rest = getDiscordRest();
          try {
            await discordApiCall(() =>
              rest.patch(
                Routes.channelMessage(updated.channelId!, updated.messageId!),
                {
                  body: {
                    embeds: [buildBountyEmbed(updated)],
                    components: [],
                  },
                },
              ),
            );
          } catch (restErr) {
            console.error('[handleBountyComponent] REST update error:', restErr);
          }
        }

        await editInteractionResponse(token, {
          embeds: [
            successEmbed(
              'Bounty Paid & Completed!',
              `🏆 🪙 **${updated.reward.toLocaleString()} Coins** paid out to <@${updated.claimedBy}>!`,
            ),
            buildBountyEmbed(updated),
          ],
          components: [],
        });
      } catch (err: unknown) {
        const error = err as Error;
        const msg =
          error.message === 'unauthorized'
            ? 'Only the bounty creator or a moderator can approve payment.'
            : error.message === 'bounty_not_claimed'
              ? 'Bounty must be in claimed status to approve payment.'
              : error.message || 'Could not approve payment.';

        await editInteractionResponse(token, {
          embeds: [errorEmbed('Payment Failed', msg)],
          ephemeral: true,
        });
      }
      break;
    }

    case 'bounty_cancel': {
      try {
        const updated = await cancelBounty(guildId, bountyId, userId, isMod);

        if (!isTestMode() && updated.channelId && updated.messageId) {
          const rest = getDiscordRest();
          try {
            await discordApiCall(() =>
              rest.patch(
                Routes.channelMessage(updated.channelId!, updated.messageId!),
                {
                  body: {
                    embeds: [buildBountyEmbed(updated)],
                    components: [],
                  },
                },
              ),
            );
          } catch (restErr) {
            console.error('[handleBountyComponent] REST update error:', restErr);
          }
        }

        await editInteractionResponse(token, {
          embeds: [
            successEmbed(
              'Bounty Cancelled',
              `Bounty **\`${updated.bountyId}\`** was cancelled and 🪙 **${updated.reward.toLocaleString()} Coins** were refunded to <@${updated.creatorId}>.`,
            ),
            buildBountyEmbed(updated),
          ],
          components: [],
        });
      } catch (err: unknown) {
        const error = err as Error;
        const msg =
          error.message === 'unauthorized'
            ? 'Only the bounty creator or a moderator can cancel this bounty.'
            : error.message === 'cannot_cancel'
              ? 'This bounty cannot be cancelled in its current state.'
              : error.message || 'Could not cancel bounty.';

        await editInteractionResponse(token, {
          embeds: [errorEmbed('Cancellation Failed', msg)],
          ephemeral: true,
        });
      }
      break;
    }

    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Action', `Unrecognized action: ${action}`)],
        ephemeral: true,
      });
      break;
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const bountyCommand: RegisteredCommand = {
  name: 'bounty',
  description: 'Community Bounty Board & Escrow Lifecycle management',
  category: 'economy',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'create',
      description: 'Post a new community bounty with coin reward locked in escrow',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'title',
          description: 'Title of the bounty',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 256,
        },
        {
          name: 'reward',
          description: 'Coin reward locked in escrow (minimum 10 coins)',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 10,
        },
        {
          name: 'description',
          description: 'Detailed description of the bounty requirements',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 2000,
        },
        {
          name: 'category',
          description: 'Category of the bounty (dev, design, gaming, general)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '💻 Dev', value: 'dev' },
            { name: '🎨 Design', value: 'design' },
            { name: '🎮 Gaming', value: 'gaming' },
            { name: '📌 General', value: 'general' },
          ],
        },
      ],
    },
    {
      name: 'list',
      description: 'List active community bounties',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category',
          description: 'Filter bounties by category',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '💻 Dev', value: 'dev' },
            { name: '🎨 Design', value: 'design' },
            { name: '🎮 Gaming', value: 'gaming' },
            { name: '📌 General', value: 'general' },
          ],
        },
        {
          name: 'status',
          description: 'Filter bounties by status',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🟢 Open', value: 'open' },
            { name: '🟡 Claimed', value: 'claimed' },
            { name: '🏆 Completed', value: 'completed' },
            { name: '❌ Cancelled', value: 'cancelled' },
          ],
        },
      ],
    },
    {
      name: 'view',
      description: 'View full details of a community bounty',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'id',
          description: 'The unique bounty ID (e.g. bty-XXXX)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'claim',
      description: 'Claim an open community bounty',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'id',
          description: 'The unique bounty ID (e.g. bty-XXXX)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'submit',
      description: 'Submit proof or completed work for a claimed bounty',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'id',
          description: 'The unique bounty ID (e.g. bty-XXXX)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'proof',
          description: 'Link or detailed description of your submitted work',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 2000,
        },
      ],
    },
    {
      name: 'pay',
      description: 'Approve and release escrow reward to claimant',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'id',
          description: 'The unique bounty ID (e.g. bty-XXXX)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'cancel',
      description: 'Cancel a bounty and refund escrow reward to creator',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'id',
          description: 'The unique bounty ID (e.g. bty-XXXX)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  execute: handleBountyCommand,
};
