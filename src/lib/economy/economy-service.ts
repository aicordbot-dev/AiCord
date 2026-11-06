/**
 * src/lib/economy/economy-service.ts
 * Core Server Economy, Daily Streaks, Bank, and Gamification Engine for AiCord.
 *
 * Implements:
 * - User economy balance management (wallet, bank, bank capacity)
 * - 24-hour daily streak claims with progressive bonuses and multipliers up to 3x
 * - Bank deposit and withdrawal with capacity limits and 'all' shorthand
 * - Peer-to-peer coin transfers with atomic validation
 * - 1-hour work shifts with randomized payouts and programming/Discord narratives
 * - 2-hour high-risk crimes with 55% win rate and bounded fines
 * - Guild net worth wealth leaderboard with pagination
 * - Server shop item management (roles, badges, custom items) and inventory purchasing
 * - Full in-memory test store support for deterministic unit testing
 */

import { connectDB } from '@/lib/db';
import {
  EconomyUser,
  type IEconomyUser,
  type IEconomyInventoryItem,
} from '@/models/EconomyUser';
import {
  EconomyShopItem,
  type IEconomyShopItem,
  type ShopItemType,
} from '@/models/EconomyShopItem';

// ─── Time Constants ───────────────────────────────────────────────────────

export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DAILY_STREAK_RESET_MS = 48 * 60 * 60 * 1000; // 48 hours
export const WORK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
export const CRIME_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

export const DEFAULT_BANK_CAPACITY = 5000;
export const BASE_DAILY_REWARD = 250;
export const DAILY_STREAK_BONUS = 25;

// ─── Narrative Collections ────────────────────────────────────────────────

export const WORK_NARRATIVES = [
  'You fixed a critical race condition in production and were tipped',
  'You wrote unit tests that brought code coverage to 100% and earned',
  'You moderated a chaotic voice channel for 2 hours and were paid',
  'You refactored legacy callback spaghetti into async/await and received',
  'You set up automated CI/CD deployment pipelines for the team and earned',
  'You resolved 12 open GitHub issues and were rewarded',
  'You designed custom animated server emojis and earned',
  'You built an Ed25519 webhook signature verifier and were paid',
  'You squashed a memory leak in the Redis cache worker and received',
  'You helped onboarding 50 new community members and earned',
];

export const CRIME_SUCCESS_NARRATIVES = [
  "You hacked into a rival bot's staging database and swiped",
  'You successfully ran an automated front-running arbitrage bot and pocketed',
  'You snuck past the Discord server security audit and looted',
  'You exploited a smart contract bug on testnet and escaped with',
  'You pirated an exclusive proprietary LLM model weight file and fenced it for',
];

export const CRIME_FAIL_NARRATIVES = [
  'The Discord Trust & Safety team caught you spamming API endpoints. You were fined',
  'You triggered a honeypot DDoS defense trap! Server admins fined you',
  'Your phishing bot was traced by the Cyber Police. You had to pay a fine of',
  'You tripped an IDS alert while attempting to breach the mainframe. The court fined you',
  'Your exploit was patched midway through execution! The security bounty hunters fined you',
];

// ─── Result Types ─────────────────────────────────────────────────────────

export interface ClaimDailyResult {
  alreadyClaimed: boolean;
  nextClaimInMs: number;
  reward: number;
  streak: number;
  newBalance: number;
}

export interface DepositResult {
  success: boolean;
  deposited?: number;
  wallet?: number;
  bank?: number;
  bankCapacity?: number;
  error?: string;
  message?: string;
}

export interface WithdrawResult {
  success: boolean;
  withdrawn?: number;
  wallet?: number;
  bank?: number;
  error?: string;
  message?: string;
}

export interface TransferResult {
  success: boolean;
  amount?: number;
  senderWallet?: number;
  recipientWallet?: number;
  error?: string;
  message?: string;
}

export interface WorkResult {
  onCooldown: boolean;
  remainingMs: number;
  earned: number;
  balance: number;
  narrative: string;
}

