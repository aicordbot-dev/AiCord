/**
 * src/config/plans.ts
 * Pricing plans, entitlement limits, and feature comparison matrix.
 * Implements Section 7 of the specification.
 */

export type PlanId = 'free' | 'pro' | 'ultimate' | 'lifetime';
export type BillingInterval = 'monthly' | 'yearly' | 'once';

export interface PlanLimits {
  aiBuildsPerMonth: number; // -1 for unlimited
  ticketPanels: number; // -1 for unlimited
  maxOpenTickets: number; // -1 for unlimited
  shopItems: number; // -1 for unlimited
  themesAllowed: number; // 2 or 6
  customHexThemes: boolean;
  codeSandboxRuns: number; // -1 for unlimited
  voiceRadioBitrateKbps: number;
  serverBackups: number;
  geminiSummariesPerMonth: number;
  priorityQueue: boolean;
  customBotBranding: boolean;
  hmacLicenseKey: boolean;
}

export interface PricingPlan {
  id: PlanId;
  name: string;
  badge: string;
  icon: string;
  description: string;
  popular?: boolean;
  accentColor: string;
  monthlyPrice: number;
  yearlyPrice: number; // effective monthly when billed yearly
  yearlyTotalPrice: number;
  oneTimePrice?: number;
  currency: string;
  billingText: string;
  ctaText: string;
  ctaHref: string;
  highlightFeatures: string[];
  limits: PlanLimits;
}

export interface MatrixRow {
  category: string;
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  ultimate: string | boolean;
  lifetime: string | boolean;
  tooltip?: string;
}

