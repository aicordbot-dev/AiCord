'use client';

/**
 * src/components/three/BrandMark.tsx
 * Holographic 3D Insignia for AiCord.
 * Procedural TubeGeometry matching the official vector paths:
 *   - Chevron: M136 392L256 112L376 392 (stroke-width 44, rounded caps & apex)
 *   - Crossbar: M196 316H316 (stroke-width 34, rounded caps)
 *   - AI Star 1: 4-point diamond star gem centered around (384, 132)
 *   - AI Star 2: 4-point sparkle star gem centered around (422, 198)
 * MeshPhysicalMaterial with dynamic theme-reactive colors (primary & accent).
 * Animated drawRange assembly on initial load + reactive pointer tilt + idle float.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThemeStore } from '@/lib/theme-store';
import { useScrollStore } from '@/lib/scroll-store';
import { hexToThreeColor } from '@/lib/three-utils';

// Preallocated math structures for zero garbage collection
const _targetEuler = new THREE.Euler();
const _targetQuat = new THREE.Quaternion();

// Normalization constants (512x512 canvas centered at 256, 252)
export const SVG_CANVAS_SIZE = 512;
export const SVG_CENTER_X = 256;
export const SVG_CENTER_Y = 252;
export const BRANDMARK_SCALE = 0.0078;

export function svgTo3D(svgX: number, svgY: number, z = 0): THREE.Vector3 {
  const x = (svgX - SVG_CENTER_X) * BRANDMARK_SCALE || 0;
  const y = (-(svgY - SVG_CENTER_Y) * BRANDMARK_SCALE) || 0;
  return new THREE.Vector3(x, y, z);
}

/**
 * Procedurally generates the 3D Chevron curve matching M136 392L256 112L376 392
 * with smooth apex filleting.
 */
export function createAiCordChevronCurve(): THREE.CatmullRomCurve3 {
  const p0 = svgTo3D(136, 392);
  const p1 = svgTo3D(196, 252);
  const p2 = svgTo3D(244, 140);
  const p3 = svgTo3D(256, 112); // Apex
  const p4 = svgTo3D(268, 140);
  const p5 = svgTo3D(316, 252);
  const p6 = svgTo3D(376, 392);

  return new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4, p5, p6], false, 'centripetal');
}

/**
 * Generates the 3D Crossbar line curve matching M196 316H316
 */
export function createAiCordCrossbarCurve(): THREE.LineCurve3 {
  const pLeft = svgTo3D(196, 316);
  const pRight = svgTo3D(316, 316);
  return new THREE.LineCurve3(pLeft, pRight);
}

/**
 * Builds the 4-point AI Star shape matching the official quadratic bezier path:
 * M x, y-r Q x,y x+r,y Q x,y x,y+r Q x,y x-r,y Q x,y x,y-r Z
 */
export function createStarShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, radius);
  shape.quadraticCurveTo(0, 0, radius, 0);
  shape.quadraticCurveTo(0, 0, 0, -radius);
  shape.quadraticCurveTo(0, 0, -radius, 0);
  shape.quadraticCurveTo(0, 0, 0, radius);
  return shape;
}

/**
 * Legacy ribbon curve retained for backwards compatibility with existing utilities/tests.
 */
export function createAiCordRibbonCurve(): THREE.CatmullRomCurve3 {
  return createAiCordChevronCurve();
}

/**
 * Helper to apply height-based linear vertex color gradients along 3D geometries.
 */
