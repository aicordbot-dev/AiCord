/**
 * src/lib/audio/radio-service.ts
 * 24/7 Voice Radio & Audio Streamer Service Engine for AiCord.
 *
 * Responsibilities:
 * - Curated 24/7 thematic radio stations registry & metadata
 * - Voice stream session lifecycle (start, pause, resume, stop)
 * - Dynamic audio volume control & boundary clamping (1 - 100)
 * - Thematic station switching with instant track updates
 * - Visual ASCII equalizer & audio volume bar rendering
 * - Dynamic player embeds & interactive action row components
 * - Zero-network in-memory test store for ultra-fast, isolated testing
 */

import { connectDB } from '@/lib/db';
import {
  RadioSession,
  type IRadioSession,
  type RadioStationId,
  type RadioStatus,
  type IRadioTrack,
} from '@/models/RadioSession';

export type { RadioStationId, RadioStatus, IRadioSession, IRadioTrack };
import type { DiscordEmbed } from '@/lib/discord/embeds';
import {
  buildButton,
  buildActionRow,
  type ActionRow,
  type StringSelectComponent,
} from '@/lib/discord/interaction-response';

// ─── Curated 24/7 Radio Stations ──────────────────────────────────────────────

export interface RadioStationConfig {
  id: RadioStationId;
  name: string;
  emoji: string;
  tagline: string;
  genre: string;
  color: number;
  defaultTrack: IRadioTrack;
}

export const RADIO_STATIONS: Record<RadioStationId, RadioStationConfig> = {
  lofi: {
    id: 'lofi',
    name: 'Lofi Beats & Chillhop',
    emoji: '🎧',
    tagline: 'beats to relax/study to',
    genre: 'Lofi Hip-Hop & Chillhop',
    color: 0x9b59b6, // Warm Purple
    defaultTrack: {
      title: 'Midnight Solitude',
      artist: 'Chillhop Cafe',
      duration: 'LIVE 24/7',
      streamUrl: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    },
  },
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave 1984',
    emoji: '🌆',
    tagline: 'retro electronic neon vibes',
    genre: 'Synthwave & Retrowave',
    color: 0xff007f, // Neon Pink / Magenta
    defaultTrack: {
      title: 'Neon Drive 1984',
      artist: 'Kavinsky Wave',
      duration: 'LIVE 24/7',
      streamUrl: 'https://stream.synthwave.fm/live',
    },
  },
  retro: {
    id: 'retro',
    name: '8-Bit Arcade Classics',
    emoji: '🕹️',
    tagline: 'chiptune & gaming themes',
    genre: 'Chiptune & 8-Bit',
    color: 0xf1c40f, // Arcade Gold
    defaultTrack: {
      title: 'Pixel Quest Adventure',
      artist: 'Chiptune Legends',
      duration: 'LIVE 24/7',
      streamUrl: 'https://stream.retro-arcade.fm/live',
    },
  },
  jazz: {
    id: 'jazz',
    name: 'Coffeehouse Jazz & Blues',
    emoji: '☕',
    tagline: 'acoustic mellow café vibes',
    genre: 'Smooth Jazz & Acoustic Blues',
    color: 0xe67e22, // Warm Coffee Amber
    defaultTrack: {
      title: 'Rainy Afternoon in Paris',
      artist: 'Blue Note Quintet',
      duration: 'LIVE 24/7',
      streamUrl: 'https://stream.jazzcafe.fm/live',
    },
  },
  chill: {
    id: 'chill',
    name: 'Deep Ambient Soundscapes',
    emoji: '🍃',
    tagline: 'zen meditation & focus',
    genre: 'Ambient & Drone Meditation',
    color: 0x2ecc71, // Emerald Zen Green
    defaultTrack: {
      title: 'Ethereal Serenity',
      artist: 'Ambient Horizon',
      duration: 'LIVE 24/7',
      streamUrl: 'https://stream.ambientchill.fm/live',
    },
  },
  classical: {
    id: 'classical',
    name: 'Imperial Symphony',
    emoji: '🎻',
    tagline: 'timeless orchestral masterpieces',
    genre: 'Symphonic & Classical',
    color: 0x3498db, // Imperial Sapphire Blue
    defaultTrack: {
      title: 'Moonlight Sonata (Adagio)',
      artist: 'Vienna Philharmonic',
      duration: 'LIVE 24/7',
      streamUrl: 'https://stream.classicalradio.fm/live',
    },
  },
};

export const RADIO_STATION_LIST: RadioStationConfig[] = Object.values(RADIO_STATIONS);

