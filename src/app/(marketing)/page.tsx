'use client';

/**
 * src/app/(marketing)/page.tsx
 * Complete Marketing Landing Page for AiCord.
 * Assembles Phase D Hero and Pinned "Describe it. AiCord builds it." (PromptDemo) sequence,
 * followed by Universal Theme Engine, Enterprise Services Catalog, Pricing Tiers, FAQ, and Final CTA.
 */

import React, { useState } from 'react';
import { copyConfig } from '@/config/copy';
import { MASTER_SERVICES, NEXT_GEN_SERVICES, ServiceFeature } from '@/config/features';
import { PLAN_LIST, PricingPlan } from '@/config/plans';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { Hero } from '@/components/sections/Hero';
import { PromptDemo } from '@/components/sections/PromptDemo';

export default function MarketingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState<'all' | 'next-gen' | 'master'>('all');

  const displayedFeatures: ServiceFeature[] =
    activeTab === 'all'
      ? [...NEXT_GEN_SERVICES, ...MASTER_SERVICES]
      : activeTab === 'next-gen'
        ? NEXT_GEN_SERVICES
        : MASTER_SERVICES;

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* ─── Phase D: Hero Section (0–10% Storyboard) ────────────────────────── */}
      <Hero />

      {/* ─── Phase D: Pinned "Describe it. AiCord builds it." Sequence (10–34%) ─ */}
      <PromptDemo />

      {/* ─── Universal Theme Engine Section (#themes) ─────────────────────────── */}
      <section id="themes" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge status="beta" size="md">
            {copyConfig.sections.themes.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {copyConfig.sections.themes.title}
          </h2>
          <p className="text-sm text-gray-300 font-sans">
            {copyConfig.sections.themes.description}
          </p>
        </div>

        {/* Standalone Interactive Theme Picker */}
        <ThemePicker variant="standalone" />
      </section>

      {/* ─── Enterprise Features & Services Catalog (#features) ──────────────── */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <Badge status="live" size="md">
            {copyConfig.sections.features.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {copyConfig.sections.features.title}
          </h2>
          <p className="text-sm text-gray-300 font-sans">
            {copyConfig.sections.features.description}
          </p>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${
                activeTab === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              All Services ({displayedFeatures.length})
            </button>
            <button
              onClick={() => setActiveTab('next-gen')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${
                activeTab === 'next-gen'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              10 Next-Gen Services
            </button>
            <button
              onClick={() => setActiveTab('master')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${
                activeTab === 'master'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              18 Master Services
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedFeatures.map((svc) => (
            <GlassCard key={svc.id} padding="md" className="flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {svc.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    {svc.isNextGen && <Badge status="new" size="sm" />}
                    <Badge tier={svc.tier} size="sm" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-white font-mono mb-1.5 group-hover:text-cyan-300 transition-colors">
                  {svc.name}
                </h3>
                <p className="text-xs text-gray-400 font-sans leading-relaxed mb-4">
                  {svc.description}
                </p>

                {/* Commands pill */}
                {svc.commands && svc.commands.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {svc.commands.map((cmd) => (
                      <span
                        key={cmd}
                        className="px-2 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[10px] text-cyan-400"
                      >
                        {cmd}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>{svc.categoryLabel}</span>
                <span className="text-emerald-400">Verified Service</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ─── Transparent Value Matrix & Pricing Tiers (#pricing) ─────────────── */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <Badge status="live" size="md">
            {copyConfig.sections.pricing.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {copyConfig.sections.pricing.title}
          </h2>
          <p className="text-sm text-gray-300 font-sans">
            {copyConfig.sections.pricing.description}
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {copyConfig.pricing.monthlyToggle}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <span>{copyConfig.pricing.yearlyToggle}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {copyConfig.pricing.yearlySavings}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_LIST.map((plan: PricingPlan) => {
            const isYearly = billingCycle === 'yearly';
            const price = plan.oneTimePrice !== undefined
              ? plan.oneTimePrice
              : isYearly
                ? plan.yearlyPrice
                : plan.monthlyPrice;
            const period = plan.oneTimePrice !== undefined
              ? 'one-time'
              : isYearly
                ? '/mo (billed yearly)'
                : '/mo';

            return (
              <GlassCard
                key={plan.id}
                padding="md"
                className={`flex flex-col justify-between relative ${
                  plan.popular
                    ? 'border-cyan-500/50 shadow-xl shadow-cyan-500/10'
                    : 'border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-black font-mono text-[10px] font-black uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="mb-4">
                    <h3 className="font-mono font-bold text-lg text-white">{plan.name}</h3>
                    <p className="text-xs text-gray-400 font-sans mt-1">{plan.description}</p>
                  </div>

                  <div className="mb-6 font-mono">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">
                        {price === 0 ? '$0' : `$${price}`}
                      </span>
                      <span className="text-xs text-gray-400">{period}</span>
                    </div>
                  </div>

                  {/* Highlights list */}
                  <ul className="space-y-2 mb-6 font-sans text-xs text-gray-300">
                    {plan.highlightFeatures.map((h: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold shrink-0">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant={plan.popular ? 'primary' : 'glass'}
                  size="md"
                  href={siteConfig.getInviteUrl()}
                  external
                  className="w-full justify-center"
                >
                  {plan.ctaText}
                </Button>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* ─── Frequently Answered Questions (#faq) ────────────────────────────── */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-white/10">
        <div className="text-center mb-12 space-y-3">
          <Badge status="live" size="md">
            {copyConfig.sections.faq.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {copyConfig.sections.faq.title}
          </h2>
          <p className="text-sm text-gray-300 font-sans">
            {copyConfig.sections.faq.description}
          </p>
        </div>

        <div className="space-y-4 font-sans text-sm">
          <GlassCard padding="md">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-cyan-400 font-mono">Q:</span> How does AiCord differ from generic multi-purpose bots?
            </h3>
            <p className="text-gray-300 leading-relaxed text-xs sm:text-sm">
              Most Discord bots run expensive 24/7 WebSocket gateway dynos that crash under heavy traffic. AiCord runs on pure Discord HTTP Interactions with cryptographic Ed25519 signature verification on Next.js 16 serverless edge handlers. All 28+ services (economy, tickets, confessions, sandboxing, git feeds) are built directly into one unified core.
            </p>
          </GlassCard>

          <GlassCard padding="md">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400 font-mono">Q:</span> Which Discord permissions does AiCord require?
            </h3>
            <p className="text-gray-300 leading-relaxed text-xs sm:text-sm">
              For complete automated architecture builds (/build) and role hierarchy provisioning, Administrator (permissions=8) is recommended. If you prefer granular least-privilege, permissions=534723950656 grants Manage Channels, Manage Roles, Moderation, and standard chat interactions.
            </p>
          </GlassCard>

          <GlassCard padding="md">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400 font-mono">Q:</span> How does Google Gemini AI integration work?
            </h3>
            <p className="text-gray-300 leading-relaxed text-xs sm:text-sm">
              AiCord connects to Google Gemini 2.5 Flash for rapid server topology synthesis, voice message audio transcription, GitHub PR digests, and dynamic turn-based RPG dungeon generation with response latencies under 850 milliseconds.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* ─── Final Onboarding CTA Section ───────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <GlassCard padding="lg" className="text-center relative overflow-hidden border-cyan-500/30">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <Badge status="live" size="md">
              {copyConfig.finalCta.badge}
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-mono">
              {copyConfig.finalCta.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-300 font-sans leading-relaxed">
              {copyConfig.finalCta.description}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href={siteConfig.getInviteUrl()}
                external
                icon={<span>⚡</span>}
                className="w-full sm:w-auto"
              >
                {copyConfig.finalCta.button}
              </Button>
            </div>
            <p className="text-xs text-gray-500 font-mono">
              {copyConfig.finalCta.disclaimer}
            </p>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
