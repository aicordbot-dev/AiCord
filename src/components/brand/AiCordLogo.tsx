'use client';

import React from 'react';
import Link from 'next/link';
import { AiCordMark, AiCordMarkProps } from './AiCordMark';
import { siteConfig } from '@/config/site';

export interface AiCordLogoProps {
  variant?: 'horizontal' | 'horizontal-compact' | 'stacked' | 'mark-only';
  colorScheme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | number;
  markVariant?: AiCordMarkProps['variant'];
  showSubtitle?: boolean;
  showVersion?: boolean;
  href?: string;
  className?: string;
}

export function AiCordLogo({
  variant = 'horizontal-compact',
  colorScheme = 'dark',
  size = 'md',
  markVariant = 'tile',
  showSubtitle = false,
  showVersion = false,
  href,
  className = '',
}: AiCordLogoProps) {
  // Determine pixel sizes
  const markSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
        ? 32
        : size === 'lg'
          ? 52
          : 40;

  const isLight = colorScheme === 'light';
  const cordTextColor = isLight ? 'text-[#0F172A]' : 'text-white';
  const aiTextColor = isLight ? 'text-[#5865F2]' : 'text-[#22D3EE]';

  const content = (
    <div
      className={`inline-flex items-center gap-3 select-none transition-transform group ${
        variant === 'stacked' ? 'flex-col text-center' : ''
      } ${className}`}
    >
      <div className="relative shrink-0 transition-transform group-hover:scale-105">
        <AiCordMark size={markSize} variant={markVariant} />
      </div>

      {variant !== 'mark-only' && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono font-extrabold tracking-tight ${
                markSize >= 48
                  ? 'text-2xl'
                  : markSize <= 32
                    ? 'text-base'
                    : 'text-xl'
              } ${cordTextColor}`}
            >
              <span className={aiTextColor}>Ai</span>Cord
            </span>
            {showVersion && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                v{siteConfig.version}
              </span>
            )}
          </div>
          {(showSubtitle || variant === 'horizontal') && (
            <span
              className={`text-[11px] font-sans font-medium mt-1 tracking-normal ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              AI server builder for Discord
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

export default AiCordLogo;
