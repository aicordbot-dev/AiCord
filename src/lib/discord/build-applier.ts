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

const CREATION_DELAY_MS = 300; // Delay between API calls to respect rate limits

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ApplyBlueprintOptions {
  guildId: string;
  blueprint: ServerBlueprint;
  onProgress: (steps: BuildStep[]) => Promise<void>;
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

  async function reportProgress(progressSteps: BuildStep[]): Promise<void> {
    try {
      await onProgress(progressSteps);
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

  // ─── 1. Create Roles (highest to lowest) ──────────────────────────────
  // Filter out @everyone since Discord guilds already have @everyone and creating it makes a fake role
  const rolesToCreate = blueprint.roles.filter(
    (r) => r.name.toLowerCase() !== '@everyone' && r.name.toLowerCase() !== 'everyone',
  );

  const roleStep = addStep(`Creating ${rolesToCreate.length} roles`);
  await reportProgress([...steps]);

  try {
    for (const role of rolesToCreate) {
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
      await sleep(CREATION_DELAY_MS);
    }
    completeStep(roleStep);
  } catch (err) {
    console.error('[BuildApplier] Failed to create roles:', err);
    completeStep(roleStep, true, err instanceof Error ? err.message : String(err));
    await reportProgress([...steps]);
    return {
      createdIds,
      steps,
      success: false,
      error: `Failed to create roles: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await reportProgress([...steps]);

  // ─── 2. Create Categories ───────────────────────────────────────────────
  const categoryIdMap = new Map<string, string>(); // categoryName -> channelId

  const catStep = addStep(`Creating ${blueprint.categories.length} categories`);
  await reportProgress([...steps]);

  try {
    for (const category of blueprint.categories) {
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
      await sleep(CREATION_DELAY_MS);
    }
    completeStep(catStep);
  } catch (err) {
    console.error('[BuildApplier] Failed to create categories:', err);
    completeStep(catStep, true, err instanceof Error ? err.message : String(err));
    await reportProgress([...steps]);
    return {
      createdIds,
      steps,
      success: false,
      error: `Failed to create categories: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await reportProgress([...steps]);

  // ─── 3. Create Channels ─────────────────────────────────────────────────
  const totalChannels =
    blueprint.categories.reduce((s, c) => s + c.channels.length, 0) +
    (blueprint.topLevelChannels?.length ?? 0);
  const chanStep = addStep(`Creating ${totalChannels} channels`);
  await reportProgress([...steps]);

  const createdChannelMap = new Map<string, string>();
  const createdChannelList: Array<{
    id: string;
    name: string;
    sanitizedName: string;
    isTextCapable: boolean;
  }> = [];

  try {
    // Channels within categories
    for (const category of blueprint.categories) {
      const parentId = categoryIdMap.get(category.name.trim().toLowerCase());

      for (const channel of category.channels) {
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
        await sleep(CREATION_DELAY_MS);
      }
    }

    // Top-level channels
    for (const channel of blueprint.topLevelChannels ?? []) {
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
      await sleep(CREATION_DELAY_MS);
    }

    completeStep(chanStep);
  } catch (err) {
    console.error('[BuildApplier] Failed to create channels:', err);
    completeStep(chanStep, true, err instanceof Error ? err.message : String(err));
    await reportProgress([...steps]);
    return {
      createdIds,
      steps,
      success: false,
      error: `Failed to create channels: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await reportProgress([...steps]);

  // ─── 4. Post Welcome & Rules Messages ──────────────────────────────────
  const allMessages = [
    ...(blueprint.welcomeMessages ?? []),
    ...(blueprint.rulesContent ? [blueprint.rulesContent] : []),
  ];

  if (allMessages.length > 0) {
    const msgStep = addStep(`Posting ${allMessages.length} setup messages`);
    await reportProgress([...steps]);

    // Fallback lookup from Discord if channel not found in memory map (guarded with try/catch)
    let channelNameToId = new Map<string, string>();
    try {
      channelNameToId = await fetchChannelNameMap(rest, guildId);
    } catch (err) {
      console.warn('[BuildApplier] fetchChannelNameMap failed, falling back to local memory map:', err);
    }

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
    await reportProgress([...steps]);
  }

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
