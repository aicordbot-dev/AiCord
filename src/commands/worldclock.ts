/**
 * src/commands/worldclock.ts
 * Visual World Clock & Team Availability Overlap Finder Slash Commands for AiCord.
 *
 * Subcommands:
 * - /worldclock set: register or update member timezone and active waking hours
 * - /worldclock view: view current local time and schedule for self or target member
 * - /worldclock list: server-wide world clock dashboard
 * - /worldclock meet: cross-reference member timezones to find meeting golden hours
 *
 * Standalone Alias:
 * - /meet: quick team availability overlap finder
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import {
  successEmbed,
  errorEmbed,
  infoEmbed,
  warningEmbed,
} from '@/lib/discord/embeds';
import {
  setUserTimezone,
  getUserTimezone,
  listGuildTimezones,
  findMeetingOverlap,
  formatUserLocalTime,
  buildWorldClockEmbed,
  buildMeetingOverlapEmbed,
  buildUserTimezoneEmbed,
} from '@/lib/worldclock/worldclock-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }>,
  name: string,
): T | undefined {
  return options?.find((o) => o.name === name)?.value as T | undefined;
}

/**
 * Parses user IDs from mention strings (<@123>, <@!123>), snowflake strings, or words.
 */
export function parseUserIds(input?: string): string[] {
  if (!input || !input.trim()) return [];
  const matches = input.matchAll(/<@!?([a-zA-Z0-9_.-]+)>|(\b[a-zA-Z0-9_.-]+\b)/g);
  const ids: string[] = [];
  for (const m of matches) {
    const id = m[1] || m[2];
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleWorldClockSetSubcommand(
  guildId: string,
  userId: string,
  userTag: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const timezone = getOption<string>(subOptions, 'timezone');
  const startHour = getOption<number>(subOptions, 'start_hour');
  const endHour = getOption<number>(subOptions, 'end_hour');

  if (!timezone) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Timezone Required', 'Please provide a timezone name or abbreviation.')],
    });
    return;
  }

  try {
    const activeHours =
      startHour !== undefined || endHour !== undefined
        ? { startHour, endHour }
        : undefined;

    const record = await setUserTimezone(guildId, userId, userTag, timezone, activeHours);
    const formatted = formatUserLocalTime(record.timezone);

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Timezone Saved',
          `Your timezone is set to **${record.timezone}**.\n\n` +
            `🕒 **Local Time**: \`${formatted.local24}\` (${formatted.local12}) • \`${formatted.offsetString}\` ${formatted.icon}\n` +
            `⚡ **Active Hours**: \`${String(record.activeHours.startHour).padStart(2, '0')}:00 - ${String(record.activeHours.endHour).padStart(2, '0')}:00\` local time`,
        ),
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to set timezone.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Timezone', message)],
    });
  }
}

export async function handleWorldClockViewSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(subOptions, 'user') || userId;

  try {
    const record = await getUserTimezone(guildId, targetUserId);
    if (!record) {
      const isSelf = targetUserId === userId;
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'Timezone Not Configured',
            isSelf
              ? 'You have not set your timezone yet!\n\nUse `/worldclock set timezone:<IANA_NAME>` (e.g. `EST`, `UTC`, `America/New_York`) to join the world clock dashboard.'
              : 'This member has not configured their timezone yet.',
          ),
        ],
      });
      return;
    }

    const embed = buildUserTimezoneEmbed('Server', record);
    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to view timezone.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('View Error', message)],
    });
  }
}

export async function handleWorldClockListSubcommand(
  guildId: string,
  token: string,
): Promise<void> {
  try {
    const members = await listGuildTimezones(guildId);
    const embed = buildWorldClockEmbed('Server', members);
    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list world clock.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('World Clock Error', message)],
    });
  }
}

