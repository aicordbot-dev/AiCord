'use client';

/**
 * src/components/layout/Footer.tsx
 * Ultra-clean, minimal warm cream footer for AiCord.
 * Warm cream background (#F5F2EB), border-t (#E7E2DA), official AiCordLogo,
 * categorized links (Product, Services, Resources, Legal),
 * live operational status indicator, sound toggle, and copyright notices.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { AiCordLogo } from '@/components/brand/AiCordLogo';
import { Badge } from '@/components/ui/Badge';
import { siteConfig } from '@/config/site';
import { copyConfig } from '@/config/copy';
import { statsConfig } from '@/config/stats';

export interface FooterProps {
  onOpenInvite?: () => void;
}

export function Footer({ onOpenInvite }: FooterProps) {
  const [audioMuted, setAudioMuted] = useState(true);

  return (
    <footer className="border-t border-[#E7E2DA] bg-[#F5F2EB] py-14 px-4 sm:px-6 lg:px-8 relative z-20 transition-colors">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top Grid: Brand & Categorized Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1: Brand, Tagline, & Live Status */}
          <div className="lg:col-span-2 space-y-4">
            <AiCordLogo
              colorScheme="light"
              size="md"
              showVersion={true}
              showSubtitle={true}
              href="/"
            />
            <p className="text-xs font-sans text-[#57534E] max-w-sm leading-relaxed">
              The next-generation AI architect bot for Discord. Synthesize full server topology,
              categories, channels, role hierarchies, and 28+ enterprise modules with sub-850ms latency.
            </p>

            {/* Live Operational Status Indicator */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-[#E7E2DA] shadow-xs text-xs font-mono text-[#1C1917]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-[11px]">All Systems Operational</span>
              <span className="text-[#A8A29E] text-[10px]">• 99.98% uptime</span>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="font-bold text-[#1C1917] tracking-wider uppercase text-[11px]">Product</h4>
            <ul className="space-y-2 text-[#57534E]">
              <li>
                <a href="#ai-builder" className="hover:text-[#5865F2] transition-colors">
                  AI Server Builder
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#5865F2] transition-colors">
                  28+ Built-in Services
                </a>
              </li>
              <li>
                <a href="#themes" className="hover:text-[#5865F2] transition-colors">
                  Theme Customizer
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#5865F2] transition-colors">
                  Pricing Plans
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenInvite}
                  className="hover:text-[#5865F2] transition-colors text-left"
                >
                  Invite to Discord ↗
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Services */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="font-bold text-[#1C1917] tracking-wider uppercase text-[11px]">Services</h4>
            <ul className="space-y-2 text-[#57534E]">
              <li>
                <span className="text-[#1C1917] font-medium">AutoMod 2.0 AI</span>
              </li>
              <li>
                <span className="text-[#1C1917] font-medium">Economy &amp; RPG</span>
              </li>
              <li>
                <span className="text-[#1C1917] font-medium">Ticket Hub &amp; Transcripts</span>
              </li>
              <li>
                <span className="text-[#1C1917] font-medium">Voice Radio 24/7</span>
              </li>
              <li>
                <span className="text-[#1C1917] font-medium">Polyglot Sandbox (6 Langs)</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources & Legal */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="font-bold text-[#1C1917] tracking-wider uppercase text-[11px]">Resources</h4>
            <ul className="space-y-2 text-[#57534E]">
              <li>
                <a href="#faq" className="hover:text-[#5865F2] transition-colors">
                  Documentation &amp; FAQ
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#5865F2] transition-colors"
                >
                  GitHub Repository ↗
                </a>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#5865F2] transition-colors">
                  Privacy Policy &amp; Terms
                </Link>
              </li>
              <li>
                <button
                  onClick={() => setAudioMuted(!audioMuted)}
                  className="hover:text-[#1C1917] transition-colors text-left text-[11px] text-[#78716C]"
                >
                  {audioMuted ? '🔇 Audio muted' : '🔊 Ambient audio on'}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Tech Stack Badges Row (Clean warm style) */}
        <div className="pt-8 border-t border-[#E7E2DA] flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2DA] text-[#57534E]">
            ⚡ Next.js 16 (Turbopack)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2DA] text-[#57534E]">
            🛡️ Ed25519 Webhooks
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2DA] text-[#57534E]">
            📜 GSAP 2D Animations
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2DA] text-[#57534E]">
            🍃 MongoDB Atlas
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2DA] text-[#57534E]">
            ✨ Google Gemini AI
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2DA] text-[#57534E]">
            🎨 Tailwind CSS v4
          </span>
        </div>

        {/* Bottom Bar: Copyright & Sample Data Notice */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#78716C]">
          <div>
            <span>{copyConfig.footer.copyright}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <Badge status="sample" size="sm">
              {statsConfig.sampleLabel}
            </Badge>
            <span>{copyConfig.footer.counterNotice}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
