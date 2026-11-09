/**
 * src/lib/clips/clip-service.ts
 * Community Gaming Clip Competitions & Highlights Service Engine for AiCord.
 *
 * Responsibilities:
 * - In-memory test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestClip, getTestClip, setTestConfig, getTestConfig)
 * - URL Validation (YouTube, Twitch, Streamable, Medal.tv, Discord attachments, direct .mp4/.webm/.mov)
 * - ISO Week Helper (getCurrentWeekString)
 * - Unique Clip ID Generator (clip-XXXX)
 * - CRUD operations & Voting System with fire (+2), 200 IQ (+3), fail (+1) weighting
 * - Anti-self-voting enforcement & vote toggling
 * - Weekly leaderboards & champion crowning
 * - Discord embed & interactive voting component builders
 */

import {
  type APIEmbed,
  type APIActionRowComponent,
  type APIButtonComponent,
  ButtonStyle,
  ComponentType,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import {
  ClipSubmission,
  type IClipSubmission,
  type IClipVotes,
} from '@/models/ClipSubmission';
import {
  ClipContestConfig,
  type IClipContestConfig,
} from '@/models/ClipContestConfig';

export type { IClipSubmission, IClipVotes, IClipContestConfig };

// ─── In-Memory Test Store ───────────────────────────────────────────────────

let testMode = false;
const testClips = new Map<string, IClipSubmission>();
const testConfigs = new Map<string, IClipContestConfig>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testClips.clear();
  testConfigs.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestClip(
  guildIdOrData: string | (Partial<IClipSubmission> & { guildId: string; clipId?: string }),
  clipIdOrData?: string | Partial<IClipSubmission>,
  extraData?: Partial<IClipSubmission>,
): IClipSubmission {
  let guildId: string;
  let clipId: string;
  let data: Partial<IClipSubmission>;

  if (typeof guildIdOrData === 'object') {
    guildId = guildIdOrData.guildId;
    data = guildIdOrData;
    clipId = data.clipId || generateClipId();
  } else if (typeof clipIdOrData === 'string') {
    guildId = guildIdOrData;
    clipId = clipIdOrData;
    data = extraData || {};
  } else {
    guildId = guildIdOrData;
    data = clipIdOrData || {};
    clipId = data.clipId || generateClipId();
  }

  const key = `${guildId}:${clipId}`;
  const now = new Date();
  const votes: IClipVotes = {
    fire: data.votes?.fire ? [...data.votes.fire] : [],
    smart: data.votes?.smart ? [...data.votes.smart] : [],
    fail: data.votes?.fail ? [...data.votes.fail] : [],
  };

  const computedScore =
    votes.fire.length * 2 + votes.smart.length * 3 + votes.fail.length * 1;
  const totalScore = data.totalScore !== undefined ? data.totalScore : computedScore;

  const clip = {
    guildId,
    clipId,
    userId: data.userId || 'user_default',
    userTag: data.userTag || 'Member',
    title: (data.title || 'Untitled Clip').trim(),
    game: (data.game || 'General').trim(),
    clipUrl: (data.clipUrl || 'https://youtu.be/defaultclip').trim(),
    votes,
    totalScore,
    week: data.week || getCurrentWeekString(now),
    isWinner: data.isWinner ?? false,
    createdAt: data.createdAt ? new Date(data.createdAt) : now,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : now,
  } as unknown as IClipSubmission;

  testClips.set(key, clip);
  return clip;
}

export function getTestClip(
  guildId: string,
  clipId: string,
): IClipSubmission | undefined {
  return testClips.get(`${guildId}:${clipId}`);
}

export function setTestConfig(
  guildId: string,
  config: Partial<IClipContestConfig>,
): IClipContestConfig {
  const now = new Date();
  const fullConfig = {
    guildId,
    channelId: config.channelId || '',
    championRoleId: config.championRoleId,
    enabled: config.enabled ?? true,
    createdAt: config.createdAt ? new Date(config.createdAt) : now,
    updatedAt: config.updatedAt ? new Date(config.updatedAt) : now,
  } as unknown as IClipContestConfig;

  testConfigs.set(guildId, fullConfig);
  return fullConfig;
}

export function getTestConfig(guildId: string): IClipContestConfig | undefined {
  return testConfigs.get(guildId);
}

// ─── Unique ID Generator ────────────────────────────────────────────────────

export function generateClipId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `clip-${code}`;
}

// ─── URL Validation ─────────────────────────────────────────────────────────

