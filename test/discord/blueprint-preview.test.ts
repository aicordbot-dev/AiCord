/**
 * test/discord/blueprint-preview.test.ts
 * Unit tests for multi-view blueprint preview, role hierarchy, and interactive action rows.
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import { PermissionFlags } from '@/lib/discord/permissions';
import { Colors } from '@/lib/discord/embeds';
import {
  buildBlueprintTree,
  buildBlueprintPreviewEmbeds,
  buildRolesHierarchyEmbeds,
  buildBlueprintActionRows,
  buildCategorySelectRow,
  buildChannelSelectRow,
  buildCancelSelectRow,
  buildBuildCompletionEmbed,
  buildBlueprintSummary,
} from '@/lib/discord/blueprint-preview';
import type { ButtonComponent, StringSelectComponent } from '@/lib/discord/interaction-response';

function createSampleBlueprint(): ServerBlueprint {
  return {
    name: 'Mega Gaming Hub',
    description: 'Premier gaming and tech community',
    roles: [
      {
        name: 'Guild Master',
        permissions: PermissionFlags.ADMINISTRATOR.toString(),
        isStaff: true,
        hoist: true,
        mentionable: true,
        color: 0xFF5733,
      },
      {
        name: 'Officer',
        permissions: (PermissionFlags.BAN_MEMBERS | PermissionFlags.MANAGE_MESSAGES).toString(),
        isStaff: true,
        hoist: true,
        mentionable: false,
        color: 0x33A1FF,
      },
      {
        name: 'Member',
        permissions: '0',
        isStaff: false,
        hoist: false,
        mentionable: false,
        color: 0x2ECC71,
      },
    ],
    topLevelChannels: [
      {
        name: 'welcome-hub',
        type: 'text',
        topic: 'Welcome to Mega Gaming Hub! Read guidelines here.',
      },
    ],
    categories: [
      {
        name: '💬 TEXT CHANNELS',
        channels: [
          {
            name: 'general-chat',
            type: 'text',
            topic: 'Casual hangout and discussions',
            slowmode: 5,
          },
          {
            name: 'announcements',
            type: 'announcement',
            topic: 'Official server announcements',
          },
        ],
      },
      {
        name: '🔊 VOICE LOUNGES',
        channels: [
          {
            name: 'lounge-1',
            type: 'voice',
          },
          {
            name: 'stage-podium',
            type: 'stage',
          },
        ],
      },
      {
        name: '🛡️ STAFF ONLY',
        channels: [
          {
            name: 'staff-secret',
            type: 'text',
            isPrivate: true,
            privateRoles: ['Guild Master', 'Officer'],
          },
        ],
      },
    ],
  };
}

describe('Multi-View Blueprint Preview Engine', () => {
  describe('buildBlueprintTree()', () => {
    it('formats channel tree with category icons, slowmode, and lock badges', () => {
      const blueprint = createSampleBlueprint();
      const tree = buildBlueprintTree(blueprint);

      assert.ok(tree.includes('**📋 Roles**'));
      assert.ok(tree.includes('Guild Master 🛡️'));
      assert.ok(tree.includes('#️⃣ welcome-hub'));
      assert.ok(tree.includes('📁 **💬 TEXT CHANNELS**'));
      assert.ok(tree.includes('general-chat ⏱️5s'));
      assert.ok(tree.includes('📢 announcements'));
      assert.ok(tree.includes('🔊 lounge-1'));
      assert.ok(tree.includes('🎙️ stage-podium'));
      assert.ok(tree.includes('staff-secret 🔒'));
    });
  });

  describe('buildRolesHierarchyEmbeds()', () => {
    it('renders role hierarchy with hex colors, hoist status, mentionability, and permission tags', () => {
      const blueprint = createSampleBlueprint();
      const embeds = buildRolesHierarchyEmbeds(blueprint);

      assert.equal(embeds.length, 1);
      const embed = embeds[0];
      assert.ok(embed.title?.includes('Role Hierarchy'));
      assert.ok(embed.description?.includes('Guild Master'));
      assert.ok(embed.description?.includes('[ADMIN]'));
      assert.ok(embed.description?.includes('#FF5733'));
      assert.ok(embed.description?.includes('📌 Hoisted'));
      assert.ok(embed.description?.includes('🔔 Mentionable'));
      assert.ok(embed.description?.includes('Officer'));
      assert.ok(embed.description?.includes('[BAN, MANAGE_MSGS]'));
      assert.ok(embed.description?.includes('🔕 Unmentionable'));
    });
  });

  describe('buildBlueprintPreviewEmbeds()', () => {
    const blueprint = createSampleBlueprint();

    it('returns structure view by default', () => {
      const embeds = buildBlueprintPreviewEmbeds(blueprint, 'structure');
      assert.ok(embeds.length >= 1);
      assert.ok(embeds[0].title?.includes('Blueprint Preview'));
      assert.ok(embeds[0].description?.includes('TEXT CHANNELS'));
    });

    it('returns permission audit view when view is "permissions"', () => {
      const embeds = buildBlueprintPreviewEmbeds(blueprint, 'permissions');
      assert.equal(embeds.length, 1);
      assert.ok(embeds[0].title?.includes('Security & Permission Audit'));
      assert.equal(embeds[0].color, Colors.SUCCESS);
    });

    it('returns role hierarchy view when view is "roles"', () => {
      const embeds = buildBlueprintPreviewEmbeds(blueprint, 'roles');
      assert.equal(embeds.length, 1);
      assert.ok(embeds[0].title?.includes('Role Hierarchy'));
    });
  });

  describe('buildBlueprintActionRows()', () => {
    const jobId = '64e83a7c81d7f6c123456789';

    it('builds 3 rows with tabs, in-place customization, and confirm/cancel', () => {
      const rows = buildBlueprintActionRows(jobId, 'structure');
      assert.equal(rows.length, 3);

      // Row 1: Navigation Tabs
      const tabRow = rows[0];
      assert.equal(tabRow.components.length, 3);
      const tab0 = tabRow.components[0] as ButtonComponent;
      const tab1 = tabRow.components[1] as ButtonComponent;
      const tab2 = tabRow.components[2] as ButtonComponent;
      assert.equal(tab0.custom_id, `build_view:structure:${jobId}`);
      assert.equal(tab0.style, 1); // Active structure tab = Primary (1)
      assert.equal(tab1.custom_id, `build_view:permissions:${jobId}`);
      assert.equal(tab1.style, 2); // Inactive permissions tab = Secondary (2)
      assert.equal(tab2.custom_id, `build_view:roles:${jobId}`);
      assert.equal(tab2.style, 2); // Inactive roles tab = Secondary (2)

      // Row 2: In-Place Customization
      const editRow = rows[1];
      assert.equal(editRow.components.length, 2);
      const edit0 = editRow.components[0] as ButtonComponent;
      const edit1 = editRow.components[1] as ButtonComponent;
      assert.equal(edit0.custom_id, `build_action:rename_cat:${jobId}`);
      assert.equal(edit1.custom_id, `build_action:rename_chan:${jobId}`);

      // Row 3: Final Actions
      const actionRow = rows[2];
      assert.equal(actionRow.components.length, 2);
      const act0 = actionRow.components[0] as ButtonComponent;
      const act1 = actionRow.components[1] as ButtonComponent;
      assert.equal(act0.custom_id, `confirm:${jobId}`);
      assert.equal(act0.style, 3); // Success (3)
      assert.equal(act1.custom_id, `cancel:${jobId}`);
      assert.equal(act1.style, 4); // Danger (4)
    });

    it('highlights permissions tab when currentView is "permissions"', () => {
      const rows = buildBlueprintActionRows(jobId, 'permissions');
      const tabRow = rows[0];
      const tab0 = tabRow.components[0] as ButtonComponent;
      const tab1 = tabRow.components[1] as ButtonComponent;
      const tab2 = tabRow.components[2] as ButtonComponent;
      assert.equal(tab0.style, 2); // Structure is secondary
      assert.equal(tab1.style, 1); // Permissions is primary
      assert.equal(tab2.style, 2); // Roles is secondary
    });

    it('highlights roles tab when currentView is "roles"', () => {
      const rows = buildBlueprintActionRows(jobId, 'roles');
      const tabRow = rows[0];
      const tab0 = tabRow.components[0] as ButtonComponent;
      const tab1 = tabRow.components[1] as ButtonComponent;
      const tab2 = tabRow.components[2] as ButtonComponent;
      assert.equal(tab0.style, 2); // Structure is secondary
      assert.equal(tab1.style, 2); // Permissions is secondary
      assert.equal(tab2.style, 1); // Roles is primary
    });
  });

  describe('Select Menu Helpers', () => {
    const blueprint = createSampleBlueprint();
    const jobId = 'job123';

    it('buildCategorySelectRow() constructs StringSelectMenu for blueprint categories', () => {
      const row = buildCategorySelectRow(jobId, blueprint);
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 1);

      const select = row.components[0] as StringSelectComponent;
      assert.equal(select.type, 3);
      assert.equal(select.custom_id, `build_sel_cat:${jobId}`);
      assert.equal(select.options.length, 3);
      assert.equal(select.options[0].label, '💬 TEXT CHANNELS');
      assert.equal(select.options[0].value, '0');
      assert.equal(select.options[1].label, '🔊 VOICE LOUNGES');
      assert.equal(select.options[1].value, '1');
    });

    it('buildChannelSelectRow() constructs StringSelectMenu for top-level and categorized channels', () => {
      const row = buildChannelSelectRow(jobId, blueprint);
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 1);

      const select = row.components[0] as StringSelectComponent;
      assert.equal(select.type, 3);
      assert.equal(select.custom_id, `build_sel_chan:${jobId}`);
      assert.ok(select.options.length >= 5);

      // Top level
      assert.equal(select.options[0].label, '#welcome-hub');
      assert.equal(select.options[0].value, 'top:0');

      // Categorized
      assert.equal(select.options[1].label, '#general-chat');
      assert.equal(select.options[1].value, '0:0');
      assert.equal(select.options[2].label, '#announcements');
      assert.equal(select.options[2].value, '0:1');
    });

    it('buildCancelSelectRow() constructs a return button to structure view', () => {
      const row = buildCancelSelectRow(jobId);
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 1);

      const button = row.components[0] as ButtonComponent;
      assert.equal(button.custom_id, `build_view:structure:${jobId}`);
      assert.equal(button.style, 2);
    });
  });

  describe('Completion Embed & Summary Helpers', () => {
    const blueprint = createSampleBlueprint();

    it('buildBuildCompletionEmbed() generates full completion embed', () => {
      const embed = buildBuildCompletionEmbed(
        blueprint,
        {
          roles: ['r1', 'r2'],
          categories: ['c1'],
          channels: ['ch1', 'ch2'],
          messages: [{ channelId: 'ch1', messageId: 'm1' }],
        },
        [
          { label: 'Create roles', status: 'done' },
          { label: 'Create channels', status: 'done' },
        ],
      );

      assert.equal(embed.color, Colors.SUCCESS);
      assert.ok(embed.title?.includes('Server Build Complete'));
      assert.ok(embed.description?.includes('**Roles:** 2'));
      assert.ok(embed.description?.includes('**Channels:** 2'));
      assert.ok(embed.description?.includes('**Setup Messages:** 1'));
    });

    it('buildBlueprintSummary() generates summary text', () => {
      const summary = buildBlueprintSummary(blueprint);
      assert.ok(summary.includes('Mega Gaming Hub'));
      assert.ok(summary.includes('3 roles'));
      assert.ok(summary.includes('3 categories'));
      assert.ok(summary.includes('6 channels')); // 1 top level + 2 + 2 + 1
    });
  });
});
