/**
 * src/commands/mod.ts
 * Handles /mod subcommands: ban, kick, timeout, warn, warnings, purge, case, modlog,
 * unban, untimeout, softban, clearwarnings.
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import { GuildConfig } from '@/models/GuildConfig';
import { Warning } from '@/models/Warning';
import { ModCase } from '@/models/ModCase';
import { TempAction } from '@/models/TempAction';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import {
  editInteractionResponse,
  resolveApplicationId,
} from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, infoEmbed, clampEmbed, Colors } from '@/lib/discord/embeds';
import {
  createModCase,
  parseDuration,
  formatDuration,
} from '@/lib/discord/mod-utils';
import { validateBulkDeleteCount, BULK_DELETE_MAX_AGE_DAYS } from '@/lib/limits';
import { PermissionEngine, type ActionType } from '@/lib/discord/permission-engine';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

/**
 * Verify role hierarchy and permissions for moderation actions using PermissionEngine.canActOn.
 */
export async function verifyModerationHierarchy(
  interaction: APIChatInputApplicationCommandInteraction,
  guildId: string,
  targetUserId: string,
  action: ActionType,
): Promise<{ allowed: boolean; message?: string; targetTag?: string }> {
  const moderatorId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const botId = resolveApplicationId();

  if (moderatorId && moderatorId === targetUserId) {
    return {
      allowed: false,
      message: 'You cannot perform this moderation action on yourself.',
    };
  }

  if (botId && botId === targetUserId) {
    return {
      allowed: false,
      message: 'AiCord cannot perform this moderation action on itself.',
    };
  }

  const rest = getDiscordRest();

  // 1. Fetch guild info for owner_id
  let guildOwnerId = '';
  try {
    const guild = (await discordApiCall(() =>
      rest.get(Routes.guild(guildId)),
    )) as { owner_id?: string };
    guildOwnerId = guild.owner_id ?? '';
  } catch {}

  if (guildOwnerId && targetUserId === guildOwnerId) {
    return {
      allowed: false,
      message: 'The server owner has immunity and cannot be moderated.',
    };
  }

  // 2. Fetch guild roles
  let roles: Array<{ id: string; position: number; tags?: { bot_id?: string } }> = [];
  try {
    roles = (await discordApiCall(() =>
      rest.get(Routes.guildRoles(guildId)),
    )) as Array<{ id: string; position: number; tags?: { bot_id?: string } }>;
  } catch {}

  // 3. Resolve target member info if in guild
  let targetHighestPosition: number | undefined;
  let targetTag: string | undefined;

  try {
    const member = (await discordApiCall(() =>
      rest.get(Routes.guildMember(guildId, targetUserId)),
    )) as {
      roles?: string[];
      user?: { username?: string; discriminator?: string };
    };
    if (member?.user) {
      targetTag = `${member.user.username}#${member.user.discriminator ?? '0'}`;
    }
    if (member?.roles && roles.length > 0) {
      targetHighestPosition = 0;
      for (const rid of member.roles) {
        const r = roles.find((x) => x.id === rid);
        if (r && r.position > targetHighestPosition) {
          targetHighestPosition = r.position;
        }
      }
    }
  } catch {
    // Target might not be in the server (e.g. banning by user ID)
  }

  // 4. Resolve invoker highest role position
  let invokerHighestPosition = 0;
  const invokerRoles = (interaction.member?.roles ?? []) as string[];
  if (roles.length > 0) {
    for (const rid of invokerRoles) {
      const r = roles.find((x) => x.id === rid);
      if (r && r.position > invokerHighestPosition) {
        invokerHighestPosition = r.position;
      }
    }
  }

  // 5. Resolve bot highest role position
  let botHighestPosition = 0;
  if (roles.length > 0) {
    try {
      const botMember = (await discordApiCall(() =>
        rest.get(Routes.guildMember(guildId, botId)),
      )) as { roles?: string[] };
      if (botMember?.roles) {
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
  }

  const check = PermissionEngine.canActOn({
    guildOwnerId,
    invoker: {
      id: moderatorId,
      highestRolePosition: invokerHighestPosition,
      permissions: interaction.member?.permissions ?? '0',
    },
    target: {
      id: targetUserId,
      highestRolePosition: targetHighestPosition,
    },
    bot: {
      id: botId,
      highestRolePosition: botHighestPosition,
      permissions: PermissionFlags.ADMINISTRATOR,
    },
    action,
  });

  if (!check.allowed) {
    return { allowed: false, message: check.message, targetTag };
  }

  return { allowed: true, targetTag };
}

export async function handleModCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();

  const guildId = interaction.guild_id!;
  const token = interaction.token;
  const moderatorId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const moderatorTag = interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';
  const options = interaction.data.options ?? [];

  const subcommand = options[0] as { name: string; options?: Array<{ name: string; value: unknown }> };
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'ban':
      await handleBan(token, guildId, moderatorId, moderatorTag, subOptions, interaction);
      break;
    case 'kick':
      await handleKick(token, guildId, moderatorId, moderatorTag, subOptions, interaction);
      break;
    case 'timeout':
      await handleTimeout(token, guildId, moderatorId, moderatorTag, subOptions, interaction);
      break;
    case 'softban':
      await handleSoftban(token, guildId, moderatorId, moderatorTag, subOptions, interaction);
      break;
    case 'unban':
      await handleUnban(token, guildId, moderatorId, moderatorTag, subOptions, interaction);
      break;
    case 'untimeout':
      await handleUntimeout(token, guildId, moderatorId, moderatorTag, subOptions, interaction);
      break;
    case 'clearwarnings':
      await handleClearWarnings(token, guildId, moderatorId, moderatorTag, subOptions, interaction);
      break;
    case 'warn':
      await handleWarn(token, guildId, moderatorId, moderatorTag, subOptions, interaction);
      break;
    case 'warnings':
      await handleWarnings(token, guildId, subOptions);
      break;
    case 'purge':
      await handlePurge(token, guildId, interaction.channel_id ?? '', subOptions);
      break;
    case 'case':
      await handleCase(token, guildId, subOptions);
      break;
    case 'modlog':
      await handleModlogSetup(token, guildId, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown subcommand', `Unknown mod subcommand: ${subcommand?.name}`)],
        ephemeral: true,
      });
  }
}

