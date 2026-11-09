'use client';

/**
 * src/components/ui/SplitText.tsx
 * Accessible text splitter for character / word mask reveal animations.
 * Preserves screen reader accessibility via aria-label on the outer container.
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export interface SplitTextProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  splitBy?: 'chars' | 'words';
  stagger?: number;
  duration?: number;
  delay?: number;
  animateOnMount?: boolean;
  className?: string;
  charClassName?: string;
  highlightWords?: string[];
  highlightClassName?: string;
}

export function SplitText({
  children,
  as: Component = 'span',
  splitBy = 'chars',
  stagger = 0.02,
  duration = 0.8,
  delay = 0.1,
  animateOnMount = true,
  className = '',
  charClassName = '',
  highlightWords = [],
  highlightClassName = 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500',
}: SplitTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const text = typeof children === 'string' ? children : String(children);
  const words = text.split(' ');

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !animateOnMount || prefersReducedMotion) return;

    const targets = el.querySelectorAll('.split-char');
    if (!targets || targets.length === 0) return;

    gsap.fromTo(
      targets,
      {
        yPercent: 110,
        opacity: 0,
        rotateX: -45,
      },
      {
        yPercent: 0,
        opacity: 1,
        rotateX: 0,
        duration,
        stagger,
        delay,
        ease: 'power4.out',
      }
    );

    return () => {
      gsap.killTweensOf(targets);
    };
  }, [animateOnMount, duration, stagger, delay, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <Component className={className} aria-label={text}>
        {text}
      </Component>
    );
  }

  return (
    <Component
      ref={containerRef as any}
      className={`inline-block ${className}`}
      aria-label={text}
    >
      <span aria-hidden="true" className="inline-block">
        {words.map((word, wordIndex) => {
          const isHighlighted = highlightWords.some((hw) =>
            word.toLowerCase().includes(hw.toLowerCase())
          );

          if (splitBy === 'words') {
            return (
              <span
                key={wordIndex}
                className="inline-block overflow-hidden mr-[0.25em] align-top"
              >
                <span
                  className={`split-char inline-block ${
                    isHighlighted ? highlightClassName : ''
                  } ${charClassName}`}
                  style={{ willChange: 'transform, opacity' }}
                >
                  {word}
                </span>
              </span>
            );
          }

          // Split by chars
          return (
            <span
              key={wordIndex}
              className="inline-block whitespace-nowrap mr-[0.28em] align-top"
            >
              {word.split('').map((char, charIndex) => (
                <span
                  key={charIndex}
                  className="inline-block overflow-hidden align-top"
                >
                  <span
                    className={`split-char inline-block ${
                      isHighlighted ? highlightClassName : ''
                    } ${charClassName}`}
                    style={{ willChange: 'transform, opacity' }}
                  >
                    {char}
                  </span>
                </span>
              ))}
            </span>
          );
        })}
      </span>
    </Component>
  );
}

export default SplitText;
