/**
 * src/lib/starboard/starboard-service.ts
 * Starboard Community Hall of Fame Engine for AiCord.
 *
 * Capabilities:
 * - In-memory test store (enableTestMode, clearTestStore, isTestMode) for fast zero-network unit tests
 * - Server starboard configuration (getStarboardConfig, setStarboardConfig, toggleIgnoredChannel)
 * - Progressive Star Tier Badges (⭐ 3-9, 🌟 10-24, 💫 25-49, ✨ 50+)
 * - Star Reaction lifecycle: addStarReaction, removeStarReaction, idempotency & threshold checks
 * - Self-star gating & ignored channel filtering
 * - Discord Starboard Embed Builder with jump link, attachments, author styling, and badge footer
 * - Analytics & Leaderboards: getTopStarredMessages, getTopStarredAuthors, author & server stats
 */

import { connectDB } from '@/lib/db';
import {
  StarboardConfig,
  StarboardMessage,
  type IStarboardConfig,
  type IStarboardMessage,
} from '@/models';
export type { IStarboardConfig, IStarboardMessage };
import { type DiscordEmbed, clampEmbed } from '@/lib/discord/embeds';

// ─── Constants & Colors ───────────────────────────────────────────────────────

export const STARBOARD_COLOR = 0xffac33; // Discord Gold / Star Yellow

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

function isImageUrl(url: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => cleanUrl.endsWith(ext));
}

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
const testConfigs = new Map<string, IStarboardConfig>();
const testMessages = new Map<string, IStarboardMessage>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testConfigs.clear();
  testMessages.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestConfig(config: IStarboardConfig): void {
  testConfigs.set(config.guildId, config);
}

export function getTestConfig(guildId: string): IStarboardConfig | undefined {
  return testConfigs.get(guildId);
}

export function setTestMessage(msg: IStarboardMessage): void {
  const key = `${msg.guildId}:${msg.originalMessageId}`;
  testMessages.set(key, msg);
}

export function getTestMessage(
  guildId: string,
  originalMessageId: string,
): IStarboardMessage | undefined {
  return testMessages.get(`${guildId}:${originalMessageId}`);
}

// ─── Types & Interfaces ───────────────────────────────────────────────────────

export type StarActionType =
  | 'create_post'
  | 'update_post'
  | 'delete_post'
  | 'ignored'
  | 'self_star_rejected'
  | 'already_starred'
  | 'not_starred'
  | 'disabled'
  | 'not_configured'
  | 'threshold_not_met';

export interface StarReactionResult {
  action: StarActionType;
  starCount: number;
  badge: string;
  message?: IStarboardMessage | null;
  embed?: DiscordEmbed;
  reason?: string;
}

export interface ToggleIgnoredChannelResult {
  config: IStarboardConfig;
  ignored: boolean;
  ignoredChannels: string[];
}

export interface StarboardAuthorStats {
  authorId: string;
  totalStars: number;
  messageCount: number;
  topMessage?: IStarboardMessage | null;
}

export interface StarboardServerStats {
  totalStarredMessages: number;
  totalStarsGiven: number;
  topAuthor?: { authorId: string; totalStars: number } | null;
}

// ─── Progressive Star Tier Badges ─────────────────────────────────────────────

/**
 * Returns the progressive star tier badge according to star count:
 * - 3-9: ⭐
 * - 10-24: 🌟
 * - 25-49: 💫
 * - 50+: ✨
 */
export function getStarBadge(starCount: number): string {
  if (starCount >= 50) return '✨';
  if (starCount >= 25) return '💫';
  if (starCount >= 10) return '🌟';
  return '⭐';
}

// ─── Configuration Helpers ───────────────────────────────────────────────────

/**
 * Retrieve starboard configuration for a guild.
 */
export async function getStarboardConfig(guildId: string): Promise<IStarboardConfig | null> {
  if (testMode) {
    return testConfigs.get(guildId) ?? null;
  }

  await connectDB();
  return await StarboardConfig.findOne({ guildId });
}

/**
 * Create or update starboard configuration for a guild.
 */