export interface CrimeResult {
  onCooldown: boolean;
  remainingMs: number;
  success: boolean;
  amount: number;
  balance: number;
  narrative: string;
}

export interface EconomyLeaderboardEntry {
  rank: number;
  userId: string;
  wallet: number;
  bank: number;
  netWorth: number;
  dailyStreak: number;
}

export interface EconomyLeaderboardResult {
  entries: EconomyLeaderboardEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BuyShopItemResult {
  success: boolean;
  item?: IEconomyShopItem;
  userWallet?: number;
  roleGranted?: boolean;
  error?: string;
  message?: string;
}

// ─── Test Mode In-Memory Store ────────────────────────────────────────────

let testModeActive = false;
let customRng: (() => number) | null = null;

interface InMemoryEconomyUser {
  guildId: string;
  userId: string;
  wallet: number;
  bank: number;
  bankCapacity: number;
  dailyStreak: number;
  lastDailyAt?: Date;
  lastWorkAt?: Date;
  lastCrimeAt?: Date;
  inventory: IEconomyInventoryItem[];
}

interface InMemoryShopItem {
  guildId: string;
  itemId: string;
  name: string;
  description: string;
  price: number;
  type: ShopItemType;
  roleId?: string;
  stock?: number;
}

const testEconomyUsers = new Map<string, InMemoryEconomyUser>();
const testShopItems = new Map<string, InMemoryShopItem>();

export function enableTestMode(enabled: boolean = true): void {
  testModeActive = enabled;
  if (!enabled) {
    clearTestStore();
  }
}

export function clearTestStore(): void {
  testEconomyUsers.clear();
  testShopItems.clear();
  customRng = null;
}

export function setCustomRng(rng: (() => number) | null): void {
  customRng = rng;
}

function userKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

function shopItemKey(guildId: string, itemId: string): string {
  return `${guildId}:${itemId.toLowerCase().trim()}`;
}

// ─── Multiplier Helper ────────────────────────────────────────────────────

/**
 * Computes daily streak multiplier up to 3.0x at 10+ streak.
 */
export function getDailyStreakMultiplier(streak: number): number {
  if (streak >= 10) return 3.0;
  if (streak >= 7) return 2.0;
  if (streak >= 4) return 1.5;
  if (streak >= 2) return 1.2;
  return 1.0;
}

// ─── Profile Retrieval & Initialization ───────────────────────────────────

/**
 * Fetches or initializes a user's economy record.
 */
export async function getEconomyUser(
  guildId: string,
  userId: string,
): Promise<IEconomyUser> {
  if (testModeActive) {
    const key = userKey(guildId, userId);
    let user = testEconomyUsers.get(key);
    if (!user) {
      user = {
        guildId,
        userId,
        wallet: 0,
        bank: 0,
        bankCapacity: DEFAULT_BANK_CAPACITY,
        dailyStreak: 0,
        inventory: [],
      };
      testEconomyUsers.set(key, user);
    }
    return JSON.parse(JSON.stringify(user)) as IEconomyUser;
  }

  await connectDB();
  let user = await EconomyUser.findOne({ guildId, userId });
  if (!user) {
    user = await EconomyUser.create({
      guildId,
      userId,
      wallet: 0,
      bank: 0,
      bankCapacity: DEFAULT_BANK_CAPACITY,
      dailyStreak: 0,
      inventory: [],
    });
  }
  return user;
}

async function saveEconomyUser(
  guildId: string,
  userId: string,
  updates: Partial<InMemoryEconomyUser>,
): Promise<IEconomyUser> {
  if (testModeActive) {
    const key = userKey(guildId, userId);
    const existing = testEconomyUsers.get(key) ?? {
      guildId,
      userId,
      wallet: 0,
      bank: 0,
      bankCapacity: DEFAULT_BANK_CAPACITY,
      dailyStreak: 0,
      inventory: [],
    };
    const updated = { ...existing, ...updates };
    testEconomyUsers.set(key, updated);
    return JSON.parse(JSON.stringify(updated)) as IEconomyUser;
  }

  await connectDB();
  const updated = await EconomyUser.findOneAndUpdate(
    { guildId, userId },
    { $set: updates },
    { upsert: true, new: true },
  );
  return updated;
}

// ─── Daily Streak Claim ───────────────────────────────────────────────────

/**
 * Claims daily coins with streak tracking and multiplier bonuses.
 * Cooldown: 24 hours.
 * Reset: If > 48 hours, resets streak to 1.
 */
export async function claimDaily(
  guildId: string,
  userId: string,
  now: Date = new Date(),
): Promise<ClaimDailyResult> {
  const user = await getEconomyUser(guildId, userId);

  if (user.lastDailyAt) {
    const elapsedMs = now.getTime() - new Date(user.lastDailyAt).getTime();
    if (elapsedMs < DAILY_COOLDOWN_MS) {
      return {
        alreadyClaimed: true,
        nextClaimInMs: DAILY_COOLDOWN_MS - elapsedMs,
        reward: 0,
        streak: user.dailyStreak,
        newBalance: user.wallet,
      };
    }
  }

  let newStreak = 1;
  if (user.lastDailyAt) {
    const elapsedMs = now.getTime() - new Date(user.lastDailyAt).getTime();
    if (elapsedMs <= DAILY_STREAK_RESET_MS) {
      newStreak = (user.dailyStreak || 0) + 1;
    } else {
      newStreak = 1;
    }
  }

  const baseReward = BASE_DAILY_REWARD + newStreak * DAILY_STREAK_BONUS;
  const multiplier = getDailyStreakMultiplier(newStreak);
  const totalReward = Math.round(baseReward * multiplier);
  const newWallet = (user.wallet || 0) + totalReward;

  await saveEconomyUser(guildId, userId, {
    wallet: newWallet,
    dailyStreak: newStreak,
    lastDailyAt: now,
  });

  return {
    alreadyClaimed: false,
    nextClaimInMs: DAILY_COOLDOWN_MS,
    reward: totalReward,
    streak: newStreak,
    newBalance: newWallet,
  };
}

// ─── Deposit & Withdraw ───────────────────────────────────────────────────

/**
 * Deposits coins from wallet to bank up to bank capacity.
 */
export async function deposit(
  guildId: string,
  userId: string,
  amount: number | 'all',
): Promise<DepositResult> {
  const user = await getEconomyUser(guildId, userId);
  const spaceAvailable = Math.max(0, user.bankCapacity - user.bank);

  if (spaceAvailable <= 0) {
    return {
      success: false,
      error: 'BANK_FULL',
      message: 'Your bank is already at maximum capacity.',
      wallet: user.wallet,
      bank: user.bank,
      bankCapacity: user.bankCapacity,
    };
  }

  let toDeposit: number;

  if (amount === 'all') {
    if (user.wallet <= 0) {
      return {
        success: false,
        error: 'NO_FUNDS',
        message: "You don't have any coins in your wallet to deposit.",
        wallet: user.wallet,
        bank: user.bank,
      };
    }
    toDeposit = Math.min(user.wallet, spaceAvailable);
  } else {
    toDeposit = Math.floor(amount);
    if (isNaN(toDeposit) || toDeposit <= 0) {
      return {
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Deposit amount must be a positive integer.',
      };
    }
    if (toDeposit > user.wallet) {
      return {
        success: false,
        error: 'INSUFFICIENT_FUNDS',
        message: `You do not have enough coins in your wallet. You have ${user.wallet} coins.`,
        wallet: user.wallet,
      };
    }
    if (toDeposit > spaceAvailable) {
      return {
        success: false,
        error: 'BANK_CAPACITY_EXCEEDED',
        message: `Deposit would exceed your bank capacity. Space available: ${spaceAvailable} coins.`,
        wallet: user.wallet,
        bank: user.bank,
        bankCapacity: user.bankCapacity,
      };
    }
  }

  const updatedWallet = user.wallet - toDeposit;
  const updatedBank = user.bank + toDeposit;

  await saveEconomyUser(guildId, userId, {
    wallet: updatedWallet,
    bank: updatedBank,
  });

  return {
    success: true,
    deposited: toDeposit,
    wallet: updatedWallet,
    bank: updatedBank,
    bankCapacity: user.bankCapacity,
  };
}

/**
 * Withdraws coins from bank to wallet.
 */
export async function withdraw(
  guildId: string,
  userId: string,
  amount: number | 'all',
): Promise<WithdrawResult> {
  const user = await getEconomyUser(guildId, userId);

  if (user.bank <= 0) {
    return {
      success: false,
      error: 'NO_BANK_FUNDS',
      message: "You don't have any coins in your bank to withdraw.",
      wallet: user.wallet,
      bank: user.bank,
    };
  }

  let toWithdraw: number;

  if (amount === 'all') {
    toWithdraw = user.bank;
  } else {
    toWithdraw = Math.floor(amount);
    if (isNaN(toWithdraw) || toWithdraw <= 0) {
      return {
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Withdrawal amount must be a positive integer.',
      };
    }
    if (toWithdraw > user.bank) {
      return {
        success: false,
        error: 'INSUFFICIENT_FUNDS',
        message: `You do not have enough coins in your bank. Bank balance: ${user.bank} coins.`,
        bank: user.bank,
      };
    }
  }

  const updatedWallet = user.wallet + toWithdraw;
  const updatedBank = user.bank - toWithdraw;

  await saveEconomyUser(guildId, userId, {
    wallet: updatedWallet,
    bank: updatedBank,
  });

  return {
    success: true,
    withdrawn: toWithdraw,
    wallet: updatedWallet,
    bank: updatedBank,
  };
}

// ─── Coin Transfer ────────────────────────────────────────────────────────

/**
 * Transfers coins from sender wallet to recipient wallet.
 */
export async function transfer(
  guildId: string,
  senderId: string,
  recipientId: string,
  amount: number,
): Promise<TransferResult> {
  const sendAmount = Math.floor(amount);

  if (isNaN(sendAmount) || sendAmount <= 0) {
    return {
      success: false,
      error: 'INVALID_AMOUNT',
      message: 'Transfer amount must be a positive integer.',
    };
  }

  if (senderId === recipientId) {
    return {
      success: false,
      error: 'SELF_TRANSFER',
      message: 'You cannot send coins to yourself.',
    };
  }

  const sender = await getEconomyUser(guildId, senderId);
  if (sender.wallet < sendAmount) {
    return {
      success: false,
      error: 'INSUFFICIENT_FUNDS',
      message: `You do not have enough coins in your wallet. Wallet balance: ${sender.wallet} coins.`,
      senderWallet: sender.wallet,
    };
  }

  const recipient = await getEconomyUser(guildId, recipientId);

  const updatedSenderWallet = sender.wallet - sendAmount;
  const updatedRecipientWallet = recipient.wallet + sendAmount;

  await saveEconomyUser(guildId, senderId, { wallet: updatedSenderWallet });
  await saveEconomyUser(guildId, recipientId, { wallet: updatedRecipientWallet });

  return {
    success: true,
    amount: sendAmount,
    senderWallet: updatedSenderWallet,
    recipientWallet: updatedRecipientWallet,
  };
}

// ─── Work Command ─────────────────────────────────────────────────────────

/**
 * Work shift to earn coins. 1-hour cooldown.
 * Reward: 50-150 coins.
 */
export async function work(
  guildId: string,
  userId: string,
  now: Date = new Date(),
): Promise<WorkResult> {
  const user = await getEconomyUser(guildId, userId);

  if (user.lastWorkAt) {
    const elapsedMs = now.getTime() - new Date(user.lastWorkAt).getTime();
    if (elapsedMs < WORK_COOLDOWN_MS) {
      return {
        onCooldown: true,
        remainingMs: WORK_COOLDOWN_MS - elapsedMs,
        earned: 0,
        balance: user.wallet,
        narrative: '',
      };
    }
  }

  const rngVal = customRng ? customRng() : Math.random();
  const earned = Math.floor(rngVal * (150 - 50 + 1)) + 50;

  const narrativeIndex = Math.floor(
    (customRng ? customRng() : Math.random()) * WORK_NARRATIVES.length,
  );
  const narrative = `${WORK_NARRATIVES[narrativeIndex % WORK_NARRATIVES.length]} **${earned} coins**!`;

  const newWallet = user.wallet + earned;
  await saveEconomyUser(guildId, userId, {
    wallet: newWallet,
    lastWorkAt: now,
  });

  return {
    onCooldown: false,
    remainingMs: WORK_COOLDOWN_MS,
    earned,
    balance: newWallet,
    narrative,
  };
}

// ─── Crime Command ────────────────────────────────────────────────────────

/**
 * High-risk crime command. 2-hour cooldown.
 * 55% success: win 150-350 coins.
 * 45% fail: fined 100-200 coins from wallet (cannot drop below 0).
 */
export async function crime(
  guildId: string,
  userId: string,
  now: Date = new Date(),
): Promise<CrimeResult> {
  const user = await getEconomyUser(guildId, userId);

  if (user.lastCrimeAt) {
    const elapsedMs = now.getTime() - new Date(user.lastCrimeAt).getTime();
    if (elapsedMs < CRIME_COOLDOWN_MS) {
      return {
        onCooldown: true,
        remainingMs: CRIME_COOLDOWN_MS - elapsedMs,
        success: false,
        amount: 0,
        balance: user.wallet,
        narrative: '',
      };
    }
  }

  const roll = customRng ? customRng() : Math.random();
  const isSuccess = roll < 0.55;

  if (isSuccess) {
    const winRng = customRng ? customRng() : Math.random();
    const won = Math.floor(winRng * (350 - 150 + 1)) + 150;
    const narrativeIdx = Math.floor(
      (customRng ? customRng() : Math.random()) * CRIME_SUCCESS_NARRATIVES.length,
    );
    const narrative = `${CRIME_SUCCESS_NARRATIVES[narrativeIdx % CRIME_SUCCESS_NARRATIVES.length]} **${won} coins**!`;

    const newWallet = user.wallet + won;
    await saveEconomyUser(guildId, userId, {
      wallet: newWallet,
      lastCrimeAt: now,
    });

    return {
      onCooldown: false,
      remainingMs: CRIME_COOLDOWN_MS,
      success: true,
      amount: won,
      balance: newWallet,
      narrative,
    };
  } else {
    const failRng = customRng ? customRng() : Math.random();
    const rawFine = Math.floor(failRng * (200 - 100 + 1)) + 100;
    const actualFine = Math.min(user.wallet, rawFine);

    const narrativeIdx = Math.floor(
      (customRng ? customRng() : Math.random()) * CRIME_FAIL_NARRATIVES.length,
    );
    const narrative = `${CRIME_FAIL_NARRATIVES[narrativeIdx % CRIME_FAIL_NARRATIVES.length]} **${actualFine} coins**!`;

    const newWallet = user.wallet - actualFine;
    await saveEconomyUser(guildId, userId, {
      wallet: newWallet,
      lastCrimeAt: now,
    });

    return {
      onCooldown: false,
      remainingMs: CRIME_COOLDOWN_MS,
      success: false,
      amount: actualFine,
      balance: newWallet,
      narrative,
    };
  }
}

// ─── Wealth Leaderboard ───────────────────────────────────────────────────

/**
 * Returns top members sorted by total net worth (wallet + bank) descending.
 */
export async function getEconomyLeaderboard(
  guildId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<EconomyLeaderboardResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);