export function getRadioStation(id: string): RadioStationConfig | undefined {
  return RADIO_STATIONS[id as RadioStationId];
}

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
const testSessions = new Map<string, IRadioSession>();

export function enableTestMode(enabled = true): void {
  testMode = enabled;
}

export function isTestMode(): boolean {
  return testMode;
}

export function clearTestStore(): void {
  testSessions.clear();
}

export function setTestSession(session: IRadioSession): void {
  testSessions.set(session.guildId, session);
}

export function getTestSession(guildId: string): IRadioSession | null {
  return testSessions.get(guildId) ?? null;
}

function createInMemorySession(
  guildId: string,
  channelId: string,
  station: RadioStationId,
  startedBy: string,
  existing?: IRadioSession | null,
): IRadioSession {
  const stationConfig = RADIO_STATIONS[station] ?? RADIO_STATIONS.lofi;
  const now = new Date();
  return {
    guildId,
    channelId,
    station: stationConfig.id,
    status: 'playing',
    volume: existing?.volume ?? 80,
    currentTrack: { ...stationConfig.defaultTrack },
    startedAt: existing?.startedAt ?? now,
    startedBy,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  } as unknown as IRadioSession;
}

// ─── Core Service Methods ─────────────────────────────────────────────────────

/**
 * Initializes or switches the 24/7 radio stream in a voice channel.
 */
