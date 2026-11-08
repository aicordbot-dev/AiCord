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
import {
  rankCommand,
  leaderboardCommand,
  levelRewardsCommand,
  levelConfigCommand,
} from '@/commands/levels';
import {
  triviaCommand,
  blackjackCommand,
  rpsCommand,
  coinflipCommand,
  slotsCommand,
} from '@/commands/games';
import {
  balanceCommand,
  dailyCommand,
  depositCommand,
  withdrawCommand,
  payCommand,
  workCommand,
  crimeCommand,
  shopCommand,
  buyCommand,
  shopAdminCommand,
  richCommand,
} from '@/commands/economy';
import { customizeCommand } from '@/commands/customize';
import { premiumCommand } from '@/commands/premium';
import { ticketCommand } from '@/commands/tickets';
import { birthdayCommand } from '@/commands/birthdays';
import { reactionRoleCommand } from '@/commands/reaction-roles';
import { starboardCommand } from '@/commands/starboard';
import { categoryCommand } from '@/commands/category';
import { adventureCommand } from '@/commands/adventure';
import { radioCommand } from '@/commands/radio';
import {
  banCommand,
  kickCommand,
  timeoutCommand,
  warnCommand,
  purgeCommand,
} from '@/commands/standalone-mod';

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
  appId?: string,
) => Promise<void>;
let customResponseHandler: ResponseHandler | null = null;

export function setResponseHandler(handler: ResponseHandler | null): void {
  customResponseHandler = handler;
}

