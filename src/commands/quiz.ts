/**
 * src/commands/quiz.ts
 * Live Multiplayer Kahoot-Style Quiz Show Slash Commands & Interactive Component Handlers for AiCord.
 *
 * Subcommands:
 * - /quiz host [category] [rounds]: Host a live multiplayer quiz show in the channel
 * - /quiz next: Advance to the next question round (host only)
 * - /quiz end: End the current quiz session and show the final podium (host or admin)
 * - /quiz leaderboard [limit]: View server trivia leaderboard
 *
 * Interactive Component Routing:
 * - handleQuizComponent(): handles quiz_ans:<sessionId>:<choiceIndex> button clicks
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { errorEmbed, infoEmbed } from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import {
  createQuizSession,
  getActiveQuizSession,
  startNextRound,
  submitAnswer,
  endQuizSession,
  getQuizLeaderboard,
  buildQuestionEmbed,
  buildQuestionComponents,
  buildPodiumEmbed,
  buildLeaderboardEmbed,
  QUIZ_CATEGORIES,
} from '@/lib/quiz/quiz-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleQuizHostSubcommand(
  guildId: string,
  channelId: string,
  hostId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const category = getOption<string>(subOptions, 'category') || 'general';
  const rounds = getOption<number>(subOptions, 'rounds') || 5;

  try {
    const session = await createQuizSession(
      guildId,
      channelId,
      hostId,
      category,
      rounds,
    );
    const question = await startNextRound(guildId, session.sessionId);
    const embed = buildQuestionEmbed(session, question);
    const components = buildQuestionComponents(session.sessionId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to host quiz.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Quiz Host Error', message)],
      ephemeral: true,
    });
  }
}

export async function handleQuizNextSubcommand(
  guildId: string,
  channelId: string,
  callerId: string,
  token: string,
): Promise<void> {
  try {
    const session = await getActiveQuizSession(guildId, channelId);
    if (!session) {
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'No Active Quiz',
            'There is no active quiz session in this channel. Host one with `/quiz host`!',
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (session.hostId !== callerId) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Host Only',
            `Only the quiz host (<@${session.hostId}>) can advance to the next round.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (session.currentRound < session.rounds) {
      const question = await startNextRound(guildId, session.sessionId);
      const embed = buildQuestionEmbed(session, question);
      const components = buildQuestionComponents(session.sessionId);

      await editInteractionResponse(token, {
        embeds: [embed],
        components,
      });
    } else {
      // Completed all rounds -> calculate final podium & rewards
      const finalResults = await endQuizSession(guildId, session.sessionId);
      const podiumEmbed = buildPodiumEmbed(session, finalResults);

      await editInteractionResponse(token, {
        embeds: [podiumEmbed],
        components: [],
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to advance round.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Quiz Next Error', message)],
      ephemeral: true,
    });
  }
}

export async function handleQuizEndSubcommand(
  guildId: string,
  channelId: string,
  callerId: string,
  memberPerms: string,
  token: string,
): Promise<void> {
  try {
    const session = await getActiveQuizSession(guildId, channelId);
    if (!session) {
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'No Active Quiz',
            'There is no active quiz session in this channel to end.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const isHost = session.hostId === callerId;
    const isAdmin =
      hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD) ||
      hasPermission(memberPerms, PermissionFlags.ADMINISTRATOR);

    if (!isHost && !isAdmin) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Permission Denied',
            `Only the quiz host (<@${session.hostId}>) or a server administrator can end this quiz session.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const finalResults = await endQuizSession(guildId, session.sessionId);
    const podiumEmbed = buildPodiumEmbed(session, finalResults);

    await editInteractionResponse(token, {
      embeds: [podiumEmbed],
      components: [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to end quiz session.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Quiz End Error', message)],
      ephemeral: true,
    });
  }
}

export async function handleQuizLeaderboardSubcommand(
  guildId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const limit = getOption<number>(subOptions, 'limit') ?? 10;

  try {
    const leaderboard = await getQuizLeaderboard(guildId, limit);
    const embed = buildLeaderboardEmbed(guildId, leaderboard);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to retrieve quiz leaderboard.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Leaderboard Error', message)],
      ephemeral: true,
    });
  }
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleQuizCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const channelId = interaction.channel_id ?? interaction.channel?.id ?? '';
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const memberPerms = interaction.member?.permissions ?? '0';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Server Only',
          'The `/quiz` commands can only be executed within a Discord server.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const options =
    (
      interaction.data as {
        options?: Array<{
          name: string;
          options?: Array<{ name: string; value?: unknown }>;
        }>;
      }
    )?.options ?? [];

  const subcommand = options[0];
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'host':
      await handleQuizHostSubcommand(guildId, channelId, userId, token, subOptions);
      break;
    case 'next':
      await handleQuizNextSubcommand(guildId, channelId, userId, token);
      break;
    case 'end':
      await handleQuizEndSubcommand(guildId, channelId, userId, memberPerms, token);
      break;
    case 'leaderboard':
      await handleQuizLeaderboardSubcommand(guildId, token, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Command', 'Unknown quiz subcommand.')],
        ephemeral: true,
      });
      break;
  }
}

// ─── Interactive Component Handler ────────────────────────────────────────────

/**
 * Handles button click answering a quiz question: quiz_ans:<sessionId>:<choiceIndex>
 */
