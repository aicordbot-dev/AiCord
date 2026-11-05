/**
 * src/lib/discord/command-definitions.ts
 * Slash command definitions derived directly from the Central Command Registry.
 * Run scripts/register-commands.ts to push these to Discord.
 */

import {
  getAllDiscordCommandJson,
} from './command-registry';
import type { ApplicationCommandType } from 'discord-api-types/v10';

export interface CommandDefinition {
  name: string;
  description: string;
  type?: ApplicationCommandType;
  options?: unknown[];
  default_member_permissions?: string; // Required Discord permissions for the invoker
  dm_permission?: boolean;
}

/**
 * Retrieve dynamically formatted command definitions for Discord registration.
 */
export function getCommandDefinitions(): CommandDefinition[] {
  return getAllDiscordCommandJson() as CommandDefinition[];
}

/**
 * Array of all registered commands in Discord API JSON format.
 * Preserves 100% backwards compatibility with scripts/register-commands.ts.
 */
export const COMMANDS: CommandDefinition[] = getAllDiscordCommandJson() as CommandDefinition[];
