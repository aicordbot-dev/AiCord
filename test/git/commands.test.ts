/**
 * test/git/commands.test.ts
 * Comprehensive unit tests for GitHub/GitLab Webhook Hub & AI PR Explainer — Slash Commands:
 * - Central Command Registry lookup & subcommands schema verification (link, list, unlink, explain, issue)
 * - Rate limit (5/10s), utility category, dm_permission: false, and options schema verification
 * - Permission enforcement (MANAGE_GUILD required on link and unlink)
 * - /git link: valid GitHub/GitLab URL, channel selection, custom events, duplicate link rejection, invalid URL rejection
 * - /git list: active feeds listing and empty server state
 * - /git unlink: unlinking by subscription ID and non-existent ID warning
 * - /git explain: AI PR plain-English explanation, PR URL repo extraction, and fallback repo resolution
 * - /git issue: issue formatting with repo, title, body, and author mention
 * - Main command router: DM rejection and unknown subcommand handling
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import {
  getCommand,
  registerGitCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  handleGitCommand,
  handleGitLinkSubcommand,
  handleGitListSubcommand,
  handleGitUnlinkSubcommand,
  handleGitExplainSubcommand,
  handleGitIssueSubcommand,
  gitCommand,
} from '@/commands/git';
import {
  enableTestMode,
  clearTestStore,
  linkRepository,
  setTestSubscription,
} from '@/lib/git/git-service';

describe('GitHub & GitLab Webhook Hub — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_git_cmd_999';
  const USER_ALICE = 'user_alice_git_111';
  const CHANNEL_DEV = 'channel_dev_333';
  const CHANNEL_ALERTS = 'channel_alerts_444';

  const PERMS_MANAGE_GUILD = PermissionFlags.MANAGE_GUILD.toString();
  const PERMS_ADMINISTRATOR = PermissionFlags.ADMINISTRATOR.toString();
  const PERMS_UNPRIVILEGED = '0';

  let interceptedResponses: Array<{
    token: string;
    options: InteractionResponseOptions;
  }> = [];

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();

    interceptedResponses = [];
    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });
  });

  afterEach(() => {
    setResponseHandler(null);
    clearTestStore();
    enableTestMode(false);
  });

  describe('Command Registry Integration & Schema', () => {
    it('registers /git in the central command registry', () => {
      registerGitCommands();
      const cmd = getCommand('git');
      assert.ok(cmd, 'git command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'git');
      assert.strictEqual(cmd?.category, 'utility');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines link, list, unlink, explain, and issue subcommands with valid option schemas', () => {
      const subcommands = gitCommand.options?.map(
        (o: unknown) => (o as { name: string }).name,
      );
      assert.deepStrictEqual(subcommands, [
        'link',
        'list',
        'unlink',
        'explain',
        'issue',
      ]);

      // Check 'link' options
      const linkSub = gitCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'link',
      ) as { options?: Array<{ name: string; required?: boolean; type: number }> };
      assert.ok(linkSub?.options?.some((o) => o.name === 'url' && o.required === true));
      assert.ok(linkSub?.options?.some((o) => o.name === 'channel' && o.required === false));
      assert.ok(linkSub?.options?.some((o) => o.name === 'events' && o.required === false));

      // Check 'list' options
      const listSub = gitCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'list',
      ) as { options?: unknown[] };
      assert.strictEqual(listSub?.options?.length, 0);

      // Check 'unlink' options
      const unlinkSub = gitCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'unlink',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(unlinkSub?.options?.some((o) => o.name === 'id' && o.required === true));

      // Check 'explain' options
      const explainSub = gitCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'explain',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(explainSub?.options?.some((o) => o.name === 'pr' && o.required === true));
      assert.ok(explainSub?.options?.some((o) => o.name === 'repo' && o.required === false));

      // Check 'issue' options
      const issueSub = gitCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'issue',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(issueSub?.options?.some((o) => o.name === 'repo' && o.required === true));
      assert.ok(issueSub?.options?.some((o) => o.name === 'title' && o.required === true));
      assert.ok(issueSub?.options?.some((o) => o.name === 'body' && o.required === true));
    });
  });

  describe('Permission Enforcement', () => {
    it('rejects /git link when user lacks MANAGE_GUILD permission', async () => {
      await handleGitLinkSubcommand(
        GUILD_ID,
        'token_perm_1',
        PERMS_UNPRIVILEGED,
        CHANNEL_DEV,
        [{ name: 'url', value: 'https://github.com/facebook/react' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Permission Denied'));
      assert.ok(embed?.description?.includes('MANAGE_GUILD'));
    });

    it('rejects /git unlink when user lacks MANAGE_GUILD permission', async () => {
      await handleGitUnlinkSubcommand(
        GUILD_ID,
        'token_perm_2',
        PERMS_UNPRIVILEGED,
        [{ name: 'id', value: 'git-1001' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Permission Denied'));
      assert.ok(embed?.description?.includes('MANAGE_GUILD'));
    });

    it('allows /git link when user has ADMINISTRATOR permission', async () => {
      await handleGitLinkSubcommand(
        GUILD_ID,
        'token_perm_admin',
        PERMS_ADMINISTRATOR,
        CHANNEL_DEV,
        [{ name: 'url', value: 'https://github.com/facebook/react' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Repository Linked Successfully'));
    });
  });

  describe('/git link Subcommand Execution', () => {
    it('successfully links a repository with default channel and events', async () => {
      await handleGitLinkSubcommand(
        GUILD_ID,
        'token_link_1',
        PERMS_MANAGE_GUILD,
        CHANNEL_DEV,
        [{ name: 'url', value: 'https://github.com/facebook/react' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Repository Linked Successfully'));
      assert.ok(embed?.description?.includes('facebook/react'));
      assert.ok(embed?.description?.includes(CHANNEL_DEV));
      assert.ok(embed?.description?.includes('AI PR Explainer'));
    });

    it('links a repository with an explicit channel and custom comma-separated events', async () => {
      await handleGitLinkSubcommand(
        GUILD_ID,
        'token_link_2',
        PERMS_MANAGE_GUILD,
        CHANNEL_DEV,
        [
          { name: 'url', value: 'https://gitlab.com/gitlab-org/gitlab' },
          { name: 'channel', value: CHANNEL_ALERTS },
          { name: 'events', value: 'push, pull_request' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Repository Linked Successfully'));
      assert.ok(embed?.description?.includes('gitlab-org/gitlab'));
      assert.ok(embed?.description?.includes(CHANNEL_ALERTS));
      assert.ok(embed?.description?.includes('push, pull_request'));
    });

    it('returns error embed when URL option is missing', async () => {
      await handleGitLinkSubcommand(
        GUILD_ID,
        'token_link_missing',
        PERMS_MANAGE_GUILD,
        CHANNEL_DEV,
        [],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Repository URL Required'));
    });

    it('returns error embed when repository is already linked to target channel', async () => {
      await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );

      await handleGitLinkSubcommand(
        GUILD_ID,
        'token_link_dup',
        PERMS_MANAGE_GUILD,
        CHANNEL_DEV,
        [{ name: 'url', value: 'https://github.com/facebook/react' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Git Link Error'));
      assert.ok(embed?.description?.includes('already linked'));
    });

    it('returns error embed when providing an invalid git URL', async () => {
      await handleGitLinkSubcommand(
        GUILD_ID,
        'token_link_inv',
        PERMS_MANAGE_GUILD,
        CHANNEL_DEV,
        [{ name: 'url', value: 'https://google.com/search' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Git Link Error'));
      assert.ok(embed?.description?.includes('Invalid Git repository URL'));
    });
  });

  describe('/git list Subcommand Execution', () => {
    it('displays connected repositories when feeds are configured', async () => {
      await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );

      await handleGitListSubcommand(GUILD_ID, 'token_list_1');

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Connected Git Repositories (1)'));
      assert.ok(embed?.description?.includes('facebook/react'));
      assert.ok(embed?.description?.includes('🐙 GitHub'));
    });

    it('displays empty state embed when no repositories are linked', async () => {
      await handleGitListSubcommand(GUILD_ID, 'token_list_empty');

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Connected Git Repositories'));
      assert.ok(embed?.description?.includes('No repository webhook feeds'));
    });
  });

  describe('/git unlink Subcommand Execution', () => {
    it('successfully unlinks an existing repository subscription', async () => {
      const sub = await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );

      await handleGitUnlinkSubcommand(
        GUILD_ID,
        'token_unlink_1',
        PERMS_MANAGE_GUILD,
        [{ name: 'id', value: sub.subscriptionId }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Repository Feed Unlinked'));
      assert.ok(embed?.description?.includes(sub.subscriptionId));
    });

    it('returns warning embed when subscription ID does not exist', async () => {
      await handleGitUnlinkSubcommand(
        GUILD_ID,
        'token_unlink_notfound',
        PERMS_MANAGE_GUILD,
        [{ name: 'id', value: 'git-nonexistent' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Subscription Not Found'));
    });

    it('returns error embed when id option is missing', async () => {
      await handleGitUnlinkSubcommand(
        GUILD_ID,
        'token_unlink_missing',
        PERMS_MANAGE_GUILD,
        [],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Subscription ID Required'));
    });
  });

  describe('/git explain Subcommand Execution', () => {
    it('generates a plain-English explanation for a PR title and repo', async () => {
      await handleGitExplainSubcommand(GUILD_ID, 'token_explain_1', [
        {
          name: 'pr',
          value: 'BREAKING CHANGE: upgrade API authentication headers',
        },
        { name: 'repo', value: 'facebook/react' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('AI Pull Request Explainer'));
      assert.ok(embed?.fields?.some((f) => f.name === 'Impact Rating' && f.value.includes('🔴 Breaking Change')));
      assert.ok(embed?.fields?.some((f) => f.name === 'What This Means (Non-Technical)'));
    });

    it('automatically extracts repository from a GitHub PR URL', async () => {
      await handleGitExplainSubcommand(GUILD_ID, 'token_explain_url', [
        {
          name: 'pr',
          value: 'https://github.com/vercel/next.js/pull/50000',
        },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.fields?.some((f) => f.name === 'Target Repository' && f.value.includes('vercel/next.js')));
    });

    it('falls back to guild linked repository when repo option is omitted', async () => {
      await linkRepository(
        GUILD_ID,
        'https://github.com/org/auto-resolved',
        CHANNEL_DEV,
      );

      await handleGitExplainSubcommand(GUILD_ID, 'token_explain_fallback', [
        { name: 'pr', value: 'fix: resolve edge case crash' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.fields?.some((f) => f.name === 'Target Repository' && f.value.includes('org/auto-resolved')));
    });

    it('returns error embed when pr option is missing', async () => {
      await handleGitExplainSubcommand(GUILD_ID, 'token_explain_missing', []);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('PR Details Required'));
    });
  });

  describe('/git issue Subcommand Execution', () => {
    it('creates and formats an issue card with title, body, and reporter', async () => {
      await handleGitIssueSubcommand(
        'token_issue_1',
        USER_ALICE,
        [
          { name: 'repo', value: 'facebook/react' },
          { name: 'title', value: 'Button click triggers twice' },
          { name: 'body', value: 'On mobile Safari, tapping button fires 2 events.' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Button click triggers twice'));
      assert.ok(embed?.fields?.some((f) => f.name === 'Repository' && f.value.includes('facebook/react')));
      assert.ok(embed?.fields?.some((f) => f.name === 'Reporter' && f.value.includes(USER_ALICE)));
      assert.ok(embed?.fields?.some((f) => f.name === 'Issue Description' && f.value.includes('tapping button')));
    });

    it('returns error embed when required fields are missing', async () => {
      await handleGitIssueSubcommand('token_issue_missing', USER_ALICE, [
        { name: 'repo', value: 'facebook/react' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Missing Issue Fields'));
    });
  });

  describe('Main Command Router & DM Rejection', () => {
    it('routes slash command interactions to proper subcommands', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        channel_id: CHANNEL_DEV,
        token: 'token_route_list',
        member: {
          user: { id: USER_ALICE },
          permissions: PERMS_MANAGE_GUILD,
        },
        data: {
          options: [
            {
              name: 'list',
              type: 1,
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleGitCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0]?.title?.includes('Connected Git Repositories'));
    });

    it('rejects /git when executed in DMs outside a server', async () => {
      const interaction = {
        guild_id: undefined,
        token: 'token_dm_fail',
        user: { id: USER_ALICE },
        data: {
          options: [{ name: 'list', type: 1 }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleGitCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Server Required'));
    });

    it('returns error on unknown subcommand', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_unknown',
        member: { user: { id: USER_ALICE } },
        data: {
          options: [{ name: 'unknown_sub', type: 1 }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleGitCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Unknown Subcommand'));
    });
  });
});
