'use client';
/* eslint-disable react-hooks/immutability */

/**
 * src/components/three/CameraRig.tsx
 * CatmullRom spline-driven camera cinematic choreography.
 * Smoothly interpolates camera position, target, and FOV according to scroll progress.
 * Incorporates subtle pointer parallax (<= 3 degrees) and idle harmonic breathing.
 * Zero per-frame allocations for optimal 60/120 FPS performance.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cameraConfig, CameraPose } from '@/config/camera';
import { useScrollStore } from '@/lib/scroll-store';

// ─── Preallocated Math Objects (Zero Allocations in useFrame) ──────────────────
const _targetPos = new THREE.Vector3();
const _currentPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();
const _curvePoint = new THREE.Vector3();
const _targetCurvePoint = new THREE.Vector3();

export interface InterpolatedCameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

/**
 * Builds CatmullRom spline curves for positions and lookAt targets.
 */
export function buildCameraSplines(poses: CameraPose[] = cameraConfig.poseList) {
  const positionPoints = poses.map((p) => new THREE.Vector3(...p.position));
  const targetPoints = poses.map((p) => new THREE.Vector3(...p.target));

  const positionCurve = new THREE.CatmullRomCurve3(positionPoints, false, 'centripetal', 0.5);
  const targetCurve = new THREE.CatmullRomCurve3(targetPoints, false, 'centripetal', 0.5);

  return { positionCurve, targetCurve };
}

/**
 * Evaluates spline curves and blends FOV at a given progress (0.0 to 1.0).
 * Reusable and testable in headless / unit-test environments.
 */
export function sampleCameraPath(
  progress: number,
  curves: ReturnType<typeof buildCameraSplines>,
  poses: CameraPose[] = cameraConfig.poseList
): { position: THREE.Vector3; target: THREE.Vector3; fov: number } {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const pos = curves.positionCurve.getPointAt(t);
  const tgt = curves.targetCurve.getPointAt(t);

  // Interpolate FOV across poses based on progress
  const indexFloat = t * (poses.length - 1);
  const i = Math.floor(indexFloat);
  const nextI = Math.min(i + 1, poses.length - 1);
  const blend = indexFloat - i;
  const fov = poses[i].fov + (poses[nextI].fov - poses[i].fov) * blend;

  return { position: pos, target: tgt, fov };
}

export function CameraRig() {
  const { camera, invalidate } = useThree();
  const progress = useScrollStore((state) => state.progress);
  const pointer = useScrollStore((state) => state.pointer);

  const isInitialized = useRef<boolean>(false);
  const splines = useMemo(() => buildCameraSplines(), []);

  // Initialize camera position on mount
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = cameraConfig.defaultFov;
      camera.near = cameraConfig.nearPlane;
      camera.far = cameraConfig.farPlane;
      camera.updateProjectionMatrix();

      const initial = sampleCameraPath(progress, splines);
      _currentPos.copy(initial.position);
      _currentLookAt.copy(initial.target);
      camera.position.copy(_currentPos);
      camera.lookAt(_currentLookAt);
      isInitialized.current = true;
      invalidate();
    }
  }, [camera, progress, splines, invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const damping = 4.5; // critically damped responsiveness factor

    // 1. Spline evaluation from normalized scroll progress
    const t = Math.max(0, Math.min(1, progress));
    splines.positionCurve.getPointAt(t, _curvePoint);
    splines.targetCurve.getPointAt(t, _targetCurvePoint);

    // 2. Compute dynamic FOV
    const poses = cameraConfig.poseList;
    const indexFloat = t * (poses.length - 1);
    const i = Math.floor(indexFloat);
    const nextI = Math.min(i + 1, poses.length - 1);
    const blend = indexFloat - i;
    const targetFov = poses[i].fov + (poses[nextI].fov - poses[i].fov) * blend;

    // 3. Subtle pointer parallax (offset <= 3 degrees)
    const parallaxX = pointer.x * 0.35;
    const parallaxY = pointer.y * 0.22;

    // 4. Subtle idle harmonic breathing
    const elapsedTime = state.clock.getElapsedTime();
    const breathX = Math.sin(elapsedTime * 0.7) * 0.035;
    const breathY = Math.cos(elapsedTime * 0.5) * 0.045;

    // 5. Compute combined target position and lookAt
    _targetPos.set(
      _curvePoint.x + parallaxX + breathX,
      _curvePoint.y + parallaxY + breathY,
      _curvePoint.z
    );

    _targetLookAt.set(
      _targetCurvePoint.x + parallaxX * 0.3,
      _targetCurvePoint.y + parallaxY * 0.3,
      _targetCurvePoint.z
    );

    // 6. Critically damped interpolation
    _currentPos.x = THREE.MathUtils.damp(_currentPos.x, _targetPos.x, damping, dt);
    _currentPos.y = THREE.MathUtils.damp(_currentPos.y, _targetPos.y, damping, dt);
    _currentPos.z = THREE.MathUtils.damp(_currentPos.z, _targetPos.z, damping, dt);

    _currentLookAt.x = THREE.MathUtils.damp(_currentLookAt.x, _targetLookAt.x, damping, dt);
    _currentLookAt.y = THREE.MathUtils.damp(_currentLookAt.y, _targetLookAt.y, damping, dt);
    _currentLookAt.z = THREE.MathUtils.damp(_currentLookAt.z, _targetLookAt.z, damping, dt);

    // 7. Apply to Three.js camera
    camera.position.copy(_currentPos);
    camera.lookAt(_currentLookAt);

    if (camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, damping, dt);
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

export default CameraRig;
