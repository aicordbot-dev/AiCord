'use client';

/**
 * src/app/checkout/cancel/page.tsx
 * Friendly checkout cancellation page for AiCord.
 * Informs the user that no charges were made and offers quick return to pricing or support.
 */

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { siteConfig } from '@/config/site';

function CancelContent() {
  const searchParams = useSearchParams();
  const rawTier = (searchParams.get('tier') || '').toLowerCase();

  const tierNameMap: Record<string, string> = {
    pro: 'AiCord Pro',
    ultimate: 'AiCord Ultimate Sovereign',
    lifetime: 'AiCord Lifetime Sovereign',
  };

  const planName = tierNameMap[rawTier] || null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] flex flex-col justify-between selection:bg-[#5865F2]/20 selection:text-[#5865F2]">
      {/* Header Bar */}
      <header className="border-b border-[#E7E2DA] bg-[#FDFBF7]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-[#5865F2] flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <span className="font-mono font-black text-lg tracking-tight text-[#1C1917]">
              AiCord
            </span>
          </Link>

          <Link
            href="/#pricing"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#78716C] hover:text-[#1C1917] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Pricing</span>
          </Link>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-[#E7E2DA] p-8 sm:p-10 shadow-lg space-y-6 text-center">
          {/* Friendly Icon */}
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-sm">
            <RefreshCw className="w-8 h-8" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-[#E7E2DA] text-[#78716C] text-[11px] font-mono font-bold uppercase tracking-wider">
              <span>Checkout Not Completed</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">
              Checkout Cancelled — No charges were made.
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
              Your payment process was cancelled before completion. No transaction took place and
              your card was not charged.
            </p>
          </div>

          {/* Reassurance Info Box */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-[#E7E2DA] text-left space-y-2 font-mono text-xs">
            {planName && (
              <div className="flex justify-between py-1 border-b border-[#E7E2DA]">
                <span className="text-[#78716C]">Cancelled Item:</span>
                <span className="font-bold text-[#1C1917]">{planName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 text-[#57534E]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You still have full access to all Free tier capabilities.</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <Link
              href="/#pricing"
              className="w-full py-3 px-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono text-xs font-bold transition-all shadow-md shadow-[#5865F2]/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Return to Pricing</span>
            </Link>

            <a
              href={siteConfig.links.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-[#E7E2DA] text-[#1C1917] font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Contact Support on Discord</span>
              <ExternalLink className="w-3 h-3 text-[#78716C]" />
            </a>

            <Link
              href="/"
              className="block py-2 text-xs font-mono text-[#78716C] hover:text-[#1C1917] transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E7E2DA] py-6 text-center text-xs text-[#78716C] font-mono">
        © {new Date().getFullYear()} AiCord. All rights reserved.
      </footer>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8">
          <div className="p-6 bg-white rounded-2xl border border-[#E7E2DA] font-mono text-xs text-[#78716C]">
            Loading...
          </div>
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
