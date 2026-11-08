/**
 * src/lib/skins/skin-service.ts
 * Collector Skins & Cosmetics Unlocker / Mystery Lootbox Service for AiCord.
 *
 * Implements:
 * - 10 Curated Collector Skins across 5 Rarity Tiers (Common, Rare, Epic, Legendary, Mythic)
 * - Rarity drop rates: Mythic 1%, Legendary 4%, Epic 10%, Rare 25%, Common 60%
 * - Mystery cosmetics lootbox unboxing (250 coins default cost)
 * - Duplicate skin protection with 50% coin value refund compensation
 * - Wardrobe collection tracker with visual completion progress meter [████████░░] 8/10 (80%)
 * - Skin purchasing and equipping mechanics
 * - Visual embed builders & interactive Discord component generators
 * - Full in-memory test store support for deterministic unit testing
 */

import { connectDB } from '@/lib/db';
import { UserSkins, type IUserSkins } from '@/models/UserSkins';
import { type ISkinItem, type SkinRarity } from '@/models/SkinItem';
import { EconomyUser } from '@/models/EconomyUser';
import type { DiscordEmbed } from '@/lib/discord/embeds';
import {
  buildButton,
  buildActionRow,
  type ActionRow,
  type StringSelectComponent,
} from '@/lib/discord/interaction-response';

// ─── Curated Collector Skin Catalog (10 Skins) ──────────────────────────────

export const SKIN_CATALOG: ISkinItem[] = [
  // Common (60% drop rate, 100 coins)
  {
    skinId: 'neon_blue',
    name: 'Neon Cyan Frame',
    description: 'Vibrant neon cyan glowing profile frame',
    rarity: 'common',
    type: 'card_frame',
    price: 100,
    previewHex: '#00f0ff',
    badgeEmoji: '🔷',
    isAnimated: false,
  },
  {
    skinId: 'stone_slate',
    name: 'Slate Grey Plate',
    description: 'Rugged natural slate grey mineral plate',
    rarity: 'common',
    type: 'card_frame',
    price: 100,
    previewHex: '#708090',
    badgeEmoji: '🪨',
    isAnimated: false,
  },

  // Rare (25% drop rate, 350 coins)
  {
    skinId: 'emerald_gleam',
    name: 'Emerald Glow Frame',
    description: 'Lush emerald verdant energetic glow',
    rarity: 'rare',
    type: 'card_frame',
    price: 350,
    previewHex: '#00b894',
    badgeEmoji: '🌿',
    isAnimated: false,
  },
  {
    skinId: 'sunset_amber',
    name: 'Sunset Amber Frame',
    description: 'Warm twilight dusk gradient aura',
    rarity: 'rare',
    type: 'card_frame',
    price: 350,
    previewHex: '#e17055',
    badgeEmoji: '🌅',
    isAnimated: false,
  },

  // Epic (10% drop rate, 800 coins)
  {
    skinId: 'violet_void',
    name: 'Void Violet Frame',
    description: 'Deep ethereal void matter aesthetic',
    rarity: 'epic',
    type: 'card_frame',
    price: 800,
    previewHex: '#6c5ce7',
    badgeEmoji: '🔮',
    isAnimated: false,
  },
  {
    skinId: 'crimson_overdrive',
    name: 'Crimson Overdrive Frame',
    description: 'High voltage hypercharged crimson border',
    rarity: 'epic',
    type: 'card_frame',
    price: 800,
    previewHex: '#ff003c',
    badgeEmoji: '⚡',
    isAnimated: false,
  },

  // Legendary (4% drop rate, 2,000 coins)
  {
    skinId: 'golden_sovereign',
    name: 'Golden Sovereign Frame',
    description: 'Royal regal gold adorned majesty',
    rarity: 'legendary',
    type: 'card_frame',
    price: 2000,
    previewHex: '#fdcb6e',
    badgeEmoji: '👑',
    isAnimated: false,
  },
  {
    skinId: 'cyber_glitch',
    name: 'Cyber Glitch Frame',
    description: 'Corrupted reality matrix holographic glitch',
    rarity: 'legendary',
    type: 'card_frame',
    price: 2000,
    previewHex: '#00ffea',
    badgeEmoji: '👾',
    isAnimated: false,
  },

  // Mythic (1% drop rate, 5,000 coins, isAnimated: true)
  {
    skinId: 'astral_dragon',
    name: 'Astral Dragon Frame',
    description: 'Cosmic animated draconic starfire constellation',
    rarity: 'mythic',
    type: 'card_frame',
    price: 5000,
    previewHex: '#a55eea',
    badgeEmoji: '🐉',
    isAnimated: true,
  },
  {
    skinId: 'celestial_aether',
    name: 'Celestial Aether Frame',
    description: 'Transcendent animated dimensional stardust nebula',
    rarity: 'mythic',
    type: 'card_frame',
    price: 5000,
    previewHex: '#45aaf2',
    badgeEmoji: '🌌',
    isAnimated: true,
  },
];

