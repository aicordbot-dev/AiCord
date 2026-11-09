/**
 * src/commands/premium.ts
 * Slash Command Handlers for AiCord Premium Subscription & Entitlement Engine.
 *
 * Implements:
 * - /premium status: Embed showing server tier badge, expiration, active meters, and upgrade info
 * - /premium features: Themed comparison matrix embed of all subscription tiers
 * - /premium redeem <license_key>: Redeems license key and activates tier (Requires MANAGE_GUILD)
 * - /premium buy <tier> [billing]: Generates instant Stripe Checkout link button for server upgrade
 */

import {
  ApplicationCommandOptionType,
  ComponentType,
  ButtonStyle,
  type APIChatInputApplicationCommandInteraction,
  type APIEmbed,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { errorEmbed } from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import {
  getGuildSubscription,
  redeemLicenseKey,
  getActiveSubscriptionTier,
  isSubscriptionActive,
  TIER_BADGES,
  TIER_DEFINITIONS,
  type SubscriptionTier,
} from '@/lib/premium/entitlements';
import {
  createCheckoutSession,
  type CheckoutTier,
  type CheckoutInterval,
} from '@/lib/stripe';
import { siteConfig } from '@/config/site';

// ─── Option Helper ────────────────────────────────────────────────────────────

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }> | undefined,
  name: string,
): T | undefined {
  if (!options) return undefined;
  const match = options.find((o) => o.name === name);
  return match ? (match.value as T) : undefined;
}

// ─── Colors for Tiers ─────────────────────────────────────────────────────────

const TIER_COLORS: Record<SubscriptionTier, number> = {
  free: 0x99aab5, // Slate Gray
  pro: 0x00f0ff, // Vibrant Cyan
  ultimate: 0xffd700, // Gold
  lifetime: 0x9b59b6, // Amethyst Purple
};

// ─── Embed Builders ───────────────────────────────────────────────────────────

