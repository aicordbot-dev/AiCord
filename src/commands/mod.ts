/**
 * src/commands/mod.ts
 * Handles /mod subcommands: ban, kick, timeout, warn, warnings, purge, case, modlog.
 */

import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import { GuildConfig } from '@/models/GuildConfig';
import { Warning } from '@/models/Warning';
import { ModCase } from '@/models/ModCase';
import { TempAction } from '@/models/TempAction';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, infoEmbed, clampEmbed, Colors } from '@/lib/discord/embeds';
import {
  createModCase,
  parseDuration,
  formatDuration,
} from '@/lib/discord/mod-utils';
import { validateBulkDeleteCount, BULK_DELETE_MAX_AGE_DAYS } from '@/lib/limits';

function getOption<T = string>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
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
      await handleBan(token, guildId, moderatorId, moderatorTag, subOptions);
      break;
    case 'kick':
      await handleKick(token, guildId, moderatorId, moderatorTag, subOptions);
      break;
    case 'timeout':
      await handleTimeout(token, guildId, moderatorId, moderatorTag, subOptions);
      break;
    case 'warn':
      await handleWarn(token, guildId, moderatorId, moderatorTag, subOptions);
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

async function handleBan(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';
  const deleteDays = getOption<number>(options, 'delete_days') ?? 0;
  const durationStr = getOption<string>(options, 'duration');

  if (!userId) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing User', 'Please specify a user to ban.')], ephemeral: true });
    return;
  }

  let durationMs: number | undefined;
  let expiresAt: Date | undefined;
  if (durationStr) {
    const parsed = parseDuration(durationStr);
    if (!parsed) {
      await editInteractionResponse(token, { embeds: [errorEmbed('Invalid Duration', 'Use format: 10m, 2h, 7d, 2w')], ephemeral: true });
      return;
    }
    durationMs = parsed;
    expiresAt = new Date(Date.now() + parsed);
  }

  try {
    const rest = getDiscordRest();

    // Get user info first
    const targetUser = await discordApiCall(() =>
      rest.get(Routes.user(userId)) as Promise<{ username: string; discriminator: string }>,
    );
    const targetTag = `${targetUser.username}#${targetUser.discriminator}`;

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
      action: durationMs ? 'ban' : 'ban',
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
      embeds: [successEmbed(
        `User Banned`,
        `**${targetTag}** has been banned${durationText}.\n**Reason:** ${reason}\n**Case:** #${caseNumber}`,
      )],
    });
  } catch (err) {
    console.error('[/mod ban] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Ban Failed', 'Could not ban the user. Check permissions and role hierarchy.')],
    });
  }
}

async function handleKick(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';

  if (!userId) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing User', 'Please specify a user to kick.')], ephemeral: true });
    return;
  }

  try {
    const rest = getDiscordRest();
    const targetUser = await discordApiCall(() =>
      rest.get(Routes.user(userId)) as Promise<{ username: string; discriminator: string }>,
    );
    const targetTag = `${targetUser.username}#${targetUser.discriminator}`;

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
      embeds: [successEmbed('User Kicked', `**${targetTag}** has been kicked.\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)],
    });
  } catch (err) {
    console.error('[/mod kick] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Kick Failed', 'Could not kick the user. Check permissions and role hierarchy.')],
    });
  }
}

async function handleTimeout(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const durationStr = getOption<string>(options, 'duration') ?? '';
  const reason = getOption<string>(options, 'reason') ?? 'No reason provided';

  if (!userId) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing User', 'Please specify a user to timeout.')], ephemeral: true });
    return;
  }

  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Invalid Duration', 'Use format: 10m, 2h, 7d (max 28d)')], ephemeral: true });
    return;
  }

  const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
  if (durationMs > MAX_TIMEOUT_MS) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Duration Too Long', 'Timeout cannot exceed 28 days.')], ephemeral: true });
    return;
  }

  try {
    const rest = getDiscordRest();
    const targetUser = await discordApiCall(() =>
      rest.get(Routes.user(userId)) as Promise<{ username: string; discriminator: string }>,
    );
    const targetTag = `${targetUser.username}#${targetUser.discriminator}`;
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
      embeds: [successEmbed(
        'User Timed Out',
        `**${targetTag}** has been timed out for **${formatDuration(durationMs)}**.\n**Reason:** ${reason}\n**Case:** #${caseNumber}`,
      )],
    });
  } catch (err) {
    console.error('[/mod timeout] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Timeout Failed', 'Could not timeout the user. Check permissions and role hierarchy.')],
    });
  }
}