export async function handleBan(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
  interaction?: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';
  const deleteDays = getOption<number>(options, 'delete_days') ?? 0;
  const durationStr = getOption<string>(options, 'duration');

  if (!userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing User', 'Please specify a user to ban.')],
      ephemeral: true,
    });
    return;
  }

  // Hierarchy and permission check
  if (interaction) {
    const permCheck = await verifyModerationHierarchy(interaction, guildId, userId, 'ban');
    if (!permCheck.allowed) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Action Denied', permCheck.message!)],
        ephemeral: true,
      });
      return;
    }
  }

  let durationMs: number | undefined;
  let expiresAt: Date | undefined;
  if (durationStr) {
    const parsed = parseDuration(durationStr);
    if (!parsed) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Invalid Duration', 'Use format: 10m, 2h, 7d, 2w')],
        ephemeral: true,
      });
      return;
    }
    durationMs = parsed;
    expiresAt = new Date(Date.now() + parsed);
  }

  try {
    const rest = getDiscordRest();

    let targetTag = `User (${userId})`;
    try {
      const targetUser = (await discordApiCall(() =>
        rest.get(Routes.user(userId)),
      )) as { username: string; discriminator: string };
      targetTag = `${targetUser.username}#${targetUser.discriminator ?? '0'}`;
    } catch {}

    await discordApiCall(() =>
      rest.put(Routes.guildBan(guildId, userId), {
        body: {
          delete_message_seconds: deleteDays * 86400,
          reason: `[Case] ${reason} | Moderator: ${moderatorTag}`,
        },
      }),
    );

    const caseNumber = await createModCase({
      guildId,
      action: 'ban',
      targetId: userId,
      targetTag,
      moderatorId,
      moderatorTag,
      reason,
      duration: durationMs,
      expiresAt,
    });

    // Schedule temp-ban expiry if duration given
    if (expiresAt) {
      await TempAction.create({
        guildId,
        type: 'temp_ban',
        userId,
        moderatorId,
        expiresAt,
        caseNumber,
      });
    }

    const durationText = durationMs ? ` for ${formatDuration(durationMs)}` : ' permanently';
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'User Banned',
          `**${targetTag}** has been banned${durationText}.\n**Reason:** ${reason}\n**Case:** #${caseNumber}`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod ban] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Ban Failed', 'Could not ban the user. Check permissions and role hierarchy.')],
    });
  }
}

