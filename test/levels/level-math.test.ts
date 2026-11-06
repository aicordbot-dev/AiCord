/**
 * test/levels/level-math.test.ts
 * Unit tests for Phase 23 Level Math:
 * - Quadratic formula XP thresholds
 * - Cumulative level XP sums
 * - getLevelFromXp() level, progress, and remainder resolution
 * - renderProgressBar() visual block formatting and clamping
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getXpForLevel,
  getTotalXpForLevel,
  getLevelFromXp,
  renderProgressBar,
} from '@/lib/levels/level-math';

describe('Levels & XP Progression — Level Math', () => {
  describe('getXpForLevel() — Quadratic Formula', () => {
    it('calculates exact XP requirements for initial levels', () => {
      // Formula: 5 * (N^2) + 50 * N + 100
      assert.equal(getXpForLevel(0), 100); // 5(0) + 50(0) + 100 = 100
      assert.equal(getXpForLevel(1), 155); // 5(1) + 50(1) + 100 = 155
      assert.equal(getXpForLevel(2), 220); // 5(4) + 50(2) + 100 = 220
      assert.equal(getXpForLevel(3), 295); // 5(9) + 50(3) + 100 = 295
      assert.equal(getXpForLevel(4), 380); // 5(16) + 50(4) + 100 = 380
      assert.equal(getXpForLevel(5), 475); // 5(25) + 50(5) + 100 = 475
    });

    it('handles negative or invalid levels by returning 0', () => {
      assert.equal(getXpForLevel(-1), 0);
      assert.equal(getXpForLevel(-10), 0);
      assert.equal(getXpForLevel(NaN), 0);
      assert.equal(getXpForLevel(Infinity), 0);
    });

    it('floors fractional levels gracefully', () => {
      assert.equal(getXpForLevel(2.7), getXpForLevel(2));
    });
  });

  describe('getTotalXpForLevel() — Cumulative Progression', () => {
    it('returns 0 for level 0 or negative levels', () => {
      assert.equal(getTotalXpForLevel(0), 0);
      assert.equal(getTotalXpForLevel(-5), 0);
    });

    it('computes exact cumulative XP to reach levels 1 through 5', () => {
      // Level 1: Level 0 requirement (100)
      assert.equal(getTotalXpForLevel(1), 100);

      // Level 2: 100 + 155 = 255
      assert.equal(getTotalXpForLevel(2), 255);

      // Level 3: 255 + 220 = 475
      assert.equal(getTotalXpForLevel(3), 475);

      // Level 4: 475 + 295 = 770
      assert.equal(getTotalXpForLevel(4), 770);

      // Level 5: 770 + 380 = 1150
      assert.equal(getTotalXpForLevel(5), 1150);
    });
  });

  describe('getLevelFromXp() — XP & Level Resolution', () => {
    it('resolves 0 XP to level 0 with 0% progress', () => {
      const progress = getLevelFromXp(0);
      assert.equal(progress.level, 0);
      assert.equal(progress.xpIntoLevel, 0);
      assert.equal(progress.xpForNextLevel, 100);
      assert.equal(progress.progressPercent, 0);
      assert.equal(progress.totalXp, 0);
    });

    it('resolves negative XP safely to level 0', () => {
      const progress = getLevelFromXp(-50);
      assert.equal(progress.level, 0);
      assert.equal(progress.xpIntoLevel, 0);
      assert.equal(progress.progressPercent, 0);
    });

    it('resolves mid-level progress accurately within level 0', () => {
      const progress = getLevelFromXp(50);
      assert.equal(progress.level, 0);
      assert.equal(progress.xpIntoLevel, 50);
      assert.equal(progress.xpForNextLevel, 100);
      assert.equal(progress.progressPercent, 50);
    });

    it('hits exact level 1 threshold at 100 XP', () => {
      const progress = getLevelFromXp(100);
      assert.equal(progress.level, 1);
      assert.equal(progress.xpIntoLevel, 0);
      assert.equal(progress.xpForNextLevel, 155);
      assert.equal(progress.progressPercent, 0);
      assert.equal(progress.totalXp, 100);
    });

    it('computes correct progress inside level 1 at 200 XP', () => {
      const progress = getLevelFromXp(200);
      assert.equal(progress.level, 1);
      assert.equal(progress.xpIntoLevel, 100); // 200 - 100 = 100
      assert.equal(progress.xpForNextLevel, 155);
      // 100 / 155 = 64.51% -> floored to 64%
      assert.equal(progress.progressPercent, 64);
    });

    it('hits exact level 2 threshold at 255 XP', () => {
      const progress = getLevelFromXp(255);
      assert.equal(progress.level, 2);
      assert.equal(progress.xpIntoLevel, 0);
      assert.equal(progress.xpForNextLevel, 220);
      assert.equal(progress.progressPercent, 0);
    });

    it('resolves higher XP tiers consistently', () => {
      // Cumulative XP for level 10:
      const total10 = getTotalXpForLevel(10);
      const progress10 = getLevelFromXp(total10);
      assert.equal(progress10.level, 10);
      assert.equal(progress10.xpIntoLevel, 0);

      // 100 XP into level 10
      const progress10plus = getLevelFromXp(total10 + 100);
      assert.equal(progress10plus.level, 10);
      assert.equal(progress10plus.xpIntoLevel, 100);
      assert.ok(progress10plus.progressPercent > 0 && progress10plus.progressPercent < 100);
    });
  });

  describe('renderProgressBar() — Visual Rendering', () => {
    it('renders 0% empty bar with default 16 segments', () => {
      const bar = renderProgressBar(0);
      assert.equal(bar, '[░░░░░░░░░░░░░░░░] 0%');
    });

    it('renders 50% half-filled bar matching specification', () => {
      const bar = renderProgressBar(50);
      assert.equal(bar, '[████████░░░░░░░░] 50%');
    });

    it('renders 100% completely filled bar', () => {
      const bar = renderProgressBar(100);
      assert.equal(bar, '[████████████████] 100%');
    });

    it('supports custom bar length (length = 10)', () => {
      const bar = renderProgressBar(50, 10);
      assert.equal(bar, '[█████░░░░░] 50%');
    });

    it('clamps negative percentages to 0%', () => {
      const bar = renderProgressBar(-25);
      assert.equal(bar, '[░░░░░░░░░░░░░░░░] 0%');
    });

    it('clamps excessive percentages to 100%', () => {
      const bar = renderProgressBar(150);
      assert.equal(bar, '[████████████████] 100%');
    });

    it('clamps custom bar lengths to safe limits', () => {
      // Below 4 clamps to 4
      const shortBar = renderProgressBar(50, 2);
      assert.equal(shortBar, '[██░░] 50%');
    });
  });
});
