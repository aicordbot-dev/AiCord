import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserGuildsCache,
  setUserGuildsCache,
  clearUserGuildsCache,
  getUserGuildsCacheSize,
  type CachedGuildItem,
} from '@/lib/discord/cache';

describe('Discord User Guilds Cache — In-Memory TTL', () => {
  beforeEach(() => {
    clearUserGuildsCache();
  });

  const sampleGuildsUser1: CachedGuildItem[] = [
    { id: 'g1', name: 'Server Alpha', icon: null, owner: true, permissions: '8', features: [] },
    { id: 'g2', name: 'Server Beta', icon: null, owner: false, permissions: '32', features: [] },
  ];

  const sampleGuildsUser2: CachedGuildItem[] = [
    { id: 'g3', name: 'Server Gamma', icon: null, owner: false, permissions: '0', features: [] },
  ];

  it('stores and retrieves cached guilds on cache hit', () => {
    setUserGuildsCache('user-1', sampleGuildsUser1);
    const cached = getUserGuildsCache('user-1');

    assert.ok(cached);
    assert.equal(cached.length, 2);
    assert.equal(cached[0].id, 'g1');
    assert.equal(cached[1].id, 'g2');
  });

  it('returns null on cache miss', () => {
    assert.equal(getUserGuildsCache('non-existent-user'), null);
  });

  it('enforces per-user isolation', () => {
    setUserGuildsCache('user-1', sampleGuildsUser1);
    setUserGuildsCache('user-2', sampleGuildsUser2);

    const user1Guilds = getUserGuildsCache('user-1');
    const user2Guilds = getUserGuildsCache('user-2');

    assert.ok(user1Guilds);
    assert.ok(user2Guilds);
    assert.equal(user1Guilds.length, 2);
    assert.equal(user2Guilds.length, 1);
    assert.equal(user1Guilds[0].name, 'Server Alpha');
    assert.equal(user2Guilds[0].name, 'Server Gamma');
  });

  it('expires entries after TTL elapsed', async () => {
    // Store with 30ms TTL
    setUserGuildsCache('user-temp', sampleGuildsUser1, 30);

    // Immediate read: hit
    assert.ok(getUserGuildsCache('user-temp'));

    // Wait 40ms
    await new Promise((resolve) => setTimeout(resolve, 40));

    // After expiration: miss
    assert.equal(getUserGuildsCache('user-temp'), null);
  });

  it('protects internal store against mutations of returned copies', () => {
    setUserGuildsCache('user-immutable', sampleGuildsUser1);
    const retrieved = getUserGuildsCache('user-immutable')!;
    retrieved[0].name = 'MUTATED';

    const fresh = getUserGuildsCache('user-immutable')!;
    assert.equal(fresh[0].name, 'Server Alpha');
  });

  it('clears cache for specific user or all users', () => {
    setUserGuildsCache('user-1', sampleGuildsUser1);
    setUserGuildsCache('user-2', sampleGuildsUser2);
    assert.equal(getUserGuildsCacheSize(), 2);

    clearUserGuildsCache('user-1');
    assert.equal(getUserGuildsCache('user-1'), null);
    assert.ok(getUserGuildsCache('user-2'));
    assert.equal(getUserGuildsCacheSize(), 1);

    clearUserGuildsCache();
    assert.equal(getUserGuildsCacheSize(), 0);
  });
});
