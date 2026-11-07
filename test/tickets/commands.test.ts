/**
 * test/tickets/commands.test.ts
 * Unit tests for Phase 38 /ticket Slash Command & Webhook Component Interactions:
 * - Central Command Registry lookup & schema validation
 * - /ticket panel subcommand (MANAGE_GUILD permission check & panel embed generation)
 * - /ticket close subcommand (non-ticket channel rejection & ticket closure with CSAT rating row)
 * - /ticket add <user> subcommand (permission grants & channel containment)
 * - /ticket remove <user> subcommand (permission revocation)
 * - /ticket stats subcommand (server metrics & CSAT display)
 * - handleTicketComponent() routing for:
 *   - ticket_create:<panelId>:<catId> (including quota error handling)
 *   - ticket_claim:<ticketId>
 *   - ticket_close:<ticketId>
 *   - ticket_rate:<ticketId>:<stars>
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import {
  getCommand,
  registerTicketCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import {
  handleTicketCommand,
  handleTicketPanelSubcommand,
  handleTicketCloseSubcommand,
  handleTicketAddSubcommand,
  handleTicketRemoveSubcommand,
  handleTicketStatsSubcommand,
  handleTicketComponent,
} from '@/commands/tickets';
import {
  enableTestMode,
  clearTestStore,
  createTicketPanel,
  openTicket,
  updateTicketChannelId,
  closeTicket,
  getTicket,
} from '@/lib/tickets/ticket-service';
import {
  enableTestMode as enableSubscriptionTestMode,
  clearTestStore as clearSubscriptionTestStore,
  setTestSubscription,
} from '@/lib/premium/entitlements';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Interactive Ticket Hub — Commands & Component Handlers', () => {
  const GUILD_ID = 'guild_cmd_test_404';
  const USER_STAFF = 'user_staff_admin';
  const USER_CLIENT = 'user_client_alice';
  const USER_GUEST = 'user_guest_bob';
  const TICKET_CHANNEL_ID = 'channel_ticket_777';

  let interceptedResponses: Array<{ token: string; options: InteractionResponseOptions }> = [];

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    enableSubscriptionTestMode(true);
    clearSubscriptionTestStore();
    setTestSubscription(GUILD_ID, { tier: 'free' });

    interceptedResponses = [];
    setResponseHandler(async (token, options) => {
      interceptedResponses.push({ token, options });
    });
  });

  afterEach(() => {
    setResponseHandler(null);
    clearTestStore();
    enableTestMode(false);
    clearSubscriptionTestStore();
    enableSubscriptionTestMode(false);
  });

  // ─── 1. Command Registry Lookup ──────────────────────────────────────────────

  describe('Command Registry Integration', () => {
    it('registers /ticket with utility category and 5 subcommands', () => {
      const cmd = getCommand('ticket');
      assert.ok(cmd, 'ticket command should be registered in registry');
      assert.equal(cmd.name, 'ticket');
      assert.equal(cmd.category, 'utility');
      assert.ok(cmd.options && cmd.options.length === 5);

      const subcommands = (cmd.options as any[]).map((o) => o.name);
      assert.ok(subcommands.includes('panel'));
      assert.ok(subcommands.includes('close'));
      assert.ok(subcommands.includes('add'));
      assert.ok(subcommands.includes('remove'));
      assert.ok(subcommands.includes('stats'));
    });
  });

  // ─── 2. /ticket panel Subcommand ─────────────────────────────────────────────

  describe('/ticket panel Subcommand', () => {
    it('rejects panel creation when user lacks MANAGE_GUILD permission', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_panel_noperms',
        channel_id: 'channel_main',
        member: {
          user: { id: USER_CLIENT },
          permissions: '0', // No permissions
        },
        data: {
          name: 'ticket',
          options: [
            {
              name: 'panel',
              options: [{ name: 'title', value: 'Support Hub' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTicketCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Permission Denied'));
      assert.ok(resp.embeds?.[0].description?.includes('MANAGE_GUILD'));
    });

    it('creates ticket panel when user has MANAGE_GUILD permission', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_panel_success',
        channel_id: 'channel_announcements',
        member: {
          user: { id: USER_STAFF },
          permissions: PermissionFlags.MANAGE_GUILD.toString(),
        },
        data: {
          name: 'ticket',
          options: [
            {
              name: 'panel',
              options: [
                { name: 'title', value: 'AiCord VIP Support' },
                { name: 'description', value: 'Open a ticket for instant help' },
                { name: 'support_role', value: 'role_staff_tier2' },
              ],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTicketCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('AiCord VIP Support'));
      assert.ok(resp.components && resp.components.length > 0);
    });
  });

  // ─── 3. /ticket close Subcommand ─────────────────────────────────────────────

  describe('/ticket close Subcommand', () => {
    it('rejects /ticket close when used outside of a ticket channel', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_close_invalid_channel',
        channel_id: 'general_chat_99',
        member: { user: { id: USER_STAFF } },
        data: {
          name: 'ticket',
          options: [{ name: 'close', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTicketCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Not a Ticket Channel'));
    });

    it('closes the ticket and returns CSAT rating row when run in ticket channel', async () => {
      // Create ticket and bind channel ID
      const { ticket } = await openTicket(GUILD_ID, USER_CLIENT, 'general');
      await updateTicketChannelId(GUILD_ID, ticket.ticketId, TICKET_CHANNEL_ID);

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_close_valid',
        channel_id: TICKET_CHANNEL_ID,
        member: { user: { id: USER_STAFF } },
        data: {
          name: 'ticket',
          options: [
            {
              name: 'close',
              options: [{ name: 'reason', value: 'Issue resolved satisfactorily' }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTicketCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Ticket Closed'));
      assert.ok(resp.embeds?.[0].description?.includes('Issue resolved satisfactorily'));
      assert.ok(resp.components && resp.components.length === 1); // 5-star rating row

      // Ticket record updated
      const updated = await getTicket(GUILD_ID, ticket.ticketId);
      assert.equal(updated?.status, 'closed');
      assert.equal(updated?.closedBy, USER_STAFF);
    });
  });

  // ─── 4. /ticket add & /ticket remove Subcommands ─────────────────────────────

  describe('/ticket add and /ticket remove Subcommands', () => {
    it('rejects /ticket add when outside of ticket channel', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_add_fail',
        channel_id: 'random_chat_chan',
        member: { user: { id: USER_STAFF } },
        data: {
          name: 'ticket',
          options: [
            {
              name: 'add',
              options: [{ name: 'user', value: USER_GUEST }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTicketCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Not a Ticket Channel'));
    });

    it('grants access to target member via /ticket add', async () => {
      const { ticket } = await openTicket(GUILD_ID, USER_CLIENT, 'general');
      await updateTicketChannelId(GUILD_ID, ticket.ticketId, TICKET_CHANNEL_ID);

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_add_success',
        channel_id: TICKET_CHANNEL_ID,
        member: { user: { id: USER_STAFF } },
        data: {
          name: 'ticket',
          options: [
            {
              name: 'add',
              options: [{ name: 'user', value: USER_GUEST }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTicketCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Member Added'));
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes(USER_GUEST));
    });

    it('removes target member via /ticket remove', async () => {
      const { ticket } = await openTicket(GUILD_ID, USER_CLIENT, 'general');
      await updateTicketChannelId(GUILD_ID, ticket.ticketId, TICKET_CHANNEL_ID);

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_remove_success',
        channel_id: TICKET_CHANNEL_ID,
        member: { user: { id: USER_STAFF } },
        data: {
          name: 'ticket',
          options: [
            {
              name: 'remove',
              options: [{ name: 'user', value: USER_GUEST }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTicketCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      assert.ok(interceptedResponses[0].options.embeds?.[0].title?.includes('Member Removed'));
      assert.ok(interceptedResponses[0].options.embeds?.[0].description?.includes(USER_GUEST));
    });
  });

  // ─── 5. /ticket stats Subcommand ─────────────────────────────────────────────

  describe('/ticket stats Subcommand', () => {
    it('returns server ticket statistics embed', async () => {
      await openTicket(GUILD_ID, USER_CLIENT, 'general');

      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_stats_req',
        channel_id: 'channel_bot_cmds',
        member: { user: { id: USER_STAFF } },
        data: {
          name: 'ticket',
          options: [{ name: 'stats', options: [] }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTicketCommand(interaction);

      assert.equal(interceptedResponses.length, 1);
      const embed = interceptedResponses[0].options.embeds?.[0];
      assert.ok(embed?.title?.includes('Ticket Hub Statistics'));
      assert.ok(embed?.fields?.some((f) => f.name.includes('Open Tickets')));
    });
  });

  // ─── 6. handleTicketComponent() Interactive Dispatcher ───────────────────────

  describe('handleTicketComponent() Router', () => {
    it('creates ticket on ticket_create button interaction', async () => {
      const panel = await createTicketPanel(GUILD_ID, {
        panelId: 'panel_hub_1',
        title: 'Help Hub',
        description: 'Click to open',
      });

      await handleTicketComponent(
        'token_btn_create',
        `ticket_create:${panel.panelId}:general`,
        USER_CLIENT,
        GUILD_ID,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Ticket Created'));
      assert.ok(resp.embeds?.[0].description?.includes('ticket-0001'));
    });

    it('rejects ticket_create when server ticket limit is reached', async () => {
      const panel = await createTicketPanel(GUILD_ID, {
        panelId: 'panel_quota_hub',
        title: 'Help Hub',
        description: 'Click to open',
      });

      // Fill 3 tickets (Free tier limit)
      await openTicket(GUILD_ID, USER_CLIENT, 'general');
      await openTicket(GUILD_ID, USER_CLIENT, 'general');
      await openTicket(GUILD_ID, USER_CLIENT, 'general');

      // Attempt 4th via button
      await handleTicketComponent(
        'token_btn_create_exceeded',
        `ticket_create:${panel.panelId}:general`,
        USER_CLIENT,
        GUILD_ID,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Ticket Creation Failed'));
      assert.ok(resp.embeds?.[0].description?.includes('Ticket quota reached'));
    });

    it('claims ticket on ticket_claim button interaction', async () => {
      const { ticket } = await openTicket(GUILD_ID, USER_CLIENT, 'general');

      await handleTicketComponent(
        'token_btn_claim',
        `ticket_claim:${ticket.ticketId}`,
        USER_STAFF,
        GUILD_ID,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].fields?.some((f) => f.name.includes('Claimed By')));

      const updated = await getTicket(GUILD_ID, ticket.ticketId);
      assert.equal(updated?.status, 'claimed');
      assert.equal(updated?.claimedBy, USER_STAFF);
    });

    it('closes ticket on ticket_close button interaction', async () => {
      const { ticket } = await openTicket(GUILD_ID, USER_CLIENT, 'general');

      await handleTicketComponent(
        'token_btn_close',
        `ticket_close:${ticket.ticketId}`,
        USER_STAFF,
        GUILD_ID,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Ticket Closed'));
      assert.ok(resp.components && resp.components.length === 1); // CSAT rating row

      const updated = await getTicket(GUILD_ID, ticket.ticketId);
      assert.equal(updated?.status, 'closed');
      assert.equal(updated?.closedBy, USER_STAFF);
    });

    it('records 5-star rating on ticket_rate button interaction', async () => {
      const { ticket } = await openTicket(GUILD_ID, USER_CLIENT, 'general');
      await closeTicket(GUILD_ID, ticket.ticketId, USER_STAFF);

      await handleTicketComponent(
        'token_btn_rate',
        `ticket_rate:${ticket.ticketId}:5`,
        USER_CLIENT,
        GUILD_ID,
      );

      assert.equal(interceptedResponses.length, 1);
      const resp = interceptedResponses[0].options;
      assert.ok(resp.embeds?.[0].title?.includes('Rating Submitted'));
      assert.ok(resp.embeds?.[0].description?.includes('5/5 stars'));

      const updated = await getTicket(GUILD_ID, ticket.ticketId);
      assert.equal(updated?.rating, 5);
    });
  });
});