/**
 * Validates that the provided URL comes from an approved video/clip platform:
 * - YouTube (youtube.com, youtu.be)
 * - Twitch (twitch.tv, clips.twitch.tv)
 * - Streamable (streamable.com)
 * - Medal.tv (medal.tv)
 * - Discord attachments (discordapp.com/attachments/, media.discordapp.net/attachments/, cdn.discordapp.com/attachments/)
 * - Direct video files (.mp4, .webm, .mov)
 */
export function isValidClipUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // YouTube: youtube.com or youtu.be
    if (
      host === 'youtu.be' ||
      host.endsWith('.youtu.be') ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com')
    ) {
      return true;
    }

    // Twitch
    if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) {
      return true;
    }

    // Streamable
    if (host === 'streamable.com' || host.endsWith('.streamable.com')) {
      return true;
    }

    // Medal.tv
    if (host === 'medal.tv' || host.endsWith('.medal.tv')) {
      return true;
    }

    // Discord Attachments
    if (
      (host.includes('discordapp.com') || host.includes('discordapp.net')) &&
      pathname.includes('/attachments/')
    ) {
      return true;
    }

    // Direct Video Files (.mp4, .webm, .mov)
    if (
      pathname.endsWith('.mp4') ||
      pathname.endsWith('.webm') ||
      pathname.endsWith('.mov')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ─── Current Week Helper ────────────────────────────────────────────────────

/**
 * Returns the ISO year-week format (e.g. '2026-W45') according to ISO 8601 standard.
 */
export function getCurrentWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Day of week: 1 (Monday) to 7 (Sunday)
  const dayNum = d.getUTCDay() || 7;
  // Shift to nearest Thursday
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();

  // Find first Thursday of the year
  const firstThursday = new Date(Date.UTC(year, 0, 1));
  const firstDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + (4 - firstDay + (firstDay > 4 ? 7 : 0)));

  const weekNo = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${year}-W${weekNo.toString().padStart(2, '0')}`;
}

// ─── Embed & Component Builders ─────────────────────────────────────────────

/**
 * Builds the rich presentation embed for a submitted gaming clip.
 */
export function buildClipEmbed(clip: IClipSubmission): APIEmbed {
  const fireCount = clip.votes?.fire?.length || 0;
  const smartCount = clip.votes?.smart?.length || 0;
  const failCount = clip.votes?.fail?.length || 0;

  const descriptionLines = [
    `**Submitted by:** <@${clip.userId}>`,
    `**Watch Clip:** [Click Here to Watch](${clip.clipUrl})`,
    '',
    `🏆 **Score:** \`${clip.totalScore} pts\``,
    `📊 **Tally:** 🔥 ${fireCount} | 🧠 ${smartCount} | 💀 ${failCount}`,
  ];

  return {
    title: `🎬 [${clip.game}] ${clip.title}`,
    url: clip.clipUrl,
    description: descriptionLines.join('\n'),
    color: clip.isWinner ? 0xf1c40f : 0x5865f2,
    footer: {
      text: `Clip ID: ${clip.clipId} • Week ${clip.week}${clip.isWinner ? ' • 👑 Weekly Winner' : ''}`,
    },
    timestamp: clip.createdAt ? new Date(clip.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Builds the interactive 3-button voting action row for a clip.
 */
export function buildClipComponents(
  clip: IClipSubmission,
): APIActionRowComponent<APIButtonComponent>[] {
  const fireCount = clip.votes?.fire?.length || 0;
  const smartCount = clip.votes?.smart?.length || 0;
  const failCount = clip.votes?.fail?.length || 0;

  return [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ButtonStyle.Primary,
          label: `🔥 Fire Play (${fireCount})`,
          custom_id: `clip_vote:${clip.clipId}:fire`,
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Success,
          label: `🧠 200 IQ (${smartCount})`,
          custom_id: `clip_vote:${clip.clipId}:smart`,
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          label: `💀 Funny Fail (${failCount})`,
          custom_id: `clip_vote:${clip.clipId}:fail`,
        },
      ],
    },
  ];
}

/**
 * Builds the celebratory weekly champion announcement embed.
 */
