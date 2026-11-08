/**
 * src/lib/git/git-service.ts
 * GitHub / GitLab Webhook Hub & AI PR Plain-English Explainer Service for AiCord.
 *
 * Capabilities:
 * - In-memory test store for zero-network automated unit testing
 * - Resilient Git URL parser supporting GitHub and GitLab formats (HTTPS, SSH, bare)
 * - Subscription management: linking, duplicate detection per channel, listing, and unlinking
 * - AI Pull Request Explainer powered by Google Gemini (with deterministic offline/test mode generator)
 * - Plain-English 3-bullet breakdown and 3-tier impact assessment (Low, Moderate, High)
 * - Discord Embed presentation for Push commits, PRs, Issues, and AI Explanations
 */

import { connectDB } from '@/lib/db';
import {
  GitSubscription,
  type IGitSubscription,
  type GitProvider,
} from '@/models';
import { type DiscordEmbed, clampEmbed } from '@/lib/discord/embeds';
import { env } from '@/lib/env';

// Re-export model types
export type { IGitSubscription, GitProvider };

export type PRImpact = 'low' | 'moderate' | 'high';

export interface PRExplanation {
  summary: string;
  plainEnglish: string[];
  impact: PRImpact;
}

export interface ParsedGitRepo {
  provider: GitProvider;
  repoName: string;
  owner: string;
  repo: string;
}

// ─── Constants & Configuration ───────────────────────────────────────────────

export const GIT_COLOR_GITHUB = 0x24292e;
export const GIT_COLOR_GITLAB = 0xfca121;
export const GIT_COLOR_DEFAULT = 0x5865f2;

export const PR_IMPACT_BADGES: Record<PRImpact, string> = {
  low: '🟢 Low Risk',
  moderate: '🟡 Moderate Impact',
  high: '🔴 Breaking Change',
};

export const PR_IMPACT_COLORS: Record<PRImpact, number> = {
  low: 0x238636,
  moderate: 0xd29922,
  high: 0xda3633,
};

export const DEFAULT_GIT_EVENTS = ['push', 'pull_request', 'issues'] as const;

// ─── In-Memory Test Store ─────────────────────────────────────────────────────

let testMode = false;
let testSequenceCounter = 1000;
const testSubscriptions = new Map<string, IGitSubscription>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function isTestMode(): boolean {
  return testMode;
}

export function clearTestStore(): void {
  testSubscriptions.clear();
  testSequenceCounter = 1000;
}

export function generateSubscriptionId(): string {
  if (testMode) {
    testSequenceCounter += 1;
    return `git-${testSequenceCounter}`;
  }
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `git-${randomChars}`;
}

export function setTestSubscription(
  sub: Partial<IGitSubscription> & { guildId: string; repoName: string; channelId: string },
): IGitSubscription {
  const subscriptionId = sub.subscriptionId || generateSubscriptionId();
  const doc = {
    guildId: sub.guildId,
    subscriptionId,
    repoUrl: sub.repoUrl || `https://github.com/${sub.repoName}`,
    repoName: sub.repoName,
    provider: sub.provider || 'github',
    channelId: sub.channelId,
    events: sub.events || [...DEFAULT_GIT_EVENTS],
    aiExplain: sub.aiExplain !== undefined ? sub.aiExplain : true,
    createdAt: sub.createdAt || new Date(),
    updatedAt: sub.updatedAt || new Date(),
  } as unknown as IGitSubscription;

  testSubscriptions.set(subscriptionId, doc);
  return doc;
}

export function getTestSubscription(
  subscriptionId: string,
): IGitSubscription | undefined {
  return testSubscriptions.get(subscriptionId);
}

export function getAllTestSubscriptions(
  guildId?: string,
): IGitSubscription[] {
  const all = Array.from(testSubscriptions.values());
  if (guildId) {
    return all.filter((s) => s.guildId === guildId);
  }
  return all;
}

// ─── Repository URL Parser ───────────────────────────────────────────────────

/**
 * Parses GitHub or GitLab repository URLs into provider, owner, repo, and full repoName.
 * Supports:
 * - https://github.com/owner/repo (.git optional)
 * - https://gitlab.com/owner/repo (.git optional)
 * - git@github.com:owner/repo.git
 * - git@gitlab.com:owner/repo.git
 * - Bare hostname: github.com/owner/repo
 */
