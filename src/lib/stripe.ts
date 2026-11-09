/**
 * src/lib/stripe.ts
 * Stripe Payment Integration for AiCord:
 * - Configures Stripe client using process.env.STRIPE_SECRET_KEY
 * - Supports graceful dev/demo fallback if STRIPE_SECRET_KEY is not configured
 * - Creates Stripe Checkout Sessions for subscription (Pro, Ultimate) and one-time (Lifetime)
 * - Attaches guildId, userId, tier, interval metadata for webhook fulfillment
 */

import Stripe from 'stripe';
import { PRICING_PLANS } from '@/config/plans';
import { siteConfig } from '@/config/site';

export type CheckoutTier = 'pro' | 'ultimate' | 'lifetime';
export type CheckoutInterval = 'monthly' | 'yearly' | 'lifetime';

export interface CreateCheckoutSessionParams {
  tier: CheckoutTier;
  interval?: CheckoutInterval | 'monthly' | 'yearly';
  guildId?: string;
  userId?: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface PlanPricingDetails {
  unitAmount: number; // in cents (USD)
  interval: 'month' | 'year' | 'once';
  name: string;
  description: string;
}

let customStripeClient: Stripe | null = null;

/**
 * Allows unit test suites to inject a mock Stripe client.
 */
export function setStripeClientForTest(client: Stripe | null): void {
  customStripeClient = client;
}

/**
 * Returns a configured Stripe SDK client instance, or null if unconfigured.
 */
export function getStripeClient(): Stripe | null {
  if (customStripeClient) {
    return customStripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.trim() === '' || secretKey.startsWith('mock_')) {
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
    appInfo: {
      name: 'AiCord',
      version: '2.4.0',
    },
  });
}

/**
 * Maps subscription tier and billing interval to price in cents and product metadata.
 * Pro: $12/month or $108/year ($9/mo).
 * Ultimate: $29/month or $276/year ($23/mo).
 * Lifetime: $199 one-time.
 */
export function getPlanPricing(
  tier: CheckoutTier,
  interval?: CheckoutInterval | 'monthly' | 'yearly',
): PlanPricingDetails {
  switch (tier) {
    case 'pro': {
      const isYearly = interval === 'yearly';
      return {
        unitAmount: isYearly ? PRICING_PLANS.pro.yearlyTotalPrice * 100 : PRICING_PLANS.pro.monthlyPrice * 100, // 10800 ($108) or 1200 ($12)
        interval: isYearly ? 'year' : 'month',
        name: isYearly ? 'AiCord Pro Guild (Yearly - 25% Off)' : 'AiCord Pro Guild (Monthly)',
        description: '15 AI Builds, 5 Ticket Panels, 50 Shop Items, 6 Themes, 24/7 Voice Radio',
      };
    }
    case 'ultimate': {
      const isYearly = interval === 'yearly';
      return {
        unitAmount: isYearly ? PRICING_PLANS.ultimate.yearlyTotalPrice * 100 : PRICING_PLANS.ultimate.monthlyPrice * 100, // 27600 ($276) or 2900 ($29)
        interval: isYearly ? 'year' : 'month',
        name: isYearly ? 'AiCord Ultimate Sovereign (Yearly - 20% Off)' : 'AiCord Ultimate Sovereign (Monthly)',
        description: 'Unlimited Builds, Unlimited Tickets, Unlimited Shop, All Themes + Hex, 100 AI Summaries',
      };
    }
    case 'lifetime':
      return {
        unitAmount: (PRICING_PLANS.lifetime.oneTimePrice ?? 199) * 100, // 19900 ($199)
        interval: 'once',
        name: 'AiCord Lifetime Sovereign (Permanent Access)',
        description: 'Permanent VIP patron license, unlimited everything forever, HMAC cryptographic license key',
      };
    default:
      throw new Error(`Unsupported checkout tier: "${tier}". Valid tiers are: pro, ultimate, lifetime.`);
  }
}

/**
 * Creates a Stripe Checkout Session or returns a deterministic mock checkout URL.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<CheckoutSessionResult> {
  const { tier, guildId, userId, customerEmail, successUrl, cancelUrl } = params;

  if (!tier || !['pro', 'ultimate', 'lifetime'].includes(tier)) {
    throw new Error(`Invalid tier "${tier}". Must be one of: pro, ultimate, lifetime.`);
  }

  const effectiveInterval: CheckoutInterval =
    tier === 'lifetime'
      ? 'lifetime'
      : params.interval === 'yearly'
        ? 'yearly'
        : 'monthly';

  const pricing = getPlanPricing(tier, effectiveInterval);
  const mode: 'payment' | 'subscription' = tier === 'lifetime' ? 'payment' : 'subscription';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url || 'https://aicord.vercel.app';
  const effectiveSuccessUrl =
    successUrl ||
    `${siteUrl}/#pricing?checkout=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`;
  const effectiveCancelUrl =
    cancelUrl || `${siteUrl}/#pricing?checkout=cancelled&tier=${tier}`;

  const metadata: Record<string, string> = {
    guildId: guildId || '',
    userId: userId || '',
    tier,
    interval: effectiveInterval,
  };

  const stripe = getStripeClient();

  // Graceful fallback for local development, demos, or unit tests without active Stripe credentials
  if (!stripe) {
    const mockSessionId = `cs_mock_${tier}_${effectiveInterval}_${Date.now()}`;
    const mockCheckoutUrl = `${siteUrl}/checkout/mock?session_id=${mockSessionId}&tier=${tier}&interval=${effectiveInterval}${
      guildId ? `&guildId=${encodeURIComponent(guildId)}` : ''
    }${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`;

    return {
      sessionId: mockSessionId,
      url: mockCheckoutUrl,
    };
  }

  // Live or Test Stripe Checkout Session creation
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    price_data: {
      currency: 'usd',
      product_data: {
        name: pricing.name,
        description: pricing.description,
      },
      unit_amount: pricing.unitAmount,
      ...(mode === 'subscription'
        ? {
            recurring: {
              interval: pricing.interval as 'month' | 'year',
            },
          }
        : {}),
    },
    quantity: 1,
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    line_items: [lineItem],
    mode,
    success_url: effectiveSuccessUrl,
    cancel_url: effectiveCancelUrl,
    customer_email: customerEmail || undefined,
    metadata,
    ...(mode === 'subscription'
      ? {
          subscription_data: {
            metadata,
          },
        }
      : {}),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error('Stripe failed to return a checkout session URL.');
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}
