/**
 * test/discord/permission-audit.test.ts
 * Unit tests for Permission Audit Engine.
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import { PermissionFlags } from '@/lib/discord/permissions';
import { Colors } from '@/lib/discord/embeds';
import {
  auditBlueprintPermissions,
  buildPermissionAuditEmbed,
} from '@/lib/discord/permission-audit';

function createMockBlueprint(overrides: Partial<ServerBlueprint> = {}): ServerBlueprint {
  return {
    name: 'Test Server',
    description: 'A test community server',
    roles: [
      {
        name: 'Admin',
        permissions: (PermissionFlags.ADMINISTRATOR | PermissionFlags.MANAGE_GUILD).toString(),
        isStaff: true,
        hoist: true,
        mentionable: true,
        color: 0xED4245,
      },
      {
        name: 'Moderator',
        permissions: (
          PermissionFlags.BAN_MEMBERS |
          PermissionFlags.KICK_MEMBERS |
          PermissionFlags.MANAGE_MESSAGES
        ).toString(),
        isStaff: true,
        hoist: true,
        mentionable: true,
        color: 0x3498DB,
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
    categories: [
      {
        name: '💬 GENERAL',
        channels: [
          {
            name: 'general-chat',
            type: 'text',
            topic: 'General chatter and discussions',
            slowmode: 0,
          },
        ],
      },
      {
        name: '🛡️ STAFF',
        channels: [
          {
            name: 'staff-lounge',
            type: 'text',
            topic: 'Private staff coordination',
            isPrivate: true,
            privateRoles: ['Admin', 'Moderator'],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('Permission Audit Engine', () => {
  describe('auditBlueprintPermissions()', () => {
    it('detects administrative roles accurately', () => {
      const blueprint = createMockBlueprint();
      const audit = auditBlueprintPermissions(blueprint);

      assert.deepEqual(audit.adminRoles, ['Admin']);
      assert.deepEqual(audit.modRoles, ['Moderator']);
      assert.equal(audit.score, 'secure');
    });

    it('identifies moderation roles and excludes admin roles from mod list', () => {
      const blueprint = createMockBlueprint({
        roles: [
          {
            name: 'Owner',
            permissions: PermissionFlags.ADMINISTRATOR.toString(),
            isStaff: true,
          },
          {
            name: 'Manager',
            permissions: PermissionFlags.MANAGE_GUILD.toString(),
            isStaff: true,
          },
          {
            name: 'Trial Mod',
            permissions: PermissionFlags.MANAGE_MESSAGES.toString(),
            isStaff: true,
          },
        ],
      });

      const audit = auditBlueprintPermissions(blueprint);
      assert.deepEqual(audit.adminRoles, ['Owner', 'Manager']);
      assert.deepEqual(audit.modRoles, ['Trial Mod']);
    });

    it('flags non-staff roles with administrative permissions as Critical', () => {
      const blueprint = createMockBlueprint({
        roles: [
          {
            name: 'Rogue Admin',
            permissions: PermissionFlags.ADMINISTRATOR.toString(),
            isStaff: false, // Not marked as staff!
          },
        ],
      });

      const audit = auditBlueprintPermissions(blueprint);
      assert.equal(audit.score, 'critical');
      assert.ok(
        audit.alerts.some((a) =>
          a.includes('Critical: Role "Rogue Admin" has administrative permissions but is not marked as staff'),
        ),
      );
    });

    it('flags non-staff roles with moderation permissions as Warning', () => {
      const blueprint = createMockBlueprint({
        roles: [
          {
            name: 'Admin',
            permissions: PermissionFlags.ADMINISTRATOR.toString(),
            isStaff: true,
          },
          {
            name: 'Vip Helper',
            permissions: PermissionFlags.MANAGE_MESSAGES.toString(),
            isStaff: false, // Mod perms without staff flag
          },
        ],
      });

      const audit = auditBlueprintPermissions(blueprint);
      assert.equal(audit.score, 'warning');
      assert.ok(
        audit.alerts.some((a) =>
          a.includes('Warning: Role "Vip Helper" has moderation permissions but is not marked as staff'),
        ),
      );
    });

    it('flags more than 2 administrative roles with a Warning', () => {
      const blueprint = createMockBlueprint({
        roles: [
          { name: 'Admin 1', permissions: PermissionFlags.ADMINISTRATOR.toString(), isStaff: true },
          { name: 'Admin 2', permissions: PermissionFlags.ADMINISTRATOR.toString(), isStaff: true },
          { name: 'Admin 3', permissions: PermissionFlags.ADMINISTRATOR.toString(), isStaff: true },
        ],
      });

      const audit = auditBlueprintPermissions(blueprint);
      assert.equal(audit.score, 'warning');
      assert.ok(audit.alerts.some((a) => a.includes('3 administrative roles')));
    });

    it('verifies private channel containment with authorized roles', () => {
      const blueprint = createMockBlueprint();
      const audit = auditBlueprintPermissions(blueprint);

      assert.equal(audit.privateChannels.length, 1);
      const staffChannel = audit.privateChannels[0];
      assert.equal(staffChannel.name, 'staff-lounge');
      assert.equal(staffChannel.category, '🛡️ STAFF');
      assert.deepEqual(staffChannel.authorizedRoles, ['Admin', 'Moderator']);
      assert.equal(staffChannel.isContainmentSecure, true);
      assert.equal(staffChannel.issues.length, 0);
    });

    it('detects containment leaks if @everyone is granted VIEW_CHANNEL on private channels', () => {
      const blueprint = createMockBlueprint({
        categories: [
          {
            name: 'Leaky Category',
            channels: [
              {
                name: 'secret-chat',
                type: 'text',
                isPrivate: true,
                privateRoles: ['Admin'],
                permissionOverwrites: [
                  {
                    roleRef: '@everyone',
                    allow: ['VIEW_CHANNEL'],
                    deny: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const audit = auditBlueprintPermissions(blueprint);
      assert.equal(audit.score, 'critical');
      assert.equal(audit.privateChannels[0].isContainmentSecure, false);
      assert.ok(
        audit.alerts.some((a) =>
          a.includes('Critical: Private channel #secret-chat explicitly grants VIEW_CHANNEL to @everyone'),
        ),
      );
    });

    it('detects containment warnings if a private channel references non-existent roles', () => {
      const blueprint = createMockBlueprint({
        categories: [
          {
            name: 'Private',
            channels: [
              {
                name: 'ghost-chat',
                type: 'text',
                isPrivate: true,
                privateRoles: ['NonExistentRole'],
              },
            ],
          },
        ],
      });

      const audit = auditBlueprintPermissions(blueprint);
      assert.equal(audit.score, 'warning');
      assert.ok(
        audit.alerts.some((a) =>
          a.includes('Warning: Private channel #ghost-chat references undefined role "NonExistentRole"'),
        ),
      );
    });

    it('detects warnings if a private channel has no authorized roles', () => {
      const blueprint = createMockBlueprint({
        categories: [
          {
            name: 'Private',
            channels: [
              {
                name: 'empty-private',
                type: 'text',
                isPrivate: true,
                privateRoles: [],
              },
            ],
          },
        ],
      });

      const audit = auditBlueprintPermissions(blueprint);
      assert.equal(audit.score, 'warning');
      assert.ok(
        audit.alerts.some((a) =>
          a.includes('Warning: Private channel #empty-private has no authorized roles'),
        ),
      );
    });
  });

  describe('buildPermissionAuditEmbed()', () => {
    it('builds a secure embed with SUCCESS color and appropriate fields', () => {
      const blueprint = createMockBlueprint();
      const embed = buildPermissionAuditEmbed(blueprint);

      assert.equal(embed.color, Colors.SUCCESS);
      assert.ok(embed.title?.includes('Security & Permission Audit'));
      assert.ok(embed.description?.includes('SECURE'));

      const adminField = embed.fields?.find((f) => f.name.includes('Administrative Roles'));
      assert.ok(adminField?.value.includes('Admin'));

      const modField = embed.fields?.find((f) => f.name.includes('Moderation Roles'));
      assert.ok(modField?.value.includes('Moderator'));

      const containmentField = embed.fields?.find((f) => f.name.includes('Private Channel Containment'));
      assert.ok(containmentField?.value.includes('#staff-lounge'));
    });

    it('builds a warning embed with WARNING color when warnings exist', () => {
      const blueprint = createMockBlueprint({
        roles: [
          { name: 'Admin 1', permissions: PermissionFlags.ADMINISTRATOR.toString(), isStaff: true },
          { name: 'Admin 2', permissions: PermissionFlags.ADMINISTRATOR.toString(), isStaff: true },
          { name: 'Admin 3', permissions: PermissionFlags.ADMINISTRATOR.toString(), isStaff: true },
        ],
      });

      const embed = buildPermissionAuditEmbed(blueprint);
      assert.equal(embed.color, Colors.WARNING);
      assert.ok(embed.description?.includes('WARNING'));

      const alertsField = embed.fields?.find((f) => f.name.includes('Security Alerts'));
      assert.ok(alertsField !== undefined);
      assert.ok(alertsField.value.includes('administrative roles'));
    });

    it('builds a critical embed with DANGER color when critical issues exist', () => {
      const blueprint = createMockBlueprint({
        roles: [
          {
            name: 'FakeAdmin',
            permissions: PermissionFlags.ADMINISTRATOR.toString(),
            isStaff: false,
          },
        ],
      });

      const embed = buildPermissionAuditEmbed(blueprint);
      assert.equal(embed.color, Colors.DANGER);
      assert.ok(embed.description?.includes('CRITICAL'));
    });
  });
});
