/**
 * test/modmail/commands.test.ts
 * Unit tests for Anonymous Modmail Relay — Slash Commands & Component Handlers:
 * - Central Command Registry lookup & subcommands schema verification
 * - Permission checks (MANAGE_GUILD required for config, MANAGE_MESSAGES baseline)
 * - /modmail config (viewing settings, updating category, staff_role, log_channel, enabled)
 * - /modmail open (opening thread with member, disabled gating, active thread deduplication)
 * - /modmail reply (anonymous default, named staff reply, invalid channel check)
 * - /modmail close (closing active thread with reason, non-modmail channel check)
 * - /modmail canned (list, add, remove, and send canned snippet)
 * - handleModmailComponent (mm_close:<channelId> button interaction)
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
  registerModmailCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleModmailCommand,
  handleModmailConfigSubcommand,
  handleModmailOpenSubcommand,
  handleModmailReplySubcommand,
  handleModmailCloseSubcommand,
  handleModmailCannedSubcommand,
  handleModmailComponent,
} from '@/commands/modmail';
import {
  enableTestMode,
  clearTestStore,
  getModmailConfig,
  setModmailConfig,
  openModmailThread,
  addCannedResponse,
  getCannedResponse,
} from '@/lib/modmail/modmail-service';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Anonymous Modmail Relay — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_mm_cmd_888';
  const CHANNEL_GENERAL = 'channel_general_111';
  const MODMAIL_CHANNEL_ID = 'chan_mm-0001';
  const USER_ADMIN = 'user_admin_001';
  const USER_MOD = 'user_mod_002';
  const USER_MEMBER = 'user_member_003';
  const STAFF_ROLE = 'role_staff_777';
  const CATEGORY_ID = 'category_mm_888';
  const LOG_CHANNEL_ID = 'channel_logs_999';

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
    it('registers /modmail with moderation category and 5 subcommands', () => {
      registerModmailCommands();
      const cmd = getCommand('modmail');
      assert.ok(cmd, 'modmail command should be found in registry');
      assert.strictEqual(cmd.name, 'modmail');
      assert.strictEqual(cmd.category, 'moderation');
      assert.strictEqual(
        cmd.default_member_permissions,
        PermissionFlags.MANAGE_MESSAGES.toString(),
      );
      assert.strictEqual(cmd.options?.length, 5);

      const subcommands = (cmd.options as Array<{ name: string }>).map((o) => o.name);
      assert.ok(subcommands.includes('config'));
      assert.ok(subcommands.includes('open'));
      assert.ok(subcommands.includes('reply'));
      assert.ok(subcommands.includes('close'));
      assert.ok(subcommands.includes('canned'));
    });
  });

  // ─── 2. /modmail config Subcommand ──────────────────────────────────────────

  describe('/modmail config Subcommand', () => {
    it('rejects /modmail config when user lacks MANAGE_GUILD permission', async () => {
      await handleModmailConfigSubcommand(
        'tok_cfg_1',
        GUILD_ID,
        '0', // No permissions
        [{ name: 'enabled', value: true }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.ephemeral, true);
      assert.ok(res.embeds?.[0].title?.includes('Permission Denied'));
      assert.ok(res.embeds?.[0].description?.includes('MANAGE_GUILD'));
    });

    it('displays server configuration overview when no options are provided', async () => {
      await setModmailConfig(GUILD_ID, {
        categoryId: CATEGORY_ID,
        staffRoleIds: [STAFF_ROLE],
        logChannelId: LOG_CHANNEL_ID,
      });

      await handleModmailConfigSubcommand(
        'tok_cfg_2',
        GUILD_ID,
        PermissionFlags.MANAGE_GUILD.toString(),
        [], // Empty options
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Modmail Server Configuration'));
      const catField = embed?.fields?.find((f) => f.name.includes('Category'));
      assert.ok(catField?.value.includes(CATEGORY_ID));
      const roleField = embed?.fields?.find((f) => f.name.includes('Staff Roles'));
      assert.ok(roleField?.value.includes(STAFF_ROLE));
    });

    it('updates modmail settings with provided options', async () => {
      await handleModmailConfigSubcommand(
        'tok_cfg_3',
        GUILD_ID,
        PermissionFlags.MANAGE_GUILD.toString(),
        [
          { name: 'category', value: CATEGORY_ID },
          { name: 'staff_role', value: STAFF_ROLE },
          { name: 'log_channel', value: LOG_CHANNEL_ID },
          { name: 'enabled', value: true },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Configuration Updated'));

      const config = await getModmailConfig(GUILD_ID);
      assert.strictEqual(config.categoryId, CATEGORY_ID);
      assert.strictEqual(config.logChannelId, LOG_CHANNEL_ID);
      assert.strictEqual(config.enabled, true);
      assert.ok(config.staffRoleIds.includes(STAFF_ROLE));
    });
  });

  // ─── 3. /modmail open Subcommand ────────────────────────────────────────────

  describe('/modmail open Subcommand', () => {
    it('opens a modmail thread and replies with success embed', async () => {
      await handleModmailOpenSubcommand(
        'tok_open_1',
        GUILD_ID,
        USER_MOD,
        [
          { name: 'user', value: USER_MEMBER },
          { name: 'category', value: 'appeals' },
          { name: 'message', value: 'We need to discuss your warning.' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Modmail Thread Opened'));
      assert.ok(embed?.description?.includes(USER_MEMBER));
    });

    it('rejects /modmail open when server modmail is disabled', async () => {
      await setModmailConfig(GUILD_ID, { enabled: false });

      await handleModmailOpenSubcommand(
        'tok_open_2',
        GUILD_ID,
        USER_MOD,
        [{ name: 'user', value: USER_MEMBER }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Modmail Disabled'));
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
    });

    it('rejects /modmail open when user already has an active modmail thread', async () => {
      // First open succeeds
      await openModmailThread(GUILD_ID, USER_MEMBER);

      // Second open via command is rejected with polite embed
      await handleModmailOpenSubcommand(
        'tok_open_3',
        GUILD_ID,
        USER_MOD,
        [{ name: 'user', value: USER_MEMBER }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Failed to Open Modmail'));
      assert.ok(embed?.description?.includes('already has an active modmail thread'));
    });

    it('rejects /modmail open when user parameter is omitted', async () => {
      await handleModmailOpenSubcommand(
        'tok_open_4',
        GUILD_ID,
        USER_MOD,
        [],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Missing Parameter'));
    });
  });

  // ─── 4. /modmail reply Subcommand ───────────────────────────────────────────

  describe('/modmail reply Subcommand', () => {
    it('relays anonymous staff reply (default anonymous true) in active thread channel', async () => {
      const opened = await openModmailThread(GUILD_ID, USER_MEMBER);

      await handleModmailReplySubcommand(
        'tok_reply_1',
        GUILD_ID,
        opened.thread.channelId,
        USER_MOD,
        'ModeratorBob',
        [{ name: 'message', value: 'We have processed your request.' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Message Relayed'));
      assert.ok(embed?.description?.includes('Anonymous Staff'));
      assert.ok(embed?.description?.includes('We have processed your request.'));
    });

    it('relays named staff reply when anonymous is false', async () => {
      const opened = await openModmailThread(GUILD_ID, USER_MEMBER);

      await handleModmailReplySubcommand(
        'tok_reply_2',
        GUILD_ID,
        opened.thread.channelId,
        USER_MOD,
        'ModeratorBob',
        [
          { name: 'message', value: 'This is my personal response.' },
          { name: 'anonymous', value: false },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Message Relayed'));
      assert.ok(embed?.description?.includes('ModeratorBob'));
    });

    it('rejects /modmail reply when run outside of a modmail channel', async () => {
      await handleModmailReplySubcommand(
        'tok_reply_3',
        GUILD_ID,
        CHANNEL_GENERAL,
        USER_MOD,
        'ModeratorBob',
        [{ name: 'message', value: 'Hello' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Not a Modmail Channel'));
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
    });

    it('rejects /modmail reply when message content is blank', async () => {
      const opened = await openModmailThread(GUILD_ID, USER_MEMBER);

      await handleModmailReplySubcommand(
        'tok_reply_4',
        GUILD_ID,
        opened.thread.channelId,
        USER_MOD,
        'ModeratorBob',
        [{ name: 'message', value: '   ' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Missing Parameter'));
    });
  });

  // ─── 5. /modmail close Subcommand ───────────────────────────────────────────

  describe('/modmail close Subcommand', () => {
    it('closes active thread and displays closure embed with reason', async () => {
      const opened = await openModmailThread(GUILD_ID, USER_MEMBER);

      await handleModmailCloseSubcommand(
        'tok_close_1',
        GUILD_ID,
        opened.thread.channelId,
        USER_MOD,
        [{ name: 'reason', value: 'User inquiry completed' }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Modmail Thread Closed'));
      assert.ok(embed?.description?.includes('User inquiry completed'));
      assert.ok(embed?.description?.includes(USER_MOD));
    });

    it('rejects /modmail close in non-modmail channel', async () => {
      await handleModmailCloseSubcommand(
        'tok_close_2',
        GUILD_ID,
        CHANNEL_GENERAL,
        USER_MOD,
        [],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Not a Modmail Channel'));
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
    });
  });

  // ─── 6. /modmail canned Subcommand ──────────────────────────────────────────

  describe('/modmail canned Subcommand', () => {
    it('lists canned snippets or returns empty notice', async () => {
      // Empty state
      await handleModmailCannedSubcommand(
        'tok_canned_1',
        GUILD_ID,
        CHANNEL_GENERAL,
        USER_MOD,
        'Staff',
        [{ name: 'action', value: 'list' }],
      );
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Canned Snippets'));

      // Add snippet and list again
      await addCannedResponse(GUILD_ID, 'welcome', 'Welcome to our server!');
      interceptedResponses = [];

      await handleModmailCannedSubcommand(
        'tok_canned_2',
        GUILD_ID,
        CHANNEL_GENERAL,
        USER_MOD,
        'Staff',
        [{ name: 'action', value: 'list' }],
      );
      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Canned Response Snippets'));
      assert.ok(embed?.fields?.[0].name.includes('welcome'));
    });

    it('adds and removes canned snippets via /modmail canned add & remove', async () => {
      // Add snippet
      await handleModmailCannedSubcommand(
        'tok_canned_3',
        GUILD_ID,
        CHANNEL_GENERAL,
        USER_MOD,
        'Staff',
        [
          { name: 'action', value: 'add' },
          { name: 'name', value: 'rules' },
          { name: 'content', value: 'Please see channel #rules.' },
        ],
      );
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Canned Snippet Saved'));

      const saved = await getCannedResponse(GUILD_ID, 'rules');
      assert.strictEqual(saved?.content, 'Please see channel #rules.');

      // Remove snippet
      interceptedResponses = [];
      await handleModmailCannedSubcommand(
        'tok_canned_4',
        GUILD_ID,
        CHANNEL_GENERAL,
        USER_MOD,
        'Staff',
        [
          { name: 'action', value: 'remove' },
          { name: 'name', value: 'rules' },
        ],
      );
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Canned Snippet Removed'));

      const missing = await getCannedResponse(GUILD_ID, 'rules');
      assert.strictEqual(missing, undefined);
    });

    it('sends canned snippet into active modmail channel via /modmail canned send', async () => {
      await addCannedResponse(GUILD_ID, 'appeal_denied', 'Your appeal was reviewed and denied.');
      const opened = await openModmailThread(GUILD_ID, USER_MEMBER);

      await handleModmailCannedSubcommand(
        'tok_canned_5',
        GUILD_ID,
        opened.thread.channelId,
        USER_MOD,
        'ModeratorBob',
        [
          { name: 'action', value: 'send' },
          { name: 'name', value: 'appeal_denied' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Canned Snippet Relayed'));
      assert.ok(embed?.description?.includes('appeal_denied'));
      assert.ok(embed?.description?.includes('Your appeal was reviewed and denied.'));
    });

    it('rejects /modmail canned send when snippet does not exist or channel is invalid', async () => {
      const opened = await openModmailThread(GUILD_ID, USER_MEMBER);

      await handleModmailCannedSubcommand(
        'tok_canned_6',
        GUILD_ID,
        opened.thread.channelId,
        USER_MOD,
        'Staff',
        [
          { name: 'action', value: 'send' },
          { name: 'name', value: 'nonexistent' },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Snippet Not Found'));

      interceptedResponses = [];
      await handleModmailCannedSubcommand(
        'tok_canned_7',
        GUILD_ID,
        CHANNEL_GENERAL, // Not modmail channel
        USER_MOD,
        'Staff',
        [
          { name: 'action', value: 'send' },
          { name: 'name', value: 'any' },
        ],
      );
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Not a Modmail Channel'));
    });
  });

  // ─── 7. Interactive Component Routing ───────────────────────────────────────

  describe('handleModmailComponent Router', () => {
    it('handles mm_close:<channelId> button interaction and closes the thread', async () => {
      const opened = await openModmailThread(GUILD_ID, USER_MEMBER);

      await handleModmailComponent(
        'tok_btn_1',
        `mm_close:${opened.thread.channelId}`,
        USER_MOD,
        GUILD_ID,
        {
          channel_id: opened.thread.channelId,
        } as unknown as APIMessageComponentInteraction,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Modmail Closed'));
      assert.ok(embed?.description?.includes(USER_MOD));
    });

    it('rejects mm_close on non-existent or already closed thread', async () => {
      await handleModmailComponent(
        'tok_btn_2',
        'mm_close:nonexistent_channel',
        USER_MOD,
        GUILD_ID,
        {
          channel_id: 'nonexistent_channel',
        } as unknown as APIMessageComponentInteraction,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Not Found'));
    });
  });

  // ─── 8. Main handleModmailCommand Router ────────────────────────────────────

  describe('handleModmailCommand Router', () => {
    it('routes subcommand interaction properly', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'tok_main_1',
        channel_id: CHANNEL_GENERAL,
        member: {
          user: { id: USER_ADMIN, username: 'Admin' },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'modmail',
          options: [
            {
              name: 'config',
              options: [{ name: 'enabled', value: true }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleModmailCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Configuration Updated'));
    });

    it('rejects command executed outside server (in DMs)', async () => {
      const interaction = {
        guild_id: undefined,
        token: 'tok_dm_1',
        data: { name: 'modmail' },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleModmailCommand(interaction);
      assert.strictEqual(interceptedResponses.length, 1);
      assert.strictEqual(interceptedResponses[0].options.ephemeral, true);
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes('only be used in a server'));
    });
  });
});
