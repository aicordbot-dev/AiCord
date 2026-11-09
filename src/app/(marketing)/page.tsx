'use client';

/**
 * src/app/(marketing)/page.tsx
 * Complete Marketing Landing Page for AiCord in Minimal Warm Cream aesthetic.
 * Assembles:
 * 1. Minimal Hero with multi-colored floating bobbing pills & DiscordMock
 * 2. Interactive AI Builder (PromptDemo)
 * 3. Multi-Colored Services Showcase (ServicesShowcase)
 * 4. Universal Theme Engine Section (#themes)
 * 5. Minimal Pricing Cards (Pricing)
 * 6. Frequently Answered Questions (#faq)
 * 7. Final Onboarding CTA
 */

import React from 'react';
import { copyConfig } from '@/config/copy';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { Hero } from '@/components/sections/Hero';
import { PromptDemo } from '@/components/sections/PromptDemo';
import { ServicesShowcase } from '@/components/sections/ServicesShowcase';
import { Pricing } from '@/components/sections/Pricing';

export default function MarketingPage() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* ─── Minimal Hero Section with Floating Pills & DiscordMock ───────────── */}
      <Hero />

      {/* ─── Interactive AI Builder "Describe it. AiCord builds it." ──────────── */}
      <PromptDemo />

      {/* ─── Multi-Colored Enterprise Services Showcase (#features) ───────────── */}
      <ServicesShowcase />

      {/* ─── Universal Theme Engine Section (#themes) ─────────────────────────── */}
      <section id="themes" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E7E2DA]">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
            <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
            <span className="font-semibold text-[#1C1917]">{copyConfig.sections.themes.badge}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
            {copyConfig.sections.themes.title}
          </h2>

          <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
            {copyConfig.sections.themes.description}
          </p>
        </div>

        {/* Standalone Interactive Theme Picker in sleek dark Discord Workstation preview */}
        <div className="rounded-3xl bg-[#1E1F22] border border-black/20 p-6 sm:p-8 shadow-2xl">
          <ThemePicker variant="standalone" />
        </div>
      </section>

      {/* ─── Minimal Pricing Tiers (#pricing) ─────────────────────────────────── */}
      <Pricing />

      {/* ─── Frequently Answered Questions (#faq) ────────────────────────────── */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-[#E7E2DA]">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            <span className="font-semibold text-[#1C1917]">{copyConfig.sections.faq.badge}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
            {copyConfig.sections.faq.title}
          </h2>

          <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
            {copyConfig.sections.faq.description}
          </p>
        </div>

        <div className="space-y-4 font-sans text-sm">
          <div className="p-6 rounded-3xl bg-white border border-[#E7E2DA] shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-[#1C1917] mb-2 flex items-center gap-2 text-base font-mono">
              <span className="text-[#0284C7] font-bold">Q:</span> How does AiCord differ from generic multi-purpose bots?
            </h3>
            <p className="text-[#57534E] leading-relaxed text-xs sm:text-sm">
              Most Discord bots run expensive 24/7 WebSocket gateway dynos that crash under heavy traffic. AiCord runs on pure Discord HTTP Interactions with cryptographic Ed25519 signature verification on Next.js 16 serverless edge handlers. All 28+ services (economy, tickets, confessions, sandboxing, git feeds) are built directly into one unified core.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E7E2DA] shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-[#1C1917] mb-2 flex items-center gap-2 text-base font-mono">
              <span className="text-[#7C3AED] font-bold">Q:</span> Which Discord permissions does AiCord require?
            </h3>
            <p className="text-[#57534E] leading-relaxed text-xs sm:text-sm">
              For complete automated architecture builds (/build) and role hierarchy provisioning, Administrator (permissions=8) is recommended. If you prefer granular least-privilege, permissions=534723950656 grants Manage Channels, Manage Roles, Moderation, and standard chat interactions.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E7E2DA] shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-[#1C1917] mb-2 flex items-center gap-2 text-base font-mono">
              <span className="text-[#059669] font-bold">Q:</span> How does Google Gemini AI integration work?
            </h3>
            <p className="text-[#57534E] leading-relaxed text-xs sm:text-sm">
              AiCord connects to Google Gemini 2.5 Flash for rapid server topology synthesis, voice message audio transcription, GitHub PR digests, and dynamic turn-based RPG dungeon generation with response latencies under 850 milliseconds.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Final Onboarding CTA Section ───────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center relative overflow-hidden rounded-3xl bg-white border border-[#E7E2DA] p-8 sm:p-14 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-100/40 via-purple-100/30 to-sky-100/40 pointer-events-none" />
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
              <span className="w-2 h-2 rounded-full bg-[#5865F2] animate-pulse" />
              <span className="font-semibold text-[#1C1917]">{copyConfig.finalCta.badge}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
              {copyConfig.finalCta.title}
            </h2>

            <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
              {copyConfig.finalCta.description}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href={siteConfig.getInviteUrl()}
                external
                icon={<span>⚡</span>}
                className="w-full sm:w-auto !bg-[#5865F2] hover:!bg-[#4752C4] !text-white !shadow-lg !shadow-[#5865F2]/25 font-bold"
              >
                {copyConfig.finalCta.button}
              </Button>
            </div>

            <p className="text-xs text-[#78716C] font-mono">
              {copyConfig.finalCta.disclaimer}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
