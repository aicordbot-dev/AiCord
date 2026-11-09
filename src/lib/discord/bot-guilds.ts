/**
 * src/lib/discord/bot-guilds.ts
 * Provider interface and implementations for querying which Discord guilds
 * the AiCord bot is currently a member of.
 */

import { isDemoMode } from '@/lib/demo-mode';

export interface BotGuildsProvider {
  getBotGuildIds(): Promise<Set<string>>;
}

let mockBotGuildsInstance: MockBotGuilds | null = null;
let discordRestBotGuildsInstance: DiscordRestBotGuilds | null = null;
let overrideProvider: BotGuildsProvider | null = null;

/**
 * Mock provider for demo mode, local development, and automated tests.
 */
export class MockBotGuilds implements BotGuildsProvider {
  private guildIds: Set<string>;

  constructor(initialIds: string[] = ['111111111111111111', '222222222222222222']) {
    this.guildIds = new Set(initialIds);
  }

  async getBotGuildIds(): Promise<Set<string>> {
    return new Set(this.guildIds);
  }

  addGuild(guildId: string): void {
    this.guildIds.add(guildId);
  }

  removeGuild(guildId: string): void {
    this.guildIds.delete(guildId);
  }

  hasGuild(guildId: string): boolean {
    return this.guildIds.has(guildId);
  }

  reset(ids: string[] = ['111111111111111111', '222222222222222222']): void {
    this.guildIds = new Set(ids);
  }
}

/**
 * Production provider that queries Discord REST API using bot token,
 * caching results with a 60-second TTL to avoid hitting Discord rate limits.
 */
export class DiscordRestBotGuilds implements BotGuildsProvider {
  private cachedIds: Set<string> | null = null;
  private expiresAt = 0;
  private readonly ttlMs = 60_000;

  async getBotGuildIds(): Promise<Set<string>> {
    const now = Date.now();
    if (this.cachedIds && now < this.expiresAt) {
      return new Set(this.cachedIds);
    }

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      console.warn('[BotGuilds] DISCORD_BOT_TOKEN is not configured; returning empty guild set');
      return new Set();
    }

    try {
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds?limit=200', {
        headers: {
          Authorization: `Bot ${token}`,
          'User-Agent': 'AiCordBot (https://aicord.vercel.app, 1.0)',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error(`[BotGuilds] Failed to fetch bot guilds: ${response.status} ${response.statusText}`);
        return this.cachedIds ? new Set(this.cachedIds) : new Set();
      }

      const guilds = (await response.json()) as Array<{ id: string }>;
      const idSet = new Set(guilds.map((g) => g.id));

      this.cachedIds = idSet;
      this.expiresAt = now + this.ttlMs;

      return new Set(idSet);
    } catch (err) {
      console.error('[BotGuilds] Error fetching bot guilds:', err);
      return this.cachedIds ? new Set(this.cachedIds) : new Set();
    }
  }

  clearCache(): void {
    this.cachedIds = null;
    this.expiresAt = 0;
  }
}

/**
 * Returns singleton instance of MockBotGuilds.
 */
export function getMockBotGuilds(): MockBotGuilds {
  if (!mockBotGuildsInstance) {
    mockBotGuildsInstance = new MockBotGuilds();
  }
  return mockBotGuildsInstance;
}

/**
 * Returns singleton instance of DiscordRestBotGuilds.
 */
export function getDiscordRestBotGuilds(): DiscordRestBotGuilds {
  if (!discordRestBotGuildsInstance) {
    discordRestBotGuildsInstance = new DiscordRestBotGuilds();
  }
  return discordRestBotGuildsInstance;
}

/**
 * Factory function to retrieve the active BotGuildsProvider.
 */
export function getBotGuildsProvider(): BotGuildsProvider {
  if (overrideProvider) {
    return overrideProvider;
  }

  if (isDemoMode() || process.env.NODE_ENV === 'test') {
    return getMockBotGuilds();
  }

  return getDiscordRestBotGuilds();
}

/**
 * Sets an override provider (for testing and mocking).
 */
export function setBotGuildsProvider(provider: BotGuildsProvider | null): void {
  overrideProvider = provider;
}
