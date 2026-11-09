/**
 * src/app/api/stripe/webhook/route.ts
 * Stripe Webhook Handler for AiCord:
 * - Verifies Stripe signature using STRIPE_WEBHOOK_SECRET
 * - Processes checkout.session.completed events
 * - Activates guild subscription if guildId is attached
 * - Generates and stores redeemable license key if guildId is omitted
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import {
  activateGuildSubscription,
  generateLicenseKey,
  isTestMode,
  type SubscriptionTier,
} from '@/lib/premium/entitlements';
import { connectDB } from '@/lib/db';
import { LicenseKey } from '@/models/LicenseKey';

export async function POST(req: Request) {
  let event: Stripe.Event;
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const rawBody = await req.text();
    const stripe = getStripeClient();

    if (webhookSecret && signature && stripe) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid signature';
        console.error('[StripeWebhook] Webhook signature verification failed:', msg);
        return NextResponse.json(
          { error: `Webhook signature verification failed: ${msg}` },
          { status: 400 },
        );
      }
    } else {
      // In test or local dev without webhook secret configured
      try {
        event = JSON.parse(rawBody) as Stripe.Event;
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      const guildId = metadata.guildId ? metadata.guildId.trim() : '';
      const userId = metadata.userId ? metadata.userId.trim() : '';
      const tier = (metadata.tier as SubscriptionTier) || 'pro';
      const interval = metadata.interval || 'monthly';
      const customerEmail =
        session.customer_details?.email || session.customer_email || '';

      const durationDays =
        tier === 'lifetime'
          ? 0
          : interval === 'yearly'
            ? 365
            : 30;

      if (guildId) {
        // Direct guild activation
        await activateGuildSubscription(
          guildId,
          tier,
          durationDays,
          undefined,
          userId || undefined,
        );
      } else {
        // Standalone user purchase: generate redeemable HMAC license key
        const licenseKey = generateLicenseKey(tier, durationDays);

        if (!isTestMode()) {
          try {
            await connectDB();
            await LicenseKey.create({
              key: licenseKey,
              tier,
              durationDays,
              userId,
              customerEmail,
              stripeSessionId: session.id,
              isRedeemed: false,
            });
          } catch (dbErr) {
            console.error('[StripeWebhook] Failed to persist license key in DB:', dbErr);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook processing error';
    console.error('[StripeWebhook] Error processing webhook:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
