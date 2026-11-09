'use client';

import React, { useState, useMemo } from 'react';

type ServiceCategory =
  | 'all'
  | 'power'
  | 'core'
  | 'mod'
  | 'economy'
  | 'games'
  | 'community';

interface ServiceItem {
  id: string;
  name: string;
  command: string;
  icon: string;
  category: ServiceCategory;
  categoryLabel: string;
  badge?: string;
  description: string;
  sampleUsage: string;
  features: string[];
}

const SERVICES: ServiceItem[] = [
  // ─── The 10 Brand-New Power Services ──────────────────────────────────────
  {
    id: 'confess',
    name: 'Anonymous Confessions & Matchmaker',
    command: '/confess',
    icon: '💌',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Anonymous server confessions with reply threads, reaction voting (wholesome, funny, red flag), and secret mutual crush matchmaking.',
    sampleUsage: '/confess post text:"I secretly love coding late at night"',
    features: ['Threaded replies', 'Secret crush detector', 'Reaction vote counters'],
  },
  {
    id: 'run',
    name: 'Interactive Code Sandbox',
    command: '/run',
    icon: '⚡',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Execute JavaScript, TypeScript, Python, Rust, Go, and C++ directly within Discord with instant stdout/stderr output, execution timing, and error reporting.',
    sampleUsage: '/run lang:python code:"print([x**2 for x in range(10)])"',
    features: ['Multi-language runtime', 'Execution benchmark', 'Safe sandboxing'],
  },
  {
    id: 'pet',
    name: 'Virtual Server Pets',
    command: '/pet',
    icon: '🐾',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Adopt, feed, train, and level up virtual companions (Cyber Dragon, Neon Wolf, Robo Kitty) with turn-based RPG battle duels and leaderboards.',
    sampleUsage: '/pet adopt species:dragon name:"Ignis"',
    features: ['Hunger/happiness meters', 'Turn-based duels', 'Species evolutions'],
  },
  {
    id: 'worldclock',
    name: 'World Clock & Meeting Finder',
    command: '/worldclock',
    icon: '🌐',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Global timezone management, 24h visual timeline rendering, and automated meeting golden hour detector across distributed international teams.',
    sampleUsage: '/worldclock meet duration_hours:2',
    features: ['IANA timezone normalization', 'Visual ASCII timeline', 'Golden hour calculation'],
  },
  {
    id: 'transcribe',
    name: 'Gemini Audio Transcriber & TL;DR',
    command: '/transcribe',
    icon: '🎙️',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Transcribe Discord voice messages and audio attachments into text with key bullet-point summaries and sentiment analysis powered by Gemini AI.',
    sampleUsage: '/transcribe audio_attachment:[voice-msg.ogg]',
    features: ['High-accuracy speech-to-text', 'Executive bullet summaries', 'Sentiment detection'],
  },
  {
    id: 'git',
    name: 'GitHub & GitLab Webhook Hub',
    command: '/git',
    icon: '🐙',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Stream commits, pull requests, and issues directly into channels with automated Gemini AI plain-English PR explanations for non-technical members.',
    sampleUsage: '/git subscribe repo:"owner/repo" channel:#dev-feed',
    features: ['Push, PR, issue feeds', 'AI plain-English PR explainer', 'Multi-repo feeds'],
  },
  {
    id: 'tempvc',
    name: 'Dynamic Temporary Voice Rooms',
    command: '/temp-vc',
    icon: '🔊',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Auto-provision private disposable voice channels upon joining hub rooms. Includes creator dashboard, bitrate/user limits, kick, and lock controls.',
    sampleUsage: '/temp-vc setup hub_channel:#Join-to-Create',
    features: ['Instant channel creation', 'Auto-cleanup on empty', 'Creator control panel'],
  },
  {
    id: 'quiz',
    name: 'Kahoot-Style Live Quiz Show',
    command: '/quiz',
    icon: '🏆',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Host real-time multiplayer trivia competitions with timed answer buttons, speed-based scoring multipliers, live podium animations, and guild rankings.',
    sampleUsage: '/quiz start rounds:5 topic:"Cybersecurity"',
    features: ['Real-time countdown buttons', 'Speed bonus points', 'Animated winner podium'],
  },
  {
    id: 'countdown',
    name: 'Live Event Countdowns',
    command: '/countdown',
    icon: '⏳',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Dynamic countdown tickers for product launches, tournaments, and server anniversaries with timezone conversions, Discord timestamp syntax, and reminders.',
    sampleUsage: '/countdown create title:"Season 4 Launch" target:"2026-12-01"',
    features: ['Discord relative timestamps', 'Auto-updating embeds', 'Channel notification pings'],
  },
  {
    id: 'clip',
    name: 'Community Gaming Clip Competitions',
    command: '/clip',
    icon: '🎬',
    category: 'power',
    categoryLabel: 'Power Service',
    badge: 'NEW',
    description: 'Submit video clips, participate in weekly highlight contests, and vote via interactive buttons with automated winner calculation and economy prize payouts.',
    sampleUsage: '/clip submit url:"https://youtube.com/..." title:"Ace in Round 24"',
    features: ['One-click button voting', 'Automated weekly awards', 'Treasury coin bounties'],
  },

  // ─── Core Platform ─────────────────────────────────────────────────────────
  {
    id: 'build',
    name: 'AI Server Architect Synthesis',
    command: '/build',
    icon: '🤖',
    category: 'core',
    categoryLabel: 'Core & AI',
    description: 'Generate full Discord server category architectures, channels, role hierarchies, and permission overrides from natural language prompts.',
    sampleUsage: '/build prompt:"Design an Esports tournament server with scrim channels"',
    features: ['Google Gemini 2.5 AI', 'Complete permission overrides', 'Deterministic diff generator'],
  },
  {
    id: 'customize',
    name: 'Universal Custom Screens Suite',
    command: '/customize',
    icon: '🎨',
    category: 'core',
    categoryLabel: 'Core & AI',
    description: 'Transform rank, profile, and balance embeds with 6 curated color themes, 4 ASCII progress bar styles, and server-wide visual branding.',
    sampleUsage: '/customize profile rank_theme:cyberpunk bar_style:pipes',
    features: ['6 Master color themes', 'ASCII progress renderers', 'Real-time interactive preview'],
  },
  {
    id: 'premium',
    name: 'Server Entitlement & License Engine',
    command: '/premium',
    icon: '💎',
    category: 'core',
    categoryLabel: 'Core & AI',
    description: 'Inspect guild subscription tier, meter consumption, and redeem HMAC-SHA256 signed license keys for Pro, Ultimate, and Lifetime status.',
    sampleUsage: '/premium redeem license_key:AICORD-PRO-XXXX-YYYY',
    features: ['HMAC license verification', 'Granular quota meters', 'Permanent VIP founder override'],
  },
  {
    id: 'audit',
    name: 'Config Audit Logger Engine',
    command: '/audit',
    icon: '📜',
    category: 'core',
    categoryLabel: 'Core & AI',
    description: 'Track and log all administrative actions, configuration changes, channel modifications, and security incidents with deep-diff tracking.',
    sampleUsage: '/audit view limit:15 action:CONFIG_UPDATE',
    features: ['Full JSON diff tracking', 'Moderator accountability', 'Automated exportable history'],
  },

  // ─── Moderation & Administration ──────────────────────────────────────────
  {
    id: 'ban',
    name: 'High-Performance Ban Engine',
    command: '/ban',
    icon: '🔨',
    category: 'mod',
    categoryLabel: 'Moderation',
    description: 'Permanently ban malicious actors with optional message prune history (1-7 days), DM notifications, and automated mod-case recording.',
    sampleUsage: '/ban user:@troublemaker delete_message_days:7 reason:"Spamming raid links"',
    features: ['Message pruning', 'Mod case indexing', 'DM notification'],
  },
  {
    id: 'kick',
    name: 'Rapid Kick Handler',
    command: '/kick',
    icon: '👢',
    category: 'mod',
    categoryLabel: 'Moderation',
    description: 'Remove disruptive users cleanly with hierarchy verification, logged audit records, and DM notification embeds.',
    sampleUsage: '/kick user:@disruptive reason:"Rule 2 violation"',
    features: ['Role hierarchy checks', 'Audit logging', 'Instant execution'],
  },
  {
    id: 'timeout',
    name: 'Smart Timeout & Mute',
    command: '/timeout',
    icon: '⏳',
    category: 'mod',
    categoryLabel: 'Moderation',
    description: 'Temporarily isolate unruly members with natural duration parsing (60s, 10m, 2h, 1d) with automated temp-action cron scheduling.',
    sampleUsage: '/timeout user:@user duration:"1 hour" reason:"Cool off period"',
    features: ['Flexible duration strings', 'Cron expiration watcher', 'DM receipt'],
  },
  {
    id: 'warn',
    name: 'Progressive Infraction Warning System',
    command: '/warn',
    icon: '⚠️',
    category: 'mod',
    categoryLabel: 'Moderation',
    description: 'Issue formal warnings to members with escalating automated penalties (warn -> timeout -> kick -> ban) and searchable infraction logs.',
    sampleUsage: '/warn user:@user reason:"Inappropriate language in #general"',
    features: ['Warning threshold rules', 'Escalating disciplinary actions', 'Moderator logs'],
  },
  {
    id: 'purge',
    name: 'Bulk Message Purge & Cleaner',
    command: '/purge',
    icon: '🧹',
    category: 'mod',
    categoryLabel: 'Moderation',
    description: 'Safely bulk delete 1-100 messages with optional filtering by author, bot status, embeds, or containing specific keyword patterns.',
    sampleUsage: '/purge amount:50 user:@spammer filter:links',
    features: ['User and content filters', 'Discord 14-day limit compliance', 'Ephemeral confirmation'],
  },
  {
    id: 'role',
    name: 'Granular Role Management',
    command: '/role',
    icon: '🏷️',
    category: 'mod',
    categoryLabel: 'Moderation',
    description: 'Create, assign, edit, hoist, and colorize server roles with strict hierarchy checks and audit log tracking.',
    sampleUsage: '/role add user:@member role:@Elite-Gamer',
    features: ['Hex color formatting', 'Permission bitfield configuration', 'Hoist & mention toggles'],
  },
  {
    id: 'channel',
    name: 'Channel Orchestrator',
    command: '/channel',
    icon: '📁',
    category: 'mod',
    categoryLabel: 'Moderation',
    description: 'Programmatically create, edit, lock, slowmode, and delete text, voice, and announcement channels.',
    sampleUsage: '/channel create name:"scrim-results" type:text category:"TOURNAMENTS"',
    features: ['Slowmode control', 'NSFW gating', 'Category auto-sync'],
  },
  {
    id: 'category',
    name: 'Category Architect',
    command: '/category',
    icon: '🗂️',
    category: 'mod',
    categoryLabel: 'Moderation',
    description: 'Provision and reorganize server categories and auto-propagate permission overrides to all member channels.',
    sampleUsage: '/category create name:"STAFF OPERATIONS" position:1',
    features: ['Permission syncing', 'Drag position indexing', 'Bulk channel management'],
  },

  // ─── Progression & Economy ─────────────────────────────────────────────────
  {
    id: 'rank',
    name: 'Themed Experience & Rank Card',
    command: '/rank',
    icon: '🎖️',
    category: 'economy',
    categoryLabel: 'Economy & Levels',
    description: 'Display interactive profile rank cards rendered with custom themes, ASCII level meters, voice XP, and global ranking position.',
    sampleUsage: '/rank user:@self',
    features: ['Voice & chat XP', 'Multi-style ASCII bars', 'Leaderboard rankings'],
  },
  {
    id: 'leaderboard',
    name: 'Global Server Leaderboards',
    command: '/leaderboard',
    icon: '🏆',
    category: 'economy',
    categoryLabel: 'Economy & Levels',
    description: 'Browse top server members by XP, liquid coin wealth, minigame victories, or trivia score with pagination controls.',
    sampleUsage: '/leaderboard type:xp limit:10',
    features: ['Interactive pagination', 'Top 3 trophy formatting', 'Server & global scope'],
  },
  {
    id: 'balance',
    name: 'Treasury Wallet & Portfolio',
    command: '/balance',
    icon: '💰',
    category: 'economy',
    categoryLabel: 'Economy & Levels',
    description: 'Check cash wallet, bank deposits, net worth valuation, crypto gems, and inventory value across the guild economy.',
    sampleUsage: '/balance',
    features: ['Bank interest system', 'Liquid vs Stashed assets', 'Themed Treasury card'],
  },
  {
    id: 'daily',
    name: 'Daily Streak Rewards',
    command: '/daily',
    icon: '🎁',
    category: 'economy',
    categoryLabel: 'Economy & Levels',
    description: 'Claim daily economy currency bonuses with streak multipliers and bonus lootbox rewards for consistent active members.',
    sampleUsage: '/daily',
    features: ['Consecutive day bonus', 'Random loot drops', 'Auto-reset countdown'],
  },
  {
    id: 'work',
    name: 'Career & Employment Engine',
    command: '/work',
    icon: '💼',
    category: 'economy',
    categoryLabel: 'Economy & Levels',
    description: 'Undertake funny thematic jobs (Discord Moderator, Code Reviewer, Quantum Physicist) to earn coins with dynamic salary RNG.',
    sampleUsage: '/work',
    features: ['10+ Themed professions', 'Cooldown pacing', 'Experience gains'],
  },
  {
    id: 'crime',
    name: 'High-Stakes Heist Engine',
    command: '/crime',
    icon: '🦹',
    category: 'economy',
    categoryLabel: 'Economy & Levels',
    description: 'Attempt high-risk criminal ventures with big payouts or risk getting caught and fined by the automated server police.',
    sampleUsage: '/crime',
    features: ['Risk vs reward math', 'Bail bond mechanic', 'Themed escape narratives'],
  },
  {
    id: 'shop',
    name: 'Custom Server Economy Shop',
    command: '/shop',
    icon: '🏪',
    category: 'economy',
    categoryLabel: 'Economy & Levels',
    description: 'Browse and purchase custom server roles, vanity perks, skin items, and lootboxes configured by server administrators.',
    sampleUsage: '/shop buy item_id:"vip-gold"',
    features: ['Automated role granting', 'Inventory tracking', 'Custom server items'],
  },
  {
    id: 'rich',
    name: 'Tycoon Forbes 100 Roster',
    command: '/rich',
    icon: '🪙',
    category: 'economy',
    categoryLabel: 'Economy & Levels',
    description: 'Inspect the server oligarchs with rich wealth calculations combining liquid coins, bank vaults, and rare inventory collectibles.',
    sampleUsage: '/rich',
    features: ['Net worth aggregation', 'Golden Tycoon styling', 'Interactive rank jump'],
  },

  // ─── Minigames & Entertainment ─────────────────────────────────────────────
  {
    id: 'blackjack',
    name: 'Vegas Blackjack 21',
    command: '/blackjack',
    icon: '🃏',
    category: 'games',
    categoryLabel: 'Minigames',
    description: 'Play high-stakes casino blackjack with Hit, Stand, Double Down interactive buttons and realistic 6-deck shoe shuffling.',
    sampleUsage: '/blackjack bet:500',
    features: ['Interactive button controls', 'Dealer soft-17 rules', '2.5x Blackjack payout'],
  },
  {
    id: 'slots',
    name: 'Neon Cyber Slot Machine',
    command: '/slots',
    icon: '🎰',
    category: 'games',
    categoryLabel: 'Minigames',
    description: 'Pull the holographic cyber slot lever with animated rolling reels, jackpot sirens, and multi-symbol multiplier matches.',
    sampleUsage: '/slots bet:250',
    features: ['Animated reel spins', '777 Mega-Jackpot', 'Visual ASCII payout table'],
  },
  {
    id: 'trivia',
    name: 'Single & Team Trivia Arena',
    command: '/trivia',
    icon: '💡',
    category: 'games',
    categoryLabel: 'Minigames',
    description: 'Test your knowledge across science, tech, gaming, history, and pop culture with timed interactive multiple-choice buttons.',
    sampleUsage: '/trivia category:science',
    features: ['500+ Curated questions', 'Timed interactive buttons', 'Explanation footnotes'],
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors Duel',
    command: '/rps',
    icon: '✂️',
    category: 'games',
    categoryLabel: 'Minigames',
    description: 'Challenge the bot or another server member to a wagered Rock Paper Scissors showdown with secret choice buttons.',
    sampleUsage: '/rps bet:100',
    features: ['Secret choice selection', 'Wagered payouts', 'Tie match rematches'],
  },
  {
    id: 'coinflip',
    name: 'High-Roller Coinflip',
    command: '/coinflip',
    icon: '🪙',
    category: 'games',
    categoryLabel: 'Minigames',
    description: 'Double your money or lose it all with instant 50/50 provably-fair cryptographic coin flips.',
    sampleUsage: '/coinflip side:heads bet:1000',
    features: ['Cryptographic randomness', 'Double or nothing payouts', 'Streak counter'],
  },

  // ─── Operational Community Hubs ───────────────────────────────────────────
  {
    id: 'ticket',
    name: 'Support Ticket System & Transcripts',
    command: '/ticket',
    icon: '🎫',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Interactive button ticket panels, private staff channels, one-click claim, and full HTML transcript generation for dispute resolution.',
    sampleUsage: '/ticket panel channel:#support title:"Submit a Ticket"',
    features: ['Private staff channels', 'HTML transcript logging', 'Staff claim buttons'],
  },
  {
    id: 'birthday',
    name: 'Birthday Celebrator & Role Grant',
    command: '/birthday',
    icon: '🎂',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Never miss a community member birthday. Automated celebratory announcements, temporary VIP birthday roles, and cake emojis.',
    sampleUsage: '/birthday set month:8 day:15',
    features: ['Timezone-aware midnight scheduler', 'Automated role gifting', 'Customizable birthday embeds'],
  },
  {
    id: 'reactionrole',
    name: 'Button & Dropdown Reaction Roles',
    command: '/reaction-role',
    icon: '🎛️',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Publish beautiful embeds featuring interactive buttons or dropdown menus allowing members to toggle game, notification, and cosmetic roles.',
    sampleUsage: '/reaction-role publish panel_id:notifications',
    features: ['Select menus & buttons', 'Max role limits', 'Instant Discord REST assignment'],
  },
  {
    id: 'starboard',
    name: 'Community Hall of Fame Starboard',
    command: '/starboard',
    icon: '⭐',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Pin the best messages, memes, and fan-art to a dedicated starboard channel when they reach the community star reaction threshold.',
    sampleUsage: '/starboard setup channel:#starboard threshold:5',
    features: ['Configurable star threshold', 'Jump link to original message', 'Author star leaderboard'],
  },
  {
    id: 'giveaway',
    name: 'Verifiable Giveaway Raffle Engine',
    command: '/giveaway',
    icon: '🎉',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Host item and Nitro giveaways with interactive "Enter" buttons, role requirements, countdown timers, and provably fair winner selection.',
    sampleUsage: '/giveaway start duration:"24h" winners:3 prize:"Discord Nitro"',
    features: ['One-click entry button', 'Provably fair randomizer', 'Auto-reroll command'],
  },
  {
    id: 'modmail',
    name: 'Confidential Modmail Desk',
    command: '/modmail',
    icon: '📬',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Direct DM-to-server staff ticket communication. Members message the bot in DMs and staff respond from dedicated private thread channels.',
    sampleUsage: '/modmail reply message:"We have investigated your report."',
    features: ['Complete DM-to-channel bridge', 'Anonymous staff replies', 'Thread closure transcripts'],
  },
  {
    id: 'bounty',
    name: 'Server Task & Bug Bounty Board',
    command: '/bounty',
    icon: '🎯',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Post coin bounties for server artwork, code contributions, or gaming tasks. Members submit proof and creators approve payouts with buttons.',
    sampleUsage: '/bounty create reward:5000 title:"Design new server logo"',
    features: ['Escrow wallet protection', 'Submission proof verification', 'Instant coin dispatch'],
  },
  {
    id: 'adventure',
    name: 'Gemini AI Dynamic RPG Dungeon',
    command: '/adventure',
    icon: '🗡️',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Dynamic text RPG powered by Google Gemini AI. Battle fantasy monsters, navigate trap rooms, find legendary loot, and climb dungeon floors.',
    sampleUsage: '/adventure explore',
    features: ['AI-generated encounters', 'Turn-based battle choices', 'Loot inventory & levels'],
  },
  {
    id: 'radio',
    name: '24/7 Voice Radio & Audio Streamer',
    command: '/radio',
    icon: '📻',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Continuous 24/7 high-fidelity music streaming across voice channels. Features 6 curated streams: Lofi Chill, Synthwave, Gaming Beats, Jazz, Ambient, and Metal.',
    sampleUsage: '/radio play station:synthwave',
    features: ['24/7 Uninterrupted streaming', 'ASCII volume & equalizer', 'Interactive station dropdown'],
  },
  {
    id: 'skins',
    name: 'Skins, Lootboxes & Unboxing Vault',
    command: '/unbox',
    icon: '📦',
    category: 'community',
    categoryLabel: 'Community Hubs',
    description: 'Open mystery lootboxes with CS:GO style unboxing animation, collect rare cosmetic skins, and customize your profile card frames and weapon emblems.',
    sampleUsage: '/unbox case:cyber_case',
    features: ['Animated reveal sequence', 'Tiered skin rarities', 'Tradable inventory'],
  },
];

