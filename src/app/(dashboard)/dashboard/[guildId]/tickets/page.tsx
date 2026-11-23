'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, CheckCircle2, Clock, Shield } from 'lucide-react';

export default function TicketsPage() {
  const params = useParams<{ guildId: string }>();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <MessageSquare className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Support Desks</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Tickets & Transcripts</h2>
          <p className="text-xs text-slate-400">Private inquiry channels, transcript exports, and auto-closing rules.</p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[#0b111e] border border-[#1e293b] text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white font-mono">Discrofy Ticket Engine Active</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Create custom ticket embed panels using the <code className="text-cyan-400 font-mono">/ticket create</code> slash command in Discord. All logs automatically stream into encrypted HTML transcripts.
        </p>
      </div>
    </div>
  );
}