export async function handleKick(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
  interaction?: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';

  if (!userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing User', 'Please specify a user to kick.')],
      ephemeral: true,
    });
    return;
  }

  // Hierarchy and permission check
  if (interaction) {
    const permCheck = await verifyModerationHierarchy(interaction, guildId, userId, 'kick');
    if (!permCheck.allowed) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Action Denied', permCheck.message!)],
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const rest = getDiscordRest();
    let targetTag = `User (${userId})`;
    try {
      const targetUser = (await discordApiCall(() =>
        rest.get(Routes.user(userId)),
      )) as { username: string; discriminator: string };
      targetTag = `${targetUser.username}#${targetUser.discriminator ?? '0'}`;
    } catch {}

    await discordApiCall(() =>
      rest.delete(Routes.guildMember(guildId, userId), {
        reason: `${reason} | Moderator: ${moderatorTag}`,
      }),
    );

    const caseNumber = await createModCase({
      guildId,
      action: 'kick',
      targetId: userId,
      targetTag,
      moderatorId,
      moderatorTag,
      reason,
    });

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'User Kicked',
          `**${targetTag}** has been kicked.\n**Reason:** ${reason}\n**Case:** #${caseNumber}`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod kick] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Kick Failed', 'Could not kick the user. Check permissions and role hierarchy.')],
    });
  }
}

export async function handleTimeout(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
  interaction?: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const durationStr = getOption<string>(options, 'duration') ?? '';
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';

  if (!userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing User', 'Please specify a user to timeout.')],
      ephemeral: true,
    });
    return;
  }

  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Duration', 'Use format: 10m, 2h, 7d (max 28d)')],
      ephemeral: true,
    });
    return;
  }

  const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
  if (durationMs > MAX_TIMEOUT_MS) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Duration Too Long', 'Timeout cannot exceed 28 days.')],
      ephemeral: true,
    });
    return;
  }

  // Hierarchy and permission check
  if (interaction) {
    const permCheck = await verifyModerationHierarchy(interaction, guildId, userId, 'timeout');
    if (!permCheck.allowed) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Action Denied', permCheck.message!)],
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const rest = getDiscordRest();
    let targetTag = `User (${userId})`;
    try {
      const targetUser = (await discordApiCall(() =>
        rest.get(Routes.user(userId)),
      )) as { username: string; discriminator: string };
      targetTag = `${targetUser.username}#${targetUser.discriminator ?? '0'}`;
    } catch {}

    const expiresAt = new Date(Date.now() + durationMs);

    await discordApiCall(() =>
      rest.patch(Routes.guildMember(guildId, userId), {
        body: { communication_disabled_until: expiresAt.toISOString() },
        reason: `${reason} | Moderator: ${moderatorTag}`,
      }),
    );

    const caseNumber = await createModCase({
      guildId,
      action: 'timeout',
      targetId: userId,
      targetTag,
      moderatorId,
      moderatorTag,
      reason,
      duration: durationMs,
      expiresAt,
    });

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'User Timed Out',
          `**${targetTag}** has been timed out for **${formatDuration(durationMs)}**.\n**Reason:** ${reason}\n**Case:** #${caseNumber}`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod timeout] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Timeout Failed', 'Could not timeout the user. Check permissions and role hierarchy.')],
    });
  }
}

export async function handleSoftban(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
  interaction?: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';
  const deleteDays = getOption<number>(options, 'delete_days') ?? 1;

  if (!userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing User', 'Please specify a user to softban.')],
      ephemeral: true,
    });
    return;
  }

  if (deleteDays < 1 || deleteDays > 7) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Delete Days', 'Delete days must be between 1 and 7.')],
      ephemeral: true,
    });
    return;
  }

  // Hierarchy and permission check
  if (interaction) {
    const permCheck = await verifyModerationHierarchy(interaction, guildId, userId, 'softban');
    if (!permCheck.allowed) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Action Denied', permCheck.message!)],
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const rest = getDiscordRest();
    let targetTag = `User (${userId})`;
    try {
      const targetUser = (await discordApiCall(() =>
        rest.get(Routes.user(userId)),
      )) as { username: string; discriminator: string };
      targetTag = `${targetUser.username}#${targetUser.discriminator ?? '0'}`;
    } catch {}

    // 1. Ban target to delete messages
    await discordApiCall(() =>
      rest.put(Routes.guildBan(guildId, userId), {
        body: {
          delete_message_seconds: deleteDays * 86400,
          reason: `[Softban] ${reason} | Moderator: ${moderatorTag}`,
        },
      }),
    );

    // 2. Immediately unban
    await discordApiCall(() => rest.delete(Routes.guildBan(guildId, userId)));

    const caseNumber = await createModCase({
      guildId,
      action: 'softban',
      targetId: userId,
      targetTag,
      moderatorId,
      moderatorTag,
      reason,
    });

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'User Softbanned',
          `**${targetTag}** has been softbanned (messages deleted for ${deleteDays} day(s)).\n**Reason:** ${reason}\n**Case:** #${caseNumber}`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod softban] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Softban Failed', 'Could not softban the user. Check permissions and role hierarchy.')],
    });
  }
}

