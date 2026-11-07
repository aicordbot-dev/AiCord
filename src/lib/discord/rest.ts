/**
 * src/lib/discord/rest.ts
 * Discord REST client singleton with rate-limit handling.
 */

import { REST } from '@discordjs/rest';
import { env } from '@/lib/env';

let _rest: REST | null = null;

function resolveBotToken(): string {
  try {
    if (env.DISCORD_BOT_TOKEN) {
      return env.DISCORD_BOT_TOKEN;
    }
  } catch {
    // env validation failed or not initialized
  }
  return process.env.DISCORD_BOT_TOKEN || '';
}

export function getDiscordRest(): REST {
  if (!_rest) {
    const token = resolveBotToken();
    _rest = new REST({ version: '10' }).setToken(token);
  }
  return _rest;
}

export function resetDiscordRest(): void {
  _rest = null;
}

/**
 * Wraps a Discord REST call with exponential backoff on 429 rate limits.
 * The @discordjs/rest client handles rate limits internally, but this provides
 * an additional safety net for unexpected quota errors.
 */
export async function discordApiCall<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      // Type-safe extraction of status from DiscordAPIError
      const status = (err as { status?: number })?.status;

      if (status === 429) {
        // Rate limited — back off exponentially
        const delay = Math.min(1000 * 2 ** attempt, 30_000);
        console.warn(`[Discord] Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      // For non-rate-limit errors, don't retry
      throw err;
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
