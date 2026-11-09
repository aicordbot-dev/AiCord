import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isDemoMode, MOCK_USER, MOCK_GUILDS, getDemoSession, getDemoGuilds } from '@/lib/demo-mode';

describe('Demo Mode & Security Safeguards', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when NEXT_PUBLIC_DEMO_MODE is true in development', () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'development';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    assert.equal(isDemoMode(), true);
  });

  it('returns false when NEXT_PUBLIC_DEMO_MODE is false or unset in development', () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'development';
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    assert.equal(isDemoMode(), false);

    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    assert.equal(isDemoMode(), false);
  });

  it('throws fatal security error if demo mode is enabled in production', () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

    assert.throws(
      () => isDemoMode(),
      /FATAL SECURITY ERROR: Demo mode cannot be enabled in production environments\./
    );
  });

  it('returns false in production when demo mode is not enabled', () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    assert.equal(isDemoMode(), false);
  });

  it('provides well-formed mock user identity and session', () => {
    assert.equal(MOCK_USER.name, 'Alex');
    assert.equal(MOCK_USER.isAdminOfAppOwner, true);

    const session = getDemoSession();
    assert.equal(session.user.id, MOCK_USER.id);
    assert.ok(session.expires);
  });

  it('provides 4 mock guilds: 2 ready servers and 2 pending invite servers', () => {
    const guilds = getDemoGuilds();
    assert.equal(guilds.length, 4);

    const readyGuilds = guilds.filter((g) => g.botPresent);
    const pendingGuilds = guilds.filter((g) => !g.botPresent);

    assert.equal(readyGuilds.length, 2);
    assert.equal(pendingGuilds.length, 2);
  });
});
