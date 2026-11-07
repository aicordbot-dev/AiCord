/**
 * test/rpg/commands.test.ts
 * Unit tests for Service 20: Gemini AI Dynamic RPG (/adventure) Slash Command Suite & Component Routing:
 * - Central Command Registry lookup & schema validation
 * - /adventure play subcommand (initialization & component generation)
 * - /adventure profile subcommand (self & target member inspections)
 * - /adventure inventory subcommand (equipment & satchel organization)
 * - /adventure heal subcommand (tavern visit & vitals recovery)
 * - /adventure leaderboard subcommand (ranking & limits)
 * - handleAdventureComponent router & session ownership security validation
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import { getCommand, registerAdventureCommands } from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  setFollowUpHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleAdventureCommand,
  handleAdventureComponent,
  adventureCommand,
} from '@/commands/adventure';
import {
  enableTestMode,
  clearTestStore,
  getOrCreatePlayer,
  type IAdventurePlayer,
} from '@/lib/rpg/adventure-service';

describe('Gemini AI Dynamic RPG — Commands & Component Handler', () => {
  const GUILD_ID = 'guild_rpg_cmd_999';
  const USER_HERO = 'user_hero_123';
  const USER_INTRUDER = 'user_intruder_456';
  const USER_TARGET = 'user_target_789';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];
  let interceptedFollowUps: Array<{ token: string; options: InteractionResponseOptions }> = [];

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    interceptedResponses = [];
    interceptedFollowUps = [];

    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });

    setFollowUpHandler(async (token, options) => {
      interceptedFollowUps.push({ token, options });
      return { id: 'mock_followup_id' };
    });
  });

  afterEach(() => {
    setResponseHandler(null);
    setFollowUpHandler(null);
  });

  // ─── 1. Command Registry Integration ──────────────────────────────────────────

  describe('Command Registry Integration', () => {
    it('registers /adventure with fun category and 5 subcommands', () => {
      registerAdventureCommands();
      const cmd = getCommand('adventure');
      assert.ok(cmd);
      assert.equal(cmd.name, 'adventure');
      assert.equal(cmd.category, 'fun');
      assert.equal(cmd.options?.length, 5);

      const subNames = (cmd.options as Array<{ name: string }>).map((o) => o.name);
      assert.ok(subNames.includes('play'));
      assert.ok(subNames.includes('profile'));
      assert.ok(subNames.includes('inventory'));
      assert.ok(subNames.includes('heal'));
      assert.ok(subNames.includes('leaderboard'));
    });
  });

  // ─── 2. /adventure play ───────────────────────────────────────────────────────

  describe('/adventure play Subcommand', () => {
    it('creates adventurer and generates interactive embed with action row buttons', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_play_1',
        member: { user: { id: USER_HERO, username: 'Arthur' } },
        data: {
          name: 'adventure',
          options: [
            {
              name: 'play',
              options: [{ name: 'class', value: 'warrior' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Floor 1'));
      assert.ok(res.embeds?.[0].fields?.[0].value.includes('Arthur'));
      assert.ok(res.components?.[0]);

      const actionRow = res.components[0] as { components: Array<{ custom_id: string }> };
      assert.ok(actionRow.components.length >= 3);
      assert.ok(actionRow.components[0].custom_id.startsWith(`adv_choice:${USER_HERO}:`));
    });

    it('creates mage adventurer when class option is mage', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_play_mage',
        member: { user: { id: USER_HERO, username: 'Merlin' } },
        data: {
          name: 'adventure',
          options: [
            {
              name: 'play',
              options: [{ name: 'class', value: 'mage' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      const player = await getOrCreatePlayer(GUILD_ID, USER_HERO);
      assert.equal(player.class, 'mage');
      assert.ok(player.inventory.some((i) => i.name === 'Arcane Wand'));
    });
  });

  // ─── 3. /adventure profile ────────────────────────────────────────────────────

  describe('/adventure profile Subcommand', () => {
    it('returns informative embed when hero does not exist yet', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_prof_empty',
        member: { user: { id: USER_HERO } },
        data: {
          name: 'adventure',
          options: [{ name: 'profile' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('No Hero Profile'));
      assert.equal(interceptedResponses[0].options.ephemeral, true);
    });

    it('displays hero stats, vitals, floor depth, and equipment when profile exists', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_HERO, 'rogue', 'ShadowBlade');
      player.level = 3;
      player.gold = 350;
      await player.save();

      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_prof_exists',
        member: { user: { id: USER_HERO } },
        data: {
          name: 'adventure',
          options: [{ name: 'profile' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('ShadowBlade'));
      assert.ok(embed?.fields?.some((f) => f.value.includes('Level **3**')));
      assert.ok(embed?.fields?.some((f) => f.value.includes('350')));
    });

    it('inspects target member adventurer profile when user option is provided', async () => {
      await getOrCreatePlayer(GUILD_ID, USER_TARGET, 'cleric', 'Sister Joan');

      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_prof_target',
        member: { user: { id: USER_HERO } },
        data: {
          name: 'adventure',
          options: [
            {
              name: 'profile',
              options: [{ name: 'user', value: USER_TARGET }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Sister Joan'));
    });
  });

  // ─── 4. /adventure inventory ──────────────────────────────────────────────────

  describe('/adventure inventory Subcommand', () => {
    it('displays inventory items organized by weapons, armor, and potions', async () => {
      await getOrCreatePlayer(GUILD_ID, USER_HERO, 'cleric', 'HolyCleric');

      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_inv_cleric',
        member: { user: { id: USER_HERO } },
        data: {
          name: 'adventure',
          options: [{ name: 'inventory' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Adventure Satchel'));
      assert.ok(embed?.fields?.some((f) => f.name.includes('Weapons')));
      assert.ok(embed?.fields?.some((f) => f.name.includes('Armor')));
      assert.ok(embed?.fields?.some((f) => f.name.includes('Potions')));
    });

    it('returns empty notice if player has no profile yet', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_inv_none',
        member: { user: { id: 'unregistered_user' } },
        data: {
          name: 'adventure',
          options: [{ name: 'inventory' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('No Hero Profile'));
    });
  });

  // ─── 5. /adventure heal ───────────────────────────────────────────────────────

  describe('/adventure heal Subcommand', () => {
    it('visits tavern and restores player HP to maximum', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_HERO, 'warrior');
      player.hp = 25;
      player.gold = 100;
      await player.save();

      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_tavern_heal',
        member: { user: { id: USER_HERO } },
        data: {
          name: 'adventure',
          options: [{ name: 'heal' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Silver Dragon Tavern'));
      assert.ok(embed?.fields?.some((f) => f.value.includes('100/100 HP')));
      assert.ok(embed?.fields?.some((f) => f.value.includes('80'))); // 100 - 20 gold
    });
  });

  // ─── 6. /adventure leaderboard ────────────────────────────────────────────────

  describe('/adventure leaderboard Subcommand', () => {
    it('displays empty state when no adventurers registered in guild', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_lb_empty',
        member: { user: { id: USER_HERO } },
        data: {
          name: 'adventure',
          options: [{ name: 'leaderboard' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('No adventurers'));
    });

    it('displays ranked list of top adventurers with medals', async () => {
      const p1 = await getOrCreatePlayer(GUILD_ID, 'u1', 'warrior', 'Thor');
      p1.level = 8;
      await p1.save();

      const p2 = await getOrCreatePlayer(GUILD_ID, 'u2', 'mage', 'Loki');
      p2.level = 6;
      await p2.save();

      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_lb_populated',
        member: { user: { id: USER_HERO } },
        data: {
          name: 'adventure',
          options: [{ name: 'leaderboard', options: [{ name: 'limit', value: 5 }] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Hall of Fame'));
      assert.ok(embed?.description?.includes('🥇'));
      assert.ok(embed?.description?.includes('Thor'));
      assert.ok(embed?.description?.includes('🥈'));
      assert.ok(embed?.description?.includes('Loki'));
    });
  });

  // ─── 7. Component Handler & Security Validation ───────────────────────────────

  describe('handleAdventureComponent Routing & Authorization', () => {
    it('rejects intruder clicks with ephemeral warning when customId contains ownerId', async () => {
      const component = {
        token: 'tok_comp_intruder',
      } as unknown as APIMessageComponentInteraction;

      await handleAdventureComponent(
        'tok_comp_intruder',
        `adv_choice:${USER_HERO}:0`,
        USER_INTRUDER, // Intruder clicked
        GUILD_ID,
        component,
      );

      assert.equal(interceptedResponses.length, 0); // No message edit
      assert.equal(interceptedFollowUps.length, 1); // Ephemeral follow-up sent
      assert.ok(interceptedFollowUps[0].options.embeds?.[0].title?.includes('Unauthorized'));
      assert.equal(interceptedFollowUps[0].options.ephemeral, true);
    });

    it('rejects intruder clicks when message interaction user id belongs to session owner', async () => {
      const component = {
        token: 'tok_comp_intruder_2',
        message: {
          interaction: {
            user: { id: USER_HERO },
          },
        },
      } as unknown as APIMessageComponentInteraction;

      await handleAdventureComponent(
        'tok_comp_intruder_2',
        'adv_choice:0', // Generic format without userId in customId
        USER_INTRUDER, // Intruder
        GUILD_ID,
        component,
      );

      assert.equal(interceptedResponses.length, 0);
      assert.equal(interceptedFollowUps.length, 1);
      assert.ok(interceptedFollowUps[0].options.embeds?.[0].title?.includes('Unauthorized'));
    });

    it('processes choice and updates message when authorized owner clicks', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_HERO, 'warrior', 'Arthur');
      player.dungeon.active = true;
      player.dungeon.floor = 1;
      player.dungeon.choices = ['Strike', 'Defend', 'Cast'];
      await player.save();

      const component = {
        token: 'tok_comp_owner',
      } as unknown as APIMessageComponentInteraction;

      await handleAdventureComponent(
        'tok_comp_owner',
        `adv_choice:${USER_HERO}:0`,
        USER_HERO, // Authorized owner
        GUILD_ID,
        component,
      );

      assert.equal(interceptedFollowUps.length, 0);
      assert.equal(interceptedResponses.length, 1);

      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Floor'));
      assert.ok(res.components?.[0]);
    });
  });

  // ─── 8. Guild Boundary & Error Isolation ──────────────────────────────────────

  describe('Guild Boundary & Subcommand Routing', () => {
    it('returns error embed when command is executed outside of a guild', async () => {
      const dmInteraction = {
        guild_id: undefined,
        token: 'tok_dm',
        data: { name: 'adventure' },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(dmInteraction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Error'));
    });

    it('returns polite error embed when unknown subcommand is requested', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_unknown_sub',
        data: {
          name: 'adventure',
          options: [{ name: 'fly_to_space' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleAdventureCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Unknown Subcommand'));
    });
  });
});
