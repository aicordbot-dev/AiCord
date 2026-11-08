/**
 * test/confessions/commands.test.ts
 * Unit tests for Anonymous Confessions & Mutual Matchmaker — Slash Commands & Component Handlers:
 * - Central Command Registry lookup & subcommands schema verification
 * - Rate limit, fun category, and options verification
 * - /confess send: anonymous posting, channel requirements, disabled guard, profanity guard
 * - /confess crush: self-crush block, unilateral secret recording, mutual match celebration
 * - /confess config: MANAGE_GUILD permission check, updating channel/filter/enabled
 * - /confess top: empty server notice, ranked confessions embed list
 * - Interactive component routing: handleConfessionComponent for confess_vote:<confessionId>:<voteType>
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
  registerConfessionCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleConfessCommand,
  handleConfessSendSubcommand,
  handleConfessCrushSubcommand,
  handleConfessConfigSubcommand,
  handleConfessTopSubcommand,
  handleConfessionComponent,
  confessCommand,
} from '@/commands/confess';
import {
  enableTestMode,
  clearTestStore,
  setTestConfig,
  getTestConfig,
  setTestConfession,
  getTestConfession,
  setTestCrush,
  getTestCrush,
  submitConfession,
  voteConfession,
} from '@/lib/confessions/confession-service';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Anonymous Confessions & Matchmaker — Slash Commands & Components', () => {
  const GUILD_ID = 'guild_confess_cmd_999';
  const USER_ALICE = 'user_alice_111';
  const USER_BOB = 'user_bob_222';
  const ADMIN_PERMS = PermissionFlags.MANAGE_GUILD.toString();
  const MEMBER_PERMS = '0';
  const CHANNEL_ID = 'channel_confess_777';

  let interceptedResponses: Array<{
    token: string;
    options: InteractionResponseOptions;
  }> = [];

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();

    setTestConfig({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      filterProfanity: true,
      enabled: true,
    });

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

  describe('Command Registry Integration', () => {
    it('registers /confess in the central command registry', () => {
      registerConfessionCommands();
      const cmd = getCommand('confess');
      assert.ok(cmd, 'confess command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'confess');
      assert.strictEqual(cmd?.category, 'fun');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 15_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines all 4 required subcommands with valid options schemas', () => {
      const subcommands = confessCommand.options?.map((o: unknown) => (o as { name: string }).name);
      assert.deepStrictEqual(subcommands, ['send', 'crush', 'config', 'top']);

      // Check send options
      const sendSub = confessCommand.options?.find((o: unknown) => (o as { name: string }).name === 'send');
      const sendOptions = (sendSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(sendOptions?.some((o) => o.name === 'message' && o.required === true));
      assert.ok(sendOptions?.some((o) => o.name === 'reply_to' && o.required === false));

      // Check crush options
      const crushSub = confessCommand.options?.find((o: unknown) => (o as { name: string }).name === 'crush');
      const crushOptions = (crushSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(crushOptions?.some((o) => o.name === 'user' && o.required === true));

      // Check config options
      const configSub = confessCommand.options?.find((o: unknown) => (o as { name: string }).name === 'config');
      const configOptions = (configSub as { options?: Array<{ name: string }> })?.options;
      assert.ok(configOptions?.some((o) => o.name === 'channel'));
      assert.ok(configOptions?.some((o) => o.name === 'filter_profanity'));
      assert.ok(configOptions?.some((o) => o.name === 'enabled'));

      // Check top options
      const topSub = confessCommand.options?.find((o: unknown) => (o as { name: string }).name === 'top');
      const topOptions = (topSub as { options?: Array<{ name: string }> })?.options;
      assert.ok(topOptions?.some((o) => o.name === 'limit'));
    });
  });

  describe('/confess send Subcommand', () => {
    it('submits confession anonymously and replies with ephemeral confirmation', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_send_test',
        member: { user: { id: USER_ALICE }, permissions: MEMBER_PERMS },
        data: {
          name: 'confess',
          options: [
            {
              name: 'send',
              options: [
                {
                  name: 'message',
                  value: 'I love working on the AiCord discord platform!',
                },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Confession Sent'));
      assert.ok(resp.embeds?.[0]?.description?.includes('#1'));
      assert.ok(resp.embeds?.[0]?.description?.includes(CHANNEL_ID));

      const saved = getTestConfession(GUILD_ID, 1);
      assert.ok(saved);
      assert.strictEqual(saved?.content, 'I love working on the AiCord discord platform!');
    });

    it('rejects confession if service is disabled in server config', async () => {
      setTestConfig({ guildId: GUILD_ID, enabled: false });

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_disabled_test',
        member: { user: { id: USER_ALICE } },
        data: {
          name: 'confess',
          options: [
            {
              name: 'send',
              options: [{ name: 'message', value: 'This should fail cleanly.' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Confessions Disabled'));
    });

    it('warns user if confession channel has not been configured yet', async () => {
      setTestConfig({ guildId: GUILD_ID, channelId: '' });

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_no_channel_test',
        member: { user: { id: USER_ALICE } },
        data: {
          name: 'confess',
          options: [
            {
              name: 'send',
              options: [{ name: 'message', value: 'This should trigger warning.' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Channel Not Configured'));
    });

    it('rejects confessions with profanity or invalid length', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_profane_test',
        member: { user: { id: USER_ALICE } },
        data: {
          name: 'confess',
          options: [
            {
              name: 'send',
              options: [
                {
                  name: 'message',
                  value: 'I hate this fucking server so much',
                },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Submission Error'));
      assert.ok(resp.embeds?.[0]?.description?.includes('prohibited or profane'));
    });

    it('rejects command execution outside server (in DMs)', async () => {
      const interaction = {
        guild_id: undefined,
        token: 'token_dm_test',
        user: { id: USER_ALICE },
        data: {
          name: 'confess',
          options: [{ name: 'send', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.description?.includes('only be used in a server'));
    });
  });

  describe('/confess crush Subcommand', () => {
    it('rejects setting a secret crush on oneself', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_self_crush',
        member: { user: { id: USER_ALICE } },
        data: {
          name: 'confess',
          options: [
            {
              name: 'crush',
              options: [{ name: 'user', value: USER_ALICE }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Invalid Crush'));
      assert.ok(resp.embeds?.[0]?.description?.includes('cannot set a crush on yourself'));
    });

    it('records a unilateral crush secretly and informs user with ephemeral note', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_crush_alice',
        member: { user: { id: USER_ALICE } },
        data: {
          name: 'confess',
          options: [
            {
              name: 'crush',
              options: [{ name: 'user', value: USER_BOB }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Secret Crush Recorded'));
      assert.ok(resp.embeds?.[0]?.description?.includes(`<@${USER_BOB}>`));

      const crush = getTestCrush(GUILD_ID, USER_ALICE, USER_BOB);
      assert.ok(crush);
      assert.strictEqual(crush?.matched, false);
    });

    it('celebrates mutual match when target member also has a crush', async () => {
      // Alice registered crush on Bob first
      setTestCrush({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        crushUserId: USER_BOB,
        matched: false,
      });

      // Bob now uses /confess crush user:@Alice
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_crush_bob',
        member: { user: { id: USER_BOB } },
        data: {
          name: 'confess',
          options: [
            {
              name: 'crush',
              options: [{ name: 'user', value: USER_ALICE }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Mutual Crush Match'));
      assert.ok(resp.embeds?.[0]?.description?.includes(`<@${USER_ALICE}>`));

      // Both should be marked matched
      assert.strictEqual(getTestCrush(GUILD_ID, USER_ALICE, USER_BOB)?.matched, true);
      assert.strictEqual(getTestCrush(GUILD_ID, USER_BOB, USER_ALICE)?.matched, true);
    });
  });

  describe('/confess config Subcommand', () => {
    it('rejects non-admin members without MANAGE_GUILD permission', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_config_unauth',
        member: { user: { id: USER_ALICE }, permissions: MEMBER_PERMS },
        data: {
          name: 'confess',
          options: [
            {
              name: 'config',
              options: [{ name: 'enabled', value: false }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Permission Denied'));
    });

    it('allows admin with MANAGE_GUILD to update confession settings', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_config_admin',
        member: { user: { id: USER_ALICE }, permissions: ADMIN_PERMS },
        data: {
          name: 'confess',
          options: [
            {
              name: 'config',
              options: [
                { name: 'channel', value: 'channel_new_555' },
                { name: 'filter_profanity', value: false },
                { name: 'enabled', value: true },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Confessions Configuration'));
      assert.ok(resp.embeds?.[0]?.description?.includes('channel_new_555'));
      assert.ok(resp.embeds?.[0]?.description?.includes('❌ Disabled')); // profanity filter off

      const updated = getTestConfig(GUILD_ID);
      assert.strictEqual(updated?.channelId, 'channel_new_555');
      assert.strictEqual(updated?.filterProfanity, false);
      assert.strictEqual(updated?.enabled, true);
    });
  });

  describe('/confess top Subcommand', () => {
    it('returns empty notice when no confessions exist in guild', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_top_empty',
        member: { user: { id: USER_ALICE } },
        data: {
          name: 'confess',
          options: [{ name: 'top', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0]?.title?.includes('No Confessions Yet'));
    });

    it('returns formatted leaderboard embed when confessions exist', async () => {
      const c1 = await submitConfession(
        GUILD_ID,
        'I am the secret midnight coding ninja of the server.',
      );
      await voteConfession(GUILD_ID, c1.confessionId, USER_ALICE, 'wholesome');
      await voteConfession(GUILD_ID, c1.confessionId, USER_BOB, 'funny');

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_top_results',
        member: { user: { id: USER_ALICE } },
        data: {
          name: 'confess',
          options: [
            {
              name: 'top',
              options: [{ name: 'limit', value: 5 }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleConfessCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.embeds?.[0]?.title, '🏆 Top Server Confessions');
      assert.strictEqual(resp.embeds?.[0]?.fields?.length, 1);
      assert.ok(resp.embeds?.[0]?.fields?.[0]?.name.includes('Confession #1'));
      assert.ok(resp.embeds?.[0]?.fields?.[0]?.name.includes('2 total votes'));
    });
  });

  describe('handleConfessionComponent Interactive Voting Router', () => {
    let confessionId: number;

    beforeEach(async () => {
      const c = await submitConfession(
        GUILD_ID,
        'I built a custom Discord bot that manages our entire server.',
      );
      confessionId = c.confessionId;
    });

    it('records vote and responds with ephemeral success embed', async () => {
      const component = {
        channel_id: CHANNEL_ID,
        message: { id: 'msg_confess_1' },
      } as unknown as APIMessageComponentInteraction;

      await handleConfessionComponent(
        'token_vote_add',
        `confess_vote:${confessionId}:wholesome`,
        USER_ALICE,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Vote Recorded'));
      assert.ok(resp.embeds?.[0]?.description?.includes('❤️ Wholesome'));

      const conf = getTestConfession(GUILD_ID, confessionId);
      assert.strictEqual(conf?.votes.wholesome.includes(USER_ALICE), true);
    });

    it('removes vote when clicked second time and responds with ephemeral info embed', async () => {
      const component = {
        channel_id: CHANNEL_ID,
        message: { id: 'msg_confess_1' },
      } as unknown as APIMessageComponentInteraction;

      // First vote: added
      await handleConfessionComponent(
        'token_vote_1',
        `confess_vote:${confessionId}:funny`,
        USER_ALICE,
        GUILD_ID,
        component,
      );

      // Second vote: removed
      await handleConfessionComponent(
        'token_vote_2',
        `confess_vote:${confessionId}:funny`,
        USER_ALICE,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 2);
      const secondResp = interceptedResponses[1].options;
      assert.strictEqual(secondResp.ephemeral, true);
      assert.ok(secondResp.embeds?.[0]?.title?.includes('Vote Removed'));
      assert.ok(secondResp.embeds?.[0]?.description?.includes('😂 Funny'));

      const conf = getTestConfession(GUILD_ID, confessionId);
      assert.strictEqual(conf?.votes.funny.includes(USER_ALICE), false);
    });

    it('handles redFlag reaction vote correctly', async () => {
      const component = {
        channel_id: CHANNEL_ID,
        message: { id: 'msg_confess_1' },
      } as unknown as APIMessageComponentInteraction;

      await handleConfessionComponent(
        'token_vote_flag',
        `confess_vote:${confessionId}:redFlag`,
        USER_BOB,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.strictEqual(resp.ephemeral, true);
      assert.ok(resp.embeds?.[0]?.title?.includes('Vote Recorded'));
      assert.ok(resp.embeds?.[0]?.description?.includes('🚩 Red Flag'));

      const conf = getTestConfession(GUILD_ID, confessionId);
      assert.strictEqual(conf?.votes.redFlag.includes(USER_BOB), true);
    });

    it('rejects invalid or malformed component customIds', async () => {
      const component = {} as unknown as APIMessageComponentInteraction;

      await handleConfessionComponent(
        'token_vote_malformed',
        `confess_vote:invalid_id:wholesome`,
        USER_ALICE,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0]?.title?.includes('Error'));
    });
  });
});
