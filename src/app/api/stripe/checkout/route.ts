/**
 * src/app/api/stripe/checkout/route.ts
 * API Route Handler for creating Stripe Checkout Sessions from the web application.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCheckoutSession, type CheckoutTier, type CheckoutInterval } from '@/lib/stripe';
import { siteConfig } from '@/config/site';

/**
 * Extracts the caller's true origin from request headers (origin or referer),
 * falling back to process.env.NEXT_PUBLIC_SITE_URL or req.url host or http://localhost:3000.
 */
export function getRequestBaseUrl(req: Request): string {
  const originHeader = req.headers.get('origin');
  if (originHeader && originHeader !== 'null') {
    try {
      const url = new URL(originHeader);
      return url.origin;
    } catch {
      // ignore invalid URL
    }
  }

  const refererHeader = req.headers.get('referer');
  if (refererHeader) {
    try {
      const url = new URL(refererHeader);
      return url.origin;
    } catch {
      // ignore invalid URL
    }
  }

  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim() !== '') {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  try {
    const reqUrl = new URL(req.url);
    if (reqUrl.origin && reqUrl.origin !== 'null') {
      return reqUrl.origin;
    }
  } catch {
    // ignore
  }

  return 'http://localhost:3000';
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { planId, interval, guildId, successUrl, cancelUrl } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Missing planId in request body.' },
        { status: 400 },
      );
    }

    if (planId === 'free') {
      return NextResponse.json({
        url: siteConfig.getInviteUrl(),
      });
    }

    if (!['pro', 'ultimate', 'lifetime'].includes(planId)) {
      return NextResponse.json(
        { error: `Invalid planId: "${planId}". Must be one of: pro, ultimate, lifetime.` },
        { status: 400 },
      );
    }

    // Try extracting authenticated user from NextAuth session
    let userId: string | undefined;
    let customerEmail: string | undefined;
    try {
      const session = await auth();
      if (session?.user) {
        userId = session.user.id || undefined;
        customerEmail = session.user.email || undefined;
      }
    } catch {
      // Session extraction optional; anonymous checkout is fully supported
    }

    const baseUrl = getRequestBaseUrl(req);

    const checkoutSession = await createCheckoutSession({
      tier: planId as CheckoutTier,
      interval: interval as CheckoutInterval,
      guildId: typeof guildId === 'string' && guildId.trim() ? guildId.trim() : undefined,
      userId,
      customerEmail,
      baseUrl,
      successUrl: typeof successUrl === 'string' && successUrl.trim() ? successUrl.trim() : undefined,
      cancelUrl: typeof cancelUrl === 'string' && cancelUrl.trim() ? cancelUrl.trim() : undefined,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.sessionId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session.';
    console.error('[StripeCheckoutAPI] Error creating checkout session:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
