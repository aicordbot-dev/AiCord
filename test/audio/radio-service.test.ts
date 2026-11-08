/**
 * test/audio/radio-service.test.ts
 * Unit tests for Service 18: 24/7 Voice Radio & Audio Streamer Service Engine:
 * - Station registry & metadata resolution
 * - Stream lifecycle (start, pause, resume, stop)
 * - Volume adjustments & clamping boundaries (1 - 100)
 * - Station switching & track updating
 * - Visual ASCII equalizer & volume meter rendering
 * - Player embed generation & interactive component action rows
 */

import '../test-env';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  startRadio,
  pauseRadio,
  resumeRadio,
  stopRadio,
  setVolume,
  switchStation,
  getRadioSession,
  getRadioStation,
  renderEqualizer,
  renderVolumeBar,
  buildRadioEmbed,
  buildRadioComponents,
  RADIO_STATIONS,
  RADIO_STATION_LIST,
  type IRadioSession,
  type RadioStationId,
} from '@/lib/audio/radio-service';

describe('24/7 Voice Radio & Audio Streamer — Service Engine', () => {
  const GUILD_ID = 'guild_radio_test_101';
  const CHANNEL_ID = 'voice_chan_202';
  const USER_ID = 'user_dj_303';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  // ─── 1. Station Registry & Metadata Resolution ───────────────────────────────

  describe('Station Registry & Metadata Resolution', () => {
    it('defines all 6 curated 24/7 radio stations with required metadata', () => {
      const requiredStations: RadioStationId[] = [
        'lofi',
        'synthwave',
        'retro',
        'jazz',
        'chill',
        'classical',
      ];

      assert.equal(RADIO_STATION_LIST.length, 6);

      for (const id of requiredStations) {
        const station = RADIO_STATIONS[id];
        assert.ok(station, `Station ${id} should exist`);
        assert.equal(station.id, id);
        assert.ok(station.name.length > 0, `${id} should have a name`);
        assert.ok(station.emoji.length > 0, `${id} should have an emoji`);
        assert.ok(station.tagline.length > 0, `${id} should have a tagline`);
        assert.ok(station.genre.length > 0, `${id} should have a genre`);
        assert.ok(typeof station.color === 'number', `${id} should have a numeric color`);
        assert.ok(station.defaultTrack, `${id} should have a defaultTrack`);
        assert.ok(station.defaultTrack.title.length > 0);
        assert.ok(station.defaultTrack.artist.length > 0);
        assert.ok(station.defaultTrack.streamUrl.startsWith('http'));
      }
    });

    it('verifies exact station identities and themes', () => {
      assert.equal(RADIO_STATIONS.lofi.emoji, '🎧');
      assert.equal(RADIO_STATIONS.lofi.name, 'Lofi Beats & Chillhop');
      assert.equal(RADIO_STATIONS.lofi.tagline, 'beats to relax/study to');

      assert.equal(RADIO_STATIONS.synthwave.emoji, '🌆');
      assert.equal(RADIO_STATIONS.synthwave.name, 'Synthwave 1984');
      assert.equal(RADIO_STATIONS.synthwave.tagline, 'retro electronic neon vibes');

      assert.equal(RADIO_STATIONS.retro.emoji, '🕹️');
      assert.equal(RADIO_STATIONS.retro.name, '8-Bit Arcade Classics');
      assert.equal(RADIO_STATIONS.retro.tagline, 'chiptune & gaming themes');

      assert.equal(RADIO_STATIONS.jazz.emoji, '☕');
      assert.equal(RADIO_STATIONS.jazz.name, 'Coffeehouse Jazz & Blues');
      assert.equal(RADIO_STATIONS.jazz.tagline, 'acoustic mellow café vibes');

      assert.equal(RADIO_STATIONS.chill.emoji, '🍃');
      assert.equal(RADIO_STATIONS.chill.name, 'Deep Ambient Soundscapes');
      assert.equal(RADIO_STATIONS.chill.tagline, 'zen meditation & focus');

      assert.equal(RADIO_STATIONS.classical.emoji, '🎻');
      assert.equal(RADIO_STATIONS.classical.name, 'Imperial Symphony');
      assert.equal(RADIO_STATIONS.classical.tagline, 'timeless orchestral masterpieces');
    });

    it('resolves station by id via getRadioStation and returns undefined for unknown', () => {
      const lofi = getRadioStation('lofi');
      assert.ok(lofi);
      assert.equal(lofi.name, 'Lofi Beats & Chillhop');

      const unknown = getRadioStation('unknown_station_xyz');
      assert.equal(unknown, undefined);
    });
  });

  // ─── 2. Stream Lifecycle (Start, Pause, Resume, Stop) ────────────────────────

  describe('Stream Lifecycle Mechanics', () => {
    it('initializes a new radio session in voice channel with default volume and playing status', async () => {
      const session = await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      assert.ok(session);
      assert.equal(session.guildId, GUILD_ID);
      assert.equal(session.channelId, CHANNEL_ID);
      assert.equal(session.station, 'lofi');
      assert.equal(session.status, 'playing');
      assert.equal(session.volume, 80);
      assert.equal(session.startedBy, USER_ID);
      assert.equal(session.currentTrack.title, RADIO_STATIONS.lofi.defaultTrack.title);
      assert.equal(session.currentTrack.artist, RADIO_STATIONS.lofi.defaultTrack.artist);

      const retrieved = await getRadioSession(GUILD_ID);
      assert.deepEqual(retrieved, session);
    });

    it('initializes session with specified station (e.g. synthwave)', async () => {
      const session = await startRadio(GUILD_ID, CHANNEL_ID, 'synthwave', USER_ID);

      assert.equal(session.station, 'synthwave');
      assert.equal(session.currentTrack.title, RADIO_STATIONS.synthwave.defaultTrack.title);
    });

    it('preserves existing volume when restarting or updating channel', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);
      await setVolume(GUILD_ID, 45);

      const updated = await startRadio(GUILD_ID, 'new_channel_555', 'retro', USER_ID);
      assert.equal(updated.volume, 45);
      assert.equal(updated.channelId, 'new_channel_555');
      assert.equal(updated.station, 'retro');
    });

    it('pauses and resumes stream correctly', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const paused = await pauseRadio(GUILD_ID);
      assert.ok(paused);
      assert.equal(paused.status, 'paused');

      const resumed = await resumeRadio(GUILD_ID);
      assert.ok(resumed);
      assert.equal(resumed.status, 'playing');
    });

    it('stops stream correctly', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const stopped = await stopRadio(GUILD_ID);
      assert.ok(stopped);
      assert.equal(stopped.status, 'stopped');
    });

    it('returns null when pausing, resuming, or stopping non-existent session', async () => {
      const p = await pauseRadio('unknown_guild');
      assert.equal(p, null);

      const r = await resumeRadio('unknown_guild');
      assert.equal(r, null);

      const s = await stopRadio('unknown_guild');
      assert.equal(s, null);
    });
  });

  // ─── 3. Volume Adjustments & Clamping Boundaries ──────────────────────────────

  describe('Audio Volume Adjustments & Clamping', () => {
    it('sets valid volume level between 1 and 100', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const updated = await setVolume(GUILD_ID, 65);
      assert.ok(updated);
      assert.equal(updated.volume, 65);
    });

    it('clamps volume below 1 to 1', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const updated = await setVolume(GUILD_ID, -20);
      assert.ok(updated);
      assert.equal(updated.volume, 1);
    });

    it('clamps volume above 100 to 100', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const updated = await setVolume(GUILD_ID, 150);
      assert.ok(updated);
      assert.equal(updated.volume, 100);
    });

    it('rounds floating-point volume inputs', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const updated = await setVolume(GUILD_ID, 42.7);
      assert.ok(updated);
      assert.equal(updated.volume, 43);
    });

    it('returns null when adjusting volume for non-existent session', async () => {
      const res = await setVolume('non_existent', 50);
      assert.equal(res, null);
    });
  });

  // ─── 4. Station Switching ────────────────────────────────────────────────────

  describe('Station Switching Mechanics', () => {
    it('switches station, updates current track, and sets status to playing', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);
      await pauseRadio(GUILD_ID);

      const switched = await switchStation(GUILD_ID, 'jazz');
      assert.ok(switched);
      assert.equal(switched.station, 'jazz');
      assert.equal(switched.status, 'playing');
      assert.equal(switched.currentTrack.title, RADIO_STATIONS.jazz.defaultTrack.title);
      assert.equal(switched.currentTrack.artist, RADIO_STATIONS.jazz.defaultTrack.artist);
    });

    it('falls back safely to lofi on unknown station identifier', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'synthwave', USER_ID);

      const switched = await switchStation(GUILD_ID, 'nonexistent_station' as RadioStationId);
      assert.ok(switched);
      assert.equal(switched.station, 'lofi');
    });

    it('returns null when switching station on non-existent session', async () => {
      const switched = await switchStation('non_existent', 'classical');
      assert.equal(switched, null);
    });
  });

  // ─── 5. Visual ASCII Equalizer & Meter Rendering ─────────────────────────────

  describe('Visual ASCII Equalizer & Volume Bar Rendering', () => {
    it('renders live equalizer bar with volume percentage when playing', () => {
      const eq75 = renderEqualizer('playing', 75);
      assert.equal(eq75, ' ▂▃▅▆▇ 75%');

      const eq100 = renderEqualizer('playing', 100);
      assert.equal(eq100, ' ▂▃▅▆▇ 100%');
    });

    it('renders [PAUSED] equalizer when stream is paused', () => {
      const eq = renderEqualizer('paused', 80);
      assert.equal(eq, ' ▂▂▂▂▂ [PAUSED]');
    });

    it('renders [STOPPED] equalizer when stream is stopped', () => {
      const eq = renderEqualizer('stopped', 80);
      assert.equal(eq, '       [STOPPED]');
    });

    it('renders proportional ASCII volume bar', () => {
      const bar80 = renderVolumeBar(80, 10);
      assert.equal(bar80, '████████░░');

      const bar50 = renderVolumeBar(50, 10);
      assert.equal(bar50, '█████░░░░░');

      const bar0 = renderVolumeBar(0, 10);
      assert.equal(bar0, '░░░░░░░░░░');

      const bar100 = renderVolumeBar(100, 10);
      assert.equal(bar100, '██████████');
    });
  });

  // ─── 6. Embed & Component Generation ─────────────────────────────────────────

  describe('Player Embed & Interactive Components', () => {
    it('builds rich radio embed with station badge, track info, channel, and status', async () => {
      const session = await startRadio(GUILD_ID, CHANNEL_ID, 'chill', USER_ID);
      const embed = buildRadioEmbed(session);

      assert.ok(embed.title?.includes(RADIO_STATIONS.chill.emoji));
      assert.ok(embed.title?.includes(RADIO_STATIONS.chill.name));
      assert.equal(embed.color, RADIO_STATIONS.chill.color);
      assert.ok(embed.description?.includes(RADIO_STATIONS.chill.tagline));
      assert.ok(embed.description?.includes('🟢 Streaming Live'));
      assert.ok(embed.description?.includes(`<#${CHANNEL_ID}>`));
      assert.ok(embed.description?.includes(' ▂▃▅▆▇ 80%'));

      // Check fields
      const nowPlayingField = embed.fields?.find((f) => f.name.includes('Now Playing'));
      assert.ok(nowPlayingField?.value.includes(RADIO_STATIONS.chill.defaultTrack.title));
      assert.ok(nowPlayingField?.value.includes(RADIO_STATIONS.chill.defaultTrack.artist));

      const volumeField = embed.fields?.find((f) => f.name.includes('Volume'));
      assert.ok(volumeField?.value.includes('80%'));
    });

    it('updates status indicator to paused and stopped in embed', async () => {
      const session = await startRadio(GUILD_ID, CHANNEL_ID, 'classical', USER_ID);

      await pauseRadio(GUILD_ID);
      const pausedSession = (await getRadioSession(GUILD_ID))!;
      const pausedEmbed = buildRadioEmbed(pausedSession);
      assert.ok(pausedEmbed.description?.includes('⏸️ Paused'));

      await stopRadio(GUILD_ID);
      const stoppedSession = (await getRadioSession(GUILD_ID))!;
      const stoppedEmbed = buildRadioEmbed(stoppedSession);
      assert.ok(stoppedEmbed.description?.includes('⏹️ Stopped'));
    });

    it('builds interactive action rows with 4 buttons and station dropdown menu', async () => {
      const session = await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);
      const rows = buildRadioComponents(session);

      assert.equal(rows.length, 2);

      // Row 1: 4 Control buttons
      const buttonsRow = rows[0];
      assert.equal(buttonsRow.type, 1);
      assert.equal(buttonsRow.components.length, 4);

      const customIds = buttonsRow.components.map((c) => (c as { custom_id?: string }).custom_id);
      assert.deepEqual(customIds, [
        'radio_toggle',
        'radio_stop',
        'radio_voldown',
        'radio_volup',
      ]);

      // Row 2: Station select dropdown
      const selectRow = rows[1];
      assert.equal(selectRow.type, 1);
      assert.equal(selectRow.components.length, 1);

      const selectMenu = selectRow.components[0] as unknown as {
        type: number;
        custom_id: string;
        options: Array<{ value: string; label: string; default?: boolean }>;
      };
      assert.equal(selectMenu.type, 3);
      assert.equal(selectMenu.custom_id, 'radio_select');
      assert.equal(selectMenu.options.length, 6);

      // Selected station should be marked default
      const defaultOption = selectMenu.options.find((o) => o.default);
      assert.ok(defaultOption);
      assert.equal(defaultOption.value, 'lofi');
    });
  });
});
