'use client';

/**
 * src/components/ui/GlassCard.tsx
 * Frosted Glass Card with 16-24px backdrop blur, 1px white/10 border,
 * inner top highlight edge, and smooth hover glow effect.
 */

import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
  glowColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: React.ElementType;
}

export function GlassCard({
  children,
  className = '',
  hoverEffect = true,
  glowColor = 'rgba(0, 240, 255, 0.15)',
  padding = 'md',
  as: Component = 'div',
  ...props
}: GlassCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  const hoverClasses = hoverEffect
    ? 'hover:border-white/20 hover:shadow-2xl hover:shadow-[var(--card-glow,rgba(0,240,255,0.12))] hover:-translate-y-0.5'
    : '';

  return (
    <Component
      style={{ '--card-glow': glowColor } as React.CSSProperties}
      className={`
        relative rounded-2xl md:rounded-3xl
        backdrop-blur-xl md:backdrop-blur-2xl
        bg-white/[0.03]
        border border-white/10
        shadow-xl shadow-black/40
        overflow-hidden
        transition-all duration-300
        before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:pointer-events-none
        ${paddingClasses}
        ${hoverClasses}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}
