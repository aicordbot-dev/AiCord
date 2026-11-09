/**
 * src/lib/rate-limit.ts
 * High-performance in-memory sliding-window rate limiter for auth and guild refresh endpoints.
 * Defends against API abuse, button spamming, and quota depletion.
 */

export interface RateLimitStatus {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Millisecond timestamp when the window resets
  retryAfterMs?: number;
}

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

/**
 * Validates and records a request against a sliding-window rate limit.
 *
 * @param key Unique identifier (e.g. `guild_refresh:${userId}`)
 * @param limit Maximum allowed requests within the window (defaults to 5)
 * @param windowMs Duration of the window in ms (defaults to 60,000 = 60s)
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000
): RateLimitStatus {
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // Retain only timestamps within the sliding window
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  const reset =
    bucket.timestamps.length > 0
      ? bucket.timestamps[0] + windowMs
      : now + windowMs;

  if (bucket.timestamps.length >= limit) {
    const retryAfterMs = Math.max(0, reset - now);
    return {
      success: false,
      limit,
      remaining: 0,
      reset,
      retryAfterMs,
    };
  }

  bucket.timestamps.push(now);
  const remaining = Math.max(0, limit - bucket.timestamps.length);

  return {
    success: true,
    limit,
    remaining,
    reset,
  };
}

/**
 * Resets rate limit buckets (useful for unit tests).
 */
export function resetRateLimit(key?: string): void {
  if (key) {
    buckets.delete(key);
  } else {
    buckets.clear();
  }
}
