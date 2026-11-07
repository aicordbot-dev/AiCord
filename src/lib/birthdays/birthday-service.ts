/**
 * src/lib/birthdays/birthday-service.ts
 * Automated Birthday Celebrations & Star Role Grant Engine for AiCord.
 *
 * Responsibilities:
 * - Date validation (1-12 months, leap year accommodating day limits)
 * - Registration, lookup, and deletion of member birthdays
 * - Calculation of days remaining until next birthday occurrence
 * - Upcoming birthdays aggregator with calendar countdowns
 * - Server configuration management (channel, hoisted star role, custom greetings, role pings)
 * - Celebration trigger: posts announcements, grants hoisted role, and schedules 24h TempAction
 * - In-memory test store for zero-database unit testing
 */

import { Routes } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import {
  UserBirthday,
  BirthdayConfig,
  TempAction,
  type IUserBirthday,
  type IBirthdayConfig,
  type ITempAction,
} from '@/models';
import type { DiscordEmbed } from '@/lib/discord/embeds';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';

export type { IUserBirthday, IBirthdayConfig, ITempAction };

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
const testBirthdays = new Map<string, IUserBirthday>();
const testConfigs = new Map<string, IBirthdayConfig>();
const testTempActions: Array<Partial<ITempAction>> = [];

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function isTestMode(): boolean {
  return testMode;
}

export function clearTestStore(): void {
  testBirthdays.clear();
  testConfigs.clear();
  testTempActions.length = 0;
}

export function setTestBirthday(
  birthday: Partial<IUserBirthday> & {
    guildId: string;
    userId: string;
    month: number;
    day: number;
  },
): void {
  const key = `${birthday.guildId}:${birthday.userId}`;
  testBirthdays.set(key, {
    timezone: 'UTC',
    ...birthday,
  } as IUserBirthday);
}

export function setTestConfig(
  config: Partial<IBirthdayConfig> & { guildId: string },
): void {
  testConfigs.set(config.guildId, {
    enabled: true,
    pingRole: false,
    ...config,
  } as IBirthdayConfig);
}

export function getTestTempActions(): Array<Partial<ITempAction>> {
  return [...testTempActions];
}

// ─── Date Validation ───────────────────────────────────────────────────────────

export interface DateValidationResult {
  valid: boolean;
  reason?: string;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Validates a month and day combination.
 * - Month must be an integer between 1 and 12.
 * - Day must be an integer between 1 and 31 (month-dependent).
 * - February allows up to 29 days to accommodate leap years.
 * - April, June, September, November allow up to 30 days.
 */
export function validateDate(month: number, day: number): DateValidationResult {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return {
      valid: false,
      reason: 'Month must be an integer between 1 and 12.',
    };
  }

  if (!Number.isInteger(day) || day < 1) {
    return {
      valid: false,
      reason: 'Day must be a positive integer.',
    };
  }

  if (month === 2) {
    if (day > 29) {
      return {
        valid: false,
        reason: 'February has a maximum of 29 days.',
      };
    }
    return { valid: true };
  }

  if ([4, 6, 9, 11].includes(month)) {
    if (day > 30) {
      return {
        valid: false,
        reason: `${MONTH_NAMES[month - 1]} has a maximum of 30 days.`,
      };
    }
    return { valid: true };
  }

  if (day > 31) {
    return {
      valid: false,
      reason: `${MONTH_NAMES[month - 1]} has a maximum of 31 days.`,
    };
  }

  return { valid: true };
}

// ─── Birthday Calculations ───────────────────────────────────────────────────

/**
 * Calculates exact days remaining until the user's next birthday.
 * Returns 0 if today is their birthday, or 1-365 days otherwise.
 */
