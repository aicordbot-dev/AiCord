/**
 * src/app/api/guilds/route.ts
 * API route returning user-manageable Discord guilds categorized into
 * "Ready" (bot is active in server) and "Add" (manageable, but bot not invited).
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isDemoMode, getDemoGuilds } from '@/lib/demo-mode';
import { fetchUserGuilds, type DiscordGuild } from '@/lib/discord/guilds';
import { canManageGuild } from '@/lib/discord/permissions';
import { getBotGuildsProvider } from '@/lib/discord/bot-guilds';
import { checkRateLimit } from '@/lib/rate-limit';
import { getServerToken } from '@/lib/token-store';

export async function GET(req: Request) {
  try {
    // 1. Handle Demo Mode
    if (isDemoMode()) {
      const demoGuilds = getDemoGuilds();
      const ready = demoGuilds.filter((g) => g.botPresent);
      const add = demoGuilds.filter((g) => !g.botPresent);

      return NextResponse.json({
        ready,
        add,
        total: demoGuilds.length,
        isDemo: true,
      });
    }

    // 2. Validate Authentication
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to list guilds.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 3. Enforce Rate Limiting (5 requests per 60s per user)
    const rateLimit = checkRateLimit(`guild_refresh:${userId}`, 5, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'RateLimited',
          message: `Too many guild refresh requests. Please wait ${Math.ceil((rateLimit.retryAfterMs ?? 5000) / 1000)}s.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.retryAfterMs ?? 5000) / 1000)),
          },
        }
      );
    }

    // 4. Retrieve Discord Access Token
    const tokenEntry = getServerToken(userId);
    if (!tokenEntry || !tokenEntry.accessToken) {
      return NextResponse.json(
        {
          error: 'MissingToken',
          message: 'Discord access token unavailable. Please re-authenticate.',
        },
        { status: 401 }
      );
    }

    // 5. Fetch User Guilds
    const allUserGuilds = await fetchUserGuilds(tokenEntry.accessToken, userId);

    // 6. Filter to manageable guilds only (owner or MANAGE_GUILD or ADMINISTRATOR)
    const manageableGuilds = allUserGuilds.filter((guild) => canManageGuild(guild));

    // 7. Cross-reference Bot Presence
    const botProvider = getBotGuildsProvider();
    const botGuildIds = await botProvider.getBotGuildIds();

    const ready: DiscordGuild[] = [];
    const add: DiscordGuild[] = [];

    for (const guild of manageableGuilds) {
      const botPresent = botGuildIds.has(guild.id);
      const guildWithStatus: DiscordGuild = {
        ...guild,
        botPresent,
      };

      if (botPresent) {
        ready.push(guildWithStatus);
      } else {
        add.push(guildWithStatus);
      }
    }

    return NextResponse.json(
      {
        ready,
        add,
        total: manageableGuilds.length,
        isDemo: false,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.reset),
        },
      }
    );
  } catch (err: unknown) {
    // Rethrow Next.js internal dynamic bail-out errors during prerendering
    if (
      err &&
      typeof err === 'object' &&
      ('digest' in err || (err as { name?: string }).name === 'DynamicServerError')
    ) {
      throw err;
    }

    console.error('[API /api/guilds] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const status = (err as { status?: number })?.status || 500;

    return NextResponse.json({ error: 'GuildFetchError', message }, { status });
  }
}
