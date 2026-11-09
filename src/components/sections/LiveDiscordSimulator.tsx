'use client';

/**
 * src/components/sections/LiveDiscordSimulator.tsx
 * Multi-Module Live Discord Simulator for AiCord Hero section.
 * Features 6 fully interactive modules:
 * 1. ⚡ AI Builder (/build): Live prompt synthesis, category breakdown, 99/100 security score
 * 2. 🏆 XP Rank Card (/rank): Authentic rank card, avatar, Level 42 badge, XP bar, server ranking
 * 3. 🃏 Blackjack Table (/blackjack): Playable Vegas blackjack mini-game with Hit, Stand, Double Down
 * 4. 🎫 Ticket Hub (/ticket): Claim ticket, close & transcript, interactive 5-star CSAT rating
 * 5. 📻 24/7 Lo-Fi Radio (/radio): Live equalizer bars, station switch, volume slider, play/pause
 * 6. 💻 Polyglot Compiler (/run): Python/Rust/TS code runner with sub-20ms edge execution
 */

import React, { useState } from 'react';
import { playPop, playCard, playSuccess, playChime } from '@/lib/audio';
import {
  DiscordMessage,
  DiscordEmbed,
  DiscordButton,
  DiscordActionRow,
  SlashCommand,
  formatAsciiProgressBar,
} from '@/components/discord-mock';

export type SimulatorTab = 'build' | 'rank' | 'blackjack' | 'ticket' | 'radio' | 'run';

interface LiveDiscordSimulatorProps {
  initialTab?: SimulatorTab;
  onLaunchBuilder?: () => void;
}