export function parseGitUrl(rawUrl: string): ParsedGitRepo | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Check git SSH format: git@github.com:owner/repo(.git)?
  const sshMatch = trimmed.match(
    /^git@(github\.com|gitlab\.com):([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/i,
  );
  if (sshMatch) {
    const host = sshMatch[1].toLowerCase();
    const owner = sshMatch[2];
    const repo = sshMatch[3];
    const provider: GitProvider = host.includes('gitlab') ? 'gitlab' : 'github';
    return {
      provider,
      repoName: `${owner}/${repo}`,
      owner,
      repo,
    };
  }

  // Prepend protocol if missing
  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    let provider: GitProvider;

    if (host === 'github.com' || host === 'www.github.com') {
      provider = 'github';
    } else if (host === 'gitlab.com' || host === 'www.gitlab.com') {
      provider = 'gitlab';
    } else {
      return null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    const owner = segments[0];
    let repo = segments[1];
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }
    if (!owner || !repo) return null;

    return {
      provider,
      repoName: `${owner}/${repo}`,
      owner,
      repo,
    };
  } catch {
    return null;
  }
}

export function isValidGitUrl(url: string): boolean {
  return parseGitUrl(url) !== null;
}

// ─── Subscription Management ─────────────────────────────────────────────────

/**
 * Connects a GitHub or GitLab repository to a Discord channel.
 * Prevents duplicate subscriptions to the same channel.
 */
export async function linkRepository(
  guildId: string,
  repoUrl: string,
  channelId: string,
  events: string[] = ['push', 'pull_request', 'issues'],
  aiExplain: boolean = true,
): Promise<IGitSubscription> {
  const parsed = parseGitUrl(repoUrl);
  if (!parsed) {
    throw new Error(
      'Invalid Git repository URL. Please provide a valid GitHub or GitLab repository link (e.g. https://github.com/owner/repo).',
    );
  }

  const normalizedEvents =
    events && events.length > 0 ? events : ['push', 'pull_request', 'issues'];

  if (isTestMode()) {
    const existing = Array.from(testSubscriptions.values()).find(
      (s) =>
        s.guildId === guildId &&
        s.repoName.toLowerCase() === parsed.repoName.toLowerCase() &&
        s.channelId === channelId,
    );

    if (existing) {
      throw new Error(
        `Repository '${parsed.repoName}' is already linked to channel <#${channelId}>.`,
      );
    }

    const subscription = setTestSubscription({
      guildId,
      repoUrl: `https://${parsed.provider === 'github' ? 'github.com' : 'gitlab.com'}/${parsed.repoName}`,
      repoName: parsed.repoName,
      provider: parsed.provider,
      channelId,
      events: normalizedEvents,
      aiExplain,
    });

    return subscription;
  }

  await connectDB();

  const existing = await GitSubscription.findOne({
    guildId,
    repoName: { $regex: new RegExp(`^${parsed.repoName}$`, 'i') },
    channelId,
  });

  if (existing) {
    throw new Error(
      `Repository '${parsed.repoName}' is already linked to channel <#${channelId}>.`,
    );
  }

  const subscriptionId = generateSubscriptionId();
  const canonicalUrl = `https://${parsed.provider === 'github' ? 'github.com' : 'gitlab.com'}/${parsed.repoName}`;

  const created = await GitSubscription.create({
    guildId,
    subscriptionId,
    repoUrl: canonicalUrl,
    repoName: parsed.repoName,
    provider: parsed.provider,
    channelId,
    events: normalizedEvents,
    aiExplain,
  });

  return created;
}

/**
 * Lists all repository subscriptions configured for a guild.
 */
export async function listSubscriptions(
  guildId: string,
): Promise<IGitSubscription[]> {
  if (isTestMode()) {
    return getAllTestSubscriptions(guildId);
  }

  await connectDB();
  const subs = await GitSubscription.find({ guildId })
    .sort({ createdAt: -1 })
    .lean();
  return subs as unknown as IGitSubscription[];
}

/**
 * Removes a repository subscription from a guild.
 */
export async function unlinkRepository(
  guildId: string,
  subscriptionId: string,
): Promise<boolean> {
  if (isTestMode()) {
    const sub = testSubscriptions.get(subscriptionId);
    if (sub && sub.guildId === guildId) {
      testSubscriptions.delete(subscriptionId);
      return true;
    }
    return false;
  }

  await connectDB();
  const result = await GitSubscription.findOneAndDelete({
    guildId,
    subscriptionId,
  });
  return Boolean(result);
}

