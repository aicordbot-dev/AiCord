/**
 * src/lib/engines/cache.ts
 * Enterprise cache layer combining an in-memory LRU cache with optional Upstash Redis.
 * Includes TTL support, memoizing wrapper, and guild configuration caching.
 */

import { Redis } from '@upstash/redis';
import { connectDB } from '@/lib/db';
import { GuildConfig, type IGuildConfig } from '@/models/GuildConfig';

interface CacheEntry<V> {
  value: V;
  expiresAt?: number;
}

/**
 * High-performance synchronous in-memory LRU cache with TTL support.
 */
export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly defaultTTLMs?: number;
  private readonly store: Map<K, CacheEntry<V>>;

  constructor(options: { maxSize?: number; defaultTTLSeconds?: number } = {}) {
    this.maxSize = options.maxSize ?? 1_000;
    this.defaultTTLMs = options.defaultTTLSeconds ? options.defaultTTLSeconds * 1_000 : undefined;
    this.store = new Map();
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh LRU position by re-inserting
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlSeconds?: number): void {
    // Delete existing to update position
    this.store.delete(key);

    const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1_000 : this.defaultTTLMs;
    const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : undefined;

    // Evict oldest (least recently used) if capacity exceeded
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, { value, expiresAt });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// ─── Redis Setup ──────────────────────────────────────────────────────────

let redisClient: Redis | null = null;
let isRedisAvailable: boolean | null = null;

function getRedisClient(): Redis | null {
  if (isRedisAvailable === false) return null;
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token && url.startsWith('http')) {
    try {
      redisClient = new Redis({ url, token });
      isRedisAvailable = true;
      return redisClient;
    } catch {
      isRedisAvailable = false;
      return null;
    }
  }

  isRedisAvailable = false;
  return null;
}

// Global in-memory cache instance (capacity 2000 entries)
const inMemoryCache = new LRUCache<string, unknown>({ maxSize: 2_000 });

// ─── Cache Layer Public API ───────────────────────────────────────────────

/**
 * Retrieve a value from the cache.
 */
export async function get<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const res = await redis.get<T>(`aicord:cache:${key}`);
      if (res !== null && res !== undefined) {
        // Also keep in in-memory cache for fast local access
        inMemoryCache.set(key, res, 60);
        return res;
      }
    } catch (err) {
      console.warn('[Cache] Redis get failed, using in-memory:', err);
    }
  }

  const local = inMemoryCache.get(key);
  return local !== undefined ? (local as T) : null;
}

/**
 * Store a value in the cache with an optional TTL in seconds.
 */
export async function set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  inMemoryCache.set(key, value, ttlSeconds);

  const redis = getRedisClient();
  if (redis) {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(`aicord:cache:${key}`, value, { ex: ttlSeconds });
      } else {
        await redis.set(`aicord:cache:${key}`, value);
      }
    } catch (err) {
      console.warn('[Cache] Redis set failed:', err);
    }
  }
}

/**
 * Remove an item from the cache.
 */
export async function del(key: string): Promise<boolean> {
  const localDeleted = inMemoryCache.delete(key);

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`aicord:cache:${key}`);
    } catch {
      // Ignore Redis del failure
    }
  }

  return localDeleted;
}

/**
 * Clear all cache entries.
 */
export async function clear(): Promise<void> {
  inMemoryCache.clear();
  // We do not flush the entire remote Redis database to prevent touching other keys
}

/**
 * Higher-order cache wrapper: fetch-or-cache pattern.
 * If key exists in cache, returns it; otherwise executes fetcherFn, caches result, and returns.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcherFn: () => Promise<T>,
): Promise<T> {
  const hit = await get<T>(key);
  if (hit !== null && hit !== undefined) {
    return hit;
  }

  const fresh = await fetcherFn();
  if (fresh !== null && fresh !== undefined) {
    await set(key, fresh, ttlSeconds);
  }
  return fresh;
}

// ─── Guild Configuration Caching (60s TTL) ────────────────────────────────

export const GUILD_CONFIG_CACHE_TTL_SECONDS = 60;

/**
 * Retrieve cached guild configuration, or fetch from MongoDB with a 60s cache TTL.
 */
export async function getCachedGuildConfig(guildId: string): Promise<IGuildConfig | null> {
  const cacheKey = `guild_config:${guildId}`;

  return cached<IGuildConfig | null>(cacheKey, GUILD_CONFIG_CACHE_TTL_SECONDS, async () => {
    await connectDB();
    const config = await GuildConfig.findOne({ guildId });
    return config ? (config.toObject ? config.toObject() : config) : null;
  });
}

/**
 * Invalidate cached guild configuration (call after updates).
 */
export async function invalidateCachedGuildConfig(guildId: string): Promise<void> {
  await del(`guild_config:${guildId}`);
}

export const cache = {
  get,
  set,
  delete: del,
  clear,
  cached,
  getCachedGuildConfig,
  invalidateCachedGuildConfig,
};
