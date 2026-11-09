/**
 * src/config/features.ts
 * 18 Master Services + 10 Next-Gen Services catalog from Section 6 of spec.
 * Structured with id, name, icon, commands, pitch, tier, and status ('live' | 'beta' | 'coming-soon').
 */

export type FeatureTier = 'free' | 'pro' | 'ultimate' | 'lifetime';
export type FeatureStatus = 'live' | 'beta' | 'coming-soon';
export type FeatureCategory = 'core' | 'mod' | 'economy' | 'games' | 'community' | 'next-gen';

export interface ServiceFeature {
  id: string;
  name: string;
  icon: string;
  commands: string[];
  pitch: string;
  description: string;
  category: FeatureCategory;
  categoryLabel: string;
  tier: FeatureTier;
  status: FeatureStatus;
  isNextGen: boolean;
  features: string[];
  sampleUsage: string;
}

export const MASTER_SERVICES: ServiceFeature[] = [
  // ─── 1. AI Server Architect Synthesis ─────────────────────────────────────
  {
    id: 'build',
    name: 'AI Server Architect Synthesis',
    icon: '🤖',
    commands: ['/build', '/undo-build'],
    pitch: 'Synthesize full Discord server structures from natural-language prompts in 15 seconds.',
    description:
      'Converts complex community ideas into structured Discord channels, categories, role hierarchies, and permission overrides with Google Gemini 2.5 and rollback safety.',
    category: 'core',
    categoryLabel: 'Core Architecture',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Instant channel & category creation', 'Role hierarchy & overrides', 'One-click rollback engine'],
    sampleUsage: '/build prompt:"Design an Esports tournament server with scrim channels"',
  },
  // ─── 2. Universal Custom Screens Suite ─────────────────────────────────────
  {
    id: 'customize',
    name: 'Universal Custom Screens Suite',
    icon: '🎨',
    commands: ['/customize'],
    pitch: 'Transform rank cards and embeds with 6 curated color themes and 4 ASCII bar styles.',
    description:
      'Customize profile rank embeds, balance cards, and server banners with signature themes (Cyberpunk, Frost, Midnight, Emerald, Gold, Retro) and ASCII progress bars.',
    category: 'core',
    categoryLabel: 'Core Architecture',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['6 Master color themes', '4 ASCII bar styles (pipes/blocks/squares/retro)', 'Real-time embed switcher'],
    sampleUsage: '/customize profile rank_theme:cyberpunk bar_style:pipes',
  },
  // ─── 3. Server Entitlement & License Engine ───────────────────────────────
  {
    id: 'premium',
    name: 'Server Entitlement & License Engine',
    icon: '💎',
    commands: ['/premium'],
    pitch: 'Cryptographically verify server tiers, usage quotas, and HMAC license activations.',
    description:
      'Provides license key redemption, usage quota inspection, and perpetual founder overrides for Pro, Ultimate, and Sovereign tiers.',
    category: 'core',
    categoryLabel: 'Core Architecture',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['HMAC-SHA256 signature verification', 'Granular quota meters', 'Permanent VIP founder override'],
    sampleUsage: '/premium redeem license_key:AICORD-PRO-XXXX-YYYY',
  },
  // ─── 4. Config Audit Logger Engine ─────────────────────────────────────────
  {
    id: 'audit',
    name: 'Config Audit Logger Engine',
    icon: '📜',
    commands: ['/audit'],
    pitch: 'Track all administrative modifications and security events with deep JSON diffs.',
    description:
      'Immutable audit trail recording guild settings changes, role mutations, channel modifications, and operator actions with full accountability.',
    category: 'core',
    categoryLabel: 'Core Architecture',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Deep JSON object diffing', 'Moderator accountability', 'Exportable incident records'],
    sampleUsage: '/audit view limit:15 action:CONFIG_UPDATE',
  },
  // ─── 5. High-Performance Ban Engine ─────────────────────────────────────────
  {
    id: 'ban',
    name: 'High-Performance Ban Engine',
    icon: '🔨',
    commands: ['/ban', '/unban'],
    pitch: 'Permanently remove malicious actors with automatic message pruning and mod-case indexing.',
    description:
      'Executes instant ban operations with customizable message prune days (1-7), DM notifications, and indexed disciplinary case records.',
    category: 'mod',
    categoryLabel: 'Moderation & Safety',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['1-7 day message purging', 'Case ID generation', 'Automated DM notification'],
    sampleUsage: '/ban user:@troublemaker delete_message_days:7 reason:"Spamming raid links"',
  },
  // ─── 6. Rapid Kick Handler ────────────────────────────────────────────────
  {
    id: 'kick',
    name: 'Rapid Kick Handler',
    icon: '👢',
    commands: ['/kick'],
    pitch: 'Eject disruptive members with strict role hierarchy verification.',
    description:
      'Safely kicks members who violate server guidelines while checking invoker and bot role hierarchy permissions.',
    category: 'mod',
    categoryLabel: 'Moderation & Safety',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Role hierarchy validation', 'Audit log registration', 'Direct DM notification'],
    sampleUsage: '/kick user:@disruptive reason:"Disrespecting community rules"',
  },
  // ─── 7. Smart Timeout & Mute ───────────────────────────────────────────────
  {
    id: 'timeout',
    name: 'Smart Timeout & Mute',
    icon: '⏳',
    commands: ['/timeout'],
    pitch: 'Temporarily isolate unruly members with natural language duration parsing.',
    description:
      'Issues timed mutes parsing human strings like "10 minutes", "2 hours", or "1 day" with automated cron expiration tracking.',
    category: 'mod',
    categoryLabel: 'Moderation & Safety',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Natural duration parser', 'Serverless cron expiration', 'Instant communication mute'],
    sampleUsage: '/timeout user:@user duration:"1 hour" reason:"Cool off period"',
  },
  // ─── 8. Progressive Infraction Warning System ──────────────────────────────
  {
    id: 'warn',
    name: 'Progressive Infraction Warning System',
    icon: '⚠️',
    commands: ['/warn', '/warnings', '/clearwarnings'],
    pitch: 'Escalating disciplinary system from warnings to automated timeouts and bans.',
    description:
      'Tracks infraction points per member and executes automated escalating actions (3 warns -> 1h timeout, 5 warns -> ban).',
    category: 'mod',
    categoryLabel: 'Moderation & Safety',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Escalating penalty ladder', 'Indexed warning history', 'Ephemeral staff management'],
    sampleUsage: '/warn user:@user reason:"Inappropriate language in public channels"',
  },
  // ─── 9. Bulk Message Purge & Cleaner ───────────────────────────────────────
  {
    id: 'purge',
    name: 'Bulk Message Purge & Cleaner',
    icon: '🧹',
    commands: ['/purge'],
    pitch: 'Bulk clean 1-100 messages with targeted author, bot, link, or embed filters.',
    description:
      'Instantly cleans up channels while complying with Discord 14-day bulk-delete API constraints and providing audit receipts.',
    category: 'mod',
    categoryLabel: 'Moderation & Safety',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Filter by user or bot', 'Link and embed detection', 'Strict 14-day limit compliance'],
    sampleUsage: '/purge amount:50 user:@spammer filter:links',
  },
  // ─── 10. Granular Role Management ─────────────────────────────────────────
  {
    id: 'role',
    name: 'Granular Role Management',
    icon: '🏷️',
    commands: ['/role'],
    pitch: 'Programmatically create, assign, colorize, and configure roles.',
    description:
      'Provides full lifecycle role management with hex color formatting, hoist flags, mentionable toggles, and safety hierarchy checks.',
    category: 'mod',
    categoryLabel: 'Moderation & Safety',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Hex color picker support', 'Permission bit configuration', 'Hierarchy safety enforcement'],
    sampleUsage: '/role add user:@member role:@Elite-Gamer',
  },
  // ─── 11. Channel Orchestrator ─────────────────────────────────────────────
  {
    id: 'channel',
    name: 'Channel Orchestrator',
    icon: '📁',
    commands: ['/channel'],
    pitch: 'Manage text, voice, and announcement channels with slowmode and lock toggles.',
    description:
      'Automates channel lifecycle operations including instant emergency lockdown, slowmode tuning, category parenting, and topic updating.',
    category: 'mod',
    categoryLabel: 'Moderation & Safety',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['One-click channel lockdown', 'Slowmode slider adjustment', 'Category inheritance sync'],
    sampleUsage: '/channel create name:"scrim-results" type:text category:"TOURNAMENTS"',
  },
  // ─── 12. Category Architect ───────────────────────────────────────────────
  {
    id: 'category',
    name: 'Category Architect',
    icon: '🗂️',
    commands: ['/category'],
    pitch: 'Organize category layouts with automatic permission cascade to all child channels.',
    description:
      'Creates and reorders server categories, automatically syncing permissions to ensure consistent staff and public channel isolation.',
    category: 'mod',
    categoryLabel: 'Moderation & Safety',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Cascade permission propagation', 'Position drag index calculation', 'Bulk channel nesting'],
    sampleUsage: '/category create name:"STAFF OPERATIONS" position:1',
  },
  // ─── 13. Themed Experience & Rank Card ─────────────────────────────────────
  {
    id: 'rank',
    name: 'Themed Experience & Rank Card',
    icon: '🎖️',
    commands: ['/rank'],
    pitch: 'Interactive profile rank cards rendered with signature themes and ASCII level meters.',
    description:
      'Tracks text and voice XP progression, computes server level status, and renders styled rank cards with customizable ASCII progress bars.',
    category: 'economy',
    categoryLabel: 'Progression & Economy',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Chat & voice XP calculation', 'Themed ASCII progress bar', 'Global server percentile rank'],
    sampleUsage: '/rank user:@self',
  },
  // ─── 14. Global Server Leaderboards ───────────────────────────────────────
  {
    id: 'leaderboard',
    name: 'Global Server Leaderboards',
    icon: '🏆',
    commands: ['/leaderboard'],
    pitch: 'Paginated leaderboards ranking members by XP, liquid coins, or minigame stats.',
    description:
      'Interactive multi-page rankings with top 3 trophy medals, fast pagination buttons, and server-wide or global sorting.',
    category: 'economy',
    categoryLabel: 'Progression & Economy',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['XP, economy, and game sorting', 'Interactive button pagination', 'Top 3 medal formatting'],
    sampleUsage: '/leaderboard type:xp limit:10',
  },
  // ─── 15. Treasury Wallet & Portfolio ──────────────────────────────────────
  {
    id: 'balance',
    name: 'Treasury Wallet & Portfolio',
    icon: '💰',
    commands: ['/balance', '/pay'],
    pitch: 'Manage liquid cash, banking deposits, net worth valuation, and peer transfers.',
    description:
      'Complete virtual banking system with liquid wallet balance, high-yield bank vault, interest calculations, and atomic member-to-member transfers.',
    category: 'economy',
    categoryLabel: 'Progression & Economy',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Atomic transaction safety', 'Bank deposit with interest', 'Peer-to-peer coin transfers'],
    sampleUsage: '/balance',
  },
  // ─── 16. Daily Streak & Career Engine ──────────────────────────────────────
  {
    id: 'daily',
    name: 'Daily Streak & Career Engine',
    icon: '🎁',
    commands: ['/daily', '/work', '/crime'],
    pitch: 'Engage members with consecutive streak bonuses, thematic jobs, and high-stakes heists.',
    description:
      'Daily reward claims with multiplier streaks, humorous themed professions (/work), and risk-vs-reward crime heists (/crime) with cooldown pacing.',
    category: 'economy',
    categoryLabel: 'Progression & Economy',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['Consecutive day bonus multiplier', '10+ Thematic career paths', 'Risk-vs-reward crime math'],
    sampleUsage: '/daily',
  },
  // ─── 17. Custom Server Economy Shop ───────────────────────────────────────
  {
    id: 'shop',
    name: 'Custom Server Economy Shop',
    icon: '🏪',
    commands: ['/shop', '/inventory'],
    pitch: 'Configure and purchase custom server roles, vanity perks, and cosmetic items.',
    description:
      'Server administrators configure custom shop items, assign automated role grants upon checkout, and track member inventory inventories.',
    category: 'economy',
    categoryLabel: 'Progression & Economy',
    tier: 'pro',
    status: 'live',
    isNextGen: false,
    features: ['Automated role granting on buy', 'Custom price and stock limits', 'Member inventory inspections'],
    sampleUsage: '/shop buy item_id:"vip-gold"',
  },
  // ─── 18. Support Ticket Hub & Transcripts ─────────────────────────────────
  {
    id: 'ticket',
    name: 'Support Ticket Hub & Transcripts',
    icon: '🎫',
    commands: ['/ticket'],
    pitch: 'Interactive button ticket panels with staff claiming and HTML transcripts.',
    description:
      'Full-featured support ticket system with one-click creation buttons, private staff channels, agent claiming, rating surveys, and downloadable HTML transcripts.',
    category: 'community',
    categoryLabel: 'Community Operations',
    tier: 'free',
    status: 'live',
    isNextGen: false,
    features: ['One-click button panels', 'HTML transcript logging', 'Staff claim and rating feedback'],
    sampleUsage: '/ticket panel channel:#support title:"Submit a Ticket"',
  },
];

