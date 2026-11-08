/**
 * test/confessions/confession-service.test.ts
 * Unit tests for Anonymous Confessions & Mutual Matchmaker Hub — Service Engine:
 * - Test mode store management (enableTestMode, clearTestStore, isTestMode, setTestConfig, getTestConfig, setTestConfession, getTestConfession, setTestCrush, getTestCrush)
 * - Confession submission with auto-incrementing ID (#1, #2, #3...)
 * - Content length validation (10 to 1000 characters)
 * - Built-in profanity / toxicity filter and toggle settings
 * - Disabled confession submission rejection
 * - Community voting mechanics (wholesome, funny, redFlag toggles, multi-user counts)
 * - Secret mutual crush matchmaking (self-crush block, unilateral crush, reciprocal mutual match celebration)
 * - Top confessions leaderboard ranking by total community votes
 * - Embed builder formatting (replyTo note, vote counts footer, rose pink color)
 * - Interactive action component builder (live vote counts on button labels)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestConfig,
  getTestConfig,
  setTestConfession,
  getTestConfession,
  setTestCrush,
  getTestCrush,
  getConfessionConfig,
  setConfessionConfig,
  submitConfession,
  voteConfession,
  registerCrush,
  getTopConfessions,
  buildConfessionEmbed,
  buildConfessionComponents,
  containsProfanity,
  PROFANITY_WORDLIST,
  VOTE_LABELS,
  type IConfession,
} from '@/lib/confessions/confession-service';

describe('Anonymous Confessions & Matchmaker Hub — Service Engine', () => {
  const GUILD_ID = 'guild_confess_test_100';
  const USER_1 = 'user_alice_111';
  const USER_2 = 'user_bob_222';
  const USER_3 = 'user_charlie_333';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    setTestConfig({
      guildId: GUILD_ID,
      channelId: 'channel_confessions_999',
      filterProfanity: true,
      enabled: true,
    });
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('Test Store State & Config Management', () => {
    it('manages testMode state correctly', () => {
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
    });

    it('stores and retrieves configuration per guild', async () => {
      const config = await getConfessionConfig(GUILD_ID);
      assert.strictEqual(config.guildId, GUILD_ID);
      assert.strictEqual(config.channelId, 'channel_confessions_999');
      assert.strictEqual(config.filterProfanity, true);
      assert.strictEqual(config.enabled, true);

      // Update config
      const updated = await setConfessionConfig(GUILD_ID, {
        channelId: 'channel_new_888',
        filterProfanity: false,
        enabled: false,
      });

      assert.strictEqual(updated.channelId, 'channel_new_888');
      assert.strictEqual(updated.filterProfanity, false);
      assert.strictEqual(updated.enabled, false);

      const retrieved = getTestConfig(GUILD_ID);
      assert.strictEqual(retrieved?.channelId, 'channel_new_888');
    });

    it('returns default config when unconfigured', async () => {
      const randomGuild = 'guild_unconfigured_000';
      const config = await getConfessionConfig(randomGuild);
      assert.strictEqual(config.guildId, randomGuild);
      assert.strictEqual(config.channelId, '');
      assert.strictEqual(config.filterProfanity, true);
      assert.strictEqual(config.enabled, true);
    });
  });

  describe('Profanity & Toxicity Word Filter', () => {
    it('detects common profanities and slurs', () => {
      assert.strictEqual(containsProfanity('This is a clean confession.'), false);
      assert.strictEqual(containsProfanity('I like you so much!'), false);

      assert.strictEqual(containsProfanity('You are a fucking idiot'), true);
      assert.strictEqual(containsProfanity('What the shit is that?'), true);
      assert.strictEqual(containsProfanity('Go kill yourself right now'), true);
      assert.strictEqual(containsProfanity('You should kys'), true);
      assert.strictEqual(containsProfanity('f u c k this'), true);
      assert.strictEqual(containsProfanity('b!tch please'), true);
    });

    it('validates against the entire wordlist', () => {
      for (const word of PROFANITY_WORDLIST) {
        assert.strictEqual(
          containsProfanity(`Hello ${word} test`),
          true,
          `Failed to detect profanity: ${word}`,
        );
      }
    });
  });

  describe('Confession Submission & Numbering', () => {
    it('submits a valid confession and increments ID sequentially (#1, #2, #3)', async () => {
      const c1 = await submitConfession(
        GUILD_ID,
        'I secretly put googly eyes on all the monitors in the office.',
      );
      assert.strictEqual(c1.confessionId, 1);
      assert.strictEqual(
        c1.content,
        'I secretly put googly eyes on all the monitors in the office.',
      );
      assert.strictEqual(c1.status, 'approved');
      assert.deepStrictEqual(c1.votes, { wholesome: [], funny: [], redFlag: [] });

      const c2 = await submitConfession(
        GUILD_ID,
        'I have been learning guitar in secret to serenade my crush.',
      );
      assert.strictEqual(c2.confessionId, 2);

      const c3 = await submitConfession(
        GUILD_ID,
        'I actually enjoy pineapple on pizza and I will not apologize.',
      );
      assert.strictEqual(c3.confessionId, 3);
    });

    it('supports replies to previous confessions via replyToId', async () => {
      const parent = await submitConfession(
        GUILD_ID,
        'Does anyone else stay up until 3am reading manga?',
      );
      assert.strictEqual(parent.confessionId, 1);

      const reply = await submitConfession(
        GUILD_ID,
        'Yes! I read One Piece until the sun comes up every weekend.',
        parent.confessionId,
      );
      assert.strictEqual(reply.confessionId, 2);
      assert.strictEqual(reply.replyToId, 1);
    });

    it('enforces minimum content length of 10 characters', async () => {
      await assert.rejects(
        () => submitConfession(GUILD_ID, 'Too short'),
        /at least 10 characters/,
      );

      await assert.rejects(
        () => submitConfession(GUILD_ID, '   hi   '),
        /at least 10 characters/,
      );
    });

    it('enforces maximum content length of 1000 characters', async () => {
      const hugeContent = 'a'.repeat(1001);
      await assert.rejects(
        () => submitConfession(GUILD_ID, hugeContent),
        /cannot exceed 1000 characters/,
      );
    });

    it('rejects confessions containing profanity when filter is enabled', async () => {
      await assert.rejects(
        () =>
          submitConfession(
            GUILD_ID,
            'I hate this fucking server so much honestly',
          ),
        /prohibited or profane language/,
      );
    });

    it('allows confessions with profanity if filterProfanity is disabled', async () => {
      await setConfessionConfig(GUILD_ID, { filterProfanity: false });
      const c = await submitConfession(
        GUILD_ID,
        'I hate this fucking server so much honestly',
      );
      assert.strictEqual(c.confessionId, 1);
    });

    it('rejects confession submission when service is disabled in config', async () => {
      await setConfessionConfig(GUILD_ID, { enabled: false });
      await assert.rejects(
        () => submitConfession(GUILD_ID, 'This should fail because confessions are off.'),
        /currently disabled/,
      );
    });
  });

  describe('Community Reaction Voting Mechanics', () => {
    let confessionId: number;

    beforeEach(async () => {
      const c = await submitConfession(
        GUILD_ID,
        'I accidentally drank cold brew at midnight and painted a masterpiece.',
      );
      confessionId = c.confessionId;
    });

    it('toggles voting on for wholesome, funny, and redFlag', async () => {
      // Alice votes wholesome
      const res1 = await voteConfession(GUILD_ID, confessionId, USER_1, 'wholesome');
      assert.strictEqual(res1.toggledOn, true);
      assert.strictEqual(res1.voteType, 'wholesome');
      assert.deepStrictEqual(res1.votes.wholesome, [USER_1]);
      assert.deepStrictEqual(res1.votes.funny, []);
      assert.deepStrictEqual(res1.votes.redFlag, []);

      // Bob votes funny
      const res2 = await voteConfession(GUILD_ID, confessionId, USER_2, 'funny');
      assert.strictEqual(res2.toggledOn, true);
      assert.deepStrictEqual(res2.votes.wholesome, [USER_1]);
      assert.deepStrictEqual(res2.votes.funny, [USER_2]);

      // Charlie votes redFlag
      const res3 = await voteConfession(GUILD_ID, confessionId, USER_3, 'redFlag');
      assert.strictEqual(res3.toggledOn, true);
      assert.deepStrictEqual(res3.votes.redFlag, [USER_3]);
    });

    it('toggles voting off when user votes again on the same category', async () => {
      // Alice votes wholesome
      await voteConfession(GUILD_ID, confessionId, USER_1, 'wholesome');
      let conf = getTestConfession(GUILD_ID, confessionId);
      assert.strictEqual(conf?.votes.wholesome.includes(USER_1), true);

      // Alice votes wholesome again -> unvotes
      const res = await voteConfession(GUILD_ID, confessionId, USER_1, 'wholesome');
      assert.strictEqual(res.toggledOn, false);
      assert.strictEqual(res.votes.wholesome.includes(USER_1), false);
    });

    it('rejects invalid vote types', async () => {
      await assert.rejects(
        () =>
          voteConfession(
            GUILD_ID,
            confessionId,
            USER_1,
            'invalidCategory' as unknown as 'wholesome',
          ),
        /Invalid vote type/,
      );
    });

    it('rejects voting on non-existent confession', async () => {
      await assert.rejects(
        () => voteConfession(GUILD_ID, 99999, USER_1, 'wholesome'),
        /Confession #99999 not found/,
      );
    });
  });

  describe('Secret Mutual Crush Matchmaker', () => {
    it('prevents self-crush registration', async () => {
      await assert.rejects(
        () => registerCrush(GUILD_ID, USER_1, USER_1),
        /cannot set a crush on yourself/,
      );
    });

    it('records a unilateral crush without triggering a match', async () => {
      const result = await registerCrush(GUILD_ID, USER_1, USER_2);
      assert.strictEqual(result.isMatch, false);
      assert.strictEqual(result.user1, USER_1);
      assert.strictEqual(result.user2, USER_2);

      const record = getTestCrush(GUILD_ID, USER_1, USER_2);
      assert.ok(record);
      assert.strictEqual(record?.matched, false);
    });

    it('triggers a mutual match when target member reciprocates crush', async () => {
      // Alice registers a crush on Bob
      const result1 = await registerCrush(GUILD_ID, USER_1, USER_2);
      assert.strictEqual(result1.isMatch, false);

      // Bob registers a crush on Alice -> Mutual Match!
      const result2 = await registerCrush(GUILD_ID, USER_2, USER_1);
      assert.strictEqual(result2.isMatch, true);
      assert.strictEqual(result2.user1, USER_2);
      assert.strictEqual(result2.user2, USER_1);

      // Verify both records are now marked matched: true
      const aliceCrush = getTestCrush(GUILD_ID, USER_1, USER_2);
      const bobCrush = getTestCrush(GUILD_ID, USER_2, USER_1);
      assert.strictEqual(aliceCrush?.matched, true);
      assert.strictEqual(bobCrush?.matched, true);
    });
  });

  describe('Top Confessions Ranking', () => {
    beforeEach(async () => {
      // Confession 1: 1 vote
      const c1 = await submitConfession(GUILD_ID, 'Confession one with one vote total.');
      await voteConfession(GUILD_ID, c1.confessionId, USER_1, 'wholesome');

      // Confession 2: 3 votes
      const c2 = await submitConfession(GUILD_ID, 'Confession two with three total votes.');
      await voteConfession(GUILD_ID, c2.confessionId, USER_1, 'wholesome');
      await voteConfession(GUILD_ID, c2.confessionId, USER_2, 'funny');
      await voteConfession(GUILD_ID, c2.confessionId, USER_3, 'redFlag');

      // Confession 3: 0 votes
      await submitConfession(GUILD_ID, 'Confession three with zero votes attached.');

      // Confession 4: 2 votes
      const c4 = await submitConfession(GUILD_ID, 'Confession four with two total votes.');
      await voteConfession(GUILD_ID, c4.confessionId, USER_1, 'funny');
      await voteConfession(GUILD_ID, c4.confessionId, USER_2, 'funny');
    });

    it('sorts confessions by total votes descending (3 -> 2 -> 1 -> 0)', async () => {
      const top = await getTopConfessions(GUILD_ID, 10);
      assert.strictEqual(top.length, 4);
      assert.strictEqual(top[0].confessionId, 2); // 3 votes
      assert.strictEqual(top[1].confessionId, 4); // 2 votes
      assert.strictEqual(top[2].confessionId, 1); // 1 vote
      assert.strictEqual(top[3].confessionId, 3); // 0 votes
    });

    it('respects the limit parameter and clamps safely', async () => {
      const top2 = await getTopConfessions(GUILD_ID, 2);
      assert.strictEqual(top2.length, 2);
      assert.strictEqual(top2[0].confessionId, 2);
      assert.strictEqual(top2[1].confessionId, 4);

      // Returns empty array for guild with no confessions
      const empty = await getTopConfessions('guild_with_no_confessions', 5);
      assert.strictEqual(empty.length, 0);
    });
  });

  describe('Discord Embed & Component Builders', () => {
    it('builds confession embed with proper title, description, and reaction footer', () => {
      const mockConfession = {
        guildId: GUILD_ID,
        confessionId: 42,
        content: 'I love writing clean TypeScript code in AiCord.',
        votes: {
          wholesome: [USER_1, USER_2],
          funny: [USER_3],
          redFlag: [],
        },
        status: 'approved',
        createdAt: new Date('2026-11-08T00:00:00Z'),
        updatedAt: new Date('2026-11-08T00:00:00Z'),
      } as unknown as IConfession;

      const embed = buildConfessionEmbed(mockConfession);
      assert.strictEqual(embed.title, '💌 Anonymous Confession #42');
      assert.strictEqual(
        embed.description,
        '"I love writing clean TypeScript code in AiCord."',
      );
      assert.strictEqual(embed.color, 0xff75a0);
      assert.ok(embed.footer?.text.includes('❤️ 2'));
      assert.ok(embed.footer?.text.includes('😂 1'));
      assert.ok(embed.footer?.text.includes('🚩 0'));
    });

    it('includes reply notice in embed description when replyToId is present', () => {
      const mockReply = {
        guildId: GUILD_ID,
        confessionId: 43,
        replyToId: 42,
        content: 'Me too, TypeScript makes refactoring a breeze!',
        votes: { wholesome: [], funny: [], redFlag: [] },
        status: 'approved',
      } as unknown as IConfession;

      const embed = buildConfessionEmbed(mockReply);
      assert.ok(embed.description?.includes('In reply to Confession #42'));
      assert.ok(embed.description?.includes('Me too, TypeScript makes refactoring a breeze!'));
    });

    it('builds interactive button action row with wholesome, funny, and redFlag counts', () => {
      const mockConfession = {
        guildId: GUILD_ID,
        confessionId: 7,
        content: 'Interactive test confession content',
        votes: {
          wholesome: [USER_1],
          funny: [USER_2, USER_3],
          redFlag: [],
        },
        status: 'approved',
      } as unknown as IConfession;

      const components = buildConfessionComponents(mockConfession);
      assert.strictEqual(components.length, 1);
      const buttons = components[0].components as Array<{ custom_id?: string; label?: string }>;
      assert.strictEqual(buttons.length, 3);

      assert.strictEqual(buttons[0].custom_id, 'confess_vote:7:wholesome');
      assert.strictEqual(buttons[0].label, '❤️ Wholesome (1)');

      assert.strictEqual(buttons[1].custom_id, 'confess_vote:7:funny');
      assert.strictEqual(buttons[1].label, '😂 Funny (2)');

      assert.strictEqual(buttons[2].custom_id, 'confess_vote:7:redFlag');
      assert.strictEqual(buttons[2].label, '🚩 Red Flag (0)');
    });
  });
});
