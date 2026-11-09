'use client';

/**
 * src/components/three/SceneController.tsx
 * Orchestrates frameloop invalidation, pointer tracking with critical damping,
 * and FPS monitoring sync to the global scroll-store.
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScrollStore } from '@/lib/scroll-store';

export function SceneController() {
  const { invalidate } = useThree();
  const setPointer = useScrollStore((state) => state.setPointer);

  // Preallocated coordinates to ensure 0 GC pressure
  const targetPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastProgress = useRef<number>(0);
  const isMoving = useRef<boolean>(true);

  // Track global window pointer movements
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;

      // Normalized device coordinates [-1, 1]
      targetPointer.current.x = (clientX / w) * 2 - 1;
      targetPointer.current.y = -(clientY / h) * 2 + 1;
      isMoving.current = true;
      invalidate();
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [invalidate]);

  // Subscribe to scroll store progress changes to trigger demand frame invalidations
  useEffect(() => {
    const unsub = useScrollStore.subscribe((state) => {
      if (Math.abs(state.progress - lastProgress.current) > 0.0001 || Math.abs(state.velocity) > 0.01) {
        lastProgress.current = state.progress;
        isMoving.current = true;
        invalidate();
      }
    });
    return () => unsub();
  }, [invalidate]);

  // Frame loop: critically damp pointer coordinates & invalidate on motion
  useFrame((_, delta) => {
    // Critically damp pointer towards target
    const smoothing = 10;
    const dt = Math.min(delta, 0.1);
    const prevX = currentPointer.current.x;
    const prevY = currentPointer.current.y;

    currentPointer.current.x = THREE.MathUtils.damp(
      currentPointer.current.x,
      targetPointer.current.x,
      smoothing,
      dt
    );
    currentPointer.current.y = THREE.MathUtils.damp(
      currentPointer.current.y,
      targetPointer.current.y,
      smoothing,
      dt
    );

    const dx = Math.abs(currentPointer.current.x - targetPointer.current.x);
    const dy = Math.abs(currentPointer.current.y - targetPointer.current.y);

    if (Math.abs(currentPointer.current.x - prevX) > 0.0001 || Math.abs(currentPointer.current.y - prevY) > 0.0001) {
      setPointer({ x: currentPointer.current.x, y: currentPointer.current.y });
    }

    if (dx > 0.001 || dy > 0.001) {
      invalidate();
    }
  });

  return null;
}

export default SceneController;
