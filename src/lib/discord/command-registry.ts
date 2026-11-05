/**
 * src/lib/discord/command-registry.ts
 * Central Command Registry & Dynamic Autocomplete Engine for AiCord.
 *
 * Responsibilities:
 * - Unified command registration and lookup
 * - Conversion of registered commands to Discord API JSON schemas
 * - Interaction routing with rate-limiting middleware (Phase 22 RateLimiter)
 * - Server configuration checks (GuildConfig.disabledCommands with 60s cache)
 * - Error isolation ensuring polite embeds with no stack trace leakage
 * - Deep autocomplete option tree traversal with Discord 25-choice and 100-char limits
 */

import type {
  APIChatInputApplicationCommandInteraction,
  APIApplicationCommandAutocompleteInteraction,
} from 'discord-api-types/v10';
import {
  editInteractionResponse,
  type InteractionResponseOptions,
} from './interaction-response';
import { warningEmbed, errorEmbed } from './embeds';
import { checkUserRateLimit } from '@/lib/engines/rate-limiter';
import { getCachedGuildConfig } from '@/lib/engines/cache';
import { buildCommand } from '@/commands/build';
import { aiCommand } from '@/commands/ai';
import { roleCommand } from '@/commands/role';
import { channelCommand } from '@/commands/channel';
import { modCommand } from '@/commands/mod';

// ─── Interfaces ───────────────────────────────────────────────────────────

export interface FocusedOption {
  name: string;
  value: string;
  type: number;
}

export type AutocompleteInteractionPayload =
  | APIApplicationCommandAutocompleteInteraction
  | {
      data?: {
        name?: string;
        options?: unknown[];
      };
      guild_id?: string;
      member?: { user?: { id?: string } };
      user?: { id?: string };
      [key: string]: unknown;
    };

export interface AutocompleteContext {
  interaction: AutocompleteInteractionPayload;
  commandName: string;
  focusedOption: FocusedOption;
  guildId?: string;
  userId: string;
}

export interface RegisteredCommand {
  name: string;
  description: string;
  category: string;
  default_member_permissions?: string;
  dm_permission?: boolean;
  options?: unknown[];
  execute: (interaction: APIChatInputApplicationCommandInteraction) => Promise<void>;
  autocomplete?: (
    ctx: AutocompleteContext,
  ) => Promise<Array<{ name: string; value: string | number }>>;
  rateLimit?: { limit: number; windowMs: number };
}

export interface DiscordCommandJson {
  name: string;
  description: string;
  options?: unknown[];
  default_member_permissions?: string;
  dm_permission?: boolean;
}

// ─── Registry Store ───────────────────────────────────────────────────────

const registry = new Map<string, RegisteredCommand>();

// Response hook for unit testing and intercepting responses
type ResponseHandler = (
  token: string,
  options: InteractionResponseOptions,
) => Promise<void>;
let customResponseHandler: ResponseHandler | null = null;

export function setResponseHandler(handler: ResponseHandler | null): void {
  customResponseHandler = handler;
}

async function sendResponse(
  token: string,
  options: InteractionResponseOptions,
): Promise<void> {
  if (customResponseHandler) {
    await customResponseHandler(token, options);
    return;
  }
  await editInteractionResponse(token, options);
}

// ─── Core Functions ───────────────────────────────────────────────────────

/**
 * Register a command in the central registry.
 * Duplicate command names log a warning and overwrite previous registrations.
 */
export function registerCommand(cmd: RegisteredCommand): void {
  if (!cmd || !cmd.name) {
    throw new Error('[CommandRegistry] Command must have a valid name');
  }

  if (registry.has(cmd.name)) {
    console.warn(
      `[CommandRegistry] Command "${cmd.name}" is already registered. Overwriting existing registration.`,
    );
  }

  registry.set(cmd.name, cmd);
}

/**
 * Unregister a command by name.
 */
export function unregisterCommand(name: string): boolean {
  return registry.delete(name);
}

/**
 * Retrieve a registered command by its primary name.
 */
export function getCommand(name: string): RegisteredCommand | undefined {
  return registry.get(name);
}

/**
 * Get an array of all registered commands.
 */
export function getAllCommands(): RegisteredCommand[] {
  return Array.from(registry.values());
}

/**
 * Reset the command registry (clears all commands).
 */
export function clearRegistry(): void {
  registry.clear();
}

/**
 * Register all built-in AiCord commands into the registry.
 */
export function registerBuiltinCommands(): void {
  registerCommand(buildCommand);
  registerCommand(aiCommand);
  registerCommand(roleCommand);
  registerCommand(channelCommand);
  registerCommand(modCommand);
}

/**
 * Format a RegisteredCommand into a Discord slash command application JSON object.
 */
export function toDiscordCommandJson(cmd: RegisteredCommand): DiscordCommandJson {
  const json: DiscordCommandJson = {
    name: cmd.name,
    description: cmd.description,
  };

  if (cmd.options !== undefined) {
    json.options = cmd.options;
  }
  if (cmd.default_member_permissions !== undefined) {
    json.default_member_permissions = cmd.default_member_permissions;
  }
  if (cmd.dm_permission !== undefined) {
    json.dm_permission = cmd.dm_permission;
  }

  return json;
}

/**
 * Format all registered commands for registration with the Discord REST API.
 */
export function getAllDiscordCommandJson(): DiscordCommandJson[] {
  return getAllCommands().map(toDiscordCommandJson);
}

// ─── Autocomplete Helper ──────────────────────────────────────────────────

/**
 * Recursively search options tree (top-level, subcommand, subcommand-group)
 * for the option currently focused by the user.
 */
