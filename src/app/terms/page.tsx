import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Shield,
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Scale,
  Bot,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { AiCordLogo } from '@/components/brand/AiCordLogo';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms of Service — AiCord',
  description:
    'Comprehensive Terms of Service, subscription billing rules, Stripe payment terms, Discord API compliance, and refund policies for AiCord.',
  alternates: {
    canonical: `${siteConfig.url}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] selection:bg-[#5865F2]/20 selection:text-[#5865F2] font-sans antialiased relative">
      {/* Ambient warm background dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.3]"
        style={{
          backgroundImage: 'radial-gradient(#D6CFC4 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top Header Navigation */}
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

          <div className="flex items-center gap-2">
            <Link
              href="/privacy"
              className="text-xs font-mono text-[#57534E] hover:text-[#5865F2] transition-colors hidden sm:inline-block"
            >
              Privacy Policy
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

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10 space-y-12">
        {/* Title Header */}
        <div className="space-y-4 border-b border-[#E7E2DA] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 border border-amber-300 text-xs font-mono font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>LEGAL ARCHITECTURE &amp; COMPLIANCE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1917] font-sans">
            Terms of Service &amp; Subscription Terms
          </h1>

          <p className="text-sm font-mono text-[#78716C]">
            Effective Date: November 28, 2026 • Platform Version 2.4.0 • Jurisdiction: United States / Global
          </p>
        </div>

        {/* Executive Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-[#5865F2]">
              <CreditCard className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[#1C1917] font-mono">Stripe-Powered Billing</h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              All payment transactions are encrypted end-to-end via Stripe PCI-DSS Level 1 infrastructure. AiCord never stores raw credit card details or bank credentials.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <RefreshCw className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[#1C1917] font-mono">14-Day Refund Guarantee</h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              First-time Pro and Ultimate subscription purchases are eligible for a full refund within 14 days of initial checkout if you are unsatisfied for any reason.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-600">
              <Shield className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[#1C1917] font-mono">Discord API Compliance</h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              AiCord adheres strictly to the Discord Developer Terms of Service and Discord Community Guidelines. We never collect member DMs, passwords, or unauthorized telemetry.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-600">
              <Lock className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[#1C1917] font-mono">Cryptographic HMAC Licenses</h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Paid entitlements are cryptographically signed with HMAC-SHA256 tokens and tied directly to your verified Discord Guild ID, preventing tampering and piracy.
            </p>
          </div>
        </div>

        {/* Table of Contents */}
        <nav aria-label="Table of contents" className="p-6 rounded-2xl bg-stone-100/70 border border-[#E7E2DA] space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C1917]">
            Table of Contents
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#57534E]">
            <li><a href="#section-1" className="hover:text-[#5865F2] transition-colors">1. Acceptance of Terms</a></li>
            <li><a href="#section-2" className="hover:text-[#5865F2] transition-colors">2. Discord Platform Compliance</a></li>
            <li><a href="#section-3" className="hover:text-[#5865F2] transition-colors">3. Accounts &amp; Permissions</a></li>
            <li><a href="#section-4" className="hover:text-[#5865F2] transition-colors">4. Subscriptions &amp; Tiers</a></li>
            <li><a href="#section-5" className="hover:text-[#5865F2] transition-colors">5. Payment Processing &amp; Taxes</a></li>
            <li><a href="#section-6" className="hover:text-[#5865F2] transition-colors">6. Refund &amp; Cancellation Policy</a></li>
            <li><a href="#section-7" className="hover:text-[#5865F2] transition-colors">7. Acceptable Use Policy</a></li>
            <li><a href="#section-8" className="hover:text-[#5865F2] transition-colors">8. AI Blueprints &amp; IP Rights</a></li>
            <li><a href="#section-9" className="hover:text-[#5865F2] transition-colors">9. Service Availability &amp; SLA</a></li>
            <li><a href="#section-10" className="hover:text-[#5865F2] transition-colors">10. Limitation of Liability</a></li>
            <li><a href="#section-11" className="hover:text-[#5865F2] transition-colors">11. Suspension &amp; Termination</a></li>
            <li><a href="#section-12" className="hover:text-[#5865F2] transition-colors">12. Governing Law &amp; Contact</a></li>
          </ol>
        </nav>

        {/* Legal Sections */}
        <div className="space-y-10 text-sm text-[#44403C] leading-relaxed">
          {/* Section 1 */}
          <section id="section-1" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#5865F2]" />
              1. Acceptance of Terms &amp; Scope of Service
            </h2>
            <p>
              By adding the AiCord bot to your Discord server, accessing our Discrofy management dashboard (<code className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-xs">/dashboard</code>), or subscribing to any paid plan, you agree to be legally bound by these Terms of Service (&ldquo;Terms&rdquo;) and our Privacy Policy.
            </p>
            <p>
              If you are accepting these Terms on behalf of an organization, community, gaming guild, or other entity, you represent and warrant that you possess the necessary authority to bind that entity to these Terms. If you do not agree with any provision herein, you must immediately remove the AiCord bot from your Discord server and cease all dashboard usage.
            </p>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#5865F2]" />
              2. Discord Developer API &amp; Community Guidelines Compliance
            </h2>
            <p>
              AiCord operates on top of the official Discord Developer Interactions API. By utilizing AiCord, you acknowledge and agree that your community must comply with:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-[#57534E]">
              <li>
                <strong className="text-[#1C1917]">Discord Terms of Service:</strong> Available at discord.com/terms.
              </li>
              <li>
                <strong className="text-[#1C1917]">Discord Community Guidelines:</strong> Available at discord.com/guidelines.
              </li>
              <li>
                <strong className="text-[#1C1917]">Discord Developer Policy:</strong> Respecting user privacy, ratelimits, and interaction lifecycles.
              </li>
            </ul>
            <p>
              AiCord will never assist or enable actions that violate Discord guidelines, including automated mass direct messaging (DM advertising), token grabbing, unauthorized self-botting, raid orchestration, or server destruction without administrator consent.
            </p>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              3. User Authentication, OAuth2 Scopes &amp; Server Authorization
            </h2>
            <p>
              Access to the AiCord console requires Discord OAuth2 authentication. We request only the minimal necessary permissions:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-[#57534E]">
              <li><code className="font-mono text-xs text-[#1C1917]">identify</code>: Resolves your public Discord Snowflake ID, username, and avatar.</li>
              <li><code className="font-mono text-xs text-[#1C1917]">guilds</code>: Inspects your server list to verify <code className="font-mono text-xs text-[#1C1917]">MANAGE_GUILD</code> or <code className="font-mono text-xs text-[#1C1917]">ADMINISTRATOR</code> privileges.</li>
            </ul>
            <p>
              You are strictly responsible for maintaining control of your Discord account. Any administrative actions initiated from your authenticated session (such as channel layout builds, role reassignments, automod adjustments, or rollback triggers) are deemed authorized by your guild.
            </p>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              4. Subscription Tiers, HMAC License Keys &amp; Quotas
            </h2>
            <p>
              AiCord offers four operational tiers as detailed on our Pricing matrix:
            </p>
            <div className="overflow-x-auto my-3">
              <table className="w-full text-xs font-mono border border-[#E7E2DA] rounded-xl overflow-hidden">
                <thead className="bg-stone-100 text-[#1C1917]">
                  <tr>
                    <th className="p-2.5 text-left border-b border-[#E7E2DA]">Plan</th>
                    <th className="p-2.5 text-left border-b border-[#E7E2DA]">Billing</th>
                    <th className="p-2.5 text-left border-b border-[#E7E2DA]">AI Builds</th>
                    <th className="p-2.5 text-left border-b border-[#E7E2DA]">Services &amp; Audio</th>
                    <th className="p-2.5 text-left border-b border-[#E7E2DA]">License Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2DA] bg-white">
                  <tr>
                    <td className="p-2.5 font-bold text-[#1C1917]">Free Starter</td>
                    <td className="p-2.5">$0</td>
                    <td className="p-2.5">3 / month</td>
                    <td className="p-2.5">Core 28 services, 96kbps radio</td>
                    <td className="p-2.5">Standard Public</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-[#5865F2]">Pro Guild</td>
                    <td className="p-2.5">$12/mo or $108/yr</td>
                    <td className="p-2.5">50 / month</td>
                    <td className="p-2.5">Unlimited tickets, 256kbps audio, 6 themes</td>
                    <td className="p-2.5">HMAC Cryptographic</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-purple-600">Ultimate Network</td>
                    <td className="p-2.5">$29/mo or $276/yr</td>
                    <td className="p-2.5">Unlimited</td>
                    <td className="p-2.5">384kbps FLAC, custom bot branding, priority queue</td>
                    <td className="p-2.5">HMAC Cryptographic</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-amber-600">Founder Lifetime</td>
                    <td className="p-2.5">$199 one-time</td>
                    <td className="p-2.5">Perpetual Unlimited</td>
                    <td className="p-2.5">All current &amp; future services forever</td>
                    <td className="p-2.5">Permanent Founder Token</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Subscription quotas reset on the 1st of each calendar month at 00:00 UTC. Quotas do not roll over. Subscriptions are tied to the Discord Guild Snowflake specified during checkout and are transferable between guilds owned by the same user with a 72-hour cooldown.
            </p>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#5865F2]" />
              5. Stripe Payment Processing, Renewals &amp; Invoicing
            </h2>
            <p>
              Paid subscriptions are billed through our Merchant of Record, <strong className="text-[#1C1917]">Stripe, Inc.</strong> By providing a credit card, debit card, Apple Pay, Google Pay, or other payment instrument, you authorize recurring debits at the frequency selected (Monthly or Annually) until cancellation.
            </p>
            <p>
              All prices are quoted in United States Dollars ($ USD) exclusive of applicable sales tax, VAT, or digital services tax, which will be calculated and collected at checkout based on your billing jurisdiction. Automatic receipts and VAT-compliant invoices are delivered via email upon successful transaction settlement.
            </p>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              6. Cancellation &amp; 14-Day Refund Policy
            </h2>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
              <strong className="text-sm font-bold block text-emerald-950">14-Day No-Questions-Asked Refund Guarantee:</strong>
              <p>
                If you are a first-time purchaser of a Pro or Ultimate subscription, you may request a 100% full refund within 14 calendar days of your original payment date. To request a refund, email <span className="font-mono font-bold">aicordbot@gmail.com</span> with your Discord User ID, Guild ID, and Stripe Invoice ID.
              </p>
            </div>
            <p>
              You may cancel your subscription at any time directly through the Discrofy Billing Dashboard (<code className="font-mono text-xs text-[#1C1917]">/dashboard/[guildId]/billing</code>) or via the Stripe Customer Portal link sent in your receipt. Upon cancellation, your guild retains access to all premium features until the end of the current paid billing cycle, after which it safely downgrades to Free Starter without data loss.
            </p>
            <p>
              Lifetime licenses are non-refundable after 14 calendar days or once more than three (3) full AI Server Syntheses have been deployed to Discord. Chargebacks filed without prior support outreach will result in immediate suspension of guild licenses.
            </p>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              7. Acceptable Use Policy &amp; Prohibited Actions
            </h2>
            <p>
              You agree not to misuse, exploit, or reverse-engineer the AiCord platform. Specifically prohibited behaviors include:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-[#57534E]">
              <li>Circumventing license checks, generating forged HMAC license keys, or exploiting billing webhooks.</li>
              <li>Executing malicious code, fork bombs, cryptominers, or denial-of-service scripts within the Polyglot Code Sandbox (<code className="font-mono text-xs">/run</code>).</li>
              <li>Using the Gemini AI Server Builder to synthesize hate speech, violent extremism, illegal material, or harassment matrices.</li>
              <li>Overwhelming our Discord interactions endpoint or Webhook gateways with automated flood scripts.</li>
              <li>Attempting unauthorized privilege escalation on MongoDB Atlas clusters or Redis rate-limit caches.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              8. AI-Generated Blueprints &amp; Intellectual Property
            </h2>
            <p>
              You own all rights, title, and interest in and to the custom text, role definitions, channel names, and community structures you instruct AiCord to build. To the maximum extent permitted by applicable law, you retain ownership of server layouts synthesized through our Google Gemini 2.5 Flash architectural pipeline.
            </p>
            <p>
              AiCord retains exclusive ownership of the underlying software bot, the Discrofy console, the 28 service engines, proprietary themes, sound designs, brand assets, and trademarked logos. You are granted a limited, revocable, non-exclusive license to use these services in your Discord guild.
            </p>
          </section>

          {/* Section 9 */}
          <section id="section-9" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#5865F2]" />
              9. Service Availability, Maintenance &amp; 99.9% Uptime Target
            </h2>
            <p>
              We endeavor to maintain high availability with a target SLA of 99.9% uptime. However, because AiCord depends on external providers including Discord Inc. Gateway Webhooks, Google Gemini API endpoints, Stripe, and Vercel Edge compute, uninterrupted service cannot be guaranteed.
            </p>
            <p>
              Scheduled maintenance windows will be announced in advance on our Status Page (<Link href="/status" className="text-[#5865F2] hover:underline">aicord.vercel.app/status</Link>) and official Discord support hub.
            </p>
          </section>

          {/* Section 10 */}
          <section id="section-10" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#57534E]" />
              10. Limitation of Liability &amp; Disclaimers
            </h2>
            <p className="text-xs uppercase font-mono tracking-wider text-[#78716C]">
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
            </p>
            <p>
              In no event shall AiCord, its developers, operators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of community members, lost Discord server assets, accidental channel deletion, or business interruption, resulting from your use of or inability to use the service.
            </p>
            <p>
              Because the <code className="font-mono text-xs">/build</code> command can create or modify Discord channels, categories, and roles, you are solely responsible for reviewing preview blueprints and utilizing the <code className="font-mono text-xs">/undo-build</code> rollback command when necessary.
            </p>
          </section>

          {/* Section 11 */}
          <section id="section-11" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              11. Account Suspension &amp; Guild Termination
            </h2>
            <p>
              We reserve the right to suspend or permanently revoke access to the AiCord bot, dashboard, or active licenses for any guild that violates these Terms, exploits security vulnerabilities, or conducts abusive activities.
            </p>
            <p>
              You may terminate this agreement at any time by kicking the bot from your Discord server and discontinuing dashboard visits. Upon removal, all automated moderation actions and background telemetry will cease immediately.
            </p>
          </section>

          {/* Section 12 */}
          <section id="section-12" className="space-y-3 pt-6 border-t border-[#E7E2DA]">
            <h2 className="text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#5865F2]" />
              12. Governing Law, Dispute Resolution &amp; Contact Information
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
            </p>
            <div className="p-5 rounded-2xl bg-white border border-[#E7E2DA] space-y-2 mt-4">
              <h3 className="font-bold text-sm text-[#1C1917]">Legal &amp; Support Contact:</h3>
              <p className="text-xs text-[#57534E]">
                If you have questions regarding these Terms, billing inquiries, or refund requests, please contact our dedicated team:
              </p>
              <ul className="text-xs font-mono space-y-1 text-[#1C1917]">
                <li>• <strong>Email:</strong> aicordbot@gmail.com</li>
                <li>• <strong>Discord Support:</strong> <a href="https://discord.gg/aicord" target="_blank" rel="noreferrer" className="text-[#5865F2] hover:underline">discord.gg/aicord</a></li>
                <li>• <strong>GitHub Security:</strong> <a href="https://github.com/aicordbot-dev/AiCord" target="_blank" rel="noreferrer" className="text-[#5865F2] hover:underline">github.com/aicordbot-dev/AiCord</a></li>
              </ul>
            </div>
          </section>
        </div>

        {/* Bottom Nav Links */}
        <div className="pt-8 border-t border-[#E7E2DA] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#78716C]">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#5865F2] transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-[#5865F2] transition-colors">Privacy Policy</Link>
            <Link href="/docs" className="hover:text-[#5865F2] transition-colors">Documentation</Link>
            <Link href="/status" className="hover:text-[#5865F2] transition-colors">Status &amp; SLA</Link>
          </div>
          <span>© 2026 AiCord Team. All rights reserved.</span>
        </div>
      </main>
    </div>
  );
}
