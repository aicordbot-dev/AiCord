/**
 * test/discord/command-registry.test.ts
 * Unit tests for the Central Command Registry & Dynamic Autocomplete Engine (Phase 14).
 *
 * Covers:
 * - Command registration, retrieval, and duplicates handling
 * - Discord JSON schema formatting and backwards-compatible definitions
 * - Autocomplete routing, nested option tree traversal, and 25-choice/100-char truncation
 * - Rate limiting middleware integration (Phase 22 RateLimiter)
 * - Guild disabled commands enforcement (GuildConfig.disabledCommands with cache)
 * - Error handling resilience and polite embed responses without stack trace leaks
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerCommand,
  unregisterCommand,
  getCommand,
  getAllCommands,
  clearRegistry,
  registerBuiltinCommands,
  toDiscordCommandJson,
  getAllDiscordCommandJson,
  findFocusedOption,
  handleCommandInteraction,
  handleAutocompleteInteraction,
  setResponseHandler,
  type RegisteredCommand,
  type AutocompleteContext,
} from '@/lib/discord/command-registry';
import { COMMANDS } from '@/lib/discord/command-definitions';
import { clearRateLimits } from '@/lib/engines/rate-limiter';
import { cache } from '@/lib/engines/cache';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import type { InteractionResponseOptions } from '@/lib/discord/interaction-response';

describe('Central Command Registry', () => {
  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  beforeEach(() => {
    clearRegistry();
    clearRateLimits();
    cache.clear();
    interceptedResponses = [];

    // Intercept outgoing interaction edits
    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });
  });

  afterEach(() => {
    setResponseHandler(null);
  });

  // ─── 1. Command Registration & Retrieval ─────────────────────────────────

  describe('Command Registration & Retrieval', () => {
    it('registers a new command and retrieves it by name', () => {
      const mockCmd: RegisteredCommand = {
        name: 'ping',
        description: 'Test ping command',
        category: 'utility',
        execute: async () => {},
      };

      registerCommand(mockCmd);

      const retrieved = getCommand('ping');
      assert.ok(retrieved);
      assert.equal(retrieved.name, 'ping');
      assert.equal(retrieved.description, 'Test ping command');
      assert.equal(retrieved.category, 'utility');
    });

    it('returns undefined for unregistered commands', () => {
      assert.equal(getCommand('nonexistent'), undefined);
    });

    it('retrieves all registered commands via getAllCommands()', () => {
      registerCommand({
        name: 'cmd1',
        description: 'First test command',
        category: 'test',
        execute: async () => {},
      });
      registerCommand({
        name: 'cmd2',
        description: 'Second test command',
        category: 'test',
        execute: async () => {},
      });

      const all = getAllCommands();
      assert.equal(all.length, 2);
      assert.deepEqual(all.map((c) => c.name).sort(), ['cmd1', 'cmd2']);
    });

    it('handles duplicates by overwriting existing registration without inflating count', () => {
      let v1Called = false;
      let v2Called = false;

      const v1: RegisteredCommand = {
        name: 'test_cmd',
        description: 'Version 1',
        category: 'test',
        execute: async () => {
          v1Called = true;
        },
      };

      const v2: RegisteredCommand = {
        name: 'test_cmd',
        description: 'Version 2 updated',
        category: 'test-v2',
        execute: async () => {
          v2Called = true;
        },
      };

      registerCommand(v1);
      assert.equal(getAllCommands().length, 1);
      assert.equal(getCommand('test_cmd')?.description, 'Version 1');

      // Re-register with same name
      registerCommand(v2);
      assert.equal(getAllCommands().length, 1);
      assert.equal(getCommand('test_cmd')?.description, 'Version 2 updated');
      assert.equal(getCommand('test_cmd')?.category, 'test-v2');

      const current = getCommand('test_cmd');
      current?.execute({} as unknown as APIChatInputApplicationCommandInteraction);
      assert.equal(v1Called, false);
      assert.equal(v2Called, true);
    });

    it('unregisters a command cleanly', () => {
      registerCommand({
        name: 'temp',
        description: 'Temporary',
        category: 'test',
        execute: async () => {},
      });

      assert.ok(getCommand('temp'));
      const deleted = unregisterCommand('temp');
      assert.equal(deleted, true);
      assert.equal(getCommand('temp'), undefined);
      assert.equal(unregisterCommand('temp'), false);
    });

    it('throws when registering a command with empty or missing name', () => {
      assert.throws(() => {
        registerCommand({
          name: '',
          description: 'No name',
          category: 'invalid',
          execute: async () => {},
        });
      }, /valid name/);
    });

    it('registers and retrieves all built-in commands', () => {
      registerBuiltinCommands();

      const commands = getAllCommands();
      const names = commands.map((c) => c.name);

      assert.ok(names.includes('build'));
      assert.ok(names.includes('ai'));
      assert.ok(names.includes('role'));
      assert.ok(names.includes('channel'));
      assert.ok(names.includes('mod'));
      assert.equal(commands.length, 5);
    });
  });

  // ─── 2. Discord JSON Conversion ──────────────────────────────────────────

  describe('Discord JSON Conversion', () => {
    it('converts RegisteredCommand to Discord slash command JSON format', () => {
      const cmd: RegisteredCommand = {
        name: 'test',
        description: 'A test command',
        category: 'testing',
        default_member_permissions: '8',
        dm_permission: false,
        options: [{ name: 'opt', description: 'an option', type: 3, required: true }],
        execute: async () => {},
      };

      const json = toDiscordCommandJson(cmd);

      assert.deepEqual(json, {
        name: 'test',
        description: 'A test command',
        default_member_permissions: '8',
        dm_permission: false,
        options: [{ name: 'opt', description: 'an option', type: 3, required: true }],
      });
    });

    it('omits undefined optional fields from JSON output', () => {
      const minimalCmd: RegisteredCommand = {
        name: 'minimal',
        description: 'Minimal command',
        category: 'testing',
        execute: async () => {},
      };

      const json = toDiscordCommandJson(minimalCmd);

      assert.deepEqual(json, {
        name: 'minimal',
        description: 'Minimal command',
      });
      assert.equal('options' in json, false);
      assert.equal('default_member_permissions' in json, false);
      assert.equal('dm_permission' in json, false);
    });

    it('formats all commands in registry for Discord REST API payload', () => {
      registerBuiltinCommands();
      const jsonList = getAllDiscordCommandJson();

      assert.equal(jsonList.length, 5);
      for (const item of jsonList) {
        assert.ok(item.name);
        assert.ok(item.description);
      }
    });

    it('verifies COMMANDS export matches registered builtins for 100% backwards compatibility', () => {
      registerBuiltinCommands();
      assert.equal(COMMANDS.length, 5);
      const names = COMMANDS.map((c) => c.name);
      assert.deepEqual(names.sort(), ['ai', 'build', 'channel', 'mod', 'role'].sort());
    });
  });

  // ─── 3. Dynamic Autocomplete Engine ──────────────────────────────────────

  describe('Dynamic Autocomplete Engine', () => {
    describe('findFocusedOption()', () => {
      it('finds focused option at root level', () => {
        const options = [
          { name: 'query', type: 3, value: 'hello', focused: true },
          { name: 'limit', type: 4, value: 10 },
        ];

        const focused = findFocusedOption(options);
        assert.deepEqual(focused, {
          name: 'query',
          value: 'hello',
          type: 3,
        });
      });

      it('finds focused option inside nested subcommand', () => {
        const options = [
          {
            name: 'case',
            type: 1, // Subcommand
            options: [
              { name: 'number', type: 4, value: 42, focused: true },
            ],
          },
        ];

        const focused = findFocusedOption(options);
        assert.deepEqual(focused, {
          name: 'number',
          value: '42',
          type: 4,
        });
      });

      it('finds focused option inside deeply nested subcommand-group', () => {
        const options = [
          {
            name: 'settings',
            type: 2, // Subcommand Group
            options: [
              {
                name: 'channel',
                type: 1, // Subcommand
                options: [
                  { name: 'target', type: 7, value: 'announcements', focused: true },
                ],
              },
            ],
          },
        ];

        const focused = findFocusedOption(options);
        assert.deepEqual(focused, {
          name: 'target',
          value: 'announcements',
          type: 7,
        });
      });

      it('returns undefined when no option is focused or options is empty', () => {
        assert.equal(findFocusedOption([]), undefined);
        assert.equal(findFocusedOption(undefined), undefined);
        assert.equal(
          findFocusedOption([{ name: 'unfocused', type: 3, value: 'val' }]),
          undefined,
        );
      });
    });

    describe('handleAutocompleteInteraction()', () => {
      it('routes to matching command autocomplete handler with full AutocompleteContext', async () => {
        let capturedCtx: AutocompleteContext | null = null;

        registerCommand({
          name: 'search',
          description: 'Search something',
          category: 'utility',
          execute: async () => {},
          autocomplete: async (ctx) => {
            capturedCtx = ctx;
            return [
              { name: 'Result 1', value: 'res_1' },
              { name: 'Result 2', value: 'res_2' },
            ];
          },
        });

        const interaction = {
          data: {
            name: 'search',
            options: [
              { name: 'query', type: 3, value: 'term', focused: true },
            ],
          },
          guild_id: 'guild_test_123',
          member: {
            user: { id: 'user_test_456' },
          },
        };

        const choices = await handleAutocompleteInteraction(interaction);

        assert.equal(choices.length, 2);
        assert.equal(choices[0].name, 'Result 1');
        assert.equal(choices[0].value, 'res_1');

        assert.ok(capturedCtx);
        const ctx: AutocompleteContext = capturedCtx;
        assert.equal(ctx.commandName, 'search');
        assert.equal(ctx.guildId, 'guild_test_123');
        assert.equal(ctx.userId, 'user_test_456');
        assert.deepEqual(ctx.focusedOption, {
          name: 'query',
          value: 'term',
          type: 3,
        });
      });

      it('enforces Discord hard constraint: truncates results to maximum 25 choices', async () => {
        registerCommand({
          name: 'huge_list',
          description: 'Produces 50 choices',
          category: 'utility',
          execute: async () => {},
          autocomplete: async () => {
            return Array.from({ length: 50 }, (_, i) => ({
              name: `Choice #${i + 1}`,
              value: `val_${i + 1}`,
            }));
          },
        });

        const interaction = {
          data: {
            name: 'huge_list',
            options: [{ name: 'item', type: 3, value: '', focused: true }],
          },
        };

        const choices = await handleAutocompleteInteraction(interaction);
        assert.equal(choices.length, 25);
        assert.equal(choices[0].name, 'Choice #1');
        assert.equal(choices[24].name, 'Choice #25');
      });

      it('enforces Discord maximum 100-character constraint for choice names and string values', async () => {
        const longName = 'A'.repeat(150);
        const longValue = 'B'.repeat(200);

        registerCommand({
          name: 'overflow',
          description: 'Long strings',
          category: 'utility',
          execute: async () => {},
          autocomplete: async () => [
            { name: longName, value: longValue },
            { name: 'Numeric Value', value: 999 },
          ],
        });

        const interaction = {
          data: {
            name: 'overflow',
            options: [{ name: 'arg', type: 3, value: '', focused: true }],
          },
        };

        const choices = await handleAutocompleteInteraction(interaction);
        assert.equal(choices.length, 2);
        assert.equal(choices[0].name.length, 100);
        assert.equal((choices[0].value as string).length, 100);
        assert.equal(choices[1].name, 'Numeric Value');
        assert.equal(choices[1].value, 999);
      });

      it('returns empty array if command has no autocomplete handler or command is unknown', async () => {
        registerCommand({
          name: 'no_auto',
          description: 'No autocomplete',
          category: 'test',
          execute: async () => {},
        });

        const r1 = await handleAutocompleteInteraction({
          data: { name: 'no_auto', options: [] },
        });
        assert.deepEqual(r1, []);

        const r2 = await handleAutocompleteInteraction({
          data: { name: 'unknown_cmd', options: [] },
        });
        assert.deepEqual(r2, []);
      });

      it('catches autocomplete handler errors safely and returns empty array', async () => {
        registerCommand({
          name: 'crashing_auto',
          description: 'Throws error',
          category: 'test',
          execute: async () => {},
          autocomplete: async () => {
            throw new Error('Database connection failed');
          },
        });

        const choices = await handleAutocompleteInteraction({
          data: {
            name: 'crashing_auto',
            options: [{ name: 'q', type: 3, value: 'x', focused: true }],
          },
        });

        assert.deepEqual(choices, []);
      });

      it('autocompletes built-in /build templates accurately', async () => {
        registerBuiltinCommands();

        const interaction = {
          data: {
            name: 'build',
            options: [
              { name: 'template', type: 3, value: 'gam', focused: true },
            ],
          },
        };

        const choices = await handleAutocompleteInteraction(interaction);
        assert.ok(choices.length > 0);
        assert.ok(choices.some((c) => c.value === 'gaming'));
      });
    });
  });

  // ─── 4. Rate Limiting Middleware ─────────────────────────────────────────

  describe('Rate Limiting Middleware', () => {
    it('allows command execution within rate limit', async () => {
      let executions = 0;

      registerCommand({
        name: 'limited_cmd',
        description: 'Rate limited command',
        category: 'test',
        rateLimit: { limit: 2, windowMs: 10_000 },
        execute: async () => {
          executions++;
        },
      });

      const interaction = {
        token: 'token_1',
        data: { name: 'limited_cmd' },
        member: { user: { id: 'rate_user_1' } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCommandInteraction(interaction);
      await handleCommandInteraction(interaction);

      assert.equal(executions, 2);
      assert.equal(interceptedResponses.length, 0);
    });

    it('blocks command execution and returns warning embed when rate limit is exceeded', async () => {
      let executions = 0;

      registerCommand({
        name: 'strictly_limited',
        description: 'Limit of 1',
        category: 'test',
        rateLimit: { limit: 1, windowMs: 5_000 },
        execute: async () => {
          executions++;
        },
      });

      const interaction = {
        token: 'interaction_token_123',
        data: { name: 'strictly_limited' },
        member: { user: { id: 'user_throttled' } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      // First call succeeds
      await handleCommandInteraction(interaction);
      assert.equal(executions, 1);
      assert.equal(interceptedResponses.length, 0);

      // Second call is rate-limited
      await handleCommandInteraction(interaction);
      assert.equal(executions, 1); // Not incremented!
      assert.equal(interceptedResponses.length, 1);

      const response = interceptedResponses[0];
      assert.equal(response.token, 'interaction_token_123');
      assert.ok(response.options.embeds);
      assert.ok(response.options.embeds[0].title?.includes('Rate Limit Exceeded'));
      assert.ok(response.options.embeds[0].description?.includes('/strictly_limited'));
      assert.equal(response.options.ephemeral, true);
    });

    it('applies rate limits per-user without cross-user interference', async () => {
      let executions = 0;

      registerCommand({
        name: 'per_user_limit',
        description: 'Limit 1 per user',
        category: 'test',
        rateLimit: { limit: 1, windowMs: 5_000 },
        execute: async () => {
          executions++;
        },
      });

      const user1Interaction = {
        token: 'tok_user1',
        data: { name: 'per_user_limit' },
        member: { user: { id: 'user_alpha' } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      const user2Interaction = {
        token: 'tok_user2',
        data: { name: 'per_user_limit' },
        member: { user: { id: 'user_beta' } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCommandInteraction(user1Interaction);
      await handleCommandInteraction(user2Interaction);

      // Both users executed their single quota successfully
      assert.equal(executions, 2);
      assert.equal(interceptedResponses.length, 0);
    });
  });

  // ─── 5. Guild Disabled Commands ──────────────────────────────────────────

  describe('Guild Disabled Commands Check', () => {
    it('allows execution when guild does not disable the command', async () => {
      let executed = false;

      registerCommand({
        name: 'allowed_cmd',
        description: 'Always allowed',
        category: 'test',
        execute: async () => {
          executed = true;
        },
      });

      // Populate cached guild config with no disabled commands
      await cache.set('guild_config:guild_active', {
        guildId: 'guild_active',
        disabledCommands: ['some_other_cmd'],
      });

      const interaction = {
        token: 'token_allow',
        guild_id: 'guild_active',
        data: { name: 'allowed_cmd' },
        member: { user: { id: 'member_1' } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCommandInteraction(interaction);

      assert.equal(executed, true);
      assert.equal(interceptedResponses.length, 0);
    });

    it('blocks execution with error embed when command is listed in GuildConfig.disabledCommands', async () => {
      let executed = false;

      registerCommand({
        name: 'moderation_ban',
        description: 'Ban command',
        category: 'moderation',
        execute: async () => {
          executed = true;
        },
      });

      // Populate cached guild config with disabled moderation_ban
      await cache.set('guild_config:guild_locked_down', {
        guildId: 'guild_locked_down',
        disabledCommands: ['moderation_ban', 'moderation_kick'],
      });

      const interaction = {
        token: 'token_disabled_check',
        guild_id: 'guild_locked_down',
        data: { name: 'moderation_ban' },
        member: { user: { id: 'mod_1' } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCommandInteraction(interaction);

      assert.equal(executed, false);
      assert.equal(interceptedResponses.length, 1);

      const res = interceptedResponses[0];
      assert.equal(res.token, 'token_disabled_check');
      assert.ok(res.options.embeds);
      assert.ok(res.options.embeds[0].title?.includes('Command Disabled'));
      assert.ok(res.options.embeds[0].description?.includes('/moderation_ban'));
      assert.equal(res.options.ephemeral, true);
    });
  });

  // ─── 6. Error Handling Resilience ────────────────────────────────────────

  describe('Error Handling Resilience', () => {
    it('catches unexpected execution errors cleanly and sends polite embed without stack traces', async () => {
      registerCommand({
        name: 'exploding_cmd',
        description: 'Throws an unhandled exception',
        category: 'test',
        execute: async () => {
          throw new Error('FATAL: Secret database credentials crashed at line 42: mysql://root:secret@10.0.0.1');
        },
      });

      const interaction = {
        token: 'token_exploding',
        data: { name: 'exploding_cmd' },
        member: { user: { id: 'user_victim' } },
      } as unknown as APIChatInputApplicationCommandInteraction;

      // Must not throw an unhandled rejection
      await handleCommandInteraction(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.equal(res.token, 'token_exploding');
      assert.ok(res.options.embeds);

      const embed = res.options.embeds[0];
      assert.ok(embed.title?.includes('Command Error'));
      // Verifies no sensitive info or stack trace leaked
      assert.ok(!embed.description?.includes('Secret database'));
      assert.ok(!embed.description?.includes('mysql://'));
      assert.ok(embed.description?.includes('unexpected error occurred'));
    });

    it('handles unrecognized command requests with a polite unknown command embed', async () => {
      const interaction = {
        token: 'token_unknown',
        data: { name: 'ghost_cmd' },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleCommandInteraction(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds);
      assert.ok(res.options.embeds[0].title?.includes('Unknown Command'));
      assert.ok(res.options.embeds[0].description?.includes('/ghost_cmd'));
    });
  });
});
