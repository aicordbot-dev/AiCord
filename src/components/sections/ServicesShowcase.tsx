'use client';

/**
 * src/components/sections/ServicesShowcase.tsx
 * Ultra-clean, minimal warm cream multi-colored services showcase
 * inspired by top Discord bots (MEE6, Sapphire, Discrofy).
 * Features filterable tabs, distinct saturated pastel accent colors for each service,
 * command badges, feature bullet points, and interactive mini-embed preview.
 */

import React, { useState } from 'react';
import { copyConfig } from '@/config/copy';
import { MASTER_SERVICES, NEXT_GEN_SERVICES, ServiceFeature } from '@/config/features';
import { Badge } from '@/components/ui/Badge';

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
  // AI Architect
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

  // Moderation & Security
  ban: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Security',
  },
  mute: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Security',
  },
  kick: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Security',
  },
  warn: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Security',
  },
  lockdown: {
    accent: '#E11D48',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#E11D48',
    name: 'Moderation & Security',
  },

  // Economy & Casino
  balance: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Economy & Casino',
  },
  daily: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Economy & Casino',
  },
  transfer: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Economy & Casino',
  },
  casino: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Economy & Casino',
  },
  adventure: {
    accent: '#D97706',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    name: 'Economy & Games',
  },

  // Levels & Leaderboards
  rank: {
    accent: '#7C3AED',
    bgLight: '#F5F3FF',
    borderLight: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#7C3AED',
    name: 'Levels & Leaderboard',
  },
  starboard: {
    accent: '#7C3AED',
    bgLight: '#F5F3FF',
    borderLight: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#7C3AED',
    name: 'Levels & Leaderboard',
  },
  reactionrole: {
    accent: '#7C3AED',
    bgLight: '#F5F3FF',
    borderLight: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#7C3AED',
    name: 'Engagement',
  },

  // Tickets & Support
  ticket: {
    accent: '#059669',
    bgLight: '#ECFDF5',
    borderLight: '#A7F3D0',
    badgeBg: '#D1FAE5',
    badgeText: '#059669',
    name: 'Tickets & Support',
  },

  // Confessions & Community Engagement
  confess: {
    accent: '#DB2777',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
    name: 'Confessions & Social',
  },
  trivia: {
    accent: '#DB2777',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
    name: 'Engagement & Quiz',
  },
  giveaway: {
    accent: '#DB2777',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
    name: 'Giveaways & Events',
  },
  pet: {
    accent: '#DB2777',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
    name: 'Pets & Companions',
  },
  worldclock: {
    accent: '#DB2777',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    badgeBg: '#FCE7F3',
    badgeText: '#DB2777',
    name: 'Timezones & Community',
  },

  // Dev Tools & Polyglot Sandbox
  run: {
    accent: '#0D9488',
    bgLight: '#F0FDFA',
    borderLight: '#99F6E4',
    badgeBg: '#CCFBF1',
    badgeText: '#0D9488',
    name: 'Polyglot Sandbox & Dev',
  },
  github: {
    accent: '#0D9488',
    bgLight: '#F0FDFA',
    borderLight: '#99F6E4',
    badgeBg: '#CCFBF1',
    badgeText: '#0D9488',
    name: 'Git & Pipelines',
  },

  // Voice & Audio
  radio: {
    accent: '#EA580C',
    bgLight: '#FFF7ED',
    borderLight: '#FFEDD5',
    badgeBg: '#FFEDD5',
    badgeText: '#EA580C',
    name: '24/7 Voice Radio',
  },
  clips: {
    accent: '#EA580C',
    bgLight: '#FFF7ED',
    borderLight: '#FFEDD5',
    badgeBg: '#FFEDD5',
    badgeText: '#EA580C',
    name: 'Voice Clips & Transcripts',
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

export function ServicesShowcase() {
  const [activeTab, setActiveTab] = useState<ServiceFilterTab>('all');
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  const allServices: ServiceFeature[] = [...NEXT_GEN_SERVICES, ...MASTER_SERVICES];

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
      count: allServices.filter((s) => ['ban', 'mute', 'kick', 'warn', 'lockdown'].includes(s.id)).length,
      color: '#E11D48',
    },
    {
      id: 'economy',
      label: 'Economy & Games',
      count: allServices.filter((s) => ['balance', 'daily', 'transfer', 'casino', 'adventure'].includes(s.id)).length,
      color: '#D97706',
    },
    {
      id: 'engagement',
      label: 'Engagement & Social',
      count: allServices.filter((s) => ['confess', 'rank', 'starboard', 'giveaway', 'pet', 'trivia', 'worldclock', 'reactionrole'].includes(s.id)).length,
      color: '#7C3AED',
    },
    {
      id: 'devtools',
      label: 'Dev Tools & Sandboxing',
      count: allServices.filter((s) => ['run', 'github'].includes(s.id)).length,
      color: '#0D9488',
    },
    {
      id: 'voice',
      label: '24/7 Voice & Audio',
      count: allServices.filter((s) => ['radio', 'clips'].includes(s.id)).length,
      color: '#EA580C',
    },
  ];

  const filteredServices = allServices.filter((svc) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'architect') return ['build', 'customize', 'premium', 'audit'].includes(svc.id);
    if (activeTab === 'moderation') return ['ban', 'mute', 'kick', 'warn', 'lockdown'].includes(svc.id);
    if (activeTab === 'economy') return ['balance', 'daily', 'transfer', 'casino', 'adventure'].includes(svc.id);
    if (activeTab === 'engagement') return ['confess', 'rank', 'starboard', 'giveaway', 'pet', 'trivia', 'worldclock', 'reactionrole'].includes(svc.id);
    if (activeTab === 'devtools') return ['run', 'github'].includes(svc.id);
    if (activeTab === 'voice') return ['radio', 'clips'].includes(svc.id);
    return true;
  });

  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E7E2DA]">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
          <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
          <span className="font-semibold text-[#1C1917]">{copyConfig.sections.features.badge}</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
          {copyConfig.sections.features.title}
        </h2>

        <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
          {copyConfig.sections.features.description}
        </p>

        {/* Filter Tabs with Multi-Colored Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {filterTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-sm scale-[1.02]'
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

      {/* Services Grid with Multi-Colored Accent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((svc) => {
          const theme = SERVICE_THEMES[svc.id] || DEFAULT_THEME;
          const isExpanded = selectedPreview === svc.id;

          return (
            <div
              key={svc.id}
              className="rounded-3xl bg-white border border-[#E7E2DA] p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1 relative overflow-hidden"
              style={{
                borderTopColor: theme.accent,
                borderTopWidth: '3px',
              }}
            >
              <div>
                {/* Header: Icon with Pastel Tint & Tier Badges */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: theme.bgLight,
                      borderColor: theme.borderLight,
                      borderWidth: '1px',
                    }}
                  >
                    <span>{svc.icon}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {svc.isNextGen && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
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

                {/* Service Name & Pitch */}
                <h3 className="text-base font-bold text-[#1C1917] font-mono mb-1.5 group-hover:text-[#5865F2] transition-colors">
                  {svc.name}
                </h3>
                <p className="text-xs text-[#57534E] font-sans leading-relaxed mb-4">
                  {svc.pitch || svc.description}
                </p>

                {/* Commands Badges */}
                {svc.commands && svc.commands.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {svc.commands.map((cmd) => (
                      <span
                        key={cmd}
                        className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold"
                        style={{
                          backgroundColor: theme.bgLight,
                          color: theme.accent,
                          border: `1px solid ${theme.borderLight}`,
                        }}
                      >
                        {cmd}
                      </span>
                    ))}
                  </div>
                )}

                {/* Feature Bullet Points */}
                {svc.features && svc.features.length > 0 && (
                  <ul className="space-y-1.5 mb-4 text-xs font-sans text-[#78716C]">
                    {svc.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span style={{ color: theme.accent }} className="font-bold text-xs">
                          ✓
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Bottom Footer Row with Preview Trigger */}
              <div className="pt-3 border-t border-[#E7E2DA] flex items-center justify-between text-[11px] font-mono text-[#78716C]">
                <span className="font-medium">{theme.name}</span>
                <button
                  onClick={() => setSelectedPreview(isExpanded ? null : svc.id)}
                  className="font-bold hover:underline transition-all cursor-pointer"
                  style={{ color: theme.accent }}
                >
                  {isExpanded ? 'Hide sample ▲' : 'View sample ▼'}
                </button>
              </div>

              {/* Interactive Mini-Embed / Usage Preview */}
              {isExpanded && (
                <div className="mt-3 p-3 rounded-xl bg-[#2B2D31] text-gray-200 font-mono text-[11px] animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                    Sample Command:
                  </div>
                  <div className="p-2 rounded bg-[#1E1F22] text-[#00F0FF] break-all border border-white/5 font-semibold">
                    {svc.sampleUsage}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ServicesShowcase;