  if (testModeActive) {
    const members: Array<{
      userId: string;
      wallet: number;
      bank: number;
      netWorth: number;
      dailyStreak: number;
    }> = [];

    for (const record of testEconomyUsers.values()) {
      if (record.guildId === guildId) {
        members.push({
          userId: record.userId,
          wallet: record.wallet,
          bank: record.bank,
          netWorth: record.wallet + record.bank,
          dailyStreak: record.dailyStreak,
        });
      }
    }

    // Sort by net worth descending, then wallet descending
    members.sort((a, b) => b.netWorth - a.netWorth || b.wallet - a.wallet);

    const total = members.length;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const offset = (safePage - 1) * safePageSize;
    const paginated = members.slice(offset, offset + safePageSize);

    const entries: EconomyLeaderboardEntry[] = paginated.map((m, idx) => ({
      rank: offset + idx + 1,
      userId: m.userId,
      wallet: m.wallet,
      bank: m.bank,
      netWorth: m.netWorth,
      dailyStreak: m.dailyStreak,
    }));

    return {
      entries,
      total,
      page: safePage,
      totalPages,
    };
  }

  await connectDB();

  // Aggregate with computed netWorth field
  const pipeline = [
    { $match: { guildId } },
    {
      $project: {
        userId: 1,
        wallet: 1,
        bank: 1,
        dailyStreak: 1,
        netWorth: { $add: ['$wallet', '$bank'] },
      },
    },
    { $sort: { netWorth: -1 as const, wallet: -1 as const } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        data: [{ $skip: (safePage - 1) * safePageSize }, { $limit: safePageSize }],
      },
    },
  ];

  const result = await EconomyUser.aggregate(pipeline);
  const total = result[0]?.total[0]?.count ?? 0;
  const rawEntries = result[0]?.data ?? [];
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  const entries: EconomyLeaderboardEntry[] = rawEntries.map(
    (
      doc: { userId: string; wallet: number; bank: number; netWorth: number; dailyStreak: number },
      idx: number,
    ) => ({
      rank: (safePage - 1) * safePageSize + idx + 1,
      userId: doc.userId,
      wallet: doc.wallet,
      bank: doc.bank,
      netWorth: doc.netWorth,
      dailyStreak: doc.dailyStreak || 0,
    }),
  );

  return {
    entries,
    total,
    page: safePage,
    totalPages,
  };
}

