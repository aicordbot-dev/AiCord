/**
 * src/lib/discord/guilds.ts
 * Discord REST API client for fetching user guilds with rate limiting,
 * authentication error handling, and Zod schema validation.
 */

import { z } from 'zod';
import { UnauthenticatedError, RateLimitedError, DiscordAccessError } from '@/lib/discord/errors';
import { getUserGuildsCache, setUserGuildsCache, type CachedGuildItem } from '@/lib/discord/cache';

export const DiscordGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable().optional().default(null),
  owner: z.boolean().optional().default(false),
  permissions: z
    .union([z.string(), z.number(), z.bigint()])
    .transform((val) => String(val))
    .optional(),
  features: z.array(z.string()).optional().default([]),
  approximate_member_count: z.number().optional(),
  approximate_presence_count: z.number().optional(),
  botPresent: z.boolean().optional(),
});

export type DiscordGuild = z.infer<typeof DiscordGuildSchema>;

const DiscordGuildListSchema = z.array(DiscordGuildSchema);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches the list of guilds the authenticated user belongs to.
 *
 * @param accessToken Discord OAuth2 Bearer token
 * @param userId Optional user ID for in-memory cache lookup & memoization
 */
export async function fetchUserGuilds(
  accessToken: string,
  userId?: string
): Promise<DiscordGuild[]> {
  if (!accessToken) {
    throw new UnauthenticatedError('Missing Discord access token.');
  }

  // Check cache first if userId is provided
  if (userId) {
    const cached = getUserGuildsCache(userId);
    if (cached) {
      return cached;
    }
  }

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;

    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'AiCordPlatform (https://aicord.vercel.app, 1.0)',
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      throw new UnauthenticatedError('Discord access token is invalid or expired.');
    }

    if (response.status === 429) {
      let retryAfter = 2;
      try {
        const data = (await response.json()) as { retry_after?: number };
        if (typeof data.retry_after === 'number') {
          retryAfter = Math.ceil(data.retry_after);
        }
      } catch {
        const header = response.headers.get('retry-after');
        if (header) retryAfter = Math.ceil(parseFloat(header)) || 2;
      }

      if (attempts < maxAttempts) {
        // Sleep up to 3 seconds on first retry
        await sleep(Math.min(retryAfter * 1000, 3000));
        continue;
      }

      throw new RateLimitedError(retryAfter);
    }

    if (!response.ok) {
      throw new DiscordAccessError(
        `Failed to fetch user guilds from Discord: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    const json = await response.json();
    const parsed = DiscordGuildListSchema.parse(json);

    if (userId) {
      setUserGuildsCache(userId, parsed as CachedGuildItem[]);
    }

    return parsed;
  }

  throw new RateLimitedError(5);
}