export async function setStarboardConfig(
  guildId: string,
  updates: Partial<IStarboardConfig>,
): Promise<IStarboardConfig> {
  if (testMode) {
    const existing = testConfigs.get(guildId);
    const updated = {
      guildId,
      channelId: updates.channelId ?? existing?.channelId ?? '',
      minStars: updates.minStars ?? existing?.minStars ?? 3,
      emoji: updates.emoji ?? existing?.emoji ?? '⭐',
      selfStar: updates.selfStar ?? existing?.selfStar ?? false,
      ignoredChannels: updates.ignoredChannels ?? existing?.ignoredChannels ?? [],
      enabled: updates.enabled ?? existing?.enabled ?? true,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
      ...updates,
    } as unknown as IStarboardConfig;

    testConfigs.set(guildId, updated);
    return updated;
  }

  await connectDB();
  const config = await StarboardConfig.findOneAndUpdate(
    { guildId },
    { $set: updates },
    { new: true, upsert: true, runValidators: true },
  );

  return config;
}

/**
 * Toggle or explicitly set ignored status for a channel.
 * If remove === true: unignores channel.
 * If remove === false: ignores channel.
 * If remove === undefined: toggles channel.
 */
export async function toggleIgnoredChannel(
  guildId: string,
  channelId: string,
  remove?: boolean,
): Promise<ToggleIgnoredChannelResult> {
  let config = await getStarboardConfig(guildId);
  const currentIgnored = config?.ignoredChannels ? [...config.ignoredChannels] : [];

  const isCurrentlyIgnored = currentIgnored.includes(channelId);
  let shouldIgnore: boolean;

  if (remove !== undefined) {
    shouldIgnore = !remove;
  } else {
    shouldIgnore = !isCurrentlyIgnored;
  }

  let updatedList: string[];
  if (shouldIgnore) {
    updatedList = isCurrentlyIgnored ? currentIgnored : [...currentIgnored, channelId];
  } else {
    updatedList = currentIgnored.filter((id) => id !== channelId);
  }

  const updatedConfig = await setStarboardConfig(guildId, {
    ignoredChannels: updatedList,
  });

  return {
    config: updatedConfig,
    ignored: shouldIgnore,
    ignoredChannels: updatedConfig.ignoredChannels,
  };
}

// ─── Embed Builder ───────────────────────────────────────────────────────────

export interface BuildStarboardEmbedParams {
  guildId: string;
  originalChannelId: string;
  originalMessageId: string;
  authorId: string;
  content: string;
  attachments?: string[];
  starCount: number;
  authorName?: string;
  authorAvatarUrl?: string;
}

/**
 * Builds standard Discord Starboard embed with jump link, content, author, attachments, and badge footer.
 */
export function buildStarboardEmbed(params: {
  guildId: string;
  originalChannelId: string;
  originalMessageId: string;
  authorId: string;
  content: string;
  attachments?: string[];
  starCount: number;
  authorName?: string;
  authorAvatarUrl?: string;
}): DiscordEmbed {
  const {
    guildId,
    originalChannelId,
    originalMessageId,
    authorId,
    content,
    attachments = [],
    starCount,
    authorName,
    authorAvatarUrl,
  } = params;

  const jumpUrl = `https://discord.com/channels/${guildId}/${originalChannelId}/${originalMessageId}`;
  const badge = getStarBadge(starCount);

  // Find first image attachment if present
  const imageAttachment = attachments.find(isImageUrl);

  const embed: DiscordEmbed = {
    color: STARBOARD_COLOR,
    author: authorName
      ? {
          name: authorName,
          icon_url: authorAvatarUrl,
        }
      : {
          name: `User: ${authorId}`,
          icon_url: authorAvatarUrl,
        },
    description: content?.trim() || (attachments.length > 0 ? '*Attachment-only message*' : '*No content*'),
    fields: [
      {
        name: 'Author',
        value: `<@${authorId}>`,
        inline: true,
      },
      {
        name: 'Channel',
        value: `<#${originalChannelId}>`,
        inline: true,
      },
      {
        name: 'Jump to message',
        value: `[Original Message](${jumpUrl})`,
        inline: true,
      },
    ],
    footer: {
      text: `${badge} ${starCount} | ID: ${originalMessageId}`,
    },
    timestamp: new Date().toISOString(),
  };

  if (imageAttachment) {
    embed.image = { url: imageAttachment };
  }

  return clampEmbed(embed);
}

