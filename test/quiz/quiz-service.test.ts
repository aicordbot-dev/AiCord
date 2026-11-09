/**
 * test/quiz/quiz-service.test.ts
 * Comprehensive unit tests for Service 8: Live Multiplayer Kahoot-Style Quiz Show — Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestSession, getTestSession, setTestLeaderboard, getTestLeaderboard, balances)
 * - Curated question catalog across 6 categories (tech, gaming, anime, science, history, general)
 * - Question picker mechanics, random shuffling, and fallback
 * - Session creation, parameter clamping, and duplicate channel prevention
 * - Round progression (startNextRound) and status transitions
 * - Speed-based scoring calculation (fast vs slow vs incorrect vs min-points clamp)
 * - Single-answer per round enforcement ('already_answered')
 * - Session conclusion (endQuizSession), podium calculation (1st, 2nd, 3rd)
 * - Coin reward disbursement (1st: 500, 2nd: 250, 3rd: 100)
 * - Server leaderboard persistence, wins tracking, and ranked retrieval
 * - Discord embed and button component builders
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestSession,
  getTestSession,
  getAllTestSessions,
  setTestLeaderboard,
  getTestLeaderboard,
  getAllTestLeaderboards,
  setTestBalance,
  getTestBalance,
  QUIZ_QUESTION_CATALOG,
  QUIZ_CATEGORIES,
  pickRandomQuestions,
  createQuizSession,
  getActiveQuizSession,
  getQuizSessionById,
  startNextRound,
  submitAnswer,
  endQuizSession,
  getQuizLeaderboard,
  buildQuestionEmbed,
  buildQuestionComponents,
  buildRoundResultsEmbed,
  buildPodiumEmbed,
  buildLeaderboardEmbed,
  type IQuizSession,
  type IQuizQuestion,
} from '@/lib/quiz/quiz-service';

describe('Live Multiplayer Quiz Show — Service Engine', () => {
  const GUILD_ID = 'guild_quiz_001';
  const OTHER_GUILD = 'guild_quiz_002';
  const CHANNEL_ID = 'chan_quiz_100';
  const OTHER_CHANNEL = 'chan_quiz_200';
  const HOST_ID = 'user_host_101';
  const ALICE_ID = 'user_alice_201';
  const BOB_ID = 'user_bob_202';
  const CHARLIE_ID = 'user_charlie_203';
  const DAVE_ID = 'user_dave_204';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
  });

  describe('Test Store Lifecycle', () => {
    it('manages testMode state accurately', () => {
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
    });

    it('sets, retrieves, and clears test sessions and leaderboards', () => {
      setTestSession({
        sessionId: 'quiz-TEST',
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
      });

      const session = getTestSession('quiz-TEST');
      assert.ok(session);
      assert.strictEqual(session.sessionId, 'quiz-TEST');
      assert.strictEqual(session.guildId, GUILD_ID);

      const allSessions = getAllTestSessions(GUILD_ID);
      assert.strictEqual(allSessions.length, 1);
      assert.strictEqual(getAllTestSessions(OTHER_GUILD).length, 0);

      setTestLeaderboard({
        guildId: GUILD_ID,
        userId: ALICE_ID,
        userTag: 'Alice',
        totalScore: 1500,
        gamesPlayed: 2,
        gamesWon: 1,
      });

      const lb = getTestLeaderboard(GUILD_ID, ALICE_ID);
      assert.ok(lb);
      assert.strictEqual(lb.totalScore, 1500);
      assert.strictEqual(lb.gamesWon, 1);
      assert.strictEqual(getAllTestLeaderboards(GUILD_ID).length, 1);

      setTestBalance(GUILD_ID, ALICE_ID, 250);
      assert.strictEqual(getTestBalance(GUILD_ID, ALICE_ID), 250);

      clearTestStore();
      assert.strictEqual(getTestSession('quiz-TEST'), undefined);
      assert.strictEqual(getTestLeaderboard(GUILD_ID, ALICE_ID), undefined);
      assert.strictEqual(getTestBalance(GUILD_ID, ALICE_ID), 0);
    });
  });

  describe('Curated Question Catalog & Picker', () => {
    it('contains over 30 curated questions across 6 categories', () => {
      assert.ok(QUIZ_QUESTION_CATALOG.length >= 30);
      assert.strictEqual(QUIZ_CATEGORIES.length, 6);

      for (const cat of QUIZ_CATEGORIES) {
        const catQuestions = QUIZ_QUESTION_CATALOG.filter((q) => q.category === cat);
        assert.ok(
          catQuestions.length >= 5,
          `Category ${cat} should have at least 5 questions (has ${catQuestions.length})`,
        );
      }
    });

    it('verifies all questions have 4 valid options and correctIndex 0..3', () => {
      for (const q of QUIZ_QUESTION_CATALOG) {
        assert.ok(q.question.length > 5, 'Question text must be descriptive');
        assert.strictEqual(q.options.length, 4, 'Must have exactly 4 choices');
        assert.ok(
          q.correctIndex >= 0 && q.correctIndex <= 3,
          'correctIndex must be between 0 and 3',
        );
        assert.ok(QUIZ_CATEGORIES.includes(q.category as any));
      }
    });

    it('picks requested count of questions and filters by category', () => {
      const techQuestions = pickRandomQuestions('tech', 4);
      assert.strictEqual(techQuestions.length, 4);
      for (const q of techQuestions) {
        assert.strictEqual(q.category, 'tech');
      }

      const gamingQuestions = pickRandomQuestions('gaming', 3);
      assert.strictEqual(gamingQuestions.length, 3);
      for (const q of gamingQuestions) {
        assert.strictEqual(q.category, 'gaming');
      }

      const generalQuestions = pickRandomQuestions('general', 5);
      assert.strictEqual(generalQuestions.length, 5);
    });

    it('falls back to all questions if count exceeds available category questions', () => {
      const largeBatch = pickRandomQuestions('history', 10);
      assert.strictEqual(largeBatch.length, 10);
      // History questions should be included first, filled with other categories
      const historyCount = largeBatch.filter((q) => q.category === 'history').length;
      assert.ok(historyCount >= 5);
    });
  });

  describe('Session Creation & Duplicate Prevention', () => {
    it('creates a new quiz session with waiting status and clamped rounds', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'tech',
        5,
      );

      assert.ok(session.sessionId.startsWith('quiz-'));
      assert.strictEqual(session.guildId, GUILD_ID);
      assert.strictEqual(session.channelId, CHANNEL_ID);
      assert.strictEqual(session.hostId, HOST_ID);
      assert.strictEqual(session.category, 'tech');
      assert.strictEqual(session.rounds, 5);
      assert.strictEqual(session.currentRound, 0);
      assert.strictEqual(session.status, 'waiting');
      assert.strictEqual(session.questions.length, 5);
      assert.strictEqual(session.scores.length, 0);
      assert.strictEqual(session.roundAnswers.length, 0);
    });

    it('clamps rounds parameter to safe range [3, 10]', async () => {
      const lowSession = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        1,
      );
      assert.strictEqual(lowSession.rounds, 3);
      clearTestStore();

      const highSession = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        25,
      );
      assert.strictEqual(highSession.rounds, 10);
    });

    it('prevents creating duplicate active quiz sessions in the same channel', async () => {
      await createQuizSession(GUILD_ID, CHANNEL_ID, HOST_ID, 'general', 5);

      await assert.rejects(
        async () => {
          await createQuizSession(GUILD_ID, CHANNEL_ID, HOST_ID, 'gaming', 5);
        },
        {
          name: 'Error',
          message: 'Channel already has an active quiz session',
        },
      );
    });

    it('allows concurrent sessions in different channels or guilds', async () => {
      const s1 = await createQuizSession(GUILD_ID, CHANNEL_ID, HOST_ID, 'general', 5);
      const s2 = await createQuizSession(
        GUILD_ID,
        OTHER_CHANNEL,
        HOST_ID,
        'gaming',
        5,
      );
      const s3 = await createQuizSession(
        OTHER_GUILD,
        CHANNEL_ID,
        HOST_ID,
        'anime',
        5,
      );

      assert.ok(s1 && s2 && s3);
      assert.notStrictEqual(s1.sessionId, s2.sessionId);
      assert.notStrictEqual(s1.sessionId, s3.sessionId);
    });

    it('allows creating a new session after previous session ends', async () => {
      const s1 = await createQuizSession(GUILD_ID, CHANNEL_ID, HOST_ID, 'general', 3);
      await endQuizSession(GUILD_ID, s1.sessionId);

      const s2 = await createQuizSession(GUILD_ID, CHANNEL_ID, HOST_ID, 'science', 3);
      assert.ok(s2);
      assert.strictEqual(s2.status, 'waiting');
    });
  });

  describe('Round Progression Mechanics (startNextRound)', () => {
    it('advances currentRound from 0 to 1 and sets status to in_progress', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'gaming',
        3,
      );
      assert.strictEqual(session.currentRound, 0);

      const q1 = await startNextRound(GUILD_ID, session.sessionId);
      assert.strictEqual(session.currentRound, 1);
      assert.strictEqual(session.status, 'in_progress');
      assert.ok(session.roundStartedAt);
      assert.strictEqual(q1.question, session.questions[0].question);

      const q2 = await startNextRound(GUILD_ID, session.sessionId);
      assert.strictEqual(session.currentRound, 2);
      assert.strictEqual(q2.question, session.questions[1].question);
    });

    it('rejects round progression on non-existent session', async () => {
      await assert.rejects(
        async () => {
          await startNextRound(GUILD_ID, 'quiz-UNKNOWN');
        },
        {
          name: 'Error',
          message: 'Quiz session not found',
        },
      );
    });

    it('rejects advancing past maximum rounds', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      await startNextRound(GUILD_ID, session.sessionId); // round 1
      await startNextRound(GUILD_ID, session.sessionId); // round 2
      await startNextRound(GUILD_ID, session.sessionId); // round 3

      await assert.rejects(
        async () => {
          await startNextRound(GUILD_ID, session.sessionId);
        },
        {
          name: 'Error',
          message: 'Quiz session has completed all rounds',
        },
      );
    });

    it('rejects advancing when session has already ended', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      await endQuizSession(GUILD_ID, session.sessionId);

      await assert.rejects(
        async () => {
          await startNextRound(GUILD_ID, session.sessionId);
        },
        {
          name: 'Error',
          message: 'Quiz session has already ended',
        },
      );
    });
  });

  describe('Answer Evaluation & Speed-Based Scoring', () => {
    it('evaluates correct answer immediately (0s elapsed) awarding 1,000 points', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      // Force roundStartedAt to now (0s elapsed)
      session.roundStartedAt = new Date();

      const result = await submitAnswer(
        GUILD_ID,
        session.sessionId,
        ALICE_ID,
        'Alice',
        q1.correctIndex,
      );

      assert.strictEqual(result.isCorrect, true);
      assert.strictEqual(result.correctIndex, q1.correctIndex);
      assert.strictEqual(result.points, 1000);
      assert.strictEqual(result.totalScore, 1000);

      // Verify in-memory session update
      assert.strictEqual(session.scores.length, 1);
      assert.strictEqual(session.scores[0].userId, ALICE_ID);
      assert.strictEqual(session.scores[0].score, 1000);
      assert.strictEqual(session.roundAnswers.length, 1);
    });

    it('computes speed penalty (1000 - elapsedSeconds * 50) accurately', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      // Simulate 4 seconds elapsed (1000 - 4*50 = 800 pts)
      session.roundStartedAt = new Date(Date.now() - 4_050);

      const result = await submitAnswer(
        GUILD_ID,
        session.sessionId,
        BOB_ID,
        'Bob',
        q1.correctIndex,
      );

      assert.strictEqual(result.isCorrect, true);
      assert.strictEqual(result.points, 800);
      assert.strictEqual(result.totalScore, 800);
    });

    it('clamps minimum points for correct answers at 200 pts for slow responses', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      // Simulate 20 seconds elapsed (1000 - 20*50 = 0 -> clamped to 200)
      session.roundStartedAt = new Date(Date.now() - 20_000);

      const result = await submitAnswer(
        GUILD_ID,
        session.sessionId,
        CHARLIE_ID,
        'Charlie',
        q1.correctIndex,
      );

      assert.strictEqual(result.isCorrect, true);
      assert.strictEqual(result.points, 200);
      assert.strictEqual(result.totalScore, 200);
    });

    it('awards 0 points for incorrect answers regardless of response speed', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      const wrongIndex = (q1.correctIndex + 1) % 4;
      session.roundStartedAt = new Date(); // instant

      const result = await submitAnswer(
        GUILD_ID,
        session.sessionId,
        DAVE_ID,
        'Dave',
        wrongIndex,
      );

      assert.strictEqual(result.isCorrect, false);
      assert.strictEqual(result.points, 0);
      assert.strictEqual(result.totalScore, 0);
    });

    it('enforces single answer per round and rejects duplicates with already_answered', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      await submitAnswer(
        GUILD_ID,
        session.sessionId,
        ALICE_ID,
        'Alice',
        q1.correctIndex,
      );

      await assert.rejects(
        async () => {
          await submitAnswer(
            GUILD_ID,
            session.sessionId,
            ALICE_ID,
            'Alice',
            q1.correctIndex,
          );
        },
        {
          name: 'Error',
          message: 'already_answered',
        },
      );
    });

    it('allows answering again in subsequent rounds and accumulates total score', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );

      // Round 1: Alice answers correctly (1,000 pts)
      const q1 = await startNextRound(GUILD_ID, session.sessionId);
      session.roundStartedAt = new Date();
      const r1 = await submitAnswer(
        GUILD_ID,
        session.sessionId,
        ALICE_ID,
        'Alice',
        q1.correctIndex,
      );
      assert.strictEqual(r1.totalScore, 1000);

      // Round 2: Alice answers correctly after 2s (900 pts -> 1,900 total)
      const q2 = await startNextRound(GUILD_ID, session.sessionId);
      session.roundStartedAt = new Date(Date.now() - 2_000);
      const r2 = await submitAnswer(
        GUILD_ID,
        session.sessionId,
        ALICE_ID,
        'Alice',
        q2.correctIndex,
      );
      assert.strictEqual(r2.points, 900);
      assert.strictEqual(r2.totalScore, 1900);
    });

    it('rejects answer submission when round is not in progress', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      // Status is 'waiting'

      await assert.rejects(
        async () => {
          await submitAnswer(GUILD_ID, session.sessionId, ALICE_ID, 'Alice', 0);
        },
        {
          name: 'Error',
          message: 'Quiz round is not in progress',
        },
      );
    });
  });

  describe('Session Ending, Podium Calculation & Economy Awards', () => {
    it('concludes session, sorts scores descending, and awards winner coins', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      // Alice: 1,000 pts (1st place)
      session.roundStartedAt = new Date();
      await submitAnswer(
        GUILD_ID,
        session.sessionId,
        ALICE_ID,
        'Alice',
        q1.correctIndex,
      );

      // Bob: 800 pts (2nd place)
      session.roundStartedAt = new Date(Date.now() - 4_000);
      await submitAnswer(GUILD_ID, session.sessionId, BOB_ID, 'Bob', q1.correctIndex);

      // Charlie: 400 pts (3rd place)
      session.roundStartedAt = new Date(Date.now() - 12_000);
      await submitAnswer(
        GUILD_ID,
        session.sessionId,
        CHARLIE_ID,
        'Charlie',
        q1.correctIndex,
      );

      // Dave: 0 pts (4th place)
      await submitAnswer(
        GUILD_ID,
        session.sessionId,
        DAVE_ID,
        'Dave',
        (q1.correctIndex + 1) % 4,
      );

      const results = await endQuizSession(GUILD_ID, session.sessionId);

      assert.strictEqual(session.status, 'ended');
      assert.strictEqual(results.finalScores.length, 4);
      assert.strictEqual(results.finalScores[0].userId, ALICE_ID);
      assert.strictEqual(results.finalScores[1].userId, BOB_ID);
      assert.strictEqual(results.finalScores[2].userId, CHARLIE_ID);
      assert.strictEqual(results.finalScores[3].userId, DAVE_ID);

      // Podium top 3
      assert.strictEqual(results.podium.length, 3);
      assert.strictEqual(results.podium[0].userId, ALICE_ID);
      assert.strictEqual(results.podium[1].userId, BOB_ID);
      assert.strictEqual(results.podium[2].userId, CHARLIE_ID);

      // Coin awards: 1st: 500, 2nd: 250, 3rd: 100
      assert.strictEqual(results.coinAwards.length, 3);
      assert.strictEqual(results.coinAwards[0].coins, 500);
      assert.strictEqual(results.coinAwards[1].coins, 250);
      assert.strictEqual(results.coinAwards[2].coins, 100);

      // Verify wallet balances in test store
      assert.strictEqual(getTestBalance(GUILD_ID, ALICE_ID), 500);
      assert.strictEqual(getTestBalance(GUILD_ID, BOB_ID), 250);
      assert.strictEqual(getTestBalance(GUILD_ID, CHARLIE_ID), 100);
      assert.strictEqual(getTestBalance(GUILD_ID, DAVE_ID), 0);
    });

    it('updates QuizLeaderboard records for all participants with victories and scores', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      // Alice wins with 1,000 pts
      session.roundStartedAt = new Date();
      await submitAnswer(
        GUILD_ID,
        session.sessionId,
        ALICE_ID,
        'Alice',
        q1.correctIndex,
      );

      // Bob participates with 500 pts
      session.roundStartedAt = new Date(Date.now() - 10_000);
      await submitAnswer(GUILD_ID, session.sessionId, BOB_ID, 'Bob', q1.correctIndex);

      await endQuizSession(GUILD_ID, session.sessionId);

      const aliceLb = getTestLeaderboard(GUILD_ID, ALICE_ID);
      assert.ok(aliceLb);
      assert.strictEqual(aliceLb.totalScore, 1000);
      assert.strictEqual(aliceLb.gamesPlayed, 1);
      assert.strictEqual(aliceLb.gamesWon, 1);

      const bobLb = getTestLeaderboard(GUILD_ID, BOB_ID);
      assert.ok(bobLb);
      assert.strictEqual(bobLb.totalScore, 500);
      assert.strictEqual(bobLb.gamesPlayed, 1);
      assert.strictEqual(bobLb.gamesWon, 0); // Didn't win 1st
    });

    it('handles empty participant session without errors', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      const results = await endQuizSession(GUILD_ID, session.sessionId);

      assert.strictEqual(results.finalScores.length, 0);
      assert.strictEqual(results.podium.length, 0);
      assert.strictEqual(results.coinAwards.length, 0);
    });
  });

  describe('Server Leaderboard Retrieval & Sorting', () => {
    it('retrieves leaderboard sorted by totalScore desc, then gamesWon desc', async () => {
      setTestLeaderboard({
        guildId: GUILD_ID,
        userId: 'u1',
        userTag: 'Player1',
        totalScore: 5000,
        gamesWon: 3,
        gamesPlayed: 5,
      });
      setTestLeaderboard({
        guildId: GUILD_ID,
        userId: 'u2',
        userTag: 'Player2',
        totalScore: 7500,
        gamesWon: 4,
        gamesPlayed: 6,
      });
      setTestLeaderboard({
        guildId: GUILD_ID,
        userId: 'u3',
        userTag: 'Player3',
        totalScore: 5000,
        gamesWon: 5, // Higher wins with same score
        gamesPlayed: 7,
      });
      setTestLeaderboard({
        guildId: OTHER_GUILD,
        userId: 'u4',
        userTag: 'OtherGuildPlayer',
        totalScore: 99999,
        gamesWon: 10,
        gamesPlayed: 10,
      });

      const lb = await getQuizLeaderboard(GUILD_ID, 10);
      assert.strictEqual(lb.length, 3);
      assert.strictEqual(lb[0].userId, 'u2'); // 7,500
      assert.strictEqual(lb[1].userId, 'u3'); // 5,000 (5 wins)
      assert.strictEqual(lb[2].userId, 'u1'); // 5,000 (3 wins)
    });

    it('respects limit parameter and clamps safely', async () => {
      for (let i = 1; i <= 15; i++) {
        setTestLeaderboard({
          guildId: GUILD_ID,
          userId: `u_${i}`,
          userTag: `User ${i}`,
          totalScore: i * 100,
          gamesWon: 1,
          gamesPlayed: 2,
        });
      }

      const top5 = await getQuizLeaderboard(GUILD_ID, 5);
      assert.strictEqual(top5.length, 5);
      assert.strictEqual(top5[0].totalScore, 1500);

      const clamped = await getQuizLeaderboard(GUILD_ID, 100);
      assert.ok(clamped.length <= 50);
    });
  });

  describe('Embed & Component Presentation Builders', () => {
    it('buildQuestionEmbed generates full question with 4 colored options and scoring formula', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'tech',
        5,
      );
      const question = await startNextRound(GUILD_ID, session.sessionId);

      const embed = buildQuestionEmbed(session, question);

      assert.ok(embed.title?.includes('Question 1/5'));
      assert.ok(embed.description?.includes('TECH'));
      assert.ok(embed.description?.includes(question.question));
      assert.ok(embed.description?.includes('🔴 A:'));
      assert.ok(embed.description?.includes('🔵 B:'));
      assert.ok(embed.description?.includes('🟡 C:'));
      assert.ok(embed.description?.includes('🟢 D:'));
      assert.strictEqual(embed.color, 0x5865f2);
      assert.ok(embed.footer?.text?.includes('1,000 max'));
    });

    it('buildQuestionComponents generates ActionRow with 4 interactive buttons', () => {
      const rows = buildQuestionComponents('quiz-TEST1');
      assert.strictEqual(rows.length, 1);
      const row = rows[0];
      assert.strictEqual(row.type, 1);
      assert.strictEqual(row.components.length, 4);

      assert.strictEqual(
        (row.components[0] as any).custom_id,
        'quiz_ans:quiz-TEST1:0',
      );
      assert.strictEqual((row.components[0] as any).label, '🔴 A');

      assert.strictEqual(
        (row.components[1] as any).custom_id,
        'quiz_ans:quiz-TEST1:1',
      );
      assert.strictEqual((row.components[1] as any).label, '🔵 B');

      assert.strictEqual(
        (row.components[2] as any).custom_id,
        'quiz_ans:quiz-TEST1:2',
      );
      assert.strictEqual((row.components[2] as any).label, '🟡 C');

      assert.strictEqual(
        (row.components[3] as any).custom_id,
        'quiz_ans:quiz-TEST1:3',
      );
      assert.strictEqual((row.components[3] as any).label, '🟢 D');
    });

    it('buildRoundResultsEmbed displays correct answer, round accuracy, and top standings', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'gaming',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      await submitAnswer(
        GUILD_ID,
        session.sessionId,
        ALICE_ID,
        'Alice',
        q1.correctIndex,
      );
      await submitAnswer(
        GUILD_ID,
        session.sessionId,
        BOB_ID,
        'Bob',
        (q1.correctIndex + 1) % 4,
      );

      const embed = buildRoundResultsEmbed(
        session,
        q1,
        session.roundAnswers,
      );

      assert.ok(embed.title?.includes('Round 1/3 Concluded!'));
      assert.ok(embed.description?.includes('Correct Answer:'));
      assert.ok(embed.description?.includes('Correct: **1**'));
      assert.ok(embed.description?.includes('Incorrect: **1**'));
      assert.ok(embed.description?.includes('Alice'));
      assert.strictEqual(embed.color, 0x2ecc71);
    });

    it('buildPodiumEmbed displays victory ASCII art podium, gold theme, and coin rewards', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'anime',
        3,
      );
      const finalResults = {
        finalScores: [
          { userId: ALICE_ID, userTag: 'Alice', score: 2850 },
          { userId: BOB_ID, userTag: 'Bob', score: 1950 },
          { userId: CHARLIE_ID, userTag: 'Charlie', score: 900 },
        ],
        podium: [
          { userId: ALICE_ID, userTag: 'Alice', score: 2850 },
          { userId: BOB_ID, userTag: 'Bob', score: 1950 },
          { userId: CHARLIE_ID, userTag: 'Charlie', score: 900 },
        ],
        coinAwards: [
          { userId: ALICE_ID, userTag: 'Alice', place: 1, coins: 500 },
          { userId: BOB_ID, userTag: 'Bob', place: 2, coins: 250 },
          { userId: CHARLIE_ID, userTag: 'Charlie', place: 3, coins: 100 },
        ],
      };

      const embed = buildPodiumEmbed(session, finalResults);

      assert.ok(embed.title?.includes('Final Podium & Awards!'));
      assert.ok(embed.description?.includes('1st Place'));
      assert.ok(embed.description?.includes('Alice'));
      assert.ok(embed.description?.includes('+500 🪙'));
      assert.ok(embed.description?.includes('Bob'));
      assert.ok(embed.description?.includes('+250 🪙'));
      assert.ok(embed.description?.includes('Charlie'));
      assert.ok(embed.description?.includes('+100 🪙'));
      assert.strictEqual(embed.color, 0xf1c40f);
    });

    it('buildLeaderboardEmbed renders ranked champions or empty notice', async () => {
      const emptyEmbed = buildLeaderboardEmbed(GUILD_ID, []);
      assert.ok(emptyEmbed.description?.includes('No quiz games recorded'));

      const populatedEmbed = buildLeaderboardEmbed(GUILD_ID, [
        {
          guildId: GUILD_ID,
          userId: ALICE_ID,
          userTag: 'Alice',
          totalScore: 9200,
          gamesWon: 5,
          gamesPlayed: 8,
        } as any,
      ]);
      assert.ok(populatedEmbed.title?.includes('Trivia Leaderboard'));
      assert.ok(populatedEmbed.description?.includes('Alice'));
      assert.ok(populatedEmbed.description?.includes('9,200'));
      assert.ok(populatedEmbed.description?.includes('5 wins'));
    });
  });
});