export async function handleUnban(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
  interaction?: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const userId = getOption<string>(options, 'user_id') ?? getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';

  if (!userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing User ID', 'Please provide the user ID to unban.')],
      ephemeral: true,
    });
    return;
  }

  if (interaction?.member?.permissions) {
    if (!hasPermission(interaction.member.permissions, PermissionFlags.BAN_MEMBERS)) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Missing Permission',
            'You need the **Ban Members** (`BAN_MEMBERS`) permission to unban members.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const rest = getDiscordRest();

    await discordApiCall(() => rest.delete(Routes.guildBan(guildId, userId)));

    let targetTag = `User (${userId})`;
    try {
      const u = (await discordApiCall(() =>
        rest.get(Routes.user(userId)),
      )) as { username: string; discriminator: string };
      targetTag = `${u.username}#${u.discriminator ?? '0'}`;
    } catch {}

    const caseNumber = await createModCase({
      guildId,
      action: 'unban',
      targetId: userId,
      targetTag,
      moderatorId,
      moderatorTag,
      reason,
    });

    // Update any active temp actions for this user
    await TempAction.updateMany(
      { guildId, userId, processed: false, type: 'temp_ban' },
      { $set: { processed: true } },
    );

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'User Unbanned',
          `Successfully unbanned <@${userId}>.\n**Reason:** ${reason}\n**Case:** #${caseNumber}`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod unban] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Unban Failed', 'Could not unban the user. Make sure the user is banned and I have Ban Members permission.')],
    });
  }
}

export async function handleUntimeout(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
  interaction?: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';

  if (!userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing User', 'Please specify a user to untimeout.')],
      ephemeral: true,
    });
    return;
  }

  if (interaction?.member?.permissions) {
    if (!hasPermission(interaction.member.permissions, PermissionFlags.MODERATE_MEMBERS)) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Missing Permission',
            'You need the **Moderate Members** (`MODERATE_MEMBERS`) permission to remove timeouts.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const rest = getDiscordRest();

    await discordApiCall(() =>
      rest.patch(Routes.guildMember(guildId, userId), {
        body: { communication_disabled_until: null },
        reason: `[Untimeout] ${reason} | Moderator: ${moderatorTag}`,
      }),
    );

    let targetTag = `User (${userId})`;
    try {
      const u = (await discordApiCall(() =>
        rest.get(Routes.user(userId)),
      )) as { username: string; discriminator: string };
      targetTag = `${u.username}#${u.discriminator ?? '0'}`;
    } catch {}

    const caseNumber = await createModCase({
      guildId,
      action: 'untimeout',
      targetId: userId,
      targetTag,
      moderatorId,
      moderatorTag,
      reason,
    });

    // Update active temp timeouts
    await TempAction.updateMany(
      { guildId, userId, processed: false, type: 'temp_timeout' },
      { $set: { processed: true } },
    );

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Timeout Removed',
          `Removed timeout for **${targetTag}** (<@${userId}>).\n**Reason:** ${reason}\n**Case:** #${caseNumber}`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod untimeout] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Untimeout Failed', 'Could not remove timeout. Check my permissions.')],
    });
  }
}

