'use client';

/**
 * src/components/sections/Hero.tsx
 * Ultra-clean, minimal warm cream hero section inspired by top modern Discord bots
 * (MEE6, Sapphire, Discrofy).
 * Features warm dark typography, subtle blurple-to-cyan gradient text highlight,
 * multi-colored floating bobbing badge pills, clickable prompt template chips,
 * magnetic Discord Blurple primary CTA, and the multi-module LiveDiscordSimulator preview.
 */

import React, { useRef } from 'react';
import { useSession } from 'next-auth/react';
import { copyConfig } from '@/config/copy';
import { statsConfig } from '@/config/stats';
import { siteConfig } from '@/config/site';
import { ADMIN_PERMISSIONS_INTEGER } from '@/config/bot-permissions';
import { isDemoMode, MOCK_USER } from '@/lib/demo-mode';
import { Button } from '@/components/ui/Button';
import { Counter } from '@/components/ui/Counter';
import { Magnetic } from '@/components/ui/Magnetic';
import { SplitText } from '@/components/ui/SplitText';
import { AiCordMark } from '@/components/brand/AiCordMark';
import { LiveDiscordSimulator } from '@/components/sections/LiveDiscordSimulator';
import { openCommandPalette } from '@/components/ui/CommandPalette';
import { useLenis } from '@/lib/lenis-provider';