// ─── Starboard Post Tracking Helper ──────────────────────────────────────────

/**
 * Record the posted starboard message ID once posted in Discord.
 */
export async function setStarboardMessagePosted(
  guildId: string,
  originalMessageId: string,
  starboardMessageId: string,
): Promise<IStarboardMessage | null> {
  if (testMode) {
    const key = `${guildId}:${originalMessageId}`;
    const msg = testMessages.get(key);
    if (!msg) return null;
    msg.starboardMessageId = starboardMessageId;
    msg.updatedAt = new Date();
    testMessages.set(key, msg);
    return msg;
  }

  await connectDB();
  return await StarboardMessage.findOneAndUpdate(
    { guildId, originalMessageId },
    { $set: { starboardMessageId } },
    { new: true },
  );
}

// ─── Star Reaction Logic ─────────────────────────────────────────────────────

export interface AddStarReactionParams {
  guildId: string;
  channelId: string;
  messageId: string;
  userId: string;
  authorId: string;
  content?: string;
  attachments?: string[];
  emoji?: string;
}

/**
 * Process a star reaction added to a message.
 * Enforces gating (enabled, ignored channels, self-star), increments stars idempotently,
 * and checks threshold for create_post or update_post action.
 */
export async function addStarReaction(
  params: AddStarReactionParams,
): Promise<StarReactionResult> {
  const {
    guildId,
    channelId,
    messageId,
    userId,
    authorId,
    content = '',
    attachments = [],
    emoji = '⭐',
  } = params;

  // 1. Gating checks
  const config = await getStarboardConfig(guildId);
  if (!config) {
    return {
      action: 'not_configured',
      starCount: 0,
      badge: '⭐',
      reason: 'Starboard is not configured for this server.',
    };
  }

  if (!config.enabled) {
    return {
      action: 'disabled',
      starCount: 0,
      badge: '⭐',
      reason: 'Starboard is currently disabled.',
    };
  }

  if (config.ignoredChannels?.includes(channelId)) {
    return {
      action: 'ignored',
      starCount: 0,
      badge: '⭐',
      reason: 'Reactions in this channel are ignored for starboard.',
    };
  }

  if (!config.selfStar && userId === authorId) {
    return {
      action: 'self_star_rejected',
      starCount: 0,
      badge: '⭐',
      reason: 'Self-starring is disabled in this server.',
    };
  }

  // 2. Fetch or initialize message record
  const minStars = config.minStars ?? 3;
  let messageRecord: IStarboardMessage | null = null;

  if (testMode) {
    const key = `${guildId}:${messageId}`;
    let record = testMessages.get(key);
    if (!record) {
      record = {
        guildId,
        originalChannelId: channelId,
        originalMessageId: messageId,
        authorId,
        content,
        attachments,
        starCount: 0,
        starredBy: [],
        starboardMessageId: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as IStarboardMessage;
      testMessages.set(key, record);
    }

    // Idempotency: check if already starred by this user
    if (record.starredBy.includes(userId)) {
      return {
        action: 'already_starred',
        starCount: record.starCount,
        badge: getStarBadge(record.starCount),
        message: record,
        reason: 'User has already starred this message.',
      };
    }

    record.starredBy.push(userId);
    record.starCount = record.starredBy.length;
    if (content) record.content = content;
    if (attachments.length > 0) record.attachments = attachments;
    record.updatedAt = new Date();
    testMessages.set(key, record);
    messageRecord = record;
  } else {
    await connectDB();
    let record = await StarboardMessage.findOne({ guildId, originalMessageId: messageId });
    if (!record) {
      record = new StarboardMessage({
        guildId,
        originalChannelId: channelId,
        originalMessageId: messageId,
        authorId,
        content,
        attachments,
        starCount: 0,
        starredBy: [],
      });
    }

    if (record.starredBy.includes(userId)) {
      return {
        action: 'already_starred',
        starCount: record.starCount,
        badge: getStarBadge(record.starCount),
        message: record,
        reason: 'User has already starred this message.',
      };
    }

    record.starredBy.push(userId);
    record.starCount = record.starredBy.length;
    if (content) record.content = content;
    if (attachments.length > 0) record.attachments = attachments;
    await record.save();
    messageRecord = record;
  }

  const currentCount = messageRecord.starCount;
  const badge = getStarBadge(currentCount);

  // 3. Threshold check
  if (currentCount < minStars) {
    return {
      action: 'threshold_not_met',
      starCount: currentCount,
      badge,
      message: messageRecord,
      reason: `Message has ${currentCount}/${minStars} stars required.`,
    };
  }

  const embed = buildStarboardEmbed({
    guildId,
    originalChannelId: channelId,
    originalMessageId: messageId,
    authorId,
    content: messageRecord.content,
    attachments: messageRecord.attachments,
    starCount: currentCount,
  });

  if (!messageRecord.starboardMessageId) {
    return {
      action: 'create_post',
      starCount: currentCount,
      badge,
      message: messageRecord,
      embed,
    };
  }

  return {
    action: 'update_post',
    starCount: currentCount,
    badge,
    message: messageRecord,
    embed,
  };
}

export interface RemoveStarReactionParams {
  guildId: string;
  channelId: string;
  messageId: string;
  userId: string;
}

/**
 * Process a star reaction removed from a message.
 * Updates star count and decides if starboard post should be updated or deleted.
 */
export async function removeStarReaction(
  params: RemoveStarReactionParams,
): Promise<StarReactionResult> {
  const { guildId, channelId, messageId, userId } = params;

  const config = await getStarboardConfig(guildId);
  const minStars = config?.minStars ?? 3;

  let messageRecord: IStarboardMessage | null = null;

  if (testMode) {
    const key = `${guildId}:${messageId}`;
    const record = testMessages.get(key);
    if (!record || !record.starredBy.includes(userId)) {
      return {
        action: 'not_starred',
        starCount: record?.starCount ?? 0,
        badge: getStarBadge(record?.starCount ?? 0),
        reason: 'User has not starred this message.',
      };
    }

    record.starredBy = record.starredBy.filter((id) => id !== userId);
    record.starCount = record.starredBy.length;
    record.updatedAt = new Date();
    testMessages.set(key, record);
    messageRecord = record;
  } else {
    await connectDB();
    const record = await StarboardMessage.findOne({ guildId, originalMessageId: messageId });
    if (!record || !record.starredBy.includes(userId)) {
      return {
        action: 'not_starred',
        starCount: record?.starCount ?? 0,
        badge: getStarBadge(record?.starCount ?? 0),
        reason: 'User has not starred this message.',
      };
    }

    record.starredBy = record.starredBy.filter((id) => id !== userId);
    record.starCount = record.starredBy.length;
    await record.save();
    messageRecord = record;
  }

  const currentCount = messageRecord.starCount;
  const badge = getStarBadge(currentCount);

  if (messageRecord.starboardMessageId) {
    if (currentCount < minStars) {
      return {
        action: 'delete_post',
        starCount: currentCount,
        badge,
        message: messageRecord,
        reason: `Star count fell below threshold (${currentCount}/${minStars}).`,
      };
    }

    const embed = buildStarboardEmbed({
      guildId,
      originalChannelId: channelId,
      originalMessageId: messageId,
      authorId: messageRecord.authorId,
      content: messageRecord.content,
      attachments: messageRecord.attachments,
      starCount: currentCount,
    });

    return {
      action: 'update_post',
      starCount: currentCount,
      badge,
      message: messageRecord,
      embed,
    };
  }

  return {
    action: 'threshold_not_met',
    starCount: currentCount,
    badge,
    message: messageRecord,
  };
}

// ─── Analytics & Leaderboards ─────────────────────────────────────────────────

/**
 * Retrieve top starred messages in a server sorted by starCount descending.
 */
export async function getTopStarredMessages(
  guildId: string,
  limit: number = 10,
): Promise<IStarboardMessage[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 50));

  if (testMode) {
    const messages = Array.from(testMessages.values())
      .filter((m) => m.guildId === guildId && m.starCount > 0)
      .sort((a, b) => b.starCount - a.starCount || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, boundedLimit);
    return messages;
  }

  await connectDB();
  return await StarboardMessage.find({ guildId, starCount: { $gt: 0 } })
    .sort({ starCount: -1, createdAt: -1 })
    .limit(boundedLimit);
}

