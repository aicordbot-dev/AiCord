'use client';

import React, { useState } from 'react';

type ThemeId = 'cyberpunk' | 'midnight' | 'emerald' | 'gold' | 'retro' | 'frost';
type BarStyle = 'pipes' | 'blocks' | 'squares' | 'retro';

interface ThemeDefinition {
  id: ThemeId;
  name: string;
  icon: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  header: string;
  barStyle: BarStyle;
  tagline: string;
  badge: string;
}

const THEMES: Record<ThemeId, ThemeDefinition> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    icon: '⚡',
    description: 'High-tech neon cyan and vivid red deck aesthetics',
    primaryColor: '#00f0ff',
    accentColor: '#ff003c',
    glowColor: 'rgba(0, 240, 255, 0.4)',
    header: '「 ✦ CYBERPUNK DECK ✦ 」',
    barStyle: 'pipes',
    tagline: 'NEURAL LINK SECURED • OVERCLOCK READY',
    badge: 'CYBER SENTINEL',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    icon: '🌙',
    description: 'Deep royal purple elegance with soothing lavender accents',
    primaryColor: '#8b5cf6',
    accentColor: '#c084fc',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    header: '★ ━━━━━ MIDNIGHT ROYALE ━━━━━ ★',
    barStyle: 'blocks',
    tagline: 'ASTRAL SANCTUARY • CELESTIAL ASCENT',
    badge: 'ASTRAL NOBLE',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    icon: '🌿',
    description: 'Lush natural sanctuary with serene mint and emerald hues',
    primaryColor: '#10b981',
    accentColor: '#6ee7b7',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    header: '🌿 ──── EMERALD SANCTUARY ──── 🌿',
    barStyle: 'pipes',
    tagline: 'FLOURISHING BIOME • PRISTINE HARMONY',
    badge: 'NATURE GUARDIAN',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    icon: '🪙',
    description: 'Prestigious bullion gold paired with warm tycoon amber',
    primaryColor: '#f59e0b',
    accentColor: '#fbbf24',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    header: '🪙 ════ GOLDEN TYCOON ════ 🪙',
    barStyle: 'squares',
    tagline: 'HIGH ROLLER VAULT • TYCOON EMPIRE',
    badge: 'GUILD TYCOON',
  },
  retro: {
    id: 'retro',
    name: 'Retro',
    icon: '🕹️',
    description: '80s synthwave arcade neon pink with electric blue',
    primaryColor: '#ec4899',
    accentColor: '#38bdf8',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    header: '[=== 🕹️ RETRO ARCADE 🕹️ ===]',
    barStyle: 'retro',
    tagline: '1CC HIGH SCORE • 8-BIT STEREO BLUSTER',
    badge: 'ARCADE CHAMPION',
  },
  frost: {
    id: 'frost',
    name: 'Frost',
    icon: '❄️',
    description: 'Crisp glacial ice blue complemented by pristine Nordic silver',
    primaryColor: '#38bdf8',
    accentColor: '#e2e8f0',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    header: '❄️ ─── NORDIC FROST ─── ❄️',
    barStyle: 'blocks',
    tagline: 'GLACIAL VORTEX • SUB-ZERO FORTRESS',
    badge: 'FROST MONARCH',
  },
};

const BAR_CHARS: Record<BarStyle, { filled: string; empty: string }> = {
  pipes: { filled: '▰', empty: '▱' },
  blocks: { filled: '█', empty: '░' },
  squares: { filled: '■', empty: '□' },
  retro: { filled: '▓', empty: '░' },
};

function renderProgressBar(percentage: number, style: BarStyle, length: number = 14): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((clamped / 100) * length);
  const emptyCount = length - filledCount;
  const chars = BAR_CHARS[style];
  return chars.filled.repeat(filledCount) + chars.empty.repeat(emptyCount);
}

