/**
 * test/stripe/premium-buy-command.test.ts
 * Unit tests for Discord Bot /premium buy slash command:
 * - Subcommand schema and options validation
 * - Dynamic Discord embed and button component builders
 * - Interaction response intercept and verification
 */

import '../test-env';
import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommand,
  registerAllCommands,
  registerPremiumCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  premiumCommand,
  executePremiumCommand,
  buildPremiumBuyEmbed,
  buildPremiumBuyComponents,
  handlePremiumBuySubcommand,
} from '@/commands/premium';
import { enableTestMode, clearTestStore } from '@/lib/premium/entitlements';
import { setStripeClientForTest } from '@/lib/stripe';
import {
  ApplicationCommandOptionType,
  ComponentType,
  ButtonStyle,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';

describe('Server-Wide Subscription — /premium buy Slash Command', () => {
  const GUILD_ID = 'guild_premium_buy_test_101';
  const USER_ID = 'user_buyer_202';
  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  before(() => {
    registerPremiumCommands();
  });

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    setStripeClientForTest(null);
    interceptedResponses = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });
  });

  afterEach(() => {
    setResponseHandler(null);
    setStripeClientForTest(null);
    clearTestStore();
    enableTestMode(false);
  });

  // ─── 1. Subcommand Schema & Option Registry ─────────────────────────────────

  describe('Command Registry & Option Schema', () => {
    it('registers /premium with buy subcommand', () => {
      const cmd = getCommand('premium');
      assert.ok(cmd);
      const options = cmd.options as Array<{ name: string; type: number; options?: unknown[] }>;
      assert.ok(options);
      const buySub = options.find((o) => o.name === 'buy');
      assert.ok(buySub);
      assert.strictEqual(buySub.type, ApplicationCommandOptionType.Subcommand);
    });

    it('verifies /premium buy options: tier (required) and billing (optional)', () => {
      const cmd = getCommand('premium');
      assert.ok(cmd);
      const options = cmd.options as Array<{ name: string; options?: Array<{ name: string; required?: boolean; choices?: Array<{ name: string; value: string }> }> }>;
      const buySub = options?.find((o) => o.name === 'buy');
      assert.ok(buySub?.options);

      const tierOpt = buySub.options.find((o) => o.name === 'tier');
      assert.ok(tierOpt);
      assert.strictEqual(tierOpt.required, true);
      assert.ok(tierOpt.choices?.some((c) => c.value === 'pro'));
      assert.ok(tierOpt.choices?.some((c) => c.value === 'ultimate'));
      assert.ok(tierOpt.choices?.some((c) => c.value === 'lifetime'));

      const billingOpt = buySub.options.find((o) => o.name === 'billing');
      assert.ok(billingOpt);
      assert.strictEqual(billingOpt.required, false);
      assert.ok(billingOpt.choices?.some((c) => c.value === 'monthly'));
      assert.ok(billingOpt.choices?.some((c) => c.value === 'yearly'));
    });
  });

  // ─── 2. Embed & Button Components Presentation ──────────────────────────────

  describe('buildPremiumBuyEmbed()', () => {
    it('builds Pro Monthly embed with cyan color and $12/mo price tag', () => {
      const { embed, priceText } = buildPremiumBuyEmbed('pro', 'monthly', GUILD_ID);

      assert.strictEqual(priceText, '$12/mo');
      assert.strictEqual(embed.color, 0x00f0ff);
      assert.ok(embed.title?.includes('Pro Guild'));
      assert.ok(embed.description?.includes(GUILD_ID));

      const priceField = embed.fields?.find((f) => f.name.includes('Price'));
      assert.ok(priceField?.value.includes('$12/mo'));

      const perksField = embed.fields?.find((f) => f.name.includes('Perks'));
      assert.ok(perksField?.value.includes('15'));
      assert.ok(perksField?.value.includes('50'));
    });

    it('builds Pro Yearly embed with $108/yr price tag and 25% discount text', () => {
      const { embed, priceText } = buildPremiumBuyEmbed('pro', 'yearly', GUILD_ID);

      assert.strictEqual(priceText, '$108/yr');
      assert.strictEqual(embed.color, 0x00f0ff);
      const priceField = embed.fields?.find((f) => f.name.includes('Price'));
      assert.ok(priceField?.value.includes('$108/yr'));
      assert.ok(priceField?.value.includes('25%'));
    });

    it('builds Ultimate Monthly embed with gold color and $29/mo price tag', () => {
      const { embed, priceText } = buildPremiumBuyEmbed('ultimate', 'monthly', GUILD_ID);

      assert.strictEqual(priceText, '$29/mo');
      assert.strictEqual(embed.color, 0xffd700);
      assert.ok(embed.title?.includes('Ultimate Sovereign'));
    });

    it('builds Ultimate Yearly embed with gold color and $276/yr price tag', () => {
      const { embed, priceText } = buildPremiumBuyEmbed('ultimate', 'yearly', GUILD_ID);

      assert.strictEqual(priceText, '$276/yr');
      assert.strictEqual(embed.color, 0xffd700);
      const priceField = embed.fields?.find((f) => f.name.includes('Price'));
      assert.ok(priceField?.value.includes('$276/yr'));
    });

    it('builds Lifetime Sovereign embed with purple color and $199 one-time price tag', () => {
      const { embed, priceText } = buildPremiumBuyEmbed('lifetime', 'monthly', GUILD_ID);

      assert.strictEqual(priceText, '$199');
      assert.strictEqual(embed.color, 0x9b59b6);
      assert.ok(embed.title?.includes('Lifetime Sovereign'));
      const priceField = embed.fields?.find((f) => f.name.includes('Price'));
      assert.ok(priceField?.value.includes('$199'));
      assert.ok(priceField?.value.includes('Lifetime Permanent Pass'));
    });
  });

  describe('buildPremiumBuyComponents()', () => {
    it('creates action row with link buttons: Stripe Checkout and Feature Matrix', () => {
      const checkoutUrl = 'https://checkout.stripe.com/c/pay/test_session_123';
      const components = buildPremiumBuyComponents(checkoutUrl, '$12/mo') as Array<{
        type: number;
        components: Array<{
          type: number;
          style: number;
          label: string;
          url: string;
          emoji: { name: string };
        }>;
      }>;

      assert.strictEqual(components.length, 1);
      const row = components[0];
      assert.strictEqual(row.type, ComponentType.ActionRow);
      assert.strictEqual(row.components.length, 2);

      const payBtn = row.components[0];
      assert.strictEqual(payBtn.type, ComponentType.Button);
      assert.strictEqual(payBtn.style, ButtonStyle.Link);
      assert.strictEqual(payBtn.url, checkoutUrl);
      assert.ok(payBtn.label.includes('Pay with Stripe ($12/mo)'));
      assert.strictEqual(payBtn.emoji.name, '💳');

      const matrixBtn = row.components[1];
      assert.strictEqual(matrixBtn.type, ComponentType.Button);
      assert.strictEqual(matrixBtn.style, ButtonStyle.Link);
      assert.ok(matrixBtn.url.includes('#pricing'));
      assert.strictEqual(matrixBtn.label, 'View Feature Matrix');
      assert.strictEqual(matrixBtn.emoji.name, '🌐');
    });
  });

  // ─── 3. Full Interaction Execution ──────────────────────────────────────────

  describe('executePremiumCommand() /premium buy Integration', () => {
    it('handles /premium buy tier:pro billing:monthly smoothly', async () => {
      const interaction = {
        token: 'interaction_token_buy_pro',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: '0',
        },
        data: {
          options: [
            {
              name: 'buy',
              options: [
                { name: 'tier', value: 'pro' },
                { name: 'billing', value: 'monthly' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0];
      assert.strictEqual(resp.token, 'interaction_token_buy_pro');
      assert.strictEqual(resp.options.embeds?.length, 1);
      assert.strictEqual(resp.options.components?.length, 1);

      const embed = resp.options.embeds[0];
      assert.ok(embed.title?.includes('Pro Guild'));

      const components = resp.options.components as Array<{
        components: Array<{ label: string; url: string }>;
      }>;
      assert.ok(components[0].components[0].label.includes('$12/mo'));
      assert.ok(components[0].components[0].url.includes('tier=pro'));
    });

    it('handles /premium buy tier:ultimate billing:yearly with $276/yr button', async () => {
      const interaction = {
        token: 'interaction_token_buy_ultimate',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: '0',
        },
        data: {
          options: [
            {
              name: 'buy',
              options: [
                { name: 'tier', value: 'ultimate' },
                { name: 'billing', value: 'yearly' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0];
      const embed = resp.options.embeds?.[0];
      assert.ok(embed?.title?.includes('Ultimate Sovereign'));

      const components = resp.options.components as Array<{
        components: Array<{ label: string; url: string }>;
      }>;
      assert.ok(components[0].components[0].label.includes('$276/yr'));
      assert.ok(components[0].components[0].url.includes('tier=ultimate'));
    });

    it('handles /premium buy tier:lifetime with one-time payment button', async () => {
      const interaction = {
        token: 'interaction_token_buy_lifetime',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: '0',
        },
        data: {
          options: [
            {
              name: 'buy',
              options: [{ name: 'tier', value: 'lifetime' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0];
      const embed = resp.options.embeds?.[0];
      assert.ok(embed?.title?.includes('Lifetime Sovereign'));

      const components = resp.options.components as Array<{
        components: Array<{ label: string; url: string }>;
      }>;
      assert.ok(components[0].components[0].label.includes('$199'));
      assert.ok(components[0].components[0].url.includes('tier=lifetime'));
    });
  });
});
