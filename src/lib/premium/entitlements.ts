/**
 * src/lib/premium/entitlements.ts
 * Server-Wide Subscription & Entitlement Engine for AiCord.
 *
 * Provides:
 * - Multi-tier subscription matrix (Free, Pro, Ultimate, Lifetime)
 * - HMAC-signed license key generation and cryptographic verification
 * - One-time key redemption with double-redemption prevention
 * - Expiration checking with automated fallback to Free tier
 * - Granular feature gating across all bot services
 * - High-speed deterministic in-memory test store for zero-network testing
 */

import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import {
  GuildSubscription,
  type IGuildSubscription,
  type SubscriptionTier,
  type GuildFeatures,
} from '@/models/GuildSubscription';

export type { IGuildSubscription, SubscriptionTier, GuildFeatures };

// ─── HMAC Secret & Signature Configuration ───────────────────────────────────

let customSecret: string | null = null;

export function setLicenseSecretForTest(secret: string | null): void {
  customSecret = secret;
}

function getHmacSecret(): string {
  return customSecret ?? process.env.LICENSE_HMAC_SECRET ?? 'aicord-secure-hmac-license-secret-2026';
}

// ─── Tier Definitions & Limit Matrix ─────────────────────────────────────────

export interface TierLimitsInfo {
  tier: SubscriptionTier;
  name: string;
  badge: string;
  description: string;
  features: GuildFeatures;
  details: {
    buildsPerMonth: string;
    tickets: string;
    shopItems: string;
    themes: string;
    whatsapp: string;
    radio: string;
    backups: string;
    bossRaids: string;
    aiTldr: string;
  };
}

export const TIER_BADGES: Record<SubscriptionTier, string> = {
  free: '🆓 Free',
  pro: '⚡ Pro',
  ultimate: '👑 Ultimate',
  lifetime: '♾️ Lifetime',
};

export const TIER_DEFINITIONS: Record<SubscriptionTier, TierLimitsInfo> = {
  free: {
    tier: 'free',
    name: 'Free',
    badge: '🆓 Free',
    description: 'Essential server architect tools for starter communities.',
    features: {
      maxBuildsPerMonth: 3,
      maxTickets: 3,
      maxShopItems: 10,
      unlockedThemes: ['cyberpunk', 'frost'],
      hasWhatsAppBridge: false,
      has247Radio: false,
      hasBossRaids: false,
      hasServerBackups: false,
      hasAiTldr: false,
    },
    details: {
      buildsPerMonth: '3 builds/mo',
      tickets: '1 category (max 3 open)',
      shopItems: '10 items',
      themes: '2 themes (Cyberpunk, Frost)',
      whatsapp: 'None',
      radio: 'None',
      backups: 'None',
      bossRaids: 'None',
      aiTldr: 'None',
    },
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    badge: '⚡ Pro',
    description: 'Advanced management & automation for growing communities.',
    features: {
      maxBuildsPerMonth: 15,
      maxTickets: 25,
      maxShopItems: 50,
      unlockedThemes: ['cyberpunk', 'midnight', 'emerald', 'gold', 'retro', 'frost'],
      hasWhatsAppBridge: true,
      has247Radio: false,
      hasBossRaids: true,
      hasServerBackups: true,
      hasAiTldr: false,
    },
    details: {
      buildsPerMonth: '15 builds/mo',
      tickets: '5 categories (max 25 open)',
      shopItems: '50 items',
      themes: 'All 6 themes + 4 bar styles',
      whatsapp: 'Announcements only',
      radio: '3 radio stations',
      backups: '5 server backups',
      bossRaids: '1 raid/week',
      aiTldr: 'None',
    },
  },
  ultimate: {
    tier: 'ultimate',
    name: 'Ultimate',
    badge: '👑 Ultimate',
    description: 'Powerhouse infrastructure with unlimited scaling and full AI.',
    features: {
      maxBuildsPerMonth: -1,
      maxTickets: -1,
      maxShopItems: -1,
      unlockedThemes: ['cyberpunk', 'midnight', 'emerald', 'gold', 'retro', 'frost'],
      hasWhatsAppBridge: true,
      has247Radio: true,
      hasBossRaids: true,
      hasServerBackups: true,
      hasAiTldr: true,
    },
    details: {
      buildsPerMonth: 'Unlimited',
      tickets: 'Unlimited',
      shopItems: 'Unlimited',
      themes: 'All 6 themes + Custom Hex',
      whatsapp: 'Full bridge (Panic button + Modmail)',
      radio: '24/7 endless radio',
      backups: '20 server backups',
      bossRaids: 'Unlimited boss raids',
      aiTldr: '100 TL;DR summaries/mo',
    },
  },
  lifetime: {
    tier: 'lifetime',
    name: 'Lifetime',
    badge: '♾️ Lifetime',
    description: 'Permanent VIP patron status with all perks unlocked forever.',
    features: {
      maxBuildsPerMonth: -1,
      maxTickets: -1,
      maxShopItems: -1,
      unlockedThemes: ['cyberpunk', 'midnight', 'emerald', 'gold', 'retro', 'frost'],
      hasWhatsAppBridge: true,
      has247Radio: true,
      hasBossRaids: true,
      hasServerBackups: true,
      hasAiTldr: true,
    },
    details: {
      buildsPerMonth: 'Unlimited forever',
      tickets: 'Unlimited forever',
      shopItems: 'Unlimited forever',
      themes: 'All themes + custom branding + hex',
      whatsapp: 'Full WhatsApp suite forever',
      radio: '24/7 endless radio forever',
      backups: 'Unlimited backups',
      bossRaids: 'Unlimited boss raids',
      aiTldr: 'Unlimited AI TL;DR + VIP badge',
    },
  },
};