export async function startRadio(
  guildId: string,
  channelId: string,
  station: RadioStationId = 'lofi',
  startedBy: string,
): Promise<IRadioSession> {
  const stationConfig = RADIO_STATIONS[station] ?? RADIO_STATIONS.lofi;

  if (testMode) {
    const existing = testSessions.get(guildId);
    const session = createInMemorySession(
      guildId,
      channelId,
      stationConfig.id,
      startedBy,
      existing,
    );
    testSessions.set(guildId, session);
    return session;
  }

  await connectDB();
  const session = await RadioSession.findOneAndUpdate(
    { guildId },
    {
      $set: {
        channelId,
        station: stationConfig.id,
        status: 'playing',
        currentTrack: stationConfig.defaultTrack,
        startedAt: new Date(),
        startedBy,
      },
      $setOnInsert: { volume: 80 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return session as IRadioSession;
}

/**
 * Pauses current radio playback.
 */
export async function pauseRadio(guildId: string): Promise<IRadioSession | null> {
  if (testMode) {
    const session = testSessions.get(guildId);
    if (!session) return null;
    session.status = 'paused';
    session.updatedAt = new Date();
    return session;
  }

  await connectDB();
  return await RadioSession.findOneAndUpdate(
    { guildId },
    { $set: { status: 'paused' } },
    { new: true },
  );
}

/**
 * Resumes paused radio playback.
 */
export async function resumeRadio(guildId: string): Promise<IRadioSession | null> {
  if (testMode) {
    const session = testSessions.get(guildId);
    if (!session) return null;
    session.status = 'playing';
    session.updatedAt = new Date();
    return session;
  }

  await connectDB();
  return await RadioSession.findOneAndUpdate(
    { guildId },
    { $set: { status: 'playing' } },
    { new: true },
  );
}

/**
 * Stops radio stream and cleans up / marks session as stopped.
 */
export async function stopRadio(guildId: string): Promise<IRadioSession | null> {
  if (testMode) {
    const session = testSessions.get(guildId);
    if (!session) return null;
    session.status = 'stopped';
    session.updatedAt = new Date();
    return session;
  }

  await connectDB();
  return await RadioSession.findOneAndUpdate(
    { guildId },
    { $set: { status: 'stopped' } },
    { new: true },
  );
}

/**
 * Adjusts audio volume and clamps between 1 and 100.
 */
export async function setVolume(
  guildId: string,
  volume: number,
): Promise<IRadioSession | null> {
  const clamped = Math.max(1, Math.min(100, Math.round(volume)));

  if (testMode) {
    const session = testSessions.get(guildId);
    if (!session) return null;
    session.volume = clamped;
    session.updatedAt = new Date();
    return session;
  }

  await connectDB();
  return await RadioSession.findOneAndUpdate(
    { guildId },
    { $set: { volume: clamped } },
    { new: true },
  );
}

/**
 * Switches current station and updates track details to station default.
 */
export async function switchStation(
  guildId: string,
  station: RadioStationId,
): Promise<IRadioSession | null> {
  const stationConfig = RADIO_STATIONS[station] ?? RADIO_STATIONS.lofi;

  if (testMode) {
    const session = testSessions.get(guildId);
    if (!session) return null;
    session.station = stationConfig.id;
    session.currentTrack = { ...stationConfig.defaultTrack };
    session.status = 'playing';
    session.updatedAt = new Date();
    return session;
  }

  await connectDB();
  return await RadioSession.findOneAndUpdate(
    { guildId },
    {
      $set: {
        station: stationConfig.id,
        currentTrack: stationConfig.defaultTrack,
        status: 'playing',
      },
    },
    { new: true },
  );
}

/**
 * Retrieves the active radio session for a guild.
 */
export async function getRadioSession(guildId: string): Promise<IRadioSession | null> {
  if (testMode) {
    return testSessions.get(guildId) ?? null;
  }

  await connectDB();
  return await RadioSession.findOne({ guildId });
}

// ─── Visual Rendering Helpers ─────────────────────────────────────────────────

/**
 * Generates an ASCII visual equalizer representation based on status and volume.
 */
export function renderEqualizer(status: RadioStatus, volume: number): string {
  if (status === 'stopped') {
    return '       [STOPPED]';
  }
  if (status === 'paused') {
    return ' ▂▂▂▂▂ [PAUSED]';
  }
  return ` ▂▃▅▆▇ ${volume}%`;
}

/**
 * Renders an ASCII volume meter bar.
 */
export function renderVolumeBar(volume: number, length = 10): string {
  const clamped = Math.max(0, Math.min(100, volume));
  const filled = Math.round((clamped / 100) * length);
  const empty = Math.max(0, length - filled);
  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

// ─── Embed & Component Builders ───────────────────────────────────────────────

/**
 * Builds the interactive player embed for the 24/7 Voice Radio streamer.
 */
export function buildRadioEmbed(session: IRadioSession): DiscordEmbed {
  const station = RADIO_STATIONS[session.station] ?? RADIO_STATIONS.lofi;
  const statusBadge =
    session.status === 'playing'
      ? '🟢 Streaming Live'
      : session.status === 'paused'
        ? '⏸️ Paused'
        : '⏹️ Stopped';

  const equalizer = renderEqualizer(session.status, session.volume);
  const volumeBar = renderVolumeBar(session.volume);

  return {
    title: `${station.emoji} ${station.name}`,
    description:
      `*${station.tagline}*\n\n` +
      `**Status**: ${statusBadge}\n` +
      `**Voice Channel**: <#${session.channelId}>\n` +
      `**Volume**: \`${volumeBar}\` ${session.volume}%\n` +
      `**Equalizer**: \`${equalizer}\``,
    color: station.color,
    fields: [
      {
        name: '🎵 Now Playing',
        value: `**${session.currentTrack.title}**\nby *${session.currentTrack.artist}*`,
        inline: false,
      },
      {
        name: '📡 Stream Info',
        value: `**Status**: ${statusBadge}\n**Channel**: <#${session.channelId}>`,
        inline: true,
      },
      {
        name: '🔊 Audio Volume',
        value: `\`${volumeBar}\` **${session.volume}%**`,
        inline: true,
      },
      {
        name: '🎚️ Live Equalizer',
        value: `\`${equalizer}\``,
        inline: false,
      },
    ],
    footer: {
      text: `AiCord 24/7 Voice Radio • Station: ${station.name}`,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds interactive player buttons and station selection dropdown action rows.
 */
export function buildRadioComponents(session: IRadioSession): ActionRow[] {
  // Row 1: Player controls [Play/Pause], [Stop], [Vol -10], [Vol +10]
  const isPlaying = session.status === 'playing';
  const controlButtons = [
    buildButton({
      style: isPlaying ? 2 : 1,
      label: 'Play/Pause',
      customId: 'radio_toggle',
      emoji: '⏯️',
    }),
    buildButton({
      style: 4, // Danger Red
      label: 'Stop',
      customId: 'radio_stop',
      emoji: '⏹️',
    }),
    buildButton({
      style: 2, // Secondary Grey
      label: 'Vol -10',
      customId: 'radio_voldown',
      emoji: '🔉',
    }),
    buildButton({
      style: 2, // Secondary Grey
      label: 'Vol +10',
      customId: 'radio_volup',
      emoji: '🔊',
    }),
  ];

  const buttonsRow = buildActionRow(...controlButtons);

  // Row 2: Select menu with all 6 stations
  const selectComponent: StringSelectComponent = {
    type: 3,
    custom_id: 'radio_select',
    placeholder: 'Select a 24/7 radio station...',
    options: RADIO_STATION_LIST.map((station) => ({
      label: station.name,
      value: station.id,
      description: station.tagline,
      emoji: { name: station.emoji },
      default: session.station === station.id,
    })),
  };

  const selectRow = buildActionRow(selectComponent);

  return [buttonsRow, selectRow];
}