// ─── Shop Item Management ─────────────────────────────────────────────────

/**
 * Lists all active shop items for a guild, sorted by price ascending.
 */
export async function listShopItems(guildId: string): Promise<IEconomyShopItem[]> {
  if (testModeActive) {
    const items: InMemoryShopItem[] = [];
    for (const item of testShopItems.values()) {
      if (item.guildId === guildId) {
        items.push(item);
      }
    }
    items.sort((a, b) => a.price - b.price);
    return JSON.parse(JSON.stringify(items)) as IEconomyShopItem[];
  }

  await connectDB();
  return EconomyShopItem.find({ guildId }).sort({ price: 1 }).lean();
}

/**
 * Adds or updates an item in the server shop.
 */
export async function addShopItem(
  guildId: string,
  item: {
    itemId: string;
    name: string;
    description?: string;
    price: number;
    type?: ShopItemType;
    roleId?: string;
    stock?: number;
  },
): Promise<IEconomyShopItem> {
  const normalizedId = item.itemId.toLowerCase().trim();
  const price = Math.max(1, Math.floor(item.price));
  const type = item.type ?? 'custom';
  const stock = item.stock !== undefined ? item.stock : -1;
  const description = item.description ?? '';

  if (testModeActive) {
    const key = shopItemKey(guildId, normalizedId);
    const shopItem: InMemoryShopItem = {
      guildId,
      itemId: normalizedId,
      name: item.name,
      description,
      price,
      type,
      roleId: item.roleId,
      stock,
    };
    testShopItems.set(key, shopItem);
    return JSON.parse(JSON.stringify(shopItem)) as IEconomyShopItem;
  }

  await connectDB();
  const updated = await EconomyShopItem.findOneAndUpdate(
    { guildId, itemId: normalizedId },
    {
      $set: {
        name: item.name,
        description,
        price,
        type,
        roleId: item.roleId,
        stock,
      },
    },
    { upsert: true, new: true },
  );

  return updated;
}

