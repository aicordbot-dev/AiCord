'use client';

/**
 * src/components/sections/ThemeStudio.tsx
 * Interactive Theme Customizer Studio for AiCord.
 * Showcase of all 6 signature themes with real-time responsive Discord embed preview.
 */

import React, { useState } from 'react';
import { playPop, playSuccess } from '@/lib/audio';
import { formatAsciiProgressBar } from '@/components/discord-mock';
import { BarStyle } from '@/config/themes';

export interface StudioTheme {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  primary: string;
  accent: string;
  bgHex: string;
  glow: string;
  header: string;
  barStyle: BarStyle;
  badgeText: string;
}

export const STUDIO_THEMES: StudioTheme[] = [
  {
    id: 'blurple',
    name: 'AiCord Blurple',
    subtitle: 'Discord Native Royal & Ethereal Indigo',
    description: 'The iconic Discord gaming aesthetic refined with modern high-contrast Indigo highlights.',
    icon: '⚡',
    primary: '#5865F2',
    accent: '#7C3AED',
    bgHex: '#1E1F22',
    glow: 'rgba(88, 101, 242, 0.4)',
    header: '⚡ ━━━━━ AICORD PRIME ━━━━━ ⚡',
    barStyle: 'pipes',
    badgeText: 'VERIFIED GUILD',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    subtitle: 'High-Tech Cyan & Vivid Laser Crimson',
    description: 'High-tech neon cyan and vivid red deck aesthetics with synthetic laser borders.',
    icon: '🚀',
    primary: '#00F0FF',
    accent: '#FF003C',
    bgHex: '#040B14',
    glow: 'rgba(0, 240, 255, 0.4)',
    header: '「 ✦ CYBERPUNK DECK ✦ 」',
    barStyle: 'pipes',
    badgeText: 'CYBER SENTINEL',
  },
  {
    id: 'midnight',
    name: 'Midnight Royale',
    subtitle: 'Deep Royal Purple & Celestial Lavender',
    description: 'Deep royal purple elegance with celestial lavender accents and soothing twilight moods.',
    icon: '🌙',
    primary: '#6C5CE7',
    accent: '#A29BFE',
    bgHex: '#0B0817',
    glow: 'rgba(108, 92, 231, 0.4)',
    header: '★ ━━━━━ MIDNIGHT ROYALE ━━━━━ ★',
    barStyle: 'blocks',
    badgeText: 'ASTRAL NOBLE',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    subtitle: 'Lush Botanical Jade & Serene Mint',
    description: 'Lush natural sanctuary with serene mint and emerald hues for tranquil community spaces.',
    icon: '🌿',
    primary: '#00B894',
    accent: '#55EFC4',
    bgHex: '#04130D',
    glow: 'rgba(0, 184, 148, 0.4)',
    header: '🌿 ──── EMERALD SANCTUARY ──── 🌿',
    barStyle: 'pipes',
    badgeText: 'NATURE GUARDIAN',
  },
  {
    id: 'gold',
    name: 'Golden Tycoon',
    subtitle: 'Bullion Gold & Warm Sovereign Amber',
    description: 'Prestigious bullion gold paired with warm tycoon amber for sovereign guild status.',
    icon: '🪙',
    primary: '#FFD700',
    accent: '#FF9F43',
    bgHex: '#140F04',
    glow: 'rgba(255, 215, 0, 0.4)',
    header: '🪙 ════ GOLDEN TYCOON ════ 🪙',
    barStyle: 'squares',
    badgeText: 'SOVEREIGN FOUNDER',
  },
  {
    id: 'retro',
    name: 'Retro 80s Arcade',
    subtitle: 'Synthwave Neon Pink & Cyber Yellow',
    description: 'Nostalgic synthwave arcade fever with high-contrast hot magenta and electric yellow.',
    icon: '🕹️',
    primary: '#FF007F',
    accent: '#FFEA00',
    bgHex: '#140410',
    glow: 'rgba(255, 0, 127, 0.4)',
    header: '▲ ▲ ── RETRO 80S ARCADE ── ▲ ▲',
    barStyle: 'retro',
    badgeText: 'ARCADE CHAMPION',
  },
];

