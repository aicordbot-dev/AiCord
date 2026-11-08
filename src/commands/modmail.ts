/**
 * src/commands/modmail.ts
 * Anonymous Modmail Relay Slash Commands & Component Handlers for AiCord.
 *
 * Subcommands:
 * - /modmail config [category] [staff_role] [log_channel] [enabled]: Server setup (requires MANAGE_GUILD)
 * - /modmail open user:<@user> [category] [message]: Opens new modmail channel with member
 * - /modmail reply message:<string> [anonymous]: Relays anonymous or named staff reply to recipient
 * - /modmail close [reason]: Closes active modmail thread and generates transcript
 * - /modmail canned action:[list|add|remove|send] [name] [content]: Manages/sends canned response snippets
 *
 * Component Handler:
 * - handleModmailComponent: handles mm_close:<channelId>
 */

import {
  ApplicationCommandOptionType,
  Routes,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, infoEmbed, clampEmbed, Colors } from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  getModmailConfig,
  setModmailConfig,
  openModmailThread,
  getModmailThreadByChannel,
  updateModmailThreadChannel,
  addMessageToThread,
  closeModmailThread,
  addCannedResponse,
  removeCannedResponse,
  getCannedResponse,
  isTestMode,
  type IModmailConfig,
} from '@/lib/modmail/modmail-service';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleModmailCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const channelId = interaction.channel_id ?? '';
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const memberTag =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Staff';
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
      await handleModmailConfigSubcommand(token, guildId, memberPerms, subOptions);
      break;
    case 'open':
      await handleModmailOpenSubcommand(token, guildId, userId, subOptions);
      break;
    case 'reply':
      await handleModmailReplySubcommand(
        token,
        guildId,
        channelId,
        userId,
        memberTag,
        subOptions,
      );
      break;
    case 'close':
      await handleModmailCloseSubcommand(token, guildId, channelId, userId, subOptions);
      break;
    case 'canned':
      await handleModmailCannedSubcommand(
        token,
        guildId,
        channelId,
        userId,
        memberTag,
        subOptions,
      );
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /modmail subcommand: "${subcommand?.name ?? 'unknown'}".`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Subcommand: /modmail config ──────────────────────────────────────────────

export async function handleModmailConfigSubcommand(
  token: string,
  guildId: string,
  memberPerms: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to configure Modmail.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const category = getOption<string>(options, 'category');
  const staffRole = getOption<string>(options, 'staff_role');
  const logChannel = getOption<string>(options, 'log_channel');
  const enabled = getOption<boolean>(options, 'enabled');

  const currentConfig = await getModmailConfig(guildId);

  // If no options provided, display current configuration overview
  if (
    category === undefined &&
    staffRole === undefined &&
    logChannel === undefined &&
    enabled === undefined
  ) {
    const rolesDisplay =
      currentConfig.staffRoleIds && currentConfig.staffRoleIds.length > 0
        ? currentConfig.staffRoleIds.map((r) => `<@&${r}>`).join(' ')
        : 'None configured';

    await editInteractionResponse(token, {
      embeds: [
        clampEmbed({
          title: '📬 Modmail Server Configuration',
          description:
            'Current settings for the anonymous modmail relay and staff inbox.',
          color: Colors.INFO,
          fields: [
            {
              name: '📂 Modmail Category',
              value: currentConfig.categoryId ? `<#${currentConfig.categoryId}>` : 'Default / None',
              inline: true,
            },
            {
              name: '📜 Transcript Log Channel',
              value: currentConfig.logChannelId
                ? `<#${currentConfig.logChannelId}>`
                : 'Disabled / None',
              inline: true,
            },
            {
              name: '⚙️ Status',
              value: currentConfig.enabled ? '🟢 Enabled' : '🔴 Disabled',
              inline: true,
            },
            {
              name: '🛡️ Staff Roles',
              value: rolesDisplay,
              inline: false,
            },
            {
              name: '📝 Canned Snippets',
              value: `${currentConfig.cannedResponses?.length ?? 0} saved snippets`,
              inline: true,
            },
          ],
          footer: { text: 'AiCord Modmail Relay • Configure with /modmail config' },
          timestamp: new Date().toISOString(),
        }),
      ],
    });
    return;
  }

  const updates: Partial<IModmailConfig> = {};
  if (category !== undefined) updates.categoryId = category;
  if (logChannel !== undefined) updates.logChannelId = logChannel;
  if (enabled !== undefined) updates.enabled = enabled;
  if (staffRole !== undefined) {
    const roles = new Set(currentConfig.staffRoleIds || []);
    roles.add(staffRole);
    updates.staffRoleIds = Array.from(roles);
  }

  const updatedConfig = await setModmailConfig(guildId, updates);

  const rolesDisplay =
    updatedConfig.staffRoleIds && updatedConfig.staffRoleIds.length > 0
      ? updatedConfig.staffRoleIds.map((r) => `<@&${r}>`).join(' ')
      : 'None configured';

  await editInteractionResponse(token, {
    embeds: [
      clampEmbed({
        title: '✅ Modmail Configuration Updated',
        description: 'Server modmail settings have been updated successfully.',
        color: Colors.SUCCESS,
        fields: [
          {
            name: '📂 Modmail Category',
            value: updatedConfig.categoryId ? `<#${updatedConfig.categoryId}>` : 'Default / None',
            inline: true,
          },
          {
            name: '📜 Log Channel',
            value: updatedConfig.logChannelId
              ? `<#${updatedConfig.logChannelId}>`
              : 'Disabled / None',
            inline: true,
          },
          {
            name: '⚙️ Status',
            value: updatedConfig.enabled ? '🟢 Enabled' : '🔴 Disabled',
            inline: true,
          },
          {
            name: '🛡️ Staff Roles',
            value: rolesDisplay,
            inline: false,
          },
        ],
        footer: { text: 'AiCord Modmail Relay • Updated' },
        timestamp: new Date().toISOString(),
      }),
    ],
  });
}

