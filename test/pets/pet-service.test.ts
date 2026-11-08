/**
 * test/pets/pet-service.test.ts
 * Unit tests for Virtual Server Pet Companion & Tamagotchi Habitat — Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestPet, getTestPet)
 * - Species metadata & starter bonus verification (shiba, dragon, cat, owl, slime)
 * - Pet adoption mechanics and duplicate adoption rejection
 * - Stat decay engine (-2/hr hunger and happiness, minimum clamping at 0)
 * - Pet care: feeding, playing, training (with energy/hunger gates), resting
 * - Level-up formula (xp >= level * 100, +2 stats, remainder preservation, energy reset)
 * - Turn-based combat dueling engine (stat resolution, win/loss tracking, battle logs)
 * - Pet release mechanics
 * - Visual embed formatting and ASCII meter rendering
 * - Interactive action component builder (owner authorization filter)
 * - Server leaderboard ranking (level desc, xp desc, battlesWon desc)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestPet,
  getTestPet,
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
  renderPetBar,
  applyDecay,
  checkLevelUp,
  getSpeciesMeta,
  SPECIES_MAP,
  type IServerPet,
  type PetSpecies,
} from '@/lib/pets/pet-service';

describe('Virtual Server Pet Companion — Pet Service Engine', () => {
  const GUILD_ID = 'guild_pet_test_100';
  const OTHER_GUILD = 'guild_pet_test_200';
  const USER_1 = 'user_alice_111';
  const USER_2 = 'user_bob_222';
  const USER_3 = 'user_charlie_333';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('Test Store Lifecycle', () => {
    it('manages testMode state correctly', () => {
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
    });

    it('sets and retrieves test pet with defaults and stat overrides', () => {
      setTestPet({
        guildId: GUILD_ID,
        userId: USER_1,
        species: 'dragon',
        name: 'Ignis',
      });

      const pet = getTestPet(GUILD_ID, USER_1);
      assert.ok(pet);
      assert.strictEqual(pet.name, 'Ignis');
      assert.strictEqual(pet.species, 'dragon');
      assert.strictEqual(pet.level, 1);
      assert.strictEqual(pet.stats.strength, 13); // 10 + 3 dragon bonus
    });

    it('clears test store completely', () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_1, name: 'Pooch' });
      clearTestStore();
      assert.strictEqual(getTestPet(GUILD_ID, USER_1), undefined);
    });
  });

  describe('Species Metadata & Stat Bonuses', () => {
    it('provides valid metadata for all 5 species', () => {
      const speciesList: PetSpecies[] = ['shiba', 'dragon', 'cat', 'owl', 'slime'];
      for (const sp of speciesList) {
        const meta = getSpeciesMeta(sp);
        assert.ok(meta);
        assert.strictEqual(meta.species, sp);
        assert.ok(meta.emoji);
        assert.ok(meta.name);
        assert.ok(meta.bonusStat);
        assert.ok(meta.asciiArt);
        assert.ok(typeof meta.color === 'number');
      }
    });

    it('verifies exact starter stat bonuses per species', () => {
      assert.deepStrictEqual(SPECIES_MAP.shiba.statBonus, { strength: 0, agility: 3, intelligence: 0 });
      assert.deepStrictEqual(SPECIES_MAP.dragon.statBonus, { strength: 3, agility: 0, intelligence: 0 });
      assert.deepStrictEqual(SPECIES_MAP.cat.statBonus, { strength: 0, agility: 2, intelligence: 1 });
      assert.deepStrictEqual(SPECIES_MAP.owl.statBonus, { strength: 0, agility: 0, intelligence: 3 });
      assert.deepStrictEqual(SPECIES_MAP.slime.statBonus, { strength: 1, agility: 1, intelligence: 1 });
    });
  });

  describe('Pet Adoption Mechanics', () => {
    it('adopts a shiba with proper initial values and +3 Agility bonus', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'Doge');
      assert.strictEqual(pet.guildId, GUILD_ID);
      assert.strictEqual(pet.userId, USER_1);
      assert.strictEqual(pet.name, 'Doge');
      assert.strictEqual(pet.species, 'shiba');
      assert.strictEqual(pet.level, 1);
      assert.strictEqual(pet.xp, 0);
      assert.strictEqual(pet.hunger, 80);
      assert.strictEqual(pet.happiness, 80);
      assert.strictEqual(pet.energy, 100);
      assert.strictEqual(pet.stats.strength, 10);
      assert.strictEqual(pet.stats.agility, 13);
      assert.strictEqual(pet.stats.intelligence, 10);
      assert.strictEqual(pet.battlesWon, 0);
      assert.strictEqual(pet.battlesLost, 0);
    });

    it('adopts a dragon with +3 Strength bonus', async () => {
      const pet = await adoptPet(GUILD_ID, USER_2, 'dragon', 'Smaug');
      assert.strictEqual(pet.stats.strength, 13);
      assert.strictEqual(pet.stats.agility, 10);
      assert.strictEqual(pet.stats.intelligence, 10);
    });

    it('adopts an owl with +3 Intelligence bonus', async () => {
      const pet = await adoptPet(GUILD_ID, USER_3, 'owl', 'Athena');
      assert.strictEqual(pet.stats.strength, 10);
      assert.strictEqual(pet.stats.agility, 10);
      assert.strictEqual(pet.stats.intelligence, 13);
    });

    it('rejects duplicate adoption in the same guild for same user', async () => {
      await adoptPet(GUILD_ID, USER_1, 'shiba', 'FirstPet');
      await assert.rejects(
        async () => {
          await adoptPet(GUILD_ID, USER_1, 'cat', 'SecondPet');
        },
        /already have a pet/,
      );
    });

    it('allows same user to adopt in a different guild', async () => {
      const pet1 = await adoptPet(GUILD_ID, USER_1, 'shiba', 'FirstPet');
      const pet2 = await adoptPet(OTHER_GUILD, USER_1, 'cat', 'SecondPet');
      assert.strictEqual(pet1.guildId, GUILD_ID);
      assert.strictEqual(pet2.guildId, OTHER_GUILD);
    });

    it('rejects invalid species', async () => {
      await assert.rejects(
        async () => {
          await adoptPet(GUILD_ID, USER_1, 'unicorn' as any, 'Sparkle');
        },
        /Invalid species/,
      );
    });

    it('rejects empty name or name exceeding 32 characters', async () => {
      await assert.rejects(
        async () => {
          await adoptPet(GUILD_ID, USER_1, 'shiba', '   ');
        },
        /between 1 and 32 characters/,
      );

      await assert.rejects(
        async () => {
          await adoptPet(GUILD_ID, USER_1, 'shiba', 'A'.repeat(33));
        },
        /between 1 and 32 characters/,
      );
    });
  });

  describe('Stat Decay Engine', () => {
    it('decays hunger (-2/hr) and happiness (-2/hr) over elapsed hours', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'Hachiko');
      // Set lastInteractedAt to 5 hours ago
      pet.lastInteractedAt = new Date(Date.now() - 5 * 3600 * 1000);

      const updated = await getPet(GUILD_ID, USER_1);
      assert.ok(updated);
      assert.strictEqual(updated.hunger, 70); // 80 - (5 * 2) = 70
      assert.strictEqual(updated.happiness, 70); // 80 - (5 * 2) = 70
    });

    it('does not decay when less than 1 hour has elapsed', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'Hachiko');
      pet.lastInteractedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

      const updated = await getPet(GUILD_ID, USER_1);
      assert.ok(updated);
      assert.strictEqual(updated.hunger, 80);
      assert.strictEqual(updated.happiness, 80);
    });

    it('clamps hunger and happiness at minimum 0', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'Hachiko');
      pet.lastInteractedAt = new Date(Date.now() - 100 * 3600 * 1000); // 100 hours

      const updated = await getPet(GUILD_ID, USER_1);
      assert.ok(updated);
      assert.strictEqual(updated.hunger, 0);
      assert.strictEqual(updated.happiness, 0);
    });
  });

  describe('Feeding, Playing, Training & Resting', () => {
    it('feeds pet: +30 hunger (max 100), +10 happiness, +20 XP', async () => {
      await adoptPet(GUILD_ID, USER_1, 'shiba', 'Corgo');
      // Pet starts at hunger 80, happiness 80, xp 0
      const pet = await feedPet(GUILD_ID, USER_1);
      assert.strictEqual(pet.hunger, 100); // 80 + 30 capped at 100
      assert.strictEqual(pet.happiness, 90); // 80 + 10
      assert.strictEqual(pet.xp, 20);
    });

    it('plays with pet: +35 happiness, -15 energy, +25 XP', async () => {
      await adoptPet(GUILD_ID, USER_1, 'shiba', 'Corgo');
      const pet = await playWithPet(GUILD_ID, USER_1);
      assert.strictEqual(pet.happiness, 100); // 80 + 35 capped at 100
      assert.strictEqual(pet.energy, 85); // 100 - 15
      assert.strictEqual(pet.xp, 25);
    });

    it('rejects playing when pet energy is below 15', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'Corgo');
      pet.energy = 10;
      await assert.rejects(
        async () => {
          await playWithPet(GUILD_ID, USER_1);
        },
        /too tired to play/,
      );
    });

    it('trains pet: increments target stat by +1, -25 energy, -15 hunger, +40 XP', async () => {
      await adoptPet(GUILD_ID, USER_1, 'dragon', 'Draco');
      // Draco starts with strength 13, energy 100, hunger 80, xp 0
      const pet = await trainPet(GUILD_ID, USER_1, 'strength');
      assert.strictEqual(pet.stats.strength, 14);
      assert.strictEqual(pet.energy, 75);
      assert.strictEqual(pet.hunger, 65);
      assert.strictEqual(pet.xp, 40);
    });

    it('trains agility and intelligence accurately', async () => {
      await adoptPet(GUILD_ID, USER_1, 'cat', 'Whiskers');
      const agiPet = await trainPet(GUILD_ID, USER_1, 'agility');
      assert.strictEqual(agiPet.stats.agility, 13); // was 12

      const intPet = await trainPet(GUILD_ID, USER_1, 'intelligence');
      assert.strictEqual(intPet.stats.intelligence, 12); // was 11
    });

    it('rejects training when energy is below 25', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'TiredPet');
      pet.energy = 20;
      await assert.rejects(
        async () => {
          await trainPet(GUILD_ID, USER_1, 'strength');
        },
        /too exhausted to train/,
      );
    });

    it('rejects training when hunger is below 15', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'HungryPet');
      pet.hunger = 10;
      await assert.rejects(
        async () => {
          await trainPet(GUILD_ID, USER_1, 'agility');
        },
        /too hungry to train/,
      );
    });

    it('rests pet: restores energy to 100', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'SleepyPet');
      pet.energy = 25;
      const rested = await restPet(GUILD_ID, USER_1);
      assert.strictEqual(rested.energy, 100);
    });

    it('rejects actions when user has no pet', async () => {
      await assert.rejects(async () => feedPet(GUILD_ID, 'unknown_user'), /do not have a pet/);
      await assert.rejects(async () => playWithPet(GUILD_ID, 'unknown_user'), /do not have a pet/);
      await assert.rejects(async () => trainPet(GUILD_ID, 'unknown_user', 'strength'), /do not have a pet/);
      await assert.rejects(async () => restPet(GUILD_ID, 'unknown_user'), /do not have a pet/);
    });
  });

  describe('Level Up Progression', () => {
    it('levels up when xp reaches level * 100, grants +2 to all stats and full energy', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'LevelDog');
      pet.xp = 85;
      pet.energy = 40;
      const initialStr = pet.stats.strength;
      const initialAgi = pet.stats.agility;
      const initialInt = pet.stats.intelligence;

      // Feeding grants +20 XP -> total 105 XP >= 100
      const updated = await feedPet(GUILD_ID, USER_1);
      assert.strictEqual(updated.level, 2);
      assert.strictEqual(updated.xp, 5); // 105 - 100 = 5 remainder
      assert.strictEqual(updated.stats.strength, initialStr + 2);
      assert.strictEqual(updated.stats.agility, initialAgi + 2);
      assert.strictEqual(updated.stats.intelligence, initialInt + 2);
      assert.strictEqual(updated.energy, 100);
      assert.strictEqual(updated.leveledUp, true);
    });

    it('handles multiple level jumps on large XP injection', () => {
      const pet = {
        level: 1,
        xp: 350,
        energy: 50,
        stats: { strength: 10, agility: 10, intelligence: 10 },
      } as unknown as IServerPet;

      const leveled = checkLevelUp(pet);
      assert.strictEqual(leveled, true);
      // Lvl 1 -> needs 100 XP (350 - 100 = 250), lvl 2
      // Lvl 2 -> needs 200 XP (250 - 200 = 50), lvl 3
      assert.strictEqual(pet.level, 3);
      assert.strictEqual(pet.xp, 50);
      assert.strictEqual(pet.stats.strength, 14); // +4
      assert.strictEqual(pet.energy, 100);
    });
  });

  describe('Turn-based Combat Dueling Engine', () => {
    it('executes a turn-based dice roll duel between two pets and updates stats', async () => {
      await adoptPet(GUILD_ID, USER_1, 'dragon', 'Draco');
      await adoptPet(GUILD_ID, USER_2, 'shiba', 'Flash');

      const duel = await duelPets(GUILD_ID, USER_1, USER_2);
      assert.ok(duel.winnerId);
      assert.ok(duel.loserId);
      assert.notStrictEqual(duel.winnerId, duel.loserId);
      assert.ok(duel.rounds.length > 0);
      assert.ok(duel.summary.includes('defeated'));

      // Check battle records updated
      const pet1 = await getPet(GUILD_ID, USER_1);
      const pet2 = await getPet(GUILD_ID, USER_2);
      assert.ok(pet1);
      assert.ok(pet2);
      assert.strictEqual(pet1.battlesWon + pet2.battlesWon, 1);
      assert.strictEqual(pet1.battlesLost + pet2.battlesLost, 1);
    });

    it('rejects self-dueling', async () => {
      await adoptPet(GUILD_ID, USER_1, 'dragon', 'Draco');
      await assert.rejects(
        async () => {
          await duelPets(GUILD_ID, USER_1, USER_1);
        },
        /cannot duel against your own pet/,
      );
    });

    it('rejects duel when challenger or opponent has no pet', async () => {
      await adoptPet(GUILD_ID, USER_1, 'dragon', 'Draco');
      await assert.rejects(
        async () => {
          await duelPets(GUILD_ID, 'no_pet_user', USER_1);
        },
        /do not have a pet to duel with/,
      );

      await assert.rejects(
        async () => {
          await duelPets(GUILD_ID, USER_1, 'no_pet_opponent');
        },
        /opponent does not have a pet/,
      );
    });
  });

  describe('Release Pet Mechanics', () => {
    it('successfully releases a pet from database', async () => {
      await adoptPet(GUILD_ID, USER_1, 'slime', 'Blobby');
      assert.ok(await getPet(GUILD_ID, USER_1));

      const released = await releasePet(GUILD_ID, USER_1);
      assert.strictEqual(released, true);

      const after = await getPet(GUILD_ID, USER_1);
      assert.strictEqual(after, null);
    });

    it('rejects releasing when user has no pet', async () => {
      await assert.rejects(
        async () => {
          await releasePet(GUILD_ID, USER_1);
        },
        /do not have a pet to release/,
      );
    });
  });

  describe('Visual Presentation & Components', () => {
    it('renders 10-block progress bar accurately', () => {
      assert.strictEqual(renderPetBar(80), '[████████░░] 80%');
      assert.strictEqual(renderPetBar(100), '[██████████] 100%');
      assert.strictEqual(renderPetBar(60), '[██████░░░░] 60%');
      assert.strictEqual(renderPetBar(0), '[░░░░░░░░░░] 0%');
    });

    it('builds rich pet embed with ASCII art and meters', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'dragon', 'Ignis');
      const embed = buildPetEmbed(pet);

      assert.strictEqual(embed.title, '🐉 Ignis (Lvl 1)');
      assert.ok(embed.description?.includes('🍗 Hunger: [████████░░] 80%'));
      assert.ok(embed.description?.includes('💖 Happiness: [████████░░] 80%'));
      assert.ok(embed.description?.includes('⚡ Energy: [██████████] 100%'));
      assert.ok(embed.description?.includes('```text'));
      assert.strictEqual(embed.color, SPECIES_MAP.dragon.color);

      const strField = embed.fields?.find((f) => f.name.includes('Combat Attributes'));
      assert.ok(strField?.value.includes('⚔️ STR: 13 | 💨 AGI: 10 | 🧠 INT: 10'));

      const battleField = embed.fields?.find((f) => f.name.includes('Battle Record'));
      assert.ok(battleField?.value.includes('🏆 0W - 0L'));
    });

    it('builds action row components only for pet owner', async () => {
      const pet = await adoptPet(GUILD_ID, USER_1, 'shiba', 'Corgo');

      // Viewer is owner
      const ownerRows = buildPetComponents(pet, USER_1);
      assert.strictEqual(ownerRows.length, 1);
      const buttons = ownerRows[0].components;
      assert.strictEqual(buttons.length, 4);
      assert.strictEqual((buttons[0] as any).custom_id, `pet_feed:${USER_1}`);
      assert.strictEqual((buttons[1] as any).custom_id, `pet_play:${USER_1}`);
      assert.strictEqual((buttons[2] as any).custom_id, `pet_train:${USER_1}`);
      assert.strictEqual((buttons[3] as any).custom_id, `pet_rest:${USER_1}`);

      // Viewer is not owner
      const nonOwnerRows = buildPetComponents(pet, USER_2);
      assert.strictEqual(nonOwnerRows.length, 0);

      // Viewer undefined
      assert.strictEqual(buildPetComponents(pet, undefined).length, 0);
    });
  });

  describe('Server Leaderboard Ranking', () => {
    it('ranks pets by level desc, xp desc, battlesWon desc', async () => {
      // Pet A: Lvl 1, XP 50, 2 wins
      setTestPet({
        guildId: GUILD_ID,
        userId: USER_1,
        name: 'PetA',
        level: 1,
        xp: 50,
        battlesWon: 2,
      });

      // Pet B: Lvl 3, XP 10, 0 wins
      setTestPet({
        guildId: GUILD_ID,
        userId: USER_2,
        name: 'PetB',
        level: 3,
        xp: 10,
        battlesWon: 0,
      });

      // Pet C: Lvl 1, XP 90, 1 win
      setTestPet({
        guildId: GUILD_ID,
        userId: USER_3,
        name: 'PetC',
        level: 1,
        xp: 90,
        battlesWon: 1,
      });

      // Pet in another guild (should be ignored)
      setTestPet({
        guildId: OTHER_GUILD,
        userId: 'other_user',
        name: 'OtherPet',
        level: 10,
      });

      const lb = await getPetLeaderboard(GUILD_ID, 10);
      assert.strictEqual(lb.length, 3);
      assert.strictEqual(lb[0].name, 'PetB'); // Lvl 3
      assert.strictEqual(lb[1].name, 'PetC'); // Lvl 1, 90 XP
      assert.strictEqual(lb[2].name, 'PetA'); // Lvl 1, 50 XP
    });

    it('enforces limit parameter', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_1, name: 'Pet1' });
      setTestPet({ guildId: GUILD_ID, userId: USER_2, name: 'Pet2' });
      setTestPet({ guildId: GUILD_ID, userId: USER_3, name: 'Pet3' });

      const lb = await getPetLeaderboard(GUILD_ID, 2);
      assert.strictEqual(lb.length, 2);
    });
  });
});
