/**
 * test/starboard/starboard-service.test.ts
 * Unit tests for Starboard Community Hall of Fame Engine:
 * - Progressive Star Tier Badges (3 -> ⭐, 10 -> 🌟, 25 -> 💫, 50 -> ✨)
 * - Server Configuration management (setStarboardConfig, getStarboardConfig, toggleIgnoredChannel)
 * - Gating & Filters (unconfigured, disabled, ignored channels, self-star restrictions)
 * - Reaction Star Lifecycle (idempotency, threshold triggering, create_post, update_post)
 * - Star Removal & Threshold drops (delete_post when falling below minStars)
 * - Embed Builder (jump links, image detection, author info, footer badges)
 * - Analytics & Hall of Fame Leaderboards (top messages, top authors, author stats, server stats)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  getStarBadge,
  getStarboardConfig,
  setStarboardConfig,
  toggleIgnoredChannel,
  addStarReaction,
  removeStarReaction,
  setStarboardMessagePosted,
  buildStarboardEmbed,
  getTopStarredMessages,
  getTopStarredAuthors,
  getAuthorStarStats,
  getServerStarStats,
  STARBOARD_COLOR,
} from '@/lib/starboard/starboard-service';

describe('Starboard Community Hall of Fame — Service Engine', () => {
  const GUILD_ID = 'guild_star_9001';
  const STARBOARD_CHANNEL = 'channel_starboard_111';
  const CHAT_CHANNEL = 'channel_general_222';
  const IGNORED_CHANNEL = 'channel_spam_333';
  const USER_AUTHOR = 'user_author_401';
  const USER_ALICE = 'user_alice_402';
  const USER_BOB = 'user_bob_403';
  const USER_CHARLIE = 'user_charlie_404';
  const USER_DAVE = 'user_dave_405';
  const MSG_ID_1 = 'msg_first_10001';
  const MSG_ID_2 = 'msg_second_10002';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  // ─── 1. Progressive Star Tier Badges ────────────────────────────────────────

  describe('Progressive Star Tier Badges', () => {
    it('maps 3 -> ⭐, 10 -> 🌟, 25 -> 💫, 50 -> ✨ correctly', () => {
      // 3-9 tier: ⭐
      assert.strictEqual(getStarBadge(1), '⭐');
      assert.strictEqual(getStarBadge(3), '⭐');
      assert.strictEqual(getStarBadge(5), '⭐');
      assert.strictEqual(getStarBadge(9), '⭐');

      // 10-24 tier: 🌟
      assert.strictEqual(getStarBadge(10), '🌟');
      assert.strictEqual(getStarBadge(15), '🌟');
      assert.strictEqual(getStarBadge(24), '🌟');

      // 25-49 tier: 💫
      assert.strictEqual(getStarBadge(25), '💫');
      assert.strictEqual(getStarBadge(35), '💫');
      assert.strictEqual(getStarBadge(49), '💫');

      // 50+ tier: ✨
      assert.strictEqual(getStarBadge(50), '✨');
      assert.strictEqual(getStarBadge(75), '✨');
      assert.strictEqual(getStarBadge(100), '✨');
    });
  });

  // ─── 2. Configuration Management ───────────────────────────────────────────

  describe('Configuration Helpers', () => {
    it('initializes and updates starboard server configuration', async () => {
      const initial = await getStarboardConfig(GUILD_ID);
      assert.strictEqual(initial, null, 'Unconfigured server should return null');

      const config = await setStarboardConfig(GUILD_ID, {
        channelId: STARBOARD_CHANNEL,
        minStars: 3,
        emoji: '⭐',
        selfStar: false,
        enabled: true,
      });

      assert.strictEqual(config.guildId, GUILD_ID);
      assert.strictEqual(config.channelId, STARBOARD_CHANNEL);
      assert.strictEqual(config.minStars, 3);
      assert.strictEqual(config.emoji, '⭐');
      assert.strictEqual(config.selfStar, false);
      assert.strictEqual(config.enabled, true);

      // Verify retrieval
      const fetched = await getStarboardConfig(GUILD_ID);
      assert.ok(fetched);
      assert.strictEqual(fetched.channelId, STARBOARD_CHANNEL);

      // Partial updates
      const updated = await setStarboardConfig(GUILD_ID, { minStars: 5, selfStar: true });
      assert.strictEqual(updated.minStars, 5);
      assert.strictEqual(updated.selfStar, true);
      assert.strictEqual(updated.channelId, STARBOARD_CHANNEL, 'channelId should be preserved');
    });

    it('toggles and manages ignored channels correctly', async () => {
      await setStarboardConfig(GUILD_ID, { channelId: STARBOARD_CHANNEL });

      // 1. Toggle on (ignore)
      const res1 = await toggleIgnoredChannel(GUILD_ID, IGNORED_CHANNEL);
      assert.strictEqual(res1.ignored, true);
      assert.ok(res1.ignoredChannels.includes(IGNORED_CHANNEL));

      // 2. Toggle off (unignore)
      const res2 = await toggleIgnoredChannel(GUILD_ID, IGNORED_CHANNEL);
      assert.strictEqual(res2.ignored, false);
      assert.strictEqual(res2.ignoredChannels.includes(IGNORED_CHANNEL), false);

      // 3. Explicit remove = false (add to ignored)
      const res3 = await toggleIgnoredChannel(GUILD_ID, IGNORED_CHANNEL, false);
      assert.strictEqual(res3.ignored, true);
      assert.ok(res3.ignoredChannels.includes(IGNORED_CHANNEL));

      // 4. Explicit remove = true (remove from ignored)
      const res4 = await toggleIgnoredChannel(GUILD_ID, IGNORED_CHANNEL, true);
      assert.strictEqual(res4.ignored, false);
      assert.strictEqual(res4.ignoredChannels.includes(IGNORED_CHANNEL), false);
    });
  });

  // ─── 3. Gating & Restrictions ──────────────────────────────────────────────

  describe('Gating & Channel/Self-Star Filters', () => {
    it('rejects star reactions when starboard is not configured', async () => {
      const result = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_ALICE,
        authorId: USER_AUTHOR,
      });

      assert.strictEqual(result.action, 'not_configured');
      assert.strictEqual(result.starCount, 0);
    });

    it('rejects star reactions when starboard is disabled', async () => {
      await setStarboardConfig(GUILD_ID, { channelId: STARBOARD_CHANNEL, enabled: false });

      const result = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_ALICE,
        authorId: USER_AUTHOR,
      });

      assert.strictEqual(result.action, 'disabled');
      assert.strictEqual(result.starCount, 0);
    });

    it('rejects reactions from ignored channels', async () => {
      await setStarboardConfig(GUILD_ID, {
        channelId: STARBOARD_CHANNEL,
        ignoredChannels: [IGNORED_CHANNEL],
      });

      const result = await addStarReaction({
        guildId: GUILD_ID,
        channelId: IGNORED_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_ALICE,
        authorId: USER_AUTHOR,
      });

      assert.strictEqual(result.action, 'ignored');
      assert.strictEqual(result.starCount, 0);
    });

    it('blocks self-starring when selfStar is false', async () => {
      await setStarboardConfig(GUILD_ID, { channelId: STARBOARD_CHANNEL, selfStar: false });

      const result = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_AUTHOR,
        authorId: USER_AUTHOR,
      });

      assert.strictEqual(result.action, 'self_star_rejected');
      assert.strictEqual(result.starCount, 0);
    });

    it('permits self-starring when selfStar is true in configuration', async () => {
      await setStarboardConfig(GUILD_ID, {
        channelId: STARBOARD_CHANNEL,
        selfStar: true,
        minStars: 3,
      });

      const result = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_AUTHOR,
        authorId: USER_AUTHOR,
      });

      assert.strictEqual(result.action, 'threshold_not_met');
      assert.strictEqual(result.starCount, 1);
    });
  });

  // ─── 4. Reaction Idempotency & Threshold Mechanics ─────────────────────────

  describe('Star Action Lifecycle & Threshold Mechanics', () => {
    beforeEach(async () => {
      await setStarboardConfig(GUILD_ID, {
        channelId: STARBOARD_CHANNEL,
        minStars: 3,
        selfStar: false,
      });
    });

    it('enforces reaction idempotency for duplicate reactions by the same user', async () => {
      const res1 = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_ALICE,
        authorId: USER_AUTHOR,
        content: 'Hello Starboard!',
      });
      assert.strictEqual(res1.action, 'threshold_not_met');
      assert.strictEqual(res1.starCount, 1);

      // Duplicate reaction by Alice
      const res2 = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_ALICE,
        authorId: USER_AUTHOR,
      });
      assert.strictEqual(res2.action, 'already_starred');
      assert.strictEqual(res2.starCount, 1, 'Star count should not increment on duplicate');
    });

    it('triggers create_post at threshold, and update_post on subsequent stars', async () => {
      // Star 1 (Alice) -> threshold_not_met
      const s1 = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_ALICE,
        authorId: USER_AUTHOR,
        content: 'Legendary quote here',
      });
      assert.strictEqual(s1.action, 'threshold_not_met');
      assert.strictEqual(s1.starCount, 1);

      // Star 2 (Bob) -> threshold_not_met
      const s2 = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_BOB,
        authorId: USER_AUTHOR,
      });
      assert.strictEqual(s2.action, 'threshold_not_met');
      assert.strictEqual(s2.starCount, 2);

      // Star 3 (Charlie) -> reaches minStars (3) -> create_post!
      const s3 = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_CHARLIE,
        authorId: USER_AUTHOR,
      });
      assert.strictEqual(s3.action, 'create_post');
      assert.strictEqual(s3.starCount, 3);
      assert.strictEqual(s3.badge, '⭐');
      assert.ok(s3.embed);
      assert.ok(s3.embed.fields?.some((f) => f.name === 'Jump to message'));

      // Simulate bot posting to Discord starboard channel and setting starboardMessageId
      const postedMsg = await setStarboardMessagePosted(GUILD_ID, MSG_ID_1, 'starboard_post_888');
      assert.strictEqual(postedMsg?.starboardMessageId, 'starboard_post_888');

      // Star 4 (Dave) -> update_post
      const s4 = await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_DAVE,
        authorId: USER_AUTHOR,
      });
      assert.strictEqual(s4.action, 'update_post');
      assert.strictEqual(s4.starCount, 4);
      assert.strictEqual(s4.embed?.footer?.text, '⭐ 4 | ID: msg_first_10001');
    });
  });

  // ─── 5. Star Removal Mechanics ─────────────────────────────────────────────

  describe('Star Removal Logic', () => {
    beforeEach(async () => {
      await setStarboardConfig(GUILD_ID, {
        channelId: STARBOARD_CHANNEL,
        minStars: 3,
      });
    });

    it('returns not_starred when removing reaction from a message never starred by user', async () => {
      const res = await removeStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_ALICE,
      });
      assert.strictEqual(res.action, 'not_starred');
    });

    it('triggers delete_post when star count drops below minStars', async () => {
      // Add 3 stars to cross threshold
      await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_ALICE,
        authorId: USER_AUTHOR,
        content: 'Soon to be unstarred',
      });
      await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_BOB,
        authorId: USER_AUTHOR,
      });
      await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_CHARLIE,
        authorId: USER_AUTHOR,
      });

      // Mark as posted to starboard
      await setStarboardMessagePosted(GUILD_ID, MSG_ID_1, 'starboard_post_999');

      // Now remove Charlie's star -> starCount drops from 3 to 2 -> below threshold -> delete_post!
      const remResult = await removeStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_CHARLIE,
      });

      assert.strictEqual(remResult.action, 'delete_post');
      assert.strictEqual(remResult.starCount, 2);
    });

    it('triggers update_post when star count decreases but remains above threshold', async () => {
      // 4 stars
      for (const u of [USER_ALICE, USER_BOB, USER_CHARLIE, USER_DAVE]) {
        await addStarReaction({
          guildId: GUILD_ID,
          channelId: CHAT_CHANNEL,
          messageId: MSG_ID_1,
          userId: u,
          authorId: USER_AUTHOR,
        });
      }
      await setStarboardMessagePosted(GUILD_ID, MSG_ID_1, 'starboard_post_999');

      // Remove Dave's star -> 4 down to 3 -> still >= 3 -> update_post!
      const remResult = await removeStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_1,
        userId: USER_DAVE,
      });

      assert.strictEqual(remResult.action, 'update_post');
      assert.strictEqual(remResult.starCount, 3);
      assert.ok(remResult.embed);
    });
  });

  // ─── 6. Embed Builder ──────────────────────────────────────────────────────

  describe('buildStarboardEmbed()', () => {
    it('generates rich embed with jump links, author info, and footer badges', () => {
      const embed = buildStarboardEmbed({
        guildId: GUILD_ID,
        originalChannelId: CHAT_CHANNEL,
        originalMessageId: MSG_ID_1,
        authorId: USER_AUTHOR,
        authorName: 'MasterAuthor',
        authorAvatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png',
        content: 'Check out this awesome screenshot!',
        attachments: ['https://cdn.discordapp.com/attachments/123/shot.png'],
        starCount: 15,
      });

      assert.strictEqual(embed.color, STARBOARD_COLOR);
      assert.strictEqual(embed.author?.name, 'MasterAuthor');
      assert.strictEqual(embed.author?.icon_url, 'https://cdn.discordapp.com/avatars/123/avatar.png');
      assert.strictEqual(embed.description, 'Check out this awesome screenshot!');
      assert.strictEqual(embed.image?.url, 'https://cdn.discordapp.com/attachments/123/shot.png');
      assert.strictEqual(embed.footer?.text, '🌟 15 | ID: msg_first_10001');

      // Check fields
      const jumpField = embed.fields?.find((f) => f.name === 'Jump to message');
      assert.ok(jumpField);
      assert.ok(
        jumpField.value.includes(
          `https://discord.com/channels/${GUILD_ID}/${CHAT_CHANNEL}/${MSG_ID_1}`,
        ),
      );
    });

    it('falls back gracefully when message has no text but has non-image attachment', () => {
      const embed = buildStarboardEmbed({
        guildId: GUILD_ID,
        originalChannelId: CHAT_CHANNEL,
        originalMessageId: MSG_ID_2,
        authorId: USER_AUTHOR,
        content: '',
        attachments: ['https://cdn.discordapp.com/attachments/123/archive.zip'],
        starCount: 5,
      });

      assert.strictEqual(embed.description, '*Attachment-only message*');
      assert.strictEqual(embed.image, undefined, 'Non-image should not set embed.image');
      assert.strictEqual(embed.footer?.text, '⭐ 5 | ID: msg_second_10002');
    });
  });

  // ─── 7. Analytics & Leaderboards ───────────────────────────────────────────

  describe('Leaderboards & Analytics Aggregation', () => {
    beforeEach(async () => {
      await setStarboardConfig(GUILD_ID, { channelId: STARBOARD_CHANNEL, minStars: 1 });

      // Alice wrote Message 1 (receives 3 stars)
      for (const u of [USER_BOB, USER_CHARLIE, USER_DAVE]) {
        await addStarReaction({
          guildId: GUILD_ID,
          channelId: CHAT_CHANNEL,
          messageId: MSG_ID_1,
          userId: u,
          authorId: USER_ALICE,
          content: 'Alice first post',
        });
      }

      // Bob wrote Message 2 (receives 1 star)
      await addStarReaction({
        guildId: GUILD_ID,
        channelId: CHAT_CHANNEL,
        messageId: MSG_ID_2,
        userId: USER_CHARLIE,
        authorId: USER_BOB,
        content: 'Bob post',
      });
    });

    it('retrieves top starred messages sorted by star count descending', async () => {
      const top = await getTopStarredMessages(GUILD_ID, 10);
      assert.strictEqual(top.length, 2);
      assert.strictEqual(top[0].originalMessageId, MSG_ID_1);
      assert.strictEqual(top[0].starCount, 3);
      assert.strictEqual(top[1].originalMessageId, MSG_ID_2);
      assert.strictEqual(top[1].starCount, 1);
    });

    it('aggregates top starred authors by total stars and message count', async () => {
      const topAuthors = await getTopStarredAuthors(GUILD_ID, 5);
      assert.strictEqual(topAuthors.length, 2);
      assert.strictEqual(topAuthors[0].authorId, USER_ALICE);
      assert.strictEqual(topAuthors[0].totalStars, 3);
      assert.strictEqual(topAuthors[0].messageCount, 1);

      assert.strictEqual(topAuthors[1].authorId, USER_BOB);
      assert.strictEqual(topAuthors[1].totalStars, 1);
      assert.strictEqual(topAuthors[1].messageCount, 1);
    });

    it('retrieves individual author starboard statistics', async () => {
      const stats = await getAuthorStarStats(GUILD_ID, USER_ALICE);
      assert.strictEqual(stats.authorId, USER_ALICE);
      assert.strictEqual(stats.totalStars, 3);
      assert.strictEqual(stats.messageCount, 1);
      assert.strictEqual(stats.topMessage?.originalMessageId, MSG_ID_1);
    });

    it('retrieves server-wide starboard statistics', async () => {
      const serverStats = await getServerStarStats(GUILD_ID);
      assert.strictEqual(serverStats.totalStarredMessages, 2);
      assert.strictEqual(serverStats.totalStarsGiven, 4);
      assert.strictEqual(serverStats.topAuthor?.authorId, USER_ALICE);
      assert.strictEqual(serverStats.topAuthor?.totalStars, 3);
    });
  });
});
