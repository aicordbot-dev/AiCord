/**
 * src/commands/role.ts
 * Handles /role subcommands: create, delete, assign, remove, panel.
 */

import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import { RolePanel } from '@/models/RolePanel';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  editInteractionResponse,
  buildButton,
  buildActionRow,
} from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, infoEmbed, clampEmbed, Colors } from '@/lib/discord/embeds';
import { sanitizeRoleName } from '@/lib/limits';

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
