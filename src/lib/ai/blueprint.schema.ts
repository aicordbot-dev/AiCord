/**
 * src/lib/ai/blueprint.schema.ts
 * Zod schema for the AI-generated server blueprint.
 * The AI must return an object matching this schema exactly.
 */

import { z } from 'zod';
import {
  GUILD_ROLES_SAFE_MAX,
  GUILD_CHANNELS_SAFE_MAX,
  CHANNEL_NAME_MAX,
  ROLE_NAME_MAX,
  CHANNEL_TOPIC_MAX,
} from '@/lib/limits';

// ─── Permission Overwrite ──────────────────────────────────────────────────
const PermissionOverwriteSchema = z.object({
  roleRef: z.string().describe('Reference to a role by its name in this blueprint'),
  allow: z.array(z.string()).describe('Permission flags to allow'),
  deny: z.array(z.string()).describe('Permission flags to deny'),
});

// ─── Role ──────────────────────────────────────────────────────────────────
const RoleSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(ROLE_NAME_MAX)
    .describe('Role name (max 100 chars)'),
  color: z
    .number()
    .int()
    .min(0)
    .max(0xffffff)
    .optional()
    .describe('Role color as a hex integer'),
  hoist: z.boolean().optional().describe('Whether to display role separately in member list'),
  mentionable: z.boolean().optional().describe('Whether role can be mentioned by everyone'),
  permissions: z
    .string()
    .optional()
    .describe('Permission bits string; use "0" for no extra permissions'),
  isStaff: z
    .boolean()
    .optional()
    .describe('Mark as a staff role (may receive elevated perms)'),
});

// ─── Channel ───────────────────────────────────────────────────────────────
const ChannelTypeSchema = z.enum(['text', 'voice', 'forum', 'announcement', 'stage']);

const ChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(CHANNEL_NAME_MAX)
    .describe('Channel name (lowercase, hyphens; max 100 chars)'),
  type: ChannelTypeSchema.describe('Channel type'),
  topic: z.string().max(CHANNEL_TOPIC_MAX).optional().describe('Channel topic or description'),
  slowmode: z
    .number()
    .int()
    .min(0)
    .max(21600)
    .optional()
    .describe('Slowmode in seconds (0 = off, max 21600)'),
  nsfw: z.boolean().optional().describe('Whether channel is NSFW'),
  isPrivate: z
    .boolean()
    .optional()
    .describe('If true, deny VIEW_CHANNEL to @everyone and grant only to specified roles'),
  privateRoles: z
    .array(z.string())
    .optional()
    .describe('Role names that can see this private channel'),
  permissionOverwrites: z
    .array(PermissionOverwriteSchema)
    .optional()
    .describe('Additional permission overwrites'),
  position: z.number().int().min(0).optional(),
});

// ─── Category ──────────────────────────────────────────────────────────────
const CategorySchema = z.object({
  name: z.string().min(1).max(CHANNEL_NAME_MAX),
  channels: z
    .array(ChannelSchema)
    .refine((c) => c.length <= 50, { message: 'Channels per category cannot exceed 50' })
    .describe('Channels in this category (max 50)'),
  permissionOverwrites: z.array(PermissionOverwriteSchema).optional(),
});

// ─── Welcome & Rules Content ───────────────────────────────────────────────
const ContentSchema = z.object({
  channelRef: z.string().describe('Channel name reference from this blueprint'),
  content: z.string().max(2000).describe('Message content to post'),
});

// ─── Top-Level Blueprint ───────────────────────────────────────────────────
export const ServerBlueprintSchema = z.object({
  name: z
    .string()
    .max(100)
    .describe('Suggested server name (user may already have one)'),
  description: z
    .string()
    .max(500)
    .describe('Brief description of what this blueprint creates'),
  roles: z
    .array(RoleSchema)
    .refine((r) => r.length <= GUILD_ROLES_SAFE_MAX, {
      message: `Total roles cannot exceed ${GUILD_ROLES_SAFE_MAX}`,
    })
    .describe('Roles to create, highest to lowest hierarchy'),
  categories: z
    .array(CategorySchema)
    .refine((c) => c.length <= 45, { message: 'Total categories cannot exceed 45' })
    .describe('Categories and their channels'),
  topLevelChannels: z
    .array(ChannelSchema)
    .refine((c) => c.length <= 10, { message: 'Top-level channels cannot exceed 10' })
    .optional()
    .describe('Channels not in any category'),
  welcomeMessages: z
    .array(ContentSchema)
    .optional()
    .describe('Welcome messages to post after build completes'),
  rulesContent: ContentSchema.optional().describe('Rules message to post'),
}).refine(
  (data) => {
    const channelCount =
      data.categories.reduce((sum, c) => sum + c.channels.length, 0) +
      (data.topLevelChannels?.length ?? 0);
    return channelCount <= GUILD_CHANNELS_SAFE_MAX;
  },
  { message: `Total channels cannot exceed ${GUILD_CHANNELS_SAFE_MAX}` },
);

export type ServerBlueprint = z.infer<typeof ServerBlueprintSchema>;

// ─── Safety Validation ─────────────────────────────────────────────────────

/**
 * Post-schema safety checks that the AI prompt alone can't guarantee.
 * - Never grants Administrator to non-staff roles.
 * - Never grants Manage Guild to non-staff roles.
 */
export function validateBlueprintSafety(
  blueprint: ServerBlueprint,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ADMINISTRATOR_BIT = 1n << 3n;
  const MANAGE_GUILD_BIT = 1n << 5n;

  for (const role of blueprint.roles) {
    if (!role.isStaff && role.permissions) {
      const bits = BigInt(role.permissions);
      if (bits & ADMINISTRATOR_BIT) {
        errors.push(`Role "${role.name}" grants Administrator but is not marked as staff`);
      }
      if (bits & MANAGE_GUILD_BIT) {
        errors.push(`Role "${role.name}" grants Manage Guild but is not marked as staff`);
      }
    }
  }

  // Check for duplicate role names
  const roleNames = blueprint.roles.map((r) => r.name.toLowerCase());
  const duplicateRoles = roleNames.filter((n, i) => roleNames.indexOf(n) !== i);
  if (duplicateRoles.length > 0) {
    errors.push(`Duplicate role names: ${duplicateRoles.join(', ')}`);
  }

  // Check for duplicate channel names within categories
  for (const category of blueprint.categories) {
    const channelNames = category.channels.map((c) => c.name.toLowerCase());
    const duplicateChannels = channelNames.filter((n, i) => channelNames.indexOf(n) !== i);
    if (duplicateChannels.length > 0) {
      errors.push(
        `Duplicate channel names in category "${category.name}": ${duplicateChannels.join(', ')}`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
