'use client';

/**
 * src/components/ui/CommandPalette.tsx
 * Sleek, interactive command palette searching all 28+ AiCord slash commands.
 * Triggerable via `/`, `Ctrl+K`, `Cmd+K`, or clickable navigation search pills.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { playPop, playSuccess } from '@/lib/audio';

export interface CommandItem {
  name: string;
  syntax: string;
  category:
    | 'AI & Synthesis'
    | 'Moderation'
    | 'Community & XP'
    | 'Economy & Games'
    | 'Support'
    | 'Voice & Audio'
    | 'Developer'
    | 'Social & Fun';
  description: string;
  permissions: string;
  badge?: string;
  example: string;
  preview: string;
}

export const COMMANDS_DATA: CommandItem[] = [
  {
    name: '/build',
    syntax: '/build prompt:<text> [template:<name>]',
    category: 'AI & Synthesis',
    description: 'Synthesizes and provisions entire Discord server topologies with categories, channels, and security matrices in under 850ms.',
    permissions: 'Administrator',
    badge: 'Flagship',
    example: '/build prompt:"Cyberpunk scrim league with 4 voice pods and match announcements"',
    preview: '⚡ Provisioned 5 categories, 18 channels, and verified 99/100 security score.',
  },
  {
    name: '/ai',
    syntax: '/ai prompt:<query> [model:<gemini-flash|pro>]',
    category: 'AI & Synthesis',
    description: 'Direct conversational intelligence powered by Google Gemini 2.5 Flash for moderation advice, digests, and guild questions.',
    permissions: 'Everyone',
    badge: 'AI Core',
    example: '/ai prompt:"Explain best practices for hosting a 64-team tournament"',
    preview: '🤖 Gemini Flash: Here is an automated schedule checklist with check-in gates...',
  },
  {
    name: '/transcribe',
    syntax: '/transcribe [action:full|summary|actions]',
    category: 'AI & Synthesis',
    description: 'Instant Google Gemini AI speech-to-text transcription for Discord voice notes and audio clips.',
    permissions: 'Everyone',
    badge: 'Speech AI',
    example: '/transcribe action:summary (right-click voice message)',
    preview: '🎙️ Audio Transcribed (32s): "Let us reschedule the tournament finals to Saturday 6 PM UTC."',
  },
  {
    name: '/rank',
    syntax: '/rank [user:<member>]',
    category: 'Community & XP',
    description: 'Displays a high-res Discord rank card with level progress, tier badge, server position, and total message tally.',
    permissions: 'Everyone',
    badge: 'Popular',
    example: '/rank user:@alex',
    preview: '🏆 Level 42 • Diamond Tier • Rank #3 of 14,200 • 8,420 / 10,000 XP (84%)',
  },
  {
    name: '/levels',
    syntax: '/levels leaderboard [page:<number>]',
    category: 'Community & XP',
    description: 'View top server contributors, XP multipliers, voice activity minutes, and automated role rewards.',
    permissions: 'Everyone',
    example: '/levels leaderboard page:1',
    preview: '🥇 #1 @sora (Lvl 58) • 🥈 #2 @kairo (Lvl 54) • 🥉 #3 @alex (Lvl 42)',
  },
  {
    name: '/birthdays',
    syntax: '/birthdays set date:<YYYY-MM-DD>',
    category: 'Community & XP',
    description: 'Automated celebratory birthday announcements with custom birthday roles and cake drops.',
    permissions: 'Everyone',
    example: '/birthdays set date:1998-04-12',
    preview: '🎂 Birthday registered for April 12th! You will receive the @Birthday Star role on your day.',
  },
  {
    name: '/reaction-roles',
    syntax: '/reaction-roles create channel:<#roles> title:<title>',
    category: 'Community & XP',
    description: 'Interactive button and dropdown menus allowing members to self-assign notification and cosmetic roles.',
    permissions: 'Manage Roles',
    example: '/reaction-roles create channel:#roles title:"Select Notification Tiers"',
    preview: '🎨 Created interactive dropdown role selector with 6 color roles and 4 game ping roles.',
  },
  {
    name: '/starboard',
    syntax: '/starboard setup channel:<#hall-of-fame> threshold:<count>',
    category: 'Community & XP',
    description: 'Automatically showcases highly-reacted community messages in a curated hall-of-fame showcase.',
    permissions: 'Manage Guild',
    example: '/starboard setup channel:#starboard threshold:5',
    preview: '⭐ Starboard configured: Messages with 5+ ⭐ reactions will be immortalized in #starboard.',
  },
  {
    name: '/blackjack',
    syntax: '/blackjack bet:<amount>',
    category: 'Economy & Games',
    description: 'Playable Vegas-rules blackjack directly inside Discord embeds with Hit, Stand, and Double Down button controls.',
    permissions: 'Everyone',
    badge: 'Interactive',
    example: '/blackjack bet:250',
    preview: '🃏 Player Hand: [K♠, 8♦] (18) vs Dealer: [J♣, ?] • Hit | Stand | Double Down',
  },
  {
    name: '/economy',
    syntax: '/economy [balance|daily|work|pay]',
    category: 'Economy & Games',
    description: 'Full virtual banking system with daily streaks, workplace shifts, peer transfers, and guild shops.',
    permissions: 'Everyone',
    example: '/economy daily',
    preview: '💰 Claimed daily bonus: +500 Coins (7-day streak multiplier: 1.5x) • Balance: 4,820 Coins',
  },
  {
    name: '/games',
    syntax: '/games [coinflip|roulette|slots|dice]',
    category: 'Economy & Games',
    description: 'Fast-paced mini-games with cryptographic server seed verification and streak counters.',
    permissions: 'Everyone',
    example: '/games coinflip bet:100 choice:heads',
    preview: '🪙 Coin flipped: HEADS! You won 200 coins! Streak: 3 in a row.',
  },
  {
    name: '/adventure',
    syntax: '/adventure [start|dungeon|inventory]',
    category: 'Economy & Games',
    description: 'Procedurally generated text-RPG dungeon crawler with turn-based monster combat, loot drops, and bosses.',
    permissions: 'Everyone',
    badge: 'RPG',
    example: '/adventure dungeon',
    preview: '⚔️ Encountered Obsidian Dragon! HP: 120/120. Select: [Strike] [Cast Spell] [Dodge] [Flee]',
  },
  {
    name: '/bounty',
    syntax: '/bounty create reward:<amount> task:<description>',
    category: 'Economy & Games',
    description: 'Server community quest board where members post tasks with coin bounties for others to claim and complete.',
    permissions: 'Everyone',
    example: '/bounty create reward:1000 task:"Create a 30s highlight reel of last night scrims"',
    preview: '🎯 Bounty #44 opened by @alex: "Highlight Reel" • Reward: 1,000 Coins • [Claim Bounty]',
  },
  {
    name: '/giveaway',
    syntax: '/giveaway start prize:<prize> duration:<1h|1d> winners:<count>',
    category: 'Economy & Games',
    description: 'Verified provably fair giveaway runner with auto-reroll, role requirement gates, and countdown timers.',
    permissions: 'Manage Messages',
    example: '/giveaway start prize:"Discord Nitro 1-Year" duration:24h winners:1',
    preview: '🎁 GIVEAWAY: Discord Nitro 1-Year • Click 🎉 to enter • Time remaining: 23h 59m',
  },
  {
    name: '/ticket',
    syntax: '/ticket [panel|claim|close]',
    category: 'Support',
    description: 'Private ephemeral support ticketing system with one-click staff claim, encrypted HTML transcripts, and CSAT rating stars.',
    permissions: 'Everyone',
    badge: 'Essential',
    example: '/ticket create reason:"Billing inquiry"',
    preview: '🎫 Ticket #1042 opened in #ticket-1042 • [Claim Ticket] [Close & Transcript]',
  },
  {
    name: '/modmail',
    syntax: '/modmail setup channel:<#modmail-inbox>',
    category: 'Support',
    description: 'Two-way DM relay system connecting members directly to staff inboxes with anonymous replying and thread archiving.',
    permissions: 'Manage Messages',
    example: '/modmail reply message:"Staff has reviewed your dispute."',
    preview: '📬 Modmail thread updated: Message delivered to user DM with staff signature.',
  },
  {
    name: '/worldclock',
    syntax: '/worldclock [set|view|meet]',
    category: 'Support',
    description: 'Cross-timezone synchronization tool for distributed teams with golden meeting hour overlap calculation.',
    permissions: 'Everyone',
    example: '/worldclock meet duration:1h',
    preview: '🌍 Golden Overlap: 14:00 - 17:00 UTC (9:00 AM NY, 2:00 PM London, 10:00 PM Tokyo)',
  },
  {
    name: '/countdown',
    syntax: '/countdown create title:<title> date:<timestamp>',
    category: 'Support',
    description: 'Live ticking event countdowns with Discord dynamic relative timestamp embed synchronization.',
    permissions: 'Everyone',
    example: '/countdown create title:"Major Update Launch" date:"2026-12-01 18:00 UTC"',
    preview: '⏳ Countdown: Major Update Launch • <t:1796148000:R> • 21 days remaining',
  },
  {
    name: '/radio',
    syntax: '/radio [play|pause|station|volume]',
    category: 'Voice & Audio',
    description: '24/7 crystal-clear voice radio featuring curated stations (Lo-Fi Chillhop, Synthwave 80s, Cyberpunk Beats, Coffeehouse Jazz).',
    permissions: 'Everyone',
    badge: 'Voice',
    example: '/radio play station:lofi',
    preview: '📻 Playing: Midnight Chillhop Beats • Station: Lo-Fi Study • Volume: 65% • [Pause] [Next]',
  },
  {
    name: '/temp-vc',
    syntax: '/temp-vc setup hub:<#Join-To-Create>',
    category: 'Voice & Audio',
    description: 'Automated disposable voice room creator. Auto-creates custom voice channel when joined and deletes when empty.',
    permissions: 'Manage Channels',
    example: '/temp-vc setup hub:#Join-To-Create',
    preview: '🔊 Hub active! Users joining #Join-To-Create get their own private voice lounge with lock controls.',
  },
  {
    name: '/clip',
    syntax: '/clip contest [create|submit|vote]',
    category: 'Voice & Audio',
    description: 'Community video clip contest organizer with community voting leaderboards and automated prize distribution.',
    permissions: 'Everyone',
    example: '/clip submit url:"https://youtube.com/watch?v=..."',
    preview: '🎬 Clip submitted to "Best Scrim Plays"! Current votes: 42 ⬆️ • Rank: #2',
  },
  {
    name: '/mod',
    syntax: '/mod [ban|kick|mute|warn|purge]',
    category: 'Moderation',
    description: 'Unified administrative moderation engine with timed infractions, audit logging, and DM notification appeals.',
    permissions: 'Moderate Members',
    badge: 'Security',
    example: '/mod mute user:@troll duration:1h reason:"Repeated spam"',
    preview: '🛡️ Case #389: @troll timed out for 1 hour by @alex. Reason logged to #mod-audit.',
  },
  {
    name: '/role',
    syntax: '/role [add|remove|create|edit]',
    category: 'Moderation',
    description: 'Comprehensive role management and hierarchy inspector with hex color adjustments and permission auditing.',
    permissions: 'Manage Roles',
    example: '/role create name:"VIP Supporter" color:#FFD700 hoist:true',
    preview: '🏷️ Role @VIP Supporter created with gold accent (#FFD700) hoisted above standard members.',
  },
  {
    name: '/channel',
    syntax: '/channel [create|edit|lock|unlock]',
    category: 'Moderation',
    description: 'Instant channel lockdown, slowmode tuning, topic updates, and automated archive categorizing.',
    permissions: 'Manage Channels',
    example: '/channel lock reason:"Emergency raid maintenance"',
    preview: '🔒 Channel #general locked for @everyone. Moderator chat remains enabled.',
  },
  {
    name: '/run',
    syntax: '/run language:<python|rust|go|ts|cpp> code:<code>',
    category: 'Developer',
    description: 'Secure, polyglot compiler sandbox executing Python, Rust, Go, TypeScript, and C++ in sub-20ms edge microVMs.',
    permissions: 'Everyone',
    badge: 'Sandbox',
    example: '/run language:python code:"print([x**2 for x in range(5)])"',
    preview: '💻 Python 3.12 Output:\n[0, 1, 4, 9, 16]\nLatency: 14ms • Memory: 12MB',
  },
  {
    name: '/git',
    syntax: '/git [subscribe|explain|issue]',
    category: 'Developer',
    description: 'GitHub and GitLab webhook integration with Gemini AI pull request explanations and issue creation.',
    permissions: 'Manage Webhooks',
    example: '/git explain pr:42 repo:"aicord/engine"',
    preview: '🐙 PR #42 Digest: Adds procedural WebAudio feedback system with 5 sound archetypes.',
  },
  {
    name: '/confess',
    syntax: '/confess message:<text>',
    category: 'Social & Fun',
    description: 'Provably anonymous confession delivery with hash masking, mod pre-moderation queue, and reaction threads.',
    permissions: 'Everyone',
    example: '/confess message:"I secretly listen to synthwave while writing documentation."',
    preview: '💌 Confession #284: "I secretly listen to synthwave while writing documentation." • ❤️ 12 | 💬 4',
  },
  {
    name: '/pet',
    syntax: '/pet [adopt|feed|play|status]',
    category: 'Social & Fun',
    description: 'Server-wide virtual mascot that gains happiness and levels through community interactions and snacks.',
    permissions: 'Everyone',
    example: '/pet feed food:cookie',
    preview: '🦊 Pixel the Fox enjoyed a Cookie! (+15 Hunger, +10 Happiness) • Level 8 Mascot',
  },
  {
    name: '/skins',
    syntax: '/skins [shop|equip|preview]',
    category: 'Social & Fun',
    description: 'Unlock cosmetic Discord embed skins, badge frames, ASCII header art, and VIP particle flair.',
    permissions: 'Everyone',
    example: '/skins equip skin:cyberpunk-neon',
    preview: '✨ Equipped Cyberpunk Neon skin for all your rank cards and interaction responses!',
  },
  {
    name: '/customize',
    syntax: '/customize theme:<cyberpunk|midnight|emerald|gold|retro|frost>',
    category: 'Social & Fun',
    description: 'Switch your server or personal embed aesthetics across 6 signature design themes.',
    permissions: 'Manage Guild',
    badge: 'Theming',
    example: '/customize theme:midnight',
    preview: '🎨 Guild theme updated to Midnight Royale ★ ━━━━━ MIDNIGHT ROYALE ━━━━━ ★',
  },
  {
    name: '/premium',
    syntax: '/premium [buy|status|activate]',
    category: 'Support',
    description: 'Check guild subscription tier, redeem lifetime license keys, and manage Stripe checkout passes.',
    permissions: 'Administrator',
    badge: 'Stripe',
    example: '/premium status',
    preview: '👑 Guild Tier: AiCord Sovereign Lifetime Pass • 28 Active Modules • Priority AI Compute',
  },
];

const CATEGORIES = [
  'All',
  'AI & Synthesis',
  'Moderation',
  'Community & XP',
  'Economy & Games',
  'Support',
  'Voice & Audio',
  'Developer',
  'Social & Fun',
] as const;

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for global shortcut `/` or `Ctrl+K` / `Cmd+K`
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing inside an input or textarea, don't trigger `/`
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (!isInput && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = (e?: Event) => {
      const detail = (e as CustomEvent<{ query?: string }>)?.detail;
      if (detail && typeof detail.query === 'string') {
        setQuery(detail.query);
      }
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('aicord-open-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('aicord-open-palette', handleCustomOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      playPop(520);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    return COMMANDS_DATA.filter((cmd) => {
      const matchesCategory = selectedCategory === 'All' || cmd.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        cmd.name.toLowerCase().includes(q) ||
        cmd.syntax.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
      );
    });
  }, [query, selectedCategory]);

  const activeCommand = filteredCommands[selectedIndex] || filteredCommands[0] || COMMANDS_DATA[0];

  const handleCopy = (syntax: string, name: string) => {
    navigator.clipboard.writeText(syntax).catch(() => {});
    setCopiedName(name);
    playSuccess();
    setTimeout(() => setCopiedName(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 pb-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-4xl bg-white border border-[#E7E2DA] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top search header */}
        <div className="p-4 sm:p-5 border-b border-[#E7E2DA] bg-[#FDFBF7] flex items-center gap-3">
          <span className="text-[#5865F2] font-mono text-xl font-black">/</span>
          <input
            ref={inputRef}
            type="text"
            id="command-palette-title"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search all 28+ commands (e.g. build, rank, blackjack, run, ticket)..."
            className="flex-1 bg-transparent border-none outline-none font-mono text-sm sm:text-base text-[#1C1917] placeholder:text-[#A8A29E]"
          />
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[#78716C] bg-stone-100 px-2.5 py-1 rounded-lg border border-[#E7E2DA]">
            <kbd className="font-bold">ESC</kbd>
            <span>to close</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="sm:hidden text-stone-500 hover:text-stone-800 p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Category filter pills */}
        <div className="px-4 py-2.5 border-b border-[#E7E2DA] bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedIndex(0);
                playPop(480);
              }}
              className={`
                px-3 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap transition-colors cursor-pointer
                ${
                  selectedCategory === cat
                    ? 'bg-[#1C1917] text-white shadow-xs'
                    : 'bg-stone-100 text-[#57534E] hover:bg-stone-200/70 hover:text-[#1C1917]'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Two-column layout: command list on left, command inspector on right */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[360px] overflow-hidden">
          {/* Left: Command List */}
          <div className="md:col-span-5 border-r border-[#E7E2DA] overflow-y-auto max-h-[380px] md:max-h-[500px] p-2 space-y-1">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#78716C]">
                No commands matching &ldquo;{query}&rdquo;
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={cmd.name}
                    onClick={() => {
                      setSelectedIndex(idx);
                      playPop(440);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`
                      p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between text-left
                      ${
                        isSelected
                          ? 'bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#1C1917]'
                          : 'hover:bg-stone-50 text-[#57534E] border border-transparent'
                      }
                    `}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#1C1917]">
                          {cmd.name}
                        </span>
                        {cmd.badge && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5865F2]/15 text-[#5865F2] font-semibold">
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#78716C] truncate mt-0.5 font-sans">
                        {cmd.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#A8A29E] shrink-0">
                      {cmd.category.split(' ')[0]}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Detailed Command Inspector */}
          <div className="md:col-span-7 p-5 sm:p-6 bg-[#FDFBF7]/60 overflow-y-auto max-h-[500px] flex flex-col justify-between">
            {activeCommand ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#5865F2] font-bold uppercase tracking-wider">
                      {activeCommand.category}
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-stone-200 text-[#57534E] font-medium">
                      🔒 {activeCommand.permissions}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black font-mono text-[#1C1917] mt-1">
                    {activeCommand.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#57534E] font-sans mt-2 leading-relaxed">
                    {activeCommand.description}
                  </p>
                </div>

                {/* Syntax Code Box */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#78716C] font-semibold">
                    Command Syntax
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#1E1F22] text-[#5865F2] border border-black/20 font-mono text-xs">
                    <span className="text-[#58F0A5] truncate mr-2">{activeCommand.syntax}</span>
                    <button
                      onClick={() => handleCopy(activeCommand.syntax, activeCommand.name)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans shrink-0 transition-colors cursor-pointer"
                    >
                      {copiedName === activeCommand.name ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Example Call */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#78716C] font-semibold">
                    Interactive Usage Example
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-[#E7E2DA] font-mono text-xs text-[#1C1917] shadow-xs">
                    <span className="text-[#5865F2] font-bold">$ </span>
                    {activeCommand.example}
                  </div>
                </div>

                {/* Bot Response Embed Preview */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#78716C] font-semibold">
                    Simulated Bot Output
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#2B2D31] text-stone-200 border-l-4 border-l-[#5865F2] font-mono text-xs shadow-inner leading-relaxed">
                    <div className="text-[11px] text-[#5865F2] font-bold mb-1 flex items-center gap-1.5">
                      <span>AiCord</span>
                      <span className="bg-[#5865F2] text-white text-[9px] px-1 py-0.2 rounded font-bold">APP</span>
                    </div>
                    {activeCommand.preview}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-4 border-t border-[#E7E2DA] flex items-center justify-between text-[11px] font-mono text-[#78716C]">
              <span>Tip: Press <kbd className="px-1 py-0.5 bg-stone-200 rounded font-bold">/</kbd> anywhere to re-open</span>
              <span className="text-[#5865F2] font-semibold">28 Modules Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Trigger helper to open the command palette programmatically from anywhere.
 */
export function openCommandPalette(query?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aicord-open-palette', { detail: { query } }));
  }
}
