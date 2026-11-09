'use client';

/**
 * src/components/three/Scene.tsx
 * Persistent WebGL 3D Canvas container with next/dynamic client-only rendering
 * and high-performance StaticHeroFallback Suspense integration.
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { StaticHeroFallback } from './StaticHeroFallback';

// Dynamically import WebGL Scene Canvas with SSR disabled to guarantee zero server-side leaks
const SceneCanvas = dynamic(
  () => import('./SceneCanvas').then((mod) => mod.SceneCanvas),
  {
    ssr: false,
    loading: () => <StaticHeroFallback />,
  }
);

export function Scene() {
  return (
    <Suspense fallback={<StaticHeroFallback />}>
      <SceneCanvas />
    </Suspense>
  );
}

export default Scene;