export async function handleWorldClockMeetSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const durationHours = getOption<number>(subOptions, 'duration_hours') || 1;
  const rawUsers = getOption<string>(subOptions, 'users');

  try {
    let targetIds: string[] | undefined;
    if (rawUsers && rawUsers.trim()) {
      targetIds = parseUserIds(rawUsers);
      // If user only mentioned others, also ensure they can see overlap
      if (targetIds.length === 1 && !targetIds.includes(userId)) {
        targetIds.push(userId);
      }
    }

    const overlapResult = await findMeetingOverlap(guildId, targetIds, durationHours);
    const embed = buildMeetingOverlapEmbed(overlapResult, durationHours);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to calculate meeting overlap.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Overlap Calculation Error', message)],
    });
  }
}

// ─── Main Slash Command Handlers ──────────────────────────────────────────────

export async function handleWorldClockCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const userTag = interaction.member?.user?.username || interaction.user?.username || 'Member';

  if (!guildId || !userId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed('Server Required', 'The /worldclock command can only be used within a server.'),
      ],
    });
    return;
  }

  const options = (interaction.data?.options || []) as Array<{
    name: string;
    type: number;
    value?: unknown;
    options?: Array<{ name: string; value?: unknown }>;
  }>;

  const subcommand = options[0];
  const subName = subcommand?.name;
  const subOptions = (subcommand?.options || []) as Array<{ name: string; value?: unknown }>;

  switch (subName) {
    case 'set':
      await handleWorldClockSetSubcommand(guildId, userId, userTag, token, subOptions);
      break;
    case 'view':
      await handleWorldClockViewSubcommand(guildId, userId, token, subOptions);
      break;
    case 'list':
      await handleWorldClockListSubcommand(guildId, token);
      break;
    case 'meet':
      await handleWorldClockMeetSubcommand(guildId, userId, token, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Subcommand', `Subcommand "${subName}" is not recognized.`)],
      });
      break;
  }
}

export async function handleMeetStandaloneCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id;

  if (!guildId || !userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Server Required', 'The /meet command can only be used within a server.')],
    });
    return;
  }

  const options = (interaction.data?.options || []) as Array<{ name: string; value?: unknown }>;
  await handleWorldClockMeetSubcommand(guildId, userId, token, options);
}

// ─── Registered Commands ──────────────────────────────────────────────────────

export const worldclockCommand: RegisteredCommand = {
  name: 'worldclock',
  description: 'Visual world clock dashboard and team meeting availability overlap finder',
  category: 'utility',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'set',
      description: 'Register or update your timezone and active waking hours',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'timezone',
          description: 'Your IANA timezone or abbreviation (e.g. America/New_York, EST, UTC, BST, JST)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'start_hour',
          description: 'Start of active waking hours in local time (0-23, default: 9)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 0,
          max_value: 23,
        },
        {
          name: 'end_hour',
          description: 'End of active waking hours in local time (0-23, default: 22)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 0,
          max_value: 23,
        },
      ],
    },
    {
      name: 'view',
      description: 'View current local time and schedule for yourself or a target member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'Target member whose timezone to view (defaults to you)',
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: 'list',
      description: 'Display the server-wide world clock dashboard with all member times',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'meet',
      description: 'Cross-reference member timezones to find golden hours for team meetings',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'duration_hours',
          description: 'Desired meeting duration in hours (1-12, default: 1)',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 12,
        },
        {
          name: 'users',
          description: 'Space or comma separated @user mentions or IDs (defaults to all server members)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
  ],
  execute: handleWorldClockCommand,
};

export const meetCommand: RegisteredCommand = {
  name: 'meet',
  description: 'Quickly find team meeting golden hours across member timezones',
  category: 'utility',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'duration_hours',
      description: 'Desired meeting duration in hours (1-12, default: 1)',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 1,
      max_value: 12,
    },
    {
      name: 'users',
      description: 'Space or comma separated @user mentions or IDs (defaults to all server members)',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  execute: handleMeetStandaloneCommand,
};
