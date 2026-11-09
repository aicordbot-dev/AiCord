/**
 * test/stripe/api-routes.test.ts
 * Unit tests for Stripe Web Checkout and Webhook API Route Handlers:
 * - POST /api/stripe/checkout (validation, anonymous & authenticated sessions)
 * - POST /api/stripe/webhook (checkout.session.completed with/without guildId)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST as handleCheckoutPost } from '@/app/api/stripe/checkout/route';
import { POST as handleWebhookPost } from '@/app/api/stripe/webhook/route';
import {
  enableTestMode,
  clearTestStore,
  getGuildSubscription,
} from '@/lib/premium/entitlements';
import { setStripeClientForTest } from '@/lib/stripe';

describe('Stripe API Routes Handler', () => {
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

  // ─── 1. POST /api/stripe/checkout ──────────────────────────────────────────

  describe('POST /api/stripe/checkout', () => {
    it('returns 400 when planId is missing from request body', async () => {
      const req = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await handleCheckoutPost(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.ok(json.error?.includes('Missing planId'));
    });

    it('returns 400 when planId is invalid', async () => {
      const req = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'titanium' }),
      });

      const res = await handleCheckoutPost(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.ok(json.error?.includes('Invalid planId'));
    });

    it('returns bot invite URL when planId is "free"', async () => {
      const req = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'free' }),
      });

      const res = await handleCheckoutPost(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.url?.includes('discord.com/oauth2/authorize'));
    });

    it('returns checkout URL and sessionId for Pro plan', async () => {
      const req = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'pro',
          interval: 'monthly',
          guildId: 'guild_api_test_01',
        }),
      });

      const res = await handleCheckoutPost(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.url?.includes('tier=pro'));
      assert.ok(json.url?.includes('guild_api_test_01'));
      assert.ok(json.sessionId);
    });

    it('returns checkout URL for Ultimate Yearly plan', async () => {
      const req = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'ultimate',
          interval: 'yearly',
          guildId: 'guild_api_test_02',
        }),
      });

      const res = await handleCheckoutPost(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.url?.includes('tier=ultimate'));
      assert.ok(json.url?.includes('interval=yearly'));
    });
  });

  // ─── 2. POST /api/stripe/webhook ───────────────────────────────────────────

  describe('POST /api/stripe/webhook', () => {
    it('returns 400 on invalid JSON payload when webhook secret is unconfigured', async () => {
      const req = new Request('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-text',
      });

      const res = await handleWebhookPost(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.ok(json.error?.includes('Invalid JSON payload'));
    });

    it('activates server subscription on checkout.session.completed with guildId', async () => {
      const mockEvent = {
        id: 'evt_test_101',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_completed_101',
            metadata: {
              guildId: 'guild_wh_test_101',
              userId: 'user_wh_buyer_1',
              tier: 'ultimate',
              interval: 'yearly',
            },
            customer_details: {
              email: 'patron@example.com',
            },
          },
        },
      };

      const req = new Request('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockEvent),
      });

      const res = await handleWebhookPost(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.received, true);

      // Verify the guild subscription was upgraded
      const sub = await getGuildSubscription('guild_wh_test_101');
      assert.strictEqual(sub.tier, 'ultimate');
      assert.strictEqual(sub.features.maxBuildsPerMonth, -1);
      assert.strictEqual(sub.features.hasWhatsAppBridge, true);
    });

    it('handles checkout.session.completed without guildId by generating license key', async () => {
      const mockEvent = {
        id: 'evt_test_102',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_completed_102',
            metadata: {
              userId: 'user_wh_buyer_2',
              tier: 'lifetime',
            },
            customer_details: {
              email: 'vip-patron@example.com',
            },
          },
        },
      };

      const req = new Request('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockEvent),
      });

      const res = await handleWebhookPost(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.received, true);
    });
  });
});
