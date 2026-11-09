'use client';

/**
 * src/app/(marketing)/page.tsx
 * Initial landing view consuming copyConfig, statsConfig, features, themes, and plans.
 * Foundation for Phase A per specification.
 */

import React, { useState } from 'react';
import { copyConfig } from '@/config/copy';
import { statsConfig } from '@/config/stats';
import { MASTER_SERVICES, NEXT_GEN_SERVICES, ServiceFeature } from '@/config/features';
import { PLAN_LIST, PlanId } from '@/config/plans';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Counter } from '@/components/ui/Counter';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { AiCordMark } from '@/components/brand/AiCordMark';

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
    <div className="space-y-24 pb-20">
      {/* ─── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
            {/* Top Engine Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-mono text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{copyConfig.hero.badge}</span>
            </div>

            {/* H1 Headline */}
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] font-mono">
              {copyConfig.hero.h1Prefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500">
                {copyConfig.hero.h1Highlight}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans">
              {copyConfig.hero.sub}
            </p>

            {/* CTA Button Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                href={siteConfig.getInviteUrl()}
                external
                icon={<AiCordMark size={20} variant="transparent" />}
                className="w-full sm:w-auto"
              >
                {copyConfig.hero.ctaPrimary}
              </Button>

              <Button
                variant="glass"
                size="lg"
                href="#features"
                className="w-full sm:w-auto"
              >
                Explore Features ↓
              </Button>
            </div>

            {/* Terminal Command Quickstart */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-gray-400 max-w-lg mx-auto lg:mx-0 backdrop-blur-md shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                <span className="text-gray-500 uppercase text-[10px] tracking-wider">
                  Slash Command Quickstart
                </span>
                <Badge status="live" size="sm">
                  100% VERIFIED
                </Badge>
              </div>
              <div className="text-cyan-300 truncate">
                <span className="text-purple-400">
                  {copyConfig.hero.sampleCommand.command}
                </span>{' '}
                {copyConfig.hero.sampleCommand.prompt}
              </div>
            </div>
          </div>

          {/* Hero Right: 3D Holographic Constellation Preview Stage */}
          <div className="lg:col-span-5 relative w-full h-[380px] sm:h-[460px] flex items-center justify-center">
            {/* Glowing Backdrop Circle */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-purple-500/15 to-pink-500/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Constellation Preview Stage */}
            <GlassCard
              padding="lg"
              className="w-full h-full flex flex-col justify-between border-cyan-500/25 shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 font-mono text-xs text-cyan-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{copyConfig.constellation.badge}</span>
                </div>
                <Badge status="live" size="sm">
                  60 FPS WEBGL
                </Badge>
              </div>

              {/* Holographic Matrix Simulation Graphic */}
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-spin" style={{ animationDuration: '14s' }} />
                  <div className="absolute inset-2 rounded-full border border-purple-500/30 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/40">
                    🌐
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-mono font-bold text-white text-base">
                    {copyConfig.constellation.title}
                  </h3>
                  <p className="text-gray-400 text-xs font-sans max-w-sm mx-auto">
                    {copyConfig.constellation.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>Phase A Verified</span>
                <span className="text-cyan-400">Next-Gen Topology</span>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ─── Metric Counters Banner ─────────────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          {statsConfig.heroMetrics.map((metric) => (
            <div
              key={metric.id}
              className="p-3 sm:p-4 text-center border-r border-white/5 last:border-r-0 flex flex-col items-center justify-center"
            >
              <Counter stat={metric} size="md" />
            </div>
          ))}
        </div>
      </section>

      {/* ─── Universal Theme Engine Section ───────────────────────────────────── */}
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

      {/* ─── Enterprise Features & Services Catalog ──────────────────────────── */}
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
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {svc.commands.map((cmd) => (
                    <span
                      key={cmd}
                      className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[11px] text-cyan-300"
                    >
                      {cmd}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Usage */}
              <div className="pt-3 border-t border-white/5 font-mono text-[11px] text-gray-500 truncate">
                <span className="text-gray-600">Sample: </span>
                <span className="text-gray-400">{svc.sampleUsage}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ─── Pricing & Entitlement Matrix Section ────────────────────────────── */}
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
          <div className="flex items-center justify-center gap-3 pt-4 font-mono text-xs">
            <span className={billingCycle === 'monthly' ? 'text-white font-bold' : 'text-gray-400'}>
              {copyConfig.pricing.monthlyToggle}
            </span>
            <button
              onClick={() =>
                setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')
              }
              className="w-12 h-6 rounded-full bg-white/10 border border-white/20 p-1 transition-colors relative flex items-center"
              aria-label="Toggle annual billing"
            >
              <div
                className={`w-4 h-4 rounded-full bg-cyan-400 transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={billingCycle === 'yearly' ? 'text-cyan-300 font-bold' : 'text-gray-400'}>
              {copyConfig.pricing.yearlyToggle}{' '}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {copyConfig.pricing.yearlySavings}
              </span>
            </span>
          </div>
        </div>

        {/* 4 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_LIST.map((plan) => {
            const price =
              plan.id === 'lifetime'
                ? `$${plan.oneTimePrice}`
                : billingCycle === 'yearly'
                  ? `$${plan.yearlyPrice}`
                  : `$${plan.monthlyPrice}`;
            const cycleSuffix =
              plan.id === 'lifetime' ? 'once' : '/ month';

            return (
              <GlassCard
                key={plan.id}
                padding="md"
                glowColor={plan.accentColor}
                className={`flex flex-col justify-between ${
                  plan.popular ? 'border-cyan-500/50 ring-1 ring-cyan-500/30' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{plan.icon}</span>
                    <Badge tier={plan.id} size="sm">
                      {plan.badge}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-black text-white font-mono mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed mb-4">
                    {plan.description}
                  </p>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        {price}
                      </span>
                      <span className="text-xs text-gray-400">{cycleSuffix}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                      {plan.billingText}
                    </div>
                  </div>

                  {/* Highlight Features */}
                  <div className="space-y-2 pt-4 border-t border-white/10 mb-6 font-sans text-xs text-gray-300">
                    {plan.highlightFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold shrink-0">✓</span>
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
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

      {/* ─── Frequently Answered Questions ──────────────────────────────────── */}
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
