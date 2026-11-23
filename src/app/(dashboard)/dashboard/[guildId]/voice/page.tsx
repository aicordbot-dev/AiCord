'use client';

import React from 'react';
import { Radio, Mic2, Music, Volume2 } from 'lucide-react';

export default function VoiceRadioPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Radio className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-purple-400 uppercase tracking-wider">Audio Gateway</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Temporary Voice & 24/7 Radio</h2>
          <p className="text-xs text-slate-400">Dynamic throwaway voice channels and curated lossless lo-fi and synthwave streams.</p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[#0b111e] border border-[#1e293b] text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
          <Music className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white font-mono">24/7 Audio Radio Stream Engine Active</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Join any voice channel and run <code className="text-cyan-400 font-mono">/radio play</code> to start continuous 24/7 lofi, synthwave, or ambient audio.
        </p>
      </div>
    </div>
  );
}