export async function handleQuizComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const parts = customId.split(':');
  const actionPrefix = parts[0];
  const sessionId = parts[1];
  const choiceIndexStr = parts[2];

  if (actionPrefix !== 'quiz_ans' || !sessionId || choiceIndexStr === undefined) {
    return;
  }

  const choiceIndex = parseInt(choiceIndexStr, 10);
  if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
    await editInteractionResponse(token, {
      content: '⚠️ Invalid quiz option selected.',
      ephemeral: true,
    });
    return;
  }

  const userTag =
    component.member?.user?.username ?? component.user?.username ?? 'Contestant';

  try {
    const result = await submitAnswer(
      guildId,
      sessionId,
      userId,
      userTag,
      choiceIndex,
    );

    if (result.isCorrect) {
      await editInteractionResponse(token, {
        content: `✅ Correct! +${result.points} pts`,
        ephemeral: true,
      });
    } else {
      const correctLetter = ['A', 'B', 'C', 'D'][result.correctIndex] ?? 'A';
      await editInteractionResponse(token, {
        content: `❌ Incorrect! Correct was ${correctLetter}.`,
        ephemeral: true,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'already_answered') {
      await editInteractionResponse(token, {
        content: '⚠️ Already answered',
        ephemeral: true,
      });
    } else if (
      message.includes('not in progress') ||
      message.includes('ended') ||
      message.includes('completed')
    ) {
      await editInteractionResponse(token, {
        content: '⚠️ This quiz round is no longer accepting answers.',
        ephemeral: true,
      });
    } else {
      await editInteractionResponse(token, {
        content: `⚠️ ${message || 'Failed to submit answer.'}`,
        ephemeral: true,
      });
    }
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const quizCommand: RegisteredCommand = {
  name: 'quiz',
  description: 'Live multiplayer Kahoot-style quiz show and server trivia tournament',
  category: 'fun',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'host',
      description: 'Host a live multiplayer quiz show in this channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category',
          description: 'Trivia category (tech, gaming, anime, science, history, general)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '💻 Technology', value: 'tech' },
            { name: '🎮 Gaming', value: 'gaming' },
            { name: '✨ Anime & Manga', value: 'anime' },
            { name: '🔬 Science & Nature', value: 'science' },
            { name: '🏛️ World History', value: 'history' },
            { name: '🌍 General Trivia', value: 'general' },
          ],
        },
        {
          name: 'rounds',
          description: 'Number of question rounds to play (3 to 10, default: 5)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 3,
          max_value: 10,
        },
      ],
    },
    {
      name: 'next',
      description: 'Advance to the next question round (host only)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'end',
      description: 'End the current quiz session and show final podium (host or admin)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'leaderboard',
      description: 'View the server trivia champions leaderboard',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'limit',
          description: 'Number of top players to display (default: 10, max: 25)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 25,
        },
      ],
    },
  ],
  execute: handleQuizCommand,
};
