import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Database, CheckCircle2 } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white py-16 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-black">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO AICORD</span>
        </Link>

        {/* Header */}
        <div className="space-y-3 border-b border-white/10 pb-8">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy &amp; Security Architecture
          </h1>
          <p className="text-sm font-mono text-gray-400">
            Effective Date: November 2026 • Platform Version 1.0
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              1. Scopes &amp; Information We Collect
            </h2>
            <p>
              AiCord adheres to strict least-privilege principles. When authenticating with Discord OAuth2, we only request two scopes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li>
                <strong className="text-white">identify:</strong> Provides access to your public Discord ID, username, and avatar URL to render your session profile in the dashboard.
              </li>
              <li>
                <strong className="text-white">guilds:</strong> Provides a read-only list of servers you belong to along with your permission bits, so we can display servers you are authorized to manage.
              </li>
            </ul>
            <p>
              We <strong className="text-white">never</strong> request access to your email address, friends list, direct messages, or passwords.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              2. Token Encryption &amp; Session Handling
            </h2>
            <p>
              Your OAuth access and refresh tokens are encrypted at rest using industry-standard JWT encryption (AES-256-GCM). Tokens are stored exclusively in secure, HTTP-only, SameSite cookies. They are never sent to client-side JavaScript, never logged in diagnostic output, and never exposed to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              3. Server Data &amp; Blueprint Storage
            </h2>
            <p>
              When applying AI architectural blueprints, channel structures, role names, and permission overrides, records are stored in MongoDB Atlas with strict guild isolation. Guild data is only accessible to authenticated users with verified Manage Server or Administrator privileges on that specific server.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Data Deletion &amp; GDPR Rights</h2>
            <p>
              You have the right to request deletion of all server configurations and audit logs associated with your Discord user ID or server ID at any time. Simply removing the bot from your Discord server halts all telemetry, and historical audit logs can be purged via our support contact.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-white/10 text-xs font-mono text-gray-500">
          AiCord Security Team • aicordbot@gmail.com
        </div>
      </div>
    </div>
  );
}
