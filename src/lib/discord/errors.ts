/**
 * src/lib/discord/errors.ts
 * Typed error hierarchy for Discord authentication and guild authorization operations.
 */

export class DiscordAccessError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status = 500, code = 'DISCORD_ACCESS_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthenticatedError extends DiscordAccessError {
  constructor(message = 'Authentication required to access this resource.') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class ForbiddenError extends DiscordAccessError {
  constructor(message = 'You do not have permission to manage this server.') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class BotNotInGuildError extends DiscordAccessError {
  public readonly guildId?: string;

  constructor(guildId?: string, message = 'AiCord bot is not present in this server.') {
    super(message, 403, 'BOT_NOT_IN_GUILD');
    this.guildId = guildId;
  }
}

export class RateLimitedError extends DiscordAccessError {
  public readonly retryAfter: number;

  constructor(retryAfter = 5, message = `Discord rate limit exceeded. Please retry after ${retryAfter}s.`) {
    super(message, 429, 'RATE_LIMITED');
    this.retryAfter = retryAfter;
  }
}
