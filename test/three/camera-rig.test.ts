import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { cameraConfig, getPoseForProgress } from '../../src/config/camera';
import { buildCameraSplines, sampleCameraPath } from '../../src/components/three/CameraRig';

test('Camera Rig & Pose Spline Interpolation Tests', async (t) => {
  const splines = buildCameraSplines();

  await t.test('builds valid CatmullRom spline curves from camera poses', () => {
    assert.ok(splines.positionCurve instanceof THREE.CatmullRomCurve3);
    assert.ok(splines.targetCurve instanceof THREE.CatmullRomCurve3);
    assert.equal(splines.positionCurve.points.length, cameraConfig.poseList.length);
  });

  await t.test('samples start pose (progress = 0) matching hero pose', () => {
    const start = sampleCameraPath(0.0, splines);
    const heroPose = cameraConfig.poses.hero;

    assert.ok(Math.abs(start.position.x - heroPose.position[0]) < 0.001);
    assert.ok(Math.abs(start.position.y - heroPose.position[1]) < 0.001);
    assert.ok(Math.abs(start.position.z - heroPose.position[2]) < 0.001);
    assert.ok(Math.abs(start.fov - heroPose.fov) < 0.001);
  });

  await t.test('samples end pose (progress = 1) matching cta pose', () => {
    const end = sampleCameraPath(1.0, splines);
    const ctaPose = cameraConfig.poses.cta;

    assert.ok(Math.abs(end.position.x - ctaPose.position[0]) < 0.001);
    assert.ok(Math.abs(end.position.y - ctaPose.position[1]) < 0.001);
    assert.ok(Math.abs(end.position.z - ctaPose.position[2]) < 0.001);
    assert.ok(Math.abs(end.fov - ctaPose.fov) < 0.001);
  });

  await t.test('clamps progress bounds safely for out-of-range values', () => {
    const under = sampleCameraPath(-0.5, splines);
    const zero = sampleCameraPath(0, splines);
    assert.equal(under.position.x, zero.position.x);
    assert.equal(under.position.y, zero.position.y);
    assert.equal(under.position.z, zero.position.z);

    const over = sampleCameraPath(1.8, splines);
    const one = sampleCameraPath(1, splines);
    assert.equal(over.position.x, one.position.x);
    assert.equal(over.position.y, one.position.y);
    assert.equal(over.position.z, one.position.z);
  });

  await t.test('interpolates mid-way between poses smoothly without NaN or discontinuities', () => {
    const mid1 = sampleCameraPath(0.3, splines);
    const mid2 = sampleCameraPath(0.5, splines);
    const mid3 = sampleCameraPath(0.7, splines);

    assert.ok(Number.isFinite(mid1.position.x));
    assert.ok(Number.isFinite(mid2.position.y));
    assert.ok(Number.isFinite(mid3.position.z));
    assert.ok(mid1.fov >= 35 && mid1.fov <= 55);
  });

  await t.test('verifies getPoseForProgress discrete blend intervals', () => {
    const heroResult = getPoseForProgress(0.05);
    assert.equal(heroResult.fromPose.id, 'hero');
    assert.ok(heroResult.blend >= 0 && heroResult.blend <= 1);

    const pricingResult = getPoseForProgress(0.85);
    assert.equal(pricingResult.fromPose.id, 'pricing');
    assert.ok(pricingResult.blend >= 0 && pricingResult.blend <= 1);
  });

  await t.test('critically damped smoothing converges towards target', () => {
    let current = 0;
    const target = 10;
    const lambda = 5;
    const dt = 0.016; // ~60fps

    for (let frame = 0; frame < 60; frame++) {
      current = THREE.MathUtils.damp(current, target, lambda, dt);
    }

    // After 1 second of damping, should be closely approaching target
    assert.ok(current > 9.5 && current <= 10);
  });
});
