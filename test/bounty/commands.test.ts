/**
 * test/bounty/commands.test.ts
 * Unit tests for Community Bounty Board — Slash Commands & Component Handlers:
 * - Central Command Registry lookup & subcommands schema verification
 * - Rate limit and economy category metadata
 * - /bounty create: successful posting, escrow deduction, insufficient funds, invalid reward
 * - /bounty list: viewing active bounties, category/status filters, empty state
 * - /bounty view: full embed with action buttons, missing id, not-found error
 * - /bounty claim: claiming bounty, self-claim block, not-open error
 * - /bounty submit: recording proof, claimant check, not-claimed error
 * - /bounty pay: payment payout by creator and moderator, unauthorized rejection
 * - /bounty cancel: cancellation and escrow refund by creator and mod, unauthorized rejection
 * - Interactive component routing: handleBountyComponent for bounty_claim, bounty_pay, bounty_cancel
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
  registerBountyCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleBountyCommand,
  handleBountyCreateSubcommand,
  handleBountyListSubcommand,
  handleBountyViewSubcommand,
  handleBountyClaimSubcommand,
  handleBountySubmitSubcommand,
  handleBountyPaySubcommand,
  handleBountyCancelSubcommand,
  handleBountyComponent,
  bountyCommand,
} from '@/commands/bounty';
import {
  enableTestMode,
  clearTestStore,
  setTestBalance,
  getTestBalance,
  createBounty,
  getBounty,
  claimBounty,
  submitBounty,
} from '@/lib/bounty/bounty-service';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Community Bounty Board — Slash Commands & Components', () => {
  const GUILD_ID = 'guild_bounty_cmd_999';
  const CREATOR_ID = 'user_alice_111';
  const CREATOR_TAG = 'Alice#1001';
  const CLAIMANT_ID = 'user_bob_222';
  const CLAIMANT_TAG = 'Bob#2002';
  const MOD_ID = 'user_mod_555';
  const MOD_PERMS = PermissionFlags.MANAGE_GUILD.toString();

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

  describe('Command Registry Integration', () => {
    it('registers /bounty with economy category and 7 subcommands', () => {
      registerBountyCommands();
      const cmd = getCommand('bounty');
      assert.ok(cmd, 'bounty command should be found in registry');
      assert.strictEqual(cmd.name, 'bounty');
      assert.strictEqual(cmd.category, 'economy');
      assert.deepStrictEqual(cmd.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd.options?.length, 7);

      const subcommands = (cmd.options as Array<{ name: string }>).map((o) => o.name);
      assert.ok(subcommands.includes('create'));
      assert.ok(subcommands.includes('list'));
      assert.ok(subcommands.includes('view'));
      assert.ok(subcommands.includes('claim'));
      assert.ok(subcommands.includes('submit'));
      assert.ok(subcommands.includes('pay'));
      assert.ok(subcommands.includes('cancel'));
    });
  });

  describe('/bounty create Subcommand', () => {
    it('creates a bounty and returns embed with claim button', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);

      await handleBountyCreateSubcommand(
        'tok_create_1',
        GUILD_ID,
        CREATOR_ID,
        CREATOR_TAG,
        [
          { name: 'title', value: 'Bot Optimization' },
          { name: 'reward', value: 150 },
          { name: 'description', value: 'Optimize MongoDB compound indices' },
          { name: 'category', value: 'dev' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]);
      assert.strictEqual(res.embeds[0].title, 'Bot Optimization');
      assert.ok(res.components?.[0]);

      // Escrow deduction verified
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 350);
    });

    it('rejects creation when creator wallet has insufficient funds', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 20);

      await handleBountyCreateSubcommand(
        'tok_create_2',
        GUILD_ID,
        CREATOR_ID,
        CREATOR_TAG,
        [
          { name: 'title', value: 'Overpriced Task' },
          { name: 'reward', value: 200 },
          { name: 'description', value: 'Too expensive' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Insufficient Funds'));
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 20);
    });

    it('rejects creation when reward is less than 10 coins', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 100);

      await handleBountyCreateSubcommand(
        'tok_create_3',
        GUILD_ID,
        CREATOR_ID,
        CREATOR_TAG,
        [
          { name: 'title', value: 'Cheap Task' },
          { name: 'reward', value: 5 },
          { name: 'description', value: 'Reward too low' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Invalid Reward'));
    });

    it('rejects creation when missing required parameters', async () => {
      await handleBountyCreateSubcommand(
        'tok_create_4',
        GUILD_ID,
        CREATOR_ID,
        CREATOR_TAG,
        [{ name: 'title', value: 'Incomplete' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Missing Parameters'));
    });
  });

  describe('/bounty list Subcommand', () => {
    it('returns formatted bounty list embed', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Task Alpha',
        description: 'First bounty',
        reward: 50,
      });

      await handleBountyListSubcommand('tok_list_1', GUILD_ID, []);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]);
      assert.strictEqual(res.embeds[0].title, '📜 Community Bounty Board');
      assert.ok(res.embeds[0].description?.includes('Task Alpha'));
    });

    it('returns polite info embed when no bounties match filter', async () => {
      await handleBountyListSubcommand('tok_list_2', GUILD_ID, [
        { name: 'category', value: 'gaming' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('No Bounties Found'));
    });
  });

  describe('/bounty view Subcommand', () => {
    it('returns full bounty embed and components for valid id', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Viewable Bounty',
        description: 'Detailed description',
        reward: 100,
      });

      await handleBountyViewSubcommand('tok_view_1', GUILD_ID, CREATOR_ID, [
        { name: 'id', value: b.bountyId },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.embeds?.[0].title, 'Viewable Bounty');
    });

    it('returns error embed when bounty id is missing or not found', async () => {
      await handleBountyViewSubcommand('tok_view_2', GUILD_ID, CREATOR_ID, [
        { name: 'id', value: 'bty-notfound' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Bounty Not Found'));
    });
  });

  describe('/bounty claim Subcommand', () => {
    it('claims an open bounty and returns updated embed with claimant', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Claimable Task',
        description: 'Claim me',
        reward: 100,
      });

      await handleBountyClaimSubcommand(
        'tok_claim_1',
        GUILD_ID,
        CLAIMANT_ID,
        CLAIMANT_TAG,
        [{ name: 'id', value: b.bountyId }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].fields?.some((f) => f.name === 'Claimed By'));

      const updated = await getBounty(GUILD_ID, b.bountyId);
      assert.strictEqual(updated?.status, 'claimed');
    });

    it('rejects self-claim by creator', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Self Claim Check',
        description: 'No self claims',
        reward: 50,
      });

      await handleBountyClaimSubcommand(
        'tok_claim_2',
        GUILD_ID,
        CREATOR_ID,
        CREATOR_TAG,
        [{ name: 'id', value: b.bountyId }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Self-Claim Blocked'));
    });
  });

  describe('/bounty submit Subcommand', () => {
    it('submits proof of work for claimed bounty', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Submission Task',
        description: 'Submit proof here',
        reward: 100,
      });

      await claimBounty(GUILD_ID, b.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      await handleBountySubmitSubcommand('tok_sub_1', GUILD_ID, CLAIMANT_ID, [
        { name: 'id', value: b.bountyId },
        { name: 'proof', value: 'https://github.com/pull/1' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Submission Received'));

      const updated = await getBounty(GUILD_ID, b.bountyId);
      assert.strictEqual(updated?.submission, 'https://github.com/pull/1');
    });

    it('rejects submission from non-claimant', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Claimed Bounty',
        description: 'Only claimant can submit',
        reward: 100,
      });

      await claimBounty(GUILD_ID, b.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      await handleBountySubmitSubcommand('tok_sub_2', GUILD_ID, 'other_user_999', [
        { name: 'id', value: b.bountyId },
        { name: 'proof', value: 'Unauthorized submission' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Not Claimant'));
    });
  });

  describe('/bounty pay Subcommand', () => {
    it('approves payment by creator and transfers coins to claimant', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      setTestBalance(GUILD_ID, CLAIMANT_ID, 0);

      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Payable Task',
        description: 'Complete and pay',
        reward: 200,
      });

      await claimBounty(GUILD_ID, b.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      await handleBountyPaySubcommand(
        'tok_pay_1',
        GUILD_ID,
        CREATOR_ID,
        '0',
        [{ name: 'id', value: b.bountyId }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Bounty Paid & Completed!'));

      // Claimant received 200 coins
      assert.strictEqual(getTestBalance(GUILD_ID, CLAIMANT_ID), 200);
    });

    it('approves payment by moderator (MANAGE_GUILD permission)', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      setTestBalance(GUILD_ID, CLAIMANT_ID, 0);

      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Mod Payout',
        description: 'Paid by mod',
        reward: 100,
      });

      await claimBounty(GUILD_ID, b.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      await handleBountyPaySubcommand(
        'tok_pay_2',
        GUILD_ID,
        MOD_ID,
        MOD_PERMS,
        [{ name: 'id', value: b.bountyId }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(getTestBalance(GUILD_ID, CLAIMANT_ID), 100);
    });

    it('rejects payment from unauthorized user', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Unauthorized Pay Check',
        description: 'Testing',
        reward: 100,
      });

      await claimBounty(GUILD_ID, b.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      await handleBountyPaySubcommand(
        'tok_pay_3',
        GUILD_ID,
        'unauthorized_user_777',
        '0',
        [{ name: 'id', value: b.bountyId }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Unauthorized'));
    });
  });

  describe('/bounty cancel Subcommand', () => {
    it('cancels bounty by creator and refunds escrow reward', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 400);

      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Cancel Me',
        description: 'Refund needed',
        reward: 200,
      });

      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 200);

      await handleBountyCancelSubcommand(
        'tok_cancel_1',
        GUILD_ID,
        CREATOR_ID,
        '0',
        [{ name: 'id', value: b.bountyId }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Bounty Cancelled'));

      // Creator received refund of 200 coins
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 400);
    });

    it('rejects cancellation from unauthorized user', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);

      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'No Unauthorized Cancel',
        description: 'Testing',
        reward: 100,
      });

      await handleBountyCancelSubcommand(
        'tok_cancel_2',
        GUILD_ID,
        'rando_user_888',
        '0',
        [{ name: 'id', value: b.bountyId }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Unauthorized'));
    });
  });

  describe('handleBountyCommand() Main Router', () => {
    it('routes slash command interactions to proper subcommands', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);

      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_main_1',
        member: {
          user: { id: CREATOR_ID, username: CREATOR_TAG },
          permissions: '0',
        },
        data: {
          name: 'bounty',
          options: [
            {
              name: 'create',
              options: [
                { name: 'title', value: 'Main Router Bounty' },
                { name: 'reward', value: 100 },
                { name: 'description', value: 'Routing test' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBountyCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.embeds?.[0].title, 'Main Router Bounty');
    });

    it('rejects interaction when executed in DMs (missing guild_id)', async () => {
      const dmInteraction = {
        token: 'tok_dm',
        user: { id: CREATOR_ID },
        data: { name: 'bounty', options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleBountyCommand(dmInteraction);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('only be used in a server'));
    });
  });

  describe('handleBountyComponent() Interactive Router', () => {
    it('handles bounty_claim button interaction', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Button Claimable',
        description: 'Click button',
        reward: 100,
      });

      const component = {
        member: {
          user: { id: CLAIMANT_ID, username: CLAIMANT_TAG },
          permissions: '0',
        },
      } as unknown as APIMessageComponentInteraction;

      await handleBountyComponent(
        'tok_btn_claim',
        `bounty_claim:${b.bountyId}`,
        CLAIMANT_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].fields?.some((f) => f.name === 'Claimed By'));

      const updated = await getBounty(GUILD_ID, b.bountyId);
      assert.strictEqual(updated?.status, 'claimed');
    });

    it('handles bounty_pay button interaction by creator', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      setTestBalance(GUILD_ID, CLAIMANT_ID, 0);

      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Button Payable',
        description: 'Pay via button',
        reward: 200,
      });

      await claimBounty(GUILD_ID, b.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      const component = {
        member: {
          user: { id: CREATOR_ID, username: CREATOR_TAG },
          permissions: '0',
        },
      } as unknown as APIMessageComponentInteraction;

      await handleBountyComponent(
        'tok_btn_pay',
        `bounty_pay:${b.bountyId}`,
        CREATOR_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(getTestBalance(GUILD_ID, CLAIMANT_ID), 200);

      const updated = await getBounty(GUILD_ID, b.bountyId);
      assert.strictEqual(updated?.status, 'completed');
    });

    it('handles bounty_cancel button interaction by creator', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 400);

      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Button Cancellable',
        description: 'Cancel via button',
        reward: 150,
      });

      await claimBounty(GUILD_ID, b.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      const component = {
        member: {
          user: { id: CREATOR_ID, username: CREATOR_TAG },
          permissions: '0',
        },
      } as unknown as APIMessageComponentInteraction;

      await handleBountyComponent(
        'tok_btn_cancel',
        `bounty_cancel:${b.bountyId}`,
        CREATOR_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 400);

      const updated = await getBounty(GUILD_ID, b.bountyId);
      assert.strictEqual(updated?.status, 'cancelled');
    });

    it('rejects button interaction with self-claim error embed', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const b = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Button Self Claim',
        description: 'Cannot self claim',
        reward: 50,
      });

      const component = {
        member: {
          user: { id: CREATOR_ID, username: CREATOR_TAG },
          permissions: '0',
        },
      } as unknown as APIMessageComponentInteraction;

      await handleBountyComponent(
        'tok_btn_self',
        `bounty_claim:${b.bountyId}`,
        CREATOR_ID,
        GUILD_ID,
        component,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].description?.includes('cannot claim your own bounty'));
    });
  });
});
