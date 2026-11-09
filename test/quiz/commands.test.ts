/**
 * test/quiz/commands.test.ts
 * Comprehensive unit tests for Service 8: Live Multiplayer Kahoot-Style Quiz Show — Slash Commands & Components:
 * - Central Command Registry lookup & subcommands schema verification (host, next, end, leaderboard)
 * - Rate limit (5/10s), fun category, dm_permission: false, and options schema verification
 * - /quiz host: session creation, question embed + button components generation, duplicate prevention
 * - /quiz next: host security enforcement, round progression, auto-conclusion on final round
 * - /quiz end: host or admin authorization, early termination, podium embed rendering
 * - /quiz leaderboard: server trivia leaderboard retrieval and display
 * - Main command dispatcher: server boundary enforcement (DMs rejection), routing
 * - handleQuizComponent: button answer handling, speed score feedback, incorrect feedback, duplicate submission warning
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import {
  getCommand,
  registerQuizCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  handleQuizCommand,
  handleQuizHostSubcommand,
  handleQuizNextSubcommand,
  handleQuizEndSubcommand,
  handleQuizLeaderboardSubcommand,
  handleQuizComponent,
  quizCommand,
} from '@/commands/quiz';
import {
  enableTestMode,
  clearTestStore,
  createQuizSession,
  startNextRound,
  setTestLeaderboard,
  getQuizSessionById,
} from '@/lib/quiz/quiz-service';

describe('Live Multiplayer Quiz Show — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_quiz_cmd_999';
  const CHANNEL_ID = 'chan_quiz_cmd_888';
  const HOST_ID = 'user_host_cmd_111';
  const PLAYER_ID = 'user_player_cmd_222';
  const MOD_ID = 'user_mod_cmd_333';

  const PERMS_ADMIN = PermissionFlags.ADMINISTRATOR.toString();
  const PERMS_MANAGE_GUILD = PermissionFlags.MANAGE_GUILD.toString();
  const PERMS_UNPRIVILEGED = '0';

  let interceptedResponses: Array<{
    token: string;
    options: InteractionResponseOptions;
  }> = [];

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
  });

  describe('Command Registry Integration & Schema', () => {
    it('registers /quiz in the central command registry', () => {
      registerQuizCommands();
      const cmd = getCommand('quiz');
      assert.ok(cmd, 'quiz command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'quiz');
      assert.strictEqual(cmd?.category, 'fun');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines 4 subcommands with accurate option schemas', () => {
      const subcommands = quizCommand.options?.map(
        (o: unknown) => (o as { name: string }).name,
      );
      assert.deepStrictEqual(subcommands, ['host', 'next', 'end', 'leaderboard']);

      // Check 'host' options
      const hostSub = quizCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'host',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(hostSub?.options?.some((o) => o.name === 'category' && o.required === false));
      assert.ok(hostSub?.options?.some((o) => o.name === 'rounds' && o.required === false));

      // Check 'leaderboard' options
      const lbSub = quizCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'leaderboard',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(lbSub?.options?.some((o) => o.name === 'limit' && o.required === false));
    });
  });

  describe('/quiz host Subcommand', () => {
    it('creates a session, starts Round 1, and sends question embed with 4 buttons', async () => {
      await handleQuizHostSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'token_host_1',
        [
          { name: 'category', value: 'tech' },
          { name: 'rounds', value: 5 },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Question 1/5'));
      assert.ok(res.embeds?.[0]?.description?.includes('TECH'));
      assert.strictEqual((res.components as any[])?.length, 1);
      assert.strictEqual(
        ((res.components as any[])[0] as any).components?.length,
        4,
      );
    });

    it('rejects hosting when channel already has an active quiz session', async () => {
      // First session: success
      await handleQuizHostSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'token_host_ok',
        [],
      );

      // Second session in same channel: rejected
      await handleQuizHostSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        PLAYER_ID,
        'token_host_err',
        [],
      );

      assert.strictEqual(interceptedResponses.length, 2);
      const errRes = interceptedResponses[1].options;
      assert.strictEqual(errRes.ephemeral, true);
      assert.ok(errRes.embeds?.[0]?.title?.includes('Quiz Host Error'));
      assert.ok(errRes.embeds?.[0]?.description?.includes('already has an active quiz'));
    });
  });

  describe('/quiz next Subcommand', () => {
    it('returns informative notice when no active quiz session exists', async () => {
      await handleQuizNextSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'token_next_none',
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0]?.title?.includes('No Active Quiz'));
    });

    it('rejects round progression from non-host with Host Only error', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      await startNextRound(GUILD_ID, session.sessionId);

      await handleQuizNextSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        PLAYER_ID, // Not the host
        'token_next_denied',
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0]?.title?.includes('Host Only'));
      assert.ok(res.embeds?.[0]?.description?.includes(HOST_ID));
    });

    it('advances from Round 1 to Round 2 when host calls /quiz next', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      await startNextRound(GUILD_ID, session.sessionId); // round 1

      await handleQuizNextSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'token_next_adv',
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Question 2/3'));
      assert.strictEqual((res.components as any[])?.length, 1);
    });

    it('automatically concludes session and displays podium on last round', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        3,
      );
      await startNextRound(GUILD_ID, session.sessionId); // 1
      await startNextRound(GUILD_ID, session.sessionId); // 2
      await startNextRound(GUILD_ID, session.sessionId); // 3 (currentRound === rounds)

      await handleQuizNextSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'token_next_finish',
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Final Podium & Awards!'));
      assert.strictEqual((res.components as any[])?.length, 0);

      const updated = await getQuizSessionById(GUILD_ID, session.sessionId);
      assert.strictEqual(updated?.status, 'ended');
    });
  });

  describe('/quiz end Subcommand', () => {
    it('returns informative notice when no active session exists to end', async () => {
      await handleQuizEndSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        PERMS_UNPRIVILEGED,
        'token_end_none',
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0]?.title?.includes('No Active Quiz'));
    });

    it('rejects ending quiz from non-host without admin permissions', async () => {
      await createQuizSession(GUILD_ID, CHANNEL_ID, HOST_ID, 'general', 3);

      await handleQuizEndSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        PLAYER_ID, // Neither host nor admin
        PERMS_UNPRIVILEGED,
        'token_end_denied',
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0]?.title?.includes('Permission Denied'));
    });

    it('allows quiz host to end active quiz session early', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        5,
      );

      await handleQuizEndSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        PERMS_UNPRIVILEGED,
        'token_end_host',
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Final Podium & Awards!'));

      const updated = await getQuizSessionById(GUILD_ID, session.sessionId);
      assert.strictEqual(updated?.status, 'ended');
    });

    it('allows server administrator with MANAGE_GUILD to end quiz session', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'general',
        5,
      );

      await handleQuizEndSubcommand(
        GUILD_ID,
        CHANNEL_ID,
        MOD_ID,
        PERMS_MANAGE_GUILD,
        'token_end_admin',
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Final Podium & Awards!'));

      const updated = await getQuizSessionById(GUILD_ID, session.sessionId);
      assert.strictEqual(updated?.status, 'ended');
    });
  });

  describe('/quiz leaderboard Subcommand', () => {
    it('returns server leaderboard embed with top players', async () => {
      setTestLeaderboard({
        guildId: GUILD_ID,
        userId: 'u100',
        userTag: 'MasterQuizzer',
        totalScore: 12000,
        gamesWon: 8,
        gamesPlayed: 12,
      });

      await handleQuizLeaderboardSubcommand(
        GUILD_ID,
        'token_lb_view',
        [{ name: 'limit', value: 10 }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Trivia Leaderboard'));
      assert.ok(res.embeds?.[0]?.description?.includes('MasterQuizzer'));
      assert.ok(res.embeds?.[0]?.description?.includes('12,000'));
    });
  });

  describe('Main Slash Command Dispatcher', () => {
    it('rejects execution outside of a guild (in DMs)', async () => {
      const interaction = {
        guild_id: undefined,
        token: 'token_dm',
        data: { name: 'quiz', options: [{ name: 'host' }] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleQuizCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0]?.title?.includes('Server Only'));
    });

    it('routes subcommand cleanly to host handler', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'token_route_host',
        member: { user: { id: HOST_ID, username: 'HostUser' }, permissions: '0' },
        data: {
          name: 'quiz',
          options: [{ name: 'host', options: [{ name: 'rounds', value: 4 }] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleQuizCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]?.title?.includes('Question 1/4'));
    });

    it('handles unknown subcommand with ephemeral error embed', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'token_route_unknown',
        member: { user: { id: HOST_ID }, permissions: '0' },
        data: {
          name: 'quiz',
          options: [{ name: 'nonexistent_subcommand' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleQuizCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0]?.title?.includes('Unknown Command'));
    });
  });

  describe('Interactive Component Handler (handleQuizComponent)', () => {
    it('submits correct answer and provides ephemeral feedback ("✅ Correct! +... pts")', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'tech',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);
      session.roundStartedAt = new Date();

      const component = {
        member: { user: { id: PLAYER_ID, username: 'PlayerAlice' } },
      } as unknown as APIMessageComponentInteraction;

      await handleQuizComponent(
        'token_btn_correct',
        `quiz_ans:${session.sessionId}:${q1.correctIndex}`,
        PLAYER_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.content?.includes('✅ Correct! +1000 pts'));
    });

    it('submits incorrect answer and provides ephemeral feedback ("❌ Incorrect! Correct was ...")', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'tech',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);
      const wrongIndex = (q1.correctIndex + 1) % 4;
      const expectedLetter = ['A', 'B', 'C', 'D'][q1.correctIndex];

      const component = {
        member: { user: { id: PLAYER_ID, username: 'PlayerBob' } },
      } as unknown as APIMessageComponentInteraction;

      await handleQuizComponent(
        'token_btn_wrong',
        `quiz_ans:${session.sessionId}:${wrongIndex}`,
        PLAYER_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.content?.includes(`❌ Incorrect! Correct was ${expectedLetter}.`));
    });

    it('rejects second answer attempt in same round with "⚠️ Already answered"', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'tech',
        3,
      );
      const q1 = await startNextRound(GUILD_ID, session.sessionId);

      const component = {
        member: { user: { id: PLAYER_ID, username: 'PlayerCharlie' } },
      } as unknown as APIMessageComponentInteraction;

      // 1st click
      await handleQuizComponent(
        'token_btn_click1',
        `quiz_ans:${session.sessionId}:${q1.correctIndex}`,
        PLAYER_ID,
        GUILD_ID,
        component,
      );

      // 2nd click in same round
      await handleQuizComponent(
        'token_btn_click2',
        `quiz_ans:${session.sessionId}:${q1.correctIndex}`,
        PLAYER_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 2);
      const res2 = interceptedResponses[1].options;
      assert.strictEqual(res2.ephemeral, true);
      assert.ok(res2.content?.includes('⚠️ Already answered'));
    });

    it('rejects answering when quiz round has ended', async () => {
      const session = await createQuizSession(
        GUILD_ID,
        CHANNEL_ID,
        HOST_ID,
        'tech',
        3,
      );
      session.status = 'ended';

      const component = {
        member: { user: { id: PLAYER_ID, username: 'PlayerDave' } },
      } as unknown as APIMessageComponentInteraction;

      await handleQuizComponent(
        'token_btn_ended',
        `quiz_ans:${session.sessionId}:0`,
        PLAYER_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(
        res.content?.includes('This quiz round is no longer accepting answers'),
      );
    });

    it('ignores components with unrelated customIds', async () => {
      const component = {} as APIMessageComponentInteraction;

      await handleQuizComponent(
        'token_btn_ignore',
        'unrelated_button:123',
        PLAYER_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 0);
    });
  });
});
