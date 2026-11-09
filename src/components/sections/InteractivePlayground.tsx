'use client';

/**
 * src/components/sections/InteractivePlayground.tsx
 * Ultra-interactive Community & Economy Playground for AiCord.
 * 3 Interactive Mini-Apps:
 * 1. 🪙 Coinflip Arena: 3D coin flip physics, betting chips, streak counters
 * 2. 📦 Mystery Crate Unboxer: Real weighted odds (Common to Mythic), opening animation, sparkles
 * 3. 🎨 ASCII Progress Bar Studio: Interactive percentage slider, 4 signature styles, live copy
 */

import React, { useState } from 'react';
import { playPop, playChime, playSuccess, playUnbox } from '@/lib/audio';
import { formatAsciiProgressBar } from '@/components/discord-mock';
import { BAR_STYLES, BarStyle } from '@/config/themes';

type PlaygroundTab = 'coinflip' | 'unboxer' | 'bars';

interface UnboxItem {
  id: string;
  name: string;
  tier: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  color: string;
  badgeBg: string;
  icon: string;
  desc: string;
}

const CRATE_ITEMS: UnboxItem[] = [
  // Mythic (1%)
  { id: 'm1', name: 'Cosmic Celestial Halo', tier: 'Mythic', color: '#EF4444', badgeBg: 'bg-red-500/15 text-red-500 border-red-500/30', icon: '🌌', desc: '1-of-1 prismatic halo embed aura with particle trail' },
  // Legendary (4%)
  { id: 'l1', name: 'Crown of the Sovereign', tier: 'Legendary', color: '#F59E0B', badgeBg: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: '👑', desc: 'Permanent gold bullion embed border & VIP role tag' },
  { id: 'l2', name: 'Neon Cyberpunk Theme', tier: 'Legendary', color: '#F59E0B', badgeBg: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: '⚡', desc: 'Unlocks high-voltage cyan & red deck aesthetics' },
  // Epic (10%)
  { id: 'e1', name: 'Double XP 24-Hour Booster', tier: 'Epic', color: '#8B5CF6', badgeBg: 'bg-purple-500/15 text-purple-500 border-purple-500/30', icon: '🚀', desc: '2x leveling speed across all text & voice lounges' },
  { id: 'e2', name: 'VIP Private Voice Pod', tier: 'Epic', color: '#8B5CF6', badgeBg: 'bg-purple-500/15 text-purple-500 border-purple-500/30', icon: '🎙️', desc: 'Private 384kbps bitrate audio room with custom bitrate' },
  // Rare (25%)
  { id: 'r1', name: 'Silver Discord Avatar Frame', tier: 'Rare', color: '#0EA5E9', badgeBg: 'bg-sky-500/15 text-sky-500 border-sky-500/30', icon: '🛡️', desc: 'Gleaming chrome border for all Discord rank cards' },
  { id: 'r2', name: 'Radio DJ Pass (7-Day)', tier: 'Rare', color: '#0EA5E9', badgeBg: 'bg-sky-500/15 text-sky-500 border-sky-500/30', icon: '📻', desc: 'Priority song queuing in 24/7 Lo-Fi voice channels' },
  // Common (60%)
  { id: 'c1', name: 'Bronze Echo Rank Badge', tier: 'Common', color: '#78716C', badgeBg: 'bg-stone-500/15 text-stone-600 border-stone-500/30', icon: '🥉', desc: 'Starter metallic flair for community profile' },
  { id: 'c2', name: '+250 Bonus Guild Coins', tier: 'Common', color: '#78716C', badgeBg: 'bg-stone-500/15 text-stone-600 border-stone-500/30', icon: '🪙', desc: 'Instant virtual balance deposit to your wallet' },
  { id: 'c3', name: 'Pebble Mascot Snack Pack', tier: 'Common', color: '#78716C', badgeBg: 'bg-stone-500/15 text-stone-600 border-stone-500/30', icon: '🍪', desc: '+30 happiness for your guild /pet companion' },
];

