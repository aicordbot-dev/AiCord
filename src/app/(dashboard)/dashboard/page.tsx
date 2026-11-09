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
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Page Title & Search Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              CLUSTER SELECTOR
            </span>
            <span className="text-xs font-mono text-gray-400">
              {totalServers} {totalServers === 1 ? 'Server' : 'Servers'} Available
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Select Your Server
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Choose a server to configure automation, architect roles, and preview 3D blueprints.
          </p>
        </div>

        {/* Search & Refresh Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 text-xs font-mono text-white placeholder-gray-500 transition-all"
            />
          </div>

          <button
            onClick={() => fetchGuilds(true)}
            disabled={isRefreshing || rateLimitCooldown > 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30 text-xs font-mono text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
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
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs sm:text-sm text-amber-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="w-48 h-6 bg-white/5 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse p-6 space-y-4"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ready Servers Section */}
      {!isLoading && (
        <div className="space-y-12">
          {filteredReady.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                  Ready Servers
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {filteredReady.length} Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredReady.map((guild) => (
                  <ServerCard key={guild.id} guild={guild} isReady={true} />
                ))}
              </div>
            </section>
          )}

          {/* Add AiCord Servers Section */}
          {filteredAdd.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                  Add AiCord to Server
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {filteredAdd.length} Unconnected
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAdd.map((guild) => (
                  <ServerCard key={guild.id} guild={guild} isReady={false} />
                ))}
              </div>
            </section>
          )}

          {/* Empty State when no servers match */}
          {filteredReady.length === 0 && filteredAdd.length === 0 && (
            <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
                <Server className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  No Manageable Servers Found
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `No servers matched "${searchQuery}". Try a different filter.`
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
 * 3D-feeling interactive Server Card with CSS tilt & glowing hover border.
 */
function ServerCard({ guild, isReady }: { guild: GuildItem; isReady: boolean }) {
  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : null;

  // Generate 2-character initials
  const initials = guild.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Invite URL redirecting to /dashboard/invite-complete
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard/invite-complete?guild_id=${guild.id}`
    : undefined;

  const inviteLink = getBotInviteUrl({
    guildId: guild.id,
    redirectUri,
  });

  return (
    <div className="relative group rounded-2xl p-5 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between backdrop-blur-md overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500 pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-start gap-4">
        {/* Guild Icon / Initials */}
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-tr from-cyan-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-sm font-bold font-mono text-cyan-300">
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

        {/* Guild Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
            {guild.name}
          </h3>
          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
            {guild.owner ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Owner
              </span>
            ) : (
              <span className="text-cyan-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Manager
              </span>
            )}
            {guild.approximate_member_count !== undefined && (
              <span className="flex items-center gap-1 text-gray-400">
                <Users className="w-3 h-3" />
                {guild.approximate_member_count.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Action */}
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
        {isReady ? (
          <>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              AiCord Connected
            </span>
            <Link
              href={`/dashboard/${guild.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-medium transition-all group-hover:scale-105"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        ) : (
          <>
            <span className="text-[11px] font-mono text-gray-400">
              Bot Not Installed
            </span>
            <a
              href={inviteLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-mono font-medium shadow-md shadow-cyan-500/25 transition-all group-hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Bot</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
