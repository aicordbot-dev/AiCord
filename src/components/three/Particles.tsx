'use client';

/**
 * src/components/three/Particles.tsx
 * Luminous quantum particle constellation orbiting the BrandMark nexus.
 * Particle count scaled dynamically by GPU tier (high: 1200, mid: 500, low: 150).
 * Procedural 4-point sparkle texture with additive blending.
 * Scroll velocity elongation and orbital drift.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScrollStore } from '@/lib/scroll-store';
import { useThemeStore } from '@/lib/theme-store';
import { createSparkleTexture, hexToThreeColor } from '@/lib/three-utils';

interface OrbitalData {
  angles: Float32Array;
  radii: Float32Array;
  speeds: Float32Array;
  baseHeights: Float32Array;
}

// Pseudo-random deterministic generator to satisfy React compiler purity
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999.123) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Generates orbital particle coordinates outside React render body.
 */
function createConstellationData(count: number): {
  geometry: THREE.BufferGeometry;
  orbitalData: OrbitalData;
} {
  const positions = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const speeds = new Float32Array(count);
  const baseHeights = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const angle = pseudoRandom(i * 4 + 1) * Math.PI * 2;
    const radius = 1.2 + pseudoRandom(i * 4 + 2) * 4.5;
    const height = (pseudoRandom(i * 4 + 3) - 0.5) * 4.0;
    const speed = (0.2 + pseudoRandom(i * 4 + 4) * 0.4) * (i % 2 === 0 ? 1 : -1);

    angles[i] = angle;
    radii[i] = radius;
    speeds[i] = speed;
    baseHeights[i] = height;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return {
    geometry,
    orbitalData: { angles, radii, speeds, baseHeights },
  };
}

export function Particles() {
  const pointsRef = useRef<THREE.Points>(null);
  const orbitalDataRef = useRef<OrbitalData>({
    angles: new Float32Array(0),
    radii: new Float32Array(0),
    speeds: new Float32Array(0),
    baseHeights: new Float32Array(0),
  });

  const tier = useScrollStore((state) => state.qualityTier);
  const theme = useThemeStore((state) => state.theme);

  // Scaled particle counts
  const count = useMemo(() => {
    if (tier === 'low') return 150;
    if (tier === 'mid' || tier === 'medium') return 500;
    return 1200; // 'high' <= 1500
  }, [tier]);

  // Procedural sparkle texture
  const texture = useMemo(() => createSparkleTexture(64), []);

  const particleColor = useMemo(
    () => hexToThreeColor(theme?.primaryHex || '#00f0ff'),
    [theme?.primaryHex]
  );

  // Pre-generate orbital distribution & geometry
  const { geometry, orbitalData } = useMemo(() => createConstellationData(count), [count]);

  useEffect(() => {
    orbitalDataRef.current = orbitalData;
    return () => {
      geometry.dispose();
      texture.dispose();
    };
  }, [geometry, texture, orbitalData]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const dt = Math.min(delta, 0.1);
    const time = state.clock.getElapsedTime();
    const velocity = useScrollStore.getState().velocity;
    const velocityStretch = Math.min(Math.abs(velocity) * 0.05, 1.0);

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const { angles, radii, speeds, baseHeights } = orbitalDataRef.current;

    for (let i = 0; i < count; i++) {
      angles[i] += speeds[i] * dt * 0.6;
      const r = radii[i];
      const h = baseHeights[i];

      const x = Math.cos(angles[i]) * r;
      const z = Math.sin(angles[i]) * r;
      // Drift vertically and react to scroll velocity
      const y = h + Math.sin(time * 0.8 + r) * 0.25 - velocity * 0.02 * (1 + velocityStretch);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Constellation rotation
    pointsRef.current.rotation.y = time * 0.04;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={tier === 'low' ? 0.18 : 0.24}
        map={texture}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        color={particleColor}
        sizeAttenuation={true}
        opacity={tier === 'low' ? 0.6 : 0.85}
      />
    </points>
  );
}

export default Particles;
