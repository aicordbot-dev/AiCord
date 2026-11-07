/**
 * src/lib/styles/user-profile-style.ts
 * Service for managing user profile styling preferences and server-wide theme configuration.
 *
 * Provides:
 * - Deterministic in-memory test store for fast zero-network unit tests
 * - MongoDB persistence with UserProfileStyle and GuildConfig models
 * - Fallbacks to default styling (Cyberpunk rank, Gold balance, Pipes bar)
 */

import { connectDB } from '@/lib/db';
import { UserProfileStyle } from '@/models/UserProfileStyle';
import { GuildConfig } from '@/models/GuildConfig';

export interface UserProfileStyleData {
  guildId: string;
  userId: string;
  rankTheme: string;
  balanceTheme: string;
  barStyle: string;
  badges: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── In-Memory Test Store ─────────────────────────────────────────────────────

let testModeActive = false;
const testProfileStyles = new Map<string, UserProfileStyleData>();
const testServerThemes = new Map<string, string>();

export function enableTestMode(enabled: boolean = true): void {
  testModeActive = enabled;
  if (!enabled) {
    clearTestStore();
  }
}

export function clearTestStore(): void {
  testProfileStyles.clear();
  testServerThemes.clear();
}

function isTestMode(): boolean {
  return testModeActive || process.env.NODE_ENV === 'test';
}

function profileKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Get the visual profile style for a member in a guild.
 * Defaults to rankTheme: 'cyberpunk', balanceTheme: 'gold', barStyle: 'pipes'.
 */
export async function getUserProfileStyle(
  guildId: string,
  userId: string,
): Promise<UserProfileStyleData> {
  if (isTestMode()) {
    const existing = testProfileStyles.get(profileKey(guildId, userId));
    if (existing) return { ...existing };

    const initial: UserProfileStyleData = {
      guildId,
      userId,
      rankTheme: 'cyberpunk',
      balanceTheme: 'gold',
      barStyle: 'pipes',
      badges: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    testProfileStyles.set(profileKey(guildId, userId), initial);
    return { ...initial };
  }

  await connectDB();
  let doc = await UserProfileStyle.findOne({ guildId, userId });
  if (!doc) {
    doc = await UserProfileStyle.create({
      guildId,
      userId,
      rankTheme: 'cyberpunk',
      balanceTheme: 'gold',
      barStyle: 'pipes',
      badges: [],
    });
  }

  return {
    guildId: doc.guildId,
    userId: doc.userId,
    rankTheme: doc.rankTheme,
    balanceTheme: doc.balanceTheme,
    barStyle: doc.barStyle,
    badges: doc.badges ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Update the visual profile style for a member in a guild.
 */
export async function updateUserProfileStyle(
  guildId: string,
  userId: string,
  updates: Partial<Pick<UserProfileStyleData, 'rankTheme' | 'balanceTheme' | 'barStyle' | 'badges'>>,
): Promise<UserProfileStyleData> {
  if (isTestMode()) {
    const current = await getUserProfileStyle(guildId, userId);
    const updated: UserProfileStyleData = {
      ...current,
      ...updates,
      updatedAt: new Date(),
    };
    testProfileStyles.set(profileKey(guildId, userId), updated);
    return { ...updated };
  }

  await connectDB();
  const doc = await UserProfileStyle.findOneAndUpdate(
    { guildId, userId },
    { $set: updates },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return {
    guildId: doc.guildId,
    userId: doc.userId,
    rankTheme: doc.rankTheme,
    balanceTheme: doc.balanceTheme,
    barStyle: doc.barStyle,
    badges: doc.badges ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Get the server default visual theme.
 */
export async function getServerTheme(guildId: string): Promise<string> {
  if (isTestMode()) {
    return testServerThemes.get(guildId) ?? 'cyberpunk';
  }

  await connectDB();
  const config = await GuildConfig.findOne({ guildId });
  return config?.theme ?? 'cyberpunk';
}

/**
 * Set the server default visual theme.
 */
export async function setServerTheme(guildId: string, theme: string): Promise<string> {
  if (isTestMode()) {
    testServerThemes.set(guildId, theme);
    return theme;
  }

  await connectDB();
  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { theme } },
    { upsert: true, new: true },
  );

  return theme;
}