async function sendResponse(
  token: string,
  options: InteractionResponseOptions,
  appId?: string,
): Promise<void> {
  if (customResponseHandler) {
    await customResponseHandler(token, options, appId);
    return;
  }
  await editInteractionResponse(token, options, appId);
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

const LEVEL_COMMAND_NAMES = new Set([
  'rank',
  'leaderboard',
  'level-rewards',
  'level-config',
]);

const ECONOMY_COMMAND_NAMES = new Set([
  'balance',
  'daily',
  'deposit',
  'withdraw',
  'pay',
  'work',
  'crime',
  'shop',
  'buy',
  'shop-admin',
  'rich',
]);

const GAME_COMMAND_NAMES = new Set([
  'trivia',
  'blackjack',
  'rps',
  'coinflip',
  'slots',
]);

const CUSTOMIZE_COMMAND_NAMES = new Set(['customize']);

const PREMIUM_COMMAND_NAMES = new Set(['premium']);

const TICKET_COMMAND_NAMES = new Set(['ticket']);

const BIRTHDAY_COMMAND_NAMES = new Set(['birthday']);

const REACTION_ROLE_COMMAND_NAMES = new Set(['reaction-role']);
const STARBOARD_COMMAND_NAMES = new Set(['starboard']);
const CATEGORY_COMMAND_NAMES = new Set(['category']);
const STANDALONE_MOD_COMMAND_NAMES = new Set([
  'ban',
  'kick',
  'timeout',
  'warn',
  'purge',
]);
const ADVENTURE_COMMAND_NAMES = new Set(['adventure']);
const RADIO_COMMAND_NAMES = new Set(['radio']);

/**
 * Retrieve a registered command by its primary name.
 */
export function getCommand(name: string): RegisteredCommand | undefined {
  let cmd = registry.get(name);
  if (!cmd && LEVEL_COMMAND_NAMES.has(name)) {
    registerLevelCommands();
    cmd = registry.get(name);
  }
  if (!cmd && GAME_COMMAND_NAMES.has(name)) {
    registerGameCommands();
    cmd = registry.get(name);
  }
  if (!cmd && ECONOMY_COMMAND_NAMES.has(name)) {
    registerEconomyCommands();
    cmd = registry.get(name);
  }
  if (!cmd && CUSTOMIZE_COMMAND_NAMES.has(name)) {
    registerCustomizeCommands();
    cmd = registry.get(name);
  }
  if (!cmd && PREMIUM_COMMAND_NAMES.has(name)) {
    registerPremiumCommands();
    cmd = registry.get(name);
  }
  if (!cmd && TICKET_COMMAND_NAMES.has(name)) {
    registerTicketCommands();
    cmd = registry.get(name);
  }
  if (!cmd && BIRTHDAY_COMMAND_NAMES.has(name)) {
    registerBirthdayCommands();
    cmd = registry.get(name);
  }
  if (!cmd && REACTION_ROLE_COMMAND_NAMES.has(name)) {
    registerReactionRoleCommands();
    cmd = registry.get(name);
  }
  if (!cmd && STARBOARD_COMMAND_NAMES.has(name)) {
    registerStarboardCommands();
    cmd = registry.get(name);
  }
  if (!cmd && CATEGORY_COMMAND_NAMES.has(name)) {
    registerCategoryCommands();
    cmd = registry.get(name);
  }
  if (!cmd && STANDALONE_MOD_COMMAND_NAMES.has(name)) {
    registerStandaloneModCommands();
    cmd = registry.get(name);
  }
  if (!cmd && ADVENTURE_COMMAND_NAMES.has(name)) {
    registerAdventureCommands();
    cmd = registry.get(name);
  }
  if (!cmd && RADIO_COMMAND_NAMES.has(name)) {
    registerRadioCommands();
    cmd = registry.get(name);
  }
  return cmd;
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
 * Register all Phase 23 Levels & XP Progression commands into the registry.
 */
export function registerLevelCommands(): void {
  registerCommand(rankCommand);
  registerCommand(leaderboardCommand);
  registerCommand(levelRewardsCommand);
  registerCommand(levelConfigCommand);
}

/**
 * Register all Phase 33 Interactive Game commands into the registry.
 */
export function registerGameCommands(): void {
  registerCommand(triviaCommand);
  registerCommand(blackjackCommand);
  registerCommand(rpsCommand);
  registerCommand(coinflipCommand);
  registerCommand(slotsCommand);
}

/**
 * Register all Phase 28 Server Economy commands into the registry.
 */
export function registerEconomyCommands(): void {
  registerCommand(balanceCommand);
  registerCommand(dailyCommand);
  registerCommand(depositCommand);
  registerCommand(withdrawCommand);
  registerCommand(payCommand);
  registerCommand(workCommand);
  registerCommand(crimeCommand);
  registerCommand(shopCommand);
  registerCommand(buyCommand);
  registerCommand(shopAdminCommand);
  registerCommand(richCommand);
}

/**
 * Register all Universal Custom Screens Suite commands into the registry.
 */
export function registerCustomizeCommands(): void {
  registerCommand(customizeCommand);
}

/**
 * Register all Premium & Entitlement Engine commands into the registry.
 */
export function registerPremiumCommands(): void {
  registerCommand(premiumCommand);
}

/**
 * Register all Phase 38 Interactive Ticket Hub commands into the registry.
 */
export function registerTicketCommands(): void {
  registerCommand(ticketCommand);
}

/**
 * Register all Automated Birthday Celebrations commands into the registry.
 */
export function registerBirthdayCommands(): void {
  registerCommand(birthdayCommand);
}

/**
 * Register all Milestone 3 Service 10 Reaction Role commands into the registry.
 */
export function registerReactionRoleCommands(): void {
  registerCommand(reactionRoleCommand);
}

/**
 * Register all Milestone 3 Service 11 Starboard commands into the registry.
 */
export function registerStarboardCommands(): void {
  registerCommand(starboardCommand);
}

/**
 * Register all Category Management commands into the registry.
 */
export function registerCategoryCommands(): void {
  registerCommand(categoryCommand);
}

/**
 * Register all Standalone Moderation commands into the registry.
 */
export function registerStandaloneModCommands(): void {
  registerCommand(banCommand);
  registerCommand(kickCommand);
  registerCommand(timeoutCommand);
  registerCommand(warnCommand);
  registerCommand(purgeCommand);
}

/**
 * Register all Service 20 Gemini RPG Adventure commands into the registry.
 */
export function registerAdventureCommands(): void {
  registerCommand(adventureCommand);
}

/**
 * Register all Service 18 24/7 Voice Radio streamer commands into the registry.
 */
export function registerRadioCommands(): void {
  registerCommand(radioCommand);
}

/**
 * Register all commands across all suites.
 */
export function registerAllCommands(): void {
  if (!getCommand('build')) {
    registerBuiltinCommands();
  }
  registerLevelCommands();
  registerGameCommands();
  registerEconomyCommands();
  registerCustomizeCommands();
  registerPremiumCommands();
  registerTicketCommands();
  registerBirthdayCommands();
  registerReactionRoleCommands();
  registerStarboardCommands();
  registerCategoryCommands();
  registerStandaloneModCommands();
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
  const appId = interaction?.application_id;
  if (!commandName) {
    console.warn('[CommandRegistry] Interaction payload missing command name');
    return;
  }

  const cmd = getCommand(commandName);
  if (!cmd) {
    console.warn(`[CommandRegistry] Unknown command requested: "/${commandName}"`);
    try {
      await sendResponse(
        interaction.token,
        {
          embeds: [
            errorEmbed(
              'Unknown Command',
              `The command \`/${commandName}\` is not recognized.`,
            ),
          ],
          ephemeral: true,
        },
        appId,
      );
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
        await sendResponse(
          interaction.token,
          {
            embeds: [
              errorEmbed(
                'Command Disabled',
                `The command \`/${cmd.name}\` is currently disabled in this server.`,
              ),
            ],
            ephemeral: true,
          },
          appId,
        );
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

      await sendResponse(
        interaction.token,
        {
          embeds: [
            warningEmbed(
              'Rate Limit Exceeded',
              `You are using \`/${cmd.name}\` too quickly. Please wait **${retrySec}s** before trying again.`,
            ),
          ],
          ephemeral: true,
        },
        appId,
      );
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
      await sendResponse(
        interaction.token,
        {
          embeds: [
            errorEmbed(
              'Command Error',
              'An unexpected error occurred while executing this command. Please try again later.',
            ),
          ],
          ephemeral: true,
        },
        appId,
      );
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

