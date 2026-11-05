/**
 * test/engines/permission-engine.test.ts
 * Unit tests for Permission Engine: invoker/bot permissions,
 * role hierarchy, owner immunity/bypass, and target validation.
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  canActOn,
  isGuildOwner,
  checkRoleHierarchy,
  getMissingPermissions,
} from '@/lib/engines/permission-engine';

describe('Permission Engine', () => {
  const OWNER_ID = '111111111111111111';
  const MOD_ID = '222222222222222222';
  const USER_ID = '333333333333333333';
  const BOT_ID = '999999999999999999';

  const defaultBot = {
    id: BOT_ID,
    highestRolePosition: 50,
    permissions: (
      PermissionFlags.BAN_MEMBERS |
      PermissionFlags.KICK_MEMBERS |
      PermissionFlags.MODERATE_MEMBERS |
      PermissionFlags.MANAGE_ROLES |
      PermissionFlags.MANAGE_CHANNELS
    ).toString(),
  };

  const defaultMod = {
    id: MOD_ID,
    highestRolePosition: 30,
    permissions: (
      PermissionFlags.BAN_MEMBERS |
      PermissionFlags.KICK_MEMBERS |
      PermissionFlags.MODERATE_MEMBERS
    ).toString(),
  };

  const defaultTarget = {
    id: USER_ID,
    highestRolePosition: 10,
    permissions: '0',
  };

  it('allows action when all checks pass', () => {
    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: defaultMod,
      target: defaultTarget,
      bot: defaultBot,
      action: 'ban',
    });

    assert.equal(result.allowed, true);
    assert.equal(result.reasonCode, 'ALLOWED');
    assert.equal(result.message, 'Action is permitted.');
  });

  it('blocks self-targeting on moderation actions', () => {
    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: defaultMod,
      target: defaultMod, // Self
      bot: defaultBot,
      action: 'kick',
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, 'SELF_TARGET');
  });

  it('blocks targeting the bot itself', () => {
    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: defaultMod,
      target: defaultBot, // Targeting bot
      bot: defaultBot,
      action: 'timeout',
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, 'BOT_SELF_TARGET');
  });

  it('enforces server owner immunity', () => {
    const ownerTarget = {
      id: OWNER_ID,
      highestRolePosition: 100,
      permissions: '8', // Admin
    };

    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: { ...defaultMod, highestRolePosition: 101 }, // Even if higher
      target: ownerTarget,
      bot: defaultBot,
      action: 'ban',
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, 'TARGET_IS_OWNER');
  });

  it('allows server owner to bypass permission and invoker hierarchy checks', () => {
    const ownerInvoker = {
      id: OWNER_ID,
      highestRolePosition: 5, // Lower role position than target
      permissions: '0', // No explicit permission bits
    };

    const targetWithHigherRole = {
      id: USER_ID,
      highestRolePosition: 20,
    };

    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: ownerInvoker,
      target: targetWithHigherRole,
      bot: { ...defaultBot, highestRolePosition: 50 }, // Bot is still higher than target
      action: 'ban',
    });

    assert.equal(result.allowed, true);
    assert.equal(result.reasonCode, 'ALLOWED');
  });

  it('denies when invoker lacks required permissions', () => {
    const powerlessInvoker = {
      id: MOD_ID,
      highestRolePosition: 30,
      permissions: '0', // No permissions
    };

    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: powerlessInvoker,
      target: defaultTarget,
      bot: defaultBot,
      action: 'ban',
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, 'INVOKER_MISSING_PERMISSIONS');
    assert.ok(result.missingPermissions?.invoker?.includes('BAN_MEMBERS'));
  });

  it('denies when bot lacks required permissions', () => {
    const powerlessBot = {
      id: BOT_ID,
      highestRolePosition: 50,
      permissions: '0', // Bot has no permissions
    };

    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: defaultMod,
      target: defaultTarget,
      bot: powerlessBot,
      action: 'ban',
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, 'BOT_MISSING_PERMISSIONS');
    assert.ok(result.missingPermissions?.bot?.includes('BAN_MEMBERS'));
  });

  it('denies when invoker highest role position is lower than or equal to target', () => {
    const lowMod = {
      ...defaultMod,
      highestRolePosition: 15,
    };
    const highTarget = {
      ...defaultTarget,
      highestRolePosition: 20,
    };

    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: lowMod,
      target: highTarget,
      bot: defaultBot,
      action: 'kick',
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, 'INVOKER_ROLE_HIERARCHY');
  });

  it('denies when bot highest role position is lower than or equal to target', () => {
    const lowBot = {
      ...defaultBot,
      highestRolePosition: 15,
    };
    const highTarget = {
      ...defaultTarget,
      highestRolePosition: 20,
    };

    const result = canActOn({
      guildOwnerId: OWNER_ID,
      invoker: { ...defaultMod, highestRolePosition: 40 }, // Mod is higher
      target: highTarget,
      bot: lowBot, // But Bot is lower than target
      action: 'kick',
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, 'BOT_ROLE_HIERARCHY');
  });

  it('validates helper functions', () => {
    assert.ok(isGuildOwner(OWNER_ID, OWNER_ID));
    assert.ok(!isGuildOwner(OWNER_ID, MOD_ID));

    assert.ok(checkRoleHierarchy(25, 20));
    assert.ok(!checkRoleHierarchy(20, 20));
    assert.ok(!checkRoleHierarchy(10, 20));

    const missing = getMissingPermissions('0', [
      PermissionFlags.BAN_MEMBERS,
      PermissionFlags.KICK_MEMBERS,
    ]);
    assert.deepEqual(missing, ['BAN_MEMBERS', 'KICK_MEMBERS']);
  });
});
