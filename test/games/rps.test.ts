/**
 * test/games/rps.test.ts
 * Unit tests for Phase 33 Rock Paper Scissors Engine:
 * - 3x3 win/loss/tie evaluation matrix
 * - Random choice generator
 * - Embed builder for active & resolved states
 * - Action row buttons
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateRps,
  getRandomRpsChoice,
  getRpsMatchupMessage,
  buildRpsEmbed,
  buildRpsActionRow,
  RPS_CHOICES,
  type RpsChoice,
} from '@/lib/games/rps';

describe('Interactive Games Suite — Rock Paper Scissors Engine', () => {
  describe('Resolution Matrix (3x3 Combinations)', () => {
    it('evaluates Rock outcomes accurately', () => {
      assert.equal(evaluateRps('rock', 'scissors'), 'win');
      assert.equal(evaluateRps('rock', 'rock'), 'tie');
      assert.equal(evaluateRps('rock', 'paper'), 'loss');
    });

    it('evaluates Paper outcomes accurately', () => {
      assert.equal(evaluateRps('paper', 'rock'), 'win');
      assert.equal(evaluateRps('paper', 'paper'), 'tie');
      assert.equal(evaluateRps('paper', 'scissors'), 'loss');
    });

    it('evaluates Scissors outcomes accurately', () => {
      assert.equal(evaluateRps('scissors', 'paper'), 'win');
      assert.equal(evaluateRps('scissors', 'scissors'), 'tie');
      assert.equal(evaluateRps('scissors', 'rock'), 'loss');
    });

    it('all choices beat their respective targets', () => {
      for (const [key, meta] of Object.entries(RPS_CHOICES)) {
        const choice = key as RpsChoice;
        assert.equal(evaluateRps(choice, meta.beats), 'win');
      }
    });
  });

  describe('getRandomRpsChoice()', () => {
    it('picks a valid RPS choice', () => {
      for (let i = 0; i < 20; i++) {
        const choice = getRandomRpsChoice();
        assert.ok(['rock', 'paper', 'scissors'].includes(choice));
      }
    });

    it('deterministic RNG yields predictable choices', () => {
      const rockRng = () => 0.1;
      const paperRng = () => 0.4;
      const scissorsRng = () => 0.8;

      assert.equal(getRandomRpsChoice(rockRng), 'rock');
      assert.equal(getRandomRpsChoice(paperRng), 'paper');
      assert.equal(getRandomRpsChoice(scissorsRng), 'scissors');
    });
  });

  describe('getRpsMatchupMessage()', () => {
    it('generates descriptive battle texts', () => {
      const winMsg = getRpsMatchupMessage('rock', 'scissors', 'win');
      assert.ok(winMsg.includes('crushes'));
      assert.ok(winMsg.includes('victorious'));

      const lossMsg = getRpsMatchupMessage('paper', 'scissors', 'loss');
      assert.ok(lossMsg.includes('cuts'));
      assert.ok(lossMsg.includes('The bot takes the round'));

      const tieMsg = getRpsMatchupMessage('rock', 'rock', 'tie');
      assert.ok(tieMsg.includes('standoff'));
    });
  });

  describe('buildRpsEmbed()', () => {
    it('builds interactive pending embed when no moves chosen', () => {
      const embed = buildRpsEmbed();
      assert.ok(embed.title?.includes('Rock Paper Scissors'));
      assert.ok(embed.description?.includes('Choose your move below!'));
      assert.ok(embed.fields?.some((f) => f.name === 'Rules'));
    });

    it('builds victory embed on player win', () => {
      const embed = buildRpsEmbed({
        playerChoice: 'rock',
        botChoice: 'scissors',
        result: 'win',
        userTag: 'Champion',
      });

      assert.ok(embed.title?.includes('You Won!'));
      assert.ok(embed.fields?.some((f) => f.name.includes('Champion') && f.value.includes('Rock')));
      assert.ok(embed.fields?.some((f) => f.name === 'Round Outcome' && f.value.includes('Victory')));
    });

    it('builds defeat embed on bot win', () => {
      const embed = buildRpsEmbed({
        playerChoice: 'scissors',
        botChoice: 'rock',
        result: 'loss',
      });

      assert.ok(embed.title?.includes('Bot Won!'));
      assert.ok(embed.fields?.some((f) => f.name === 'Round Outcome' && f.value.includes('Defeat')));
    });

    it('builds tie embed on draw', () => {
      const embed = buildRpsEmbed({
        playerChoice: 'paper',
        botChoice: 'paper',
        result: 'tie',
      });

      assert.ok(embed.title?.includes('Tie Game!'));
      assert.ok(embed.fields?.some((f) => f.name === 'Round Outcome' && f.value.includes('Standoff')));
    });
  });

  describe('buildRpsActionRow()', () => {
    it('creates 3 buttons for rock, paper, scissors', () => {
      const row = buildRpsActionRow('game_rps_1');
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 3);

      assert.equal(row.components[0].custom_id, 'game_rps:game_rps_1:rock');
      assert.equal(row.components[0].label, 'Rock');
      assert.equal(row.components[1].custom_id, 'game_rps:game_rps_1:paper');
      assert.equal(row.components[1].label, 'Paper');
      assert.equal(row.components[2].custom_id, 'game_rps:game_rps_1:scissors');
      assert.equal(row.components[2].label, 'Scissors');
    });

    it('disables all buttons when disabled is true', () => {
      const row = buildRpsActionRow('game_rps_1', true, 'rock');
      for (const btn of row.components) {
        assert.equal(btn.disabled, true);
      }
      // Chosen button has style 3 (Success)
      assert.equal(row.components[0].style, 3);
      // Other buttons have style 1 (Primary)
      assert.equal(row.components[1].style, 1);
    });
  });
});