// ─── Deterministic In-Memory Test Store ──────────────────────────────────────

let testModeActive = false;
const testSubscriptions = new Map<string, IGuildSubscription>();
const testRedeemedKeys = new Set<string>();

export function enableTestMode(enabled: boolean = true): void {
  testModeActive = enabled;
  if (!enabled) {
    clearTestStore();
  }
}

export function clearTestStore(): void {
  testSubscriptions.clear();
  testRedeemedKeys.clear();
  customSecret = null;
}

export function isTestMode(): boolean {
  return testModeActive || process.env.NODE_ENV === 'test';
}

export function setTestSubscription(
  guildId: string,
  data: Partial<IGuildSubscription>,
): IGuildSubscription {
  const current = testSubscriptions.get(guildId);
  const tier = data.tier ?? current?.tier ?? 'free';
  const sub = {
    guildId,
    tier,
    licenseKey: data.licenseKey ?? current?.licenseKey,
    ownerId: data.ownerId ?? current?.ownerId ?? '',
    activatedAt: data.activatedAt ?? current?.activatedAt ?? new Date(),
    expiresAt: data.expiresAt !== undefined ? data.expiresAt : current?.expiresAt ?? null,
    features: data.features ?? current?.features ?? { ...TIER_DEFINITIONS[tier].features },
    customBranding: data.customBranding ?? current?.customBranding,
    createdAt: data.createdAt ?? current?.createdAt ?? new Date(),
    updatedAt: new Date(),
  } as unknown as IGuildSubscription;

  testSubscriptions.set(guildId, sub);
  return sub;
}

// ─── Cryptographic License Key Generation & Verification ─────────────────────

/**
 * Computes an 8-character uppercase HMAC checksum for a key body.
 */
function computeChecksum(body: string): string {
  return crypto
    .createHmac('sha256', getHmacSecret())
    .update(body)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

/**
 * Generates an HMAC-signed license key in the format:
 * `AICORD-<TIER>-<PAYLOAD>-<CHECKSUM>`
 *
 * Example: `AICORD-PRO-30D-A1B2C3D4-E5F67890` or `AICORD-LIFETIME-PERM-A1B2C3D4-E5F67890`
 */
export function generateLicenseKey(tier: SubscriptionTier, durationDays?: number): string {
  const normalizedTier = tier.toUpperCase();
  const nonce = crypto.randomBytes(4).toString('hex').toUpperCase();

  let payload: string;
  if (tier === 'lifetime' || durationDays === undefined || durationDays === 0) {
    payload = `PERM-${nonce}`;
  } else {
    payload = `${Math.max(1, Math.floor(durationDays))}D-${nonce}`;
  }

  const body = `AICORD-${normalizedTier}-${payload}`;
  const checksum = computeChecksum(body);

  return `${body}-${checksum}`;
}

export interface KeyVerificationResult {
  valid: boolean;
  tier?: SubscriptionTier;
  durationDays?: number;
  error?: string;
}

/**
 * Verifies an HMAC-signed license key format, tier, and signature.
 */
export function verifyLicenseKey(licenseKey: string): KeyVerificationResult {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { valid: false, error: 'License key is missing or not a string.' };
  }

  const parts = licenseKey.trim().toUpperCase().split('-');
  if (parts.length < 5 || parts[0] !== 'AICORD') {
    return { valid: false, error: 'Invalid license key format. Expected format: AICORD-<TIER>-<DURATION>-<NONCE>-<CHECKSUM>.' };
  }

  const tierStr = parts[1].toLowerCase();
  if (tierStr !== 'free' && tierStr !== 'pro' && tierStr !== 'ultimate' && tierStr !== 'lifetime') {
    return { valid: false, error: `Invalid subscription tier '${parts[1]}' in license key.` };
  }

  const checksum = parts[parts.length - 1];
  const body = parts.slice(0, parts.length - 1).join('-');
  const expectedChecksum = computeChecksum(body);

  if (checksum !== expectedChecksum) {
    return { valid: false, error: 'Invalid license key signature or checksum. Key may be forged or corrupted.' };
  }

  // Parse duration from payload (part 2)
  const durationPart = parts[2];
  let durationDays: number | undefined;

  if (tierStr === 'lifetime' || durationPart === 'PERM') {
    durationDays = undefined;
  } else if (durationPart.endsWith('D')) {
    const parsed = parseInt(durationPart.slice(0, -1), 10);
    durationDays = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  } else {
    durationDays = 30;
  }

  return {
    valid: true,
    tier: tierStr as SubscriptionTier,
    durationDays,
  };
}

