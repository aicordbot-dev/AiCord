/**
 * test/premium/commands.test.ts
 * Comprehensive unit tests for /premium Slash Command:
 * - Central Command Registry lookup & metadata
 * - /premium status (Free, Pro, Ultimate, Lifetime, and Expired states)
 * - /premium features (full tier comparison matrix embed)
 * - /premium redeem (permission check MANAGE_GUILD, validation, celebration embed)
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
  buildPremiumStatusEmbed,
  buildPremiumFeaturesEmbed,
  buildRedemptionSuccessEmbed,
} from '@/commands/premium';
import {
  enableTestMode,
  clearTestStore,
  setTestSubscription,
  generateLicenseKey,
  redeemLicenseKey,
  TIER_DEFINITIONS,
} from '@/lib/premium/entitlements';
import { PermissionFlags } from '@/lib/discord/permissions';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';

describe('Server-Wide Subscription — /premium Slash Command', () => {
  const GUILD_ID = 'guild_premium_test_101';
  const USER_ID = 'user_admin_202';
  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  before(() => {
    registerPremiumCommands();
  });

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    interceptedResponses = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });
  });

  afterEach(() => {
    setResponseHandler(null);
    clearTestStore();
    enableTestMode(false);
  });

  // ─── 1. Command Registry Integration ────────────────────────────────────────

  describe('Command Registry Integration', () => {
    it('registers /premium with category "utility"', () => {
      const cmd = getCommand('premium');
      assert.ok(cmd);
      assert.equal(cmd.name, 'premium');
      assert.equal(cmd.category, 'utility');
    });

    it('exposes subcommands: status, features, redeem', () => {
      const cmd = getCommand('premium');
      assert.ok(cmd);
      const options = cmd.options as Array<{ name: string; type: number; options?: unknown[] }> | undefined;
      assert.ok(options);
      const subNames = options.map((o) => o.name);
      assert.ok(subNames.includes('status'));
      assert.ok(subNames.includes('features'));
      assert.ok(subNames.includes('redeem'));

      const redeemSub = options.find((o) => o.name === 'redeem');
      assert.ok(redeemSub);
      assert.ok(redeemSub.options);
      assert.equal((redeemSub.options as Array<{ name: string }>)[0].name, 'license_key');
    });

    it('verifies registerAllCommands() registers premiumCommand seamlessly', () => {
      registerAllCommands();
      const cmd = getCommand('premium');
      assert.ok(cmd);
      assert.equal(cmd.name, 'premium');
    });
  });

  // ─── 2. /premium status Subcommand ──────────────────────────────────────────

  describe('/premium status Execution', () => {
    it('displays Free tier status embed by default', async () => {
      const interaction = {
        token: 'token_status_free',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID }, permissions: '0' },
        data: {
          name: 'premium',
          options: [{ name: 'status' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Server Subscription Status'));

      const fields = embed.fields ?? [];
      assert.ok(fields.some((f) => f.name.includes('Current Tier') && f.value.includes('🆓 Free')));
      assert.ok(fields.some((f) => f.name.includes('Expiration') && f.value.includes('Free Tier')));
      assert.ok(fields.some((f) => f.name.includes('Active Feature Entitlements') && f.value.includes('3 builds/mo')));
    });

    it('displays Pro tier status embed with remaining days', async () => {
      const future = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      setTestSubscription(GUILD_ID, {
        tier: 'pro',
        licenseKey: 'AICORD-PRO-30D-ABCD1234-5678EFGH',
        expiresAt: future,
        features: TIER_DEFINITIONS.pro.features,
      });

      const interaction = {
        token: 'token_status_pro',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID }, permissions: '0' },
        data: {
          name: 'premium',
          options: [{ name: 'status' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);

      const fields = embed.fields ?? [];
      assert.ok(fields.some((f) => f.name.includes('Current Tier') && f.value.includes('⚡ Pro')));
      assert.ok(fields.some((f) => f.name.includes('Expiration') && f.value.includes('Expires in')));
      assert.ok(fields.some((f) => f.name.includes('License Key') && f.value.includes('5678EFGH')));
      assert.ok(fields.some((f) => f.name.includes('Active Feature Entitlements') && f.value.includes('15 builds/mo')));
    });

    it('displays Lifetime tier status embed with permanent patron status', async () => {
      setTestSubscription(GUILD_ID, {
        tier: 'lifetime',
        expiresAt: null,
        features: TIER_DEFINITIONS.lifetime.features,
      });

      const interaction = {
        token: 'token_status_life',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID }, permissions: '0' },
        data: {
          name: 'premium',
          options: [{ name: 'status' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);

      const fields = embed.fields ?? [];
      assert.ok(fields.some((f) => f.name.includes('Current Tier') && f.value.includes('♾️ Lifetime')));
      assert.ok(fields.some((f) => f.name.includes('Expiration') && f.value.includes('Permanent Patron')));
      assert.ok(fields.some((f) => f.name.includes('Upgrade') && f.value.includes('permanent lifetime VIP')));
    });

    it('displays expired notice and reverted limits when subscription is expired', async () => {
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      setTestSubscription(GUILD_ID, {
        tier: 'ultimate',
        expiresAt: past,
      });

      const interaction = {
        token: 'token_status_expired',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID }, permissions: '0' },
        data: {
          name: 'premium',
          options: [{ name: 'status' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);

      const fields = embed.fields ?? [];
      assert.ok(fields.some((f) => f.name.includes('Current Tier') && f.value.includes('Expired')));
      assert.ok(fields.some((f) => f.name.includes('Expiration') && f.value.includes('Expired on')));
      // Feature limits should be reverted to Free tier
      assert.ok(fields.some((f) => f.name.includes('Active Feature Entitlements') && f.value.includes('3 builds/mo')));
    });
  });

  // ─── 3. /premium features Subcommand ────────────────────────────────────────

  describe('/premium features Execution', () => {
    it('returns full feature comparison matrix across all 4 tiers', async () => {
      const interaction = {
        token: 'token_features_view',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID }, permissions: '0' },
        data: {
          name: 'premium',
          options: [{ name: 'features' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Subscription Tiers & Feature Matrix'));

      const fields = embed.fields ?? [];
      assert.ok(fields.some((f) => f.name.includes('Free') && f.value.includes('3 builds/mo')));
      assert.ok(fields.some((f) => f.name.includes('Pro') && f.value.includes('15 builds/mo')));
      assert.ok(fields.some((f) => f.name.includes('Ultimate') && f.value.includes('Unlimited')));
      assert.ok(fields.some((f) => f.name.includes('Lifetime') && f.value.includes('All Ultimate Perks Forever')));
    });
  });

  // ─── 4. /premium redeem Subcommand ──────────────────────────────────────────

  describe('/premium redeem Execution', () => {
    it('rejects redemption if user lacks MANAGE_GUILD permission', async () => {
      const key = generateLicenseKey('pro', 30);
      const interaction = {
        token: 'token_no_perm',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID }, permissions: '0' }, // No permissions
        data: {
          name: 'premium',
          options: [
            {
              name: 'redeem',
              options: [{ name: 'license_key', value: key }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Permission Denied'));
      assert.ok(embed.description?.includes('Manage Server'));
    });

    it('rejects redemption if license key is missing or blank', async () => {
      const interaction = {
        token: 'token_blank_key',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: (PermissionFlags.MANAGE_GUILD).toString(),
        },
        data: {
          name: 'premium',
          options: [
            {
              name: 'redeem',
              options: [{ name: 'license_key', value: '   ' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Missing License Key'));
    });

    it('rejects invalid or forged license keys with error embed', async () => {
      const interaction = {
        token: 'token_fake_key',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: (PermissionFlags.MANAGE_GUILD).toString(),
        },
        data: {
          name: 'premium',
          options: [
            {
              name: 'redeem',
              options: [{ name: 'license_key', value: 'AICORD-PRO-30D-FAKEKEY1-BADCHECK' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Redemption Failed'));
    });

    it('successfully redeems valid key when user has MANAGE_GUILD and outputs celebration embed', async () => {
      const key = generateLicenseKey('ultimate', 30);
      const interaction = {
        token: 'token_redeem_success',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: (PermissionFlags.MANAGE_GUILD).toString(),
        },
        data: {
          name: 'premium',
          options: [
            {
              name: 'redeem',
              options: [{ name: 'license_key', value: key }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Server Subscription Activated'));
      assert.ok(embed.description?.includes('👑 Ultimate'));

      const fields = embed.fields ?? [];
      assert.ok(fields.some((f) => f.name.includes('Activated Tier') && f.value.includes('👑 Ultimate')));
      assert.ok(fields.some((f) => f.name.includes('Activated By') && f.value.includes(USER_ID)));
      assert.ok(fields.some((f) => f.name.includes('Unlocked Server Capabilities') && f.value.includes('Unlimited')));
    });

    it('allows redemption when user has ADMINISTRATOR permission', async () => {
      const key = generateLicenseKey('pro', 30);
      const interaction = {
        token: 'token_admin_perm',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: (PermissionFlags.ADMINISTRATOR).toString(),
        },
        data: {
          name: 'premium',
          options: [
            {
              name: 'redeem',
              options: [{ name: 'key', value: key }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executePremiumCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Server Subscription Activated'));
    });
  });
});
