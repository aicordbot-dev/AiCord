'use client';

/**
 * src/app/(marketing)/layout.tsx
 * Marketing Layout containing Lenis Smooth Scroll Provider, Navigation Header,
 * Main Viewport, and Platform Footer with verified tech stack and sample data notices.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { LenisProvider } from '@/lib/lenis-provider';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UserNav } from '@/components/navbar/UserNav';
import { siteConfig } from '@/config/site';
import { copyConfig } from '@/config/copy';
import { statsConfig } from '@/config/stats';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [permissionType, setPermissionType] = useState<'admin' | 'recommended'>('admin');

  const inviteUrl = siteConfig.getInviteUrl(
    permissionType === 'admin' ? '8' : '534723950656'
  );

  return (
    <LenisProvider>
      <div className="min-h-screen bg-[#070913] text-gray-100 relative overflow-hidden flex flex-col">
        {/* ─── Ambient Glow Blobs ────────────────────────────────────────────────── */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-600/15 via-purple-600/10 to-transparent blur-[140px] pointer-events-none" />
        <div className="absolute top-[800px] -left-64 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] pointer-events-none" />
        <div className="absolute top-[1800px] -right-64 w-[500px] h-[500px] bg-cyan-600/10 blur-[150px] pointer-events-none" />

        {/* ─── Navigation Header ────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#070913]/80 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                <div className="w-full h-full bg-[#070913] rounded-[10px] flex items-center justify-center text-xl">
                  🤖
                </div>
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 font-mono">
                  {siteConfig.name}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    v{siteConfig.version}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-gray-400 block -mt-1">
                  Discord AI Architect
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-8 text-xs font-mono text-gray-300">
              <a href="#features" className="hover:text-cyan-400 transition-colors">
                Features
              </a>
              <a href="#themes" className="hover:text-cyan-400 transition-colors">
                Themes
              </a>
              <a href="#pricing" className="hover:text-cyan-400 transition-colors">
                Pricing
              </a>
              <a href="#faq" className="hover:text-cyan-400 transition-colors">
                Docs &amp; FAQ
              </a>
            </nav>

            {/* Right Control Bar */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* In-Navbar Theme Switcher */}
              <ThemePicker variant="navbar" />

              {/* User Session Nav */}
              <UserNav />

              {/* Add to Discord CTA */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowInviteModal(true)}
                icon={<span>⚡</span>}
              >
                Add to Discord
              </Button>
            </div>
          </div>
        </header>

        {/* ─── Main Content Viewport ────────────────────────────────────────────── */}
        <main className="relative z-10 flex-1">{children}</main>

        {/* ─── Platform Footer ─────────────────────────────────────────────────── */}
        <footer className="border-t border-white/10 bg-[#05070e] py-12 px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Brand and Description */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-xl shadow-md">
                  🤖
                </div>
                <div>
                  <span className="font-bold text-white text-base font-mono">
                    {siteConfig.name} Platform
                  </span>
                  <span className="text-xs text-gray-400 block font-mono">
                    {copyConfig.footer.copyright}
                  </span>
                </div>
              </div>

              {/* Sound Toggle Placeholder */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`
                    px-3 py-1.5 rounded-xl border font-mono text-xs transition-all flex items-center gap-2
                    ${
                      soundEnabled
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }
                  `}
                  title="Toggle immersive ambient spatial soundscape"
                >
                  <span>{soundEnabled ? '🔊 Audio: On' : '🔇 Audio: Muted'}</span>
                </button>
              </div>

              {/* Quick Navigation Links */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-gray-400">
                <a href="#features" className="hover:text-cyan-400 transition-colors">
                  Features
                </a>
                <a href="#themes" className="hover:text-cyan-400 transition-colors">
                  Themes
                </a>
                <a href="#pricing" className="hover:text-cyan-400 transition-colors">
                  Pricing
                </a>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-cyan-400 transition-colors"
                >
                  GitHub
                </a>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="text-cyan-400 hover:underline"
                >
                  Invite Bot
                </button>
              </div>
            </div>

            {/* Tech Stack Badges Row */}
            <div className="pt-6 border-t border-white/5 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                ⚡ Next.js 16
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300">
                🌐 Three.js WebGL
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-300">
                📜 GSAP + Lenis
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-emerald-300">
                🍃 MongoDB Atlas
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sky-300">
                🎨 Tailwind CSS v4
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-yellow-300">
                ✨ Google Gemini AI
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-pink-300">
                🔐 Ed25519 Webhooks
              </span>
            </div>

            {/* Mandatory Sample Data Disclaimer Notice */}
            <div className="text-center pt-2">
              <p className="text-[11px] font-mono text-gray-500 max-w-2xl mx-auto flex items-center justify-center gap-2">
                <Badge status="sample" size="sm">
                  {statsConfig.sampleLabel}
                </Badge>
                <span>{copyConfig.footer.counterNotice}</span>
              </p>
            </div>
          </div>
        </footer>

        {/* ─── Discord OAuth2 Permission Modal ──────────────────────────────────── */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-[#0f1424] border border-white/20 p-6 shadow-2xl relative">
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-mono p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-cyan-500/30">
                  🤖
                </div>
                <h3 className="text-2xl font-black text-white font-mono">
                  Invite AiCord to Discord
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Client ID: {siteConfig.discordClientId}
                </p>
              </div>

              <div className="space-y-3 mb-6 font-mono text-xs">
                <label className="text-gray-400 uppercase tracking-wider block">
                  Select Permission Scope:
                </label>

                <div
                  onClick={() => setPermissionType('admin')}
                  className={`
                    p-3.5 rounded-xl border cursor-pointer transition-all
                    ${
                      permissionType === 'admin'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                    }
                  `}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>👑 Administrator (Recommended)</span>
                    <span className="text-[10px] text-cyan-400">permissions=8</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans mt-1">
                    Required for complete automated /build architecture, channel provisioning, and instant permission overwriting.
                  </p>
                </div>

                <div
                  onClick={() => setPermissionType('recommended')}
                  className={`
                    p-3.5 rounded-xl border cursor-pointer transition-all
                    ${
                      permissionType === 'recommended'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                    }
                  `}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>🛡️ Granular Least-Privilege</span>
                    <span className="text-[10px] text-cyan-400">permissions=534723950656</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans mt-1">
                    Manage Channels, Manage Roles, Moderation, Voice connect, and standard messaging.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="md"
                  href={inviteUrl}
                  external
                  className="w-full justify-center"
                >
                  Authorize Bot on Discord ↗
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LenisProvider>
  );
}
