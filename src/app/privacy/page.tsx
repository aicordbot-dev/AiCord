import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  ArrowLeft,
  Lock,
  Database,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Scale,
  RefreshCw,
  Server,
} from 'lucide-react';
import { AiCordLogo } from '@/components/brand/AiCordLogo';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacy Policy — AiCord',
  description:
    'Security architecture, OAuth2 scopes, token encryption, and GDPR compliance policies for AiCord.',
  alternates: {
    canonical: `${siteConfig.url}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] selection:bg-[#5865F2]/20 selection:text-[#5865F2] font-sans antialiased relative">
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.3]"
        style={{
          backgroundImage: 'radial-gradient(#D6CFC4 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#FDFBF7]/90 border-b border-[#E7E2DA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono text-[#57534E] hover:text-[#5865F2] transition-colors py-1.5 px-2.5 rounded-xl hover:bg-stone-200/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to AiCord</span>
            </Link>
          </div>

          <AiCordLogo colorScheme="light" size="sm" showVersion={false} showSubtitle={false} href="/" />

          <div className="flex items-center gap-3">
            <Link
              href="/terms"
              className="text-xs font-mono text-[#57534E] hover:text-[#5865F2] transition-colors hidden sm:inline-block"
            >
              Terms of Service
            </Link>
            <a
              href={siteConfig.getInviteUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-mono font-medium shadow-xs transition-colors"
            >
              <span>Add to Discord</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 space-y-12">
        {/* Title Header */}
        <div className="space-y-4 border-b border-[#E7E2DA] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-800 border border-cyan-300 text-xs font-mono font-semibold">
            <Shield className="w-3.5 h-3.5 text-cyan-600" />
            <span>SECURITY ARCHITECTURE &amp; DATA PRIVACY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1917]">
            Privacy Policy &amp; Security Architecture
          </h1>

          <p className="text-sm font-mono text-[#78716C]">
            Effective Date: November 28, 2026 • Platform Version 2.4.0 • Zero Telemetry Bleed
          </p>
        </div>

        {/* Highlights Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-[#5865F2]">
              <EyeOff className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[#1C1917] font-mono">Least Privilege</h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              We only request <code className="font-mono text-[#1C1917]">identify</code> and <code className="font-mono text-[#1C1917]">guilds</code> scopes. Never your email, DMs, friends, or passwords.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-600">
              <Lock className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[#1C1917] font-mono">AES-256 Encryption</h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              OAuth tokens are encrypted at rest using AES-256-GCM and stored exclusively in HTTP-only, secure, SameSite cookies.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <RefreshCw className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[#1C1917] font-mono">Instant GDPR Purge</h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Removing the bot from your server immediately halts all telemetry. Purge requests are executed within 24 business hours.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-sm text-[#44403C] leading-relaxed">
          <section className="space-y-3 p-6 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs">
            <h2 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-600" />
              1. Scopes &amp; Information We Collect
            </h2>
            <p>
              AiCord adheres to strict least-privilege principles. When authenticating with Discord OAuth2, we only request two scopes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#57534E]">
              <li>
                <strong className="text-[#1C1917]">identify:</strong> Provides access to your public Discord ID, username, and avatar URL to render your session profile in the dashboard.
              </li>
              <li>
                <strong className="text-[#1C1917]">guilds:</strong> Provides a read-only list of servers you belong to along with your permission bits, so we can display servers you are authorized to manage.
              </li>
            </ul>
            <p>
              We <strong className="text-[#1C1917]">never</strong> request access to your email address, friends list, direct messages, or passwords.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs">
            <h2 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              2. Token Encryption &amp; Session Handling
            </h2>
            <p>
              Your OAuth access and refresh tokens are encrypted at rest using industry-standard JWT encryption (AES-256-GCM). Tokens are stored exclusively in secure, HTTP-only, SameSite cookies. They are never sent to client-side JavaScript, never logged in diagnostic output, and never exposed to third parties.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs">
            <h2 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              3. Server Data &amp; Blueprint Storage
            </h2>
            <p>
              When applying AI architectural blueprints, channel structures, role names, and permission overrides, records are stored in MongoDB Atlas with strict guild isolation. Guild data is only accessible to authenticated users with verified Manage Server or Administrator privileges on that specific server.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs">
            <h2 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              4. Data Deletion &amp; GDPR Rights
            </h2>
            <p>
              You have the right to request deletion of all server configurations and audit logs associated with your Discord user ID or server ID at any time. Simply removing the bot from your Discord server halts all telemetry, and historical audit logs can be purged via our support contact (<span className="font-mono text-[#1C1917]">aicordbot@gmail.com</span>).
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-[#E7E2DA] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#78716C]">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#5865F2] transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-[#5865F2] transition-colors">Terms of Service</Link>
            <Link href="/docs" className="hover:text-[#5865F2] transition-colors">Docs</Link>
            <Link href="/status" className="hover:text-[#5865F2] transition-colors">Status</Link>
          </div>
          <span>AiCord Security Team • aicordbot@gmail.com</span>
        </div>
      </main>
    </div>
  );
}