export async function handleClearWarnings(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
  interaction?: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason');

  if (!userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing User', 'Please specify a user to clear warnings for.')],
      ephemeral: true,
    });
    return;
  }

  if (interaction?.member?.permissions) {
    if (
      !hasPermission(interaction.member.permissions, PermissionFlags.MODERATE_MEMBERS) &&
      !hasPermission(interaction.member.permissions, PermissionFlags.KICK_MEMBERS)
    ) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Missing Permission',
            'You need moderation permissions to clear user warnings.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const result = await Warning.updateMany(
      { guildId, userId, active: true },
      { $set: { active: false } },
    );

    const count = result.modifiedCount ?? 0;

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Warnings Cleared',
          `Cleared **${count}** active warning(s) for <@${userId}>.${reason ? `\n**Reason:** ${reason}` : ''}`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod clearwarnings] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Clear Warnings', 'An error occurred while clearing warnings.')],
    });
  }
}

export async function handleWarn(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
  interaction?: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason');

  if (!userId || !reason) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Arguments', 'Please provide a user and reason.')],
      ephemeral: true,
    });
    return;
  }

  if (interaction) {
    const permCheck = await verifyModerationHierarchy(interaction, guildId, userId, 'warn');
    if (!permCheck.allowed) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Action Denied', permCheck.message!)],
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const rest = getDiscordRest();
    let targetTag = `User (${userId})`;
    try {
      const targetUser = (await discordApiCall(() =>
        rest.get(Routes.user(userId)),
      )) as { username: string; discriminator: string };
      targetTag = `${targetUser.username}#${targetUser.discriminator ?? '0'}`;
    } catch {}

    const caseNumber = await createModCase({
      guildId,
      action: 'warn',
      targetId: userId,
      targetTag,
      moderatorId,
      moderatorTag,
      reason,
    });

    // Count active warnings for escalation notice
    const warnCount = await Warning.countDocuments({ guildId, userId, active: true });

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'User Warned',
          `**${targetTag}** has been warned.\n**Reason:** ${reason}\n**Case:** #${caseNumber}\n**Total active warnings:** ${warnCount}`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod warn] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Warn Failed', 'Could not warn the user.')],
    });
  }
}

export async function handleWarnings(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  if (!userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing User', 'Please specify a user.')],
      ephemeral: true,
    });
    return;
  }

  const warnings = await Warning.find({ guildId, userId, active: true })
    .sort({ createdAt: -1 })
    .limit(10);

  if (warnings.length === 0) {
    await editInteractionResponse(token, {
      embeds: [infoEmbed('No Warnings', `<@${userId}> has no active warnings.`)],
    });
    return;
  }

  const fields = warnings.map((w, i) => ({
    name: `Warning #${i + 1} — Case #${w.caseNumber ?? 'N/A'}`,
    value: `**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}>\n**Date:** <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`,
  }));

  await editInteractionResponse(token, {
    embeds: [
      clampEmbed({
        color: Colors.WARNING,
        title: `⚠️ Warnings for <@${userId}>`,
        description: `${warnings.length} active warning(s)`,
        fields,
      }),
    ],
  });
}

export async function handlePurge(
  token: string,
  guildId: string,
  channelId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const amount = getOption<number>(options, 'amount') ?? 10;
  const targetUserId = getOption<string>(options, 'user');

  try {
    validateBulkDeleteCount(amount);
  } catch (err) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Amount', String(err))],
      ephemeral: true,
    });
    return;
  }

  try {
    const rest = getDiscordRest();

    // Fetch messages
    const messages = (await discordApiCall(() =>
      rest.get(Routes.channelMessages(channelId), {
        query: new URLSearchParams({ limit: '100' }),
      }),
    )) as Array<{ id: string; author: { id: string }; timestamp: string }>;

    const cutoff = Date.now() - BULK_DELETE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const eligible = messages
      .filter((m) => new Date(m.timestamp).getTime() > cutoff)
      .filter((m) => !targetUserId || m.author.id === targetUserId)
      .slice(0, amount)
      .map((m) => m.id);

    if (eligible.length < 2) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Nothing to Delete',
            'No eligible messages found (messages must be under 14 days old).',
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await discordApiCall(() =>
      rest.post(Routes.channelBulkDelete(channelId), {
        body: { messages: eligible },
      }),
    );

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Messages Purged',
          `Deleted **${eligible.length}** message(s) from <#${channelId}>.`,
        ),
      ],
    });
  } catch (err) {
    console.error('[/mod purge] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Purge Failed', 'Could not delete messages. Check my Manage Messages permission.')],
    });
  }
}

