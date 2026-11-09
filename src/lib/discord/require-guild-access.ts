/**
 * src/lib/discord/require-guild-access.ts
 * Server-only guard validating user session, guild management permissions,
 * and bot presence in the target guild.
 */

import { auth } from '@/auth';
import { isDemoMode, getDemoSession, getDemoGuilds } from '@/lib/demo-mode';
import { canManageGuild } from '@/lib/discord/permissions';
import { getBotGuildsProvider } from '@/lib/discord/bot-guilds';
import { fetchUserGuilds, type DiscordGuild } from '@/lib/discord/guilds';
import { getUserGuildsCache } from '@/lib/discord/cache';
import {
  UnauthenticatedError,
  ForbiddenError,
  BotNotInGuildError,
} from '@/lib/discord/errors';
import { getServerToken } from '@/lib/token-store';

export interface GuildAccessResult {
  guild: DiscordGuild;
  canManage: true;
  botPresent: true;
  session: {
    user: {
      id: string;
      name?: string | null;
      global_name?: string | null;
      image?: string | null;
      isAdminOfAppOwner?: boolean;
    };
  };
}

export interface RequireGuildAccessOptions {
  session?: {
    user: {
      id: string;
      name?: string | null;
      global_name?: string | null;
      image?: string | null;
      isAdminOfAppOwner?: boolean;
    };
  } | null;
  guilds?: DiscordGuild[];
  skipBotCheck?: boolean;
}

/**
 * Validates that the active user is authenticated, has MANAGE_GUILD / ADMINISTRATOR
 * permissions on the given guild, and that the AiCord bot is currently in the guild.
 *
 * Throws typed errors:
 * - UnauthenticatedError (401)
 * - ForbiddenError (403)
 * - BotNotInGuildError (403/404)
 */
export async function requireGuildAccess(
  guildId: string,
  options?: RequireGuildAccessOptions
): Promise<GuildAccessResult> {
  if (!guildId) {
    throw new ForbiddenError('Guild ID is required.');
  }

  // 1. Handle Demo Mode
  if (isDemoMode()) {
    const demoSession = getDemoSession();
    const demoGuilds = getDemoGuilds();
    const guild = demoGuilds.find((g) => g.id === guildId);

    if (!guild || !canManageGuild(guild)) {
      throw new ForbiddenError('You do not have permission to manage this server.');
    }

    if (!guild.botPresent && !options?.skipBotCheck) {
      throw new BotNotInGuildError(guildId);
    }

    return {
      guild,
      canManage: true,
      botPresent: true,
      session: demoSession,
    };
  }

  // 2. Resolve Session
  const session = options?.session !== undefined ? options.session : await auth();

  if (!session || !session.user || !session.user.id) {
    throw new UnauthenticatedError('You must be signed in to access this guild.');
  }

  const userId = session.user.id;

  // 3. Resolve Guild List
  let userGuilds: DiscordGuild[] = options?.guilds || [];

  if (userGuilds.length === 0) {
    // Check in-memory cache first
    const cached = getUserGuildsCache(userId);
    if (cached) {
      userGuilds = cached;
    } else {
      // Need Discord access token from server-only token store
      const tokenEntry = getServerToken(userId);
      if (tokenEntry && tokenEntry.accessToken) {
        userGuilds = await fetchUserGuilds(tokenEntry.accessToken, userId);
      }
    }
  }

  // 4. Find Guild & Check Management Permission
  const targetGuild = userGuilds.find((g) => g.id === guildId);

  if (!targetGuild) {
    throw new ForbiddenError('You do not belong to this server or have not loaded its metadata.');
  }

  if (!canManageGuild(targetGuild)) {
    throw new ForbiddenError('You do not possess Manage Server or Administrator permissions.');
  }

  // 5. Verify Bot Presence
  if (!options?.skipBotCheck) {
    const botProvider = getBotGuildsProvider();
    const botGuildIds = await botProvider.getBotGuildIds();

    if (!botGuildIds.has(guildId)) {
      throw new BotNotInGuildError(guildId);
    }
  }

  return {
    guild: targetGuild,
    canManage: true,
    botPresent: true,
    session,
  };
}
