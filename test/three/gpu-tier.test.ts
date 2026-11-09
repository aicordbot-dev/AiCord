import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectGpuTier,
  stepGpuTier,
  TierHysteresisTracker,
  getWebGLRendererInfo,
} from '../../src/lib/use-gpu-tier';

test('GPU Tier Detection & Hysteresis Heuristic Tests', async (t) => {
  await t.test('detects high tier for desktop workstation with discrete GPU', () => {
    const tier = detectGpuTier({
      hardwareConcurrency: 16,
      deviceMemory: 32,
      devicePixelRatio: 1.5,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      glRenderer: 'NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0',
    });
    assert.equal(tier, 'high');
  });

  await t.test('detects high tier for Apple M-series Pro/Max/Ultra silicon', () => {
    const tier = detectGpuTier({
      hardwareConcurrency: 12,
      deviceMemory: 18,
      devicePixelRatio: 2,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      glRenderer: 'Apple M3 Pro',
    });
    assert.equal(tier, 'high');
  });

  await t.test('detects mid tier for average desktop machine', () => {
    const tier = detectGpuTier({
      hardwareConcurrency: 4,
      deviceMemory: 4,
      devicePixelRatio: 1,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      glRenderer: 'Intel(R) UHD Graphics 630',
    });
    assert.equal(tier, 'mid');
  });

  await t.test('detects mid tier for high-end modern mobile device', () => {
    const tier = detectGpuTier({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      devicePixelRatio: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      glRenderer: 'Apple GPU',
    });
    assert.equal(tier, 'mid');
  });

  await t.test('detects low tier for budget mobile device', () => {
    const tier = detectGpuTier({
      hardwareConcurrency: 4,
      deviceMemory: 3,
      devicePixelRatio: 2,
      userAgent: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36',
      glRenderer: 'Adreno 506',
    });
    assert.equal(tier, 'low');
  });

  await t.test('detects low tier when software renderer (SwiftShader / llvmpipe) is detected', () => {
    const swiftShaderTier = detectGpuTier({
      hardwareConcurrency: 16,
      deviceMemory: 32,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      glRenderer: 'Google SwiftShader',
    });
    assert.equal(swiftShaderTier, 'low');

    const llvmpipeTier = detectGpuTier({
      hardwareConcurrency: 16,
      deviceMemory: 32,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      glRenderer: 'llvmpipe (LLVM 12.0.0, 256 bits)',
    });
    assert.equal(llvmpipeTier, 'low');
  });

  await t.test('detects low tier for devices with <= 2 CPU cores or < 3GB RAM', () => {
    const lowCoreTier = detectGpuTier({
      hardwareConcurrency: 2,
      deviceMemory: 8,
      glRenderer: 'Intel HD Graphics',
    });
    assert.equal(lowCoreTier, 'low');

    const lowRamTier = detectGpuTier({
      hardwareConcurrency: 8,
      deviceMemory: 2,
      glRenderer: 'Intel HD Graphics',
    });
    assert.equal(lowRamTier, 'low');
  });

  await t.test('stepGpuTier correctly steps up and down with saturation clamping', () => {
    assert.equal(stepGpuTier('high', 'down'), 'mid');
    assert.equal(stepGpuTier('mid', 'down'), 'low');
    assert.equal(stepGpuTier('low', 'down'), 'low');

    assert.equal(stepGpuTier('low', 'up'), 'mid');
    assert.equal(stepGpuTier('mid', 'up'), 'high');
    assert.equal(stepGpuTier('high', 'up'), 'high');
  });

  await t.test('TierHysteresisTracker requires threshold consecutive triggers before stepping tier', () => {
    const tracker = new TierHysteresisTracker('high', 3);

    // Single frame drop does NOT step down tier immediately
    assert.equal(tracker.onDecline(), 'high');
    assert.equal(tracker.onDecline(), 'high');

    // 3rd consecutive drop steps down to 'mid'
    assert.equal(tracker.onDecline(), 'mid');

    // Occasional good frame resets the bad streak
    tracker.onDecline();
    tracker.onIncline(); // resets bad streak
    tracker.onDecline();
    assert.equal(tracker.getTier(), 'mid'); // remains 'mid'

    // 3 consecutive good ticks recovers to 'high'
    tracker.onIncline();
    tracker.onIncline();
    tracker.onIncline();
    assert.equal(tracker.getTier(), 'high');
  });

  await t.test('getWebGLRendererInfo returns empty string safely for null context', () => {
    assert.equal(getWebGLRendererInfo(null), '');
    assert.equal(getWebGLRendererInfo(undefined), '');
  });
});
