'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  ShieldCheck,
  FolderTree,
  Crown,
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  Coins,
  Radio,
  CreditCard,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  Bot,
  Zap,
} from 'lucide-react';
import type { DashboardGuild } from '@/lib/discord/server-data';
import { getBotInviteUrl } from '@/lib/discord/invite';

interface DashboardSidebarProps {
  guild: DashboardGuild;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  exact?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function DashboardSidebar({ guild }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const baseUrl = `/dashboard/${guild.id}`;

  const navGroups: NavGroup[] = [
    {
      group: 'AI BUILDER',
      items: [
        {
          name: 'AI Server Builder',
          href: baseUrl,
          icon: Sparkles,
          badge: 'FLAGSHIP',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          exact: true,
        },
      ],
    },
    {
      group: 'MANAGEMENT',
      items: [
        {
          name: 'Overview & Analytics',
          href: `${baseUrl}/overview`,
          icon: LayoutDashboard,
        },
        {
          name: 'AutoMod & Security',
          href: `${baseUrl}/automod`,
          icon: ShieldCheck,
          badge: '99/100',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        },
        {
          name: 'Channels & Categories',
          href: `${baseUrl}/channels`,
          icon: FolderTree,
        },
        {
          name: 'Roles & Permissions',
          href: `${baseUrl}/roles`,
          icon: Crown,
        },
      ],
    },
    {
      group: 'COMMUNITY',
      items: [
        {
          name: 'Tickets & Transcripts',
          href: `${baseUrl}/tickets`,
          icon: MessageSquare,
        },
        {
          name: 'Levels & XP',
          href: `${baseUrl}/levels`,
          icon: TrendingUp,
        },
        {
          name: 'Economy & Bank',
          href: `${baseUrl}/economy`,
          icon: Coins,
        },
        {
          name: 'Voice & 24/7 Radio',
          href: `${baseUrl}/voice`,
          icon: Radio,
        },
      ],
    },
    {
      group: 'SETTINGS',
      items: [
        {
          name: 'Settings & Billing',
          href: `${baseUrl}/billing`,
          icon: CreditCard,
          badge: guild.tier.toUpperCase(),
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        },
      ],
    },
  ];

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

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const inviteUrl = getBotInviteUrl({ guildId: guild.id });

  return (
    <>
      {/* Mobile Hamburger Toggle Bar */}
      <div className="lg:hidden flex items-center justify-between p-3.5 bg-[#0b111e] border-b border-[#1e293b] rounded-2xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0 border border-white/10">
            {iconUrl ? (
              <Image src={iconUrl} alt={guild.name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
            ) : (
              initials || 'DC'
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate max-w-[160px]">{guild.name}</h2>
            <span className="text-[10px] text-cyan-400 font-mono">Discrofy Console</span>
          </div>
        </div>

        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {isOpenMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-20 inset-y-0 left-0 z-50 lg:z-10 w-72 h-screen lg:h-[calc(100vh-6rem)] bg-[#070d16] border-r border-[#1e293b] flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Server Header Card with Switcher Toggle */}
        <div className="p-4 border-b border-[#1e293b] bg-[#0b111e]/90 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-[1.5px] shrink-0 shadow-lg shadow-cyan-500/10">
                <div className="w-full h-full rounded-[14px] bg-[#070d16] flex items-center justify-center overflow-hidden font-bold font-mono text-cyan-300 text-xs">
                  {iconUrl ? (
                    <Image src={iconUrl} alt={guild.name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span>{initials || 'DC'}</span>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-white tracking-tight truncate" title={guild.name}>
                  {guild.name}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-mono text-slate-400">
                    {guild.memberCount.toLocaleString()} members
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0 border border-white/5"
              title="Switch Server"
              aria-label="Server options"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSwitcherOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Plan Badge Pill */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-semibold">
              <Zap className="w-2.5 h-2.5" />
              {guild.planBadge || 'PRO CLOUD'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ID: {guild.id.slice(0, 6)}...
            </span>
          </div>

          {/* Quick Switcher Dropdown */}
          {isSwitcherOpen && (
            <div className="absolute top-full left-4 right-4 mt-2 p-2 bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl z-30 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <Link
                href="/dashboard"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-mono text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setIsSwitcherOpen(false)}
              >
                <span>Switch Server</span>
                <span className="text-[10px] text-cyan-400">Picker →</span>
              </Link>
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-mono text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <span>Add AiCord to another</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 pb-1">
                <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                  {group.group}
                </span>
              </div>

              {group.items.map((item) => {
                const active = isItemActive(item);
                const IconComponent = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpenMobile(false)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.12)] font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active
                            ? 'text-cyan-400'
                            : 'text-slate-400 group-hover:text-cyan-300'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          item.badgeColor || 'bg-white/5 text-slate-300 border-white/10'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Bot Status & Security Indicator */}
        <div className="p-3 border-t border-[#1e293b] bg-[#0b111e]/70 space-y-2">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-slate-300">AiCord Bot Online</span>
            </div>
            <span className="text-cyan-400 font-semibold">{guild.botVersion || 'v2.4.0'}</span>
          </div>

          <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-500">
            <span>Anti-Raid Matrix</span>
            <span className="text-emerald-400 font-semibold">99/100 Armed</span>
          </div>
        </div>
      </aside>
    </>
  );
}