export function Hero() {
  const { data: session } = useSession();
  const { scrollTo } = useLenis();
  const heroRef = useRef<HTMLElement>(null);

  // Check demo mode or active user
  let demoActive = false;
  try {
    demoActive = isDemoMode();
  } catch {
    demoActive = false;
  }
  const user = session?.user || (demoActive ? MOCK_USER : null);
  const isLoggedIn = !!user;

  // Bot invite OAuth URL with Administrator permissions
  const inviteUrl = siteConfig.getInviteUrl(ADMIN_PERMISSIONS_INTEGER);

  const handleScrollToBuilder = (promptText?: string) => {
    if (scrollTo) {
      scrollTo('#ai-builder', { offset: -60, duration: 1.2 });
    } else {
      const el = document.getElementById('ai-builder');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const samplePrompts = [
    { label: '🎮 Esports Arena', prompt: 'Esports tournament guild with scrim voice rooms and verified rank gates' },
    { label: '💻 Developer Hub', prompt: 'Developer collective with GitHub webhooks, polyglot sandboxes, and RFC forums' },
    { label: '🎨 Content Creator', prompt: 'Streamer community with YouTube/Twitch alerts, fan lounges, and VIP tiers' },
    { label: '📚 Study Campus', prompt: 'University campus with department channels, study voice pods, and role gatekeepers' },
  ];

  return (
    <section
      ref={heroRef}
      id="hero"
      aria-label="AiCord Hero Introduction"
      className="relative pt-8 sm:pt-16 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Headline, Subtitle, Floating Pills, CTAs, Template Chips */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          {/* Top Engine Badge with Command Palette Quick Trigger */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
              <span className="w-2 h-2 rounded-full bg-[#5865F2] animate-pulse" />
              <span className="font-semibold text-[#1C1917]">{copyConfig.hero.badge}</span>
              <span className="text-[#A8A29E]">• Sub-850ms Engine</span>
            </div>

            <button
              onClick={() => openCommandPalette()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDFBF7] hover:bg-stone-100 border border-[#E7E2DA] text-xs font-mono text-[#57534E] hover:text-[#5865F2] transition-colors cursor-pointer shadow-xs"
              title="Open Command Search Palette"
            >
              <span>🔍</span>
              <span>Search 28+ Commands</span>
              <kbd className="text-[10px] bg-white border border-[#E7E2DA] px-1.5 py-0.2 rounded font-bold">
                /
              </kbd>
            </button>
          </div>

          {/* Fluid H1 Headline with Warm Dark Typography */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1C1917] tracking-tight leading-[1.08] font-mono">
            <SplitText
              as="span"
              splitBy="chars"
              duration={0.8}
              stagger={0.015}
              highlightWords={['AI', 'minutes.']}
              highlightClassName="text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] via-[#7C3AED] to-[#0284C7]"
            >
              {copyConfig.hero.h1}
            </SplitText>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-[#57534E] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans font-medium">
            {copyConfig.hero.sub}
          </p>

          {/* Multi-Colored Floating Badge Pills (MEE6 / Sapphire / Discrofy Style) */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 pb-1">
            <span className="animate-float-slow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] shadow-xs hover:scale-105 transition-transform">
              <span>🛡️</span>
              <span>Automod AI</span>
            </span>
            <span className="animate-float-delayed inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD] shadow-xs hover:scale-105 transition-transform">
              <span>⚡</span>
              <span>Instant Synthesis</span>
            </span>
            <span className="animate-float-fast inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] shadow-xs hover:scale-105 transition-transform">
              <span>🎮</span>
              <span>Casino &amp; RPG</span>
            </span>
            <span className="animate-float-slow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] shadow-xs hover:scale-105 transition-transform">
              <span>💎</span>
              <span>6 Universal Themes</span>
            </span>
            <span className="animate-float-delayed inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shadow-xs hover:scale-105 transition-transform">
              <span>🎟️</span>
              <span>Ticket Hub &amp; CSAT</span>
            </span>
          </div>

          {/* CTA Row with Magnetic Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
            {/* Magnetic Primary CTA: Add to Discord */}
            <Magnetic strength={0.35}>
              <Button
                variant="primary"
                size="lg"
                href={inviteUrl}
                external
                icon={<AiCordMark size={22} variant="transparent" />}
                className="w-full sm:w-auto !bg-[#5865F2] hover:!bg-[#4752C4] !text-white !shadow-lg !shadow-[#5865F2]/25 font-bold"
              >
                {copyConfig.hero.ctaPrimary}
              </Button>
            </Magnetic>

            {/* Secondary CTA: Session aware (Open dashboard or Launch Builder) */}
            {isLoggedIn ? (
              <Button
                variant="secondary"
                size="lg"
                href="/dashboard"
                className="w-full sm:w-auto !bg-white hover:!bg-stone-50 !text-[#1C1917] !border-[#E7E2DA] shadow-xs hover:shadow-sm"
              >
                {copyConfig.hero.ctaSecondaryLoggedIn} →
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => handleScrollToBuilder()}
                className="w-full sm:w-auto !bg-white hover:!bg-stone-50 !text-[#1C1917] !border-[#E7E2DA] shadow-xs hover:shadow-sm"
              >
                Launch Builder ↓
              </Button>
            )}
          </div>

          {/* Interactive Prompt Preview Bar with Clickable Chips */}
          <div className="pt-3">
            <div className="text-[11px] font-mono text-[#78716C] mb-2 uppercase tracking-wider flex items-center justify-center lg:justify-start gap-2">
              <span>Try Instant Blueprint Templates</span>
              <span className="text-[#5865F2] font-bold">• Click to synthesize</span>
            </div>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleScrollToBuilder(p.prompt)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-[#E7E2DA] hover:border-[#5865F2]/50 text-xs font-mono text-[#57534E] hover:text-[#5865F2] transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Module Live Discord Simulator */}
        <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
          <LiveDiscordSimulator onLaunchBuilder={() => handleScrollToBuilder()} />
        </div>
      </div>

      {/* Metric Counters Strip in Warm Stone Styling */}
      <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 sm:p-6 rounded-3xl bg-white border border-[#E7E2DA] shadow-sm">
        {statsConfig.heroMetrics.map((metric) => (
          <div
            key={metric.id}
            className="p-2 sm:p-4 text-center border-r border-[#E7E2DA] last:border-r-0 flex flex-col items-center justify-center"
          >
            <Counter stat={metric} size="md" colorScheme="light" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default Hero;
