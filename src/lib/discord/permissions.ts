/**
 * src/lib/discord/permissions.ts
 * Discord permission bit manipulation utilities.
 * Uses BigInt as Discord permissions are 53-bit integers.
 */

// Common permission flags
export const PermissionFlags = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_GUILD_EXPRESSIONS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  REQUEST_TO_SPEAK: 1n << 32n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  USE_EMBEDDED_ACTIVITIES: 1n << 39n,
  MODERATE_MEMBERS: 1n << 40n, // Timeout
} as const;

export type PermissionFlag = keyof typeof PermissionFlags;

/**
 * Check if a permission bit set includes a specific flag.
 */
export function hasPermission(permissions: string | bigint, flag: bigint): boolean {
  const bits = typeof permissions === 'string' ? BigInt(permissions) : permissions;
  if (bits & PermissionFlags.ADMINISTRATOR) return true; // Administrator bypasses all checks
  return (bits & flag) === flag;
}

/**
 * Check if a permission bit set includes ALL of the given flags.
 */
export function hasAllPermissions(permissions: string | bigint, ...flags: bigint[]): boolean {
  return flags.every((flag) => hasPermission(permissions, flag));
}

/**
 * Compute resolved permissions for a member in a channel.
 * Applies: guild-level @everyone → guild-level role perms → channel overwrites.
 */
export function computePermissions(
  everyonePerms: string,
  rolePerms: string[],
  channelOverwrites?: Array<{
    id: string;
    type: number; // 0=role, 1=member
    allow: string;
    deny: string;
    roleId?: string;
    memberId?: string;
  }>,
  memberId?: string,
  memberRoleIds?: string[],
): bigint {
  // Start with @everyone base permissions
  let permissions = BigInt(everyonePerms);

  // Add all role permissions
  for (const perms of rolePerms) {
    permissions |= BigInt(perms);
  }

  // Short-circuit: administrator always has all perms
  if (permissions & PermissionFlags.ADMINISTRATOR) {
    return BigInt('0xFFFFFFFFFFFFFFFF');
  }

  if (channelOverwrites) {
    let allow = 0n;
    let deny = 0n;

    for (const overwrite of channelOverwrites) {
      if (overwrite.type === 0 && memberRoleIds?.includes(overwrite.id)) {
        // Role overwrite
        allow |= BigInt(overwrite.allow);
        deny |= BigInt(overwrite.deny);
      } else if (overwrite.type === 1 && overwrite.id === memberId) {
        // Member-specific overwrite — applied last (highest priority)
        allow |= BigInt(overwrite.allow);
        deny |= BigInt(overwrite.deny);
      }
    }

    permissions = (permissions & ~deny) | allow;
  }

  return permissions;
}

/**
 * Build a permissions integer from an array of flag names.
 */
export function buildPermissions(...flags: PermissionFlag[]): string {
  let bits = 0n;
  for (const flag of flags) {
    bits |= PermissionFlags[flag];
  }
  return bits.toString();
}

/**
 * Checks whether a user has authority to manage a guild in the AiCord platform.
 * Returns true if:
 * 1. User is the guild owner (`owner === true`)
 * 2. User has the `MANAGE_GUILD` permission (0x20n = bit 5)
 * 3. User has the `ADMINISTRATOR` permission (0x8n = bit 3)
 *
 * Handles string, number, bigint, null, and undefined without throwing.
 */
export function canManageGuild(guild?: {
  permissions?: string | number | bigint;
  owner?: boolean;
} | null): boolean {
  if (!guild) return false;
  if (guild.owner === true) return true;
  if (guild.permissions === undefined || guild.permissions === null) return false;

  try {
    const perms = BigInt(guild.permissions);
    const MANAGE_GUILD = 0x20n;
    const ADMINISTRATOR = 0x8n;
    return (perms & MANAGE_GUILD) !== 0n || (perms & ADMINISTRATOR) !== 0n;
  } catch {
    return false;
  }
}