/**
 * Removes an item from the server shop.
 */
export async function removeShopItem(
  guildId: string,
  itemId: string,
): Promise<boolean> {
  const normalizedId = itemId.toLowerCase().trim();

  if (testModeActive) {
    const key = shopItemKey(guildId, normalizedId);
    return testShopItems.delete(key);
  }

  await connectDB();
  const result = await EconomyShopItem.deleteOne({ guildId, itemId: normalizedId });
  return (result.deletedCount ?? 0) > 0;
}

/**
 * Purchases an item from the server shop with wallet balance validation,
 * inventory grant, and optional Discord role assignment.
 */
export async function buyShopItem(
  guildId: string,
  userId: string,
  itemId: string,
  discordGrantRole?: (guildId: string, userId: string, roleId: string) => Promise<void>,
): Promise<BuyShopItemResult> {
  const normalizedId = itemId.toLowerCase().trim();

  let targetItem: InMemoryShopItem | IEconomyShopItem | null = null;

  if (testModeActive) {
    const itemKey = shopItemKey(guildId, normalizedId);
    targetItem = testShopItems.get(itemKey) ?? null;
  } else {
    await connectDB();
    targetItem = await EconomyShopItem.findOne({ guildId, itemId: normalizedId });
  }

  if (!targetItem) {
    return {
      success: false,
      error: 'ITEM_NOT_FOUND',
      message: `Shop item "${itemId}" does not exist in this server.`,
    };
  }

  // Stock check: -1 is infinite
  if (targetItem.stock !== undefined && targetItem.stock !== -1 && targetItem.stock <= 0) {
    return {
      success: false,
      error: 'OUT_OF_STOCK',
      message: `"${targetItem.name}" is currently out of stock.`,
    };
  }

  const user = await getEconomyUser(guildId, userId);

  if (user.wallet < targetItem.price) {
    return {
      success: false,
      error: 'INSUFFICIENT_FUNDS',
      message: `You need ${targetItem.price} coins to buy "${targetItem.name}", but your wallet has ${user.wallet} coins.`,
      userWallet: user.wallet,
    };
  }

  // Deduct coins from wallet
  const newWallet = user.wallet - targetItem.price;

  // Append to inventory
  const inventoryItem: IEconomyInventoryItem = {
    itemId: targetItem.itemId,
    name: targetItem.name,
    roleId: targetItem.roleId,
    price: targetItem.price,
    purchasedAt: new Date(),
  };

  const updatedInventory = [...(user.inventory || []), inventoryItem];

  // Decrement stock if finite
  let newStock = targetItem.stock;
  if (targetItem.stock !== undefined && targetItem.stock > 0) {
    newStock = targetItem.stock - 1;
  }

  if (testModeActive) {
    const userKeyStr = userKey(guildId, userId);
    const existingUser = testEconomyUsers.get(userKeyStr)!;
    existingUser.wallet = newWallet;
    existingUser.inventory = updatedInventory;

    if (targetItem.stock !== undefined && targetItem.stock > 0) {
      const itemKey = shopItemKey(guildId, normalizedId);
      const existingItem = testShopItems.get(itemKey)!;
      existingItem.stock = newStock;
    }
  } else {
    await EconomyUser.updateOne(
      { guildId, userId },
      { $set: { wallet: newWallet, inventory: updatedInventory } },
    );

    if (targetItem.stock !== undefined && targetItem.stock > 0) {
      await EconomyShopItem.updateOne(
        { guildId, itemId: normalizedId },
        { $set: { stock: newStock } },
      );
    }
  }

  // Role grant if item is a role
  let roleGranted = false;
  if (targetItem.type === 'role' && targetItem.roleId) {
    if (discordGrantRole) {
      try {
        await discordGrantRole(guildId, userId, targetItem.roleId);
        roleGranted = true;
      } catch (err) {
        console.warn(`[EconomyService] Failed to grant role ${targetItem.roleId} to user ${userId}:`, err);
      }
    }
  }

  return {
    success: true,
    item: targetItem as IEconomyShopItem,
    userWallet: newWallet,
    roleGranted,
  };
}
