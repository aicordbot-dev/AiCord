'use client';

/**
 * src/components/sections/Hero.tsx
 * Hero Section for AiCord (Storyboard 0–10% of scroll).
 * Features fluid typography with H1 char-split reveal animation,
 * Magnetic primary CTA with bot permissions link, Auth.js session-aware secondary CTA,
 * interactive /build slash command pill preview, and responsive metric counters.
 */

import React, { useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { copyConfig } from '@/config/copy';
import { statsConfig } from '@/config/stats';
import { siteConfig } from '@/config/site';
import { ADMIN_PERMISSIONS_INTEGER } from '@/config/bot-permissions';
import { isDemoMode, MOCK_USER } from '@/lib/demo-mode';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Counter } from '@/components/ui/Counter';
import { Magnetic } from '@/components/ui/Magnetic';
import { SplitText } from '@/components/ui/SplitText';
import { AiCordMark } from '@/components/brand/AiCordMark';
import { SlashCommand } from '@/components/discord-mock/SlashCommand';
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

  const handlePromptPillClick = () => {
    if (scrollTo) {
      scrollTo('#ai-builder', { offset: -60, duration: 1.2 });
    } else {
      const el = document.getElementById('ai-builder');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={heroRef}
      id="hero"
      aria-label="AiCord Hero Introduction"
      className="relative pt-8 sm:pt-16 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Headline, Subtitle, CTAs, Slash Command Pill */}
        <div className="lg:col-span-8 space-y-6 text-center lg:text-left">
          {/* Top Engine Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-mono text-cyan-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{copyConfig.hero.badge}</span>
          </div>

          {/* Fluid H1 Headline with SplitText Reveal */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] font-mono">
            <SplitText
              as="span"
              splitBy="chars"
              duration={0.8}
              stagger={0.015}
              highlightWords={['AI', 'minutes.']}
              highlightClassName="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500"
            >
              {copyConfig.hero.h1}
            </SplitText>
          </h1>

          {/* Subtitle with smooth fade-in */}
          <p className="text-sm sm:text-base lg:text-lg text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans animate-in fade-in duration-700 delay-300">
            {copyConfig.hero.sub}
          </p>

          {/* CTA Row with Magnetic Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            {/* Magnetic Primary CTA: Add to Discord */}
            <Magnetic strength={0.35}>
              <Button
                variant="primary"
                size="lg"
                href={inviteUrl}
                external
                icon={<AiCordMark size={22} variant="transparent" />}
                className="w-full sm:w-auto shadow-lg shadow-indigo-500/25"
              >
                {copyConfig.hero.ctaPrimary}
              </Button>
            </Magnetic>

            {/* Secondary CTA: Session aware (Open dashboard or Login with Discord) */}
            {isLoggedIn ? (
              <Button
                variant="glass"
                size="lg"
                href="/dashboard"
                className="w-full sm:w-auto border-cyan-500/30 hover:border-cyan-400/50"
              >
                {copyConfig.hero.ctaSecondaryLoggedIn} →
              </Button>
            ) : (
              <Button
                variant="glass"
                size="lg"
                href="/login"
                className="w-full sm:w-auto"
              >
                {copyConfig.hero.ctaSecondary}
              </Button>
            )}
          </div>

          {/* Interactive Slash Command Prompt Pill Preview */}
          <div className="pt-2">
            <div className="text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider flex items-center justify-center lg:justify-start gap-2">
              <span>Interactive Builder Command</span>
              <span className="text-cyan-400 font-bold">• Click to synthesize ↓</span>
            </div>
            <div className="inline-block max-w-full">
              <SlashCommand
                command={copyConfig.hero.sampleCommand.command}
                user={{ name: 'alex' }}
                params={[
                  {
                    name: 'prompt',
                    value:
                      'Esports tournament guild with scrim voice rooms and verified rank gates',
                  },
                ]}
                onClick={handlePromptPillClick}
                className="hover:scale-[1.02] transition-transform cursor-pointer border-cyan-500/30 bg-black/60 backdrop-blur-md"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Holographic Constellation Badge & 3D Nexus Preview */}
        <div className="lg:col-span-4 relative flex flex-col items-center justify-center text-center">
          <div className="w-full p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 font-mono text-xs text-cyan-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>60 FPS WEBGL</span>
              </div>
              <Badge status="live" size="sm">
                100% VERIFIED
              </Badge>
            </div>

            <div className="py-6 flex flex-col items-center justify-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/30 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <AiCordMark size={48} variant="tile" />
              </div>
              <h3 className="font-mono font-bold text-white text-base">
                Interactive 3D Guild Nexus
              </h3>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                Scroll down to interact with live blueprint topologies, automated security audits, and role hierarchies.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>Storyboard: 0–10%</span>
              <span className="text-cyan-400">Section 8 Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Counters Strip */}
      <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 sm:p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-xl">
        {statsConfig.heroMetrics.map((metric) => (
          <div
            key={metric.id}
            className="p-2 sm:p-4 text-center border-r border-white/5 last:border-r-0 flex flex-col items-center justify-center"
          >
            <Counter stat={metric} size="md" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default Hero;
