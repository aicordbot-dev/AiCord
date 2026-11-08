/**
 * src/lib/bounty/bounty-service.ts
 * Community Bounty Board & Escrow Lifecycle Engine for AiCord.
 *
 * Capabilities:
 * - In-memory test store & wallet balance simulation
 * - Coin escrow lifecycle (deduction on post, refund on cancel, transfer on pay)
 * - Bounty CRUD, claiming, submissions, and authority verification
 * - Discord visual embeds & action components builder
 */

import { connectDB } from '@/lib/db';
import {
  Bounty,
  EconomyUser,
  type IBounty,
  type BountyCategory,
  type BountyStatus,
} from '@/models';
import { type DiscordEmbed, clampEmbed, Colors } from '@/lib/discord/embeds';
import {
  type ActionRow,
  buildActionRow,
  buildButton,
} from '@/lib/discord/interaction-response';

export type { IBounty, BountyCategory, BountyStatus };

export const BOUNTY_CATEGORY_EMOJIS: Record<BountyCategory, string> = {
  dev: '💻 Dev',
  design: '🎨 Design',
  gaming: '🎮 Gaming',
  general: '📌 General',
};

export const BOUNTY_STATUS_INDICATORS: Record<BountyStatus, string> = {
  open: '🟢 OPEN',
  claimed: '🟡 CLAIMED',
  completed: '🏆 COMPLETED',
  cancelled: '❌ CANCELLED',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CreateBountyParams {
  guildId: string;
  creatorId: string;
  creatorTag: string;
  title: string;
  description: string;
  reward: number;
  category?: BountyCategory;
  channelId?: string;
  messageId?: string;
  bountyId?: string;
}

export interface ListBountiesFilter {
  category?: string;
  status?: string;
}

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
const testBounties = new Map<string, IBounty>();
const testBalances = new Map<string, number>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testBounties.clear();
  testBalances.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

function bountyStoreKey(guildId: string, bountyId: string): string {
  return `${guildId}:${bountyId.toLowerCase()}`;
}

function balanceKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function setTestBounty(bounty: IBounty): void {
  testBounties.set(bountyStoreKey(bounty.guildId, bounty.bountyId), bounty);
}

export function getTestBounty(guildId: string, bountyId: string): IBounty | undefined {
  return testBounties.get(bountyStoreKey(guildId, bountyId));
}

export function setTestBalance(guildId: string, userId: string, amount: number): void {
  testBalances.set(balanceKey(guildId, userId), Math.max(0, amount));
}

export function getTestBalance(guildId: string, userId: string): number {
  return testBalances.get(balanceKey(guildId, userId)) ?? 0;
}

// ─── Wallet Integration ───────────────────────────────────────────────────────

export async function getWalletBalance(guildId: string, userId: string): Promise<number> {
  if (testMode) {
    return getTestBalance(guildId, userId);
  }

  await connectDB();
  const ecoUser = await EconomyUser.findOne({ guildId, userId });
  return ecoUser?.wallet ?? 0;
}

export async function deductWalletBalance(
  guildId: string,
  userId: string,
  amount: number,
): Promise<void> {
  if (testMode) {
    const current = getTestBalance(guildId, userId);
    if (current < amount) {
      throw new Error('insufficient_funds');
    }
    setTestBalance(guildId, userId, current - amount);
    return;
  }

  await connectDB();
  const ecoUser = await EconomyUser.findOne({ guildId, userId });
  if (!ecoUser || ecoUser.wallet < amount) {
    throw new Error('insufficient_funds');
  }
  ecoUser.wallet -= amount;
  await ecoUser.save();
}

export async function addWalletBalance(
  guildId: string,
  userId: string,
  amount: number,
): Promise<void> {
  if (testMode) {
    const current = getTestBalance(guildId, userId);
    setTestBalance(guildId, userId, current + amount);
    return;
  }

  await connectDB();
  let ecoUser = await EconomyUser.findOne({ guildId, userId });
  if (!ecoUser) {
    ecoUser = await EconomyUser.create({
      guildId,
      userId,
      wallet: amount,
      bank: 0,
      bankCapacity: 5000,
      dailyStreak: 0,
      inventory: [],
    });
  } else {
    ecoUser.wallet += amount;
    await ecoUser.save();
  }
}

// ─── ID Generator ─────────────────────────────────────────────────────────────

export function generateBountyId(): string {
  const chars = '0123456789abcdef';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `bty-${rand}`;
}

// ─── Mock Document Factory ────────────────────────────────────────────────────

function createMockBounty(data: Partial<IBounty>): IBounty {
  const doc = {
    guildId: data.guildId ?? '',
    bountyId: data.bountyId ?? generateBountyId(),
    creatorId: data.creatorId ?? '',
    creatorTag: data.creatorTag ?? 'Anonymous',
    title: data.title ?? '',
    description: data.description ?? '',
    reward: data.reward ?? 10,
    category: (data.category ?? 'general') as BountyCategory,
    status: (data.status ?? 'open') as BountyStatus,
    claimedBy: data.claimedBy,
    claimedByTag: data.claimedByTag,
    claimedAt: data.claimedAt,
    submission: data.submission,
    submittedAt: data.submittedAt,
    completedAt: data.completedAt,
    channelId: data.channelId,
    messageId: data.messageId,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
    save: async function () {
      setTestBounty(this as unknown as IBounty);
      return this;
    },
  };

  return doc as unknown as IBounty;
}

// ─── Bounty Service Methods ───────────────────────────────────────────────────

/**
 * Creates a new community bounty and locks the reward in escrow.
 */
export async function createBounty(params: CreateBountyParams): Promise<IBounty> {
  const reward = Math.floor(params.reward);
  if (!reward || reward < 10) {
    throw new Error('Reward must be at least 10 coins.');
  }

  // Check creator wallet balance and deduct escrow
  const balance = await getWalletBalance(params.guildId, params.creatorId);
  if (balance < reward) {
    throw new Error('insufficient_funds');
  }

  await deductWalletBalance(params.guildId, params.creatorId, reward);

  const category = params.category || 'general';
  const bountyId = params.bountyId || generateBountyId();

  if (testMode) {
    const mock = createMockBounty({
      guildId: params.guildId,
      bountyId,
      creatorId: params.creatorId,
      creatorTag: params.creatorTag,
      title: params.title,
      description: params.description,
      reward,
      category,
      status: 'open',
      channelId: params.channelId,
      messageId: params.messageId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setTestBounty(mock);
    return mock;
  }

  await connectDB();
  const bounty = await Bounty.create({
    guildId: params.guildId,
    bountyId,
    creatorId: params.creatorId,
    creatorTag: params.creatorTag,
    title: params.title,
    description: params.description,
    reward,
    category,
    status: 'open',
    channelId: params.channelId,
    messageId: params.messageId,
  });

  return bounty;
}

/**
 * Retrieves a single bounty by its guild and bountyId.
 */
export async function getBounty(
  guildId: string,
  bountyId: string,
): Promise<IBounty | null> {
  if (!guildId || !bountyId) return null;

  if (testMode) {
    const found = getTestBounty(guildId, bountyId);
    return found ?? null;
  }

  await connectDB();
  const found =
    (await Bounty.findOne({ guildId, bountyId: bountyId.toLowerCase() })) ??
    (await Bounty.findOne({ guildId, bountyId }));
  return found;
}

/**
 * Lists bounties for a guild with optional category and status filtering.
 */
export async function listBounties(
  guildId: string,
  filter?: ListBountiesFilter,
): Promise<IBounty[]> {
  if (!guildId) return [];

  if (testMode) {
    let list = Array.from(testBounties.values()).filter(
      (b) => b.guildId === guildId,
    );

    if (filter?.category) {
      list = list.filter(
        (b) => b.category.toLowerCase() === filter.category!.toLowerCase(),
      );
    }
    if (filter?.status) {
      list = list.filter(
        (b) => b.status.toLowerCase() === filter.status!.toLowerCase(),
      );
    }

    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return list;
  }

  await connectDB();
  const query: Record<string, unknown> = { guildId };
  if (filter?.category) {
    query.category = filter.category;
  }
  if (filter?.status) {
    query.status = filter.status;
  }

  return await Bounty.find(query).sort({ createdAt: -1 });
}

/**
 * Claims an open bounty by a community member.
 */
export async function claimBounty(
  guildId: string,
  bountyId: string,
  userId: string,
  userTag: string,
): Promise<IBounty> {
  const bounty = await getBounty(guildId, bountyId);
  if (!bounty) {
    throw new Error('bounty_not_found');
  }

  if (bounty.status !== 'open') {
    throw new Error('bounty_not_open');
  }

  if (userId === bounty.creatorId) {
    throw new Error('self_claim_blocked');
  }

  bounty.status = 'claimed';
  bounty.claimedBy = userId;
  bounty.claimedByTag = userTag;
  bounty.claimedAt = new Date();
  bounty.updatedAt = new Date();

  await bounty.save();
  return bounty;
}

/**
 * Submits work or proof for a claimed bounty.
 */
export async function submitBounty(
  guildId: string,
  bountyId: string,
  userId: string,
  submissionText: string,
): Promise<IBounty> {
  const bounty = await getBounty(guildId, bountyId);
  if (!bounty) {
    throw new Error('bounty_not_found');
  }

  if (bounty.status !== 'claimed') {
    throw new Error('bounty_not_claimed');
  }

  if (userId !== bounty.claimedBy) {
    throw new Error('not_claimant');
  }

  bounty.submission = submissionText;
  bounty.submittedAt = new Date();
  bounty.updatedAt = new Date();

  await bounty.save();
  return bounty;
}

/**
 * Approves payment for a claimed bounty, releasing escrow funds to the claimant.
 */
export async function payBounty(
  guildId: string,
  bountyId: string,
  actorId: string,
  isMod: boolean = false,
): Promise<IBounty> {
  const bounty = await getBounty(guildId, bountyId);
  if (!bounty) {
    throw new Error('bounty_not_found');
  }

  if (actorId !== bounty.creatorId && !isMod) {
    throw new Error('unauthorized');
  }

  if (bounty.status !== 'claimed') {
    throw new Error('bounty_not_claimed');
  }

  if (!bounty.claimedBy) {
    throw new Error('missing_claimant');
  }

  // Release locked escrow coins to claimant
  await addWalletBalance(guildId, bounty.claimedBy, bounty.reward);

  bounty.status = 'completed';
  bounty.completedAt = new Date();
  bounty.updatedAt = new Date();

  await bounty.save();
  return bounty;
}

/**
 * Cancels a bounty and refunds the escrow funds back to the creator.
 */
export async function cancelBounty(
  guildId: string,
  bountyId: string,
  actorId: string,
  isMod: boolean = false,
): Promise<IBounty> {
  const bounty = await getBounty(guildId, bountyId);
  if (!bounty) {
    throw new Error('bounty_not_found');
  }

  if (actorId !== bounty.creatorId && !isMod) {
    throw new Error('unauthorized');
  }

  if (bounty.status !== 'open' && bounty.status !== 'claimed') {
    throw new Error('cannot_cancel');
  }

  // Refund locked escrow coins back to creator
  await addWalletBalance(guildId, bounty.creatorId, bounty.reward);

  bounty.status = 'cancelled';
  bounty.updatedAt = new Date();

  await bounty.save();
  return bounty;
}

// ─── Embed & Component Builders ───────────────────────────────────────────────

/**
 * Builds a visual Discord embed representing a community bounty.
 */
export function buildBountyEmbed(bounty: IBounty): DiscordEmbed {
  const categoryEmoji =
    BOUNTY_CATEGORY_EMOJIS[bounty.category] || BOUNTY_CATEGORY_EMOJIS.general;
  const statusIndicator =
    BOUNTY_STATUS_INDICATORS[bounty.status] || bounty.status.toUpperCase();
  const rewardBadge = `🪙 ${bounty.reward.toLocaleString()} Coins`;

  let color: number = Colors.PRIMARY;
  if (bounty.status === 'open') color = Colors.SUCCESS;
  else if (bounty.status === 'claimed') color = Colors.WARNING;
  else if (bounty.status === 'completed') color = Colors.PRIMARY;
  else if (bounty.status === 'cancelled') color = Colors.DANGER;

  const fields = [
    {
      name: 'Reward',
      value: rewardBadge,
      inline: true,
    },
    {
      name: 'Category',
      value: categoryEmoji,
      inline: true,
    },
    {
      name: 'Status',
      value: statusIndicator,
      inline: true,
    },
    {
      name: 'Posted By',
      value: `<@${bounty.creatorId}> (${bounty.creatorTag})`,
      inline: true,
    },
  ];

  if (bounty.claimedBy) {
    fields.push({
      name: 'Claimed By',
      value: `<@${bounty.claimedBy}> (${bounty.claimedByTag || 'Anonymous'})`,
      inline: true,
    });
  }

  if (bounty.submission) {
    fields.push({
      name: 'Submission Proof',
      value: bounty.submission,
      inline: false,
    });
  }

  const embed: DiscordEmbed = {
    title: bounty.title,
    description: bounty.description,
    color,
    fields,
    footer: {
      text: `Bounty ID: ${bounty.bountyId} • AiCord Bounty Escrow`,
    },
    timestamp: (bounty.createdAt ?? new Date()).toISOString(),
  };

  return clampEmbed(embed);
}

/**
 * Builds interactive button components according to bounty state and viewer permissions.
 */
export function buildBountyComponents(
  bounty: IBounty,
  viewerId?: string,
): ActionRow[] {
  if (bounty.status === 'open') {
    return [
      buildActionRow(
        buildButton({
          style: 3, // Success
          label: '🎯 Claim Bounty',
          customId: `bounty_claim:${bounty.bountyId}`,
        }),
      ),
    ];
  }

  if (bounty.status === 'claimed') {
    // If viewer is provided and is NOT the creator, do not display pay/cancel buttons
    if (viewerId && viewerId !== bounty.creatorId) {
      return [];
    }

    return [
      buildActionRow(
        buildButton({
          style: 3, // Success
          label: '✅ Pay & Complete',
          customId: `bounty_pay:${bounty.bountyId}`,
        }),
        buildButton({
          style: 4, // Danger
          label: '❌ Cancel',
          customId: `bounty_cancel:${bounty.bountyId}`,
        }),
      ),
    ];
  }

  return [];
}
