/**
 * src/commands/git.ts
 * GitHub / GitLab Webhook Hub & AI PR Plain-English Explainer Slash Commands for AiCord.
 *
 * Subcommands:
 * - /git link url:<string> [channel:#channel] [events:string] (requires MANAGE_GUILD)
 * - /git list
 * - /git unlink id:<string> (requires MANAGE_GUILD)
 * - /git explain pr:<string> [repo:string]
 * - /git issue repo:<string> title:<string> body:<string>
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import {
  successEmbed,
  errorEmbed,
  warningEmbed,
} from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import {
  linkRepository,
  listSubscriptions,
  unlinkRepository,
  explainPullRequest,
  parseGitUrl,
  buildPRExplanationEmbed,
  buildSubscriptionsListEmbed,
  buildGitIssueEmbed,
} from '@/lib/git/git-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }>,
  name: string,
): T | undefined {
  return options?.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleGitLinkSubcommand(
  guildId: string,
  token: string,
  memberPerms: string,
  channelId: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const isAuthorized =
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  if (!isAuthorized) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to link repository feeds.',
        ),
      ],
    });
    return;
  }

  const url = getOption<string>(subOptions, 'url');
  const targetChannel =
    getOption<string>(subOptions, 'channel') || channelId;
  const rawEvents = getOption<string>(subOptions, 'events');

  if (!url) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Repository URL Required',
          'Please provide a valid GitHub or GitLab repository URL.',
        ),
      ],
    });
    return;
  }

  let events: string[] | undefined;
  if (rawEvents) {
    events = rawEvents
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  try {
    const sub = await linkRepository(
      guildId,
      url,
      targetChannel,
      events,
      true,
    );

    const providerIcon = sub.provider === 'github' ? '🐙 GitHub' : '🦊 GitLab';
    const embed = successEmbed(
      'Repository Linked Successfully',
      `Connected **${providerIcon} [${sub.repoName}](${sub.repoUrl})** to <#${sub.channelId}>.\n\n` +
        `• **Subscription ID:** \`${sub.subscriptionId}\`\n` +
        `• **Monitored Events:** \`${sub.events.join(', ')}\`\n` +
        `• **AI PR Explainer:** 🤖 Active\n\n` +
        `Alerts will be delivered whenever activity occurs in this repository.`,
    );

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err) {
    const message = (err as Error).message || 'Failed to link repository.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Git Link Error', message)],
    });
  }
}

export async function handleGitListSubcommand(
  guildId: string,
  token: string,
): Promise<void> {
  try {
    const subs = await listSubscriptions(guildId);
    const embed = buildSubscriptionsListEmbed(guildId, subs);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err) {
    const message =
      (err as Error).message || 'Failed to retrieve repository feeds.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Git List Error', message)],
    });
  }
}

export async function handleGitUnlinkSubcommand(
  guildId: string,
  token: string,
  memberPerms: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const isAuthorized =
    hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
    hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

  if (!isAuthorized) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to unlink repository feeds.',
        ),
      ],
    });
    return;
  }

  const id = getOption<string>(subOptions, 'id');
  if (!id) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Subscription ID Required',
          'Please specify the subscription ID (e.g. `git-1001`) to unlink.',
        ),
      ],
    });
    return;
  }

  try {
    const success = await unlinkRepository(guildId, id.trim());
    if (!success) {
      await editInteractionResponse(token, {
        embeds: [
          warningEmbed(
            'Subscription Not Found',
            `No repository subscription found matching ID \`${id}\`. Use \`/git list\` to view active feeds.`,
          ),
        ],
      });
      return;
    }

    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Repository Feed Unlinked',
          `Successfully disconnected repository subscription \`${id}\`. Alerts for this repository have been stopped.`,
        ),
      ],
    });
  } catch (err) {
    const message = (err as Error).message || 'Failed to unlink repository.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Git Unlink Error', message)],
    });
  }
}

export async function handleGitExplainSubcommand(
  guildId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const pr = getOption<string>(subOptions, 'pr');
  let repo = getOption<string>(subOptions, 'repo');

  if (!pr) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'PR Details Required',
          'Please provide a Pull Request title, description, or link to explain.',
        ),
      ],
    });
    return;
  }

  // Attempt to parse repo if PR input contains a Git URL
  if (!repo && (pr.includes('github.com') || pr.includes('gitlab.com'))) {
    const parsed = parseGitUrl(pr);
    if (parsed) {
      repo = parsed.repoName;
    }
  }

  // Fallback to first guild subscription or default repo name
  if (!repo) {
    const subs = await listSubscriptions(guildId);
    repo = subs.length > 0 ? subs[0].repoName : 'repository';
  }

  try {
    const explanation = await explainPullRequest(repo, pr, pr);
    const embed = buildPRExplanationEmbed(repo, pr, explanation);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err) {
    const message =
      (err as Error).message || 'Failed to explain Pull Request.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('PR Explanation Error', message)],
    });
  }
}

export async function handleGitIssueSubcommand(
  token: string,
  userId: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const rawRepo = getOption<string>(subOptions, 'repo');
  const title = getOption<string>(subOptions, 'title');
  const body = getOption<string>(subOptions, 'body');

  if (!rawRepo || !title || !body) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Missing Issue Fields',
          'Please provide repository, title, and body for the issue.',
        ),
      ],
    });
    return;
  }

  const parsed = parseGitUrl(rawRepo);
  const repoName = parsed ? parsed.repoName : rawRepo;

  const embed = buildGitIssueEmbed(repoName, title, body, `<@${userId}>`);
  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleGitCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id || '';
  const channelId = interaction.channel_id || '';
  const memberPerms = interaction.member?.permissions ?? '0';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Server Required',
          'The /git command can only be used within a server.',
        ),
      ],
    });
    return;
  }

  const options = (interaction.data?.options || []) as Array<{
    name: string;
    type: number;
    value?: unknown;
    options?: Array<{ name: string; value?: unknown }>;
  }>;

  const subcommand = options[0];
  const subName = subcommand?.name;
  const subOptions = (subcommand?.options || []) as Array<{
    name: string;
    value?: unknown;
  }>;

  switch (subName) {
    case 'link':
      await handleGitLinkSubcommand(
        guildId,
        token,
        memberPerms,
        channelId,
        subOptions,
      );
      break;
    case 'list':
      await handleGitListSubcommand(guildId, token);
      break;
    case 'unlink':
      await handleGitUnlinkSubcommand(guildId, token, memberPerms, subOptions);
      break;
    case 'explain':
      await handleGitExplainSubcommand(guildId, token, subOptions);
      break;
    case 'issue':
      await handleGitIssueSubcommand(token, userId, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Subcommand "${subName}" is not recognized.`,
          ),
        ],
      });
      break;
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const gitCommand: RegisteredCommand = {
  name: 'git',
  description:
    'GitHub & GitLab Webhook Hub and AI PR Plain-English Explainer',
  category: 'utility',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'link',
      description: 'Connect a GitHub or GitLab repository feed to a channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'url',
          description:
            'Repository URL (e.g. https://github.com/owner/repo or gitlab.com/owner/repo)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'channel',
          description:
            'Channel to send webhook alerts to (default: current channel)',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
        {
          name: 'events',
          description:
            'Comma-separated events: push, pull_request, issues (default: all)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'list',
      description: 'List all connected GitHub and GitLab repository feeds',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'unlink',
      description: 'Disconnect a repository feed by its subscription ID',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'id',
          description: 'Subscription ID (e.g. git-1001) to remove',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'explain',
      description:
        'Explain a Pull Request and assess its risk in plain English using AI',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'pr',
          description: 'Pull Request title, description, or PR URL',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'repo',
          description: 'Repository name (e.g. owner/repo)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'issue',
      description: 'Track or submit an issue ticket to a connected repository',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'repo',
          description: 'Repository name or URL (e.g. owner/repo)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'title',
          description: 'Issue title or summary',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'body',
          description: 'Issue description or bug reproduction details',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  execute: handleGitCommand,
};