export function ThemeStudio() {
  const [selectedThemeId, setSelectedThemeId] = useState<string>('blurple');
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  const currentTheme = STUDIO_THEMES.find((t) => t.id === selectedThemeId) || STUDIO_THEMES[0];

  const handleApplyTheme = () => {
    playSuccess();
    setAppliedMessage(`✓ Applied ${currentTheme.name} to server simulation!`);
    setTimeout(() => setAppliedMessage(null), 2500);
  };

  return (
    <section
      id="themes"
      aria-label="Universal Theme Engine Section"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E7E2DA]"
    >
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: currentTheme.primary }}
          />
          <span className="font-semibold text-[#1C1917]">SIGNATURE THEME STUDIO</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
          6 Universal Aesthetic Themes
        </h2>

        <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
          Transform your server&apos;s rank cards, embeds, welcome screens, and ticketing portals with single-click thematic precision.
        </p>
      </div>

      {/* Main Studio Grid: Left Theme Selector, Right Live Embed Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Theme Cards Grid */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {STUDIO_THEMES.map((theme) => {
            const isSelected = theme.id === selectedThemeId;
            return (
              <div
                key={theme.id}
                onClick={() => {
                  playPop(520);
                  setSelectedThemeId(theme.id);
                }}
                className={`
                  p-4 rounded-3xl cursor-pointer transition-all border relative overflow-hidden text-left
                  ${
                    isSelected
                      ? 'bg-white shadow-xl scale-[1.02]'
                      : 'bg-white/80 hover:bg-white border-[#E7E2DA] shadow-xs hover:shadow-md'
                  }
                `}
                style={{
                  borderColor: isSelected ? theme.primary : '#E7E2DA',
                  borderWidth: isSelected ? '2px' : '1px',
                }}
              >
                {/* Top Badge & Color Swatches */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl">{theme.icon}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: theme.primary }}
                      title={`Primary: ${theme.primary}`}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: theme.accent }}
                      title={`Accent: ${theme.accent}`}
                    />
                  </div>
                </div>

                <h4 className="font-mono font-bold text-base text-[#1C1917]">
                  {theme.name}
                </h4>
                <p className="text-xs text-[#78716C] font-mono mt-0.5 font-medium">
                  {theme.subtitle}
                </p>
                <p className="text-xs text-[#57534E] font-sans mt-2 line-clamp-2 leading-relaxed">
                  {theme.description}
                </p>

                {isSelected && (
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#1C1917] font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                      Active Preview
                    </span>
                    <span className="text-xs">→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Dynamic Live Discord Embed Preview */}
        <div className="lg:col-span-6 sticky top-24">
          <div className="rounded-3xl bg-[#1E1F22] border border-black/30 p-4 sm:p-6 shadow-2xl space-y-4 font-mono transition-all">
            {/* Top Bar simulating Discord header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold">#</span>
                <span className="text-white font-semibold">theme-preview-station</span>
              </div>
              <span
                className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase"
                style={{
                  backgroundColor: `${currentTheme.primary}20`,
                  color: currentTheme.primary,
                  border: `1px solid ${currentTheme.primary}40`,
                }}
              >
                {currentTheme.badgeText}
              </span>
            </div>

            {/* Simulated Themed Discord Embed */}
            <div
              className="p-4 sm:p-5 rounded-2xl bg-[#2B2D31] space-y-3.5 transition-all shadow-lg"
              style={{
                borderLeft: `5px solid ${currentTheme.primary}`,
                boxShadow: `0 0 25px ${currentTheme.glow}`,
              }}
            >
              {/* Themed Header Ornamentation */}
              <div
                className="text-xs sm:text-sm font-bold tracking-wider truncate"
                style={{ color: currentTheme.accent }}
              >
                {currentTheme.header}
              </div>

              {/* Bot Embed Title */}
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {currentTheme.name} Embed Experience
                </h3>
                <p className="text-xs text-gray-300 font-sans mt-1 leading-relaxed">
                  All bot interactions, rank cards, and transactional embeds inherit these color coordinates, typography rules, and ASCII decorators automatically.
                </p>
              </div>

              {/* Dynamic ASCII Progress Bar */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <div className="flex justify-between text-[11px] text-gray-300">
                  <span>Server XP Calibration (Level 42)</span>
                  <span style={{ color: currentTheme.primary }} className="font-bold">
                    84% Complete
                  </span>
                </div>
                <div
                  className="text-xs sm:text-sm font-bold tracking-wider"
                  style={{ color: currentTheme.primary }}
                >
                  {formatAsciiProgressBar(84, currentTheme.barStyle, 16)}
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-gray-400 text-[10px] uppercase">Primary Tone</div>
                  <div className="text-white font-bold mt-0.5 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                    <code>{currentTheme.primary}</code>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-gray-400 text-[10px] uppercase">Accent Glow</div>
                  <div className="text-white font-bold mt-0.5 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentTheme.accent }} />
                    <code>{currentTheme.accent}</code>
                  </div>
                </div>
              </div>

              {/* Simulated Button Row styled with theme colors */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleApplyTheme}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-black transition-all cursor-pointer shadow-md hover:opacity-90"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  Apply {currentTheme.name}
                </button>
                <div className="px-3 py-2 rounded-xl bg-white/10 text-gray-300 text-xs font-mono border border-white/10">
                  <code>/customize theme:{currentTheme.id}</code>
                </div>
              </div>

              {appliedMessage && (
                <div className="text-xs text-emerald-400 font-bold animate-in fade-in">
                  {appliedMessage}
                </div>
              )}
            </div>

            <div className="text-[11px] text-gray-400 flex items-center justify-between px-1">
              <span>Supports Light &amp; Dark Modes</span>
              <span style={{ color: currentTheme.primary }} className="font-bold">
                Live Preview Synced
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
