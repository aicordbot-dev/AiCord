'use client';

/**
 * src/components/layout/Navbar.tsx
 * Ultra-clean, minimal floating navbar for AiCord in warm cream & ivory aesthetic.
 * Features official AiCordLogo, navigation anchors, theme selector,
 * user session nav, and Discord blurple Add to Discord CTA.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { AiCordLogo } from '@/components/brand/AiCordLogo';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { UserNav } from '@/components/navbar/UserNav';
import { siteConfig } from '@/config/site';

export interface NavbarProps {
  onOpenInvite?: () => void;
}

export function Navbar({ onOpenInvite }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#FDFBF7]/85 border-b border-[#E7E2DA] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo with light cream styling */}
        <div className="shrink-0">
          <AiCordLogo
            colorScheme="light"
            size="md"
            showVersion={true}
            showSubtitle={false}
            href="/"
          />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-mono font-medium text-[#57534E]">
          <a
            href="#ai-builder"
            className="hover:text-[#5865F2] transition-colors py-1 px-2 rounded-lg hover:bg-stone-200/50"
          >
            Builder
          </a>
          <a
            href="#features"
            className="hover:text-[#5865F2] transition-colors py-1 px-2 rounded-lg hover:bg-stone-200/50"
          >
            Services
          </a>
          <a
            href="#themes"
            className="hover:text-[#5865F2] transition-colors py-1 px-2 rounded-lg hover:bg-stone-200/50"
          >
            Themes
          </a>
          <a
            href="#pricing"
            className="hover:text-[#5865F2] transition-colors py-1 px-2 rounded-lg hover:bg-stone-200/50"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hover:text-[#5865F2] transition-colors py-1 px-2 rounded-lg hover:bg-stone-200/50"
          >
            Docs
          </a>
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme Palette Switcher */}
          <div className="hidden sm:block">
            <ThemePicker variant="navbar" />
          </div>

          {/* User Nav Session (Login / Profile) */}
          <UserNav />

          {/* Primary Discord Blurple Button */}
          <button
            onClick={onOpenInvite}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono text-xs font-bold transition-all shadow-sm shadow-[#5865F2]/25 hover:shadow-md hover:shadow-[#5865F2]/30 active:scale-95 cursor-pointer"
          >
            <span>⚡</span>
            <span className="hidden xs:inline">Add to Discord</span>
            <span className="xs:hidden">Add</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-stone-200/50 font-mono text-base"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E7E2DA] bg-[#FDFBF7] px-4 pt-3 pb-6 space-y-3 font-mono text-xs animate-in slide-in-from-top-2 duration-150 shadow-lg">
          <div className="flex flex-col space-y-1">
            <a
              href="#ai-builder"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg text-[#1C1917] hover:bg-stone-100 font-medium"
            >
              ⚡ AI Builder
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg text-[#1C1917] hover:bg-stone-100 font-medium"
            >
              🛠️ 28+ Services
            </a>
            <a
              href="#themes"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg text-[#1C1917] hover:bg-stone-100 font-medium"
            >
              🎨 Themes Engine
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg text-[#1C1917] hover:bg-stone-100 font-medium"
            >
              💎 Pricing Plans
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg text-[#1C1917] hover:bg-stone-100 font-medium"
            >
              📖 Docs &amp; FAQ
            </a>
          </div>

          <div className="pt-2 border-t border-[#E7E2DA] flex items-center justify-between">
            <span className="text-[11px] text-[#78716C]">Theme:</span>
            <ThemePicker variant="navbar" />
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