/**
 * Retrieve top starred authors in a server aggregated by total stars received.
 */
export async function getTopStarredAuthors(
  guildId: string,
  limit: number = 10,
): Promise<Array<{ authorId: string; totalStars: number; messageCount: number }>> {
  const boundedLimit = Math.max(1, Math.min(limit, 50));

  if (testMode) {
    const authorMap = new Map<string, { totalStars: number; messageCount: number }>();
    for (const msg of testMessages.values()) {
      if (msg.guildId !== guildId || msg.starCount <= 0) continue;
      const current = authorMap.get(msg.authorId) ?? { totalStars: 0, messageCount: 0 };
      current.totalStars += msg.starCount;
      current.messageCount += 1;
      authorMap.set(msg.authorId, current);
    }

    return Array.from(authorMap.entries())
      .map(([authorId, data]) => ({
        authorId,
        totalStars: data.totalStars,
        messageCount: data.messageCount,
      }))
      .sort((a, b) => b.totalStars - a.totalStars || b.messageCount - a.messageCount)
      .slice(0, boundedLimit);
  }

  await connectDB();
  const results = await StarboardMessage.aggregate([
    { $match: { guildId, starCount: { $gt: 0 } } },
    {
      $group: {
        _id: '$authorId',
        totalStars: { $sum: '$starCount' },
        messageCount: { $sum: 1 },
      },
    },
    { $sort: { totalStars: -1, messageCount: -1 } },
    { $limit: boundedLimit },
    {
      $project: {
        _id: 0,
        authorId: '$_id',
        totalStars: 1,
        messageCount: 1,
      },
    },
  ]);

  return results;
}

