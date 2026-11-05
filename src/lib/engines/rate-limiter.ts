/**
 * src/lib/engines/rate-limiter.ts
 * Hybrid sliding-window rate limiter.
 * Seamlessly uses Upstash Redis when configured, with high-performance in-memory sliding window fallback.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds when window resets
  retryAfterMs?: number;
}

// ─── In-Memory Sliding Window Implementation ──────────────────────────────

interface SlidingWindowBucket {
  timestamps: number[];
}

const inMemoryBuckets = new Map<string, SlidingWindowBucket>();
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanupStaleBuckets(now: number): void {
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS && inMemoryBuckets.size < 5_000) {
    return;
  }
  lastCleanupTime = now;

  for (const [key, bucket] of inMemoryBuckets.entries()) {
    // If no timestamps in the last 10 minutes, remove bucket
    const tenMinAgo = now - 600_000;
    if (bucket.timestamps.length === 0 || bucket.timestamps[bucket.timestamps.length - 1] < tenMinAgo) {
      inMemoryBuckets.delete(key);
    }
  }
}

function checkInMemoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanupStaleBuckets(now);

  const { maxRequests, windowMs } = options;
  const cutoff = now - windowMs;

  let bucket = inMemoryBuckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    inMemoryBuckets.set(key, bucket);
  }

  // Prune timestamps outside current sliding window
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

  if (bucket.timestamps.length < maxRequests) {
    bucket.timestamps.push(now);
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - bucket.timestamps.length,
      reset: now + windowMs,
    };
  }

  // Rate limit exceeded
  const oldestTimestamp = bucket.timestamps[0] ?? now;
  const reset = oldestTimestamp + windowMs;
  const retryAfterMs = Math.max(0, reset - now);

  return {
    success: false,
    limit: maxRequests,
    remaining: 0,
    reset,
    retryAfterMs,
  };
}

// ─── Upstash Redis Integration ─────────────────────────────────────────────

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

// Cache Ratelimit instances per unique config to avoid re-instantiation overhead
const ratelimitInstances = new Map<string, Ratelimit>();

function getUpstashRatelimit(options: RateLimitOptions): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  const configKey = `${options.maxRequests}:${options.windowMs}`;
  let limiter = ratelimitInstances.get(configKey);

  if (!limiter) {
    const windowStr = `${Math.ceil(options.windowMs / 1000)} s` as `${number} s`;
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(options.maxRequests, windowStr),
      prefix: 'aicord:rl',
    });
    ratelimitInstances.set(configKey, limiter);
  }

  return limiter;
}

// ─── Unified Rate Limiter API ─────────────────────────────────────────────

/**
 * Check rate limit for any arbitrary key (user, guild, IP, route, etc.).
 * Falls back to in-memory sliding window if Upstash Redis is unconfigured or fails.
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const upstashLimiter = getUpstashRatelimit(options);

  if (upstashLimiter) {
    try {
      const response = await upstashLimiter.limit(key);
      const now = Date.now();
      const reset = response.reset;
      const retryAfterMs = response.success ? undefined : Math.max(0, reset - now);

      return {
        success: response.success,
        limit: response.limit,
        remaining: response.remaining,
        reset,
        retryAfterMs,
      };
    } catch (err) {
      console.warn('[RateLimiter] Redis rate limit check failed, falling back to in-memory:', err);
      // Fall through to in-memory fallback
    }
  }

  return checkInMemoryRateLimit(key, options);
}

/**
 * Check rate limit for a specific user action (e.g. commands, AI prompts, messages).
 */
export async function checkUserRateLimit(
  userId: string,
  action: string,
  options: RateLimitOptions = { maxRequests: 5, windowMs: 10_000 },
): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}:${action}`, options);
}

/**
 * Check rate limit for a specific guild action (e.g. bulk channel create, server build).
 */
export async function checkGuildRateLimit(
  guildId: string,
  action: string,
  options: RateLimitOptions = { maxRequests: 20, windowMs: 60_000 },
): Promise<RateLimitResult> {
  return checkRateLimit(`guild:${guildId}:${action}`, options);
}

/**
 * Reset/clear rate limit state for a key.
 */
export async function resetRateLimit(key: string): Promise<void> {
  inMemoryBuckets.delete(key);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`aicord:rl:${key}`);
    } catch {
      // Ignore Redis del failure
    }
  }
}

/**
 * Clear all in-memory rate limits (primarily used in testing).
 */
export function clearRateLimits(): void {
  inMemoryBuckets.clear();
}
