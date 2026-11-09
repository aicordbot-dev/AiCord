'use client';

/**
 * src/components/ui/Preloader.tsx
 * Ultra-clean, minimal warm cream preloader inspired by modern Discord bot ecosystems.
 * Renders the official brand mark, a delicate high-precision progress ring & bar,
 * status indicator, and blurs/fades out smoothly to unveil the application.
 * Persists status in sessionStorage to prevent replay annoyance, and respects prefers-reduced-motion.
 */

import React, { useState, useEffect } from 'react';
import { AiCordMark } from '@/components/brand/AiCordMark';

export interface PreloaderProps {
  forceShow?: boolean;
  onFinish?: () => void;
}

export function Preloader({ forceShow = false, onFinish }: PreloaderProps) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing architect engine...');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Check sessionStorage
    try {
      const alreadyLoaded = sessionStorage.getItem('aicord_preloader_viewed');
      if (alreadyLoaded && !forceShow) {
        setIsRemoved(true);
        onFinish?.();
        return;
      }
    } catch {
      // Ignore storage access error in restrictive environments
    }

    if (prefersReducedMotion && !forceShow) {
      try {
        sessionStorage.setItem('aicord_preloader_viewed', 'true');
      } catch {}
      setIsRemoved(true);
      onFinish?.();
      return;
    }

    // Progress counter simulation
    const startTime = performance.now();
    const duration = 950; // ms

    const updateFrame = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));

      setProgress(pct);

      if (pct < 35) {
        setStatusText('Synthesizing server topology...');
      } else if (pct < 70) {
        setStatusText('Loading 28+ enterprise services...');
      } else if (pct < 100) {
        setStatusText('Calibrating warm ivory palette...');
      } else {
        setStatusText('AiCord ready.');
      }

      if (pct < 100) {
        requestAnimationFrame(updateFrame);
      } else {
        // Mark session
        try {
          sessionStorage.setItem('aicord_preloader_viewed', 'true');
        } catch {}

        // Trigger 500ms blur & fadeout
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsRemoved(true);
            onFinish?.();
          }, 500);
        }, 150);
      }
    };

    const rafId = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(rafId);
  }, [forceShow, onFinish]);

  if (!mounted || isRemoved) {
    return null;
  }

  return (
    <aside
      aria-label="AiCord Loading Preloader"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FDFBF7] transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-102 pointer-events-none blur-sm' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient warm illumination */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-100/40 via-orange-100/30 to-violet-100/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full">
        {/* Brand Mark with glowing pulse */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-stone-200/60 border border-[#E7E2DA] flex items-center justify-center transition-transform transform">
            <AiCordMark size={42} variant="tile" glow={false} />
          </div>
          {/* Subtle loading halo */}
          <div className="absolute -inset-2 rounded-3xl border border-[#5865F2]/20 animate-pulse pointer-events-none" />
        </div>

        {/* Wordmark */}
        <div className="mb-6">
          <div className="font-mono font-extrabold text-2xl tracking-tight text-[#1C1917] flex items-center justify-center gap-1">
            <span className="text-[#5865F2]">Ai</span>Cord
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20 font-bold ml-1">
              v1.0
            </span>
          </div>
          <p className="text-xs font-sans text-[#78716C] mt-1 font-medium">
            AI Discord Server Architect
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-[#EAE5DC] h-1.5 rounded-full overflow-hidden relative mb-3 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#5865F2] via-[#7C3AED] to-[#0284C7] rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Line & Numeric Percentage */}
        <div className="w-full flex items-center justify-between text-[11px] font-mono text-[#78716C]">
          <span className="truncate pr-2">{statusText}</span>
          <span className="font-bold text-[#1C1917] tabular-nums">{progress}%</span>
        </div>
      </div>
    </aside>
  );
}

export default Preloader;
