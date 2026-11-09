'use client';

/**
 * src/components/three/Environment.tsx
 * Studio lighting environment with in-memory Lightformer rigs.
 * Zero external HDR file downloads.
 * Dynamic key directional light and opposing rim light tinted to the active theme.
 */

import { useMemo } from 'react';
import { Environment as DreiEnvironment, Lightformer } from '@react-three/drei';
import { useThemeStore } from '@/lib/theme-store';
import { hexToThreeColor } from '@/lib/three-utils';

export function Environment() {
  const theme = useThemeStore((state) => state.theme);

  const primaryColor = useMemo(
    () => hexToThreeColor(theme?.primaryHex || '#00f0ff'),
    [theme?.primaryHex]
  );
  const accentColor = useMemo(
    () => hexToThreeColor(theme?.accentHex || '#ff007f'),
    [theme?.accentHex]
  );

  return (
    <>
      {/* ─── In-Memory Lightformer Environment Rig (Zero Network HDR) ─────── */}
      <DreiEnvironment resolution={256}>
        <group rotation={[-Math.PI / 4, -0.6, 0]}>
          {/* Top key glow lightformer */}
          <Lightformer
            form="ring"
            intensity={2.5}
            color={primaryColor}
            position={[0, 5, -2]}
            scale={[10, 5, 1]}
          />
          {/* Accent rim lightformer */}
          <Lightformer
            form="rect"
            intensity={3.0}
            color={accentColor}
            position={[-5, 2, -1]}
            scale={[8, 3, 1]}
            rotation-y={Math.PI / 2}
          />
          {/* Lateral fill lightformer */}
          <Lightformer
            form="circle"
            intensity={1.2}
            color="#ffffff"
            position={[5, 0, 2]}
            scale={4}
          />
        </group>
      </DreiEnvironment>

      {/* ─── Direct Scene Lights ────────────────────────────────────────────── */}
      <ambientLight intensity={0.35} />

      {/* 1. Key Directional Light */}
      <directionalLight
        position={[4, 6, 5]}
        intensity={1.8}
        color={primaryColor}
        castShadow={false}
      />

      {/* 2. Opposing High-Contrast Rim Light */}
      <directionalLight
        position={[-5, -3, -5]}
        intensity={2.2}
        color={accentColor}
        castShadow={false}
      />
    </>
  );
}

export default Environment;
