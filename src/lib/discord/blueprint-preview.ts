/**
 * src/lib/discord/blueprint-preview.ts
 * Generates multi-view embed previews and interactive action rows for server blueprints.
 * Views:
 * - 'structure': Hierarchical tree of categories and channels with topics & slowmodes.
 * - 'permissions': Security audit of admin/mod roles and private channel containment.
 * - 'roles': Visual role hierarchy with permissions, color hex, hoist, and mentionability.
 */

import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import type { CreatedIds, BuildStep } from '@/models/BuildJob';
import { clampEmbed, type DiscordEmbed, Colors } from './embeds';
import { paginateText } from '@/lib/limits';
import { buildPermissionAuditEmbed } from './permission-audit';
import {
  type ActionRow,
  type StringSelectOption,
  buildButton,
  buildActionRow,
} from './interaction-response';

export type BlueprintView = 'structure' | 'permissions' | 'roles';

const CHANNEL_ICONS: Record<string, string> = {
  text: '#️⃣',
  voice: '🔊',
  forum: '📋',
  announcement: '📢',
  stage: '🎙️',
};

/**
 * Build the tree view text for a blueprint.
 */
export function buildBlueprintTree(blueprint: ServerBlueprint): string {
  const lines: string[] = [];

  // Roles
  if (blueprint.roles.length > 0) {
    lines.push('**📋 Roles**');
    for (const role of blueprint.roles) {
      const badge = role.isStaff ? ' 🛡️' : '';
      lines.push(`  • ${role.name}${badge}`);
    }
    lines.push('');
  }

  // Top-level channels
  if (blueprint.topLevelChannels && blueprint.topLevelChannels.length > 0) {
    for (const ch of blueprint.topLevelChannels) {
      const icon = CHANNEL_ICONS[ch.type] ?? '#️⃣';
      const lock = ch.isPrivate ? ' 🔒' : '';
      const slow = ch.slowmode ? ` ⏱️${ch.slowmode}s` : '';
      lines.push(`${icon} ${ch.name}${lock}${slow}`);
      if (ch.topic) {
        lines.push(`     *${ch.topic.slice(0, 80)}*`);
      }
    }
    lines.push('');
  }

  // Categories + their channels
  for (const category of blueprint.categories) {
    lines.push(`📁 **${category.name}**`);
    for (const ch of category.channels) {
      const icon = CHANNEL_ICONS[ch.type] ?? '#️⃣';
      const lock = ch.isPrivate ? ' 🔒' : '';
      const slow = ch.slowmode ? ` ⏱️${ch.slowmode}s` : '';
      lines.push(`  ${icon} ${ch.name}${lock}${slow}`);
      if (ch.topic) {
        lines.push(`     *${ch.topic.slice(0, 80)}*`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Build role hierarchy preview embeds showing position, colors, and permissions.
 */
export function buildRolesHierarchyEmbeds(blueprint: ServerBlueprint): DiscordEmbed[] {
  const lines: string[] = [];

  if (blueprint.roles.length === 0) {
    lines.push('*No custom roles configured in blueprint.*');
  } else {
    for (let i = 0; i < blueprint.roles.length; i++) {
      const role = blueprint.roles[i];
      const hex =
        role.color !== undefined
          ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}`
          : 'Default';
      const hoist = role.hoist ? '📌 Hoisted' : 'Inline';
      const mention = role.mentionable ? '🔔 Mentionable' : '🔕 Unmentionable';
      const staff = role.isStaff ? '🛡️ Staff' : '';

      const tags: string[] = [];
      if (role.permissions) {
        const perms = BigInt(role.permissions);
        if (perms & (1n << 3n)) tags.push('ADMIN');
        if (perms & (1n << 5n)) tags.push('MANAGE_GUILD');
        if (perms & (1n << 2n)) tags.push('BAN');
        if (perms & (1n << 1n)) tags.push('KICK');
        if (perms & (1n << 13n)) tags.push('MANAGE_MSGS');
        if (perms & (1n << 4n)) tags.push('MANAGE_CHANS');
      }

      const tagBadge = tags.length > 0 ? ` \`[${tags.join(', ')}]\`` : '';
      lines.push(
        `**${i + 1}. @${role.name}** ${staff}${tagBadge}\n   🎨 Color: \`${hex}\` • ${hoist} • ${mention}`,
      );
    }
  }

  const fullText = lines.join('\n\n');
  const pages = paginateText(fullText, 3800);

  return pages.map((page, idx) =>
    clampEmbed({
      color: Colors.PRIMARY,
      title:
        idx === 0
          ? `🎭 Role Hierarchy: ${blueprint.name}`
          : `🎭 Role Hierarchy (continued)`,
      description: page,
      footer: {
        text: `AiCord • ${blueprint.roles.length} roles total (ordered highest to lowest hierarchy)`,
      },
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * Build preview embeds based on the selected view tab:
 * 'structure' | 'permissions' | 'roles'
 */
export function buildBlueprintPreviewEmbeds(
  blueprint: ServerBlueprint,
  view: BlueprintView = 'structure',
): DiscordEmbed[] {
  if (view === 'permissions') {
    return [buildPermissionAuditEmbed(blueprint)];
  }

  if (view === 'roles') {
    return buildRolesHierarchyEmbeds(blueprint);
  }

  // Default: structure view
  const tree = buildBlueprintTree(blueprint);
  const pages = paginateText(tree, 3800);

  const channelCount =
    blueprint.categories.reduce((s, c) => s + c.channels.length, 0) +
    (blueprint.topLevelChannels?.length ?? 0);

  const embeds: DiscordEmbed[] = [];

  for (let i = 0; i < pages.length; i++) {
    const embed: DiscordEmbed = {
      color: Colors.PRIMARY,
      title:
        i === 0
          ? `📋 Blueprint Preview: ${blueprint.name}`
          : '📋 Blueprint Preview (continued)',
      description: pages[i],
    };

    if (i === 0) {
      embed.footer = {
        text: `AiCord • ${blueprint.roles.length} roles • ${channelCount} channels • ${blueprint.categories.length} categories`,
      };
    }

    embeds.push(clampEmbed(embed));
  }

  return embeds;
}

/**
 * Build 3 rows of Discord components:
 * Row 1: Navigation Tabs (Structure, Permissions, Roles)
 * Row 2: In-Place Customization (Rename Category, Rename Channel)
 * Row 3: Final Actions (Confirm & Apply, Cancel)
 */
export function buildBlueprintActionRows(
  jobId: string,
  currentView: BlueprintView = 'structure',
): ActionRow[] {
  // Row 1: Tabs
  const tabRow = buildActionRow(
    buildButton({
      style: currentView === 'structure' ? 1 : 2,
      label: '📋 Structure View',
      customId: `build_view:structure:${jobId}`,
    }),
    buildButton({
      style: currentView === 'permissions' ? 1 : 2,
      label: '🛡️ Permission Audit',
      customId: `build_view:permissions:${jobId}`,
    }),
    buildButton({
      style: currentView === 'roles' ? 1 : 2,
      label: '🎭 Role Hierarchy',
      customId: `build_view:roles:${jobId}`,
    }),
  );

  // Row 2: Renaming Customization
  const editRow = buildActionRow(
    buildButton({
      style: 2,
      label: '✏️ Rename Category',
      customId: `build_action:rename_cat:${jobId}`,
    }),
    buildButton({
      style: 2,
      label: '✏️ Rename Channel',
      customId: `build_action:rename_chan:${jobId}`,
    }),
  );

  // Row 3: Execution
  const actionRow = buildActionRow(
    buildButton({
      style: 3,
      label: 'Confirm & Apply',
      customId: `confirm:${jobId}`,
    }),
    buildButton({
      style: 4,
      label: 'Cancel',
      customId: `cancel:${jobId}`,
    }),
  );

  return [tabRow, editRow, actionRow];
}

/**
 * Build a select menu row allowing the user to select which category to rename.
 */
export function buildCategorySelectRow(jobId: string, blueprint: ServerBlueprint): ActionRow {
  const options: StringSelectOption[] = blueprint.categories.slice(0, 25).map((cat, idx) => ({
    label: cat.name.slice(0, 100),
    value: String(idx),
    description: `${cat.channels.length} channel(s)`.slice(0, 100),
    emoji: { name: '📁' },
  }));

  if (options.length === 0) {
    options.push({
      label: 'No categories',
      value: 'none',
      description: 'Blueprint contains no categories to rename',
    });
  }

  return {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: `build_sel_cat:${jobId}`,
        placeholder: 'Select a category to rename…',
        options,
      },
    ],
  };
}

/**
 * Build a select menu row allowing the user to select which channel to rename (max 25).
 */
export function buildChannelSelectRow(jobId: string, blueprint: ServerBlueprint): ActionRow {
  const options: StringSelectOption[] = [];

  // Top level channels
  for (let i = 0; i < (blueprint.topLevelChannels ?? []).length && options.length < 25; i++) {
    const ch = blueprint.topLevelChannels![i];
    options.push({
      label: `#${ch.name}`.slice(0, 100),
      value: `top:${i}`,
      description: (ch.topic ? ch.topic.slice(0, 50) : `Top-level ${ch.type}`).slice(0, 100),
      emoji: { name: CHANNEL_ICONS[ch.type] ?? '#️⃣' },
    });
  }

  // Categorized channels
  for (let cIdx = 0; cIdx < blueprint.categories.length && options.length < 25; cIdx++) {
    const cat = blueprint.categories[cIdx];
    for (let chIdx = 0; chIdx < cat.channels.length && options.length < 25; chIdx++) {
      const ch = cat.channels[chIdx];
      options.push({
        label: `#${ch.name}`.slice(0, 100),
        value: `${cIdx}:${chIdx}`,
        description: `[${cat.name}] ${ch.topic ? ch.topic.slice(0, 50) : ch.type}`.slice(0, 100),
        emoji: { name: CHANNEL_ICONS[ch.type] ?? '#️⃣' },
      });
    }
  }

  if (options.length === 0) {
    options.push({
      label: 'No channels',
      value: 'none',
      description: 'Blueprint contains no channels to rename',
    });
  }

  return {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: `build_sel_chan:${jobId}`,
        placeholder: 'Select a channel to rename…',
        options,
      },
    ],
  };
}

/**
 * Cancel/Back button row for select menus.
 */
export function buildCancelSelectRow(jobId: string): ActionRow {
  return buildActionRow(
    buildButton({
      style: 2,
      label: '⬅️ Back to Preview',
      customId: `build_view:structure:${jobId}`,
    }),
  );
}

/**
 * Build the completion embed shown after a server build finishes successfully.
 */
export function buildBuildCompletionEmbed(
  blueprint: ServerBlueprint,
  createdIds: CreatedIds,
  steps: BuildStep[],
): DiscordEmbed {
  const channelCount = createdIds.channels.length;
  const categoryCount = createdIds.categories.length;
  const roleCount = createdIds.roles.length;
  const messageCount = createdIds.messages.length;

  const stepChecklist = steps
    .map((s) => `${s.status === 'done' ? '✅' : s.status === 'failed' ? '❌' : '⏳'} ${s.label}`)
    .join('\n');

  return clampEmbed({
    color: Colors.SUCCESS,
    title: `🎉 Server Build Complete: ${blueprint.name}`,
    description:
      `**AiCord** has successfully built your server!\n\n` +
      `**Summary:**\n` +
      `• 📋 **Roles:** ${roleCount}\n` +
      `• 📁 **Categories:** ${categoryCount}\n` +
      `• 💬 **Channels:** ${channelCount}\n` +
      (messageCount > 0 ? `• 📨 **Setup Messages:** ${messageCount}\n` : '') +
      `\n**Progress:**\n${stepChecklist}\n\n` +
      `*Need to revert these changes? Click the **Undo Build** button below.*`,
    footer: {
      text: 'AiCord • AI Discord Server Architect',
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Build a compact summary line for a blueprint.
 */
export function buildBlueprintSummary(blueprint: ServerBlueprint): string {
  const channelCount =
    blueprint.categories.reduce((s, c) => s + c.channels.length, 0) +
    (blueprint.topLevelChannels?.length ?? 0);

  return [
    `**${blueprint.name}**`,
    blueprint.description,
    `\n📋 ${blueprint.roles.length} roles • 📁 ${blueprint.categories.length} categories • #️⃣ ${channelCount} channels`,
  ]
    .filter(Boolean)
    .join('\n');
}
