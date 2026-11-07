/**
 * test/reaction-roles/reaction-role-service.test.ts
 * Unit tests for Milestone 3 Service 10: Button & Dropdown Reaction Roles Engine.
 *
 * Test coverage:
 * - Panel lifecycle: creation, retrieval, listing, and deletion
 * - Validation: required guildId, title, role duplicate prevention
 * - Capacity enforcement: hard 25-role limit per panel
 * - Interactive component generation:
 *   - Buttons chunked into ActionRows with max 5 buttons per row
 *   - String select dropdown with options and max_values constraint
 * - Embed builder: title, description, mode instructions, prerequisite notice, role list
 * - Operational modes:
 *   - 'normal': toggle on (add) and toggle off (remove), maxRoles cap
 *   - 'unique': removes other panel roles when picking new one (swapped)
 *   - 'verify': grants role only (cannot be toggled off)
 *   - 'drop': removes role only (cannot be added)
 * - Required role prerequisite gating
 * - Dropdown select diffing and handling
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createReactionRolePanel,
  getReactionRolePanel,
  listReactionRolePanels,
  deleteReactionRolePanel,
  addRoleToPanel,
  removeRoleFromPanel,
  buildReactionRoleEmbed,
  buildReactionRoleComponents,
  handleReactionRoleToggle,
  handleReactionRoleSelect,
  updateReactionRolePanelMessage,
  enableTestMode,
  clearTestStore,
  setTestPanel,
} from '@/lib/reaction-roles/reaction-role-service';
import type { IRolePanel } from '@/models';

describe('Button & Dropdown Reaction Roles — Service Engine', () => {
  const GUILD_ID = 'guild_rr_test_101';
  const USER_ID = 'user_alice_1';
  const ROLE_DEV = 'role_dev_11';
  const ROLE_DESIGNER = 'role_designer_22';
  const ROLE_GAMER = 'role_gamer_33';
  const ROLE_PREREQ = 'role_vip_99';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  // ─── 1. Panel Lifecycle & Retrieval ─────────────────────────────────────────

  describe('Panel Lifecycle & Retrieval', () => {
    it('creates and retrieves a reaction role panel with default settings', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Choose Your Roles',
        description: 'Click below to pick your community roles.',
      });

      assert.ok(panel);
      assert.equal(panel.guildId, GUILD_ID);
      assert.equal(panel.title, 'Choose Your Roles');
      assert.equal(panel.description, 'Click below to pick your community roles.');
      assert.equal(panel.style, 'buttons');
      assert.equal(panel.mode, 'normal');
      assert.equal(panel.entries.length, 0);

      const panelId = (panel as any).id || panel._id.toString();
      const retrieved = await getReactionRolePanel(GUILD_ID, panelId);
      assert.ok(retrieved);
      assert.equal(retrieved.title, 'Choose Your Roles');
    });

    it('rejects panel creation when title or guildId is missing', async () => {
      await assert.rejects(
        () => createReactionRolePanel('', { title: 'No Guild' }),
        /guildId is required/,
      );

      await assert.rejects(
        () => createReactionRolePanel(GUILD_ID, { title: '   ' }),
        /Panel title is required/,
      );
    });

    it('lists all panels for a guild and supports deletion', async () => {
      const p1 = await createReactionRolePanel(GUILD_ID, { title: 'Panel 1' });
      const p2 = await createReactionRolePanel(GUILD_ID, { title: 'Panel 2' });
      await createReactionRolePanel('other_guild', { title: 'Other Guild Panel' });

      const panels = await listReactionRolePanels(GUILD_ID);
      assert.equal(panels.length, 2);

      const p1Id = (p1 as any).id || p1._id.toString();
      const deleted = await deleteReactionRolePanel(GUILD_ID, p1Id);
      assert.equal(deleted, true);

      const remaining = await listReactionRolePanels(GUILD_ID);
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].title, 'Panel 2');

      const deleteAgain = await deleteReactionRolePanel(GUILD_ID, p1Id);
      assert.equal(deleteAgain, false);
    });

    it('updates panel published message information', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Publish Test',
      });
      const panelId = (panel as any).id || panel._id.toString();

      await updateReactionRolePanelMessage(
        GUILD_ID,
        panelId,
        'chan_announcements',
        'msg_discord_123',
      );

      const updated = await getReactionRolePanel(GUILD_ID, panelId);
      assert.equal(updated?.channelId, 'chan_announcements');
      assert.equal(updated?.messageId, 'msg_discord_123');
    });
  });

  // ─── 2. Role Entry Management & 25-Role Limit ────────────────────────────────

  describe('Role Entry Management', () => {
    it('adds and removes roles to a panel', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Tech Stack',
      });
      const panelId = (panel as any).id || panel._id.toString();

      await addRoleToPanel(GUILD_ID, panelId, {
        roleId: ROLE_DEV,
        label: 'Developer',
        emoji: '💻',
        description: 'Software engineers & programmers',
      });

      await addRoleToPanel(GUILD_ID, panelId, {
        roleId: ROLE_DESIGNER,
        label: 'Designer',
        emoji: '🎨',
      });

      const updated = await getReactionRolePanel(GUILD_ID, panelId);
      assert.equal(updated?.entries.length, 2);
      assert.equal(updated?.entries[0].label, 'Developer');
      assert.equal(updated?.entries[0].emoji, '💻');
      assert.equal(updated?.entries[1].label, 'Designer');

      // Remove role
      await removeRoleFromPanel(GUILD_ID, panelId, ROLE_DEV);
      const afterRemoval = await getReactionRolePanel(GUILD_ID, panelId);
      assert.equal(afterRemoval?.entries.length, 1);
      assert.equal(afterRemoval?.entries[0].roleId, ROLE_DESIGNER);
    });

    it('rejects duplicate roles in the same panel', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Dup Test',
      });
      const panelId = (panel as any).id || panel._id.toString();

      await addRoleToPanel(GUILD_ID, panelId, {
        roleId: ROLE_DEV,
        label: 'Developer',
      });

      await assert.rejects(
        () =>
          addRoleToPanel(GUILD_ID, panelId, {
            roleId: ROLE_DEV,
            label: 'Developer Again',
          }),
        /already in this panel/,
      );
    });

    it('enforces Discord hard limit of 25 roles per panel', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: '25 Limit Test',
      });
      const panelId = (panel as any).id || panel._id.toString();

      // Add 25 roles
      for (let i = 1; i <= 25; i++) {
        await addRoleToPanel(GUILD_ID, panelId, {
          roleId: `role_${i}`,
          label: `Role ${i}`,
        });
      }

      const fullPanel = await getReactionRolePanel(GUILD_ID, panelId);
      assert.equal(fullPanel?.entries.length, 25);

      // 26th role must be rejected
      await assert.rejects(
        () =>
          addRoleToPanel(GUILD_ID, panelId, {
            roleId: 'role_26',
            label: 'Role 26',
          }),
        /Cannot add more than 25 roles/,
      );
    });
  });

  // ─── 3. Embed & Component Generation ─────────────────────────────────────────

  describe('Embed & Component Generation', () => {
    it('builds an informative embed with mode instructions, prerequisites, and role list', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Server Notifications',
        description: 'Pick which alerts you want to receive.',
        mode: 'normal',
        requiredRoleId: ROLE_PREREQ,
        maxRoles: 2,
        entries: [
          { roleId: ROLE_DEV, label: 'Dev Updates', emoji: '🔔', description: 'GitHub & CI alerts' },
          { roleId: ROLE_GAMER, label: 'Game Nights', emoji: '🎮' },
        ],
      });

      const embed = buildReactionRoleEmbed(panel);
      assert.equal(embed.title, 'Server Notifications');
      assert.ok(embed.description?.includes('Pick which alerts you want to receive.'));
      assert.ok(embed.description?.includes('Click a button or select an option to toggle'));
      assert.ok(embed.description?.includes(ROLE_PREREQ));
      assert.ok(embed.description?.includes('Maximum 2 roles'));
      assert.ok(embed.fields && embed.fields.length > 0);
      assert.ok(embed.fields[0].value.includes('Dev Updates'));
      assert.ok(embed.fields[0].value.includes(ROLE_DEV));
    });

    it('splits button entries into chunks of 5 per ActionRow (up to 25 buttons)', async () => {
      const entries = Array.from({ length: 12 }, (_, i) => ({
        roleId: `role_btn_${i + 1}`,
        label: `Button ${i + 1}`,
        emoji: '⭐',
      }));

      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Button Grid Test',
        style: 'buttons',
        entries,
      });

      const components = buildReactionRoleComponents(panel);
      // 12 buttons should produce 3 ActionRows: [5, 5, 2]
      assert.equal(components.length, 3);
      assert.equal(components[0].components.length, 5);
      assert.equal(components[1].components.length, 5);
      assert.equal(components[2].components.length, 2);

      const panelId = (panel as any).id || panel._id.toString();
      const firstBtn = components[0].components[0] as any;
      assert.equal(firstBtn.type, 2); // Button
      assert.equal(firstBtn.custom_id, `rr_toggle:${panelId}:role_btn_1`);
      assert.equal(firstBtn.label, 'Button 1');
    });

    it('builds a string select menu dropdown when style is select', async () => {
      const entries = [
        { roleId: ROLE_DEV, label: 'Dev', description: 'Coding' },
        { roleId: ROLE_DESIGNER, label: 'Design', description: 'UI/UX' },
      ];

      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Dropdown Test',
        style: 'select',
        mode: 'unique',
        entries,
      });

      const components = buildReactionRoleComponents(panel);
      assert.equal(components.length, 1);
      const row = components[0];
      assert.equal(row.components.length, 1);

      const select = row.components[0] as any;
      assert.equal(select.type, 3); // StringSelect
      const panelId = (panel as any).id || panel._id.toString();
      assert.equal(select.custom_id, `rr_select:${panelId}`);
      assert.equal(select.options.length, 2);
      assert.equal(select.max_values, 1); // unique mode forces max_values: 1
      assert.equal(select.min_values, 0);
    });

    it('returns empty array when panel has no entries', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Empty Panel',
        entries: [],
      });

      const components = buildReactionRoleComponents(panel);
      assert.deepEqual(components, []);
    });
  });

  // ─── 4. Operational Modes: Normal ───────────────────────────────────────────

  describe("Operational Mode: 'normal'", () => {
    it('toggles role on (added) and off (removed)', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Normal Mode Panel',
        mode: 'normal',
        entries: [{ roleId: ROLE_DEV, label: 'Dev' }],
      });
      const panelId = (panel as any).id || panel._id.toString();

      // Alice doesn't have ROLE_DEV yet -> added
      const r1 = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        ROLE_DEV,
        [],
      );
      assert.equal(r1.action, 'added');
      assert.equal(r1.roleId, ROLE_DEV);

      // Alice now has ROLE_DEV -> removed
      const r2 = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        ROLE_DEV,
        [ROLE_DEV],
      );
      assert.equal(r2.action, 'removed');
      assert.equal(r2.roleId, ROLE_DEV);
    });

    it('enforces maxRoles constraint in normal mode', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Max Roles Panel',
        mode: 'normal',
        maxRoles: 1,
        entries: [
          { roleId: ROLE_DEV, label: 'Dev' },
          { roleId: ROLE_DESIGNER, label: 'Designer' },
        ],
      });
      const panelId = (panel as any).id || panel._id.toString();

      // Alice already holds ROLE_DEV, trying to add ROLE_DESIGNER
      const res = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        ROLE_DESIGNER,
        [ROLE_DEV],
      );
      assert.equal(res.action, 'denied');
      assert.ok(res.message.includes('up to 1 role'));
    });
  });

  // ─── 5. Operational Mode: Unique ────────────────────────────────────────────

  describe("Operational Mode: 'unique'", () => {
    it('swaps previous panel role when selecting a new role', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Team Choice',
        mode: 'unique',
        entries: [
          { roleId: 'team_red', label: 'Red Team' },
          { roleId: 'team_blue', label: 'Blue Team' },
        ],
      });
      const panelId = (panel as any).id || panel._id.toString();

      // Alice currently has team_red, clicks team_blue -> swapped
      const res = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'team_blue',
        ['team_red', 'other_unrelated_role'],
      );

      assert.equal(res.action, 'swapped');
      assert.equal(res.roleId, 'team_blue');
      assert.deepEqual(res.removedRoleIds, ['team_red']);
    });

    it('toggles off when clicking currently held role in unique mode', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Faction',
        mode: 'unique',
        entries: [{ roleId: 'faction_a', label: 'Faction A' }],
      });
      const panelId = (panel as any).id || panel._id.toString();

      const res = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'faction_a',
        ['faction_a'],
      );
      assert.equal(res.action, 'removed');
    });

    it('adds role when user currently has no panel roles in unique mode', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Faction',
        mode: 'unique',
        entries: [{ roleId: 'faction_a', label: 'Faction A' }],
      });
      const panelId = (panel as any).id || panel._id.toString();

      const res = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'faction_a',
        ['some_other_role'],
      );
      assert.equal(res.action, 'added');
      assert.equal(res.roleId, 'faction_a');
    });
  });

  // ─── 6. Operational Modes: Verify & Drop ────────────────────────────────────

  describe("Operational Modes: 'verify' and 'drop'", () => {
    it("mode 'verify' assigns role only and denies if already held", async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Verification Panel',
        mode: 'verify',
        entries: [{ roleId: 'role_verified', label: 'Verify Here' }],
      });
      const panelId = (panel as any).id || panel._id.toString();

      // Alice clicks -> added
      const r1 = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'role_verified',
        [],
      );
      assert.equal(r1.action, 'added');

      // Alice clicks again -> denied (cannot remove)
      const r2 = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'role_verified',
        ['role_verified'],
      );
      assert.equal(r2.action, 'denied');
      assert.ok(r2.message.includes('already have'));
    });

    it("mode 'drop' removes role only and denies if not held", async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Leave Roles Panel',
        mode: 'drop',
        entries: [{ roleId: 'role_annoying_ping', label: 'Mute Pings' }],
      });
      const panelId = (panel as any).id || panel._id.toString();

      // Alice has role -> removed
      const r1 = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'role_annoying_ping',
        ['role_annoying_ping'],
      );
      assert.equal(r1.action, 'removed');

      // Alice does not have role -> denied
      const r2 = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'role_annoying_ping',
        [],
      );
      assert.equal(r2.action, 'denied');
      assert.ok(r2.message.includes('do not have'));
    });
  });

  // ─── 7. Prerequisite Roles & Dropdown Select Handling ────────────────────────

  describe('Prerequisites & Dropdown Select Handling', () => {
    it('blocks toggle and select if user lacks required prerequisite role', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'VIP Lounge Roles',
        requiredRoleId: ROLE_PREREQ,
        entries: [{ roleId: 'role_vip_chat', label: 'VIP Chat' }],
      });
      const panelId = (panel as any).id || panel._id.toString();

      // Lacks prerequisite
      const toggleRes = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'role_vip_chat',
        ['normal_member_role'],
      );
      assert.equal(toggleRes.action, 'denied');
      assert.ok(toggleRes.message.includes(ROLE_PREREQ));

      const selectRes = await handleReactionRoleSelect(
        GUILD_ID,
        USER_ID,
        panelId,
        ['role_vip_chat'],
        ['normal_member_role'],
      );
      assert.equal(selectRes.action, 'denied');
      assert.ok(selectRes.message.includes(ROLE_PREREQ));

      // With prerequisite -> granted
      const toggleAllowed = await handleReactionRoleToggle(
        GUILD_ID,
        USER_ID,
        panelId,
        'role_vip_chat',
        [ROLE_PREREQ],
      );
      assert.equal(toggleAllowed.action, 'added');
    });

    it('diffs dropdown select values adding and removing appropriately', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Interest Groups',
        mode: 'normal',
        entries: [
          { roleId: 'role_ai', label: 'AI' },
          { roleId: 'role_crypto', label: 'Crypto' },
          { roleId: 'role_gaming', label: 'Gaming' },
        ],
      });
      const panelId = (panel as any).id || panel._id.toString();

      // User currently has role_crypto. Selects [role_ai, role_gaming]
      const result = await handleReactionRoleSelect(
        GUILD_ID,
        USER_ID,
        panelId,
        ['role_ai', 'role_gaming'],
        ['role_crypto'],
      );

      assert.equal(result.action, 'applied');
      assert.deepEqual(result.addedRoleIds.sort(), ['role_ai', 'role_gaming']);
      assert.deepEqual(result.removedRoleIds, ['role_crypto']);
    });

    it('enforces unique mode on dropdown selection (rejects multi-select)', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'House Selection',
        mode: 'unique',
        entries: [
          { roleId: 'house_gryf', label: 'Gryffindor' },
          { roleId: 'house_slyth', label: 'Slytherin' },
        ],
      });
      const panelId = (panel as any).id || panel._id.toString();

      const result = await handleReactionRoleSelect(
        GUILD_ID,
        USER_ID,
        panelId,
        ['house_gryf', 'house_slyth'],
        [],
      );

      assert.equal(result.action, 'denied');
      assert.ok(result.message.includes('only select one role'));
    });
  });
});
