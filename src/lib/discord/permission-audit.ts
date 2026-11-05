/**
 * src/lib/discord/permission-audit.ts
 * Audits permissions and role security for a ServerBlueprint before building.
 * Evaluates administrative roles, moderation roles, @everyone isolation,
 * and private channel containment.
 */

import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import { PermissionFlags } from './permissions';
import { clampEmbed, type DiscordEmbed, Colors } from './embeds';

export type SecurityScore = 'secure' | 'warning' | 'critical';

export interface PrivateChannelAudit {
  name: string;
  category?: string;
  authorizedRoles: string[];
  isContainmentSecure: boolean;
  issues: string[];
}

export interface PermissionAuditResult {
  score: SecurityScore;
  adminRoles: string[];
  modRoles: string[];
  privateChannels: PrivateChannelAudit[];
  alerts: string[];
  recommendations: string[];
}

const ADMIN_FLAGS = PermissionFlags.ADMINISTRATOR | PermissionFlags.MANAGE_GUILD;
const MOD_FLAGS =
  PermissionFlags.BAN_MEMBERS |
  PermissionFlags.KICK_MEMBERS |
  PermissionFlags.MANAGE_MESSAGES |
  PermissionFlags.MANAGE_CHANNELS;
const DANGEROUS_EVERYONE_FLAGS =
  ADMIN_FLAGS |
  PermissionFlags.BAN_MEMBERS |
  PermissionFlags.KICK_MEMBERS |
  PermissionFlags.MANAGE_ROLES |
  PermissionFlags.MANAGE_CHANNELS |
  PermissionFlags.MENTION_EVERYONE;

/**
 * Audit a server blueprint for permission safety and channel containment.
 */
