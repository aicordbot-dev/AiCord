'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Crown,
  Shield,
  Users,
  Search,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react';
import { getFallbackGuildData, type DashboardRole } from '@/lib/discord/server-data';

export default function RolesPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = params?.guildId || '111111111111111111';

  const data = getFallbackGuildData(guildId);
  const [search, setSearch] = useState('');

  const filteredRoles = data.roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Crown className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">
              Authority Matrix
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Roles & Permissions
          </h2>
          <p className="text-xs text-slate-400">
            Real server role hierarchy ordered from highest administrative power to @everyone.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070d16] border border-[#1e293b] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4 shadow-md hover:border-slate-700 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-4 h-4 rounded-full shrink-0 shadow-md"
                  style={{ backgroundColor: role.colorHex }}
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm font-mono truncate">
                    {role.name}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {role.colorHex.toUpperCase()} • Position {role.position}
                  </span>
                </div>
              </div>

              {role.isAdmin ? (
                <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono font-bold">
                  ADMINISTRATOR
                </span>
              ) : role.hoist ? (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono">
                  HOISTED
                </span>
              ) : null}
            </div>

            <div className="p-3 rounded-2xl bg-[#070d16] border border-[#1e293b] flex items-center justify-between text-xs font-mono text-slate-300">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{role.memberCount?.toLocaleString() || 0} members</span>
              </div>
              <div className="flex items-center gap-2">
                {role.mentionable && (
                  <span className="text-[10px] text-amber-400">Mentionable</span>
                )}
                <span className="text-slate-500">ID: {role.id.slice(0, 6)}...</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