// ─── Subcommand: /modmail open ────────────────────────────────────────────────

export async function handleModmailOpenSubcommand(
  token: string,
  guildId: string,
  _userId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(options, 'user');
  const category = getOption<string>(options, 'category') || 'general';
  const initialMessage = getOption<string>(options, 'message');

  if (!targetUserId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please select a user to open a modmail thread with.')],
      ephemeral: true,
    });
    return;
  }

  const config = await getModmailConfig(guildId);
  if (!config.enabled) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Modmail Disabled', 'Modmail is currently disabled on this server.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const result = await openModmailThread(
      guildId,
      targetUserId,
      `User-${targetUserId.slice(-4)}`,
      category,
      initialMessage,
    );

    let newChannelId = `chan_${result.thread.threadId}`;

    if (!isTestMode()) {
      try {
        const rest = getDiscordRest();
        const createdChannel = (await discordApiCall(() =>
          rest.post(Routes.guildChannels(guildId), {
            body: {
              name: result.channelSpec.name,
              type: 0, // GuildText
              parent_id: result.channelSpec.parent_id,
              permission_overwrites: result.channelSpec.permission_overwrites,
              topic: result.channelSpec.topic,
            },
          }),
        )) as { id: string };

        newChannelId = createdChannel.id;
        await updateModmailThreadChannel(guildId, result.thread.threadId, newChannelId);

        // Post staff header into newly created channel
        await discordApiCall(() =>
          rest.post(Routes.channelMessages(newChannelId), {
            body: {
              embeds: [result.headerEmbed],
              components: result.headerComponents,
            },
          }),
        );

        // If initial message provided, post relay into staff channel
        if (result.initialRelayEmbed) {
          await discordApiCall(() =>
            rest.post(Routes.channelMessages(newChannelId), {
              body: {
                embeds: [result.initialRelayEmbed],
              },
            }),
          );
        }
      } catch (restErr) {
        console.error('[handleModmailOpen] Discord REST channel creation error:', restErr);
      }
    } else {
      await updateModmailThreadChannel(guildId, result.thread.threadId, newChannelId);
    }

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Modmail Thread Opened',
          `Modmail thread **${result.thread.threadId}** opened with <@${targetUserId}>! Channel: <#${newChannelId}>.`,
        ),
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to open modmail thread';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Open Modmail', msg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /modmail reply ───────────────────────────────────────────────

export async function handleModmailReplySubcommand(
  token: string,
  guildId: string,
  channelId: string,
  userId: string,
  memberTag: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const messageContent = getOption<string>(options, 'message');
  const anonymous = getOption<boolean>(options, 'anonymous') ?? true;

  if (!messageContent || !messageContent.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please provide a message to send to the recipient.')],
      ephemeral: true,
    });
    return;
  }

  const thread = await getModmailThreadByChannel(guildId, channelId);
  if (!thread || thread.status !== 'open') {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Not a Modmail Channel',
          'This channel is not an active modmail thread. Replies can only be sent from active modmail channels.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    const { embed } = await addMessageToThread(guildId, channelId, {
      authorId: userId,
      authorTag: memberTag || 'Staff',
      isStaff: true,
      content: messageContent.trim(),
      anonymous,
    });

    if (!isTestMode()) {
      try {
        const rest = getDiscordRest();
        const dmChannel = (await discordApiCall(() =>
          rest.post(Routes.userChannels(), {
            body: { recipient_id: thread.recipientId },
          }),
        )) as { id: string };

        await discordApiCall(() =>
          rest.post(Routes.channelMessages(dmChannel.id), {
            body: { embeds: [embed] },
          }),
        );
      } catch (dmErr) {
        console.error('[handleModmailReply] Failed to DM recipient:', dmErr);
      }
    }

    const senderDisplay = anonymous ? 'Anonymous Staff' : memberTag;
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Message Relayed',
          `Reply relayed to <@${thread.recipientId}> as **${senderDisplay}**.\n\n> ${messageContent.trim()}`,
        ),
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send reply';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Relay Failed', msg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /modmail close ───────────────────────────────────────────────

