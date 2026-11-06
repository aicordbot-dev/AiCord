/**
 * test/economy/economy-service.test.ts
 * Unit tests for Phase 28 Core Economy Engine:
 * - Daily streak mechanics (on-time, early claim rejection, streak reset, 10+ streak multiplier)
 * - Bank deposit & withdrawal with capacity limits and 'all' shorthand
 * - Peer-to-peer wallet transfers & validation
 * - Work cooldown & randomized earnings
 * - Crime cooldown, 55%/45% probabilities, win rewards, and bounded fines
 * - Server shop item lifecycle, inventory management, stock tracking, and role grants
 * - Wealth leaderboard net worth calculation and pagination
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getEconomyUser,
  claimDaily,
  deposit,
  withdraw,
  transfer,
  work,
  crime,
  getEconomyLeaderboard,
  listShopItems,
  addShopItem,
  removeShopItem,
  buyShopItem,
  enableTestMode,
  clearTestStore,
  setCustomRng,
  getDailyStreakMultiplier,
  DAILY_COOLDOWN_MS,
  WORK_COOLDOWN_MS,
  CRIME_COOLDOWN_MS,
  DEFAULT_BANK_CAPACITY,
  BASE_DAILY_REWARD,
} from '@/lib/economy/economy-service';

describe('Server Economy & Gamification — Core Economy Service', () => {
  const GUILD_ID = 'guild_econ_100';
  const ALICE = 'user_alice_1';
  const BOB = 'user_bob_2';
  const CHARLIE = 'user_charlie_3';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  // ─── 1. Profile Initialization ──────────────────────────────────────────

  describe('Constants & Initialization', () => {
    it('exports expected cooldown and reward constants', () => {
      assert.equal(WORK_COOLDOWN_MS, 60 * 60 * 1000);
      assert.equal(CRIME_COOLDOWN_MS, 2 * 60 * 60 * 1000);
      assert.equal(BASE_DAILY_REWARD, 250);
    });
  });

  describe('getEconomyUser()', () => {
    it('initializes a default economy profile for new members', async () => {
      const user = await getEconomyUser(GUILD_ID, ALICE);

      assert.equal(user.guildId, GUILD_ID);
      assert.equal(user.userId, ALICE);
      assert.equal(user.wallet, 0);
      assert.equal(user.bank, 0);
      assert.equal(user.bankCapacity, DEFAULT_BANK_CAPACITY);
      assert.equal(user.dailyStreak, 0);
      assert.deepEqual(user.inventory, []);
    });
  });

  // ─── 2. Daily Streak Mechanics ──────────────────────────────────────────

  describe('claimDaily()', () => {
    it('grants initial daily reward (base + streak bonus) and sets streak to 1', async () => {
      const t0 = new Date('2026-01-01T12:00:00Z');
      const res = await claimDaily(GUILD_ID, ALICE, t0);

      assert.equal(res.alreadyClaimed, false);
      assert.equal(res.streak, 1);
      // streak 1: (250 + 25) * 1.0 = 275
      assert.equal(res.reward, 275);
      assert.equal(res.newBalance, 275);

      const user = await getEconomyUser(GUILD_ID, ALICE);
      assert.equal(user.wallet, 275);
      assert.equal(user.dailyStreak, 1);
    });

    it('rejects early claims within 24-hour cooldown window with exact remaining time', async () => {
      const t0 = new Date('2026-01-01T12:00:00Z');
      await claimDaily(GUILD_ID, ALICE, t0);

      // Attempt claim 10 hours later
      const t1 = new Date('2026-01-01T22:00:00Z');
      const res = await claimDaily(GUILD_ID, ALICE, t1);

      assert.equal(res.alreadyClaimed, true);
      assert.equal(res.reward, 0);
      assert.equal(res.streak, 1);
      assert.equal(res.newBalance, 275);

      const expectedRemaining = DAILY_COOLDOWN_MS - (10 * 3600 * 1000);
      assert.equal(res.nextClaimInMs, expectedRemaining);
    });

    it('increments streak when claimed between 24h and 48h', async () => {
      const t0 = new Date('2026-01-01T12:00:00Z');
      await claimDaily(GUILD_ID, ALICE, t0);

      // Day 2: 25 hours later (valid streak increment)
      const t1 = new Date('2026-01-02T13:00:00Z');
      const res2 = await claimDaily(GUILD_ID, ALICE, t1);

      assert.equal(res2.alreadyClaimed, false);
      assert.equal(res2.streak, 2);
      // streak 2: (250 + 50) * 1.2 = 360
      assert.equal(res2.reward, 360);
      assert.equal(res2.newBalance, 275 + 360);

      // Day 3: 24.5 hours after Day 2
      const t2 = new Date('2026-01-03T13:30:00Z');
      const res3 = await claimDaily(GUILD_ID, ALICE, t2);
      assert.equal(res3.streak, 3);
    });

    it('applies 3.0x multiplier when streak reaches 10+', async () => {
      assert.equal(getDailyStreakMultiplier(1), 1.0);
      assert.equal(getDailyStreakMultiplier(2), 1.2);
      assert.equal(getDailyStreakMultiplier(4), 1.5);
      assert.equal(getDailyStreakMultiplier(7), 2.0);
      assert.equal(getDailyStreakMultiplier(10), 3.0);
      assert.equal(getDailyStreakMultiplier(15), 3.0);

      // Simulate user already at streak 9
      const t0 = new Date('2026-01-01T12:00:00Z');
      await claimDaily(GUILD_ID, ALICE, t0);

      // Fast-forward 9 consecutive on-time claims
      let currentTime = t0;
      for (let i = 2; i <= 10; i++) {
        currentTime = new Date(currentTime.getTime() + 25 * 3600 * 1000); // +25h
        const res = await claimDaily(GUILD_ID, ALICE, currentTime);
        assert.equal(res.streak, i);
        if (i === 10) {
          // base = 250 + (10 * 25) = 500
          // multiplier = 3.0
          // reward = 1500
          assert.equal(res.reward, 1500);
        }
      }
    });

    it('resets streak to 1 when claimed more than 48 hours after last claim', async () => {
      const t0 = new Date('2026-01-01T12:00:00Z');
      await claimDaily(GUILD_ID, ALICE, t0);

      // Day 2 on time -> streak 2
      const t1 = new Date('2026-01-02T13:00:00Z');
      const res2 = await claimDaily(GUILD_ID, ALICE, t1);
      assert.equal(res2.streak, 2);

      // Skip 3 days (72 hours elapsed) -> streak broken!
      const t3 = new Date('2026-01-05T13:00:00Z');
      const resBreak = await claimDaily(GUILD_ID, ALICE, t3);
      assert.equal(resBreak.alreadyClaimed, false);
      assert.equal(resBreak.streak, 1);
      assert.equal(resBreak.reward, 275);
    });
  });

  // ─── 3. Bank Deposit & Withdrawal ───────────────────────────────────────

  describe('deposit() & withdraw()', () => {
    it('deposits specific coin amount from wallet to bank', async () => {
      // Give Alice 1000 coins in wallet via daily
      const t0 = new Date('2026-01-01T12:00:00Z');
      await claimDaily(GUILD_ID, ALICE, t0);
      const user = await getEconomyUser(GUILD_ID, ALICE);
      const initialWallet = user.wallet;

      const res = await deposit(GUILD_ID, ALICE, 150);
      assert.equal(res.success, true);
      assert.equal(res.deposited, 150);
      assert.equal(res.wallet, initialWallet - 150);
      assert.equal(res.bank, 150);
    });

    it('deposits all wallet coins up to bank capacity with "all"', async () => {
      // Deposit all
      const t0 = new Date('2026-01-01T12:00:00Z');
      await claimDaily(GUILD_ID, ALICE, t0);
      const initialWallet = (await getEconomyUser(GUILD_ID, ALICE)).wallet;

      const res = await deposit(GUILD_ID, ALICE, 'all');
      assert.equal(res.success, true);
      assert.equal(res.deposited, initialWallet);
      assert.equal(res.wallet, 0);
      assert.equal(res.bank, initialWallet);
    });

    it('rejects deposit when bank capacity is exceeded or bank is full', async () => {
      // Set bank near capacity
      const t0 = new Date('2026-01-01T12:00:00Z');
      await claimDaily(GUILD_ID, ALICE, t0);

      // Attempt deposit exceeding 5000 capacity
      const resFail = await deposit(GUILD_ID, ALICE, 6000);
      assert.equal(resFail.success, false);
      assert.equal(resFail.error, 'INSUFFICIENT_FUNDS');

      // Attempt deposit when funds sufficient but bank capacity exceeded
      await claimDaily(GUILD_ID, BOB, t0);
      // Give Bob lots of coins
      for (let i = 0; i < 20; i++) {
        await claimDaily(GUILD_ID, BOB, new Date(t0.getTime() + (i + 1) * 25 * 3600 * 1000));
      }
      const bobUser = await getEconomyUser(GUILD_ID, BOB);
      assert.ok(bobUser.wallet > 5000);

      const resExceed = await deposit(GUILD_ID, BOB, 5500);
      assert.equal(resExceed.success, false);
      assert.equal(resExceed.error, 'BANK_CAPACITY_EXCEEDED');
    });

    it('rejects invalid or negative deposit amounts', async () => {
      const resNeg = await deposit(GUILD_ID, ALICE, -50);
      assert.equal(resNeg.success, false);
      assert.equal(resNeg.error, 'INVALID_AMOUNT');

      const resZero = await deposit(GUILD_ID, ALICE, 0);
      assert.equal(resZero.success, false);
      assert.equal(resZero.error, 'INVALID_AMOUNT');
    });

    it('withdraws specific amount and "all" from bank to wallet', async () => {
      // Put 200 in bank first
      await claimDaily(GUILD_ID, ALICE, new Date('2026-01-01T12:00:00Z'));
      await deposit(GUILD_ID, ALICE, 200);

      // Partial withdrawal
      const resPart = await withdraw(GUILD_ID, ALICE, 50);
      assert.equal(resPart.success, true);
      assert.equal(resPart.withdrawn, 50);
      assert.equal(resPart.bank, 150);

      // Withdraw 'all'
      const resAll = await withdraw(GUILD_ID, ALICE, 'all');
      assert.equal(resAll.success, true);
      assert.equal(resAll.withdrawn, 150);
      assert.equal(resAll.bank, 0);

      // Attempting withdrawal from empty bank
      const resEmpty = await withdraw(GUILD_ID, ALICE, 10);
      assert.equal(resEmpty.success, false);
      assert.equal(resEmpty.error, 'NO_BANK_FUNDS');
    });
  });

  // ─── 4. Coin Transfers ──────────────────────────────────────────────────

  describe('transfer()', () => {
    it('transfers coins between members with balance deduction & crediting', async () => {
      await claimDaily(GUILD_ID, ALICE, new Date('2026-01-01T12:00:00Z'));
      const aliceInitial = (await getEconomyUser(GUILD_ID, ALICE)).wallet;

      const res = await transfer(GUILD_ID, ALICE, BOB, 100);
      assert.equal(res.success, true);
      assert.equal(res.amount, 100);
      assert.equal(res.senderWallet, aliceInitial - 100);
      assert.equal(res.recipientWallet, 100);

      const bobUser = await getEconomyUser(GUILD_ID, BOB);
      assert.equal(bobUser.wallet, 100);
    });

    it('rejects transfer when sender has insufficient funds', async () => {
      const res = await transfer(GUILD_ID, ALICE, BOB, 999999);
      assert.equal(res.success, false);
      assert.equal(res.error, 'INSUFFICIENT_FUNDS');
    });

    it('rejects self-transfers and invalid amounts', async () => {
      const resSelf = await transfer(GUILD_ID, ALICE, ALICE, 50);
      assert.equal(resSelf.success, false);
      assert.equal(resSelf.error, 'SELF_TRANSFER');

      const resNeg = await transfer(GUILD_ID, ALICE, BOB, -10);
      assert.equal(resNeg.success, false);
      assert.equal(resNeg.error, 'INVALID_AMOUNT');
    });
  });

  // ─── 5. Work Shifts ─────────────────────────────────────────────────────

  describe('work()', () => {
    it('earns 50 to 150 coins and enforces 1-hour cooldown', async () => {
      setCustomRng(() => 0.5); // Midpoint RNG -> 50 + 0.5 * 100 = 100
      const t0 = new Date('2026-01-01T12:00:00Z');

      const res1 = await work(GUILD_ID, ALICE, t0);
      assert.equal(res1.onCooldown, false);
      assert.equal(res1.earned, 100);
      assert.equal(res1.balance, 100);
      assert.ok(res1.narrative.includes('100 coins'));

      // Immediate second work -> rejected on cooldown
      const tFast = new Date('2026-01-01T12:30:00Z');
      const resCooldown = await work(GUILD_ID, ALICE, tFast);
      assert.equal(resCooldown.onCooldown, true);
      assert.equal(resCooldown.earned, 0);
      assert.equal(resCooldown.remainingMs, 30 * 60 * 1000);

      // Work after 1 hour -> succeeds
      const tAfter = new Date('2026-01-01T13:01:00Z');
      const res2 = await work(GUILD_ID, ALICE, tAfter);
      assert.equal(res2.onCooldown, false);
      assert.equal(res2.balance, 200);
    });
  });

  // ─── 6. High-Risk Crime ─────────────────────────────────────────────────

  describe('crime()', () => {
    it('handles 55% win rate granting 150-350 coins', async () => {
      // roll < 0.55 triggers success
      setCustomRng(() => 0.5); // roll = 0.5 -> win! winRng = 0.5 -> 150 + 0.5 * 200 = 250
      const t0 = new Date('2026-01-01T12:00:00Z');

      const res = await crime(GUILD_ID, ALICE, t0);
      assert.equal(res.onCooldown, false);
      assert.equal(res.success, true);
      assert.equal(res.amount, 250);
      assert.equal(res.balance, 250);
      assert.ok(res.narrative.includes('250 coins'));
    });

    it('handles 45% fail rate deducting fine clamped to wallet balance', async () => {
      // Start with 50 coins
      setCustomRng(() => 0.0); // work for 50 coins
      await work(GUILD_ID, BOB, new Date('2026-01-01T12:00:00Z'));

      // roll >= 0.55 triggers failure: roll = 0.8
      setCustomRng(() => 0.8);
      const res = await crime(GUILD_ID, BOB, new Date('2026-01-01T12:00:00Z'));
      assert.equal(res.onCooldown, false);
      assert.equal(res.success, false);
      // Fine is 100-200, but Bob only had 50 coins -> clamped to 50
      assert.equal(res.amount, 50);
      assert.equal(res.balance, 0);
    });

    it('enforces 2-hour crime cooldown', async () => {
      setCustomRng(() => 0.2); // Win
      const t0 = new Date('2026-01-01T12:00:00Z');
      await crime(GUILD_ID, ALICE, t0);

      // Attempt crime 1 hour later
      const t1 = new Date('2026-01-01T13:00:00Z');
      const resCooldown = await crime(GUILD_ID, ALICE, t1);
      assert.equal(resCooldown.onCooldown, true);
      assert.equal(resCooldown.remainingMs, 60 * 60 * 1000);
    });
  });

  // ─── 7. Wealth Leaderboard ──────────────────────────────────────────────

  describe('getEconomyLeaderboard()', () => {
    it('ranks members by total net worth (wallet + bank) descending with pagination', async () => {
      // Alice: 500 wallet, 1000 bank -> 1500 net worth
      await claimDaily(GUILD_ID, ALICE, new Date('2026-01-01T12:00:00Z'));
      await deposit(GUILD_ID, ALICE, 200);

      // Bob: 2000 wallet -> 2000 net worth
      await claimDaily(GUILD_ID, BOB, new Date('2026-01-01T12:00:00Z'));
      // Give Bob extra via transfer or simulate
      setCustomRng(() => 0.5);
      await work(GUILD_ID, BOB, new Date('2026-01-01T12:00:00Z'));

      // Charlie: 100 wallet
      setCustomRng(() => 0.5);
      await work(GUILD_ID, CHARLIE, new Date('2026-01-01T12:00:00Z'));

      const lb = await getEconomyLeaderboard(GUILD_ID, 1, 10);
      assert.equal(lb.total, 3);
      assert.equal(lb.page, 1);
      assert.equal(lb.totalPages, 1);
      assert.equal(lb.entries.length, 3);

      // Leaderboard entries should be strictly descending by net worth
      for (let i = 0; i < lb.entries.length - 1; i++) {
        assert.ok(lb.entries[i].netWorth >= lb.entries[i + 1].netWorth);
        assert.equal(lb.entries[i].rank, i + 1);
      }
    });
  });

  // ─── 8. Server Shop & Purchases ─────────────────────────────────────────

  describe('Shop Item Management & Purchasing', () => {
    it('adds, lists, and removes items from server shop', async () => {
      await addShopItem(GUILD_ID, {
        itemId: 'vip-pass',
        name: 'VIP Server Pass',
        description: 'Grants VIP chat access',
        price: 500,
        type: 'role',
        roleId: 'role_vip_99',
        stock: 10,
      });

      await addShopItem(GUILD_ID, {
        itemId: 'cookie',
        name: 'Fresh Chocolate Cookie',
        description: 'Tastes delicious',
        price: 50,
        type: 'custom',
        stock: -1,
      });

      const items = await listShopItems(GUILD_ID);
      assert.equal(items.length, 2);
      assert.equal(items[0].itemId, 'cookie'); // 50 coins (sorted asc)
      assert.equal(items[1].itemId, 'vip-pass'); // 500 coins

      const removed = await removeShopItem(GUILD_ID, 'cookie');
      assert.equal(removed, true);

      const itemsAfter = await listShopItems(GUILD_ID);
      assert.equal(itemsAfter.length, 1);
      assert.equal(itemsAfter[0].itemId, 'vip-pass');
    });

    it('allows member to buy item when they have sufficient wallet coins', async () => {
      await addShopItem(GUILD_ID, {
        itemId: 'nitro-badge',
        name: 'Server Supporter Badge',
        price: 200,
        type: 'badge',
        stock: 5,
      });

      // Give Alice 275 coins
      await claimDaily(GUILD_ID, ALICE, new Date('2026-01-01T12:00:00Z'));

      const buyRes = await buyShopItem(GUILD_ID, ALICE, 'nitro-badge');
      assert.equal(buyRes.success, true);
      assert.equal(buyRes.userWallet, 75); // 275 - 200
      assert.equal(buyRes.item?.name, 'Server Supporter Badge');

      // Verify item was added to Alice's inventory
      const aliceProfile = await getEconomyUser(GUILD_ID, ALICE);
      assert.equal(aliceProfile.inventory.length, 1);
      assert.equal(aliceProfile.inventory[0].itemId, 'nitro-badge');
      assert.equal(aliceProfile.inventory[0].price, 200);

      // Verify stock decreased from 5 to 4
      const updatedItems = await listShopItems(GUILD_ID);
      assert.equal(updatedItems[0].stock, 4);
    });

    it('triggers role grant callback when buying role item', async () => {
      await addShopItem(GUILD_ID, {
        itemId: 'pro-dev',
        name: 'Pro Developer Role',
        price: 150,
        type: 'role',
        roleId: 'role_dev_888',
      });

      await claimDaily(GUILD_ID, ALICE, new Date('2026-01-01T12:00:00Z'));

      let grantedParams: { guild: string; user: string; role: string } | null = null;
      const mockGrant = async (g: string, u: string, r: string) => {
        grantedParams = { guild: g, user: u, role: r };
      };

      const res = await buyShopItem(GUILD_ID, ALICE, 'pro-dev', mockGrant);
      assert.equal(res.success, true);
      assert.equal(res.roleGranted, true);
      assert.deepEqual(grantedParams, {
        guild: GUILD_ID,
        user: ALICE,
        role: 'role_dev_888',
      });
    });

    it('rejects purchase when out of stock or insufficient wallet balance', async () => {
      await addShopItem(GUILD_ID, {
        itemId: 'limited-hat',
        name: 'Limited Golden Hat',
        price: 100,
        type: 'custom',
        stock: 0, // Out of stock
      });

      await claimDaily(GUILD_ID, ALICE, new Date('2026-01-01T12:00:00Z'));

      const resStock = await buyShopItem(GUILD_ID, ALICE, 'limited-hat');
      assert.equal(resStock.success, false);
      assert.equal(resStock.error, 'OUT_OF_STOCK');

      // Add expensive item
      await addShopItem(GUILD_ID, {
        itemId: 'super-yacht',
        name: 'Super Yacht',
        price: 999999,
        type: 'custom',
      });

      const resFunds = await buyShopItem(GUILD_ID, ALICE, 'super-yacht');
      assert.equal(resFunds.success, false);
      assert.equal(resFunds.error, 'INSUFFICIENT_FUNDS');
    });
  });
});
