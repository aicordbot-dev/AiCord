/**
 * src/commands/transcribe.ts
 * Gemini AI Audio Transcriber & Voice Note Summarizer Slash Commands for AiCord.
 *
 * Subcommands:
 * - /transcribe audio: Transcribe, summarize, and extract action items from audio URL or voice note
 * - /transcribe history: View recent audio transcriptions and summaries for the server
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import {
  errorEmbed,
  warningEmbed,
} from '@/lib/discord/embeds';
import {
  isValidAudioUrl,
  transcribeAudio,
  getTranscriptHistory,
  buildTranscriptEmbed,
  buildTranscriptComponents,
  buildHistoryEmbed,
  isTestMode,
  getTestTranscript,
  type TranscriptFormat,
  type IAudioTranscript,
} from '@/lib/transcribe/transcription-service';
import { connectDB } from '@/lib/db';
import { AudioTranscript } from '@/models';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }>,
  name: string,
): T | undefined {
  return options?.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleTranscribeAudioSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const url = getOption<string>(subOptions, 'url');
  const format = getOption<string>(subOptions, 'format') as
    | TranscriptFormat
    | undefined;
  const language = getOption<string>(subOptions, 'language');

  if (!url) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed('Audio URL Required', 'Please provide an audio URL to transcribe.'),
      ],
    });
    return;
  }

  if (!isValidAudioUrl(url)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Invalid Audio URL',
          'Please provide a valid audio URL ending in .mp3, .ogg, .wav, .m4a, .aac, .flac, or a Discord CDN voice attachment.',
        ),
      ],
    });
    return;
  }

  try {
    const record = await transcribeAudio({
      guildId,
      userId,
      audioUrl: url,
      format,
      language,
    });

    const embed = buildTranscriptEmbed(record, format);
    const anyRec = record as unknown as Record<string, unknown>;
    const recordId = (anyRec._id?.toString() ||
      anyRec.id?.toString() ||
      'tx') as string;
    const components = buildTranscriptComponents(recordId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err) {
    const message = (err as Error).message || 'Failed to transcribe audio file.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Transcription Error', message)],
    });
  }
}

export async function handleTranscribeHistorySubcommand(
  guildId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const limit = getOption<number>(subOptions, 'limit') ?? 5;

  try {
    const transcripts = await getTranscriptHistory(guildId, undefined, limit);
    const embed = buildHistoryEmbed(guildId, transcripts);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err) {
    const message =
      (err as Error).message || 'Failed to fetch transcription history.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('History Fetch Error', message)],
    });
  }
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleTranscribeCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id;

  if (!guildId || !userId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Server Required',
          'The /transcribe command can only be used within a server.',
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
    case 'audio':
      await handleTranscribeAudioSubcommand(guildId, userId, token, subOptions);
      break;
    case 'history':
      await handleTranscribeHistorySubcommand(guildId, token, subOptions);
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

// ─── Component Interaction Handler ────────────────────────────────────────────

export async function handleTranscribeComponent(
  token: string,
  customId: string,
  _userId: string,
  _guildId: string,
  _component: unknown,
): Promise<void> {
  // Format: tx_fmt:<format>:<recordId>
  const parts = customId.split(':');
  if (parts.length < 3) return;

  const targetFormat = parts[1] as TranscriptFormat;
  const recordId = parts[2];

  let record: IAudioTranscript | null | undefined;

  if (isTestMode()) {
    record = getTestTranscript(recordId);
  } else {
    try {
      await connectDB();
      record = (await AudioTranscript.findById(
        recordId,
      ).lean()) as IAudioTranscript | null;
    } catch {
      record = null;
    }
  }

  if (!record) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Transcript Not Found',
          'This audio transcription record is no longer available.',
        ),
      ],
    });
    return;
  }

  const embed = buildTranscriptEmbed(record, targetFormat);
  const components = buildTranscriptComponents(recordId);

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const transcribeCommand: RegisteredCommand = {
  name: 'transcribe',
  description:
    'AI audio transcriber, meeting action items extractor & voice note summarizer',
  category: 'utility',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 15_000 },
  options: [
    {
      name: 'audio',
      description:
        'Transcribe and analyze a voice note, meeting recording, or audio URL',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'url',
          description:
            'Direct audio URL (.mp3, .ogg, .wav, .m4a, .aac, .flac, or Discord attachment)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'format',
          description:
            'Output format: summary (default), full, action_items, or bullet_points',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'Executive Summary', value: 'summary' },
            { name: 'Full Transcription', value: 'full' },
            { name: 'Action Items & To-Dos', value: 'action_items' },
            { name: 'Bullet Point Takeaways', value: 'bullet_points' },
          ],
        },
        {
          name: 'language',
          description:
            'Spoken language of the audio (e.g. English, Spanish, French, Auto)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'history',
      description:
        'View recent audio transcriptions and summaries for this server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'limit',
          description: 'Number of recent transcripts to fetch (1-20, default: 5)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 20,
        },
      ],
    },
  ],
  execute: handleTranscribeCommand,
};
