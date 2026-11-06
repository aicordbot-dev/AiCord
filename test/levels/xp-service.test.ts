/**
 * test/levels/xp-service.test.ts
 * Unit tests for Phase 23 XP Service:
 * - Anti-spam 60s cooldown enforcement
 * - Random XP generation and multiplier scaling
 * - Level-up detection & automated role reward unlocking
 * - Ignored channels & ignored roles filtering
 * - Guild rank calculation (1-based ranking)
 * - Leaderboard pagination
 * - Reward and configuration management
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMessageXp,
  getUserRank,
  getLeaderboard,
  configureLevelReward,
  removeLevelReward,
  getLevelConfig,
  updateLevelConfig,
  enableTestMode,
  clearTestStore,
  setCustomRng,
  XP_COOLDOWN_MS,
} from '@/lib/levels/xp-service';

describe('Levels & XP Progression — XP Service', () => {
  const GUILD_ID = 'guild_test_123';
  const USER_A = 'user_alpha_01';
  const USER_B = 'user_beta_02';
  const USER_C = 'user_gamma_03';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('addMessageXp() — XP Accumulation & Cooldown', () => {
    it('grants base XP (between 15 and 25) and increments message count', async () => {
      // Deterministic RNG: 0.0 yields minimum base XP (15)
      setCustomRng(() => 0.0);
      const res1 = await addMessageXp(GUILD_ID, USER_A);

      assert.equal(res1.xpAdded, 15);
      assert.equal(res1.onCooldown, false);
      assert.equal(res1.oldLevel, 0);
      assert.equal(res1.newLevel, 0);
      assert.equal(res1.leveledUp, false);

      const rank = await getUserRank(GUILD_ID, USER_A);
      assert.equal(rank.userLevel?.xp, 15);
      assert.equal(rank.userLevel?.totalMessages, 1);
    });

    it('grants maximum base XP (25) when RNG yields near 1.0', async () => {
      setCustomRng(() => 0.999);
      const res = await addMessageXp(GUILD_ID, USER_B);

      assert.equal(res.xpAdded, 25);
      assert.equal(res.newLevel, 0);

      const rank = await getUserRank(GUILD_ID, USER_B);
      assert.equal(rank.userLevel?.xp, 25);
      assert.equal(rank.userLevel?.totalMessages, 1);
    });

    it('enforces 60-second sliding-window anti-spam cooldown', async () => {
      setCustomRng(() => 0.5); // base 20 XP
      const first = await addMessageXp(GUILD_ID, USER_A);
      assert.equal(first.xpAdded, 20);
      assert.equal(first.onCooldown, false);

      // Immediate second message is rejected by cooldown
      const second = await addMessageXp(GUILD_ID, USER_A);
      assert.equal(second.xpAdded, 0);
      assert.equal(second.onCooldown, true);
      assert.equal(second.leveledUp, false);

      // Verify user XP remains unchanged
      const rank = await getUserRank(GUILD_ID, USER_A);
      assert.equal(rank.userLevel?.xp, 20);
      assert.equal(rank.userLevel?.totalMessages, 1);
    });

    it('allows XP gain after 60-second cooldown expires', async () => {
      setCustomRng(() => 0.5);
      await addMessageXp(GUILD_ID, USER_A);

      // Manually simulate time travel past the 60s window
      const rankData = await getUserRank(GUILD_ID, USER_A);
      assert.ok(rankData.userLevel);
      rankData.userLevel.lastXpAt = new Date(Date.now() - (XP_COOLDOWN_MS + 1000));

      const subsequent = await addMessageXp(GUILD_ID, USER_A);
      assert.equal(subsequent.xpAdded, 20);
      assert.equal(subsequent.onCooldown, false);

      const updatedRank = await getUserRank(GUILD_ID, USER_A);
      assert.equal(updatedRank.userLevel?.xp, 40);
      assert.equal(updatedRank.userLevel?.totalMessages, 2);
    });
  });

  describe('Level-Up & Automated Role Rewards', () => {
    it('detects level up from Level 0 to Level 1 when crossing 100 XP', async () => {
      // Configure reward for Level 1
      await configureLevelReward(GUILD_ID, 1, 'role_level1', 'Apprentice');

      // Give 90 XP directly
      setCustomRng(() => 0.0);
      await addMessageXp(GUILD_ID, USER_A);
      const user = (await getUserRank(GUILD_ID, USER_A)).userLevel!;
      user.xp = 90;
      user.lastXpAt = new Date(Date.now() - 100_000);

      // Add 20 XP (total 110 XP -> crosses level 1 threshold of 100 XP)
      setCustomRng(() => 0.5); // base 20 XP
      const res = await addMessageXp(GUILD_ID, USER_A);

      assert.equal(res.leveledUp, true);
      assert.equal(res.oldLevel, 0);
      assert.equal(res.newLevel, 1);
      assert.equal(res.unlockedRoles.length, 1);
      assert.equal(res.unlockedRoles[0].roleId, 'role_level1');
      assert.equal(res.unlockedRoles[0].roleName, 'Apprentice');
      assert.equal(res.unlockedRoles[0].level, 1);
    });

    it('does not unlock role rewards for higher unreached levels', async () => {
      await configureLevelReward(GUILD_ID, 5, 'role_level5', 'Master');

      setCustomRng(() => 0.0);
      await addMessageXp(GUILD_ID, USER_A);
      const user = (await getUserRank(GUILD_ID, USER_A)).userLevel!;
      user.xp = 90;
      user.lastXpAt = new Date(Date.now() - 100_000);

      setCustomRng(() => 0.5);
      const res = await addMessageXp(GUILD_ID, USER_A);

      assert.equal(res.leveledUp, true);
      assert.equal(res.newLevel, 1);
      assert.equal(res.unlockedRoles.length, 0); // Level 5 role not yet unlocked
    });

    it('unlocks multiple accumulated role rewards on large multi-level jump', async () => {
      await configureLevelReward(GUILD_ID, 1, 'role_1', 'Novice');
      await configureLevelReward(GUILD_ID, 2, 'role_2', 'Adept');

      // User at 0 XP
      setCustomRng(() => 0.0);
      await addMessageXp(GUILD_ID, USER_A);
      const user = (await getUserRank(GUILD_ID, USER_A)).userLevel!;
      user.lastXpAt = new Date(Date.now() - 100_000);

      // Huge XP multiplier jump: 15 * 20 = 300 XP (reaches Level 2: total 255 XP)
      await updateLevelConfig(GUILD_ID, { xpMultiplier: 20 });
      const res = await addMessageXp(GUILD_ID, USER_A);

      assert.equal(res.leveledUp, true);
      assert.equal(res.oldLevel, 0);
      assert.equal(res.newLevel, 2);
      assert.equal(res.unlockedRoles.length, 2);
      assert.equal(res.unlockedRoles[0].level, 1);
      assert.equal(res.unlockedRoles[1].level, 2);
    });
  });

  describe('Ignore Filters & XP Multipliers', () => {
    it('blocks XP grant in ignored channels', async () => {
      await updateLevelConfig(GUILD_ID, {
        ignoredChannels: ['channel_spam_bot', 'channel_afk'],
      });

      const res = await addMessageXp(GUILD_ID, USER_A, 'channel_spam_bot');
      assert.equal(res.xpAdded, 0);
      assert.equal(res.leveledUp, false);

      const rank = await getUserRank(GUILD_ID, USER_A);
      assert.equal(rank.userLevel, null);
    });

    it('blocks XP grant for users possessing ignored roles', async () => {
      await updateLevelConfig(GUILD_ID, {
        ignoredRoles: ['role_muted', 'role_bot'],
      });

      const res = await addMessageXp(GUILD_ID, USER_A, 'channel_general', ['role_member', 'role_muted']);
      assert.equal(res.xpAdded, 0);

      const rank = await getUserRank(GUILD_ID, USER_A);
      assert.equal(rank.userLevel, null);
    });

    it('applies custom guild XP multiplier accurately', async () => {
      await updateLevelConfig(GUILD_ID, { xpMultiplier: 2.5 });
      setCustomRng(() => 0.5); // base 20 XP * 2.5 = 50 XP

      const res = await addMessageXp(GUILD_ID, USER_A);
      assert.equal(res.xpAdded, 50);

      const rank = await getUserRank(GUILD_ID, USER_A);
      assert.equal(rank.userLevel?.xp, 50);
    });
  });

  describe('getUserRank() & getLeaderboard()', () => {
    it('computes 1-based rank position based on descending XP', async () => {
      // User A: 500 XP
      setCustomRng(() => 0.0);
      await addMessageXp(GUILD_ID, USER_A);
      (await getUserRank(GUILD_ID, USER_A)).userLevel!.xp = 500;

      // User B: 300 XP
      await addMessageXp(GUILD_ID, USER_B);
      (await getUserRank(GUILD_ID, USER_B)).userLevel!.xp = 300;

      // User C: 800 XP
      await addMessageXp(GUILD_ID, USER_C);
      (await getUserRank(GUILD_ID, USER_C)).userLevel!.xp = 800;

      const rankC = await getUserRank(GUILD_ID, USER_C);
      assert.equal(rankC.rank, 1); // 800 XP

      const rankA = await getUserRank(GUILD_ID, USER_A);
      assert.equal(rankA.rank, 2); // 500 XP

      const rankB = await getUserRank(GUILD_ID, USER_B);
      assert.equal(rankB.rank, 3); // 300 XP

      // Unranked user
      const rankGhost = await getUserRank(GUILD_ID, 'user_unknown');
      assert.equal(rankGhost.rank, 0);
      assert.equal(rankGhost.userLevel, null);
    });

    it('returns paginated leaderboard sorted by XP descending', async () => {
      // Populate 15 users
      for (let i = 1; i <= 15; i++) {
        const uid = `user_${i.toString().padStart(2, '0')}`;
        await addMessageXp(GUILD_ID, uid);
        const ul = (await getUserRank(GUILD_ID, uid)).userLevel!;
        ul.xp = i * 50; // user_15 has 750 XP, user_01 has 50 XP
      }

      // Page 1 (top 10)
      const page1 = await getLeaderboard(GUILD_ID, 1, 10);
      assert.equal(page1.total, 15);
      assert.equal(page1.totalPages, 2);
      assert.equal(page1.page, 1);
      assert.equal(page1.entries.length, 10);
      assert.equal(page1.entries[0].userId, 'user_15');
      assert.equal(page1.entries[0].rank, 1);
      assert.equal(page1.entries[0].xp, 750);
      assert.equal(page1.entries[9].rank, 10);

      // Page 2 (remaining 5)
      const page2 = await getLeaderboard(GUILD_ID, 2, 10);
      assert.equal(page2.page, 2);
      assert.equal(page2.entries.length, 5);
      assert.equal(page2.entries[0].rank, 11);
      assert.equal(page2.entries[4].rank, 15);
      assert.equal(page2.entries[4].userId, 'user_01');
    });
  });

  describe('configureLevelReward() & removeLevelReward()', () => {
    it('adds, updates, and removes level rewards while keeping them sorted', async () => {
      await configureLevelReward(GUILD_ID, 10, 'role_10', 'Champion');
      await configureLevelReward(GUILD_ID, 5, 'role_5', 'Knight');

      let config = await getLevelConfig(GUILD_ID);
      assert.equal(config.levelRewards.length, 2);
      assert.equal(config.levelRewards[0].level, 5);
      assert.equal(config.levelRewards[1].level, 10);

      // Update existing reward for level 5
      await configureLevelReward(GUILD_ID, 5, 'role_5_upgraded', 'Senior Knight');
      config = await getLevelConfig(GUILD_ID);
      assert.equal(config.levelRewards.length, 2);
      assert.equal(config.levelRewards[0].roleId, 'role_5_upgraded');
      assert.equal(config.levelRewards[0].roleName, 'Senior Knight');

      // Remove reward for level 10
      await removeLevelReward(GUILD_ID, 10);
      config = await getLevelConfig(GUILD_ID);
      assert.equal(config.levelRewards.length, 1);
      assert.equal(config.levelRewards[0].level, 5);
    });
  });
});