export function buildPremiumStatusEmbed(
  guildId: string,
  sub: {
    tier: SubscriptionTier;
    licenseKey?: string;
    expiresAt?: Date | null;
  },
): APIEmbed {
  const activeTier = getActiveSubscriptionTier(sub);
  const isActive = isSubscriptionActive(sub);
  const badge = TIER_BADGES[sub.tier];
  const activeLimits = TIER_DEFINITIONS[activeTier].details;
  const color = TIER_COLORS[activeTier];

  let expirationText: string;
  if (sub.tier === 'lifetime') {
    expirationText = '♾️ **Permanent Patron** (Never Expires)';
  } else if (sub.tier === 'free') {
    expirationText = '🆓 **Free Tier** (No Expiration)';
  } else if (!isActive && sub.expiresAt) {
    const expiredDate = new Date(sub.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    expirationText = `⚠️ **Expired on ${expiredDate}**\n*(Features reverted to Free tier limits)*`;
  } else if (sub.expiresAt) {
    const expiresDate = new Date(sub.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const remainingDays = Math.max(
      0,
      Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );
    expirationText = `📅 **Expires in ${remainingDays} days**\n*(${expiresDate})*`;
  } else {
    expirationText = '♾️ Active (No Expiration Set)';
  }

  const maskedKey = sub.licenseKey
    ? `\`••••••••${sub.licenseKey.slice(-8)}\``
    : '*None (Default Free)*';

  return {
    title: `💎 Server Subscription Status`,
    description: `Current subscription tier and active entitlement limits for this server.`,
    color,
    fields: [
      {
        name: '👑 Current Tier',
        value: `**${badge}**${!isActive && sub.tier !== 'free' ? ' *(Expired)*' : ''}`,
        inline: true,
      },
      {
        name: '⏳ Expiration Status',
        value: expirationText,
        inline: true,
      },
      {
        name: '🔑 License Key',
        value: maskedKey,
        inline: true,
      },
      {
        name: '📊 Active Feature Entitlements',
        value:
          `• **Builds:** \`${activeLimits.buildsPerMonth}\`\n` +
          `• **Tickets:** \`${activeLimits.tickets}\`\n` +
          `• **Shop Items:** \`${activeLimits.shopItems}\`\n` +
          `• **Visual Themes:** \`${activeLimits.themes}\`\n` +
          `• **Server Backups:** \`${activeLimits.backups}\`\n` +
          `• **Radio Stations:** \`${activeLimits.radio}\`\n` +
          `• **WhatsApp Bridge:** \`${activeLimits.whatsapp}\`\n` +
          `• **Boss Raids:** \`${activeLimits.bossRaids}\`\n` +
          `• **AI TL;DR:** \`${activeLimits.aiTldr}\``,
        inline: false,
      },
      {
        name: '🚀 Upgrade & Renewal',
        value:
          sub.tier === 'lifetime'
            ? '⭐ This server holds permanent lifetime VIP status. All current and future perks remain unlocked forever!'
            : 'To upgrade or extend your tier instantly, use `/premium buy tier:<pro|ultimate|lifetime>` or redeem an existing key with `/premium redeem <license_key>`.\nExplore all tiers and limits with `/premium features`.',
        inline: false,
      },
    ],
    footer: {
      text: `AiCord Premium Entitlement Engine • Guild: ${guildId}`,
    },
  };
}

export function buildPremiumFeaturesEmbed(): APIEmbed {
  const free = TIER_DEFINITIONS.free.details;
  const pro = TIER_DEFINITIONS.pro.details;
  const ultimate = TIER_DEFINITIONS.ultimate.details;
  const lifetime = TIER_DEFINITIONS.lifetime.details;

  return {
    title: '✨ AiCord Subscription Tiers & Feature Matrix',
    description:
      'Explore server-wide subscription tiers. Upgrades empower your entire community, unlocking higher limits, automated bridges, and advanced features for all members!',
    color: 0x5865f2,
    fields: [
      {
        name: `${TIER_BADGES.free} Tier`,
        value:
          `• **Builds:** ${free.buildsPerMonth}\n` +
          `• **Tickets:** ${free.tickets}\n` +
          `• **Shop Items:** ${free.shopItems}\n` +
          `• **Themes:** ${free.themes}\n` +
          `• **WhatsApp:** ❌ None\n` +
          `• **Radio:** ❌ None\n` +
          `• **Backups:** ❌ None\n` +
          `• **Boss Raids:** ❌ None\n` +
          `• **AI TL;DR:** ❌ None`,
        inline: true,
      },
      {
        name: `${TIER_BADGES.pro} Tier`,
        value:
          `• **Builds:** ${pro.buildsPerMonth}\n` +
          `• **Tickets:** ${pro.tickets}\n` +
          `• **Shop Items:** ${pro.shopItems}\n` +
          `• **Themes:** ${pro.themes}\n` +
          `• **WhatsApp:** 📢 ${pro.whatsapp}\n` +
          `• **Radio:** 📻 ${pro.radio}\n` +
          `• **Backups:** 💾 ${pro.backups}\n` +
          `• **Boss Raids:** ⚔️ ${pro.bossRaids}\n` +
          `• **AI TL;DR:** ❌ None`,
        inline: true,
      },
      {
        name: `${TIER_BADGES.ultimate} Tier`,
        value:
          `• **Builds:** ♾️ ${ultimate.buildsPerMonth}\n` +
          `• **Tickets:** ♾️ ${ultimate.tickets}\n` +
          `• **Shop Items:** ♾️ ${ultimate.shopItems}\n` +
          `• **Themes:** 🎨 ${ultimate.themes}\n` +
          `• **WhatsApp:** 🌐 ${ultimate.whatsapp}\n` +
          `• **Radio:** 📻 ${ultimate.radio}\n` +
          `• **Backups:** 💾 ${ultimate.backups}\n` +
          `• **Boss Raids:** ⚔️ ${ultimate.bossRaids}\n` +
          `• **AI TL;DR:** 🤖 ${ultimate.aiTldr}`,
        inline: true,
      },
      {
        name: `${TIER_BADGES.lifetime} Tier`,
        value:
          `• **All Ultimate Perks Forever** (null expiration)\n` +
          `• **Builds:** ♾️ ${lifetime.buildsPerMonth}\n` +
          `• **Backups:** 💾 ${lifetime.backups}\n` +
          `• **VIP Guild Badge:** 👑 Exclusive patron status\n` +
          `• **Priority Queues:** ⚡ Instant AI processing\n` +
          `• **WhatsApp Suite:** 🌐 Full bridge suite permanently\n` +
          `• **No recurring payments or renewals required!**`,
        inline: false,
      },
    ],
    footer: {
      text: 'Upgrade instantly with /premium buy or activate with /premium redeem <license_key>',
    },
  };
}

export function buildRedemptionSuccessEmbed(
  guildId: string,
  tier: SubscriptionTier,
  userId: string,
  expiresAt?: Date,
): APIEmbed {
  const badge = TIER_BADGES[tier];
  const color = TIER_COLORS[tier];
  const limits = TIER_DEFINITIONS[tier].details;

  let expirationText: string;
  if (tier === 'lifetime') {
    expirationText = '♾️ **Permanent Patron** (Never Expires)';
  } else if (expiresAt) {
    const formatted = new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    expirationText = `📅 **Expires on ${formatted}**`;
  } else {
    expirationText = '♾️ Active (No Expiration)';
  }

  return {
    title: '🎉 Server Subscription Activated!',
    description: `Congratulations! **${badge}** has been successfully activated for **this server**! All members now have immediate access to upgraded features.`,
    color,
    fields: [
      {
        name: '👑 Activated Tier',
        value: `**${badge}**`,
        inline: true,
      },
      {
        name: '⏳ Expiration',
        value: expirationText,
        inline: true,
      },
      {
        name: '👤 Activated By',
        value: `<@${userId}>`,
        inline: true,
      },
      {
        name: '✨ Unlocked Server Capabilities',
        value:
          `• **Monthly Builds:** \`${limits.buildsPerMonth}\`\n` +
          `• **Support Tickets:** \`${limits.tickets}\`\n` +
          `• **Shop Items:** \`${limits.shopItems}\`\n` +
          `• **Visual Themes:** \`${limits.themes}\`\n` +
          `• **Server Backups:** \`${limits.backups}\`\n` +
          `• **WhatsApp Bridge:** \`${limits.whatsapp}\`\n` +
          `• **Boss Raids:** \`${limits.bossRaids}\`\n` +
          `• **Radio Stations:** \`${limits.radio}\``,
        inline: false,
      },
    ],
    footer: {
      text: `AiCord Premium Entitlement Engine • Guild: ${guildId}`,
    },
  };
}

export function buildPremiumBuyEmbed(
  tier: CheckoutTier,
  billing: 'monthly' | 'yearly',
  guildId?: string,
): { embed: APIEmbed; priceText: string } {
  const tierName =
    tier === 'pro'
      ? 'Pro Guild'
      : tier === 'ultimate'
        ? 'Ultimate Sovereign'
        : 'Lifetime Sovereign';

  const badge = TIER_BADGES[tier];
  const color = TIER_COLORS[tier];
  const limits = TIER_DEFINITIONS[tier].details;

  let priceText: string;
  let billingText: string;

  if (tier === 'lifetime') {
    priceText = '$199';
    billingText = '$199 one-time payment (Lifetime Permanent Pass)';
  } else if (tier === 'pro') {
    if (billing === 'yearly') {
      priceText = '$108/yr';
      billingText = '$108 billed annually ($9/mo, 25% discount)';
    } else {
      priceText = '$12/mo';
      billingText = '$12 billed monthly';
    }
  } else {
    // ultimate
    if (billing === 'yearly') {
      priceText = '$276/yr';
      billingText = '$276 billed annually ($23/mo, 20% discount)';
    } else {
      priceText = '$29/mo';
      billingText = '$29 billed monthly';
    }
  }

  const embed: APIEmbed = {
    title: `💳 AiCord Premium Checkout • ${tierName}`,
    description: `Upgrade **${guildId ? `this server (\`${guildId}\`)` : 'your community'}** to **${badge}**. Experience enterprise power, higher limits, and advanced AI features immediately after payment confirmation.`,
    color,
    fields: [
      {
        name: '💰 Selected Plan & Price',
        value: `• **Tier:** **${badge}**\n• **Amount:** \`${priceText}\`\n• **Billing:** ${billingText}`,
        inline: false,
      },
      {
        name: '✨ Active Server Perks',
        value:
          `• **Monthly AI Builds:** \`${limits.buildsPerMonth}\`\n` +
          `• **Support Tickets:** \`${limits.tickets}\`\n` +
          `• **Custom Shop Items:** \`${limits.shopItems}\`\n` +
          `• **Themes & Palettes:** \`${limits.themes}\`\n` +
          `• **Cloud Backups:** \`${limits.backups}\`\n` +
          `• **24/7 Voice Radio:** \`${limits.radio}\`\n` +
          `• **WhatsApp Bridge:** \`${limits.whatsapp}\`\n` +
          `• **Boss Raids & AI:** \`${limits.bossRaids}\``,
        inline: false,
      },
      {
        name: '🔒 Instant & Secure Fulfillment',
        value:
          guildId
            ? `Your server (\`${guildId}\`) will be automatically upgraded as soon as the Stripe checkout completes.`
            : `A cryptographic HMAC license key will be generated for your account, redeemable anywhere with \`/premium redeem\`.`,
        inline: false,
      },
    ],
    footer: {
      text: 'AiCord Secure Stripe Checkout • Instant Activation',
    },
  };

  return { embed, priceText };
}

