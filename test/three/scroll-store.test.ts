import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';

import { useScrollStore } from '../../src/lib/scroll-store';

test('Scroll Store & WebGL State Coordination Tests', async (t) => {
  await t.test('initializes with verified default values', () => {
    const state = useScrollStore.getState();
    assert.equal(state.progress, 0);
    assert.equal(state.velocity, 0);
    assert.equal(state.activeScene, 'hero');
    assert.equal(state.sceneIndex, 0);
    assert.equal(state.fps, 60);
    assert.equal(state.isCanvasVisible, true);
    assert.deepEqual(state.pointer, { x: 0, y: 0 });
  });

  await t.test('setProgress clamps values strictly between 0 and 1', () => {
    useScrollStore.getState().setProgress(0.65);
    assert.equal(useScrollStore.getState().progress, 0.65);

    useScrollStore.getState().setProgress(-0.4);
    assert.equal(useScrollStore.getState().progress, 0);

    useScrollStore.getState().setProgress(2.5);
    assert.equal(useScrollStore.getState().progress, 1);

    // Handles NaN gracefully by falling back to 0
    useScrollStore.getState().setProgress(NaN);
    assert.equal(useScrollStore.getState().progress, 0);
  });

  await t.test('setVelocity updates velocity and handles non-finite inputs', () => {
    useScrollStore.getState().setVelocity(15.2);
    assert.equal(useScrollStore.getState().velocity, 15.2);

    useScrollStore.getState().setVelocity(-8.4);
    assert.equal(useScrollStore.getState().velocity, -8.4);

    useScrollStore.getState().setVelocity(NaN);
    assert.equal(useScrollStore.getState().velocity, 0);
  });

  await t.test('setActiveScene supports both numeric indices (0 to 7) and string keys', () => {
    // String key with index
    useScrollStore.getState().setActiveScene('pricing', 4);
    assert.equal(useScrollStore.getState().activeScene, 'pricing');
    assert.equal(useScrollStore.getState().sceneIndex, 4);

    // Direct numeric scene (0 to 7)
    useScrollStore.getState().setActiveScene(3);
    assert.equal(useScrollStore.getState().activeScene, 3);
    assert.equal(useScrollStore.getState().sceneIndex, 3);

    useScrollStore.getState().setActiveScene(0);
    assert.equal(useScrollStore.getState().activeScene, 0);
    assert.equal(useScrollStore.getState().sceneIndex, 0);
  });

  await t.test('setQualityTier manages high, mid, medium, and low tiers', () => {
    useScrollStore.getState().setQualityTier('high');
    assert.equal(useScrollStore.getState().qualityTier, 'high');

    useScrollStore.getState().setQualityTier('mid');
    assert.equal(useScrollStore.getState().qualityTier, 'mid');

    useScrollStore.getState().setQualityTier('low');
    assert.equal(useScrollStore.getState().qualityTier, 'low');
  });

  await t.test('setPointer coordinates supports direct assignment and functional updater', () => {
    useScrollStore.getState().setPointer({ x: 0.75, y: -0.25 });
    assert.deepEqual(useScrollStore.getState().pointer, { x: 0.75, y: -0.25 });

    // Functional updater
    useScrollStore.getState().setPointer((prev) => ({ x: prev.x + 0.1, y: prev.y }));
    assert.ok(Math.abs(useScrollStore.getState().pointer.x - 0.85) < 0.001);
  });

  await t.test('setFps updates frame rate and sanitizes values', () => {
    useScrollStore.getState().setFps(120);
    assert.equal(useScrollStore.getState().fps, 120);

    useScrollStore.getState().setFps(NaN);
    assert.equal(useScrollStore.getState().fps, 60);
  });

  await t.test('setIsCanvasVisible updates canvas rendering pause flag', () => {
    useScrollStore.getState().setIsCanvasVisible(false);
    assert.equal(useScrollStore.getState().isCanvasVisible, false);

    useScrollStore.getState().setIsCanvasVisible(true);
    assert.equal(useScrollStore.getState().isCanvasVisible, true);
  });
});
