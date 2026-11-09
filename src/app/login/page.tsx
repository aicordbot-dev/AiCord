'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  ShieldCheck,
  Server,
  UserCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Bot,
} from 'lucide-react';
import { getSafeCallbackUrl } from '@/lib/safe-redirect';

function LoginContent() {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = getSafeCallbackUrl(rawCallbackUrl, '/dashboard');
  const errorParam = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'OAuthSignin':
      case 'OAuthCallback':
        return 'Encountered an issue communicating with Discord OAuth. Please try again.';
      case 'access_denied':
        return 'Discord authorization was cancelled or declined. You can try logging in again anytime.';
      case 'OAuthCreateAccount':
      case 'Callback':
        return 'Could not complete authentication. Please verify your internet connection.';
      case 'RefreshTokenError':
        return 'Your Discord session expired. Please sign in again to refresh your credentials.';
      default:
        return error
          ? 'An authentication error occurred. Please try signing in again.'
          : null;
    }
  };

  const errorMessage = getErrorMessage(errorParam);

  const handleDiscordLogin = async () => {
    setIsLoading(true);
    try {
      await signIn('discord', {
        callbackUrl: safeCallbackUrl,
      });
    } catch (err) {
      console.error('Failed to initiate Discord sign-in:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-white flex flex-col justify-center items-center px-4 py-12 overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-cyan-500/15 via-indigo-600/15 to-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Header / Brand */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-cyan-500/30 transition-all group backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-mono text-sm tracking-wider font-bold text-gray-200">
              AiCord // ACCESS GATEWAY
            </span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            Sign In to Architect
          </h1>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Connect with Discord to manage your community, review topology blueprints, and architect your server.
          </p>
        </div>

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/25 p-4 flex items-start gap-3 backdrop-blur-md text-red-300 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-red-200">Sign-in Notice</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Auth Action Card */}
        <div className="relative rounded-3xl bg-gray-900/60 border border-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-3">
            <button
              onClick={handleDiscordLogin}
              disabled={isLoading}
              className="w-full relative group overflow-hidden rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.99] text-white font-medium py-3.5 px-6 flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-[#5865F2]/25 hover:shadow-[#5865F2]/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {/* Discord Logo SVG */}
              <svg
                className="w-5 h-5 fill-current shrink-0 group-hover:scale-110 transition-transform"
                viewBox="0 0 127.14 96.36"
              >
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
              <span className="font-semibold text-sm sm:text-base">
                {isLoading ? 'Connecting to Discord...' : 'Continue with Discord'}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="text-[11px] text-center text-gray-400 font-mono">
              Secured by Discord OAuth2 with encrypted session tokens
            </p>
          </div>

          {/* Granular Permission Transparency Section */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Permission Transparency</span>
            </div>

            <div className="grid gap-2.5 text-xs text-gray-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <UserCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-white block">
                    identify (User Profile)
                  </span>
                  <span className="text-gray-400 text-[11px]">
                    To display your avatar, username, and community handle in the dashboard.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <Server className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-white block">
                    guilds (Server List)
                  </span>
                  <span className="text-gray-400 text-[11px]">
                    To identify which servers you manage so you can invite and configure AiCord.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Safeguards Guarantee */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-gray-300">
              <strong className="text-white">Zero Credential Exposure:</strong> We never request your Discord password, email address, or direct message access. AiCord only operates on servers where you possess Manage Server or Administrator privileges.
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-gray-500 space-x-4">
          <Link href="/privacy" className="hover:text-cyan-400 transition-colors underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/" className="hover:text-cyan-400 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#030712] flex items-center justify-center text-gray-400 font-mono text-sm">
          Loading secure gateway...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
