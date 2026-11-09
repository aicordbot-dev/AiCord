'use client';

/**
 * src/components/ui/Counter.tsx
 * Metric display counter component.
 * Displays counter numbers, suffix/prefix, and strictly renders
 * a "sample data" badge whenever isSample is true (mandatory per spec).
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

  return (
    <div className={`flex flex-col font-mono ${className}`}>
      {/* Counter Value Row */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        {displayPrefix && (
          <span className="text-gray-400 text-lg font-bold">{displayPrefix}</span>
        )}
        <span
          className={`
            bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-cyan-400
            tracking-tight leading-none
            ${sizeClasses.value}
            ${valueClassName}
          `.trim()}
        >
          {displayValue}
        </span>
        {displaySuffix && !String(displayValue).endsWith(displaySuffix) && (
          <span className="text-cyan-400 font-bold">{displaySuffix}</span>
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
        <span className={`text-gray-400 font-bold mt-2 ${sizeClasses.label}`}>
          {displayLabel}
        </span>
      )}

      {displayDescription && (
        <span className="text-gray-500 text-xs font-sans mt-0.5 line-clamp-2">
          {displayDescription}
        </span>
      )}
    </div>
  );
}
