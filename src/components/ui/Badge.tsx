'use client';

/**
 * src/components/ui/Badge.tsx
 * Status & Tier badge component with pulsing indicators and theme variants.
 */

import React from 'react';

export type BadgeStatus = 'live' | 'beta' | 'coming-soon' | 'new' | 'sample';
export type BadgeTier = 'free' | 'pro' | 'ultimate' | 'lifetime';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  tier?: BadgeTier;
  variant?: 'solid' | 'outline' | 'subtle';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function Badge({
  children,
  status,
  tier,
  variant = 'subtle',
  size = 'sm',
  pulse,
  className = '',
  ...props
}: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-white/10 text-gray-300 border-white/20';
  let showPulse = pulse;
  let pulseColor = 'bg-gray-400';

  if (status === 'live') {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    showPulse = pulse ?? true;
    pulseColor = 'bg-emerald-400';
  } else if (status === 'beta') {
    colorClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    showPulse = pulse ?? false;
    pulseColor = 'bg-cyan-400';
  } else if (status === 'coming-soon') {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    showPulse = false;
  } else if (status === 'new') {
    colorClasses = 'bg-pink-500/10 text-pink-400 border-pink-500/30';
    showPulse = pulse ?? true;
    pulseColor = 'bg-pink-400';
  } else if (status === 'sample') {
    colorClasses = 'bg-amber-500/15 text-amber-300/90 border-amber-500/25';
    showPulse = false;
  } else if (tier === 'free') {
    colorClasses = 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  } else if (tier === 'pro') {
    colorClasses = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20';
  } else if (tier === 'ultimate') {
    colorClasses = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40 shadow-sm shadow-yellow-500/20';
  } else if (tier === 'lifetime') {
    colorClasses = 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20';
  }

  const defaultText =
    children ||
    (status === 'live'
      ? 'LIVE'
      : status === 'beta'
        ? 'BETA'
        : status === 'coming-soon'
          ? 'COMING SOON'
          : status === 'new'
            ? 'NEW'
            : status === 'sample'
              ? 'SAMPLE DATA'
              : tier
                ? tier.toUpperCase()
                : '');

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-mono font-bold tracking-wider uppercase rounded-full border
        ${sizeClasses}
        ${colorClasses}
        ${className}
      `.trim()}
      {...props}
    >
      {showPulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`}
          />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${pulseColor}`} />
        </span>
      )}
      <span>{defaultText}</span>
    </span>
  );
}
