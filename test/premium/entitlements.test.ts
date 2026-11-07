/**
 * test/premium/entitlements.test.ts
 * Unit tests for Server-Wide Subscription & Entitlement Engine:
 * - Tier limits matrix (Free, Pro, Ultimate, Lifetime)
 * - getGuildSubscription & default Free initialization
 * - Expiration check & fallback to Free tier
 * - checkFeatureAccess for boolean gates and numeric limits
 * - HMAC-signed license key generation & verification
 * - One-time key redemption & double-redemption prevention
 * - Extension of active subscription durations
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  setTestSubscription,
  getGuildSubscription,
  checkFeatureAccess,
  isThemeUnlocked,
  generateLicenseKey,
  verifyLicenseKey,
  redeemLicenseKey,
  isSubscriptionActive,
  getActiveSubscriptionTier,
  getActiveFeatures,
  TIER_DEFINITIONS,
  TIER_BADGES,
} from '@/lib/premium/entitlements';

describe('Server-Wide Subscription & Entitlement Engine', () => {
  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
  });

  describe('Tier Definitions & Limits Matrix', () => {
    it('defines expected limits for Free tier', () => {
      const free = TIER_DEFINITIONS.free;
      assert.equal(free.tier, 'free');
      assert.equal(free.badge, '🆓 Free');
      assert.equal(free.features.maxBuildsPerMonth, 3);
      assert.equal(free.features.maxTickets, 3);
      assert.equal(free.features.maxShopItems, 10);
      assert.deepEqual(free.features.unlockedThemes, ['cyberpunk', 'frost']);
      assert.equal(free.features.hasWhatsAppBridge, false);
      assert.equal(free.features.has247Radio, false);
      assert.equal(free.features.hasServerBackups, false);
      assert.equal(free.features.hasBossRaids, false);
      assert.equal(free.features.hasAiTldr, false);
    });

    it('defines expected limits for Pro tier', () => {
      const pro = TIER_DEFINITIONS.pro;
      assert.equal(pro.tier, 'pro');
      assert.equal(pro.badge, '⚡ Pro');
      assert.equal(pro.features.maxBuildsPerMonth, 15);
      assert.equal(pro.features.maxTickets, 25);
      assert.equal(pro.features.maxShopItems, 50);
      assert.equal(pro.features.unlockedThemes.length, 6);
      assert.ok(pro.features.unlockedThemes.includes('emerald'));
      assert.ok(pro.features.unlockedThemes.includes('midnight'));
      assert.equal(pro.features.hasWhatsAppBridge, true); // Announcements
      assert.equal(pro.features.has247Radio, false); // 3 stations, no 24/7 radio
      assert.equal(pro.features.hasServerBackups, true); // 5 backups
      assert.equal(pro.features.hasBossRaids, true); // 1/wk
      assert.equal(pro.features.hasAiTldr, false);
    });

    it('defines expected limits for Ultimate tier', () => {
      const ult = TIER_DEFINITIONS.ultimate;
      assert.equal(ult.tier, 'ultimate');
      assert.equal(ult.badge, '👑 Ultimate');
      assert.equal(ult.features.maxBuildsPerMonth, -1); // Unlimited
      assert.equal(ult.features.maxTickets, -1);
      assert.equal(ult.features.maxShopItems, -1);
      assert.equal(ult.features.unlockedThemes.length, 6);
      assert.equal(ult.features.hasWhatsAppBridge, true); // Full bridge
      assert.equal(ult.features.has247Radio, true); // 24/7 endless radio
      assert.equal(ult.features.hasServerBackups, true); // 20 backups
      assert.equal(ult.features.hasBossRaids, true); // Unlimited
      assert.equal(ult.features.hasAiTldr, true); // 100 summaries/mo
    });

    it('defines expected limits for Lifetime tier', () => {
      const life = TIER_DEFINITIONS.lifetime;
      assert.equal(life.tier, 'lifetime');
      assert.equal(life.badge, '♾️ Lifetime');
      assert.equal(life.features.maxBuildsPerMonth, -1);
      assert.equal(life.features.maxTickets, -1);
      assert.equal(life.features.maxShopItems, -1);
      assert.equal(life.features.hasWhatsAppBridge, true);
      assert.equal(life.features.has247Radio, true);
      assert.equal(life.features.hasServerBackups, true);
      assert.equal(life.features.hasBossRaids, true);
      assert.equal(life.features.hasAiTldr, true);
    });
  });

  describe('getGuildSubscription() & Default Free State', () => {
    it('returns default Free tier when guild has no subscription record', async () => {
      const sub = await getGuildSubscription('guild_fresh_101');
      assert.equal(sub.guildId, 'guild_fresh_101');
      assert.equal(sub.tier, 'free');
      assert.equal(sub.expiresAt, null);
      assert.equal(sub.features.maxBuildsPerMonth, 3);
      assert.equal(sub.features.hasWhatsAppBridge, false);
    });

    it('returns existing subscription record if present', async () => {
      setTestSubscription('guild_existing_202', {
        tier: 'pro',
        ownerId: 'user_owner_1',
        features: TIER_DEFINITIONS.pro.features,
      });

      const sub = await getGuildSubscription('guild_existing_202');
      assert.equal(sub.guildId, 'guild_existing_202');
      assert.equal(sub.tier, 'pro');
      assert.equal(sub.ownerId, 'user_owner_1');
    });
  });

  describe('Expiration & Active Tier Resolution', () => {
    it('recognizes Lifetime as always active with no expiration', () => {
      const active = isSubscriptionActive({ tier: 'lifetime', expiresAt: null });
      assert.equal(active, true);
      assert.equal(getActiveSubscriptionTier({ tier: 'lifetime', expiresAt: null }), 'lifetime');
    });

    it('recognizes future expiration as active', () => {
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const active = isSubscriptionActive({ tier: 'pro', expiresAt: future });
      assert.equal(active, true);
      assert.equal(getActiveSubscriptionTier({ tier: 'pro', expiresAt: future }), 'pro');
    });

    it('falls back to Free tier when subscription has expired in the past', () => {
      const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const active = isSubscriptionActive({ tier: 'ultimate', expiresAt: past });
      assert.equal(active, false);
      assert.equal(getActiveSubscriptionTier({ tier: 'ultimate', expiresAt: past }), 'free');

      const activeFeatures = getActiveFeatures({ tier: 'ultimate', expiresAt: past });
      assert.equal(activeFeatures.maxBuildsPerMonth, 3);
      assert.equal(activeFeatures.has247Radio, false);
    });
  });

  describe('checkFeatureAccess() & isThemeUnlocked()', () => {
    it('evaluates boolean feature gates correctly on Free vs Pro vs Ultimate', async () => {
      const guildId = 'guild_access_test';

      // Free tier
      setTestSubscription(guildId, { tier: 'free' });
      let radioCheck = await checkFeatureAccess(guildId, 'has247Radio');
      assert.equal(radioCheck.allowed, false);
      assert.equal(radioCheck.tier, 'free');
      assert.ok(radioCheck.reason?.includes('requires an upgraded'));

      let waCheck = await checkFeatureAccess(guildId, 'hasWhatsAppBridge');
      assert.equal(waCheck.allowed, false);

      // Pro tier
      setTestSubscription(guildId, { tier: 'pro', expiresAt: new Date(Date.now() + 86400000) });
      radioCheck = await checkFeatureAccess(guildId, 'has247Radio');
      assert.equal(radioCheck.allowed, false); // Pro has 3 stations, not 24/7 radio

      waCheck = await checkFeatureAccess(guildId, 'hasWhatsAppBridge');
      assert.equal(waCheck.allowed, true); // Pro has announcement bridge

      let raidCheck = await checkFeatureAccess(guildId, 'hasBossRaids');
      assert.equal(raidCheck.allowed, true);

      // Ultimate tier
      setTestSubscription(guildId, { tier: 'ultimate', expiresAt: new Date(Date.now() + 86400000) });
      radioCheck = await checkFeatureAccess(guildId, 'has247Radio');
      assert.equal(radioCheck.allowed, true);

      let tldrCheck = await checkFeatureAccess(guildId, 'hasAiTldr');
      assert.equal(tldrCheck.allowed, true);
    });

    it('evaluates numeric feature limits correctly', async () => {
      const guildId = 'guild_limits_test';

      setTestSubscription(guildId, { tier: 'free' });
      const freeBuilds = await checkFeatureAccess(guildId, 'maxBuildsPerMonth');
      assert.equal(freeBuilds.allowed, true);
      assert.equal(freeBuilds.limit, 3);

      setTestSubscription(guildId, { tier: 'pro', expiresAt: new Date(Date.now() + 86400000) });
      const proBuilds = await checkFeatureAccess(guildId, 'maxBuildsPerMonth');
      assert.equal(proBuilds.allowed, true);
      assert.equal(proBuilds.limit, 15);

      setTestSubscription(guildId, { tier: 'ultimate', expiresAt: new Date(Date.now() + 86400000) });
      const ultBuilds = await checkFeatureAccess(guildId, 'maxBuildsPerMonth');
      assert.equal(ultBuilds.allowed, true);
      assert.equal(ultBuilds.limit, -1); // Unlimited
    });

    it('denies premium features if guild subscription has expired', async () => {
      const guildId = 'guild_expired_check';
      const past = new Date(Date.now() - 3600000); // 1 hour ago
      setTestSubscription(guildId, { tier: 'ultimate', expiresAt: past });

      const radioCheck = await checkFeatureAccess(guildId, 'has247Radio');
      assert.equal(radioCheck.allowed, false);
      assert.equal(radioCheck.tier, 'free');

      const buildsCheck = await checkFeatureAccess(guildId, 'maxBuildsPerMonth');
      assert.equal(buildsCheck.allowed, true);
      assert.equal(buildsCheck.limit, 3); // Reverted to free limit 3
    });

    it('checks theme unlock status via isThemeUnlocked()', async () => {
      const guildId = 'guild_theme_check';

      setTestSubscription(guildId, { tier: 'free' });
      assert.equal(await isThemeUnlocked(guildId, 'cyberpunk'), true);
      assert.equal(await isThemeUnlocked(guildId, 'frost'), true);
      assert.equal(await isThemeUnlocked(guildId, 'gold'), false);
      assert.equal(await isThemeUnlocked(guildId, 'emerald'), false);

      setTestSubscription(guildId, { tier: 'pro', expiresAt: new Date(Date.now() + 86400000) });
      assert.equal(await isThemeUnlocked(guildId, 'gold'), true);
      assert.equal(await isThemeUnlocked(guildId, 'emerald'), true);
      assert.equal(await isThemeUnlocked(guildId, 'midnight'), true);
    });
  });

  describe('HMAC License Key Generation & Verification', () => {
    it('generates well-formed HMAC license keys for different tiers', () => {
      const proKey = generateLicenseKey('pro', 30);
      assert.ok(proKey.startsWith('AICORD-PRO-30D-'));
      const parts = proKey.split('-');
      assert.equal(parts.length, 5);

      const ultKey = generateLicenseKey('ultimate', 90);
      assert.ok(ultKey.startsWith('AICORD-ULTIMATE-90D-'));

      const lifeKey = generateLicenseKey('lifetime');
      assert.ok(lifeKey.startsWith('AICORD-LIFETIME-PERM-'));
    });

    it('verifies valid license keys and extracts tier and duration', () => {
      const key = generateLicenseKey('pro', 60);
      const res = verifyLicenseKey(key);
      assert.equal(res.valid, true);
      assert.equal(res.tier, 'pro');
      assert.equal(res.durationDays, 60);

      const lifeKey = generateLicenseKey('lifetime');
      const lifeRes = verifyLicenseKey(lifeKey);
      assert.equal(lifeRes.valid, true);
      assert.equal(lifeRes.tier, 'lifetime');
      assert.equal(lifeRes.durationDays, undefined);
    });

    it('rejects tampered or forged license keys with invalid checksum', () => {
      const validKey = generateLicenseKey('pro', 30);
      // Tamper with the tier in the key
      const forgedKey = validKey.replace('AICORD-PRO-', 'AICORD-ULTIMATE-');
      const res = verifyLicenseKey(forgedKey);
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes('signature or checksum'));

      // Tamper with checksum directly
      const parts = validKey.split('-');
      parts[parts.length - 1] = '00000000';
      const badChecksumKey = parts.join('-');
      const badRes = verifyLicenseKey(badChecksumKey);
      assert.equal(badRes.valid, false);
      assert.ok(badRes.error?.includes('signature or checksum'));
    });

    it('rejects invalid key formats and unknown tiers', () => {
      assert.equal(verifyLicenseKey('').valid, false);
      assert.equal(verifyLicenseKey('INVALID-KEY-STRING').valid, false);
      assert.equal(verifyLicenseKey('AICORD-GODMODE-30D-12345678-87654321').valid, false);
    });
  });

  describe('redeemLicenseKey() & Double Redemption Prevention', () => {
    it('successfully redeems a valid Pro key and activates subscription', async () => {
      const guildId = 'guild_redeem_1';
      const key = generateLicenseKey('pro', 30);

      const result = await redeemLicenseKey(guildId, key, 'user_mod_1');
      assert.equal(result.success, true);
      assert.equal(result.tier, 'pro');
      assert.ok(result.expiresAt instanceof Date);

      // Verify stored subscription
      const sub = await getGuildSubscription(guildId);
      assert.equal(sub.tier, 'pro');
      assert.equal(sub.ownerId, 'user_mod_1');
      assert.equal(sub.licenseKey, key);
      assert.equal(sub.features.maxBuildsPerMonth, 15);
      assert.equal(sub.features.hasServerBackups, true);
    });

    it('successfully redeems a Lifetime key with null expiration', async () => {
      const guildId = 'guild_redeem_life';
      const key = generateLicenseKey('lifetime');

      const result = await redeemLicenseKey(guildId, key, 'user_owner_vip');
      assert.equal(result.success, true);
      assert.equal(result.tier, 'lifetime');
      assert.equal(result.expiresAt, undefined);

      const sub = await getGuildSubscription(guildId);
      assert.equal(sub.tier, 'lifetime');
      assert.equal(sub.expiresAt, null);
      assert.equal(sub.features.maxBuildsPerMonth, -1);
      assert.equal(sub.features.hasWhatsAppBridge, true);
    });

    it('rejects double-redemption of the same license key', async () => {
      const key = generateLicenseKey('ultimate', 30);

      const first = await redeemLicenseKey('guild_1', key, 'user_1');
      assert.equal(first.success, true);

      // Attempting to redeem again in another guild
      const second = await redeemLicenseKey('guild_2', key, 'user_2');
      assert.equal(second.success, false);
      assert.equal(second.error, 'This license key has already been redeemed.');

      // Attempting to redeem again in the same guild
      const third = await redeemLicenseKey('guild_1', key, 'user_1');
      assert.equal(third.success, false);
      assert.equal(third.error, 'This license key has already been redeemed.');
    });

    it('extends existing active subscription expiration when redeeming another key of same tier', async () => {
      const guildId = 'guild_extend_test';
      const key1 = generateLicenseKey('pro', 30);
      const key2 = generateLicenseKey('pro', 30);

      const res1 = await redeemLicenseKey(guildId, key1, 'user_1');
      assert.equal(res1.success, true);
      const exp1 = res1.expiresAt!.getTime();

      const res2 = await redeemLicenseKey(guildId, key2, 'user_1');
      assert.equal(res2.success, true);
      const exp2 = res2.expiresAt!.getTime();

      // exp2 should be approximately exp1 + 30 days
      const diffDays = Math.round((exp2 - exp1) / (24 * 60 * 60 * 1000));
      assert.equal(diffDays, 30);
    });
  });
});