// ─── Status & Active Tier Resolution ─────────────────────────────────────────

/**
 * Checks whether a guild's subscription has expired.
 */
export function isSubscriptionActive(sub: {
  tier: SubscriptionTier;
  expiresAt?: Date | null;
}): boolean {
  if (sub.tier === 'free' || sub.tier === 'lifetime') return true;
  if (!sub.expiresAt) return true;
  return new Date(sub.expiresAt).getTime() > Date.now();
}

/**
 * Resolves the currently active subscription tier, falling back to 'free' if expired.
 */
export function getActiveSubscriptionTier(sub: {
  tier: SubscriptionTier;
  expiresAt?: Date | null;
}): SubscriptionTier {
  if (sub.tier === 'free' || sub.tier === 'lifetime') return sub.tier;
  if (!sub.expiresAt) return sub.tier;
  return new Date(sub.expiresAt).getTime() > Date.now() ? sub.tier : 'free';
}

/**
 * Resolves active guild feature limits based on current subscription and expiration.
 */
export function getActiveFeatures(sub: {
  tier: SubscriptionTier;
  expiresAt?: Date | null;
  features?: GuildFeatures;
}): GuildFeatures {
  const activeTier = getActiveSubscriptionTier(sub);
  return TIER_DEFINITIONS[activeTier].features;
}

// ─── Guild Subscription Retrieval ─────────────────────────────────────────────

/**
 * Retrieves the guild subscription record, initializing a default Free tier if not found.
 */