// ─── In-Memory Test Store ───────────────────────────────────────────────────

interface InMemoryUserSkins {
  guildId: string;
  userId: string;
  unlockedSkins: string[];
  equippedSkin: string;
  totalLootboxesOpened: number;
}

let testModeActive = false;
const testUserSkinsStore = new Map<string, InMemoryUserSkins>();
const testBalancesStore = new Map<string, number>();

function makeKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function enableTestMode(enabled: boolean = true): void {
  testModeActive = enabled;
  if (!enabled) {
    clearTestStore();
  }
}

export function clearTestStore(): void {
  testUserSkinsStore.clear();
  testBalancesStore.clear();
}

export function isTestMode(): boolean {
  return testModeActive;
}

export function setTestUserSkins(
  guildId: string,
  userId: string,
  data: Partial<InMemoryUserSkins>,
): void {
  const key = makeKey(guildId, userId);
  const existing = testUserSkinsStore.get(key) ?? {
    guildId,
    userId,
    unlockedSkins: ['neon_blue'],
    equippedSkin: 'neon_blue',
    totalLootboxesOpened: 0,
  };
  testUserSkinsStore.set(key, { ...existing, ...data });
}

export function getTestUserSkins(
  guildId: string,
  userId: string,
): IUserSkins | undefined {
  const key = makeKey(guildId, userId);
  const raw = testUserSkinsStore.get(key);
  if (!raw) return undefined;
  return JSON.parse(JSON.stringify(raw)) as IUserSkins;
}

export function setTestBalance(
  guildId: string,
  userId: string,
  balance: number,
): void {
  const key = makeKey(guildId, userId);
  testBalancesStore.set(key, Math.max(0, balance));
}

export function getTestBalance(guildId: string, userId: string): number {
  const key = makeKey(guildId, userId);
  return testBalancesStore.get(key) ?? 0;
}

// ─── Balance Helpers ────────────────────────────────────────────────────────

export async function getUserBalance(guildId: string, userId: string): Promise<number> {
  if (testModeActive) {
    const key = makeKey(guildId, userId);
    return testBalancesStore.get(key) ?? 0;
  }

  try {
    await connectDB();
    const doc = await EconomyUser.findOne({ guildId, userId });
    return doc?.wallet ?? 0;
  } catch {
    return 0;
  }
}

export async function adjustUserBalance(
  guildId: string,
  userId: string,
  delta: number,
): Promise<number> {
  if (testModeActive) {
    const key = makeKey(guildId, userId);
    const cur = testBalancesStore.get(key) ?? 0;
    const next = Math.max(0, cur + delta);
    testBalancesStore.set(key, next);
    return next;
  }

  try {
    await connectDB();
    const doc = await EconomyUser.findOneAndUpdate(
      { guildId, userId },
      { $inc: { wallet: delta } },
      { upsert: true, new: true },
    );
    return doc?.wallet ?? 0;
  } catch {
    return 0;
  }
}

// ─── Catalog Retrieval ──────────────────────────────────────────────────────

export function getSkinCatalog(): ISkinItem[] {
  return [...SKIN_CATALOG];
}

export function getSkin(skinId: string): ISkinItem | undefined {
  return SKIN_CATALOG.find((s) => s.skinId === skinId);
}

