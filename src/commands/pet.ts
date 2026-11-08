/**
 * src/commands/pet.ts
 * Virtual Server Pet Companion & Tamagotchi Habitat Slash Commands & Component Handlers for AiCord.
 *
 * Subcommands:
 * - /pet adopt: adopt a new virtual pet (shiba, dragon, cat, owl, slime)
 * - /pet status: view status, hunger, happiness, energy, and combat stats
 * - /pet feed: feed your pet (+30 hunger, +10 happiness, +20 XP)
 * - /pet play: play with your pet (+35 happiness, -15 energy, +25 XP)
 * - /pet train: train a specific stat (+1 stat, -25 energy, -15 hunger, +40 XP)
 * - /pet rest: rest your pet (restores energy to 100)
 * - /pet duel: challenge another member's pet to turn-based dice roll combat
 * - /pet release: release your pet back into the wild
 * - /pet leaderboard: view top companions ranked by level, XP, and battle victories
 *
 * Interactive Component Routing:
 * - handlePetComponent(): handles pet_feed, pet_play, pet_train, pet_rest button interactions
 */

import {
  ApplicationCommandOptionType,
  Routes,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import {
  successEmbed,
  errorEmbed,
  infoEmbed,
} from '@/lib/discord/embeds';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import {
  adoptPet,
  getPet,
  feedPet,
  playWithPet,
  trainPet,
  restPet,
  duelPets,
  releasePet,
  getPetLeaderboard,
  buildPetEmbed,
  buildPetComponents,
  getSpeciesMeta,
  isTestMode,
  type IServerPet,
  type PetSpecies,
  type DuelResult,
} from '@/lib/pets/pet-service';
import type { DiscordEmbed } from '@/lib/discord/embeds';

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handlePetAdoptSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const species = getOption<PetSpecies>(subOptions, 'species') || 'shiba';
  const name = getOption<string>(subOptions, 'name') || 'Buddy';

  try {
    const pet = await adoptPet(guildId, userId, species, name);
    const embed = buildPetEmbed(pet);
    const components = buildPetComponents(pet, userId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to adopt pet.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Adoption Error', message)],
      ephemeral: true,
    });
  }
}

export async function handlePetStatusSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(subOptions, 'user') || userId;

  try {
    const pet = await getPet(guildId, targetUserId);
    if (!pet) {
      if (targetUserId === userId) {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed(
              'No Pet Found',
              "You don't have a pet yet! Use `/pet adopt` to adopt your first companion.",
            ),
          ],
          ephemeral: true,
        });
      } else {
        await editInteractionResponse(token, {
          embeds: [
            errorEmbed(
              'No Pet Found',
              `<@${targetUserId}> does not have a pet in this server.`,
            ),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    const embed = buildPetEmbed(pet);
    const components = buildPetComponents(pet, userId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pet status.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Pet Error', message)],
      ephemeral: true,
    });
  }
}

export async function handlePetFeedSubcommand(
  guildId: string,
  userId: string,
  token: string,
): Promise<void> {
  try {
    const pet = await feedPet(guildId, userId);
    const embed = buildPetEmbed(pet);
    const components = buildPetComponents(pet, userId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to feed pet.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Pet Error', message)],
      ephemeral: true,
    });
  }
}

export async function handlePetPlaySubcommand(
  guildId: string,
  userId: string,
  token: string,
): Promise<void> {
  try {
    const pet = await playWithPet(guildId, userId);
    const embed = buildPetEmbed(pet);
    const components = buildPetComponents(pet, userId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to play with pet.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Pet Error', message)],
      ephemeral: true,
    });
  }
}

export async function handlePetTrainSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const stat = getOption<'strength' | 'agility' | 'intelligence'>(subOptions, 'stat') || 'strength';

  try {
    const pet = await trainPet(guildId, userId, stat);
    const embed = buildPetEmbed(pet);
    const components = buildPetComponents(pet, userId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to train pet.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Pet Error', message)],
      ephemeral: true,
    });
  }
}

export async function handlePetRestSubcommand(
  guildId: string,
  userId: string,
  token: string,
): Promise<void> {
  try {
    const pet = await restPet(guildId, userId);
    const embed = buildPetEmbed(pet);
    const components = buildPetComponents(pet, userId);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to rest pet.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Pet Error', message)],
      ephemeral: true,
    });
  }
}

