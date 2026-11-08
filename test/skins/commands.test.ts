/**
 * test/skins/commands.test.ts
 * Unit tests for Service 7: Collector Skins & Cosmetics (/skins, /unbox) Slash Command Suite & Component Routing:
 * - Central Command Registry lookup & schema validation
 * - /skins catalog subcommand
 * - /skins wardrobe subcommand (invoker & target user)
 * - /skins equip subcommand (success & error cases)
 * - /skins buy subcommand (success, insufficient funds, already owned)
 * - /unbox command (success celebratory embed, insufficient balance, DM rejection)
 * - handleSkinsComponent interactive routing (skin_equip, skin_select, unbox_again, skin_wardrobe, skin_catalog)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import { getCommand, registerSkinsCommands } from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleSkinsCommand,
  handleUnboxCommand,
  handleSkinsComponent,
  skinsCommand,
  unboxCommand,
} from '@/commands/skins';
import {
  enableTestMode,
  clearTestStore,
  setTestUserSkins,
  getUserSkins,
  setTestBalance,
  getTestBalance,
  SKIN_CATALOG,
} from '@/lib/skins/skin-service';

describe('Skins & Cosmetics Slash Command Suite & Component Router', () => {
  const GUILD_ID = 'guild_skins_cmd_111';
  const USER_ID = 'user_collector_222';
  const TARGET_USER_ID = 'user_friend_333';

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

  // Helper to create mock slash command interaction
  function makeCommandInteraction(
    name: string,
    subcommandName?: string,
    subcommandOptions: Array<{ name: string; value: unknown }> = [],
    guildId: string | null = GUILD_ID,
    userId: string = USER_ID,
  ): APIChatInputApplicationCommandInteraction {
    return {
      id: 'mock_interaction_id',
      application_id: 'mock_app_id',
      type: 2, // ApplicationCommand
      token: 'mock_token_abc',
      version: 1,
      guild_id: guildId as string,
      channel: { id: 'channel_1', type: 0 },
      member: {
        user: { id: userId, username: 'CollectorUser', discriminator: '0001', avatar: null },
        roles: [],
        joined_at: new Date().toISOString(),
        deaf: false,
        mute: false,
        permissions: '0',
      },
      data: {
        id: 'cmd_id',
        name,
        type: 1,
        options: subcommandName
          ? [
              {
                name: subcommandName,
                type: 1, // Subcommand
                options: subcommandOptions,
              },
            ]
          : subcommandOptions,
      },
    } as unknown as APIChatInputApplicationCommandInteraction;
  }

  // Helper to create mock component interaction
  function makeComponentInteraction(
    customId: string,
    values?: string[],
    guildId: string | null = GUILD_ID,
    userId: string = USER_ID,
  ): APIMessageComponentInteraction {
    return {
      id: 'mock_comp_id',
      application_id: 'mock_app_id',
      type: 3, // MessageComponent
      token: 'mock_comp_token_xyz',
      version: 1,
      guild_id: guildId as string,
      channel: { id: 'channel_1', type: 0 },
      member: {
        user: { id: userId, username: 'CollectorUser', discriminator: '0001', avatar: null },
        roles: [],
        joined_at: new Date().toISOString(),
        deaf: false,
        mute: false,
        permissions: '0',
      },
      data: {
        custom_id: customId,
        component_type: values ? 3 : 2, // 3 for select menu, 2 for button
        values,
      },
    } as unknown as APIMessageComponentInteraction;
  }

  // ─── 1. Command Registry Integration ──────────────────────────────────────────

  describe('Central Command Registry Integration', () => {
    it('registers /skins with economy category and 4 subcommands', () => {
      registerSkinsCommands();
      const cmd = getCommand('skins');
      assert.ok(cmd);
      assert.equal(cmd.name, 'skins');
      assert.equal(cmd.category, 'economy');

      const options = cmd.options as Array<{ name: string; type: number }>;
      assert.equal(options.length, 4);

      const subcommandNames = options.map((o) => o.name);
      assert.ok(subcommandNames.includes('catalog'));
      assert.ok(subcommandNames.includes('wardrobe'));
      assert.ok(subcommandNames.includes('equip'));
      assert.ok(subcommandNames.includes('buy'));
    });

    it('registers /unbox with economy category for mystery lootbox unboxing', () => {
      registerSkinsCommands();
      const cmd = getCommand('unbox');
      assert.ok(cmd);
      assert.equal(cmd.name, 'unbox');
      assert.equal(cmd.category, 'economy');
    });

    it('verifies subcommand option choices for /skins equip and /skins buy', () => {
      const cmd = getCommand('skins')!;
      const options = cmd.options as Array<{
        name: string;
        options?: Array<{ name: string; choices?: Array<{ name: string; value: string }> }>;
      }>;

      const equipCmd = options.find((o) => o.name === 'equip');
      assert.ok(equipCmd?.options?.[0]?.choices);
      assert.equal(equipCmd.options[0].choices.length, 10);

      const buyCmd = options.find((o) => o.name === 'buy');
      assert.ok(buyCmd?.options?.[0]?.choices);
      assert.equal(buyCmd.options[0].choices.length, 10);
    });
  });

  // ─── 2. /skins catalog Subcommand ───────────────────────────────────────────

  describe('/skins catalog Subcommand', () => {
    it('renders the collector skin catalog embed with prices and select menu', async () => {
      const interaction = makeCommandInteraction('skins', 'catalog');
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds);
      assert.equal(res.options.embeds[0].title, '📖 Collector Skins & Cosmetics Catalog');
      assert.equal(res.options.embeds[0].fields?.length, 5); // 5 tiers
      assert.ok(res.options.components && res.options.components.length > 0);
    });
  });

  // ─── 3. /skins wardrobe Subcommand ──────────────────────────────────────────

  describe('/skins wardrobe Subcommand', () => {
    it("displays invoking user's cosmetics wardrobe by default", async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: ['neon_blue', 'golden_sovereign'],
        equippedSkin: 'golden_sovereign',
        totalLootboxesOpened: 7,
      });

      const interaction = makeCommandInteraction('skins', 'wardrobe');
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      const embed = res.options.embeds![0];

      assert.ok(embed.title?.includes('Your Cosmetics Wardrobe'));
      assert.ok(embed.description?.includes('Golden Sovereign Frame'));
      assert.ok(embed.description?.includes('7'));
      assert.ok(res.options.components && res.options.components.length > 0);
    });

    it("displays target user's cosmetics wardrobe when user option is passed", async () => {
      setTestUserSkins(GUILD_ID, TARGET_USER_ID, {
        unlockedSkins: ['neon_blue', 'astral_dragon'],
        equippedSkin: 'astral_dragon',
        totalLootboxesOpened: 15,
      });

      const interaction = makeCommandInteraction('skins', 'wardrobe', [
        { name: 'user', value: TARGET_USER_ID },
      ]);
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      const embed = res.options.embeds![0];

      assert.ok(embed.title?.includes(`<@${TARGET_USER_ID}>`));
      assert.ok(embed.description?.includes('Astral Dragon Frame'));
      assert.ok(embed.description?.includes('15'));
      // Target member wardrobe has no components for security
      assert.deepEqual(res.options.components, []);
    });
  });

  // ─── 4. /skins equip Subcommand ─────────────────────────────────────────────

  describe('/skins equip Subcommand', () => {
    it('equips an unlocked skin successfully and responds with success embed', async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: ['neon_blue', 'stone_slate'],
        equippedSkin: 'neon_blue',
      });

      const interaction = makeCommandInteraction('skins', 'equip', [
        { name: 'skin', value: 'stone_slate' },
      ]);
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds);
      assert.ok(res.options.embeds[0].title?.includes('Cosmetic Skin Equipped!'));

      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(userSkins.equippedSkin, 'stone_slate');
    });

    it('returns error embed when user tries to equip a locked skin', async () => {
      const interaction = makeCommandInteraction('skins', 'equip', [
        { name: 'skin', value: 'crimson_overdrive' },
      ]);
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds![0].title?.includes('Cannot Equip Skin'));
    });

    it('returns error embed when skin option is missing', async () => {
      const interaction = makeCommandInteraction('skins', 'equip', []);
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds![0].title?.includes('Missing Parameter'));
    });
  });

  // ─── 5. /skins buy Subcommand ───────────────────────────────────────────────

  describe('/skins buy Subcommand', () => {
    it('purchases a skin when user has enough coins', async () => {
      setTestBalance(GUILD_ID, USER_ID, 1000);

      const interaction = makeCommandInteraction('skins', 'buy', [
        { name: 'skin', value: 'emerald_gleam' },
      ]);
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds![0].title?.includes('Skin Purchased!'));
      assert.ok(res.options.embeds![0].description?.includes('350 coins'));
      assert.ok(res.options.embeds![0].description?.includes('650 coins'));

      assert.equal(getTestBalance(GUILD_ID, USER_ID), 650);
      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      assert.ok(userSkins.unlockedSkins.includes('emerald_gleam'));
    });

    it('rejects purchase when user has insufficient coins', async () => {
      setTestBalance(GUILD_ID, USER_ID, 100);

      const interaction = makeCommandInteraction('skins', 'buy', [
        { name: 'skin', value: 'golden_sovereign' }, // costs 2000
      ]);
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds![0].title?.includes('Purchase Failed'));
      assert.equal(getTestBalance(GUILD_ID, USER_ID), 100);
    });

    it('rejects purchase when user already owns the skin', async () => {
      setTestBalance(GUILD_ID, USER_ID, 2000);

      const interaction = makeCommandInteraction('skins', 'buy', [
        { name: 'skin', value: 'neon_blue' },
      ]);
      await handleSkinsCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds![0].title?.includes('Purchase Failed'));
      assert.ok(res.options.embeds![0].description?.includes('already own'));
      assert.equal(getTestBalance(GUILD_ID, USER_ID), 2000);
    });
  });

  // ─── 6. /unbox Command ──────────────────────────────────────────────────────

  describe('/unbox Command', () => {
    it('opens a lootbox for 250 coins with celebratory embed and unbox again button', async () => {
      setTestBalance(GUILD_ID, USER_ID, 1000);

      const interaction = makeCommandInteraction('unbox');
      await handleUnboxCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      const embed = res.options.embeds![0];

      assert.ok(embed.title?.includes('UNBOXING'));
      assert.ok(embed.description?.includes('🎁 ➔ 💥 ➔'));
      assert.ok(res.options.components && res.options.components.length > 0);

      // Verify Unbox Again button is present
      const actionRow = res.options.components[0] as { components: Array<{ custom_id?: string }> };
      assert.ok(actionRow.components.some((c) => c.custom_id === 'unbox_again'));

      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(userSkins.totalLootboxesOpened, 1);
    });

    it('rejects /unbox when user has less than 250 coins', async () => {
      setTestBalance(GUILD_ID, USER_ID, 150);

      const interaction = makeCommandInteraction('unbox');
      await handleUnboxCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0];
      assert.ok(res.options.embeds![0].title?.includes('Insufficient Coins'));
      assert.ok(res.options.embeds![0].description?.includes('250 coins'));
      assert.ok(res.options.embeds![0].description?.includes('150 coins'));

      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(userSkins.totalLootboxesOpened, 0);
    });

    it('rejects /unbox when executed outside of a server (in DMs)', async () => {
      const interaction = makeCommandInteraction('unbox', undefined, [], null);
      await handleUnboxCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds![0].description?.includes('can only be used in a server'));
    });
  });

  // ─── 7. handleSkinsComponent Interactive Routing ─────────────────────────────

  describe('handleSkinsComponent Interactive Routing', () => {
    it('handles skin_equip:<skinId> button click and equips skin', async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: ['neon_blue', 'emerald_gleam'],
        equippedSkin: 'neon_blue',
      });

      const component = makeComponentInteraction('skin_equip:emerald_gleam');
      await handleSkinsComponent(
        'token_1',
        'skin_equip:emerald_gleam',
        USER_ID,
        GUILD_ID,
        component,
      );

      assert.equal(interceptedResponses.length, 1);
      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(userSkins.equippedSkin, 'emerald_gleam');
    });

    it('handles skin_select dropdown menu selection and equips skin', async () => {
      setTestUserSkins(GUILD_ID, USER_ID, {
        unlockedSkins: ['neon_blue', 'sunset_amber'],
        equippedSkin: 'neon_blue',
      });

      const component = makeComponentInteraction('skin_select', ['sunset_amber']);
      await handleSkinsComponent('token_2', 'skin_select', USER_ID, GUILD_ID, component);

      assert.equal(interceptedResponses.length, 1);
      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(userSkins.equippedSkin, 'sunset_amber');
    });

    it('handles unbox_again button and opens another lootbox', async () => {
      setTestBalance(GUILD_ID, USER_ID, 500);

      const component = makeComponentInteraction('unbox_again');
      await handleSkinsComponent('token_3', 'unbox_again', USER_ID, GUILD_ID, component);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds![0].title?.includes('UNBOXING'));

      const userSkins = await getUserSkins(GUILD_ID, USER_ID);
      assert.equal(userSkins.totalLootboxesOpened, 1);
    });

    it('handles unbox_again button when user has insufficient coins', async () => {
      setTestBalance(GUILD_ID, USER_ID, 50);

      const component = makeComponentInteraction('unbox_again');
      await handleSkinsComponent('token_4', 'unbox_again', USER_ID, GUILD_ID, component);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds![0].title?.includes('Insufficient Coins'));
    });

    it('handles skin_wardrobe button and displays wardrobe embed', async () => {
      const component = makeComponentInteraction('skin_wardrobe');
      await handleSkinsComponent('token_5', 'skin_wardrobe', USER_ID, GUILD_ID, component);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds![0].title?.includes('Your Cosmetics Wardrobe'));
    });

    it('handles skin_catalog button and displays catalog embed', async () => {
      const component = makeComponentInteraction('skin_catalog');
      await handleSkinsComponent('token_6', 'skin_catalog', USER_ID, GUILD_ID, component);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds![0].title?.includes('Collector Skins & Cosmetics Catalog'));
    });

    it('rejects component interaction outside of a server', async () => {
      const component = makeComponentInteraction('unbox_again', undefined, null);
      await handleSkinsComponent('token_7', 'unbox_again', USER_ID, '', component);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds![0].description?.includes('can only be used in a server'));
    });
  });
});
