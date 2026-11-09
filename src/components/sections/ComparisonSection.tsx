'use client';

/**
 * src/components/sections/ComparisonSection.tsx
 * "AiCord vs 10 Other Bots" Visual Head-to-Head Comparison Section.
 * Highlights the staggering cost, latency, and operational clutter of running
 * 10 fragmented bots versus AiCord's unified 28-module sovereign architecture.
 */

import React, { useState } from 'react';
import { playPop } from '@/lib/audio';

export function ComparisonSection() {
  const [serverSize, setServerSize] = useState<number>(5000);

  // Annual legacy bot cost calculation: base $80/mo + scale factor
  const monthlyLegacyCost = 84;
  const annualLegacyCost = monthlyLegacyCost * 12;
  const aicordLifetimeCost = 149; // Lifetime single payment
  const annualSavings = annualLegacyCost - aicordLifetimeCost;

  const comparisonRows = [
    {
      feature: 'Total Bot Count in Member List',
      legacy: '8 to 12 separate bots cluttering roles',
      aicord: '1 unified bot with 28 native modules',
      legacyBad: true,
    },
    {
      feature: 'Monthly Running Cost',
      legacy: '$80 – $140+ / month across 6 paywalls',
      aicord: 'Simple pricing with permanent Lifetime Pass',
      legacyBad: true,
    },
    {
      feature: 'Architecture & Protocol',
      legacy: 'Fragile 24/7 WebSocket gateway dynos',
      aicord: 'Stateless Discord HTTP Interactions (Ed25519)',
      legacyBad: true,
    },
    {
      feature: 'Slash Command Conflicts',
      legacy: 'Duplicate /help, /rank, /ban clashes',
      aicord: 'Single clean namespace with 28+ commands',
      legacyBad: true,
    },
    {
      feature: 'AI Topology Synthesis (/build)',
      legacy: 'Not available (manual channel creation)',
      aicord: 'Google Gemini 2.5 Flash in sub-850ms',
      legacyBad: true,
    },
    {
      feature: 'Polyglot Compiler Sandbox (/run)',
      legacy: 'Requires external third-party services',
      aicord: 'Sub-20ms edge microVMs (Python, Rust, TS)',
      legacyBad: true,
    },
    {
      feature: 'Theme Engine & Aesthetics',
      legacy: 'Fixed, generic bot branding',
      aicord: '6 universal themes & 4 ASCII progress bars',
      legacyBad: true,
    },
    {
      feature: 'Ticketing & CSAT Analytics',
      legacy: 'Separate Ticket Tool bot with paywalled HTML',
      aicord: 'Built-in encrypted HTML & 5-star feedback',
      legacyBad: true,
    },
    {
      feature: 'Verified Uptime SLA',
      legacy: '~98.5% (frequent bot restarts)',
      aicord: '99.98% edge availability with zero dyno drops',
      legacyBad: true,
    },
  ];

  return (
    <section
      id="comparison"
      aria-label="Bot Architecture Comparison"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E7E2DA]"
    >
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
          <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse" />
          <span className="font-semibold text-[#1C1917]">THE BOT CLUTTER CRISIS</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
          AiCord vs. The 10-Bot Nightmare
        </h2>

        <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
          Why pay \$80+/month for 10 disconnected bots with conflicting commands when one modern serverless engine does it all?
        </p>
      </div>

      {/* Visual Head-to-Head Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Card 1: Legacy Bot Clutter */}
        <div className="rounded-3xl bg-white border-2 border-rose-200/80 p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-rose-100 pb-4">
            <div>
              <span className="text-[11px] font-mono text-rose-600 font-bold uppercase tracking-wider">
                The Fragmented Status Quo
              </span>
              <h3 className="text-2xl font-black font-mono text-[#1C1917] mt-0.5">
                10 Disjointed Bots
              </h3>
            </div>
            <span className="text-2xl">⚠️</span>
          </div>

          {/* Badges of cluttered bots */}
          <div className="flex flex-wrap gap-2">
            {[
              'MEE6 ($12/mo)',
              'Dyno ($7/mo)',
              'Carl-bot ($5/mo)',
              'Ticket Tool ($10/mo)',
              'Dank Memer ($8/mo)',
              'Rythm Audio ($10/mo)',
              'ProBot ($8/mo)',
              'Statbot ($15/mo)',
            ].map((bot, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200/60 text-xs font-mono font-medium line-through decoration-rose-400"
              >
                {bot}
              </span>
            ))}
          </div>

          <ul className="space-y-3 text-xs sm:text-sm text-[#57534E] font-sans">
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold shrink-0">✕</span>
              <span><strong>\$80 – \$140 every single month</strong> in recurring subscriptions draining your community budget.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold shrink-0">✕</span>
              <span><strong>Slash command clashes:</strong> Typing <code>/rank</code> or <code>/help</code> prompts 4 duplicate bot suggestions.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold shrink-0">✕</span>
              <span><strong>Frequent WebSocket disconnects:</strong> Dynos crash during Discord outages, leaving your server unprotected.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold shrink-0">✕</span>
              <span><strong>10 separate dashboards:</strong> Mod logs, tickets, and economy balances live in 10 disconnected silos.</span>
            </li>
          </ul>
        </div>

        {/* Card 2: AiCord Sovereign Engine */}
        <div className="rounded-3xl bg-white border-2 border-[#5865F2] p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#5865F2] text-white text-[10px] font-mono font-black uppercase px-4 py-1 rounded-bl-2xl">
            Unified Modern Core
          </div>

          <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-4">
            <div>
              <span className="text-[11px] font-mono text-[#5865F2] font-bold uppercase tracking-wider">
                The Unified Solution
              </span>
              <h3 className="text-2xl font-black font-mono text-[#1C1917] mt-0.5">
                AiCord Sovereign Architecture
              </h3>
            </div>
            <span className="text-2xl">⚡</span>
          </div>

          {/* Clean module badges */}
          <div className="flex flex-wrap gap-2">
            {[
              'AI Builder',
              'Automod AI',
              'XP & Levels',
              'Ticket Hub',
              '24/7 Lo-Fi',
              'Vegas Games',
              'Polyglot Sandbox',
              'GitHub Relay',
              '6 Themes',
            ].map((mod, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20 text-xs font-mono font-bold"
              >
                ✓ {mod}
              </span>
            ))}
          </div>

          <ul className="space-y-3 text-xs sm:text-sm text-[#57534E] font-sans">
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <span><strong>Permanent Lifetime Pass option:</strong> Pay once, own 28 enterprise services forever with zero subscriptions.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <span><strong>Single unified namespace:</strong> Zero command clashes, clean autocomplete, and instant sub-850ms execution.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <span><strong>Pure HTTP Edge Interactions:</strong> 99.98% verified uptime with cryptographic Ed25519 signature checks.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <span><strong>1 central command center:</strong> All audit trails, role hierarchies, tickets, and economy sync in real time.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Interactive Annual Savings Calculator */}
      <div className="rounded-3xl bg-[#FDFBF7] border border-[#E7E2DA] p-6 sm:p-8 shadow-sm mb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 space-y-3">
            <span className="text-xs font-mono text-[#059669] font-bold uppercase tracking-wider">
              Interactive ROI Calculator
            </span>
            <h4 className="text-2xl font-black font-mono text-[#1C1917]">
              Estimate Your Server&apos;s Annual Savings
            </h4>
            <p className="text-xs sm:text-sm text-[#57534E] font-sans">
              Drag to match your approximate server member size:
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Guild Size:</span>
                <span className="text-[#5865F2]">{serverSize.toLocaleString()} Members</span>
              </div>
              <input
                type="range"
                min="500"
                max="50000"
                step="500"
                value={serverSize}
                onChange={(e) => {
                  playPop(440);
                  setServerSize(Number(e.target.value));
                }}
                className="w-full accent-[#5865F2] cursor-pointer"
              />
            </div>
          </div>

          <div className="md:col-span-5 bg-white border border-[#E7E2DA] rounded-2xl p-5 text-center space-y-2 shadow-xs">
            <div className="text-xs font-mono uppercase text-[#78716C]">
              Net Projected Year-1 Savings
            </div>
            <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-600">
              ${annualSavings.toLocaleString()}
            </div>
            <p className="text-xs text-[#78716C] font-mono">
              Replaces ~${annualLegacyCost}/yr with a single \$149 Lifetime Pass
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Side-by-Side Comparison Matrix */}
      <div className="rounded-3xl bg-white border border-[#E7E2DA] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#E7E2DA] bg-[#FDFBF7]">
          <h4 className="font-mono font-black text-lg text-[#1C1917]">
            Feature-by-Feature Engineering Breakdown
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E7E2DA] bg-stone-50/50 font-mono text-xs text-[#78716C]">
                <th className="p-4 sm:px-6">Platform Capability</th>
                <th className="p-4 sm:px-6 text-rose-700">10 Fragmented Bots</th>
                <th className="p-4 sm:px-6 text-[#5865F2]">AiCord Unified Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2DA]">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#FDFBF7] transition-colors">
                  <td className="p-4 sm:px-6 font-mono font-bold text-[#1C1917]">
                    {row.feature}
                  </td>
                  <td className="p-4 sm:px-6 text-rose-700 font-mono text-xs">
                    <span className="mr-1.5">✕</span>
                    {row.legacy}
                  </td>
                  <td className="p-4 sm:px-6 text-emerald-700 font-mono text-xs font-bold">
                    <span className="mr-1.5">✓</span>
                    {row.aicord}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
