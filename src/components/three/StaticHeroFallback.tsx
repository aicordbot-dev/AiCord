'use client';

/**
 * src/components/three/StaticHeroFallback.tsx
 * Ultra-crisp, high-performance static hero fallback.
 * Displayed when WebGL is unavailable, reduced-motion is active, or WebGL context is lost.
 * Features layered SVG insignia, CSS blueprint coordinate grid, and hardware-accelerated sparkles.
 */

import React from 'react';
import { useThemeStore } from '@/lib/theme-store';

export function StaticHeroFallback() {
  const currentTheme = useThemeStore((state) => state.theme);
  const primaryColor = currentTheme?.primaryHex || '#00f0ff';
  const accentColor = currentTheme?.accentHex || '#ff007f';

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {/* ─── Blueprint Coordinate Matrix Background ──────────────────────────── */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.12) 0%, transparent 70%)
          `,
          backgroundSize: '48px 48px, 48px 48px, 100% 100%',
        }}
      />

      {/* ─── Radial Energy Vignette ──────────────────────────────────────────── */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-40 transition-colors duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${primaryColor} 0%, ${accentColor} 45%, transparent 75%)`,
        }}
      />

      {/* ─── Layered Geometric Insignia ──────────────────────────────────────── */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center opacity-85">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="fallbackBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="50%" stopColor="#7928ca" />
              <stop offset="100%" stopColor={accentColor} />
            </linearGradient>
            <filter id="fallbackGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Ring Segment */}
          <circle
            cx="100"
            cy="100"
            r="82"
            stroke="url(#fallbackBrandGrad)"
            strokeWidth="1.5"
            strokeDasharray="16 8 4 8"
            className="animate-spin"
            style={{ animationDuration: '60s' }}
          />

          {/* Isometric Diamond Grid */}
          <polygon
            points="100,24 168,100 100,176 32,100"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />
          <polygon
            points="100,45 147,100 100,155 53,100"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* Central AiCord Neural Nexus Crest */}
          <path
            d="M 70 65 L 130 65 C 145 65, 155 75, 155 90 C 155 105, 140 115, 130 115 L 90 115 L 125 150"
            stroke="url(#fallbackBrandGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#fallbackGlow)"
          />

          {/* Orbital Nodes */}
          <circle cx="100" cy="24" r="3.5" fill={primaryColor} />
          <circle cx="168" cy="100" r="3.5" fill={accentColor} />
          <circle cx="100" cy="176" r="3.5" fill={primaryColor} />
          <circle cx="32" cy="100" r="3.5" fill={accentColor} />
        </svg>

        {/* ─── CSS-Animated Sparkles ─────────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none">
          <span
            className="absolute top-1/4 left-1/4 w-3 h-3 text-cyan-300 animate-pulse"
            style={{ animationDuration: '2.4s' }}
          >
            ✦
          </span>
          <span
            className="absolute top-1/3 right-1/4 w-3 h-3 text-pink-400 animate-pulse"
            style={{ animationDuration: '3.1s', animationDelay: '0.8s' }}
          >
            ✧
          </span>
          <span
            className="absolute bottom-1/4 left-1/3 w-3 h-3 text-cyan-200 animate-pulse"
            style={{ animationDuration: '2.8s', animationDelay: '1.4s' }}
          >
            ✦
          </span>
          <span
            className="absolute bottom-1/3 right-1/3 w-2.5 h-2.5 text-purple-300 animate-pulse"
            style={{ animationDuration: '3.5s', animationDelay: '0.4s' }}
          >
            ✦
          </span>
        </div>
      </div>
    </div>
  );
}

export default StaticHeroFallback;
