/**
 * src/lib/scroll-store.ts
 * Scroll state and WebGL motion coordination Zustand store.
 * Tracks global normalized scroll progress (0-1), scroll velocity, activeScene (0 to 7),
 * qualityTier ('high' | 'mid' | 'low'), pointer coordinates, fps, and canvas visibility.
 */

import { create } from 'zustand';

export type QualityTier = 'high' | 'mid' | 'low' | 'medium';

export interface PointerCoordinates {
  x: number;
  y: number;
}

export interface ScrollStoreState {
  progress: number; // 0.0 - 1.0
  velocity: number;
  activeScene: string | number; // 0 to 7 or scene identifier key
  sceneIndex: number;
  qualityTier: QualityTier;
  pointer: PointerCoordinates; // normalized coordinates -1 to 1
  fps: number;
  isCanvasVisible: boolean;

  // Actions
  setProgress: (progress: number) => void;
  setVelocity: (velocity: number) => void;
  setActiveScene: (activeScene: string | number, sceneIndex?: number) => void;
  setQualityTier: (qualityTier: QualityTier) => void;
  setPointer: (
    pointer: PointerCoordinates | ((prev: PointerCoordinates) => PointerCoordinates)
  ) => void;
  setFps: (fps: number) => void;
  setIsCanvasVisible: (isCanvasVisible: boolean) => void;
}

export const useScrollStore = create<ScrollStoreState>((set) => ({
  progress: 0,
  velocity: 0,
  activeScene: 'hero',
  sceneIndex: 0,
  qualityTier: 'high',
  pointer: { x: 0, y: 0 },
  fps: 60,
  isCanvasVisible: true,

  setProgress: (progress: number) =>
    set({ progress: Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) }),

  setVelocity: (velocity: number) =>
    set({ velocity: Number.isFinite(velocity) ? velocity : 0 }),

  setActiveScene: (activeScene: string | number, sceneIndex?: number) =>
    set((state) => {
      if (typeof activeScene === 'number') {
        return {
          activeScene,
          sceneIndex: activeScene,
        };
      }
      return {
        activeScene,
        sceneIndex: sceneIndex !== undefined ? sceneIndex : state.sceneIndex,
      };
    }),

  setQualityTier: (qualityTier: QualityTier) => set({ qualityTier }),

  setPointer: (pointer) =>
    set((state) => ({
      pointer: typeof pointer === 'function' ? pointer(state.pointer) : pointer,
    })),

  setFps: (fps: number) =>
    set({ fps: Number.isFinite(fps) ? fps : 60 }),

  setIsCanvasVisible: (isCanvasVisible: boolean) =>
    set({ isCanvasVisible }),
}));
