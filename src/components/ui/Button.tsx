'use client';

/**
 * src/components/ui/Button.tsx
 * Fluid button component with primary, secondary, ghost, glass, and glow variants.
 */

import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'glow';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  href?: string;
  external?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconRight,
      className = '',
      href,
      external = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
      md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl gap-2',
      lg: 'px-6 py-3.5 text-sm sm:text-base rounded-2xl gap-2.5 font-bold',
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-black font-extrabold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]',
      secondary:
        'bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/15 hover:border-white/25 active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-white/10 text-gray-300 hover:text-white font-medium active:scale-[0.98]',
      glass:
        'backdrop-blur-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium border border-white/15 hover:border-white/30 shadow-xl shadow-black/40 active:scale-[0.98]',
      glow:
        'relative bg-[#070913] text-cyan-300 font-bold border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_30px_rgba(0,240,255,0.45)] hover:scale-[1.02] active:scale-[0.98]',
    };

    const baseClasses =
      'inline-flex items-center justify-center font-mono transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

    const combinedClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim();

    if (href) {
      return (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className={combinedClasses}
        >
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </a>
      );
    }

    return (
      <button ref={ref} disabled={disabled} className={combinedClasses} {...props}>
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