export function calculateDaysUntilBirthday(
  month: number,
  day: number,
  currentDate?: Date,
): number {
  const now = currentDate ? new Date(currentDate) : new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();

  if (currentMonth === month && currentDay === day) {
    return 0;
  }

  const todayMidnight = Date.UTC(currentYear, currentMonth - 1, currentDay);
  let targetMidnight = Date.UTC(currentYear, month - 1, day);

  if (targetMidnight < todayMidnight) {
    targetMidnight = Date.UTC(currentYear + 1, month - 1, day);
  }

  const diffMs = targetMidnight - todayMidnight;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// ─── Birthday Management ─────────────────────────────────────────────────────

/**
 * Registers or updates a user's birthday for a specific guild.
 */
export async function setUserBirthday(
  guildId: string,
  userId: string,
  month: number,
  day: number,
  timezone: string = 'UTC',
): Promise<IUserBirthday> {
  const validation = validateDate(month, day);
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Invalid birthday date.');
  }

  const cleanTimezone = timezone.trim() || 'UTC';

  if (testMode) {
    const key = `${guildId}:${userId}`;
    const existing = testBirthdays.get(key);
    const updated = {
      ...existing,
      guildId,
      userId,
      month,
      day,
      timezone: cleanTimezone,
      updatedAt: new Date(),
      createdAt: existing?.createdAt ?? new Date(),
    } as IUserBirthday;
    testBirthdays.set(key, updated);
    return updated;
  }

  await connectDB();
  const doc = await UserBirthday.findOneAndUpdate(
    { guildId, userId },
    {
      $set: {
        month,
        day,
        timezone: cleanTimezone,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return doc;
}

/**
 * Retrieves a user's birthday record in a guild.
 */
export async function getUserBirthday(
  guildId: string,
  userId: string,
): Promise<IUserBirthday | null> {
  if (testMode) {
    const key = `${guildId}:${userId}`;
    return testBirthdays.get(key) ?? null;
  }

  await connectDB();
  return UserBirthday.findOne({ guildId, userId });
}

/**
 * Deletes a registered birthday for a user in a guild.
 */
export async function deleteUserBirthday(
  guildId: string,
  userId: string,
): Promise<boolean> {
  if (testMode) {
    const key = `${guildId}:${userId}`;
    return testBirthdays.delete(key);
  }

  await connectDB();
  const res = await UserBirthday.deleteOne({ guildId, userId });
  return (res.deletedCount ?? 0) > 0;
}

export interface UpcomingBirthday {
  userId: string;
  month: number;
  day: number;
  timezone?: string;
  daysUntil: number;
}

/**
 * Retrieves and sorts upcoming birthdays in ascending order by days remaining.
 */
export async function getUpcomingBirthdays(
  guildId: string,
  limit: number = 10,
  currentDate?: Date,
): Promise<UpcomingBirthday[]> {
  let list: Array<{ userId: string; month: number; day: number; timezone?: string }>;

  if (testMode) {
    list = Array.from(testBirthdays.values()).filter((b) => b.guildId === guildId);
  } else {
    await connectDB();
    list = await UserBirthday.find({ guildId });
  }

  const upcoming: UpcomingBirthday[] = list.map((b) => {
    const daysUntil = calculateDaysUntilBirthday(b.month, b.day, currentDate);
    return {
      userId: b.userId,
      month: b.month,
      day: b.day,
      timezone: b.timezone,
      daysUntil,
    };
  });

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming.slice(0, limit);
}

// ─── Birthday Configuration ───────────────────────────────────────────────────

/**
 * Updates or creates server birthday configuration.
 */
export async function setBirthdayConfig(
  guildId: string,
  config: Partial<IBirthdayConfig>,
): Promise<IBirthdayConfig> {
  if (testMode) {
    const existing =
      testConfigs.get(guildId) ??
      ({
        guildId,
        enabled: true,
        pingRole: false,
      } as IBirthdayConfig);

    const merged = {
      ...existing,
      ...config,
      guildId,
      updatedAt: new Date(),
    } as IBirthdayConfig;

    testConfigs.set(guildId, merged);
    return merged;
  }

  await connectDB();
  const doc = await BirthdayConfig.findOneAndUpdate(
    { guildId },
    { $set: config },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return doc;
}

/**
 * Retrieves server birthday configuration with defaults.
 */
export async function getBirthdayConfig(
  guildId: string,
): Promise<IBirthdayConfig> {
  if (testMode) {
    return (
      testConfigs.get(guildId) ??
      ({
        guildId,
        enabled: true,
        pingRole: false,
      } as IBirthdayConfig)
    );
  }

  await connectDB();
  const config = await BirthdayConfig.findOne({ guildId });
  return (
    config ??
    ({
      guildId,
      enabled: true,
      pingRole: false,
    } as unknown as IBirthdayConfig)
  );
}

// ─── Presentation Embeds ─────────────────────────────────────────────────────

/**
 * Builds a celebratory birthday announcement embed.
 */
export function buildBirthdayCelebrationEmbed(
  userId: string,
  customMessage?: string,
): DiscordEmbed {
  const defaultMsg =
    `🎉 Happy Birthday, <@${userId}>! 🎂\n\nWishing you a fantastic day filled with joy, happiness, and celebrations! 🥳✨`;

  const description = customMessage
    ? customMessage.replace(/\{user\}/g, `<@${userId}>`)
    : defaultMsg;

  return {
    title: '🎂 Happy Birthday! 🎉',
    description,
    color: 0xf43f5e, // Vibrant celebratory rose/coral
    footer: {
      text: 'AiCord Birthday Celebrations 🎈',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds an embed listing upcoming server birthdays with calendar countdowns.
 */
export function buildUpcomingBirthdaysEmbed(
  guildName: string,
  upcoming: UpcomingBirthday[],
): DiscordEmbed {
  if (upcoming.length === 0) {
    return {
      title: `🎂 Upcoming Birthdays — ${guildName}`,
      description:
        `No upcoming birthdays registered yet in **${guildName}**!\n\n` +
        `Use \`/birthday set <month> <day>\` to register yours! 🎈`,
      color: 0xf59e0b, // Amber gold
      footer: {
        text: 'AiCord Birthday Celebrations',
      },
      timestamp: new Date().toISOString(),
    };
  }

  const lines = upcoming.map((u, i) => {
    const monthName = MONTH_NAMES[u.month - 1] ?? `Month ${u.month}`;
    let countdown = `in **${u.daysUntil} days**`;
    if (u.daysUntil === 0) {
      countdown = `**Today! 🎂**`;
    } else if (u.daysUntil === 1) {
      countdown = `**Tomorrow 🎈**`;
    }
    return `${i + 1}. <@${u.userId}> — 📅 **${monthName} ${u.day}** (${countdown})`;
  });

  return {
    title: `🎂 Upcoming Birthdays — ${guildName}`,
    description:
      `Here are the upcoming birthdays for **${guildName}**:\n\n` +
      `${lines.join('\n')}\n\n` +
      `*Use \`/birthday set\` to register your birthday!*`,
    color: 0xf59e0b,
    footer: {
      text: 'AiCord Birthday Celebrations',
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── Automated Celebration Runner ─────────────────────────────────────────────

export interface BirthdayCelebrationResult {
  userId: string;
  embed: DiscordEmbed;
  roleGranted?: boolean;
  tempActionScheduled?: boolean;
}

/**
 * Checks for birthdays matching today's reference date in a server, posts
 * celebratory announcements, assigns the hoisted birthday role, and schedules
 * a 24-hour TempAction for automatic role revocation.
 */
export async function checkAndTriggerBirthdays(
  guildId: string,
  currentDate?: Date,
): Promise<BirthdayCelebrationResult[]> {
  const config = await getBirthdayConfig(guildId);
  if (!config.enabled) {
    return [];
  }

  const now = currentDate ? new Date(currentDate) : new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();

  let candidates: IUserBirthday[];

  if (testMode) {
    candidates = Array.from(testBirthdays.values()).filter(
      (b) =>
        b.guildId === guildId &&
        b.month === currentMonth &&
        b.day === currentDay &&
        b.lastCelebratedYear !== currentYear,
    );
  } else {
    await connectDB();
    candidates = await UserBirthday.find({
      guildId,
      month: currentMonth,
      day: currentDay,
      $or: [
        { lastCelebratedYear: { $ne: currentYear } },
        { lastCelebratedYear: { $exists: false } },
      ],
    });
  }

  const results: BirthdayCelebrationResult[] = [];

  for (const user of candidates) {
    const embed = buildBirthdayCelebrationEmbed(user.userId, config.message);
    let roleGranted = false;
    let tempActionScheduled = false;

    // Grant temporary hoisted birthday role if configured
    if (config.roleId) {
      if (!testMode) {
        try {
          const rest = getDiscordRest();
          await discordApiCall(() =>
            rest.put(Routes.guildMemberRole(guildId, user.userId, config.roleId!)),
          );
          roleGranted = true;
        } catch (err) {
          console.error(
            `[BirthdayService] Failed to grant birthday role to ${user.userId}:`,
            err,
          );
        }
      } else {
        roleGranted = true;
      }

      // Schedule 24-hour TempAction for automatic role cleanup
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (testMode) {
        testTempActions.push({
          guildId,
          type: 'temp_role',
          userId: user.userId,
          moderatorId: 'BIRTHDAY_STAR_SERVICE',
          roleId: config.roleId,
          expiresAt,
          processed: false,
        });
        tempActionScheduled = true;
      } else {
        try {
          await TempAction.create({
            guildId,
            type: 'temp_role',
            userId: user.userId,
            moderatorId: 'BIRTHDAY_STAR_SERVICE',
            roleId: config.roleId,
            expiresAt,
            processed: false,
          });
          tempActionScheduled = true;
        } catch (err) {
          console.error(
            `[BirthdayService] Failed to schedule TempAction for ${user.userId}:`,
            err,
          );
        }
      }
    }

    // Post celebration message to announcement channel if configured
    if (config.channelId && !testMode) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.post(Routes.channelMessages(config.channelId!), {
            body: {
              content:
                config.pingRole && config.roleId ? `<@&${config.roleId}>` : undefined,
              embeds: [embed],
            },
          }),
        );
      } catch (err) {
        console.error(
          `[BirthdayService] Failed to post birthday message to channel ${config.channelId}:`,
          err,
        );
      }
    }

    // Update lastCelebratedYear to prevent duplicate celebrations in the same calendar year
    if (testMode) {
      user.lastCelebratedYear = currentYear;
    } else {
      await UserBirthday.updateOne(
        { guildId, userId: user.userId },
        { $set: { lastCelebratedYear: currentYear } },
      );
    }

    results.push({
      userId: user.userId,
      embed,
      roleGranted,
      tempActionScheduled,
    });
  }

  return results;
}

/**
 * Automated daily job runner: triggers birthday celebrations across all registered servers.
 */
export async function triggerDailyBirthdaysForAllGuilds(
  currentDate?: Date,
): Promise<BirthdayCelebrationResult[]> {
  const allResults: BirthdayCelebrationResult[] = [];

  let guildIds: string[];

  if (testMode) {
    const ids = new Set<string>();
    for (const b of testBirthdays.values()) ids.add(b.guildId);
    for (const c of testConfigs.values()) ids.add(c.guildId);
    guildIds = Array.from(ids);
  } else {
    await connectDB();
    guildIds = await UserBirthday.distinct('guildId');
  }

  for (const guildId of guildIds) {
    try {
      const results = await checkAndTriggerBirthdays(guildId, currentDate);
      allResults.push(...results);
    } catch (err) {
      console.error(
        `[BirthdayService] Error processing birthdays for guild ${guildId}:`,
        err,
      );
    }
  }

  return allResults;
}
