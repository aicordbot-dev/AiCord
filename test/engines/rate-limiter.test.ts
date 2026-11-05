/**
 * test/engines/rate-limiter.test.ts
 * Unit tests for Rate Limiter: sliding window enforcement,
 * remaining quotas, reset intervals, and user/guild buckets.
 */

import '../test-env';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRateLimit,
  checkUserRateLimit,
  checkGuildRateLimit,
  resetRateLimit,
  clearRateLimits,
} from '@/lib/engines/rate-limiter';

describe('Rate Limiter Engine', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it('allows requests within the specified limit and tracks remaining quota', async () => {
    const key = 'test_key_1';
    const options = { maxRequests: 3, windowMs: 2_000 };

    const r1 = await checkRateLimit(key, options);
    assert.equal(r1.success, true);
    assert.equal(r1.limit, 3);
    assert.equal(r1.remaining, 2);

    const r2 = await checkRateLimit(key, options);
    assert.equal(r2.success, true);
    assert.equal(r2.remaining, 1);

    const r3 = await checkRateLimit(key, options);
    assert.equal(r3.success, true);
    assert.equal(r3.remaining, 0);

    // 4th request exceeds limit
    const r4 = await checkRateLimit(key, options);
    assert.equal(r4.success, false);
    assert.equal(r4.remaining, 0);
    assert.ok(r4.retryAfterMs !== undefined && r4.retryAfterMs > 0);
  });

  it('provides user-specific rate limiting', async () => {
    const userId1 = 'user_abc';
    const userId2 = 'user_xyz';
    const options = { maxRequests: 1, windowMs: 1_000 };

    const u1_req1 = await checkUserRateLimit(userId1, 'prompt', options);
    assert.equal(u1_req1.success, true);

    const u1_req2 = await checkUserRateLimit(userId1, 'prompt', options);
    assert.equal(u1_req2.success, false);

    // User 2 has separate bucket
    const u2_req1 = await checkUserRateLimit(userId2, 'prompt', options);
    assert.equal(u2_req1.success, true);
  });

  it('provides guild-specific rate limiting', async () => {
    const guildId = 'guild_123';
    const options = { maxRequests: 2, windowMs: 5_000 };

    const g1 = await checkGuildRateLimit(guildId, 'build', options);
    assert.equal(g1.success, true);

    const g2 = await checkGuildRateLimit(guildId, 'build', options);
    assert.equal(g2.success, true);

    const g3 = await checkGuildRateLimit(guildId, 'build', options);
    assert.equal(g3.success, false);
  });

  it('allows resetting a specific rate limit key', async () => {
    const key = 'resettable_key';
    const options = { maxRequests: 1, windowMs: 10_000 };

    await checkRateLimit(key, options);
    const blocked = await checkRateLimit(key, options);
    assert.equal(blocked.success, false);

    await resetRateLimit(key);

    const afterReset = await checkRateLimit(key, options);
    assert.equal(afterReset.success, true);
  });
});
