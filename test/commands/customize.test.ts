/**
 * test/commands/customize.test.ts
 * Comprehensive unit tests for /customize Slash Command & Component Interactions:
 * - Central Command Registry registration & metadata
 * - UserProfileStyle service & in-memory test store
 * - /customize profile subcommand (view current styling, update themes/bars, validation)
 * - /customize preview subcommand (interactive showcase embed & cycling action rows)
 * - /customize server-theme subcommand (permission check MANAGE_GUILD, guild persistence)
 * - Dynamic Autocomplete for themes and bar styles
 * - Component interaction handler `handleCustomizeInteraction` (theme cycling & profile apply)
 */

import '../test-env';
import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommand,
  registerAllCommands,
  registerCustomizeCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  customizeCommand,
  executeCustomizeCommand,
  handleCustomizeInteraction,
  handleCustomizeAutocomplete,
  buildThemePreviewEmbed,
  buildThemePreviewActionRows,
} from '@/commands/customize';
import {
  enableTestMode,
  clearTestStore,
  getUserProfileStyle,
  updateUserProfileStyle,
  getServerTheme,
  setServerTheme,
} from '@/lib/styles/user-profile-style';
import { UserProfileStyle } from '@/models/UserProfileStyle';
import { PermissionFlags } from '@/lib/discord/permissions';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';

