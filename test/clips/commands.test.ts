/**
 * test/clips/commands.test.ts
 * Comprehensive unit tests for Service 10: Community Gaming Clip Competitions — Slash Commands & Components:
 * - Central Command Registry lookup & subcommands schema verification (submit, leaderboard, crown, config)
 * - Rate limit (5/10s), fun category, dm_permission: false, and options schema verification
 * - Permission checks (MANAGE_GUILD on /clip crown and /clip config)
 * - /clip submit: clip creation, options validation, disabled contest check, embed/components return
 * - /clip leaderboard: weekly ranking presentation, custom limit parameter
 * - /clip crown: weekly champion announcement, winner selection, no-eligible warning
 * - /clip config: channel, role, and enabled settings updates
 * - Main command dispatcher: server boundary enforcement (DM rejection), routing
 * - handleClipComponent: button vote toggle, live scoring, anti-self-vote warning, not found handling
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
  registerClipCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  handleClipCommand,
  handleClipSubmitSubcommand,
  handleClipLeaderboardSubcommand,
  handleClipCrownSubcommand,
  handleClipConfigSubcommand,
  handleClipComponent,
  clipCommand,
} from '@/commands/clip';
import {
  enableTestMode,
  clearTestStore,
  setTestClip,
  getTestClip,
  setTestConfig,
  getTestConfig,
} from '@/lib/clips/clip-service';

describe('Community Gaming Clip Competitions — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_clip_cmd_100';
  const CHANNEL_ID = 'chan_clip_cmd_200';
  const USER_A = 'user_clip_submitter_111';
  const USER_B = 'user_clip_voter_222';
  const MOD_ID = 'user_clip_mod_333';

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
    enableTestMode(false);
  });

  describe('Command Registry Integration & Schema', () => {
    it('registers /clip in the central command registry', () => {
      registerClipCommands();
      const cmd = getCommand('clip');
      assert.ok(cmd, 'clip command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'clip');
      assert.strictEqual(cmd?.category, 'fun');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines 4 subcommands with accurate option schemas', () => {
      const subcommands = clipCommand.options?.map(
        (o: unknown) => (o as { name: string }).name,
      );
      assert.deepStrictEqual(subcommands, ['submit', 'leaderboard', 'crown', 'config']);

      // Check 'submit' options
      const submitSub = clipCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'submit',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(submitSub);
      assert.strictEqual(submitSub.options?.length, 3);
      assert.strictEqual(submitSub.options?.[0].name, 'title');
      assert.strictEqual(submitSub.options?.[0].required, true);
      assert.strictEqual(submitSub.options?.[1].name, 'url');
      assert.strictEqual(submitSub.options?.[1].required, true);
      assert.strictEqual(submitSub.options?.[2].name, 'game');
      assert.strictEqual(submitSub.options?.[2].required, false);

      // Check 'leaderboard' options
      const lbSub = clipCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'leaderboard',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(lbSub);
      assert.strictEqual(lbSub.options?.length, 2);
      assert.strictEqual(lbSub.options?.[0].name, 'week');
      assert.strictEqual(lbSub.options?.[1].name, 'limit');

      // Check 'crown' options
      const crownSub = clipCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'crown',
      ) as { options?: Array<{ name: string }> };
      assert.ok(crownSub);
      assert.strictEqual(crownSub.options?.[0].name, 'week');

      // Check 'config' options
      const configSub = clipCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'config',
      ) as { options?: Array<{ name: string }> };
      assert.ok(configSub);
      assert.strictEqual(configSub.options?.length, 3);
      assert.strictEqual(configSub.options?.[0].name, 'channel');
      assert.strictEqual(configSub.options?.[1].name, 'champion_role');
      assert.strictEqual(configSub.options?.[2].name, 'enabled');
    });
  });

  describe('/clip submit Subcommand', () => {
    it('creates clip and replies with rich embed and voting buttons', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'tok_sub_1',
        member: {
          user: { id: USER_A, username: 'EpicGamer' },
          permissions: PERMS_UNPRIVILEGED,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      const options = [
        { name: 'title', value: '360 No Scope Across Map' },
        { name: 'url', value: 'https://youtube.com/watch?v=trickshot123' },
        { name: 'game', value: 'Call of Duty' },
      ];

      await handleClipSubmitSubcommand(interaction, options);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.strictEqual(res.token, 'tok_sub_1');
      assert.ok(res.options.embeds);
      assert.strictEqual(res.options.embeds[0].title, '🎬 [Call of Duty] 360 No Scope Across Map');
      assert.ok(res.options.components);
    });

    it('returns error when contest is disabled by admin in config', async () => {
      setTestConfig(GUILD_ID, { enabled: false });

      const interaction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'tok_sub_disabled',
        member: { user: { id: USER_A } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      const options = [
        { name: 'title', value: 'Test' },
        { name: 'url', value: 'https://youtu.be/test' },
      ];

      await handleClipSubmitSubcommand(interaction, options);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('Contest Disabled'));
      assert.strictEqual(res.options.ephemeral, true);
    });

    it('returns error when required arguments are missing', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'tok_sub_missing',
        member: { user: { id: USER_A } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleClipSubmitSubcommand(interaction, []);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Missing Arguments'));
    });

    it('handles submission errors gracefully (e.g. invalid URL)', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'tok_sub_invalid_url',
        member: { user: { id: USER_A } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      const options = [
        { name: 'title', value: 'Nice Play' },
        { name: 'url', value: 'https://not-supported-platform.org/vid' },
      ];

      await handleClipSubmitSubcommand(interaction, options);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Submission Error'));
    });
  });

  describe('/clip leaderboard Subcommand', () => {
    it('retrieves and displays weekly leaderboard embed', async () => {
      setTestClip(GUILD_ID, 'clip-001', {
        title: 'Clutch Ace',
        totalScore: 12,
        week: '2026-W46',
      });

      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_lb_1',
      } as unknown as APIChatInputApplicationCommandInteraction;

      const options = [
        { name: 'week', value: '2026-W46' },
        { name: 'limit', value: 5 },
      ];

      await handleClipLeaderboardSubcommand(interaction, options);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('Leaderboard — Week 2026-W46'));
      assert.ok(res.options.embeds?.[0].description?.includes('Clutch Ace'));
    });
  });

  describe('/clip crown Subcommand (Permissions & Logic)', () => {
    it('rejects unauthorized users without MANAGE_GUILD permission', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_crown_unauth',
        member: {
          user: { id: USER_A },
          permissions: PERMS_UNPRIVILEGED,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleClipCrownSubcommand(interaction, []);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('Permission Denied'));
      assert.strictEqual(res.options.ephemeral, true);
    });

    it('crowns weekly champion when user has MANAGE_GUILD permission', async () => {
      setTestConfig(GUILD_ID, { championRoleId: 'role_clip_winner' });
      setTestClip(GUILD_ID, 'clip-WINNER', {
        userId: USER_A,
        title: 'Unbelievable 5k',
        game: 'Counter-Strike 2',
        totalScore: 24,
        week: '2026-W46',
      });

      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_crown_success',
        member: {
          user: { id: MOD_ID },
          permissions: PERMS_MANAGE_GUILD,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      const options = [{ name: 'week', value: '2026-W46' }];

      await handleClipCrownSubcommand(interaction, options);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('Weekly Clip Champion Crowned'));
      assert.ok(res.options.embeds?.[0].description?.includes('Unbelievable 5k'));
      assert.ok(res.options.embeds?.[0].description?.includes('<@&role_clip_winner>'));

      const clip = getTestClip(GUILD_ID, 'clip-WINNER');
      assert.strictEqual(clip?.isWinner, true);
    });

    it('returns warning when no clips have positive scores', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_crown_no_eligible',
        member: {
          user: { id: MOD_ID },
          permissions: PERMS_ADMIN,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      const options = [{ name: 'week', value: '2026-W46' }];

      await handleClipCrownSubcommand(interaction, options);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('No Eligible Clips'));
      assert.strictEqual(res.options.ephemeral, true);
    });
  });

  describe('/clip config Subcommand (Permissions & Logic)', () => {
    it('rejects unauthorized users without MANAGE_GUILD permission', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_cfg_unauth',
        member: {
          user: { id: USER_A },
          permissions: PERMS_UNPRIVILEGED,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleClipConfigSubcommand(interaction, []);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Permission Denied'));
    });

    it('updates configuration when user has MANAGE_GUILD permission', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_cfg_ok',
        member: {
          user: { id: MOD_ID },
          permissions: PERMS_MANAGE_GUILD,
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      const options = [
        { name: 'channel', value: 'chan_new_feed' },
        { name: 'champion_role', value: 'role_champion_tier' },
        { name: 'enabled', value: true },
      ];

      await handleClipConfigSubcommand(interaction, options);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('Clip Competition Configuration'));
      assert.ok(res.options.embeds?.[0].description?.includes('<#chan_new_feed>'));
      assert.ok(res.options.embeds?.[0].description?.includes('<@&role_champion_tier>'));

      const config = getTestConfig(GUILD_ID);
      assert.strictEqual(config?.channelId, 'chan_new_feed');
      assert.strictEqual(config?.championRoleId, 'role_champion_tier');
      assert.strictEqual(config?.enabled, true);
    });
  });

  describe('Main Command Dispatcher (handleClipCommand)', () => {
    it('rejects command if executed outside a server (in DMs)', async () => {
      const interaction = {
        guild_id: undefined, // DM context
        token: 'tok_dm',
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleClipCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Server Only'));
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
    });

    it('routes slash command interactions to proper subcommands', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_ID,
        token: 'tok_dispatch_sub',
        member: { user: { id: USER_A } },
        data: {
          name: 'clip',
          options: [
            {
              name: 'submit',
              options: [
                { name: 'title', value: 'Dispatcher Test' },
                { name: 'url', value: 'https://youtube.com/watch?v=dispatch' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleClipCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Dispatcher Test'));
    });
  });

  describe('Interactive Component Handler (handleClipComponent)', () => {
    it('handles button vote click: adds vote and sends ephemeral confirmation', async () => {
      setTestClip(GUILD_ID, 'clip-VOTE1', {
        userId: USER_A,
        title: 'Vote Test Clip',
        clipUrl: 'https://youtu.be/v1',
      });

      const component = {
        channel_id: CHANNEL_ID,
        message: { id: 'msg_100' },
      } as unknown as APIMessageComponentInteraction;

      await handleClipComponent('tok_vote_btn', 'clip_vote:clip-VOTE1:fire', USER_B, GUILD_ID, component);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('Vote Recorded!'));
      assert.ok(res.options.embeds?.[0].description?.includes('Fire Play 🔥'));
      assert.strictEqual(res.options.ephemeral, true);

      const clip = getTestClip(GUILD_ID, 'clip-VOTE1');
      assert.deepStrictEqual(clip?.votes.fire, [USER_B]);
      assert.strictEqual(clip?.totalScore, 2);
    });

    it('handles clicking the same vote button again: retracts vote', async () => {
      setTestClip(GUILD_ID, 'clip-VOTE2', {
        userId: USER_A,
        title: 'Retract Test Clip',
        votes: { fire: [USER_B], smart: [], fail: [] },
        totalScore: 2,
      });

      await handleClipComponent('tok_retract_btn', 'clip_vote:clip-VOTE2:fire', USER_B, GUILD_ID);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('Vote Retracted'));
      assert.strictEqual(res.options.ephemeral, true);

      const clip = getTestClip(GUILD_ID, 'clip-VOTE2');
      assert.deepStrictEqual(clip?.votes.fire, []);
      assert.strictEqual(clip?.totalScore, 0);
    });

    it('rejects self-voting with a friendly warning embed', async () => {
      setTestClip(GUILD_ID, 'clip-SELF', {
        userId: USER_A,
        title: 'Self Vote Clip',
      });

      await handleClipComponent('tok_self_btn', 'clip_vote:clip-SELF:smart', USER_A, GUILD_ID);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds?.[0].title?.includes('Self-Vote Restricted'));
      assert.ok(res.options.embeds?.[0].description?.includes('cannot vote on your own clip'));
      assert.strictEqual(res.options.ephemeral, true);
    });

    it('returns error when voting on non-existent clip', async () => {
      await handleClipComponent('tok_unknown_btn', 'clip_vote:clip-UNKNOWN:fail', USER_B, GUILD_ID);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Voting Error'));
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
    });

    it('returns error when vote category is invalid', async () => {
      await handleClipComponent('tok_invalid_cat', 'clip_vote:clip-XYZ:invalid_type', USER_B, GUILD_ID);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Invalid Vote'));
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
    });
  });
});
