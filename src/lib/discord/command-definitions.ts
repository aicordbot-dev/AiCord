/**
 * src/lib/discord/command-definitions.ts
 * Central command registry — all slash command definitions live here.
 * Run scripts/register-commands.ts to push these to Discord.
 */

import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10';

export interface CommandDefinition {
  name: string;
  description: string;
  type?: ApplicationCommandType;
  options?: unknown[];
  default_member_permissions?: string; // Required Discord permissions for the invoker
  dm_permission?: boolean;
}

// Permission bit constants for default_member_permissions
const MANAGE_GUILD = (1n << 5n).toString();
const MANAGE_CHANNELS = (1n << 4n).toString();
const MANAGE_ROLES = (1n << 28n).toString();
const KICK_MEMBERS = (1n << 1n).toString();

export const COMMANDS: CommandDefinition[] = [
  // ─── AI Server Builder ──────────────────────────────────────────────────
  {
    name: 'build',
    description: 'AI-generate a complete server structure from a description',
    default_member_permissions: MANAGE_GUILD,
    dm_permission: false,
    options: [
      {
        name: 'description',
        description: 'Describe the server you want to build (e.g. "gaming community with web dev section")',
        type: ApplicationCommandOptionType.String,
        required: false,
        max_length: 500,
      },
      {
        name: 'template',
        description: 'Start from a pre-defined template',
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: '🎮 Gaming Community', value: 'gaming' },
          { name: '💻 Developer Community', value: 'dev' },
          { name: '📚 Study Group', value: 'study' },
          { name: '🎨 Creator Community', value: 'creator' },
          { name: '💼 Business Support', value: 'business' },
        ],
      },
    ],
  },

  // ─── AI Management ──────────────────────────────────────────────────────
  {
    name: 'ai',
    description: 'Natural language server management',
    default_member_permissions: MANAGE_GUILD,
    dm_permission: false,
    options: [
      {
        name: 'request',
        description: 'What would you like to do? (e.g. "create a private moderators channel")',
        type: ApplicationCommandOptionType.String,
        required: true,
        max_length: 500,
      },
    ],
  },

  // ─── Role Management ───────────────────────────────────────────────────
  {
    name: 'role',
    description: 'Manage server roles',
    default_member_permissions: MANAGE_ROLES,
    dm_permission: false,
    options: [
      {
        name: 'create',
        description: 'Create a new role',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'name',
            description: 'Role name',
            type: ApplicationCommandOptionType.String,
            required: true,
            max_length: 100,
          },
          {
            name: 'color',
            description: 'Role color (hex, e.g. #ff0000)',
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: 'hoist',
            description: 'Show role separately in member list',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
          },
          {
            name: 'mentionable',
            description: 'Allow everyone to mention this role',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
          },
        ],
      },
      {
        name: 'delete',
        description: 'Delete a role',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'role',
            description: 'The role to delete',
            type: ApplicationCommandOptionType.Role,
            required: true,
          },
        ],
      },
      {
        name: 'assign',
        description: 'Assign a role to a member',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'The member to give the role to',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
          {
            name: 'role',
            description: 'The role to assign',
            type: ApplicationCommandOptionType.Role,
            required: true,
          },
        ],
      },
      {
        name: 'remove',
        description: 'Remove a role from a member',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'The member to remove the role from',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
          {
            name: 'role',
            description: 'The role to remove',
            type: ApplicationCommandOptionType.Role,
            required: true,
          },
        ],
      },
      {
        name: 'panel',
        description: 'Create a self-assign role panel',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'title',
            description: 'Panel title',
            type: ApplicationCommandOptionType.String,
            required: true,
            max_length: 256,
          },
          {
            name: 'style',
            description: 'Panel style',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              { name: 'Buttons', value: 'buttons' },
              { name: 'Dropdown', value: 'select' },
            ],
          },
        ],
      },
    ],
  },

  // ─── Channel Management ─────────────────────────────────────────────────
  {
    name: 'channel',
    description: 'Manage server channels',
    default_member_permissions: MANAGE_CHANNELS,
    dm_permission: false,
    options: [
      {
        name: 'create',
        description: 'Create a new channel',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'name',
            description: 'Channel name',
            type: ApplicationCommandOptionType.String,
            required: true,
            max_length: 100,
          },
          {
            name: 'type',
            description: 'Channel type',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              { name: 'Text', value: 'text' },
              { name: 'Voice', value: 'voice' },
              { name: 'Forum', value: 'forum' },
              { name: 'Announcement', value: 'announcement' },
            ],
          },
          {
            name: 'category',
            description: 'Category to place the channel in',
            type: ApplicationCommandOptionType.Channel,
            required: false,
          },
          {
            name: 'private',
            description: 'Make channel private (visible only to specified roles)',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
          },
        ],
      },
      {
        name: 'delete',
        description: 'Delete a channel',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'channel',
            description: 'The channel to delete',
            type: ApplicationCommandOptionType.Channel,
            required: true,
          },
        ],
      },
      {
        name: 'lock',
        description: 'Lock a channel (prevent @everyone from sending messages)',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'channel',
            description: 'The channel to lock (defaults to current)',
            type: ApplicationCommandOptionType.Channel,
            required: false,
          },
          {
            name: 'reason',
            description: 'Reason for locking',
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      },
      {
        name: 'unlock',
        description: 'Unlock a channel',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'channel',
            description: 'The channel to unlock (defaults to current)',
            type: ApplicationCommandOptionType.Channel,
            required: false,
          },
        ],
      },
      {
        name: 'slowmode',
        description: 'Set slowmode for a channel',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'seconds',
            description: 'Slowmode duration in seconds (0 to disable, max 21600)',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 0,
            max_value: 21600,
          },
          {
            name: 'channel',
            description: 'The channel to set slowmode on (defaults to current)',
            type: ApplicationCommandOptionType.Channel,
            required: false,
          },
        ],
      },
    ],
  },

  // ─── Moderation ─────────────────────────────────────────────────────────
  {
    name: 'mod',
    description: 'Moderation commands',
    default_member_permissions: KICK_MEMBERS,
    dm_permission: false,
    options: [
      {
        name: 'ban',
        description: 'Ban a member',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'The member to ban',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
          {
            name: 'reason',
            description: 'Reason for the ban',
            type: ApplicationCommandOptionType.String,
            required: false,
            max_length: 500,
          },
          {
            name: 'delete_days',
            description: 'Days of messages to delete (0-7)',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 0,
            max_value: 7,
          },
          {
            name: 'duration',
            description: 'Temporary ban duration (e.g. 7d, 24h, 30m) — leave blank for permanent',
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      },
      {
        name: 'kick',
        description: 'Kick a member',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'The member to kick',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
          {
            name: 'reason',
            description: 'Reason for the kick',
            type: ApplicationCommandOptionType.String,
            required: false,
            max_length: 500,
          },
        ],
      },
      {
        name: 'timeout',
        description: 'Timeout a member',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'The member to timeout',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
          {
            name: 'duration',
            description: 'Timeout duration (e.g. 10m, 1h, 7d)',
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: 'reason',
            description: 'Reason for the timeout',
            type: ApplicationCommandOptionType.String,
            required: false,
            max_length: 500,
          },
        ],
      },
      {
        name: 'warn',
        description: 'Warn a member',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'The member to warn',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
          {
            name: 'reason',
            description: 'Reason for the warning',
            type: ApplicationCommandOptionType.String,
            required: true,
            max_length: 500,
          },
        ],
      },
      {
        name: 'warnings',
        description: 'View warnings for a member',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'The member to view warnings for',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
      {
        name: 'purge',
        description: 'Bulk delete messages',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'amount',
            description: 'Number of messages to delete (2-100)',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 2,
            max_value: 100,
          },
          {
            name: 'user',
            description: 'Only delete messages from this user',
            type: ApplicationCommandOptionType.User,
            required: false,
          },
        ],
      },
      {
        name: 'case',
        description: 'View a moderation case',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'number',
            description: 'Case number',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 1,
          },
        ],
      },
      {
        name: 'modlog',
        description: 'Set up the moderation log channel',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'channel',
            description: 'Channel to send moderation logs to',
            type: ApplicationCommandOptionType.Channel,
            required: true,
          },
        ],
      },
    ],
  },
];
