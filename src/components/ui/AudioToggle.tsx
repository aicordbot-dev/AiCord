'use client';

/**
 * src/components/ui/AudioToggle.tsx
 * Floating audio control toggle for procedural WebAudio feedback.
 * Discreetly anchored in the bottom-right corner.
 */

import React, { useEffect, useState } from 'react';
import { isSoundEnabled, setSoundEnabled, onSoundStateChange } from '@/lib/audio';

export function AudioToggle() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnabled(isSoundEnabled());
    return onSoundStateChange((next) => setEnabled(next));
  }, []);

  if (!mounted) return null;

  return (
    <aside
      aria-label="Sound Feedback Controls"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2"
    >
      <button
        onClick={() => setSoundEnabled(!enabled)}
        aria-label={enabled ? 'Mute micro-sound effects' : 'Enable micro-sound effects'}
        title={enabled ? 'Sound Effects: ON (Click to mute)' : 'Sound Effects: MUTED (Click to enable)'}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-full text-xs font-mono font-medium
          border shadow-md transition-all duration-200 cursor-pointer backdrop-blur-md
          ${
            enabled
              ? 'bg-[#1C1917] text-[#FDFBF7] border-[#1C1917] hover:bg-[#292524] shadow-amber-900/10'
              : 'bg-white/90 text-[#78716C] border-[#E7E2DA] hover:text-[#1C1917] hover:border-stone-400'
          }
        `}
      >
        <span className="text-sm" aria-hidden="true">
          {enabled ? '🔊' : '🔇'}
        </span>
        <span className="hidden sm:inline">
          {enabled ? 'Sound FX On' : 'Sound FX Off'}
        </span>
        {enabled && (
          <span className="flex items-end gap-[2px] h-3 ml-0.5">
            <span className="w-[2px] h-2 bg-[#5865F2] rounded-full animate-pulse" />
            <span className="w-[2px] h-3 bg-[#5865F2] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-[2px] h-1.5 bg-[#5865F2] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </button>
    </aside>
  );
}
