/**
 * src/lib/discord/command-definitions.ts
 * Slash command definitions derived directly from the Central Command Registry.
 * Run scripts/register-commands.ts to push these to Discord.
 */

import {
  getAllDiscordCommandJson,
  getAllCommands,
  toDiscordCommandJson,
  registerAllCommands,
} from './command-registry';
import type { ApplicationCommandType } from 'discord-api-types/v10';

export interface CommandDefinition {
  name: string;
  description: string;
  type?: ApplicationCommandType;
  options?: unknown[];
  default_member_permissions?: string;
  dm_permission?: boolean;
}

/**
 * Baseline built-in commands for backwards compatibility with tests.
 */
export const COMMANDS: CommandDefinition[] = getAllDiscordCommandJson() as CommandDefinition[];

/**
 * Retrieve all registered application commands across all active suites (Builtin, Games, Levels, Economy, Custom Screens, Premium, Tickets, Birthdays, Reaction Roles, Starboard, Category, Moderation, RPG Adventure, Radio, Skins, Giveaways).
 */
export function getAllApplicationCommands(): CommandDefinition[] {
  registerAllCommands();
  return getAllCommands().map(toDiscordCommandJson) as CommandDefinition[];
}

export {
  categoryCommand,
  banCommand,
  kickCommand,
  timeoutCommand,
  warnCommand,
  purgeCommand,
  adventureCommand,
  radioCommand,
  skinsCommand,
  unboxCommand,
  giveawayCommand,
  modmailCommand,
  bountyCommand,
} from '@/commands';

/**
 * Retrieve dynamically formatted command definitions for Discord registration.
 */
export function getCommandDefinitions(): CommandDefinition[] {
  return getAllApplicationCommands();
}
