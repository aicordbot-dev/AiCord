'use client';

import React, { useState } from 'react';
import Hero3DCanvas from '@/components/landing/Hero3DCanvas';
import ThemePreviewWidget from '@/components/landing/ThemePreviewWidget';
import ArchitectureSandbox from '@/components/landing/ArchitectureSandbox';
import ServicesCatalog from '@/components/landing/ServicesCatalog';
import PricingSection from '@/components/landing/PricingSection';

const DEFAULT_CLIENT_ID = '1567565252525170748';

export default function LandingPage() {
  const [selectedPerms, setSelectedPerms] = useState<'admin' | 'recommended'>('admin');
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);

  const getInviteUrl = () => {
    const permissions = selectedPerms === 'admin' ? '8' : '534723950656';
    return `https://discord.com/oauth2/authorize?client_id=${DEFAULT_CLIENT_ID}&scope=bot%20applications.commands&permissions=${permissions}`;
  };

  return (
    <div className="min-h-screen bg-[#070913] text-gray-100 relative overflow-hidden">
      {/* ─── Ambient Glow Blobs ────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-600/15 via-purple-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[800px] -left-64 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[1600px] -right-64 w-[500px] h-[500px] bg-cyan-600/10 blur-[150px] pointer-events-none" />

      {/* ─── Navigation Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#070913]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
              <div className="w-full h-full bg-[#070913] rounded-[10px] flex items-center justify-center text-xl">
                🤖
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                AiCord
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  v2.4
                </span>
              </span>
              <span className="text-[10px] font-mono text-gray-400 block -mt-1">
                Discord AI Architect
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-mono text-gray-300">
            <a href="#sandbox" className="hover:text-cyan-400 transition-colors">
              Sandbox
            </a>
            <a href="#themes" className="hover:text-cyan-400 transition-colors">
              Themes
            </a>
            <a href="#services" className="hover:text-cyan-400 transition-colors">
              30+ Services
            </a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">
              Docs &amp; FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-black font-mono font-bold text-xs sm:text-sm transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.03] flex items-center gap-2"
            >
              <span>⚡ Add to Discord</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section with 3D WebGL Canvas ─────────────────────────────────── */}
      <section className="relative pt-8 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left z-10">
            {/* Engine Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-mono text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>GOOGLE GEMINI 2.5 + THREE.JS WEBGL</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
              The 3D AI Architect for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500">
                Discord Communities
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Synthesize full category layouts, permission overrides, and automod in seconds from a single prompt.
              Style interactive profiles with 6 universal themes, and supercharge your guild with 30+ zero-bloat enterprise services.
            </p>

            {/* CTA Button Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-mono font-black text-sm tracking-wide shadow-xl shadow-cyan-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <span>🤖 Deploy Bot to Discord</span>
                <span className="text-xs bg-black/25 text-black px-2 py-0.5 rounded font-bold">
                  FREE
                </span>
              </button>

              <a
                href="#sandbox"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono font-bold text-sm transition-all text-center"
              >
                Launch 3D Sandbox ↓
              </a>
            </div>

            {/* Terminal Preview Command */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-gray-400 max-w-lg mx-auto lg:mx-0 backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                <span className="text-gray-500 uppercase text-[10px] tracking-wider">Slash Command Quickstart</span>
                <span className="text-emerald-400 text-[10px]">VERIFIED 100% PASS</span>
              </div>
              <div className="text-cyan-300 truncate">
                <span className="text-purple-400">/build</span> prompt:&quot;Esports tournament guild with scrim voice rooms&quot;
              </div>
            </div>
          </div>

          {/* Hero Right: 3D Holographic Canvas Centerpiece */}
          <div className="lg:col-span-6 relative w-full h-[450px] sm:h-[550px] lg:h-[620px] flex items-center justify-center">
            {/* Glowing Backdrop Circle */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-purple-500/10 to-pink-500/20 rounded-full blur-[90px] pointer-events-none" />
            <div className="w-full h-full relative z-10">
              <Hero3DCanvas />
            </div>
          </div>
        </div>

        {/* ─── Metric Counters Banner ─────────────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl font-mono">
          <div className="p-4 text-center border-r border-white/5 last:border-r-0">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              30+
            </div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
              Native Services
            </div>
          </div>
          <div className="p-4 text-center border-r border-white/5 last:border-r-0">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              1,477+
            </div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
              Integration Tests
            </div>
          </div>
          <div className="p-4 text-center border-r border-white/5 last:border-r-0">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              99.99%
            </div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
              Serverless Uptime
            </div>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">
              &lt; 850ms
            </div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
              AI Synthesis Speed
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Architecture Sandbox Section ─────────────────────────── */}
      <section id="sandbox" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black/30">
        <ArchitectureSandbox />
      </section>

      {/* ─── Interactive Theme Switcher Preview Section ───────────────────────── */}
      <section id="themes" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <ThemePreviewWidget />
      </section>

      {/* ─── All 30+ Services Mega-Grid Section ──────────────────────────────── */}
      <section id="services" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black/20">
        <ServicesCatalog />
      </section>

      {/* ─── Pricing & Entitlement Matrix Section ────────────────────────────── */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <PricingSection />
      </section>

      {/* ─── FAQ & Technical Architecture Highlights ─────────────────────────── */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-3">
            <span>ARCHITECTURAL SPECIFICATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Frequently Answered Questions
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Engineered for high-volume Discord interactions with zero state corruption.
          </p>
        </div>

        <div className="space-y-4 font-sans">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-cyan-400">Q:</span> How does AiCord differ from generic multi-purpose bots?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Most Discord bots suffer from extreme bloat, rate limits, and fragmented third-party APIs.
              AiCord runs on a single high-performance Next.js 16 and Discord Interaction Webhook architecture
              verifying Ed25519 cryptographic signatures with zero persistent gateway connection overhead.
              All 30+ services (economy, tickets, confessions, sandboxing, git feeds) are built directly into one unified core.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">Q:</span> Which Discord permissions does AiCord require?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              For complete automated architecture builds (<code className="text-cyan-300 font-mono">/build</code>) and role provisioning,
              Administrator (<code className="text-cyan-300 font-mono">permissions=8</code>) is recommended. If you prefer granular permissions,
              recommended permissions include Manage Channels, Manage Roles, Kick/Ban Members, Send Messages, and Connect Voice.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">Q:</span> How does the Google Gemini AI integration work?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              AiCord uses Google Gemini 2.5 Flash for rapid server synthesis, voice message audio transcription,
              plain-English PR explanations for GitHub webhooks, and the dynamic turn-based RPG dungeon crawler.
              Responses are streamed or computed in under 850 milliseconds.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400">Q:</span> What is the Permanent Allowance for Server 1567393420127772712?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Server <code className="text-amber-300 font-mono">1567393420127772712</code> is the designated founder flagship guild.
              It is endowed with permanent lifetime VIP allowances, infinite monthly AI builds, unlimited support ticket channels,
              and full custom brand configuration without expiration.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer with Tech Stack Badges ───────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#05070e] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-lg">
              🤖
            </div>
            <div>
              <span className="font-bold text-white text-base">AiCord Platform</span>
              <span className="text-xs text-gray-400 block font-mono">
                © 2026 AiCord Bot Dev Team. Open Architecture.
              </span>
            </div>
          </div>

          {/* Tech Stack Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
              ⚡ Next.js 16
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300">
              🌐 Three.js WebGL
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-emerald-300">
              🍃 MongoDB Atlas
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sky-300">
              🎨 Tailwind v4
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-300">
              ✨ Google Gemini API
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-amber-300">
              🔐 Ed25519 Webhooks
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
            <a href="#sandbox" className="hover:text-cyan-400 transition-colors">
              Sandbox
            </a>
            <a href="#services" className="hover:text-cyan-400 transition-colors">
              Services
            </a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">
              Pricing
            </a>
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-cyan-400 hover:underline"
            >
              Add Bot
            </button>
          </div>
        </div>
      </footer>

      {/* ─── Discord OAuth2 Permission Modal ──────────────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-[#0f1424] border border-white/20 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-mono"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-cyan-500/30">
                🤖
              </div>
              <h3 className="text-2xl font-black text-white">Invite AiCord to Discord</h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Client ID: {DEFAULT_CLIENT_ID}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
                Select Permission Scope:
              </label>

              <button
                onClick={() => setSelectedPerms('admin')}
                className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  selectedPerms === 'admin'
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'border-white/10 bg-black/30 hover:bg-white/5'
                }`}
              >
                <span className="text-xl">🛡️</span>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Administrator (Recommended)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-400 text-black font-extrabold">
                      BIT: 8
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Required for seamless channel generation, permission overrides, and automod synthesis.
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPerms('recommended')}
                className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  selectedPerms === 'recommended'
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'border-white/10 bg-black/30 hover:bg-white/5'
                }`}
              >
                <span className="text-xl">⚙️</span>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Standard Community Permissions</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-400 text-black font-extrabold">
                      MODULAR
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Manage channels, roles, kick/ban members, voice connection, and slash commands.
                  </div>
                </div>
              </button>
            </div>

            <div className="space-y-3">
              <a
                href={getInviteUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowInviteModal(false)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-black font-mono font-black text-sm text-center block transition-all shadow-xl shadow-cyan-500/25"
              >
                Continue to Discord Authorization →
              </a>

              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-400 text-center block transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