export function buildChampionEmbed(
  clip: IClipSubmission,
  roleId?: string,
): APIEmbed {
  const fireCount = clip.votes?.fire?.length || 0;
  const smartCount = clip.votes?.smart?.length || 0;
  const failCount = clip.votes?.fail?.length || 0;

  const roleAnnouncement = roleId
    ? `\n\n👑 <@${clip.userId}> has been awarded the <@&${roleId}> role!`
    : '';

  return {
    title: '🏆 Weekly Clip Champion Crowned! 👑',
    url: clip.clipUrl,
    description:
      `Congratulations to <@${clip.userId}> for winning the **Week ${clip.week}** Clip Competition with **${clip.title}**!\n\n` +
      `🎮 **Game:** ${clip.game}\n` +
      `🏆 **Winning Score:** \`${clip.totalScore} pts\` (🔥 ${fireCount} | 🧠 ${smartCount} | 💀 ${failCount})\n` +
      `🎬 **Watch the Winning Clip:** [Click Here](${clip.clipUrl})` +
      roleAnnouncement,
    color: 0xf1c40f, // Gold
    footer: {
      text: `AiCord Clip Contest • Week ${clip.week} Champion • ${clip.clipId}`,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds the weekly leaderboard embed.
 */
export function buildLeaderboardEmbed(
  week: string,
  clips: IClipSubmission[],
): APIEmbed {
  if (clips.length === 0) {
    return {
      title: `🎬 Gaming Clip Leaderboard — Week ${week}`,
      description: `No clips have been submitted yet for **Week ${week}**.\n\nBe the first to submit using \`/clip submit\`!`,
      color: 0x5865f2,
      footer: { text: `Week ${week} • AiCord Clip Competitions` },
    };
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = clips.map((clip, index) => {
    const rank = medals[index] || `**#${index + 1}**`;
    const winnerTag = clip.isWinner ? ' 👑' : '';
    const fire = clip.votes?.fire?.length || 0;
    const smart = clip.votes?.smart?.length || 0;
    const fail = clip.votes?.fail?.length || 0;
    return `${rank} [${clip.title}](${clip.clipUrl}) — <@${clip.userId}>\n   🎮 *${clip.game}* • 🏆 **${clip.totalScore} pts** (🔥 ${fire} | 🧠 ${smart} | 💀 ${fail})${winnerTag}`;
  });

  return {
    title: `🎬 Gaming Clip Leaderboard — Week ${week}`,
    description: lines.join('\n\n'),
    color: 0x5865f2,
    footer: {
      text: `Top ${clips.length} Clips • Week ${week} • AiCord Clip Competitions`,
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── Core Service Operations ────────────────────────────────────────────────

export interface ISubmitClipParams {
  guildId: string;
  userId: string;
  userTag?: string;
  title: string;
  clipUrl: string;
  game?: string;
  now?: Date;
}

/**
 * Submits a new gaming highlight clip to the competition.
 */
export async function submitClip(
  params: ISubmitClipParams,
): Promise<IClipSubmission> {
  const cleanUrl = (params.clipUrl || '').trim();
  if (!isValidClipUrl(cleanUrl)) {
    throw new Error(
      'Invalid clip URL. Supported platforms: YouTube, Twitch, Streamable, Medal.tv, Discord attachments, or direct video files (.mp4, .webm, .mov).',
    );
  }

  const cleanTitle = (params.title || '').trim();
  if (cleanTitle.length < 1 || cleanTitle.length > 100) {
    throw new Error('Title must be between 1 and 100 characters.');
  }

  let cleanGame = (params.game || 'General').trim();
  if (cleanGame.length < 1) cleanGame = 'General';
  if (cleanGame.length > 50) cleanGame = cleanGame.slice(0, 50);

  const clipId = generateClipId();
  const week = getCurrentWeekString(params.now);
  const now = params.now ? new Date(params.now) : new Date();

  if (isTestMode()) {
    return setTestClip({
      guildId: params.guildId,
      clipId,
      userId: params.userId,
      userTag: params.userTag || 'Member',
      title: cleanTitle,
      game: cleanGame,
      clipUrl: cleanUrl,
      votes: { fire: [], smart: [], fail: [] },
      totalScore: 0,
      week,
      isWinner: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  await connectDB();
  const clip = await ClipSubmission.create({
    guildId: params.guildId,
    clipId,
    userId: params.userId,
    userTag: params.userTag || 'Member',
    title: cleanTitle,
    game: cleanGame,
    clipUrl: cleanUrl,
    votes: { fire: [], smart: [], fail: [] },
    totalScore: 0,
    week,
    isWinner: false,
  });

  return clip;
}

/**
 * Retrieves a single clip by guild ID and clip ID.
 */
export async function getClip(
  guildId: string,
  clipId: string,
): Promise<IClipSubmission | null> {
  if (isTestMode()) {
    return getTestClip(guildId, clipId) || null;
  }

  await connectDB();
  return ClipSubmission.findOne({ guildId, clipId });
}

/**
 * Votes on a clip with fire (+2), 200 IQ (+3), or funny fail (+1).
 * Enforces anti-self-voting and toggles vote status.
 */
export async function voteClip(
  guildId: string,
  clipId: string,
  userId: string,
  voteType: 'fire' | 'smart' | 'fail',
): Promise<{ clip: IClipSubmission; toggledOn: boolean; totalScore: number }> {
  const clip = await getClip(guildId, clipId);
  if (!clip) {
    throw new Error('Clip not found.');
  }

  // Reject self-voting
  if (clip.userId === userId) {
    throw new Error('You cannot vote on your own clip!');
  }

  if (!clip.votes) {
    clip.votes = { fire: [], smart: [], fail: [] };
  }
  if (!clip.votes[voteType]) {
    clip.votes[voteType] = [];
  }

  let toggledOn = false;
  const currentVotes = clip.votes[voteType];
  const existingIdx = currentVotes.indexOf(userId);

  if (existingIdx !== -1) {
    currentVotes.splice(existingIdx, 1);
    toggledOn = false;
  } else {
    currentVotes.push(userId);
    toggledOn = true;
  }

  const fireCount = clip.votes.fire?.length || 0;
  const smartCount = clip.votes.smart?.length || 0;
  const failCount = clip.votes.fail?.length || 0;

  const totalScore = fireCount * 2 + smartCount * 3 + failCount * 1;
  clip.totalScore = totalScore;
  clip.updatedAt = new Date();

  if (isTestMode()) {
    testClips.set(`${guildId}:${clipId}`, clip);
    return { clip, toggledOn, totalScore };
  }

  await connectDB();
  clip.markModified?.('votes');
  await clip.save();
  return { clip, toggledOn, totalScore };
}

/**
 * Retrieves the weekly leaderboard sorted by totalScore descending.
 */
export async function getClipLeaderboard(
  guildId: string,
  week?: string,
  limit: number = 10,
): Promise<IClipSubmission[]> {
  const targetWeek = week || getCurrentWeekString();

  if (isTestMode()) {
    return Array.from(testClips.values())
      .filter((c) => c.guildId === guildId && c.week === targetWeek)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }

  await connectDB();
  return ClipSubmission.find({ guildId, week: targetWeek })
    .sort({ totalScore: -1 })
    .limit(limit)
    .lean();
}

/**
 * Crowns the #1 clip with totalScore > 0 as the weekly champion.
 * Returns the winning clip and any configured championRoleId.
 */
export async function crownWeeklyChampion(
  guildId: string,
  week?: string,
): Promise<{ championClip: IClipSubmission | null; championRoleId?: string }> {
  const targetWeek = week || getCurrentWeekString();
  const config = await getClipContestConfig(guildId);
  const championRoleId = config?.championRoleId;

  if (isTestMode()) {
    const clips = Array.from(testClips.values())
      .filter((c) => c.guildId === guildId && c.week === targetWeek)
      .sort((a, b) => b.totalScore - a.totalScore);

    const champion = clips.find((c) => c.totalScore > 0) || null;
    if (!champion) {
      return { championClip: null, championRoleId };
    }

    champion.isWinner = true;
    testClips.set(`${guildId}:${champion.clipId}`, champion);
    return { championClip: champion, championRoleId };
  }

  await connectDB();
  const champion = await ClipSubmission.findOne({
    guildId,
    week: targetWeek,
    totalScore: { $gt: 0 },
  }).sort({ totalScore: -1 });

  if (!champion) {
    return { championClip: null, championRoleId };
  }

  champion.isWinner = true;
  await champion.save();
  return { championClip: champion, championRoleId };
}

/**
 * Retrieves guild clip contest configuration.
 */
export async function getClipContestConfig(
  guildId: string,
): Promise<IClipContestConfig | null> {
  if (isTestMode()) {
    return testConfigs.get(guildId) || null;
  }

  await connectDB();
  return ClipContestConfig.findOne({ guildId });
}

/**
 * Updates or creates guild clip contest configuration.
 */
export async function updateClipContestConfig(
  guildId: string,
  update: Partial<IClipContestConfig>,
): Promise<IClipContestConfig> {
  const now = new Date();

  if (isTestMode()) {
    const existing = testConfigs.get(guildId) || ({
      guildId,
      channelId: '',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    } as unknown as IClipContestConfig);

    const merged = {
      ...existing,
      ...update,
      guildId,
      updatedAt: now,
    } as unknown as IClipContestConfig;

    testConfigs.set(guildId, merged);
    return merged;
  }

  await connectDB();
  const config = await ClipContestConfig.findOneAndUpdate(
    { guildId },
    { $set: update },
    { new: true, upsert: true },
  );

  return config;
}
