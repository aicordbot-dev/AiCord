import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Tag,
  CheckCircle2,
  Zap,
  Shield,
  CreditCard,
  Bot,
  Terminal,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { AiCordLogo } from '@/components/brand/AiCordLogo';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Changelog & Release Notes — AiCord',
  description:
    'Detailed release history, new services, Stripe payment integration, Discrofy dashboard updates, and performance optimizations for AiCord.',
  alternates: {
    canonical: `${siteConfig.url}/changelog`,
  },
};

export interface ReleaseEntry {
  version: string;
  codename: string;
  date: string;
  isLatest?: boolean;
  highlight: string;
  badgeColor: string;
  sections: {
    title: string;
    items: string[];
    category: 'added' | 'improved' | 'security' | 'fixed';
  }[];
}

export const RELEASES: ReleaseEntry[] = [
  {
    version: 'v2.4.0',
    codename: 'Discrofy Sovereign',
    date: 'November 2026',
    isLatest: true,
    highlight:
      'Launch of the Discrofy Web Console, 28-service enterprise catalog, Stripe-powered HMAC license engine, and warm luxury Light Cream web experience.',
    badgeColor: 'bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20',
    sections: [
      {
        title: 'Discrofy Dashboard & Architecture',
        category: 'added',
        items: [
          'Full-featured serverless web console with Next.js 16, Turbopack, and Tailwind CSS v4.',
          'Modular consoles for all 28 services with granular toggle settings, audit tracking, and real-time usage telemetry.',
          'Integrated Discord OAuth2 least-privilege session handling with AES-256 encrypted HTTP-only session cookies.',
          'Real-time server telemetry tracking member velocity, automod threat deflection, and AI blueprint counts.',
        ],
      },
      {
        title: 'Stripe Payment Processing & Entitlements',
        category: 'added',
        items: [
          'Full Stripe Checkout integration supporting Pro Guild ($12/mo, $108/yr), Ultimate ($29/mo, $276/yr), and Founder Lifetime ($199 once).',
          'Automated webhook fulfillment endpoint with cryptographic Stripe signature verification.',
          'Cryptographic HMAC-SHA256 license key generation and guild entitlement validation.',
          'Self-service customer portal for instant cancellations, invoices, and payment method updates.',
        ],
      },
      {
        title: 'Luxury Light Cream Marketing Portal',
        category: 'added',
        items: [
          'Light Cream aesthetic (#FDFBF7) with 0% WebGL overhead for instantaneous page loads.',
          'Procedural WebAudio micro-feedback synthesizer with pleasant interactive audio clicks and chimes.',
          'Interactive Command Palette (triggerable via / or Ctrl+K) indexing all 28+ commands with syntax previews.',
          'Real-time System Status page, interactive Documentation Hub, and comprehensive Legal Terms.',
        ],
      },
      {
        title: 'Performance & Optimization',
        category: 'improved',
        items: [
          'Reduced Ed25519 Discord interaction endpoint cold-start latency to under 42ms.',
          'Optimized Google Gemini 2.5 Flash token streaming with automated retry logic and exponential backoff.',
          'Achieved 100% test pass rate across 1,673+ automated unit tests and end-to-end suites.',
        ],
      },
    ],
  },
  {
    version: 'v2.3.0',
    codename: 'Next-Gen Expansion',
    date: 'October 2026',
    highlight:
      'Introduction of 10 Next-Gen services including 24/7 Voice Radio streaming, Polyglot Code Sandbox, and GitHub/GitLab webhook relays.',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-300',
    sections: [
      {
        title: '10 Next-Gen Services',
        category: 'added',
        items: [
          '24/7 Voice Radio (/radio): Continuous audio streaming across 6 stations (Lofi, Synthwave, Classical, Ambient, Jazz, Gaming).',
          'Polyglot Code Sandbox (/run): Isolated multi-language runner for Python, JavaScript, Rust, C++, Go, and Bash.',
          'Anonymous Modmail Relay (/modmail): Private bidirectional DM ticket system with staff anonymity and HTML transcripts.',
          'Button & Dropdown Reaction Roles (/reaction-roles): Multi-panel role claim suites with limit constraints.',
          'GitHub & GitLab Webhook Hub (/git): Commit feeds, PR plain-English AI digests, and issue tracking cards.',
          'World Clock & Overlap Finder (/worldclock, /meet): Timezone visualizations and golden hours meeting calculator.',
        ],
      },
      {
        title: 'AutoMod 2.0 Hardening',
        category: 'security',
        items: [
          'Anti-raid velocity limiter detecting and mitigating automated join flood waves in real-time.',
          'AI toxicity analysis powered by Gemini with contextual nuances for community slang.',
          'Phishing URL interceptor indexing 140,000+ known crypto, nitro, and malicious token stealers.',
        ],
      },
      {
        title: 'Audio & Media Enhancements',
        category: 'improved',
        items: [
          'Live ASCII volume bar and animated audio equalizer embeds for interactive voice status.',
          'Support for 384kbps high-fidelity audio streams for Ultimate and Lifetime guild subscribers.',
        ],
      },
    ],
  },
  {
    version: 'v2.0.0',
    codename: 'The Architectural Genesis',
    date: 'September 2026',
    highlight:
      'Complete ground-up rewrite in Next.js 16 with Google Gemini 2.5 Flash, Ed25519 interactions, and 6 signature aesthetic themes.',
    badgeColor: 'bg-amber-500/10 text-amber-800 border-amber-300',
    sections: [
      {
        title: 'Core AI Synthesis Engine',
        category: 'added',
        items: [
          'Initial release of /build: Generates full Discord category topology, channel configurations, and role overrides from prompts.',
          'Multi-view blueprint preview embeds allowing server administrators to inspect structures prior to deployment.',
          'Additive deployment engine preserving existing guild channels with one-click /undo-build safety rollback.',
        ],
      },
      {
        title: '6 Signature Aesthetic Themes',
        category: 'added',
        items: [
          'Themed embeds: Cyberpunk Deck, Midnight Obsidian, Emerald Matrix, Royal Gold, Retro Terminal, and Nordic Frost.',
          'Custom ASCII progress bars with 4 distinct character styles (pipes, blocks, squares, dithered retro).',
          'Theme Studio embed generator for custom user profile cards and level achievements.',
        ],
      },
      {
        title: 'Architectural Transition',
        category: 'improved',
        items: [
          'Migrated from legacy Gateway WebSocket bot to serverless HTTP Interactions over Ed25519.',
          'Integrated MongoDB Atlas with Mongoose ODM for multi-tenant guild isolation and fast queries.',
          'Implemented Upstash Redis rate limiting to prevent spam and denial-of-service attempts.',
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] selection:bg-[#5865F2]/20 selection:text-[#5865F2] font-sans antialiased relative">
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.3]"
        style={{
          backgroundImage: 'radial-gradient(#D6CFC4 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#FDFBF7]/90 border-b border-[#E7E2DA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono text-[#57534E] hover:text-[#5865F2] transition-colors py-1.5 px-2.5 rounded-xl hover:bg-stone-200/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to AiCord</span>
            </Link>
          </div>

          <AiCordLogo colorScheme="light" size="sm" showVersion={false} showSubtitle={false} href="/" />

          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="text-xs font-mono text-[#57534E] hover:text-[#5865F2] transition-colors hidden sm:inline-block"
            >
              Docs
            </Link>
            <a
              href={siteConfig.getInviteUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-mono font-medium shadow-xs transition-colors"
            >
              <span>Add to Discord</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 space-y-12">
        {/* Title Header */}
        <div className="space-y-4 border-b border-[#E7E2DA] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-800 border border-purple-300 text-xs font-mono font-semibold">
            <Tag className="w-3.5 h-3.5" />
            <span>RELEASE ARCHIVES &amp; ROADMAP</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1917]">
            Release Notes &amp; Changelog
          </h1>

          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
            Follow the continuous evolution of AiCord. Explore release highlights across our AI server architect,
            28 enterprise services, Discrofy console, and Stripe billing engine.
          </p>
        </div>

        {/* Releases Timeline */}
        <div className="space-y-12">
          {RELEASES.map((rel) => (
            <article
              key={rel.version}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E7E2DA] shadow-xs space-y-6 relative"
            >
              {/* Release Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E2DA] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-[#1C1917] font-mono">
                    {rel.version}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-stone-100 text-[#1C1917] text-xs font-mono font-semibold">
                    {rel.codename}
                  </span>
                  {rel.isLatest && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                      Current Release
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-[#78716C]">
                  <Calendar className="w-4 h-4" />
                  <span>{rel.date}</span>
                </div>
              </div>

              {/* Release Pitch / Highlight */}
              <p className="text-sm text-[#1C1917] font-medium leading-relaxed bg-[#FDFBF7] p-4 rounded-2xl border border-[#E7E2DA]">
                {rel.highlight}
              </p>

              {/* Sub-sections */}
              <div className="space-y-6">
                {rel.sections.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          section.category === 'added'
                            ? 'bg-emerald-100 text-emerald-800'
                            : section.category === 'improved'
                            ? 'bg-cyan-100 text-cyan-800'
                            : section.category === 'security'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {section.category}
                      </span>
                      <h3 className="font-bold text-sm text-[#1C1917]">{section.title}</h3>
                    </div>

                    <ul className="space-y-2 text-xs text-[#57534E] pl-2">
                      {section.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2 leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Footer Link Cluster */}
        <div className="pt-8 border-t border-[#E7E2DA] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#78716C]">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#5865F2] transition-colors">Home</Link>
            <Link href="/docs" className="hover:text-[#5865F2] transition-colors">Documentation</Link>
            <Link href="/status" className="hover:text-[#5865F2] transition-colors">System Status</Link>
            <Link href="/terms" className="hover:text-[#5865F2] transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-[#5865F2] transition-colors">Privacy Policy</Link>
          </div>
          <span>AiCord Release Archive • Powered by Next.js 16</span>
        </div>
      </main>
    </div>
  );
}
