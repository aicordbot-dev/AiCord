/**
 * src/commands/radio.ts
 * 24/7 Voice Radio & Audio Streamer (/radio) Slash Command Suite & Component Routing for AiCord.
 *
 * Implements:
 * - /radio play [station] [channel]: starts 24/7 radio stream in specified or user's voice channel
 * - /radio pause: pauses current playback
 * - /radio resume: resumes paused playback
 * - /radio stop: disconnects and ends radio session
 * - /radio volume level:<1-100>: adjusts audio volume
 * - /radio station name:<lofi|synthwave|retro|jazz|chill|classical>: switches station
 * - /radio status: displays interactive audio player dashboard with control buttons and station dropdown
 * - Interactive component handler for radio_toggle, radio_stop, radio_voldown, radio_volup, radio_select
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { errorEmbed } from '@/lib/discord/embeds';
import {
  startRadio,
  pauseRadio,
  resumeRadio,
  stopRadio,
  setVolume,
  switchStation,
  getRadioSession,
  buildRadioEmbed,
  buildRadioComponents,
  type RadioStationId,
} from '@/lib/audio/radio-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleRadioCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'The `/radio` command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  const options =
    (
      interaction.data as {
        options?: Array<{
          name: string;
          options?: Array<{ name: string; value: unknown }>;
        }>;
      }
    )?.options ?? [];
  const subcommand = options[0];
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'play':
      await handleRadioPlaySubcommand(interaction, token, guildId, userId, subOptions);
      break;
    case 'pause':
      await handleRadioPauseSubcommand(token, guildId);
      break;
    case 'resume':
      await handleRadioResumeSubcommand(token, guildId);
      break;
    case 'stop':
      await handleRadioStopSubcommand(token, guildId);
      break;
    case 'volume':
      await handleRadioVolumeSubcommand(token, guildId, subOptions);
      break;
    case 'station':
      await handleRadioStationSubcommand(token, guildId, subOptions);
      break;
    case 'status':
      await handleRadioStatusSubcommand(token, guildId);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /radio subcommand: "${subcommand?.name ?? 'unknown'}".`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

async function handleRadioPlaySubcommand(
  interaction: APIChatInputApplicationCommandInteraction,
  token: string,
  guildId: string,
  userId: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const station = (getOption<string>(subOptions, 'station') as RadioStationId) ?? 'lofi';
  const channelOption = getOption<string>(subOptions, 'channel');
  const channelId =
    channelOption ??
    interaction.channel?.id ??
    (interaction as unknown as { channel_id?: string }).channel_id ??
    'voice_stream_channel';

  const session = await startRadio(guildId, channelId, station, userId);
  const embed = buildRadioEmbed(session);
  const components = buildRadioComponents(session);

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

async function handleRadioPauseSubcommand(token: string, guildId: string): Promise<void> {
  const session = await pauseRadio(guildId);
  if (!session) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'No Active Radio Stream',
          'No radio stream is currently playing in this server. Use `/radio play` to start listening!',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const embed = buildRadioEmbed(session);
  const components = buildRadioComponents(session);
  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

async function handleRadioResumeSubcommand(token: string, guildId: string): Promise<void> {
  const session = await resumeRadio(guildId);
  if (!session) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'No Active Radio Stream',
          'No radio stream is currently running in this server. Use `/radio play` to start listening!',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const embed = buildRadioEmbed(session);
  const components = buildRadioComponents(session);
  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

async function handleRadioStopSubcommand(token: string, guildId: string): Promise<void> {
  const session = await stopRadio(guildId);
  if (!session) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'No Active Radio Stream',
          'No radio stream is currently running in this server.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const embed = buildRadioEmbed(session);
  const components = buildRadioComponents(session);
  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

async function handleRadioVolumeSubcommand(
  token: string,
  guildId: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const level = getOption<number>(subOptions, 'level');
  if (level === undefined || isNaN(level)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Invalid Volume',
          'Please specify a volume level between 1 and 100.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const session = await setVolume(guildId, level);
  if (!session) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'No Active Radio Stream',
          'No radio stream is currently running in this server. Use `/radio play` first.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const embed = buildRadioEmbed(session);
  const components = buildRadioComponents(session);
  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

async function handleRadioStationSubcommand(
  token: string,
  guildId: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const stationName = getOption<string>(subOptions, 'name') as RadioStationId;
  if (!stationName) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Invalid Station',
          'Please choose a valid radio station to switch to.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const session = await switchStation(guildId, stationName);
  if (!session) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'No Active Radio Stream',
          'No radio stream is currently running in this server. Use `/radio play` first.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const embed = buildRadioEmbed(session);
  const components = buildRadioComponents(session);
  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

async function handleRadioStatusSubcommand(token: string, guildId: string): Promise<void> {
  const session = await getRadioSession(guildId);
  if (!session) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'No Active Radio Stream',
          'No 24/7 radio stream is currently running in this server. Use `/radio play` to start playing tunes!',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const embed = buildRadioEmbed(session);
  const components = buildRadioComponents(session);
  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

// ─── Component Handler ────────────────────────────────────────────────────────

/**
 * Handles interactive radio player components:
 * - radio_toggle: toggles play/pause
 * - radio_stop: stops radio playback
 * - radio_voldown: decreases volume by 10%
 * - radio_volup: increases volume by 10%
 * - radio_select: changes station via dropdown menu
 */
