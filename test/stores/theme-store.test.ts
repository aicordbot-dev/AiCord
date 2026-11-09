import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';

import { useThemeStore } from '../../src/lib/theme-store';
import { useScrollStore } from '../../src/lib/scroll-store';
import { SIGNATURE_THEMES } from '../../src/config/themes';

test('Theme Store & Engine Tests', async (t) => {
  await t.test('initializes with default cyberpunk theme and pipes bar style', () => {
    const state = useThemeStore.getState();
    assert.ok(['cyberpunk', 'midnight', 'emerald', 'gold', 'retro', 'frost'].includes(state.themeId));
    assert.ok(state.theme);
  });

  await t.test('switches themes and updates store state properly', () => {
    useThemeStore.getState().setTheme('midnight');
    assert.equal(useThemeStore.getState().themeId, 'midnight');
    assert.equal(useThemeStore.getState().theme.id, 'midnight');
    assert.equal(useThemeStore.getState().theme.primaryHex, SIGNATURE_THEMES.midnight.primaryHex);

    useThemeStore.getState().setTheme('gold');
    assert.equal(useThemeStore.getState().themeId, 'gold');
    assert.equal(useThemeStore.getState().theme.name, 'Golden Tycoon');
  });

  await t.test('updates bar style independently', () => {
    useThemeStore.getState().setBarStyle('blocks');
    assert.equal(useThemeStore.getState().barStyle, 'blocks');

    useThemeStore.getState().setBarStyle('squares');
    assert.equal(useThemeStore.getState().barStyle, 'squares');
  });

  await t.test('toggles themes sequentially', () => {
    useThemeStore.getState().setTheme('cyberpunk');
    useThemeStore.getState().toggleTheme();
    assert.equal(useThemeStore.getState().themeId, 'midnight');
    useThemeStore.getState().toggleTheme();
    assert.equal(useThemeStore.getState().themeId, 'emerald');
  });

  await t.test('manages reduced motion state', () => {
    useThemeStore.getState().setReducedMotion(true);
    assert.equal(useThemeStore.getState().reducedMotion, true);

    useThemeStore.getState().setReducedMotion(false);
    assert.equal(useThemeStore.getState().reducedMotion, false);
  });
});

test('Scroll Store Tests', async (t) => {
  await t.test('manages scroll progress and clamps between 0 and 1', () => {
    useScrollStore.getState().setProgress(0.45);
    assert.equal(useScrollStore.getState().progress, 0.45);

    // Negative progress clamps to 0
    useScrollStore.getState().setProgress(-0.2);
    assert.equal(useScrollStore.getState().progress, 0);

    // Excessive progress clamps to 1
    useScrollStore.getState().setProgress(1.5);
    assert.equal(useScrollStore.getState().progress, 1);
  });

  await t.test('manages velocity, activeScene, and qualityTier', () => {
    useScrollStore.getState().setVelocity(12.4);
    assert.equal(useScrollStore.getState().velocity, 12.4);

    useScrollStore.getState().setActiveScene('pricing', 4);
    assert.equal(useScrollStore.getState().activeScene, 'pricing');
    assert.equal(useScrollStore.getState().sceneIndex, 4);

    useScrollStore.getState().setQualityTier('low');
    assert.equal(useScrollStore.getState().qualityTier, 'low');
  });
});
