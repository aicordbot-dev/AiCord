/**
 * test/games/commands.test.ts
 * Unit tests for Phase 33 Game Slash Commands & Webhook Interaction Handlers:
 * - Central Command Registry lookup
 * - Autocomplete engine for /trivia
 * - Authorization enforcement & ephemeral rejection
 * - Interactive game state progression
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommand,
  type AutocompleteContext,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  setFollowUpHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  setActiveGame,
  clearActiveGames,
  handleTriviaInteraction,
  handleBlackjackInteraction,
  handleRpsInteraction,
  type ActiveTriviaGame,
  type ActiveBlackjackGame,
  type ActiveRpsGame,
} from '@/commands/games';
import type { Card } from '@/lib/games/blackjack';

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

describe('Interactive Games Suite — Slash Commands & Webhook Interactions', () => {
  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];
  let followUpCalls: Array<{ token: string; options: InteractionResponseOptions }> = [];

  beforeEach(() => {
    clearActiveGames();
    interceptedResponses = [];
    followUpCalls = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });

    setFollowUpHandler(async (token, options) => {
      followUpCalls.push({ token, options });
      return { id: 'mock_followup_id' };
    });
  });

  afterEach(() => {
    setResponseHandler(null);
    setFollowUpHandler(null);
  });

  describe('Central Command Registry Integration', () => {
    it('registers /trivia, /blackjack, /rps, /coinflip, and /slots with category "fun"', () => {
      const trivia = getCommand('trivia');
      assert.ok(trivia);
      assert.equal(trivia.category, 'fun');
      assert.ok(trivia.rateLimit);

      const blackjack = getCommand('blackjack');
      assert.ok(blackjack);
      assert.equal(blackjack.category, 'fun');
      assert.ok(blackjack.rateLimit);

      const rps = getCommand('rps');
      assert.ok(rps);
      assert.equal(rps.category, 'fun');
      assert.ok(rps.rateLimit);

      const coinflip = getCommand('coinflip');
      assert.ok(coinflip);
      assert.equal(coinflip.category, 'fun');
      assert.ok(coinflip.rateLimit);

      const slots = getCommand('slots');
      assert.ok(slots);
      assert.equal(slots.category, 'fun');
      assert.ok(slots.rateLimit);
    });
  });

  describe('/trivia Autocomplete', () => {
    it('returns filtered categories based on focused input', async () => {
      const trivia = getCommand('trivia');
      assert.ok(trivia?.autocomplete);

      const ctx: AutocompleteContext = {
        interaction: {},
        commandName: 'trivia',
        focusedOption: { name: 'category', value: 'tech', type: 3 },
        userId: 'u1',
      };

      const choices = await trivia.autocomplete(ctx);
      assert.equal(choices.length, 1);
      assert.equal(choices[0].value, 'tech');
      assert.ok(choices[0].name.includes('Technology'));
    });

    it('returns all 5 categories when query is empty', async () => {
      const trivia = getCommand('trivia');
      assert.ok(trivia?.autocomplete);

      const ctx: AutocompleteContext = {
        interaction: {},
        commandName: 'trivia',
        focusedOption: { name: 'category', value: '', type: 3 },
        userId: 'u1',
      };

      const choices = await trivia.autocomplete(ctx);
      assert.equal(choices.length, 5);
    });
  });

  describe('Component Webhook Handlers & Security Rejection', () => {
    it('blocks unauthorized users from interacting with active trivia games', async () => {
      const gameId = 'triv_sec_1';
      const ownerId = 'user_owner';
      const strangerId = 'user_stranger';

      const mockTrivia: ActiveTriviaGame = {
        type: 'trivia',
        gameId,
        userId: ownerId,
        userTag: 'TriviaMaster',
        question: {
          id: 'q1',
          category: 'tech',
          question: 'What is Linux?',
          correctAnswer: 'An OS kernel',
          incorrectAnswers: ['A browser', 'A phone', 'A language'],
          explanation: 'Linux is a kernel.',
        },
        choices: ['An OS kernel', 'A browser', 'A phone', 'A language'],
        correctIndex: 0,
      };

      setActiveGame(gameId, mockTrivia);

      // Stranger tries to submit answer
      await handleTriviaInteraction('token_123', gameId, '0', strangerId);

      // Response handler should NOT have edited original message
      assert.equal(interceptedResponses.length, 0);
      // Ephemeral rejection sent
      assert.equal(followUpCalls.length, 1);
      assert.equal(followUpCalls[0].options.ephemeral, true);
      assert.ok(followUpCalls[0].options.embeds?.[0].title?.includes('Unauthorized'));
    });

    it('processes answer and updates embed for authorized trivia challenger', async () => {
      const gameId = 'triv_auth_1';
      const ownerId = 'user_owner';

      const mockTrivia: ActiveTriviaGame = {
        type: 'trivia',
        gameId,
        userId: ownerId,
        userTag: 'TriviaMaster',
        question: {
          id: 'q1',
          category: 'tech',
          question: 'What is Linux?',
          correctAnswer: 'An OS kernel',
          incorrectAnswers: ['A browser', 'A phone', 'A language'],
          explanation: 'Linux is a kernel.',
        },
        choices: ['An OS kernel', 'A browser', 'A phone', 'A language'],
        correctIndex: 0,
      };

      setActiveGame(gameId, mockTrivia);

      // Owner answers correctly
      await handleTriviaInteraction('token_123', gameId, '0', ownerId);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Correct!'));
    });

    it('blocks unauthorized users from interacting with blackjack tables', async () => {
      const gameId = 'bj_sec_1';
      const ownerId = 'user_owner';
      const strangerId = 'user_stranger';

      const mockBj: ActiveBlackjackGame = {
        type: 'blackjack',
        gameId,
        userId: ownerId,
        userTag: 'CardShark',
        playerHand: [makeCard('spades', '10'), makeCard('hearts', '5')],
        dealerHand: [makeCard('diamonds', 'K'), makeCard('clubs', '6')],
        deck: [makeCard('spades', 'A')],
        bet: 100,
        canDouble: true,
      };

      setActiveGame(gameId, mockBj);

      // Stranger hits
      await handleBlackjackInteraction('token_123', 'hit', gameId, strangerId);
      assert.equal(interceptedResponses.length, 0);
      assert.equal(followUpCalls.length, 1);
      assert.equal(followUpCalls[0].options.ephemeral, true);
    });

    it('allows table owner to hit and bust or stand', async () => {
      const gameId = 'bj_auth_1';
      const ownerId = 'user_owner';

      const mockBj: ActiveBlackjackGame = {
        type: 'blackjack',
        gameId,
        userId: ownerId,
        userTag: 'CardShark',
        playerHand: [makeCard('spades', '10'), makeCard('hearts', '8')], // 18
        dealerHand: [makeCard('diamonds', 'K'), makeCard('clubs', '7')], // 17
        deck: [makeCard('spades', 'A')],
        bet: 100,
        canDouble: true,
      };

      setActiveGame(gameId, mockBj);

      // Owner stands
      await handleBlackjackInteraction('token_123', 'stand', gameId, ownerId);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('You Won!'));
    });

    it('blocks unauthorized users from interacting with RPS games', async () => {
      const gameId = 'rps_sec_1';
      const ownerId = 'user_owner';
      const strangerId = 'user_stranger';

      const mockRps: ActiveRpsGame = {
        type: 'rps',
        gameId,
        userId: ownerId,
        userTag: 'RpsChallenger',
      };

      setActiveGame(gameId, mockRps);

      // Stranger clicks Rock
      await handleRpsInteraction('token_123', gameId, 'rock', strangerId);
      assert.equal(interceptedResponses.length, 0);
      assert.equal(followUpCalls.length, 1);
      assert.equal(followUpCalls[0].options.ephemeral, true);
    });

    it('processes move for authorized RPS challenger', async () => {
      const gameId = 'rps_auth_1';
      const ownerId = 'user_owner';

      const mockRps: ActiveRpsGame = {
        type: 'rps',
        gameId,
        userId: ownerId,
        userTag: 'RpsChallenger',
      };

      setActiveGame(gameId, mockRps);

      // Owner chooses Scissors
      await handleRpsInteraction('token_123', gameId, 'scissors', ownerId);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Rock Paper Scissors'));
    });
  });
});
