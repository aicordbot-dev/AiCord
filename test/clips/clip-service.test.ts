/**
 * test/clips/clip-service.test.ts
 * Comprehensive unit tests for Service 10: Community Gaming Clip Competitions — Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestClip, getTestClip, setTestConfig, getTestConfig)
 * - Video URL validation (YouTube, Twitch, Streamable, Medal.tv, Discord attachments, direct .mp4/.webm/.mov, invalid rejections)
 * - ISO week calculation (getCurrentWeekString) & unique clip ID generation (/^clip-[A-Za-z0-9]{4}$/)
 * - Clip submission, input sanitization, week assignment, and initial state
 * - Vote toggling across fire (+2), smart (+3), fail (+1) categories
 * - Weighted score calculation verification
 * - Anti-self-voting prevention (userId === clip.userId rejection)
 * - Weekly leaderboard retrieval, week filtering, and totalScore desc sorting
 * - Weekly champion crowning, top score filtering (>0 pts), winner flag, and role assignment
 * - Embed & interactive component generation (buildClipEmbed, buildClipComponents, buildChampionEmbed, buildLeaderboardEmbed)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestClip,
  getTestClip,
  setTestConfig,
  getTestConfig,
  isValidClipUrl,
  getCurrentWeekString,
  generateClipId,
  submitClip,
  getClip,
  voteClip,
  getClipLeaderboard,
  crownWeeklyChampion,
  getClipContestConfig,
  updateClipContestConfig,
  buildClipEmbed,
  buildClipComponents,
  buildChampionEmbed,
  buildLeaderboardEmbed,
  type IClipSubmission,
} from '@/lib/clips/clip-service';

describe('Community Gaming Clip Competitions — Service Engine', () => {
  const GUILD_ID = 'guild_clip_test_100';
  const OTHER_GUILD = 'guild_clip_test_200';
  const USER_A = 'user_player_aaa';
  const USER_B = 'user_voter_bbb';
  const USER_C = 'user_voter_ccc';

  // Base fixed date: Monday Nov 9, 2026 (Week 46)
  const FIXED_DATE = new Date('2026-11-09T14:30:00.000Z');

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('Test Store Lifecycle', () => {
    it('manages testMode state correctly', () => {
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
    });

    it('sets and retrieves test clips with flexible arguments', () => {
      const clip = setTestClip(GUILD_ID, 'clip-TEST', {
        userId: USER_A,
        title: 'Insane 1v5 Clutch',
        game: 'Valorant',
        clipUrl: 'https://youtube.com/watch?v=12345',
        totalScore: 10,
      });

      assert.strictEqual(clip.clipId, 'clip-TEST');
      assert.strictEqual(clip.title, 'Insane 1v5 Clutch');
      assert.strictEqual(clip.game, 'Valorant');
      assert.strictEqual(clip.totalScore, 10);

      const retrieved = getTestClip(GUILD_ID, 'clip-TEST');
      assert.ok(retrieved);
      assert.strictEqual(retrieved?.clipId, 'clip-TEST');
      assert.strictEqual(retrieved?.userId, USER_A);
    });

    it('sets and retrieves contest configuration', () => {
      setTestConfig(GUILD_ID, {
        channelId: 'chan_highlights',
        championRoleId: 'role_clip_god',
        enabled: true,
      });

      const config = getTestConfig(GUILD_ID);
      assert.ok(config);
      assert.strictEqual(config?.channelId, 'chan_highlights');
      assert.strictEqual(config?.championRoleId, 'role_clip_god');
      assert.strictEqual(config?.enabled, true);
    });

    it('clears test store completely', () => {
      setTestClip(GUILD_ID, 'clip-001', { title: 'Clip 1' });
      setTestConfig(GUILD_ID, { channelId: 'chan_1' });

      clearTestStore();
      assert.strictEqual(getTestClip(GUILD_ID, 'clip-001'), undefined);
      assert.strictEqual(getTestConfig(GUILD_ID), undefined);
    });
  });

  describe('Video URL Validation (isValidClipUrl)', () => {
    it('accepts YouTube standard and short URLs', () => {
      assert.strictEqual(isValidClipUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidClipUrl('https://youtube.com/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidClipUrl('https://youtu.be/dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidClipUrl('https://www.youtube.com/shorts/abcd1234efg'), true);
    });

    it('accepts Twitch stream and clip URLs', () => {
      assert.strictEqual(isValidClipUrl('https://clips.twitch.tv/GloriousSlickWaffle'), true);
      assert.strictEqual(isValidClipUrl('https://www.twitch.tv/shroud/clip/GloriousSlickWaffle'), true);
    });

    it('accepts Streamable video URLs', () => {
      assert.strictEqual(isValidClipUrl('https://streamable.com/abc123xyz'), true);
      assert.strictEqual(isValidClipUrl('https://www.streamable.com/abc123xyz'), true);
    });

    it('accepts Medal.tv clip URLs', () => {
      assert.strictEqual(
        isValidClipUrl('https://medal.tv/games/valorant/clips/12345/abc?theater=true'),
        true,
      );
    });

    it('accepts Discord attachment and media CDN URLs', () => {
      assert.strictEqual(
        isValidClipUrl('https://cdn.discordapp.com/attachments/123456/789012/clip.mp4'),
        true,
      );
      assert.strictEqual(
        isValidClipUrl('https://media.discordapp.net/attachments/123456/789012/highlight.mov'),
        true,
      );
      assert.strictEqual(
        isValidClipUrl('https://discordapp.com/attachments/123456/789012/gameplay.webm'),
        true,
      );
    });

    it('accepts direct video files (.mp4, .webm, .mov)', () => {
      assert.strictEqual(isValidClipUrl('https://example.com/videos/play.mp4'), true);
      assert.strictEqual(isValidClipUrl('https://mycdn.net/clip.webm'), true);
      assert.strictEqual(isValidClipUrl('https://storage.provider.org/footage.mov'), true);
    });

    it('rejects invalid, malformed, non-video, or unsupported URLs', () => {
      assert.strictEqual(isValidClipUrl(''), false);
      assert.strictEqual(isValidClipUrl('   '), false);
      assert.strictEqual(isValidClipUrl('not-a-valid-url'), false);
      assert.strictEqual(isValidClipUrl('ftp://example.com/video.mp4'), false);
      assert.strictEqual(isValidClipUrl('https://google.com'), false);
      assert.strictEqual(isValidClipUrl('https://twitter.com/user/status/123456'), false);
      assert.strictEqual(isValidClipUrl('https://example.com/image.png'), false);
      assert.strictEqual(isValidClipUrl('https://cdn.discordapp.com/avatars/123/abc.png'), false);
    });
  });

  describe('Current Week Helper & Clip ID Generator', () => {
    it('computes ISO week format accurately', () => {
      // 2026-11-09 is week 46
      const weekStr = getCurrentWeekString(FIXED_DATE);
      assert.strictEqual(weekStr, '2026-W46');

      // 2026-11-02 is week 45
      const prevWeekDate = new Date('2026-11-02T10:00:00Z');
      assert.strictEqual(getCurrentWeekString(prevWeekDate), '2026-W45');

      // 2026-01-01 is week 01
      const janDate = new Date('2026-01-01T12:00:00Z');
      assert.strictEqual(getCurrentWeekString(janDate), '2026-W01');
    });

    it('generates clip IDs formatted as clip-XXXX', () => {
      const id1 = generateClipId();
      const id2 = generateClipId();

      assert.match(id1, /^clip-[A-Z0-9]{4}$/);
      assert.match(id2, /^clip-[A-Z0-9]{4}$/);
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('Clip Submission (submitClip)', () => {
    it('successfully submits a valid clip with defaults and ISO week', async () => {
      const clip = await submitClip({
        guildId: GUILD_ID,
        userId: USER_A,
        userTag: 'ProGamer#1234',
        title: 'Ace on Bind with Sheriff',
        clipUrl: 'https://youtube.com/watch?v=sheriff_ace',
        game: 'Valorant',
        now: FIXED_DATE,
      });

      assert.ok(clip);
      assert.match(clip.clipId, /^clip-[A-Z0-9]{4}$/);
      assert.strictEqual(clip.guildId, GUILD_ID);
      assert.strictEqual(clip.userId, USER_A);
      assert.strictEqual(clip.userTag, 'ProGamer#1234');
      assert.strictEqual(clip.title, 'Ace on Bind with Sheriff');
      assert.strictEqual(clip.game, 'Valorant');
      assert.strictEqual(clip.clipUrl, 'https://youtube.com/watch?v=sheriff_ace');
      assert.strictEqual(clip.totalScore, 0);
      assert.strictEqual(clip.week, '2026-W46');
      assert.strictEqual(clip.isWinner, false);
      assert.deepStrictEqual(clip.votes, { fire: [], smart: [], fail: [] });
    });

    it('defaults game to "General" and userTag to "Member" when omitted', async () => {
      const clip = await submitClip({
        guildId: GUILD_ID,
        userId: USER_A,
        title: 'Random Hilarious Moment',
        clipUrl: 'https://clips.twitch.tv/funny_clip',
        now: FIXED_DATE,
      });

      assert.strictEqual(clip.game, 'General');
      assert.strictEqual(clip.userTag, 'Member');
    });

    it('rejects invalid or unsupported clip URLs', async () => {
      await assert.rejects(
        async () => {
          await submitClip({
            guildId: GUILD_ID,
            userId: USER_A,
            title: 'Cool Play',
            clipUrl: 'https://reddit.com/r/gaming/something',
          });
        },
        /Invalid clip URL/,
      );
    });

    it('rejects empty or whitespace-only titles', async () => {
      await assert.rejects(
        async () => {
          await submitClip({
            guildId: GUILD_ID,
            userId: USER_A,
            title: '   ',
            clipUrl: 'https://youtu.be/valid_video',
          });
        },
        /Title must be between 1 and 100 characters/,
      );
    });

    it('rejects titles longer than 100 characters', async () => {
      await assert.rejects(
        async () => {
          await submitClip({
            guildId: GUILD_ID,
            userId: USER_A,
            title: 'A'.repeat(101),
            clipUrl: 'https://youtu.be/valid_video',
          });
        },
        /Title must be between 1 and 100 characters/,
      );
    });
  });

  describe('Interactive Rating & Scoring System (voteClip)', () => {
    it('prevents self-voting and throws descriptive error', async () => {
      const clip = await submitClip({
        guildId: GUILD_ID,
        userId: USER_A,
        title: 'Self-Vote Test',
        clipUrl: 'https://youtu.be/abc',
        now: FIXED_DATE,
      });

      await assert.rejects(
        async () => {
          await voteClip(GUILD_ID, clip.clipId, USER_A, 'fire');
        },
        /You cannot vote on your own clip!/,
      );
    });

    it('throws error when clip is not found', async () => {
      await assert.rejects(
        async () => {
          await voteClip(GUILD_ID, 'clip-NONEXISTENT', USER_B, 'fire');
        },
        /Clip not found/,
      );
    });

    it('votes fire (+2 pts) and toggles vote off on second click', async () => {
      const clip = await submitClip({
        guildId: GUILD_ID,
        userId: USER_A,
        title: 'Fire Play Test',
        clipUrl: 'https://streamable.com/fire1',
        now: FIXED_DATE,
      });

      // 1. Vote fire on
      const res1 = await voteClip(GUILD_ID, clip.clipId, USER_B, 'fire');
      assert.strictEqual(res1.toggledOn, true);
      assert.strictEqual(res1.totalScore, 2);
      assert.deepStrictEqual(res1.clip.votes.fire, [USER_B]);

      // 2. Click fire again -> toggles off
      const res2 = await voteClip(GUILD_ID, clip.clipId, USER_B, 'fire');
      assert.strictEqual(res2.toggledOn, false);
      assert.strictEqual(res2.totalScore, 0);
      assert.deepStrictEqual(res2.clip.votes.fire, []);
    });

    it('accurately computes weighted score: fire (+2), smart (+3), fail (+1)', async () => {
      const clip = await submitClip({
        guildId: GUILD_ID,
        userId: USER_A,
        title: 'Multi-Rating Test',
        clipUrl: 'https://medal.tv/clip1',
        now: FIXED_DATE,
      });

      // User B votes fire (+2)
      await voteClip(GUILD_ID, clip.clipId, USER_B, 'fire');
      // User B votes smart (+3)
      await voteClip(GUILD_ID, clip.clipId, USER_B, 'smart');
      // User C votes smart (+3)
      await voteClip(GUILD_ID, clip.clipId, USER_C, 'smart');
      // User C votes fail (+1)
      const finalRes = await voteClip(GUILD_ID, clip.clipId, USER_C, 'fail');

      // Total score = (1 fire * 2) + (2 smart * 3) + (1 fail * 1) = 2 + 6 + 1 = 9
      assert.strictEqual(finalRes.totalScore, 9);
      assert.strictEqual(finalRes.clip.votes.fire.length, 1);
      assert.strictEqual(finalRes.clip.votes.smart.length, 2);
      assert.strictEqual(finalRes.clip.votes.fail.length, 1);
    });
  });

  describe('Leaderboard & Weekly Isolation (getClipLeaderboard)', () => {
    it('returns clips for specified week sorted by totalScore desc', async () => {
      const week = '2026-W46';

      setTestClip(GUILD_ID, 'clip-001', {
        userId: USER_A,
        title: 'Low Score Clip',
        totalScore: 4,
        week,
      });
      setTestClip(GUILD_ID, 'clip-002', {
        userId: USER_B,
        title: 'Top Score Clip',
        totalScore: 18,
        week,
      });
      setTestClip(GUILD_ID, 'clip-003', {
        userId: USER_C,
        title: 'Mid Score Clip',
        totalScore: 11,
        week,
      });
      // Clip from different week
      setTestClip(GUILD_ID, 'clip-004', {
        userId: USER_A,
        title: 'Old Clip',
        totalScore: 50,
        week: '2026-W45',
      });
      // Clip from different guild
      setTestClip(OTHER_GUILD, 'clip-005', {
        userId: USER_A,
        title: 'Other Guild Clip',
        totalScore: 99,
        week,
      });

      const leaderboard = await getClipLeaderboard(GUILD_ID, week, 10);

      assert.strictEqual(leaderboard.length, 3);
      assert.strictEqual(leaderboard[0].clipId, 'clip-002');
      assert.strictEqual(leaderboard[0].totalScore, 18);
      assert.strictEqual(leaderboard[1].clipId, 'clip-003');
      assert.strictEqual(leaderboard[1].totalScore, 11);
      assert.strictEqual(leaderboard[2].clipId, 'clip-001');
      assert.strictEqual(leaderboard[2].totalScore, 4);
    });

    it('enforces limit parameter on leaderboard results', async () => {
      const week = '2026-W46';
      for (let i = 1; i <= 8; i++) {
        setTestClip(GUILD_ID, `clip-00${i}`, {
          title: `Clip #${i}`,
          totalScore: i * 2,
          week,
        });
      }

      const top3 = await getClipLeaderboard(GUILD_ID, week, 3);
      assert.strictEqual(top3.length, 3);
      assert.strictEqual(top3[0].clipId, 'clip-008');
      assert.strictEqual(top3[0].totalScore, 16);
    });
  });

  describe('Weekly Champion Crowning (crownWeeklyChampion)', () => {
    it('crowns the #1 clip with score > 0 and marks isWinner = true', async () => {
      const week = '2026-W46';
      setTestConfig(GUILD_ID, { championRoleId: 'role_grand_champion' });

      setTestClip(GUILD_ID, 'clip-WIN', {
        userId: USER_B,
        title: 'Epic Trickshot',
        game: 'CS2',
        totalScore: 25,
        week,
        votes: { fire: [USER_A, USER_C], smart: [USER_C], fail: [] },
      });

      setTestClip(GUILD_ID, 'clip-SECOND', {
        userId: USER_C,
        title: 'Nice Try',
        game: 'CS2',
        totalScore: 5,
        week,
      });

      const result = await crownWeeklyChampion(GUILD_ID, week);

      assert.ok(result.championClip);
      assert.strictEqual(result.championClip?.clipId, 'clip-WIN');
      assert.strictEqual(result.championClip?.isWinner, true);
      assert.strictEqual(result.championRoleId, 'role_grand_champion');

      // Verify persistence in store
      const persisted = getTestClip(GUILD_ID, 'clip-WIN');
      assert.strictEqual(persisted?.isWinner, true);
    });

    it('returns null championClip when no clips have positive score (> 0)', async () => {
      const week = '2026-W46';
      setTestClip(GUILD_ID, 'clip-ZERO', {
        userId: USER_A,
        title: 'Zero Votes Clip',
        totalScore: 0,
        week,
      });

      const result = await crownWeeklyChampion(GUILD_ID, week);
      assert.strictEqual(result.championClip, null);
    });
  });

  describe('Configuration Management', () => {
    it('updates and persists contest configuration', async () => {
      const config = await updateClipContestConfig(GUILD_ID, {
        channelId: 'chan_contest_feed',
        championRoleId: 'role_champion_tier',
        enabled: true,
      });

      assert.strictEqual(config.guildId, GUILD_ID);
      assert.strictEqual(config.channelId, 'chan_contest_feed');
      assert.strictEqual(config.championRoleId, 'role_champion_tier');
      assert.strictEqual(config.enabled, true);

      const retrieved = await getClipContestConfig(GUILD_ID);
      assert.ok(retrieved);
      assert.strictEqual(retrieved?.channelId, 'chan_contest_feed');
    });
  });

  describe('Discord Embed & Component Builders', () => {
    it('builds clip embed with required fields, score, and tally', () => {
      const clip = setTestClip(GUILD_ID, 'clip-VIEW', {
        userId: USER_A,
        title: 'Fastest Ace in History',
        game: 'Overwatch',
        clipUrl: 'https://youtube.com/watch?v=ace',
        totalScore: 8,
        week: '2026-W46',
        votes: { fire: ['u1', 'u2'], smart: ['u3'], fail: ['u4'] },
      });

      const embed = buildClipEmbed(clip);
      assert.strictEqual(embed.title, '🎬 [Overwatch] Fastest Ace in History');
      assert.strictEqual(embed.url, 'https://youtube.com/watch?v=ace');
      assert.ok(embed.description?.includes('<@user_player_aaa>'));
      assert.ok(embed.description?.includes('🏆 **Score:** `8 pts`'));
      assert.ok(embed.description?.includes('🔥 2 | 🧠 1 | 💀 1'));
      assert.ok(embed.footer?.text?.includes('clip-VIEW'));
      assert.ok(embed.footer?.text?.includes('2026-W46'));
    });

    it('builds interactive 3-button voting components with live counts', () => {
      const clip = setTestClip(GUILD_ID, 'clip-BTN', {
        votes: { fire: ['u1', 'u2', 'u3'], smart: ['u4'], fail: [] },
      });

      const rows = buildClipComponents(clip);
      assert.strictEqual(rows.length, 1);
      const buttons = rows[0].components as Array<{ custom_id: string; label: string }>;
      assert.strictEqual(buttons.length, 3);

      assert.strictEqual(buttons[0].custom_id, 'clip_vote:clip-BTN:fire');
      assert.ok(buttons[0].label?.includes('Fire Play (3)'));

      assert.strictEqual(buttons[1].custom_id, 'clip_vote:clip-BTN:smart');
      assert.ok(buttons[1].label?.includes('200 IQ (1)'));

      assert.strictEqual(buttons[2].custom_id, 'clip_vote:clip-BTN:fail');
      assert.ok(buttons[2].label?.includes('Funny Fail (0)'));
    });

    it('builds celebratory champion embed with role announcement', () => {
      const clip = setTestClip(GUILD_ID, 'clip-CHAMP', {
        userId: USER_A,
        title: 'Godlike Snipes',
        game: 'Battlefield',
        totalScore: 30,
        week: '2026-W46',
        isWinner: true,
      });

      const embed = buildChampionEmbed(clip, 'role_mvp');
      assert.ok(embed.title?.includes('Weekly Clip Champion Crowned'));
      assert.ok(embed.description?.includes('<@user_player_aaa>'));
      assert.ok(embed.description?.includes('Godlike Snipes'));
      assert.ok(embed.description?.includes('Battlefield'));
      assert.ok(embed.description?.includes('30 pts'));
      assert.ok(embed.description?.includes('<@&role_mvp>'));
    });

    it('builds leaderboard embed with ranking medals and scores', () => {
      const clips = [
        setTestClip(GUILD_ID, 'c1', {
          title: 'First Place',
          clipUrl: 'https://youtu.be/c1',
          userId: USER_A,
          totalScore: 20,
          votes: { fire: ['u1', 'u2'], smart: [], fail: [] },
        }),
        setTestClip(GUILD_ID, 'c2', {
          title: 'Second Place',
          clipUrl: 'https://youtu.be/c2',
          userId: USER_B,
          totalScore: 10,
          votes: { fire: [], smart: ['u1'], fail: [] },
        }),
      ];

      const embed = buildLeaderboardEmbed('2026-W46', clips);
      assert.ok(embed.title?.includes('Week 2026-W46'));
      assert.ok(embed.description?.includes('🥇 [First Place]'));
      assert.ok(embed.description?.includes('🥈 [Second Place]'));
    });

    it('builds empty leaderboard notice when no clips exist', () => {
      const embed = buildLeaderboardEmbed('2026-W46', []);
      assert.ok(embed.description?.includes('No clips have been submitted yet'));
    });
  });
});
