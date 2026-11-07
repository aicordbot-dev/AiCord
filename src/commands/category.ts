/**
 * src/commands/category.ts
 * Category Management Slash Command (/category):
 * - /category create name:<string> [position:<integer>]
 * - /category edit category:<channel> [name:<string>] [position:<integer>]
 * - /category delete category:<channel> [confirm:<boolean>]
 */

import {
  ApplicationCommandOptionType,
  ChannelType,
  Routes,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import { AuditLog } from '@/models/AuditLog';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, infoEmbed } from '@/lib/discord/embeds';
import { CHANNEL_NAME_MAX } from '@/lib/limits';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

export function sanitizeCategoryName(name: string): string {
  const sanitized = name.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, CHANNEL_NAME_MAX);
  return sanitized || 'category';
}

export async function handleCategoryCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();

  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const options = interaction.data.options ?? [];

  // Check invoker permissions (MANAGE_CHANNELS required)
  const memberPerms = interaction.member?.permissions ?? '0';
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_CHANNELS)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Missing Permission',
          'You need the **Manage Channels** (`MANAGE_CHANNELS`) permission to manage categories.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const subcommand = options[0] as {
    name: string;
    options?: Array<{ name: string; value: unknown }>;
  };
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'create':
      await handleCategoryCreate(token, guildId, subOptions, interaction);
      break;
    case 'edit':
      await handleCategoryEdit(token, guildId, subOptions, interaction);
      break;
    case 'delete':
      await handleCategoryDelete(token, guildId, subOptions, interaction);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown subcommand', `Unknown category subcommand: ${subcommand?.name}`)],
        ephemeral: true,
      });
  }
}

export async function handleCategoryCreate(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const name = getOption<string>(options, 'name');
  if (!name) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Name', 'Please provide a category name.')],
      ephemeral: true,
    });
    return;
  }

  const position = getOption<number>(options, 'position');
  const sanitizedName = sanitizeCategoryName(name);

  try {
    const rest = getDiscordRest();
    const body: Record<string, unknown> = {
      name: sanitizedName,
      type: ChannelType.GuildCategory,
    };
    if (position !== undefined && position !== null) {
      body.position = Number(position);
    }

    const category = (await discordApiCall(() =>
      rest.post(Routes.guildChannels(guildId), { body }),
    )) as { id: string; name: string };

    const invokerId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
    const invokerTag = interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';

    await AuditLog.create({
      guildId,
      type: 'config_change',
      userId: invokerId,
      userTag: invokerTag,
      metadata: {
        action: 'category_create',
        categoryId: category.id,
        name: category.name,
        position,
      },
    });

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Category Created',
          `Created category **${category.name}** (<#${category.id}>) successfully.`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/category create] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Create Category', 'Could not create category. Check my permissions.')],
    });
  }
}

export async function handleCategoryEdit(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const categoryId = getOption<string>(options, 'category');
  if (!categoryId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Category', 'Please specify a category to edit.')],
      ephemeral: true,
    });
    return;
  }

  const name = getOption<string>(options, 'name');
  const position = getOption<number>(options, 'position');

  if (!name && position === undefined) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed('Missing Options', 'Please specify at least one property to update (name or position).'),
      ],
      ephemeral: true,
    });
    return;
  }

  const body: Record<string, unknown> = {};
  if (name) {
    body.name = sanitizeCategoryName(name);
  }
  if (position !== undefined && position !== null) {
    body.position = Number(position);
  }

  try {
    const rest = getDiscordRest();
    await discordApiCall(() => rest.patch(Routes.channel(categoryId), { body }));

    const invokerId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
    const invokerTag = interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';

    await AuditLog.create({
      guildId,
      type: 'config_change',
      userId: invokerId,
      userTag: invokerTag,
      metadata: {
        action: 'category_edit',
        categoryId,
        name,
        position,
      },
    });

    await editInteractionResponse(token, {
      embeds: [successEmbed('Category Updated', `Updated category <#${categoryId}> successfully.`)],
    });
  } catch (err) {
    console.error('[/category edit] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Edit Category', 'Could not update category. Check my permissions.')],
    });
  }
}

export async function handleCategoryDelete(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const categoryId = getOption<string>(options, 'category');
  if (!categoryId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Category', 'Please specify a category to delete.')],
      ephemeral: true,
    });
    return;
  }

  const confirm = getOption<boolean>(options, 'confirm');
  if (confirm === false) {
    await editInteractionResponse(token, {
      embeds: [infoEmbed('Deletion Cancelled', 'Category deletion was cancelled.')],
    });
    return;
  }

  try {
    const rest = getDiscordRest();
    await discordApiCall(() => rest.delete(Routes.channel(categoryId)));

    const invokerId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
    const invokerTag = interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';

    await AuditLog.create({
      guildId,
      type: 'config_change',
      userId: invokerId,
      userTag: invokerTag,
      metadata: {
        action: 'category_delete',
        categoryId,
      },
    });

    await editInteractionResponse(token, {
      embeds: [successEmbed('Category Deleted', 'The category has been deleted.')],
    });
  } catch (err) {
    console.error('[/category delete] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Delete Category', 'Could not delete category. Check my permissions.')],
    });
  }
}

export const categoryCommand: RegisteredCommand = {
  name: 'category',
  description: 'Manage server categories',
  category: 'utility',
  default_member_permissions: PermissionFlags.MANAGE_CHANNELS.toString(),
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'create',
      description: 'Create a new category',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'name',
          description: 'Category name',
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 100,
        },
        {
          name: 'position',
          description: 'Category position order',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 0,
        },
      ],
    },
    {
      name: 'edit',
      description: 'Edit a category',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category',
          description: 'The category to edit',
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
        {
          name: 'name',
          description: 'New category name',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 100,
        },
        {
          name: 'position',
          description: 'New category position order',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 0,
        },
      ],
    },
    {
      name: 'delete',
      description: 'Delete a category',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category',
          description: 'The category to delete',
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
        {
          name: 'confirm',
          description: 'Confirm deletion of this category',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
  ],
  execute: handleCategoryCommand,
};
