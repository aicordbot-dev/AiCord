/**
 * src/lib/confessions/confession-service.ts
 * Anonymous Confessions & Mutual Matchmaker Hub Service Engine for AiCord.
 *
 * Responsibilities:
 * - Content length validation (10 to 1,000 characters)
 * - Built-in profanity and toxicity word filtering
 * - Per-guild incremental confession numbering (#1, #2, #3...)
 * - Reaction voting management (wholesome, funny, redFlag toggle logic)
 * - Secret mutual crush matchmaking (records secret crushes, detects reciprocal matches)
 * - Top confessions leaderboard ranking by total community votes
 * - Discord embed and interactive button component builders
 * - Zero-database in-memory test store for complete unit test isolation
 */

import {
  ComponentType,
  ButtonStyle,
  type APIActionRowComponent,
  type APIButtonComponent,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import {
  Confession,
  ConfessionConfig,
  CrushMatch,
  type IConfession,
  type IConfessionConfig,
  type ICrushMatch,
  type IConfessionVotes,
  type ConfessionStatus,
} from '@/models';
import type { DiscordEmbed } from '@/lib/discord/embeds';

export type {
  IConfession,
  IConfessionConfig,
  ICrushMatch,
  IConfessionVotes,
  ConfessionStatus,
};

export type ConfessionVoteType = 'wholesome' | 'funny' | 'redFlag';

export const VOTE_LABELS: Record<ConfessionVoteType, { label: string; emoji: string }> = {
  wholesome: { label: 'Wholesome', emoji: '❤️' },
  funny: { label: 'Funny', emoji: '😂' },
  redFlag: { label: 'Red Flag', emoji: '🚩' },
};

// ─── Built-in Profanity / Toxicity Wordlist ────────────────────────────────────

export const PROFANITY_WORDLIST: string[] = [
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'bastard',
  'dick',
  'dickhead',
  'pussy',
  'cunt',
  'whore',
  'slut',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'kill yourself',
  'kys',
  'suicide',
];

/**
 * Checks whether the given text contains profane or toxic terms.
 * Uses character normalization to catch simple leetspeak substitutions.
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;

  const rawLower = text.toLowerCase();

  // Normalize characters often used to evade keyword filters
  const normalized = rawLower
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[@4]/g, 'a')
    .replace(/[\$5]/g, 's')
    .replace(/[7]/g, 't');

  for (const word of PROFANITY_WORDLIST) {
    // 1. Direct word boundary check on raw and normalized
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\b|\\s)${escaped}(\\b|\\s|$)`, 'i');
    if (regex.test(rawLower) || regex.test(normalized)) {
      return true;
    }

    // 2. Check spaced-out characters, e.g. "f u c k"
    const spacedPattern = word
      .split('')
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[\\s\\W_]*');
    const spacedRegex = new RegExp(`(^|\\b|\\s)${spacedPattern}(\\b|\\s|$)`, 'i');
    if (spacedRegex.test(rawLower) || spacedRegex.test(normalized)) {
      return true;
    }
  }

  return false;
}

// ─── In-Memory Test Store ─────────────────────────────────────────────────────

let testMode = false;
const testConfessions = new Map<string, IConfession>();
const testConfigs = new Map<string, IConfessionConfig>();
const testCrushes = new Map<string, ICrushMatch>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function isTestMode(): boolean {
  return testMode;
}

export function clearTestStore(): void {
  testConfessions.clear();
  testConfigs.clear();
  testCrushes.clear();
}

export function setTestConfig(
  config: Partial<IConfessionConfig> & { guildId: string },
): void {
  const existing = testConfigs.get(config.guildId);
  const merged = Object.assign(
    {
      guildId: config.guildId,
      channelId: '',
      filterProfanity: true,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    existing,
    config,
  );
  testConfigs.set(config.guildId, merged as unknown as IConfessionConfig);
}

export function getTestConfig(guildId: string): IConfessionConfig | undefined {
  return testConfigs.get(guildId);
}

export function setTestConfession(
  confession: Partial<IConfession> & { guildId: string; confessionId: number },
): void {
  const key = `${confession.guildId}:${confession.confessionId}`;
  const existing = testConfessions.get(key);
  const merged = Object.assign(
    {
      content: '',
      status: 'approved' as ConfessionStatus,
      votes: {
        wholesome: [],
        funny: [],
        redFlag: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    existing,
    confession,
  );
  testConfessions.set(key, merged as unknown as IConfession);
}

export function getTestConfession(
  guildId: string,
  confessionId: number,
): IConfession | undefined {
  return testConfessions.get(`${guildId}:${confessionId}`);
}

export function setTestCrush(
  crush: Partial<ICrushMatch> & {
    guildId: string;
    userId: string;
    crushUserId: string;
  },
): void {
  const key = `${crush.guildId}:${crush.userId}:${crush.crushUserId}`;
  const existing = testCrushes.get(key);
  const merged = Object.assign(
    {
      matched: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    existing,
    crush,
  );
  testCrushes.set(key, merged as unknown as ICrushMatch);
}

export function getTestCrush(
  guildId: string,
  userId: string,
  crushUserId: string,
): ICrushMatch | undefined {
  return testCrushes.get(`${guildId}:${userId}:${crushUserId}`);
}

// ─── Config Management ────────────────────────────────────────────────────────

export async function getConfessionConfig(
  guildId: string,
): Promise<IConfessionConfig> {
  if (testMode) {
    const found = testConfigs.get(guildId);
    if (found) return found;
    const defaultConfig = {
      guildId,
      channelId: '',
      filterProfanity: true,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IConfessionConfig;
    testConfigs.set(guildId, defaultConfig);
    return defaultConfig;
  }

  await connectDB();
  let config = await ConfessionConfig.findOne({ guildId });
  if (!config) {
    config = await ConfessionConfig.create({
      guildId,
      channelId: '',
      filterProfanity: true,
      enabled: true,
    });
  }
  return config;
}

export async function setConfessionConfig(
  guildId: string,
  updates: Partial<{
    channelId: string;
    filterProfanity: boolean;
    enabled: boolean;
  }>,
): Promise<IConfessionConfig> {
  if (testMode) {
    const current = await getConfessionConfig(guildId);
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date(),
    } as IConfessionConfig;
    testConfigs.set(guildId, updated);
    return updated;
  }

  await connectDB();
  const config = await ConfessionConfig.findOneAndUpdate(
    { guildId },
    { $set: updates },
    { new: true, upsert: true },
  );
  return config!;
}

// ─── Confession Submission Engine ─────────────────────────────────────────────

export async function submitConfession(
  guildId: string,
  content: string,
  replyToId?: number,
): Promise<IConfession> {
  const trimmed = (content || '').trim();

  // Content length validation
  if (trimmed.length < 10) {
    throw new Error('Confession must be at least 10 characters long.');
  }
  if (trimmed.length > 1000) {
    throw new Error('Confession cannot exceed 1000 characters.');
  }

  // Config checks
  const config = await getConfessionConfig(guildId);
  if (!config.enabled) {
    throw new Error('Anonymous confessions are currently disabled in this server.');
  }

  if (config.filterProfanity && containsProfanity(trimmed)) {
    throw new Error('Confession contains prohibited or profane language.');
  }

  if (testMode) {
    // Find highest confessionId for this guild in test store
    let maxId = 0;
    for (const [key, conf] of testConfessions.entries()) {
      if (conf.guildId === guildId && conf.confessionId > maxId) {
        maxId = conf.confessionId;
      }
    }
    const nextId = maxId + 1;

    const newConfession = {
      guildId,
      confessionId: nextId,
      content: trimmed,
      replyToId: replyToId ? Number(replyToId) : undefined,
      votes: {
        wholesome: [],
        funny: [],
        redFlag: [],
      },
      status: 'approved' as ConfessionStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IConfession;

    testConfessions.set(`${guildId}:${nextId}`, newConfession);
    return newConfession;
  }

  await connectDB();

  // Retrieve next incremental ID per guild
  const lastConfession = await Confession.findOne({ guildId })
    .sort({ confessionId: -1 })
    .select('confessionId')
    .exec();

  const nextId = (lastConfession?.confessionId ?? 0) + 1;

  const created = await Confession.create({
    guildId,
    confessionId: nextId,
    content: trimmed,
    replyToId: replyToId ? Number(replyToId) : undefined,
    votes: {
      wholesome: [],
      funny: [],
      redFlag: [],
    },
    status: 'approved',
  });

  return created;
}

// ─── Voting Mechanics ─────────────────────────────────────────────────────────

export interface VoteResult extends IConfession {
  toggledOn: boolean;
  voteType: ConfessionVoteType;
}

export async function voteConfession(
  guildId: string,
  confessionId: number,
  userId: string,
  voteType: ConfessionVoteType,
): Promise<VoteResult> {
  if (!['wholesome', 'funny', 'redFlag'].includes(voteType)) {
    throw new Error(`Invalid vote type: ${voteType}`);
  }

  if (testMode) {
    const key = `${guildId}:${confessionId}`;
    const confession = testConfessions.get(key);
    if (!confession) {
      throw new Error(`Confession #${confessionId} not found.`);
    }

    if (!confession.votes) {
      confession.votes = { wholesome: [], funny: [], redFlag: [] };
    }
    if (!confession.votes[voteType]) {
      confession.votes[voteType] = [];
    }

    const currentList = confession.votes[voteType];
    const userIndex = currentList.indexOf(userId);
    let toggledOn = false;

    if (userIndex >= 0) {
      currentList.splice(userIndex, 1);
      toggledOn = false;
    } else {
      currentList.push(userId);
      toggledOn = true;
    }

    confession.updatedAt = new Date();
    testConfessions.set(key, confession);

    const result = confession as VoteResult;
    result.toggledOn = toggledOn;
    result.voteType = voteType;
    return result;
  }

  await connectDB();
  const confession = await Confession.findOne({ guildId, confessionId });
  if (!confession) {
    throw new Error(`Confession #${confessionId} not found.`);
  }

  if (!confession.votes) {
    confession.votes = { wholesome: [], funny: [], redFlag: [] };
  }
  if (!confession.votes[voteType]) {
    confession.votes[voteType] = [];
  }

  const currentList = confession.votes[voteType];
  const userIndex = currentList.indexOf(userId);
  let toggledOn = false;

  if (userIndex >= 0) {
    currentList.splice(userIndex, 1);
    toggledOn = false;
  } else {
    currentList.push(userId);
    toggledOn = true;
  }

  confession.markModified('votes');
  await confession.save();

  const result = confession as unknown as VoteResult;
  result.toggledOn = toggledOn;
  result.voteType = voteType;
  return result;
}

// ─── Secret Crush Matchmaker ──────────────────────────────────────────────────

export interface CrushResult {
  isMatch: boolean;
  user1: string;
  user2: string;
}

export async function registerCrush(
  guildId: string,
  userId: string,
  crushUserId: string,
): Promise<CrushResult> {
  if (userId === crushUserId) {
    throw new Error('You cannot set a crush on yourself!');
  }

  if (testMode) {
    const key = `${guildId}:${userId}:${crushUserId}`;
    let crush = testCrushes.get(key);
    if (!crush) {
      crush = {
        guildId,
        userId,
        crushUserId,
        matched: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ICrushMatch;
      testCrushes.set(key, crush);
    }

    // Check reciprocal crush
    const reciprocalKey = `${guildId}:${crushUserId}:${userId}`;
    const reciprocal = testCrushes.get(reciprocalKey);

    if (reciprocal) {
      crush.matched = true;
      reciprocal.matched = true;
      testCrushes.set(key, crush);
      testCrushes.set(reciprocalKey, reciprocal);
      return { isMatch: true, user1: userId, user2: crushUserId };
    }

    return { isMatch: false, user1: userId, user2: crushUserId };
  }

  await connectDB();

  let crush = await CrushMatch.findOne({ guildId, userId, crushUserId });
  if (!crush) {
    crush = await CrushMatch.create({
      guildId,
      userId,
      crushUserId,
      matched: false,
    });
  }

  // Check reciprocal crush
  const reciprocal = await CrushMatch.findOne({
    guildId,
    userId: crushUserId,
    crushUserId: userId,
  });

  if (reciprocal) {
    crush.matched = true;
    reciprocal.matched = true;
    await Promise.all([crush.save(), reciprocal.save()]);
    return { isMatch: true, user1: userId, user2: crushUserId };
  }

  return { isMatch: false, user1: userId, user2: crushUserId };
}

// ─── Top Confessions Aggregator ───────────────────────────────────────────────

export async function getTopConfessions(
  guildId: string,
  limit: number = 10,
): Promise<IConfession[]> {
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 10));

  if (testMode) {
    const list: IConfession[] = [];
    for (const conf of testConfessions.values()) {
      if (conf.guildId === guildId && conf.status === 'approved') {
        list.push(conf);
      }
    }

    return list
      .sort((a, b) => {
        const aTotal =
          (a.votes?.wholesome?.length || 0) +
          (a.votes?.funny?.length || 0) +
          (a.votes?.redFlag?.length || 0);
        const bTotal =
          (b.votes?.wholesome?.length || 0) +
          (b.votes?.funny?.length || 0) +
          (b.votes?.redFlag?.length || 0);
        if (bTotal !== aTotal) return bTotal - aTotal;
        return b.confessionId - a.confessionId;
      })
      .slice(0, safeLimit);
  }

  await connectDB();
  const rawList = await Confession.find({ guildId, status: 'approved' })
    .lean()
    .exec();

  return (rawList as unknown as IConfession[])
    .sort((a, b) => {
      const aTotal =
        (a.votes?.wholesome?.length || 0) +
        (a.votes?.funny?.length || 0) +
        (a.votes?.redFlag?.length || 0);
      const bTotal =
        (b.votes?.wholesome?.length || 0) +
        (b.votes?.funny?.length || 0) +
        (b.votes?.redFlag?.length || 0);
      if (bTotal !== aTotal) return bTotal - aTotal;
      return b.confessionId - a.confessionId;
    })
    .slice(0, safeLimit);
}

// ─── Embed & Component Builders ───────────────────────────────────────────────

export function buildConfessionEmbed(confession: IConfession): DiscordEmbed {
  const wholesome = confession.votes?.wholesome?.length || 0;
  const funny = confession.votes?.funny?.length || 0;
  const redFlag = confession.votes?.redFlag?.length || 0;

  const description = confession.replyToId
    ? `*In reply to Confession #${confession.replyToId}*\n\n"${confession.content}"`
    : `"${confession.content}"`;

  return {
    title: `💌 Anonymous Confession #${confession.confessionId}`,
    description,
    color: 0xff75a0, // Lovely Rose Pink
    footer: {
      text: `❤️ ${wholesome} | 😂 ${funny} | 🚩 ${redFlag}`,
    },
    timestamp: confession.createdAt
      ? new Date(confession.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

export function buildConfessionComponents(
  confession: IConfession,
): Array<APIActionRowComponent<APIButtonComponent>> {
  const wholesome = confession.votes?.wholesome?.length || 0;
  const funny = confession.votes?.funny?.length || 0;
  const redFlag = confession.votes?.redFlag?.length || 0;

  return [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          custom_id: `confess_vote:${confession.confessionId}:wholesome`,
          label: `❤️ Wholesome (${wholesome})`,
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          custom_id: `confess_vote:${confession.confessionId}:funny`,
          label: `😂 Funny (${funny})`,
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          custom_id: `confess_vote:${confession.confessionId}:redFlag`,
          label: `🚩 Red Flag (${redFlag})`,
        },
      ],
    },
  ];
}
