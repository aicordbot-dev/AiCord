'use client';

/**
 * src/components/sections/FaqSection.tsx
 * Interactive FAQ Accordion section for AiCord marketing page.
 * Smooth expand/collapse, accessible ARIA attributes, and detailed answers to top questions.
 */

import React, { useState } from 'react';
import { playPop } from '@/lib/audio';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    category: 'Architecture',
    question: 'How does AiCord differ from generic multi-purpose bots (MEE6, Carl, Dyno)?',
    answer:
      'Most legacy Discord bots run expensive 24/7 WebSocket gateway dynos that crash under heavy traffic or require stacked subscriptions. AiCord is engineered on pure Discord HTTP Interactions with cryptographic Ed25519 signature verification on Next.js 16 edge runtimes. All 28+ services (AI builder, economy, tickets, voice radio, sandboxing) live inside one unified core with zero bloat.',
  },
  {
    category: 'Safety & Builder',
    question: 'Can I undo or rollback an automated /build server architecture?',
    answer:
      'Yes, absolutely. Before executing any channel or role creation, AiCord captures an immutable snapshot of your server hierarchy. If you want to revert changes or try another blueprint style, you can run `/build undo` or selectively purge generated categories without affecting existing community discussions.',
  },
  {
    category: 'Permissions',
    question: 'Which Discord permissions does AiCord require?',
    answer:
      'For automated channel provisioning and role hierarchy sync (/build), Administrator (permissions=8) is recommended. If your security team enforces granular least-privilege, permissions=534723950656 provides all necessary grants: Manage Channels, Manage Roles, Moderate Members, and standard slash messaging.',
  },
  {
    category: 'Billing & Licenses',
    question: 'How does Stripe billing and the Lifetime Sovereign Pass work?',
    answer:
      'All payments are processed securely through Stripe Checkout. Upon purchasing the Sovereign Lifetime Pass, a unique cryptographic license key is generated instantly. You can activate it directly in your guild with `/premium activate <key>` or link it through the AiCord web dashboard. No monthly recurring fees, ever.',
  },
  {
    category: 'Billing & Licenses',
    question: 'Can I transfer my Lifetime Pass to a different Discord server?',
    answer:
      'Yes. Lifetime Passes belong to the purchaser. If you migrate servers or launch a new guild, you can unbind the license key from your web dashboard and re-activate it in any Discord server where you possess Server Management privileges.',
  },
  {
    category: 'AI & Speed',
    question: 'How does Google Gemini AI integration work?',
    answer:
      'AiCord connects to Google Gemini 2.5 Flash for rapid server topology synthesis, voice note transcription (/transcribe), GitHub PR digests, and dynamic turn-based RPG dungeon generation with response latencies consistently under 850 milliseconds.',
  },
  {
    category: 'Support & Privacy',
    question: 'Are support tickets and transcripts cryptographically secure?',
    answer:
      'All closed tickets generate an encrypted, self-contained HTML transcript with complete timestamps, user tags, and uploaded media attachments. Transcripts are accessible only to staff roles designated in your guild configuration.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (idx: number) => {
    playPop(480);
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section
      id="faq"
      aria-label="Frequently Asked Questions"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-[#E7E2DA]"
    >
      {/* Header */}
      <div className="text-center mb-12 sm:mb-16 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
          <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
          <span className="font-semibold text-[#1C1917]">FREQUENTLY ANSWERED QUESTIONS</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
          Everything You Need to Know
        </h2>

        <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
          Clear, honest engineering answers regarding permissions, billing, architecture rollbacks, and Gemini AI.
        </p>
      </div>

      {/* Accordion Container */}
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`
                rounded-3xl border transition-all duration-200 overflow-hidden
                ${
                  isOpen
                    ? 'bg-white border-[#5865F2]/40 shadow-md'
                    : 'bg-white/80 hover:bg-white border-[#E7E2DA] shadow-xs'
                }
              `}
            >
              <button
                onClick={() => handleToggle(idx)}
                aria-expanded={isOpen}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-[#FDFBF7] border border-[#E7E2DA] text-[#5865F2] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    Q
                  </span>
                  <span className="font-mono font-bold text-sm sm:text-base text-[#1C1917] leading-snug">
                    {item.question}
                  </span>
                </div>

                <span
                  className={`
                    w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-transform duration-200 shrink-0
                    ${isOpen ? 'bg-[#5865F2] text-white rotate-180' : 'bg-stone-100 text-[#78716C]'}
                  `}
                >
                  ▼
                </span>
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-[#57534E] font-sans leading-relaxed border-t border-[#E7E2DA]/60 animate-in fade-in duration-150">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
