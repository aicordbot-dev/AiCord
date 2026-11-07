/**
 * test/reaction-roles/commands.test.ts
 * Unit tests for Milestone 3 Service 10: /reaction-role Slash Command Suite & Component Routing:
 * - Central Command Registry lookup & schema validation
 * - /reaction-role create (permission check & execution)
 * - /reaction-role add-role and /reaction-role remove-role
 * - /reaction-role publish
 * - /reaction-role list and /reaction-role delete
 * - Component routing for rr_toggle (buttons) and rr_select (dropdowns)
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
  registerReactionRoleCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleReactionRoleCommand,
  handleReactionRoleComponent,
} from '@/commands/reaction-roles';
import {
  enableTestMode,
  clearTestStore,
  createReactionRolePanel,
  addRoleToPanel,
  getReactionRolePanel,
} from '@/lib/reaction-roles/reaction-role-service';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Button & Dropdown Reaction Roles — Commands & Component Handlers', () => {
  const GUILD_ID = 'guild_cmd_rr_505';
  const USER_STAFF = 'user_staff_admin';
  const USER_MEMBER = 'user_member_bob';
  const ROLE_FRONTEND = 'role_fe_101';
  const ROLE_BACKEND = 'role_be_202';

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

  // ─── 1. Command Registry Lookup ──────────────────────────────────────────────

  describe('Command Registry Integration', () => {
    it('registers /reaction-role with utility category and 6 subcommands', () => {
      const cmd = getCommand('reaction-role');
      assert.ok(cmd, 'reaction-role command should be registered in registry');
      assert.equal(cmd.name, 'reaction-role');
      assert.equal(cmd.category, 'utility');
      assert.ok(cmd.options && cmd.options.length === 6);

      const subcommands = (cmd.options as any[]).map((o) => o.name);
      assert.ok(subcommands.includes('create'));
      assert.ok(subcommands.includes('add-role'));
      assert.ok(subcommands.includes('remove-role'));
      assert.ok(subcommands.includes('publish'));
      assert.ok(subcommands.includes('list'));
      assert.ok(subcommands.includes('delete'));
    });
  });

  // ─── 2. /reaction-role create ────────────────────────────────────────────────

  describe('/reaction-role create Subcommand', () => {
    it('rejects panel creation when member lacks MANAGE_ROLES and MANAGE_GUILD permissions', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_create_noperms',
        channel_id: 'chan_general',
        member: {
          user: { id: USER_MEMBER },
          permissions: '0',
        },
        data: {
          name: 'reaction-role',
          options: [
            {
              name: 'create',
              options: [{ name: 'title', value: 'Developer Roles' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Permission Denied'));
      assert.ok(resp.embeds?.[0].description?.includes('Manage Roles'));
    });

    it('creates reaction role panel when user has MANAGE_ROLES permission', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_create_success',
        channel_id: 'chan_roles',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'reaction-role',
          options: [
            {
              name: 'create',
              options: [
                { name: 'title', value: 'Gaming Platforms' },
                { name: 'description', value: 'Pick PC or Console' },
                { name: 'style', value: 'buttons' },
                { name: 'mode', value: 'unique' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Reaction Role Panel Created'));
      assert.ok(resp.embeds?.[0].description?.includes('Gaming Platforms'));
      assert.ok(resp.embeds?.[0].description?.includes('Panel ID:'));
    });
  });

  // ─── 3. /reaction-role add-role & remove-role ────────────────────────────────

  describe('/reaction-role add-role and remove-role Subcommands', () => {
    it('adds a role to an existing panel', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Roles Panel',
      });
      const panelId = (panel as any).id || panel._id.toString();

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_add_role',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'reaction-role',
          options: [
            {
              name: 'add-role',
              options: [
                { name: 'panel_id', value: panelId },
                { name: 'role', value: ROLE_FRONTEND },
                { name: 'label', value: 'Frontend Developer' },
                { name: 'emoji', value: '⚛️' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Role Added'));
      assert.ok(resp.embeds?.[0].description?.includes(ROLE_FRONTEND));

      const updated = await getReactionRolePanel(GUILD_ID, panelId);
      assert.equal(updated?.entries.length, 1);
      assert.equal(updated?.entries[0].label, 'Frontend Developer');
    });

    it('removes a role from an existing panel', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Roles Panel',
      });
      const panelId = (panel as any).id || panel._id.toString();
      await addRoleToPanel(GUILD_ID, panelId, {
        roleId: ROLE_BACKEND,
        label: 'Backend Developer',
      });

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_rem_role',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'reaction-role',
          options: [
            {
              name: 'remove-role',
              options: [
                { name: 'panel_id', value: panelId },
                { name: 'role', value: ROLE_BACKEND },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Role Removed'));

      const updated = await getReactionRolePanel(GUILD_ID, panelId);
      assert.equal(updated?.entries.length, 0);
    });
  });

  // ─── 4. /reaction-role publish ───────────────────────────────────────────────

  describe('/reaction-role publish Subcommand', () => {
    it('rejects publishing when panel is empty', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Empty Pub Panel',
      });
      const panelId = (panel as any).id || panel._id.toString();

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_pub_empty',
        channel_id: 'chan_rules',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'reaction-role',
          options: [
            {
              name: 'publish',
              options: [{ name: 'panel_id', value: panelId }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Empty Panel'));
    });

    it('publishes panel and stores channelId and messageId', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Active Roles',
      });
      const panelId = (panel as any).id || panel._id.toString();
      await addRoleToPanel(GUILD_ID, panelId, {
        roleId: ROLE_FRONTEND,
        label: 'Frontend',
      });

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_pub_success',
        channel_id: 'chan_roles_publish',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'reaction-role',
          options: [
            {
              name: 'publish',
              options: [
                { name: 'panel_id', value: panelId },
                { name: 'channel', value: 'chan_target_channel' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Panel Published'));
      assert.ok(resp.embeds?.[0].description?.includes('chan_target_channel'));

      const updated = await getReactionRolePanel(GUILD_ID, panelId);
      assert.equal(updated?.channelId, 'chan_target_channel');
      assert.ok(updated?.messageId);
    });
  });

  // ─── 5. /reaction-role list & delete ─────────────────────────────────────────

  describe('/reaction-role list and delete Subcommands', () => {
    it('returns empty notice when no panels exist', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_list_empty',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'reaction-role',
          options: [{ name: 'list' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].description?.includes('No reaction role panels'));
    });

    it('lists server panels and successfully deletes a panel', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Temp Panel to Delete',
      });
      const panelId = (panel as any).id || panel._id.toString();

      // List
      const listInteraction = {
        guild_id: GUILD_ID,
        token: 'token_list_panels',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'reaction-role',
          options: [{ name: 'list' }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(listInteraction);
      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Reaction Role Panels'));

      // Delete
      const deleteInteraction = {
        guild_id: GUILD_ID,
        token: 'token_delete_panel',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_ROLES.toString(),
        },
        data: {
          name: 'reaction-role',
          options: [
            {
              name: 'delete',
              options: [{ name: 'panel_id', value: panelId }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleReactionRoleCommand(deleteInteraction);
      assert.equal(interceptedResponses.length, 2);
      assert.ok(interceptedResponses[1].options.embeds?.[0].title?.includes('Panel Deleted'));

      const check = await getReactionRolePanel(GUILD_ID, panelId);
      assert.equal(check, null);
    });
  });

  // ─── 6. Component Handler: rr_toggle & rr_select ─────────────────────────────

  describe('handleReactionRoleComponent Routing', () => {
    it('handles rr_toggle button interaction (adds and removes role)', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Button Toggle Test',
        mode: 'normal',
      });
      const panelId = (panel as any).id || panel._id.toString();
      await addRoleToPanel(GUILD_ID, panelId, {
        roleId: ROLE_FRONTEND,
        label: 'Frontend',
      });

      // 1. Bob clicks button without having role -> added
      const interaction1 = {
        token: 'tok_comp_1',
        member: { roles: [] },
      } as unknown as APIMessageComponentInteraction;

      await handleReactionRoleComponent(
        'tok_comp_1',
        `rr_toggle:${panelId}:${ROLE_FRONTEND}`,
        USER_MEMBER,
        GUILD_ID,
        interaction1,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp1 = interceptedResponses[0].options;
      assert.ok(resp1.embeds?.[0].title?.includes('Role Updated'));
      assert.ok(resp1.embeds?.[0].description?.includes('Granted the'));

      // 2. Bob clicks button when he already has role -> removed
      const interaction2 = {
        token: 'tok_comp_2',
        member: { roles: [ROLE_FRONTEND] },
      } as unknown as APIMessageComponentInteraction;

      await handleReactionRoleComponent(
        'tok_comp_2',
        `rr_toggle:${panelId}:${ROLE_FRONTEND}`,
        USER_MEMBER,
        GUILD_ID,
        interaction2,
      );

      assert.equal(interceptedResponses.length, 2);
      const resp2 = interceptedResponses[1].options;
      assert.ok(resp2.embeds?.[0].description?.includes('Removed the'));
    });

    it('handles rr_select dropdown menu interaction', async () => {
      const panel = await createReactionRolePanel(GUILD_ID, {
        title: 'Dropdown Select Test',
        style: 'select',
        mode: 'normal',
      });
      const panelId = (panel as any).id || panel._id.toString();
      await addRoleToPanel(GUILD_ID, panelId, {
        roleId: ROLE_FRONTEND,
        label: 'Frontend',
      });
      await addRoleToPanel(GUILD_ID, panelId, {
        roleId: ROLE_BACKEND,
        label: 'Backend',
      });

      // Bob selects ROLE_BACKEND
      const interaction = {
        token: 'tok_select_1',
        member: { roles: [ROLE_FRONTEND] },
        data: {
          values: [ROLE_BACKEND],
        },
      } as unknown as APIMessageComponentInteraction;

      await handleReactionRoleComponent(
        'tok_select_1',
        `rr_select:${panelId}`,
        USER_MEMBER,
        GUILD_ID,
        interaction,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Roles Updated'));
      assert.ok(resp.embeds?.[0].description?.includes(`Added: <@&${ROLE_BACKEND}>`));
      assert.ok(resp.embeds?.[0].description?.includes(`Removed: <@&${ROLE_FRONTEND}>`));
    });
  });
});
