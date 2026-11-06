/**
 * test/levels/commands.test.ts
 * Unit tests for Phase 23 Slash Commands & Webhook Interactions:
 * - Central Command Registry lookup & metadata
 * - /rank command execution (self & target member)
 * - /leaderboard command execution & action row pagination buttons
 * - /level-rewards subcommands (add, list, remove)
 * - /level-config subcommands (view, set)
 * - handleLeaderboardInteraction webhook pagination response
 * - TemplateEngine custom level-up embed rendering
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommand,
  registerLevelCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleRankCommand,
  handleLeaderboardCommand,
  handleLevelRewardsCommand,
  handleLevelConfigCommand,
  handleLeaderboardInteraction,
  buildLeaderboardPaginationRow,
} from '@/commands/levels';
import {
  enableTestMode,
  clearTestStore,
  addMessageXp,
  getUserRank,
  configureLevelReward,
} from '@/lib/levels/xp-service';
import {
  buildRankCardEmbed,
  buildLeaderboardEmbed,
  buildLevelUpEmbed,
} from '@/lib/levels/level-embeds';
import { PermissionFlags } from '@/lib/discord/permissions';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';

describe('Levels & XP Progression — Slash Commands & Embeds', () => {
  const GUILD_ID = 'guild_cmd_999';
  const CALLER_ID = 'user_caller_01';
  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    registerLevelCommands();
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

  describe('Central Command Registry Integration', () => {
    it('registers /rank, /leaderboard, /level-rewards, and /level-config with category "levels"', () => {
      const rank = getCommand('rank');
      assert.ok(rank);
      assert.equal(rank.category, 'levels');
      assert.ok(rank.rateLimit);

      const lb = getCommand('leaderboard');
      assert.ok(lb);
      assert.equal(lb.category, 'levels');
      assert.ok(lb.rateLimit);

      const rewards = getCommand('level-rewards');
      assert.ok(rewards);
      assert.equal(rewards.category, 'levels');
      assert.equal(rewards.default_member_permissions, PermissionFlags.MANAGE_ROLES.toString());

      const config = getCommand('level-config');
      assert.ok(config);
      assert.equal(config.category, 'levels');
      assert.equal(config.default_member_permissions, PermissionFlags.MANAGE_GUILD.toString());
    });
  });

  describe('/rank Command Execution', () => {
    it('displays rank card embed for the invoking user', async () => {
      // Award initial XP
      await addMessageXp(GUILD_ID, CALLER_ID);

      const interaction = {
        token: 'mock_token_rank_1',
        guild_id: GUILD_ID,
        member: {
          user: { id: CALLER_ID, username: 'Alice' },
        },
        data: {
          name: 'rank',
          options: [],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRankCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds);
      assert.equal(res.options.embeds.length, 1);

      const embed = res.options.embeds[0];
      assert.ok(embed.title?.includes("Alice's Rank Card"));

      // Check fields: Rank, Level, Total XP, Progress, Total Messages
      const fieldNames = embed.fields?.map((f) => f.name) ?? [];
      assert.ok(fieldNames.some((n) => n.includes('Rank')));
      assert.ok(fieldNames.some((n) => n.includes('Level')));
      assert.ok(fieldNames.some((n) => n.includes('Total XP')));
      assert.ok(fieldNames.some((n) => n.includes('Progress')));
      assert.ok(fieldNames.some((n) => n.includes('Total Messages')));
    });

    it('displays rank card for a specified target member', async () => {
      const TARGET_ID = 'user_target_42';
      await addMessageXp(GUILD_ID, TARGET_ID);

      const interaction = {
        token: 'mock_token_rank_2',
        guild_id: GUILD_ID,
        member: {
          user: { id: CALLER_ID, username: 'Alice' },
        },
        data: {
          name: 'rank',
          options: [{ name: 'user', value: TARGET_ID, type: 6 }],
          resolved: {
            users: {
              [TARGET_ID]: { id: TARGET_ID, username: 'Bob', avatar: 'abc123avatar' },
            },
          },
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRankCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds![0];
      assert.ok(embed.title?.includes("Bob's Rank Card"));
      assert.ok(embed.thumbnail?.url.includes('abc123avatar'));
    });
  });

  describe('/leaderboard Command & Pagination', () => {
    it('displays server leaderboard with medal badges', async () => {
      // Create top users
      await addMessageXp(GUILD_ID, 'user_first');
      const u1 = (await getUserRank(GUILD_ID, 'user_first')).userLevel!;
      u1.xp = 1000;

      await addMessageXp(GUILD_ID, 'user_second');
      const u2 = (await getUserRank(GUILD_ID, 'user_second')).userLevel!;
      u2.xp = 500;

      const interaction = {
        token: 'mock_token_lb_1',
        guild_id: GUILD_ID,
        data: {
          name: 'leaderboard',
          options: [{ name: 'page', value: 1, type: 4 }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleLeaderboardCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      const embed = res.options.embeds![0];

      assert.ok(embed.title?.includes('XP Leaderboard'));
      assert.ok(embed.description?.includes('🥇')); // First place medal
      assert.ok(embed.description?.includes('🥈')); // Second place medal
      assert.ok(embed.description?.includes('1,000'));
    });

    it('generates interactive pagination buttons when multiple pages exist', () => {
      const row = buildLeaderboardPaginationRow(1, 3);
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 5);

      // Previous and first buttons disabled on page 1
      assert.equal(row.components[0].disabled, true);
      assert.equal(row.components[1].disabled, true);

      // Indicator button shows 1 / 3
      assert.equal(row.components[2].label, '1 / 3');

      // Next and last buttons enabled on page 1
      assert.equal(row.components[3].disabled, false);
      assert.equal(row.components[3].custom_id, 'leaderboard:2');
      assert.equal(row.components[4].disabled, false);
      assert.equal(row.components[4].custom_id, 'leaderboard:3');
    });

    it('handles leaderboard component webhook interaction for page navigation', async () => {
      for (let i = 1; i <= 15; i++) {
        const uid = `member_${i}`;
        await addMessageXp(GUILD_ID, uid);
        (await getUserRank(GUILD_ID, uid)).userLevel!.xp = i * 100;
      }

      const componentInteraction = {
        token: 'mock_token_comp_lb',
        guild_id: GUILD_ID,
        message: {
          embeds: [{ title: '🏆 Testing Guild — XP Leaderboard' }],
        },
      } as unknown as APIMessageComponentInteraction;

      await handleLeaderboardInteraction('mock_token_comp_lb', GUILD_ID, 2, componentInteraction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds);
      assert.ok(res.options.embeds[0].footer?.text.includes('Page 2 of 2'));
      assert.ok(res.options.components);
      assert.equal(res.options.components.length, 1);
    });
  });

  describe('/level-rewards Subcommands', () => {
    it('adds a level reward with confirmation embed', async () => {
      const interaction = {
        token: 'mock_token_rew_add',
        guild_id: GUILD_ID,
        data: {
          name: 'level-rewards',
          options: [
            {
              name: 'add',
              options: [
                { name: 'level', value: 5, type: 4 },
                { name: 'role', value: 'role_veteran_123', type: 8 },
              ],
            },
          ],
          resolved: {
            roles: {
              role_veteran_123: { id: 'role_veteran_123', name: 'Veteran' },
            },
          },
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleLevelRewardsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds![0];
      assert.ok(embed.title?.includes('Role Reward Configured'));
      assert.ok(embed.description?.includes('Veteran'));
      assert.ok(embed.description?.includes('Level 5'));
    });

    it('lists configured role rewards', async () => {
      await configureLevelReward(GUILD_ID, 1, 'role_lvl1', 'Novice');
      await configureLevelReward(GUILD_ID, 10, 'role_lvl10', 'Elite');

      const interaction = {
        token: 'mock_token_rew_list',
        guild_id: GUILD_ID,
        data: {
          name: 'level-rewards',
          options: [{ name: 'list' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleLevelRewardsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds![0];
      assert.ok(embed.description?.includes('Level 1'));
      assert.ok(embed.description?.includes('Novice'));
      assert.ok(embed.description?.includes('Level 10'));
      assert.ok(embed.description?.includes('Elite'));
    });

    it('removes a configured role reward', async () => {
      await configureLevelReward(GUILD_ID, 5, 'role_lvl5', 'Adept');

      const interaction = {
        token: 'mock_token_rew_rem',
        guild_id: GUILD_ID,
        data: {
          name: 'level-rewards',
          options: [
            {
              name: 'remove',
              options: [{ name: 'level', value: 5, type: 4 }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleLevelRewardsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds![0];
      assert.ok(embed.title?.includes('Role Reward Removed'));
      assert.ok(embed.description?.includes('Level 5'));
    });
  });

  describe('/level-config Subcommands', () => {
    it('views active server level configuration', async () => {
      const interaction = {
        token: 'mock_token_cfg_view',
        guild_id: GUILD_ID,
        data: {
          name: 'level-config',
          options: [{ name: 'view' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleLevelConfigCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds![0];
      assert.ok(embed.title?.includes('Level Progression Configuration'));
      assert.ok(embed.fields?.some((f) => f.name.includes('XP Multiplier')));
    });

    it('updates announcement channel, DM notifications, and XP multiplier', async () => {
      const interaction = {
        token: 'mock_token_cfg_set',
        guild_id: GUILD_ID,
        data: {
          name: 'level-config',
          options: [
            {
              name: 'set',
              options: [
                { name: 'channel', value: 'chan_announcements_01', type: 7 },
                { name: 'dm', value: true, type: 5 },
                { name: 'multiplier', value: 1.5, type: 10 },
                { name: 'template', value: 'GG {user.mention}, you hit level {level}!', type: 3 },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleLevelConfigCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds![0];
      assert.ok(embed.title?.includes('Configuration Updated'));
      assert.ok(embed.description?.includes('Announcement Channel'));
      assert.ok(embed.description?.includes('1.5x'));
    });
  });

  describe('TemplateEngine Integration & Embed Builders', () => {
    it('renders custom level-up embed via Phase 22 TemplateEngine', () => {
      const embed = buildLevelUpEmbed(
        { id: '123456', username: 'GamerSam', tag: 'GamerSam#0001' },
        15,
        { id: 'role_legend', name: 'Legend' },
        'Awesome job {user.mention}! You reached level {level} and unlocked {role_name}!',
      );

      assert.equal(embed.title, '🎉 Level Up!');
      assert.ok(embed.description?.includes('<@123456>'));
      assert.ok(embed.description?.includes('level 15'));
      assert.ok(embed.description?.includes('Legend'));
    });

    it('renders default level-up announcement when no template is provided', () => {
      const embed = buildLevelUpEmbed(
        { id: '789012', username: 'Alex' },
        3,
        { id: 'role_bronze', name: 'Bronze Member' },
      );

      assert.ok(embed.description?.includes('<@789012>'));
      assert.ok(embed.description?.includes('Level 3'));
      assert.ok(embed.description?.includes('Bronze Member'));
    });

    it('builds rank card embed with progress bar and optional voice stats', () => {
      const cardWithVoice = buildRankCardEmbed(
        { id: '444', username: 'VoiceUser' },
        {
          rank: 1,
          level: 5,
          xp: 1200,
          xpIntoLevel: 50,
          xpForNextLevel: 475,
          progressPercent: 11,
          totalMessages: 88,
          voiceSeconds: 3600,
        },
        { name: 'Voice Guild' },
      );

      assert.equal(cardWithVoice.title, "VoiceUser's Rank Card");
      assert.ok(cardWithVoice.fields?.some((f) => f.name.includes('Voice Activity') && f.value.includes('60 mins')));

      const cardWithoutVoice = buildRankCardEmbed(
        { id: '555', username: 'TextUser' },
        {
          rank: 2,
          level: 2,
          xp: 300,
          xpIntoLevel: 45,
          xpForNextLevel: 220,
          progressPercent: 20,
          totalMessages: 25,
        },
      );
      assert.equal(cardWithoutVoice.fields?.some((f) => f.name.includes('Voice Activity')), false);
    });

    it('builds leaderboard embed with fallback message when entries are empty', () => {
      const emptyLb = buildLeaderboardEmbed({ name: 'Empty Guild' }, [], 1, 1);
      assert.ok(emptyLb.title?.includes('Empty Guild'));
      assert.ok(emptyLb.description?.includes('No members have earned XP'));
    });
  });
});
