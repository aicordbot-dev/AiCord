import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_BUILD_PHASES,
  calculateOverallProgress,
  getPhasesForStep,
  renderAsciiBar,
} from '../../src/lib/progress-meter';
import { BAR_STYLES } from '../../src/config/themes';

test('Progress Meter — 4-Phase Build Engine', async (t) => {
  await t.test('verifies initial 4 phases configuration', () => {
    assert.equal(INITIAL_BUILD_PHASES.length, 4);

    const [phase1, phase2, phase3, phase4] = INITIAL_BUILD_PHASES;
    assert.equal(phase1.id, 'intent');
    assert.equal(phase1.status, 'done');
    assert.equal(phase1.progressPercent, 100);

    assert.equal(phase2.id, 'permissions');
    assert.equal(phase2.status, 'done');
    assert.equal(phase2.progressPercent, 100);

    assert.equal(phase3.id, 'layout');
    assert.equal(phase3.status, 'done');
    assert.equal(phase3.progressPercent, 100);

    assert.equal(phase4.id, 'services');
    assert.equal(phase4.status, 'in_progress');
    assert.equal(phase4.progressPercent, 70);
  });

  await t.test('calculates overall progress across the 4 phases', () => {
    // 100 + 100 + 100 + 70 = 370 / 4 = 92.5 -> 93%
    const overall = calculateOverallProgress(INITIAL_BUILD_PHASES);
    assert.equal(overall, 93);

    // All done: 100%
    const allDone = getPhasesForStep(3, 100);
    assert.equal(calculateOverallProgress(allDone), 100);

    // Initial phase 1 at 50%: 50 / 4 = 12.5 -> 13%
    const phase0 = getPhasesForStep(0, 50);
    assert.equal(calculateOverallProgress(phase0), 13);
  });

  await t.test('renders ASCII progress bars across all 4 styles correctly', () => {
    // 1. Pipes (▰▱)
    const pipes70 = renderAsciiBar(70, 'pipes', 10);
    assert.equal(pipes70, `[${BAR_STYLES.pipes.filled.repeat(7)}${BAR_STYLES.pipes.empty.repeat(3)}] 70%`);

    // 2. Blocks (█░)
    const blocks70 = renderAsciiBar(70, 'blocks', 10);
    assert.equal(blocks70, `[${BAR_STYLES.blocks.filled.repeat(7)}${BAR_STYLES.blocks.empty.repeat(3)}] 70%`);

    // 3. Squares (■□)
    const squares70 = renderAsciiBar(70, 'squares', 10);
    assert.equal(squares70, `[${BAR_STYLES.squares.filled.repeat(7)}${BAR_STYLES.squares.empty.repeat(3)}] 70%`);

    // 4. Retro (▓░)
    const retro70 = renderAsciiBar(70, 'retro', 10);
    assert.equal(retro70, `[${BAR_STYLES.retro.filled.repeat(7)}${BAR_STYLES.retro.empty.repeat(3)}] 70%`);
    assert.equal(retro70, '[▓▓▓▓▓▓▓░░░] 70%');
  });

  await t.test('handles boundary and anomalous values gracefully', () => {
    // 0%
    const zero = renderAsciiBar(0, 'pipes', 10);
    assert.equal(zero, `[${BAR_STYLES.pipes.empty.repeat(10)}] 0%`);

    // 100%
    const full = renderAsciiBar(100, 'pipes', 10);
    assert.equal(full, `[${BAR_STYLES.pipes.filled.repeat(10)}] 100%`);

    // Negative clamps to 0%
    const negative = renderAsciiBar(-45, 'pipes', 10);
    assert.equal(negative, `[${BAR_STYLES.pipes.empty.repeat(10)}] 0%`);

    // Overflow clamps to 100%
    const overflow = renderAsciiBar(150, 'pipes', 10);
    assert.equal(overflow, `[${BAR_STYLES.pipes.filled.repeat(10)}] 100%`);

    // NaN clamps to 0%
    const nanBar = renderAsciiBar(NaN, 'pipes', 10);
    assert.equal(nanBar, `[${BAR_STYLES.pipes.empty.repeat(10)}] 0%`);

    // Length boundary enforcement (min 4, max 50)
    const tooSmall = renderAsciiBar(50, 'pipes', 2);
    assert.ok(tooSmall.includes('▰▰▱▱')); // clamped to length 4
  });
});
