/**
 * src/lib/discord/build-applier.ts
 * Applies a validated server blueprint to a Discord guild.
 * Creates roles, categories, channels, and posts messages — in that order.
 * Respects rate limits by using sequential creation with delays.
 */

import {
  Routes,
  type RESTPostAPIGuildChannelJSONBody,
  type RESTPostAPIGuildRoleJSONBody,
  ChannelType,
} from 'discord-api-types/v10';
import { getDiscordRest, discordApiCall } from './rest';
import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import type { CreatedIds, BuildStep } from '@/models/BuildJob';
import {
  sanitizeChannelName,
  sanitizeRoleName,
  CHANNEL_TOPIC_MAX,
  FORUM_TOPIC_MAX,
} from '@/lib/limits';
import { PermissionFlags } from './permissions';
import {
  getTheme,
  renderThemedProgressBar,
  formatThemedHeader,
  type ThemeId,
} from '@/lib/styles/themes';
import { getServerTheme } from '@/lib/styles/user-profile-style';
import { deployOnboardingGuide } from './onboarding-generator';
import { connectDB } from '@/lib/db';
import { BuildJob } from '@/models/BuildJob';
import { editInteractionResponse, buildUndoRow } from './interaction-response';
import { clampEmbed, errorEmbed, type DiscordEmbed } from './embeds';
import { buildBuildCompletionEmbed } from './blueprint-preview';

const CREATION_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 300; // Delay between API calls to respect rate limits

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface BuildProgressMeta {
  phase: 1 | 2 | 3 | 4;
  phaseLabel: string;
  percent: number;
  current?: number;
  total?: number;
  detail?: string;
}

export interface ApplyBlueprintOptions {
  guildId: string;
  blueprint: ServerBlueprint;
  onProgress?: (steps: BuildStep[], meta?: BuildProgressMeta) => Promise<void>;
  themeId?: string;
  serverName?: string;
}

export interface ApplyBlueprintResult {
  createdIds: CreatedIds;
  steps: BuildStep[];
  success: boolean;
  error?: string;
}

/**
 * Applies a server blueprint to a Discord guild.
 * Returns the IDs of all created resources for rollback.
 */
