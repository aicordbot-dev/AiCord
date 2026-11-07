/**
 * src/commands/role.ts
 * Handles /role subcommands: create, delete, assign, remove, panel.
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import { RolePanel } from '@/models/RolePanel';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { PermissionFlags } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  editInteractionResponse,
  buildButton,
  buildActionRow,
  resolveApplicationId,
} from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, infoEmbed, clampEmbed, Colors } from '@/lib/discord/embeds';
import { sanitizeRoleName } from '@/lib/limits';
import { PermissionEngine } from '@/lib/discord/permission-engine';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

export async function handleRoleCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();

  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const options = interaction.data.options ?? [];

  // Get the subcommand
  const subcommand = options[0] as { name: string; options?: Array<{ name: string; value: unknown }> };
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'create':
      await handleRoleCreate(token, guildId, subOptions);
      break;
    case 'edit':
      await handleRoleEdit(token, guildId, subOptions, interaction);
      break;
    case 'delete':
      await handleRoleDelete(token, guildId, subOptions);
      break;
    case 'assign':
      await handleRoleAssign(token, guildId, subOptions);
      break;
    case 'remove':
      await handleRoleRemove(token, guildId, subOptions);
      break;
    case 'panel':
      await handleRolePanel(token, guildId, subOptions, interaction);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown subcommand', `Unknown role subcommand: ${subcommand?.name}`)],
        ephemeral: true,
      });
  }
}

async function handleRoleCreate(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const name = getOption<string>(options, 'name');
  if (!name) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Name', 'Please provide a role name.')],
      ephemeral: true,
    });
    return;
  }

  const colorStr = getOption<string>(options, 'color');
  const hoist = getOption<boolean>(options, 'hoist') ?? false;
  const mentionable = getOption<boolean>(options, 'mentionable') ?? false;

  let color = 0;
  if (colorStr) {
    const parsed = parseInt(colorStr.replace('#', ''), 16);
    if (!isNaN(parsed)) color = parsed;
  }

  try {
    const rest = getDiscordRest();
    const role = await discordApiCall(() =>
      rest.post(Routes.guildRoles(guildId), {
        body: {
          name: sanitizeRoleName(name),
          color,
          hoist,
          mentionable,
          permissions: '0',
        },
      }) as Promise<{ id: string; name: string }>,
    );

    await editInteractionResponse(token, {
      embeds: [successEmbed('Role Created', `Created role <@&${role.id}> successfully.`)],
    });
  } catch (err) {
    console.error('[/role create] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Create Role', 'Could not create the role. Check my permissions.')],
    });
  }
}

async function handleRoleEdit(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const roleId = getOption<string>(options, 'role');
  if (!roleId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Role', 'Please select a role to edit.')],
      ephemeral: true,
    });
    return;
  }

  const name = getOption<string>(options, 'name');
  const colorStr = getOption<string>(options, 'color');
  const hoist = getOption<boolean>(options, 'hoist');
  const mentionable = getOption<boolean>(options, 'mentionable');

  if (name === undefined && colorStr === undefined && hoist === undefined && mentionable === undefined) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Missing Options',
          'Please specify at least one property to update (name, color, hoist, or mentionable).',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  let color: number | undefined;
  if (colorStr !== undefined) {
    const trimmed = colorStr.trim();
    const hexMatch = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
    if (!hexMatch) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Invalid Color',
            'Please provide a valid 6-character hex color (e.g. #FF0000 or FF0000).',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    color = parseInt(hexMatch[1], 16);
  }

  try {
    const rest = getDiscordRest();
    const botId = resolveApplicationId();
    const invokerId = interaction.member?.user?.id ?? interaction.user?.id ?? '';

    // Fetch guild roles to check positions
    const roles = (await discordApiCall(() =>
      rest.get(Routes.guildRoles(guildId)),
    )) as Array<{ id: string; name: string; position: number; tags?: { bot_id?: string } }>;

    const targetRole = roles.find((r) => r.id === roleId);
    const targetPosition = targetRole?.position ?? 0;

    // Invoker highest role position
    const invokerRoles = (interaction.member?.roles ?? []) as string[];
    let invokerHighestPosition = 0;
    for (const rid of invokerRoles) {
      const r = roles.find((x) => x.id === rid);
      if (r && r.position > invokerHighestPosition) {
        invokerHighestPosition = r.position;
      }
    }

    // Bot highest role position
    let botHighestPosition = 0;
    try {
      const botMember = (await discordApiCall(() =>
        rest.get(Routes.guildMember(guildId, botId)),
      )) as { roles?: string[] };
      if (botMember && Array.isArray(botMember.roles)) {
        for (const rid of botMember.roles) {
          const r = roles.find((x) => x.id === rid);
          if (r && r.position > botHighestPosition) {
            botHighestPosition = r.position;
          }
        }
      }
    } catch {
      const botRole = roles.find((r) => r.tags?.bot_id === botId);
      botHighestPosition = botRole ? botRole.position : Math.max(0, ...roles.map((r) => r.position));
    }

    // Server owner ID
    let guildOwnerId = '';
    try {
      const guild = (await discordApiCall(() =>
        rest.get(Routes.guild(guildId)),
      )) as { owner_id?: string };
      guildOwnerId = guild.owner_id ?? '';
    } catch {}

    const check = PermissionEngine.canActOn({
      guildOwnerId,
      invoker: {
        id: invokerId,
        highestRolePosition: invokerHighestPosition,
        permissions: interaction.member?.permissions ?? '0',
      },
      target: {
        id: roleId,
        highestRolePosition: targetPosition,
      },
      bot: {
        id: botId,
        highestRolePosition: botHighestPosition,
        permissions: PermissionFlags.MANAGE_ROLES,
      },
      action: 'manage_roles',
    });

    if (!check.allowed) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Action Denied', check.message)],
        ephemeral: true,
      });
      return;
    }

    const body: Record<string, unknown> = {};
    if (name !== undefined) body.name = sanitizeRoleName(name);
    if (color !== undefined) body.color = color;
    if (hoist !== undefined) body.hoist = hoist;
    if (mentionable !== undefined) body.mentionable = mentionable;

    await discordApiCall(() => rest.patch(Routes.guildRole(guildId, roleId), { body }));

    await editInteractionResponse(token, {
      embeds: [successEmbed('Role Updated', `Successfully updated role <@&${roleId}>.`)],
    });
  } catch (err) {
    console.error('[/role edit] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Edit Role', 'Could not update the role. Check my permissions and role hierarchy.')],
    });
  }
}

async function handleRoleDelete(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const roleId = getOption<string>(options, 'role');
  if (!roleId) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing Role', 'Please select a role.')], ephemeral: true });
    return;
  }

  // Show confirmation
  await editInteractionResponse(token, {
    embeds: [clampEmbed({
      color: Colors.WARNING,
      title: '⚠️ Confirm Role Deletion',
      description: `Are you sure you want to delete <@&${roleId}>? This cannot be undone.`,
    })],
    components: [
      buildActionRow(
        buildButton({ style: 4, label: '🗑️ Delete', customId: `role_delete_confirm:${roleId}:${guildId}` }),
        buildButton({ style: 2, label: 'Cancel', customId: `role_delete_cancel:${roleId}` }),
      ),
    ],
  });
}

async function handleRoleAssign(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const roleId = getOption<string>(options, 'role');

  if (!userId || !roleId) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing Arguments', 'Please provide a user and role.')], ephemeral: true });
    return;
  }

  try {
    const rest = getDiscordRest();
    await discordApiCall(() =>
      rest.put(Routes.guildMemberRole(guildId, userId, roleId)),
    );
    await editInteractionResponse(token, {
      embeds: [successEmbed('Role Assigned', `Assigned <@&${roleId}> to <@${userId}>.`)],
    });
  } catch (err) {
    console.error('[/role assign] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Assign Role', 'Could not assign the role. Check my permissions and role hierarchy.')],
    });
  }
}

async function handleRoleRemove(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const roleId = getOption<string>(options, 'role');

  if (!userId || !roleId) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing Arguments', 'Please provide a user and role.')], ephemeral: true });
    return;
  }

  try {
    const rest = getDiscordRest();
    await discordApiCall(() =>
      rest.delete(Routes.guildMemberRole(guildId, userId, roleId)),
    );
    await editInteractionResponse(token, {
      embeds: [successEmbed('Role Removed', `Removed <@&${roleId}> from <@${userId}>.`)],
    });
  } catch (err) {
    console.error('[/role remove] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Remove Role', 'Could not remove the role. Check my permissions and role hierarchy.')],
    });
  }
}

async function handleRolePanel(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const title = getOption<string>(options, 'title') ?? 'Role Panel';
  const style = (getOption<string>(options, 'style') === 'select' ? 'select' : 'buttons') as 'buttons' | 'select';
  const channelId = interaction.channel_id ?? '';

  // Create the panel record (entries are added via dashboard)
  const panel = await RolePanel.create({
    guildId,
    channelId,
    title,
    style,
    mode: 'normal',
    entries: [],
  });

  await editInteractionResponse(token, {
    embeds: [infoEmbed(
      'Role Panel Created',
      `Panel **${title}** has been created.\n\nUse the [dashboard](${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${guildId}/roles/panels/${panel.id}) to add roles to it, then click **Post Panel** to send it to this channel.`,
    )],
  });
}

/** Handle the role delete confirmation button. */
export async function handleRoleDeleteConfirm(
  token: string,
  roleId: string,
  guildId: string,
): Promise<void> {
  try {
    const rest = getDiscordRest();
    await discordApiCall(() => rest.delete(Routes.guildRole(guildId, roleId)));
    await editInteractionResponse(token, {
      embeds: [successEmbed('Role Deleted', `The role has been permanently deleted.`)],
      components: [],
    });
  } catch (err) {
    console.error('[role_delete_confirm] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed', 'Could not delete the role. Check my permissions and role hierarchy.')],
      components: [],
    });
  }
}

