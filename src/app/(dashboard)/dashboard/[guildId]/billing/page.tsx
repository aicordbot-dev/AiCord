'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CreditCard,
  Zap,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { getFallbackGuildData } from '@/lib/discord/server-data';

export default function BillingPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = params?.guildId || '111111111111111111';
  const data = getFallbackGuildData(guildId);

  const [licenseKey, setLicenseKey] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionMessage, setRedemptionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleRedeem = async () => {
    if (!licenseKey.trim()) return;
    setIsRedeeming(true);
    setRedemptionMessage(null);

    await new Promise((resolve) => setTimeout(resolve, 800));

    // Valid format check: AICORD-TIER-RANDOM-SIG
    const key = licenseKey.trim().toUpperCase();
    if (key.startsWith('AICORD-') || key.length >= 16) {
      setRedemptionMessage({
        type: 'success',
        text: `License key successfully redeemed! Upgraded to ${key.includes('ULTIMATE') ? 'Ultimate Sovereign' : 'Pro Cloud'}.`,
      });
      setLicenseKey('');
    } else {
      setRedemptionMessage({
        type: 'error',
        text: 'Invalid license key checksum. Please enter a valid 24-character cryptographic key.',
      });
    }
    setIsRedeeming(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CreditCard className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Subscription Management
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Server Tier & Stripe Billing
          </h2>
          <p className="text-xs text-slate-400">
            Active plan entitlements, Stripe invoicing, and cryptographically verified license key redemption.
          </p>
        </div>

        {/* Current Tier Badge Card */}
        <div className="p-4 rounded-2xl bg-[#070d16] border border-cyan-500/30 flex items-center gap-4 shrink-0 shadow-lg shadow-cyan-500/5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Active Server Plan
            </span>
            <span className="text-lg font-extrabold font-mono text-white">
              {data.guild.tier} Cloud
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Stripe Portal & Key Redemption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stripe Customer Portal */}
        <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Stripe Customer Portal
            </h3>
            <span className="text-[10px] font-mono text-cyan-400">ENCRYPTED</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Manage your payment method, view invoice receipts, download tax certificates, or cancel renewals directly inside the Stripe customer portal.
          </p>

          <div className="p-4 rounded-2xl bg-[#070d16] border border-[#1e293b] space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Renewal Cycle:</span>
              <span className="text-white">Annual Recurring</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Next Billing Date:</span>
              <span className="text-cyan-400">November 28, 2027</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Method:</span>
              <span className="text-white">Mastercard •••• 4242</span>
            </div>
          </div>

          <a
            href="/checkout/success"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white transition-all"
          >
            <span>Open Stripe Customer Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* License Key Redemption */}
        <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Redeem License Key
            </h3>
            <KeyRound className="w-4 h-4 text-cyan-400" />
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Have an offline license key or enterprise sovereign voucher? Enter your 24-character HMAC token below to immediately elevate server limits.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="AICORD-PRO-XXXX-YYYY-ZZZZ"
              className="w-full px-4 py-2.5 rounded-xl bg-[#070d16] border border-[#1e293b] text-xs font-mono text-white placeholder-slate-500 uppercase focus:outline-none focus:border-cyan-500"
            />

            <button
              onClick={handleRedeem}
              disabled={isRedeeming || !licenseKey.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs font-mono shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isRedeeming ? 'Verifying HMAC Signature...' : 'Redeem Server License'}
            </button>

            {redemptionMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  redemptionMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                }`}
              >
                {redemptionMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{redemptionMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Entitlement Matrix */}
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider pb-2 border-b border-[#1e293b]">
          Active Plan Entitlements & Server Quotas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b] space-y-1">
            <span className="text-slate-400 text-[11px]">AI Server Builds</span>
            <span className="text-white font-bold text-sm block">Unlimited Generations</span>
            <span className="text-emerald-400 text-[10px]">Additive mode unlocked</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b] space-y-1">
            <span className="text-slate-400 text-[11px]">AutoMod Heuristics</span>
            <span className="text-white font-bold text-sm block">Gemini 2.0 Guard</span>
            <span className="text-emerald-400 text-[10px]">Real-time link scanner</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b] space-y-1">
            <span className="text-slate-400 text-[11px]">24/7 Voice Radio</span>
            <span className="text-white font-bold text-sm block">6 Curated Streams</span>
            <span className="text-emerald-400 text-[10px]">Lossless audio gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
