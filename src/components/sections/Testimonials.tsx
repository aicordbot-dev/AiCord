'use client';

/**
 * src/components/sections/Testimonials.tsx
 * Verified Guild Social Proof & Founder Testimonials for AiCord.
 * 4-6 rich social proof cards from large verified gaming, dev, campus, and anime communities.
 */

import React from 'react';

interface Testimonial {
  author: string;
  role: string;
  guildName: string;
  members: string;
  guildIcon: string;
  quote: string;
  highlight: string;
  tag: string;
  tagColor: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    author: 'Marcus Vance',
    role: 'Managing Director & Team Owner',
    guildName: 'Apex Syndicate Esports',
    members: '48,200 Members',
    guildIcon: '🎮',
    quote:
      'AiCord eliminated 7 different bots overnight. The /build engine synthesized our entire 32-channel tournament scrim layout in under 10 seconds with flawless role hierarchy. Our staff moderation velocity doubled instantly.',
    highlight: 'Replaced 8 Bots • 48.2k Members',
    tag: 'Esports & Gaming',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    author: 'Elena Rostova',
    role: 'Principal Engineer & Guild Lead',
    guildName: 'HyperScale Dev Collective',
    members: '22,400 Members',
    guildIcon: '💻',
    quote:
      'The polyglot /run compiler is pure wizardry. Our engineers benchmark Python, Rust, and TypeScript snippets directly inside Discord threads. Paired with Gemini AI digests for GitHub PRs, this is hands-down the cleanest bot in existence.',
    highlight: 'Polyglot Compiler • 22.4k Engineers',
    tag: 'Developer Hub',
    tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    author: 'Dr. Julian Chen',
    role: 'Campus IT & Faculty Admin',
    guildName: 'Nova Tech University Guild',
    members: '15,800 Members',
    guildIcon: '🎓',
    quote:
      'Managing 15,000 university students across 8 faculties was chaotic until we deployed AiCord’s automated verification gates and ticket hub. The cryptographic HTML transcripts and 5-star CSAT surveys give us full institutional audit compliance.',
    highlight: 'Audit Compliant • 15.8k Students',
    tag: 'Education Campus',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    author: 'Aoi Tanaka',
    role: 'Community Operations Lead',
    guildName: 'Komorebi Anime & Lounge',
    members: '65,300 Members',
    guildIcon: '🌸',
    quote:
      'Our members are obsessed with the 24/7 Lo-Fi radio, custom ASCII rank cards, and the mystery crate unboxer. We cancelled $120/month of MEE6 and Dank Memer subscriptions, and community retention surged by 42% in our very first week.',
    highlight: '+42% Retention • 65.3k Members',
    tag: 'Anime & Social',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    author: 'David Sterling',
    role: 'Community Director & Founder',
    guildName: 'Founders Sovereign Guild',
    members: '11,200 Members',
    guildIcon: '🪙',
    quote:
      'The Sovereign Lifetime Pass made AiCord an immediate no-brainer. One single payment and we never have to think about recurring bot invoices again. The Golden Tycoon theme fits our guild perfectly.',
    highlight: 'Lifetime Pass • 11.2k Founders',
    tag: 'Sovereign Web3',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      aria-label="Verified Guild Testimonials"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E7E2DA]"
    >
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#57534E]">
          <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
          <span className="font-semibold text-[#1C1917]">VERIFIED GUILD FOUNDERS</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight font-mono">
          Trusted by 160,000+ Discord Members
        </h2>

        <p className="text-sm sm:text-base text-[#57534E] font-sans font-medium leading-relaxed">
          From premier esports franchises to engineering hubs and academic institutions, discover why Discord leaders switched to AiCord.
        </p>
      </div>

      {/* Testimonials Masonry / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, idx) => (
          <div
            key={idx}
            className="rounded-3xl bg-white border border-[#E7E2DA] p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-left"
          >
            {/* Guild Header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${t.tagColor}`}>
                  {t.tag}
                </span>
                <span className="text-[11px] font-mono text-[#78716C] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified Guild
                </span>
              </div>

              {/* Server Name & Members */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-[#FDFBF7] border border-[#E7E2DA] flex items-center justify-center text-xl shadow-xs">
                  {t.guildIcon}
                </div>
                <div>
                  <h4 className="font-mono font-bold text-sm text-[#1C1917]">
                    {t.guildName}
                  </h4>
                  <span className="text-xs font-mono text-[#78716C]">
                    {t.members}
                  </span>
                </div>
              </div>

              {/* Quote */}
              <p className="text-xs sm:text-sm text-[#57534E] font-sans leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>

            {/* Author Footer */}
            <div className="pt-4 border-t border-[#E7E2DA] flex items-center justify-between">
              <div>
                <div className="font-mono font-bold text-xs text-[#1C1917]">
                  {t.author}
                </div>
                <div className="text-[11px] text-[#78716C] font-sans">
                  {t.role}
                </div>
              </div>
              <div className="text-[11px] font-mono font-bold text-[#5865F2] bg-[#5865F2]/10 px-2 py-0.5 rounded-md">
                5.0 ★★★★★
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
