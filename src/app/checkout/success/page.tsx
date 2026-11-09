'use client';

/**
 * src/app/checkout/success/page.tsx
 * Celebratory checkout confirmation page for AiCord subscribers.
 * Displays plan details, session reference, and clear next onboarding steps.
 */

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Copy,
  Check,
  Bot,
  Terminal,
  LayoutDashboard,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { siteConfig } from '@/config/site';

interface TierDisplayConfig {
  name: string;
  badge: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  perks: string[];
}

const TIER_DETAILS: Record<string, TierDisplayConfig> = {
  pro: {
    name: 'AiCord Pro',
    badge: 'PRO GUILD UNLOCKED',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
    perks: [
      '15 AI Builds / month',
      '5 Ticket Panels',
      '50 Shop Items',
      '6 Universal Themes',
      '24/7 Voice Radio',
    ],
  },
  ultimate: {
    name: 'AiCord Ultimate Sovereign',
    badge: 'SOVEREIGN TIER UNLOCKED',
    accentBg: 'bg-purple-50',
    accentText: 'text-purple-700',
    accentBorder: 'border-purple-200',
    perks: [
      'Unlimited AI Builds',
      'Unlimited Ticket Panels',
      'Unlimited Shop Items',
      'All Themes + Custom Hex Colors',
      '100 AI Server Summaries',
    ],
  },
  lifetime: {
    name: 'AiCord Lifetime Sovereign',
    badge: 'LIFETIME VIP PATRON',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-800',
    accentBorder: 'border-amber-200',
    perks: [
      'Permanent VIP Patron License',
      'Unlimited Everything Forever',
      'Cryptographic HMAC License Key',
      'Priority Cloud Infrastructure',
      'Exclusive Patron Discord Role',
    ],
  },
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId') || '';
  const rawTier = (searchParams.get('tier') || 'pro').toLowerCase();
  const interval = searchParams.get('interval') || '';
  const guildId = searchParams.get('guild_id') || searchParams.get('guildId') || '';

  const tierKey = ['pro', 'ultimate', 'lifetime'].includes(rawTier) ? rawTier : 'pro';
  const tierConfig = TIER_DETAILS[tierKey];

  const [copiedSession, setCopiedSession] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  const handleCopySession = async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedSession(true);
      setTimeout(() => setCopiedSession(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText('/premium status');
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch {
      // ignore
    }
  };

  const intervalLabel =
    tierKey === 'lifetime'
      ? 'Lifetime Access (One-time payment)'
      : interval === 'yearly'
        ? 'Annual Billing (20-25% Discount applied)'
        : 'Monthly Subscription';

  const dashboardHref = guildId ? `/dashboard/${guildId}` : '/dashboard';

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] flex flex-col justify-between selection:bg-[#5865F2]/20 selection:text-[#5865F2]">
      {/* Header Bar */}
      <header className="border-b border-[#E7E2DA] bg-[#FDFBF7]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-[#5865F2] flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <span className="font-mono font-black text-lg tracking-tight text-[#1C1917]">
              AiCord
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>PAYMENT CONFIRMED</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        {/* Hero Celebration Banner */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-xs font-mono font-bold tracking-wide animate-in zoom-in-95 duration-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{tierConfig.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1917]">
            🎉 Payment Successful! Welcome to {tierConfig.name}
          </h1>

          <p className="text-sm sm:text-base text-[#78716C] max-w-xl mx-auto leading-relaxed">
            Your payment has been processed successfully. Your perks are provisioned and ready to
            power your Discord community.
          </p>
        </div>

        {/* Two Column Layout: Summary Card & Next Steps */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Summary Card */}
          <div className="md:col-span-5 bg-white rounded-3xl border border-[#E7E2DA] p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#78716C]">
                  Order Summary
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="text-[#78716C] text-[11px]">Selected Plan</div>
                  <div className="text-[#1C1917] font-bold text-sm mt-0.5">{tierConfig.name}</div>
                </div>

                <div>
                  <div className="text-[#78716C] text-[11px]">Billing Cycle</div>
                  <div className="text-[#1C1917] font-semibold mt-0.5">{intervalLabel}</div>
                </div>

                {guildId && (
                  <div>
                    <div className="text-[#78716C] text-[11px]">Target Guild ID</div>
                    <div className="text-[#1C1917] font-semibold truncate mt-0.5">{guildId}</div>
                  </div>
                )}

                {sessionId && (
                  <div>
                    <div className="text-[#78716C] text-[11px]">Session Reference</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <code className="text-[11px] bg-stone-100 text-[#1C1917] px-2 py-1 rounded-md border border-[#E7E2DA] font-mono truncate max-w-[200px]">
                        {sessionId}
                      </code>
                      <button
                        onClick={handleCopySession}
                        title="Copy session reference"
                        className="p-1 rounded-md hover:bg-stone-100 border border-transparent hover:border-[#E7E2DA] text-[#78716C] transition-colors cursor-pointer"
                      >
                        {copiedSession ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E7E2DA] space-y-2">
                <div className="text-[11px] font-mono font-bold text-[#78716C] uppercase tracking-wider">
                  Included Perks
                </div>
                <ul className="space-y-1.5 text-xs text-[#57534E]">
                  {tierConfig.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-[#E7E2DA] flex items-center gap-2 text-xs text-[#78716C]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Stripe cryptographic verification completed.</span>
            </div>
          </div>

          {/* Next Steps Card */}
          <div className="md:col-span-7 bg-white rounded-3xl border border-[#E7E2DA] p-6 sm:p-7 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#78716C]">
                  Next Steps to Get Started
                </h2>
                <span className="text-[11px] font-mono text-[#78716C]">3 Quick Steps</span>
              </div>

              {/* Step 1 */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                    <span>Add AiCord to your Discord server</span>
                    <Bot className="w-4 h-4 text-[#5865F2]" />
                  </div>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Authorize the bot to your community server to immediately deploy AI builds and
                    access premium features.
                  </p>
                  <div className="pt-1">
                    <a
                      href={siteConfig.getInviteUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#5865F2] hover:text-[#4752C4] hover:underline"
                    >
                      <span>Authorize Discord Bot</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                    <span>Run /premium status in your server</span>
                    <Terminal className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Verify in any text channel that your server perks, limits, and themes are live.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <code className="text-xs font-mono bg-stone-100 border border-[#E7E2DA] text-[#1C1917] px-2.5 py-1 rounded-lg">
                      /premium status
                    </code>
                    <button
                      onClick={handleCopyCommand}
                      title="Copy command"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#78716C] hover:text-[#1C1917] p-1 rounded transition-colors cursor-pointer"
                    >
                      {copiedCommand ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                    <span>Manage server in the Web Dashboard</span>
                    <LayoutDashboard className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Configure your automod policies, 24/7 radio stations, ticket panels, and custom
                    themes from the web console.
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-4 border-t border-[#E7E2DA] flex flex-col sm:flex-row gap-3">
              <Link
                href={dashboardHref}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono text-xs font-bold transition-all shadow-md shadow-[#5865F2]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href={siteConfig.getInviteUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-[#E7E2DA] text-[#1C1917] font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-[#5865F2]" />
                <span>Add Bot to Discord</span>
              </a>

              <Link
                href="/"
                className="py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#78716C] font-mono text-xs font-bold transition-all border border-[#E7E2DA] flex items-center justify-center cursor-pointer"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Support Note */}
        <div className="p-4 rounded-2xl bg-white/60 border border-[#E7E2DA] text-center text-xs text-[#78716C] flex items-center justify-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#78716C]" />
          <span>
            Need help transferring license or setting up your server? Join our{' '}
            <a
              href={siteConfig.links.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#5865F2] hover:underline"
            >
              Discord Support Community
            </a>
            .
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E7E2DA] py-6 text-center text-xs text-[#78716C] font-mono">
        © {new Date().getFullYear()} AiCord. All rights reserved.
      </footer>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8">
          <div className="p-6 bg-white rounded-2xl border border-[#E7E2DA] font-mono text-xs text-[#78716C] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5865F2] animate-ping" />
            <span>Loading checkout confirmation...</span>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
