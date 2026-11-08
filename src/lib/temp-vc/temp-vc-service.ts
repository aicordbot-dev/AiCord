/**
 * src/lib/temp-vc/temp-vc-service.ts
 * Dynamic Temporary Auto-Voice Rooms ("Join-to-Create") Engine for AiCord.
 *
 * Responsibilities:
 * - In-memory zero-network test store for unit testing
 * - Server configuration management (hub channel, category, naming pattern, default limits)
 * - Room lifecycle: create, lock/unlock, user limit, rename, transfer ownership, delete
 * - Discord REST channel specification & permission overwrite generation
 * - Interactive room dashboard embed and action row component builders
 */

import { ChannelType, Routes } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import {
  TempVoiceConfig,
  TempVoiceRoom,
  type ITempVoiceConfig,
  type ITempVoiceRoom,
} from '@/models';
import { PermissionFlags } from '@/lib/discord/permissions';
import { type DiscordEmbed, clampEmbed } from '@/lib/discord/embeds';
import {
  buildActionRow,
  buildButton,
  type ActionRow,
} from '@/lib/discord/interaction-response';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';

// Re-export types
export type { ITempVoiceConfig, ITempVoiceRoom };

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DiscordOverwrite {
  id: string;
  type: number; // 0: Role, 1: Member
  allow: string;
  deny: string;
}

export interface DiscordChannelSpec {
  name: string;
  type: number; // ChannelType.GuildVoice = 2
  parent_id?: string;
  user_limit?: number;
  permission_overwrites: DiscordOverwrite[];
}

// ─── In-Memory Test Store ─────────────────────────────────────────────────────

let testMode = false;
const testConfigs = new Map<string, ITempVoiceConfig>();
const testRooms = new Map<string, ITempVoiceRoom>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testConfigs.clear();
  testRooms.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestConfig(
  guildId: string,
  config: Partial<ITempVoiceConfig>,
): void {
  const current = testConfigs.get(guildId);
  const updated = {
    guildId,
    hubChannelId: config.hubChannelId ?? current?.hubChannelId ?? 'hub_chan_default',
    categoryId: config.categoryId ?? current?.categoryId,
    defaultLimit: config.defaultLimit ?? current?.defaultLimit ?? 0,
    namingScheme: config.namingScheme ?? current?.namingScheme ?? "{username}'s Lounge",
    enabled: config.enabled ?? current?.enabled ?? true,
    createdAt: current?.createdAt ?? new Date(),
    updatedAt: new Date(),
  } as unknown as ITempVoiceConfig;
  testConfigs.set(guildId, updated);
}

export function getTestConfig(guildId: string): ITempVoiceConfig | undefined {
  return testConfigs.get(guildId);
}

export function setTestRoom(
  guildId: string,
  channelId: string,
  room: Partial<ITempVoiceRoom>,
): void {
  const key = `${guildId}:${channelId}`;
  const current = testRooms.get(key);
  const updated = {
    guildId,
    channelId,
    ownerId: room.ownerId ?? current?.ownerId ?? 'user_default',
    ownerTag: room.ownerTag ?? current?.ownerTag ?? 'Member',
    isLocked: room.isLocked ?? current?.isLocked ?? false,
    userLimit: room.userLimit ?? current?.userLimit ?? 0,
    name: room.name ?? current?.name ?? "Member's Lounge",
    createdAt: current?.createdAt ?? new Date(),
    updatedAt: new Date(),
  } as unknown as ITempVoiceRoom;
  testRooms.set(key, updated);
}

export function getTestRoom(
  guildId: string,
  channelId: string,
): ITempVoiceRoom | undefined {
  return testRooms.get(`${guildId}:${channelId}`);
}

export function getAllTestRooms(guildId?: string): ITempVoiceRoom[] {
  const all = Array.from(testRooms.values());
  if (guildId) {
    return all.filter((r) => r.guildId === guildId);
  }
  return all;
}

// ─── Configuration Helpers ───────────────────────────────────────────────────

