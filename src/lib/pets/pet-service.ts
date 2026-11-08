/**
 * src/lib/pets/pet-service.ts
 * Virtual Server Pet Companion & Tamagotchi Habitat Service Engine for AiCord.
 *
 * Responsibilities:
 * - Species metadata, starter stat bonuses, and curated ASCII portrait art
 * - Tamagotchi stat decay calculation (hunger & happiness decay based on elapsed hours)
 * - Pet lifecycle (adoption, feeding, playing, training, resting, releasing)
 * - Level progression (xp >= level * 100, stat increases, energy restoration)
 * - Turn-based dice roll dueling engine (strength, agility dodge, intelligence crit)
 * - Server leaderboard ranking (level desc, xp desc, battlesWon desc)
 * - Discord Embed & ActionRow Component builders
 * - Zero-database in-memory test store for complete unit test isolation
 */

import {
  ComponentType,
  ButtonStyle,
  type APIActionRowComponent,
  type APIButtonComponent,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import {
  ServerPet,
  type IServerPet,
  type PetSpecies,
  type IPetStats,
} from '@/models';
import type { DiscordEmbed } from '@/lib/discord/embeds';

export type { IServerPet, PetSpecies, IPetStats };

export interface PetSpeciesMeta {
  species: PetSpecies;
  name: string;
  emoji: string;
  bonusStat: string;
  statBonus: IPetStats;
  description: string;
  asciiArt: string;
  color: number;
}

export const SPECIES_MAP: Record<PetSpecies, PetSpeciesMeta> = {
  shiba: {
    species: 'shiba',
    name: 'Loyal Shiba Inu',
    emoji: '🐕',
    bonusStat: '+3 Agility',
    statBonus: { strength: 0, agility: 3, intelligence: 0 },
    description: 'An energetic and loyal companion with lightning-fast agility.',
    asciiArt: [
      '  /^ ^\\',
      ' / 0 0 \\',
      'V\\  Y  /V',
      ' /  -  \\',
      ' |     \\',
    ].join('\n'),
    color: 0xf39c12, // Golden Orange
  },
  dragon: {
    species: 'dragon',
    name: 'Celestial Dragon',
    emoji: '🐉',
    bonusStat: '+3 Strength',
    statBonus: { strength: 3, agility: 0, intelligence: 0 },
    description: 'A mythical beast of immense power and crushing physical strength.',
    asciiArt: [
      '  / \\__',
      ' (    @\\___',
      ' /         O',
      '/   (_____/',
      '/_____/   U',
    ].join('\n'),
    color: 0xe74c3c, // Crimson Flame
  },
  cat: {
    species: 'cat',
    name: 'Mystic Shadow Cat',
    emoji: '🐱',
    bonusStat: '+2 Agility, +1 Int',
    statBonus: { strength: 0, agility: 2, intelligence: 1 },
    description: 'A cunning and stealthy feline attuned to arcane secrets.',
    asciiArt: [
      ' /\\_/\\',
      '( o.o )',
      ' > ^ <',
    ].join('\n'),
    color: 0x9b59b6, // Mystic Violet
  },
  owl: {
    species: 'owl',
    name: 'Sage Horned Owl',
    emoji: '🦉',
    bonusStat: '+3 Intelligence',
    statBonus: { strength: 0, agility: 0, intelligence: 3 },
    description: 'An ancient bird of wisdom with unmatched critical intellect.',
    asciiArt: [
      ' {o,o}',
      ' /)  )',
      '  " "',
    ].join('\n'),
    color: 0x3498db, // Celestial Blue
  },
  slime: {
    species: 'slime',
    name: 'Bouncy Rainbow Slime',
    emoji: '🟢',
    bonusStat: '+1 all stats',
    statBonus: { strength: 1, agility: 1, intelligence: 1 },
    description: 'A squishy, resilient creature with balanced well-rounded capabilities.',
    asciiArt: [
      '  .---.',
      ' / o o \\',
      '(   v   )',
      " '.___.'",
    ].join('\n'),
    color: 0x2ecc71, // Emerald Green
  },
};

export function getSpeciesMeta(species: PetSpecies): PetSpeciesMeta {
  return SPECIES_MAP[species] || SPECIES_MAP.shiba;
}

// ─── In-Memory Test Store ─────────────────────────────────────────────────────

let testMode = false;
const testPets = new Map<string, IServerPet>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function isTestMode(): boolean {
  return testMode;
}

export function clearTestStore(): void {
  testPets.clear();
}

export function setTestPet(
  pet: Partial<IServerPet> & { guildId: string; userId: string },
): void {
  const key = `${pet.guildId}:${pet.userId}`;
  const existing = testPets.get(key);
  const species: PetSpecies = pet.species || existing?.species || 'shiba';
  const meta = SPECIES_MAP[species];

  const defaultStrength = 10 + (meta?.statBonus?.strength || 0);
  const defaultAgility = 10 + (meta?.statBonus?.agility || 0);
  const defaultIntelligence = 10 + (meta?.statBonus?.intelligence || 0);

  const mergedStats: IPetStats = Object.assign(
    {
      strength: defaultStrength,
      agility: defaultAgility,
      intelligence: defaultIntelligence,
    },
    existing?.stats,
    pet.stats,
  );

  const merged = Object.assign(
    {
      guildId: pet.guildId,
      userId: pet.userId,
      name: pet.name || existing?.name || 'Buddy',
      species,
      level: 1,
      xp: 0,
      hunger: 80,
      happiness: 80,
      energy: 100,
      stats: mergedStats,
      battlesWon: 0,
      battlesLost: 0,
      lastInteractedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    existing,
    pet,
    { stats: mergedStats },
  );

  testPets.set(key, merged as unknown as IServerPet);
}

export function getTestPet(
  guildId: string,
  userId: string,
): IServerPet | undefined {
  return testPets.get(`${guildId}:${userId}`);
}

// ─── Stat Decay Engine ────────────────────────────────────────────────────────

/**
 * Decays hunger (-2/hour) and happiness (-2/hour) based on elapsed time since lastInteractedAt.
 * Clamps hunger and happiness between 0 and 100.
 */
export function applyDecay(pet: IServerPet, now: Date = new Date()): boolean {
  const lastTime = new Date(pet.lastInteractedAt).getTime();
  const currentTime = now.getTime();
  const elapsedMs = currentTime - lastTime;
  if (elapsedMs <= 0) return false;

  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
  if (elapsedHours > 0) {
    const hungerDecay = elapsedHours * 2;
    const happinessDecay = elapsedHours * 2;

    pet.hunger = Math.max(0, pet.hunger - hungerDecay);
    pet.happiness = Math.max(0, pet.happiness - happinessDecay);
    pet.lastInteractedAt = new Date(lastTime + elapsedHours * 3600000);
    return true;
  }

  return false;
}

// ─── Level Progression Engine ─────────────────────────────────────────────────

/**
 * Evaluates whether pet has enough XP to level up.
 * When xp >= level * 100:
 * - Increments level
 * - Increases all stats (strength, agility, intelligence) by +2
 * - Resets XP remainder (xp = xp - level * 100)
 * - Restores full energy to 100
 */
export function checkLevelUp(pet: IServerPet): boolean {
  let leveledUp = false;
  while (pet.xp >= pet.level * 100) {
    const requiredXp = pet.level * 100;
    pet.xp -= requiredXp;
    pet.level += 1;
    pet.stats.strength += 2;
    pet.stats.agility += 2;
    pet.stats.intelligence += 2;
    pet.energy = 100;
    leveledUp = true;
  }
  return leveledUp;
}

// ─── Core Service Methods ─────────────────────────────────────────────────────

export type PetActionResult = IServerPet & { leveledUp?: boolean };

/**
 * Adopts a new pet for a user in a guild.
 * Rejects if user already owns a pet in this guild.
 */
export async function adoptPet(
  guildId: string,
  userId: string,
  species: PetSpecies,
  name: string,
): Promise<IServerPet> {
  if (!guildId || !userId) {
    throw new Error('Guild ID and User ID are required.');
  }

  const validSpecies: PetSpecies[] = ['shiba', 'dragon', 'cat', 'owl', 'slime'];
  if (!validSpecies.includes(species)) {
    throw new Error(`Invalid species. Choose from: ${validSpecies.join(', ')}.`);
  }

  const trimmedName = (name || '').trim();
  if (!trimmedName || trimmedName.length > 32) {
    throw new Error('Pet name must be between 1 and 32 characters.');
  }

  const existing = await getPet(guildId, userId);
  if (existing) {
    throw new Error(
      `You already have a pet (${existing.name} the ${existing.species}) in this server! Use /pet status to view your pet or /pet release to adopt a new one.`,
    );
  }

  const meta = getSpeciesMeta(species);
  const initialStats: IPetStats = {
    strength: 10 + meta.statBonus.strength,
    agility: 10 + meta.statBonus.agility,
    intelligence: 10 + meta.statBonus.intelligence,
  };

  const now = new Date();

  if (testMode) {
    const petObj = {
      guildId,
      userId,
      name: trimmedName,
      species,
      level: 1,
      xp: 0,
      hunger: 80,
      happiness: 80,
      energy: 100,
      stats: initialStats,
      battlesWon: 0,
      battlesLost: 0,
      lastInteractedAt: now,
      createdAt: now,
      updatedAt: now,
    } as unknown as IServerPet;

    testPets.set(`${guildId}:${userId}`, petObj);
    return petObj;
  }

  await connectDB();
  const created = await ServerPet.create({
    guildId,
    userId,
    name: trimmedName,
    species,
    level: 1,
    xp: 0,
    hunger: 80,
    happiness: 80,
    energy: 100,
    stats: initialStats,
    battlesWon: 0,
    battlesLost: 0,
    lastInteractedAt: now,
  });

  return created;
}

/**
 * Retrieves a pet with updated decayed stats.
 */
export async function getPet(
  guildId: string,
  userId: string,
): Promise<IServerPet | null> {
  if (testMode) {
    const pet = testPets.get(`${guildId}:${userId}`);
    if (!pet) return null;
    applyDecay(pet);
    return pet;
  }

  await connectDB();
  const pet = await ServerPet.findOne({ guildId, userId });
  if (!pet) return null;

  const decayed = applyDecay(pet);
  if (decayed) {
    await pet.save();
  }

  return pet;
}

/**
 * Feeds pet: +30 hunger (max 100), +10 happiness (max 100), +20 XP.
 */
export async function feedPet(
  guildId: string,
  userId: string,
): Promise<PetActionResult> {
  const pet = await getPet(guildId, userId);
  if (!pet) {
    throw new Error('You do not have a pet in this server! Use /pet adopt to get one.');
  }

  pet.hunger = Math.min(100, pet.hunger + 30);
  pet.happiness = Math.min(100, pet.happiness + 10);
  pet.xp += 20;

  const leveledUp = checkLevelUp(pet);
  pet.lastInteractedAt = new Date();

  if (testMode) {
    testPets.set(`${guildId}:${userId}`, pet);
  } else {
    await (pet as any).save?.();
  }

  const result = pet as PetActionResult;
  result.leveledUp = leveledUp;
  return result;
}

/**
 * Plays with pet: +35 happiness (max 100), -15 energy, +25 XP.
 * Rejects if energy < 15.
 */
export async function playWithPet(
  guildId: string,
  userId: string,
): Promise<PetActionResult> {
  const pet = await getPet(guildId, userId);
  if (!pet) {
    throw new Error('You do not have a pet in this server! Use /pet adopt to get one.');
  }

  if (pet.energy < 15) {
    throw new Error('Your pet is too tired to play! Rest your pet with /pet rest first.');
  }

  pet.happiness = Math.min(100, pet.happiness + 35);
  pet.energy = Math.max(0, pet.energy - 15);
  pet.xp += 25;

  const leveledUp = checkLevelUp(pet);
  pet.lastInteractedAt = new Date();

  if (testMode) {
    testPets.set(`${guildId}:${userId}`, pet);
  } else {
    await (pet as any).save?.();
  }

  const result = pet as PetActionResult;
  result.leveledUp = leveledUp;
  return result;
}

/**
 * Trains pet: -25 energy, -15 hunger, increments target stat by +1, +40 XP.
 * Rejects if energy < 25 or hunger < 15.
 */
export async function trainPet(
  guildId: string,
  userId: string,
  statType: 'strength' | 'agility' | 'intelligence',
): Promise<PetActionResult> {
  const pet = await getPet(guildId, userId);
  if (!pet) {
    throw new Error('You do not have a pet in this server! Use /pet adopt to get one.');
  }

  if (statType !== 'strength' && statType !== 'agility' && statType !== 'intelligence') {
    throw new Error('Invalid stat type. Choose strength, agility, or intelligence.');
  }

  if (pet.energy < 25) {
    throw new Error('Your pet is too exhausted to train! Needs at least 25 energy. Rest with /pet rest.');
  }

  if (pet.hunger < 15) {
    throw new Error('Your pet is too hungry to train! Needs at least 15 hunger. Feed with /pet feed.');
  }

  pet.energy = Math.max(0, pet.energy - 25);
  pet.hunger = Math.max(0, pet.hunger - 15);
  pet.stats[statType] += 1;
  pet.xp += 40;

  const leveledUp = checkLevelUp(pet);
  pet.lastInteractedAt = new Date();

  if (testMode) {
    testPets.set(`${guildId}:${userId}`, pet);
  } else {
    await (pet as any).save?.();
  }

  const result = pet as PetActionResult;
  result.leveledUp = leveledUp;
  return result;
}

/**
 * Rests pet: restores energy to 100.
 */
export async function restPet(
  guildId: string,
  userId: string,
): Promise<PetActionResult> {
  const pet = await getPet(guildId, userId);
  if (!pet) {
    throw new Error('You do not have a pet in this server! Use /pet adopt to get one.');
  }

  pet.energy = 100;
  pet.lastInteractedAt = new Date();

  if (testMode) {
    testPets.set(`${guildId}:${userId}`, pet);
  } else {
    await (pet as any).save?.();
  }

  return pet as PetActionResult;
}

/**
 * Duels two pets in turn-based dice roll combat.
 * Uses strength, agility (dodge chance), and intelligence (crit chance).
 * Updates battlesWon and battlesLost.
 */
export interface DuelResult {
  winnerId: string;
  loserId: string;
  winnerPet: IServerPet;
  loserPet: IServerPet;
  rounds: string[];
  summary: string;
}

export async function duelPets(
  guildId: string,
  challengerId: string,
  opponentId: string,
): Promise<DuelResult> {
  if (challengerId === opponentId) {
    throw new Error('You cannot duel against your own pet!');
  }

  const challenger = await getPet(guildId, challengerId);
  if (!challenger) {
    throw new Error('You do not have a pet to duel with! Adopt one with /pet adopt.');
  }

  const opponent = await getPet(guildId, opponentId);
  if (!opponent) {
    throw new Error('The challenged opponent does not have a pet in this server!');
  }

  let hp1 = 100;
  let hp2 = 100;
  const rounds: string[] = [];

  for (let r = 1; r <= 10; r++) {
    // Challenger attacks Opponent
    const opponentDodgeRoll = Math.random() * 100;
    const opponentDodgeChance = Math.min(35, opponent.stats.agility * 1.5);

    if (opponentDodgeRoll < opponentDodgeChance) {
      rounds.push(`💨 **Round ${r}**: **${opponent.name}** dodged **${challenger.name}**'s attack!`);
    } else {
      const challengerCritRoll = Math.random() * 100;
      const challengerCritChance = Math.min(40, challenger.stats.intelligence * 2);
      const isCrit = challengerCritRoll < challengerCritChance;

      let dmg = Math.floor(challenger.stats.strength * 1.0 + Math.random() * 6 + 6);
      if (isCrit) {
        dmg = Math.floor(dmg * 1.75);
        hp2 = Math.max(0, hp2 - dmg);
        rounds.push(
          `💥 **Round ${r}**: **${challenger.name}** landed a CRITICAL HIT for **${dmg}** damage! (${opponent.name}: ${hp2} HP left)`,
        );
      } else {
        hp2 = Math.max(0, hp2 - dmg);
        rounds.push(
          `⚔️ **Round ${r}**: **${challenger.name}** dealt **${dmg}** damage to **${opponent.name}**! (${opponent.name}: ${hp2} HP left)`,
        );
      }
    }

    if (hp2 <= 0) break;

    // Opponent attacks Challenger
    const challengerDodgeRoll = Math.random() * 100;
    const challengerDodgeChance = Math.min(35, challenger.stats.agility * 1.5);

    if (challengerDodgeRoll < challengerDodgeChance) {
      rounds.push(`💨 **Round ${r}**: **${challenger.name}** dodged **${opponent.name}**'s counter-attack!`);
    } else {
      const opponentCritRoll = Math.random() * 100;
      const opponentCritChance = Math.min(40, opponent.stats.intelligence * 2);
      const isCrit = opponentCritRoll < opponentCritChance;

      let dmg = Math.floor(opponent.stats.strength * 1.0 + Math.random() * 6 + 6);
      if (isCrit) {
        dmg = Math.floor(dmg * 1.75);
        hp1 = Math.max(0, hp1 - dmg);
        rounds.push(
          `💥 **Round ${r}**: **${opponent.name}** counter-attacked with a CRITICAL HIT for **${dmg}** damage! (${challenger.name}: ${hp1} HP left)`,
        );
      } else {
        hp1 = Math.max(0, hp1 - dmg);
        rounds.push(
          `⚔️ **Round ${r}**: **${opponent.name}** counter-attacked for **${dmg}** damage! (${challenger.name}: ${hp1} HP left)`,
        );
      }
    }

    if (hp1 <= 0) break;
  }

  // Determine winner
  const challengerWon = hp1 > hp2 || (hp1 === hp2 && challenger.level >= opponent.level);
  const winnerId = challengerWon ? challengerId : opponentId;
  const loserId = challengerWon ? opponentId : challengerId;
  const winnerPet = challengerWon ? challenger : opponent;
  const loserPet = challengerWon ? opponent : challenger;

  winnerPet.battlesWon += 1;
  loserPet.battlesLost += 1;

  winnerPet.lastInteractedAt = new Date();
  loserPet.lastInteractedAt = new Date();

  if (testMode) {
    testPets.set(`${guildId}:${challengerId}`, challenger);
    testPets.set(`${guildId}:${opponentId}`, opponent);
  } else {
    await (challenger as any).save?.();
    await (opponent as any).save?.();
  }

  const summary = `🏆 **${winnerPet.name}** defeated **${loserPet.name}**! (${winnerPet.name} now has ${winnerPet.battlesWon} wins)`;

  return {
    winnerId,
    loserId,
    winnerPet,
    loserPet,
    rounds,
    summary,
  };
}

/**
 * Releases pet (deletes from database).
 */
export async function releasePet(
  guildId: string,
  userId: string,
): Promise<boolean> {
  const pet = await getPet(guildId, userId);
  if (!pet) {
    throw new Error('You do not have a pet to release in this server!');
  }

  if (testMode) {
    return testPets.delete(`${guildId}:${userId}`);
  }

  await connectDB();
  const res = await ServerPet.deleteOne({ guildId, userId });
  return (res.deletedCount ?? 0) > 0;
}

/**
 * Retrieves guild pet leaderboard ranked by:
 * 1. level desc
 * 2. xp desc
 * 3. battlesWon desc
 */
export async function getPetLeaderboard(
  guildId: string,
  limit: number = 10,
): Promise<IServerPet[]> {
  const cleanLimit = Math.max(1, Math.min(25, limit));

  if (testMode) {
    const list: IServerPet[] = [];
    for (const pet of testPets.values()) {
      if (pet.guildId === guildId) {
        applyDecay(pet);
        list.push(pet);
      }
    }

    list.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.battlesWon - a.battlesWon;
    });

    return list.slice(0, cleanLimit);
  }

  await connectDB();
  const pets = await ServerPet.find({ guildId })
    .sort({ level: -1, xp: -1, battlesWon: -1 })
    .limit(cleanLimit);

  for (const pet of pets) {
    if (applyDecay(pet)) {
      await pet.save();
    }
  }

  return pets;
}

