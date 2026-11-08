/**
 * test/transcribe/transcription-service.test.ts
 * Comprehensive unit tests for Gemini AI Audio Transcriber & Voice Note Summarizer — Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestTranscript, getTestTranscript)
 * - Audio URL validation (.mp3, .ogg, .wav, .m4a, .aac, .flac, Discord CDN attachments, rejection of non-audio links)
 * - Format validation across full, summary, action_items, and bullet_points
 * - Sentiment classification (Positive, Neutral, Urgent, Analytical)
 * - Automated Action Item extraction and formatting
 * - Word count calculation and duration estimation
 * - Transcription processing across diverse voice notes & meeting recordings
 * - Guild and member history retrieval with pagination limits
 * - Discord Embed presentation across all 4 formats
 * - Interactive format switcher components and history embed builders
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestTranscript,
  getTestTranscript,
  isValidAudioUrl,
  isValidTranscriptFormat,
  calculateWordCount,
  detectSentiment,
  extractActionItems,
  transcribeAudio,
  getTranscriptHistory,
  buildTranscriptEmbed,
  buildTranscriptComponents,
  buildHistoryEmbed,
  SENTIMENT_BADGES,
  TRANSCRIPT_FORMATS,
  type IAudioTranscript,
} from '@/lib/transcribe/transcription-service';

describe('Gemini AI Audio Transcriber — Service Engine', () => {
  const GUILD_ID = 'guild_tx_test_001';
  const OTHER_GUILD = 'guild_tx_test_002';
  const USER_ALICE = 'user_alice_audio_101';
  const USER_BOB = 'user_bob_audio_202';

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

    it('sets and retrieves test transcript record with canonical defaults', () => {
      const created = setTestTranscript({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/recording.mp3',
        format: 'summary',
      });

      assert.ok(created);
      assert.strictEqual(created.guildId, GUILD_ID);
      assert.strictEqual(created.userId, USER_ALICE);
      assert.strictEqual(created.format, 'summary');
      assert.ok(created.wordCount > 0);
      assert.ok(created.actionItems.length > 0);

      const anyDoc = created as unknown as Record<string, unknown>;
      const recordId = (anyDoc._id?.toString() || anyDoc.id?.toString()) as string;
      const fetched = getTestTranscript(recordId);
      assert.ok(fetched);
      assert.strictEqual(fetched.audioUrl, 'https://example.com/recording.mp3');
    });

    it('clears test store completely', () => {
      const doc = setTestTranscript({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/clear_test.mp3',
      });

      const anyDoc = doc as unknown as Record<string, unknown>;
      const recordId = (anyDoc._id?.toString() || anyDoc.id?.toString()) as string;
      assert.ok(getTestTranscript(recordId));

      clearTestStore();
      assert.strictEqual(getTestTranscript(recordId), undefined);
    });
  });

  describe('Audio URL Validation & Security Screening', () => {
    it('accepts standard audio file extensions (.mp3, .ogg, .wav, .m4a, .aac, .flac)', () => {
      assert.strictEqual(isValidAudioUrl('https://cdn.example.com/audio/meeting.mp3'), true);
      assert.strictEqual(isValidAudioUrl('https://example.com/voice-note.ogg'), true);
      assert.strictEqual(isValidAudioUrl('https://example.com/podcast.wav'), true);
      assert.strictEqual(isValidAudioUrl('https://example.com/memos/note.m4a'), true);
      assert.strictEqual(isValidAudioUrl('https://example.com/track.aac'), true);
      assert.strictEqual(isValidAudioUrl('https://example.com/lossless.flac'), true);
    });

    it('accepts audio URLs with URL query parameters and uppercase extensions', () => {
      assert.strictEqual(
        isValidAudioUrl('https://storage.googleapis.com/audio-bucket/sync.MP3?token=secret123&expiry=456'),
        true,
      );
      assert.strictEqual(
        isValidAudioUrl('https://example.com/voice.OGG?download=true'),
        true,
      );
    });

    it('accepts Discord CDN attachment links and voice message URLs', () => {
      assert.strictEqual(
        isValidAudioUrl('https://cdn.discordapp.com/attachments/123456789/987654321/voice-message.ogg'),
        true,
      );
      assert.strictEqual(
        isValidAudioUrl(
          'https://media.discordapp.net/attachments/112233/445566/voice_note.mp3?ex=67cd&is=12ab&hm=99ff',
        ),
        true,
      );
      assert.strictEqual(
        isValidAudioUrl('https://cdn.discordapp.com/attachments/11223344/55667788/raw_voice_note'),
        true,
      );
    });

    it('rejects dangerous and non-audio executable file extensions', () => {
      assert.strictEqual(isValidAudioUrl('https://example.com/payload.exe'), false);
      assert.strictEqual(isValidAudioUrl('https://cdn.discordapp.com/attachments/123/456/malware.exe'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/script.bat'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/run.sh'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/index.html'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/page.htm'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/archive.zip'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/report.pdf'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/document.docx'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/image.png'), false);
      assert.strictEqual(isValidAudioUrl('https://example.com/photo.jpeg'), false);
    });

    it('rejects invalid URL formats and non-HTTP schemes', () => {
      assert.strictEqual(isValidAudioUrl('not-a-valid-url'), false);
      assert.strictEqual(isValidAudioUrl(''), false);
      assert.strictEqual(isValidAudioUrl(undefined), false);
      assert.strictEqual(isValidAudioUrl('ftp://example.com/audio.mp3'), false);
      assert.strictEqual(isValidAudioUrl('file:///C:/audio/test.mp3'), false);
    });
  });

  describe('Transcript Format Validation', () => {
    it('validates supported formats correctly', () => {
      for (const fmt of TRANSCRIPT_FORMATS) {
        assert.strictEqual(isValidTranscriptFormat(fmt), true);
      }
    });

    it('rejects invalid or unknown formats', () => {
      assert.strictEqual(isValidTranscriptFormat('unsupported_format'), false);
      assert.strictEqual(isValidTranscriptFormat(''), false);
      assert.strictEqual(isValidTranscriptFormat(undefined), false);
      assert.strictEqual(isValidTranscriptFormat('pdf'), false);
    });
  });

  describe('Sentiment Detection Engine', () => {
    it('detects urgent sentiment from incident and critical keywords', () => {
      const urgentText = 'URGENT: Emergency rollback required for payment system outage ASAP!';
      assert.strictEqual(detectSentiment(urgentText), 'urgent');
    });

    it('detects analytical sentiment from metrics, latency, and data keywords', () => {
      const analyticalText = 'Performance benchmark report: Q3 analytics show a 25% latency reduction and stable memory metrics.';
      assert.strictEqual(detectSentiment(analyticalText), 'analytical');
    });

    it('detects positive sentiment from praise and celebration keywords', () => {
      const positiveText = 'Awesome work team! Huge congratulations on the successful release. Great job everyone!';
      assert.strictEqual(detectSentiment(positiveText), 'positive');
    });

    it('falls back to neutral sentiment for ordinary meeting discussions', () => {
      const neutralText = 'We reviewed the task list and will continue with our sprint planning on Tuesday.';
      assert.strictEqual(detectSentiment(neutralText), 'neutral');
    });
  });

  describe('Action Item Extraction & Word Count Calculation', () => {
    it('extracts actionable tasks from bulleted text and sentence markers', () => {
      const meetingNotes = `Weekly sync:
- Alice will finalize the database schema migration by Wednesday.
- Bob needs to prepare the deployment staging checklist by Thursday.
We should schedule a load test review on Friday morning.`;

      const items = extractActionItems(meetingNotes);
      assert.ok(items.length >= 2);
      assert.ok(items.some((item) => item.includes('database schema migration')));
      assert.ok(items.some((item) => item.includes('staging checklist')));
    });

    it('handles text without action items gracefully', () => {
      const chatter = 'Just saying hello to everyone in general voice channel. Nice weather today.';
      const items = extractActionItems(chatter);
      assert.strictEqual(Array.isArray(items), true);
    });

    it('computes accurate word counts across diverse texts', () => {
      assert.strictEqual(calculateWordCount('One two three four five'), 5);
      assert.strictEqual(calculateWordCount('   Spaced   out   words   '), 3);
      assert.strictEqual(calculateWordCount(''), 0);
      assert.strictEqual(calculateWordCount('   '), 0);
    });
  });

  describe('Audio Transcription Processing Across Formats', () => {
    it('processes standard audio URL with default format (summary)', async () => {
      const record = await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/sync_meeting.mp3',
      });

      assert.ok(record);
      assert.strictEqual(record.guildId, GUILD_ID);
      assert.strictEqual(record.userId, USER_ALICE);
      assert.strictEqual(record.format, 'summary');
      assert.ok(record.transcript.length > 50);
      assert.ok(record.summary.length > 20);
      assert.ok(record.actionItems.length > 0);
      assert.strictEqual(record.sentiment, 'neutral');
      assert.ok(record.wordCount > 10);
      assert.ok(record.durationSeconds! > 0);
    });

    it('processes audio URL with full transcript format', async () => {
      const record = await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/interview.wav',
        format: 'full',
      });

      assert.strictEqual(record.format, 'full');
      assert.ok(record.transcript.includes('architecture'));
    });

    it('processes audio URL with action_items format', async () => {
      const record = await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/standup.ogg',
        format: 'action_items',
      });

      assert.strictEqual(record.format, 'action_items');
      assert.ok(record.actionItems.length >= 2);
    });

    it('processes audio URL with bullet_points format', async () => {
      const record = await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/takeaways.m4a',
        format: 'bullet_points',
      });

      assert.strictEqual(record.format, 'bullet_points');
      assert.ok(record.summary.length > 0);
    });

    it('identifies urgent incident recordings and sets urgent sentiment', async () => {
      const record = await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_BOB,
        audioUrl: 'https://cdn.discordapp.com/attachments/111/222/urgent_incident_briefing.ogg',
      });

      assert.strictEqual(record.sentiment, 'urgent');
      assert.ok(record.transcript.toLowerCase().includes('urgent'));
      assert.ok(
        record.actionItems.some(
          (i) =>
            i.toLowerCase().includes('roll back') ||
            i.toLowerCase().includes('rollback'),
        ),
      );
    });

    it('identifies analytical recordings and sets analytical sentiment', async () => {
      const record = await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_BOB,
        audioUrl: 'https://example.com/q3_performance_metrics.wav',
      });

      assert.strictEqual(record.sentiment, 'analytical');
      assert.ok(record.transcript.toLowerCase().includes('metric'));
    });

    it('identifies celebratory recordings and sets positive sentiment', async () => {
      const record = await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_BOB,
        audioUrl: 'https://example.com/release_celebrate.mp3',
      });

      assert.strictEqual(record.sentiment, 'positive');
      assert.ok(record.summary.toLowerCase().includes('celebrat'));
    });

    it('throws descriptive error on invalid audio URL', async () => {
      await assert.rejects(
        async () => {
          await transcribeAudio({
            guildId: GUILD_ID,
            userId: USER_ALICE,
            audioUrl: 'https://example.com/malicious.exe',
          });
        },
        {
          name: 'Error',
          message: /Invalid audio URL/,
        },
      );
    });
  });

  describe('Transcription History Retrieval', () => {
    it('returns empty array when no transcripts exist for guild', async () => {
      const history = await getTranscriptHistory(GUILD_ID);
      assert.deepStrictEqual(history, []);
    });

    it('retrieves recent transcripts in descending chronological order', async () => {
      await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/first.mp3',
      });

      await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_BOB,
        audioUrl: 'https://example.com/second.mp3',
      });

      const history = await getTranscriptHistory(GUILD_ID, undefined, 10);
      assert.strictEqual(history.length, 2);
      assert.strictEqual(history[0].audioUrl, 'https://example.com/second.mp3');
      assert.strictEqual(history[1].audioUrl, 'https://example.com/first.mp3');
    });

    it('filters history by specific userId when requested', async () => {
      await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/alice_voice.mp3',
      });

      await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_BOB,
        audioUrl: 'https://example.com/bob_voice.mp3',
      });

      const aliceHistory = await getTranscriptHistory(GUILD_ID, USER_ALICE);
      assert.strictEqual(aliceHistory.length, 1);
      assert.strictEqual(aliceHistory[0].userId, USER_ALICE);

      const bobHistory = await getTranscriptHistory(GUILD_ID, USER_BOB);
      assert.strictEqual(bobHistory.length, 1);
      assert.strictEqual(bobHistory[0].userId, USER_BOB);
    });

    it('respects pagination limit parameter', async () => {
      for (let i = 1; i <= 5; i++) {
        await transcribeAudio({
          guildId: GUILD_ID,
          userId: USER_ALICE,
          audioUrl: `https://example.com/audio_${i}.mp3`,
        });
      }

      const limited = await getTranscriptHistory(GUILD_ID, undefined, 3);
      assert.strictEqual(limited.length, 3);
    });

    it('does not leak transcripts across different guilds', async () => {
      await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/guild1.mp3',
      });

      await transcribeAudio({
        guildId: OTHER_GUILD,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/guild2.mp3',
      });

      const guild1History = await getTranscriptHistory(GUILD_ID);
      assert.strictEqual(guild1History.length, 1);
      assert.strictEqual(guild1History[0].guildId, GUILD_ID);

      const guild2History = await getTranscriptHistory(OTHER_GUILD);
      assert.strictEqual(guild2History.length, 1);
      assert.strictEqual(guild2History[0].guildId, OTHER_GUILD);
    });
  });

  describe('Embed Presentation Builders', () => {
    let sampleRecord: IAudioTranscript;

    beforeEach(async () => {
      sampleRecord = await transcribeAudio({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        audioUrl: 'https://example.com/team_meeting.mp3',
      });
    });

    it('builds summary format embed with executive summary and sentiment badge', () => {
      const embed = buildTranscriptEmbed(sampleRecord, 'summary');
      assert.strictEqual(embed.title, '🎙️ AI Audio Transcription & Analysis');
      assert.ok(embed.description?.includes('Executive Summary'));
      assert.ok(embed.description?.includes(sampleRecord.audioUrl));
      assert.ok(embed.footer?.text.includes(`${sampleRecord.wordCount} words`));
      assert.ok(embed.footer?.text.includes(SENTIMENT_BADGES.neutral));
      assert.ok(embed.fields && embed.fields.length > 0);
    });

    it('builds full format embed with quote block transcription text', () => {
      const embed = buildTranscriptEmbed(sampleRecord, 'full');
      assert.strictEqual(embed.title, '🎙️ AI Audio Transcription & Analysis');
      assert.ok(embed.description?.includes('Full Transcription'));
      assert.ok(embed.description?.includes('> '));
      assert.ok(embed.footer?.text.includes(`${sampleRecord.wordCount} words`));
    });

    it('builds action_items format embed with checklist tasks (- [ ] Task)', () => {
      const embed = buildTranscriptEmbed(sampleRecord, 'action_items');
      assert.strictEqual(embed.title, '🎙️ AI Audio Transcription & Analysis');
      assert.ok(embed.description?.includes('Action Items & Tasks'));
      assert.ok(embed.description?.includes('- [ ]'));
      assert.ok(embed.footer?.text.includes(`${sampleRecord.wordCount} words`));
    });

    it('builds bullet_points format embed with structured bullet takeaways', () => {
      const embed = buildTranscriptEmbed(sampleRecord, 'bullet_points');
      assert.strictEqual(embed.title, '🎙️ AI Audio Transcription & Analysis');
      assert.ok(embed.description?.includes('Structured Bullet Takeaways'));
      assert.ok(embed.description?.includes('• '));
      assert.ok(embed.footer?.text.includes(`${sampleRecord.wordCount} words`));
    });

    it('builds interactive ActionRow components with 4 format switcher buttons', () => {
      const anyRec = sampleRecord as unknown as Record<string, unknown>;
      const recordId = (anyRec._id?.toString() || anyRec.id?.toString()) as string;
      const rows = buildTranscriptComponents(recordId);

      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].components.length, 4);

      const buttonIds = rows[0].components.map((c: any) => c.custom_id);
      assert.ok(buttonIds.includes(`tx_fmt:summary:${recordId}`));
      assert.ok(buttonIds.includes(`tx_fmt:full:${recordId}`));
      assert.ok(buttonIds.includes(`tx_fmt:action_items:${recordId}`));
      assert.ok(buttonIds.includes(`tx_fmt:bullet_points:${recordId}`));
    });

    it('builds empty server history embed notice', () => {
      const embed = buildHistoryEmbed(GUILD_ID, []);
      assert.strictEqual(embed.title, '🎙️ Audio Transcription History');
      assert.ok(embed.description?.includes('No audio transcriptions found'));
    });

    it('builds populated server history embed with recent transcript listings', () => {
      const embed = buildHistoryEmbed(GUILD_ID, [sampleRecord]);
      assert.strictEqual(embed.title, '🎙️ Audio Transcription History');
      assert.ok(embed.description?.includes('Displaying'));
      assert.strictEqual(embed.fields?.length, 1);
      assert.ok(embed.fields?.[0].value.includes(`<@${USER_ALICE}>`));
    });
  });
});
