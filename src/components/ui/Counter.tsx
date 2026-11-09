'use client';

/**
 * src/components/ui/Counter.tsx
 * Metric display counter component.
 * Displays counter numbers, suffix/prefix, and strictly renders
 * a "sample data" badge whenever isSample is true (mandatory per spec).
 * Supports dark and light colorScheme for clean contrast on cream background.
 */

import React from 'react';
import { StatItem, statsConfig } from '@/config/stats';
import { Badge } from './Badge';

export interface CounterProps {
  stat?: StatItem;
  value?: string | number;
  label?: string;
  prefix?: string;
  suffix?: string;
  description?: string;
  isSample?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: 'dark' | 'light';
  className?: string;
  valueClassName?: string;
}

export function Counter({
  stat,
  value,
  label,
  prefix,
  suffix,
  description,
  isSample,
  size = 'md',
  colorScheme = 'dark',
  className = '',
  valueClassName = '',
}: CounterProps) {
  // Resolve values prioritizing direct props over stat object, defaulting isSample to true
  const displayValue = value ?? stat?.value ?? '0';
  const displayLabel = label ?? stat?.label;
  const displayPrefix = prefix ?? stat?.prefix ?? '';
  const displaySuffix = suffix ?? stat?.suffix ?? '';
  const displayDescription = description ?? stat?.description;
  const showSampleBadge = isSample ?? stat?.isSample ?? statsConfig.isSample;

  const sizeClasses = {
    sm: {
      value: 'text-2xl sm:text-3xl font-extrabold',
      label: 'text-[11px] uppercase tracking-wider',
    },
    md: {
      value: 'text-3xl sm:text-4xl lg:text-5xl font-black',
      label: 'text-xs sm:text-sm uppercase tracking-wider',
    },
    lg: {
      value: 'text-4xl sm:text-5xl lg:text-6xl font-black',
      label: 'text-sm sm:text-base uppercase tracking-wider',
    },
  }[size];

  const isLight = colorScheme === 'light';

  return (
    <div className={`flex flex-col font-mono ${className}`}>
      {/* Counter Value Row */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        {displayPrefix && (
          <span
            className={`text-lg font-bold ${
              isLight ? 'text-[#78716C]' : 'text-gray-400'
            }`}
          >
            {displayPrefix}
          </span>
        )}
        <span
          className={`
            ${
              isLight
                ? 'text-[#1C1917]'
                : 'bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-cyan-400'
            }
            tracking-tight leading-none
            ${sizeClasses.value}
            ${valueClassName}
          `.trim()}
        >
          {displayValue}
        </span>
        {displaySuffix && !String(displayValue).endsWith(displaySuffix) && (
          <span
            className={`font-bold ${
              isLight ? 'text-[#5865F2]' : 'text-cyan-400'
            }`}
          >
            {displaySuffix}
          </span>
        )}

        {/* Small mandatory "sample data" indicator tag */}
        {showSampleBadge && (
          <Badge
            status="sample"
            size="sm"
            className="ml-1 text-[9px] px-1.5 py-0 tracking-widest opacity-80"
          >
            sample data
          </Badge>
        )}
      </div>

      {/* Label and Subtext */}
      {displayLabel && (
        <span
          className={`font-bold mt-2 ${sizeClasses.label} ${
            isLight ? 'text-[#57534E]' : 'text-gray-400'
          }`}
        >
          {displayLabel}
        </span>
      )}

      {displayDescription && (
        <span
          className={`text-xs font-sans mt-0.5 line-clamp-2 ${
            isLight ? 'text-[#78716C]' : 'text-gray-500'
          }`}
        >
          {displayDescription}
        </span>
      )}
    </div>
  );
}
