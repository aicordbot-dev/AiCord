'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bot, CheckCircle2, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react';

function InviteCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild_id');

  const [isBotDetected, setIsBotDetected] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!guildId) {
      setIsTimedOut(true);
      return;
    }

    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 7; // ~10.5 seconds at 1.5s intervals

    const pollStatus = async () => {
      try {
        attempts++;
        if (isMounted) setPollCount(attempts);

        const res = await fetch(`/api/guilds/${guildId}/bot-status`);
        if (res.ok) {
          const data = await res.json();
          if (data.present) {
            if (isMounted) {
              setIsBotDetected(true);
              // Wait 1.5s to show the nice success animation before redirect
              setTimeout(() => {
                router.push(`/dashboard/${guildId}`);
              }, 1500);
            }
            return;
          }
        }

        if (attempts >= maxAttempts) {
          if (isMounted) setIsTimedOut(true);
          return;
        }

        // Schedule next poll
        if (isMounted) {
          setTimeout(pollStatus, 1500);
        }
      } catch (err) {
        console.error('Error polling bot presence:', err);
        if (attempts >= maxAttempts) {
          if (isMounted) setIsTimedOut(true);
        } else if (isMounted) {
          setTimeout(pollStatus, 1500);
        }
      }
    };

    pollStatus();

    return () => {
      isMounted = false;
    };
  }, [guildId, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-gray-900/60 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Animated Icon State */}
        <div className="flex justify-center">
          {isBotDetected ? (
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : isTimedOut ? (
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
              <AlertTriangle className="w-10 h-10" />
            </div>
          ) : (
            <div className="relative w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/20">
              <Bot className="w-10 h-10" />
              <div className="absolute inset-0 rounded-3xl border border-cyan-400/40 animate-ping opacity-30" />
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          {isBotDetected ? (
            <>
              <h2 className="text-2xl font-extrabold text-white">
                AiCord Connected!
              </h2>
              <p className="text-xs text-emerald-300 font-mono">
                Bot presence verified. Transferring to console...
              </p>
            </>
          ) : isTimedOut ? (
            <>
              <h2 className="text-xl font-bold text-white">
                Verification Pending
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Discord sometimes takes up to 30 seconds to propagate new bot additions. You can proceed directly to your server or refresh the server cluster.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white">
                Verifying Bot Connection...
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Listening for bot presence in your server ({pollCount}/7)...
              </p>
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isBotDetected ? (
            <Link
              href={`/dashboard/${guildId}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Open Server Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : isTimedOut ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 transition-colors"
              >
                Back to Servers
              </Link>
              {guildId && (
                <Link
                  href={`/dashboard/${guildId}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-medium transition-colors"
                >
                  <span>Enter Console Anyway</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] text-gray-400 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Polling Discord API...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InviteCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-gray-400 font-mono text-sm">
          Loading bot verification...
        </div>
      }
    >
      <InviteCompleteContent />
    </Suspense>
  );
}