export async function handleCase(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const caseNumber = getOption<number>(options, 'number');
  if (!caseNumber) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Case Number', 'Please provide a case number.')],
      ephemeral: true,
    });
    return;
  }

  const modCase = await ModCase.findOne({ guildId, caseNumber });
  if (!modCase) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Case Not Found', `Case #${caseNumber} does not exist in this server.`)],
      ephemeral: true,
    });
    return;
  }

  const ACTION_EMOJI: Record<string, string> = {
    ban: '🔨',
    kick: '👢',
    timeout: '⏱️',
    warn: '⚠️',
    softban: '🔇',
    unban: '✅',
    untimeout: '✅',
  };

  await editInteractionResponse(token, {
    embeds: [
      clampEmbed({
        color: Colors.INFO,
        title: `${ACTION_EMOJI[modCase.action] ?? '📋'} Case #${caseNumber} — ${modCase.action.toUpperCase()}`,
        fields: [
          { name: 'Target', value: `<@${modCase.targetId}> (${modCase.targetTag})`, inline: true },
          { name: 'Moderator', value: `<@${modCase.moderatorId}> (${modCase.moderatorTag})`, inline: true },
          { name: 'Reason', value: modCase.reason },
          { name: 'Date', value: `<t:${Math.floor(modCase.createdAt.getTime() / 1000)}:F>`, inline: true },
          ...(modCase.duration ? [{ name: 'Duration', value: formatDuration(modCase.duration), inline: true }] : []),
        ],
      }),
    ],
  });
}

export async function handleModlogSetup(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const channelId = getOption<string>(options, 'channel');
  if (!channelId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Channel', 'Please select a channel.')],
      ephemeral: true,
    });
    return;
  }

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { guildId, modLogChannelId: channelId } },
    { upsert: true },
  );

  await editInteractionResponse(token, {
    embeds: [successEmbed('Mod Log Set', `Moderation actions will now be logged in <#${channelId}>.`)],
  });
}

export const modCommand: RegisteredCommand = {
  name: 'mod',
  description: 'Moderation commands',
  category: 'moderation',
  default_member_permissions: PermissionFlags.KICK_MEMBERS.toString(),
  dm_permission: false,
  rateLimit: { limit: 15, windowMs: 10_000 },
  options: [
    {
      name: 'ban',
      description: 'Ban a member',
      type: ApplicationCommandOptionType.Subcommand,
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
          name: 'delete_days',
          description: 'Days of messages to delete (0-7)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 0,
          max_value: 7,
        },
        {
          name: 'duration',
          description: 'Temporary ban duration (e.g. 7d, 24h, 30m) — leave blank for permanent',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'kick',
      description: 'Kick a member',
      type: ApplicationCommandOptionType.Subcommand,
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
    },
    {
      name: 'timeout',
      description: 'Timeout a member',
      type: ApplicationCommandOptionType.Subcommand,
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
    },
    {
      name: 'softban',
      description: 'Ban and immediately unban a member to purge messages',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The member to softban',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: 'reason',
          description: 'Reason for the softban',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 500,
        },
        {
          name: 'delete_days',
          description: 'Days of messages to delete (1-7, default 1)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 7,
        },
      ],
    },
    {
      name: 'unban',
      description: 'Unban a user from the server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user_id',
          description: 'The user ID to unban',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'reason',
          description: 'Reason for unbanning',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 500,
        },
      ],
    },
    {
      name: 'untimeout',
      description: 'Remove timeout from a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The member to remove timeout from',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: 'reason',
          description: 'Reason for removing timeout',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 500,
        },
      ],
    },
    {
      name: 'warn',
      description: 'Warn a member',
      type: ApplicationCommandOptionType.Subcommand,
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
    },
    {
      name: 'clearwarnings',
      description: 'Clear all active warnings for a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The member whose warnings will be cleared',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: 'reason',
          description: 'Reason for clearing warnings',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 500,
        },
      ],
    },
    {
      name: 'warnings',
      description: 'View warnings for a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The member to view warnings for',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: 'purge',
      description: 'Bulk delete messages',
      type: ApplicationCommandOptionType.Subcommand,
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
    },
    {
      name: 'case',
      description: 'View a moderation case',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'number',
          description: 'Case number',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'modlog',
      description: 'Set up the moderation log channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Channel to send moderation logs to',
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
      ],
    },
  ],
  execute: handleModCommand,
};