export async function handleRadioComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'Radio controls can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  // 1. Play/Pause toggle
  if (customId === 'radio_toggle' || customId.startsWith('radio_toggle:')) {
    const session = await getRadioSession(guildId);
    if (!session) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'No Active Radio Stream',
            'No radio stream is active. Use `/radio play` to start one.',
          ),
        ],
        components: [],
      });
      return;
    }

    const updated =
      session.status === 'playing'
        ? await pauseRadio(guildId)
        : await resumeRadio(guildId);

    if (updated) {
      await editInteractionResponse(token, {
        embeds: [buildRadioEmbed(updated)],
        components: buildRadioComponents(updated),
      });
    }
    return;
  }

  // 2. Stop playback
  if (customId === 'radio_stop' || customId.startsWith('radio_stop:')) {
    const updated = await stopRadio(guildId);
    if (!updated) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'No Active Radio Stream',
            'No radio stream is active to stop.',
          ),
        ],
        components: [],
      });
      return;
    }

    await editInteractionResponse(token, {
      embeds: [buildRadioEmbed(updated)],
      components: buildRadioComponents(updated),
    });
    return;
  }

  // 3. Volume Down (-10)
  if (customId === 'radio_voldown' || customId.startsWith('radio_voldown:')) {
    const session = await getRadioSession(guildId);
    if (!session) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'No Active Radio Stream',
            'No radio stream is active.',
          ),
        ],
        components: [],
      });
      return;
    }

    const updated = await setVolume(guildId, session.volume - 10);
    if (updated) {
      await editInteractionResponse(token, {
        embeds: [buildRadioEmbed(updated)],
        components: buildRadioComponents(updated),
      });
    }
    return;
  }

  // 4. Volume Up (+10)
  if (customId === 'radio_volup' || customId.startsWith('radio_volup:')) {
    const session = await getRadioSession(guildId);
    if (!session) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'No Active Radio Stream',
            'No radio stream is active.',
          ),
        ],
        components: [],
      });
      return;
    }

    const updated = await setVolume(guildId, session.volume + 10);
    if (updated) {
      await editInteractionResponse(token, {
        embeds: [buildRadioEmbed(updated)],
        components: buildRadioComponents(updated),
      });
    }
    return;
  }

  // 5. Station Dropdown Select
  if (customId === 'radio_select' || customId.startsWith('radio_select:')) {
    const values = (component.data as unknown as { values?: string[] })?.values;
    const selectedStation = values?.[0] as RadioStationId | undefined;

    if (!selectedStation) {
      return;
    }

    let updated = await switchStation(guildId, selectedStation);
    if (!updated) {
      const channelId =
        (component as unknown as { channel_id?: string }).channel_id ??
        'voice_stream_channel';
      updated = await startRadio(guildId, channelId, selectedStation, userId);
    }

    await editInteractionResponse(token, {
      embeds: [buildRadioEmbed(updated)],
      components: buildRadioComponents(updated),
    });
    return;
  }
}

// ─── Command Definition ───────────────────────────────────────────────────────

export const radioCommand: RegisteredCommand = {
  name: 'radio',
  description: '24/7 Voice Radio & Audio Streamer with curated thematic stations',
  category: 'utility',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'play',
      description: 'Start 24/7 radio stream in a voice channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'station',
          description: 'Curated 24/7 thematic radio station',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🎧 Lofi Beats & Chillhop', value: 'lofi' },
            { name: '🌆 Synthwave 1984', value: 'synthwave' },
            { name: '🕹️ 8-Bit Arcade Classics', value: 'retro' },
            { name: '☕ Coffeehouse Jazz & Blues', value: 'jazz' },
            { name: '🍃 Deep Ambient Soundscapes', value: 'chill' },
            { name: '🎻 Imperial Symphony', value: 'classical' },
          ],
        },
        {
          name: 'channel',
          description: 'Voice channel to stream into (defaults to current)',
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
      ],
    },
    {
      name: 'pause',
      description: 'Pause the current radio stream playback',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'resume',
      description: 'Resume the paused radio stream playback',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'stop',
      description: 'Stop the 24/7 radio stream and disconnect from voice',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'volume',
      description: 'Adjust the radio audio volume (1-100)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'level',
          description: 'Volume level between 1 and 100',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 100,
        },
      ],
    },
    {
      name: 'station',
      description: 'Switch to another curated 24/7 radio station',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'name',
          description: 'Curated radio station to switch to',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: '🎧 Lofi Beats & Chillhop', value: 'lofi' },
            { name: '🌆 Synthwave 1984', value: 'synthwave' },
            { name: '🕹️ 8-Bit Arcade Classics', value: 'retro' },
            { name: '☕ Coffeehouse Jazz & Blues', value: 'jazz' },
            { name: '🍃 Deep Ambient Soundscapes', value: 'chill' },
            { name: '🎻 Imperial Symphony', value: 'classical' },
          ],
        },
      ],
    },
    {
      name: 'status',
      description: 'Display interactive audio player dashboard and controls',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  execute: handleRadioCommand,
};