/**
 * Retrieve author-specific starboard statistics.
 */
export async function getAuthorStarStats(
  guildId: string,
  authorId: string,
): Promise<StarboardAuthorStats> {
  if (testMode) {
    const authorMessages = Array.from(testMessages.values())
      .filter((m) => m.guildId === guildId && m.authorId === authorId && m.starCount > 0)
      .sort((a, b) => b.starCount - a.starCount);

    const totalStars = authorMessages.reduce((sum, m) => sum + m.starCount, 0);
    return {
      authorId,
      totalStars,
      messageCount: authorMessages.length,
      topMessage: authorMessages[0] ?? null,
    };
  }

  await connectDB();
  const messages = await StarboardMessage.find({ guildId, authorId, starCount: { $gt: 0 } }).sort({
    starCount: -1,
  });

  const totalStars = messages.reduce((sum, m) => sum + m.starCount, 0);
  return {
    authorId,
    totalStars,
    messageCount: messages.length,
    topMessage: messages[0] ?? null,
  };
}

/**
 * Retrieve server-wide starboard statistics.
 */
export async function getServerStarStats(guildId: string): Promise<StarboardServerStats> {
  const topAuthors = await getTopStarredAuthors(guildId, 1);
  const topAuthor = topAuthors[0]
    ? { authorId: topAuthors[0].authorId, totalStars: topAuthors[0].totalStars }
    : null;

  if (testMode) {
    const msgs = Array.from(testMessages.values()).filter(
      (m) => m.guildId === guildId && m.starCount > 0,
    );
    const totalStarsGiven = msgs.reduce((sum, m) => sum + m.starCount, 0);
    return {
      totalStarredMessages: msgs.length,
      totalStarsGiven,
      topAuthor,
    };
  }

  await connectDB();
  const [stats] = await StarboardMessage.aggregate([
    { $match: { guildId, starCount: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        totalStarredMessages: { $sum: 1 },
        totalStarsGiven: { $sum: '$starCount' },
      },
    },
  ]);

  return {
    totalStarredMessages: stats?.totalStarredMessages ?? 0,
    totalStarsGiven: stats?.totalStarsGiven ?? 0,
    topAuthor,
  };
}