export function auditBlueprintPermissions(blueprint: ServerBlueprint): PermissionAuditResult {
  const adminRoles: string[] = [];
  const modRoles: string[] = [];
  const alerts: string[] = [];
  const recommendations: string[] = [];

  const roleNameSet = new Set(blueprint.roles.map((r) => r.name.toLowerCase()));

  // 1. Analyze Roles
  for (const role of blueprint.roles) {
    const perms = role.permissions ? BigInt(role.permissions) : 0n;
    const isEveryoneRole = role.name.toLowerCase() === '@everyone' || role.name.toLowerCase() === 'everyone';

    // Check @everyone permissions
    if (isEveryoneRole) {
      if ((perms & DANGEROUS_EVERYONE_FLAGS) !== 0n) {
        alerts.push(`Critical: @everyone role has dangerous permissions granted (${role.permissions})`);
      }
    }

    // Identify Admin Roles (ADMINISTRATOR or MANAGE_GUILD)
    if ((perms & ADMIN_FLAGS) !== 0n) {
      adminRoles.push(role.name);
      if (!role.isStaff) {
        alerts.push(`Critical: Role "${role.name}" has administrative permissions but is not marked as staff`);
      }
    }
    // Identify Mod Roles (BAN, KICK, MANAGE_MESSAGES, MANAGE_CHANNELS) excluding full admins
    else if ((perms & MOD_FLAGS) !== 0n) {
      modRoles.push(role.name);
      if (!role.isStaff) {
        alerts.push(`Warning: Role "${role.name}" has moderation permissions but is not marked as staff`);
      }
    }
  }

  // Admin role count warnings
  if (adminRoles.length > 2) {
    alerts.push(`Warning: Server blueprint has ${adminRoles.length} administrative roles; recommend limiting to 1-2`);
  }

  // 2. Analyze Private Channel Containment
  const privateChannels: PrivateChannelAudit[] = [];

  const allChannelsWithCategory: Array<{
    channel: ServerBlueprint['categories'][0]['channels'][0];
    categoryName?: string;
    categoryOverwrites?: ServerBlueprint['categories'][0]['permissionOverwrites'];
  }> = [];

  // Top-level channels
  for (const ch of blueprint.topLevelChannels ?? []) {
    allChannelsWithCategory.push({ channel: ch });
  }

  // Categorized channels
  for (const cat of blueprint.categories) {
    for (const ch of cat.channels) {
      allChannelsWithCategory.push({
        channel: ch,
        categoryName: cat.name,
        categoryOverwrites: cat.permissionOverwrites,
      });
    }
  }

  for (const item of allChannelsWithCategory) {
    const { channel, categoryName, categoryOverwrites } = item;
    if (!channel.isPrivate) continue;

    const channelIssues: string[] = [];
    const authorizedRolesSet = new Set<string>();

    // Roles from privateRoles
    if (channel.privateRoles && channel.privateRoles.length > 0) {
      for (const r of channel.privateRoles) {
        authorizedRolesSet.add(r);
      }
    }

    // Roles from explicit channel overwrites allowing VIEW_CHANNEL
    let everyoneAllowedView = false;
    for (const ow of channel.permissionOverwrites ?? []) {
      const isEv = ow.roleRef.toLowerCase() === '@everyone' || ow.roleRef.toLowerCase() === 'everyone';
      const allowsView = ow.allow.some((p) => p.toUpperCase() === 'VIEW_CHANNEL');

      if (isEv && allowsView) {
        everyoneAllowedView = true;
      } else if (!isEv && allowsView) {
        authorizedRolesSet.add(ow.roleRef);
      }
    }

    // Check category overwrites if channel didn't explicitly override
    if (!everyoneAllowedView && categoryOverwrites) {
      for (const ow of categoryOverwrites) {
        const isEv = ow.roleRef.toLowerCase() === '@everyone' || ow.roleRef.toLowerCase() === 'everyone';
        const allowsView = ow.allow.some((p) => p.toUpperCase() === 'VIEW_CHANNEL');
        if (isEv && allowsView) {
          // Check if channel denied it
          const channelExplicitlyDenies = (channel.permissionOverwrites ?? []).some(
            (o) =>
              (o.roleRef.toLowerCase() === '@everyone' || o.roleRef.toLowerCase() === 'everyone') &&
              o.deny.some((p) => p.toUpperCase() === 'VIEW_CHANNEL'),
          );
          if (!channelExplicitlyDenies) {
            everyoneAllowedView = true;
          }
        }
      }
    }

    if (everyoneAllowedView) {
      channelIssues.push(`Containment leak: @everyone is granted VIEW_CHANNEL on private channel #${channel.name}`);
      alerts.push(`Critical: Private channel #${channel.name} explicitly grants VIEW_CHANNEL to @everyone`);
    }

    // Validate authorized roles exist in blueprint
    for (const roleName of authorizedRolesSet) {
      if (!roleNameSet.has(roleName.toLowerCase())) {
        channelIssues.push(`Authorized role "${roleName}" is not defined in blueprint roles`);
        alerts.push(`Warning: Private channel #${channel.name} references undefined role "${roleName}"`);
      }
    }

    if (authorizedRolesSet.size === 0) {
      channelIssues.push(`No authorized roles defined for private channel #${channel.name}`);
      alerts.push(`Warning: Private channel #${channel.name} has no authorized roles; members will not see it`);
    }

    const isContainmentSecure = !everyoneAllowedView && authorizedRolesSet.size > 0;

    privateChannels.push({
      name: channel.name,
      category: categoryName,
      authorizedRoles: Array.from(authorizedRolesSet),
      isContainmentSecure,
      issues: channelIssues,
    });
  }

  // 3. Determine Security Score
  const hasCritical = alerts.some((a) => a.toLowerCase().startsWith('critical'));
  const hasWarning = alerts.some((a) => a.toLowerCase().startsWith('warning'));

  let score: SecurityScore = 'secure';
  if (hasCritical) {
    score = 'critical';
  } else if (hasWarning) {
    score = 'warning';
  }

  // 4. Generate Recommendations
  if (score === 'secure') {
    recommendations.push('All private channels are properly isolated with explicit role grants.');
    recommendations.push('Administrative and moderation permissions strictly conform to staff roles.');
  } else {
    if (adminRoles.length === 0) {
      recommendations.push('Consider defining at least one staff role with administrative permissions for management.');
    }
    if (hasCritical) {
      recommendations.push('Resolve all critical alerts before applying build to avoid permission vulnerabilities.');
    }
    if (privateChannels.some((p) => p.authorizedRoles.length === 0)) {
      recommendations.push('Assign at least one staff or trusted role to every private channel.');
    }
  }

  return {
    score,
    adminRoles,
    modRoles,
    privateChannels,
    alerts,
    recommendations,
  };
}

