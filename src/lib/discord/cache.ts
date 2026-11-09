/**
 * src/lib/discord/cache.ts
 * In-memory LRU / TTL cache for Discord user guilds list.
 * Prevents hammering Discord API /users/@me/guilds endpoint.
 */

export interface CachedGuildItem {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions?: string;
  features: string[];
  approximate_member_count?: number;
  approximate_presence_count?: number;
  botPresent?: boolean;
}

interface CacheEntry {
  guilds: CachedGuildItem[];
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000; // 60 seconds
const userGuildsStore = new Map<string, CacheEntry>();

/**
 * Retrieves cached guilds for a given user if not expired.
 */
export function getUserGuildsCache(userId: string): CachedGuildItem[] | null {
  if (!userId) return null;
  const entry = userGuildsStore.get(userId);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    userGuildsStore.delete(userId);
    return null;
  }

  // Return cloned copy to prevent external mutation
  return entry.guilds.map((g) => ({ ...g }));
}

/**
 * Stores user guilds with a 60-second default TTL.
 */
export function setUserGuildsCache(
  userId: string,
  guilds: CachedGuildItem[],
  ttlMs = DEFAULT_TTL_MS
): void {
  if (!userId) return;

  userGuildsStore.set(userId, {
    guilds: guilds.map((g) => ({ ...g })),
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Clears cache for a specific user, or all users if userId is omitted.
 */
export function clearUserGuildsCache(userId?: string): void {
  if (userId) {
    userGuildsStore.delete(userId);
  } else {
    userGuildsStore.clear();
  }
}

/**
 * Returns current count of entries in cache (useful for testing/monitoring).
 */
export function getUserGuildsCacheSize(): number {
  return userGuildsStore.size;
}