export const roleCommand: RegisteredCommand = {
  name: 'role',
  description: 'Manage server roles',
  category: 'roles',
  default_member_permissions: PermissionFlags.MANAGE_ROLES.toString(),
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'create',
      description: 'Create a new role',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'name',
          description: 'Role name',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 100,
        },
        {
          name: 'color',
          description: 'Role color (hex, e.g. #ff0000)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'hoist',
          description: 'Show role separately in member list',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
        {
          name: 'mentionable',
          description: 'Allow everyone to mention this role',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: 'edit',
      description: 'Edit role settings',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'role',
          description: 'The role to edit',
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
        {
          name: 'name',
          description: 'New role name',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 100,
        },
        {
          name: 'color',
          description: 'New role color (hex, e.g. #ff0000 or ff0000)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'hoist',
          description: 'Show role separately in member list',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
        {
          name: 'mentionable',
          description: 'Allow everyone to mention this role',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: 'delete',
      description: 'Delete a role',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'role',
          description: 'The role to delete',
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: 'assign',
      description: 'Assign a role to a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The member to give the role to',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: 'role',
          description: 'The role to assign',
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: 'remove',
      description: 'Remove a role from a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The member to remove the role from',
          type: ApplicationCommandOptionType.User,
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
      name: 'panel',
      description: 'Create a self-assign role panel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'title',
          description: 'Panel title',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 256,
        },
        {
          name: 'style',
          description: 'Panel style',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'Buttons', value: 'buttons' },
            { name: 'Dropdown', value: 'select' },
          ],
        },
      ],
    },
  ],
  execute: handleRoleCommand,
};