export default function ThemePreviewWidget() {
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>('cyberpunk');
  const [activeBarStyle, setActiveBarStyle] = useState<BarStyle | null>(null);

  const theme = THEMES[activeThemeId];
  const barStyle = activeBarStyle ?? theme.barStyle;

  return (
    <div className="w-full max-w-6xl mx-auto rounded-3xl bg-[#0d111e]/90 border border-white/10 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] transition-all duration-700 pointer-events-none opacity-40"
        style={{ backgroundColor: theme.primaryColor }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-[120px] transition-all duration-700 pointer-events-none opacity-20"
        style={{ backgroundColor: theme.accentColor }}
      />

      {/* Widget Header & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.primaryColor }} />
            LIVE DISCORD ENGINE THEMES
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Universal Profile & Balance Styling
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mt-2 max-w-xl">
            AiCord transforms ordinary Discord text embeds into custom-branded holographic decks.
            Users customize their style in real time with <code className="text-cyan-300 font-mono">/customize profile</code>.
          </p>
        </div>

        {/* Bar Style Selector Pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/10">
          <span className="text-xs font-mono text-gray-400 px-2 uppercase tracking-wider">Bar Style:</span>
          <div className="flex items-center gap-1">
            {(['pipes', 'blocks', 'squares', 'retro'] as BarStyle[]).map((bs) => (
              <button
                key={bs}
                onClick={() => setActiveBarStyle(bs)}
                className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
                  barStyle === bs
                    ? 'bg-white/20 text-white font-bold shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {bs}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Theme Selector Navigation Carousel / Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10 relative z-10">
        {(Object.keys(THEMES) as ThemeId[]).map((id) => {
          const t = THEMES[id];
          const isSelected = activeThemeId === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveThemeId(id);
                setActiveBarStyle(null); // Reset to theme default
              }}
              className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all duration-300 text-left group relative overflow-hidden ${
                isSelected
                  ? 'border-white/40 bg-white/10 shadow-lg scale-[1.03]'
                  : 'border-white/5 bg-black/30 hover:border-white/20 hover:bg-white/5'
              }`}
              style={{
                boxShadow: isSelected ? `0 0 24px ${t.glowColor}` : 'none',
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: t.primaryColor }}
                />
              )}
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-2xl">{t.icon}</span>
                <span
                  className="w-3 h-3 rounded-full border border-black/40"
                  style={{ backgroundColor: t.primaryColor }}
                />
              </div>
              <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                {t.name}
              </span>
              <span className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                {t.id}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Discord Client Simulation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Side: Mock Discord Profile Card */}
        <div className="lg:col-span-7 rounded-2xl bg-[#1e1f29] border border-white/10 shadow-2xl overflow-hidden transition-all duration-500">
          {/* Discord Card Banner with Dynamic Accent Theme */}
          <div
            className="h-28 sm:h-32 w-full relative transition-all duration-700 flex items-end p-4"
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor}22 0%, ${theme.accentColor}44 50%, #1e1f29 100%)`,
              borderBottom: `2px solid ${theme.primaryColor}55`,
            }}
          >
            {/* Header Ornamentation Frame */}
            <div className="absolute top-3 left-4 font-mono text-xs font-bold tracking-wider px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-white">
              {theme.header}
            </div>
            <div className="absolute top-3 right-4 flex items-center gap-1.5">
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider text-black"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {theme.badge}
              </span>
            </div>
          </div>

          {/* User Bio & Avatar Bar */}
          <div className="p-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
              <div className="flex items-end gap-3.5">
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#2b2d31] to-[#383a40] border-4 border-[#1e1f29] flex items-center justify-center text-3xl shadow-xl"
                    style={{
                      boxShadow: `0 0 20px ${theme.glowColor}`,
                    }}
                  >
                    👑
                  </div>
                  {/* Status Indicator */}
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#1e1f29]" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white tracking-wide">
                      Aethelgard
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-mono text-[10px] uppercase font-bold border border-indigo-500/40">
                      BOT ARCHITECT
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">@aethelgard • Server Founder</p>
                </div>
              </div>

              {/* Server ID & Badges */}
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-gray-300">
                  ID: <span style={{ color: theme.primaryColor }}>1567393420127772712</span>
                </span>
              </div>
            </div>

            {/* Simulated Discord Embed Body */}
            <div
              className="rounded-xl p-4.5 bg-[#2b2d31]/80 border-l-4 my-4 font-mono text-xs sm:text-sm text-gray-200 transition-all duration-300"
              style={{
                borderColor: theme.primaryColor,
                boxShadow: `inset 0 0 30px ${theme.glowColor}`,
              }}
            >
              <div className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: theme.accentColor }}>
                {theme.tagline}
              </div>

              {/* Level & XP Metrics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <span>⚡ Level 42 Mastermind</span>
                  </span>
                  <span className="font-bold" style={{ color: theme.primaryColor }}>
                    18,450 / 25,000 XP (74%)
                  </span>
                </div>

                {/* Themed ASCII Progress Bar */}
                <div
                  className="font-mono text-sm sm:text-base tracking-widest select-all py-1.5 px-3 rounded-lg bg-black/50 border border-white/5 transition-all"
                  style={{ color: theme.primaryColor }}
                >
                  {renderProgressBar(74, barStyle, 16)} 74%
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-white/10">
                  <div>
                    <span className="text-gray-400 block text-[11px]">⚔️ Active Pet</span>
                    <span className="font-bold text-white">Cyber Dragon (Lvl 38)</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">🏆 Global Ranking</span>
                    <span className="font-bold text-amber-400">#3 Sovereign</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slash Command Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-gray-400">
              <span className="flex items-center gap-2">
                <span className="text-cyan-400">/customize</span>
                <span className="text-gray-300">profile rank_theme:{activeThemeId} bar_style:{barStyle}</span>
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                ✓ SAVED
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Mock Discord Balance & Loot Vault Card */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          {/* Economy Balance Card */}
          <div className="rounded-2xl bg-[#1e1f29] border border-white/10 p-5 shadow-2xl relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 pointer-events-none"
              style={{ backgroundColor: theme.primaryColor }}
            />

            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <span className="font-bold text-white text-sm">AiCord Treasury Card</span>
              </div>
              <span
                className="font-mono text-xs px-2 py-0.5 rounded-full font-bold uppercase"
                style={{
                  backgroundColor: `${theme.primaryColor}22`,
                  color: theme.primaryColor,
                  border: `1px solid ${theme.primaryColor}55`,
                }}
              >
                {theme.name} Edition
              </span>
            </div>

            <div className="space-y-4 font-mono">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider">Liquid Balance</div>
                <div className="text-2xl font-extrabold text-white mt-1 flex items-baseline gap-2">
                  <span>142,850</span>
                  <span className="text-xs font-normal" style={{ color: theme.primaryColor }}>COINS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase">Crypto Gems</div>
                  <div className="text-lg font-bold text-purple-300 mt-0.5">💎 580</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase">Daily Streak</div>
                  <div className="text-lg font-bold text-amber-300 mt-0.5">🔥 28 Days</div>
                </div>
              </div>

              {/* Daily Quota / Work Bar */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Daily Work Cap</span>
                  <span style={{ color: theme.primaryColor }}>85% Exhausted</span>
                </div>
                <div
                  className="font-mono text-xs tracking-wider select-none py-1 px-2.5 rounded bg-black/50 border border-white/5"
                  style={{ color: theme.primaryColor }}
                >
                  {renderProgressBar(85, barStyle, 12)}
                </div>
              </div>
            </div>
          </div>

          {/* Theme Palette Details Box */}
          <div className="rounded-2xl bg-black/30 border border-white/10 p-5 space-y-3">
            <div className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Theme Color Engine</span>
              <span className="text-cyan-400">Zero Dependencies</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-xs font-mono">
                <span className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: theme.primaryColor }} />
                <span className="text-gray-300">Primary:</span>
                <span className="font-bold text-white">{theme.primaryColor.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-xs font-mono">
                <span className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: theme.accentColor }} />
                <span className="text-gray-300">Accent:</span>
                <span className="font-bold text-white">{theme.accentColor.toUpperCase()}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Every card responds dynamically to server member preferences and server-wide theme policies set with{' '}
              <code className="text-white font-mono">/customize server-theme</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
