/**
 * test/sandbox/commands.test.ts
 * Unit tests for Polyglot Code Sandbox Compiler — Slash Command (/run) & Components.
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import {
  getCommand,
  registerSandboxCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  setFollowUpHandler,
  setDeleteHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleRunCommand,
  handleCodeRunComponent,
  runCommand,
} from '@/commands/run';
import {
  enableTestMode,
  clearTestStore,
  disableTestMode,
} from '@/lib/sandbox/code-runner';
import { PermissionFlags } from '@/lib/discord/permissions';
import { clearRateLimits } from '@/lib/engines/rate-limiter';
import * as cache from '@/lib/engines/cache';

describe('Polyglot Code Sandbox — Slash Commands & Components', () => {
  const GUILD_ID = 'guild_run_test_101';
  const AUTHOR_ID = 'user_author_202';
  const STRANGER_ID = 'user_stranger_303';
  const MOD_ID = 'user_mod_404';

  let interceptedResponses: Array<{
    token: string;
    options: InteractionResponseOptions;
  }> = [];

  let interceptedFollowUps: Array<{
    token: string;
    options: InteractionResponseOptions;
  }> = [];

  let deletedTokens: string[] = [];

  beforeEach(() => {
    enableTestMode();
    clearTestStore();
    clearRateLimits();

    interceptedResponses = [];
    interceptedFollowUps = [];
    deletedTokens = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });

    setFollowUpHandler(async (token, options) => {
      interceptedFollowUps.push({ token, options });
      return { id: 'mock_followup_msg_id' };
    });

    setDeleteHandler(async (token) => {
      deletedTokens.push(token);
    });
  });

  afterEach(async () => {
    setResponseHandler(null);
    setFollowUpHandler(null);
    setDeleteHandler(null);
    clearTestStore();
    disableTestMode();
    clearRateLimits();
    await cache.clear();
  });

  describe('Command Registry Integration & Schema Validation', () => {
    it('registers /run in the central command registry with utility category and rate limits', () => {
      registerSandboxCommands();
      const cmd = getCommand('run');
      assert.ok(cmd, 'Command /run should be registered');
      assert.equal(cmd?.name, 'run');
      assert.equal(cmd?.category, 'utility');
      assert.deepEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
    });

    it('defines valid options schema for code and language with all 6 choices', () => {
      const options = runCommand.options as Array<{
        name: string;
        type: number;
        required?: boolean;
        choices?: Array<{ name: string; value: string }>;
      }>;
      assert.ok(options, 'Options should be defined');
      assert.equal(options.length, 2);

      const codeOpt = options.find((o) => o.name === 'code');
      assert.ok(codeOpt);
      assert.equal(codeOpt?.type, 3); // String
      assert.equal(codeOpt?.required, true);

      const langOpt = options.find((o) => o.name === 'language');
      assert.ok(langOpt);
      assert.equal(langOpt?.type, 3); // String
      assert.equal(langOpt?.required, false);
      assert.ok(langOpt?.choices);
      assert.equal(langOpt?.choices?.length, 6);

      const choiceValues = langOpt?.choices?.map((c) => c.value);
      assert.deepEqual(choiceValues, [
        'javascript',
        'typescript',
        'python',
        'rust',
        'go',
        'cpp',
      ]);
    });
  });

  describe('/run Slash Command Execution', () => {
    it('executes JavaScript code and edits deferred interaction response with embed and button', async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        id: 'inter_1',
        application_id: 'app_1',
        type: 2,
        token: 'token_run_js_01',
        version: 1,
        guild_id: GUILD_ID,
        user: { id: AUTHOR_ID, username: 'dev_user', discriminator: '0001', avatar: null, global_name: 'Dev' },
        data: {
          id: 'cmd_1',
          name: 'run',
          type: 1,
          options: [
            { name: 'code', type: 3, value: 'console.log("Hello from /run test!");' },
            { name: 'language', type: 3, value: 'javascript' },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.equal(res.token, 'token_run_js_01');

      const embed = res.options.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed?.description?.includes('🟢'));
      assert.ok(embed?.description?.includes('Success'));

      const stdoutField = embed?.fields?.find((f) => f.name.includes('Output'));
      assert.ok(stdoutField?.value.includes('Hello from /run test!'));

      // Check action components
      const components = res.options.components as Array<{
        type: number;
        components: Array<{ custom_id: string; label: string }>;
      }>;
      assert.ok(components && components.length > 0);
      assert.equal(components[0].components[0].custom_id, `run_delete:${AUTHOR_ID}`);
      assert.equal(components[0].components[0].label, 'Delete Output');
    });

    it('executes Python code when language is explicitly provided', async () => {
      const interaction = {
        token: 'token_run_py_02',
        user: { id: AUTHOR_ID },
        data: {
          name: 'run',
          options: [
            { name: 'code', value: 'print("Python execution in slash command")' },
            { name: 'language', value: 'python' },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('🟢'));
      const stdoutField = embed?.fields?.find((f) => f.name.includes('Output'));
      assert.ok(stdoutField?.value.includes('Python execution in slash command'));
    });

    it('auto-detects Rust language when language option is omitted', async () => {
      const rustSnippet = 'fn main() {\n  println!("Auto-detected Rust!");\n}';
      const interaction = {
        token: 'token_run_rust_03',
        user: { id: AUTHOR_ID },
        data: {
          name: 'run',
          options: [{ name: 'code', value: rustSnippet }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('🟢'));
      const langField = embed?.fields?.find((f) => f.name === 'Language');
      assert.equal(langField?.value, 'Rust');
      const stdoutField = embed?.fields?.find((f) => f.name.includes('Output'));
      assert.ok(stdoutField?.value.includes('Auto-detected Rust!'));
    });

    it('unwraps markdown code fences cleanly', async () => {
      const fencedCode = '```go\npackage main\nimport "fmt"\nfunc main() {\nfmt.Println("Inside fence")\n}\n```';
      const interaction = {
        token: 'token_run_fence_04',
        user: { id: AUTHOR_ID },
        data: {
          name: 'run',
          options: [{ name: 'code', value: fencedCode }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('🟢'));
      const stdoutField = embed?.fields?.find((f) => f.name.includes('Output'));
      assert.ok(stdoutField?.value.includes('Inside fence'));
    });
  });

  describe('Validation & Error Handling', () => {
    it('rejects empty or whitespace-only code snippet', async () => {
      const interaction = {
        token: 'token_err_empty',
        user: { id: AUTHOR_ID },
        data: {
          name: 'run',
          options: [{ name: 'code', value: '   ' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.equal(res.options.ephemeral, true);
      assert.ok(res.options.embeds?.[0]?.title?.includes('Invalid Code'));
    });

    it('rejects code snippet exceeding 4000 characters', async () => {
      const hugeCode = 'x'.repeat(4001);
      const interaction = {
        token: 'token_err_huge',
        user: { id: AUTHOR_ID },
        data: {
          name: 'run',
          options: [{ name: 'code', value: hugeCode }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.equal(res.options.ephemeral, true);
      assert.ok(res.options.embeds?.[0]?.title?.includes('Code Too Long'));
    });

    it('formats syntax errors into error embed with red badge', async () => {
      const interaction = {
        token: 'token_syntax_err',
        user: { id: AUTHOR_ID },
        data: {
          name: 'run',
          options: [{ name: 'code', value: 'const x = ;' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('🔴'));
      assert.ok(embed?.description?.includes('Runtime Error'));
      const errField = embed?.fields?.find((f) => f.name.includes('Error Details'));
      assert.ok(errField?.value.includes('SyntaxError'));
    });

    it('handles infinite loop timeout and formats timeout notice with amber badge', async () => {
      const interaction = {
        token: 'token_timeout',
        user: { id: AUTHOR_ID },
        data: {
          name: 'run',
          options: [{ name: 'code', value: 'while (true) {}' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('⏱️'));
      assert.ok(embed?.description?.includes('Execution Timeout'));
      const noticeField = embed?.fields?.find((f) => f.name.includes('Timeout Notice'));
      assert.ok(noticeField?.value.includes('timed out'));
    });

    it('warns when /run is disabled in server configuration', async () => {
      await cache.set(`guild_config:${GUILD_ID}`, { disabledCommands: ['run'] }, 60);

      const interaction = {
        token: 'token_disabled',
        guild_id: GUILD_ID,
        user: { id: AUTHOR_ID },
        data: {
          name: 'run',
          options: [{ name: 'code', value: 'console.log("Disabled")' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRunCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.equal(res.options.ephemeral, true);
      assert.ok(res.options.embeds?.[0]?.title?.includes('Command Disabled'));
    });

    it('enforces rate limiting when user exceeds 5 calls per 10 seconds', async () => {
      const makeInteraction = (idx: number) =>
        ({
          token: `token_rl_${idx}`,
          user: { id: AUTHOR_ID },
          data: {
            name: 'run',
            options: [{ name: 'code', value: `console.log(${idx});` }],
          },
        }) as unknown as APIChatInputApplicationCommandInteraction;

      // Exhaust 5 permitted requests
      for (let i = 0; i < 5; i++) {
        await handleRunCommand(makeInteraction(i));
      }

      // 6th request should hit rate limit
      await handleRunCommand(makeInteraction(5));

      const lastResponse = interceptedResponses[interceptedResponses.length - 1];
      assert.equal(lastResponse.options.ephemeral, true);
      assert.ok(lastResponse.options.embeds?.[0]?.title?.includes('Rate Limit Exceeded'));
    });
  });

  describe('Interactive Component Handler (handleCodeRunComponent)', () => {
    it('allows the original code author to delete the output message', async () => {
      const component: APIMessageComponentInteraction = {
        token: 'token_del_author',
        custom_id: `run_delete:${AUTHOR_ID}`,
        member: {
          user: { id: AUTHOR_ID },
          permissions: '0',
        },
      } as unknown as APIMessageComponentInteraction;

      await handleCodeRunComponent(
        'token_del_author',
        `run_delete:${AUTHOR_ID}`,
        AUTHOR_ID,
        GUILD_ID,
        component,
      );

      assert.equal(deletedTokens.length, 1);
      assert.equal(deletedTokens[0], 'token_del_author');
      assert.equal(interceptedFollowUps.length, 0);
    });

    it('allows a moderator with MANAGE_MESSAGES permission to delete the output', async () => {
      const modPermissions = PermissionFlags.MANAGE_MESSAGES.toString();
      const component: APIMessageComponentInteraction = {
        token: 'token_del_mod',
        custom_id: `run_delete:${AUTHOR_ID}`,
        member: {
          user: { id: MOD_ID },
          permissions: modPermissions,
        },
      } as unknown as APIMessageComponentInteraction;

      await handleCodeRunComponent(
        'token_del_mod',
        `run_delete:${AUTHOR_ID}`,
        MOD_ID,
        GUILD_ID,
        component,
      );

      assert.equal(deletedTokens.length, 1);
      assert.equal(deletedTokens[0], 'token_del_mod');
      assert.equal(interceptedFollowUps.length, 0);
    });

    it('rejects deletion when a non-author without permissions clicks delete', async () => {
      const component: APIMessageComponentInteraction = {
        token: 'token_del_stranger',
        custom_id: `run_delete:${AUTHOR_ID}`,
        member: {
          user: { id: STRANGER_ID },
          permissions: '0', // No MANAGE_MESSAGES
        },
      } as unknown as APIMessageComponentInteraction;

      await handleCodeRunComponent(
        'token_del_stranger',
        `run_delete:${AUTHOR_ID}`,
        STRANGER_ID,
        GUILD_ID,
        component,
      );

      // Deletion should NOT have been performed
      assert.equal(deletedTokens.length, 0);

      // Ephemeral error follow-up sent
      assert.equal(interceptedFollowUps.length, 1);
      const followUp = interceptedFollowUps[0];
      assert.equal(followUp.token, 'token_del_stranger');
      assert.equal(followUp.options.ephemeral, true);
      assert.ok(followUp.options.embeds?.[0]?.title?.includes('Permission Denied'));
    });

    it('ignores components with unrelated customIds', async () => {
      const component = {} as APIMessageComponentInteraction;
      await handleCodeRunComponent(
        'token_ignore',
        'other_action:123',
        AUTHOR_ID,
        GUILD_ID,
        component,
      );

      assert.equal(deletedTokens.length, 0);
      assert.equal(interceptedFollowUps.length, 0);
    });
  });
});
