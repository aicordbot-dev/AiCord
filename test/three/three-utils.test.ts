import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  hexToThreeColor,
  cssToThreeColor,
  createSparkleTexture,
  isWebGLAvailable,
} from '../../src/lib/three-utils';
import { SIGNATURE_THEMES } from '../../src/config/themes';

test('Three.js Utilities & Texture Bridge Tests', async (t) => {
  await t.test('converts standard 6-digit hex string into accurate THREE.Color', () => {
    const cyan = hexToThreeColor('#00f0ff');
    assert.ok(cyan instanceof THREE.Color);
    assert.equal(cyan.getHexString().toLowerCase(), '00f0ff');
  });

  await t.test('converts 3-digit shorthand hex into THREE.Color', () => {
    const white = hexToThreeColor('#fff');
    assert.equal(white.getHexString().toLowerCase(), 'ffffff');
    assert.equal(white.r, 1);
    assert.equal(white.g, 1);
    assert.equal(white.b, 1);
  });

  await t.test('strips 8-digit hex alpha channel safely', () => {
    const semiCyan = hexToThreeColor('#00f0ff80');
    assert.equal(semiCyan.getHexString().toLowerCase(), '00f0ff');
  });

  await t.test('handles invalid inputs and falls back to default color', () => {
    const fallbackColor = hexToThreeColor('', '#ff007f');
    assert.equal(fallbackColor.getHexString().toLowerCase(), 'ff007f');

    const invalidHex = hexToThreeColor('not-a-color', '#123456');
    assert.equal(invalidHex.getHexString().toLowerCase(), '123456');
  });

  await t.test('cssToThreeColor is an alias of hexToThreeColor', () => {
    assert.equal(cssToThreeColor, hexToThreeColor);
    const color = cssToThreeColor('#10b981');
    assert.equal(color.getHexString().toLowerCase(), '10b981');
  });

  await t.test('converts all signature theme colors to Three.js Colors without throwing', () => {
    for (const [key, theme] of Object.entries(SIGNATURE_THEMES)) {
      const primary = hexToThreeColor(theme.primaryHex);
      const accent = hexToThreeColor(theme.accentHex);
      assert.ok(primary instanceof THREE.Color, `Primary failed for theme: ${key}`);
      assert.ok(accent instanceof THREE.Color, `Accent failed for theme: ${key}`);
      assert.equal(primary.getHexString().toLowerCase(), theme.primaryHex.replace('#', '').toLowerCase());
    }
  });

  await t.test('createSparkleTexture generates an in-memory CanvasTexture safely', () => {
    const texture = createSparkleTexture(128);
    assert.ok(texture instanceof THREE.CanvasTexture);
    assert.equal(texture.generateMipmaps, true);
    assert.equal(texture.magFilter, THREE.LinearFilter);
    assert.equal(texture.wrapS, THREE.ClampToEdgeWrapping);
    assert.equal(texture.wrapT, THREE.ClampToEdgeWrapping);
  });

  await t.test('isWebGLAvailable returns false safely in Node.js test environment', () => {
    // In Node.js environment without DOM WebGL context, should return false gracefully
    const available = isWebGLAvailable();
    assert.equal(typeof available, 'boolean');
    assert.equal(available, false);
  });
});