// ─── User Skins Retrieval ───────────────────────────────────────────────────

export async function getUserSkins(
  guildId: string,
  userId: string,
): Promise<IUserSkins> {
  if (testModeActive) {
    const key = makeKey(guildId, userId);
    let record = testUserSkinsStore.get(key);
    if (!record) {
      record = {
        guildId,
        userId,
        unlockedSkins: ['neon_blue'],
        equippedSkin: 'neon_blue',
        totalLootboxesOpened: 0,
      };
      testUserSkinsStore.set(key, record);
    }
    return JSON.parse(JSON.stringify(record)) as IUserSkins;
  }

  await connectDB();
  let userSkins = await UserSkins.findOne({ guildId, userId });
  if (!userSkins) {
    userSkins = await UserSkins.create({
      guildId,
      userId,
      unlockedSkins: ['neon_blue'],
      equippedSkin: 'neon_blue',
      totalLootboxesOpened: 0,
    });
  }
  return userSkins;
}

// ─── Skin Equipping ─────────────────────────────────────────────────────────

export interface EquipSkinResult {
  success: boolean;
  equippedSkin: string;
  skin?: ISkinItem;
  unlockedSkins: string[];
  guildId: string;
  userId: string;
  totalLootboxesOpened: number;
  userSkins: IUserSkins;
  error?: string;
  message?: string;
}

export async function equipSkin(
  guildId: string,
  userId: string,
  skinId: string,
): Promise<EquipSkinResult> {
  const skin = getSkin(skinId);
  const currentSkins = await getUserSkins(guildId, userId);

  if (!skin) {
    return {
      success: false,
      equippedSkin: currentSkins.equippedSkin,
      unlockedSkins: currentSkins.unlockedSkins,
      guildId,
      userId,
      totalLootboxesOpened: currentSkins.totalLootboxesOpened,
      userSkins: currentSkins,
      error: 'SKIN_NOT_FOUND',
      message: `Cosmetic skin "${skinId}" does not exist in the catalog.`,
    };
  }

  if (!currentSkins.unlockedSkins.includes(skinId)) {
    return {
      success: false,
      equippedSkin: currentSkins.equippedSkin,
      unlockedSkins: currentSkins.unlockedSkins,
      guildId,
      userId,
      totalLootboxesOpened: currentSkins.totalLootboxesOpened,
      userSkins: currentSkins,
      error: 'NOT_OWNED',
      message: `You haven't unlocked the "${skin.name}" yet! Unlock it via \`/unbox\` or buy it with \`/skins buy\`.`,
    };
  }

  if (testModeActive) {
    const key = makeKey(guildId, userId);
    const existing = testUserSkinsStore.get(key) ?? currentSkins;
    existing.equippedSkin = skinId;
    testUserSkinsStore.set(key, existing);
    const updated = JSON.parse(JSON.stringify(existing)) as IUserSkins;
    return {
      success: true,
      equippedSkin: skinId,
      skin,
      unlockedSkins: updated.unlockedSkins,
      guildId,
      userId,
      totalLootboxesOpened: updated.totalLootboxesOpened,
      userSkins: updated,
      message: `Successfully equipped ${skin.badgeEmoji} **${skin.name}**!`,
    };
  }

  await connectDB();
  const updatedDoc = await UserSkins.findOneAndUpdate(
    { guildId, userId },
    { $set: { equippedSkin: skinId } },
    { new: true, upsert: true },
  );

  return {
    success: true,
    equippedSkin: skinId,
    skin,
    unlockedSkins: updatedDoc.unlockedSkins,
    guildId,
    userId,
    totalLootboxesOpened: updatedDoc.totalLootboxesOpened,
    userSkins: updatedDoc,
    message: `Successfully equipped ${skin.badgeEmoji} **${skin.name}**!`,
  };
}

// ─── Skin Direct Purchasing ─────────────────────────────────────────────────

export interface BuySkinResult {
  success: boolean;
  skin?: ISkinItem;
  userSkins: IUserSkins;
  unlockedSkins: string[];
  equippedSkin: string;
  cost: number;
  newBalance: number;
  error?: string;
  message?: string;
}