export async function getGuildSubscription(guildId: string): Promise<IGuildSubscription> {
  if (!guildId) {
    throw new Error('[EntitlementEngine] guildId is required to fetch subscription');
  }

  if (isTestMode()) {
    const existing = testSubscriptions.get(guildId);
    if (existing) {
      return existing;
    }

    const defaultSub = {
      guildId,
      tier: 'free' as SubscriptionTier,
      ownerId: '',
      activatedAt: new Date(),
      expiresAt: null,
      features: { ...TIER_DEFINITIONS.free.features },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IGuildSubscription;

    testSubscriptions.set(guildId, defaultSub);
    return defaultSub;
  }

  await connectDB();
  let sub = await GuildSubscription.findOne({ guildId });
  if (!sub) {
    sub = await GuildSubscription.create({
      guildId,
      tier: 'free',
      ownerId: '',
      activatedAt: new Date(),
      expiresAt: null,
      features: { ...TIER_DEFINITIONS.free.features },
    });
  }

  return sub;
}

// ─── Feature Access Check ─────────────────────────────────────────────────────

/**
 * Checks whether a server has access to a specific feature or numeric limit.
 */
export async function checkFeatureAccess(
  guildId: string,
  feature: keyof GuildFeatures,
): Promise<{
  allowed: boolean;
  tier: SubscriptionTier;
  limit?: number;
  reason?: string;
}> {
  const sub = await getGuildSubscription(guildId);
  const activeTier = getActiveSubscriptionTier(sub);
  const activeFeatures = getActiveFeatures(sub);

  const value = activeFeatures[feature];

  // Boolean feature gate
  if (typeof value === 'boolean') {
    if (value) {
      return { allowed: true, tier: activeTier };
    }
    return {
      allowed: false,
      tier: activeTier,
      reason: `Feature '${String(feature)}' requires an upgraded subscription tier (Pro or higher). Upgrade with /premium.`,
    };
  }

  // Numeric limit (e.g. maxBuildsPerMonth, maxTickets, maxShopItems)
  if (typeof value === 'number') {
    return {
      allowed: value === -1 || value > 0,
      tier: activeTier,
      limit: value,
    };
  }

  // Array of unlocked themes
  if (Array.isArray(value)) {
    return {
      allowed: true,
      tier: activeTier,
      limit: value.length,
    };
  }

  return {
    allowed: false,
    tier: activeTier,
    reason: `Unknown feature '${String(feature)}'.`,
  };
}

/**
 * Helper to check whether a specific visual theme is unlocked for a guild.
 */
export async function isThemeUnlocked(guildId: string, themeId: string): Promise<boolean> {
  const sub = await getGuildSubscription(guildId);
  const features = getActiveFeatures(sub);
  return features.unlockedThemes.includes(themeId.toLowerCase().trim());
}

// ─── License Key Redemption ───────────────────────────────────────────────────

export interface RedeemResult {
  success: boolean;
  tier: SubscriptionTier;
  expiresAt?: Date;
  error?: string;
}

/**
 * Redeems an HMAC-signed license key for a server, updating subscription status and features.
 */
export async function redeemLicenseKey(
  guildId: string,
  licenseKey: string,
  userId: string,
): Promise<RedeemResult> {
  if (!guildId) {
    return { success: false, tier: 'free', error: 'Missing guildId.' };
  }

  const cleanKey = (licenseKey ?? '').trim().toUpperCase();
  const verification = verifyLicenseKey(cleanKey);

  if (!verification.valid || !verification.tier) {
    return {
      success: false,
      tier: 'free',
      error: verification.error ?? 'Invalid license key format or signature.',
    };
  }

  const newTier = verification.tier;
  const newFeatures = { ...TIER_DEFINITIONS[newTier].features };

  // Check double redemption in test store
  if (isTestMode()) {
    if (testRedeemedKeys.has(cleanKey)) {
      return {
        success: false,
        tier: 'free',
        error: 'This license key has already been redeemed.',
      };
    }

    const currentSub = await getGuildSubscription(guildId);
    let newExpiresAt: Date | null = null;

    if (newTier !== 'lifetime') {
      const durationDays = verification.durationDays ?? 30;
      const durationMs = durationDays * 24 * 60 * 60 * 1000;

      // If active and same tier, extend existing expiration
      if (
        isSubscriptionActive(currentSub) &&
        currentSub.tier === newTier &&
        currentSub.expiresAt
      ) {
        newExpiresAt = new Date(new Date(currentSub.expiresAt).getTime() + durationMs);
      } else {
        newExpiresAt = new Date(Date.now() + durationMs);
      }
    }

    const updatedSub = {
      guildId,
      tier: newTier,
      licenseKey: cleanKey,
      ownerId: userId,
      activatedAt: new Date(),
      expiresAt: newExpiresAt,
      features: newFeatures,
      createdAt: currentSub.createdAt ?? new Date(),
      updatedAt: new Date(),
    } as unknown as IGuildSubscription;

    testSubscriptions.set(guildId, updatedSub);
    testRedeemedKeys.add(cleanKey);

    return {
      success: true,
      tier: newTier,
      expiresAt: newExpiresAt ?? undefined,
    };
  }

  // MongoDB production persistence
  await connectDB();

  // Check if key has already been redeemed anywhere
  const keyAlreadyUsed = await GuildSubscription.findOne({ licenseKey: cleanKey });
  if (keyAlreadyUsed) {
    return {
      success: false,
      tier: 'free',
      error: 'This license key has already been redeemed.',
    };
  }

  const currentSub = await getGuildSubscription(guildId);
  let newExpiresAt: Date | null = null;

  if (newTier !== 'lifetime') {
    const durationDays = verification.durationDays ?? 30;
    const durationMs = durationDays * 24 * 60 * 60 * 1000;

    if (
      isSubscriptionActive(currentSub) &&
      currentSub.tier === newTier &&
      currentSub.expiresAt
    ) {
      newExpiresAt = new Date(new Date(currentSub.expiresAt).getTime() + durationMs);
    } else {
      newExpiresAt = new Date(Date.now() + durationMs);
    }
  }

  await GuildSubscription.findOneAndUpdate(
    { guildId },
    {
      $set: {
        tier: newTier,
        licenseKey: cleanKey,
        ownerId: userId,
        activatedAt: new Date(),
        expiresAt: newExpiresAt,
        features: newFeatures,
      },
    },
    { upsert: true, new: true },
  );

  return {
    success: true,
    tier: newTier,
    expiresAt: newExpiresAt ?? undefined,
  };
}