export async function handleModmailCloseSubcommand(
  token: string,
  guildId: string,
  channelId: string,
  userId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const reason = getOption<string>(options, 'reason');

  const thread = await getModmailThreadByChannel(guildId, channelId);
  if (!thread || thread.status !== 'open') {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Not a Modmail Channel',
          'This channel is not an active modmail thread.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    const { thread: closedThread } = await closeModmailThread(
      guildId,
      channelId,
      userId,
      reason,
    );

    if (!isTestMode()) {
      try {
        const config = await getModmailConfig(guildId);
        const rest = getDiscordRest();
        if (config.logChannelId) {
          await discordApiCall(() =>
            rest.post(Routes.channelMessages(config.logChannelId!), {
              body: {
                embeds: [
                  clampEmbed({
                    title: `🔒 Modmail Transcript — ${closedThread.threadId}`,
                    description: `Modmail session with <@${closedThread.recipientId}> closed by <@${userId}>.\n**Reason:** ${closedThread.closeReason}\n**Messages Exchanged:** ${closedThread.messages.length}`,
                    color: Colors.INFO,
                    timestamp: new Date().toISOString(),
                  }),
                ],
              },
            }),
          );
        }
      } catch (logErr) {
        console.error('[handleModmailClose] Log post error:', logErr);
      }
    }

    await editInteractionResponse(token, {
      embeds: [
        clampEmbed({
          title: `🔒 Modmail Thread Closed — ${closedThread.threadId}`,
          description: `The modmail thread with <@${closedThread.recipientId}> has been closed by <@${userId}>.\n\n**Reason:** ${closedThread.closeReason}\n**Messages Exchanged:** ${closedThread.messages.length}`,
          color: Colors.DANGER,
          fields: [
            { name: '👤 Recipient', value: `<@${closedThread.recipientId}>`, inline: true },
            { name: '🏷️ Category', value: closedThread.category, inline: true },
            { name: '📁 Thread ID', value: `\`${closedThread.threadId}\``, inline: true },
          ],
          footer: { text: 'AiCord Modmail Relay • Full transcript archived' },
          timestamp: new Date().toISOString(),
        }),
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to close modmail thread';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Close Modmail', msg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /modmail canned ──────────────────────────────────────────────

export async function handleModmailCannedSubcommand(
  token: string,
  guildId: string,
  channelId: string,
  userId: string,
  memberTag: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const action = getOption<string>(options, 'action');
  const name = getOption<string>(options, 'name');
  const content = getOption<string>(options, 'content');

  switch (action) {
    case 'list': {
      const config = await getModmailConfig(guildId);
      if (!config.cannedResponses || config.cannedResponses.length === 0) {
        await editInteractionResponse(token, {
          embeds: [
            infoEmbed(
              'Canned Snippets',
              'No canned snippets configured yet. Add one with `/modmail canned action:add name:<name> content:<snippet>`.',
            ),
          ],
        });
        return;
      }

      const fields = config.cannedResponses.slice(0, 25).map((c) => ({
        name: `📌 ${c.name}`,
        value: c.content.length > 100 ? `${c.content.slice(0, 97)}...` : c.content,
        inline: false,
      }));

      await editInteractionResponse(token, {
        embeds: [
          clampEmbed({
            title: '📝 Canned Response Snippets',
            description: `Configured canned responses for ${guildId}:`,
            color: Colors.INFO,
            fields,
            footer: {
              text: 'Use "/modmail canned action:send name:<name>" in modmail channels',
            },
            timestamp: new Date().toISOString(),
          }),
        ],
      });
      break;
    }

    case 'add': {
      if (!name || !content) {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed(
              'Missing Parameters',
              'Both `name` and `content` are required to add a canned snippet.',
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      await addCannedResponse(guildId, name, content);
      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Canned Snippet Saved',
            `Snippet **${name}** has been saved.\n\n> ${content}`,
          ),
        ],
      });
      break;
    }

    case 'remove': {
      if (!name) {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed('Missing Parameter', 'Please provide the `name` of the snippet to remove.'),
          ],
          ephemeral: true,
        });
        return;
      }

      const removed = await removeCannedResponse(guildId, name);
      if (removed) {
        await editInteractionResponse(token, {
          embeds: [
            successEmbed('Canned Snippet Removed', `Snippet **${name}** was deleted.`),
          ],
        });
      } else {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed('Snippet Not Found', `No canned snippet named **${name}** exists.`),
          ],
          ephemeral: true,
        });
      }
      break;
    }

    case 'send': {
      if (!name) {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed('Missing Parameter', 'Please provide the `name` of the snippet to send.'),
          ],
          ephemeral: true,
        });
        return;
      }

      const thread = await getModmailThreadByChannel(guildId, channelId);
      if (!thread || thread.status !== 'open') {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed(
              'Not a Modmail Channel',
              'Canned snippets can only be sent from active modmail channels.',
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const snippet = await getCannedResponse(guildId, name);
      if (!snippet) {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed('Snippet Not Found', `No canned snippet named **${name}** exists.`),
          ],
          ephemeral: true,
        });
        return;
      }

      const { embed } = await addMessageToThread(guildId, channelId, {
        authorId: userId,
        authorTag: memberTag || 'Staff',
        isStaff: true,
        content: snippet.content,
        anonymous: true,
      });

      if (!isTestMode()) {
        try {
          const rest = getDiscordRest();
          const dmChannel = (await discordApiCall(() =>
            rest.post(Routes.userChannels(), {
              body: { recipient_id: thread.recipientId },
            }),
          )) as { id: string };

          await discordApiCall(() =>
            rest.post(Routes.channelMessages(dmChannel.id), {
              body: { embeds: [embed] },
            }),
          );
        } catch (dmErr) {
          console.error('[handleModmailCanned:send] Failed to DM recipient:', dmErr);
        }
      }

      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            'Canned Snippet Relayed',
            `Relayed snippet **${name}** to <@${thread.recipientId}> as Anonymous Staff.\n\n> ${snippet.content}`,
          ),
        ],
      });
      break;
    }

    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Invalid Action',
            `Unknown action: "${action}". Valid actions are: \`list\`, \`add\`, \`remove\`, \`send\`.`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Component Handler: handleModmailComponent ────────────────────────────────