// ─── AI PR Plain-English Explainer Engine ─────────────────────────────────────

/**
 * Deterministically analyzes PR details to assign impact and generate clear 3-bullet plain-English takeaways.
 */
export function generateDeterministicPRExplanation(
  repoName: string,
  prTitle: string,
  prBodyOrDiff: string = '',
): PRExplanation {
  const combinedText = `${prTitle} ${prBodyOrDiff}`.toLowerCase();

  // Determine Impact Rating
  let impact: PRImpact = 'low';
  if (
    /breaking|deprecated|migration|major|drop|critical|security|incompatible|v[0-9]+\.0\.0/i.test(
      combinedText,
    )
  ) {
    impact = 'high';
  } else if (
    /(\bfix\b|\bbug\b|\btypo\b|\bdoc\b|\bdocs\b|\bchore\b|\blint\b|\bstyle\b|\bpatch\b)/i.test(
      prTitle,
    )
  ) {
    impact = 'low';
  } else if (
    /feature|feat|refactor|performance|optimize|enhance|api|database|schema|endpoint|rearchitect/i.test(
      combinedText,
    )
  ) {
    impact = 'moderate';
  } else {
    impact = 'low';
  }

  // Generate 1-sentence concise executive summary
  const cleanTitle = prTitle.trim().replace(/[.:\s]+$/, '');
  const summary = `This pull request updates ${repoName} by introducing: ${cleanTitle}.`;

  // Generate 3 non-technical plain English bullet points
  let bullet1: string;
  let bullet2: string;
  let bullet3: string;

  if (impact === 'high') {
    bullet1 = `Breaking interface adjustments: modifies core workflows or data schemas affecting existing integrations.`;
    bullet2 = `Requires upgrade preparation: client libraries or consumer services may need version migrations before deployment.`;
    bullet3 = `Recommended verification: execute complete regression suites and ensure migration guides are shared with dependent teams.`;
  } else if (impact === 'moderate') {
    bullet1 = `Enhances platform functionality: introduces new behavior or optimizes internal systems without breaking contracts.`;
    bullet2 = `Workflow impact: developers and users gain updated capabilities while maintaining existing system compatibility.`;
    bullet3 = `Recommended verification: test primary user paths and inspect related dashboard or API telemetry post-merge.`;
  } else {
    bullet1 = `Non-breaking maintenance: resolves defects, updates documentation, or cleans up internal implementation routines.`;
    bullet2 = `Zero operational disruption: fully backwards compatible with zero configuration changes required from users.`;
    bullet3 = `Recommended verification: safe for routine continuous integration validation and automated deployment.`;
  }

  return {
    summary,
    plainEnglish: [bullet1, bullet2, bullet3],
    impact,
  };
}

/**
 * Explains a Pull Request in plain English using Google Gemini AI,
 * falling back gracefully to deterministic logic in test or offline modes.
 */
export async function explainPullRequest(
  repoName: string,
  prTitle: string,
  prBodyOrDiff: string = '',
): Promise<PRExplanation> {
  // Use real Gemini API when enabled and configured
  if (
    !isTestMode() &&
    process.env.NODE_ENV !== 'test' &&
    env.GEMINI_API_KEY &&
    env.GEMINI_API_KEY !== 'gemini-key-12345'
  ) {
    try {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      const { generateText } = await import('ai');
      const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

      const promptText = `You are an AI Git intelligence engineer for Discord.
Analyze the following Pull Request and explain it in clear, non-technical plain English so non-developers understand what is changing.

Repository: ${repoName}
PR Title: ${prTitle}
PR Description / Diff:
${prBodyOrDiff.slice(0, 3000)}

Respond ONLY with valid JSON in this exact structure:
{
  "summary": "One clear sentence summarizing the practical purpose of this change.",
  "plainEnglish": [
    "First bullet point explaining the functional impact.",
    "Second bullet point explaining risk and stability.",
    "Third bullet point with verification or next step advice."
  ],
  "impact": "low" | "moderate" | "high"
}`;

      const response = await generateText({
        model: google('gemini-2.0-flash'),
        prompt: promptText,
      });

      if (response && response.text) {
        const text = response.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (
            parsed.summary &&
            Array.isArray(parsed.plainEnglish) &&
            parsed.plainEnglish.length === 3 &&
            ['low', 'moderate', 'high'].includes(parsed.impact)
          ) {
            return {
              summary: String(parsed.summary).trim(),
              plainEnglish: parsed.plainEnglish.map((b: unknown) => String(b).trim()),
              impact: parsed.impact as PRImpact,
            };
          }
        }
      }
    } catch (apiErr) {
      console.warn(
        '[GitService] Gemini API call fallback to deterministic explainer:',
        apiErr,
      );
    }
  }

  // Deterministic fallback
  return generateDeterministicPRExplanation(repoName, prTitle, prBodyOrDiff);
}