export function buildPremiumBuyComponents(
  checkoutUrl: string,
  priceText: string,
): unknown[] {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url || 'https://aicord.vercel.app';

  return [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ButtonStyle.Link,
          label: `Pay with Stripe (${priceText})`,
          url: checkoutUrl,
          emoji: { name: '💳' },
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Link,
          label: 'View Feature Matrix',
          url: `${siteUrl}/#pricing`,
          emoji: { name: '🌐' },
        },
      ],
    },
  ];
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handlePremiumStatusSubcommand(
  token: string,
  guildId: string,
): Promise<void> {
  const sub = await getGuildSubscription(guildId);
  const embed = buildPremiumStatusEmbed(guildId, sub);
  await editInteractionResponse(token, { embeds: [embed] });
}

export async function handlePremiumFeaturesSubcommand(token: string): Promise<void> {
  const embed = buildPremiumFeaturesEmbed();
  await editInteractionResponse(token, { embeds: [embed] });
}

export async function handlePremiumRedeemSubcommand(
  token: string,
  guildId: string,
  userId: string,
  interaction: APIChatInputApplicationCommandInteraction,
  subOptions?: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const memberPerms = interaction.member?.permissions;
  const hasManageGuild =
    hasPermission(memberPerms ?? '0', PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms ?? '0', PermissionFlags.ADMINISTRATOR);

  if (!hasManageGuild) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** permission to redeem subscription license keys.',
        ),
      ],
    });
    return;
  }

  const rawKey =
    getOption<string>(subOptions, 'license_key') ??
    getOption<string>(subOptions, 'key') ??
    '';

  const cleanKey = rawKey.trim();
  if (!cleanKey) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Missing License Key',
          'Please provide a valid AiCord license key to redeem:\n`/premium redeem key:AICORD-...`',
        ),
      ],
    });
    return;
  }

  const result = await redeemLicenseKey(guildId, cleanKey, userId);

  if (!result.success) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Redemption Failed',
          result.error ?? 'Failed to redeem license key. Please verify the key and try again.',
        ),
      ],
    });
    return;
  }

  const embed = buildRedemptionSuccessEmbed(guildId, result.tier, userId, result.expiresAt);
  await editInteractionResponse(token, { embeds: [embed] });
}

