'use client';

/**
 * src/components/three/SceneCanvas.tsx
 * Pure WebGL Canvas implementation using @react-three/fiber.
 * Configured with demand frameloop, ACESFilmic tone mapping, capped DPR per tier,
 * and robust WebGL context loss recovery.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useScrollStore } from '@/lib/scroll-store';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { isWebGLAvailable } from '@/lib/three-utils';
import { SceneController } from './SceneController';
import { CameraRig } from './CameraRig';
import { BrandMark } from './BrandMark';
import { Particles } from './Particles';
import { BlueprintNodes } from './BlueprintNodes';
import { Environment } from './Environment';
import { Effects } from './Effects';
import { PerformanceMonitorBridge } from './PerformanceMonitorBridge';
import { StaticHeroFallback } from './StaticHeroFallback';

export function SceneCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [isIntersecting, setIsIntersecting] = useState<boolean>(true);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);

  const tier = useScrollStore((state) => state.qualityTier);
  const setIsCanvasVisible = useScrollStore((state) => state.setIsCanvasVisible);
  const prefersReducedMotion = useReducedMotion();

  // WebGL availability check
  const webGLSupported = useMemo(() => isWebGLAvailable(), []);

  // DPR per tier: high: [1, 1.75], mid: 1, low: 1
  const dpr: [number, number] | number = useMemo(() => {
    if (tier === 'high') return [1, 1.75];
    return 1;
  }, [tier]);

  // Tab visibility tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      setIsCanvasVisible(visible && isIntersecting);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isIntersecting, setIsCanvasVisible]);

  // IntersectionObserver to pause rendering when offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = entry ? entry.isIntersecting : true;
        setIsIntersecting(visible);
        setIsCanvasVisible(visible && document.visibilityState === 'visible');
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [setIsCanvasVisible]);

  // If WebGL is unsupported, context is lost, or user prefers reduced motion:
  if (!webGLSupported || contextLost || prefersReducedMotion) {
    return <StaticHeroFallback />;
  }

  // Determine whether to actively render or pause frameloop
  const shouldRender = isIntersecting && isTabVisible;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      <Canvas
        frameloop={shouldRender ? 'demand' : 'never'}
        dpr={dpr}
        gl={{
          antialias: tier !== 'low',
          powerPreference: 'high-performance',
          alpha: true,
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 1.2, 5.0], fov: 45 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;

          // WebGL context loss listeners
          const canvasEl = gl.domElement;
          const handleContextLost = (event: Event) => {
            event.preventDefault();
            setContextLost(true);
          };
          const handleContextRestored = () => {
            setContextLost(false);
          };

          canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
          canvasEl.addEventListener('webglcontextrestored', handleContextRestored, false);
        }}
      >
        <SceneController />
        <CameraRig />
        <BrandMark />
        <Particles />
        <BlueprintNodes />
        <Environment />
        <Effects />
        <PerformanceMonitorBridge />
      </Canvas>
    </div>
  );
}

export default SceneCanvas;
