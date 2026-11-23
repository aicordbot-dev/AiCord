'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Server,
  Sparkles,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Zap,
  Activity,
  Bot,
  Layers,
} from 'lucide-react';
import { getBotInviteUrl } from '@/lib/discord/invite';

interface GuildItem {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions?: string;
  features: string[];
  approximate_member_count?: number;
  botPresent?: boolean;
}

export default function DashboardGuildPickerPage() {
  const [readyGuilds, setReadyGuilds] = useState<GuildItem[]>([]);
  const [addGuilds, setAddGuilds] = useState<GuildItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'pending'>('all');

  // Fetch servers from API
  const fetchGuilds = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      if (rateLimitCooldown > 0) return;
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await fetch('/api/guilds');
      if (res.status === 429) {
        setErrorMessage('Refresh rate limit reached. Please wait a few seconds.');
        setRateLimitCooldown(10);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load servers');
      }

      const data = await res.json();
      setReadyGuilds(data.ready || []);
      setAddGuilds(data.add || []);

      if (isManualRefresh) {
        setRateLimitCooldown(5); // 5s client cooldown
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not fetch your server list'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [rateLimitCooldown]);

  useEffect(() => {
    fetchGuilds();
  }, [fetchGuilds]);

  // Rate limit cooldown countdown timer
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  // Filtered lists based on search
  const filteredReady = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return readyGuilds;
    return readyGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [readyGuilds, searchQuery]);

  const filteredAdd = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return addGuilds;
    return addGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [addGuilds, searchQuery]);

  const totalServers = readyGuilds.length + addGuilds.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Discrofy Cluster Overview Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-[#0b111e] border border-[#1e293b] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Connected Servers
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {readyGuilds.length}
          </div>
          <span className="text-[11px] font-mono text-emerald-400">
            AiCord Bot Active
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-[#0b111e] border border-[#1e293b] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Pending Invites
            </span>
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {addGuilds.length}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Awaiting 1-Click Setup
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-[#0b111e] border border-[#1e293b] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Anti-Raid Matrix
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            99/100
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Fortified Protection
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-[#0b111e] border border-[#1e293b] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Engine Version
            </span>
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono mt-1">
            v2.4.0
          </div>
          <span className="text-[11px] font-mono text-cyan-400">
            Gemini 2.0 Flash
          </span>
        </div>
      </div>

      {/* Page Title & Search Bar Header */}
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              DISCROFY COMMAND CLUSTER
            </span>
            <span className="text-xs font-mono text-slate-400">
              {totalServers} {totalServers === 1 ? 'Server' : 'Servers'} Managed
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Select Server Command Center
          </h1>
          <p className="text-xs text-slate-400">
            Choose a server to launch the flagship AI Server Builder, customize channel trees, and inspect real-time AutoMod heuristics.
          </p>
        </div>

        {/* Search & Refresh Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070d16] border border-[#1e293b] hover:border-slate-700 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 text-xs font-mono text-white placeholder-slate-500 transition-all"
            />
          </div>

          <button
            onClick={() => fetchGuilds(true)}
            disabled={isRefreshing || rateLimitCooldown > 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#070d16] hover:bg-white/5 border border-[#1e293b] hover:border-cyan-500/30 text-xs font-mono text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
            title={rateLimitCooldown > 0 ? `Wait ${rateLimitCooldown}s` : 'Refresh server list'}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`}
            />
            <span className="hidden sm:inline">
              {rateLimitCooldown > 0 ? `${rateLimitCooldown}s` : 'Refresh'}
            </span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs font-mono text-amber-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e293b] pb-2 text-xs font-mono">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filterMode === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Servers ({totalServers})
        </button>
        <button
          onClick={() => setFilterMode('ready')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filterMode === 'ready'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          AiCord Active ({readyGuilds.length})
        </button>
        <button
          onClick={() => setFilterMode('pending')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filterMode === 'pending'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Pending Invite ({addGuilds.length})
        </button>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-3xl bg-[#0b111e] border border-[#1e293b] animate-pulse p-6 space-y-4"
            />
          ))}
        </div>
      )}

      {/* Server Grids */}
      {!isLoading && (
        <div className="space-y-10">
          {/* Ready Servers Section */}
          {(filterMode === 'all' || filterMode === 'ready') && filteredReady.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Active Discrofy Communities
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {filteredReady.length} Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredReady.map((guild) => (
                  <DiscrofyServerCard key={guild.id} guild={guild} isReady={true} />
                ))}
              </div>
            </section>
          )}

          {/* Add AiCord Servers Section */}
          {(filterMode === 'all' || filterMode === 'pending') && filteredAdd.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Add AiCord to Server
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {filteredAdd.length} Unconnected
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAdd.map((guild) => (
                  <DiscrofyServerCard key={guild.id} guild={guild} isReady={false} />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {filteredReady.length === 0 && filteredAdd.length === 0 && (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
                <Server className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-mono">
                  No Discord Servers Match Query
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `No servers matched "${searchQuery}". Try a different search term.`
                    : 'You must have "Manage Server" or "Administrator" permissions on a Discord server to architect it with AiCord.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Discrofy-style Server Card with dark slate container and glowing accents.
 */
function DiscrofyServerCard({ guild, isReady }: { guild: GuildItem; isReady: boolean }) {
  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : null;

  const initials = guild.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const redirectUri =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/invite-complete?guild_id=${guild.id}`
      : undefined;

  const inviteLink = getBotInviteUrl({
    guildId: guild.id,
    redirectUri,
  });

  return (
    <div className="group rounded-3xl p-5 bg-[#0b111e] border border-[#1e293b] hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500 pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-start gap-3.5 relative z-10">
        {/* Guild Avatar */}
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-[1.5px] shadow-md shadow-cyan-500/10">
          <div className="w-full h-full rounded-[14px] bg-[#070d16] flex items-center justify-center font-bold font-mono text-cyan-300 text-xs overflow-hidden">
            {iconUrl ? (
              <Image
                src={iconUrl}
                alt={guild.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span>{initials || 'DC'}</span>
            )}
          </div>
        </div>

        {/* Guild Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
            {guild.name}
          </h3>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            {guild.owner ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Owner
              </span>
            ) : (
              <span className="text-cyan-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Manager
              </span>
            )}
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Users className="w-3 h-3" />
              {(guild.approximate_member_count || 1420).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action */}
      <div className="mt-5 pt-3.5 border-t border-[#1e293b] flex items-center justify-between relative z-10">
        {isReady ? (
          <>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              AiCord Active
            </span>
            <Link
              href={`/dashboard/${guild.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold transition-all group-hover:scale-105"
            >
              <span>Manage Server</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        ) : (
          <>
            <span className="text-[11px] font-mono text-slate-400">
              Bot Not Installed
            </span>
            <a
              href={inviteLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-extrabold text-xs font-mono shadow-md shadow-cyan-500/25 transition-all group-hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add AiCord</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