export function applyGradientVertexColors(
  geometry: THREE.BufferGeometry,
  startColor: THREE.Color,
  endColor: THREE.Color,
  minY = -1.1,
  maxY = 1.1
) {
  const positions = geometry.attributes.position;
  if (!positions) return;
  const count = positions.count;
  const colors = new Float32Array(count * 3);
  const range = maxY - minY || 1;

  for (let i = 0; i < count; i++) {
    const y = positions.getY(i);
    const t = Math.max(0, Math.min(1, (y - minY) / range));
    colors[i * 3] = THREE.MathUtils.lerp(startColor.r, endColor.r, t);
    colors[i * 3 + 1] = THREE.MathUtils.lerp(startColor.g, endColor.g, t);
    colors[i * 3 + 2] = THREE.MathUtils.lerp(startColor.b, endColor.b, t);
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function BrandMark() {
  const groupRef = useRef<THREE.Group>(null);
  const chevronMeshRef = useRef<THREE.Mesh>(null);
  const crossbarMeshRef = useRef<THREE.Mesh>(null);
  const star1Ref = useRef<THREE.Mesh>(null);
  const star2Ref = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const theme = useThemeStore((state) => state.theme);
  const pointer = useScrollStore((state) => state.pointer);

  const primaryColor = useMemo(
    () => hexToThreeColor(theme?.primaryHex || '#5865F2'),
    [theme?.primaryHex]
  );
  const accentColor = useMemo(
    () => hexToThreeColor(theme?.accentHex || '#22D3EE'),
    [theme?.accentHex]
  );

  // Chevron: stroke width 44 -> radius 22 * SCALE
  const chevronRadius = 22 * BRANDMARK_SCALE;
  // Crossbar: stroke width 34 -> radius 17 * SCALE
  const crossbarRadius = 17 * BRANDMARK_SCALE;

  // Star 1 (large): center (384, 132), radius 34 * SCALE
  const star1Radius = 34 * BRANDMARK_SCALE;
  const star1Pos = useMemo(() => svgTo3D(384, 132, 0.16), []);

  // Star 2 (small): center (422, 198), radius 14 * SCALE
  const star2Radius = 14 * BRANDMARK_SCALE;
  const star2Pos = useMemo(() => svgTo3D(422, 198, 0.28), []);

  // End cap positions
  const capLeftPos = useMemo(() => svgTo3D(136, 392), []);
  const capRightPos = useMemo(() => svgTo3D(376, 392), []);
  const barLeftPos = useMemo(() => svgTo3D(196, 316), []);
  const barRightPos = useMemo(() => svgTo3D(316, 316), []);

  // Geometries memoization
  const {
    chevronGeo,
    chevronCount,
    crossbarGeo,
    crossbarCount,
    star1Geo,
    star2Geo,
    capGeo,
    barCapGeo,
  } = useMemo(() => {
    // 1. Chevron Tube
    const chevronCurve = createAiCordChevronCurve();
    const cGeo = new THREE.TubeGeometry(chevronCurve, 120, chevronRadius, 16, false);
    applyGradientVertexColors(cGeo, primaryColor, accentColor, -1.1, 1.1);
    const cCount = cGeo.index ? cGeo.index.count : cGeo.attributes.position.count;

    // 2. Crossbar Tube
    const crossCurve = createAiCordCrossbarCurve();
    const bGeo = new THREE.TubeGeometry(crossCurve, 40, crossbarRadius, 16, false);
    applyGradientVertexColors(bGeo, primaryColor, accentColor, -0.6, -0.4);
    const bCount = bGeo.index ? bGeo.index.count : bGeo.attributes.position.count;

    // 3. Star 1 Gem (Extruded 4-point diamond)
    const s1Shape = createStarShape(star1Radius);
    const s1Geo = new THREE.ExtrudeGeometry(s1Shape, {
      depth: star1Radius * 0.35,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: star1Radius * 0.12,
      bevelThickness: star1Radius * 0.15,
    });
    s1Geo.center();

    // 4. Star 2 Gem
    const s2Shape = createStarShape(star2Radius);
    const s2Geo = new THREE.ExtrudeGeometry(s2Shape, {
      depth: star2Radius * 0.35,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: star2Radius * 0.12,
      bevelThickness: star2Radius * 0.15,
    });
    s2Geo.center();

    // 5. Rounded End Caps (Spheres)
    const cCap = new THREE.SphereGeometry(chevronRadius, 16, 16);
    const bCap = new THREE.SphereGeometry(crossbarRadius, 16, 16);

    return {
      chevronGeo: cGeo,
      chevronCount: cCount,
      crossbarGeo: bGeo,
      crossbarCount: bCount,
      star1Geo: s1Geo,
      star2Geo: s2Geo,
      capGeo: cCap,
      barCapGeo: bCap,
    };
  }, [chevronRadius, crossbarRadius, star1Radius, star2Radius, primaryColor, accentColor]);

  // Initial Assembly drawRange tracking
  const assemblyProgress = useRef<number>(0);
  const enterDuration = 1.2; // seconds

  useEffect(() => {
    assemblyProgress.current = 0;
    chevronGeo.setDrawRange(0, 0);
    crossbarGeo.setDrawRange(0, 0);

    return () => {
      chevronGeo.dispose();
      crossbarGeo.dispose();
      star1Geo.dispose();
      star2Geo.dispose();
      capGeo.dispose();
      barCapGeo.dispose();
    };
  }, [chevronGeo, crossbarGeo, star1Geo, star2Geo, capGeo, barCapGeo]);

  // Frame update
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const time = state.clock.getElapsedTime();

    // 1. Progressive Assembly Animation
    if (assemblyProgress.current < 1.0) {
      assemblyProgress.current = Math.min(1.0, assemblyProgress.current + dt / enterDuration);
      const p = assemblyProgress.current;

      // Chevron draws over 0.0 -> 0.75
      const chevronT = Math.min(1.0, p / 0.75);
      const chevronEase = 1 - Math.pow(1 - chevronT, 3);
      chevronGeo.setDrawRange(0, Math.floor(chevronEase * chevronCount));

      // Crossbar draws over 0.35 -> 1.0
      const crossbarT = Math.max(0, Math.min(1.0, (p - 0.35) / 0.65));
      const crossbarEase = 1 - Math.pow(1 - crossbarT, 3);
      crossbarGeo.setDrawRange(0, Math.floor(crossbarEase * crossbarCount));
    }

    // Star pop-in entrance scale factor (0.5 -> 1.0)
    const starEntranceProgress = Math.max(0, Math.min(1.0, (assemblyProgress.current - 0.5) / 0.5));
    const starEntranceScale =
      starEntranceProgress >= 1
        ? 1
        : 1 - Math.pow(1 - starEntranceProgress, 3);

    // 2. Interactive Pointer Tilt & Idle Floating
    if (groupRef.current) {
      const floatY = Math.sin(time * 1.1) * 0.08;
      const idleRotY = time * 0.18;
      const idleRotZ = Math.cos(time * 0.7) * 0.04;

      const tiltX = -pointer.y * 0.28;
      const tiltY = pointer.x * 0.38;

      _targetEuler.set(tiltX, idleRotY + tiltY, idleRotZ);
      _targetQuat.setFromEuler(_targetEuler);

      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        floatY,
        4,
        dt
      );
      groupRef.current.quaternion.slerp(_targetQuat, Math.min(1, dt * 6));
    }

    // 3. AI Star 1 Floating, Twinkle & Pulsing
    if (star1Ref.current) {
      const pulse = 1 + Math.sin(time * 2.8) * 0.08;
      const s = pulse * starEntranceScale;
      star1Ref.current.scale.set(s, s, s);
      star1Ref.current.rotation.z = Math.sin(time * 1.4) * 0.14;
      star1Ref.current.position.z = star1Pos.z + Math.sin(time * 2.2) * 0.04;
    }

    // 4. AI Star 2 Floating, Twinkle & Pulsing
    if (star2Ref.current) {
      const pulse = 1 + Math.cos(time * 3.4) * 0.12;
      const s = pulse * starEntranceScale;
      star2Ref.current.scale.set(s, s, s);
      star2Ref.current.rotation.z = -Math.cos(time * 1.8) * 0.2;
      star2Ref.current.position.z = star2Pos.z + Math.cos(time * 2.6) * 0.05;
    }

    // 5. Holographic Ambient Halo
    if (haloRef.current) {
      haloRef.current.rotation.z = time * 0.2;
      haloRef.current.rotation.x = Math.sin(time * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* ─── Chevron "A" Tube Mesh ────────────────────────────────────────── */}
      <mesh ref={chevronMeshRef} geometry={chevronGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          vertexColors={true}
          color={primaryColor}
          emissive={accentColor}
          emissiveIntensity={0.65}
          roughness={0.16}
          metalness={0.88}
          transmission={0.25}
          thickness={0.5}
          ior={1.45}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </mesh>

      {/* ─── Crossbar Tube Mesh ───────────────────────────────────────────── */}
      <mesh ref={crossbarMeshRef} geometry={crossbarGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          vertexColors={true}
          color={primaryColor}
          emissive={accentColor}
          emissiveIntensity={0.65}
          roughness={0.16}
          metalness={0.88}
          transmission={0.25}
          thickness={0.5}
          ior={1.45}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </mesh>

      {/* ─── Smooth Rounded End Caps ──────────────────────────────────────── */}
      <mesh position={capLeftPos} geometry={capGeo}>
        <meshPhysicalMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={0.5}
          roughness={0.16}
          metalness={0.88}
          clearcoat={1.0}
        />
      </mesh>
      <mesh position={capRightPos} geometry={capGeo}>
        <meshPhysicalMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.65}
          roughness={0.16}
          metalness={0.88}
          clearcoat={1.0}
        />
      </mesh>
      <mesh position={barLeftPos} geometry={barCapGeo}>
        <meshPhysicalMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={0.5}
          roughness={0.16}
          metalness={0.88}
          clearcoat={1.0}
        />
      </mesh>
      <mesh position={barRightPos} geometry={barCapGeo}>
        <meshPhysicalMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.65}
          roughness={0.16}
          metalness={0.88}
          clearcoat={1.0}
        />
      </mesh>

      {/* ─── 4-Point AI Star 1 (Brilliant White Diamond Gem) ───────────────── */}
      <mesh ref={star1Ref} position={star1Pos} geometry={star1Geo} castShadow>
        <meshPhysicalMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={1.2}
          roughness={0.08}
          metalness={0.92}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          reflectivity={1.0}
        />
      </mesh>

      {/* ─── 4-Point AI Star 2 (Cyan Sparkle Gem) ─────────────────────────── */}
      <mesh ref={star2Ref} position={star2Pos} geometry={star2Geo} castShadow>
        <meshPhysicalMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={1.4}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
          reflectivity={0.95}
        />
      </mesh>

      {/* ─── Holographic Orbital Halo ─────────────────────────────────────── */}
      <mesh ref={haloRef} position={[0, 0, -0.05]}>
        <torusGeometry args={[1.65, 0.015, 16, 100]} />
        <meshBasicMaterial
          color={accentColor}
          wireframe={true}
          transparent={true}
          opacity={0.32}
        />
      </mesh>
    </group>
  );
}

export default BrandMark;