export async function buySkin(
  guildId: string,
  userId: string,
  skinId: string,
): Promise<BuySkinResult> {
  const skin = getSkin(skinId);
  const currentSkins = await getUserSkins(guildId, userId);
  const balance = await getUserBalance(guildId, userId);

  if (!skin) {
    return {
      success: false,
      userSkins: currentSkins,
      unlockedSkins: currentSkins.unlockedSkins,
      equippedSkin: currentSkins.equippedSkin,
      cost: 0,
      newBalance: balance,
      error: 'SKIN_NOT_FOUND',
      message: `Cosmetic skin "${skinId}" does not exist in the catalog.`,
    };
  }

  if (currentSkins.unlockedSkins.includes(skinId)) {
    return {
      success: false,
      skin,
      userSkins: currentSkins,
      unlockedSkins: currentSkins.unlockedSkins,
      equippedSkin: currentSkins.equippedSkin,
      cost: skin.price,
      newBalance: balance,
      error: 'ALREADY_OWNED',
      message: `You already own ${skin.badgeEmoji} **${skin.name}**! Use \`/skins equip skin:${skinId}\` to equip it.`,
    };
  }

  if (balance < skin.price) {
    return {
      success: false,
      skin,
      userSkins: currentSkins,
      unlockedSkins: currentSkins.unlockedSkins,
      equippedSkin: currentSkins.equippedSkin,
      cost: skin.price,
      newBalance: balance,
      error: 'INSUFFICIENT_FUNDS',
      message: `You need **${skin.price.toLocaleString()} coins** to purchase ${skin.badgeEmoji} **${skin.name}**, but your balance has only **${balance.toLocaleString()} coins**.`,
    };
  }

  // Deduct balance
  const nextBalance = await adjustUserBalance(guildId, userId, -skin.price);

  // Grant skin
  if (testModeActive) {
    const key = makeKey(guildId, userId);
    const existing = testUserSkinsStore.get(key) ?? currentSkins;
    if (!existing.unlockedSkins.includes(skinId)) {
      existing.unlockedSkins.push(skinId);
    }
    testUserSkinsStore.set(key, existing);
    const updated = JSON.parse(JSON.stringify(existing)) as IUserSkins;
    return {
      success: true,
      skin,
      userSkins: updated,
      unlockedSkins: updated.unlockedSkins,
      equippedSkin: updated.equippedSkin,
      cost: skin.price,
      newBalance: nextBalance,
      message: `Successfully purchased ${skin.badgeEmoji} **${skin.name}** for **${skin.price} coins**!`,
    };
  }

  await connectDB();
  const updatedDoc = await UserSkins.findOneAndUpdate(
    { guildId, userId },
    { $addToSet: { unlockedSkins: skinId } },
    { new: true, upsert: true },
  );

  return {
    success: true,
    skin,
    userSkins: updatedDoc,
    unlockedSkins: updatedDoc.unlockedSkins,
    equippedSkin: updatedDoc.equippedSkin,
    cost: skin.price,
    newBalance: nextBalance,
    message: `Successfully purchased ${skin.badgeEmoji} **${skin.name}** for **${skin.price} coins**!`,
  };
}

// ─── Mystery Lootbox RNG Engine ─────────────────────────────────────────────

export interface LootboxResult {
  skin: ISkinItem;
  isNew: boolean;
  isDuplicate: boolean;
  duplicateRefund: number;
  rarity: SkinRarity;
  cost: number;
  userSkins: IUserSkins;
  newBalance?: number;
}

/**
 * Weighted rarity picker:
 * - Mythic: 1% (< 0.01)
 * - Legendary: 4% (< 0.05)
 * - Epic: 10% (< 0.15)
 * - Rare: 25% (< 0.40)
 * - Common: 60% (>= 0.40)
 */
export function rollLootboxRarity(rng: () => number = Math.random): SkinRarity {
  const roll = rng();
  if (roll < 0.01) return 'mythic';
  if (roll < 0.05) return 'legendary';
  if (roll < 0.15) return 'epic';
  if (roll < 0.40) return 'rare';
  return 'common';
}

