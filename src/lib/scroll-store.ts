/**
 * src/lib/scroll-store.ts
 * Scroll state and WebGL motion coordination Zustand store.
 * Tracks global normalized scroll progress (0-1), scroll velocity, activeScene, and qualityTier.
 */

import { create } from 'zustand';

export type QualityTier = 'high' | 'medium' | 'low';

export interface ScrollStoreState {
  progress: number; // 0.0 - 1.0
  velocity: number;
  activeScene: string;
  sceneIndex: number;
  qualityTier: QualityTier;

  // Actions
  setProgress: (progress: number) => void;
  setVelocity: (velocity: number) => void;
  setActiveScene: (activeScene: string, sceneIndex?: number) => void;
  setQualityTier: (qualityTier: QualityTier) => void;
}

export const useScrollStore = create<ScrollStoreState>((set) => ({
  progress: 0,
  velocity: 0,
  activeScene: 'hero',
  sceneIndex: 0,
  qualityTier: 'high',

  setProgress: (progress: number) =>
    set({ progress: Math.max(0, Math.min(1, progress)) }),

  setVelocity: (velocity: number) => set({ velocity }),

  setActiveScene: (activeScene: string, sceneIndex?: number) =>
    set((state) => ({
      activeScene,
      sceneIndex: sceneIndex !== undefined ? sceneIndex : state.sceneIndex,
    })),

  setQualityTier: (qualityTier: QualityTier) => set({ qualityTier }),
}));