/**
 * Format permission audit results into a rich DiscordEmbed.
 */
export function buildPermissionAuditEmbed(blueprint: ServerBlueprint): DiscordEmbed {
  const audit = auditBlueprintPermissions(blueprint);

  const scoreBadge =
    audit.score === 'secure'
      ? '🟢 **Audit Status: SECURE**'
      : audit.score === 'warning'
        ? '🟡 **Audit Status: WARNING**'
        : '🔴 **Audit Status: CRITICAL**';

  const scoreColor =
    audit.score === 'secure'
      ? Colors.SUCCESS
      : audit.score === 'warning'
        ? Colors.WARNING
        : Colors.DANGER;

  const adminRolesText =
    audit.adminRoles.length > 0
      ? audit.adminRoles.map((r) => `• 👑 **${r}** (Administrator / Manage Guild)`).join('\n')
      : '*No administrative roles detected*';

  const modRolesText =
    audit.modRoles.length > 0
      ? audit.modRoles.map((r) => `• 🛡️ **${r}** (Moderation Permissions)`).join('\n')
      : '*No dedicated moderation roles detected*';

  let privateChannelsText = '*No private channels configured in blueprint*';
  if (audit.privateChannels.length > 0) {
    privateChannelsText = audit.privateChannels
      .map((pc) => {
        const statusIcon = pc.isContainmentSecure ? '🔒' : '⚠️';
        const catText = pc.category ? ` [${pc.category}]` : '';
        const rolesText =
          pc.authorizedRoles.length > 0 ? pc.authorizedRoles.join(', ') : '*No roles assigned*';
        return `${statusIcon} **#${pc.name}**${catText} → ${rolesText}`;
      })
      .join('\n');
  }

  const fields: NonNullable<DiscordEmbed['fields']> = [
    {
      name: '👑 Administrative Roles',
      value: adminRolesText,
      inline: false,
    },
    {
      name: '🛡️ Moderation Roles',
      value: modRolesText,
      inline: false,
    },
    {
      name: `🔒 Private Channel Containment (${audit.privateChannels.length})`,
      value: privateChannelsText,
      inline: false,
    },
  ];

  if (audit.alerts.length > 0) {
    fields.push({
      name: '⚠️ Security Alerts',
      value: audit.alerts.map((a) => `• ${a}`).join('\n'),
      inline: false,
    });
  }

  if (audit.recommendations.length > 0) {
    fields.push({
      name: '💡 Best-Practice Recommendations',
      value: audit.recommendations.map((r) => `• ${r}`).join('\n'),
      inline: false,
    });
  }

  const embed: DiscordEmbed = {
    color: scoreColor,
    title: `🛡️ Security & Permission Audit: ${blueprint.name}`,
    description: `${scoreBadge}\nComprehensive audit of server roles, administrative hierarchy, and private channel containment.`,
    fields,
    footer: {
      text: `AiCord Security Engine • ${audit.adminRoles.length} Admin • ${audit.modRoles.length} Mod • ${audit.privateChannels.length} Private Channels`,
    },
    timestamp: new Date().toISOString(),
  };

  return clampEmbed(embed);
}