export async function applyBlueprint(
  options: ApplyBlueprintOptions,
): Promise<ApplyBlueprintResult> {
  const { guildId, blueprint, onProgress } = options;
  const rest = getDiscordRest();

  // Check guild features to determine supported channel types (e.g. COMMUNITY for announcement/stage)
  let hasCommunity = false;
  try {
    const guild = (await discordApiCall(() =>
      rest.get(Routes.guild(guildId)),
    )) as { features?: string[] };
    hasCommunity = Array.isArray(guild.features) && guild.features.includes('COMMUNITY');
  } catch (err) {
    console.warn(`[BuildApplier] Could not fetch guild features for ${guildId}, assuming non-community:`, err);
  }

  const createdIds: CreatedIds = {
    roles: [],
    categories: [],
    channels: [],
    messages: [],
  };

  const steps: BuildStep[] = [];

  async function reportProgress(
    progressSteps: BuildStep[],
    meta?: BuildProgressMeta,
  ): Promise<void> {
    if (!onProgress) return;
    try {
      await onProgress(progressSteps, meta);
    } catch (err) {
      console.warn('[BuildApplier] onProgress callback threw (non-fatal):', err);
    }
  }

  function addStep(label: string): number {
    const idx = steps.length;
    steps.push({ label, status: 'pending' });
    return idx;
  }

  function completeStep(idx: number, failed = false, error?: string) {
    steps[idx].status = failed ? 'failed' : 'done';
    if (error) steps[idx].error = error;
  }

  // ─── Build role name -> ID map ──────────────────────────────────────────
  // Pre-seed @everyone -> guildId since @everyone role ID is always the guild ID
  const roleIdMap = new Map<string, string>(); // roleName -> discordRoleId
  roleIdMap.set('@everyone', guildId);
  roleIdMap.set('everyone', guildId);

  // ─── Phase 1: 🎭 Roles Hierarchy (highest to lowest) ────────────────────
  // Filter out @everyone since Discord guilds already have @everyone and creating it makes a fake role
  const rolesToCreate = blueprint.roles.filter(
    (r) => r.name.toLowerCase() !== '@everyone' && r.name.toLowerCase() !== 'everyone',
  );

  const roleStep = addStep(`Phase 1: 🎭 Roles Hierarchy (${rolesToCreate.length} roles)`);
  await reportProgress([...steps], {
    phase: 1,
    phaseLabel: '🎭 Roles Hierarchy',
    percent: 5,
    current: 0,
    total: rolesToCreate.length,
  });

  try {
    let rIdx = 0;
    for (const role of rolesToCreate) {
      rIdx++;
      const body: RESTPostAPIGuildRoleJSONBody = {
        name: sanitizeRoleName(role.name),
        color: role.color ?? 0,
        hoist: role.hoist ?? false,
        mentionable: role.mentionable ?? false,
        permissions: role.permissions ?? '0',
      };

      const created = await discordApiCall(() =>
        rest.post(Routes.guildRoles(guildId), { body }) as Promise<{ id: string }>,
      );

      createdIds.roles.push(created.id);
      roleIdMap.set(role.name.trim().toLowerCase(), created.id);
      roleIdMap.set(role.name.trim().toLowerCase().replace(/^@/, ''), created.id);

      const rPct = 5 + Math.round((rIdx / Math.max(1, rolesToCreate.length)) * 20);
      await reportProgress([...steps], {
        phase: 1,
        phaseLabel: '🎭 Roles Hierarchy',
        percent: rPct,
        current: rIdx,
        total: rolesToCreate.length,
        detail: role.name,
      });

      await sleep(CREATION_DELAY_MS);
    }
    completeStep(roleStep);
  } catch (err) {
    console.error('[BuildApplier] Failed to create roles:', err);
    completeStep(roleStep, true, err instanceof Error ? err.message : String(err));
    await reportProgress([...steps], {
      phase: 1,
      phaseLabel: '🎭 Roles Hierarchy',
      percent: 25,
      detail: 'Failed during role creation',
    });
    return {
      createdIds,
      steps,
      success: false,
      error: `Failed to create roles: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await reportProgress([...steps], {
    phase: 1,
    phaseLabel: '🎭 Roles Hierarchy',
    percent: 25,
  });

  // ─── Phase 2: 📁 Categories Setup ───────────────────────────────────────
  const categoryIdMap = new Map<string, string>(); // categoryName -> channelId

  const catStep = addStep(`Phase 2: 📁 Categories Setup (${blueprint.categories.length} categories)`);
  await reportProgress([...steps], {
    phase: 2,
    phaseLabel: '📁 Categories Setup',
    percent: 25,
    current: 0,
    total: blueprint.categories.length,
  });

  try {
    let cIdx = 0;
    for (const category of blueprint.categories) {
      cIdx++;
      const permissionOverwrites = buildPermissionOverwrites(
        category.permissionOverwrites ?? [],
        roleIdMap,
        guildId,
      );

      const body: RESTPostAPIGuildChannelJSONBody = {
        name: category.name.trim().slice(0, 100),
        type: ChannelType.GuildCategory,
        ...(permissionOverwrites.length > 0 ? { permission_overwrites: permissionOverwrites } : {}),
      };

      const created = await discordApiCall(() =>
        rest.post(Routes.guildChannels(guildId), { body }) as Promise<{ id: string }>,
      );

      createdIds.categories.push(created.id);
      categoryIdMap.set(category.name.trim().toLowerCase(), created.id);

      const cPct = 25 + Math.round((cIdx / Math.max(1, blueprint.categories.length)) * 20);
      await reportProgress([...steps], {
        phase: 2,
        phaseLabel: '📁 Categories Setup',
        percent: cPct,
        current: cIdx,
        total: blueprint.categories.length,
        detail: category.name,
      });

      await sleep(CREATION_DELAY_MS);
    }
    completeStep(catStep);
  } catch (err) {
    console.error('[BuildApplier] Failed to create categories:', err);
    completeStep(catStep, true, err instanceof Error ? err.message : String(err));
    await reportProgress([...steps], {
      phase: 2,
      phaseLabel: '📁 Categories Setup',
      percent: 45,
      detail: 'Failed during category creation',
    });
    return {
      createdIds,
      steps,
      success: false,
      error: `Failed to create categories: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await reportProgress([...steps], {
    phase: 2,
    phaseLabel: '📁 Categories Setup',
    percent: 45,
  });

  // ─── Phase 3: 💬 Channels & Overwrites ─────────────────────────────────
  const totalChannels =
    blueprint.categories.reduce((s, c) => s + c.channels.length, 0) +
    (blueprint.topLevelChannels?.length ?? 0);
  const chanStep = addStep(`Phase 3: 💬 Channels & Overwrites (${totalChannels} channels)`);
  await reportProgress([...steps], {
    phase: 3,
    phaseLabel: '💬 Channels & Overwrites',
    percent: 45,
    current: 0,
    total: totalChannels,
  });

  const createdChannelMap = new Map<string, string>();
  const createdChannelList: Array<{
    id: string;
    name: string;
    sanitizedName: string;
    isTextCapable: boolean;
  }> = [];

  try {
    let chIdx = 0;
    // Channels within categories
    for (const category of blueprint.categories) {
      const parentId = categoryIdMap.get(category.name.trim().toLowerCase());

      for (const channel of category.channels) {
        chIdx++;
        const { channelId, sanitizedName } = await createChannel(
          rest,
          guildId,
          channel,
          parentId,
          roleIdMap,
          hasCommunity,
        );
        createdIds.channels.push(channelId);
        createdChannelMap.set(channel.name.trim().toLowerCase(), channelId);
        createdChannelMap.set(sanitizedName.toLowerCase(), channelId);
        createdChannelList.push({
          id: channelId,
          name: channel.name.trim().toLowerCase(),
          sanitizedName: sanitizedName.toLowerCase(),
          isTextCapable: channel.type === 'text' || channel.type === 'announcement',
        });

        const chPct = 45 + Math.round((chIdx / Math.max(1, totalChannels)) * 40);
        await reportProgress([...steps], {
          phase: 3,
          phaseLabel: '💬 Channels & Overwrites',
          percent: chPct,
          current: chIdx,
          total: totalChannels,
          detail: channel.name,
        });

        await sleep(CREATION_DELAY_MS);
      }
    }

    // Top-level channels
    for (const channel of blueprint.topLevelChannels ?? []) {
      chIdx++;
      const { channelId, sanitizedName } = await createChannel(
        rest,
        guildId,
        channel,
        undefined,
        roleIdMap,
        hasCommunity,
      );
      createdIds.channels.push(channelId);
      createdChannelMap.set(channel.name.trim().toLowerCase(), channelId);
      createdChannelMap.set(sanitizedName.toLowerCase(), channelId);
      createdChannelList.push({
        id: channelId,
        name: channel.name.trim().toLowerCase(),
        sanitizedName: sanitizedName.toLowerCase(),
        isTextCapable: channel.type === 'text' || channel.type === 'announcement',
      });

      const chPct = 45 + Math.round((chIdx / Math.max(1, totalChannels)) * 40);
      await reportProgress([...steps], {
        phase: 3,
        phaseLabel: '💬 Channels & Overwrites',
        percent: chPct,
        current: chIdx,
        total: totalChannels,
        detail: channel.name,
      });

      await sleep(CREATION_DELAY_MS);
    }

    completeStep(chanStep);
  } catch (err) {
    console.error('[BuildApplier] Failed to create channels:', err);
    completeStep(chanStep, true, err instanceof Error ? err.message : String(err));
    await reportProgress([...steps], {
      phase: 3,
      phaseLabel: '💬 Channels & Overwrites',
      percent: 85,
      detail: 'Failed during channel creation',
    });
    return {
      createdIds,
      steps,
      success: false,
      error: `Failed to create channels: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await reportProgress([...steps], {
    phase: 3,
    phaseLabel: '💬 Channels & Overwrites',
    percent: 85,
  });

  // ─── Phase 4: 📜 Welcome & Community Guidelines Deployment ──────────────
  const msgStep = addStep('Phase 4: 📜 Welcome & Community Guidelines Deployment');
  await reportProgress([...steps], {
    phase: 4,
    phaseLabel: '📜 Welcome & Community Guidelines Deployment',
    percent: 85,
    detail: 'Initializing onboarding guide deployment',
  });

  // Fallback lookup from Discord if channel not found in memory map (guarded with try/catch)
  let channelNameToId = new Map<string, string>();
  try {
    channelNameToId = await fetchChannelNameMap(rest, guildId);
  } catch (err) {
    console.warn('[BuildApplier] fetchChannelNameMap failed, falling back to local memory map:', err);
  }

  // 1. Auto-deploy onboarding guide to rules or welcome channel if available
  const onboardingChannelId =
    findTargetChannelId('rules', createdChannelMap, channelNameToId, createdChannelList) ??
    findTargetChannelId('welcome', createdChannelMap, channelNameToId, createdChannelList);

  if (onboardingChannelId) {
    try {
      const guideResult = await deployOnboardingGuide(
        guildId,
        onboardingChannelId,
        options.themeId,
        options.serverName ?? blueprint.name,
      );
      if (guideResult.success) {
        for (const msgId of guideResult.messageIds) {
          createdIds.messages.push({ channelId: onboardingChannelId, messageId: msgId });
        }
      }
    } catch (guideErr) {
      console.warn('[BuildApplier] Failed to deploy onboarding guide (non-fatal):', guideErr);
    }
  }

  await reportProgress([...steps], {
    phase: 4,
    phaseLabel: '📜 Welcome & Community Guidelines Deployment',
    percent: 92,
    detail: 'Posting blueprint setup messages',
  });

  // 2. Post custom welcome and rules messages
  const allMessages = [
    ...(blueprint.welcomeMessages ?? []),
    ...(blueprint.rulesContent ? [blueprint.rulesContent] : []),
  ];

  for (const msg of allMessages) {
    if (!msg || typeof msg !== 'object') continue;
    const rawContent = typeof msg.content === 'string' ? msg.content.trim() : '';
    if (!rawContent) {
      console.warn(`[BuildApplier] Skipping empty message for "${msg.channelRef}"`);
      continue;
    }
    const ref = typeof msg.channelRef === 'string' ? msg.channelRef.trim() : '';
    if (!ref) {
      console.warn('[BuildApplier] Skipping message with empty channelRef');
      continue;
    }

    const targetChannelId = findTargetChannelId(
      ref,
      createdChannelMap,
      channelNameToId,
      createdChannelList,
    );

    if (!targetChannelId) {
      console.warn(`[BuildApplier] Could not find suitable text channel for "${ref}" setup message`);
      continue;
    }

    // Discord max message length is 2000 characters
    const safeContent = rawContent.slice(0, 2000);

    try {
      const posted = (await discordApiCall(() =>
        rest.post(Routes.channelMessages(targetChannelId), {
          body: { content: safeContent },
        }) as Promise<{ id: string }>,
      )) as { id: string };
      createdIds.messages.push({ channelId: targetChannelId, messageId: posted.id });
      await sleep(CREATION_DELAY_MS);
    } catch (err) {
      console.warn(`[BuildApplier] Failed to post setup message to ${ref} (${targetChannelId}):`, err);
    }
  }

  completeStep(msgStep);
  await reportProgress([...steps], {
    phase: 4,
    phaseLabel: '📜 Welcome & Community Guidelines Deployment',
    percent: 100,
  });

  return { createdIds, steps, success: true };
}

/**
 * Delete all resources created during a build (rollback).
 */
export async function rollbackBuild(
  guildId: string,
  createdIds: CreatedIds,
): Promise<void> {
  const rest = getDiscordRest();

  // Delete messages
  for (const { channelId, messageId } of createdIds.messages) {
    try {
      await discordApiCall(() =>
        rest.delete(Routes.channelMessage(channelId, messageId)),
      );
      await sleep(CREATION_DELAY_MS);
    } catch {
      // Ignore — channel may already be deleted
    }
  }

  // Delete channels (and categories)
  for (const channelId of [...createdIds.channels, ...createdIds.categories]) {
    try {
      await discordApiCall(() =>
        rest.delete(Routes.channel(channelId)),
      );
      await sleep(CREATION_DELAY_MS);
    } catch {
      // Ignore
    }
  }

  // Delete roles (skip @everyone role which cannot be deleted)
  for (const roleId of createdIds.roles) {
    if (roleId === guildId) continue;
    try {
      await discordApiCall(() =>
        rest.delete(Routes.guildRole(guildId, roleId)),
      );
      await sleep(CREATION_DELAY_MS);
    } catch {
      // Ignore
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPermissionOverwrites(
  overwrites: Array<{
    roleRef: string;
    allow: string[];
    deny: string[];
  }>,
  roleIdMap: Map<string, string>,
  guildId: string,
): Array<{ id: string; type: 0; allow: string; deny: string }> {
  const map = new Map<string, { allowBits: bigint; denyBits: bigint }>();

  for (const ow of overwrites) {
    const cleanRef = ow.roleRef.trim().toLowerCase();
    let roleId: string | undefined;

    if (cleanRef === '@everyone' || cleanRef === 'everyone') {
      roleId = guildId;
    } else {
      const noAt = cleanRef.replace(/^@/, '');
      roleId = roleIdMap.get(cleanRef) ?? roleIdMap.get(noAt);
    }

    if (!roleId) {
      console.warn(`[BuildApplier] Could not find role "${ow.roleRef}" for permission overwrite`);
      continue;
    }

    const allowBits = ow.allow.reduce((acc, flag) => {
      const bit = (PermissionFlags as Record<string, bigint>)[flag];
      return bit ? acc | bit : acc;
    }, 0n);

    const denyBits = ow.deny.reduce((acc, flag) => {
      const bit = (PermissionFlags as Record<string, bigint>)[flag];
      return bit ? acc | bit : acc;
    }, 0n);

    const existing = map.get(roleId);
    if (existing) {
      existing.allowBits |= allowBits;
      existing.denyBits |= denyBits;
    } else {
      map.set(roleId, { allowBits, denyBits });
    }
  }

  return Array.from(map.entries()).map(([id, { allowBits, denyBits }]) => ({
    id,
    type: 0 as const,
    allow: allowBits.toString(),
    deny: denyBits.toString(),
  }));
}

function mergeOverwrites(
  overwrites: Array<{ id: string; type: 0; allow: string; deny: string }>,
): Array<{ id: string; type: 0; allow: string; deny: string }> {
  const map = new Map<string, { allowBits: bigint; denyBits: bigint }>();
  for (const ow of overwrites) {
    const allowBits = BigInt(ow.allow || '0');
    const denyBits = BigInt(ow.deny || '0');
    const existing = map.get(ow.id);
    if (existing) {
      existing.allowBits |= allowBits;
      existing.denyBits |= denyBits;
    } else {
      map.set(ow.id, { allowBits, denyBits });
    }
  }
  return Array.from(map.entries()).map(([id, { allowBits, denyBits }]) => ({
    id,
    type: 0 as const,
    allow: allowBits.toString(),
    deny: denyBits.toString(),
  }));
}

async function createChannel(
  rest: ReturnType<typeof getDiscordRest>,
  guildId: string,
  channel: ServerBlueprint['categories'][0]['channels'][0],
  parentId: string | undefined,
  roleIdMap: Map<string, string>,
  hasCommunity: boolean,
): Promise<{ channelId: string; sanitizedName: string }> {
  let targetType: ChannelType;
  if (channel.type === 'text') {
    targetType = ChannelType.GuildText;
  } else if (channel.type === 'voice') {
    targetType = ChannelType.GuildVoice;
  } else if (channel.type === 'forum') {
    targetType = ChannelType.GuildForum;
  } else if (channel.type === 'announcement') {
    // Announcement channels require the COMMUNITY feature on Discord; fallback to GuildText if absent
    targetType = hasCommunity ? ChannelType.GuildAnnouncement : ChannelType.GuildText;
  } else if (channel.type === 'stage') {
    // Stage channels require the COMMUNITY feature on Discord; fallback to GuildVoice if absent
    targetType = hasCommunity ? ChannelType.GuildStageVoice : ChannelType.GuildVoice;
  } else {
    targetType = ChannelType.GuildText;
  }

  const isVoiceOrStage =
    targetType === ChannelType.GuildVoice || targetType === ChannelType.GuildStageVoice;
  const sanitizedName = sanitizeChannelName(channel.name, isVoiceOrStage);

  // Topic: Only GuildText, GuildAnnouncement, and GuildForum support topics.
  // Discord rejects topics on Voice/Stage channels with 50035 CHANNEL_TOPIC_INVALID!
  let topic: string | undefined = undefined;
  if (
    targetType === ChannelType.GuildText ||
    targetType === ChannelType.GuildAnnouncement
  ) {
    topic = channel.topic ? channel.topic.trim().slice(0, CHANNEL_TOPIC_MAX) : undefined;
  } else if (targetType === ChannelType.GuildForum) {
    topic = channel.topic ? channel.topic.trim().slice(0, FORUM_TOPIC_MAX) : undefined;
  }

  const rawOverwrites: Array<{ id: string; type: 0; allow: string; deny: string }> = [];

  // If private: deny VIEW_CHANNEL for @everyone
  if (channel.isPrivate) {
    // @everyone role ID == guildId
    rawOverwrites.push({
      id: guildId,
      type: 0,
      allow: '0',
      deny: PermissionFlags.VIEW_CHANNEL.toString(),
    });

    // Allow VIEW_CHANNEL for specified roles
    for (const roleName of channel.privateRoles ?? []) {
      const cleanRef = roleName.trim().toLowerCase();
      const noAt = cleanRef.replace(/^@/, '');
      const roleId = roleIdMap.get(cleanRef) ?? roleIdMap.get(noAt);
      if (roleId) {
        rawOverwrites.push({
          id: roleId,
          type: 0,
          allow: PermissionFlags.VIEW_CHANNEL.toString(),
          deny: '0',
        });
      }
    }
  }

  // Add explicit permission overwrites
  if (channel.permissionOverwrites && channel.permissionOverwrites.length > 0) {
    rawOverwrites.push(
      ...buildPermissionOverwrites(channel.permissionOverwrites, roleIdMap, guildId),
    );
  }

  const permissionOverwrites = mergeOverwrites(rawOverwrites);

  const rateLimit =
    typeof channel.slowmode === 'number' && channel.slowmode >= 0
      ? Math.min(channel.slowmode, 21600)
      : undefined;

  const body: RESTPostAPIGuildChannelJSONBody = {
    name: sanitizedName,
    type: targetType as RESTPostAPIGuildChannelJSONBody['type'],
    ...(topic ? { topic } : {}),
    ...(channel.nsfw !== undefined ? { nsfw: channel.nsfw } : {}),
    ...(rateLimit !== undefined ? { rate_limit_per_user: rateLimit } : {}),
    ...(parentId ? { parent_id: parentId } : {}),
    ...(permissionOverwrites.length > 0 ? { permission_overwrites: permissionOverwrites } : {}),
  };

  const created = (await discordApiCall(() =>
    rest.post(Routes.guildChannels(guildId), { body }),
  )) as { id: string };

  return { channelId: created.id, sanitizedName };
}

async function fetchChannelNameMap(
  rest: ReturnType<typeof getDiscordRest>,
  guildId: string,
): Promise<Map<string, string>> {
  const channels = (await discordApiCall(() =>
    rest.get(Routes.guildChannels(guildId)),
  )) as Array<{ id: string; name: string }>;

  const map = new Map<string, string>();
  for (const ch of channels) {
    map.set(ch.name.toLowerCase(), ch.id);
  }
  return map;
}

function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/g, '')
    .replace(/\s+/g, '');
}

function findTargetChannelId(
  channelRef: string,
  createdChannelMap: Map<string, string>,
  channelNameToId: Map<string, string>,
  createdChannelList: Array<{
    id: string;
    name: string;
    sanitizedName: string;
    isTextCapable: boolean;
  }>,
): string | undefined {
  const rawRef = channelRef.trim().toLowerCase();
  const cleanRef = rawRef.replace(/^#/, '');

  // 1. Direct match in createdChannelMap
  const directId = createdChannelMap.get(rawRef) ?? createdChannelMap.get(cleanRef);
  if (directId) return directId;

  // 2. Direct match in channelNameToId (from Discord API)
  const discordApiId = channelNameToId.get(rawRef) ?? channelNameToId.get(cleanRef);
  if (discordApiId) return discordApiId;

  // 3. Normalized exact match (e.g. "welcome" vs "👋-welcome")
  const normRef = normalizeChannelName(cleanRef);
  for (const ch of createdChannelList) {
    if (
      normalizeChannelName(ch.name) === normRef ||
      normalizeChannelName(ch.sanitizedName) === normRef
    ) {
      return ch.id;
    }
  }

  // 4. Substring / keyword match in createdChannelList
  if (normRef.length >= 3) {
    for (const ch of createdChannelList) {
      const normCh = normalizeChannelName(ch.name);
      if (normCh.includes(normRef) || normRef.includes(normCh)) {
        return ch.id;
      }
    }
  }

  // Common heuristics
  if (normRef.includes('welcome') || normRef.includes('start') || normRef.includes('intro')) {
    const welcomeCh = createdChannelList.find(
      (c) =>
        c.isTextCapable &&
        (normalizeChannelName(c.name).includes('welcome') ||
          normalizeChannelName(c.name).includes('start') ||
          normalizeChannelName(c.name).includes('intro')),
    );
    if (welcomeCh) return welcomeCh.id;
  }

  if (
    normRef.includes('rule') ||
    normRef.includes('guideline') ||
    normRef.includes('info') ||
    normRef.includes('faq')
  ) {
    const rulesCh = createdChannelList.find(
      (c) =>
        c.isTextCapable &&
        (normalizeChannelName(c.name).includes('rule') ||
          normalizeChannelName(c.name).includes('guideline') ||
          normalizeChannelName(c.name).includes('info') ||
          normalizeChannelName(c.name).includes('faq')),
    );
    if (rulesCh) return rulesCh.id;
  }

  // 5. Fallback: first text-capable channel created in this build
  const firstText = createdChannelList.find((c) => c.isTextCapable);
  if (firstText) {
    console.info(
      `[BuildApplier] Falling back channel for "${channelRef}" to first text channel "${firstText.name}" (${firstText.id})`,
    );
    return firstText.id;
  }

  return undefined;
}

// ─── High-Level Job Orchestrator with Dynamic Live Progress ─────────────────

export interface ApplyBuildJobOptions {
  jobId: string;
  interactionToken: string;
  userId?: string;
  themeId?: string;
}

/**
 * Orchestrates the application of a BuildJob with live themed 4-phase visual progress updates.
 * Throttles Discord interaction edits to avoid 429 rate limits.
 */
export async function applyBuildJob(
  options: ApplyBuildJobOptions,
): Promise<ApplyBlueprintResult> {
  await connectDB();
  const { jobId, interactionToken, userId } = options;

  const job = await BuildJob.findById(jobId);
  if (!job) {
    throw new Error('Build job not found');
  }

  if (job.status !== 'preview') {
    throw new Error(`Build job is not in preview state (current status: ${job.status})`);
  }

  if (userId && job.userId !== userId) {
    throw new Error('Unauthorized: only the build initiator can confirm this build');
  }

  const previousToken = job.interactionToken;
  const targetBlueprint = (job.blueprint ?? {}) as ServerBlueprint;
  job.status = 'running';
  job.interactionToken = interactionToken;
  await job.save();

  // Helper to safely edit interaction response trying current token then previous token
  const safeEdit = async (payload: Parameters<typeof editInteractionResponse>[1]) => {
    try {
      await editInteractionResponse(interactionToken, payload);
      return;
    } catch (err) {
      console.warn('[applyBuildJob] editInteractionResponse with current token failed:', err);
    }

    if (previousToken && previousToken !== interactionToken) {
      try {
        await editInteractionResponse(previousToken, payload);
      } catch (err2) {
        console.warn('[applyBuildJob] editInteractionResponse with previousToken failed:', err2);
      }
    }
  };

  // Resolve theme
  let resolvedThemeId = options.themeId;
  if (!resolvedThemeId) {
    try {
      resolvedThemeId = await getServerTheme(job.guildId);
    } catch {
      resolvedThemeId = 'cyberpunk';
    }
  }
  const themeConfig = getTheme(resolvedThemeId);

  // 4-phase tracker
  const phases: Array<{
    phase: 1 | 2 | 3 | 4;
    name: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    detail?: string;
  }> = [
    { phase: 1, name: 'Phase 1: 🎭 Roles Hierarchy', status: 'pending' },
    { phase: 2, name: 'Phase 2: 📁 Categories Setup', status: 'pending' },
    { phase: 3, name: 'Phase 3: 💬 Channels & Overwrites', status: 'pending' },
    { phase: 4, name: 'Phase 4: 📜 Welcome & Community Guidelines Deployment', status: 'pending' },
  ];

  let currentPercent = 0;
  let lastEditTimestamp = 0;
  const THROTTLE_INTERVAL_MS = 1500;

  function buildLiveProgressEmbed(): DiscordEmbed {
    const statusEmoji: Record<string, string> = {
      pending: '⏱️',
      running: '⏳',
      done: '✅',
      failed: '❌',
    };

    const phaseLines = phases
      .map((p) => `${statusEmoji[p.status]} **${p.name}**${p.detail ? ` — *${p.detail}*` : ''}`)
      .join('\n');

    const blueprintName = targetBlueprint?.name || 'Server Architecture';

    return clampEmbed({
      color: themeConfig.primaryColor,
      title: formatThemedHeader(themeConfig, 'BUILD PROGRESS'),
      description:
        `**Target Blueprint:** ${blueprintName}\n\n` +
        `**Overall Progress:**\n` +
        `${renderThemedProgressBar(currentPercent, themeConfig.barStyle, 14)}\n\n` +
        `**Phases:**\n` +
        `${phaseLines}`,
      footer: {
        text: 'AiCord Server Architect • Live Construction',
      },
    });
  }

  async function updateInteraction(force = false) {
    const now = Date.now();
    if (!force && now - lastEditTimestamp < THROTTLE_INTERVAL_MS) {
      return;
    }
    lastEditTimestamp = now;

    const embed = buildLiveProgressEmbed();
    await safeEdit({
      embeds: [embed],
      components: [],
    });
  }

  // Initial update displaying 0%
  await updateInteraction(true);

  try {
    const result = await applyBlueprint({
      guildId: job.guildId,
      blueprint: job.blueprint as ServerBlueprint,
      themeId: resolvedThemeId,
      serverName: (job.blueprint as ServerBlueprint)?.name,
      onProgress: async (steps, meta) => {
        job.steps = steps;
        await job.save().catch(() => {});

        if (meta) {
          currentPercent = meta.percent;
          for (const p of phases) {
            if (p.phase < meta.phase) {
              p.status = 'done';
            } else if (p.phase === meta.phase) {
              p.status = meta.percent >= 100 && meta.phase === 4 ? 'done' : 'running';
              if (meta.detail) p.detail = meta.detail;
            } else {
              p.status = 'pending';
            }
          }
        }
        await updateInteraction(false);
      },
    });

    if (result.success) {
      currentPercent = 100;
      for (const p of phases) {
        p.status = 'done';
      }
      await updateInteraction(true);

      job.status = 'done';
      job.createdIds = result.createdIds;
      job.steps = result.steps;
      await job.save();

      const completionEmbed = buildBuildCompletionEmbed(
        job.blueprint as ServerBlueprint,
        result.createdIds,
        result.steps,
      );

      await safeEdit({
        embeds: [completionEmbed],
        components: [buildUndoRow(job._id.toString())],
      });

      return result;
    } else {
      for (const p of phases) {
        if (p.status === 'running') p.status = 'failed';
      }
      await updateInteraction(true);

      job.status = 'failed';
      job.errorMessage = result.error;
      job.createdIds = result.createdIds;
      job.steps = result.steps;
      await job.save();

      const hasCreatedItems =
        (result.createdIds.roles?.length ?? 0) > 0 ||
        (result.createdIds.categories?.length ?? 0) > 0 ||
        (result.createdIds.channels?.length ?? 0) > 0;

      await safeEdit({
        embeds: [
          buildLiveProgressEmbed(),
          errorEmbed('Build Error', result.error ?? 'An unknown error occurred during build execution'),
        ],
        components: hasCreatedItems ? [buildUndoRow(job._id.toString())] : [],
      });

      return result;
    }
  } catch (err) {
    console.error('[applyBuildJob] Unexpected build error:', err);
    for (const p of phases) {
      if (p.status === 'running') p.status = 'failed';
    }

    job.status = 'failed';
    job.errorMessage = err instanceof Error ? err.message : String(err);
    await job.save().catch(() => {});

    await safeEdit({
      embeds: [
        buildLiveProgressEmbed(),
        errorEmbed('Build Error', err instanceof Error ? err.message : 'An unexpected build error occurred'),
      ],
      components: [buildUndoRow(job._id.toString())],
    });

    throw err;
  }
}
