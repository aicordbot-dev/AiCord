/**
 * src/lib/discord/blueprint-preview.ts
 * Generates a "tree view" embed preview of a server blueprint.
 */

import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import type { CreatedIds, BuildStep } from '@/models/BuildJob';
import { clampEmbed, type DiscordEmbed, Colors } from './embeds';
import { paginateText } from '@/lib/limits';

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
      lines.push(`${icon} ${ch.name}${lock}`);
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
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Build a preview embed (or array of embeds if the content is too long).
 */
export function buildBlueprintPreviewEmbeds(blueprint: ServerBlueprint): DiscordEmbed[] {
  const tree = buildBlueprintTree(blueprint);
  const pages = paginateText(tree, 3800);

  const channelCount =
    blueprint.categories.reduce((s, c) => s + c.channels.length, 0) +
    (blueprint.topLevelChannels?.length ?? 0);

  const embeds: DiscordEmbed[] = [];

  for (let i = 0; i < pages.length; i++) {
    const embed: DiscordEmbed = {
      color: Colors.PRIMARY,
      title: i === 0 ? `🏗️ Blueprint Preview: ${blueprint.name}` : '🏗️ Blueprint Preview (continued)',
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