/**
 * Selects a random skin from the given rarity tier pool.
 */
export function pickRandomSkinByRarity(
  rarity: SkinRarity,
  rng: () => number = Math.random,
): ISkinItem {
  const pool = SKIN_CATALOG.filter((s) => s.rarity === rarity);
  const index = Math.floor(rng() * pool.length);
  return pool[index] ?? pool[0];
}

/**
 * Opens a mystery cosmetics lootbox:
 * - Cost: 250 coins default
 * - Weighted drop rate across 5 tiers
 * - Duplicate skin protection with 50% coin value refund
 * - Unlocks skin or awards refund coins
 * - Increments totalLootboxesOpened
 */
export async function openLootbox(
  guildId: string,
  userId: string,
  customCost: number = 250,
  rng: () => number = Math.random,
): Promise<LootboxResult> {
  const cost = customCost;
  const rarity = rollLootboxRarity(rng);
  const skin = pickRandomSkinByRarity(rarity, rng);

  const userSkins = await getUserSkins(guildId, userId);
  const isDuplicate = userSkins.unlockedSkins.includes(skin.skinId);
  const isNew = !isDuplicate;
  const duplicateRefund = isDuplicate ? Math.round(skin.price * 0.5) : 0;

  // Handle balance adjustment: deduct cost, add refund if duplicate
  const balance = await getUserBalance(guildId, userId);
  let newBalance = balance;
  if (balance >= cost || testModeActive) {
    const netDelta = -cost + duplicateRefund;
    newBalance = await adjustUserBalance(guildId, userId, netDelta);
  }

  // Update user skins record
  if (testModeActive) {
    const key = makeKey(guildId, userId);
    const existing = testUserSkinsStore.get(key) ?? userSkins;
    if (isNew) {
      existing.unlockedSkins.push(skin.skinId);
    }
    existing.totalLootboxesOpened = (existing.totalLootboxesOpened ?? 0) + 1;
    testUserSkinsStore.set(key, existing);
    const updated = JSON.parse(JSON.stringify(existing)) as IUserSkins;

    return {
      skin,
      isNew,
      isDuplicate,
      duplicateRefund,
      rarity,
      cost,
      userSkins: updated,
      newBalance,
    };
  }

  await connectDB();
  const updateOperation = isNew
    ? {
        $addToSet: { unlockedSkins: skin.skinId },
        $inc: { totalLootboxesOpened: 1 },
      }
    : {
        $inc: { totalLootboxesOpened: 1 },
      };

  const updatedDoc = await UserSkins.findOneAndUpdate(
    { guildId, userId },
    updateOperation,
    { new: true, upsert: true },
  );

  return {
    skin,
    isNew,
    isDuplicate,
    duplicateRefund,
    rarity,
    cost,
    userSkins: updatedDoc,
    newBalance,
  };
}

// ─── Visual Helpers & Embed Builders ────────────────────────────────────────

