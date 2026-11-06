/**
 * test/games/slots.test.ts
 * Unit tests for Phase 33 Slot Machine Engine:
 * - Weighted symbol distributions
 * - Reel spinning
 * - Payout table & multiplier logic
 * - Embed builder & ASCII visual cabinet
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  spinSingleReel,
  spinReels,
  calculateSlotsPayout,
  formatSlotMachineVisual,
  buildSlotsEmbed,
  SLOT_SYMBOLS,
  type SlotSymbol,
} from '@/lib/games/slots';

describe('Interactive Games Suite — Slot Machine Engine', () => {
  describe('Symbol Definitions & Weights', () => {
    it('defines all 6 standard slot symbols', () => {
      const keys = Object.keys(SLOT_SYMBOLS);
      assert.equal(keys.length, 6);
      assert.ok(keys.includes('🍒'));
      assert.ok(keys.includes('🍋'));
      assert.ok(keys.includes('🍇'));
      assert.ok(keys.includes('🔔'));
      assert.ok(keys.includes('💎'));
      assert.ok(keys.includes('7️⃣'));
    });

    it('correctly categorizes fruit vs special symbols', () => {
      assert.equal(SLOT_SYMBOLS['🍒'].isFruit, true);
      assert.equal(SLOT_SYMBOLS['🍋'].isFruit, true);
      assert.equal(SLOT_SYMBOLS['🍇'].isFruit, true);
      assert.equal(SLOT_SYMBOLS['🔔'].isFruit, false);
      assert.equal(SLOT_SYMBOLS['💎'].isFruit, false);
      assert.equal(SLOT_SYMBOLS['7️⃣'].isFruit, false);
    });
  });

  describe('spinReels()', () => {
    it('spins 3 reels returning valid symbols', () => {
      const validSymbols = new Set(['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣']);
      const reels = spinReels();

      assert.equal(reels.length, 3);
      assert.ok(validSymbols.has(reels[0]));
      assert.ok(validSymbols.has(reels[1]));
      assert.ok(validSymbols.has(reels[2]));
    });

    it('deterministic RNG generates predictable reels', () => {
      // Near top of weights = rare symbols (7s, diamonds)
      const fakeRng = () => 0.98;
      const sym = spinSingleReel(fakeRng);
      assert.equal(sym, '7️⃣');
    });
  });

  describe('calculateSlotsPayout() — Payout Table', () => {
    it('awards 25x multiplier for 3x Lucky Sevens (7️⃣ 7️⃣ 7️⃣)', () => {
      const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = ['7️⃣', '7️⃣', '7️⃣'];
      const res = calculateSlotsPayout(reels, 100);

      assert.equal(res.multiplier, 25);
      assert.equal(res.payout, 2500);
      assert.equal(res.profit, 2400);
      assert.equal(res.resultType, 'jackpot_777');
    });

    it('awards 15x multiplier for 3x Diamonds (💎 💎 💎)', () => {
      const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = ['💎', '💎', '💎'];
      const res = calculateSlotsPayout(reels, 200);

      assert.equal(res.multiplier, 15);
      assert.equal(res.payout, 3000);
      assert.equal(res.profit, 2800);
      assert.equal(res.resultType, 'triple_diamond');
    });

    it('awards 10x multiplier for 3x Bells (🔔 🔔 🔔)', () => {
      const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = ['🔔', '🔔', '🔔'];
      const res = calculateSlotsPayout(reels, 50);

      assert.equal(res.multiplier, 10);
      assert.equal(res.payout, 500);
      assert.equal(res.profit, 450);
      assert.equal(res.resultType, 'triple_bell');
    });

    it('awards 5x multiplier for 3x Fruit (🍒 🍒 🍒, 🍋 🍋 🍋, 🍇 🍇 🍇)', () => {
      const cherries: [SlotSymbol, SlotSymbol, SlotSymbol] = ['🍒', '🍒', '🍒'];
      const resC = calculateSlotsPayout(cherries, 100);
      assert.equal(resC.multiplier, 5);
      assert.equal(resC.payout, 500);
      assert.equal(resC.resultType, 'triple_fruit');

      const lemons: [SlotSymbol, SlotSymbol, SlotSymbol] = ['🍋', '🍋', '🍋'];
      const resL = calculateSlotsPayout(lemons, 100);
      assert.equal(resL.multiplier, 5);

      const grapes: [SlotSymbol, SlotSymbol, SlotSymbol] = ['🍇', '🍇', '🍇'];
      const resG = calculateSlotsPayout(grapes, 100);
      assert.equal(resG.multiplier, 5);
    });

    it('awards 2x multiplier for any 2 matching symbols', () => {
      // First two match
      const p1: [SlotSymbol, SlotSymbol, SlotSymbol] = ['🍒', '🍒', '🔔'];
      const res1 = calculateSlotsPayout(p1, 100);
      assert.equal(res1.multiplier, 2);
      assert.equal(res1.payout, 200);
      assert.equal(res1.profit, 100);
      assert.equal(res1.resultType, 'pair_match');

      // Outer two match
      const p2: [SlotSymbol, SlotSymbol, SlotSymbol] = ['💎', '🍋', '💎'];
      const res2 = calculateSlotsPayout(p2, 100);
      assert.equal(res2.multiplier, 2);
      assert.equal(res2.resultType, 'pair_match');

      // Last two match
      const p3: [SlotSymbol, SlotSymbol, SlotSymbol] = ['7️⃣', '🔔', '🔔'];
      const res3 = calculateSlotsPayout(p3, 100);
      assert.equal(res3.multiplier, 2);
      assert.equal(res3.resultType, 'pair_match');
    });

    it('awards 0x multiplier when no symbols match', () => {
      const miss: [SlotSymbol, SlotSymbol, SlotSymbol] = ['🍒', '🍋', '🔔'];
      const res = calculateSlotsPayout(miss, 100);

      assert.equal(res.multiplier, 0);
      assert.equal(res.payout, 0);
      assert.equal(res.profit, -100);
      assert.equal(res.resultType, 'no_match');
    });
  });

  describe('Visual Cabinet & Embed Formatting', () => {
    it('formats 3-reel visual cabinet with ASCII box', () => {
      const visual = formatSlotMachineVisual(['7️⃣', '💎', '🍒']);
      assert.ok(visual.includes('AI-CORD SLOTS'));
      assert.ok(visual.includes('7️⃣'));
      assert.ok(visual.includes('💎'));
      assert.ok(visual.includes('🍒'));
      assert.ok(visual.includes('PAYLINE'));
    });

    it('builds embed with win fields and payout table guide', () => {
      const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = ['7️⃣', '7️⃣', '7️⃣'];
      const embed = buildSlotsEmbed(reels, 2500, 25, 100, 'JackpotWinner');

      assert.ok(embed.title?.includes('JACKPOT'));
      assert.ok(embed.description?.includes('AI-CORD SLOTS'));
      assert.ok(embed.fields?.some((f) => f.name === 'Multiplier' && f.value.includes('25x')));
      assert.ok(embed.fields?.some((f) => f.name === 'Total Payout' && f.value.includes('2,500')));
      assert.ok(embed.fields?.some((f) => f.name === 'Paytable Guide'));
      assert.ok(embed.fields?.some((f) => f.name === 'Player' && f.value === 'JackpotWinner'));
    });
  });
});
