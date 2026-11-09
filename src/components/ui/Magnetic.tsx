'use client';

/**
 * src/components/ui/Magnetic.tsx
 * High-performance magnetic cursor attraction component with GSAP spring physics.
 * Respects prefers-reduced-motion and cleans up tweens on unmount.
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export interface MagneticProps {
  children: React.ReactNode;
  strength?: number; // Attraction strength factor (0.1 to 0.8, default 0.35)
  className?: string;
  disabled?: boolean;
}

export function Magnetic({
  children,
  strength = 0.35,
  className = '',
  disabled = false,
}: MagneticProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled || prefersReducedMotion) return;

    let xTo: (value: number) => void;
    let yTo: (value: number) => void;

    try {
      xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
      yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    } catch {
      // Fallback if quickTo is unavailable
      xTo = (val: number) => gsap.to(el, { x: val, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      yTo = (val: number) => gsap.to(el, { y: val, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      xTo(deltaX);
      yTo(deltaY);
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: 'elastic.out(1, 0.4)',
        overwrite: 'auto',
      });
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      gsap.killTweensOf(el);
    };
  }, [strength, disabled, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`inline-block ${className}`}
      style={{ willChange: 'transform' }}
    >
      {children}
    </div>
  );
}

export default Magnetic;
