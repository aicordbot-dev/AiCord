/**
 * test/starboard/commands.test.ts
 * Unit tests for Starboard Community Hall of Fame Slash Commands Suite:
 * - Central Command Registry lookup & subcommands schema verification
 * - Permission checks (MANAGE_GUILD required for config & ignore)
 * - /starboard config (channel setting, min_stars, self_star, emoji, enabled)
 * - /starboard ignore (ignoring & unignoring channels)
 * - /starboard top (empty state & populated leaderboard)
 * - /starboard stats (author-specific stats & server-wide overview)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { getCommand, registerStarboardCommands } from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleStarboardCommand,
  handleStarboardConfigSubcommand,
  handleStarboardIgnoreSubcommand,
  handleStarboardTopSubcommand,
  handleStarboardStatsSubcommand,
} from '@/commands/starboard';
import {
  enableTestMode,
  clearTestStore,
  getStarboardConfig,
  setStarboardConfig,
  addStarReaction,
  setStarboardMessagePosted,
} from '@/lib/starboard/starboard-service';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Starboard Community Hall of Fame — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_star_cmd_777';
  const CHANNEL_STARBOARD = 'channel_starboard_888';
  const CHANNEL_CHAT = 'channel_general_999';
  const CHANNEL_MEMES = 'channel_memes_111';
  const USER_ADMIN = 'user_admin_001';
  const USER_REGULAR = 'user_regular_002';
  const USER_STAR = 'user_star_creator_003';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

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

  // ─── 1. Command Registry Lookup ──────────────────────────────────────────────

  describe('Command Registry Integration', () => {
    it('registers /starboard with community category and 4 subcommands', () => {
      registerStarboardCommands();
      const cmd = getCommand('starboard');
      assert.ok(cmd, 'starboard command should be found in registry');
      assert.strictEqual(cmd.name, 'starboard');
      assert.strictEqual(cmd.category, 'community');
      assert.strictEqual(cmd.options?.length, 4);

      const subcommands = (cmd.options as Array<{ name: string }>).map((o) => o.name);
      assert.ok(subcommands.includes('config'));
      assert.ok(subcommands.includes('top'));
      assert.ok(subcommands.includes('stats'));
      assert.ok(subcommands.includes('ignore'));
    });
  });

  // ─── 2. Permission Verification ──────────────────────────────────────────────

  describe('Permission Checks (MANAGE_GUILD)', () => {
    it('rejects /starboard config when user lacks MANAGE_GUILD permission', async () => {
      const interaction = {
        id: 'int_1',
        token: 'token_no_perm_config',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_REGULAR },
          permissions: '0',
        },
        data: {
          name: 'starboard',
          options: [
            {
              name: 'config',
              options: [{ name: 'channel', value: CHANNEL_STARBOARD }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Permission Denied'));
    });

    it('rejects /starboard ignore when user lacks MANAGE_GUILD permission', async () => {
      const interaction = {
        id: 'int_2',
        token: 'token_no_perm_ignore',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_REGULAR },
          permissions: '0',
        },
        data: {
          name: 'starboard',
          options: [
            {
              name: 'ignore',
              options: [{ name: 'channel', value: CHANNEL_MEMES }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Permission Denied'));
    });
  });

  // ─── 3. /starboard config Subcommand ─────────────────────────────────────────

  describe('/starboard config Subcommand', () => {
    it('configures starboard channel and custom settings when user has MANAGE_GUILD', async () => {
      const interaction = {
        id: 'int_3',
        token: 'token_admin_config',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ADMIN },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'starboard',
          options: [
            {
              name: 'config',
              options: [
                { name: 'channel', value: CHANNEL_STARBOARD },
                { name: 'min_stars', value: 5 },
                { name: 'self_star', value: true },
                { name: 'emoji', value: '🌟' },
                { name: 'enabled', value: true },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Starboard Configured'));

      // Verify stored configuration
      const config = await getStarboardConfig(GUILD_ID);
      assert.ok(config);
      assert.strictEqual(config.channelId, CHANNEL_STARBOARD);
      assert.strictEqual(config.minStars, 5);
      assert.strictEqual(config.selfStar, true);
      assert.strictEqual(config.emoji, '🌟');
      assert.strictEqual(config.enabled, true);
    });

    it('rejects config when channel option is omitted', async () => {
      await handleStarboardConfigSubcommand(
        'token_missing_channel',
        GUILD_ID,
        PermissionFlags.MANAGE_GUILD.toString(),
        [],
      );
      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Missing Parameter'));
    });
  });

  // ─── 4. /starboard ignore Subcommand ─────────────────────────────────────────

  describe('/starboard ignore Subcommand', () => {
    it('ignores and unignores a channel when user has MANAGE_GUILD', async () => {
      await setStarboardConfig(GUILD_ID, { channelId: CHANNEL_STARBOARD });

      // 1. Ignore channel
      const intIgnore = {
        id: 'int_4',
        token: 'token_ignore_add',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ADMIN },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'starboard',
          options: [
            {
              name: 'ignore',
              options: [{ name: 'channel', value: CHANNEL_MEMES }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(intIgnore);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Channel Ignored'));

      const config1 = await getStarboardConfig(GUILD_ID);
      assert.ok(config1?.ignoredChannels.includes(CHANNEL_MEMES));

      // 2. Unignore channel
      const intUnignore = {
        id: 'int_5',
        token: 'token_ignore_remove',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ADMIN },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'starboard',
          options: [
            {
              name: 'ignore',
              options: [
                { name: 'channel', value: CHANNEL_MEMES },
                { name: 'remove', value: true },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(intUnignore);
      assert.strictEqual(interceptedResponses.length, 2);
      assert.ok(interceptedResponses[1].options.embeds?.[0].title?.includes('Channel Unignored'));

      const config2 = await getStarboardConfig(GUILD_ID);
      assert.strictEqual(config2?.ignoredChannels.includes(CHANNEL_MEMES), false);
    });
  });

  // ─── 5. /starboard top Subcommand ────────────────────────────────────────────

  describe('/starboard top Subcommand', () => {
    it('returns informative empty message when no messages are starred', async () => {
      const interaction = {
        id: 'int_6',
        token: 'token_top_empty',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_REGULAR },
          permissions: '0',
        },
        data: {
          name: 'starboard',
          options: [{ name: 'top', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Starboard Hall of Fame'));
      assert.ok(resp.embeds?.[0].description?.includes('No starred messages'));
    });

    it('returns populated Hall of Fame leaderboard with rankings and jump links', async () => {
      await setStarboardConfig(GUILD_ID, { channelId: CHANNEL_STARBOARD, minStars: 1 });

      // Add stars to message
      await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHANNEL_CHAT,
        messageId: 'msg_popular_99',
        userId: USER_ADMIN,
        authorId: USER_STAR,
        content: 'This message is famous!',
      });
      await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHANNEL_CHAT,
        messageId: 'msg_popular_99',
        userId: USER_REGULAR,
        authorId: USER_STAR,
      });

      const interaction = {
        id: 'int_7',
        token: 'token_top_populated',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_REGULAR },
          permissions: '0',
        },
        data: {
          name: 'starboard',
          options: [
            {
              name: 'top',
              options: [{ name: 'limit', value: 5 }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Starboard Community Hall of Fame'));
      assert.ok(resp.embeds?.[0].description?.includes('**#1**'));
      assert.ok(resp.embeds?.[0].description?.includes(`<@${USER_STAR}>`));
      assert.ok(resp.embeds?.[0].description?.includes('Jump to message'));
    });
  });

  // ─── 6. /starboard stats Subcommand ──────────────────────────────────────────

  describe('/starboard stats Subcommand', () => {
    beforeEach(async () => {
      await setStarboardConfig(GUILD_ID, { channelId: CHANNEL_STARBOARD, minStars: 1 });

      await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHANNEL_CHAT,
        messageId: 'msg_stats_1',
        userId: USER_ADMIN,
        authorId: USER_STAR,
        content: 'Great post!',
      });
      await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHANNEL_CHAT,
        messageId: 'msg_stats_1',
        userId: USER_REGULAR,
        authorId: USER_STAR,
      });
    });

    it('returns server-wide overview when no user option is provided', async () => {
      const interaction = {
        id: 'int_8',
        token: 'token_stats_server',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_REGULAR },
          permissions: '0',
        },
        data: {
          name: 'starboard',
          options: [{ name: 'stats', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Server Starboard Overview'));
      assert.ok(resp.embeds?.[0].fields?.some((f) => f.name === 'Total Stars Awarded'));
      assert.ok(resp.embeds?.[0].fields?.some((f) => f.name === 'Hall of Fame Messages'));
    });

    it('returns member-specific statistics when user option is specified', async () => {
      const interaction = {
        id: 'int_9',
        token: 'token_stats_user',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_REGULAR },
          permissions: '0',
        },
        data: {
          name: 'starboard',
          options: [
            {
              name: 'stats',
              options: [{ name: 'user', value: USER_STAR }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Member Starboard Statistics'));
      assert.ok(resp.embeds?.[0].fields?.some((f) => f.name === 'Total Stars Received'));
      assert.ok(resp.embeds?.[0].fields?.some((f) => f.name === 'Hall of Fame Entries'));
    });
  });

  // ─── 7. Direct Error Handling ────────────────────────────────────────────────

  describe('Direct Error & DM Handling', () => {
    it('rejects command when executed outside of a guild', async () => {
      const interaction = {
        id: 'int_dm',
        token: 'token_dm',
        data: { name: 'starboard', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('only be used in a server'));
    });

    it('returns error embed for unknown subcommands', async () => {
      const interaction = {
        id: 'int_unknown',
        token: 'token_unknown',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ADMIN },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'starboard',
          options: [{ name: 'nonexistent', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleStarboardCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Unknown Subcommand'));
    });
  });
});
