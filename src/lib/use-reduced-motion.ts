'use client';

/**
 * src/lib/use-reduced-motion.ts
 * React hook detecting system prefers-reduced-motion: reduce media query.
 * Automatically synchronizes with the universal theme store.
 */

import { useState, useEffect } from 'react';
import { useThemeStore } from './theme-store';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const storeReducedMotion = useThemeStore((state) => state.reducedMotion);
  const setStoreReducedMotion = useThemeStore((state) => state.setReducedMotion);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(storeReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQueryList = window.matchMedia(QUERY);
    const updateMotionPreference = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = event.matches;
      setPrefersReducedMotion(matches);
      // Synchronize with global theme store
      setStoreReducedMotion(matches);
    };

    // Initialize with current system state
    updateMotionPreference(mediaQueryList);

    // Subscribe to system preference updates
    try {
      mediaQueryList.addEventListener('change', updateMotionPreference);
      return () => {
        mediaQueryList.removeEventListener('change', updateMotionPreference);
      };
    } catch {
      // Fallback for older browsers
      mediaQueryList.addListener(updateMotionPreference);
      return () => {
        mediaQueryList.removeListener(updateMotionPreference);
      };
    }
  }, [setStoreReducedMotion]);

  return storeReducedMotion || prefersReducedMotion;
}

export default useReducedMotion;
