/**
 * test/economy/commands.test.ts
 * Unit tests for Phase 28 Slash Commands, Webhook Interactions, and Embed Presentation:
 * - Central Command Registry lookup & schema validation for all 11 economy commands
 * - /balance command execution (self & target member)
 * - /daily command execution (fresh claim & cooldown handling)
 * - /deposit & /withdraw commands (numeric amounts & 'all' keyword)
 * - /pay command peer transfer execution
 * - /work & /crime commands execution
 * - /shop command execution & pagination action rows
 * - /buy command execution & autocomplete suggestion filtering
 * - /shop-admin subcommands (add, list, remove) with permission constraints
 * - /rich wealth leaderboard command & pagination
 * - handleShopInteraction & handleRichInteraction webhook component routing
 * - Capacity bar & duration formatting utilities
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommand,
  registerEconomyCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleBalanceCommand,
  handleDailyCommand,
  handleDepositCommand,
  handleWithdrawCommand,
  handlePayCommand,
  handleWorkCommand,
  handleCrimeCommand,
  handleShopCommand,
  handleBuyCommand,
  handleShopAdminCommand,
  handleRichCommand,
  handleShopInteraction,
  handleRichInteraction,
  buildShopPaginationRow,
  buildRichPaginationRow,
} from '@/commands/economy';
import {
  enableTestMode,
  clearTestStore,
  claimDaily,
  addShopItem,
  setCustomRng,
} from '@/lib/economy/economy-service';
import {
  renderCapacityBar,
  formatDuration,
  buildBalanceEmbed,
  buildDailyEmbed,
  buildWorkCrimeEmbed,
  buildShopEmbed,
  buildEconomyLeaderboardEmbed,
} from '@/lib/economy/economy-embeds';
import { PermissionFlags } from '@/lib/discord/permissions';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';

describe('Server Economy & Gamification — Slash Commands & Presentation', () => {
  const GUILD_ID = 'guild_econ_cmds_999';
  const CALLER_ID = 'user_caller_1';
  const TARGET_ID = 'user_target_2';
  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    registerEconomyCommands();
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

  // ─── 1. Command Registry Integration ────────────────────────────────────

  describe('Central Command Registry Integration', () => {
    it('registers all 11 economy commands with category "economy"', () => {
      const commands = [
        'balance',
        'daily',
        'deposit',
        'withdraw',
        'pay',
        'work',
        'crime',
        'shop',
        'buy',
        'shop-admin',
        'rich',
      ];

      for (const name of commands) {
        const cmd = getCommand(name);
        assert.ok(cmd, `Command ${name} should be registered`);
        assert.equal(cmd.category, 'economy');
        assert.ok(cmd.rateLimit);
        assert.ok(cmd.description.length > 5);
      }
    });

    it('enforces MANAGE_GUILD permission requirement for /shop-admin', () => {
      const shopAdmin = getCommand('shop-admin');
      assert.ok(shopAdmin);
      assert.equal(
        shopAdmin.default_member_permissions,
        PermissionFlags.MANAGE_GUILD.toString(),
      );
    });
  });

  // ─── 2. /balance Command Execution ──────────────────────────────────────

  describe('/balance Command', () => {
    it('renders balance embed for the invoking user', async () => {
      await claimDaily(GUILD_ID, CALLER_ID, new Date('2026-01-01T12:00:00Z'));

      const interaction = {
        token: 'token_bal_1',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID, username: 'CallerDev' } },
        data: { name: 'balance', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBalanceCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embeds = interceptedResponses[0].options.embeds;
      assert.ok(embeds && embeds.length > 0);
      assert.ok(embeds[0].title?.includes('CallerDev'));
      assert.ok(embeds[0].fields?.some((f) => f.name.includes('Wallet')));
      assert.ok(embeds[0].fields?.some((f) => f.name.includes('Bank')));
    });

    it('renders balance embed for specified target member', async () => {
      await claimDaily(GUILD_ID, TARGET_ID, new Date('2026-01-01T12:00:00Z'));

      const interaction = {
        token: 'token_bal_2',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID, username: 'CallerDev' } },
        data: {
          name: 'balance',
          options: [{ name: 'user', value: TARGET_ID }],
          resolved: {
            users: {
              [TARGET_ID]: { id: TARGET_ID, username: 'TargetVip' },
            },
          },
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBalanceCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embeds = interceptedResponses[0].options.embeds;
      assert.ok(embeds?.[0].title?.includes('TargetVip'));
    });
  });

  // ─── 3. /daily Command Execution ────────────────────────────────────────

  describe('/daily Command', () => {
    it('claims daily coins and outputs celebration embed', async () => {
      const interaction = {
        token: 'token_daily_1',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID, username: 'StreakMaster' } },
        data: { name: 'daily', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleDailyCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embeds = interceptedResponses[0].options.embeds;
      assert.ok(embeds?.[0].title?.includes('Daily Reward Claimed'));
      assert.ok(embeds?.[0].description?.includes('275'));
    });

    it('shows cooldown warning embed on duplicate claim attempt', async () => {
      const interaction = {
        token: 'token_daily_2',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID, username: 'StreakMaster' } },
        data: { name: 'daily', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleDailyCommand(interaction);
      await handleDailyCommand(interaction);

      assert.equal(interceptedResponses.length, 2);
      const secondEmbed = interceptedResponses[1].options.embeds?.[0];
      assert.ok(secondEmbed?.title?.includes('Already Claimed'));
    });
  });

  // ─── 4. /deposit & /withdraw Commands ───────────────────────────────────

  describe('/deposit & /withdraw Commands', () => {
    it('deposits coins by amount and by "all"', async () => {
      await claimDaily(GUILD_ID, CALLER_ID, new Date('2026-01-01T12:00:00Z'));

      const depositInteraction = {
        token: 'token_dep_1',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID } },
        data: {
          name: 'deposit',
          options: [{ name: 'amount', value: '100' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleDepositCommand(depositInteraction);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Coins Deposited'));

      // Deposit all remaining
      const depositAllInteraction = {
        token: 'token_dep_all',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID } },
        data: {
          name: 'deposit',
          options: [{ name: 'amount', value: 'all' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleDepositCommand(depositAllInteraction);
      assert.equal(interceptedResponses.length, 2);
      assert.ok(interceptedResponses[1].options.embeds?.[0].title?.includes('Coins Deposited'));
    });

    it('withdraws coins by amount and by "all"', async () => {
      await claimDaily(GUILD_ID, CALLER_ID, new Date('2026-01-01T12:00:00Z'));

      // Put in bank first
      const depInteraction = {
        token: 'token_dep_pre',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID } },
        data: { name: 'deposit', options: [{ name: 'amount', value: '200' }] },
      } as unknown as APIChatInputApplicationCommandInteraction;
      await handleDepositCommand(depInteraction);

      // Withdraw 50
      const withdrawInteraction = {
        token: 'token_with_1',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID } },
        data: {
          name: 'withdraw',
          options: [{ name: 'amount', value: '50' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleWithdrawCommand(withdrawInteraction);
      assert.equal(interceptedResponses.length, 2);
      assert.ok(interceptedResponses[1].options.embeds?.[0].title?.includes('Coins Withdrawn'));

      // Withdraw all
      const withdrawAllInteraction = {
        token: 'token_with_all',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID } },
        data: {
          name: 'withdraw',
          options: [{ name: 'amount', value: 'all' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleWithdrawCommand(withdrawAllInteraction);
      assert.equal(interceptedResponses.length, 3);
      assert.ok(interceptedResponses[2].options.embeds?.[0].title?.includes('Coins Withdrawn'));
    });
  });

  // ─── 5. /pay Command ────────────────────────────────────────────────────

  describe('/pay Command', () => {
    it('transfers coins to specified user and displays receipt', async () => {
      await claimDaily(GUILD_ID, CALLER_ID, new Date('2026-01-01T12:00:00Z'));

      const payInteraction = {
        token: 'token_pay_1',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID } },
        data: {
          name: 'pay',
          options: [
            { name: 'user', value: TARGET_ID },
            { name: 'amount', value: 75 },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handlePayCommand(payInteraction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Payment Sent'));
      assert.ok(embed?.description?.includes('75 coins'));
    });

    it('rejects self-transfer or insufficient funds with error embed', async () => {
      const selfPayInteraction = {
        token: 'token_pay_self',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID } },
        data: {
          name: 'pay',
          options: [
            { name: 'user', value: CALLER_ID },
            { name: 'amount', value: 10 },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handlePayCommand(selfPayInteraction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Payment Failed'));
    });
  });

  // ─── 6. /work & /crime Commands ─────────────────────────────────────────

  describe('/work & /crime Commands', () => {
    it('executes work shift and renders shift completion embed', async () => {
      setCustomRng(() => 0.5);

      const interaction = {
        token: 'token_work_1',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID, username: 'Coder' } },
        data: { name: 'work', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleWorkCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Work Shift Complete'));
      assert.ok(embed?.description?.includes('100'));
    });

    it('executes crime heist and renders outcome embed', async () => {
      setCustomRng(() => 0.2); // Win

      const interaction = {
        token: 'token_crime_1',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID, username: 'HeistLeader' } },
        data: { name: 'crime', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCrimeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Heist Successful'));
    });
  });

  // ─── 7. /shop & /buy Commands ───────────────────────────────────────────

  describe('/shop & /buy Commands', () => {
    it('displays server shop items and pagination buttons', async () => {
      // Add 6 items to trigger multi-page pagination (5 items/page)
      for (let i = 1; i <= 6; i++) {
        await addShopItem(GUILD_ID, {
          itemId: `item-${i}`,
          name: `Item Name ${i}`,
          price: i * 50,
          type: 'custom',
        });
      }

      const interaction = {
        token: 'token_shop_1',
        guild_id: GUILD_ID,
        data: { name: 'shop', options: [{ name: 'page', value: 1 }] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleShopCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Server Shop'));
      assert.equal(embed?.fields?.length, 5);

      const components = interceptedResponses[0].options.components;
      assert.ok(components && components.length > 0);
    });

    it('handles buy item command and autocomplete handler', async () => {
      await addShopItem(GUILD_ID, {
        itemId: 'legendary-sword',
        name: 'Legendary Sword',
        price: 100,
        type: 'custom',
      });

      // Give caller coins
      await claimDaily(GUILD_ID, CALLER_ID, new Date('2026-01-01T12:00:00Z'));

      const buyCmd = getCommand('buy');
      assert.ok(buyCmd?.autocomplete);

      // Test autocomplete query matching
      const autoChoices = await buyCmd.autocomplete({
        interaction: {},
        commandName: 'buy',
        focusedOption: { name: 'item_id', value: 'sword', type: 3 },
        guildId: GUILD_ID,
        userId: CALLER_ID,
      });

      assert.equal(autoChoices.length, 1);
      assert.equal(autoChoices[0].value, 'legendary-sword');

      // Test buying item
      const buyInteraction = {
        token: 'token_buy_1',
        guild_id: GUILD_ID,
        member: { user: { id: CALLER_ID } },
        data: {
          name: 'buy',
          options: [{ name: 'item_id', value: 'legendary-sword' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBuyCommand(buyInteraction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Purchase Successful'));
    });
  });

  // ─── 8. /shop-admin Subcommands ─────────────────────────────────────────

  describe('/shop-admin Command', () => {
    it('supports add, list, and remove subcommands', async () => {
      // 1. Add
      const addInteraction = {
        token: 'token_sa_add',
        guild_id: GUILD_ID,
        data: {
          name: 'shop-admin',
          options: [
            {
              name: 'add',
              options: [
                { name: 'id', value: 'vip-pass' },
                { name: 'name', value: 'VIP Pass' },
                { name: 'price', value: 300 },
                { name: 'role', value: 'role_vip_999' },
                { name: 'stock', value: 5 },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleShopAdminCommand(addInteraction);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Shop Item Saved'));

      // 2. List
      const listInteraction = {
        token: 'token_sa_list',
        guild_id: GUILD_ID,
        data: {
          name: 'shop-admin',
          options: [{ name: 'list' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleShopAdminCommand(listInteraction);
      assert.equal(interceptedResponses.length, 2);
      assert.ok(interceptedResponses[1].options.embeds?.[0].description?.includes('vip-pass'));

      // 3. Remove
      const removeInteraction = {
        token: 'token_sa_rem',
        guild_id: GUILD_ID,
        data: {
          name: 'shop-admin',
          options: [{ name: 'remove', options: [{ name: 'id', value: 'vip-pass' }] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleShopAdminCommand(removeInteraction);
      assert.equal(interceptedResponses.length, 3);
      assert.ok(interceptedResponses[2].options.embeds?.[0].title?.includes('Shop Item Removed'));
    });
  });

  // ─── 9. /rich Command & Component Interactions ──────────────────────────

  describe('/rich Command & Webhook Pagination Routing', () => {
    it('displays wealth leaderboard embed and pagination buttons', async () => {
      await claimDaily(GUILD_ID, CALLER_ID, new Date('2026-01-01T12:00:00Z'));
      await claimDaily(GUILD_ID, TARGET_ID, new Date('2026-01-01T12:00:00Z'));

      const richInteraction = {
        token: 'token_rich_1',
        guild_id: GUILD_ID,
        data: { name: 'rich', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRichCommand(richInteraction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Wealth Leaderboard'));
      assert.ok(embed?.description?.includes(CALLER_ID));
    });

    it('handles handleShopInteraction webhook pagination response', async () => {
      for (let i = 1; i <= 6; i++) {
        await addShopItem(GUILD_ID, {
          itemId: `p-item-${i}`,
          name: `Item ${i}`,
          price: 10 * i,
        });
      }

      const mockComponent = {
        token: 'token_shop_page_2',
        message: {
          embeds: [{ title: '🛒 MyServer — Server Shop' }],
        },
      } as unknown as APIMessageComponentInteraction;

      await handleShopInteraction('token_shop_page_2', GUILD_ID, 2, mockComponent);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].footer?.text?.includes('Page 2 of 2'));
    });

    it('handles handleRichInteraction webhook pagination response', async () => {
      await claimDaily(GUILD_ID, CALLER_ID, new Date('2026-01-01T12:00:00Z'));

      const mockComponent = {
        token: 'token_rich_page_1',
        message: {
          embeds: [{ title: '🏆 MyServer — Wealth Leaderboard' }],
        },
      } as unknown as APIMessageComponentInteraction;

      await handleRichInteraction('token_rich_page_1', GUILD_ID, 1, mockComponent);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('MyServer'));
    });
  });

  // ─── 10. Presentation & Visual Helpers ──────────────────────────────────

  describe('Presentation Helpers', () => {
    it('renderCapacityBar() renders visual meter accurately', () => {
      assert.equal(renderCapacityBar(0, 100), '`[░░░░░░░░░░]` 0%');
      assert.equal(renderCapacityBar(50, 100), '`[█████░░░░░]` 50%');
      assert.equal(renderCapacityBar(100, 100), '`[██████████]` 100%');
      assert.equal(renderCapacityBar(0, 0), '`[░░░░░░░░░░]` 0%');
    });

    it('formatDuration() formats milliseconds into readable string', () => {
      assert.equal(formatDuration(0), 'ready now');
      assert.equal(formatDuration(45_000), '45s');
      assert.equal(formatDuration(90_000), '1m 30s');
      assert.equal(formatDuration(3600_000), '1h');
      assert.equal(formatDuration(7500_000), '2h 5m');
    });

    it('buildShopPaginationRow & buildRichPaginationRow create valid button states', () => {
      const shopRow = buildShopPaginationRow(1, 3);
      assert.equal(shopRow.components.length, 5);
      assert.equal(shopRow.components[0].disabled, true); // First page prev disabled
      assert.equal(shopRow.components[3].disabled, false); // Next enabled

      const richRow = buildRichPaginationRow(3, 3);
      assert.equal(richRow.components.length, 5);
      assert.equal(richRow.components[3].disabled, true); // Last page next disabled
    });
    it('embed builders generate valid presentation objects', () => {
      const balanceEmbed = buildBalanceEmbed(
        { id: 'u1', username: 'Tester', avatar: 'https://cdn.test/avatar.png' },
        { wallet: 100, bank: 500, bankCapacity: 5000, dailyStreak: 3, inventory: [] } as unknown as import('@/models').IEconomyUser,
      );
      assert.ok(balanceEmbed.title?.includes('Tester'));
      assert.equal(balanceEmbed.fields?.length, 5);

      const dailyEmbed = buildDailyEmbed(
        { id: 'u1', username: 'Tester' },
        { alreadyClaimed: false, nextClaimInMs: 86400000, reward: 275, streak: 1, newBalance: 275 },
      );
      assert.ok(dailyEmbed.title?.includes('Daily Reward Claimed'));

      const workEmbed = buildWorkCrimeEmbed(
        { id: 'u1', username: 'Tester' },
        'work',
        { onCooldown: false, earned: 100, balance: 200, narrative: 'Worked shift' },
      );
      assert.ok(workEmbed.title?.includes('Work Shift Complete'));

      const emptyShopEmbed = buildShopEmbed('TestGuild', [], 1, 1);
      assert.ok(emptyShopEmbed.description?.includes('currently empty'));

      const emptyRichEmbed = buildEconomyLeaderboardEmbed('TestGuild', [], 1, 1);
      assert.ok(emptyRichEmbed.description?.includes('No economy data'));
    });
  });
});
