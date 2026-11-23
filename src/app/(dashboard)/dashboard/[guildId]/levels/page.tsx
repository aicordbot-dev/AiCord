'use client';

import React from 'react';
import { TrendingUp, Award, Zap } from 'lucide-react';

export default function LevelsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Gamification</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Levels & Member XP</h2>
          <p className="text-xs text-slate-400">Custom level-up role rewards, rank cards, and leaderboard multipliers.</p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[#0b111e] border border-[#1e293b] text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white font-mono">Discrofy XP System Active</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Members earn 15-25 XP per message with a 60-second cooldown. Configure milestone role rewards with <code className="text-cyan-400 font-mono">/level-rewards</code>.
        </p>
      </div>
    </div>
  );
}
