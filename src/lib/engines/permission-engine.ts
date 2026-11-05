/**
 * src/lib/engines/permission-engine.ts
 * Centralized Discord permission and role hierarchy verification engine.
 * Evaluates invoker permissions, bot permissions, role hierarchy,
 * owner immunity/bypass, and self-target constraints.
 */

import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';

export type ActionType =
  | 'ban'
  | 'kick'
  | 'timeout'
  | 'untimeout'
  | 'warn'
  | 'softban'
  | 'unban'
  | 'manage_roles'
  | 'manage_channels'
  | 'manage_nicknames'
  | 'custom';

export type ActionDenialReason =
  | 'ALLOWED'
  | 'SELF_TARGET'
  | 'BOT_SELF_TARGET'
  | 'TARGET_IS_OWNER'
  | 'INVOKER_MISSING_PERMISSIONS'
  | 'BOT_MISSING_PERMISSIONS'
  | 'INVOKER_ROLE_HIERARCHY'
  | 'BOT_ROLE_HIERARCHY'
  | 'INVALID_TARGET';

export interface MemberContext {
  id: string;
  highestRolePosition?: number;
  permissions?: string | bigint;
}

export interface CanActOnOptions {
  guildOwnerId: string;
  invoker: MemberContext;
  target?: MemberContext | null;
  bot: MemberContext;
  action: ActionType;
  requiredPermissions?: bigint[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  reasonCode: ActionDenialReason;
  message: string;
  missingPermissions?: {
    invoker?: string[];
    bot?: string[];
  };
}

/**
 * Map permission bits to readable name.
 */
const FLAG_NAMES = new Map<bigint, string>(
  Object.entries(PermissionFlags).map(([name, bit]) => [bit, name]),
);

/**
 * Standard required Discord permissions per action type.
 */
export const ACTION_REQUIRED_PERMISSIONS: Record<ActionType, bigint[]> = {
  ban: [PermissionFlags.BAN_MEMBERS],
  unban: [PermissionFlags.BAN_MEMBERS],
  softban: [PermissionFlags.BAN_MEMBERS],
  kick: [PermissionFlags.KICK_MEMBERS],
  timeout: [PermissionFlags.MODERATE_MEMBERS],
  untimeout: [PermissionFlags.MODERATE_MEMBERS],
  warn: [PermissionFlags.MODERATE_MEMBERS],
  manage_roles: [PermissionFlags.MANAGE_ROLES],
  manage_channels: [PermissionFlags.MANAGE_CHANNELS],
  manage_nicknames: [PermissionFlags.MANAGE_NICKNAMES],
  custom: [],
};

export const DENIAL_MESSAGES: Record<ActionDenialReason, string> = {
  ALLOWED: 'Action is permitted.',
  SELF_TARGET: 'You cannot perform this moderation action on yourself.',
  BOT_SELF_TARGET: 'AiCord cannot perform this moderation action on itself.',
  TARGET_IS_OWNER: 'The server owner has immunity and cannot be moderated.',
  INVOKER_MISSING_PERMISSIONS: 'You do not have the required permissions to perform this action.',
  BOT_MISSING_PERMISSIONS: 'AiCord lacks the required permissions in this server to perform this action.',
  INVOKER_ROLE_HIERARCHY: "Your highest role must be strictly higher than the target's highest role.",
  BOT_ROLE_HIERARCHY: "AiCord's highest role must be strictly higher than the target's highest role.",
  INVALID_TARGET: 'The target member is invalid or not found in this server.',
};

/**
 * Identify which required permissions are missing from a given permissions bitfield.
 */
export function getMissingPermissions(
  permissions: string | bigint | undefined,
  required: bigint[],
): string[] {
  if (required.length === 0) return [];
  const perms = permissions !== undefined ? permissions : 0n;

  const missing: string[] = [];
  for (const flag of required) {
    if (!hasPermission(perms, flag)) {
      missing.push(FLAG_NAMES.get(flag) ?? flag.toString());
    }
  }
  return missing;
}

/**
 * Check if a user is the guild owner.
 */
export function isGuildOwner(guildOwnerId: string, userId?: string | null): boolean {
  if (!guildOwnerId || !userId) return false;
  return guildOwnerId === userId;
}

/**
 * Verify whether actor's role position is strictly higher than target's role position.
 */
export function checkRoleHierarchy(actorPosition: number, targetPosition: number): boolean {
  return actorPosition > targetPosition;
}

/**
 * Main Permission Engine function:
 * Checks invoker permissions, bot permissions, role hierarchy, owner immunity,
 * owner bypass, and target constraints.
 */
export function canActOn(options: CanActOnOptions): PermissionCheckResult {
  const { guildOwnerId, invoker, target, bot, action } = options;

  const isInvokerOwner = isGuildOwner(guildOwnerId, invoker.id);
  const isTargetOwner = target ? isGuildOwner(guildOwnerId, target.id) : false;

  // 1. Target constraints
  if (target) {
    // Cannot self-target moderation actions
    if (invoker.id === target.id) {
      return {
        allowed: false,
        reasonCode: 'SELF_TARGET',
        message: DENIAL_MESSAGES.SELF_TARGET,
      };
    }

    // Bot cannot target itself
    if (bot.id === target.id) {
      return {
        allowed: false,
        reasonCode: 'BOT_SELF_TARGET',
        message: DENIAL_MESSAGES.BOT_SELF_TARGET,
      };
    }

    // Server owner immunity: no one can moderate the owner
    if (isTargetOwner) {
      return {
        allowed: false,
        reasonCode: 'TARGET_IS_OWNER',
        message: DENIAL_MESSAGES.TARGET_IS_OWNER,
      };
    }
  }

  // Determine required permissions
  const required = options.requiredPermissions ?? ACTION_REQUIRED_PERMISSIONS[action] ?? [];

  // 2. Invoker permission check (Guild Owner bypasses all invoker permission checks)
  if (!isInvokerOwner && required.length > 0) {
    const missing = getMissingPermissions(invoker.permissions, required);
    if (missing.length > 0) {
      return {
        allowed: false,
        reasonCode: 'INVOKER_MISSING_PERMISSIONS',
        message: `${DENIAL_MESSAGES.INVOKER_MISSING_PERMISSIONS} Missing: ${missing.join(', ')}`,
        missingPermissions: { invoker: missing },
      };
    }
  }

  // 3. Bot permissions check (Bot must always have required Discord permissions, even if owner is invoker)
  if (required.length > 0) {
    const botMissing = getMissingPermissions(bot.permissions, required);
    if (botMissing.length > 0) {
      return {
        allowed: false,
        reasonCode: 'BOT_MISSING_PERMISSIONS',
        message: `${DENIAL_MESSAGES.BOT_MISSING_PERMISSIONS} Missing: ${botMissing.join(', ')}`,
        missingPermissions: { bot: botMissing },
      };
    }
  }

  // 4. Role Hierarchy checks (only applicable when target has a role position)
  if (target && target.highestRolePosition !== undefined) {
    const targetPos = target.highestRolePosition;

    // Check Invoker Hierarchy: Invoker must be above target (Guild Owner bypasses this)
    if (!isInvokerOwner) {
      const invokerPos = invoker.highestRolePosition ?? 0;
      if (!checkRoleHierarchy(invokerPos, targetPos)) {
        return {
          allowed: false,
          reasonCode: 'INVOKER_ROLE_HIERARCHY',
          message: DENIAL_MESSAGES.INVOKER_ROLE_HIERARCHY,
        };
      }
    }

    // Check Bot Hierarchy: Bot must be above target (Bot can never act on someone with equal or higher role)
    const botPos = bot.highestRolePosition ?? 0;
    if (!checkRoleHierarchy(botPos, targetPos)) {
      return {
        allowed: false,
        reasonCode: 'BOT_ROLE_HIERARCHY',
        message: DENIAL_MESSAGES.BOT_ROLE_HIERARCHY,
      };
    }
  }

  return {
    allowed: true,
    reasonCode: 'ALLOWED',
    message: DENIAL_MESSAGES.ALLOWED,
  };
}