export const PRICING_PLANS: Record<PlanId, PricingPlan> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    badge: 'FREE FOREVER',
    icon: '🌱',
    description: 'Essential server architect, ticket panels, and economy tools for budding communities.',
    accentColor: '#94a3b8',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyTotalPrice: 0,
    currency: '$',
    billingText: 'Free forever • No credit card required',
    ctaText: 'Deploy Free Bot',
    ctaHref: '#invite-discord',
    highlightFeatures: [
      '3 AI Server Builds / month',
      '1 Ticket Panel (up to 3 open tickets)',
      '10 Custom Shop Items',
      '2 Custom Themes (Cyberpunk, Nordic Frost)',
      'Basic Moderation & Automated Warn Ladder',
      'Minigames & Virtual Pet Companions',
      'Community Support via Discord Hub',
    ],
    limits: {
      aiBuildsPerMonth: 3,
      ticketPanels: 1,
      maxOpenTickets: 3,
      shopItems: 10,
      themesAllowed: 2,
      customHexThemes: false,
      codeSandboxRuns: 50,
      voiceRadioBitrateKbps: 96,
      serverBackups: 0,
      geminiSummariesPerMonth: 5,
      priorityQueue: false,
      customBotBranding: false,
      hmacLicenseKey: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro Guild',
    badge: 'MOST POPULAR',
    icon: '⚡',
    description: 'Advanced automation, complete theme engine, and rich entertainment for growing servers.',
    popular: true,
    accentColor: '#00f0ff',
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    yearlyTotalPrice: 95.88,
    currency: '$',
    billingText: '$7.99/mo billed annually ($95/yr) or $9.99/mo',
    ctaText: 'Upgrade to Pro',
    ctaHref: '#redeem-modal',
    highlightFeatures: [
      '15 AI Server Builds / month',
      '5 Ticket Panels (up to 25 open tickets)',
      '50 Economy Shop Items & Vanity Perks',
      'All 6 Themes + 4 ASCII Bar Styles',
      '24/7 Curated Voice Audio Radio (128 kbps)',
      'Interactive Code Sandbox (JS/TS/Python/Rust)',
      '5 Server Configuration Cloud Backups',
      'GitHub & GitLab Webhook AI Digests',
    ],
    limits: {
      aiBuildsPerMonth: 15,
      ticketPanels: 5,
      maxOpenTickets: 25,
      shopItems: 50,
      themesAllowed: 6,
      customHexThemes: false,
      codeSandboxRuns: 500,
      voiceRadioBitrateKbps: 128,
      serverBackups: 5,
      geminiSummariesPerMonth: 50,
      priorityQueue: false,
      customBotBranding: false,
      hmacLicenseKey: false,
    },
  },
  ultimate: {
    id: 'ultimate',
    name: 'Ultimate Sovereign',
    badge: 'UNLIMITED POWER',
    icon: '👑',
    description: 'Powerhouse infrastructure with unlimited builds, Gemini AI summaries, and priority execution.',
    accentColor: '#ffd700',
    monthlyPrice: 24.99,
    yearlyPrice: 19.99,
    yearlyTotalPrice: 239.88,
    currency: '$',
    billingText: '$19.99/mo billed annually ($239/yr) or $24.99/mo',
    ctaText: 'Unlock Ultimate',
    ctaHref: '#redeem-modal',
    highlightFeatures: [
      'Unlimited AI Server Builds',
      'Unlimited Support Tickets & Staff Panels',
      'Unlimited Economy Items & Custom Shops',
      'All Themes + Custom Hex Palette Engine',
      'Endless High-Bitrate Voice Radio (384 kbps)',
      '100 Gemini AI Audio & PR Transcriptions / mo',
      'Downloadable HTML Ticket Transcripts',
      'Priority REST API Queue Dispatch',
    ],
    limits: {
      aiBuildsPerMonth: -1,
      ticketPanels: -1,
      maxOpenTickets: -1,
      shopItems: -1,
      themesAllowed: 6,
      customHexThemes: true,
      codeSandboxRuns: -1,
      voiceRadioBitrateKbps: 384,
      serverBackups: 25,
      geminiSummariesPerMonth: 100,
      priorityQueue: true,
      customBotBranding: false,
      hmacLicenseKey: true,
    },
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime Sovereign',
    badge: 'PERMANENT PASS',
    icon: '♾️',
    description: 'Permanent VIP patron license with all current and future platform features unlocked forever.',
    accentColor: '#a855f7',
    monthlyPrice: 199,
    yearlyPrice: 199,
    yearlyTotalPrice: 199,
    oneTimePrice: 199,
    currency: '$',
    billingText: 'One-time payment • Lifetime access • Never expires',
    ctaText: 'Claim Lifetime Pass',
    ctaHref: '#redeem-modal',
    highlightFeatures: [
      'Permanent Lifetime VIP Status',
      'Unlimited Everything Forever (Builds, Tickets, Backups)',
      'Custom Bot Branding (Custom Name, Avatar, Embed Footer)',
      'Permanent Cryptographic HMAC License Key',
      'Unlimited Gemini AI Transcriptions & Code Sandbox',
      'Direct Developer Hotline & VIP Council Access',
      'Instant Access to All 30+ Present & Future Modules',
    ],
    limits: {
      aiBuildsPerMonth: -1,
      ticketPanels: -1,
      maxOpenTickets: -1,
      shopItems: -1,
      themesAllowed: 6,
      customHexThemes: true,
      codeSandboxRuns: -1,
      voiceRadioBitrateKbps: 384,
      serverBackups: 100,
      geminiSummariesPerMonth: -1,
      priorityQueue: true,
      customBotBranding: true,
      hmacLicenseKey: true,
    },
  },
};

