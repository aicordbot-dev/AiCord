/**
 * src/commands/birthdays.ts
 * Automated Birthday Celebrations Slash Command for AiCord.
 *
 * Subcommands:
 * - /birthday set <month> <day> [timezone]: registers or updates member birthday
 * - /birthday view [user]: displays member birthday or self with countdown
 * - /birthday remove: removes registered birthday
 * - /birthday upcoming: shows server upcoming birthdays list
 * - /birthday config [channel] [role] [message] [enabled] [ping_role]: updates server settings (requires MANAGE_GUILD)
 * - /birthday test: runs test celebration in current channel (requires MANAGE_GUILD)
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed } from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import {
  setUserBirthday,
  getUserBirthday,
  deleteUserBirthday,
  getUpcomingBirthdays,
  setBirthdayConfig,
  getBirthdayConfig,
  validateDate,
  calculateDaysUntilBirthday,
  buildBirthdayCelebrationEmbed,
  buildUpcomingBirthdaysEmbed,
  MONTH_NAMES,
  type IBirthdayConfig,
} from '@/lib/birthdays/birthday-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleBirthdayCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const memberPerms = interaction.member?.permissions ?? '0';
  const guildName = (interaction as unknown as { guild?: { name?: string } }).guild?.name ?? 'Server';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  const options = (interaction.data as { options?: Array<{ name: string; options?: Array<{ name: string; value: unknown }> }> })?.options ?? [];
  const subcommand = options[0];
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'set':
      await handleBirthdaySetSubcommand(token, guildId, userId, subOptions);
      break;
    case 'view':
      await handleBirthdayViewSubcommand(token, guildId, userId, subOptions);
      break;
    case 'remove':
      await handleBirthdayRemoveSubcommand(token, guildId, userId);
      break;
    case 'upcoming':
      await handleBirthdayUpcomingSubcommand(token, guildId, guildName);
      break;
    case 'config':
      await handleBirthdayConfigSubcommand(token, guildId, memberPerms, subOptions);
      break;
    case 'test':
      await handleBirthdayTestSubcommand(token, guildId, userId, memberPerms);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /birthday subcommand: "${subcommand?.name ?? 'unknown'}".`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Subcommand: /birthday set ────────────────────────────────────────────────

export async function handleBirthdaySetSubcommand(
  token: string,
  guildId: string,
  userId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const month = getOption<number>(options, 'month');
  const day = getOption<number>(options, 'day');
  const timezone = getOption<string>(options, 'timezone') ?? 'UTC';

  if (month === undefined || day === undefined) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Parameters', 'Please provide both month and day.')],
      ephemeral: true,
    });
    return;
  }

  const validation = validateDate(month, day);
  if (!validation.valid) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Date', validation.reason ?? 'Invalid birthday date.')],
      ephemeral: true,
    });
    return;
  }

  try {
    await setUserBirthday(guildId, userId, month, day, timezone);
    const daysUntil = calculateDaysUntilBirthday(month, day);
    const monthName = MONTH_NAMES[month - 1] ?? `Month ${month}`;

    let countdown = `in **${daysUntil} days**`;
    if (daysUntil === 0) {
      countdown = `**Today! 🎂**`;
    } else if (daysUntil === 1) {
      countdown = `**Tomorrow 🎈**`;
    }

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          '🎂 Birthday Registered!',
          `Your birthday has been set to 📅 **${monthName} ${day}** (${timezone}).\n\n` +
          `Next celebration: ${countdown}! 🎉`,
        ),
      ],
      ephemeral: true,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Registration Failed', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /birthday view ───────────────────────────────────────────────

export async function handleBirthdayViewSubcommand(
  token: string,
  guildId: string,
  callerUserId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(options, 'user') ?? callerUserId;
  const isSelf = targetUserId === callerUserId;

  try {
    const birthday = await getUserBirthday(guildId, targetUserId);
    if (!birthday) {
      const msg = isSelf
        ? "You haven't registered your birthday yet! Use `/birthday set` to register."
        : `<@${targetUserId}> hasn't registered their birthday yet.`;
      await editInteractionResponse(token, {
        embeds: [errorEmbed('No Birthday Found', msg)],
        ephemeral: true,
      });
      return;
    }

    const daysUntil = calculateDaysUntilBirthday(birthday.month, birthday.day);
    const monthName = MONTH_NAMES[birthday.month - 1] ?? `Month ${birthday.month}`;

    let countdown = `in **${daysUntil} days**`;
    if (daysUntil === 0) {
      countdown = `**Today! 🎂**`;
    } else if (daysUntil === 1) {
      countdown = `**Tomorrow 🎈**`;
    }

    await editInteractionResponse(token, {
      embeds: [
        {
          title: '🎂 Birthday Profile',
          description:
            `**Member:** <@${targetUserId}>\n` +
            `📅 **Date:** ${monthName} ${birthday.day}\n` +
            `⏰ **Timezone:** ${birthday.timezone ?? 'UTC'}\n` +
            `⏳ **Countdown:** ${countdown}`,
          color: 0xf59e0b,
          footer: {
            text: 'AiCord Birthday Celebrations',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Lookup Failed', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /birthday remove ─────────────────────────────────────────────

export async function handleBirthdayRemoveSubcommand(
  token: string,
  guildId: string,
  userId: string,
): Promise<void> {
  try {
    const deleted = await deleteUserBirthday(guildId, userId);
    if (!deleted) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Not Registered',
            "You don't have a registered birthday on this server.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          '🎂 Birthday Removed',
          'Your birthday has been successfully removed from this server.',
        ),
      ],
      ephemeral: true,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Removal Failed', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /birthday upcoming ───────────────────────────────────────────

export async function handleBirthdayUpcomingSubcommand(
  token: string,
  guildId: string,
  guildName: string,
): Promise<void> {
  try {
    const upcoming = await getUpcomingBirthdays(guildId, 10);
    const embed = buildUpcomingBirthdaysEmbed(guildName, upcoming);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Failed to Load Birthdays', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /birthday config ─────────────────────────────────────────────

export async function handleBirthdayConfigSubcommand(
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
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to configure birthday celebrations.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const channelId = getOption<string>(options, 'channel');
  const roleId = getOption<string>(options, 'role');
  const message = getOption<string>(options, 'message');
  const enabled = getOption<boolean>(options, 'enabled');
  const pingRole = getOption<boolean>(options, 'ping_role');

  const patch: Partial<IBirthdayConfig> = {};
  if (channelId !== undefined) patch.channelId = channelId;
  if (roleId !== undefined) patch.roleId = roleId;
  if (message !== undefined) patch.message = message;
  if (enabled !== undefined) patch.enabled = enabled;
  if (pingRole !== undefined) patch.pingRole = pingRole;

  try {
    const config = await setBirthdayConfig(guildId, patch);

    const description =
      `**Status:** ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `**Announcement Channel:** ${config.channelId ? `<#${config.channelId}>` : '*None (Direct)*'}\n` +
      `**Birthday Star Role:** ${config.roleId ? `<@&${config.roleId}>` : '*None configured*'}\n` +
      `**Ping Role:** ${config.pingRole ? 'Yes' : 'No'}\n` +
      `**Custom Greeting:** ${config.message ? `\`${config.message}\`` : '*Default greeting*'}`;

    await editInteractionResponse(token, {
      embeds: [
        successEmbed('🎂 Birthday Settings Updated', description),
      ],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Configuration Failed', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Subcommand: /birthday test ───────────────────────────────────────────────

export async function handleBirthdayTestSubcommand(
  token: string,
  guildId: string,
  userId: string,
  memberPerms: string,
): Promise<void> {
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to trigger test celebrations.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    const config = await getBirthdayConfig(guildId);
    const embed = buildBirthdayCelebrationEmbed(userId, config.message);

    const roleNotice = config.roleId
      ? `\n*The <@&${config.roleId}> 24-hour temporary role would also be granted upon actual celebration.*`
      : '';

    await editInteractionResponse(token, {
      content: `🎉 **Birthday Celebration Test Triggered!**\n*This preview shows how birthday announcements appear for server members.*${roleNotice}`,
      embeds: [embed],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Test Failed', errorMsg)],
      ephemeral: true,
    });
  }
}

// ─── Month Choices for Slash Command ──────────────────────────────────────────

const MONTH_CHOICES = [
  { name: 'January (01)', value: 1 },
  { name: 'February (02)', value: 2 },
  { name: 'March (03)', value: 3 },
  { name: 'April (04)', value: 4 },
  { name: 'May (05)', value: 5 },
  { name: 'June (06)', value: 6 },
  { name: 'July (07)', value: 7 },
  { name: 'August (08)', value: 8 },
  { name: 'September (09)', value: 9 },
  { name: 'October (10)', value: 10 },
  { name: 'November (11)', value: 11 },
  { name: 'December (12)', value: 12 },
];

// ─── Registered Command Definition ────────────────────────────────────────────

export const birthdayCommand: RegisteredCommand = {
  name: 'birthday',
  description: 'Automated birthday celebrations, countdowns, and server configuration',
  category: 'utility',
  options: [
    {
      name: 'set',
      description: 'Register or update your birthday',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'month',
          description: 'Month of your birthday',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          choices: MONTH_CHOICES,
        },
        {
          name: 'day',
          description: 'Day of your birthday (1-31)',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 31,
        },
        {
          name: 'timezone',
          description: 'Your timezone (e.g. UTC, America/New_York, Europe/London)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'view',
      description: 'View birthday information and countdown for yourself or a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'Member to look up (leave blank for yourself)',
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: 'remove',
      description: 'Remove your registered birthday from this server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'upcoming',
      description: 'View upcoming birthdays in this server with countdowns',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'config',
      description: 'Configure server birthday announcements, star role, and greetings',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Channel to send birthday announcement embeds to',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
        {
          name: 'role',
          description: 'Hoisted 24-hour birthday star role to grant celebrated members',
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
        {
          name: 'message',
          description: 'Custom celebration message (supports {user})',
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 2000,
        },
        {
          name: 'enabled',
          description: 'Enable or disable birthday celebrations for this server',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
        {
          name: 'ping_role',
          description: 'Whether to ping the birthday role in the announcement',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: 'test',
      description: 'Test the birthday celebration announcement embed in this server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
  ],
  execute: handleBirthdayCommand,
};