export function InteractivePlayground() {
  const [activeTab, setActiveTab] = useState<PlaygroundTab>('coinflip');

  // ─── 1. Coinflip Arena State ────────────────────────────────────────────────
  const [balance, setBalance] = useState(1250);
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [flipOutcomeText, setFlipOutcomeText] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(2);
  const [bestStreak, setBestStreak] = useState(4);

  const handleFlipCoin = () => {
    if (isFlipping || bet > balance) return;
    setIsFlipping(true);
    setFlipOutcomeText(null);
    playChime(660, 990);

    setTimeout(() => {
      const outcome: 'heads' | 'tails' = Math.random() > 0.5 ? 'heads' : 'tails';
      setCoinResult(outcome);
      setIsFlipping(false);

      if (outcome === choice) {
        const winAmount = bet;
        setBalance((b) => b + winAmount);
        const nextStreak = currentStreak + 1;
        setCurrentStreak(nextStreak);
        if (nextStreak > bestStreak) setBestStreak(nextStreak);
        setFlipOutcomeText(`🎉 FLIPPED ${outcome.toUpperCase()}! You won +${winAmount} Coins!`);
        playSuccess();
      } else {
        setBalance((b) => Math.max(0, b - bet));
        setCurrentStreak(0);
        setFlipOutcomeText(`❌ Flipped ${outcome.toUpperCase()}. Better luck on the next flip!`);
      }
    }, 750);
  };

  // ─── 2. Mystery Crate Unboxer State ─────────────────────────────────────────
  const [isUnboxing, setIsUnboxing] = useState(false);
  const [unboxedItem, setUnboxedItem] = useState<UnboxItem | null>(null);
  const [unboxHistory, setUnboxHistory] = useState<UnboxItem[]>([]);

  const handleUnbox = () => {
    if (isUnboxing) return;
    setIsUnboxing(true);
    setUnboxedItem(null);
    playPop(620);

    setTimeout(() => {
      // Weighted roll: 1-100
      const roll = Math.random() * 100;
      let selected: UnboxItem;

      if (roll <= 1) {
        selected = CRATE_ITEMS.find((i) => i.tier === 'Mythic')!;
      } else if (roll <= 5) {
        const legendaries = CRATE_ITEMS.filter((i) => i.tier === 'Legendary');
        selected = legendaries[Math.floor(Math.random() * legendaries.length)];
      } else if (roll <= 15) {
        const epics = CRATE_ITEMS.filter((i) => i.tier === 'Epic');
        selected = epics[Math.floor(Math.random() * epics.length)];
      } else if (roll <= 40) {
        const rares = CRATE_ITEMS.filter((i) => i.tier === 'Rare');
        selected = rares[Math.floor(Math.random() * rares.length)];
      } else {
        const commons = CRATE_ITEMS.filter((i) => i.tier === 'Common');
        selected = commons[Math.floor(Math.random() * commons.length)];
      }

      setUnboxedItem(selected);
      setUnboxHistory((prev) => [selected, ...prev.slice(0, 4)]);
      setIsUnboxing(false);
      playUnbox();
    }, 850);
  };

  // ─── 3. ASCII Bar Studio State ──────────────────────────────────────────────
  const [barPercent, setBarPercent] = useState(72);
  const [barStyle, setBarStyle] = useState<BarStyle>('pipes');
  const [barLength, setBarLength] = useState(14);
  const [copiedBar, setCopiedBar] = useState(false);

  const renderedBarString = formatAsciiProgressBar(barPercent, barStyle, barLength);

  const handleCopyBar = () => {
    navigator.clipboard.writeText(renderedBarString).catch(() => {});
    setCopiedBar(true);
    playSuccess();
    setTimeout(() => setCopiedBar(false), 1800);
  };

  return (
    <section
      id="playground"
      aria-label="Interactive Community Playground"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E7E2DA]"
    >
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
          <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
          <span className="font-semibold text-[#1C1917]">COMMUNITY &amp; ECONOMY ARENA</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
          Playable Discord Playground
        </h2>

        <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
          Test drive AiCord&apos;s provably fair casino engines, mystery crate mechanics, and ASCII screen renderers right in your browser.
        </p>

        {/* Tab Selector Pills */}
        <div className="flex items-center justify-center gap-2 pt-3">
          <button
            onClick={() => {
              playPop(480);
              setActiveTab('coinflip');
            }}
            className={`
              px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2
              ${
                activeTab === 'coinflip'
                  ? 'bg-[#1C1917] text-white shadow-md'
                  : 'bg-white text-[#57534E] border border-[#E7E2DA] hover:bg-stone-50'
              }
            `}
          >
            <span>🪙</span>
            <span>Coinflip Arena</span>
          </button>

          <button
            onClick={() => {
              playPop(480);
              setActiveTab('unboxer');
            }}
            className={`
              px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2
              ${
                activeTab === 'unboxer'
                  ? 'bg-[#1C1917] text-white shadow-md'
                  : 'bg-white text-[#57534E] border border-[#E7E2DA] hover:bg-stone-50'
              }
            `}
          >
            <span>📦</span>
            <span>Mystery Crate (/unbox)</span>
          </button>

          <button
            onClick={() => {
              playPop(480);
              setActiveTab('bars');
            }}
            className={`
              px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2
              ${
                activeTab === 'bars'
                  ? 'bg-[#1C1917] text-white shadow-md'
                  : 'bg-white text-[#57534E] border border-[#E7E2DA] hover:bg-stone-50'
              }
            `}
          >
            <span>🎨</span>
            <span>ASCII Bar Studio</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="rounded-3xl bg-white border border-[#E7E2DA] shadow-xl p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto">
        {/* ─────────────── TAB 1: COINFLIP ARENA ─────────────── */}
        {activeTab === 'coinflip' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E2DA] pb-4">
              <div>
                <span className="text-xs font-mono text-[#D97706] font-bold uppercase tracking-wider">
                  Provably Fair Mini-Game
                </span>
                <h3 className="text-2xl font-black font-mono text-[#1C1917]">
                  Vegas Coinflip Arena
                </h3>
              </div>

              {/* Balance & Streak Badges */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold flex items-center gap-1.5">
                  <span>🪙</span>
                  <span>{balance.toLocaleString()} Coins</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 font-bold">
                  🔥 Streak: {currentStreak} (Best: {bestStreak})
                </div>
              </div>
            </div>

            {/* Interactive Coin Stage */}
            <div className="flex flex-col items-center justify-center py-6">
              <div
                className={`
                  w-32 h-32 rounded-full border-4 border-amber-400 bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500
                  flex items-center justify-center shadow-xl transition-all duration-700 select-none
                  ${isFlipping ? 'animate-spin scale-110' : 'hover:scale-105'}
                `}
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="text-center font-mono">
                  <span className="text-4xl block">
                    {coinResult === 'tails' ? '⚡' : '👑'}
                  </span>
                  <span className="text-xs font-black tracking-wider text-amber-950 uppercase mt-1 block">
                    {isFlipping ? 'FLIPPING...' : coinResult ? coinResult.toUpperCase() : 'FLIP ME'}
                  </span>
                </div>
              </div>

              {flipOutcomeText && (
                <div className="mt-4 font-mono font-bold text-sm text-[#1C1917] bg-stone-100 px-4 py-2 rounded-xl border border-[#E7E2DA] animate-in fade-in">
                  {flipOutcomeText}
                </div>
              )}
            </div>

            {/* Betting Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Pick Side */}
              <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E7E2DA] space-y-2">
                <span className="text-xs font-mono uppercase text-[#78716C] font-semibold block">
                  Select Call
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      playPop(480);
                      setChoice('heads');
                    }}
                    className={`
                      py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5
                      ${
                        choice === 'heads'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-white text-[#57534E] border border-[#E7E2DA] hover:bg-stone-50'
                      }
                    `}
                  >
                    <span>👑</span>
                    <span>Heads</span>
                  </button>
                  <button
                    onClick={() => {
                      playPop(480);
                      setChoice('tails');
                    }}
                    className={`
                      py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5
                      ${
                        choice === 'tails'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-white text-[#57534E] border border-[#E7E2DA] hover:bg-stone-50'
                      }
                    `}
                  >
                    <span>⚡</span>
                    <span>Tails</span>
                  </button>
                </div>
              </div>

              {/* Bet Amount Chips */}
              <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E7E2DA] space-y-2">
                <span className="text-xs font-mono uppercase text-[#78716C] font-semibold block">
                  Bet Amount: {bet} Coins
                </span>
                <div className="flex items-center gap-1.5">
                  {[50, 100, 250, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        playPop(440);
                        setBet(amt);
                      }}
                      className={`
                        flex-1 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer
                        ${
                          bet === amt
                            ? 'bg-[#1C1917] text-white shadow-xs'
                            : 'bg-white text-[#57534E] border border-[#E7E2DA] hover:bg-stone-100'
                        }
                      `}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                onClick={handleFlipCoin}
                disabled={isFlipping || bet > balance}
                className="w-full py-4 rounded-2xl bg-[#1C1917] hover:bg-[#292524] text-white font-mono font-bold text-base shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>🪙</span>
                <span>{isFlipping ? 'Flipping Cryptographic Coin...' : `Flip Coin (Bet ${bet} Coins)`}</span>
              </button>
            </div>
          </div>
        )}

        {/* ─────────────── TAB 2: MYSTERY CRATE UNBOXER ─────────────── */}
        {activeTab === 'unboxer' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E2DA] pb-4">
              <div>
                <span className="text-xs font-mono text-[#7C3AED] font-bold uppercase tracking-wider">
                  Interactive Discord Embed Simulation
                </span>
                <h3 className="text-2xl font-black font-mono text-[#1C1917]">
                  Mystery Crate Unboxer (/unbox)
                </h3>
              </div>

              {/* Rarity odds summary */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold">60% Common</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold">25% Rare</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">10% Epic</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">4% Leg</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">1% Mythic</span>
              </div>
            </div>

            {/* Crate Visual Stage */}
            <div className="text-center py-6 flex flex-col items-center justify-center">
              <div
                className={`
                  text-7xl p-6 rounded-3xl bg-[#FDFBF7] border-2 border-dashed border-[#E7E2DA] shadow-inner transition-transform duration-300
                  ${isUnboxing ? 'scale-125 animate-bounce' : 'hover:scale-105'}
                `}
              >
                {isUnboxing ? '✨' : unboxedItem ? unboxedItem.icon : '📦'}
              </div>

              {/* Unboxed card reveal */}
              {unboxedItem && (
                <div
                  className="mt-6 p-4 rounded-2xl bg-white border-2 shadow-xl max-w-md w-full text-center space-y-2 animate-in zoom-in-95 duration-200"
                  style={{ borderColor: unboxedItem.color }}
                >
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold border ${unboxedItem.badgeBg}`}>
                    ★ {unboxedItem.tier.toUpperCase()} DROP ★
                  </span>
                  <h4 className="text-xl font-black font-mono text-[#1C1917]">
                    {unboxedItem.name}
                  </h4>
                  <p className="text-xs font-sans text-[#57534E]">
                    {unboxedItem.desc}
                  </p>
                </div>
              )}
            </div>

            {/* Unbox Trigger */}
            <button
              onClick={handleUnbox}
              disabled={isUnboxing}
              className="w-full py-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono font-bold text-base shadow-lg shadow-purple-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>📦</span>
              <span>{isUnboxing ? 'Opening Mystery Crate...' : 'Unbox Mystery Crate (Free Demo)'}</span>
            </button>

            {/* Unbox History Reel */}
            {unboxHistory.length > 0 && (
              <div className="pt-3 border-t border-[#E7E2DA]">
                <div className="text-[11px] font-mono text-[#78716C] uppercase font-bold mb-2">
                  Recent Drops in this Session
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {unboxHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-stone-50 border border-[#E7E2DA] text-xs font-mono flex items-center gap-2 whitespace-nowrap"
                    >
                      <span>{item.icon}</span>
                      <span className="font-bold text-[#1C1917]">{item.name}</span>
                      <span className="text-[10px] text-[#78716C]">({item.tier})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────── TAB 3: ASCII PROGRESS BAR STUDIO ─────────────── */}
        {activeTab === 'bars' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E2DA] pb-4">
              <div>
                <span className="text-xs font-mono text-[#0284C7] font-bold uppercase tracking-wider">
                  Text Screen Engine
                </span>
                <h3 className="text-2xl font-black font-mono text-[#1C1917]">
                  ASCII Progress Bar Studio
                </h3>
              </div>
              <span className="text-xs font-mono text-[#57534E] bg-stone-100 px-3 py-1 rounded-xl">
                Zero Image Assets • 100% Unicode
              </span>
            </div>

            {/* Live Discord Embed Preview */}
            <div className="p-4 rounded-2xl bg-[#1E1F22] border border-black/20 font-mono shadow-inner space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="text-[#5865F2] font-bold">#bot-embed-preview</span>
                <span className="text-gray-500">Character Set: {BAR_STYLES[barStyle].name}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#2B2D31] border-l-4 border-l-[#5865F2] space-y-2">
                <div className="text-xs text-white font-bold flex items-center gap-2">
                  <span>Leveling Milestone Progress</span>
                  <span className="text-cyan-400 text-[11px] font-normal">({barPercent}%)</span>
                </div>
                <div className="text-cyan-300 font-bold text-sm tracking-wider bg-black/40 p-2.5 rounded-lg select-all">
                  {renderedBarString}
                </div>
                <div className="text-[11px] text-gray-400">
                  Filled: <code className="text-white">{BAR_STYLES[barStyle].filled}</code> • Empty: <code className="text-white">{BAR_STYLES[barStyle].empty}</code>
                </div>
              </div>
            </div>

            {/* Slider Controls */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-[#1C1917] font-bold">
                  <span>Progress Percentage:</span>
                  <span className="text-[#0284C7]">{barPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={barPercent}
                  onChange={(e) => setBarPercent(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-[#1C1917] font-bold">
                  <span>Bar Character Length:</span>
                  <span className="text-[#0284C7]">{barLength} chars</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={barLength}
                  onChange={(e) => setBarLength(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              {/* 4 Style Selector Pills */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-mono uppercase text-[#78716C] font-semibold block">
                  Select Progress Bar Character Set
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(BAR_STYLES) as BarStyle[]).map((styleKey) => {
                    const style = BAR_STYLES[styleKey];
                    const isSelected = barStyle === styleKey;
                    return (
                      <button
                        key={styleKey}
                        onClick={() => {
                          playPop(500);
                          setBarStyle(styleKey);
                        }}
                        className={`
                          p-3 rounded-xl font-mono text-left transition-all cursor-pointer border
                          ${
                            isSelected
                              ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-sm'
                              : 'bg-white text-[#57534E] border-[#E7E2DA] hover:bg-stone-50'
                          }
                        `}
                      >
                        <div className="text-xs font-bold truncate">{style.name}</div>
                        <div className="text-xs tracking-wider opacity-80 mt-1 truncate">
                          {style.filled.repeat(4)}{style.empty.repeat(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Copy String Button */}
              <button
                onClick={handleCopyBar}
                className="w-full py-3 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-mono font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>{copiedBar ? '✓ Copied ASCII String to Clipboard!' : 'Copy Discord Progress Bar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