export function LiveDiscordSimulator({
  initialTab = 'build',
  onLaunchBuilder,
}: LiveDiscordSimulatorProps) {
  const [activeTab, setActiveTab] = useState<SimulatorTab>(initialTab);

  // ─── 1. AI Builder State ───────────────────────────────────────────────────
  const [buildPromptIndex, setBuildPromptIndex] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const buildPrompts = [
    'Esports tournament guild with scrim voice rooms and verified rank gates',
    'Developer collective with GitHub webhooks, polyglot sandboxes, and RFC forums',
    'Anime lounge with 24/7 lo-fi radio, level rewards, and interactive minigames',
  ];

  const handleTriggerSynthesis = (idx: number) => {
    playPop(520);
    setBuildPromptIndex(idx);
    setIsSynthesizing(true);
    setTimeout(() => {
      setIsSynthesizing(false);
      playSuccess();
    }, 450);
  };

  // ─── 2. XP Rank Card State ─────────────────────────────────────────────────
  const [rankLevel, setRankLevel] = useState(42);
  const [rankXp, setRankXp] = useState(8420);
  const maxXp = 10000;
  const xpPercent = Math.round((rankXp / maxXp) * 100);

  const handleAddXp = () => {
    playPop(600);
    const next = rankXp + 450;
    if (next >= maxXp) {
      setRankLevel((l) => l + 1);
      setRankXp(next - maxXp);
      playSuccess();
    } else {
      setRankXp(next);
    }
  };

  // ─── 3. Blackjack Table State ──────────────────────────────────────────────
  interface Card {
    suit: string;
    value: string;
    score: number;
  }
  const SUITS = ['♠', '♥', '♦', '♣'];
  const VALUES = [
    { val: '2', score: 2 },
    { val: '3', score: 3 },
    { val: '4', score: 4 },
    { val: '5', score: 5 },
    { val: '6', score: 6 },
    { val: '7', score: 7 },
    { val: '8', score: 8 },
    { val: '9', score: 9 },
    { val: '10', score: 10 },
    { val: 'J', score: 10 },
    { val: 'Q', score: 10 },
    { val: 'K', score: 10 },
    { val: 'A', score: 11 },
  ];

  const drawRandomCard = (): Card => {
    const s = SUITS[Math.floor(Math.random() * SUITS.length)];
    const v = VALUES[Math.floor(Math.random() * VALUES.length)];
    return { suit: s, value: v.val, score: v.score };
  };

  const calculateHandScore = (hand: Card[]): number => {
    let sum = hand.reduce((acc, c) => acc + c.score, 0);
    let aces = hand.filter((c) => c.value === 'A').length;
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces -= 1;
    }
    return sum;
  };

  const [playerCards, setPlayerCards] = useState<Card[]>([
    { suit: '♠', value: 'K', score: 10 },
    { suit: '♦', value: '8', score: 8 },
  ]);
  const [dealerCards, setDealerCards] = useState<Card[]>([
    { suit: '♣', value: 'J', score: 10 },
    { suit: '♥', value: '7', score: 7 },
  ]);
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [betAmount, setBetAmount] = useState(250);
  const [gameOutcome, setGameOutcome] = useState<string | null>(null);

  const handleHit = () => {
    if (gameOutcome) return;
    playCard();
    const newCard = drawRandomCard();
    const updated = [...playerCards, newCard];
    setPlayerCards(updated);
    const score = calculateHandScore(updated);
    if (score > 21) {
      setGameOutcome('Bust! You went over 21. Dealer wins.');
      setDealerRevealed(true);
    }
  };

  const handleStand = () => {
    if (gameOutcome) return;
    playPop(480);
    setDealerRevealed(true);
    let currentDealer = [...dealerCards];
    while (calculateHandScore(currentDealer) < 17) {
      currentDealer.push(drawRandomCard());
    }
    setDealerCards(currentDealer);
    const pScore = calculateHandScore(playerCards);
    const dScore = calculateHandScore(currentDealer);

    if (dScore > 21 || pScore > dScore) {
      setGameOutcome(`Winner! You scored ${pScore} vs Dealer's ${dScore}. +${betAmount * 2} Coins!`);
      playSuccess();
    } else if (pScore === dScore) {
      setGameOutcome(`Push! Tied at ${pScore}. Bet refunded.`);
    } else {
      setGameOutcome(`Dealer wins with ${dScore} vs your ${pScore}. Better luck next round!`);
    }
  };

  const handleDoubleDown = () => {
    if (gameOutcome || playerCards.length !== 2) return;
    setBetAmount((b) => b * 2);
    playCard();
    const newCard = drawRandomCard();
    const updated = [...playerCards, newCard];
    setPlayerCards(updated);
    const pScore = calculateHandScore(updated);
    setDealerRevealed(true);

    if (pScore > 21) {
      setGameOutcome('Bust after double down! Dealer wins.');
      return;
    }

    let currentDealer = [...dealerCards];
    while (calculateHandScore(currentDealer) < 17) {
      currentDealer.push(drawRandomCard());
    }
    setDealerCards(currentDealer);
    const dScore = calculateHandScore(currentDealer);

    if (dScore > 21 || pScore > dScore) {
      setGameOutcome(`Double Down Victory! Scored ${pScore} vs Dealer's ${dScore}. +${betAmount * 4} Coins!`);
      playSuccess();
    } else if (pScore === dScore) {
      setGameOutcome(`Push at ${pScore}!`);
    } else {
      setGameOutcome(`Dealer wins with ${dScore}.`);
    }
  };

  const handleResetBlackjack = () => {
    playChime();
    setPlayerCards([drawRandomCard(), drawRandomCard()]);
    setDealerCards([drawRandomCard(), drawRandomCard()]);
    setDealerRevealed(false);
    setBetAmount(250);
    setGameOutcome(null);
  };

  // ─── 4. Ticket Hub State ───────────────────────────────────────────────────
  const [ticketStatus, setTicketStatus] = useState<'open' | 'claimed' | 'closed'>('open');
  const [csatRating, setCsatRating] = useState<number | null>(null);

  const handleClaimTicket = () => {
    playPop(520);
    setTicketStatus('claimed');
  };

  const handleCloseTicket = () => {
    playPop(480);
    setTicketStatus('closed');
  };

  const handleRateCsat = (stars: number) => {
    setCsatRating(stars);
    playSuccess();
  };

  // ─── 5. Lo-Fi Radio State ──────────────────────────────────────────────────
  const [isPlayingRadio, setIsPlayingRadio] = useState(true);
  const [radioStation, setRadioStation] = useState<'lofi' | 'synthwave' | 'jazz'>('lofi');
  const [radioVolume, setRadioVolume] = useState(65);

  const stations = {
    lofi: { name: 'Lo-Fi Chillhop Beats', artist: 'Midnight City Beats', emoji: '☕' },
    synthwave: { name: '80s Neon Highway', artist: 'RetroWave Collective', emoji: '⚡' },
    jazz: { name: 'Tokyo Rain Coffeehouse', artist: 'Yuki Jazz Trio', emoji: '🎷' },
  };

  // ─── 6. Polyglot Compiler State ────────────────────────────────────────────
  const [selectedLang, setSelectedLang] = useState<'python' | 'rust' | 'ts'>('python');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState<string | null>(null);

  const codeSnippets = {
    python: `def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint([fibonacci(i) for i in range(8)])`,
    rust: `fn main() {\n    let prime_sum: u32 = [2, 3, 5, 7, 11, 13]\n        .iter()\n        .sum();\n    println!("Primes sum: {}", prime_sum);\n}`,
    ts: `const sanitize = (text: string) =>\n  text.trim().toLowerCase();\n\nconsole.log(sanitize("  AiCord Next.js 16 Edge!  "));`,
  };

  const expectedOutputs = {
    python: `[0, 1, 1, 2, 3, 5, 8, 13]\n\nExecution Time: 14ms • Memory: 11.2 MB`,
    rust: `Primes sum: 41\n\nExecution Time: 9ms • Memory: 8.4 MB`,
    ts: `"aicord next.js 16 edge!"\n\nExecution Time: 12ms • Memory: 10.6 MB`,
  };

  const handleExecuteCode = () => {
    playPop(560);
    setIsRunningCode(true);
    setTimeout(() => {
      setIsRunningCode(false);
      setCodeOutput(expectedOutputs[selectedLang]);
      playSuccess();
    }, 380);
  };

  const tabs: { id: SimulatorTab; label: string; icon: string; badge?: string }[] = [
    { id: 'build', label: 'AI Builder', icon: '⚡' },
    { id: 'rank', label: 'XP Rank', icon: '🏆' },
    { id: 'blackjack', label: 'Blackjack', icon: '🃏', badge: 'Playable' },
    { id: 'ticket', label: 'Ticket Hub', icon: '🎫' },
    { id: 'radio', label: '24/7 Radio', icon: '📻' },
    { id: 'run', label: 'Polyglot Sandbox', icon: '💻' },
  ];

  return (
    <div className="w-full rounded-3xl bg-white border border-[#E7E2DA] p-3 sm:p-4 shadow-xl relative overflow-hidden transition-all">
      {/* Top Header: Status bar & Pill Navigation */}
      <div className="flex flex-col gap-2 pb-3 mb-3 border-b border-[#E7E2DA]">
        <div className="flex items-center justify-between px-1 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
            <span className="font-bold text-[#1C1917] tracking-wider text-[11px] uppercase">
              Live Discord Simulator
            </span>
          </div>
          <span className="text-[10px] text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full font-bold">
            Interactive 2D Core
          </span>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playPop(500);
                  setActiveTab(tab.id);
                }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer
                  ${
                    isActive
                      ? 'bg-[#1C1917] text-white shadow-xs scale-102'
                      : 'bg-[#FDFBF7] text-[#57534E] hover:bg-stone-100 border border-[#E7E2DA] hover:text-[#1C1917]'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#5865F2] text-white font-sans uppercase">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Discord Window Frame */}
      <div className="rounded-2xl overflow-hidden shadow-inner bg-[#2B2D31]">
        {/* Discord Header Bar */}
        <div className="p-3 bg-[#1E1F22] border-b border-black/20 flex items-center justify-between text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold">#</span>
            <span className="text-gray-200 font-semibold">
              {activeTab === 'build' && 'bot-architect'}
              {activeTab === 'rank' && 'levels-and-rank'}
              {activeTab === 'blackjack' && 'high-roller-casino'}
              {activeTab === 'ticket' && 'support-ticket-1042'}
              {activeTab === 'radio' && 'voice-lofi-lounge'}
              {activeTab === 'run' && 'polyglot-sandbox'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Ping: 18ms
          </span>
        </div>

        {/* Discord Chat Area */}
        <div className="p-3 sm:p-4 space-y-3 min-h-[330px]">
          {/* ────────────────── MODULE 1: AI BUILDER ────────────────── */}
          {activeTab === 'build' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <SlashCommand
                command="build"
                user={{ name: 'alex', avatarUrl: undefined }}
                params={[
                  {
                    name: 'prompt',
                    value: buildPrompts[buildPromptIndex],
                  },
                ]}
                className="bg-[#1E1F22]/90 border-white/10 text-gray-300"
              />

              <DiscordMessage
                author={{
                  name: 'AiCord',
                  isBot: true,
                  botBadgeText: 'APP',
                  roleColor: '#5865F2',
                }}
                timestamp="Just now"
              >
                <DiscordEmbed
                  color="#5865F2"
                  title="⚡ Discord Server Topology Synthesized"
                  description={
                    isSynthesizing
                      ? '🔄 Synthesizing channel matrix with Google Gemini 2.5 Flash...'
                      : 'Successfully generated complete server architecture from natural language in 780ms.'
                  }
                  fields={[
                    {
                      name: '📁 Categories & Channels',
                      value: '• 5 Categories provisioned\n• 18 Channels (Text, Voice, Forum)',
                      inline: true,
                    },
                    {
                      name: '🛡️ Role & Permission Matrix',
                      value: '• 7 Roles configured\n• 99/100 Security Audit score',
                      inline: true,
                    },
                  ]}
                  footer={{
                    text: 'AiCord AI Engine • Ed25519 Verified',
                  }}
                />

                <DiscordActionRow className="mt-2.5">
                  <DiscordButton
                    variant="primary"
                    onClick={() => {
                      if (onLaunchBuilder) onLaunchBuilder();
                      else {
                        const el = document.getElementById('ai-builder');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }
                      playPop(520);
                    }}
                    icon="🚀"
                  >
                    Open Full Builder
                  </DiscordButton>
                  <DiscordButton
                    variant="secondary"
                    onClick={() => handleTriggerSynthesis((buildPromptIndex + 1) % buildPrompts.length)}
                    icon="🎲"
                  >
                    Next Preset
                  </DiscordButton>
                </DiscordActionRow>
              </DiscordMessage>
            </div>
          )}

          {/* ────────────────── MODULE 2: XP RANK CARD ────────────────── */}
          {activeTab === 'rank' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <SlashCommand
                command="rank"
                user={{ name: 'alex', avatarUrl: undefined }}
                params={[{ name: 'user', value: '@alex' }]}
                className="bg-[#1E1F22]/90 border-white/10 text-gray-300"
              />

              <DiscordMessage
                author={{
                  name: 'AiCord',
                  isBot: true,
                  botBadgeText: 'APP',
                  roleColor: '#5865F2',
                }}
                timestamp="Just now"
              >
                {/* Custom Styled Discord Rank Card Preview */}
                <div className="rounded-2xl bg-[#1E1F22] border border-[#5865F2]/30 p-4 relative overflow-hidden font-mono shadow-md">
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#5865F2] to-cyan-400 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        A
                      </div>
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#1E1F22] rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-base truncate">Alex</span>
                        <span className="text-[#5865F2] font-black text-sm">RANK #3</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="bg-[#5865F2]/20 text-[#5865F2] px-2 py-0.2 rounded font-bold">
                          LEVEL {rankLevel}
                        </span>
                        <span>• Diamond Master</span>
                      </div>
                    </div>
                  </div>

                  {/* ASCII XP Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-300">
                      <span className="text-gray-400">Progress to Level {rankLevel + 1}</span>
                      <span className="font-bold text-white">
                        {rankXp.toLocaleString()} / {maxXp.toLocaleString()} XP ({xpPercent}%)
                      </span>
                    </div>
                    <div className="text-[#5865F2] text-xs font-mono font-bold tracking-tight">
                      {formatAsciiProgressBar(xpPercent, 'pipes', 16)}
                    </div>
                  </div>

                  {/* Activity Stats Strip */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-3 text-center text-[10px] text-gray-400">
                    <div>
                      <div className="text-white font-bold text-xs">34,180</div>
                      <div>Messages</div>
                    </div>
                    <div>
                      <div className="text-white font-bold text-xs">182 hrs</div>
                      <div>Voice Time</div>
                    </div>
                    <div>
                      <div className="text-white font-bold text-xs">42 ⭐</div>
                      <div>Starboard</div>
                    </div>
                  </div>
                </div>

                <DiscordActionRow className="mt-2.5">
                  <DiscordButton variant="primary" onClick={handleAddXp} icon="⚡">
                    Simulate Chat XP (+450 XP)
                  </DiscordButton>
                </DiscordActionRow>
              </DiscordMessage>
            </div>
          )}

          {/* ────────────────── MODULE 3: BLACKJACK TABLE ────────────────── */}
          {activeTab === 'blackjack' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <SlashCommand
                command="blackjack"
                user={{ name: 'alex', avatarUrl: undefined }}
                params={[{ name: 'bet', value: `${betAmount} coins` }]}
                className="bg-[#1E1F22]/90 border-white/10 text-gray-300"
              />

              <DiscordMessage
                author={{
                  name: 'AiCord',
                  isBot: true,
                  botBadgeText: 'APP',
                  roleColor: '#5865F2',
                }}
                timestamp="Just now"
              >
                <DiscordEmbed
                  color={gameOutcome?.includes('Win') ? '#059669' : '#D97706'}
                  title="🃏 High Roller Blackjack Table"
                  description={
                    gameOutcome
                      ? `**${gameOutcome}**`
                      : 'Vegas rules. Dealer stands on soft 17. Blackjack pays 3:2.'
                  }
                  fields={[
                    {
                      name: `Dealer Hand (${dealerRevealed ? calculateHandScore(dealerCards) : '?'})`,
                      value: dealerRevealed
                        ? dealerCards.map((c) => `\`[${c.value}${c.suit}]\``).join(' ')
                        : `\`[${dealerCards[0].value}${dealerCards[0].suit}]\` \`[ ? ]\``,
                      inline: true,
                    },
                    {
                      name: `Player Hand (${calculateHandScore(playerCards)})`,
                      value: playerCards.map((c) => `\`[${c.value}${c.suit}]\``).join(' '),
                      inline: true,
                    },
                    {
                      name: 'Active Bet',
                      value: `🪙 **${betAmount} Coins**`,
                      inline: true,
                    },
                  ]}
                  footer={{
                    text: 'Provably fair SHA-256 seed • Virtual currency only',
                  }}
                />

                <DiscordActionRow className="mt-2.5">
                  {!gameOutcome ? (
                    <>
                      <DiscordButton variant="primary" onClick={handleHit} icon="➕">
                        Hit
                      </DiscordButton>
                      <DiscordButton variant="secondary" onClick={handleStand} icon="✋">
                        Stand
                      </DiscordButton>
                      {playerCards.length === 2 && (
                        <DiscordButton variant="secondary" onClick={handleDoubleDown} icon="2️⃣">
                          Double Down
                        </DiscordButton>
                      )}
                    </>
                  ) : (
                    <DiscordButton variant="success" onClick={handleResetBlackjack} icon="🔄">
                      Deal New Hand
                    </DiscordButton>
                  )}
                </DiscordActionRow>
              </DiscordMessage>
            </div>
          )}

          {/* ────────────────── MODULE 4: TICKET HUB ────────────────── */}
          {activeTab === 'ticket' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <SlashCommand
                command="ticket"
                user={{ name: 'alex', avatarUrl: undefined }}
                params={[{ name: 'reason', value: 'Billing & Role sync dispute' }]}
                className="bg-[#1E1F22]/90 border-white/10 text-gray-300"
              />

              <DiscordMessage
                author={{
                  name: 'AiCord',
                  isBot: true,
                  botBadgeText: 'APP',
                  roleColor: '#5865F2',
                }}
                timestamp="Just now"
              >
                <DiscordEmbed
                  color={
                    ticketStatus === 'closed'
                      ? '#DC2626'
                      : ticketStatus === 'claimed'
                      ? '#0284C7'
                      : '#5865F2'
                  }
                  title={`🎫 Ticket #1042 — Billing & Role Sync [${ticketStatus.toUpperCase()}]`}
                  description="Staff dispatch initialized. Please describe your inquiry with relevant transaction identifiers."
                  fields={[
                    {
                      name: 'Creator',
                      value: '@alex',
                      inline: true,
                    },
                    {
                      name: 'Assigned Agent',
                      value:
                        ticketStatus === 'claimed' || ticketStatus === 'closed'
                          ? '👑 @Sarah (Staff Lead)'
                          : '⏳ Unclaimed',
                      inline: true,
                    },
                    {
                      name: 'Security Protocol',
                      value: 'Encrypted HTML Audit Log enabled',
                      inline: true,
                    },
                  ]}
                  footer={{
                    text:
                      ticketStatus === 'closed'
                        ? 'Transcript saved to server archives.'
                        : 'AiCord 24/7 Ticketing Engine',
                  }}
                />

                {ticketStatus !== 'closed' ? (
                  <DiscordActionRow className="mt-2.5">
                    {ticketStatus === 'open' && (
                      <DiscordButton variant="primary" onClick={handleClaimTicket} icon="🙋">
                        Claim Ticket
                      </DiscordButton>
                    )}
                    <DiscordButton variant="danger" onClick={handleCloseTicket} icon="🔒">
                      Close &amp; Transcript
                    </DiscordButton>
                  </DiscordActionRow>
                ) : (
                  <div className="mt-3 p-3 rounded-xl bg-[#1E1F22] border border-white/10 space-y-2">
                    <div className="text-xs font-mono text-gray-300 flex items-center justify-between">
                      <span>Rate Support Satisfaction (CSAT):</span>
                      {csatRating && (
                        <span className="text-emerald-400 font-bold">
                          {csatRating}/5 Stars Recorded!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRateCsat(star)}
                          className={`
                            p-1.5 text-base rounded-lg transition-transform hover:scale-125 cursor-pointer
                            ${csatRating && csatRating >= star ? 'opacity-100' : 'opacity-40 hover:opacity-100'}
                          `}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </DiscordMessage>
            </div>
          )}

          {/* ────────────────── MODULE 5: 24/7 RADIO ────────────────── */}
          {activeTab === 'radio' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <SlashCommand
                command="radio"
                user={{ name: 'alex', avatarUrl: undefined }}
                params={[{ name: 'station', value: radioStation }]}
                className="bg-[#1E1F22]/90 border-white/10 text-gray-300"
              />

              <DiscordMessage
                author={{
                  name: 'AiCord',
                  isBot: true,
                  botBadgeText: 'APP',
                  roleColor: '#5865F2',
                }}
                timestamp="Just now"
              >
                <DiscordEmbed
                  color="#7C3AED"
                  title={`📻 ${stations[radioStation].emoji} 24/7 Radio Streamer [${isPlayingRadio ? 'STREAMING' : 'PAUSED'}]`}
                  description={`Now Playing: **${stations[radioStation].name}**\nArtist: *${stations[radioStation].artist}*`}
                  fields={[
                    {
                      name: 'Channel',
                      value: '🔊 #lofi-lounge',
                      inline: true,
                    },
                    {
                      name: 'Volume',
                      value: `${radioVolume}% (Opus 128kbps)`,
                      inline: true,
                    },
                    {
                      name: 'Live Equalizer',
                      value: isPlayingRadio
                        ? '▰▰▰▰▱▱▱▱ 48kHz Stereo'
                        : '[STREAM PAUSED]',
                      inline: true,
                    },
                  ]}
                  footer={{
                    text: 'AiCord High-Fidelity Audio Core • Zero Lag Node',
                  }}
                />

                {/* Animated Equalizer Wave Visual */}
                {isPlayingRadio && (
                  <div className="p-2.5 rounded-xl bg-[#1E1F22] border border-white/10 flex items-center justify-between text-xs font-mono text-purple-300">
                    <span className="text-[11px] text-gray-400">Audio Stream:</span>
                    <div className="flex items-end gap-1 h-5">
                      <span className="w-1 bg-[#A855F7] rounded-full animate-pulse h-2" />
                      <span className="w-1 bg-[#A855F7] rounded-full animate-pulse h-4" style={{ animationDelay: '100ms' }} />
                      <span className="w-1 bg-[#A855F7] rounded-full animate-pulse h-5" style={{ animationDelay: '200ms' }} />
                      <span className="w-1 bg-[#A855F7] rounded-full animate-pulse h-3" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 bg-[#A855F7] rounded-full animate-pulse h-5" style={{ animationDelay: '300ms' }} />
                      <span className="w-1 bg-[#A855F7] rounded-full animate-pulse h-2" style={{ animationDelay: '250ms' }} />
                    </div>
                  </div>
                )}

                <DiscordActionRow className="mt-2.5">
                  <DiscordButton
                    variant={isPlayingRadio ? 'secondary' : 'success'}
                    onClick={() => {
                      playPop(480);
                      setIsPlayingRadio(!isPlayingRadio);
                    }}
                    icon={isPlayingRadio ? '⏸️' : '▶️'}
                  >
                    {isPlayingRadio ? 'Pause' : 'Resume'}
                  </DiscordButton>
                  <DiscordButton
                    variant="secondary"
                    onClick={() => {
                      playPop(520);
                      const keys: ('lofi' | 'synthwave' | 'jazz')[] = ['lofi', 'synthwave', 'jazz'];
                      const next = keys[(keys.indexOf(radioStation) + 1) % keys.length];
                      setRadioStation(next);
                    }}
                    icon="🔀"
                  >
                    Next Station
                  </DiscordButton>
                  <DiscordButton
                    variant="secondary"
                    onClick={() => {
                      playPop(440);
                      setRadioVolume((v) => (v === 100 ? 40 : v + 20));
                    }}
                    icon="🔊"
                  >
                    Vol ({radioVolume}%)
                  </DiscordButton>
                </DiscordActionRow>
              </DiscordMessage>
            </div>
          )}

          {/* ────────────────── MODULE 6: POLYGLOT COMPILER ────────────────── */}
          {activeTab === 'run' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <SlashCommand
                command="run"
                user={{ name: 'alex', avatarUrl: undefined }}
                params={[{ name: 'language', value: selectedLang }]}
                className="bg-[#1E1F22]/90 border-white/10 text-gray-300"
              />

              <DiscordMessage
                author={{
                  name: 'AiCord',
                  isBot: true,
                  botBadgeText: 'APP',
                  roleColor: '#5865F2',
                }}
                timestamp="Just now"
              >
                {/* Code Preview Box */}
                <div className="rounded-2xl bg-[#1E1F22] border border-cyan-500/30 p-3 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-gray-400 border-b border-white/10 pb-2">
                    <span className="text-cyan-400 font-bold uppercase">{selectedLang} Sandbox</span>
                    <div className="flex gap-1.5">
                      {(['python', 'rust', 'ts'] as const).map((l) => (
                        <button
                          key={l}
                          onClick={() => {
                            setSelectedLang(l);
                            setCodeOutput(null);
                            playPop(500);
                          }}
                          className={`
                            px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer
                            ${selectedLang === l ? 'bg-cyan-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}
                          `}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <pre className="text-gray-200 overflow-x-auto py-1 leading-relaxed text-[11px]">
                    {codeSnippets[selectedLang]}
                  </pre>
                </div>

                {/* Simulated Terminal Output */}
                {codeOutput && (
                  <div className="mt-2 p-3 rounded-xl bg-black/70 border border-emerald-500/30 font-mono text-xs text-emerald-400">
                    <div className="text-[10px] text-gray-500 mb-1 flex items-center justify-between">
                      <span>✓ EXECUTION STDOUT (Exit Code 0)</span>
                      <span className="text-emerald-500">Latency: 14ms</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{codeOutput}</pre>
                  </div>
                )}

                <DiscordActionRow className="mt-2.5">
                  <DiscordButton
                    variant="primary"
                    onClick={handleExecuteCode}
                    icon={isRunningCode ? '⏳' : '⚡'}
                  >
                    {isRunningCode ? 'Compiling...' : 'Run in Edge MicroVM'}
                  </DiscordButton>
                </DiscordActionRow>
              </DiscordMessage>
            </div>
          )}
        </div>
      </div>

      {/* Bottom status footnote */}
      <div className="mt-3 px-2 flex items-center justify-between text-[11px] font-mono text-[#78716C]">
        <span>Lightweight React 19 Client Simulator</span>
        <span className="text-[#5865F2] font-semibold">Sub-850ms Engine</span>
      </div>
    </div>
  );
}
