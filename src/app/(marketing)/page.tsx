'use client';

/**
 * src/app/(marketing)/page.tsx
 * Complete Marketing Landing Page for AiCord in Minimal Warm Cream aesthetic.
 * Assembles:
 * 1. Minimal Hero with Multi-Module Live Discord Simulator (Hero)
 * 2. Interactive AI Builder "Describe it. AiCord builds it." (PromptDemo)
 * 3. Interactive Community & Economy Playground (InteractivePlayground)
 * 4. Multi-Colored Enterprise Services Showcase (ServicesShowcase)
 * 5. Universal Theme Customizer Studio (ThemeStudio)
 * 6. "AiCord vs 10 Other Bots" Comparison (ComparisonSection)
 * 7. Verified Guild Social Proof & Founder Testimonials (Testimonials)
 * 8. Minimal Pricing Tiers & Stripe Checkout (Pricing)
 * 9. Frequently Answered Questions Accordion (FaqSection)
 * 10. Final Onboarding CTA
 */

import React from 'react';
import { copyConfig } from '@/config/copy';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';
import { Hero } from '@/components/sections/Hero';
import { PromptDemo } from '@/components/sections/PromptDemo';
import { InteractivePlayground } from '@/components/sections/InteractivePlayground';
import { ServicesShowcase } from '@/components/sections/ServicesShowcase';
import { ThemeStudio } from '@/components/sections/ThemeStudio';
import { ComparisonSection } from '@/components/sections/ComparisonSection';
import { Testimonials } from '@/components/sections/Testimonials';
import { Pricing } from '@/components/sections/Pricing';
import { FaqSection } from '@/components/sections/FaqSection';

export default function MarketingPage() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* ─── 1. Minimal Hero Section with Multi-Module Live Discord Simulator ─── */}
      <Hero />

      {/* ─── 2. Interactive AI Builder "Describe it. AiCord builds it." ──────────── */}
      <PromptDemo />

      {/* ─── 3. Interactive Community & Economy Playground (Coinflip, Crate, ASCII) */}
      <InteractivePlayground />

      {/* ─── 4. Multi-Colored Enterprise Services Showcase (#features) ───────────── */}
      <ServicesShowcase />

      {/* ─── 5. Universal Theme Customizer Studio (#themes) ─────────────────────── */}
      <ThemeStudio />

      {/* ─── 6. AiCord vs 10 Other Bots Visual Comparison (#comparison) ─────────── */}
      <ComparisonSection />

      {/* ─── 7. Verified Guild Social Proof & Testimonials (#testimonials) ──────── */}
      <Testimonials />

      {/* ─── 8. Minimal Pricing Tiers & Stripe Checkout (#pricing) ──────────────── */}
      <Pricing />

      {/* ─── 9. Frequently Answered Questions Accordion (#faq) ──────────────────── */}
      <FaqSection />

      {/* ─── 10. Final Onboarding CTA Section ───────────────────────────────────── */}
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
