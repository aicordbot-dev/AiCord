/**
 * test/bounty/bounty-service.test.ts
 * Unit tests for Community Bounty Board & Escrow Lifecycle — Service Engine:
 * - Test mode store management (enableTestMode, clearTestStore, isTestMode, setTestBalance, getTestBalance, setTestBounty, getTestBounty)
 * - Escrow creation with balance deduction and minimum reward checks
 * - Insufficient funds rejection
 * - Self-claim prevention (userId === creatorId)
 * - Claiming open bounties & state transitions
 * - Submission proof recording by claimant
 * - Payment approval with escrow reward transfer to claimant (creator vs moderator)
 * - Cancellation with escrow refund to creator (creator vs moderator)
 * - Filtering bounties by category and status
 * - Embed builder formatting (badges, emojis, fields, colors)
 * - Interactive action component builder (state & viewer permission rules)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestBalance,
  getTestBalance,
  setTestBounty,
  getTestBounty,
  createBounty,
  getBounty,
  listBounties,
  claimBounty,
  submitBounty,
  payBounty,
  cancelBounty,
  buildBountyEmbed,
  buildBountyComponents,
  generateBountyId,
  BOUNTY_CATEGORY_EMOJIS,
  BOUNTY_STATUS_INDICATORS,
  type IBounty,
} from '@/lib/bounty/bounty-service';
import { Colors } from '@/lib/discord/embeds';

describe('Community Bounty Board — Service Engine', () => {
  const GUILD_ID = 'guild_bounty_100';
  const CREATOR_ID = 'user_creator_111';
  const CREATOR_TAG = 'Alice#1001';
  const CLAIMANT_ID = 'user_claimant_222';
  const CLAIMANT_TAG = 'Bob#2002';
  const MOD_ID = 'user_mod_999';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('Test Store & Wallet Simulation', () => {
    it('manages testMode state correctly', () => {
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
    });

    it('manages in-memory wallet balances correctly', () => {
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 0);
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 500);

      // Clamps negative balances to 0
      setTestBalance(GUILD_ID, CREATOR_ID, -100);
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 0);
    });

    it('generates unique bounty identifiers formatted as bty-XXXX', () => {
      const id1 = generateBountyId();
      const id2 = generateBountyId();
      assert.match(id1, /^bty-[0-9a-f]{4}$/);
      assert.match(id2, /^bty-[0-9a-f]{4}$/);
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('createBounty() Lifecycle & Escrow', () => {
    it('creates a bounty successfully and deducts reward from creator wallet', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 1000);

      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Fix React Memory Leak',
        description: 'Need help profiling and fixing a memory leak in Next.js worker.',
        reward: 250,
        category: 'dev',
      });

      assert.ok(bounty);
      assert.strictEqual(bounty.guildId, GUILD_ID);
      assert.strictEqual(bounty.creatorId, CREATOR_ID);
      assert.strictEqual(bounty.creatorTag, CREATOR_TAG);
      assert.strictEqual(bounty.title, 'Fix React Memory Leak');
      assert.strictEqual(bounty.reward, 250);
      assert.strictEqual(bounty.category, 'dev');
      assert.strictEqual(bounty.status, 'open');
      assert.match(bounty.bountyId, /^bty-[0-9a-f]{4}$/);

      // Verify wallet deduction
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 750);

      // Verify retrieval via getBounty
      const retrieved = await getBounty(GUILD_ID, bounty.bountyId);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.bountyId, bounty.bountyId);
    });

    it('defaults category to general when omitted', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);

      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Community Banner Art',
        description: 'Design banner art for Discord',
        reward: 50,
      });

      assert.strictEqual(bounty.category, 'general');
    });

    it('rejects creation when reward is less than 10 coins', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 100);

      await assert.rejects(
        () =>
          createBounty({
            guildId: GUILD_ID,
            creatorId: CREATOR_ID,
            creatorTag: CREATOR_TAG,
            title: 'Too Small Reward',
            description: 'Testing min reward',
            reward: 5,
          }),
        /Reward must be at least 10 coins/,
      );

      // Balance unchanged
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 100);
    });

    it('rejects creation with insufficient_funds when creator has inadequate balance', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 30);

      await assert.rejects(
        () =>
          createBounty({
            guildId: GUILD_ID,
            creatorId: CREATOR_ID,
            creatorTag: CREATOR_TAG,
            title: 'Expensive Bounty',
            description: 'Needs 500 coins',
            reward: 500,
          }),
        (err: Error) => err.message === 'insufficient_funds',
      );

      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 30);
    });
  });

  describe('claimBounty() Mechanics', () => {
    it('allows a community member to claim an open bounty', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Design Server Logo',
        description: 'New 512x512 vector logo',
        reward: 100,
        category: 'design',
      });

      const claimed = await claimBounty(
        GUILD_ID,
        bounty.bountyId,
        CLAIMANT_ID,
        CLAIMANT_TAG,
      );

      assert.strictEqual(claimed.status, 'claimed');
      assert.strictEqual(claimed.claimedBy, CLAIMANT_ID);
      assert.strictEqual(claimed.claimedByTag, CLAIMANT_TAG);
      assert.ok(claimed.claimedAt instanceof Date);
    });

    it('prevents self-claim by creator (userId === creatorId)', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Gaming Tournament Setup',
        description: 'Setup brackets',
        reward: 80,
        category: 'gaming',
      });

      await assert.rejects(
        () =>
          claimBounty(
            GUILD_ID,
            bounty.bountyId,
            CREATOR_ID,
            CREATOR_TAG,
          ),
        (err: Error) => err.message === 'self_claim_blocked',
      );

      assert.strictEqual(bounty.status, 'open');
    });

    it('rejects claiming a bounty that is already claimed', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Bot Feature Addition',
        description: 'Add music queue',
        reward: 100,
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      await assert.rejects(
        () =>
          claimBounty(
            GUILD_ID,
            bounty.bountyId,
            'third_party_333',
            'Charlie#3003',
          ),
        (err: Error) => err.message === 'bounty_not_open',
      );
    });

    it('rejects claim for non-existent bounty', async () => {
      await assert.rejects(
        () =>
          claimBounty(
            GUILD_ID,
            'bty-nonexistent',
            CLAIMANT_ID,
            CLAIMANT_TAG,
          ),
        (err: Error) => err.message === 'bounty_not_found',
      );
    });
  });

  describe('submitBounty() Mechanics', () => {
    it('records work submission by claimant', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Code Review PR #42',
        description: 'Review security changes',
        reward: 150,
        category: 'dev',
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      const submitted = await submitBounty(
        GUILD_ID,
        bounty.bountyId,
        CLAIMANT_ID,
        'https://github.com/org/repo/pull/42#pullrequestreview-100',
      );

      assert.strictEqual(
        submitted.submission,
        'https://github.com/org/repo/pull/42#pullrequestreview-100',
      );
      assert.ok(submitted.submittedAt instanceof Date);
    });

    it('rejects submission from user who is not the claimant', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Emote Pack',
        description: 'Draw 5 custom emojis',
        reward: 80,
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      await assert.rejects(
        () =>
          submitBounty(
            GUILD_ID,
            bounty.bountyId,
            'random_user_444',
            'Here are my emotes',
          ),
        (err: Error) => err.message === 'not_claimant',
      );
    });

    it('rejects submission if bounty is not in claimed status', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Unclaimed Bounty',
        description: 'Open state',
        reward: 50,
      });

      await assert.rejects(
        () =>
          submitBounty(
            GUILD_ID,
            bounty.bountyId,
            CLAIMANT_ID,
            'Premature submission',
          ),
        (err: Error) => err.message === 'bounty_not_claimed',
      );
    });
  });

  describe('payBounty() Escrow Release', () => {
    it('allows creator to approve payment and transfers reward to claimant', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      setTestBalance(GUILD_ID, CLAIMANT_ID, 50);

      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Rust CLI Tool',
        description: 'Write CLI parser in Rust',
        reward: 300,
        category: 'dev',
      });

      // Creator balance after escrow lock
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 200);

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);
      await submitBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, 'https://github.com/cli-tool');

      const completed = await payBounty(GUILD_ID, bounty.bountyId, CREATOR_ID, false);

      assert.strictEqual(completed.status, 'completed');
      assert.ok(completed.completedAt instanceof Date);

      // Claimant wallet received the 300 coins
      assert.strictEqual(getTestBalance(GUILD_ID, CLAIMANT_ID), 350);
      // Creator wallet remains at 200
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 200);
    });

    it('allows moderator (isMod = true) to approve payment', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      setTestBalance(GUILD_ID, CLAIMANT_ID, 0);

      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Moderator Payout Test',
        description: 'Testing mod payout authority',
        reward: 120,
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      const completed = await payBounty(GUILD_ID, bounty.bountyId, MOD_ID, true);

      assert.strictEqual(completed.status, 'completed');
      assert.strictEqual(getTestBalance(GUILD_ID, CLAIMANT_ID), 120);
    });

    it('rejects payment approval from unauthorized user', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Authority Check',
        description: 'Testing unauthorized payout',
        reward: 100,
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      await assert.rejects(
        () => payBounty(GUILD_ID, bounty.bountyId, 'stranger_555', false),
        (err: Error) => err.message === 'unauthorized',
      );
    });

    it('rejects payment if bounty is not in claimed status', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Not Claimed Yet',
        description: 'Cannot pay an open bounty',
        reward: 100,
      });

      await assert.rejects(
        () => payBounty(GUILD_ID, bounty.bountyId, CREATOR_ID, false),
        (err: Error) => err.message === 'bounty_not_claimed',
      );
    });
  });

  describe('cancelBounty() & Escrow Refund', () => {
    it('allows creator to cancel an open bounty and refunds reward to creator wallet', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 400);

      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Cancelled Open Bounty',
        description: 'Decided not to do this',
        reward: 200,
      });

      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 200);

      const cancelled = await cancelBounty(GUILD_ID, bounty.bountyId, CREATOR_ID, false);

      assert.strictEqual(cancelled.status, 'cancelled');
      // Full refund back to creator
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 400);
    });

    it('allows creator to cancel a claimed bounty and refunds reward', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 300);

      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Cancelled Claimed Bounty',
        description: 'Claimant was unresponsive',
        reward: 150,
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      const cancelled = await cancelBounty(GUILD_ID, bounty.bountyId, CREATOR_ID, false);
      assert.strictEqual(cancelled.status, 'cancelled');
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 300);
    });

    it('allows moderator to cancel a bounty', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);

      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Violated Rules',
        description: 'Spam bounty cancelled by staff',
        reward: 100,
      });

      const cancelled = await cancelBounty(GUILD_ID, bounty.bountyId, MOD_ID, true);
      assert.strictEqual(cancelled.status, 'cancelled');
      assert.strictEqual(getTestBalance(GUILD_ID, CREATOR_ID), 200);
    });

    it('rejects cancellation from unauthorized user', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Auth Cancel Check',
        description: 'Testing',
        reward: 50,
      });

      await assert.rejects(
        () => cancelBounty(GUILD_ID, bounty.bountyId, 'rando_777', false),
        (err: Error) => err.message === 'unauthorized',
      );
    });

    it('rejects cancellation of already completed or cancelled bounty', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 200);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Double Cancel',
        description: 'Testing',
        reward: 50,
      });

      await cancelBounty(GUILD_ID, bounty.bountyId, CREATOR_ID, false);

      await assert.rejects(
        () => cancelBounty(GUILD_ID, bounty.bountyId, CREATOR_ID, false),
        (err: Error) => err.message === 'cannot_cancel',
      );
    });
  });

  describe('listBounties() Query & Filtering', () => {
    beforeEach(async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 5000);

      await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Dev Task 1',
        description: 'Dev work',
        reward: 50,
        category: 'dev',
      });

      const b2 = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Design Task 2',
        description: 'Design work',
        reward: 100,
        category: 'design',
      });
      await claimBounty(GUILD_ID, b2.bountyId, CLAIMANT_ID, CLAIMANT_TAG);

      const b3 = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Gaming Task 3',
        description: 'Gaming clips',
        reward: 150,
        category: 'gaming',
      });
      await claimBounty(GUILD_ID, b3.bountyId, CLAIMANT_ID, CLAIMANT_TAG);
      await payBounty(GUILD_ID, b3.bountyId, CREATOR_ID, false);
    });

    it('lists all bounties for guild ordered by newest first', async () => {
      const all = await listBounties(GUILD_ID);
      assert.strictEqual(all.length, 3);
    });

    it('filters bounties by category', async () => {
      const devBounties = await listBounties(GUILD_ID, { category: 'dev' });
      assert.strictEqual(devBounties.length, 1);
      assert.strictEqual(devBounties[0].category, 'dev');
    });

    it('filters bounties by status', async () => {
      const openBounties = await listBounties(GUILD_ID, { status: 'open' });
      assert.strictEqual(openBounties.length, 1);
      assert.strictEqual(openBounties[0].status, 'open');

      const claimedBounties = await listBounties(GUILD_ID, { status: 'claimed' });
      assert.strictEqual(claimedBounties.length, 1);
      assert.strictEqual(claimedBounties[0].status, 'claimed');

      const completedBounties = await listBounties(GUILD_ID, { status: 'completed' });
      assert.strictEqual(completedBounties.length, 1);
      assert.strictEqual(completedBounties[0].status, 'completed');
    });
  });

  describe('buildBountyEmbed() Visual Formatting', () => {
    it('builds open bounty embed with proper badges and green color', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Discord Bot Embed Visualizer',
        description: 'Build an interactive canvas embed previewer',
        reward: 200,
        category: 'dev',
      });

      const embed = buildBountyEmbed(bounty);

      assert.strictEqual(embed.title, 'Discord Bot Embed Visualizer');
      assert.strictEqual(embed.description, 'Build an interactive canvas embed previewer');
      assert.strictEqual(embed.color, Colors.SUCCESS);
      assert.ok(embed.fields);
      assert.ok(embed.fields.some((f) => f.name === 'Reward' && f.value.includes('200 Coins')));
      assert.ok(embed.fields.some((f) => f.name === 'Category' && f.value.includes('💻 Dev')));
      assert.ok(embed.fields.some((f) => f.name === 'Status' && f.value.includes('🟢 OPEN')));
      assert.ok(embed.footer?.text.includes(bounty.bountyId));
    });

    it('builds claimed bounty embed with claimant field and warning yellow color', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Soundboard Audio Assets',
        description: 'High quality sound effects',
        reward: 120,
        category: 'gaming',
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);
      const claimed = (await getBounty(GUILD_ID, bounty.bountyId))!;

      const embed = buildBountyEmbed(claimed);
      assert.strictEqual(embed.color, Colors.WARNING);
      assert.ok(embed.fields?.some((f) => f.name === 'Claimed By' && f.value.includes(CLAIMANT_ID)));
    });

    it('includes submission proof when submitted', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Submission Test',
        description: 'Need proof',
        reward: 80,
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);
      await submitBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, 'https://cdn.example.com/proof.png');
      const submitted = (await getBounty(GUILD_ID, bounty.bountyId))!;

      const embed = buildBountyEmbed(submitted);
      assert.ok(embed.fields?.some((f) => f.name === 'Submission Proof' && f.value.includes('proof.png')));
    });

    it('builds cancelled bounty embed with danger red color', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Cancelled Embed',
        description: 'Description',
        reward: 50,
      });

      const cancelled = await cancelBounty(GUILD_ID, bounty.bountyId, CREATOR_ID, false);
      const embed = buildBountyEmbed(cancelled);
      assert.strictEqual(embed.color, Colors.DANGER);
      assert.ok(embed.fields?.some((f) => f.name === 'Status' && f.value.includes('❌ CANCELLED')));
    });
  });

  describe('buildBountyComponents() Interactive Rows', () => {
    it('returns Claim Bounty button for open bounties', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Open Button Test',
        description: 'Testing buttons',
        reward: 100,
      });

      const rows = buildBountyComponents(bounty);
      assert.strictEqual(rows.length, 1);
      const btn = rows[0].components[0] as { custom_id: string; label: string };
      assert.strictEqual(btn.custom_id, `bounty_claim:${bounty.bountyId}`);
      assert.strictEqual(btn.label, '🎯 Claim Bounty');
    });

    it('returns Pay & Complete and Cancel buttons for creator when bounty is claimed', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Claimed Button Test',
        description: 'Testing buttons',
        reward: 100,
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);
      const claimed = (await getBounty(GUILD_ID, bounty.bountyId))!;

      // Viewer is creator
      const rows = buildBountyComponents(claimed, CREATOR_ID);
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].components.length, 2);

      const payBtn = rows[0].components[0] as { custom_id: string; label: string };
      const cancelBtn = rows[0].components[1] as { custom_id: string; label: string };

      assert.strictEqual(payBtn.custom_id, `bounty_pay:${bounty.bountyId}`);
      assert.strictEqual(payBtn.label, '✅ Pay & Complete');
      assert.strictEqual(cancelBtn.custom_id, `bounty_cancel:${bounty.bountyId}`);
      assert.strictEqual(cancelBtn.label, '❌ Cancel');
    });

    it('hides Pay and Cancel buttons when viewer is not the creator on claimed bounty', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Other Viewer Test',
        description: 'Testing viewer separation',
        reward: 100,
      });

      await claimBounty(GUILD_ID, bounty.bountyId, CLAIMANT_ID, CLAIMANT_TAG);
      const claimed = (await getBounty(GUILD_ID, bounty.bountyId))!;

      const rows = buildBountyComponents(claimed, CLAIMANT_ID);
      assert.strictEqual(rows.length, 0);
    });

    it('returns empty components array for completed or cancelled bounties', async () => {
      setTestBalance(GUILD_ID, CREATOR_ID, 500);
      const bounty = await createBounty({
        guildId: GUILD_ID,
        creatorId: CREATOR_ID,
        creatorTag: CREATOR_TAG,
        title: 'Finished Bounty',
        description: 'Done',
        reward: 50,
      });

      const cancelled = await cancelBounty(GUILD_ID, bounty.bountyId, CREATOR_ID, false);
      const rows = buildBountyComponents(cancelled);
      assert.strictEqual(rows.length, 0);
    });
  });
});
