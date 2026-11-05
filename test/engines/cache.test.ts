/**
 * test/engines/cache.test.ts
 * Unit tests for Cache Layer: LRU eviction, TTL expiration,
 * fetch-or-cache decorator, and guild configuration caching.
 */

import '../test-env';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  LRUCache,
  cache,
  cached,
  GUILD_CONFIG_CACHE_TTL_SECONDS,
  invalidateCachedGuildConfig,
} from '@/lib/engines/cache';

describe('Cache Layer', () => {
  beforeEach(async () => {
    await cache.clear();
  });

  describe('LRUCache Class', () => {
    it('stores and retrieves values', () => {
      const lru = new LRUCache<string, number>({ maxSize: 10 });
      lru.set('a', 1);
      lru.set('b', 2);

      assert.equal(lru.get('a'), 1);
      assert.equal(lru.get('b'), 2);
      assert.equal(lru.get('c'), undefined);
      assert.equal(lru.size, 2);
    });

    it('evicts least recently used item when max capacity is reached', () => {
      const lru = new LRUCache<string, string>({ maxSize: 3 });

      lru.set('k1', 'val1');
      lru.set('k2', 'val2');
      lru.set('k3', 'val3');

      // Access k1 to make it recently used: k2 becomes oldest
      lru.get('k1');

      // Insert k4, which should evict k2
      lru.set('k4', 'val4');

      assert.equal(lru.get('k1'), 'val1');
      assert.equal(lru.get('k2'), undefined, 'k2 should have been evicted');
      assert.equal(lru.get('k3'), 'val3');
      assert.equal(lru.get('k4'), 'val4');
      assert.equal(lru.size, 3);
    });

    it('expires entries after TTL', async () => {
      const lru = new LRUCache<string, string>({ maxSize: 10 });
      // Set entry with 50ms TTL
      lru.set('expiring', 'hello', 0.05);

      assert.equal(lru.get('expiring'), 'hello');

      // Wait 70ms for expiration
      await new Promise((resolve) => setTimeout(resolve, 70));

      assert.equal(lru.get('expiring'), undefined);
    });

    it('supports has, delete, and clear', () => {
      const lru = new LRUCache<string, number>();
      lru.set('x', 10);
      assert.ok(lru.has('x'));

      assert.ok(lru.delete('x'));
      assert.ok(!lru.has('x'));

      lru.set('y', 20);
      lru.set('z', 30);
      lru.clear();
      assert.equal(lru.size, 0);
    });
  });

  describe('Cache Public API & cached() Wrapper', () => {
    it('sets, gets, and deletes via async cache API', async () => {
      await cache.set('user:profile:1', { name: 'Bob', age: 30 }, 10);

      const val = await cache.get<{ name: string; age: number }>('user:profile:1');
      assert.deepEqual(val, { name: 'Bob', age: 30 });

      const deleted = await cache.delete('user:profile:1');
      assert.equal(deleted, true);

      const afterDelete = await cache.get('user:profile:1');
      assert.equal(afterDelete, null);
    });

    it('caches expensive fetcher result via cached() helper', async () => {
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        return { data: 'heavy_calculation_result' };
      };

      const key = 'calc:key:1';

      // First call executes fetcher
      const res1 = await cached(key, 60, fetcher);
      assert.equal(res1.data, 'heavy_calculation_result');
      assert.equal(callCount, 1);

      // Second call returns cached without invoking fetcher
      const res2 = await cached(key, 60, fetcher);
      assert.deepEqual(res2, res1);
      assert.equal(callCount, 1);
    });

    it('verifies guild config cache TTL is 60s and can be invalidated', async () => {
      assert.equal(GUILD_CONFIG_CACHE_TTL_SECONDS, 60);

      await cache.set('guild_config:guild_999', { guildId: 'guild_999' }, 60);
      const cachedConfig = await cache.get('guild_config:guild_999');
      assert.ok(cachedConfig);

      await invalidateCachedGuildConfig('guild_999');
      const afterInvalidate = await cache.get('guild_config:guild_999');
      assert.equal(afterInvalidate, null);
    });
  });
});
