'use client';

/**
 * src/components/three/PerformanceMonitorBridge.tsx
 * Drei PerformanceMonitor bridge with hysteresis-controlled GPU tier scaling.
 * Dynamically steps quality tier down when frame rates drop under load,
 * and recovers tier only after consecutive sustained high-performance intervals.
 */

import { useRef } from 'react';
import { PerformanceMonitor } from '@react-three/drei';
import { useScrollStore } from '@/lib/scroll-store';
import { TierHysteresisTracker, GpuTier } from '@/lib/use-gpu-tier';

export function PerformanceMonitorBridge() {
  const qualityTier = useScrollStore((state) => state.qualityTier);
  const setQualityTier = useScrollStore((state) => state.setQualityTier);
  const setFps = useScrollStore((state) => state.setFps);

  const normalizedTier: GpuTier = qualityTier === 'medium' ? 'mid' : (qualityTier as GpuTier);
  const trackerRef = useRef<TierHysteresisTracker>(new TierHysteresisTracker(normalizedTier, 3));

  const handleDecline = () => {
    const nextTier = trackerRef.current.onDecline();
    if (nextTier !== qualityTier) {
      setQualityTier(nextTier);
    }
  };

  const handleIncline = () => {
    const nextTier = trackerRef.current.onIncline();
    if (nextTier !== qualityTier) {
      setQualityTier(nextTier);
    }
  };

  const handleChange = (status: { fps: number }) => {
    if (typeof status?.fps === 'number') {
      setFps(Math.round(status.fps));
    }
  };

  const handleFallback = () => {
    trackerRef.current.setTier('low');
    setQualityTier('low');
  };

  return (
    <PerformanceMonitor
      factor={1}
      iterations={5}
      threshold={0.7}
      onIncline={handleIncline}
      onDecline={handleDecline}
      onChange={handleChange}
      onFallback={handleFallback}
    />
  );
}

export default PerformanceMonitorBridge;
