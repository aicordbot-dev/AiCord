/**
 * src/commands/standalone-mod.ts
 * Standalone top-level moderation slash commands:
 * - /ban user:<user> [reason:<string>] [duration:<string>] [delete_days:<integer>]
 * - /kick user:<user> [reason:<string>]
 * - /timeout user:<user> duration:<string> [reason:<string>]
 * - /warn user:<user> reason:<string>
 * - /purge amount:<integer> [user:<user>]
 *
 * Each delegates directly to the robust handlers in src/commands/mod.ts.
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  handleBan,
  handleKick,
  handleTimeout,
  handleWarn,
  handlePurge,
} from './mod';

export async function handleStandaloneBan(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const moderatorId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const moderatorTag = interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';
  const options = (interaction.data.options ?? []) as Array<{ name: string; value: unknown }>;

  await handleBan(token, guildId, moderatorId, moderatorTag, options, interaction);
}

export async function handleStandaloneKick(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const moderatorId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const moderatorTag = interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';
  const options = (interaction.data.options ?? []) as Array<{ name: string; value: unknown }>;

  await handleKick(token, guildId, moderatorId, moderatorTag, options, interaction);
}

export async function handleStandaloneTimeout(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const moderatorId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const moderatorTag = interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';
  const options = (interaction.data.options ?? []) as Array<{ name: string; value: unknown }>;

  await handleTimeout(token, guildId, moderatorId, moderatorTag, options, interaction);
}

export async function handleStandaloneWarn(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const moderatorId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const moderatorTag = interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';
  const options = (interaction.data.options ?? []) as Array<{ name: string; value: unknown }>;

  await handleWarn(token, guildId, moderatorId, moderatorTag, options, interaction);
}

export async function handleStandalonePurge(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();
  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const channelId = interaction.channel_id ?? '';
  const options = (interaction.data.options ?? []) as Array<{ name: string; value: unknown }>;

  await handlePurge(token, guildId, channelId, options);
}

export const banCommand: RegisteredCommand = {
  name: 'ban',
  description: 'Ban a member from the server',
  category: 'moderation',
  default_member_permissions: PermissionFlags.BAN_MEMBERS.toString(),
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 10_000 },
  options: [
    {
      name: 'user',
      description: 'The member to ban',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason for the ban',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 500,
    },
    {
      name: 'duration',
      description: 'Temporary ban duration (e.g. 7d, 24h, 30m) — leave blank for permanent',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: 'delete_days',
      description: 'Days of messages to delete (0-7)',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 0,
      max_value: 7,
    },
  ],
  execute: handleStandaloneBan,
};

export const kickCommand: RegisteredCommand = {
  name: 'kick',
  description: 'Kick a member from the server',
  category: 'moderation',
  default_member_permissions: PermissionFlags.KICK_MEMBERS.toString(),
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 10_000 },
  options: [
    {
      name: 'user',
      description: 'The member to kick',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason for the kick',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 500,
    },
  ],
  execute: handleStandaloneKick,
};

export const timeoutCommand: RegisteredCommand = {
  name: 'timeout',
  description: 'Timeout a member',
  category: 'moderation',
  default_member_permissions: PermissionFlags.MODERATE_MEMBERS.toString(),
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 10_000 },
  options: [
    {
      name: 'user',
      description: 'The member to timeout',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'duration',
      description: 'Timeout duration (e.g. 10m, 1h, 7d)',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason for the timeout',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 500,
    },
  ],
  execute: handleStandaloneTimeout,
};

export const warnCommand: RegisteredCommand = {
  name: 'warn',
  description: 'Warn a member',
  category: 'moderation',
  default_member_permissions: PermissionFlags.MODERATE_MEMBERS.toString(),
  dm_permission: false,
  rateLimit: { limit: 10, windowMs: 10_000 },
  options: [
    {
      name: 'user',
      description: 'The member to warn',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason for the warning',
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 500,
    },
  ],
  execute: handleStandaloneWarn,
};

export const purgeCommand: RegisteredCommand = {
  name: 'purge',
  description: 'Bulk delete messages',
  category: 'moderation',
  default_member_permissions: PermissionFlags.MANAGE_MESSAGES.toString(),
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'amount',
      description: 'Number of messages to delete (2-100)',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 2,
      max_value: 100,
    },
    {
      name: 'user',
      description: 'Only delete messages from this user',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  execute: handleStandalonePurge,
};
