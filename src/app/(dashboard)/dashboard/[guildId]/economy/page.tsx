'use client';

import React from 'react';
import { Coins, Wallet, Landmark } from 'lucide-react';

export default function EconomyPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coins className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Virtual Treasury</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Economy & Bank Vault</h2>
          <p className="text-xs text-slate-400">Server currencies, daily stipends, community item shops, and gambling minigames.</p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[#0b111e] border border-[#1e293b] text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
          <Landmark className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white font-mono">Discrofy Treasury Engine Online</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Full support for daily rewards (<code className="text-cyan-400 font-mono">/daily</code>), blackjack, coinflip, and community shop transactions.
        </p>
      </div>
    </div>
  );
}
