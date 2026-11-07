/**
 * test/styles/screens-phase2.test.ts
 * Unit tests for Phase 2: Enhanced Custom Screens for Levels & Economy Suites:
 * - Levels Suite:
 *   - /rank: Themed player card with UserProfileStyle, custom bar styles (pipes, blocks, squares, retro),
 *     achievement and milestone badges.
 *   - /leaderboard: Podium medal styling (🥇 1st Place, 🥈 2nd Place, 🥉 3rd Place) and server theme colors.
 *   - Level-up announcement embeds with theme accents.
 * - Economy Suite:
 *   - /balance: ATM Terminal card layout, wealth tier badges (Bronze, Silver, Gold, Diamond),
 *     bank capacity meter `[████████░░] 80% Full`, balance theme coloring.
 *   - /daily: Themed receipt card with streak multipliers.
 *   - /shop: Themed shop presentation with server theme colors.
 *   - /rich: Wealth leaderboard with podium styling and wealth tier badges.
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleRankCommand,
  handleLeaderboardCommand,
} from '@/commands/levels';
import {
  handleBalanceCommand,
  handleDailyCommand,
  handleShopCommand,
  handleRichCommand,
} from '@/commands/economy';
import {
  buildRankCardEmbed,
  buildLeaderboardEmbed,
  buildLevelUpEmbed,
  resolveAchievementBadges,
} from '@/lib/levels/level-embeds';
import {
  buildBalanceEmbed,
  buildDailyEmbed,
  buildShopEmbed,
  buildEconomyLeaderboardEmbed,
  getWealthTier,
  renderBankCapacityMeter,
} from '@/lib/economy/economy-embeds';
import {
  enableTestMode,
  clearTestStore,
  getUserProfileStyle,
  updateUserProfileStyle,
  setServerTheme,
} from '@/lib/styles/user-profile-style';
import {
  enableTestMode as enableXpTestMode,
  clearTestStore as clearXpTestStore,
  addMessageXp,
  getUserRank,
} from '@/lib/levels/xp-service';
import {
  enableTestMode as enableEconTestMode,
  clearTestStore as clearEconTestStore,
  claimDaily,
  addShopItem,
  deposit,
} from '@/lib/economy/economy-service';
import { THEMES } from '@/lib/styles/themes';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import type { IEconomyUser } from '@/models';

describe('Phase 2: Universal Custom Screens — Levels & Economy Suites', () => {
  const GUILD_ID = 'guild_screen_p2';
  const USER_ID = 'user_stylist_999';
  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  beforeEach(() => {
    enableTestMode(true);
    enableXpTestMode(true);
    enableEconTestMode(true);
    clearTestStore();
    clearXpTestStore();
    clearEconTestStore();
    interceptedResponses = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });
  });

  afterEach(() => {
    setResponseHandler(null);
    clearTestStore();
    clearXpTestStore();
    clearEconTestStore();
    enableTestMode(false);
    enableXpTestMode(false);
    enableEconTestMode(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Levels Suite — /rank & Rank Cards
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Levels Suite: /rank & Themed Player Cards', () => {
    it('applies UserProfileStyle rank theme and ornamentation to rank card', () => {
      const embedCyberpunk = buildRankCardEmbed(
        { id: USER_ID, username: 'Neo' },
        {
          rank: 1,
          level: 12,
          xp: 4500,
          xpIntoLevel: 250,
          xpForNextLevel: 500,
          progressPercent: 50,
          totalMessages: 150,
        },
        { name: 'Matrix Guild' },
        { rankTheme: 'cyberpunk', barStyle: 'pipes' },
      );

      assert.equal(embedCyberpunk.color, THEMES.cyberpunk.primaryColor);
      assert.ok(embedCyberpunk.title?.includes(THEMES.cyberpunk.ornamentation.left));
      assert.ok(embedCyberpunk.title?.includes(THEMES.cyberpunk.ornamentation.right));
      assert.ok(embedCyberpunk.title?.includes("Neo's Rank Card"));

      // Verify custom pipes progress bar
      const progressField = embedCyberpunk.fields?.find((f) => f.name.includes('Progress'));
      assert.ok(progressField);
      assert.ok(progressField.value.includes('▰'));
      assert.ok(progressField.value.includes('▱'));
      assert.ok(progressField.value.includes('50%'));
    });

    it('renders all bar styles correctly (pipes, blocks, squares, retro)', () => {
      const rankData = {
        rank: 5,
        level: 10,
        xp: 3000,
        xpIntoLevel: 200,
        xpForNextLevel: 400,
        progressPercent: 50,
      };

      // 1. Pipes
      const cardPipes = buildRankCardEmbed(
        { id: 'u1', username: 'PipesUser' },
        rankData,
        undefined,
        { barStyle: 'pipes' },
      );
      assert.ok(cardPipes.fields?.some((f) => f.value.includes('▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱')));

      // 2. Blocks
      const cardBlocks = buildRankCardEmbed(
        { id: 'u2', username: 'BlocksUser' },
        rankData,
        undefined,
        { barStyle: 'blocks' },
      );
      assert.ok(cardBlocks.fields?.some((f) => f.value.includes('████████░░░░░░░░')));

      // 3. Squares
      const cardSquares = buildRankCardEmbed(
        { id: 'u3', username: 'SquaresUser' },
        rankData,
        undefined,
        { barStyle: 'squares' },
      );
      assert.ok(cardSquares.fields?.some((f) => f.value.includes('■■■■■■■■□□□□□□□□')));

      // 4. Retro
      const cardRetro = buildRankCardEmbed(
        { id: 'u4', username: 'RetroUser' },
        rankData,
        undefined,
        { barStyle: 'retro' },
      );
      assert.ok(cardRetro.fields?.some((f) => f.value.includes('▓▓▓▓▓▓▓▓░░░░░░░░')));
    });

    it('resolves and displays user badges and achievement milestones', () => {
      const rankData = {
        rank: 1, // Server Champion
        level: 55, // Mythic Champion (>= 50)
        xp: 150000,
        xpIntoLevel: 1000,
        xpForNextLevel: 5000,
        progressPercent: 20,
        totalMessages: 1200, // Scribe (>= 1000)
      };

      const badges = resolveAchievementBadges(rankData, ['🚀 Early Supporter', '💎 VIP']);
      assert.ok(badges.includes('🚀 Early Supporter'));
      assert.ok(badges.includes('💎 VIP'));
      assert.ok(badges.includes('🥇 Server Champion'));
      assert.ok(badges.includes('👑 Mythic Champion'));
      assert.ok(badges.includes('📜 Scribe'));

      const card = buildRankCardEmbed(
        { id: 'u1', username: 'LegendaryMember' },
        rankData,
        undefined,
        { badges: ['🚀 Early Supporter', '💎 VIP'] },
      );

      const badgesField = card.fields?.find((f) => f.name.includes('Badges & Achievements'));
      assert.ok(badgesField);
      assert.ok(badgesField.value.includes('🥇 Server Champion'));
      assert.ok(badgesField.value.includes('👑 Mythic Champion'));
      assert.ok(badgesField.value.includes('🚀 Early Supporter'));
    });

    it('/rank command integrates UserProfileStyle seamlessly', async () => {
      await updateUserProfileStyle(GUILD_ID, USER_ID, {
        rankTheme: 'frost',
        barStyle: 'squares',
        badges: ['❄️ Ice Walker'],
      });

      const interaction = {
        token: 'token_rank_theme_test',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID, username: 'SubZero' } },
        data: { name: 'rank', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRankCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed);
      assert.equal(embed.color, THEMES.frost.primaryColor);
      assert.ok(embed.title?.includes(THEMES.frost.ornamentation.left));
      assert.ok(embed.title?.includes("SubZero's Rank Card"));

      const badgeField = embed.fields?.find((f) => f.name.includes('Badges'));
      assert.ok(badgeField?.value.includes('❄️ Ice Walker'));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Levels Suite — /leaderboard & Level-Up Embeds
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Levels Suite: /leaderboard Podium Styling & Level-Up Embeds', () => {
    it('builds leaderboard with distinct podium medal styling for 1st, 2nd, 3rd place', () => {
      const entries = [
        { rank: 1, userId: 'u1', username: 'Goldie', level: 20, xp: 25000, totalMessages: 500 },
        { rank: 2, userId: 'u2', username: 'Silvia', level: 18, xp: 20000, totalMessages: 400 },
        { rank: 3, userId: 'u3', username: 'Bronzie', level: 15, xp: 15000, totalMessages: 300 },
        { rank: 4, userId: 'u4', username: 'Challenger', level: 10, xp: 8000, totalMessages: 150 },
      ];

      const lbEmbed = buildLeaderboardEmbed(
        { name: 'Champion Guild' },
        entries,
        1,
        1,
        'midnight',
      );

      assert.equal(lbEmbed.color, THEMES.midnight.primaryColor);
      assert.ok(lbEmbed.description?.includes('🥇 **[1ST PLACE]**'));
      assert.ok(lbEmbed.description?.includes('🥈 **[2ND PLACE]**'));
      assert.ok(lbEmbed.description?.includes('🥉 **[3RD PLACE]**'));
      assert.ok(lbEmbed.description?.includes('`#4` **Challenger**'));
    });

    it('/leaderboard command applies configured server theme', async () => {
      await setServerTheme(GUILD_ID, 'emerald');

      const interaction = {
        token: 'token_lb_theme',
        guild_id: GUILD_ID,
        data: { name: 'leaderboard', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleLeaderboardCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed);
      assert.equal(embed.color, THEMES.emerald.primaryColor);
      assert.ok(embed.footer?.text?.includes('Emerald'));
    });

    it('buildLevelUpEmbed decorates announcements with theme styling', () => {
      const embed = buildLevelUpEmbed(
        { id: 'u1', username: 'LevelMaster' },
        25,
        { id: 'role_master', name: 'Master' },
        undefined,
        'gold',
      );

      assert.equal(embed.color, THEMES.gold.primaryColor);
      assert.ok(embed.description?.includes(THEMES.gold.ornamentation.left));
      assert.ok(embed.description?.includes('Level 25'));
      assert.ok(embed.description?.includes('Master'));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Economy Suite — Wealth Tiers & Bank Capacity Meter
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Economy Suite: Wealth Tiers & Bank Capacity Meter', () => {
    it('getWealthTier resolves Bronze, Silver, Gold, Diamond accurately', () => {
      // Bronze: < 5,000
      assert.equal(getWealthTier(0).tier, 'Bronze');
      assert.equal(getWealthTier(4999).tier, 'Bronze');
      assert.ok(getWealthTier(2500).badge.includes('Bronze'));

      // Silver: 5,000 - 24,999
      assert.equal(getWealthTier(5000).tier, 'Silver');
      assert.equal(getWealthTier(24999).tier, 'Silver');
      assert.ok(getWealthTier(15000).badge.includes('Silver'));

      // Gold: 25,000 - 99,999
      assert.equal(getWealthTier(25000).tier, 'Gold');
      assert.equal(getWealthTier(99999).tier, 'Gold');
      assert.ok(getWealthTier(50000).badge.includes('Gold'));

      // Diamond: >= 100,000
      assert.equal(getWealthTier(100000).tier, 'Diamond');
      assert.equal(getWealthTier(5000000).tier, 'Diamond');
      assert.ok(getWealthTier(100000).badge.includes('Diamond'));
    });

    it('renderBankCapacityMeter renders exact "[████████░░] 80% Full" formatting', () => {
      // 80% Full with 10 segments -> 8 filled, 2 empty
      const meter80 = renderBankCapacityMeter(8000, 10000, 'blocks', 10);
      assert.equal(meter80, '`[████████░░]` 80% Full');

      // 0% Full
      const meter0 = renderBankCapacityMeter(0, 5000, 'blocks', 10);
      assert.equal(meter0, '`[░░░░░░░░░░]` 0% Full');

      // 100% Full
      const meter100 = renderBankCapacityMeter(5000, 5000, 'blocks', 10);
      assert.equal(meter100, '`[██████████]` 100% Full');

      // Custom bar style: pipes (▰▱)
      const meterPipes = renderBankCapacityMeter(5000, 10000, 'pipes', 10);
      assert.equal(meterPipes, '`[▰▰▰▰▰▱▱▱▱▱]` 50% Full');

      // Custom bar style: squares (■□)
      const meterSquares = renderBankCapacityMeter(3000, 10000, 'squares', 10);
      assert.equal(meterSquares, '`[■■■□□□□□□□]` 30% Full');

      // Custom bar style: retro (▓░)
      const meterRetro = renderBankCapacityMeter(7000, 10000, 'retro', 10);
      assert.equal(meterRetro, '`[▓▓▓▓▓▓▓░░░]` 70% Full');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Economy Suite — /balance ATM Terminal Display
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Economy Suite: /balance ATM Terminal Card Layout', () => {
    it('renders ATM Terminal header, cardholder, wealth tier, and bank meter', () => {
      const econData: IEconomyUser = {
        guildId: GUILD_ID,
        userId: USER_ID,
        wallet: 25000,
        bank: 80000,
        bankCapacity: 100000, // 80% full
        dailyStreak: 7,
        inventory: [{ itemId: 'pass1', name: 'Pass', price: 100, purchasedAt: new Date() }],
      } as unknown as IEconomyUser;

      const embed = buildBalanceEmbed(
        { id: USER_ID, username: 'ScroogeMcDuck' },
        econData,
        { name: 'Duckburg Bank' },
        { balanceTheme: 'gold', barStyle: 'blocks' },
      );

      // Verify title & ATM header
      assert.ok(embed.title?.includes('ATM Terminal'));
      assert.ok(embed.title?.includes('ScroogeMcDuck'));
      assert.ok(embed.description?.includes('AICORD NATIONAL BANK ATM TERMINAL'));
      assert.ok(embed.description?.includes('CARDHOLDER:  SCROOGEMCDUCK'));
      assert.ok(embed.description?.includes('[DIAMOND] 💎 Diamond Tycoon'));

      // Verify Exactly 5 Fields
      assert.equal(embed.fields?.length, 5);

      // Verify Bank Capacity Meter in Bank Field
      const bankField = embed.fields?.find((f) => f.name.includes('Bank'));
      assert.ok(bankField);
      assert.ok(bankField.value.includes('`[████████░░]` 80% Full'));

      // Verify Net Worth with Tier
      const netWorthField = embed.fields?.find((f) => f.name.includes('Net Worth'));
      assert.ok(netWorthField);
      assert.ok(netWorthField.value.includes('105,000'));
      assert.ok(netWorthField.value.includes('💎 Diamond Tycoon'));

      // Verify Theme Color
      assert.equal(embed.color, THEMES.gold.primaryColor);
    });

    it('/balance command executes with styled UserProfileStyle preferences', async () => {
      await updateUserProfileStyle(GUILD_ID, USER_ID, {
        balanceTheme: 'cyberpunk',
        barStyle: 'pipes',
      });

      const interaction = {
        token: 'token_bal_cmd_theme',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID, username: 'CyberTycoon' } },
        data: { name: 'balance', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBalanceCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed);
      assert.equal(embed.color, THEMES.cyberpunk.primaryColor);
      assert.ok(embed.description?.includes('ATM TERMINAL'));

      const bankField = embed.fields?.find((f) => f.name.includes('Bank'));
      assert.ok(bankField?.value.includes('Full'));
      assert.ok(bankField?.value.includes('▰') || bankField?.value.includes('▱'));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Economy Suite — /daily, /shop, /rich Theming & Podium
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Economy Suite: /daily, /shop, /rich Themed Displays', () => {
    it('/daily command builds themed ATM deposit receipt', async () => {
      await updateUserProfileStyle(GUILD_ID, USER_ID, { balanceTheme: 'midnight' });

      const interaction = {
        token: 'token_daily_themed',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID, username: 'NightCollector' } },
        data: { name: 'daily', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleDailyCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed);
      assert.equal(embed.color, THEMES.midnight.primaryColor);
      assert.ok(embed.description?.includes('AICORD DAILY REWARD RECEIPT'));
      assert.ok(embed.description?.includes('NIGHTCOLLECTOR'));
    });

    it('/shop command renders themed shop catalog with server theme', async () => {
      await setServerTheme(GUILD_ID, 'retro');
      await addShopItem(GUILD_ID, {
        itemId: 'arcade-token',
        name: 'Arcade Token',
        price: 50,
        description: 'Play retro arcade machines',
      });

      const interaction = {
        token: 'token_shop_retro',
        guild_id: GUILD_ID,
        data: { name: 'shop', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleShopCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed);
      assert.equal(embed.color, THEMES.retro.primaryColor);
      assert.ok(embed.footer?.text?.includes('Retro'));
      assert.ok(embed.fields?.[0].name.includes('Arcade Token'));
    });

    it('/rich command displays podium medal styling and wealth tier badges', async () => {
      await setServerTheme(GUILD_ID, 'gold');

      // Add users with different net worth tiers
      await claimDaily(GUILD_ID, 'user_diamond', new Date('2026-01-01T12:00:00Z'));
      await deposit(GUILD_ID, 'user_diamond', 'all');

      const interaction = {
        token: 'token_rich_podium',
        guild_id: GUILD_ID,
        data: { name: 'rich', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRichCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed);
      assert.equal(embed.color, THEMES.gold.primaryColor);
      assert.ok(embed.description?.includes('🥇 **[1ST PLACE]**'));
      assert.ok(embed.description?.includes('Tier: **'));
    });

    it('buildEconomyLeaderboardEmbed shows podium medals and wealth tiers for all ranks', () => {
      const entries = [
        { rank: 1, userId: 'u1', wallet: 50000, bank: 100000, netWorth: 150000, dailyStreak: 10 },
        { rank: 2, userId: 'u2', wallet: 20000, bank: 40000, netWorth: 60000, dailyStreak: 5 },
        { rank: 3, userId: 'u3', wallet: 5000, bank: 10000, netWorth: 15000, dailyStreak: 2 },
        { rank: 4, userId: 'u4', wallet: 1000, bank: 2000, netWorth: 3000, dailyStreak: 1 },
      ];

      const embed = buildEconomyLeaderboardEmbed('RichServer', entries, 1, 1, 'gold');

      assert.equal(embed.color, THEMES.gold.primaryColor);
      assert.ok(embed.description?.includes('🥇 **[1ST PLACE]** <@u1>'));
      assert.ok(embed.description?.includes('💎 Diamond Tycoon'));
      assert.ok(embed.description?.includes('🥈 **[2ND PLACE]** <@u2>'));
      assert.ok(embed.description?.includes('🥇 Gold Investor'));
      assert.ok(embed.description?.includes('🥉 **[3RD PLACE]** <@u3>'));
      assert.ok(embed.description?.includes('🥈 Silver Merchant'));
      assert.ok(embed.description?.includes('`#4` <@u4>'));
      assert.ok(embed.description?.includes('🥉 Bronze Saver'));
    });
  });
});