export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export function buildProgressBar(current: number, total: number, length: number = 10): string {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(1, Math.max(0, current / safeTotal));
  const percent = Math.round(ratio * 100);
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${current}/${total} (${percent}%)`;
}

/**
 * Builds visual wardrobe embed with collection completion meter [████████░░] 8/10 (80%),
 * active cosmetics details, and unlocked cosmetics list.
 */
export function buildSkinsEmbed(
  userSkins: IUserSkins,
  username?: string,
): DiscordEmbed {
  const totalCatalog = SKIN_CATALOG.length;
  const unlockedCount = userSkins.unlockedSkins.filter((id) =>
    SKIN_CATALOG.some((s) => s.skinId === id),
  ).length;

  const meter = buildProgressBar(unlockedCount, totalCatalog, 10);
  const equipped = getSkin(userSkins.equippedSkin) ?? SKIN_CATALOG[0];
  const color = hexToInt(equipped.previewHex);

  const displayName = username ? `${username}'s` : 'Your';

  // Group unlocked skins by rarity
  const unlockedSkinsList = userSkins.unlockedSkins
    .map((id) => getSkin(id))
    .filter((s): s is ISkinItem => s !== undefined)
    .map((s) => {
      const animatedTag = s.isAnimated ? ' • 🌀 *Animated*' : '';
      const isEquippedTag = s.skinId === userSkins.equippedSkin ? ' `[EQUIPPED]`' : '';
      return `${s.badgeEmoji} **${s.name}** (\`${s.rarity.toUpperCase()}\`${animatedTag})${isEquippedTag}`;
    })
    .join('\n');

  return {
    title: `🎨 ${displayName} Cosmetics Wardrobe`,
    color,
    description: [
      `**Equipped Frame:** ${equipped.badgeEmoji} **${equipped.name}** (\`${equipped.rarity.toUpperCase()}\`${equipped.isAnimated ? ' • 🌀 *Animated*' : ''})`,
      `*${equipped.description}* (Color: \`${equipped.previewHex}\`)`,
      '',
      '**Collection Progress:**',
      `\`${meter}\``,
      '',
      `**Lootboxes Opened:** 🎁 \`${userSkins.totalLootboxesOpened ?? 0}\``,
    ].join('\n'),
    fields: [
      {
        name: `Unlocked Skins (${unlockedCount}/${totalCatalog})`,
        value: unlockedSkinsList.length > 0 ? unlockedSkinsList : '*No skins unlocked yet.*',
      },
      {
        name: 'Quick Navigation',
        value:
          '• Use `/skins equip skin:<id>` or the dropdown below to equip a skin.\n' +
          '• Use `/skins buy skin:<id>` to purchase skins directly from the catalog.\n' +
          '• Use `/unbox` to try your luck at unboxing rare & mythic skins for 250 coins!',
      },
    ],
    footer: {
      text: 'AiCord Cosmetics Engine • Collector Profile Frames',
    },
  };
}

/**
 * Builds celebratory unboxing embed with dramatic crate opening,
 * glowing rarity title, item details, and duplicate refund notice.
 */
export function buildUnboxEmbed(
  result: LootboxResult,
  newBalance?: number,
): DiscordEmbed {
  const { skin, isNew, duplicateRefund, rarity, userSkins } = result;
  const color = hexToInt(skin.previewHex);

  const rarityTitles: Record<SkinRarity, string> = {
    mythic: '🌌✨ MYTHIC UNBOXING! ✨🌌',
    legendary: '✨ LEGENDARY UNBOXING! ✨',
    epic: '⚡🔮 EPIC UNBOXING! 🔮⚡',
    rare: '🌿✨ RARE UNBOXING! ✨🌿',
    common: '📦 COMMON UNBOXING 📦',
  };

  const title = rarityTitles[rarity] ?? '🎁 LOOTBOX UNBOXED!';

  const descriptionLines = [
    `🎁 ➔ 💥 ➔ **${skin.badgeEmoji} ${skin.name}**`,
    '',
    `**Rarity:** \`${skin.rarity.toUpperCase()}\`${skin.isAnimated ? ' • 🌀 *Animated Skin*' : ''}`,
    `**Description:** *${skin.description}*`,
    `**Color:** \`${skin.previewHex}\` • **Value:** 🪙 \`${skin.price.toLocaleString()} coins\``,
    '',
  ];

  if (isNew) {
    descriptionLines.push(
      '🎉 **NEW UNLOCK!** Added to your cosmetics wardrobe.',
      `Equip it anytime with \`/skins equip skin:${skin.skinId}\` or view your wardrobe with \`/skins wardrobe\`.`,
    );
  } else {
    descriptionLines.push(
      '♻️ **DUPLICATE SKIN!** You already own this skin.',
      `💰 **Duplicate Compensation:** Received **+${duplicateRefund.toLocaleString()} coins** (50% value refund)!`,
    );
  }

  const footerText =
    newBalance !== undefined
      ? `🪙 Balance: ${newBalance.toLocaleString()} coins • Total Lootboxes Opened: ${userSkins.totalLootboxesOpened}`
      : `Total Lootboxes Opened: ${userSkins.totalLootboxesOpened}`;

  return {
    title,
    color,
    description: descriptionLines.join('\n'),
    footer: {
      text: footerText,
    },
  };
}

