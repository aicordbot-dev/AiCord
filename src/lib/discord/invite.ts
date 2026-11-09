/**
 * src/lib/discord/invite.ts
 * Generates OAuth2 bot authorization and invite links.
 */

import { ADMIN_PERMISSIONS_INTEGER } from '@/config/bot-permissions';

export interface BotInviteOptions {
  guildId?: string;
  redirectUri?: string;
  permissions?: string;
  clientId?: string;
  disableGuildSelect?: boolean;
}

/**
 * Builds a Discord OAuth2 Bot Authorization URL.
 * Prompts user to invite AiCord bot with necessary permissions and scopes.
 */
export function getBotInviteUrl(options: BotInviteOptions = {}): string {
  const clientId =
    options.clientId ||
    process.env.DISCORD_CLIENT_ID ||
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
    '1567565252525170748';

  const permissions = options.permissions || ADMIN_PERMISSIONS_INTEGER;
  const scopes = 'bot applications.commands';

  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    permissions,
  });

  if (options.guildId) {
    params.set('guild_id', options.guildId);
  }

  if (options.disableGuildSelect !== false && options.guildId) {
    params.set('disable_guild_select', 'true');
  }

  if (options.redirectUri) {
    params.set('redirect_uri', options.redirectUri);
    params.set('response_type', 'code');
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
