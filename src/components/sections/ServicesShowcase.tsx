'use client';

/**
 * src/components/sections/ServicesShowcase.tsx
 * Ultra-sleek, compact minimal warm cream multi-colored services showcase.
 * Features:
 * 1. Compact default view: Top 6 Core Spotlight Services in a clean 3x2 grid.
 * 2. "Explore All 28 Services" (+22 more available) toggle with smooth expansion.
 * 3. Tabbed category filtering (AI Architect, Moderation, Economy, Engagement, Dev Tools, Voice & Audio).
 * 4. Compact uniform card dimensions without bloated bullet lists.
 * 5. Quick interactive command directory chips at the bottom opening Command Palette.
 * 6. Tight vertical spacing and warm cream (#FDFBF7) aesthetic.
 */

import React, { useState } from 'react';
import { copyConfig } from '@/config/copy';
import { MASTER_SERVICES, NEXT_GEN_SERVICES, ServiceFeature } from '@/config/features';
import { Badge } from '@/components/ui/Badge';
import { openCommandPalette } from '@/components/ui/CommandPalette';
import { playPop, playSuccess } from '@/lib/audio';

export type ServiceFilterTab =
  | 'all'
  | 'architect'
  | 'moderation'
  | 'economy'
  | 'engagement'
  | 'devtools'
  | 'voice';

interface ServiceThemeColor {
  accent: string;
  bgLight: string;
  borderLight: string;
  badgeBg: string;
  badgeText: string;
  name: string;
}

const SERVICE_THEMES: Record<string, ServiceThemeColor> = {
  // ─── AI Architect (#0284C7) ───────────────────────────────────────────────
  build: {
    accent: '#0284C7',
    bgLight: '#F0F9FF',
    borderLight: '#BAE6FD',
    badgeBg: '#E0F2FE',
    badgeText: '#0284C7',
    name: 'AI Architect',
  },
  customize: {
    accent: '#0284C7',
    bgLight: '#F0F9FF',
    borderLight: '#BAE6FD',
    badgeBg: '#E0F2FE',
    badgeText: '#0284C7',
    name: 'AI Architect',
  },
  premium: {
    accent: '#0284C7',
    bgLight: '#F0F9FF',
    borderLight: '#BAE6FD',
    badgeBg: '#E0F2FE',
    badgeText: '#0284C7',
    name: 'AI Architect',
  },
  audit: {
    accent: '#0284C7',
    bgLight: '#F0F9FF',
    borderLight: '#BAE6FD',
    badgeBg: '#E0F2FE',
    badgeText: '#0284C7',
    name: 'AI Architect',
  },

  // ─── Moderation & Safety (#E11D48) ─────────────────────────────────────────
  ban: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Safety',
  },
  kick: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Safety',
  },
  timeout: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Safety',
  },
  mute: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Safety',
  },
  warn: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Safety',
  },
  purge: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Safety',
  },
  role: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Ops',
  },
  channel: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Ops',
  },
  category: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Ops',
  },
  lockdown: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Safety',
  },

  // ─── Economy & Progression (#D97706) ───────────────────────────────────────
  balance: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Economy & Bank',
  },
  daily: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Economy & Streaks',
  },
  shop: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Server Shop',
  },
  leaderboard: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Leaderboards',
  },
  casino: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Casino & Games',
  },
  adventure: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'RPG Adventure',
  },

  // ─── Levels, Engagement & Social (#7C3AED / #DB2777 / #059669) ─────────────
  rank: {
    accent: '#7C3AED',
    bgLight: '#F5F3FF',
    borderLight: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#7C3AED',
    name: 'Levels & Reputation',
  },
  ticket: {
    accent: '#059669',
    bgLight: '#ECFDF5',
    borderLight: '#A7F3D0',
    badgeBg: '#D1FAE5',
    badgeText: '#059669',
    name: 'Tickets & Support',
  },
  confess: {
    accent: '#DB2777',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
    name: 'Confessions & Social',
  },
  pet: {
    accent: '#DB2777',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
    name: 'Pets & RPG Duels',
  },
  worldclock: {
    accent: '#7C3AED',
    bgLight: '#F5F3FF',
    borderLight: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#7C3AED',
    name: 'Timezones & Teams',
  },
  quiz: {
    accent: '#DB2777',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
    name: 'Multiplayer Quiz',
  },
  countdown: {
    accent: '#7C3AED',
    bgLight: '#F5F3FF',
    borderLight: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#7C3AED',
    name: 'Event Countdowns',
  },

  // ─── Dev Tools & Sandboxing (#0D9488) ──────────────────────────────────────
  run: {
    accent: '#0D9488',
    bgLight: '#F0FDFA',
    borderLight: '#99F6E4',
    badgeBg: '#CCFBF1',
    badgeText: '#0D9488',
    name: 'Polyglot Sandbox',
  },
  git: {
    accent: '#0D9488',
    bgLight: '#F0FDFA',
    borderLight: '#99F6E4',
    badgeBg: '#CCFBF1',
    badgeText: '#0D9488',
    name: 'Git & Pipelines',
  },
  github: {
    accent: '#0D9488',
    bgLight: '#F0FDFA',
    borderLight: '#99F6E4',
    badgeBg: '#CCFBF1',
    badgeText: '#0D9488',
    name: 'Git & Pipelines',
  },

  // ─── Voice & Audio (#EA580C) ───────────────────────────────────────────────
  tempvc: {
    accent: '#EA580C',
    bgLight: '#FFF7ED',
    borderLight: '#FFEDD5',
    badgeBg: '#FFEDD5',
    badgeText: '#EA580C',
    name: 'Dynamic Voice Rooms',
  },
  transcribe: {
    accent: '#EA580C',
    bgLight: '#FFF7ED',
    borderLight: '#FFEDD5',
    badgeBg: '#FFEDD5',
    badgeText: '#EA580C',
    name: 'Voice Transcriber',
  },
  clip: {
    accent: '#EA580C',
    bgLight: '#FFF7ED',
    borderLight: '#FFEDD5',
    badgeBg: '#FFEDD5',
    badgeText: '#EA580C',
    name: 'Gaming Clips',
  },
  radio: {
    accent: '#EA580C',
    bgLight: '#FFF7ED',
    borderLight: '#FFEDD5',
    badgeBg: '#FFEDD5',
    badgeText: '#EA580C',
    name: '24/7 Lo-Fi Radio',
  },
};

