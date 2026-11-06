/**
 * test/games/coinflip.test.ts
 * Unit tests for Phase 33 Coin Flip Engine:
 * - Heads or Tails flipping
 * - Outcome evaluation & streak progression
 * - Streak formatting (flame tiers)
 * - Embed builder
 */

import '../test-env';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  flipCoin,
  evaluateCoinflip,
  formatStreakText,
  buildCoinflipEmbed,
} from '@/lib/games/coinflip';
import {
  getUserCoinflipStreak,
  setUserCoinflipStreak,
  clearUserCoinflipStreaks,
} from '@/commands/games';

describe('Interactive Games Suite — Coin Flip Engine', () => {
  describe('flipCoin()', () => {
    it('returns either heads or tails', () => {
      for (let i = 0; i < 20; i++) {
        const side = flipCoin();
        assert.ok(side === 'heads' || side === 'tails');
      }
    });

    it('deterministic RNG generates predictable flips', () => {
      const headsRng = () => 0.2;
      const tailsRng = () => 0.8;

      assert.equal(flipCoin(headsRng), 'heads');
      assert.equal(flipCoin(tailsRng), 'tails');
    });
  });

  describe('evaluateCoinflip()', () => {
    it('increments streak and doubles bet upon winning guess', () => {
      const headsRng = () => 0.2; // heads
      const res = evaluateCoinflip('heads', 2, 100, headsRng);

      assert.equal(res.won, true);
      assert.equal(res.result, 'heads');
      assert.equal(res.guess, 'heads');
      assert.equal(res.newStreak, 3);
      assert.equal(res.payout, 200);
      assert.equal(res.profit, 100);
    });

    it('resets streak to 0 and zeros payout upon incorrect guess', () => {
      const tailsRng = () => 0.8; // tails
      const res = evaluateCoinflip('heads', 5, 250, tailsRng);

      assert.equal(res.won, false);
      assert.equal(res.result, 'tails');
      assert.equal(res.guess, 'heads');
      assert.equal(res.newStreak, 0);
      assert.equal(res.payout, 0);
      assert.equal(res.profit, -250);
    });

    it('normalizes uppercase and whitespace in user guess safely', () => {
      const tailsRng = () => 0.8; // tails
      const res = evaluateCoinflip('  TAILS  ', 0, 50, tailsRng);

      assert.equal(res.won, true);
      assert.equal(res.guess, 'tails');
    });
  });

  describe('formatStreakText()', () => {
    it('formats reset message on loss', () => {
      const text = formatStreakText(0, false);
      assert.ok(text.includes('streak ended'));
    });

    it('formats initial win (streak 1)', () => {
      const text = formatStreakText(1, true);
      assert.ok(text.includes('started'));
    });

    it('adds flame indicators for higher streaks', () => {
      const s3 = formatStreakText(3, true);
      assert.ok(s3.includes('🔥 **3 In A Row!**'));

      const s6 = formatStreakText(6, true);
      assert.ok(s6.includes('🔥🔥 **6 In A Row!**'));

      const s12 = formatStreakText(12, true);
      assert.ok(s12.includes('🔥🔥🔥 **12 In A Row!**'));
    });
  });

  describe('buildCoinflipEmbed()', () => {
    it('builds win embed with wager and payout fields', () => {
      const embed = buildCoinflipEmbed('heads', 'heads', 3, 100, 'LuckyFlipper');

      assert.ok(embed.title?.includes('You Won!'));
      assert.ok(embed.description?.includes('HEADS'));
      assert.ok(embed.fields?.some((f) => f.name === 'Win Streak' && f.value.includes('3 In A Row')));
      assert.ok(embed.fields?.some((f) => f.name === 'Wager' && f.value.includes('100')));
      assert.ok(embed.fields?.some((f) => f.name === 'Payout' && f.value.includes('200')));
      assert.ok(embed.fields?.some((f) => f.name === 'Flipper' && f.value === 'LuckyFlipper'));
    });

    it('builds loss embed with streak reset', () => {
      const embed = buildCoinflipEmbed('heads', 'tails', 0, 50);

      assert.ok(embed.title?.includes('Better Luck Next Time'));
      assert.ok(embed.fields?.some((f) => f.name === 'Win Streak' && f.value.includes('streak ended')));
    });
  });

  describe('User Coinflip Streak State Store', () => {
    beforeEach(() => {
      clearUserCoinflipStreaks();
    });

    it('tracks and retrieves streak per user', () => {
      const userA = 'user_111';
      const userB = 'user_222';

      assert.equal(getUserCoinflipStreak(userA), 0);
      setUserCoinflipStreak(userA, 4);
      assert.equal(getUserCoinflipStreak(userA), 4);
      assert.equal(getUserCoinflipStreak(userB), 0);
    });
  });
});
