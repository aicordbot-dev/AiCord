/**
 * scripts/seed-lifetime-license.ts
 * Administrative CLI tool to generate and seed a permanent Lifetime subscription
 * for a specific guild and owner into MongoDB.
 *
 * Usage:
 *   pnpm tsx scripts/seed-lifetime-license.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

// Load environment variables before importing DB
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { connectDB } from '@/lib/db';
import { generateLicenseKey } from '@/lib/premium/entitlements';
import {
  GuildSubscription,
  type GuildFeatures,
} from '@/models/GuildSubscription';

const TARGET_GUILD_ID = '1567393420127772712';
const TARGET_OWNER_ID = '1271699163410599977';

async function main() {
  console.log('💎 Seeding Permanent Lifetime License...');
  console.log(`Guild ID: ${TARGET_GUILD_ID}`);
  console.log(`Owner ID: ${TARGET_OWNER_ID}`);

  // 1. Connect to MongoDB
  await connectDB();
  console.log('✅ Connected to MongoDB.');

  // 2. Generate permanent Lifetime license key
  const licenseKey = generateLicenseKey('lifetime');
  console.log(`🔑 Generated Lifetime Key: ${licenseKey}`);

  // 3. Define lifetime features: all unlocked
  const lifetimeFeatures: GuildFeatures = {
    maxBuildsPerMonth: -1,
    maxTickets: -1,
    maxShopItems: -1,
    unlockedThemes: ['cyberpunk', 'midnight', 'emerald', 'gold', 'retro', 'frost'],
    hasWhatsAppBridge: true,
    has247Radio: true,
    hasBossRaids: true,
    hasServerBackups: true,
    hasAiTldr: true,
  };

  // 4. Upsert GuildSubscription document
  const activatedAt = new Date();
  const subscription = await GuildSubscription.findOneAndUpdate(
    { guildId: TARGET_GUILD_ID },
    {
      $set: {
        tier: 'lifetime',
        ownerId: TARGET_OWNER_ID,
        licenseKey,
        activatedAt,
        expiresAt: null,
        features: lifetimeFeatures,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  console.log('\n======================================================');
  console.log('🎉 LIFETIME SUBSCRIPTION SEEDED SUCCESSFULLY');
  console.log('======================================================');
  console.log(`Guild ID:      ${subscription.guildId}`);
  console.log(`Tier:          ${subscription.tier.toUpperCase()}`);
  console.log(`Owner ID:      ${subscription.ownerId}`);
  console.log(`License Key:   ${subscription.licenseKey}`);
  console.log(`Activated At:  ${subscription.activatedAt.toISOString()}`);
  console.log(`Expires At:    ${subscription.expiresAt === null ? 'Never (Permanent)' : subscription.expiresAt}`);
  console.log('\nActive Features:');
  console.log(`  • Monthly Builds:   Unlimited (${subscription.features.maxBuildsPerMonth})`);
  console.log(`  • Active Tickets:   Unlimited (${subscription.features.maxTickets})`);
  console.log(`  • Shop Items:       Unlimited (${subscription.features.maxShopItems})`);
  console.log(`  • Unlocked Themes:  ${subscription.features.unlockedThemes.join(', ')}`);
  console.log(`  • WhatsApp Bridge:  ${subscription.features.hasWhatsAppBridge ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  • 24/7 Radio:       ${subscription.features.has247Radio ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  • Boss Raids:       ${subscription.features.hasBossRaids ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  • Server Backups:   ${subscription.features.hasServerBackups ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  • AI TL;DR:         ${subscription.features.hasAiTldr ? 'ENABLED' : 'DISABLED'}`);
  console.log('======================================================');
  console.log('Manual Redemption Key (if needed):');
  console.log(`${licenseKey}`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB.');
}

main().catch((err) => {
  console.error('❌ Failed to seed lifetime license:', err);
  process.exit(1);
});
