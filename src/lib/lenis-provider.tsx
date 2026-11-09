'use client';

/**
 * src/lib/lenis-provider.tsx
 * Lenis Smooth Scroll + GSAP ScrollTrigger synchronization provider.
 * Exact integration per specification.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { useThemeStore } from './theme-store';

interface LenisContextType {
  lenis: Lenis | null;
  scrollTo: (
    target: string | number | HTMLElement,
    options?: {
      offset?: number;
      immediate?: boolean;
      duration?: number;
      easing?: (t: number) => number;
      onComplete?: () => void;
    }
  ) => void;
}

const LenisContext = createContext<LenisContextType>({
  lenis: null,
  scrollTo: () => {},
});

export function useLenis(): LenisContextType {
  return useContext(LenisContext);
}

interface LenisProviderProps {
  children: React.ReactNode;
}

export function LenisProvider({ children }: LenisProviderProps) {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const reducedMotion = useThemeStore((state) => state.reducedMotion);
  const hydrateTheme = useThemeStore((state) => state.hydrate);

  // Initialize theme on client mount
  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  // Initialize Lenis + GSAP integration
  useEffect(() => {
    // If reduced motion is requested, do not initialize smooth scroll
    if (reducedMotion) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
        setLenisInstance(null);
      }
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
      infinite: false,
      autoRaf: false, // Managed by GSAP ticker
    });

    lenisRef.current = lenis;
    setLenisInstance(lenis);

    // Exact required integration:
    // 1. Tell ScrollTrigger to update on Lenis scroll
    lenis.on('scroll', ScrollTrigger.update);

    // 2. Drive Lenis through GSAP's ticker
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);

    // 3. Disable GSAP's lag smoothing to keep scrolling in perfect sync
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisRef.current = null;
      setLenisInstance(null);
    };
  }, [reducedMotion]);

  const scrollTo = useCallback(
    (
      target: string | number | HTMLElement,
      options?: {
        offset?: number;
        immediate?: boolean;
        duration?: number;
        easing?: (t: number) => number;
        onComplete?: () => void;
      }
    ) => {
      if (lenisRef.current && !reducedMotion) {
        lenisRef.current.scrollTo(target, options);
      } else if (typeof window !== 'undefined') {
        if (typeof target === 'number') {
          window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
        } else if (typeof target === 'string') {
          const el = document.querySelector(target);
          if (el) {
            el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
          }
        } else if (target instanceof HTMLElement) {
          target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
        }
      }
    },
    [reducedMotion]
  );

  return (
    <LenisContext.Provider value={{ lenis: lenisInstance, scrollTo }}>
      {children}
    </LenisContext.Provider>
  );
}