export const NEXT_GEN_SERVICES: ServiceFeature[] = [
  // ─── 1. Anonymous Confessions & Matchmaker ─────────────────────────────────
  {
    id: 'confess',
    name: 'Anonymous Confessions & Matchmaker',
    icon: '💌',
    commands: ['/confess'],
    pitch: 'Anonymous server confessions with reaction voting and secret mutual crush matchmaking.',
    description:
      'Allows community members to post anonymous thoughts with wholesome, funny, and red-flag voting reactions, plus cryptographic mutual crush detection.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'free',
    status: 'live',
    isNextGen: true,
    features: ['Threaded replies', 'Secret mutual crush detector', 'Reaction vote counters'],
    sampleUsage: '/confess post text:"I secretly love coding late at night"',
  },
  // ─── 2. Interactive Polyglot Code Sandbox ─────────────────────────────────
  {
    id: 'run',
    name: 'Interactive Code Sandbox',
    icon: '⚡',
    commands: ['/run'],
    pitch: 'Execute JS, TS, Python, Rust, Go, and C++ directly inside Discord embeds.',
    description:
      'Safe, isolated multi-language code runner with real-time stdout/stderr capture, benchmark execution timing, and syntax highlighting.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'pro',
    status: 'live',
    isNextGen: true,
    features: ['JS, TS, Python, Rust, Go, C++', 'Execution timing benchmark', 'Isolated security sandboxing'],
    sampleUsage: '/run lang:python code:"print([x**2 for x in range(10)])"',
  },
  // ─── 3. Virtual Server Pets & RPG Duels ───────────────────────────────────
  {
    id: 'pet',
    name: 'Virtual Server Pets',
    icon: '🐾',
    commands: ['/pet'],
    pitch: 'Adopt, feed, train, and duel with virtual server companions in turn-based RPG matches.',
    description:
      'Virtual companion engine featuring hunger/happiness meters, species evolutions (Dragon, Cyber Wolf, Robo Kitty), and turn-based PvP duels.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'free',
    status: 'live',
    isNextGen: true,
    features: ['Hunger/happiness meters', 'Turn-based battle duels', 'Species evolutions & leaderboards'],
    sampleUsage: '/pet adopt species:dragon name:"Ignis"',
  },
  // ─── 4. World Clock & Meeting Overlap Finder ───────────────────────────────
  {
    id: 'worldclock',
    name: 'World Clock & Meeting Finder',
    icon: '🌐',
    commands: ['/worldclock', '/meet'],
    pitch: 'Resolve international timezones and find golden overlap hours across global teams.',
    description:
      'Tracks member IANA timezones, computes 24-hour ASCII visual timeline bars, and identifies golden meeting overlap windows across global participants.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'free',
    status: 'live',
    isNextGen: true,
    features: ['IANA timezone normalization', '24-hour ASCII timeline grid', 'Automated golden overlap finder'],
    sampleUsage: '/worldclock meet duration:1',
  },
  // ─── 5. Voice Message Audio Transcriber ───────────────────────────────────
  {
    id: 'transcribe',
    name: 'Voice Message Transcriber',
    icon: '🎙️',
    commands: ['/transcribe'],
    pitch: 'Transcribe Discord voice notes and audio clips into clean readable text in under 1 second.',
    description:
      'High-speed audio transcription powered by Google Gemini multimodal API, providing instant text transcripts for noisy environments or accessibility.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'ultimate',
    status: 'live',
    isNextGen: true,
    features: ['Google Gemini audio transcription', 'Auto-transcribe channel listener', 'Confidence score indicator'],
    sampleUsage: '/transcribe attachment:[audio.ogg]',
  },
  // ─── 6. GitHub & GitLab Webhook Hub ───────────────────────────────────────
  {
    id: 'git',
    name: 'GitHub & GitLab Webhook Hub',
    icon: '🐙',
    commands: ['/git'],
    pitch: 'AI-summarized commits, PR explanations, and release alerts directly to channels.',
    description:
      'Connects repository webhooks to Discord with Gemini AI summaries translating complex pull requests into plain English community announcements.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'pro',
    status: 'live',
    isNextGen: true,
    features: ['Push, PR, Release webhooks', 'Gemini AI PR digest summaries', 'Custom repository filters'],
    sampleUsage: '/git subscribe repo:"aicordbot-dev/AiCord" channel:#dev-updates',
  },
  // ─── 7. Dynamic Temporary Voice Rooms ─────────────────────────────────────
  {
    id: 'tempvc',
    name: 'Dynamic Temporary Voice Rooms',
    icon: '🔊',
    commands: ['/temp-vc'],
    pitch: 'Join-to-create voice channels that automatically delete when empty.',
    description:
      'Creates disposable voice lounges on demand, granting the creator a button control panel to lock, hide, rename, limit bitrate, or transfer room ownership.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'free',
    status: 'live',
    isNextGen: true,
    features: ['Auto-creation on join', 'Interactive owner control panel', 'Auto-delete on last disconnect'],
    sampleUsage: '/temp-vc setup generator_channel:#Join-To-Create',
  },
  // ─── 8. Live Multiplayer Quiz Show ───────────────────────────────────────
  {
    id: 'quiz',
    name: 'Live Multiplayer Quiz Show',
    icon: '🧠',
    commands: ['/quiz'],
    pitch: 'Host Kahoot-style real-time trivia games with speed bonuses and animated podiums.',
    description:
      'Live synchronized multiplayer quiz show where members compete in real-time with speed multiplier scoring, countdown timers, and animated podium finishes.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'free',
    status: 'live',
    isNextGen: true,
    features: ['Synchronized round timers', 'Speed bonus multiplier', 'Animated podium celebrations'],
    sampleUsage: '/quiz start rounds:10 category:gaming',
  },
  // ─── 9. Real-Time Dynamic Event Countdowns ─────────────────────────────────
  {
    id: 'countdown',
    name: 'Dynamic Event Countdowns',
    icon: '⏱️',
    commands: ['/countdown'],
    pitch: 'Live updating countdown clocks with relative Discord timestamps and ping notifications.',
    description:
      'Creates self-updating countdown embeds for game releases, esports matches, and server events using native Discord relative time formatters (<t:timestamp:R>).',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'free',
    status: 'live',
    isNextGen: true,
    features: ['Native Discord timestamp tags', 'Auto-ping role on zero', 'Event category badges'],
    sampleUsage: '/countdown create title:"Season 5 Launch" date:"2026-12-01 18:00 UTC"',
  },
  // ─── 10. Community Gaming Clip Competitions ───────────────────────────────
  {
    id: 'clip',
    name: 'Gaming Clip Competitions',
    icon: '🎬',
    commands: ['/clip'],
    pitch: 'Weekly community gaming highlight competitions with interactive 5-star ratings.',
    description:
      'Showcase member gameplay clips with interactive rating buttons, anti-self-vote protection, weekly champion crowning, and automated hall-of-fame archiving.',
    category: 'next-gen',
    categoryLabel: 'Next-Gen Power Service',
    tier: 'free',
    status: 'live',
    isNextGen: true,
    features: ['Interactive rating buttons', 'Weekly champion awards', 'Anti-self-vote protection'],
    sampleUsage: '/clip submit title:"1v5 Clutch Ace" url:"https://clips.twitch.tv/..."',
  },
];

export const ALL_FEATURES: ServiceFeature[] = [...MASTER_SERVICES, ...NEXT_GEN_SERVICES];