export async function getTempVoiceConfig(
  guildId: string,
): Promise<ITempVoiceConfig | null> {
  if (!guildId) return null;

  if (testMode) {
    return testConfigs.get(guildId) ?? null;
  }

  await connectDB();
  return await TempVoiceConfig.findOne({ guildId });
}

export async function setTempVoiceConfig(
  guildId: string,
  updates: Partial<ITempVoiceConfig>,
): Promise<ITempVoiceConfig> {
  if (testMode) {
    const existing = testConfigs.get(guildId);
    const updated = {
      guildId,
      hubChannelId: updates.hubChannelId ?? existing?.hubChannelId ?? '',
      categoryId: updates.categoryId !== undefined ? updates.categoryId : existing?.categoryId,
      defaultLimit: updates.defaultLimit ?? existing?.defaultLimit ?? 0,
      namingScheme: updates.namingScheme ?? existing?.namingScheme ?? "{username}'s Lounge",
      enabled: updates.enabled ?? existing?.enabled ?? true,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    } as unknown as ITempVoiceConfig;
    testConfigs.set(guildId, updated);
    return updated;
  }

  await connectDB();
  const config = await TempVoiceConfig.findOneAndUpdate(
    { guildId },
    { $set: updates },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return config;
}

// ─── Lifecycle & Room Management ─────────────────────────────────────────────

/**
 * Sanitize voice room name to comply with Discord channel rules (1-100 characters).
 */
export function sanitizeRoomName(name: string, fallbackUserTag = 'Member'): string {
  const trimmed = name?.trim() || '';
  if (!trimmed) {
    return `${fallbackUserTag}'s Lounge`;
  }
  return trimmed.slice(0, 100);
}

/**
 * Creates a new temporary voice room specification and database record.
 */
export async function createTempVoiceRoom(
  guildId: string,
  userId: string,
  userTag: string,
  customName?: string,
  customLimit?: number,
  channelIdOverride?: string,
): Promise<{ channelSpec: DiscordChannelSpec; room: ITempVoiceRoom }> {
  const config = await getTempVoiceConfig(guildId);

  if (config && !config.enabled) {
    throw new Error('Temporary voice rooms are currently disabled on this server.');
  }

  // 1. Resolve room title
  const namingScheme = customName?.trim()
    ? customName.trim()
    : config?.namingScheme || "{username}'s Lounge";
  const rawName = namingScheme.replace(/\{username\}/gi, userTag || 'Member');
  const finalName = sanitizeRoomName(rawName, userTag);

  // 2. Resolve room limit
  let userLimit = 0;
  if (customLimit !== undefined && customLimit !== null) {
    userLimit = Math.max(0, Math.min(99, Math.floor(customLimit)));
  } else if (config?.defaultLimit !== undefined && config?.defaultLimit !== null) {
    userLimit = Math.max(0, Math.min(99, Math.floor(config.defaultLimit)));
  }

  // 3. Discord Permission Overwrites: owner granted MANAGE_CHANNELS and MOVE_MEMBERS (plus CONNECT)
  const ownerAllowBits = (
    PermissionFlags.MANAGE_CHANNELS |
    PermissionFlags.MOVE_MEMBERS |
    PermissionFlags.CONNECT |
    PermissionFlags.VIEW_CHANNEL
  ).toString();

  const permissionOverwrites: DiscordOverwrite[] = [
    {
      id: userId,
      type: 1, // Member
      allow: ownerAllowBits,
      deny: '0',
    },
  ];

  const channelSpec: DiscordChannelSpec = {
    name: finalName,
    type: ChannelType.GuildVoice, // 2
    parent_id: config?.categoryId || undefined,
    user_limit: userLimit,
    permission_overwrites: permissionOverwrites,
  };

  // 4. Persist Room Record
  const channelId = channelIdOverride || `tvc_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  if (testMode) {
    const roomRecord = {
      guildId,
      channelId,
      ownerId: userId,
      ownerTag: userTag || 'Member',
      isLocked: false,
      userLimit,
      name: finalName,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ITempVoiceRoom;
    testRooms.set(`${guildId}:${channelId}`, roomRecord);
    return { channelSpec, room: roomRecord };
  }

  await connectDB();
  const room = await TempVoiceRoom.create({
    guildId,
    channelId,
    ownerId: userId,
    ownerTag: userTag || 'Member',
    isLocked: false,
    userLimit,
    name: finalName,
    createdAt: new Date(),
  });

  return { channelSpec, room };
}

export async function getTempVoiceRoom(
  guildId: string,
  channelId: string,
): Promise<ITempVoiceRoom | null> {
  if (!guildId || !channelId) return null;

  if (testMode) {
    return testRooms.get(`${guildId}:${channelId}`) ?? null;
  }

  await connectDB();
  return await TempVoiceRoom.findOne({ guildId, channelId });
}

export async function getTempVoiceRoomByOwner(
  guildId: string,
  ownerId: string,
): Promise<ITempVoiceRoom | null> {
  if (!guildId || !ownerId) return null;

  if (testMode) {
    for (const room of testRooms.values()) {
      if (room.guildId === guildId && room.ownerId === ownerId) {
        return room;
      }
    }
    return null;
  }

  await connectDB();
  return await TempVoiceRoom.findOne({ guildId, ownerId });
}

/**
 * Toggles room lock status.
 * Returns updated room, lock state, and the Discord permission overwrite to apply to @everyone.
 */
export async function toggleRoomLock(
  guildId: string,
  channelId: string,
  requesterId: string,
  isMod = false,
): Promise<{ room: ITempVoiceRoom; isLocked: boolean; overwrite: DiscordOverwrite }> {
  const room = await getTempVoiceRoom(guildId, channelId);
  if (!room) {
    throw new Error('Temp voice room not found.');
  }

  if (room.ownerId !== requesterId && !isMod) {
    throw new Error('Only the room owner or a moderator can lock/unlock this room.');
  }

  const nextLocked = !room.isLocked;
  room.isLocked = nextLocked;

  const overwrite: DiscordOverwrite = {
    id: guildId, // @everyone role ID is the guild ID in Discord
    type: 0, // Role
    allow: '0',
    deny: nextLocked ? PermissionFlags.CONNECT.toString() : '0',
  };

  if (testMode) {
    testRooms.set(`${guildId}:${channelId}`, room);
    return { room, isLocked: nextLocked, overwrite };
  }

  await connectDB();
  await TempVoiceRoom.updateOne(
    { guildId, channelId },
    { $set: { isLocked: nextLocked } },
  );

  return { room, isLocked: nextLocked, overwrite };
}

/**
 * Sets the user limit for a voice room (clamped between 0 and 99).
 */
export async function setRoomLimit(
  guildId: string,
  channelId: string,
  requesterId: string,
  limit: number,
  isMod = false,
): Promise<ITempVoiceRoom> {
  const room = await getTempVoiceRoom(guildId, channelId);
  if (!room) {
    throw new Error('Temp voice room not found.');
  }

  if (room.ownerId !== requesterId && !isMod) {
    throw new Error('Only the room owner or a moderator can change the user limit.');
  }

  const clamped = Math.max(0, Math.min(99, Math.floor(limit)));
  room.userLimit = clamped;

  if (testMode) {
    testRooms.set(`${guildId}:${channelId}`, room);
    return room;
  }

  await connectDB();
  await TempVoiceRoom.updateOne(
    { guildId, channelId },
    { $set: { userLimit: clamped } },
  );

  return room;
}

/**
 * Renames a temporary voice room.
 */
export async function renameRoom(
  guildId: string,
  channelId: string,
  requesterId: string,
  newName: string,
  isMod = false,
): Promise<ITempVoiceRoom> {
  const room = await getTempVoiceRoom(guildId, channelId);
  if (!room) {
    throw new Error('Temp voice room not found.');
  }

  if (room.ownerId !== requesterId && !isMod) {
    throw new Error('Only the room owner or a moderator can rename this room.');
  }

  const sanitized = sanitizeRoomName(newName, room.ownerTag);
  if (!sanitized) {
    throw new Error('Room name cannot be empty.');
  }

  room.name = sanitized;

  if (testMode) {
    testRooms.set(`${guildId}:${channelId}`, room);
    return room;
  }

  await connectDB();
  await TempVoiceRoom.updateOne(
    { guildId, channelId },
    { $set: { name: sanitized } },
  );

  return room;
}

/**
 * Transfers ownership of a temporary voice room to another server member.
 */
export async function transferRoomOwnership(
  guildId: string,
  channelId: string,
  currentOwnerId: string,
  newOwnerId: string,
  newOwnerTag: string,
  isMod = false,
): Promise<ITempVoiceRoom> {
  const room = await getTempVoiceRoom(guildId, channelId);
  if (!room) {
    throw new Error('Temp voice room not found.');
  }

  if (room.ownerId !== currentOwnerId && !isMod) {
    throw new Error('Only the current room owner or a moderator can transfer ownership.');
  }

  room.ownerId = newOwnerId;
  room.ownerTag = newOwnerTag || 'Member';

  if (testMode) {
    testRooms.set(`${guildId}:${channelId}`, room);
    return room;
  }

  await connectDB();
  await TempVoiceRoom.updateOne(
    { guildId, channelId },
    { $set: { ownerId: newOwnerId, ownerTag: room.ownerTag } },
  );

  return room;
}

/**
 * Deletes a temporary voice room record when empty or disbanded.
 */
export async function deleteTempVoiceRoom(
  guildId: string,
  channelId: string,
): Promise<boolean> {
  if (testMode) {
    return testRooms.delete(`${guildId}:${channelId}`);
  }

  await connectDB();
  const res = await TempVoiceRoom.deleteOne({ guildId, channelId });
  return res.deletedCount > 0;
}

// ─── Dashboard Embed & Component Builders ─────────────────────────────────────

export function buildRoomDashboardEmbed(room: ITempVoiceRoom): DiscordEmbed {
  const limitDisplay = room.userLimit > 0 ? `${room.userLimit} Users` : 'Unlimited';
  const statusDisplay = room.isLocked ? '🔒 Locked' : '🟢 Unlocked';

  return clampEmbed({
    title: `🔊 ${room.name}`,
    description: `Dynamic temporary voice room owned by <@${room.ownerId}>.\nUse the interactive buttons below or \`/temp-vc\` commands to manage your channel.`,
    color: room.isLocked ? 0xed4245 : 0x5865f2,
    fields: [
      {
        name: '👑 Owner',
        value: `<@${room.ownerId}> (\`${room.ownerTag}\`)`,
        inline: true,
      },
      {
        name: '🔒 Status',
        value: statusDisplay,
        inline: true,
      },
      {
        name: '👥 Limit',
        value: `👥 ${limitDisplay}`,
        inline: true,
      },
      {
        name: '🎛️ Quick Room Controls',
        value: [
          '• **Lock / Unlock**: Toggle privacy for server members',
          '• **Limit Slots**: Cycle maximum concurrent speakers',
          '• **Rename**: Change channel title via `/temp-vc rename`',
          '• **Transfer**: Transfer ownership via `/temp-vc transfer`',
        ].join('\n'),
      },
    ],
    footer: {
      text: 'AiCord Dynamic Voice Engine • Auto-deletes when empty',
    },
    timestamp: new Date().toISOString(),
  });
}

export function buildRoomDashboardComponents(room: ITempVoiceRoom): ActionRow[] {
  return [
    buildActionRow(
      buildButton({
        style: room.isLocked ? 3 : 2,
        label: room.isLocked ? 'Unlock Room' : 'Lock Room',
        customId: `tvc_lock:${room.channelId}`,
        emoji: room.isLocked ? '🔓' : '🔒',
      }),
      buildButton({
        style: 2,
        label: 'Limit Slots',
        customId: `tvc_limit:${room.channelId}`,
        emoji: '👥',
      }),
      buildButton({
        style: 2,
        label: 'Rename',
        customId: `tvc_rename:${room.channelId}`,
        emoji: '✏️',
      }),
      buildButton({
        style: 2,
        label: 'Status',
        customId: `tvc_status:${room.channelId}`,
        emoji: 'ℹ️',
      }),
    ),
  ];
}
