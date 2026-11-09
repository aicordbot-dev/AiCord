'use client';

/**
 * src/app/(marketing)/layout.tsx
 * Ultra-clean, minimal warm cream marketing layout for AiCord.
 * 100% lightweight 2D CSS + GSAP animations (NO heavy 3D WebGL in the background).
 * Includes Preloader, Minimal Floating Navbar, Main Viewport,
 * Discord OAuth2 Permission Modal, Command Palette, Audio Toggle, and Categorized Minimal Footer.
 */

import React, { useState } from 'react';
import { LenisProvider } from '@/lib/lenis-provider';
import { Preloader } from '@/components/ui/Preloader';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { AudioToggle } from '@/components/ui/AudioToggle';
import { AiCordMark } from '@/components/brand/AiCordMark';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [permissionType, setPermissionType] = useState<'admin' | 'recommended'>('admin');

  const inviteUrl = siteConfig.getInviteUrl(
    permissionType === 'admin' ? '8' : '534723950656'
  );

  return (
    <LenisProvider>
      <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] relative overflow-x-hidden flex flex-col font-sans selection:bg-[#5865F2]/20 selection:text-[#5865F2]">
        {/* ─── Minimal Full-Screen Preloader ────────────────────────────────────── */}
        <Preloader />

        {/* ─── Global Command Search Palette (Trigger: `/` or `Ctrl+K`) ─────────── */}
        <CommandPalette />

        {/* ─── Floating Procedural WebAudio Micro-Feedback Toggle ──────────────── */}
        <AudioToggle />

        {/* ─── Ambient 2D Warm Glow Orbs (Pure CSS, 0 GPU overhead) ─────────────── */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Subtle warm dot grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: 'radial-gradient(#D6CFC4 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Champagne / Amber top orb */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-amber-100/50 via-orange-100/30 to-transparent blur-[120px] rounded-full animate-pulse-glow" />

          {/* Soft lavender left orb */}
          <div className="absolute top-[800px] -left-48 w-[600px] h-[600px] bg-purple-100/40 blur-[130px] rounded-full" />

          {/* Soft sky-blue right orb */}
          <div className="absolute top-[1700px] -right-48 w-[600px] h-[600px] bg-sky-100/40 blur-[130px] rounded-full" />
        </div>

        {/* ─── Floating Minimal Navbar Header ───────────────────────────────────── */}
        <Navbar onOpenInvite={() => setShowInviteModal(true)} />

        {/* ─── Main Content Viewport ────────────────────────────────────────────── */}
        <main className="relative z-10 flex-1">{children}</main>

        {/* ─── Minimal Footer ───────────────────────────────────────────────────── */}
        <Footer onOpenInvite={() => setShowInviteModal(true)} />

        {/* ─── Discord OAuth2 Permission Modal ──────────────────────────────────── */}
        {showInviteModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div className="w-full max-w-md rounded-3xl bg-white border border-[#E7E2DA] p-6 sm:p-7 shadow-2xl relative">
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 text-[#78716C] hover:text-[#1C1917] text-lg font-mono p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FDFBF7] border border-[#E7E2DA] shadow-sm flex items-center justify-center">
                  <AiCordMark size={40} variant="tile" glow={false} />
                </div>
                <h3 id="invite-modal-title" className="text-2xl font-black text-[#1C1917] font-mono">
                  Invite AiCord to Discord
                </h3>
                <p className="text-xs text-[#78716C] font-mono mt-1">
                  Application ID: {siteConfig.discordClientId}
                </p>
              </div>

              <div className="space-y-3 mb-6 font-mono text-xs">
                <label className="text-[#78716C] uppercase tracking-wider block text-[11px] font-bold">
                  Select Permission Scope:
                </label>

                <div
                  onClick={() => setPermissionType('admin')}
                  className={`
                    p-3.5 rounded-2xl border cursor-pointer transition-all
                    ${
                      permissionType === 'admin'
                        ? 'border-[#5865F2] bg-[#5865F2]/5 text-[#1C1917] shadow-sm'
                        : 'border-[#E7E2DA] bg-[#FDFBF7] text-[#57534E] hover:border-stone-400'
                    }
                  `}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>👑 Administrator (Full Sync)</span>
                    <span className="text-[10px] text-[#5865F2] bg-[#5865F2]/10 px-2 py-0.5 rounded-full font-bold">
                      permissions=8
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78716C] font-sans mt-1.5 leading-relaxed">
                    Recommended for instantaneous automated /build synthesis, channel provisioning, and permission matrix sync.
                  </p>
                </div>

                <div
                  onClick={() => setPermissionType('recommended')}
                  className={`
                    p-3.5 rounded-2xl border cursor-pointer transition-all
                    ${
                      permissionType === 'recommended'
                        ? 'border-[#5865F2] bg-[#5865F2]/5 text-[#1C1917] shadow-sm'
                        : 'border-[#E7E2DA] bg-[#FDFBF7] text-[#57534E] hover:border-stone-400'
                    }
                  `}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>🛡️ Granular Least-Privilege</span>
                    <span className="text-[10px] text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-full font-bold">
                      permissions=534723950656
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78716C] font-sans mt-1.5 leading-relaxed">
                    Grants Manage Channels, Manage Roles, Moderation, Voice connect, and standard slash messaging.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="md"
                  href={inviteUrl}
                  external
                  className="w-full justify-center !bg-[#5865F2] hover:!bg-[#4752C4] !text-white !shadow-md !shadow-[#5865F2]/25 font-bold"
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