const DEFAULT_THEME: ServiceThemeColor = {
  accent: '#5865F2',
  bgLight: '#F5F3FF',
  borderLight: '#DDD6FE',
  badgeBg: '#EDE9FE',
  badgeText: '#5865F2',
  name: 'Core Service',
};

// ─── Top 6 Core Spotlight Services ─────────────────────────────────────────────
const SPOTLIGHT_SERVICE_IDS = ['build', 'ban', 'balance', 'rank', 'ticket', 'tempvc'];

// ─── Interactive Command Directory Chips ──────────────────────────────────────
const DIRECTORY_COMMANDS = [
  '/build',
  '/ticket',
  '/rank',
  '/balance',
  '/blackjack',
  '/confess',
  '/run',
  '/radio',
  '/temp-vc',
  '/transcribe',
  '/ban',
  '/warn',
  '/daily',
  '/pet',
  '/worldclock',
  '/git',
  '/quiz',
  '/giveaway',
  '/customize',
  '/audit',
];

export function ServicesShowcase() {
  const [activeTab, setActiveTab] = useState<ServiceFilterTab>('all');
  const [isExpandedAll, setIsExpandedAll] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [highlightedServiceId, setHighlightedServiceId] = useState<string | null>(null);

  // Combine and sort all 28 services so top spotlight services appear first
  const combinedServices: ServiceFeature[] = [...MASTER_SERVICES, ...NEXT_GEN_SERVICES];
  const allServices: ServiceFeature[] = [
    ...combinedServices.filter((s) => SPOTLIGHT_SERVICE_IDS.includes(s.id)),
    ...combinedServices.filter((s) => !SPOTLIGHT_SERVICE_IDS.includes(s.id)),
  ];

  const filterTabs: { id: ServiceFilterTab; label: string; count: number; color: string }[] = [
    { id: 'all', label: 'All Services', count: allServices.length, color: '#1C1917' },
    {
      id: 'architect',
      label: 'AI Architect',
      count: allServices.filter((s) => ['build', 'customize', 'premium', 'audit'].includes(s.id)).length,
      color: '#0284C7',
    },
    {
      id: 'moderation',
      label: 'Moderation & Safety',
      count: allServices.filter((s) => ['ban', 'kick', 'timeout', 'warn', 'purge', 'role', 'channel', 'category'].includes(s.id)).length,
      color: '#E11D48',
    },
    {
      id: 'economy',
      label: 'Economy & Games',
      count: allServices.filter((s) => ['balance', 'daily', 'shop', 'leaderboard'].includes(s.id)).length,
      color: '#D97706',
    },
    {
      id: 'engagement',
      label: 'Engagement & Social',
      count: allServices.filter((s) => ['rank', 'ticket', 'confess', 'pet', 'worldclock', 'quiz', 'countdown'].includes(s.id)).length,
      color: '#7C3AED',
    },
    {
      id: 'devtools',
      label: 'Dev Tools',
      count: allServices.filter((s) => ['run', 'git'].includes(s.id)).length,
      color: '#0D9488',
    },
    {
      id: 'voice',
      label: 'Voice & Audio',
      count: allServices.filter((s) => ['tempvc', 'transcribe', 'clip'].includes(s.id)).length,
      color: '#EA580C',
    },
  ];

  const getFilteredServices = (): ServiceFeature[] => {
    if (activeTab === 'architect') {
      return allServices.filter((s) => ['build', 'customize', 'premium', 'audit'].includes(s.id));
    }
    if (activeTab === 'moderation') {
      return allServices.filter((s) => ['ban', 'kick', 'timeout', 'warn', 'purge', 'role', 'channel', 'category'].includes(s.id));
    }
    if (activeTab === 'economy') {
      return allServices.filter((s) => ['balance', 'daily', 'shop', 'leaderboard'].includes(s.id));
    }
    if (activeTab === 'engagement') {
      return allServices.filter((s) => ['rank', 'ticket', 'confess', 'pet', 'worldclock', 'quiz', 'countdown'].includes(s.id));
    }
    if (activeTab === 'devtools') {
      return allServices.filter((s) => ['run', 'git'].includes(s.id));
    }
    if (activeTab === 'voice') {
      return allServices.filter((s) => ['tempvc', 'transcribe', 'clip'].includes(s.id));
    }
    // Default 'all' view: show top 6 core spotlight services, or expand to all 28
    if (!isExpandedAll) {
      return allServices.slice(0, 6);
    }
    return allServices;
  };

  const displayedServices = getFilteredServices();

  const handleTabChange = (tabId: ServiceFilterTab) => {
    setActiveTab(tabId);
    playPop(520);
  };

  const handleCommandClick = (cmd: string) => {
    playPop(600);
    // Find matching service if any to flash highlight
    const matching = allServices.find((s) => s.commands.some((c) => c.toLowerCase() === cmd.toLowerCase()));
    if (matching) {
      setHighlightedServiceId(matching.id);
      setTimeout(() => setHighlightedServiceId(null), 2400);
    }
    openCommandPalette(cmd);
  };

  const remainingCount = allServices.length - 6;

  return (
    <section id="features" className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E7E2DA]">
      {/* ─── Section Header ─────────────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E7E2DA] shadow-2xs text-xs font-mono text-[#57534E]">
          <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
          <span className="font-semibold text-[#1C1917]">{copyConfig.sections.features.badge}</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-[#1C1917] tracking-tight font-mono">
          {copyConfig.sections.features.title}
        </h2>

        <p className="text-xs sm:text-sm text-[#57534E] font-sans font-medium leading-relaxed max-w-2xl mx-auto">
          {copyConfig.sections.features.description}
        </p>

        {/* Filter Tabs with Multi-Colored Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-3">
          {filterTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs scale-[1.02]'
                    : 'bg-white text-[#57534E] border-[#E7E2DA] hover:text-[#1C1917] hover:bg-stone-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#78716C]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Compact Services Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {displayedServices.map((svc) => {
          const theme = SERVICE_THEMES[svc.id] || DEFAULT_THEME;
          const isExpandedSample = selectedPreview === svc.id;
          const isHighlighted = highlightedServiceId === svc.id;

          return (
            <div
              key={svc.id}
              className={`rounded-2xl bg-white border border-[#E7E2DA] p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group hover:-translate-y-0.5 relative overflow-hidden ${
                isHighlighted ? 'ring-2 ring-[#5865F2] shadow-md scale-[1.01]' : ''
              }`}
              style={{
                borderTopColor: theme.accent,
                borderTopWidth: '3px',
              }}
            >
              <div>
                {/* Header: Compact Icon + Badges */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-2xs transition-transform group-hover:scale-105 shrink-0"
                      style={{
                        backgroundColor: theme.bgLight,
                        borderColor: theme.borderLight,
                        borderWidth: '1px',
                      }}
                    >
                      <span>{svc.icon}</span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#1C1917] font-mono group-hover:text-[#5865F2] transition-colors truncate">
                        {svc.name}
                      </h3>
                      {/* Command Chip */}
                      <div className="flex items-center gap-1 mt-0.5">
                        {svc.commands.slice(0, 2).map((cmd) => (
                          <button
                            key={cmd}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommandClick(cmd);
                            }}
                            className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded hover:opacity-80 transition-opacity cursor-pointer truncate max-w-[120px]"
                            style={{
                              backgroundColor: theme.bgLight,
                              color: theme.accent,
                              border: `1px solid ${theme.borderLight}`,
                            }}
                            title={`Click to test ${cmd} in Command Palette`}
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {svc.isNextGen && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight"
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.badgeText,
                        }}
                      >
                        NEXT-GEN
                      </span>
                    )}
                    <Badge tier={svc.tier} size="sm" />
                  </div>
                </div>

                {/* Tight Crisp 1-2 Sentence Description */}
                <p className="text-xs text-[#57534E] font-sans leading-relaxed line-clamp-2 mb-3">
                  {svc.pitch || svc.description}
                </p>
              </div>

              {/* Bottom Footer Row with Category Tag & Sample Preview Toggle */}
              <div>
                <div className="pt-2.5 border-t border-[#E7E2DA]/80 flex items-center justify-between text-[11px] font-mono text-[#78716C]">
                  <span
                    className="inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md text-[10px]"
                    style={{
                      backgroundColor: theme.bgLight,
                      color: theme.accent,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                    {theme.name}
                  </span>

                  <button
                    onClick={() => {
                      setSelectedPreview(isExpandedSample ? null : svc.id);
                      playPop(650);
                    }}
                    className="font-bold hover:underline transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                    style={{ color: theme.accent }}
                  >
                    <span>{isExpandedSample ? 'Hide' : 'Sample'}</span>
                    <span>{isExpandedSample ? '▲' : '▼'}</span>
                  </button>
                </div>

                {/* Interactive Mini-Embed / Usage Preview */}
                {isExpandedSample && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#2B2D31] text-gray-200 font-mono text-[11px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between text-gray-400 text-[9px] uppercase tracking-wider mb-1">
                      <span>Sample Command</span>
                      <button
                        onClick={() => handleCommandClick(svc.commands[0])}
                        className="text-[#00F0FF] hover:underline cursor-pointer font-bold"
                      >
                        Test ↗
                      </button>
                    </div>
                    <div className="p-1.5 rounded bg-[#1E1F22] text-[#00F0FF] break-all border border-white/5 font-semibold text-[10px]">
                      {svc.sampleUsage}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── "Explore All 28 Services" / "Show Less" Toggle Button (All View) ─ */}
      {activeTab === 'all' && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isExpandedAll ? (
            <button
              onClick={() => {
                setIsExpandedAll(true);
                playSuccess();
              }}
              className="group inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white border border-[#E7E2DA] hover:border-[#1C1917] text-[#1C1917] font-mono text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <span>Explore All 28 Services</span>
              <span className="px-2 py-0.5 rounded-full bg-[#1C1917] text-white text-[10px] font-bold">
                +{remainingCount} more services available
              </span>
              <span className="text-sm group-hover:translate-y-0.5 transition-transform">↓</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsExpandedAll(false);
                playPop(480);
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] hover:bg-[#EDE9FE] font-mono text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <span>Show Less (Top 6 Spotlight Only)</span>
              <span className="text-sm group-hover:-translate-y-0.5 transition-transform">↑</span>
            </button>
          )}
        </div>
      )}

      {/* ─── Quick Command Directory Chips ──────────────────────────────────── */}
      <div className="mt-10 sm:mt-12 p-4 sm:p-5 rounded-2xl bg-[#FDFBF7] border border-[#E7E2DA] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base">⚡</span>
            <span className="text-xs font-mono font-bold text-[#1C1917] uppercase tracking-wider">
              Instant Slash Command Directory
            </span>
            <span className="text-[10px] font-mono text-[#78716C] bg-white px-2 py-0.5 rounded-full border border-[#E7E2DA]">
              Click any chip to test in simulator
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#78716C]">
            <span>Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#E7E2DA] rounded font-bold text-[#1C1917] text-[10px]">
              /
            </kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#E7E2DA] rounded font-bold text-[#1C1917] text-[10px]">
              Ctrl+K
            </kbd>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {DIRECTORY_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleCommandClick(cmd)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2DA] hover:border-[#5865F2] hover:bg-[#5865F2]/5 hover:text-[#5865F2] text-[#1C1917] font-mono text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95 flex items-center gap-1 group"
            >
              <span className="text-[#5865F2] font-black group-hover:scale-110 transition-transform">/</span>
              <span>{cmd.replace(/^\//, '')}</span>
            </button>
          ))}
          <button
            onClick={() => {
              openCommandPalette();
              playPop(520);
            }}
            className="px-3 py-1 rounded-lg bg-[#1C1917] hover:bg-stone-800 text-white font-mono text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95 flex items-center gap-1"
          >
            <span>All 28+ Commands</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default ServicesShowcase;