export function buildDuelEmbed(result: DuelResult): DiscordEmbed {
  const winnerSpecies = getSpeciesMeta(result.winnerPet.species);
  const loserSpecies = getSpeciesMeta(result.loserPet.species);

  return {
    title: `⚔️ Pet Duel: ${result.winnerPet.name} vs ${result.loserPet.name}`,
    description: [
      `### Combat Log`,
      ...result.rounds,
      '',
      `**${result.summary}**`,
    ].join('\n'),
    color: winnerSpecies.color,
    fields: [
      {
        name: `🏆 Winner: ${result.winnerPet.name}`,
        value: `${winnerSpecies.emoji} Lvl ${result.winnerPet.level} • Record: ${result.winnerPet.battlesWon}W - ${result.winnerPet.battlesLost}L`,
        inline: true,
      },
      {
        name: `💀 Defeated: ${result.loserPet.name}`,
        value: `${loserSpecies.emoji} Lvl ${result.loserPet.level} • Record: ${result.loserPet.battlesWon}W - ${result.loserPet.battlesLost}L`,
        inline: true,
      },
    ],
    footer: {
      text: 'Virtual Server Companion • AiCord Arena',
    },
    timestamp: new Date().toISOString(),
  };
}

export async function handlePetDuelSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const opponentId = getOption<string>(subOptions, 'opponent') || '';

  try {
    const result = await duelPets(guildId, userId, opponentId);
    const embed = buildDuelEmbed(result);

    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to conduct pet duel.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Duel Error', message)],
      ephemeral: true,
    });
  }
}

export async function handlePetReleaseSubcommand(
  guildId: string,
  userId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const confirm = getOption<boolean>(subOptions, 'confirm') ?? false;

  if (!confirm) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          'Release Cancelled',
          'Pet release was not confirmed. Your companion remains safe by your side!',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    await releasePet(guildId, userId);
    await editInteractionResponse(token, {
      embeds: [
        successEmbed(
          'Pet Released',
          'You have peacefully released your companion into the wild. You can now adopt a new pet anytime with `/pet adopt`.',
        ),
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to release pet.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Release Error', message)],
      ephemeral: true,
    });
  }
}

