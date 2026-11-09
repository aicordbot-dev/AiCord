/**
 * src/lib/progress-meter.ts
 * 4-Phase Progress Meter Engine & ASCII Bar Formatter for AiCord.
 * Follows Section 6 (Service 1) and Phase D requirements.
 */

import { BarStyle, BAR_STYLES } from '@/config/themes';

export type BuildPhaseId = 'intent' | 'permissions' | 'layout' | 'services';

export type BuildPhaseStatus = 'pending' | 'in_progress' | 'done';

export interface BuildPhase {
  id: BuildPhaseId;
  name: string;
  shortName: string;
  description: string;
  status: BuildPhaseStatus;
  progressPercent: number; // 0 - 100
}

export const INITIAL_BUILD_PHASES: BuildPhase[] = [
  {
    id: 'intent',
    name: 'Intent Analysis & Blueprint Synthesis',
    shortName: 'Intent Analysis',
    description: 'Deconstructing natural language prompt and synthesizing channel topology.',
    status: 'done',
    progressPercent: 100,
  },
  {
    id: 'permissions',
    name: 'Permission Audit & Security Matrix',
    shortName: 'Permission Audit',
    description: 'Isolating @everyone permissions, securing admin overrides, and verifying automod.',
    status: 'done',
    progressPercent: 100,
  },
  {
    id: 'layout',
    name: 'Channel Layout & Category Hierarchy',
    shortName: 'Channel Layout',
    description: 'Constructing categories, forum tags, voice pods, and announcement webhooks.',
    status: 'done',
    progressPercent: 100,
  },
  {
    id: 'services',
    name: 'Enterprise Services & Bot Orchestration',
    shortName: 'Enterprise Services',
    description: 'Configuring tickets, level progression, economy, and automod defense.',
    status: 'in_progress',
    progressPercent: 70,
  },
];

/**
 * Calculates overall progress across the 4 phases equally weighted (25% each).
 */
export function calculateOverallProgress(phases: BuildPhase[]): number {
  if (!phases || phases.length === 0) return 0;
  const total = phases.reduce((acc, phase) => {
    const p = Math.max(0, Math.min(100, Number.isFinite(phase.progressPercent) ? phase.progressPercent : 0));
    return acc + p;
  }, 0);
  return Math.round(total / phases.length);
}

/**
 * Calculates phase status given a current phase index (0 to 3) and progress (0 to 100).
 */
export function getPhasesForStep(
  activePhaseIndex: number,
  activePhasePercent = 70
): BuildPhase[] {
  return INITIAL_BUILD_PHASES.map((phase, idx) => {
    if (idx < activePhaseIndex) {
      return {
        ...phase,
        status: 'done' as BuildPhaseStatus,
        progressPercent: 100,
      };
    }
    if (idx === activePhaseIndex) {
      return {
        ...phase,
        status: (activePhasePercent >= 100 ? 'done' : 'in_progress') as BuildPhaseStatus,
        progressPercent: Math.max(0, Math.min(100, activePhasePercent)),
      };
    }
    return {
      ...phase,
      status: 'pending' as BuildPhaseStatus,
      progressPercent: 0,
    };
  });
}

/**
 * Renders the ASCII progress bar for all 4 styles: 'pipes', 'blocks', 'squares', 'retro'.
 * Clamps input safely between 0% and 100%, and lengths between 4 and 50 characters.
 */
export function renderAsciiBar(
  percent: number,
  style: BarStyle = 'pipes',
  length = 10
): string {
  const safePercent = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, Math.round(percent)))
    : 0;
  const safeLength = Math.max(4, Math.min(50, length));
  const charSet = BAR_STYLES[style] || BAR_STYLES.pipes;

  const filledCount = Math.round((safePercent / 100) * safeLength);
  const emptyCount = safeLength - filledCount;

  const filledPart = charSet.filled.repeat(filledCount);
  const emptyPart = charSet.empty.repeat(emptyCount);

  return `[${filledPart}${emptyPart}] ${safePercent}%`;
}
