/**
 * src/lib/blueprint-scene-store.ts
 * Coordinates 3D WebGL blueprint nodes with the interactive PromptDemo section.
 */

import { create } from 'zustand';
import { BlueprintId } from '@/config/blueprints';

export type ReviewTab = 'structure' | 'security' | 'hierarchy';

export interface BlueprintSceneState {
  activeTab: ReviewTab;
  activeBlueprintId: BlueprintId;
  isRollbackActive: boolean;
  isDeploying: boolean;
  deployProgress: number; // 0 - 100

  // Actions
  setActiveTab: (tab: ReviewTab) => void;
  setActiveBlueprintId: (id: BlueprintId) => void;
  setRollbackActive: (active: boolean) => void;
  setDeploying: (deploying: boolean) => void;
  setDeployProgress: (progress: number) => void;
  reset: () => void;
}

export const useBlueprintSceneStore = create<BlueprintSceneState>((set) => ({
  activeTab: 'structure',
  activeBlueprintId: 'gaming-esports',
  isRollbackActive: false,
  isDeploying: false,
  deployProgress: 70,

  setActiveTab: (tab: ReviewTab) => set({ activeTab: tab }),
  setActiveBlueprintId: (id: BlueprintId) => set({ activeBlueprintId: id }),
  setRollbackActive: (active: boolean) => set({ isRollbackActive: active }),
  setDeploying: (deploying: boolean) => set({ isDeploying: deploying }),
  setDeployProgress: (progress: number) => set({ deployProgress: progress }),
  reset: () =>
    set({
      activeTab: 'structure',
      isRollbackActive: false,
      isDeploying: false,
      deployProgress: 0,
    }),
}));
