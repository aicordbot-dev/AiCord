'use client';

/**
 * src/app/checkout/mock/page.tsx
 * Interactive Development / Demo Mock Checkout Simulation Page.
 * Rendered when STRIPE_SECRET_KEY is not configured in local development.
 */

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function MockCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get('session_id') || 'cs_mock_default';
  const tier = searchParams.get('tier') || 'pro';
  const interval = searchParams.get('interval') || 'monthly';
  const guildId = searchParams.get('guildId') || searchParams.get('guild_id') || '';
  const userId = searchParams.get('userId') || '';

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const priceMap: Record<string, Record<string, string>> = {
    pro: { monthly: '$12/mo', yearly: '$108/yr' },
    ultimate: { monthly: '$29/mo', yearly: '$276/yr' },
    lifetime: { lifetime: '$199 one-time' },
  };

  const priceDisplay =
    priceMap[tier]?.[interval] || (tier === 'lifetime' ? '$199 one-time' : '$12/mo');

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setStatusMessage('Simulating Stripe payment processing...');

    try {
      const mockEvent = {
        id: `evt_mock_${Date.now()}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: sessionId,
            metadata: {
              guildId,
              userId,
              tier,
              interval,
            },
            customer_details: {
              email: 'mock-tester@example.com',
            },
          },
        },
      };

      const res = await fetch('/api/stripe/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockEvent),
      });

      if (!res.ok) {
        throw new Error('Failed to notify webhook');
      }

      setStatusMessage('Payment verified! Redirecting to confirmation...');
      setTimeout(() => {
        router.push(
          `/checkout/success?session_id=${sessionId}&tier=${tier}&interval=${interval}${
            guildId ? `&guild_id=${encodeURIComponent(guildId)}` : ''
          }`,
        );
      }, 1000);
    } catch {
      setStatusMessage('Mock payment completed. Returning to confirmation...');
      setTimeout(() => {
        router.push(
          `/checkout/success?session_id=${sessionId}&tier=${tier}&interval=${interval}`,
        );
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E7E2DA] p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
            <span>⚡</span>
            <span>STRIPE DEV SIMULATION</span>
          </div>
          <h1 className="text-2xl font-black font-mono text-[#1C1917]">Mock Checkout</h1>
          <p className="text-xs text-[#78716C]">
            STRIPE_SECRET_KEY is not set. Simulating a live checkout session.
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 border border-[#E7E2DA] space-y-3 font-mono text-xs">
          <div className="flex justify-between py-1 border-b border-[#E7E2DA]">
            <span className="text-[#78716C]">Selected Plan:</span>
            <span className="font-bold text-[#1C1917] uppercase">{tier}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E7E2DA]">
            <span className="text-[#78716C]">Billing Interval:</span>
            <span className="font-bold text-[#1C1917] capitalize">{interval}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E7E2DA]">
            <span className="text-[#78716C]">Amount:</span>
            <span className="font-bold text-[#059669]">{priceDisplay}</span>
          </div>
          {guildId && (
            <div className="flex justify-between py-1 border-b border-[#E7E2DA]">
              <span className="text-[#78716C]">Target Server:</span>
              <span className="font-bold text-[#1C1917]">{guildId}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-[#78716C]">Session ID:</span>
            <span className="text-[#78716C] truncate max-w-[180px]">{sessionId}</span>
          </div>
        </div>

        {statusMessage && (
          <div className="text-center text-xs font-mono font-semibold text-[#5865F2] animate-pulse">
            {statusMessage}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono text-xs font-bold transition-all shadow-md shadow-[#5865F2]/25 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Processing Payment...' : `Complete Mock Payment (${priceDisplay})`}
          </button>
          <button
            onClick={() => router.push(`/checkout/cancel?tier=${tier}`)}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#78716C] font-mono text-xs font-bold transition-all border border-[#E7E2DA] cursor-pointer"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono text-sm">Loading checkout...</div>}>
      <MockCheckoutContent />
    </Suspense>
  );
}
