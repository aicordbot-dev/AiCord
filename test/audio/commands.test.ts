/**
 * test/audio/commands.test.ts
 * Unit tests for Service 18: 24/7 Voice Radio & Audio Streamer Slash Command Suite & Component Routing:
 * - Central Command Registry lookup & schema validation
 * - /radio play subcommand (default & custom station/channel)
 * - /radio pause subcommand
 * - /radio resume subcommand
 * - /radio stop subcommand
 * - /radio volume subcommand
 * - /radio station subcommand
 * - /radio status subcommand
 * - handleRadioComponent router for buttons and dropdown select
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import { getCommand, registerRadioCommands } from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleRadioCommand,
  handleRadioComponent,
  radioCommand,
} from '@/commands/radio';
import {
  enableTestMode,
  clearTestStore,
  startRadio,
  getRadioSession,
  RADIO_STATIONS,
} from '@/lib/audio/radio-service';

describe('24/7 Voice Radio & Audio Streamer — Commands & Component Handlers', () => {
  const GUILD_ID = 'guild_radio_cmd_777';
  const CHANNEL_ID = 'voice_chan_888';
  const USER_ID = 'user_dj_999';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

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
  });

  // ─── 1. Command Registry Integration ──────────────────────────────────────────

  describe('Command Registry Integration', () => {
    it('registers /radio with utility category, rate limit, and 7 subcommands', () => {
      registerRadioCommands();
      const cmd = getCommand('radio');

      assert.ok(cmd);
      assert.equal(cmd.name, 'radio');
      assert.equal(cmd.category, 'utility');
      assert.deepEqual(cmd.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.equal(cmd.options?.length, 7);

      const subNames = (cmd.options as Array<{ name: string }>).map((o) => o.name);
      assert.deepEqual(subNames, [
        'play',
        'pause',
        'resume',
        'stop',
        'volume',
        'station',
        'status',
      ]);
    });

    it('verifies subcommand option schemas for play, volume, and station', () => {
      const playSub = (radioCommand.options as Array<{ name: string; options?: unknown[] }>).find(
        (o) => o.name === 'play',
      );
      assert.ok(playSub);
      assert.equal(playSub.options?.length, 2);

      const volumeSub = (
        radioCommand.options as Array<{
          name: string;
          options?: Array<{ name: string; min_value?: number; max_value?: number }>;
        }>
      ).find((o) => o.name === 'volume');
      assert.ok(volumeSub);
      const levelOpt = volumeSub.options?.find((o) => o.name === 'level');
      assert.equal(levelOpt?.min_value, 1);
      assert.equal(levelOpt?.max_value, 100);

      const stationSub = (
        radioCommand.options as Array<{
          name: string;
          options?: Array<{ name: string; choices?: Array<{ value: string }> }>;
        }>
      ).find((o) => o.name === 'station');
      assert.ok(stationSub);
      const nameOpt = stationSub.options?.find((o) => o.name === 'name');
      assert.equal(nameOpt?.choices?.length, 6);
    });
  });

  // ─── 2. /radio play Subcommand ────────────────────────────────────────────────

  describe('/radio play Subcommand', () => {
    it('starts 24/7 radio with default station (lofi) and default channel', async () => {
      const interaction = {
        token: 'tok_play_1',
        guild_id: GUILD_ID,
        channel: { id: CHANNEL_ID },
        member: { user: { id: USER_ID } },
        data: {
          name: 'radio',
          options: [{ name: 'play', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const response = interceptedResponses[0].options;
      assert.ok(response.embeds?.[0].title?.includes('Lofi Beats & Chillhop'));
      assert.equal(response.components?.length, 2);

      const session = await getRadioSession(GUILD_ID);
      assert.ok(session);
      assert.equal(session.station, 'lofi');
      assert.equal(session.status, 'playing');
      assert.equal(session.channelId, CHANNEL_ID);
    });

    it('starts radio with custom station (synthwave) and specified voice channel', async () => {
      const interaction = {
        token: 'tok_play_2',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID } },
        data: {
          name: 'radio',
          options: [
            {
              name: 'play',
              options: [
                { name: 'station', value: 'synthwave' },
                { name: 'channel', value: 'custom_voice_chan_999' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      const session = await getRadioSession(GUILD_ID);
      assert.ok(session);
      assert.equal(session.station, 'synthwave');
      assert.equal(session.channelId, 'custom_voice_chan_999');

      const response = interceptedResponses[0].options;
      assert.ok(response.embeds?.[0].title?.includes('Synthwave 1984'));
    });

    it('rejects /radio command when executed outside server (in DMs)', async () => {
      const interaction = {
        token: 'tok_dm',
        data: {
          name: 'radio',
          options: [{ name: 'play', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'can only be used in a server',
        ),
      );
    });
  });

  // ─── 3. /radio pause & /radio resume Subcommands ──────────────────────────────

  describe('/radio pause & /radio resume Subcommands', () => {
    it('pauses the active radio playback and updates player embed', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'jazz', USER_ID);

      const interaction = {
        token: 'tok_pause_1',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID } },
        data: {
          name: 'radio',
          options: [{ name: 'pause' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      const session = await getRadioSession(GUILD_ID);
      assert.equal(session?.status, 'paused');

      const response = interceptedResponses[0].options;
      assert.ok(response.embeds?.[0].description?.includes('⏸️ Paused'));
    });

    it('returns error embed when pausing with no active stream', async () => {
      const interaction = {
        token: 'tok_pause_none',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'pause' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'No radio stream is currently playing',
        ),
      );
    });

    it('resumes paused radio playback and updates player embed', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'chill', USER_ID);
      await handleRadioCommand({
        token: 'tok_pause',
        guild_id: GUILD_ID,
        data: { name: 'radio', options: [{ name: 'pause' }] },
      } as unknown as APIChatInputApplicationCommandInteraction);

      const interaction = {
        token: 'tok_resume_1',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'resume' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      const session = await getRadioSession(GUILD_ID);
      assert.equal(session?.status, 'playing');

      const lastResponse = interceptedResponses[interceptedResponses.length - 1].options;
      assert.ok(lastResponse.embeds?.[0].description?.includes('🟢 Streaming Live'));
    });

    it('returns error embed when resuming with no active stream', async () => {
      const interaction = {
        token: 'tok_resume_none',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'resume' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'No radio stream is currently running',
        ),
      );
    });
  });

  // ─── 4. /radio stop Subcommand ────────────────────────────────────────────────

  describe('/radio stop Subcommand', () => {
    it('stops active stream and marks session as stopped', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'classical', USER_ID);

      const interaction = {
        token: 'tok_stop_1',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'stop' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      const session = await getRadioSession(GUILD_ID);
      assert.equal(session?.status, 'stopped');

      const response = interceptedResponses[0].options;
      assert.ok(response.embeds?.[0].description?.includes('⏹️ Stopped'));
    });

    it('returns error embed when stopping with no active stream', async () => {
      const interaction = {
        token: 'tok_stop_none',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'stop' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'No radio stream is currently running',
        ),
      );
    });
  });

  // ─── 5. /radio volume Subcommand ──────────────────────────────────────────────

  describe('/radio volume Subcommand', () => {
    it('adjusts volume level and displays updated volume in embed', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const interaction = {
        token: 'tok_vol_1',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'volume', options: [{ name: 'level', value: 40 }] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      const session = await getRadioSession(GUILD_ID);
      assert.equal(session?.volume, 40);

      const response = interceptedResponses[0].options;
      assert.ok(response.embeds?.[0].description?.includes('40%'));
    });

    it('rejects missing or invalid volume levels', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const interaction = {
        token: 'tok_vol_inv',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'volume', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'Please specify a volume level',
        ),
      );
    });

    it('returns error when adjusting volume with no active session', async () => {
      const interaction = {
        token: 'tok_vol_none',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'volume', options: [{ name: 'level', value: 50 }] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'No radio stream is currently running',
        ),
      );
    });
  });

  // ─── 6. /radio station Subcommand ────────────────────────────────────────────

  describe('/radio station Subcommand', () => {
    it('switches current station to new station and updates track details', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const interaction = {
        token: 'tok_station_1',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'station', options: [{ name: 'name', value: 'retro' }] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      const session = await getRadioSession(GUILD_ID);
      assert.equal(session?.station, 'retro');
      assert.equal(session?.currentTrack.title, RADIO_STATIONS.retro.defaultTrack.title);

      const response = interceptedResponses[0].options;
      assert.ok(response.embeds?.[0].title?.includes('8-Bit Arcade Classics'));
    });

    it('returns error when switching station with no active session', async () => {
      const interaction = {
        token: 'tok_station_none',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'station', options: [{ name: 'name', value: 'jazz' }] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'No radio stream is currently running',
        ),
      );
    });
  });

  // ─── 7. /radio status Subcommand ──────────────────────────────────────────────

  describe('/radio status Subcommand', () => {
    it('displays full interactive player dashboard with active session controls', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'chill', USER_ID);

      const interaction = {
        token: 'tok_status_1',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'status' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const response = interceptedResponses[0].options;
      assert.ok(response.embeds?.[0].title?.includes('Deep Ambient Soundscapes'));
      assert.equal(response.components?.length, 2);
    });

    it('returns error embed when requesting status with no active session', async () => {
      const interaction = {
        token: 'tok_status_none',
        guild_id: GUILD_ID,
        data: {
          name: 'radio',
          options: [{ name: 'status' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleRadioCommand(interaction);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'No 24/7 radio stream is currently running',
        ),
      );
    });
  });

  // ─── 8. Component Handler (Buttons & Select Menu) ────────────────────────────

  describe('handleRadioComponent() Interactive Routing', () => {
    it('handles radio_toggle: toggles from playing to paused and back to playing', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const component = {
        token: 'tok_comp_toggle_1',
        guild_id: GUILD_ID,
        data: { custom_id: 'radio_toggle' },
      } as unknown as APIMessageComponentInteraction;

      // 1st click: pause
      await handleRadioComponent('tok_comp_toggle_1', 'radio_toggle', USER_ID, GUILD_ID, component);
      let session = await getRadioSession(GUILD_ID);
      assert.equal(session?.status, 'paused');

      // 2nd click: resume
      await handleRadioComponent('tok_comp_toggle_2', 'radio_toggle', USER_ID, GUILD_ID, component);
      session = await getRadioSession(GUILD_ID);
      assert.equal(session?.status, 'playing');
    });

    it('handles radio_stop: stops stream playback', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'synthwave', USER_ID);

      const component = {
        token: 'tok_comp_stop',
        guild_id: GUILD_ID,
        data: { custom_id: 'radio_stop' },
      } as unknown as APIMessageComponentInteraction;

      await handleRadioComponent('tok_comp_stop', 'radio_stop', USER_ID, GUILD_ID, component);
      const session = await getRadioSession(GUILD_ID);
      assert.equal(session?.status, 'stopped');
    });

    it('handles radio_voldown and radio_volup: adjusts volume by 10%', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'jazz', USER_ID); // default volume: 80

      const componentDown = {
        token: 'tok_voldown',
        guild_id: GUILD_ID,
        data: { custom_id: 'radio_voldown' },
      } as unknown as APIMessageComponentInteraction;

      await handleRadioComponent('tok_voldown', 'radio_voldown', USER_ID, GUILD_ID, componentDown);
      let session = await getRadioSession(GUILD_ID);
      assert.equal(session?.volume, 70);

      const componentUp = {
        token: 'tok_volup',
        guild_id: GUILD_ID,
        data: { custom_id: 'radio_volup' },
      } as unknown as APIMessageComponentInteraction;

      await handleRadioComponent('tok_volup', 'radio_volup', USER_ID, GUILD_ID, componentUp);
      session = await getRadioSession(GUILD_ID);
      assert.equal(session?.volume, 80);
    });

    it('handles radio_select: switches station via dropdown select menu', async () => {
      await startRadio(GUILD_ID, CHANNEL_ID, 'lofi', USER_ID);

      const component = {
        token: 'tok_select',
        guild_id: GUILD_ID,
        data: {
          custom_id: 'radio_select',
          values: ['classical'],
        },
      } as unknown as APIMessageComponentInteraction;

      await handleRadioComponent('tok_select', 'radio_select', USER_ID, GUILD_ID, component);

      const session = await getRadioSession(GUILD_ID);
      assert.equal(session?.station, 'classical');
      assert.equal(session?.currentTrack.title, RADIO_STATIONS.classical.defaultTrack.title);
    });

    it('returns error when component is clicked without active radio session', async () => {
      const component = {
        token: 'tok_comp_err',
        guild_id: GUILD_ID,
        data: { custom_id: 'radio_toggle' },
      } as unknown as APIMessageComponentInteraction;

      await handleRadioComponent('tok_comp_err', 'radio_toggle', USER_ID, GUILD_ID, component);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'No radio stream is active',
        ),
      );
    });

    it('rejects component interaction outside server', async () => {
      const component = {
        token: 'tok_comp_dm',
        data: { custom_id: 'radio_toggle' },
      } as unknown as APIMessageComponentInteraction;

      await handleRadioComponent('tok_comp_dm', 'radio_toggle', USER_ID, '', component);

      assert.ok(
        interceptedResponses[0].options.embeds?.[0].description?.includes(
          'can only be used in a server',
        ),
      );
    });
  });
});
