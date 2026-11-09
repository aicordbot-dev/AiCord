'use client';

/**
 * src/components/discord-mock/ProgressBar.tsx
 * Theme-reactive ASCII and visual progress bar component for Discord mock screens.
 */

import React from 'react';
import { BarStyle, BAR_STYLES } from '@/config/themes';
import { useThemeStore } from '@/lib/theme-store';

export interface ProgressBarProps {
  percent: number; // 0 to 100
  style?: BarStyle;
  length?: number;
  label?: string;
  showAscii?: boolean;
  showVisualTrack?: boolean;
  className?: string;
}

/**
 * Pure utility function to render the themed ASCII progress bar string.
 */
export function formatAsciiProgressBar(
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

export function ProgressBar({
  percent,
  style,
  length = 10,
  label,
  showAscii = true,
  showVisualTrack = true,
  className = '',
}: ProgressBarProps) {
  const activeBarStyle = useThemeStore((state) => state.barStyle);
  const currentTheme = useThemeStore((state) => state.theme);

  const resolvedStyle: BarStyle = style || activeBarStyle || 'pipes';
  const safePercent = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, Math.round(percent)))
    : 0;

  const asciiString = formatAsciiProgressBar(safePercent, resolvedStyle, length);

  return (
    <div
      className={`font-mono space-y-1.5 ${className}`}
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
    >
      {label && (
        <div className="flex items-center justify-between text-xs text-gray-300 font-sans">
          <span>{label}</span>
          <span className="font-mono text-cyan-400 font-semibold">{safePercent}%</span>
        </div>
      )}

      {showAscii && (
        <div className="text-xs sm:text-sm tracking-widest text-cyan-300 select-all font-mono">
          {asciiString}
        </div>
      )}

      {showVisualTrack && (
        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${safePercent}%`,
              background: `linear-gradient(90deg, ${currentTheme?.primaryHex || '#5865F2'}, ${currentTheme?.accentHex || '#22D3EE'})`,
              boxShadow: `0 0 8px ${currentTheme?.glowHex || 'rgba(34, 211, 238, 0.4)'}`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
