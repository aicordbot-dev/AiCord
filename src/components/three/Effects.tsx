'use client';

/**
 * src/components/three/Effects.tsx
 * Cinema-grade post-processing pipeline.
 * Strictly active on 'high' GPU tier; bypassed on 'mid' and 'low' for maximum performance.
 * Features Bloom with mipmapBlur, subtle film vignette & noise,
 * and ChromaticAberration activated exclusively during the 'cyberpunk' theme.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useScrollStore } from '@/lib/scroll-store';
import { useThemeStore } from '@/lib/theme-store';

export function Effects() {
  const qualityTier = useScrollStore((state) => state.qualityTier);
  const themeId = useThemeStore((state) => state.themeId);

  const chromaticOffset = useMemo(() => new THREE.Vector2(0.002, 0.002), []);

  // Postprocessing enabled STRICTLY on 'high' tier
  if (qualityTier !== 'high') {
    return null;
  }

  const isCyberpunk = themeId === 'cyberpunk';

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      {/* 1. Mipmap Blur Bloom for neon luminescence */}
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.15}
        intensity={1.15}
        mipmapBlur={true}
      />

      {/* 2. Cinema Edge Vignette */}
      <Vignette eskil={false} offset={0.25} darkness={0.65} />

      {/* 3. Subtle Atmospheric Film Grain */}
      <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />

      {/* 4. Chromatic Aberration - Cyberpunk Theme Exclusivity */}
      {isCyberpunk && (
        <ChromaticAberration
          offset={chromaticOffset}
          radialModulation={false}
          modulationOffset={0.15}
        />
      )}
    </EffectComposer>
  );
}

export default Effects;
