'use client';

/**
 * src/components/three/BrandMark.tsx
 * Holographic 3D Insignia for AiCord.
 * Procedural TubeGeometry representing the neural core ribbon with smooth caps.
 * MeshPhysicalMaterial with chromatic fresnel glow dynamically tinted by useThemeStore.
 * Initial 1.2s drawRange assembly animation + reactive pointer tilt + harmonic idle floating.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThemeStore } from '@/lib/theme-store';
import { useScrollStore } from '@/lib/scroll-store';
import { hexToThreeColor } from '@/lib/three-utils';

// Preallocated math structures
const _targetEuler = new THREE.Euler();
const _targetQuat = new THREE.Quaternion();

/**
 * Procedurally generates the 3D ribbon curve points for the AiCord insignia.
 */
export function createAiCordRibbonCurve(): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const segments = 64;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    // 3D Lissajous ribbon knot
    const x = Math.sin(t) * 1.4;
    const y = Math.sin(t * 2) * 0.75;
    const z = Math.cos(t) * 0.65;
    points.push(new THREE.Vector3(x, y, z));
  }

  return new THREE.CatmullRomCurve3(points, true, 'centripetal');
}

export function BrandMark() {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  const theme = useThemeStore((state) => state.theme);
  const pointer = useScrollStore((state) => state.pointer);

  const primaryColor = useMemo(
    () => hexToThreeColor(theme?.primaryHex || '#00f0ff'),
    [theme?.primaryHex]
  );
  const accentColor = useMemo(
    () => hexToThreeColor(theme?.accentHex || '#ff007f'),
    [theme?.accentHex]
  );

  // Generate procedural tube geometry
  const { geometry, totalVertexCount } = useMemo(() => {
    const curve = createAiCordRibbonCurve();
    const tube = new THREE.TubeGeometry(curve, 180, 0.11, 16, true);
    const count = tube.index ? tube.index.count : tube.attributes.position.count;
    return { geometry: tube, totalVertexCount: count };
  }, []);

  // Enter assembly animation tracking
  const assemblyProgress = useRef<number>(0);
  const enterDuration = 1.2; // seconds

  useEffect(() => {
    assemblyProgress.current = 0;
    if (geometry) {
      geometry.setDrawRange(0, 0);
    }
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Frame update
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const time = state.clock.getElapsedTime();

    // 1. Initial Assembly drawRange entrance (0 to totalVertexCount over 1.2s)
    if (assemblyProgress.current < 1.0) {
      assemblyProgress.current = Math.min(1.0, assemblyProgress.current + dt / enterDuration);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - assemblyProgress.current, 3);
      const drawCount = Math.floor(ease * totalVertexCount);
      geometry.setDrawRange(0, drawCount);
    }

    if (groupRef.current) {
      // 2. Gentle harmonic idle floating
      const floatY = Math.sin(time * 1.1) * 0.08;
      const idleRotY = time * 0.25;
      const idleRotZ = Math.cos(time * 0.7) * 0.05;

      // 3. Reactive pointer tilt (damped)
      const tiltX = -pointer.y * 0.3;
      const tiltY = pointer.x * 0.4;

      _targetEuler.set(tiltX, idleRotY + tiltY, idleRotZ);
      _targetQuat.setFromEuler(_targetEuler);

      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, floatY, 4, dt);
      groupRef.current.quaternion.slerp(_targetQuat, Math.min(1, dt * 6));
    }

    // 4. Counter-rotating central crystal core
    if (coreRef.current) {
      coreRef.current.rotation.x = -time * 0.4;
      coreRef.current.rotation.y = time * 0.6;
    }

    // 5. Orbital holographic ring
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = time * 0.3;
      innerRingRef.current.rotation.x = Math.sin(time * 0.5) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* ─── Main Neural Ribbon Mesh ────────────────────────────────────────── */}
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={primaryColor}
          emissive={accentColor}
          emissiveIntensity={0.65}
          roughness={0.15}
          metalness={0.85}
          transmission={0.3}
          thickness={0.5}
          ior={1.45}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </mesh>

      {/* ─── Central Floating Quantum Monolith ──────────────────────────────── */}
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <octahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={1.4}
          roughness={0.1}
          metalness={0.9}
          wireframe={false}
        />
      </mesh>

      {/* ─── Holographic Orbital Ring ───────────────────────────────────────── */}
      <mesh ref={innerRingRef} position={[0, 0, 0]}>
        <torusGeometry args={[1.75, 0.02, 16, 100]} />
        <meshBasicMaterial
          color={primaryColor}
          wireframe={true}
          transparent={true}
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

export default BrandMark;
