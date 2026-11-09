import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  svgTo3D,
  createAiCordChevronCurve,
  createAiCordCrossbarCurve,
  createStarShape,
  createAiCordRibbonCurve,
  applyGradientVertexColors,
  BRANDMARK_SCALE,
  SVG_CENTER_X,
  SVG_CENTER_Y,
} from '../../src/components/three/BrandMark';

test('AiCord Official 3D BrandMark Geometry & Mathematical Invariants', async (t) => {
  await t.test('svgTo3D correctly normalizes 512x512 canvas coordinates to 3D space', () => {
    // Exact center should map to (0, 0, 0)
    const center = svgTo3D(SVG_CENTER_X, SVG_CENTER_Y, 0);
    assert.equal(center.x, 0);
    assert.equal(center.y, 0);
    assert.equal(center.z, 0);

    // Apex (256, 112) -> X=0, Y positive
    const apex = svgTo3D(256, 112, 0);
    assert.equal(apex.x, 0);
    assert.ok(apex.y > 1.0, 'Apex Y should be elevated above center');
    assert.equal(Number(apex.y.toFixed(4)), Number((140 * BRANDMARK_SCALE).toFixed(4)));

    // Bottom feet: Y should be negative and symmetric in X
    const leftFoot = svgTo3D(136, 392, 0);
    const rightFoot = svgTo3D(376, 392, 0);
    assert.equal(Number(leftFoot.x.toFixed(4)), Number((-120 * BRANDMARK_SCALE).toFixed(4)));
    assert.equal(Number(rightFoot.x.toFixed(4)), Number((120 * BRANDMARK_SCALE).toFixed(4)));
    assert.equal(Number(leftFoot.y.toFixed(4)), Number(rightFoot.y.toFixed(4)));
    assert.ok(leftFoot.y < -1.0, 'Foot Y should be below center');
  });

  await t.test('createAiCordChevronCurve generates continuous CatmullRom curve matching official chevron', () => {
    const curve = createAiCordChevronCurve();
    assert.ok(curve instanceof THREE.CatmullRomCurve3);
    assert.equal(curve.closed, false);

    // Sample start, peak, and end points
    const start = curve.getPoint(0);
    const mid = curve.getPoint(0.5);
    const end = curve.getPoint(1);

    // Left foot (start)
    assert.ok(start.x < -0.8);
    assert.ok(start.y < -1.0);

    // Apex (mid)
    assert.ok(Math.abs(mid.x) < 0.05, 'Midpoint should be near x=0');
    assert.ok(mid.y > 1.0, 'Midpoint should reach the top crest');

    // Right foot (end)
    assert.ok(end.x > 0.8);
    assert.ok(end.y < -1.0);
  });

  await t.test('createAiCordCrossbarCurve generates horizontal line curve matching official crossbar M196 316H316', () => {
    const bar = createAiCordCrossbarCurve();
    assert.ok(bar instanceof THREE.LineCurve3);

    const start = bar.getPoint(0);
    const end = bar.getPoint(1);

    // Bar is strictly horizontal
    assert.equal(Number(start.y.toFixed(4)), Number(end.y.toFixed(4)));
    // Left endpoint x < 0, Right endpoint x > 0
    assert.ok(start.x < 0);
    assert.ok(end.x > 0);
    assert.equal(Number(Math.abs(start.x).toFixed(4)), Number(end.x.toFixed(4)));
  });

  await t.test('createStarShape builds valid 4-point AI diamond star with 4 quadratic quadrants', () => {
    const radius = 0.5;
    const shape = createStarShape(radius);
    assert.ok(shape instanceof THREE.Shape);
    assert.equal(shape.curves.length, 4);

    // Points from curves
    const points = shape.getPoints(8);
    assert.ok(points.length > 0);

    // Max extent should not exceed radius
    for (const p of points) {
      assert.ok(Math.abs(p.x) <= radius + 0.001);
      assert.ok(Math.abs(p.y) <= radius + 0.001);
    }
  });

  await t.test('applyGradientVertexColors sets RGB vertex attribute correctly along Y-axis', () => {
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const startColor = new THREE.Color('#5865F2'); // Blurple
    const endColor = new THREE.Color('#22D3EE');   // Cyan

    applyGradientVertexColors(geo, startColor, endColor, -1.0, 1.0);

    const colorAttr = geo.getAttribute('color');
    assert.ok(colorAttr !== undefined);
    assert.equal(colorAttr.itemSize, 3);
    assert.ok(colorAttr.count > 0);

    // Verify colors are in valid normalized [0, 1] range
    for (let i = 0; i < colorAttr.count; i++) {
      const r = colorAttr.getX(i);
      const g = colorAttr.getY(i);
      const b = colorAttr.getZ(i);
      assert.ok(r >= 0 && r <= 1);
      assert.ok(g >= 0 && g <= 1);
      assert.ok(b >= 0 && b <= 1);
    }
  });

  await t.test('createAiCordRibbonCurve maintains backwards compatibility', () => {
    const ribbon = createAiCordRibbonCurve();
    assert.ok(ribbon instanceof THREE.CatmullRomCurve3);
  });
});