export function buildPetLeaderboardEmbed(pets: IServerPet[]): DiscordEmbed {
  const lines = pets.map((pet, idx) => {
    const meta = getSpeciesMeta(pet.species);
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    return `${medal} ${meta.emoji} **${pet.name}** (Lvl ${pet.level}) • <@${pet.userId}>\n   🏆 ${pet.battlesWon}W - ${pet.battlesLost}L • ✨ ${pet.xp} XP • *${meta.name}*`;
  });

  return {
    title: '🏆 Virtual Pet Companion Leaderboard',
    description: lines.join('\n\n'),
    color: 0xf1c40f, // Gold
    footer: {
      text: `Top ${pets.length} Companions in this Server`,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function handlePetLeaderboardSubcommand(
  guildId: string,
  token: string,
  subOptions: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const limit = getOption<number>(subOptions, 'limit') || 10;

  try {
    const pets = await getPetLeaderboard(guildId, limit);
    if (!pets || pets.length === 0) {
      await editInteractionResponse(token, {
        embeds: [
          infoEmbed(
            'Server Pet Leaderboard',
            'No pets have been adopted in this server yet! Be the first with `/pet adopt`.',
          ),
        ],
      });
      return;
    }

    const embed = buildPetLeaderboardEmbed(pets);
    await editInteractionResponse(token, {
      embeds: [embed],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch leaderboard.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Leaderboard Error', message)],
      ephemeral: true,
    });
  }
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handlePetCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
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
    case 'adopt':
      await handlePetAdoptSubcommand(guildId, userId, token, subOptions);
      break;
    case 'status':
      await handlePetStatusSubcommand(guildId, userId, token, subOptions);
      break;
    case 'feed':
      await handlePetFeedSubcommand(guildId, userId, token);
      break;
    case 'play':
      await handlePetPlaySubcommand(guildId, userId, token);
      break;
    case 'train':
      await handlePetTrainSubcommand(guildId, userId, token, subOptions);
      break;
    case 'rest':
      await handlePetRestSubcommand(guildId, userId, token);
      break;
    case 'duel':
      await handlePetDuelSubcommand(guildId, userId, token, subOptions);
      break;
    case 'release':
      await handlePetReleaseSubcommand(guildId, userId, token, subOptions);
      break;
    case 'leaderboard':
      await handlePetLeaderboardSubcommand(guildId, token, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Command', 'Unknown pet subcommand.')],
        ephemeral: true,
      });
      break;
  }
}

// ─── Interactive Component Handler ────────────────────────────────────────────

export async function handlePetComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const parts = customId.split(':');
  const actionPrefix = parts[0];
  const ownerUserId = parts[1];

  if (!actionPrefix.startsWith('pet_') || !ownerUserId) {
    return;
  }

  // Security check: validate pet ownership
  if (userId !== ownerUserId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Unauthorized Action',
          "This is not your pet! You cannot interact with someone else's companion.",
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const action = actionPrefix.replace('pet_', '');

  try {
    let updatedPet: IServerPet;

    switch (action) {
      case 'feed': {
        updatedPet = await feedPet(guildId, userId);
        break;
      }
      case 'play': {
        updatedPet = await playWithPet(guildId, userId);
        break;
      }
      case 'train': {
        const pet = await getPet(guildId, userId);
        if (!pet) throw new Error('Pet not found.');
        const meta = getSpeciesMeta(pet.species);
        let stat: 'strength' | 'agility' | 'intelligence' = 'strength';
        if (meta.bonusStat.includes('Agility')) stat = 'agility';
        else if (meta.bonusStat.includes('Intelligence')) stat = 'intelligence';
        updatedPet = await trainPet(guildId, userId, stat);
        break;
      }
      case 'rest': {
        updatedPet = await restPet(guildId, userId);
        break;
      }
      default:
        throw new Error(`Unknown pet action: ${action}`);
    }

    const embed = buildPetEmbed(updatedPet);
    const components = buildPetComponents(updatedPet, userId);

    const channelId = component.channel_id ?? component.message?.channel_id;
    const messageId = component.message?.id;

    if (!isTestMode() && channelId && messageId) {
      try {
        const rest = getDiscordRest();
        await discordApiCall(() =>
          rest.patch(Routes.channelMessage(channelId, messageId), {
            body: {
              embeds: [embed],
              components,
            },
          }),
        );
      } catch (patchErr) {
        console.error('[handlePetComponent] REST Error updating pet message:', patchErr);
      }
    }

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to interact with pet.';
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Pet Error', message)],
      ephemeral: true,
    });
  }
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const petCommand: RegisteredCommand = {
  name: 'pet',
  description: 'Virtual server pet companion and Tamagotchi habitat',
  category: 'fun',
  dm_permission: false,
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'adopt',
      description: 'Adopt a new virtual pet companion',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'species',
          description: 'The species of pet to adopt',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: '🐕 Shiba Inu (+3 Agility)', value: 'shiba' },
            { name: '🐉 Celestial Dragon (+3 Strength)', value: 'dragon' },
            { name: '🐱 Mystic Shadow Cat (+2 Agi, +1 Int)', value: 'cat' },
            { name: '🦉 Sage Horned Owl (+3 Intelligence)', value: 'owl' },
            { name: '🟢 Bouncy Rainbow Slime (+1 All Stats)', value: 'slime' },
          ],
        },
        {
          name: 'name',
          description: 'Name your new companion (1-32 characters)',
          type: ApplicationCommandOptionType.String,
          required: true,
          min_length: 1,
          max_length: 32,
        },
      ],
    },
    {
      name: 'status',
      description: 'View the status and stats of your or another member\'s pet',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'Member whose pet to view (defaults to you)',
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: 'feed',
      description: 'Feed your pet (+30 hunger, +10 happiness, +20 XP)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'play',
      description: 'Play with your pet (+35 happiness, -15 energy, +25 XP)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'train',
      description: 'Train your pet (+1 target stat, -25 energy, -15 hunger, +40 XP)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'stat',
          description: 'Combat attribute to train',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: '⚔️ Strength (+1 STR)', value: 'strength' },
            { name: '💨 Agility (+1 AGI)', value: 'agility' },
            { name: '🧠 Intelligence (+1 INT)', value: 'intelligence' },
          ],
        },
      ],
    },
    {
      name: 'rest',
      description: 'Rest your pet (restores energy to 100%)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    },
    {
      name: 'duel',
      description: 'Challenge another member\'s pet to turn-based combat',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'opponent',
          description: 'Member whose pet you want to duel',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: 'release',
      description: 'Peacefully release your pet back into the wild',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'confirm',
          description: 'Confirm releasing your pet permanently',
          type: ApplicationCommandOptionType.Boolean,
          required: true,
        },
      ],
    },
    {
      name: 'leaderboard',
      description: 'View the server virtual pet leaderboard',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'limit',
          description: 'Number of top pets to display (default: 10)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 25,
        },
      ],
    },
  ],
  execute: handlePetCommand,
};