describe('Universal Custom Screens Suite — /customize Slash Command & Interactions', () => {
  const GUILD_ID = 'guild_custom_101';
  const USER_ID = 'user_stylist_202';
  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  before(() => {
    registerCustomizeCommands();
  });

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

  // ─── 1. Command Registry Integration ──────────────────────────────────────

  describe('Central Command Registry Integration', () => {
    it('registers /customize with category "utility"', () => {
      const cmd = getCommand('customize');
      assert.ok(cmd);
      assert.equal(cmd.name, 'customize');
      assert.equal(cmd.category, 'utility');
      assert.ok(cmd.rateLimit);
      assert.equal(cmd.rateLimit?.limit, 5);
    });

    it('exposes subcommands: profile, preview, server-theme', () => {
      const cmd = getCommand('customize');
      assert.ok(cmd);
      const options = cmd.options as Array<{ name: string; type: number }> | undefined;
      assert.ok(options);
      const subNames = options.map((o) => o.name);
      assert.ok(subNames.includes('profile'));
      assert.ok(subNames.includes('preview'));
      assert.ok(subNames.includes('server-theme'));
    });

    it('verifies registerAllCommands() registers customizeCommand seamlessly', () => {
      registerAllCommands();
      const cmd = getCommand('customize');
      assert.ok(cmd);
      assert.equal(cmd.name, 'customize');
    });
  });

  // ─── 2. UserProfileStyle Model & Service ──────────────────────────────────

  describe('UserProfileStyle Model & Service', () => {
    it('initializes default user profile style with cyberpunk rank, gold balance, pipes bar', async () => {
      const style = await getUserProfileStyle(GUILD_ID, USER_ID);
      assert.equal(style.guildId, GUILD_ID);
      assert.equal(style.userId, USER_ID);
      assert.equal(style.rankTheme, 'cyberpunk');
      assert.equal(style.balanceTheme, 'gold');
      assert.equal(style.barStyle, 'pipes');
      assert.deepEqual(style.badges, []);
    });

    it('updates user profile style preferences', async () => {
      const updated = await updateUserProfileStyle(GUILD_ID, USER_ID, {
        rankTheme: 'midnight',
        balanceTheme: 'emerald',
        barStyle: 'blocks',
        badges: ['early_adopter'],
      });

      assert.equal(updated.rankTheme, 'midnight');
      assert.equal(updated.balanceTheme, 'emerald');
      assert.equal(updated.barStyle, 'blocks');
      assert.deepEqual(updated.badges, ['early_adopter']);

      const refetched = await getUserProfileStyle(GUILD_ID, USER_ID);
      assert.equal(refetched.rankTheme, 'midnight');
      assert.equal(refetched.barStyle, 'blocks');
    });

    it('manages server-wide theme configuration', async () => {
      const defaultServerTheme = await getServerTheme(GUILD_ID);
      assert.equal(defaultServerTheme, 'cyberpunk');

      await setServerTheme(GUILD_ID, 'emerald');
      const updatedServerTheme = await getServerTheme(GUILD_ID);
      assert.equal(updatedServerTheme, 'emerald');
    });

    it('validates UserProfileStyle Mongoose schema structure and indexes', () => {
      const doc = new UserProfileStyle({
        guildId: GUILD_ID,
        userId: USER_ID,
      });

      assert.equal(doc.guildId, GUILD_ID);
      assert.equal(doc.userId, USER_ID);
      assert.equal(doc.rankTheme, 'cyberpunk');
      assert.equal(doc.balanceTheme, 'gold');
      assert.equal(doc.barStyle, 'pipes');
      assert.deepEqual(doc.badges, []);

      // Verify compound index
      const indexes = UserProfileStyle.schema.indexes();
      const hasCompoundIndex = indexes.some(
        ([fields, opts]) =>
          fields.guildId === 1 && fields.userId === 1 && (opts as { unique?: boolean })?.unique === true,
      );
      assert.ok(hasCompoundIndex, 'UserProfileStyle must have unique compound index on guildId and userId');
    });
  });

  // ─── 3. /customize profile Subcommand ─────────────────────────────────────

  describe('/customize profile Execution', () => {
    it('displays current profile styling when no options are passed', async () => {
      const interaction = {
        token: 'token_view_profile',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID } },
        data: {
          name: 'customize',
          options: [
            {
              name: 'profile',
              options: [],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Personal Profile Style'));
      assert.ok(embed.description);
      const fields = embed.fields ?? [];
      assert.ok(fields.some((f) => f.name.includes('Rank Card Theme') && f.value.includes('Cyberpunk')));
      assert.ok(fields.some((f) => f.name.includes('Balance & Economy Theme') && f.value.includes('Gold')));
      assert.ok(fields.some((f) => f.name.includes('Progress Bar Style') && f.value.includes('pipes')));
    });

    it('updates profile style when options are provided', async () => {
      const interaction = {
        token: 'token_update_profile',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID } },
        data: {
          name: 'customize',
          options: [
            {
              name: 'profile',
              options: [
                { name: 'rank_theme', value: 'midnight' },
                { name: 'balance_theme', value: 'emerald' },
                { name: 'bar_style', value: 'squares' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Profile Style Updated'));

      // Verify DB / service updated
      const style = await getUserProfileStyle(GUILD_ID, USER_ID);
      assert.equal(style.rankTheme, 'midnight');
      assert.equal(style.balanceTheme, 'emerald');
      assert.equal(style.barStyle, 'squares');
    });

    it('rejects invalid theme with polite error embed', async () => {
      const interaction = {
        token: 'token_invalid_theme',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID } },
        data: {
          name: 'customize',
          options: [
            {
              name: 'profile',
              options: [{ name: 'rank_theme', value: 'invalid_theme_xyz' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Invalid Theme'));
    });

    it('rejects invalid bar style with polite error embed', async () => {
      const interaction = {
        token: 'token_invalid_bar',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID } },
        data: {
          name: 'customize',
          options: [
            {
              name: 'profile',
              options: [{ name: 'bar_style', value: 'invalid_bar_xyz' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Invalid Bar Style'));
    });
  });

  // ─── 4. /customize preview Subcommand ─────────────────────────────────────

  describe('/customize preview Execution', () => {
    it('previews default cyberpunk theme when no theme option passed', async () => {
      const interaction = {
        token: 'token_preview_default',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID } },
        data: {
          name: 'customize',
          options: [
            {
              name: 'preview',
              options: [],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Cyberpunk'));
      assert.equal(embed.color, 0x00f0ff);

      // Verify interactive action rows with cycling buttons
      const components = res.components;
      assert.ok(components && components.length > 0);
    });

    it('previews requested theme with custom colors and progress bar sample', async () => {
      const interaction = {
        token: 'token_preview_frost',
        guild_id: GUILD_ID,
        member: { user: { id: USER_ID } },
        data: {
          name: 'customize',
          options: [
            {
              name: 'preview',
              options: [{ name: 'theme', value: 'frost' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Frost'));
      assert.equal(embed.color, 0x74b9ff);
    });
  });

  // ─── 5. /customize server-theme Subcommand ────────────────────────────────

  describe('/customize server-theme Execution & Permissions', () => {
    it('rejects execution when caller lacks MANAGE_GUILD permission', async () => {
      const interaction = {
        token: 'token_no_perm',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: '0', // No permissions
        },
        data: {
          name: 'customize',
          options: [
            {
              name: 'server-theme',
              options: [{ name: 'theme', value: 'retro' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Permission Denied'));
    });

    it('sets server theme when caller has MANAGE_GUILD permission', async () => {
      const interaction = {
        token: 'token_with_perm',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'customize',
          options: [
            {
              name: 'server-theme',
              options: [{ name: 'theme', value: 'emerald' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Server Default Theme Updated'));
      assert.ok(embed.description?.includes('Emerald'));

      // Check server theme updated
      const serverTheme = await getServerTheme(GUILD_ID);
      assert.equal(serverTheme, 'emerald');
    });

    it('rejects invalid server theme with error embed', async () => {
      const interaction = {
        token: 'token_invalid_server_theme',
        guild_id: GUILD_ID,
        member: {
          user: { id: USER_ID },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'customize',
          options: [
            {
              name: 'server-theme',
              options: [{ name: 'theme', value: 'non_existent' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await executeCustomizeCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Invalid Theme'));
    });
  });

  // ─── 6. Autocomplete Handler ──────────────────────────────────────────────

  describe('handleCustomizeAutocomplete()', () => {
    it('filters themes matching focused query', async () => {
      const choices = await handleCustomizeAutocomplete({
        interaction: {},
        commandName: 'customize',
        focusedOption: { name: 'theme', value: 'mid', type: 3 },
        guildId: GUILD_ID,
        userId: USER_ID,
      });

      assert.equal(choices.length, 1);
      assert.equal(choices[0].value, 'midnight');
    });

    it('returns all theme choices when query is empty', async () => {
      const choices = await handleCustomizeAutocomplete({
        interaction: {},
        commandName: 'customize',
        focusedOption: { name: 'rank_theme', value: '', type: 3 },
        guildId: GUILD_ID,
        userId: USER_ID,
      });

      assert.equal(choices.length, 6);
    });

    it('filters bar styles matching focused query', async () => {
      const choices = await handleCustomizeAutocomplete({
        interaction: {},
        commandName: 'customize',
        focusedOption: { name: 'bar_style', value: 'pipe', type: 3 },
        guildId: GUILD_ID,
        userId: USER_ID,
      });

      assert.equal(choices.length, 1);
      assert.equal(choices[0].value, 'pipes');
    });

    it('returns all bar style choices when query is empty', async () => {
      const choices = await handleCustomizeAutocomplete({
        interaction: {},
        commandName: 'customize',
        focusedOption: { name: 'bar_style', value: '', type: 3 },
        guildId: GUILD_ID,
        userId: USER_ID,
      });

      assert.equal(choices.length, 4);
    });
  });

  // ─── 7. Component Interaction Handling (Preview Buttons) ──────────────────

  describe('handleCustomizeInteraction()', () => {
    it('switches preview to target theme when a theme button is clicked', async () => {
      await handleCustomizeInteraction(
        'token_btn_midnight',
        ['preview', 'midnight'],
        USER_ID,
        { guild_id: GUILD_ID },
      );

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Midnight'));
      assert.equal(embed.color, 0x6c5ce7);
    });

    it('cycles sequentially to next theme with next button', async () => {
      // cyberpunk -> midnight
      await handleCustomizeInteraction(
        'token_btn_next',
        ['preview', 'next', 'cyberpunk'],
        USER_ID,
        { guild_id: GUILD_ID },
      );

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Midnight'));
    });

    it('cycles backward with circular wrap with prev button', async () => {
      // cyberpunk -> frost (circular wrap)
      await handleCustomizeInteraction(
        'token_btn_prev',
        ['preview', 'prev', 'cyberpunk'],
        USER_ID,
        { guild_id: GUILD_ID },
      );

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.title?.includes('Frost'));
    });

    it('applies previewed theme directly to rank card via set_rank button', async () => {
      await handleCustomizeInteraction(
        'token_btn_set_rank',
        ['set_rank', 'emerald'],
        USER_ID,
        { guild_id: GUILD_ID },
      );

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.fields?.some((f) => f.name.includes('Rank Card Updated')));

      const style = await getUserProfileStyle(GUILD_ID, USER_ID);
      assert.equal(style.rankTheme, 'emerald');
    });

    it('applies previewed theme directly to balance display via set_bal button', async () => {
      await handleCustomizeInteraction(
        'token_btn_set_bal',
        ['set_bal', 'retro'],
        USER_ID,
        { guild_id: GUILD_ID },
      );

      assert.equal(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed);
      assert.ok(embed.fields?.some((f) => f.name.includes('Balance Theme Updated')));

      const style = await getUserProfileStyle(GUILD_ID, USER_ID);
      assert.equal(style.balanceTheme, 'retro');
    });
  });
});
