'use client';

/**
 * src/components/sections/Pricing.tsx
 * Ultra-clean, minimal warm cream pricing section for AiCord.
 * Clean light cream cards for Free, Pro, Ultimate, Lifetime Sovereign.
 * Animated border highlight on the recommended plan.
 * Monthly / Yearly discount toggle.
 * Seamless Stripe Checkout redirection for paid tiers (Pro, Ultimate, Lifetime).
 */

import React, { useState } from 'react';
import { copyConfig } from '@/config/copy';
import { PLAN_LIST, PricingPlan } from '@/config/plans';
import { siteConfig } from '@/config/site';

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handlePlanCheckout = async (planId: string, interval: 'monthly' | 'yearly') => {
    if (planId === 'free') return;
    setLoadingPlan(planId);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          interval,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to initialize Stripe checkout.');
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed.';
      setCheckoutError(msg);
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E7E2DA]">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
          <span className="w-2 h-2 rounded-full bg-[#5865F2] animate-pulse" />
          <span className="font-semibold text-[#1C1917]">{copyConfig.sections.pricing.badge}</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
          {copyConfig.sections.pricing.title}
        </h2>

        <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
          {copyConfig.sections.pricing.description}
        </p>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <div className="p-1 rounded-full bg-stone-200/60 border border-[#E7E2DA] flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {copyConfig.pricing.monthlyToggle}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <span>{copyConfig.pricing.yearlyToggle}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-bold">
                {copyConfig.pricing.yearlySavings}
              </span>
            </button>
          </div>
        </div>

        {checkoutError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono text-center max-w-md mx-auto">
            {checkoutError}
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLAN_LIST.map((plan: PricingPlan) => {
          const isYearly = billingCycle === 'yearly';
          const price =
            plan.oneTimePrice !== undefined
              ? plan.oneTimePrice
              : isYearly
                ? plan.yearlyPrice
                : plan.monthlyPrice;

          const period =
            plan.oneTimePrice !== undefined
              ? 'one-time'
              : isYearly
                ? '/mo (billed yearly)'
                : '/mo';

          const isRecommended = plan.popular;
          const isFree = plan.id === 'free';
          const isLoadingThis = loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-3xl bg-white border p-6 flex flex-col justify-between relative transition-all duration-200 hover:-translate-y-1 ${
                isRecommended
                  ? 'border-[#5865F2] shadow-xl shadow-[#5865F2]/10 ring-2 ring-[#5865F2]/20'
                  : 'border-[#E7E2DA] shadow-sm hover:shadow-md'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#5865F2] text-white font-mono text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <span>★</span>
                  <span>Most Popular</span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{plan.icon}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isRecommended
                          ? 'bg-[#5865F2]/10 text-[#5865F2]'
                          : 'bg-stone-100 text-[#78716C]'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                  <h3 className="font-mono font-bold text-lg text-[#1C1917]">{plan.name}</h3>
                  <p className="text-xs text-[#57534E] font-sans mt-1 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-6 font-mono pt-2 border-t border-[#E7E2DA]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-[#1C1917]">
                      {price === 0 ? '$0' : `$${price}`}
                    </span>
                    <span className="text-xs text-[#78716C]">{period}</span>
                  </div>
                  <p className="text-[11px] text-[#78716C] font-sans mt-1">
                    {plan.billingText}
                  </p>
                </div>

                {/* Highlights List */}
                <ul className="space-y-2 mb-6 font-sans text-xs text-[#57534E]">
                  {plan.highlightFeatures.map((h: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#059669] font-bold shrink-0 mt-0.5">✓</span>
                      <span className="leading-snug">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              {isFree ? (
                <a
                  href={siteConfig.getInviteUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold text-center transition-all cursor-pointer block select-none ${
                    isRecommended
                      ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-md shadow-[#5865F2]/25'
                      : 'bg-stone-100 hover:bg-stone-200 text-[#1C1917] border border-[#E7E2DA]'
                  }`}
                >
                  {plan.ctaText}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlanCheckout(plan.id, isYearly ? 'yearly' : 'monthly')}
                  disabled={loadingPlan !== null}
                  className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold text-center transition-all cursor-pointer block select-none disabled:opacity-60 disabled:cursor-wait ${
                    isRecommended
                      ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-md shadow-[#5865F2]/25'
                      : 'bg-stone-100 hover:bg-stone-200 text-[#1C1917] border border-[#E7E2DA]'
                  }`}
                >
                  {isLoadingThis ? (
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                      Connecting to Stripe...
                    </span>
                  ) : (
                    plan.ctaText
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Pricing;
