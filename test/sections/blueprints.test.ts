import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUEPRINTS,
  BLUEPRINT_LIST,
  getBlueprintById,
  BlueprintId,
} from '../../src/config/blueprints';

test('Blueprints Specification — 5 Canonical Templates', async (t) => {
  const expectedIds: BlueprintId[] = [
    'gaming-esports',
    'developer-community',
    'creator-nexus',
    'academic-campus',
    'anime-social',
  ];

  await t.test('declares exactly 5 canonical blueprint templates', () => {
    assert.equal(BLUEPRINT_LIST.length, 5);
    for (const id of expectedIds) {
      assert.ok(BLUEPRINTS[id], `Blueprint ${id} must exist in BLUEPRINTS dictionary`);
    }
  });

  await t.test('verifies each blueprint has valid structure and channel categories', () => {
    for (const bp of BLUEPRINT_LIST) {
      assert.ok(bp.id, 'Blueprint must have id');
      assert.ok(bp.name.length > 0, 'Blueprint must have a name');
      assert.ok(bp.icon.length > 0, 'Blueprint must have an icon');
      assert.ok(bp.prompt.length > 0, 'Blueprint must have prompt text');
      assert.ok(bp.description.length > 0, 'Blueprint must have description');
      assert.ok(bp.tagline.length > 0, 'Blueprint must have a tagline');

      // Categories and Channels
      assert.ok(bp.structure.categories.length >= 3, 'Must have at least 3 categories');
      let totalChannels = 0;
      for (const cat of bp.structure.categories) {
        assert.ok(cat.name.length > 0, 'Category must have name');
        assert.ok(cat.channels.length > 0, 'Category must have at least 1 channel');
        totalChannels += cat.channels.length;
        for (const ch of cat.channels) {
          assert.ok(ch.name.length > 0, 'Channel must have name');
          assert.ok(
            ['text', 'voice', 'announcement', 'forum', 'stage'].includes(ch.type),
            `Invalid channel type: ${ch.type}`
          );
          assert.ok(ch.topic.length > 0, 'Channel must have a topic');
        }
      }
      assert.equal(
        totalChannels,
        bp.metrics.channelsCount,
        `Channels count in metrics must match actual channels in ${bp.id}`
      );
    }
  });

  await t.test('verifies security matrices and automod configurations', () => {
    for (const bp of BLUEPRINT_LIST) {
      const sec = bp.securityAudit;
      assert.ok(sec.everyonePermissions.allowed.length > 0, 'Must declare allowed permissions');
      assert.ok(sec.everyonePermissions.denied.length > 0, 'Must declare denied permissions');
      assert.ok(sec.automodRules.length >= 3, 'Must declare at least 3 automod rules');
      assert.ok(sec.verificationGateLevel.length > 0, 'Must have verification gate level');
      assert.ok(sec.raidPreventionScore >= 90 && sec.raidPreventionScore <= 100, 'Score must be 90-100');
      assert.ok(['SECURE', 'OPTIMAL'].includes(sec.status), 'Status must be SECURE or OPTIMAL');
      assert.ok(sec.auditedFlags.length >= 3, 'Must have at least 3 audited flags');

      for (const rule of sec.automodRules) {
        assert.ok(rule.name.length > 0);
        assert.ok(rule.trigger.length > 0);
        assert.ok(rule.action.length > 0);
        assert.equal(rule.enabled, true);
      }
    }
  });

  await t.test('verifies role hierarchies and hoist flags', () => {
    for (const bp of BLUEPRINT_LIST) {
      const roles = bp.roleHierarchy.roles;
      assert.ok(roles.length >= 5, 'Must have at least 5 roles');

      // Top role must have Administrator or equivalent management permissions
      const topRole = roles[0];
      assert.ok(
        topRole.permissions.includes('Administrator') || topRole.permissions.includes('Manage Server'),
        'Top role must have administrative capabilities'
      );
      assert.equal(topRole.hoist, true, 'Top role should be hoisted');

      // Bottom role must be @everyone with position 1
      const bottomRole = roles[roles.length - 1];
      assert.equal(bottomRole.name, '@everyone');
      assert.equal(bottomRole.hoist, false);

      // Verify colors are valid hexes
      for (const role of roles) {
        assert.match(role.color, /^#[0-9A-Fa-f]{6}$/, `Role color ${role.color} must be 6-digit hex`);
      }
    }
  });

  await t.test('getBlueprintById fallback handles known and unknown IDs safely', () => {
    const gaming = getBlueprintById('gaming-esports');
    assert.equal(gaming.id, 'gaming-esports');

    const dev = getBlueprintById('developer-community');
    assert.equal(dev.id, 'developer-community');

    const fallback = getBlueprintById('unknown-non-existent-id');
    assert.equal(fallback.id, 'gaming-esports');
  });
});
