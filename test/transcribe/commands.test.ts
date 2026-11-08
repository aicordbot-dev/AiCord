/**
 * test/transcribe/commands.test.ts
 * Unit tests for Gemini AI Audio Transcriber & Voice Note Summarizer — Slash Commands:
 * - Central Command Registry lookup & subcommands schema verification (audio, history)
 * - Rate limit (5/15s), utility category, dm_permission: false, and options schema verification
 * - /transcribe audio: valid audio URL transcription, format parameter, language options, invalid URL rejection
 * - /transcribe history: server history dashboard, pagination limit, and empty server state
 * - Main command router: execution routing, DM rejection, and unknown subcommand handling
 * - Interactive component router (handleTranscribeComponent): format switching (full, action_items, bullet_points, summary) and missing record handling
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import {
  getCommand,
  registerTranscribeCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleTranscribeCommand,
  handleTranscribeAudioSubcommand,
  handleTranscribeHistorySubcommand,
  handleTranscribeComponent,
  transcribeCommand,
} from '@/commands/transcribe';
import {
  enableTestMode,
  clearTestStore,
  setTestTranscript,
  transcribeAudio,
} from '@/lib/transcribe/transcription-service';

describe('Gemini AI Audio Transcriber — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_tx_cmd_999';
  const USER_ALICE = 'user_alice_cmd_111';
  const USER_BOB = 'user_bob_cmd_222';

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
    it('registers /transcribe in the central command registry', () => {
      registerTranscribeCommands();
      const cmd = getCommand('transcribe');
      assert.ok(cmd, 'transcribe command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'transcribe');
      assert.strictEqual(cmd?.category, 'utility');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 15_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines audio and history subcommands with valid option schemas', () => {
      const subcommands = transcribeCommand.options?.map(
        (o: unknown) => (o as { name: string }).name,
      );
      assert.deepStrictEqual(subcommands, ['audio', 'history']);

      // Verify 'audio' subcommand options
      const audioSub = transcribeCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'audio',
      );
      const audioOpts = (audioSub as { options?: Array<{ name: string; required?: boolean; choices?: Array<{ name: string; value: string }> }> })?.options;
      assert.ok(audioOpts?.some((o) => o.name === 'url' && o.required === true));

      const formatOpt = audioOpts?.find((o) => o.name === 'format');
      assert.ok(formatOpt && formatOpt.required === false);
      assert.strictEqual(formatOpt.choices?.length, 4);

      const langOpt = audioOpts?.find((o) => o.name === 'language');
      assert.ok(langOpt && langOpt.required === false);

      // Verify 'history' subcommand options
      const historySub = transcribeCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'history',
      );
      const historyOpts = (historySub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(historyOpts?.some((o) => o.name === 'limit' && o.required === false));
    });
  });

  describe('/transcribe audio Subcommand Execution', () => {
    it('successfully transcribes a valid audio URL with default format', async () => {
      await handleTranscribeAudioSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_tx_1',
        [{ name: 'url', value: 'https://example.com/recording.mp3' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const response = interceptedResponses[0].options;
      assert.ok(response.embeds?.[0]);
      assert.strictEqual(response.embeds[0].title, '🎙️ AI Audio Transcription & Analysis');
      assert.ok(response.embeds[0].description?.includes('Executive Summary'));
      assert.ok(response.components && response.components.length > 0);
    });

    it('transcribes with explicit format choice (action_items)', async () => {
      await handleTranscribeAudioSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_tx_2',
        [
          { name: 'url', value: 'https://example.com/meeting.wav' },
          { name: 'format', value: 'action_items' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('Action Items & Tasks'));
      assert.ok(embed?.description?.includes('- [ ]'));
    });

    it('transcribes with full text format', async () => {
      await handleTranscribeAudioSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_tx_full',
        [
          { name: 'url', value: 'https://example.com/lecture.ogg' },
          { name: 'format', value: 'full' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('Full Transcription'));
      assert.ok(embed?.description?.includes('> '));
    });

    it('transcribes with bullet_points format', async () => {
      await handleTranscribeAudioSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_tx_bullets',
        [
          { name: 'url', value: 'https://example.com/brief.m4a' },
          { name: 'format', value: 'bullet_points' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('Structured Bullet Takeaways'));
      assert.ok(embed?.description?.includes('• '));
    });

    it('passes language option correctly', async () => {
      await handleTranscribeAudioSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_tx_lang',
        [
          { name: 'url', value: 'https://example.com/spanish_memo.mp3' },
          { name: 'language', value: 'Spanish' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(
        interceptedResponses[0].options.embeds?.[0]?.title,
        '🎙️ AI Audio Transcription & Analysis',
      );
    });

    it('returns error embed when URL option is missing', async () => {
      await handleTranscribeAudioSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_tx_missing_url',
        [],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('URL Required'));
    });

    it('returns error embed when audio URL is invalid or executable', async () => {
      await handleTranscribeAudioSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_tx_invalid',
        [{ name: 'url', value: 'https://example.com/malicious.exe' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Invalid Audio URL'));
      assert.ok(embed?.description?.includes('.mp3'));
    });
  });

  describe('/transcribe history Subcommand Execution', () => {
    it('returns informative empty notice when no audio recordings exist', async () => {
      await handleTranscribeHistorySubcommand(GUILD_ID, 'token_hist_empty', []);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.strictEqual(embed?.title, '🎙️ Audio Transcription History');
      assert.ok(embed?.description?.includes('No audio transcriptions found'));
    });

    it('returns populated history embed listing recent recordings', async () => {
      await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/audio1.mp3',
      });

      await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_BOB,
        audioUrl: 'https://example.com/audio2.mp3',
      });

      await handleTranscribeHistorySubcommand(GUILD_ID, 'token_hist_items', [
        { name: 'limit', value: 5 },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.strictEqual(embed?.title, '🎙️ Audio Transcription History');
      assert.strictEqual(embed?.fields?.length, 2);
    });
  });

  describe('Main Slash Command Router', () => {
    it('routes audio subcommand interactions cleanly', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_router_audio',
        member: { user: { id: USER_ALICE } },
        data: {
          options: [
            {
              name: 'audio',
              type: 1,
              options: [
                { name: 'url', value: 'https://example.com/valid_audio.mp3' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTranscribeCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(
        interceptedResponses[0].options.embeds?.[0]?.title,
        '🎙️ AI Audio Transcription & Analysis',
      );
    });

    it('routes history subcommand interactions cleanly', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_router_hist',
        member: { user: { id: USER_ALICE } },
        data: {
          options: [
            {
              name: 'history',
              type: 1,
              options: [],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTranscribeCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(
        interceptedResponses[0].options.embeds?.[0]?.title,
        '🎙️ Audio Transcription History',
      );
    });

    it('rejects execution outside of a server (in DMs)', async () => {
      const interaction = {
        guild_id: undefined,
        token: 'token_router_dm',
        user: { id: USER_ALICE },
        data: { options: [] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTranscribeCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Server Required'));
    });

    it('handles unknown subcommands with an error embed', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_router_unknown',
        member: { user: { id: USER_ALICE } },
        data: {
          options: [
            {
              name: 'non_existent_subcommand',
              type: 1,
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTranscribeCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Unknown Subcommand'));
    });
  });

  describe('Interactive Component Routing (handleTranscribeComponent)', () => {
    it('switches embed to full text transcription format upon button click', async () => {
      const doc = setTestTranscript({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/interactive_test.mp3',
        transcript: 'Testing interactive full transcription display on button toggle.',
      });

      const anyDoc = doc as unknown as Record<string, unknown>;
      const recordId = (anyDoc._id?.toString() || anyDoc.id?.toString()) as string;

      await handleTranscribeComponent(
        'token_comp_full',
        `tx_fmt:full:${recordId}`,
        USER_ALICE,
        GUILD_ID,
        {},
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('Full Transcription'));
      assert.ok(embed?.description?.includes('> '));
    });

    it('switches embed to action items format upon button click', async () => {
      const doc = setTestTranscript({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/interactive_actions.mp3',
        actionItems: ['Prepare deployment patch', 'Review metrics'],
      });

      const anyDoc = doc as unknown as Record<string, unknown>;
      const recordId = (anyDoc._id?.toString() || anyDoc.id?.toString()) as string;

      await handleTranscribeComponent(
        'token_comp_actions',
        `tx_fmt:action_items:${recordId}`,
        USER_ALICE,
        GUILD_ID,
        {},
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('Action Items & Tasks'));
      assert.ok(embed?.description?.includes('- [ ] Prepare deployment patch'));
    });

    it('switches embed to bullet points format upon button click', async () => {
      const doc = setTestTranscript({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/interactive_bullets.mp3',
        summary: 'First key takeaway. Second important point.',
      });

      const anyDoc = doc as unknown as Record<string, unknown>;
      const recordId = (anyDoc._id?.toString() || anyDoc.id?.toString()) as string;

      await handleTranscribeComponent(
        'token_comp_bullets',
        `tx_fmt:bullet_points:${recordId}`,
        USER_ALICE,
        GUILD_ID,
        {},
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.description?.includes('Structured Bullet Takeaways'));
      assert.ok(embed?.description?.includes('• '));
    });

    it('returns warning embed when transcript ID does not exist', async () => {
      await handleTranscribeComponent(
        'token_comp_missing',
        'tx_fmt:summary:non_existent_transcript_id',
        USER_ALICE,
        GUILD_ID,
        {},
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Transcript Not Found'));
    });

    it('gracefully ignores malformed custom_ids without crashing', async () => {
      await handleTranscribeComponent(
        'token_comp_malformed',
        'invalid_custom_id',
        USER_ALICE,
        GUILD_ID,
        {},
      );

      assert.strictEqual(interceptedResponses.length, 0);
    });
  });
});
