'use client';

import React, { useState } from 'react';

type BillingCycle = 'monthly' | 'yearly';

interface PricingTier {
  id: string;
  name: string;
  badge: string;
  icon: string;
  monthlyPrice: string;
  yearlyPrice: string;
  billingText: string;
  description: string;
  popular?: boolean;
  color: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
}

const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free Starter',
    badge: '🆓 FREE',
    icon: '🌱',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    billingText: 'Free forever • No credit card required',
    description: 'Essential server architect and economy tools for starter Discord communities.',
    color: '#94a3b8',
    features: [
      '3 AI Server Builds / month',
      '1 Ticket Panel (max 3 open tickets)',
      '10 Economy Shop Items',
      '2 Custom Themes (Cyberpunk, Frost)',
      'Basic Moderation & Standalone Tools',
      'Community Minigames & Blackjack',
      'Community Support via Discord',
    ],
    ctaText: 'Deploy Free Bot',
    ctaLink: '#invite-discord',
  },
  {
    id: 'pro',
    name: 'Pro Guild',
    badge: '⚡ PRO',
    icon: '🚀',
    monthlyPrice: '$9.99',
    yearlyPrice: '$7.99',
    billingText: 'Billed monthly or $95/year',
    description: 'Advanced automation, full theme engine, and entertainment for expanding communities.',
    popular: true,
    color: '#00f0ff',
    features: [
      '15 AI Server Builds / month',
      '5 Ticket Panels (max 25 open tickets)',
      '50 Economy Shop Items & Skins',
      'All 6 Themes + 4 ASCII Bar Styles',
      '24/7 Voice Radio (Curated Streams)',
      'Weekly Gemini Boss Raids & Pets',
      '5 Server Configuration Backups',
      'WhatsApp Announcement Feed',
    ],
    ctaText: 'Upgrade to Pro',
    ctaLink: '#redeem-modal',
  },
  {
    id: 'ultimate',
    name: 'Ultimate Sovereign',
    badge: '👑 ULTIMATE',
    icon: '💎',
    monthlyPrice: '$24.99',
    yearlyPrice: '$19.99',
    billingText: 'Billed monthly or $239/year',
    description: 'Powerhouse infrastructure with unlimited builds, Gemini AI summaries, and priority execution.',
    color: '#ffd700',
    features: [
      'Unlimited AI Server Builds',
      'Unlimited Support Tickets & Staff Panels',
      'Unlimited Economy Items & Custom Shops',
      'All Themes + Custom Hex Color Engine',
      'Endless 24/7 High-Bitrate Voice Radio',
      '100 Gemini AI TL;DR Summaries / month',
      'HTML Ticket Transcripts & Cloud Backups',
      'Full 2-Way WhatsApp Panic & Modmail Bridge',
      'Priority REST API Queueing',
    ],
    ctaText: 'Unlock Ultimate',
    ctaLink: '#redeem-modal',
  },
  {
    id: 'lifetime',
    name: 'Lifetime License',
    badge: '♾️ LIFETIME',
    icon: '🔮',
    monthlyPrice: '$199',
    yearlyPrice: '$199',
    billingText: 'One-time payment • Never expires',
    description: 'Permanent VIP patron status with all current and future features unlocked forever.',
    color: '#a855f7',
    features: [
      'Unlimited Everything Forever',
      'Custom Bot Branding (Name, Embed Color, Footer)',
      'Exclusive VIP Sentinel Shield Role & Badge',
      'Permanent Cryptographic HMAC License Key',
      'Unlimited Gemini AI Transcriptions & Run Sandbox',
      'Instant Access to All 30+ Present & Future Services',
      'Direct Developer Hotline & VIP Council Access',
    ],
    ctaText: 'Claim Lifetime Pass',
    ctaLink: '#redeem-modal',
  },
];

export default function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  return (
    <div className="w-full max-w-6xl mx-auto py-12 relative">
      {/* Glow backgrounds */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Header & Toggle */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-mono text-purple-400 mb-3">
          <span>💎 TRANSPARENT GUILD LICENSING</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Scalable Power for Every Discord Community
        </h2>
        <p className="text-base text-gray-400 mt-3">
          Whether you are launching your first gaming clan or scaling a 50,000-member community,
          AiCord provides flexible entitlements backed by cryptographic verification.
        </p>

        {/* Billing Cycle Switch */}
        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-black/50 border border-white/10 mt-6 backdrop-blur-md">
          <button
            onClick={() => setCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
              cycle === 'monthly'
                ? 'bg-white/20 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all flex items-center gap-2 ${
              cycle === 'yearly'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Annual License</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-400 text-black font-extrabold">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
        {TIERS.map((tier) => {
          const price = cycle === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
          return (
            <div
              key={tier.id}
              className={`rounded-3xl bg-[#0e1220]/90 border p-6 flex flex-col justify-between transition-all duration-300 relative backdrop-blur-xl ${
                tier.popular
                  ? 'border-cyan-400/80 shadow-[0_0_30px_rgba(0,240,255,0.25)] lg:-translate-y-2'
                  : 'border-white/10 hover:border-white/25 hover:shadow-xl'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-mono font-extrabold text-[11px] uppercase tracking-wider shadow-md">
                  MOST POPULAR
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{tier.icon}</span>
                  <span
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-full uppercase"
                    style={{
                      backgroundColor: `${tier.color}22`,
                      color: tier.color,
                      border: `1px solid ${tier.color}44`,
                    }}
                  >
                    {tier.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                <p className="text-xs text-gray-400 mt-1 min-h-[36px]">{tier.description}</p>

                <div className="my-5 pb-5 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                      {price}
                    </span>
                    {tier.id !== 'lifetime' && (
                      <span className="text-xs text-gray-400 font-mono">/ month</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-1">
                    {tier.billingText}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-gray-300 mb-6">
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2">
                      <span className="text-emerald-400 text-sm leading-none mt-0.5">✓</span>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <a
                  href={tier.ctaLink}
                  className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold transition-all duration-300 text-center block ${
                    tier.popular
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-[1.02]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {tier.ctaText}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permanent Allowance Spotlight Banner (Server 1567393420127772712) */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950/60 via-[#131626]/90 to-cyan-950/60 border border-purple-500/40 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 font-mono text-xs font-bold uppercase">
                ★ FOUNDER VIP RECOGNITION
              </span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                VERIFIED ENTITLEMENT
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Permanent Allowance Granted — Server{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-mono">
                1567393420127772712
              </span>
            </h3>

            <p className="text-sm text-gray-300 max-w-3xl leading-relaxed">
              In recognition of the founding deployment, Server ID <code className="text-cyan-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">1567393420127772712</code> possesses an irrevocable, permanent patron license with infinite builds, zero-limit tickets, custom theme overrides, and VIP sentinel privileges.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 font-mono text-xs text-gray-300">
              <div className="text-[10px] text-gray-400 uppercase">Cryptographic Status</div>
              <div className="text-purple-300 font-bold mt-0.5">HMAC-SHA256 SIGNED ✓</div>
            </div>
            <a
              href="#invite-discord"
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-purple-500/25"
            >
              Verify Active Server
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
