/**
 * test/games/blackjack.test.ts
 * Unit tests for Phase 33 Blackjack Engine:
 * - 52-card deck structure & Unicode visuals
 * - Dynamic Ace calculation (soft vs hard totals)
 * - Dealer hit on soft 17 and stand on hard 17+
 * - Evaluation matrix (blackjack, bust, win, loss, push)
 * - Embed & ActionRow components
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeck,
  shuffleDeck,
  calculateHandValue,
  dealerPlay,
  evaluateBlackjackResult,
  buildBlackjackEmbed,
  buildBlackjackActionRow,
  type Card,
} from '@/lib/games/blackjack';

function makeCard(suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', rank: Card['rank']): Card {
  let value = 10;
  if (rank === 'A') value = 11;
  else if (rank !== 'J' && rank !== 'Q' && rank !== 'K') value = parseInt(rank, 10);

  return {
    suit,
    rank,
    value,
    visual: '🂡',
    name: `[${rank}♠]`,
  };
}

describe('Interactive Games Suite — Blackjack Engine', () => {
  describe('Deck Generation & Shuffling', () => {
    it('creates a standard 52-card deck with 4 suits and 13 ranks', () => {
      const deck = createDeck();
      assert.equal(deck.length, 52);

      const suits = new Set(deck.map((c) => c.suit));
      assert.equal(suits.size, 4);

      const ranks = new Set(deck.map((c) => c.rank));
      assert.equal(ranks.size, 13);
    });

    it('shuffles the deck randomly while preserving 52 cards', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);

      assert.equal(shuffled.length, 52);
      // Ensure all 52 original cards are preserved
      assert.equal(new Set(shuffled.map((c) => `${c.rank}_${c.suit}`)).size, 52);
    });
  });

  describe('calculateHandValue() & Dynamic Ace Rules', () => {
    it('correctly calculates basic number and face card totals', () => {
      const hand: Card[] = [makeCard('spades', '5'), makeCard('hearts', '7')];
      const val = calculateHandValue(hand);
      assert.equal(val.total, 12);
      assert.equal(val.isSoft, false);
      assert.equal(val.isBust, false);
      assert.equal(val.isBlackjack, false);

      const faceHand: Card[] = [makeCard('diamonds', '10'), makeCard('clubs', 'K')];
      assert.equal(calculateHandValue(faceHand).total, 20);
    });

    it('identifies natural Blackjack (Ace + 10-value card on 2 cards)', () => {
      const bjHand: Card[] = [makeCard('spades', 'A'), makeCard('hearts', 'K')];
      const val = calculateHandValue(bjHand);
      assert.equal(val.total, 21);
      assert.equal(val.isBlackjack, true);
      assert.equal(val.isSoft, true);
    });

    it('counts single Ace as 11 when total does not exceed 21 (Soft hand)', () => {
      const hand: Card[] = [makeCard('spades', 'A'), makeCard('diamonds', '6')];
      const val = calculateHandValue(hand);
      assert.equal(val.total, 17);
      assert.equal(val.isSoft, true);
      assert.equal(val.isBust, false);
    });

    it('automatically reduces Ace from 11 to 1 when total exceeds 21 (Hard hand)', () => {
      const hand: Card[] = [
        makeCard('spades', 'A'),
        makeCard('diamonds', '8'),
        makeCard('clubs', '5'),
      ];
      // 11 + 8 + 5 = 24 -> reduces A to 1 -> 14
      const val = calculateHandValue(hand);
      assert.equal(val.total, 14);
      assert.equal(val.isSoft, false);
      assert.equal(val.isBust, false);
    });

    it('handles multiple Aces flexibly', () => {
      // 2 Aces: 11 + 1 = 12 (Soft 12)
      const twoAces: Card[] = [makeCard('spades', 'A'), makeCard('hearts', 'A')];
      const valTwo = calculateHandValue(twoAces);
      assert.equal(valTwo.total, 12);
      assert.equal(valTwo.isSoft, true);

      // 2 Aces + 9: 1 + 11 + 9 = 21 (Soft 21)
      const twoAcesNine: Card[] = [
        makeCard('spades', 'A'),
        makeCard('hearts', 'A'),
        makeCard('diamonds', '9'),
      ];
      const valTwoNine = calculateHandValue(twoAcesNine);
      assert.equal(valTwoNine.total, 21);
      assert.equal(valTwoNine.isSoft, true);

      // 2 Aces + 10: 1 + 1 + 10 = 12 (Hard 12)
      const twoAcesTen: Card[] = [
        makeCard('spades', 'A'),
        makeCard('hearts', 'A'),
        makeCard('diamonds', '10'),
      ];
      const valTwoTen = calculateHandValue(twoAcesTen);
      assert.equal(valTwoTen.total, 12);
      assert.equal(valTwoTen.isSoft, false);
    });

    it('detects bust when total exceeds 21 even after reducing all Aces', () => {
      const bustHand: Card[] = [
        makeCard('spades', '10'),
        makeCard('diamonds', '9'),
        makeCard('clubs', '5'),
      ];
      const val = calculateHandValue(bustHand);
      assert.equal(val.total, 24);
      assert.equal(val.isBust, true);
    });
  });

  describe('Dealer AI Rules (Soft 17 & Stand)', () => {
    it('dealer hits when hand is under 17', () => {
      const dealerHand: Card[] = [makeCard('spades', '10'), makeCard('hearts', '5')]; // 15
      const deck: Card[] = [makeCard('diamonds', '4')]; // +4 -> 19

      const res = dealerPlay(dealerHand, deck);
      assert.equal(res.dealerCards.length, 3);
      assert.equal(calculateHandValue(res.dealerCards).total, 19);
    });

    it('dealer stands on hard 17', () => {
      const dealerHand: Card[] = [makeCard('spades', '10'), makeCard('hearts', '7')]; // Hard 17
      const deck: Card[] = [makeCard('diamonds', '5')]; // Should not draw

      const res = dealerPlay(dealerHand, deck);
      assert.equal(res.dealerCards.length, 2);
      assert.equal(calculateHandValue(res.dealerCards).total, 17);
      assert.equal(res.remainingDeck.length, 1);
    });

    it('dealer hits on soft 17 (Ace + 6)', () => {
      const dealerHand: Card[] = [makeCard('spades', 'A'), makeCard('hearts', '6')]; // Soft 17
      const deck: Card[] = [makeCard('diamonds', '3')]; // +3 -> Soft 20

      const res = dealerPlay(dealerHand, deck);
      assert.equal(res.dealerCards.length, 3);
      assert.equal(calculateHandValue(res.dealerCards).total, 20);
    });

    it('dealer stands on soft 18, 19, 20', () => {
      const dealerHand: Card[] = [makeCard('spades', 'A'), makeCard('hearts', '7')]; // Soft 18
      const deck: Card[] = [makeCard('diamonds', '2')];

      const res = dealerPlay(dealerHand, deck);
      assert.equal(res.dealerCards.length, 2);
      assert.equal(calculateHandValue(res.dealerCards).total, 18);
    });

    it('stops dealing when dealer busts', () => {
      const dealerHand: Card[] = [makeCard('spades', '10'), makeCard('hearts', '6')]; // 16
      const deck: Card[] = [
        makeCard('diamonds', '8'), // 24 -> BUST
        makeCard('clubs', '2'),
      ];

      const res = dealerPlay(dealerHand, deck);
      assert.equal(res.dealerCards.length, 3);
      assert.equal(calculateHandValue(res.dealerCards).isBust, true);
      assert.equal(res.remainingDeck.length, 1); // Did not draw the extra 2
    });
  });

  describe('evaluateBlackjackResult()', () => {
    it('returns bust when player exceeds 21', () => {
      const player = [makeCard('spades', '10'), makeCard('hearts', '8'), makeCard('diamonds', '5')]; // 23
      const dealer = [makeCard('clubs', '10'), makeCard('clubs', '7')]; // 17

      const res = evaluateBlackjackResult(player, dealer);
      assert.equal(res.outcome, 'bust');
      assert.equal(res.multiplier, 0);
    });

    it('returns blackjack 3:2 payout when player has natural 21 and dealer does not', () => {
      const player = [makeCard('spades', 'A'), makeCard('hearts', 'K')]; // 21 (Natural)
      const dealer = [makeCard('clubs', '10'), makeCard('clubs', '9')]; // 19

      const res = evaluateBlackjackResult(player, dealer);
      assert.equal(res.outcome, 'blackjack');
      assert.equal(res.multiplier, 2.5);
    });

    it('returns push when both player and dealer have natural blackjack', () => {
      const player = [makeCard('spades', 'A'), makeCard('hearts', 'K')];
      const dealer = [makeCard('diamonds', 'A'), makeCard('clubs', 'Q')];

      const res = evaluateBlackjackResult(player, dealer);
      assert.equal(res.outcome, 'push');
      assert.equal(res.multiplier, 1);
    });

    it('returns dealer_bust when dealer exceeds 21', () => {
      const player = [makeCard('spades', '10'), makeCard('hearts', '8')]; // 18
      const dealer = [
        makeCard('clubs', '10'),
        makeCard('clubs', '6'),
        makeCard('diamonds', '7'),
      ]; // 23

      const res = evaluateBlackjackResult(player, dealer);
      assert.equal(res.outcome, 'dealer_bust');
      assert.equal(res.multiplier, 2);
    });

    it('returns win when player total is higher than dealer total', () => {
      const player = [makeCard('spades', '10'), makeCard('hearts', '10')]; // 20
      const dealer = [makeCard('clubs', '10'), makeCard('clubs', '9')]; // 19

      const res = evaluateBlackjackResult(player, dealer);
      assert.equal(res.outcome, 'win');
      assert.equal(res.multiplier, 2);
    });

    it('returns loss when dealer total is higher than player total', () => {
      const player = [makeCard('spades', '10'), makeCard('hearts', '8')]; // 18
      const dealer = [makeCard('clubs', '10'), makeCard('clubs', '9')]; // 19

      const res = evaluateBlackjackResult(player, dealer);
      assert.equal(res.outcome, 'loss');
      assert.equal(res.multiplier, 0);
    });

    it('returns push when both player and dealer tie', () => {
      const player = [makeCard('spades', '10'), makeCard('hearts', '9')]; // 19
      const dealer = [makeCard('clubs', '10'), makeCard('clubs', '9')]; // 19

      const res = evaluateBlackjackResult(player, dealer);
      assert.equal(res.outcome, 'push');
      assert.equal(res.multiplier, 1);
    });
  });

  describe('Embed & ActionRow Presentation', () => {
    it('hides dealer hole card during active play', () => {
      const player = [makeCard('spades', '10'), makeCard('hearts', '8')];
      const dealer = [makeCard('diamonds', 'K'), makeCard('clubs', '5')];

      const embed = buildBlackjackEmbed(player, dealer, false);
      assert.ok(embed.fields);
      // Dealer hand field should contain hole card indicator
      const dealerField = embed.fields.find((f) => f.name.includes("Dealer's Hand"));
      assert.ok(dealerField);
      assert.ok(dealerField.value.includes('🂠 `[ ? ]`'));
    });

    it('reveals full dealer hand upon game over', () => {
      const player = [makeCard('spades', '10'), makeCard('hearts', '10')];
      const dealer = [makeCard('diamonds', 'K'), makeCard('clubs', '8')];

      const embed = buildBlackjackEmbed(player, dealer, true);
      const dealerField = embed.fields?.find((f) => f.name.includes("Dealer's Hand"));
      assert.ok(dealerField);
      assert.equal(dealerField.value.includes('`[ ? ]`'), false);
    });

    it('builds action row with Hit, Stand, and Double Down buttons', () => {
      const row = buildBlackjackActionRow('game_999', true, false);
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 3);

      assert.equal(row.components[0].custom_id, 'game_bj:hit:game_999');
      assert.equal(row.components[1].custom_id, 'game_bj:stand:game_999');
      assert.equal(row.components[2].custom_id, 'game_bj:double:game_999');
      assert.equal(row.components[2].disabled, false);
    });

    it('disables Double Down button when canDouble is false', () => {
      const row = buildBlackjackActionRow('game_999', false, false);
      assert.equal(row.components[2].disabled, true);
      assert.equal(row.components[0].disabled, false);
      assert.equal(row.components[1].disabled, false);
    });
  });
});