// ─── Embed Presentation Builders ──────────────────────────────────────────────

/**
 * Builds a formatted embed for Git webhook feed events (Push, Pull Request, Issues).
 */
export function buildGitFeedEmbed(
  repoName: string,
  event: string,
  payload: Record<string, any>,
): DiscordEmbed {
  const normEvent = (event || 'unknown').toLowerCase();
  const repoUrl = payload.repository?.html_url || `https://github.com/${repoName}`;

  if (normEvent === 'push') {
    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const ref = payload.ref || 'refs/heads/main';
    const branch = ref.replace('refs/heads/', '');
    const pusher =
      payload.pusher?.name || payload.sender?.login || 'A contributor';

    const commitList = commits.slice(0, 5).map((c: any) => {
      const sha = (c.id || c.sha || 'commit').substring(0, 7);
      const msg = (c.message || '').split('\n')[0].slice(0, 60);
      const author = c.author?.name || c.committer?.name || pusher;
      const url = c.url || `${repoUrl}/commit/${c.id || sha}`;
      return `[\`${sha}\`](${url}) ${msg} — *${author}*`;
    });

    const desc =
      commitList.length > 0
        ? `**${pusher}** pushed ${commits.length} commit(s) to \`${branch}\`:\n\n` +
          commitList.join('\n') +
          (commits.length > 5 ? `\n*...and ${commits.length - 5} more commit(s)*` : '')
        : `**${pusher}** pushed new updates to \`${branch}\`.`;

    return clampEmbed({
      title: `[${repoName}] Push to ${branch}`,
      url: `${repoUrl}/commits/${branch}`,
      description: desc,
      color: GIT_COLOR_GITHUB,
      footer: {
        text: 'AiCord Git Webhook Feed • Push Event',
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (normEvent === 'pull_request' || normEvent === 'pr') {
    const pr = payload.pull_request || payload.pr || payload;
    const prNumber = pr.number || payload.number || 1;
    const prTitle = pr.title || 'Untitled Pull Request';
    const action = payload.action || 'updated';
    const author = pr.user?.login || payload.sender?.login || 'contributor';
    const prUrl = pr.html_url || `${repoUrl}/pull/${prNumber}`;
    const prBody = (pr.body || 'No description provided.').slice(0, 300);

    const actionBadge =
      action === 'opened'
        ? '🟢 Opened'
        : action === 'closed' && pr.merged
          ? '🟣 Merged'
          : action === 'closed'
            ? '🔴 Closed'
            : `ℹ️ ${action}`;

    return clampEmbed({
      title: `[${repoName}] Pull Request #${prNumber}: ${prTitle}`,
      url: prUrl,
      description: `**Action:** ${actionBadge} by **${author}**\n\n> ${prBody}`,
      color: action === 'opened' ? 0x238636 : action === 'closed' ? 0x8957e5 : GIT_COLOR_GITHUB,
      fields: [
        {
          name: 'Branches',
          value: `\`${pr.head?.ref || 'feature'}\` ➔ \`${pr.base?.ref || 'main'}\``,
          inline: true,
        },
        {
          name: 'Status',
          value: pr.draft ? '📝 Draft' : '✅ Ready for Review',
          inline: true,
        },
      ],
      footer: {
        text: 'AiCord Git Webhook Feed • Pull Request',
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (normEvent === 'issues' || normEvent === 'issue') {
    const issue = payload.issue || payload;
    const issueNumber = issue.number || payload.number || 1;
    const issueTitle = issue.title || 'Untitled Issue';
    const action = payload.action || 'opened';
    const author = issue.user?.login || payload.sender?.login || 'contributor';
    const issueUrl = issue.html_url || `${repoUrl}/issues/${issueNumber}`;
    const issueBody = (issue.body || 'No description provided.').slice(0, 300);

    return clampEmbed({
      title: `[${repoName}] Issue #${issueNumber}: ${issueTitle}`,
      url: issueUrl,
      description: `**Action:** Issue **${action}** by **${author}**\n\n> ${issueBody}`,
      color: action === 'opened' ? 0x238636 : 0x8957e5,
      footer: {
        text: 'AiCord Git Webhook Feed • Issue Event',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Generic git event fallback
  return clampEmbed({
    title: `[${repoName}] Event: ${event}`,
    url: repoUrl,
    description: `Received a **${event}** webhook event for **${repoName}**.`,
    color: GIT_COLOR_DEFAULT,
    footer: {
      text: 'AiCord Git Webhook Hub',
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Builds the AI PR Plain-English explanation embed card.
 */
export function buildPRExplanationEmbed(
  repoName: string,
  prTitle: string,
  explanation: PRExplanation,
  prUrl?: string,
): DiscordEmbed {
  const url = prUrl || `https://github.com/${repoName}`;
  const impactBadge = PR_IMPACT_BADGES[explanation.impact] || '🟢 Low Risk';
  const color = PR_IMPACT_COLORS[explanation.impact] || 0x238636;

  const plainEnglishBullets = explanation.plainEnglish
    .map((bullet) => `• ${bullet}`)
    .join('\n');

  return clampEmbed({
    title: `🤖 AI Pull Request Explainer: ${prTitle}`,
    url,
    description: `Plain-English summary and risk impact assessment for **[${repoName}](${url})**.`,
    color,
    fields: [
      {
        name: 'Impact Rating',
        value: impactBadge,
        inline: true,
      },
      {
        name: 'Target Repository',
        value: `📁 [${repoName}](${url})`,
        inline: true,
      },
      {
        name: 'Plain-English Overview',
        value: explanation.summary,
        inline: false,
      },
      {
        name: 'What This Means (Non-Technical)',
        value: plainEnglishBullets,
        inline: false,
      },
    ],
    footer: {
      text: 'AiCord Git Intelligence • Powered by Gemini AI',
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Builds the embed displaying all configured subscriptions for a server.
 */
export function buildSubscriptionsListEmbed(
  guildId: string,
  subscriptions: IGitSubscription[],
): DiscordEmbed {
  if (subscriptions.length === 0) {
    return clampEmbed({
      title: '📦 Connected Git Repositories',
      description:
        'No repository webhook feeds are currently configured for this server.\n\nUse `/git link url:<repo_url>` to connect your GitHub or GitLab repository.',
      color: 0x5865f2,
      footer: {
        text: 'AiCord Git Webhook Hub',
      },
    });
  }

  const entries = subscriptions.map((sub, idx) => {
    const providerIcon = sub.provider === 'github' ? '🐙 GitHub' : '🦊 GitLab';
    const aiBadge = sub.aiExplain ? '🤖 AI Explainer Active' : 'Off';
    return (
      `**${idx + 1}. [${sub.repoName}](${sub.repoUrl})**\n` +
      `• ID: \`${sub.subscriptionId}\` | ${providerIcon}\n` +
      `• Channel: <#${sub.channelId}>\n` +
      `• Events: \`${sub.events.join(', ')}\` | ${aiBadge}`
    );
  });

  return clampEmbed({
    title: `📦 Connected Git Repositories (${subscriptions.length})`,
    description: entries.join('\n\n'),
    color: 0x5865f2,
    footer: {
      text: 'Use /git unlink id:<subscription_id> to remove a feed',
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Builds an embed confirming simulated or dispatched issue creation.
 */
export function buildGitIssueEmbed(
  repoName: string,
  title: string,
  body: string,
  authorTag: string,
  issueNumber: number = Math.floor(Math.random() * 900) + 100,
): DiscordEmbed {
  return clampEmbed({
    title: `🐛 Issue #${issueNumber}: ${title}`,
    url: `https://github.com/${repoName}/issues/${issueNumber}`,
    color: 0x238636,
    fields: [
      {
        name: 'Repository',
        value: `📁 [${repoName}](https://github.com/${repoName})`,
        inline: true,
      },
      {
        name: 'Status',
        value: '🟢 Open',
        inline: true,
      },
      {
        name: 'Reporter',
        value: authorTag,
        inline: true,
      },
      {
        name: 'Issue Description',
        value: body.slice(0, 1000),
        inline: false,
      },
    ],
    footer: {
      text: 'AiCord Git Integration • Issue Tracking',
    },
    timestamp: new Date().toISOString(),
  });
}
