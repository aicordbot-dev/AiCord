'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  FolderTree,
  Hash,
  Volume2,
  Megaphone,
  Lock,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Layers,
  Radio,
  Clock,
} from 'lucide-react';
import { getFallbackGuildData, type DashboardChannel, type DashboardCategory } from '@/lib/discord/server-data';

export default function ChannelsPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = params?.guildId || '111111111111111111';

  const data = getFallbackGuildData(guildId);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (catId: string) => {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data.categories;

    return data.categories
      .map((cat) => ({
        ...cat,
        channels: cat.channels.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.topic && c.topic.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.channels.length > 0 || cat.name.toLowerCase().includes(q));
  }, [data.categories, search]);

  const channelIcon = (ch: DashboardChannel) => {
    if (ch.type === 2 || ch.type === 13) {
      return <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
    if (ch.type === 5) {
      return <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (ch.isLocked) {
      return <Lock className="w-4 h-4 text-red-400 shrink-0" />;
    }
    return <Hash className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Search */}
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FolderTree className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Channel Topology
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Channels & Categories
          </h2>
          <p className="text-xs text-slate-400">
            Real server channels organized by category hierarchy and Discord permissions.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070d16] border border-[#1e293b] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Categories Tree */}
      <div className="space-y-4">
        {filteredCategories.map((cat) => {
          const isCollapsed = collapsed[cat.id];

          return (
            <div
              key={cat.id}
              className="p-4 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-3 shadow-md"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-2 text-xs font-mono font-bold text-slate-300 hover:text-white uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                  <span>{cat.name}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 font-normal">
                  {cat.channels.length} {cat.channels.length === 1 ? 'channel' : 'channels'}
                </span>
              </button>

              {/* Channels */}
              {!isCollapsed && (
                <div className="space-y-1.5 pt-1">
                  {cat.channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#070d16] border border-[#1e293b] hover:border-slate-700 transition-all text-xs font-mono"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {channelIcon(ch)}
                        <span className="font-bold text-white tracking-wide truncate">
                          {ch.name}
                        </span>
                        {ch.topic && (
                          <span className="hidden md:inline text-[11px] text-slate-500 truncate max-w-md">
                            — {ch.topic}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ch.isLocked && (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">
                            Locked
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5 text-[10px] uppercase">
                          {ch.typeName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