/**
 * Builds the full collector skin catalog embed grouped by rarity with pricing.
 */
export function buildCatalogEmbed(userSkins?: IUserSkins): DiscordEmbed {
  const ownedSet = new Set(userSkins?.unlockedSkins ?? []);

  const rarities: SkinRarity[] = ['mythic', 'legendary', 'epic', 'rare', 'common'];
  const rarityHeaders: Record<SkinRarity, string> = {
    mythic: '🌌 Mythic (1% Drop • Animated)',
    legendary: '👑 Legendary (4% Drop)',
    epic: '🔮 Epic (10% Drop)',
    rare: '🌿 Rare (25% Drop)',
    common: '🔷 Common (60% Drop)',
  };

  const fields = rarities.map((rarity) => {
    const skins = SKIN_CATALOG.filter((s) => s.rarity === rarity);
    const value = skins
      .map((s) => {
        const isOwned = ownedSet.has(s.skinId);
        const status = isOwned ? '`[OWNED]`' : `🪙 \`${s.price.toLocaleString()} coins\``;
        const anim = s.isAnimated ? ' 🌀' : '';
        return `${s.badgeEmoji} **${s.name}**${anim} — ${status}\n*${s.description}* (ID: \`${s.skinId}\`)`;
      })
      .join('\n\n');

    return {
      name: rarityHeaders[rarity],
      value,
    };
  });

  return {
    title: '📖 Collector Skins & Cosmetics Catalog',
    color: 0x5865f2,
    description:
      'All cosmetic profile frames available in AiCord! Unlock them via **`/unbox` (250 coins)** or buy them directly with **`/skins buy skin:<id>`**.',
    fields,
    footer: {
      text: 'AiCord Cosmetics • 10 Unique Collector Frames across 5 Rarity Tiers',
    },
  };
}

// ─── Component Builders ─────────────────────────────────────────────────────

/**
 * Builds wardrobe components:
 * - Row 1: Dropdown Select Menu to quickly equip any unlocked skin
 * - Row 2: [🎁 Unbox Again] button & [📖 Catalog] button
 */
export function buildSkinsComponents(userSkins: IUserSkins): ActionRow[] {
  const rows: ActionRow[] = [];

  const unlockedCatalogSkins = userSkins.unlockedSkins
    .map((id) => getSkin(id))
    .filter((s): s is ISkinItem => s !== undefined);

  if (unlockedCatalogSkins.length > 0) {
    const selectComponent: StringSelectComponent = {
      type: 3,
      custom_id: 'skin_select',
      placeholder: 'Select a cosmetic skin to equip...',
      options: unlockedCatalogSkins.map((skin) => ({
        label: skin.name,
        value: skin.skinId,
        description: `[${skin.rarity.toUpperCase()}] ${skin.description.slice(0, 50)}`,
        emoji: { name: skin.badgeEmoji },
        default: skin.skinId === userSkins.equippedSkin,
      })),
    };

    rows.push({
      type: 1,
      components: [selectComponent],
    });
  }

  // Action buttons
  const buttonsRow = buildActionRow(
    buildButton({
      style: 1, // Primary Blurple
      label: 'Unbox Lootbox (250🪙)',
      customId: 'unbox_again',
      emoji: '🎁',
    }),
    buildButton({
      style: 2, // Secondary Grey
      label: 'Browse Catalog',
      customId: 'skin_catalog',
      emoji: '📖',
    }),
  );
  rows.push(buttonsRow);

  return rows;
}

/**
 * Builds unboxing components with [🎁 Unbox Again] and [🎨 View Wardrobe] buttons.
 */
export function buildUnboxComponents(): ActionRow[] {
  return [
    buildActionRow(
      buildButton({
        style: 1, // Primary Blurple
        label: 'Unbox Again (250🪙)',
        customId: 'unbox_again',
        emoji: '🎁',
      }),
      buildButton({
        style: 2, // Secondary Grey
        label: 'View Wardrobe',
        customId: 'skin_wardrobe',
        emoji: '🎨',
      }),
    ),
  ];
}