export async function handlePremiumBuySubcommand(
  token: string,
  guildId: string,
  userId: string,
  subOptions?: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const rawTier = (getOption<string>(subOptions, 'tier') ?? 'pro').toLowerCase();
  const validTier: CheckoutTier =
    rawTier === 'ultimate' ? 'ultimate' : rawTier === 'lifetime' ? 'lifetime' : 'pro';

  const rawBilling = (getOption<string>(subOptions, 'billing') ?? 'monthly').toLowerCase();
  const validBilling: CheckoutInterval =
    validTier === 'lifetime' ? 'lifetime' : rawBilling === 'yearly' ? 'yearly' : 'monthly';

  const checkoutSession = await createCheckoutSession({
    tier: validTier,
    interval: validBilling,
    guildId: guildId || undefined,
    userId: userId || undefined,
  });

  const { embed, priceText } = buildPremiumBuyEmbed(
    validTier,
    validBilling === 'yearly' ? 'yearly' : 'monthly',
    guildId,
  );
  const components = buildPremiumBuyComponents(checkoutSession.url, priceText);

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

// ─── Main Slash Command Execution ─────────────────────────────────────────────

export async function executePremiumCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const token = interaction.token;

  const options = interaction.data.options as
    | Array<{
        name: string;
        options?: Array<{ name: string; value?: unknown }>;
      }>
    | undefined;

  const subcommand = options?.[0];
  const subOptions = subcommand?.options;

  switch (subcommand?.name) {
    case 'status':
      await handlePremiumStatusSubcommand(token, guildId);
      break;
    case 'features':
      await handlePremiumFeaturesSubcommand(token);
      break;
    case 'redeem':
      await handlePremiumRedeemSubcommand(token, guildId, userId, interaction, subOptions);
      break;
    case 'buy':
      await handlePremiumBuySubcommand(token, guildId, userId, subOptions);
      break;
    default:
      // Default to status view if no subcommand supplied
      await handlePremiumStatusSubcommand(token, guildId);
      break;
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const premiumCommand: RegisteredCommand = {
  name: 'premium',
  description: 'Manage server subscription tier, check entitlements, buy upgrades, and redeem keys',
  category: 'utility',
  options: [
    {
      name: 'status',
      description: 'View current server subscription tier, expiration, and active limits',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'features',
      description: 'View the full comparison matrix across all AiCord subscription tiers',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'buy',
      description: 'Generate an instant Stripe Checkout payment link to upgrade server tier',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'tier',
          description: 'Subscription tier to purchase',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Pro ($12/mo)', value: 'pro' },
            { name: 'Ultimate ($29/mo)', value: 'ultimate' },
            { name: 'Lifetime Sovereign ($199 one-time)', value: 'lifetime' },
          ],
        },
        {
          name: 'billing',
          description: 'Billing interval (monthly or yearly with discount)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'Monthly', value: 'monthly' },
            { name: 'Yearly (20-25% discount)', value: 'yearly' },
          ],
        },
      ],
    },
    {
      name: 'redeem',
      description: 'Redeem an AiCord license key for this server (Requires Manage Server)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'license_key',
          description: 'The AiCord license key to redeem (e.g. AICORD-PRO-...)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  execute: executePremiumCommand,
};