export const COMPARISON_MATRIX: MatrixRow[] = [
  // ─── AI & Architecture ───────────────────────────────────────────────────
  {
    category: 'AI & Architecture',
    feature: 'AI Server Builds / Month',
    free: '3 builds',
    pro: '15 builds',
    ultimate: 'Unlimited',
    lifetime: 'Unlimited',
  },
  {
    category: 'AI & Architecture',
    feature: 'Google Gemini 2.5 Flash Synthesis',
    free: true,
    pro: true,
    ultimate: true,
    lifetime: true,
  },
  {
    category: 'AI & Architecture',
    feature: 'One-Click Rollback (/undo-build)',
    free: true,
    pro: true,
    ultimate: true,
    lifetime: true,
  },
  {
    category: 'AI & Architecture',
    feature: 'Server Config Cloud Backups',
    free: 'None',
    pro: '5 Backups',
    ultimate: '25 Backups',
    lifetime: '100 Backups',
  },

  // ─── Theme & Styling ─────────────────────────────────────────────────────
  {
    category: 'Themes & Aesthetics',
    feature: 'Curated Signature Themes',
    free: '2 (Cyberpunk, Frost)',
    pro: 'All 6 Themes',
    ultimate: 'All 6 Themes',
    lifetime: 'All 6 Themes',
  },
  {
    category: 'Themes & Aesthetics',
    feature: 'ASCII Bar Styles (Pipes, Blocks, etc.)',
    free: 'Pipes only',
    pro: 'All 4 Styles',
    ultimate: 'All 4 Styles',
    lifetime: 'All 4 Styles',
  },
  {
    category: 'Themes & Aesthetics',
    feature: 'Custom Hex Color Engine',
    free: false,
    pro: false,
    ultimate: true,
    lifetime: true,
  },
  {
    category: 'Themes & Aesthetics',
    feature: 'Custom Bot Branding (Avatar/Footer)',
    free: false,
    pro: false,
    ultimate: false,
    lifetime: true,
  },

  // ─── Operations & Support ────────────────────────────────────────────────
  {
    category: 'Community Operations',
    feature: 'Interactive Ticket Panels',
    free: '1 Panel (3 open)',
    pro: '5 Panels (25 open)',
    ultimate: 'Unlimited',
    lifetime: 'Unlimited',
  },
  {
    category: 'Community Operations',
    feature: 'Downloadable HTML Transcripts',
    free: false,
    pro: true,
    ultimate: true,
    lifetime: true,
  },
  {
    category: 'Community Operations',
    feature: 'Code Runner Sandbox (/run)',
    free: '50 runs/mo',
    pro: '500 runs/mo',
    ultimate: 'Unlimited',
    lifetime: 'Unlimited',
  },
  {
    category: 'Community Operations',
    feature: 'Voice Message AI Transcriber',
    free: false,
    pro: '10/mo',
    ultimate: '100/mo',
    lifetime: 'Unlimited',
  },
  {
    category: 'Community Operations',
    feature: '24/7 Voice Radio Streamer',
    free: '96 kbps',
    pro: '128 kbps',
    ultimate: '384 kbps',
    lifetime: '384 kbps',
  },

  // ─── Economy & Entertainment ─────────────────────────────────────────────
  {
    category: 'Economy & Entertainment',
    feature: 'Custom Shop Items',
    free: '10 Items',
    pro: '50 Items',
    ultimate: 'Unlimited',
    lifetime: 'Unlimited',
  },
  {
    category: 'Economy & Entertainment',
    feature: 'Virtual Companion Pets & RPG',
    free: true,
    pro: true,
    ultimate: true,
    lifetime: true,
  },
  {
    category: 'Economy & Entertainment',
    feature: 'Live Multiplayer Quiz Show (/quiz)',
    free: true,
    pro: true,
    ultimate: true,
    lifetime: true,
  },

  // ─── Infrastructure & Support ────────────────────────────────────────────
  {
    category: 'Infrastructure',
    feature: 'Priority REST API Queueing',
    free: false,
    pro: false,
    ultimate: true,
    lifetime: true,
  },
  {
    category: 'Infrastructure',
    feature: 'HMAC Cryptographic License Key',
    free: false,
    pro: false,
    ultimate: true,
    lifetime: true,
  },
  {
    category: 'Infrastructure',
    feature: 'VIP Developer Hotline',
    free: false,
    pro: false,
    ultimate: false,
    lifetime: true,
  },
];

export const PLAN_LIST = Object.values(PRICING_PLANS);
