/**
 * test/stripe/stripe-checkout.test.ts
 * Unit tests for Stripe Checkout Session generation, price mapping, metadata preservation,
 * and subscription activation mechanics.
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCheckoutSession,
  getPlanPricing,
  setStripeClientForTest,
  type CreateCheckoutSessionParams,
} from '@/lib/stripe';
import {
  enableTestMode,
  clearTestStore,
  getGuildSubscription,
  activateGuildSubscription,
  verifyLicenseKey,
} from '@/lib/premium/entitlements';
import type Stripe from 'stripe';

describe('Stripe Payment Integration — Checkout Sessions', () => {
  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    setStripeClientForTest(null);
  });

  afterEach(() => {
    setStripeClientForTest(null);
    clearTestStore();
    enableTestMode(false);
  });

  // ─── 1. Price Mapping & Plan Pricing Calculation ───────────────────────────

  describe('getPlanPricing()', () => {
    it('maps Pro Monthly to 1200 cents ($12.00) recurring monthly', () => {
      const pricing = getPlanPricing('pro', 'monthly');
      assert.strictEqual(pricing.unitAmount, 1200);
      assert.strictEqual(pricing.interval, 'month');
      assert.ok(pricing.name.includes('Pro'));
    });

    it('maps Pro Yearly to 10800 cents ($108.00) recurring yearly', () => {
      const pricing = getPlanPricing('pro', 'yearly');
      assert.strictEqual(pricing.unitAmount, 10800);
      assert.strictEqual(pricing.interval, 'year');
      assert.ok(pricing.name.includes('Pro'));
    });

    it('maps Ultimate Monthly to 2900 cents ($29.00) recurring monthly', () => {
      const pricing = getPlanPricing('ultimate', 'monthly');
      assert.strictEqual(pricing.unitAmount, 2900);
      assert.strictEqual(pricing.interval, 'month');
      assert.ok(pricing.name.includes('Ultimate'));
    });

    it('maps Ultimate Yearly to 27600 cents ($276.00) recurring yearly', () => {
      const pricing = getPlanPricing('ultimate', 'yearly');
      assert.strictEqual(pricing.unitAmount, 27600);
      assert.strictEqual(pricing.interval, 'year');
      assert.ok(pricing.name.includes('Ultimate'));
    });

    it('maps Lifetime Sovereign to 19900 cents ($199.00) one-time', () => {
      const pricing = getPlanPricing('lifetime');
      assert.strictEqual(pricing.unitAmount, 19900);
      assert.strictEqual(pricing.interval, 'once');
      assert.ok(pricing.name.includes('Lifetime'));
    });

    it('throws an error for unsupported tier', () => {
      assert.throws(() => {
        // @ts-expect-error Testing invalid tier input
        getPlanPricing('enterprise');
      }, /Unsupported checkout tier/);
    });
  });

  // ─── 2. Graceful Dev Fallback Sessions ──────────────────────────────────────

  describe('createCheckoutSession() Fallback Dev Mode', () => {
    it('generates mock checkout URL for Pro Monthly with preserved metadata', async () => {
      const result = await createCheckoutSession({
        tier: 'pro',
        interval: 'monthly',
        guildId: 'guild_test_101',
        userId: 'user_tester_202',
      });

      assert.ok(result.sessionId.startsWith('cs_mock_pro_monthly_'));
      assert.ok(result.url.includes('tier=pro'));
      assert.ok(result.url.includes('interval=monthly'));
      assert.ok(result.url.includes('guildId=guild_test_101'));
      assert.ok(result.url.includes('userId=user_tester_202'));
    });

    it('generates mock checkout URL for Pro Yearly with preserved metadata', async () => {
      const result = await createCheckoutSession({
        tier: 'pro',
        interval: 'yearly',
        guildId: 'guild_test_102',
      });

      assert.ok(result.sessionId.startsWith('cs_mock_pro_yearly_'));
      assert.ok(result.url.includes('tier=pro'));
      assert.ok(result.url.includes('interval=yearly'));
      assert.ok(result.url.includes('guildId=guild_test_102'));
    });

    it('generates mock checkout URL for Ultimate Monthly with preserved metadata', async () => {
      const result = await createCheckoutSession({
        tier: 'ultimate',
        interval: 'monthly',
        guildId: 'guild_test_103',
      });

      assert.ok(result.sessionId.startsWith('cs_mock_ultimate_monthly_'));
      assert.ok(result.url.includes('tier=ultimate'));
      assert.ok(result.url.includes('interval=monthly'));
    });

    it('generates mock checkout URL for Ultimate Yearly with preserved metadata', async () => {
      const result = await createCheckoutSession({
        tier: 'ultimate',
        interval: 'yearly',
        guildId: 'guild_test_104',
      });

      assert.ok(result.sessionId.startsWith('cs_mock_ultimate_yearly_'));
      assert.ok(result.url.includes('tier=ultimate'));
      assert.ok(result.url.includes('interval=yearly'));
    });

    it('generates mock checkout URL for Lifetime Sovereign with preserved metadata', async () => {
      const result = await createCheckoutSession({
        tier: 'lifetime',
        guildId: 'guild_test_105',
        userId: 'user_tester_505',
      });

      assert.ok(result.sessionId.startsWith('cs_mock_lifetime_lifetime_'));
      assert.ok(result.url.includes('tier=lifetime'));
      assert.ok(result.url.includes('guildId=guild_test_105'));
      assert.ok(result.url.includes('userId=user_tester_505'));
    });

    it('generates mock checkout URL respecting custom baseUrl', async () => {
      const result = await createCheckoutSession({
        tier: 'pro',
        baseUrl: 'http://localhost:3000',
      });

      assert.ok(result.url.startsWith('http://localhost:3000/checkout/mock'));
    });

    it('rejects invalid tier parameter with descriptive error', async () => {
      await assert.rejects(async () => {
        // @ts-expect-error Testing invalid tier input
        await createCheckoutSession({ tier: 'invalid_tier' });
      }, /Invalid tier "invalid_tier"/);
    });
  });

  // ─── 3. Stripe Client API Session Creation with Preserved Metadata ──────────

  describe('createCheckoutSession() with Stripe Client', () => {
    it('creates Stripe checkout session for Pro Monthly with subscription mode & metadata', async () => {
      let capturedParams: Stripe.Checkout.SessionCreateParams | null = null;

      const mockStripe = {
        checkout: {
          sessions: {
            create: async (params: Stripe.Checkout.SessionCreateParams) => {
              capturedParams = params;
              return {
                id: 'cs_live_pro_monthly_test_id',
                url: 'https://checkout.stripe.com/c/pay/cs_live_pro_monthly_test_id',
              };
            },
          },
        },
      } as unknown as Stripe;

      setStripeClientForTest(mockStripe);

      const result = await createCheckoutSession({
        tier: 'pro',
        interval: 'monthly',
        guildId: 'guild_stripe_301',
        userId: 'user_stripe_302',
        customerEmail: 'patron@example.com',
      });

      assert.strictEqual(result.sessionId, 'cs_live_pro_monthly_test_id');
      assert.strictEqual(result.url, 'https://checkout.stripe.com/c/pay/cs_live_pro_monthly_test_id');

      assert.ok(capturedParams);
      const params = capturedParams as Stripe.Checkout.SessionCreateParams;
      assert.strictEqual(params.mode, 'subscription');
      assert.strictEqual(params.customer_email, 'patron@example.com');
      assert.strictEqual(params.metadata?.tier, 'pro');
      assert.strictEqual(params.metadata?.interval, 'monthly');
      assert.strictEqual(params.metadata?.guildId, 'guild_stripe_301');
      assert.strictEqual(params.metadata?.userId, 'user_stripe_302');
      assert.strictEqual(
        params.success_url,
        'https://aicord.vercel.app/checkout/success?session_id={CHECKOUT_SESSION_ID}&tier=pro',
      );
      assert.strictEqual(
        params.cancel_url,
        'https://aicord.vercel.app/checkout/cancel?tier=pro',
      );

      const item = params.line_items?.[0];
      assert.ok(item);
      assert.strictEqual(item.price_data?.unit_amount, 1200);
      assert.strictEqual(item.price_data?.recurring?.interval, 'month');
    });

    it('creates Stripe checkout session with custom baseUrl returning to caller origin', async () => {
      let capturedParams: Stripe.Checkout.SessionCreateParams | null = null;

      const mockStripe = {
        checkout: {
          sessions: {
            create: async (params: Stripe.Checkout.SessionCreateParams) => {
              capturedParams = params;
              return {
                id: 'cs_live_custom_host_id',
                url: 'https://checkout.stripe.com/c/pay/cs_live_custom_host_id',
              };
            },
          },
        },
      } as unknown as Stripe;

      setStripeClientForTest(mockStripe);

      const result = await createCheckoutSession({
        tier: 'ultimate',
        interval: 'monthly',
        baseUrl: 'http://localhost:3000',
      });

      assert.strictEqual(result.sessionId, 'cs_live_custom_host_id');
      assert.ok(capturedParams);
      const params = capturedParams as Stripe.Checkout.SessionCreateParams;
      assert.strictEqual(
        params.success_url,
        'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}&tier=ultimate',
      );
      assert.strictEqual(
        params.cancel_url,
        'http://localhost:3000/checkout/cancel?tier=ultimate',
      );
    });

    it('honors explicit successUrl and cancelUrl overrides', async () => {
      let capturedParams: Stripe.Checkout.SessionCreateParams | null = null;

      const mockStripe = {
        checkout: {
          sessions: {
            create: async (params: Stripe.Checkout.SessionCreateParams) => {
              capturedParams = params;
              return {
                id: 'cs_live_override_id',
                url: 'https://checkout.stripe.com/c/pay/cs_live_override_id',
              };
            },
          },
        },
      } as unknown as Stripe;

      setStripeClientForTest(mockStripe);

      await createCheckoutSession({
        tier: 'lifetime',
        successUrl: 'https://custom.site/success-override',
        cancelUrl: 'https://custom.site/cancel-override',
      });

      assert.ok(capturedParams);
      const params = capturedParams as Stripe.Checkout.SessionCreateParams;
      assert.strictEqual(params.success_url, 'https://custom.site/success-override');
      assert.strictEqual(params.cancel_url, 'https://custom.site/cancel-override');
    });

    it('creates Stripe checkout session for Pro Yearly with subscription mode & 10800 cents', async () => {
      let capturedParams: Stripe.Checkout.SessionCreateParams | null = null;

      const mockStripe = {
        checkout: {
          sessions: {
            create: async (params: Stripe.Checkout.SessionCreateParams) => {
              capturedParams = params;
              return {
                id: 'cs_live_pro_yearly_test_id',
                url: 'https://checkout.stripe.com/c/pay/cs_live_pro_yearly_test_id',
              };
            },
          },
        },
      } as unknown as Stripe;

      setStripeClientForTest(mockStripe);

      const result = await createCheckoutSession({
        tier: 'pro',
        interval: 'yearly',
        guildId: 'guild_stripe_401',
      });

      assert.strictEqual(result.sessionId, 'cs_live_pro_yearly_test_id');
      assert.ok(capturedParams);
      const params = capturedParams as Stripe.Checkout.SessionCreateParams;
      assert.strictEqual(params.mode, 'subscription');
      assert.strictEqual(params.metadata?.tier, 'pro');
      assert.strictEqual(params.metadata?.interval, 'yearly');
      assert.strictEqual(params.line_items?.[0].price_data?.unit_amount, 10800);
      assert.strictEqual(params.line_items?.[0].price_data?.recurring?.interval, 'year');
    });

    it('creates Stripe checkout session for Ultimate Monthly with 2900 cents', async () => {
      let capturedParams: Stripe.Checkout.SessionCreateParams | null = null;

      const mockStripe = {
        checkout: {
          sessions: {
            create: async (params: Stripe.Checkout.SessionCreateParams) => {
              capturedParams = params;
              return {
                id: 'cs_live_ultimate_monthly_id',
                url: 'https://checkout.stripe.com/c/pay/cs_live_ultimate_monthly_id',
              };
            },
          },
        },
      } as unknown as Stripe;

      setStripeClientForTest(mockStripe);

      const result = await createCheckoutSession({
        tier: 'ultimate',
        interval: 'monthly',
        guildId: 'guild_stripe_501',
      });

      assert.strictEqual(result.sessionId, 'cs_live_ultimate_monthly_id');
      assert.ok(capturedParams);
      const params = capturedParams as Stripe.Checkout.SessionCreateParams;
      assert.strictEqual(params.mode, 'subscription');
      assert.strictEqual(params.metadata?.tier, 'ultimate');
      assert.strictEqual(params.metadata?.interval, 'monthly');
      assert.strictEqual(params.line_items?.[0].price_data?.unit_amount, 2900);
      assert.strictEqual(params.line_items?.[0].price_data?.recurring?.interval, 'month');
    });

    it('creates Stripe checkout session for Ultimate Yearly with 27600 cents', async () => {
      let capturedParams: Stripe.Checkout.SessionCreateParams | null = null;

      const mockStripe = {
        checkout: {
          sessions: {
            create: async (params: Stripe.Checkout.SessionCreateParams) => {
              capturedParams = params;
              return {
                id: 'cs_live_ultimate_yearly_id',
                url: 'https://checkout.stripe.com/c/pay/cs_live_ultimate_yearly_id',
              };
            },
          },
        },
      } as unknown as Stripe;

      setStripeClientForTest(mockStripe);

      const result = await createCheckoutSession({
        tier: 'ultimate',
        interval: 'yearly',
        guildId: 'guild_stripe_601',
      });

      assert.strictEqual(result.sessionId, 'cs_live_ultimate_yearly_id');
      assert.ok(capturedParams);
      const params = capturedParams as Stripe.Checkout.SessionCreateParams;
      assert.strictEqual(params.mode, 'subscription');
      assert.strictEqual(params.metadata?.tier, 'ultimate');
      assert.strictEqual(params.metadata?.interval, 'yearly');
      assert.strictEqual(params.line_items?.[0].price_data?.unit_amount, 27600);
      assert.strictEqual(params.line_items?.[0].price_data?.recurring?.interval, 'year');
    });

    it('creates Stripe checkout session for Lifetime with payment mode & 19900 cents', async () => {
      let capturedParams: Stripe.Checkout.SessionCreateParams | null = null;

      const mockStripe = {
        checkout: {
          sessions: {
            create: async (params: Stripe.Checkout.SessionCreateParams) => {
              capturedParams = params;
              return {
                id: 'cs_live_lifetime_id',
                url: 'https://checkout.stripe.com/c/pay/cs_live_lifetime_id',
              };
            },
          },
        },
      } as unknown as Stripe;

      setStripeClientForTest(mockStripe);

      const result = await createCheckoutSession({
        tier: 'lifetime',
        guildId: 'guild_stripe_701',
        userId: 'user_stripe_702',
      });

      assert.strictEqual(result.sessionId, 'cs_live_lifetime_id');
      assert.ok(capturedParams);
      const params = capturedParams as Stripe.Checkout.SessionCreateParams;
      assert.strictEqual(params.mode, 'payment');
      assert.strictEqual(params.metadata?.tier, 'lifetime');
      assert.strictEqual(params.metadata?.interval, 'lifetime');
      assert.strictEqual(params.metadata?.guildId, 'guild_stripe_701');
      assert.strictEqual(params.metadata?.userId, 'user_stripe_702');
      assert.strictEqual(params.line_items?.[0].price_data?.unit_amount, 19900);
      assert.strictEqual(params.line_items?.[0].price_data?.recurring, undefined);
    });
  });

  // ─── 4. Guild Subscription Activation ───────────────────────────────────────

  describe('activateGuildSubscription() Webhook Fulfillment', () => {
    it('activates Pro subscription for 30 days and grants upgraded limits', async () => {
      const res = await activateGuildSubscription(
        'guild_webhook_801',
        'pro',
        30,
        undefined,
        'user_buyer_1',
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.tier, 'pro');
      assert.ok(res.expiresAt);
      assert.ok(res.licenseKey.startsWith('AICORD-PRO-'));

      const sub = await getGuildSubscription('guild_webhook_801');
      assert.strictEqual(sub.tier, 'pro');
      assert.strictEqual(sub.features.maxBuildsPerMonth, 15);
      assert.strictEqual(sub.features.hasServerBackups, true);
      assert.strictEqual(sub.features.hasWhatsAppBridge, true);
    });

    it('activates Lifetime subscription with null expiration and permanent perks', async () => {
      const res = await activateGuildSubscription(
        'guild_webhook_802',
        'lifetime',
        0,
        undefined,
        'user_buyer_2',
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.tier, 'lifetime');
      assert.strictEqual(res.expiresAt, undefined);

      const sub = await getGuildSubscription('guild_webhook_802');
      assert.strictEqual(sub.tier, 'lifetime');
      assert.strictEqual(sub.expiresAt, null);
      assert.strictEqual(sub.features.maxBuildsPerMonth, -1);
      assert.strictEqual(sub.features.hasWhatsAppBridge, true);
      assert.strictEqual(sub.features.hasAiTldr, true);
    });

    it('generates cryptographically valid HMAC license keys', async () => {
      const res = await activateGuildSubscription('guild_webhook_803', 'ultimate', 365);
      const verification = verifyLicenseKey(res.licenseKey);
      assert.strictEqual(verification.valid, true);
      assert.strictEqual(verification.tier, 'ultimate');
      assert.strictEqual(verification.durationDays, 365);
    });
  });
});
