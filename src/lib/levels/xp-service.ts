/**
 * src/lib/levels/xp-service.ts
 * Core Leveling & XP Progression Service.
 *
 * Implements:
 * - 60-second sliding-window anti-spam cooldown per user
 * - Channel and role ignore filters
 * - Configurable XP multiplier
 * - Dynamic 15-25 XP random generation per message
 * - Level-up calculation and automated role reward matching
 * - Leaderboard generation and rank positioning
 * - Flexible data layer with in-memory test store support for deterministic testing
 */

import { connectDB } from '@/lib/db';
import { UserLevel, type IUserLevel } from '@/models/UserLevel';
import { LevelConfig, type ILevelConfig, type ILevelReward } from '@/models/LevelConfig';
import { getLevelFromXp, type LevelProgress } from './level-math';

export const XP_COOLDOWN_MS = 60_000; // 60 seconds
export const MIN_XP_PER_MESSAGE = 15;
export const MAX_XP_PER_MESSAGE = 25;

export interface AddXpResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  xpAdded: number;
  unlockedRoles: ILevelReward[];
  onCooldown?: boolean;
}

export interface UserRankResult {
  rank: number;
  userLevel: IUserLevel | null;
  levelData: LevelProgress;
}

export interface LeaderboardResult {
  entries: Array<{
    rank: number;
    userId: string;
    level: number;
    xp: number;
    totalMessages: number;
    voiceSeconds: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

// ─── Test Mode In-Memory Store ────────────────────────────────────────────

let testModeActive = false;
let customRng: (() => number) | null = null;

interface InMemoryUserLevel {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  totalMessages: number;
  voiceSeconds: number;
  lastXpAt?: Date;
}

interface InMemoryLevelConfig {
  guildId: string;
  levelRewards: ILevelReward[];
  announcementChannelId?: string;
  dmNotifications?: boolean;
  announcementTemplate?: string;
  ignoredChannels: string[];
  ignoredRoles: string[];
  xpMultiplier: number;
}

const testUserLevels = new Map<string, InMemoryUserLevel>();
const testLevelConfigs = new Map<string, InMemoryLevelConfig>();

export function enableTestMode(enabled: boolean = true): void {
  testModeActive = enabled;
  if (!enabled) {
    clearTestStore();
  }
}

export function clearTestStore(): void {
  testUserLevels.clear();
  testLevelConfigs.clear();
  customRng = null;
}

export function setCustomRng(rng: (() => number) | null): void {
  customRng = rng;
}

function userKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

// ─── Core Service Methods ─────────────────────────────────────────────────

/**
 * Grants XP to a user for sending a message, applying cooldown, ignore filters,
 * XP multipliers, and detecting level ups and role reward unlocks.
 */
export async function addMessageXp(
  guildId: string,
  userId: string,
  channelId?: string,
  roleIds?: string[],
): Promise<AddXpResult> {
  const config = await getLevelConfig(guildId);

  // 1. Check channel ignore list
  if (channelId && config.ignoredChannels && config.ignoredChannels.includes(channelId)) {
    const current = await getRawUserLevel(guildId, userId);
    const level = current?.level ?? 0;
    return {
      leveledUp: false,
      oldLevel: level,
      newLevel: level,
      xpAdded: 0,
      unlockedRoles: [],
    };
  }

  // 2. Check role ignore list
  if (roleIds && roleIds.length > 0 && config.ignoredRoles && config.ignoredRoles.length > 0) {
    const hasIgnoredRole = roleIds.some((r) => config.ignoredRoles!.includes(r));
    if (hasIgnoredRole) {
      const current = await getRawUserLevel(guildId, userId);
      const level = current?.level ?? 0;
      return {
        leveledUp: false,
        oldLevel: level,
        newLevel: level,
        xpAdded: 0,
        unlockedRoles: [],
      };
    }
  }

  // 3. Fetch existing user level data
  const existingUser = await getRawUserLevel(guildId, userId);
  const now = new Date();

  // 4. Enforce 60-second sliding-window anti-spam cooldown
  if (existingUser?.lastXpAt) {
    const elapsedMs = now.getTime() - new Date(existingUser.lastXpAt).getTime();
    if (elapsedMs < XP_COOLDOWN_MS) {
      return {
        leveledUp: false,
        oldLevel: existingUser.level,
        newLevel: existingUser.level,
        xpAdded: 0,
        unlockedRoles: [],
        onCooldown: true,
      };
    }
  }

  // 5. Generate random XP between 15 and 25, scaled by xpMultiplier
  const rngVal = customRng ? customRng() : Math.random();
  const rawBaseXp = Math.floor(rngVal * (MAX_XP_PER_MESSAGE - MIN_XP_PER_MESSAGE + 1)) + MIN_XP_PER_MESSAGE;
  const multiplier = typeof config.xpMultiplier === 'number' && config.xpMultiplier > 0 ? config.xpMultiplier : 1.0;
  const xpEarned = Math.round(rawBaseXp * multiplier);

  // 6. Calculate new totals and level threshold
  const oldLevel = existingUser?.level ?? 0;
  const oldXp = existingUser?.xp ?? 0;
  const newXp = oldXp + xpEarned;
  const { level: newLevel } = getLevelFromXp(newXp);
  const leveledUp = newLevel > oldLevel;

  // 7. Check for unlocked role rewards
  const unlockedRoles: ILevelReward[] = [];
  if (leveledUp && config.levelRewards && config.levelRewards.length > 0) {
    for (const reward of config.levelRewards) {
      if (reward.level > oldLevel && reward.level <= newLevel) {
        unlockedRoles.push({
          level: reward.level,
          roleId: reward.roleId,
          roleName: reward.roleName,
        });
      }
    }
  }

  // 8. Persist updated user stats
  await saveUserLevel(guildId, userId, {
    xp: newXp,
    level: newLevel,
    totalMessages: (existingUser?.totalMessages ?? 0) + 1,
    lastXpAt: now,
  });

  return {
    leveledUp,
    oldLevel,
    newLevel,
    xpAdded: xpEarned,
    unlockedRoles,
    onCooldown: false,
  };
}

/**
 * Computes 1-based rank position in guild based on XP descending.
 */
export async function getUserRank(
  guildId: string,
  userId: string,
): Promise<UserRankResult> {
  if (testModeActive) {
    const target = testUserLevels.get(userKey(guildId, userId));
    if (!target) {
      return {
        rank: 0,
        userLevel: null,
        levelData: getLevelFromXp(0),
      };
    }

    let higherCount = 0;
    for (const record of testUserLevels.values()) {
      if (record.guildId === guildId && record.xp > target.xp) {
        higherCount++;
      }
    }

    return {
      rank: higherCount + 1,
      userLevel: target as unknown as IUserLevel,
      levelData: getLevelFromXp(target.xp),
    };
  }

  await connectDB();
  const userDoc = await UserLevel.findOne({ guildId, userId });
  if (!userDoc) {
    return {
      rank: 0,
      userLevel: null,
      levelData: getLevelFromXp(0),
    };
  }

  const higherCount = await UserLevel.countDocuments({
    guildId,
    xp: { $gt: userDoc.xp },
  });

  return {
    rank: higherCount + 1,
    userLevel: userDoc,
    levelData: getLevelFromXp(userDoc.xp),
  };
}

/**
 * Returns paginated leaderboard entries sorted by XP descending.
 */
export async function getLeaderboard(
  guildId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<LeaderboardResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(50, pageSize));

  if (testModeActive) {
    const guildRecords: InMemoryUserLevel[] = [];
    for (const record of testUserLevels.values()) {
      if (record.guildId === guildId) {
        guildRecords.push({ ...record });
      }
    }

    guildRecords.sort((a, b) => b.xp - a.xp);
    const total = guildRecords.length;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const skip = (safePage - 1) * safePageSize;
    const slice = guildRecords.slice(skip, skip + safePageSize);

    const entries = slice.map((rec, idx) => ({
      rank: skip + idx + 1,
      userId: rec.userId,
      level: rec.level,
      xp: rec.xp,
      totalMessages: rec.totalMessages,
      voiceSeconds: rec.voiceSeconds,
    }));

    return {
      entries,
      total,
      page: safePage,
      totalPages,
    };
  }

  await connectDB();
  const total = await UserLevel.countDocuments({ guildId });
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const skip = (safePage - 1) * safePageSize;

  const docs = await UserLevel.find({ guildId })
    .sort({ xp: -1 })
    .skip(skip)
    .limit(safePageSize)
    .lean();

  const entries = docs.map((doc, idx) => ({
    rank: skip + idx + 1,
    userId: doc.userId,
    level: doc.level,
    xp: doc.xp,
    totalMessages: doc.totalMessages ?? 0,
    voiceSeconds: doc.voiceSeconds ?? 0,
  }));

  return {
    entries,
    total,
    page: safePage,
    totalPages,
  };
}

/**
 * Adds or updates a role reward for reaching a specific level.
 */
export async function configureLevelReward(
  guildId: string,
  level: number,
  roleId: string,
  roleName: string,
): Promise<ILevelConfig> {
  const config = await getLevelConfig(guildId);
  const existingRewards = [...config.levelRewards];

  const existingIndex = existingRewards.findIndex((r) => r.level === level);
  if (existingIndex >= 0) {
    existingRewards[existingIndex] = { level, roleId, roleName };
  } else {
    existingRewards.push({ level, roleId, roleName });
  }

  existingRewards.sort((a, b) => a.level - b.level);

  return updateLevelConfig(guildId, { levelRewards: existingRewards });
}

/**
 * Removes a role reward for a given level.
 */
export async function removeLevelReward(
  guildId: string,
  level: number,
): Promise<ILevelConfig> {
  const config = await getLevelConfig(guildId);
  const updatedRewards = config.levelRewards.filter((r) => r.level !== level);
  return updateLevelConfig(guildId, { levelRewards: updatedRewards });
}

/**
 * Retrieves the level configuration for a guild.
 */
export async function getLevelConfig(guildId: string): Promise<ILevelConfig> {
  if (testModeActive) {
    let conf = testLevelConfigs.get(guildId);
    if (!conf) {
      conf = {
        guildId,
        levelRewards: [],
        ignoredChannels: [],
        ignoredRoles: [],
        xpMultiplier: 1.0,
        dmNotifications: false,
      };
      testLevelConfigs.set(guildId, conf);
    }
    return conf as unknown as ILevelConfig;
  }

  await connectDB();
  let conf = await LevelConfig.findOne({ guildId });
  if (!conf) {
    conf = await LevelConfig.create({
      guildId,
      levelRewards: [],
      ignoredChannels: [],
      ignoredRoles: [],
      xpMultiplier: 1.0,
      dmNotifications: false,
    });
  }
  return conf;
}

/**
 * Updates level configuration parameters for a guild.
 */
export async function updateLevelConfig(
  guildId: string,
  updates: Partial<ILevelConfig>,
): Promise<ILevelConfig> {
  if (testModeActive) {
    const existing = await getLevelConfig(guildId);
    const updated = {
      ...existing,
      ...updates,
      guildId,
    };
    testLevelConfigs.set(guildId, updated as unknown as InMemoryLevelConfig);
    return updated as unknown as ILevelConfig;
  }

  await connectDB();
  const doc = await LevelConfig.findOneAndUpdate(
    { guildId },
    { $set: updates },
    { upsert: true, new: true },
  );
  return doc!;
}

// ─── Internal Storage Helpers ─────────────────────────────────────────────

async function getRawUserLevel(
  guildId: string,
  userId: string,
): Promise<{ level: number; xp: number; totalMessages: number; voiceSeconds: number; lastXpAt?: Date } | null> {
  if (testModeActive) {
    return testUserLevels.get(userKey(guildId, userId)) ?? null;
  }
  await connectDB();
  return UserLevel.findOne({ guildId, userId }).lean();
}

async function saveUserLevel(
  guildId: string,
  userId: string,
  data: { xp: number; level: number; totalMessages: number; lastXpAt: Date },
): Promise<void> {
  if (testModeActive) {
    const key = userKey(guildId, userId);
    const existing = testUserLevels.get(key);
    testUserLevels.set(key, {
      guildId,
      userId,
      xp: data.xp,
      level: data.level,
      totalMessages: data.totalMessages,
      voiceSeconds: existing?.voiceSeconds ?? 0,
      lastXpAt: data.lastXpAt,
    });
    return;
  }

  await connectDB();
  await UserLevel.findOneAndUpdate(
    { guildId, userId },
    {
      $set: {
        xp: data.xp,
        level: data.level,
        lastXpAt: data.lastXpAt,
      },
      $inc: {
        totalMessages: 1,
      },
    },
    { upsert: true, new: true },
  );
}