// ─── Embed & Component Builders ───────────────────────────────────────────────

/**
 * Renders a 10-segment ASCII meter: [████████░░] 80%
 */
export function renderPetBar(value: number, max: number = 100, length: number = 10): string {
  const clamped = Math.max(0, Math.min(max, value));
  const ratio = clamped / max;
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(ratio * 100)}%`;
}

/**
 * Builds rich Discord Embed for pet status and interactions.
 */
export function buildPetEmbed(pet: IServerPet): DiscordEmbed {
  const meta = getSpeciesMeta(pet.species);
  const hungerBar = renderPetBar(pet.hunger, 100, 10);
  const happinessBar = renderPetBar(pet.happiness, 100, 10);
  const energyBar = renderPetBar(pet.energy, 100, 10);
  const xpNeeded = pet.level * 100;

  return {
    title: `${meta.emoji} ${pet.name} (Lvl ${pet.level})`,
    description: [
      `\`\`\`text\n${meta.asciiArt}\n\`\`\``,
      `*${meta.name} — ${meta.bonusStat}*`,
      '',
      `🍗 Hunger: ${hungerBar}`,
      `💖 Happiness: ${happinessBar}`,
      `⚡ Energy: ${energyBar}`,
    ].join('\n'),
    color: meta.color,
    fields: [
      {
        name: '📊 Combat Attributes',
        value: `⚔️ STR: ${pet.stats.strength} | 💨 AGI: ${pet.stats.agility} | 🧠 INT: ${pet.stats.intelligence}`,
        inline: false,
      },
      {
        name: '🏆 Battle Record',
        value: `🏆 ${pet.battlesWon}W - ${pet.battlesLost}L`,
        inline: true,
      },
      {
        name: '✨ Progression',
        value: `Level ${pet.level} • XP: ${pet.xp}/${xpNeeded}`,
        inline: true,
      },
    ],
    footer: {
      text: `Virtual Server Companion • AiCord Habitat`,
    },
    timestamp: pet.lastInteractedAt
      ? new Date(pet.lastInteractedAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Builds interactive button components for pet owner.
 * If viewerId === pet.userId, returns ActionRow of 4 buttons:
 * - pet_feed:userId
 * - pet_play:userId
 * - pet_train:userId
 * - pet_rest:userId
 * If viewer is not the owner, returns empty array.
 */
export function buildPetComponents(
  pet: IServerPet,
  viewerId?: string,
): APIActionRowComponent<APIButtonComponent>[] {
  if (!viewerId || viewerId !== pet.userId) {
    return [];
  }

  return [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          custom_id: `pet_feed:${pet.userId}`,
          label: '🍗 Feed',
          style: ButtonStyle.Success,
        },
        {
          type: ComponentType.Button,
          custom_id: `pet_play:${pet.userId}`,
          label: '🎾 Play',
          style: ButtonStyle.Primary,
        },
        {
          type: ComponentType.Button,
          custom_id: `pet_train:${pet.userId}`,
          label: '🏋️ Train',
          style: ButtonStyle.Secondary,
        },
        {
          type: ComponentType.Button,
          custom_id: `pet_rest:${pet.userId}`,
          label: '💤 Rest',
          style: ButtonStyle.Secondary,
        },
      ],
    },
  ];
}