export default function ServicesCatalog() {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredServices = useMemo(() => {
    return SERVICES.filter((srv) => {
      const matchesCategory =
        activeCategory === 'all' || srv.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        srv.name.toLowerCase().includes(q) ||
        srv.command.toLowerCase().includes(q) ||
        srv.description.toLowerCase().includes(q) ||
        srv.features.some((f) => f.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const categories: Array<{ id: ServiceCategory; label: string; count: number }> = [
    { id: 'all', label: 'All Services', count: SERVICES.length },
    { id: 'power', label: '⚡ New Power 10', count: SERVICES.filter((s) => s.category === 'power').length },
    { id: 'core', label: '🤖 Core & AI', count: SERVICES.filter((s) => s.category === 'core').length },
    { id: 'mod', label: '🛡️ Moderation', count: SERVICES.filter((s) => s.category === 'mod').length },
    { id: 'economy', label: '💰 Economy & Ranks', count: SERVICES.filter((s) => s.category === 'economy').length },
    { id: 'games', label: '🎲 Minigames', count: SERVICES.filter((s) => s.category === 'games').length },
    { id: 'community', label: '🌐 Community Hubs', count: SERVICES.filter((s) => s.category === 'community').length },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 relative">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          FULL ECOSYSTEM DIRECTORY
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          All 30+ Enterprise Discord Services
        </h2>
        <p className="text-base text-gray-400 mt-3">
          Built into a unified Next.js 16 micro-architecture. Zero third-party bot bloat, zero fragmentation,
          and tested with 1,477 automated integration test assertions.
        </p>

        {/* Live Search Bar */}
        <div className="mt-8 max-w-md mx-auto relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands (e.g. /run, /confess, radio, xp)..."
            className="w-full px-4 py-3 pl-11 rounded-2xl bg-black/60 border border-white/10 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all backdrop-blur-md"
          />
          <span className="absolute left-4 top-3.5 text-gray-500 text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3.5 text-xs font-mono text-gray-400 hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center justify-center flex-wrap gap-2 mb-10">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono transition-all duration-200 flex items-center gap-2 ${
                isSelected
                  ? 'bg-cyan-500 text-black font-extrabold shadow-lg shadow-cyan-500/25 scale-[1.03]'
                  : 'bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((srv) => (
          <div
            key={srv.id}
            className={`rounded-2xl bg-[#0e1220]/80 border p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl backdrop-blur-xl group relative overflow-hidden ${
              srv.category === 'power'
                ? 'border-purple-500/40 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                : 'border-white/10 hover:border-cyan-400/50'
            }`}
          >
            {/* Top ambient hover accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform">
                    {srv.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                      {srv.name}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-400">
                      {srv.categoryLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {srv.badge && (
                    <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white uppercase tracking-wider shadow">
                      {srv.badge}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-white/10 font-mono text-xs font-bold text-cyan-300">
                    {srv.command}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                {srv.description}
              </p>

              {/* Feature Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {srv.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5"
                  >
                    • {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Sample Command Usage Pill */}
            <div className="pt-3 border-t border-white/5">
              <div className="text-[10px] font-mono text-gray-500 uppercase mb-1">
                Command Syntax Sample:
              </div>
              <div className="p-2 rounded-lg bg-black/60 border border-white/5 font-mono text-[11px] text-cyan-300 truncate select-all">
                {srv.sampleUsage}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div className="text-center py-16">
          <span className="text-4xl">🔍</span>
          <h4 className="text-lg font-bold text-white mt-3">No matching services found</h4>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Try searching for &quot;run&quot;, &quot;confess&quot;, &quot;pet&quot;, &quot;voice&quot;, or &quot;trivia&quot;.
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-black font-mono font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
