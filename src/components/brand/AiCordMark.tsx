'use client';

import React, { useId } from 'react';

export interface AiCordMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: 'tile' | 'transparent' | 'mono-white' | 'mono-black';
  glow?: boolean;
  className?: string;
  title?: string;
}

export function AiCordMark({
  size = 40,
  variant = 'tile',
  glow = true,
  className = '',
  title = 'AiCord Mark',
  ...rest
}: AiCordMarkProps) {
  const id = useId().replace(/:/g, '');
  const bgId = `mBg_${id}`;
  const strokeId = `mStroke_${id}`;
  const glowId = `mGlow_${id}`;
  const gridId = `mGrid_${id}`;
  const blurId = `mBlur_${id}`;

  if (variant === 'mono-white' || variant === 'mono-black') {
    const strokeColor = variant === 'mono-white' ? '#FFFFFF' : '#000000';
    return (
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={title}
        {...rest}
      >
        <title>{title}</title>
        <g fill="none" stroke={strokeColor} strokeLinecap="round" strokeLinejoin="round">
          <path d="M136 392L256 112L376 392" strokeWidth="44" />
          <path d="M196 316H316" strokeWidth="34" />
        </g>
        <path
          d="M384 98Q384 132 418 132Q384 132 384 166Q384 132 350 132Q384 132 384 98Z"
          fill={strokeColor}
        />
        <path
          d="M422 184Q422 198 436 198Q422 198 422 212Q422 198 408 198Q422 198 422 184Z"
          fill={strokeColor}
        />
      </svg>
    );
  }

  const isTile = variant === 'tile';

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      {...rest}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1B1B4B" />
          <stop offset="1" stopColor="#0B1020" />
        </linearGradient>
        <linearGradient
          id={strokeId}
          x1="136"
          y1="392"
          x2="376"
          y2="112"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5865F2" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <radialGradient
          id={glowId}
          cx="256"
          cy="190"
          r="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5865F2" stopOpacity=".38" />
          <stop offset="1" stopColor="#5865F2" stopOpacity="0" />
        </radialGradient>
        <pattern id={gridId} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#fff" strokeOpacity=".05" />
        </pattern>
        <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* Optional Rounded Brand Tile Backdrop */}
      {isTile && (
        <>
          <rect width="512" height="512" rx="112" fill={`url(#${bgId})`} />
          <rect width="512" height="512" rx="112" fill={`url(#${glowId})`} />
          <rect width="512" height="512" rx="112" fill={`url(#${gridId})`} />
        </>
      )}

      {/* Holographic Glowing Blur Underlayer */}
      {glow && (
        <g
          filter={`url(#${blurId})`}
          opacity=".6"
          fill="none"
          stroke="#22D3EE"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M136 392L256 112L376 392" strokeWidth="44" />
          <path d="M196 316H316" strokeWidth="34" />
        </g>
      )}

      {/* Primary Brand Strokes */}
      <g
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M136 392L256 112L376 392" strokeWidth="44" />
        <path d="M196 316H316" strokeWidth="34" />
      </g>

      {/* 4-Point AI Star 1 (Brilliant White Star) */}
      <path
        d="M384 98Q384 132 418 132Q384 132 384 166Q384 132 350 132Q384 132 384 98Z"
        fill="#FFFFFF"
      />

      {/* 4-Point AI Star 2 (Cyan Sparkle Star) */}
      <path
        d="M422 184Q422 198 436 198Q422 198 422 212Q422 198 408 198Q422 198 422 184Z"
        fill="#22D3EE"
      />
    </svg>
  );
}

export default AiCordMark;
