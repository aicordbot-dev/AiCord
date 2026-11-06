/**
 * src/lib/levels/level-math.ts
 * Mathematical calculations and formulas for AiCord XP progression.
 *
 * Quadratic Formula:
 * Required XP to advance from Level N to Level N + 1:
 *   XP(N) = 5 * (N^2) + 50 * N + 100
 *
 * Example progression:
 * - Level 0 -> 1: 100 XP (Total 100)
 * - Level 1 -> 2: 155 XP (Total 255)
 * - Level 2 -> 3: 220 XP (Total 475)
 * - Level 3 -> 4: 295 XP (Total 770)
 * - Level 4 -> 5: 380 XP (Total 1150)
 */

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  nextLevelXp: number;
  progressPercent: number;
  totalXp: number;
}

/**
 * Returns the XP required to advance from the given level to the next (level -> level + 1).
 */
export function getXpForLevel(level: number): number {
  if (level < 0 || !Number.isFinite(level)) return 0;
  const n = Math.floor(level);
  return 5 * (n * n) + 50 * n + 100;
}

/**
 * Returns the cumulative total XP required to reach a specific level starting from 0.
 */
export function getTotalXpForLevel(level: number): number {
  if (level <= 0 || !Number.isFinite(level)) return 0;
  const target = Math.floor(level);
  let total = 0;
  for (let i = 0; i < target; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

/**
 * Computes current level, XP into current level, XP required for next level,
 * and progress percentage (0-100) given cumulative total XP.
 */
export function getLevelFromXp(totalXp: number): LevelProgress {
  if (totalXp <= 0 || !Number.isFinite(totalXp)) {
    const nextReq = getXpForLevel(0);
    return {
      level: 0,
      xpIntoLevel: 0,
      currentLevelXp: 0,
      xpForNextLevel: nextReq,
      nextLevelXp: nextReq,
      progressPercent: 0,
      totalXp: 0,
    };
  }

  const safeTotal = Math.floor(totalXp);
  let currentLevel = 0;
  let cumulativeXp = 0;

  while (true) {
    const xpNeededForNext = getXpForLevel(currentLevel);
    if (cumulativeXp + xpNeededForNext > safeTotal) {
      break;
    }
    cumulativeXp += xpNeededForNext;
    currentLevel++;
  }

  const xpIntoLevel = safeTotal - cumulativeXp;
  const xpForNextLevel = getXpForLevel(currentLevel);
  const rawPercent = (xpIntoLevel / xpForNextLevel) * 100;
  const progressPercent = Math.min(100, Math.max(0, Math.floor(rawPercent)));

  return {
    level: currentLevel,
    xpIntoLevel,
    currentLevelXp: xpIntoLevel,
    xpForNextLevel,
    nextLevelXp: xpForNextLevel,
    progressPercent,
    totalXp: safeTotal,
  };
}

/**
 * Generates a clean visual progress bar string.
 * Example: `[████████░░░░░░░░] 50%`
 *
 * @param percent Progress percentage (0 - 100)
 * @param length Total length of the bar in blocks (default: 16)
 */
export function renderProgressBar(percent: number, length: number = 16): string {
  const clamped = Math.min(100, Math.max(0, Math.round(Number.isFinite(percent) ? percent : 0)));
  const barLength = Math.max(4, Math.min(50, Math.floor(length)));
  const filledCount = Math.round((clamped / 100) * barLength);
  const emptyCount = barLength - filledCount;
  const bar = '█'.repeat(filledCount) + '░'.repeat(emptyCount);
  return `[${bar}] ${clamped}%`;
}
