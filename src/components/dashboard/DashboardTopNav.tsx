'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  Bot,
  ExternalLink,
  Shield,
  Layers,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import type { DashboardGuild } from '@/lib/discord/server-data';
import { getBotInviteUrl } from '@/lib/discord/invite';

interface DashboardTopNavProps {
  guild: DashboardGuild;
}

export function DashboardTopNav({ guild }: DashboardTopNavProps) {
  const pathname = usePathname();

  // Resolve current active tab/page title from URL path
  const getPageTitle = () => {
    if (pathname.endsWith('/automod')) return 'AutoMod & Content Filtering';
    if (pathname.endsWith('/channels')) return 'Channels & Category Hierarchy';
    if (pathname.endsWith('/roles')) return 'Roles & Permission Matrix';
    if (pathname.endsWith('/billing')) return 'Subscription & Stripe Portal';
    if (pathname.endsWith('/overview')) return 'Overview & Analytics';
    if (pathname.endsWith('/tickets')) return 'Tickets & Transcripts';
    if (pathname.endsWith('/levels')) return 'Levels & Community XP';
    if (pathname.endsWith('/economy')) return 'Economy & Bank Vault';
    if (pathname.endsWith('/voice')) return 'Temporary Voice & 24/7 Radio';
    return 'AI Server Builder Console';
  };

  const inviteUrl = getBotInviteUrl({ guildId: guild.id });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0b111e]/90 border border-[#1e293b] backdrop-blur-xl mb-6 shadow-lg shadow-black/20">
      {/* Breadcrumbs & Active Page */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Link
            href="/dashboard"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            <span>Servers</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-300 truncate max-w-[150px]">{guild.name}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-cyan-400 font-semibold">{getPageTitle()}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            {getPageTitle()}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AiCord Bot Online • {guild.botVersion || 'v2.4.0'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Change Server</span>
        </Link>

        <a
          href={inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs font-mono shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02]"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Add to Discord</span>
          <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
        </a>
      </div>
    </div>
  );
}
