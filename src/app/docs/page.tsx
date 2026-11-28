'use client';

/**
 * src/app/docs/page.tsx
 * Interactive Documentation & Guide Center for AiCord.
 * Warm cream luxury design featuring interactive command directory (28+ services),
 * AI Server Builder walkthrough, AutoMod 2.0 defense guides, and Stripe billing FAQ.
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Search,
  Sparkles,
  ShieldCheck,
  Terminal,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Layers,
  HelpCircle,
  Cpu,
  Zap,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { AiCordLogo } from '@/components/brand/AiCordLogo';
import { COMMANDS_DATA, CommandItem } from '@/components/ui/CommandPalette';
import { MASTER_SERVICES } from '@/config/features';
import { siteConfig } from '@/config/site';

type DocSection = 'all' | 'builder' | 'commands' | 'automod' | 'billing';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<DocSection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const handleCopy = (text: string, name: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCommand(name);
      setTimeout(() => setCopiedCommand(null), 2000);
    }
  };

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return COMMANDS_DATA;
    const q = searchQuery.toLowerCase();
    return COMMANDS_DATA.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.syntax.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
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
              href="/status"
              className="text-xs font-mono text-[#57534E] hover:text-[#5865F2] transition-colors hidden sm:inline-block"
            >
              System Status
            </Link>
            <a
              href={siteConfig.getInviteUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-mono font-medium shadow-xs transition-colors"
            >
              <span>Invite Bot</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 space-y-10">
        {/* Hero Section */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-800 border border-cyan-300 text-xs font-mono font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
            <span>KNOWLEDGE BASE &amp; OPERATOR MANUAL</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1917]">
            Documentation &amp; Guides
          </h1>
          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
            Everything you need to configure, synthesize, and scale your Discord community with AiCord.
            Explore walkthroughs for the AI Server Builder, command directories, automod defenses, and billing setup.
          </p>
        </div>

        {/* Global Search & Tab Filters */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search commands, guides, automod rules, or billing terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#E7E2DA] text-xs font-mono text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#78716C] hover:text-[#1C1917]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100 border border-[#E7E2DA] text-xs font-mono">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'builder'
                    ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                AI Builder
              </button>
              <button
                onClick={() => setActiveTab('commands')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'commands'
                    ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                Commands ({filteredCommands.length})
              </button>
              <button
                onClick={() => setActiveTab('automod')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'automod'
                    ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                AutoMod
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'billing'
                    ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                Billing FAQ
              </button>
            </div>
          </div>
        </div>

        {/* ─── SECTION 1: AI SERVER BUILDER WALKTHROUGH ─────────────────── */}
        {(activeTab === 'all' || activeTab === 'builder') && (
          <section className="space-y-6 pt-4">
            <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-3">
              <Sparkles className="w-5 h-5 text-cyan-600" />
              <h2 className="text-2xl font-black text-[#1C1917]">
                AI Server Builder &amp; Synthesis Guide
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-white border border-[#E7E2DA] shadow-xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-700 flex items-center justify-center font-mono font-bold text-sm">
                  01
                </div>
                <h3 className="text-base font-bold text-[#1C1917]">Prompt Synthesis</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Provide natural language requirements via <code className="font-mono text-cyan-800">/build prompt:&quot;...&quot;</code>.
                  Google Gemini 2.5 Flash analyzes community demographics, expected voice traffic, and competitive hierarchies.
                </p>
                <div className="p-2.5 rounded-xl bg-[#FDFBF7] border border-[#E7E2DA] font-mono text-[11px] text-[#57534E]">
                  /build prompt:&quot;Esports scrim guild with 6 team rooms and staff logs&quot;
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-[#E7E2DA] shadow-xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-mono font-bold text-sm">
                  02
                </div>
                <h3 className="text-base font-bold text-[#1C1917]">Multi-View Preview</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Before applying any changes, AiCord generates an interactive Discord embed with 3 view tabs:
                  <strong> Structure</strong> (channels/categories), <strong>Roles</strong> (hierarchy), and <strong>Permissions</strong> (read/write overrides).
                </p>
                <div className="p-2.5 rounded-xl bg-[#FDFBF7] border border-[#E7E2DA] font-mono text-[11px] text-[#57534E]">
                  Tabs: [📂 Structure] [👑 Roles] [🛡️ Overrides]
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-[#E7E2DA] shadow-xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-mono font-bold text-sm">
                  03
                </div>
                <h3 className="text-base font-bold text-[#1C1917]">Additive Rollback Safety</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Blueprints are additive by default, preserving existing channels. If you are not satisfied with the generated topology, execute <code className="font-mono text-emerald-800">/undo-build</code> to cleanly revert all created assets.
                </p>
                <div className="p-2.5 rounded-xl bg-[#FDFBF7] border border-[#E7E2DA] font-mono text-[11px] text-[#57534E]">
                  /undo-build (Reverts channels, categories &amp; roles)
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── SECTION 2: COMMAND DIRECTORY ─────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'commands') && (
          <section className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E2DA] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-600" />
                <h2 className="text-2xl font-black text-[#1C1917]">
                  Command Directory (28+ Master Services)
                </h2>
              </div>
              <span className="text-xs font-mono text-[#78716C]">
                Showing {filteredCommands.length} of {COMMANDS_DATA.length} commands
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCommands.map((cmd) => (
                <div
                  key={cmd.name}
                  className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-3 hover:border-[#5865F2]/40 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-[#1C1917] font-mono font-bold text-xs">
                        {cmd.name}
                      </span>
                      {cmd.badge && (
                        <span className="px-2 py-0.5 rounded-md bg-[#5865F2]/10 text-[#5865F2] font-mono text-[10px] font-semibold border border-[#5865F2]/20">
                          {cmd.badge}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-[#78716C] px-2 py-0.5 rounded bg-stone-50 border border-[#E7E2DA]">
                      {cmd.permissions}
                    </span>
                  </div>

                  <p className="text-xs text-[#57534E] leading-relaxed">
                    {cmd.description}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#FDFBF7] border border-[#E7E2DA] font-mono text-[11px] text-[#1C1917]">
                      <span className="truncate pr-2">{cmd.syntax}</span>
                      <button
                        onClick={() => handleCopy(cmd.syntax, cmd.name)}
                        className="text-[#78716C] hover:text-[#5865F2] p-1 rounded hover:bg-stone-200/50 transition-colors shrink-0"
                        title="Copy command syntax"
                      >
                        {copiedCommand === cmd.name ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="text-[10px] font-mono text-[#78716C] truncate">
                      <span className="text-[#A8A29E]">Example:</span> {cmd.example}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── SECTION 3: AUTOMOD 2.0 & DEFENSE MATRIX ──────────────────── */}
        {(activeTab === 'all' || activeTab === 'automod') && (
          <section className="space-y-6 pt-4">
            <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-2xl font-black text-[#1C1917]">
                AutoMod 2.0 &amp; Shield Matrix Guide
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                  LAYER 01
                </span>
                <h3 className="font-bold text-sm text-[#1C1917]">Gemini Toxicity Filter</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Real-time contextual sentiment analysis intercepts harassment, slurs, and bypass attempts with zero false positives on common slang.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
                <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-mono font-bold">
                  LAYER 02
                </span>
                <h3 className="font-bold text-sm text-[#1C1917]">Anti-Raid Velocity</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Detects burst join anomalies exceeding 5 members in 10 seconds. Automatically quarantines new arrivals and requires captcha gate verification.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                  LAYER 03
                </span>
                <h3 className="font-bold text-sm text-[#1C1917]">Phishing &amp; Invite Interceptor</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Blocks unauthorized third-party Discord invite links and matches URLs against an active database of 140,000+ known crypto &amp; nitro scams.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                  LAYER 04
                </span>
                <h3 className="font-bold text-sm text-[#1C1917]">Automated Warn Ladder</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Configurable escalation points: 1st strike (Warn) → 2nd strike (10m Mute) → 3rd strike (24h Temp Ban) → 4th strike (Permanent Ban &amp; Audit Log).
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ─── SECTION 4: STRIPE BILLING & FAQ ──────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'billing') && (
          <section className="space-y-6 pt-4">
            <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-3">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <h2 className="text-2xl font-black text-[#1C1917]">
                Stripe Billing &amp; Subscription FAQ
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
                <h3 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#5865F2]" />
                  How do I upgrade my Discord server to Pro or Ultimate?
                </h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Visit the Discrofy Web Dashboard (<code className="font-mono text-xs">/dashboard/[guildId]/billing</code>) or click &ldquo;Upgrade&rdquo; on the pricing section. You will be redirected to an encrypted Stripe Checkout session. Once payment completes, the Stripe Webhook activates your guild&apos;s limits instantly within 200ms.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
                <h3 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#5865F2]" />
                  What payment methods are supported?
                </h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Stripe supports all major international credit and debit cards (Visa, Mastercard, American Express, Discover), Apple Pay, Google Pay, and European localized options (iDEAL, Bancontact).
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
                <h3 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#5865F2]" />
                  Can I transfer my subscription between different Discord servers?
                </h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Yes! Subscriptions are owned by your Discord account. You can re-assign an active license to any other server where you hold Administrator permissions via the Billing dashboard once every 72 hours.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
                <h3 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#5865F2]" />
                  What is the 14-day refund policy?
                </h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  We offer a 100% money-back guarantee for first-time Pro and Ultimate purchasers within 14 calendar days of transaction settlement. Email <span className="font-mono font-bold text-[#1C1917]">aicordbot@gmail.com</span> with your Stripe receipt number to request a prompt refund.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Footer Link Cluster */}
        <div className="pt-8 border-t border-[#E7E2DA] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#78716C]">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#5865F2] transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-[#5865F2] transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-[#5865F2] transition-colors">Privacy Policy</Link>
            <Link href="/status" className="hover:text-[#5865F2] transition-colors">System Status</Link>
            <Link href="/changelog" className="hover:text-[#5865F2] transition-colors">Changelog</Link>
          </div>
          <span>AiCord Documentation Suite v2.4.0</span>
        </div>
      </main>
    </div>
  );
}
