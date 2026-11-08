/**
 * test/pets/commands.test.ts
 * Unit tests for Virtual Server Pet Companion & Tamagotchi Habitat — Slash Commands & Components:
 * - Central Command Registry lookup & subcommands schema verification (adopt, status, feed, play, train, rest, duel, release, leaderboard)
 * - Rate limit (5/10s), fun category, and options schema verification
 * - /pet adopt: adoption execution, species choices, embed & button response, error handling
 * - /pet status: self status with action buttons, target member status without buttons, not-found guards
 * - /pet feed, /pet play, /pet train, /pet rest: stat updates and error handling
 * - /pet duel: turn-based dice roll combat log and win/loss reporting
 * - /pet release: confirmation gate and deletion
 * - /pet leaderboard: empty guild notice and formatted ranked list
 * - Interactive Component Routing: handlePetComponent (pet_feed, pet_play, pet_train, pet_rest)
 * - Security: unauthorized user rejection with ephemeral embed
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import {
  getCommand,
  registerPetCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handlePetCommand,
  handlePetAdoptSubcommand,
  handlePetStatusSubcommand,
  handlePetFeedSubcommand,
  handlePetPlaySubcommand,
  handlePetTrainSubcommand,
  handlePetRestSubcommand,
  handlePetDuelSubcommand,
  handlePetReleaseSubcommand,
  handlePetLeaderboardSubcommand,
  handlePetComponent,
  petCommand,
} from '@/commands/pet';
import {
  enableTestMode,
  clearTestStore,
  setTestPet,
  getPet,
} from '@/lib/pets/pet-service';

describe('Virtual Server Pet Companion — Slash Commands & Components', () => {
  const GUILD_ID = 'guild_pet_cmd_999';
  const USER_ALICE = 'user_alice_111';
  const USER_BOB = 'user_bob_222';
  const CHANNEL_ID = 'channel_pets_777';
  const TOKEN = 'test_interaction_token_123';

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

  describe('Command Registry Integration', () => {
    it('registers /pet in the central command registry', () => {
      registerPetCommands();
      const cmd = getCommand('pet');
      assert.ok(cmd, 'pet command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'pet');
      assert.strictEqual(cmd?.category, 'fun');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines all 9 required subcommands with valid options schemas', () => {
      const subcommands = petCommand.options?.map((o: unknown) => (o as { name: string }).name);
      assert.deepStrictEqual(subcommands, [
        'adopt',
        'status',
        'feed',
        'play',
        'train',
        'rest',
        'duel',
        'release',
        'leaderboard',
      ]);

      // Verify adopt subcommand options
      const adoptSub = petCommand.options?.find((o: unknown) => (o as { name: string }).name === 'adopt');
      const adoptOpts = (adoptSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(adoptOpts?.some((o) => o.name === 'species' && o.required === true));
      assert.ok(adoptOpts?.some((o) => o.name === 'name' && o.required === true));

      // Verify status subcommand options
      const statusSub = petCommand.options?.find((o: unknown) => (o as { name: string }).name === 'status');
      const statusOpts = (statusSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(statusOpts?.some((o) => o.name === 'user' && o.required === false));

      // Verify train subcommand options
      const trainSub = petCommand.options?.find((o: unknown) => (o as { name: string }).name === 'train');
      const trainOpts = (trainSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(trainOpts?.some((o) => o.name === 'stat' && o.required === true));

      // Verify duel subcommand options
      const duelSub = petCommand.options?.find((o: unknown) => (o as { name: string }).name === 'duel');
      const duelOpts = (duelSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(duelOpts?.some((o) => o.name === 'opponent' && o.required === true));

      // Verify release subcommand options
      const releaseSub = petCommand.options?.find((o: unknown) => (o as { name: string }).name === 'release');
      const releaseOpts = (releaseSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(releaseOpts?.some((o) => o.name === 'confirm' && o.required === true));

      // Verify leaderboard subcommand options
      const lbSub = petCommand.options?.find((o: unknown) => (o as { name: string }).name === 'leaderboard');
      const lbOpts = (lbSub as { options?: Array<{ name: string; required?: boolean }> })?.options;
      assert.ok(lbOpts?.some((o) => o.name === 'limit' && o.required === false));
    });
  });

  describe('/pet adopt Subcommand', () => {
    it('adopts a pet and edits interaction with pet embed and action buttons', async () => {
      await handlePetAdoptSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'species', value: 'shiba' },
        { name: 'name', value: 'Cheems' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0]);
      assert.strictEqual(res.embeds[0].title, '🐕 Cheems (Lvl 1)');
      assert.ok(res.components && res.components.length > 0);

      const pet = await getPet(GUILD_ID, USER_ALICE);
      assert.ok(pet);
      assert.strictEqual(pet.name, 'Cheems');
    });

    it('returns error embed if adoption fails (e.g. duplicate adoption)', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, name: 'Existing' });

      await handlePetAdoptSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'species', value: 'dragon' },
        { name: 'name', value: 'Draco' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Adoption Error'));
    });
  });

  describe('/pet status Subcommand', () => {
    it('returns status embed with action buttons for self pet', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, name: 'Apollo', species: 'owl' });

      await handlePetStatusSubcommand(GUILD_ID, USER_ALICE, TOKEN, []);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.embeds?.[0].title, '🦉 Apollo (Lvl 1)');
      assert.strictEqual(res.components?.length, 1);
    });

    it('returns status embed without buttons when viewing another member pet', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_BOB, name: 'Shadow', species: 'cat' });

      await handlePetStatusSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'user', value: USER_BOB },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.embeds?.[0].title, '🐱 Shadow (Lvl 1)');
      assert.strictEqual(res.components?.length, 0); // Not owner
    });

    it('returns error embed when self has no pet', async () => {
      await handlePetStatusSubcommand(GUILD_ID, USER_ALICE, TOKEN, []);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].description?.includes('/pet adopt'));
    });

    it('returns error embed when targeted user has no pet', async () => {
      await handlePetStatusSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'user', value: USER_BOB },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].description?.includes('does not have a pet'));
    });
  });

  describe('/pet feed Subcommand', () => {
    it('feeds pet and returns updated status embed', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, hunger: 50 });

      await handlePetFeedSubcommand(GUILD_ID, USER_ALICE, TOKEN);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].description?.includes('🍗 Hunger: [████████░░] 80%'));
    });

    it('returns error embed when user has no pet to feed', async () => {
      await handlePetFeedSubcommand(GUILD_ID, USER_ALICE, TOKEN);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
    });
  });

  describe('/pet play Subcommand', () => {
    it('plays with pet and decreases energy while raising happiness', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, energy: 100, happiness: 50 });

      await handlePetPlaySubcommand(GUILD_ID, USER_ALICE, TOKEN);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].description?.includes('💖 Happiness: [█████████░] 85%'));
      assert.ok(res.embeds?.[0].description?.includes('⚡ Energy: [█████████░] 85%'));
    });

    it('returns error embed when pet has insufficient energy to play', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, energy: 10 });

      await handlePetPlaySubcommand(GUILD_ID, USER_ALICE, TOKEN);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('too tired'));
    });
  });

  describe('/pet train Subcommand', () => {
    it('trains target stat and consumes energy and hunger', async () => {
      setTestPet({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        energy: 100,
        hunger: 80,
        stats: { strength: 10, agility: 10, intelligence: 10 },
      });

      await handlePetTrainSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'stat', value: 'agility' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const strField = res.embeds?.[0].fields?.find((f) => f.name.includes('Combat Attributes'));
      assert.ok(strField?.value.includes('💨 AGI: 11'));
    });

    it('returns error embed if pet is too exhausted to train', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, energy: 20 });

      await handlePetTrainSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'stat', value: 'strength' },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('too exhausted'));
    });
  });

  describe('/pet rest Subcommand', () => {
    it('rests pet and restores energy to 100', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, energy: 25 });

      await handlePetRestSubcommand(GUILD_ID, USER_ALICE, TOKEN);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].description?.includes('⚡ Energy: [██████████] 100%'));
    });
  });

  describe('/pet duel Subcommand', () => {
    it('duels another member pet and renders duel combat log', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, name: 'AlicePet', species: 'dragon' });
      setTestPet({ guildId: GUILD_ID, userId: USER_BOB, name: 'BobPet', species: 'shiba' });

      await handlePetDuelSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'opponent', value: USER_BOB },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Pet Duel'));
      assert.ok(res.embeds?.[0].description?.includes('Combat Log'));
      assert.strictEqual(res.embeds?.[0].fields?.length, 2);
    });

    it('returns error embed on self-duel attempt', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, name: 'AlicePet' });

      await handlePetDuelSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'opponent', value: USER_ALICE },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('cannot duel against your own pet'));
    });
  });

  describe('/pet release Subcommand', () => {
    it('cancels release when confirm is false', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, name: 'SavedPet' });

      await handlePetReleaseSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'confirm', value: false },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Release Cancelled'));

      assert.ok(await getPet(GUILD_ID, USER_ALICE));
    });

    it('permanently releases pet when confirm is true', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, name: 'ByePet' });

      await handlePetReleaseSubcommand(GUILD_ID, USER_ALICE, TOKEN, [
        { name: 'confirm', value: true },
      ]);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Pet Released'));
      assert.strictEqual(await getPet(GUILD_ID, USER_ALICE), null);
    });
  });

  describe('/pet leaderboard Subcommand', () => {
    it('returns empty server message when no pets exist', async () => {
      await handlePetLeaderboardSubcommand(GUILD_ID, TOKEN, []);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('No pets have been adopted'));
    });

    it('returns ranked pet leaderboard embed', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, name: 'Pet1', level: 5 });
      setTestPet({ guildId: GUILD_ID, userId: USER_BOB, name: 'Pet2', level: 2 });

      await handlePetLeaderboardSubcommand(GUILD_ID, TOKEN, [{ name: 'limit', value: 5 }]);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Virtual Pet Companion Leaderboard'));
      assert.ok(res.embeds?.[0].description?.includes('Pet1'));
      assert.ok(res.embeds?.[0].description?.includes('Pet2'));
    });
  });

  describe('Interactive Component Routing & Security', () => {
    const mockComponent = {
      channel_id: CHANNEL_ID,
      message: { id: 'msg_123', channel_id: CHANNEL_ID },
    } as unknown as APIMessageComponentInteraction;

    it('rejects unauthorized member trying to interact with someone else pet', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, name: 'AliceDog' });

      // User Bob clicks Alice's feed button
      await handlePetComponent(
        TOKEN,
        `pet_feed:${USER_ALICE}`,
        USER_BOB,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Unauthorized Action'));
    });

    it('handles pet_feed button click from pet owner', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, hunger: 40 });

      await handlePetComponent(
        TOKEN,
        `pet_feed:${USER_ALICE}`,
        USER_ALICE,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].description?.includes('🍗 Hunger: [███████░░░] 70%'));
    });

    it('handles pet_play button click from pet owner', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, energy: 100, happiness: 50 });

      await handlePetComponent(
        TOKEN,
        `pet_play:${USER_ALICE}`,
        USER_ALICE,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].description?.includes('💖 Happiness: [█████████░] 85%'));
    });

    it('handles pet_train button click from pet owner', async () => {
      setTestPet({
        guildId: GUILD_ID,
        userId: USER_ALICE,
        species: 'dragon',
        energy: 100,
        hunger: 80,
        stats: { strength: 13, agility: 10, intelligence: 10 },
      });

      await handlePetComponent(
        TOKEN,
        `pet_train:${USER_ALICE}`,
        USER_ALICE,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const strField = res.embeds?.[0].fields?.find((f) => f.name.includes('Combat Attributes'));
      assert.ok(strField?.value.includes('⚔️ STR: 14'));
    });

    it('handles pet_rest button click from pet owner', async () => {
      setTestPet({ guildId: GUILD_ID, userId: USER_ALICE, energy: 30 });

      await handlePetComponent(
        TOKEN,
        `pet_rest:${USER_ALICE}`,
        USER_ALICE,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].description?.includes('⚡ Energy: [██████████] 100%'));
    });
  });

  describe('Main Command Dispatcher', () => {
    it('rejects command execution outside of a guild (in DMs)', async () => {
      const dmInteraction = {
        token: TOKEN,
        user: { id: USER_ALICE },
        data: { options: [{ name: 'feed' }] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handlePetCommand(dmInteraction);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('only be used in a server'));
    });

    it('dispatches to adopt subcommand cleanly', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: TOKEN,
        member: { user: { id: USER_ALICE } },
        data: {
          options: [
            {
              name: 'adopt',
              options: [
                { name: 'species', value: 'slime' },
                { name: 'name', value: 'Goo' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handlePetCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.embeds?.[0].title, '🟢 Goo (Lvl 1)');
    });
  });
});
