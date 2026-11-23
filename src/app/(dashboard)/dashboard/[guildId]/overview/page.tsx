'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Activity,
  Shield,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { getFallbackGuildData } from '@/lib/discord/server-data';

export default function OverviewPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = params?.guildId || '111111111111111111';
  const data = getFallbackGuildData(guildId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <LayoutDashboard className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Telemetry & Pulse
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Server Overview & Analytics
          </h2>
          <p className="text-xs text-slate-400">
            High-precision operational metrics, member growth velocity, and uptime statistics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-1">
          <span className="text-xs font-mono text-slate-400">Total Membership</span>
          <div className="text-2xl font-extrabold text-white font-mono">{data.stats.totalMembers.toLocaleString()}</div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +14.2% this week
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-1">
          <span className="text-xs font-mono text-slate-400">Bot Uptime</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{data.stats.uptimePercentage}%</div>
          <span className="text-[11px] font-mono text-slate-400">99.99% SLA Target</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-1">
          <span className="text-xs font-mono text-slate-400">Threats Neutralized</span>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">{data.stats.automodBlockedToday}</div>
          <span className="text-[11px] font-mono text-cyan-400">Past 24 hours</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-1">
          <span className="text-xs font-mono text-slate-400">Active AI Blueprints</span>
          <div className="text-2xl font-extrabold text-indigo-400 font-mono">{data.stats.aiBlueprintsDeployed}</div>
          <span className="text-[11px] font-mono text-indigo-400">Additive topology</span>
        </div>
      </div>
    </div>
  );
}
