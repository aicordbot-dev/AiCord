/**
 * src/commands/reaction-roles.ts
 * Button & Dropdown Reaction Roles Slash Command Suite & Component Routing for AiCord.
 *
 * Subcommands:
 * - /reaction-role create: creates a new reaction role panel
 * - /reaction-role add-role: adds a role entry to an existing panel (max 25)
 * - /reaction-role remove-role: removes a role entry from a panel
 * - /reaction-role publish: publishes the panel embed & components to a channel
 * - /reaction-role list: lists all reaction role panels in the server
 * - /reaction-role delete: deletes a reaction role panel
 *
 * Interactive Component Routing:
 * - handleReactionRoleComponent(): routes rr_toggle (buttons) and rr_select (dropdowns)
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
  warningEmbed,
  infoEmbed,
  clampEmbed,
  Colors,
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  createReactionRolePanel,
  getReactionRolePanel,
  listReactionRolePanels,
  deleteReactionRolePanel,
  addRoleToPanel,
  removeRoleFromPanel,
  updateReactionRolePanelMessage,
  buildReactionRoleEmbed,
  buildReactionRoleComponents,
  handleReactionRoleToggle,
  handleReactionRoleSelect,
  isTestMode,
} from '@/lib/reaction-roles/reaction-role-service';
import type { RolePanelMode } from '@/models';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleReactionRoleCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const channelId = interaction.channel_id ?? '';
  const memberPerms = interaction.member?.permissions ?? '0';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  // Permission check: requires MANAGE_ROLES or MANAGE_GUILD
  if (
    !hasPermission(memberPerms, PermissionFlags.MANAGE_ROLES) &&
    !hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)
  ) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Roles** or **Manage Server** permission to configure reaction roles.',
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
    case 'create':
      await handleReactionRoleCreate(token, guildId, subOptions);
      break;
    case 'add-role':
      await handleReactionRoleAddRole(token, guildId, subOptions);
      break;
    case 'remove-role':
      await handleReactionRoleRemoveRole(token, guildId, subOptions);
      break;
    case 'publish':
      await handleReactionRolePublish(token, guildId, channelId, subOptions);
      break;
    case 'list':
      await handleReactionRoleList(token, guildId);
      break;
    case 'delete':
      await handleReactionRoleDelete(token, guildId, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /reaction-role subcommand: "${subcommand?.name ?? 'unknown'}".`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleReactionRoleCreate(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const title = getOption<string>(options, 'title');
  const description = getOption<string>(options, 'description');
  const style = (getOption<string>(options, 'style') ?? 'buttons') as
    | 'buttons'
    | 'select';
  const mode = (getOption<string>(options, 'mode') ?? 'normal') as RolePanelMode;
  const colorStr = getOption<string>(options, 'color');
  const requiredRoleId = getOption<string>(options, 'required_role');
  const maxRoles = getOption<number>(options, 'max_roles');

  if (!title?.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Title', 'Panel title is required.')],
      ephemeral: true,
    });
    return;
  }

  let colorInt: number | undefined;
  if (colorStr) {
    const cleanHex = colorStr.replace('#', '').trim();
    const parsed = parseInt(cleanHex, 16);
    if (!isNaN(parsed)) {
      colorInt = parsed;
    }
  }

  try {
    const panel = await createReactionRolePanel(guildId, {
      title,
      description,
      style,
      mode,
      color: colorInt,
      requiredRoleId,
      maxRoles,
    });

    const panelId =
      (panel as unknown as { id?: string }).id ||
      panel._id?.toString() ||
      'unknown';

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Reaction Role Panel Created',
          `Panel **${panel.title}** has been created!\n\n` +
            `• **Panel ID:** \`${panelId}\`\n` +
            `• **Style:** \`${panel.style}\`\n` +
            `• **Mode:** \`${panel.mode}\`\n` +
            (panel.requiredRoleId
              ? `• **Prerequisite Role:** <@&${panel.requiredRoleId}>\n`
              : '') +
            (panel.maxRoles ? `• **Max Roles:** ${panel.maxRoles}\n` : '') +
            `\n**Next Steps:**\n` +
            `1. Add roles: \`/reaction-role add-role panel_id:${panelId} role:@Role label:Member\`\n` +
            `2. Publish panel: \`/reaction-role publish panel_id:${panelId}\``,
        ),
      ],
      ephemeral: true,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Failed to create reaction role panel';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Creation Failed', msg)],
      ephemeral: true,
    });
  }
}

export async function handleReactionRoleAddRole(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const panelId = getOption<string>(options, 'panel_id');
  const roleId = getOption<string>(options, 'role');
  const label = getOption<string>(options, 'label');
  const emoji = getOption<string>(options, 'emoji');
  const description = getOption<string>(options, 'description');

  if (!panelId?.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Option', 'Panel ID is required.')],
      ephemeral: true,
    });
    return;
  }

  if (!roleId?.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Option', 'Role is required.')],
      ephemeral: true,
    });
    return;
  }

  if (!label?.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Option', 'Role label is required.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const panel = await addRoleToPanel(guildId, panelId.trim(), {
      roleId: roleId.trim(),
      label: label.trim(),
      emoji: emoji?.trim(),
      description: description?.trim(),
    });

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Role Added',
          `Added role <@&${roleId.trim()}> (**${label.trim()}**) to panel **${panel.title}** (\`${panelId}\`).\nTotal roles: **${panel.entries.length}/25**.`,
        ),
      ],
      ephemeral: true,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Failed to add role to panel';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Add Role Failed', msg)],
      ephemeral: true,
    });
  }
}

export async function handleReactionRoleRemoveRole(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const panelId = getOption<string>(options, 'panel_id');
  const roleId = getOption<string>(options, 'role');

  if (!panelId?.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Option', 'Panel ID is required.')],
      ephemeral: true,
    });
    return;
  }

  if (!roleId?.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Option', 'Role is required.')],
      ephemeral: true,
    });
    return;
  }

  try {
    const panel = await removeRoleFromPanel(
      guildId,
      panelId.trim(),
      roleId.trim(),
    );

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Role Removed',
          `Removed role <@&${roleId.trim()}> from panel **${panel.title}** (\`${panelId}\`).\nRemaining roles: **${panel.entries.length}**.`,
        ),
      ],
      ephemeral: true,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Failed to remove role from panel';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Remove Role Failed', msg)],
      ephemeral: true,
    });
  }
}

export async function handleReactionRolePublish(
  token: string,
  guildId: string,
  interactionChannelId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const panelId = getOption<string>(options, 'panel_id');
  const targetChannel = getOption<string>(options, 'channel');
  const destinationChannelId = targetChannel || interactionChannelId;

  if (!panelId?.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Option', 'Panel ID is required.')],
      ephemeral: true,
    });
    return;
  }

  if (!destinationChannelId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Destination Error',
          'Could not determine target channel. Please specify the channel option.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const panel = await getReactionRolePanel(guildId, panelId.trim());
  if (!panel) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Panel Not Found',
          `Reaction role panel "${panelId}" not found.`,
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (!panel.entries || panel.entries.length === 0) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Empty Panel',
          'Cannot publish an empty panel. Add at least one role using `/reaction-role add-role` first.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const embed = buildReactionRoleEmbed(panel);
  const components = buildReactionRoleComponents(panel);

  let messageId = `msg_test_${Date.now()}`;

  if (!isTestMode()) {
    const rest = getDiscordRest();
    try {
      const sentMsg = (await discordApiCall(() =>
        rest.post(Routes.channelMessages(destinationChannelId), {
          body: {
            embeds: [embed],
            components,
          },
        }),
      )) as { id: string };
      messageId = sentMsg.id;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Discord REST error sending message';
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Publish Failed',
            `Failed to send panel to <#${destinationChannelId}>: ${msg}`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  }

  await updateReactionRolePanelMessage(
    guildId,
    panelId.trim(),
    destinationChannelId,
    messageId,
  );

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        'Panel Published',
        `Reaction role panel **${panel.title}** has been published to <#${destinationChannelId}>!\n\n` +
          `Members can now interact with the ${panel.style === 'buttons' ? 'buttons' : 'dropdown menu'} to manage their roles.`,
      ),
    ],
    ephemeral: true,
  });
}

export async function handleReactionRoleList(
  token: string,
  guildId: string,
): Promise<void> {
  const panels = await listReactionRolePanels(guildId);

  if (panels.length === 0) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          'Reaction Role Panels',
          'No reaction role panels configured for this server. Use `/reaction-role create` to create one.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const lines = panels.map((p, idx) => {
    const id =
      (p as unknown as { id?: string }).id || p._id?.toString() || 'unknown';
    const published = p.channelId
      ? `Published in <#${p.channelId}>`
      : 'Draft (Not published)';
    return (
      `**${idx + 1}. ${p.title}**\n` +
      `> **ID:** \`${id}\` • **Style:** \`${p.style}\` • **Mode:** \`${p.mode}\` • **Roles:** ${p.entries?.length ?? 0}/25\n` +
      `> **Status:** ${published}`
    );
  });

  await editInteractionResponse(token, {
    embeds: [
      clampEmbed({
        title: `Reaction Role Panels (${panels.length})`,
        description: lines.join('\n\n'),
        color: Colors.PRIMARY,
        footer: {
          text: 'AiCord Reaction Roles • Use /reaction-role publish or delete with panel ID',
        },
      }),
    ],
    ephemeral: true,
  });
}

export async function handleReactionRoleDelete(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const panelId = getOption<string>(options, 'panel_id');

  if (!panelId?.trim()) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Option', 'Panel ID is required.')],
      ephemeral: true,
    });
    return;
  }

  const deleted = await deleteReactionRolePanel(guildId, panelId.trim());

  if (deleted) {
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Panel Deleted',
          `Reaction role panel \`${panelId.trim()}\` has been deleted.`,
        ),
      ],
      ephemeral: true,
    });
  } else {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Panel Not Found',
          `Reaction role panel \`${panelId.trim()}\` does not exist.`,
        ),
      ],
      ephemeral: true,
    });
  }
}

// ─── Component Router ─────────────────────────────────────────────────────────

export async function handleReactionRoleComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  interaction: APIMessageComponentInteraction,
): Promise<void> {
  const currentMemberRoleIds: string[] = interaction.member?.roles ?? [];

  // 1. Button Toggle: rr_toggle:<panelId>:<roleId>
  if (customId.startsWith('rr_toggle:')) {
    const [, panelId, roleId] = customId.split(':');
    const result = await handleReactionRoleToggle(
      guildId,
      userId,
      panelId,
      roleId,
      currentMemberRoleIds,
    );

    if (result.action !== 'denied' && !isTestMode()) {
      const rest = getDiscordRest();
      try {
        if (result.action === 'added') {
          await discordApiCall(() =>
            rest.put(Routes.guildMemberRole(guildId, userId, result.roleId)),
          );
        } else if (result.action === 'removed') {
          await discordApiCall(() =>
            rest.delete(Routes.guildMemberRole(guildId, userId, result.roleId)),
          );
        } else if (result.action === 'swapped') {
          for (const remId of result.removedRoleIds ?? []) {
            await discordApiCall(() =>
              rest.delete(Routes.guildMemberRole(guildId, userId, remId)),
            );
          }
          await discordApiCall(() =>
            rest.put(Routes.guildMemberRole(guildId, userId, result.roleId)),
          );
        }
      } catch (restErr) {
        console.error('[ReactionRoles] REST error updating role:', restErr);
      }
    }

    if (result.action === 'denied') {
      await editInteractionResponse(token, {
        embeds: [warningEmbed('Role Assignment', result.message)],
        ephemeral: true,
      });
    } else {
      await editInteractionResponse(token, {
        embeds: [successEmbed('Role Updated', result.message)],
        ephemeral: true,
      });
    }
    return;
  }

  // 2. Select Menu: rr_select:<panelId>
  if (customId.startsWith('rr_select:')) {
    const [, panelId] = customId.split(':');
    const selectedRoleIds =
      (interaction.data as unknown as { values?: string[] })?.values ?? [];

    const result = await handleReactionRoleSelect(
      guildId,
      userId,
      panelId,
      selectedRoleIds,
      currentMemberRoleIds,
    );

    if (result.action !== 'denied' && !isTestMode()) {
      const rest = getDiscordRest();
      try {
        for (const addId of result.addedRoleIds) {
          await discordApiCall(() =>
            rest.put(Routes.guildMemberRole(guildId, userId, addId)),
          );
        }
        for (const remId of result.removedRoleIds) {
          await discordApiCall(() =>
            rest.delete(Routes.guildMemberRole(guildId, userId, remId)),
          );
        }
      } catch (restErr) {
        console.error(
          '[ReactionRoles] REST error updating select roles:',
          restErr,
        );
      }
    }

    if (result.action === 'denied') {
      await editInteractionResponse(token, {
        embeds: [warningEmbed('Role Assignment', result.message)],
        ephemeral: true,
      });
    } else {
      await editInteractionResponse(token, {
        embeds: [successEmbed('Roles Updated', result.message)],
        ephemeral: true,
      });
    }
    return;
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const reactionRoleCommand: RegisteredCommand = {
  name: 'reaction-role',
  description: 'Button & dropdown reaction role panels management and publishing',
  category: 'utility',
  default_member_permissions: String(PermissionFlags.MANAGE_ROLES),
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'create',
      description: 'Create a new reaction role panel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'title',
          description: 'Title for the reaction role panel',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 256,
        },
        {
          name: 'description',
          description: 'Description or guide for this panel',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 4096,
        },
        {
          name: 'style',
          description: 'Component style: buttons or select menu dropdown',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'Buttons (Grid of buttons)', value: 'buttons' },
            { name: 'Select Menu (Dropdown)', value: 'select' },
          ],
        },
        {
          name: 'mode',
          description: 'Operational mode for role assignment',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'Normal (Toggle on/off)', value: 'normal' },
            { name: 'Unique (Select one role at a time)', value: 'unique' },
            { name: 'Verify (Grant only, cannot remove)', value: 'verify' },
            { name: 'Drop (Remove only, cannot grant)', value: 'drop' },
          ],
        },
        {
          name: 'color',
          description: 'Hex color code for the embed (e.g. #5865F2)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'required_role',
          description: 'Prerequisite role required to claim roles from this panel',
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
        {
          name: 'max_roles',
          description: 'Maximum number of roles a member can select in normal mode',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 25,
        },
      ],
    },
    {
      name: 'add-role',
      description: 'Add a role entry to an existing reaction role panel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel_id',
          description: 'Panel ID to add the role to',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'role',
          description: 'The Discord role to assign',
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
        {
          name: 'label',
          description: 'Display label for the button or dropdown option',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 80,
        },
        {
          name: 'emoji',
          description: 'Optional emoji to display on the button or select option',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'description',
          description: 'Optional description for dropdown select option',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 100,
        },
      ],
    },
    {
      name: 'remove-role',
      description: 'Remove a role from a reaction role panel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel_id',
          description: 'Panel ID to remove the role from',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'role',
          description: 'The role to remove',
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: 'publish',
      description: 'Publish a reaction role panel to a channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel_id',
          description: 'Panel ID to publish',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'channel',
          description: 'Target channel to post the panel (defaults to current channel)',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
      ],
    },
    {
      name: 'list',
      description: 'List all reaction role panels configured in this server',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'delete',
      description: 'Delete a reaction role panel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel_id',
          description: 'Panel ID to delete',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  execute: handleReactionRoleCommand,
};
