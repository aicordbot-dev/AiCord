/**
 * test/git/git-service.test.ts
 * Comprehensive unit tests for GitHub/GitLab Webhook Hub & AI PR Explainer — Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestSubscription, getTestSubscription)
 * - Git repository URL parser supporting GitHub and GitLab (HTTPS, SSH, bare host, .git handling)
 * - Invalid and non-git URL rejection
 * - Linking repositories, duplicate link prevention to same channel, multi-channel support, unlinking
 * - AI PR explanation generator, 3-tier impact rating (low, moderate, high), plain-English 3-bullet takeaways
 * - Discord embed presentation for Push commit feeds, PR events, Issue events, AI PR explanations, and subscription lists
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestSubscription,
  getTestSubscription,
  getAllTestSubscriptions,
  generateSubscriptionId,
  parseGitUrl,
  isValidGitUrl,
  linkRepository,
  listSubscriptions,
  unlinkRepository,
  explainPullRequest,
  generateDeterministicPRExplanation,
  buildGitFeedEmbed,
  buildPRExplanationEmbed,
  buildSubscriptionsListEmbed,
  buildGitIssueEmbed,
  PR_IMPACT_BADGES,
  PR_IMPACT_COLORS,
  GIT_COLOR_GITHUB,
  GIT_COLOR_GITLAB,
  type IGitSubscription,
} from '@/lib/git/git-service';

describe('GitHub & GitLab Webhook Hub — Service Engine', () => {
  const GUILD_ID = 'guild_git_test_001';
  const OTHER_GUILD = 'guild_git_test_002';
  const CHANNEL_DEV = 'channel_dev_111';
  const CHANNEL_ALERTS = 'channel_alerts_222';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('Test Store Lifecycle', () => {
    it('manages testMode state toggles correctly', () => {
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
    });

    it('sets and retrieves test subscription record with canonical defaults', () => {
      const sub = setTestSubscription({
        guildId: GUILD_ID,
        repoName: 'facebook/react',
        channelId: CHANNEL_DEV,
      });

      assert.ok(sub);
      assert.strictEqual(sub.guildId, GUILD_ID);
      assert.strictEqual(sub.repoName, 'facebook/react');
      assert.strictEqual(sub.provider, 'github');
      assert.strictEqual(sub.channelId, CHANNEL_DEV);
      assert.ok(sub.subscriptionId.startsWith('git-'));
      assert.deepStrictEqual(sub.events, ['push', 'pull_request', 'issues']);
      assert.strictEqual(sub.aiExplain, true);

      const fetched = getTestSubscription(sub.subscriptionId);
      assert.ok(fetched);
      assert.strictEqual(fetched.repoName, 'facebook/react');
    });

    it('clears test store completely', () => {
      const sub = setTestSubscription({
        guildId: GUILD_ID,
        repoName: 'vercel/next.js',
        channelId: CHANNEL_DEV,
      });

      assert.ok(getTestSubscription(sub.subscriptionId));
      clearTestStore();
      assert.strictEqual(getTestSubscription(sub.subscriptionId), undefined);
      assert.strictEqual(getAllTestSubscriptions().length, 0);
    });

    it('generates consistent git-XXXX subscription IDs', () => {
      const id1 = generateSubscriptionId();
      const id2 = generateSubscriptionId();
      assert.ok(id1.startsWith('git-'));
      assert.ok(id2.startsWith('git-'));
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('Git Repository URL Parser', () => {
    it('parses standard HTTPS GitHub repository URLs', () => {
      const parsed = parseGitUrl('https://github.com/facebook/react');
      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'github');
      assert.strictEqual(parsed.owner, 'facebook');
      assert.strictEqual(parsed.repo, 'react');
      assert.strictEqual(parsed.repoName, 'facebook/react');
    });

    it('parses GitHub URLs ending with .git and trailing slashes', () => {
      const parsed = parseGitUrl('https://github.com/vercel/next.js.git/');
      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'github');
      assert.strictEqual(parsed.owner, 'vercel');
      assert.strictEqual(parsed.repo, 'next.js');
      assert.strictEqual(parsed.repoName, 'vercel/next.js');
    });

    it('parses GitHub SSH format (git@github.com:owner/repo.git)', () => {
      const parsed = parseGitUrl('git@github.com:octocat/Hello-World.git');
      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'github');
      assert.strictEqual(parsed.owner, 'octocat');
      assert.strictEqual(parsed.repo, 'Hello-World');
      assert.strictEqual(parsed.repoName, 'octocat/Hello-World');
    });

    it('parses bare GitHub domain without protocol', () => {
      const parsed = parseGitUrl('github.com/microsoft/typescript');
      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'github');
      assert.strictEqual(parsed.owner, 'microsoft');
      assert.strictEqual(parsed.repo, 'typescript');
      assert.strictEqual(parsed.repoName, 'microsoft/typescript');
    });

    it('parses standard HTTPS GitLab repository URLs', () => {
      const parsed = parseGitUrl('https://gitlab.com/gitlab-org/gitlab');
      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'gitlab');
      assert.strictEqual(parsed.owner, 'gitlab-org');
      assert.strictEqual(parsed.repo, 'gitlab');
      assert.strictEqual(parsed.repoName, 'gitlab-org/gitlab');
    });

    it('parses GitLab SSH format (git@gitlab.com:owner/repo.git)', () => {
      const parsed = parseGitUrl('git@gitlab.com:inkscape/inkscape.git');
      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'gitlab');
      assert.strictEqual(parsed.owner, 'inkscape');
      assert.strictEqual(parsed.repo, 'inkscape');
      assert.strictEqual(parsed.repoName, 'inkscape/inkscape');
    });

    it('parses bare GitLab domain with www', () => {
      const parsed = parseGitUrl('https://www.gitlab.com/gnome/gimp.git');
      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'gitlab');
      assert.strictEqual(parsed.owner, 'gnome');
      assert.strictEqual(parsed.repo, 'gimp');
      assert.strictEqual(parsed.repoName, 'gnome/gimp');
    });

    it('rejects unsupported git hosts or non-git URLs', () => {
      assert.strictEqual(parseGitUrl('https://bitbucket.org/owner/repo'), null);
      assert.strictEqual(parseGitUrl('https://google.com/search'), null);
      assert.strictEqual(parseGitUrl('https://example.com/foo/bar'), null);
    });

    it('rejects incomplete repository paths (missing owner or repo)', () => {
      assert.strictEqual(parseGitUrl('https://github.com/'), null);
      assert.strictEqual(parseGitUrl('https://github.com/owner'), null);
      assert.strictEqual(parseGitUrl('https://gitlab.com/onlyone/'), null);
    });

    it('rejects malformed strings, numbers, and whitespace', () => {
      assert.strictEqual(parseGitUrl('not-a-valid-url'), null);
      assert.strictEqual(parseGitUrl(''), null);
      assert.strictEqual(parseGitUrl('   '), null);
      assert.strictEqual(isValidGitUrl('https://github.com/a/b'), true);
      assert.strictEqual(isValidGitUrl('invalid'), false);
    });
  });

  describe('Repository Subscription Management', () => {
    it('successfully links a GitHub repository to a channel', async () => {
      const sub = await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );

      assert.ok(sub);
      assert.strictEqual(sub.guildId, GUILD_ID);
      assert.strictEqual(sub.repoName, 'facebook/react');
      assert.strictEqual(sub.provider, 'github');
      assert.strictEqual(sub.channelId, CHANNEL_DEV);
      assert.deepStrictEqual(sub.events, ['push', 'pull_request', 'issues']);
      assert.strictEqual(sub.aiExplain, true);
    });

    it('links a GitLab repository with custom events and aiExplain disabled', async () => {
      const sub = await linkRepository(
        GUILD_ID,
        'https://gitlab.com/gitlab-org/gitlab',
        CHANNEL_ALERTS,
        ['push'],
        false,
      );

      assert.ok(sub);
      assert.strictEqual(sub.provider, 'gitlab');
      assert.deepStrictEqual(sub.events, ['push']);
      assert.strictEqual(sub.aiExplain, false);
    });

    it('prevents duplicate link of the same repository to the same channel', async () => {
      await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );

      await assert.rejects(
        async () => {
          await linkRepository(
            GUILD_ID,
            'https://github.com/facebook/react',
            CHANNEL_DEV,
          );
        },
        /already linked to channel/,
      );
    });

    it('allows linking the same repository to a DIFFERENT channel in the guild', async () => {
      const sub1 = await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );
      const sub2 = await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_ALERTS,
      );

      assert.notStrictEqual(sub1.subscriptionId, sub2.subscriptionId);
      assert.strictEqual(sub1.channelId, CHANNEL_DEV);
      assert.strictEqual(sub2.channelId, CHANNEL_ALERTS);
    });

    it('allows linking the same repository in a DIFFERENT guild', async () => {
      const sub1 = await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );
      const sub2 = await linkRepository(
        OTHER_GUILD,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );

      assert.strictEqual(sub1.guildId, GUILD_ID);
      assert.strictEqual(sub2.guildId, OTHER_GUILD);
    });

    it('rejects linking with an invalid URL', async () => {
      await assert.rejects(
        async () => {
          await linkRepository(
            GUILD_ID,
            'https://invalid-host.com/owner/repo',
            CHANNEL_DEV,
          );
        },
        /Invalid Git repository URL/,
      );
    });

    it('lists subscriptions for a guild', async () => {
      await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );
      await linkRepository(
        GUILD_ID,
        'https://github.com/vercel/next.js',
        CHANNEL_ALERTS,
      );
      await linkRepository(
        OTHER_GUILD,
        'https://github.com/microsoft/typescript',
        CHANNEL_DEV,
      );

      const guildSubs = await listSubscriptions(GUILD_ID);
      assert.strictEqual(guildSubs.length, 2);
      assert.ok(guildSubs.some((s) => s.repoName === 'facebook/react'));
      assert.ok(guildSubs.some((s) => s.repoName === 'vercel/next.js'));
      assert.ok(!guildSubs.some((s) => s.repoName === 'microsoft/typescript'));
    });

    it('returns empty array when listing subscriptions for an unconfigured guild', async () => {
      const subs = await listSubscriptions('unconfigured_guild');
      assert.deepStrictEqual(subs, []);
    });

    it('unlinks an existing repository subscription', async () => {
      const sub = await linkRepository(
        GUILD_ID,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );

      const deleted = await unlinkRepository(GUILD_ID, sub.subscriptionId);
      assert.strictEqual(deleted, true);

      const remaining = await listSubscriptions(GUILD_ID);
      assert.strictEqual(remaining.length, 0);
    });

    it('returns false when unlinking a non-existent subscription', async () => {
      const deleted = await unlinkRepository(GUILD_ID, 'git-nonexistent');
      assert.strictEqual(deleted, false);
    });

    it('prevents unlinking a subscription belonging to another guild', async () => {
      const sub = await linkRepository(
        OTHER_GUILD,
        'https://github.com/facebook/react',
        CHANNEL_DEV,
      );

      const deleted = await unlinkRepository(GUILD_ID, sub.subscriptionId);
      assert.strictEqual(deleted, false);

      const stillThere = getTestSubscription(sub.subscriptionId);
      assert.ok(stillThere);
    });
  });

  describe('AI PR Plain-English Explainer Engine', () => {
    it('classifies breaking changes and major migrations as High impact', async () => {
      const explanation = await explainPullRequest(
        'facebook/react',
        'BREAKING CHANGE: drop deprecated v1 API and refactor security hooks',
        'This pull request removes backwards compatibility for v1 endpoints.',
      );

      assert.strictEqual(explanation.impact, 'high');
      assert.strictEqual(PR_IMPACT_BADGES[explanation.impact], '🔴 Breaking Change');
      assert.strictEqual(PR_IMPACT_COLORS[explanation.impact], 0xda3633);
      assert.ok(explanation.summary.includes('facebook/react'));
      assert.strictEqual(explanation.plainEnglish.length, 3);
      assert.ok(explanation.plainEnglish[0].toLowerCase().includes('breaking'));
    });

    it('classifies feature additions and performance updates as Moderate impact', async () => {
      const explanation = await explainPullRequest(
        'vercel/next.js',
        'feat: implement server actions streaming and enhance database cache',
        'Introduces streaming support for long-running server actions.',
      );

      assert.strictEqual(explanation.impact, 'moderate');
      assert.strictEqual(PR_IMPACT_BADGES[explanation.impact], '🟡 Moderate Impact');
      assert.strictEqual(PR_IMPACT_COLORS[explanation.impact], 0xd29922);
      assert.strictEqual(explanation.plainEnglish.length, 3);
      assert.ok(explanation.plainEnglish[0].includes('functionality'));
    });

    it('classifies bug fixes, typo corrections, and docs as Low impact', async () => {
      const explanation = await explainPullRequest(
        'microsoft/typescript',
        'fix: resolve typo in README and clean up unused internal lint rules',
        'Minor documentation update without behavioral changes.',
      );

      assert.strictEqual(explanation.impact, 'low');
      assert.strictEqual(PR_IMPACT_BADGES[explanation.impact], '🟢 Low Risk');
      assert.strictEqual(PR_IMPACT_COLORS[explanation.impact], 0x238636);
      assert.strictEqual(explanation.plainEnglish.length, 3);
      assert.ok(explanation.plainEnglish[0].includes('Non-breaking'));
      assert.ok(explanation.plainEnglish[1].includes('Zero operational disruption'));
    });

    it('generates deterministic explanation with exactly 3 non-technical bullets', () => {
      const exp = generateDeterministicPRExplanation(
        'org/core-lib',
        'refactor: upgrade authentication flow',
      );

      assert.strictEqual(exp.plainEnglish.length, 3);
      exp.plainEnglish.forEach((bullet) => {
        assert.ok(typeof bullet === 'string' && bullet.length > 10);
      });
      assert.ok(exp.summary.includes('org/core-lib'));
    });
  });

  describe('Discord Embed Presentation Builders', () => {
    it('builds a push event feed embed with formatted commit lines', () => {
      const payload = {
        ref: 'refs/heads/feature/login',
        pusher: { name: 'alice' },
        commits: [
          {
            id: 'a1b2c3d4e5',
            message: 'feat: add OAuth login button',
            author: { name: 'alice' },
            url: 'https://github.com/org/repo/commit/a1b2c3d4e5',
          },
          {
            id: 'f6e5d4c3b2',
            message: 'test: add auth flow unit tests',
            author: { name: 'alice' },
            url: 'https://github.com/org/repo/commit/f6e5d4c3b2',
          },
        ],
      };

      const embed = buildGitFeedEmbed('org/repo', 'push', payload);
      assert.ok(embed.title?.includes('[org/repo] Push to feature/login'));
      assert.ok(embed.description?.includes('alice'));
      assert.ok(embed.description?.includes('2 commit(s)'));
      assert.ok(embed.description?.includes('[`a1b2c3d`]'));
      assert.ok(embed.description?.includes('feat: add OAuth login button'));
      assert.strictEqual(embed.color, GIT_COLOR_GITHUB);
    });

    it('builds a push event feed embed with more than 5 commits and truncation notice', () => {
      const commits = Array.from({ length: 7 }, (_, i) => ({
        id: `commit_sha_${i}`,
        message: `Commit ${i + 1}`,
        author: { name: 'bob' },
      }));

      const embed = buildGitFeedEmbed('org/repo', 'push', {
        ref: 'refs/heads/main',
        commits,
      });

      assert.ok(embed.description?.includes('and 2 more commit(s)'));
    });

    it('builds a pull request opened embed with branches and status', () => {
      const payload = {
        action: 'opened',
        number: 42,
        pull_request: {
          title: 'Implement Dark Mode Theme',
          body: 'Adds comprehensive dark mode theme support across all pages.',
          user: { login: 'dev_charlie' },
          head: { ref: 'feat/dark-mode' },
          base: { ref: 'main' },
          draft: false,
        },
      };

      const embed = buildGitFeedEmbed('org/app', 'pull_request', payload);
      assert.ok(embed.title?.includes('Pull Request #42: Implement Dark Mode Theme'));
      assert.ok(embed.description?.includes('🟢 Opened'));
      assert.ok(embed.description?.includes('dev_charlie'));
      assert.strictEqual(embed.fields?.length, 2);
      assert.ok(embed.fields?.some((f) => f.name === 'Branches' && f.value.includes('feat/dark-mode')));
      assert.ok(embed.fields?.some((f) => f.name === 'Status' && f.value.includes('Ready for Review')));
    });

    it('builds a pull request merged embed with purple color badge', () => {
      const payload = {
        action: 'closed',
        number: 99,
        pull_request: {
          title: 'Hotfix production issue',
          merged: true,
          user: { login: 'lead_dev' },
        },
      };

      const embed = buildGitFeedEmbed('org/app', 'pull_request', payload);
      assert.ok(embed.description?.includes('🟣 Merged'));
      assert.strictEqual(embed.color, 0x8957e5);
    });

    it('builds an issue event feed embed', () => {
      const payload = {
        action: 'opened',
        number: 108,
        issue: {
          title: 'Crash when clicking profile avatar',
          body: 'Steps to reproduce: open settings, click avatar.',
          user: { login: 'qa_tester' },
        },
      };

      const embed = buildGitFeedEmbed('org/app', 'issues', payload);
      assert.ok(embed.title?.includes('Issue #108: Crash when clicking profile avatar'));
      assert.ok(embed.description?.includes('qa_tester'));
    });

    it('builds AI PR explanation embed with impact badge and 3 bullet points', () => {
      const explanation = {
        summary: 'This pull request updates org/app by adding notifications.',
        plainEnglish: [
          'Adds real-time notification bells to top bar.',
          'Safe non-breaking change preserving backwards compatibility.',
          'Ready for test deployment and QA validation.',
        ],
        impact: 'low' as const,
      };

      const embed = buildPRExplanationEmbed(
        'org/app',
        'Add Notification Bell',
        explanation,
      );

      assert.strictEqual(embed.title, '🤖 AI Pull Request Explainer: Add Notification Bell');
      assert.ok(embed.fields?.some((f) => f.name === 'Impact Rating' && f.value.includes('🟢 Low Risk')));
      assert.ok(embed.fields?.some((f) => f.name === 'Target Repository' && f.value.includes('org/app')));
      assert.ok(embed.fields?.some((f) => f.name === 'Plain-English Overview' && f.value.includes('notifications')));
      assert.ok(embed.fields?.some((f) => f.name === 'What This Means (Non-Technical)' && f.value.includes('• Adds real-time')));
      assert.strictEqual(embed.footer?.text, 'AiCord Git Intelligence • Powered by Gemini AI');
    });

    it('builds subscriptions list embed for configured feeds', () => {
      const subs: IGitSubscription[] = [
        {
          guildId: GUILD_ID,
          subscriptionId: 'git-1001',
          repoName: 'facebook/react',
          repoUrl: 'https://github.com/facebook/react',
          provider: 'github',
          channelId: CHANNEL_DEV,
          events: ['push', 'pull_request'],
          aiExplain: true,
        } as IGitSubscription,
      ];

      const embed = buildSubscriptionsListEmbed(GUILD_ID, subs);
      assert.ok(embed.title?.includes('Connected Git Repositories (1)'));
      assert.ok(embed.description?.includes('facebook/react'));
      assert.ok(embed.description?.includes('git-1001'));
      assert.ok(embed.description?.includes('🐙 GitHub'));
      assert.ok(embed.description?.includes('🤖 AI Explainer Active'));
    });

    it('builds empty subscriptions notice embed when server has no feeds', () => {
      const embed = buildSubscriptionsListEmbed(GUILD_ID, []);
      assert.ok(embed.title?.includes('Connected Git Repositories'));
      assert.ok(embed.description?.includes('No repository webhook feeds are currently configured'));
    });

    it('builds git issue card embed', () => {
      const embed = buildGitIssueEmbed(
        'org/repo',
        'Bug in login routine',
        'Null pointer exception on line 42',
        '<@12345>',
        404,
      );

      assert.strictEqual(embed.title, '🐛 Issue #404: Bug in login routine');
      assert.ok(embed.fields?.some((f) => f.name === 'Repository' && f.value.includes('org/repo')));
      assert.ok(embed.fields?.some((f) => f.name === 'Status' && f.value === '🟢 Open'));
      assert.ok(embed.fields?.some((f) => f.name === 'Reporter' && f.value === '<@12345>'));
      assert.ok(embed.fields?.some((f) => f.name === 'Issue Description' && f.value.includes('Null pointer')));
    });
  });
});
