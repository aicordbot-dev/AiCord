import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { requireGuildAccess } from '@/lib/discord/require-guild-access';
import {
  UnauthenticatedError,
  ForbiddenError,
  BotNotInGuildError,
} from '@/lib/discord/errors';
import { MockBotGuilds, setBotGuildsProvider } from '@/lib/discord/bot-guilds';
import type { DiscordGuild } from '@/lib/discord/guilds';

describe('Discord Guild Access Gate — requireGuildAccess', () => {
  let mockBotProvider: MockBotGuilds;

  const validSession = {
    user: {
      id: 'user-100',
      name: 'Tester',
      global_name: 'Tester#0001',
      image: null,
      isAdminOfAppOwner: false,
    },
  };

  const sampleGuilds: DiscordGuild[] = [
    {
      id: 'guild-admin',
      name: 'Admin Guild',
      icon: null,
      owner: false,
      permissions: '8', // ADMINISTRATOR
      features: [],
    },
    {
      id: 'guild-manager',
      name: 'Manager Guild',
      icon: null,
      owner: false,
      permissions: '32', // MANAGE_GUILD
      features: [],
    },
    {
      id: 'guild-member',
      name: 'Regular Member Guild',
      icon: null,
      owner: false,
      permissions: '1024', // VIEW_CHANNEL only
      features: [],
    },
    {
      id: 'guild-nobot',
      name: 'No Bot Guild',
      icon: null,
      owner: true,
      permissions: '8',
      features: [],
    },
  ];

  beforeEach(() => {
    // Guilds where bot is present
    mockBotProvider = new MockBotGuilds(['guild-admin', 'guild-manager', 'guild-member']);
    setBotGuildsProvider(mockBotProvider);
  });

  it('succeeds when user is authenticated, has MANAGE_GUILD, and bot is present', async () => {
    const result = await requireGuildAccess('guild-manager', {
      session: validSession,
      guilds: sampleGuilds,
    });

    assert.ok(result);
    assert.equal(result.guild.id, 'guild-manager');
    assert.equal(result.canManage, true);
    assert.equal(result.botPresent, true);
    assert.equal(result.session.user.id, 'user-100');
  });

  it('succeeds when user is authenticated, has ADMINISTRATOR, and bot is present', async () => {
    const result = await requireGuildAccess('guild-admin', {
      session: validSession,
      guilds: sampleGuilds,
    });

    assert.ok(result);
    assert.equal(result.guild.id, 'guild-admin');
  });

  it('throws UnauthenticatedError when session is missing or null', async () => {
    await assert.rejects(
      async () => {
        await requireGuildAccess('guild-admin', {
          session: null,
          guilds: sampleGuilds,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof UnauthenticatedError);
        assert.equal((err as UnauthenticatedError).status, 401);
        return true;
      }
    );
  });

  it('throws ForbiddenError when user lacks MANAGE_GUILD or ADMINISTRATOR permission', async () => {
    await assert.rejects(
      async () => {
        await requireGuildAccess('guild-member', {
          session: validSession,
          guilds: sampleGuilds,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal((err as ForbiddenError).status, 403);
        return true;
      }
    );
  });

  it('throws ForbiddenError when user does not belong to the target guild', async () => {
    await assert.rejects(
      async () => {
        await requireGuildAccess('non-existent-guild', {
          session: validSession,
          guilds: sampleGuilds,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('throws BotNotInGuildError when user can manage the server but bot is missing', async () => {
    await assert.rejects(
      async () => {
        await requireGuildAccess('guild-nobot', {
          session: validSession,
          guilds: sampleGuilds,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof BotNotInGuildError);
        assert.equal((err as BotNotInGuildError).guildId, 'guild-nobot');
        return true;
      }
    );
  });

  it('throws ForbiddenError when guildId is empty', async () => {
    await assert.rejects(
      async () => {
        await requireGuildAccess('', {
          session: validSession,
          guilds: sampleGuilds,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });
});
