/**
 * test/games/trivia.test.ts
 * Unit tests for Phase 33 Trivia Game Engine.
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRIVIA_QUESTIONS,
  TRIVIA_CATEGORIES,
  getTriviaQuestion,
  buildTriviaEmbed,
  buildTriviaActionRow,
  type TriviaCategory,
} from '@/lib/games/trivia';

describe('Interactive Games Suite — Trivia Engine', () => {
  describe('Question Database Integrity', () => {
    it('contains at least 50 high-quality trivia questions', () => {
      assert.ok(TRIVIA_QUESTIONS.length >= 50);
      assert.equal(TRIVIA_QUESTIONS.length, 55);
    });

    it('covers all 5 target categories with at least 10 questions each', () => {
      const categories: TriviaCategory[] = ['tech', 'gaming', 'anime', 'science', 'general'];

      for (const cat of categories) {
        const count = TRIVIA_QUESTIONS.filter((q) => q.category === cat).length;
        assert.ok(count >= 10, `Category "${cat}" has ${count} questions (expected >= 10)`);
      }
    });

    it('validates schema of every trivia question', () => {
      const seenIds = new Set<string>();

      for (const q of TRIVIA_QUESTIONS) {
        assert.ok(q.id && typeof q.id === 'string', 'Question must have id');
        assert.ok(!seenIds.has(q.id), `Question id "${q.id}" must be unique`);
        seenIds.add(q.id);

        assert.ok(q.question.length > 5, 'Question text must be substantive');
        assert.ok(q.correctAnswer.length > 0, 'Must have correct answer');
        assert.equal(q.incorrectAnswers.length, 3, 'Must have exactly 3 incorrect answers');
        assert.ok(q.explanation.length > 10, 'Must provide an informative explanation');

        // Ensure correct answer is not duplicated in incorrect answers
        assert.equal(
          q.incorrectAnswers.includes(q.correctAnswer),
          false,
          `Correct answer "${q.correctAnswer}" should not be in incorrect answers`,
        );
      }
    });
  });

  describe('getTriviaQuestion()', () => {
    it('retrieves a question with 4 shuffled choices and valid correctIndex', () => {
      const item = getTriviaQuestion();

      assert.ok(item.question);
      assert.equal(item.choices.length, 4);
      assert.ok(item.correctIndex >= 0 && item.correctIndex <= 3);
      assert.equal(item.choices[item.correctIndex], item.question.correctAnswer);
      assert.equal(item.explanation, item.question.explanation);
    });

    it('filters accurately by category', () => {
      for (const catMeta of TRIVIA_CATEGORIES) {
        const item = getTriviaQuestion(catMeta.id);
        assert.equal(item.question.category, catMeta.id);
      }
    });

    it('falls back safely to full question pool on unknown category', () => {
      const item = getTriviaQuestion('nonexistent_category_xyz');
      assert.ok(item.question);
      assert.equal(item.choices.length, 4);
    });

    it('deterministic RNG generates predictable choice shuffling', () => {
      // Deterministic sequence
      let counter = 0;
      const fakeRng = () => {
        counter += 0.25;
        return counter % 1;
      };

      const q1 = getTriviaQuestion('tech', fakeRng);
      assert.equal(q1.choices[q1.correctIndex], q1.question.correctAnswer);
    });
  });

  describe('buildTriviaEmbed()', () => {
    it('builds active embed with question and options A, B, C, D', () => {
      const item = getTriviaQuestion('science');
      const embed = buildTriviaEmbed({
        question: item.question,
        choices: item.choices,
        userTag: 'PlayerOne',
      });

      assert.ok(embed.title?.includes('Trivia Challenge'));
      assert.ok(embed.description?.includes(item.question.question));
      assert.ok(embed.description?.includes('**[A]**'));
      assert.ok(embed.description?.includes('**[D]**'));
      assert.ok(embed.fields?.some((f) => f.name === 'Player' && f.value === 'PlayerOne'));
    });

    it('renders correct answer and explanation when answered correctly', () => {
      const item = getTriviaQuestion('gaming');
      const embed = buildTriviaEmbed({
        question: item.question,
        choices: item.choices,
        answeredIndex: item.correctIndex,
        correctIndex: item.correctIndex,
      });

      assert.ok(embed.title?.includes('Correct!'));
      assert.ok(embed.fields?.some((f) => f.name === 'Explanation'));
    });

    it('renders danger status and explanation when answered incorrectly', () => {
      const item = getTriviaQuestion('tech');
      const wrongIndex = (item.correctIndex + 1) % 4;
      const embed = buildTriviaEmbed({
        question: item.question,
        choices: item.choices,
        answeredIndex: wrongIndex,
        correctIndex: item.correctIndex,
      });

      assert.ok(embed.title?.includes('Incorrect!'));
      assert.ok(embed.fields?.some((f) => f.name === 'Explanation'));
    });
  });

  describe('buildTriviaActionRow()', () => {
    it('creates 4 enabled buttons for active game', () => {
      const row = buildTriviaActionRow('game_123');
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 4);

      assert.equal(row.components[0].custom_id, 'game_trivia:game_123:0');
      assert.equal(row.components[0].label, '[A]');
      assert.equal(row.components[0].disabled, false);

      assert.equal(row.components[3].custom_id, 'game_trivia:game_123:3');
      assert.equal(row.components[3].label, '[D]');
    });

    it('disables all buttons and highlights correct & chosen button on completion', () => {
      const row = buildTriviaActionRow('game_123', 1, 2);

      for (const btn of row.components) {
        assert.equal(btn.disabled, true);
      }

      // Button index 2 is correct (style 3 = Success)
      assert.equal(row.components[2].style, 3);
      // Button index 1 was picked incorrectly (style 4 = Danger)
      assert.equal(row.components[1].style, 4);
      // Button index 0 remains secondary (style 2)
      assert.equal(row.components[0].style, 2);
    });
  });
});