export function findFocusedOption(options?: unknown[]): FocusedOption | undefined {
  if (!Array.isArray(options)) return undefined;

  for (const opt of options) {
    if (!opt || typeof opt !== 'object') continue;
    const item = opt as {
      name?: string;
      value?: unknown;
      type?: number;
      focused?: boolean;
      options?: unknown[];
    };

    if (item.focused === true) {
      return {
        name: item.name ?? '',
        value: item.value !== undefined ? String(item.value) : '',
        type: item.type ?? 3,
      };
    }

    if (Array.isArray(item.options)) {
      const nested = findFocusedOption(item.options);
      if (nested) return nested;
    }
  }

  return undefined;
}

// ─── Interaction Handlers ─────────────────────────────────────────────────

/**
 * Central slash command interaction router.
 * Applies rate limiting, guild disabled command checks, error resilience,
 * and executes matching command handlers.
 */
export async function handleCommandInteraction(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const commandName = interaction?.data?.name;
  if (!commandName) {
    console.warn('[CommandRegistry] Interaction payload missing command name');
    return;
  }

  const cmd = getCommand(commandName);
  if (!cmd) {
    console.warn(`[CommandRegistry] Unknown command requested: "/${commandName}"`);
    try {
      await sendResponse(interaction.token, {
        embeds: [
          errorEmbed(
            'Unknown Command',
            `The command \`/${commandName}\` is not recognized.`,
          ),
        ],
        ephemeral: true,
      });
    } catch {
      // Ignore response failure for unknown command
    }
    return;
  }

  const userId =
    interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const guildId = interaction.guild_id;

  // 1. Guild disabled commands check (GuildConfig.disabledCommands)
  if (guildId) {
    try {
      const guildConfig = await getCachedGuildConfig(guildId);
      if (
        guildConfig &&
        Array.isArray(guildConfig.disabledCommands) &&
        guildConfig.disabledCommands.includes(cmd.name)
      ) {
        await sendResponse(interaction.token, {
          embeds: [
            errorEmbed(
              'Command Disabled',
              `The command \`/${cmd.name}\` is currently disabled in this server.`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }
    } catch (guildConfigErr) {
      console.warn(
        `[CommandRegistry] Failed to check disabled status for guild ${guildId}:`,
        guildConfigErr,
      );
    }
  }

  // 2. Rate limiting check (Phase 22 RateLimiter)
  const rateLimitConfig = cmd.rateLimit ?? { limit: 5, windowMs: 10_000 };
  if (userId) {
    const rlResult = await checkUserRateLimit(userId, `cmd:${cmd.name}`, {
      maxRequests: rateLimitConfig.limit,
      windowMs: rateLimitConfig.windowMs,
    });

    if (!rlResult.success) {
      const retrySec = rlResult.retryAfterMs
        ? Math.ceil(rlResult.retryAfterMs / 1000)
        : Math.ceil(rateLimitConfig.windowMs / 1000);

      await sendResponse(interaction.token, {
        embeds: [
          warningEmbed(
            'Rate Limit Exceeded',
            `You are using \`/${cmd.name}\` too quickly. Please wait **${retrySec}s** before trying again.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  }

  // 3. Execution with error isolation
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(
      `[CommandRegistry] Error executing command "/${cmd.name}":`,
      err,
    );

    try {
      await sendResponse(interaction.token, {
        embeds: [
          errorEmbed(
            'Command Error',
            'An unexpected error occurred while executing this command. Please try again later.',
          ),
        ],
        ephemeral: true,
      });
    } catch (responseErr) {
      console.error(
        `[CommandRegistry] Failed to send error response for "/${cmd.name}":`,
        responseErr,
      );
    }
  }
}

/**
 * Dynamic autocomplete interaction router.
 * Traverses option trees to find the focused option, routes to the command's
 * autocomplete handler, and enforces Discord's 25-choice and 100-character constraints.
 */
export async function handleAutocompleteInteraction(
  interaction: AutocompleteInteractionPayload,
): Promise<Array<{ name: string; value: string | number }>> {
  const commandName = interaction?.data?.name;
  if (!commandName) {
    return [];
  }

  const cmd = getCommand(commandName);
  if (!cmd || !cmd.autocomplete) {
    return [];
  }

  const focused = findFocusedOption(interaction.data?.options) ?? {
    name: '',
    value: '',
    type: 3,
  };

  const guildId = interaction.guild_id;
  const userId =
    interaction.member?.user?.id ?? interaction.user?.id ?? '';

  const ctx: AutocompleteContext = {
    interaction,
    commandName,
    focusedOption: focused,
    guildId,
    userId,
  };

  try {
    const rawChoices = await cmd.autocomplete(ctx);
    if (!Array.isArray(rawChoices)) {
      return [];
    }

    // Enforce Discord hard constraints:
    // 1. Max 25 choices
    // 2. Name length max 100 characters
    // 3. String value length max 100 characters
    return rawChoices.slice(0, 25).map((choice) => {
      const name =
        typeof choice.name === 'string'
          ? choice.name.slice(0, 100)
          : String(choice.name ?? '').slice(0, 100);

      let value = choice.value;
      if (typeof value === 'string' && value.length > 100) {
        value = value.slice(0, 100);
      }

      return {
        name,
        value,
      };
    });
  } catch (err) {
    console.error(
      `[CommandRegistry] Autocomplete error for "${commandName}":`,
      err,
    );
    return [];
  }
}

// ─── Initialize Built-in Commands ─────────────────────────────────────────

registerBuiltinCommands();
