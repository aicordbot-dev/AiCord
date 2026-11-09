'use client';

/**
 * src/components/three/StaticHeroFallback.tsx
 * Ultra-crisp, high-performance static hero fallback.
 * Displayed when WebGL is unavailable, reduced-motion is active, or WebGL context is lost.
 * Features the official AiCord insignia tile with glowing blur, precision gradients,
 * coordinate blueprint grid, and reactive theme accents.
 */

import React from 'react';
import { useThemeStore } from '@/lib/theme-store';

export function StaticHeroFallback() {
  const currentTheme = useThemeStore((state) => state.theme);
  const primaryColor = currentTheme?.primaryHex || '#5865F2';
  const accentColor = currentTheme?.accentHex || '#22D3EE';

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {/* ─── Blueprint Coordinate Matrix Background ──────────────────────────── */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(88, 101, 242, 0.15) 0%, transparent 70%)
          `,
          backgroundSize: '48px 48px, 48px 48px, 100% 100%',
        }}
      />

      {/* ─── Ambient Energy Vignette ─────────────────────────────────────────── */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-35 transition-colors duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${primaryColor} 0%, ${accentColor} 45%, transparent 75%)`,
        }}
      />

      {/* ─── Official AiCord Brand Tile Insignia ─────────────────────────────── */}
      <div className="relative w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96 flex items-center justify-center drop-shadow-[0_0_50px_rgba(88,101,242,0.35)]">
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Background Gradient */}
            <linearGradient id="fallbackBg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1B1B4B" />
              <stop offset="1" stopColor="#0B1020" />
            </linearGradient>

            {/* Stroke Gradient */}
            <linearGradient
              id="fallbackStroke"
              x1="136"
              y1="392"
              x2="376"
              y2="112"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor={primaryColor} />
              <stop offset="1" stopColor={accentColor} />
            </linearGradient>

            {/* Radial Core Glow */}
            <radialGradient
              id="fallbackGlow"
              cx="256"
              cy="190"
              r="300"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor={primaryColor} stopOpacity="0.38" />
              <stop offset="1" stopColor={primaryColor} stopOpacity="0" />
            </radialGradient>

            {/* Matrix Micro-Grid */}
            <pattern id="fallbackGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="#fff" strokeOpacity="0.05" />
            </pattern>

            {/* Blur Filter for Holographic Radiance */}
            <filter id="fallbackBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>

          {/* Rounded Tile Container */}
          <rect width="512" height="512" rx="112" fill="url(#fallbackBg)" />
          <rect width="512" height="512" rx="112" fill="url(#fallbackGlow)" />
          <rect width="512" height="512" rx="112" fill="url(#fallbackGrid)" />

          {/* Holographic Blurred Glow Layer */}
          <g
            filter="url(#fallbackBlur)"
            opacity="0.6"
            fill="none"
            stroke={accentColor}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M136 392L256 112L376 392" strokeWidth="44" />
            <path d="M196 316H316" strokeWidth="34" />
          </g>

          {/* Primary Sharp Insignia Strokes */}
          <g
            fill="none"
            stroke="url(#fallbackStroke)"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M136 392L256 112L376 392" strokeWidth="44" />
            <path d="M196 316H316" strokeWidth="34" />
          </g>

          {/* 4-point AI Star 1 (White Brilliant Core) */}
          <path
            d="M384 98Q384 132 418 132Q384 132 384 166Q384 132 350 132Q384 132 384 98Z"
            fill="#FFFFFF"
            className="animate-pulse"
            style={{ animationDuration: '3s' }}
          />

          {/* 4-point AI Star 2 (Accent Sparkle Satellite) */}
          <path
            d="M422 184Q422 198 436 198Q422 198 422 212Q422 198 408 198Q422 198 422 184Z"
            fill={accentColor}
            className="animate-pulse"
            style={{ animationDuration: '2.2s', animationDelay: '0.6s' }}
          />
        </svg>

        {/* ─── Ambient Micro-Sparkles ────────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none">
          <span
            className="absolute top-1/6 right-1/6 w-3 h-3 text-cyan-300 animate-pulse"
            style={{ animationDuration: '2.4s' }}
          >
            ✦
          </span>
          <span
            className="absolute bottom-1/4 left-1/4 w-2.5 h-2.5 text-indigo-300 animate-pulse"
            style={{ animationDuration: '3.1s', animationDelay: '0.8s' }}
          >
            ✧
          </span>
        </div>
      </div>
    </div>
  );
}

export default StaticHeroFallback;
