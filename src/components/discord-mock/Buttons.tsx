'use client';

/**
 * src/components/discord-mock/Buttons.tsx
 * Authentic Discord button component system and ActionRow container.
 */

import React from 'react';

export type DiscordButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'link';

export interface DiscordButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DiscordButtonVariant;
  icon?: React.ReactNode;
  pulsing?: boolean;
  loading?: boolean;
  tooltip?: string;
  href?: string;
  external?: boolean;
}

const VARIANT_STYLES: Record<DiscordButtonVariant, string> = {
  primary:
    'bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3C45A5] text-white shadow-sm hover:shadow-indigo-500/20',
  secondary:
    'bg-[#4E5058] hover:bg-[#6D6F78] active:bg-[#3B3C42] text-white shadow-sm',
  success:
    'bg-[#248046] hover:bg-[#1A6334] active:bg-[#15512B] text-white shadow-sm hover:shadow-emerald-500/20',
  danger:
    'bg-[#DA373C] hover:bg-[#A12828] active:bg-[#852024] text-white shadow-sm hover:shadow-rose-500/25',
  link:
    'bg-[#4E5058]/80 hover:bg-[#6D6F78] text-white shadow-sm',
};

export function DiscordButton({
  variant = 'secondary',
  icon,
  pulsing = false,
  loading = false,
  tooltip,
  children,
  className = '',
  disabled,
  href,
  external = true,
  onClick,
  ...props
}: DiscordButtonProps) {
  const baseClasses =
    'relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-sans font-medium text-xs sm:text-sm transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const pulseClasses = pulsing
    ? 'animate-pulse ring-2 ring-rose-500/60 shadow-lg shadow-rose-500/40'
    : '';

  const variantClasses = VARIANT_STYLES[variant] || VARIANT_STYLES.secondary;

  const content = (
    <>
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0 text-base leading-none">{icon}</span>
      )}
      <span className="truncate">{children}</span>
      {variant === 'link' && !icon && (
        <svg
          className="w-3.5 h-3.5 text-gray-300 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={`${baseClasses} ${variantClasses} ${pulseClasses} ${className}`}
        title={tooltip}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses} ${pulseClasses} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      title={tooltip}
      {...props}
    >
      {content}
    </button>
  );
}

export interface DiscordActionRowProps {
  children: React.ReactNode;
  className?: string;
}

export function DiscordActionRow({ children, className = '' }: DiscordActionRowProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 pt-2.5 ${className}`}>
      {children}
    </div>
  );
}

export default DiscordButton;
