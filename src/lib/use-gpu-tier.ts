'use client';

/**
 * src/lib/use-gpu-tier.ts
 * GPU tier detection heuristic and hysteresis-based performance stepping.
 *
 * Evaluates hardware concurrency, memory, WebGL unmasked renderer strings,
 * device pixel ratio, and mobile user agents to classify client into:
 * - 'high': Desktop workstation/gaming GPU, >= 8 cores, non-integrated or strong GPU.
 * - 'mid': Mainstream desktop or modern performant mobile device.
 * - 'low': Budget mobile, low core count (<= 4), software renderer (SwiftShader/llvmpipe), or battery-saver.
 */

import { useEffect } from 'react';
import { useScrollStore } from './scroll-store';

export type GpuTier = 'high' | 'mid' | 'low';

export interface GpuDetectionEnv {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  devicePixelRatio?: number;
  userAgent?: string;
  glRenderer?: string;
}

const SOFTWARE_RENDERER_PATTERNS = [
  /swiftshader/i,
  /llvmpipe/i,
  /software/i,
  /mesa/i,
  /microsoft basic render/i,
  /apple software/i,
  /google inc\. \(google\)/i,
];

const DISCRETE_GPU_PATTERNS = [
  /nvidia/i,
  /geforce/i,
  /rtx/i,
  /gtx/i,
  /quadro/i,
  /radeon rx/i,
  /radeon pro/i,
  /apple m[1-9] (pro|max|ultra)/i,
];

const MOBILE_PATTERNS = [
  /android/i,
  /iphone/i,
  /ipad/i,
  /ipod/i,
  /mobile/i,
];

/**
 * Inspects a WebGL rendering context for unmasked renderer string via WEBGL_debug_renderer_info.
 */
export function getWebGLRendererInfo(gl?: WebGLRenderingContext | WebGL2RenderingContext | null): string {
  if (!gl) return '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
    }
    return gl.getParameter(gl.RENDERER) || '';
  } catch {
    return '';
  }
}

/**
 * Pure heuristic function for detecting GPU tier from environmental signals.
 * Can be called in Node / SSR / unit tests by providing mock environment.
 */
export function detectGpuTier(customEnv?: GpuDetectionEnv): GpuTier {
  const env: GpuDetectionEnv = {
    hardwareConcurrency:
      customEnv?.hardwareConcurrency ??
      (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 8),
    deviceMemory:
      customEnv?.deviceMemory ??
      (typeof navigator !== 'undefined' && 'deviceMemory' in navigator
        ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
        : 8),
    devicePixelRatio:
      customEnv?.devicePixelRatio ??
      (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
    userAgent:
      customEnv?.userAgent ??
      (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    glRenderer: customEnv?.glRenderer ?? '',
  };

  // If no glRenderer was passed and we are in a browser, attempt extraction
  if (!env.glRenderer && typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (gl) {
        env.glRenderer = getWebGLRendererInfo(gl);
      }
    } catch {
      // ignore in environments without WebGL context support
    }
  }

  const renderer = env.glRenderer || '';
  const isSoftware = SOFTWARE_RENDERER_PATTERNS.some((p) => p.test(renderer));
  if (isSoftware) {
    return 'low';
  }

  const isMobile = MOBILE_PATTERNS.some((p) => p.test(env.userAgent || ''));
  const cores = env.hardwareConcurrency ?? 4;
  const memory = env.deviceMemory ?? 4;
  const isDiscreteGpu = DISCRETE_GPU_PATTERNS.some((p) => p.test(renderer));

  // Low Tier conditions
  if (cores <= 2 || memory < 3) {
    return 'low';
  }

  if (isMobile) {
    // High-end mobile: 8+ cores, >= 6GB RAM, capable GPU
    if (cores >= 8 && memory >= 6) {
      return 'mid';
    }
    return 'low';
  }

  // Desktop paths
  if (isDiscreteGpu && cores >= 6 && memory >= 8) {
    return 'high';
  }

  if (cores >= 8 && memory >= 8) {
    return 'high';
  }

  if (cores >= 4 && memory >= 4) {
    return 'mid';
  }

  return 'low';
}

/**
 * Hysteresis-based tier transition helper.
 * Prevents rapid oscillation between quality tiers during momentary frame drops.
 */
export function stepGpuTier(currentTier: GpuTier, direction: 'up' | 'down'): GpuTier {
  if (direction === 'down') {
    if (currentTier === 'high') return 'mid';
    return 'low';
  }
  if (direction === 'up') {
    if (currentTier === 'low') return 'mid';
    return 'high';
  }
  return currentTier;
}

/**
 * Hysteresis Tracker for PerformanceMonitor integrations.
 * Requires consecutive bad/good ticks before stepping quality tier.
 */
export class TierHysteresisTracker {
  private badStreak = 0;
  private goodStreak = 0;
  private currentTier: GpuTier;
  private readonly threshold: number;

  constructor(initialTier: GpuTier = 'high', threshold = 3) {
    this.currentTier = initialTier;
    this.threshold = threshold;
  }

  public getTier(): GpuTier {
    return this.currentTier;
  }

  public setTier(tier: GpuTier): void {
    this.currentTier = tier;
    this.badStreak = 0;
    this.goodStreak = 0;
  }

  public onIncline(): GpuTier {
    this.badStreak = 0;
    this.goodStreak++;
    if (this.goodStreak >= this.threshold) {
      this.currentTier = stepGpuTier(this.currentTier, 'up');
      this.goodStreak = 0;
    }
    return this.currentTier;
  }

  public onDecline(): GpuTier {
    this.goodStreak = 0;
    this.badStreak++;
    if (this.badStreak >= this.threshold) {
      this.currentTier = stepGpuTier(this.currentTier, 'down');
      this.badStreak = 0;
    }
    return this.currentTier;
  }
}

/**
 * React hook that detects the client's GPU tier on mount and synchronizes with useScrollStore.
 */
export function useGpuTier(): GpuTier {
  const storeTier = useScrollStore((state) => state.qualityTier);
  const setStoreTier = useScrollStore((state) => state.setQualityTier);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detected = detectGpuTier();
    setStoreTier(detected);
  }, [setStoreTier]);

  return storeTier === 'medium' ? 'mid' : (storeTier as GpuTier);
}

export default useGpuTier;
