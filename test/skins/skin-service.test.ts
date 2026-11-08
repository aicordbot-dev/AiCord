/**
 * test/skins/skin-service.test.ts
 * Unit tests for Service 7: Collector Skins & Cosmetics Unlocker / Mystery Lootbox Service:
 * - Catalog lookup and metadata validation
 * - Default user ownership initialization
 * - Skin equipping mechanics & ownership checks
 * - Purchasing with coins and duplicate prevention
 * - Weighted RNG lootbox drops & distribution
 * - Duplicate refund compensation (50% value back)
 * - Visual embed builders & Discord component generators
 */

import '../test-env';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  SKIN_CATALOG,
  getSkinCatalog,
  getSkin,
  getUserSkins,
  equipSkin,
  buySkin,
  openLootbox,
  rollLootboxRarity,
  pickRandomSkinByRarity,
  buildSkinsEmbed,
  buildUnboxEmbed,
  buildCatalogEmbed,
  buildSkinsComponents,
  buildUnboxComponents,
  buildProgressBar,
  enableTestMode,
  clearTestStore,
  setTestUserSkins,
  setTestBalance,
  getTestBalance,
  type LootboxResult,
} from '@/lib/skins/skin-service';
import type { SkinRarity } from '@/models/SkinItem';

describe('Skins & Cosmetics Service — Core Engine & Lootbox Mechanics', () => {
  const GUILD_ID = 'guild_skins_test_101';
  const USER_ID = 'user_collector_202';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  // ─── 1. Catalog Lookup & Metadata ──────────────────────────────────────────

  describe('Skin Catalog Lookup & Metadata', () => {
    it('returns all 10 curated collector skins via getSkinCatalog()', () => {
      const catalog = getSkinCatalog();
      assert.equal(catalog.length, 10);
      assert.deepEqual(catalog, SKIN_CATALOG);
    });

    it('retrieves specific skins by skinId', () => {
      const neonBlue = getSkin('neon_blue');
      assert.ok(neonBlue);
      assert.equal(neonBlue.name, 'Neon Cyan Frame');
      assert.equal(neonBlue.rarity, 'common');
      assert.equal(neonBlue.price, 100);
      assert.equal(neonBlue.previewHex, '#00f0ff');
      assert.equal(neonBlue.badgeEmoji, '🔷');
      assert.equal(neonBlue.isAnimated, false);

      const astralDragon = getSkin('astral_dragon');
      assert.ok(astralDragon);
      assert.equal(astralDragon.name, 'Astral Dragon Frame');
      assert.equal(astralDragon.rarity, 'mythic');
      assert.equal(astralDragon.price, 5000);
      assert.equal(astralDragon.previewHex, '#a55eea');
      assert.equal(astralDragon.badgeEmoji, '🐉');
      assert.equal(astralDragon.isAnimated, true);
    });

    it('returns undefined for nonexistent skinId', () => {
      assert.equal(getSkin('nonexistent_skin'), undefined);
      assert.equal(getSkin(''), undefined);
    });

    it('verifies exact rarity distribution across the 10 skins', () => {
      const rarities = SKIN_CATALOG.map((s) => s.rarity);
      const counts: Record<SkinRarity, number> = {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
        mythic: 0,
      };
      for (const r of rarities) {
        counts[r]++;
      }

      assert.equal(counts.common, 2, 'Should have 2 common skins');
      assert.equal(counts.rare, 2, 'Should have 2 rare skins');
      assert.equal(counts.epic, 2, 'Should have 2 epic skins');
      assert.equal(counts.legendary, 2, 'Should have 2 legendary skins');
      assert.equal(counts.mythic, 2, 'Should have 2 mythic skins');
    });

    it('verifies only mythic skins are animated', () => {
      for (const skin of SKIN_CATALOG) {
        if (skin.rarity === 'mythic') {
          assert.equal(skin.isAnimated, true, `${skin.name} should be animated`);
        } else {
          assert.equal(skin.isAnimated, false, `${skin.name} should not be animated`);
        }
      }
    });

    it('verifies pricing ladder across rarity tiers', () => {
      const common = SKIN_CATALOG.filter((s) => s.rarity === 'common');
      const rare = SKIN_CATALOG.filter((s) => s.rarity === 'rare');
      const epic = SKIN_CATALOG.filter((s) => s.rarity === 'epic');
      const legendary = SKIN_CATALOG.filter((s) => s.rarity === 'legendary');
      const mythic = SKIN_CATALOG.filter((s) => s.rarity === 'mythic');

      common.forEach((s) => assert.equal(s.price, 100));
      rare.forEach((s) => assert.equal(s.price, 350));
      epic.forEach((s) => assert.equal(s.price, 800));
      legendary.forEach((s) => assert.equal(s.price, 2000));
      mythic.forEach((s) => assert.equal(s.price, 5000));
    });
  });

  // ─── 2. Default User Ownership ─────────────────────────────────────────────

  describe('Default Ownership & Initialization', () => {
    it('initializes a new user with default neon_blue skin unlocked and equipped', async () => {
      const skins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(skins.guildId, GUILD_ID);
      assert.equal(skins.userId, USER_ID);
      assert.deepEqual(skins.unlockedSkins, ['neon_blue']);
      assert.equal(skins.equippedSkin, 'neon_blue');
      assert.equal(skins.totalLootboxesOpened, 0);
    });

    it('persists changes to test store on subsequent calls', async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: ['neon_blue', 'emerald_gleam'],
        equippedSkin: 'emerald_gleam',
        totalLootboxesOpened: 5,
      });

      const skins = await getUserSkins(GUILD_ID, USER_ID);
      assert.deepEqual(skins.unlockedSkins, ['neon_blue', 'emerald_gleam']);
      assert.equal(skins.equippedSkin, 'emerald_gleam');
      assert.equal(skins.totalLootboxesOpened, 5);
    });
  });

  // ─── 3. Equipping Skins ────────────────────────────────────────────────────

  describe('Skin Equipping Mechanics', () => {
    it('equips an unlocked skin successfully', async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: ['neon_blue', 'stone_slate'],
        equippedSkin: 'neon_blue',
      });

      const result = await equipSkin(GUILD_ID, USER_ID, 'stone_slate');
      assert.equal(result.success, true);
      assert.equal(result.equippedSkin, 'stone_slate');
      assert.equal(result.skin?.name, 'Slate Grey Plate');

      const updated = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(updated.equippedSkin, 'stone_slate');
    });

    it('rejects equipping a skin that is not unlocked', async () => {
      const result = await equipSkin(GUILD_ID, USER_ID, 'golden_sovereign');
      assert.equal(result.success, false);
      assert.equal(result.error, 'NOT_OWNED');
      assert.match(result.message!, /haven't unlocked/i);

      const unchanged = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(unchanged.equippedSkin, 'neon_blue');
    });

    it('rejects equipping a nonexistent skin', async () => {
      const result = await equipSkin(GUILD_ID, USER_ID, 'ghost_frame');
      assert.equal(result.success, false);
      assert.equal(result.error, 'SKIN_NOT_FOUND');
    });
  });

  // ─── 4. Purchasing with Coins ──────────────────────────────────────────────

  describe('Purchasing Skins with Coins', () => {
    it('rejects purchase if user has insufficient balance', async () => {
      setTestBalance(GUILD_ID, USER_ID, 200); // emerald_gleam costs 350
      const result = await buySkin(GUILD_ID, USER_ID, 'emerald_gleam');

      assert.equal(result.success, false);
      assert.equal(result.error, 'INSUFFICIENT_FUNDS');
      assert.match(result.message!, /350 coins/i);
      assert.equal(getTestBalance(GUILD_ID, USER_ID), 200);

      const skins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(skins.unlockedSkins.includes('emerald_gleam'), false);
    });

    it('successfully purchases a skin, deducts balance, and adds to unlockedSkins', async () => {
      setTestBalance(GUILD_ID, USER_ID, 1000);
      const result = await buySkin(GUILD_ID, USER_ID, 'emerald_gleam');

      assert.equal(result.success, true);
      assert.equal(result.skin?.skinId, 'emerald_gleam');
      assert.equal(result.cost, 350);
      assert.equal(result.newBalance, 650);
      assert.equal(getTestBalance(GUILD_ID, USER_ID), 650);

      const skins = await getUserSkins(GUILD_ID, USER_ID);
      assert.ok(skins.unlockedSkins.includes('emerald_gleam'));
    });

    it('rejects purchase if user already owns the skin', async () => {
      setTestBalance(GUILD_ID, USER_ID, 5000);
      // neon_blue is owned by default
      const result = await buySkin(GUILD_ID, USER_ID, 'neon_blue');

      assert.equal(result.success, false);
      assert.equal(result.error, 'ALREADY_OWNED');
      assert.match(result.message!, /already own/i);
      assert.equal(getTestBalance(GUILD_ID, USER_ID), 5000);
    });

    it('rejects purchase for nonexistent skinId', async () => {
      setTestBalance(GUILD_ID, USER_ID, 10000);
      const result = await buySkin(GUILD_ID, USER_ID, 'fake_skin');

      assert.equal(result.success, false);
      assert.equal(result.error, 'SKIN_NOT_FOUND');
    });
  });

  // ─── 5. Weighted RNG Lootbox Drops ─────────────────────────────────────────

  describe('Weighted RNG Lootbox Drops', () => {
    it('rolls mythic rarity when roll is below 0.01', () => {
      assert.equal(rollLootboxRarity(() => 0.005), 'mythic');
      assert.equal(rollLootboxRarity(() => 0.0), 'mythic');
    });

    it('rolls legendary rarity when roll is between 0.01 and 0.05', () => {
      assert.equal(rollLootboxRarity(() => 0.01), 'legendary');
      assert.equal(rollLootboxRarity(() => 0.049), 'legendary');
    });

    it('rolls epic rarity when roll is between 0.05 and 0.15', () => {
      assert.equal(rollLootboxRarity(() => 0.05), 'epic');
      assert.equal(rollLootboxRarity(() => 0.149), 'epic');
    });

    it('rolls rare rarity when roll is between 0.15 and 0.40', () => {
      assert.equal(rollLootboxRarity(() => 0.15), 'rare');
      assert.equal(rollLootboxRarity(() => 0.399), 'rare');
    });

    it('rolls common rarity when roll is 0.40 or higher', () => {
      assert.equal(rollLootboxRarity(() => 0.40), 'common');
      assert.equal(rollLootboxRarity(() => 0.75), 'common');
      assert.equal(rollLootboxRarity(() => 0.999), 'common');
    });

    it('picks skin strictly matching the given rarity pool', () => {
      const mythic = pickRandomSkinByRarity('mythic');
      assert.equal(mythic.rarity, 'mythic');

      const legendary = pickRandomSkinByRarity('legendary');
      assert.equal(legendary.rarity, 'legendary');

      const epic = pickRandomSkinByRarity('epic');
      assert.equal(epic.rarity, 'epic');

      const rare = pickRandomSkinByRarity('rare');
      assert.equal(rare.rarity, 'rare');

      const common = pickRandomSkinByRarity('common');
      assert.equal(common.rarity, 'common');
    });

    it('respects weighted probability distribution across 1000 simulated rolls', () => {
      const counts: Record<SkinRarity, number> = {
        mythic: 0,
        legendary: 0,
        epic: 0,
        rare: 0,
        common: 0,
      };

      for (let i = 0; i < 1000; i++) {
        const r = rollLootboxRarity();
        counts[r]++;
      }

      // Common should be the largest share (~600)
      assert.ok(counts.common > 450, `Expected common > 450, got ${counts.common}`);
      // Rare should be second largest (~250)
      assert.ok(counts.rare > 150, `Expected rare > 150, got ${counts.rare}`);
      // Mythic should be smallest (~10)
      assert.ok(counts.mythic < 50, `Expected mythic < 50, got ${counts.mythic}`);
    });
  });

  // ─── 6. Lootbox Unboxing & Duplicate Refund Compensation ────────────────────

  describe('Lootbox Unboxing & Duplicate Refund Compensation', () => {
    it('unboxes a new skin, adds to wardrobe, and sets duplicateRefund to 0', async () => {
      setTestBalance(GUILD_ID, USER_ID, 1000);

      // Force mythic astral_dragon (roll 0.005, pool index 0)
      const deterministicRng = () => 0.005;
      const result = await openLootbox(GUILD_ID, USER_ID, 250, deterministicRng);

      assert.equal(result.skin.skinId, 'astral_dragon');
      assert.equal(result.isNew, true);
      assert.equal(result.isDuplicate, false);
      assert.equal(result.duplicateRefund, 0);
      assert.equal(result.cost, 250);
      assert.equal(result.newBalance, 750);

      const skins = await getUserSkins(GUILD_ID, USER_ID);
      assert.ok(skins.unlockedSkins.includes('astral_dragon'));
      assert.equal(skins.totalLootboxesOpened, 1);
    });

    it('awards 50% duplicate compensation coins when unboxing an already owned skin', async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: ['neon_blue', 'stone_slate'],
      });
      setTestBalance(GUILD_ID, USER_ID, 500);

      // Force common roll (0.50) and neon_blue (pool index 0)
      const deterministicRng = () => 0.0; // pool index 0
      const commonRng = () => 0.50; // common tier

      // neon_blue price is 100 coins -> 50% refund = 50 coins
      const result = await openLootbox(GUILD_ID, USER_ID, 250, commonRng);

      assert.equal(result.isDuplicate, true);
      assert.equal(result.isNew, false);
      assert.equal(result.duplicateRefund, Math.round(result.skin.price * 0.5));
      assert.equal(result.duplicateRefund, 50);

      // Balance was 500: cost 250 deducted, 50 refund added = 300
      assert.equal(result.newBalance, 300);
      assert.equal(getTestBalance(GUILD_ID, USER_ID), 300);

      const skins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(skins.totalLootboxesOpened, 1);
    });

    it('verifies 50% duplicate refund values for all 5 tiers', () => {
      for (const skin of SKIN_CATALOG) {
        const expectedRefund = Math.round(skin.price * 0.5);
        if (skin.rarity === 'common') assert.equal(expectedRefund, 50);
        if (skin.rarity === 'rare') assert.equal(expectedRefund, 175);
        if (skin.rarity === 'epic') assert.equal(expectedRefund, 400);
        if (skin.rarity === 'legendary') assert.equal(expectedRefund, 1000);
        if (skin.rarity === 'mythic') assert.equal(expectedRefund, 2500);
      }
    });

    it('increments totalLootboxesOpened on multiple unboxings', async () => {
      setTestBalance(GUILD_ID, USER_ID, 2000);

      await openLootbox(GUILD_ID, USER_ID, 250);
      await openLootbox(GUILD_ID, USER_ID, 250);
      await openLootbox(GUILD_ID, USER_ID, 250);

      const skins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(skins.totalLootboxesOpened, 3);
    });
  });

  // ─── 7. Visual Embed Builders & Components ──────────────────────────────────

  describe('Embed Builders & Interactive Discord Components', () => {
    it('buildProgressBar calculates accurate percentage and bar characters', () => {
      assert.equal(buildProgressBar(8, 10, 10), '[████████░░] 8/10 (80%)');
      assert.equal(buildProgressBar(0, 10, 10), '[░░░░░░░░░░] 0/10 (0%)');
      assert.equal(buildProgressBar(10, 10, 10), '[██████████] 10/10 (100%)');
      assert.equal(buildProgressBar(5, 10, 10), '[█████░░░░░] 5/10 (50%)');
    });

    it('buildSkinsEmbed creates wardrobe embed with completion meter and equipped skin', async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: [
          'neon_blue',
          'stone_slate',
          'emerald_gleam',
          'sunset_amber',
          'violet_void',
          'crimson_overdrive',
          'golden_sovereign',
          'cyber_glitch',
        ],
        equippedSkin: 'golden_sovereign',
        totalLootboxesOpened: 12,
      });

      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      const embed = buildSkinsEmbed(userSkins);

      assert.ok(embed.title?.includes('Cosmetics Wardrobe'));
      assert.ok(embed.description?.includes('[████████░░] 8/10 (80%)'));
      assert.ok(embed.description?.includes('Golden Sovereign Frame'));
      assert.ok(embed.description?.includes('12'));
      assert.equal(embed.color, 0xfdcb6e); // golden_sovereign previewHex #fdcb6e
    });

    it('buildUnboxEmbed renders glowing title, crate animation, and duplicate refund info', () => {
      const mockResult: LootboxResult = {
        skin: getSkin('golden_sovereign')!,
        isNew: false,
        isDuplicate: true,
        duplicateRefund: 1000,
        rarity: 'legendary',
        cost: 250,
        userSkins: {
          guildId: GUILD_ID,
          userId: USER_ID,
          unlockedSkins: ['golden_sovereign'],
          equippedSkin: 'golden_sovereign',
          totalLootboxesOpened: 4,
        } as any,
        newBalance: 1500,
      };

      const embed = buildUnboxEmbed(mockResult, 1500);

      assert.equal(embed.title, '✨ LEGENDARY UNBOXING! ✨');
      assert.ok(embed.description?.includes('🎁 ➔ 💥 ➔'));
      assert.ok(embed.description?.includes('DUPLICATE SKIN'));
      assert.ok(embed.description?.includes('+1,000 coins'));
      assert.ok(embed.footer?.text.includes('1,500 coins'));
      assert.ok(embed.footer?.text.includes('Total Lootboxes Opened: 4'));
    });

    it('buildUnboxEmbed celebrates new unlock properly', () => {
      const mockResult: LootboxResult = {
        skin: getSkin('astral_dragon')!,
        isNew: true,
        isDuplicate: false,
        duplicateRefund: 0,
        rarity: 'mythic',
        cost: 250,
        userSkins: {
          guildId: GUILD_ID,
          userId: USER_ID,
          unlockedSkins: ['neon_blue', 'astral_dragon'],
          equippedSkin: 'neon_blue',
          totalLootboxesOpened: 1,
        } as any,
        newBalance: 250,
      };

      const embed = buildUnboxEmbed(mockResult, 250);
      assert.equal(embed.title, '🌌✨ MYTHIC UNBOXING! ✨🌌');
      assert.ok(embed.description?.includes('NEW UNLOCK!'));
      assert.ok(embed.description?.includes('/skins equip skin:astral_dragon'));
    });

    it('buildCatalogEmbed renders all 10 skins grouped by rarity with pricing', async () => {
      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      const embed = buildCatalogEmbed(userSkins);

      assert.equal(embed.title, '📖 Collector Skins & Cosmetics Catalog');
      assert.equal(embed.fields?.length, 5); // 5 rarity tiers
      assert.ok(embed.description?.includes('250 coins'));
    });

    it('buildSkinsComponents generates quick equip select menu and buttons', async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: ['neon_blue', 'emerald_gleam'],
        equippedSkin: 'neon_blue',
      });

      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      const components = buildSkinsComponents(userSkins);

      assert.equal(components.length, 2); // Select menu row + button row
      const selectRow = components[0];
      assert.equal(selectRow.components[0].type, 3); // StringSelect
      const buttonRow = components[1];
      assert.equal(buttonRow.components.length, 2); // Unbox again + catalog buttons
    });

    it('buildUnboxComponents generates unbox again and wardrobe action row', () => {
      const components = buildUnboxComponents();
      assert.equal(components.length, 1);
      assert.equal(components[0].components.length, 2);
    });
  });
});