export async function handleModmailComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const targetChannelId = customId.split(':')[1] || component.channel_id || '';

  const thread = await getModmailThreadByChannel(guildId, targetChannelId);
  if (!thread) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Not Found', 'Modmail thread not found.')],
      ephemeral: true,
    });
    return;
  }

  if (thread.status === 'closed') {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Already Closed', 'This modmail thread is already closed.')],
      ephemeral: true,
    });
    return;
  }

  const { thread: closedThread } = await closeModmailThread(
    guildId,
    targetChannelId,
    userId,
    'Closed via staff button',
  );

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        'Modmail Closed',
        `Modmail thread **${closedThread.threadId}** with <@${closedThread.recipientId}> was closed by <@${userId}>.`,
      ),
    ],
    components: [],
  });
}

// ─── RegisteredCommand Export ─────────────────────────────────────────────────

export const modmailCommand: RegisteredCommand = {
  name: 'modmail',
  description: 'Anonymous modmail relay system for private staff-member communication',
  category: 'moderation',
  default_member_permissions: PermissionFlags.MANAGE_MESSAGES.toString(),
  options: [
    {
      name: 'config',
      description: 'Configure modmail category, staff roles, and transcript log channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category',
          description: 'Category where modmail channels will be created',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
        {
          name: 'staff_role',
          description: 'Staff role permitted to view and reply to modmail',
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
        {
          name: 'log_channel',
          description: 'Channel where closed modmail transcripts will be logged',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
        {
          name: 'enabled',
          description: 'Enable or disable modmail relay on this server',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: 'open',
      description: 'Open a new modmail thread with a server member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The member to open a modmail session with',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: 'category',
          description: 'Department or topic category (default: general)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'message',
          description: 'Initial message to send to the recipient',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'reply',
      description: 'Send a reply to the member in the current modmail thread',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'message',
          description: 'The message content to relay to the member',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'anonymous',
          description: 'Whether to send reply anonymously as Staff Team (default: true)',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: 'close',
      description: 'Close the current modmail thread and generate transcript',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'reason',
          description: 'Reason for closing the modmail thread',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'canned',
      description: 'Manage or send pre-written canned response snippets',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'action',
          description: 'Action to perform: list, add, remove, or send',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'list', value: 'list' },
            { name: 'add', value: 'add' },
            { name: 'remove', value: 'remove' },
            { name: 'send', value: 'send' },
          ],
        },
        {
          name: 'name',
          description: 'Name/shortcut of the canned response snippet',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'content',
          description: 'Snippet text content (required for add)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
  ],
  execute: handleModmailCommand,
};
