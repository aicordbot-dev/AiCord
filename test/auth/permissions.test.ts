import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canManageGuild } from '@/lib/discord/permissions';

describe('Discord Guild Permissions — canManageGuild', () => {
  it('returns true if the user is the guild owner regardless of permissions', () => {
    assert.equal(canManageGuild({ owner: true, permissions: '0' }), true);
    assert.equal(canManageGuild({ owner: true, permissions: undefined }), true);
    assert.equal(canManageGuild({ owner: true }), true);
  });

  it('returns true if the user has ADMINISTRATOR permission (0x8)', () => {
    assert.equal(canManageGuild({ owner: false, permissions: '8' }), true);
    assert.equal(canManageGuild({ owner: false, permissions: 8 }), true);
    assert.equal(canManageGuild({ owner: false, permissions: 8n }), true);
    assert.equal(canManageGuild({ permissions: '8' }), true);
  });

  it('returns true if the user has MANAGE_GUILD permission (0x20 = 32)', () => {
    assert.equal(canManageGuild({ owner: false, permissions: '32' }), true);
    assert.equal(canManageGuild({ owner: false, permissions: 32 }), true);
    assert.equal(canManageGuild({ owner: false, permissions: 32n }), true);
    assert.equal(canManageGuild({ permissions: '32' }), true);
  });

  it('returns true if the user has both ADMINISTRATOR and MANAGE_GUILD (40)', () => {
    assert.equal(canManageGuild({ owner: false, permissions: '40' }), true);
    assert.equal(canManageGuild({ owner: false, permissions: 40 }), true);
    assert.equal(canManageGuild({ owner: false, permissions: 40n }), true);
  });

  it('returns true for realistic high-privilege permission integers with MANAGE_GUILD or ADMIN', () => {
    // 3104 = MANAGE_GUILD (32) + VIEW_CHANNEL (1024) + SEND_MESSAGES (2048)
    assert.equal(canManageGuild({ owner: false, permissions: '3104' }), true);
    // 8589934591 includes ADMINISTRATOR (8)
    assert.equal(canManageGuild({ owner: false, permissions: '8589934591' }), true);
  });

  it('returns false for regular members without MANAGE_GUILD or ADMIN', () => {
    // 1024 is VIEW_CHANNEL only
    assert.equal(canManageGuild({ owner: false, permissions: '1024' }), false);
    // 0 is no permissions
    assert.equal(canManageGuild({ owner: false, permissions: '0' }), false);
    assert.equal(canManageGuild({ owner: false, permissions: 0 }), false);
    assert.equal(canManageGuild({ owner: false, permissions: 0n }), false);
  });

  it('handles null, undefined, and missing fields cleanly without throwing', () => {
    assert.equal(canManageGuild(null), false);
    assert.equal(canManageGuild(undefined), false);
    assert.equal(canManageGuild({}), false);
    assert.equal(canManageGuild({ permissions: undefined }), false);
    assert.equal(canManageGuild({ permissions: null as any }), false);
  });

  it('handles malformed permission inputs gracefully without throwing', () => {
    assert.equal(canManageGuild({ owner: false, permissions: 'not-a-number' }), false);
    assert.equal(canManageGuild({ owner: false, permissions: 'abc' }), false);
    assert.equal(canManageGuild({ owner: false, permissions: NaN as any }), false);
  });
});