async function handleWarn(
  token: string,
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  const reason = getOption<string>(options, 'reason');

  if (!userId || !reason) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing Arguments', 'Please provide a user and reason.')], ephemeral: true });
    return;
  }

  try {
    const rest = getDiscordRest();
    const targetUser = await discordApiCall(() =>
      rest.get(Routes.user(userId)) as Promise<{ username: string; discriminator: string }>,
    );
    const targetTag = `${targetUser.username}#${targetUser.discriminator}`;

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
      embeds: [successEmbed(
        'User Warned',
        `**${targetTag}** has been warned.\n**Reason:** ${reason}\n**Case:** #${caseNumber}\n**Total active warnings:** ${warnCount}`,
      )],
    });
  } catch (err) {
    console.error('[/mod warn] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Warn Failed', 'Could not warn the user.')],
    });
  }
}

async function handleWarnings(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const userId = getOption<string>(options, 'user');
  if (!userId) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing User', 'Please specify a user.')], ephemeral: true });
    return;
  }

  const warnings = await Warning.find({ guildId, userId, active: true }).sort({ createdAt: -1 }).limit(10);

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
    embeds: [clampEmbed({
      color: Colors.WARNING,
      title: `⚠️ Warnings for <@${userId}>`,
      description: `${warnings.length} active warning(s)`,
      fields,
    })],
  });
}

async function handlePurge(
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
    await editInteractionResponse(token, { embeds: [errorEmbed('Invalid Amount', String(err))], ephemeral: true });
    return;
  }

  try {
    const rest = getDiscordRest();

    // Fetch messages
    const messages = await discordApiCall(() =>
      rest.get(Routes.channelMessages(channelId), {
        query: new URLSearchParams({ limit: '100' }),
      }) as Promise<Array<{ id: string; author: { id: string }; timestamp: string }>>,
    );

    const cutoff = Date.now() - (BULK_DELETE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    const eligible = messages
      .filter((m) => new Date(m.timestamp).getTime() > cutoff)
      .filter((m) => !targetUserId || m.author.id === targetUserId)
      .slice(0, amount)
      .map((m) => m.id);

    if (eligible.length < 2) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Nothing to Delete', 'No eligible messages found (messages must be under 14 days old).')],
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
      embeds: [successEmbed('Messages Purged', `Deleted **${eligible.length}** message(s) from <#${channelId}>.`)],
    });

    // Auto-delete the success message after 5s to keep the channel clean
    setTimeout(async () => {
      try {
        // Can't delete the edit, but can follow up with no content
      } catch {}
    }, 5000);
  } catch (err) {
    console.error('[/mod purge] Error:', err);
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Purge Failed', 'Could not delete messages. Check my Manage Messages permission.')],
    });
  }
}

async function handleCase(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const caseNumber = getOption<number>(options, 'number');
  if (!caseNumber) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing Case Number', 'Please provide a case number.')], ephemeral: true });
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
    ban: '🔨', kick: '👢', timeout: '⏱️', warn: '⚠️',
    softban: '🔇', unban: '✅', untimeout: '✅',
  };

  await editInteractionResponse(token, {
    embeds: [clampEmbed({
      color: Colors.INFO,
      title: `${ACTION_EMOJI[modCase.action] ?? '📋'} Case #${caseNumber} — ${modCase.action.toUpperCase()}`,
      fields: [
        { name: 'Target', value: `<@${modCase.targetId}> (${modCase.targetTag})`, inline: true },
        { name: 'Moderator', value: `<@${modCase.moderatorId}> (${modCase.moderatorTag})`, inline: true },
        { name: 'Reason', value: modCase.reason },
        { name: 'Date', value: `<t:${Math.floor(modCase.createdAt.getTime() / 1000)}:F>`, inline: true },
        ...(modCase.duration ? [{ name: 'Duration', value: formatDuration(modCase.duration), inline: true }] : []),
      ],
    })],
  });
}

async function handleModlogSetup(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const channelId = getOption<string>(options, 'channel');
  if (!channelId) {
    await editInteractionResponse(token, { embeds: [errorEmbed('Missing Channel', 'Please select a channel.')], ephemeral: true });
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
