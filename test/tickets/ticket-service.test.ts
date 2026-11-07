/**
 * test/tickets/ticket-service.test.ts
 * Unit tests for Phase 38 Interactive Ticket Hub Service Engine:
 * - Panel creation with custom categories, roles, and naming scheme
 * - Default category fallback when categories are omitted
 * - Entitlement gating & quota enforcement across tiers:
 *   - Free tier limit: max 3 open tickets enforced (4th ticket rejected)
 *   - Pro tier limit: 25 open tickets
 *   - Ultimate/Lifetime tier limit: unlimited open tickets allowed
 *   - Reopening capacity when tickets are closed
 * - Channel specification generator with strict permission containment
 * - Ticket claiming mechanics & staff assignments
 * - Ticket closing mechanics, close reason recording, and duration
 * - Markdown and HTML transcript generators with metadata and message logs
 * - 5-star CSAT customer satisfaction ratings and action row generation
 * - Ticket hub statistics aggregation
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTicketPanel,
  buildTicketPanelEmbed,
  openTicket,
  buildTicketWelcomeEmbed,
  claimTicket,
  closeTicket,
  rateTicket,
  buildRatingActionRow,
  getTicketStats,
  buildTicketStatsEmbed,
  generateMarkdownTranscript,
  generateHtmlTranscript,
  buildTicketChannelSpec,
  getTicket,
  getTicketByChannel,
  getTicketPanel,
  enableTestMode,
  clearTestStore,
} from '@/lib/tickets/ticket-service';
import {
  enableTestMode as enableSubscriptionTestMode,
  clearTestStore as clearSubscriptionTestStore,
  setTestSubscription,
} from '@/lib/premium/entitlements';

describe('Interactive Ticket Hub — Ticket Service Engine', () => {
  const GUILD_FREE = 'guild_ticket_free_101';
  const GUILD_PRO = 'guild_ticket_pro_202';
  const GUILD_ULTIMATE = 'guild_ticket_ultimate_303';
  const USER_ALICE = 'user_alice_1';
  const USER_BOB = 'user_bob_2';
  const STAFF_CHARLIE = 'staff_charlie_3';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
    enableSubscriptionTestMode(true);
    clearSubscriptionTestStore();

    // Default subscription tiers
    setTestSubscription(GUILD_FREE, { tier: 'free' });
    setTestSubscription(GUILD_PRO, {
      tier: 'pro',
      expiresAt: new Date(Date.now() + 86400000 * 30),
    });
    setTestSubscription(GUILD_ULTIMATE, {
      tier: 'ultimate',
      expiresAt: new Date(Date.now() + 86400000 * 30),
    });
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
    clearSubscriptionTestStore();
    enableSubscriptionTestMode(false);
  });

  // ─── 1. Panel Creation & Embed Construction ──────────────────────────────────

  describe('Ticket Panel Management', () => {
    it('creates and retrieves a ticket panel with custom configuration', async () => {
      const panel = await createTicketPanel(GUILD_FREE, {
        title: 'Billing & Account Support',
        description: 'Need help with your invoice or account? Open a ticket below.',
        categories: [
          { id: 'billing', label: 'Billing Inquiries', emoji: '💳', description: 'Payments & invoices' },
          { id: 'tech', label: 'Technical Issues', emoji: '🔧', description: 'Bot configuration bugs' },
        ],
        supportRoleIds: ['role_support_99', 'role_admin_100'],
        categoryId: 'cat_tickets_123',
        namingScheme: 'support-{number}',
      });

      assert.ok(panel);
      assert.equal(panel.guildId, GUILD_FREE);
      assert.equal(panel.title, 'Billing & Account Support');
      assert.equal(panel.categories.length, 2);
      assert.equal(panel.supportRoleIds.length, 2);
      assert.equal(panel.namingScheme, 'support-{number}');

      const retrieved = await getTicketPanel(GUILD_FREE, panel.panelId);
      assert.ok(retrieved);
      assert.equal(retrieved.panelId, panel.panelId);
    });

    it('falls back to default General Support category when none provided', async () => {
      const panel = await createTicketPanel(GUILD_FREE, {
        title: 'Quick Support',
        description: 'Open a ticket for assistance.',
      });

      assert.equal(panel.categories.length, 1);
      assert.equal(panel.categories[0].id, 'general');
      assert.equal(panel.categories[0].label, 'General Support');
    });

    it('rejects panel creation with missing required fields', async () => {
      await assert.rejects(
        () => createTicketPanel('', { title: 'Test', description: 'Test' }),
        /guildId is required/,
      );
      await assert.rejects(
        () => createTicketPanel(GUILD_FREE, { title: '', description: 'Test' }),
        /title is required/,
      );
      await assert.rejects(
        () => createTicketPanel(GUILD_FREE, { title: 'Test', description: '' }),
        /description is required/,
      );
    });

    it('builds ticket panel embed and interactive buttons', async () => {
      const panel = await createTicketPanel(GUILD_FREE, {
        panelId: 'panel_alpha',
        title: 'Community Helpdesk',
        description: 'Select a category to contact moderation staff.',
        categories: [
          { id: 'general', label: 'General Help', emoji: '🎫' },
          { id: 'report', label: 'Report User', emoji: '🚨' },
        ],
      });

      const { embed, components } = buildTicketPanelEmbed(panel);
      assert.equal(embed.title, 'Community Helpdesk');
      assert.equal(embed.description, 'Select a category to contact moderation staff.');
      assert.ok(embed.fields && embed.fields.length === 2);
      assert.equal(components.length, 1);

      const buttons = components[0].components as any[];
      assert.equal(buttons.length, 2);
      assert.equal(buttons[0].custom_id, 'ticket_create:panel_alpha:general');
      assert.equal(buttons[1].custom_id, 'ticket_create:panel_alpha:report');
    });
  });

  // ─── 2. Entitlement Gating & Quota Checks ────────────────────────────────────

  describe('Entitlement Gating & Ticket Quota Management', () => {
    it('enforces Free tier limit of 3 open tickets (4th is rejected)', async () => {
      // 1. First 3 tickets should open successfully
      const t1 = await openTicket(GUILD_FREE, USER_ALICE, 'general');
      assert.equal(t1.ticket.ticketId, 'ticket-0001');

      const t2 = await openTicket(GUILD_FREE, USER_BOB, 'general');
      assert.equal(t2.ticket.ticketId, 'ticket-0002');

      const t3 = await openTicket(GUILD_FREE, USER_ALICE, 'tech');
      assert.equal(t3.ticket.ticketId, 'ticket-0003');

      // 2. 4th ticket must be rejected due to quota limit
      await assert.rejects(
        () => openTicket(GUILD_FREE, USER_BOB, 'general'),
        /Ticket quota reached: 3\/3 open tickets for tier FREE/,
      );
    });

    it('frees up quota when an active ticket is closed', async () => {
      const t1 = await openTicket(GUILD_FREE, USER_ALICE, 'general');
      const t2 = await openTicket(GUILD_FREE, USER_BOB, 'general');
      const t3 = await openTicket(GUILD_FREE, USER_ALICE, 'tech');

      // 4th fails
      await assert.rejects(() => openTicket(GUILD_FREE, USER_BOB, 'general'));

      // Close t1
      await closeTicket(GUILD_FREE, t1.ticket.ticketId, STAFF_CHARLIE, 'Resolved issue');

      // 4th ticket now succeeds because open count dropped from 3 to 2
      const t4 = await openTicket(GUILD_FREE, USER_BOB, 'general');
      assert.ok(t4.ticket);
      assert.equal(t4.ticket.ticketId, 'ticket-0004');
    });

    it('allows up to 25 open tickets under Pro tier', async () => {
      // Create 20 tickets sequentially
      for (let i = 1; i <= 20; i++) {
        const res = await openTicket(GUILD_PRO, `user_${i}`, 'general');
        assert.ok(res.ticket);
      }

      // 21st ticket still opens fine on Pro tier
      const t21 = await openTicket(GUILD_PRO, 'user_21', 'general');
      assert.equal(t21.ticket.ticketId, 'ticket-0021');
    });

    it('allows unlimited open tickets under Ultimate tier', async () => {
      // Open 30 tickets beyond Pro limit
      for (let i = 1; i <= 30; i++) {
        await openTicket(GUILD_ULTIMATE, `user_${i}`, 'general');
      }

      // 31st ticket still opens without restriction
      const t31 = await openTicket(GUILD_ULTIMATE, 'user_31', 'general');
      assert.ok(t31.ticket);
      assert.equal(t31.ticket.ticketId, 'ticket-0031');
    });
  });

  // ─── 3. Channel Specification & Containment ──────────────────────────────────

  describe('Channel Specification & Security Overwrites', () => {
    it('creates channel spec with proper @everyone deny and owner allow permissions', async () => {
      const panel = await createTicketPanel(GUILD_FREE, {
        title: 'Tech Desk',
        description: 'Tech support',
        supportRoleIds: ['role_support_tier1'],
        categoryId: 'cat_999',
        namingScheme: 'ticket-{number}',
      });

      const { ticket, channelSpec } = await openTicket(
        GUILD_FREE,
        USER_ALICE,
        'technical',
        panel.panelId,
      );

      assert.equal(channelSpec.name, 'ticket-0001');
      assert.equal(channelSpec.parent_id, 'cat_999');
      assert.equal(channelSpec.type, 0); // GuildText

      // Check overwrites:
      // 1. @everyone role
      const everyoneOverwrite = channelSpec.permission_overwrites.find(
        (o) => o.id === GUILD_FREE,
      );
      assert.ok(everyoneOverwrite);
      assert.equal(everyoneOverwrite.type, 0);
      assert.notEqual(everyoneOverwrite.deny, '0');

      // 2. Ticket owner
      const ownerOverwrite = channelSpec.permission_overwrites.find(
        (o) => o.id === USER_ALICE,
      );
      assert.ok(ownerOverwrite);
      assert.equal(ownerOverwrite.type, 1);
      assert.notEqual(ownerOverwrite.allow, '0');

      // 3. Support role
      const supportOverwrite = channelSpec.permission_overwrites.find(
        (o) => o.id === 'role_support_tier1',
      );
      assert.ok(supportOverwrite);
      assert.equal(supportOverwrite.type, 0);
      assert.notEqual(supportOverwrite.allow, '0');
    });
  });

  // ─── 4. Ticket Lifecycle: Claiming & Closing ──────────────────────────────────

  describe('Ticket Lifecycle Mechanics', () => {
    it('claims an open ticket by staff and updates welcome embed', async () => {
      const { ticket } = await openTicket(GUILD_FREE, USER_ALICE, 'general');
      assert.equal(ticket.status, 'open');
      assert.equal(ticket.claimedBy, undefined);

      const claimRes = await claimTicket(GUILD_FREE, ticket.ticketId, STAFF_CHARLIE);
      assert.equal(claimRes.ticket.status, 'claimed');
      assert.equal(claimRes.ticket.claimedBy, STAFF_CHARLIE);
      assert.ok(claimRes.ticket.claimedAt);

      // Verify claim button is disabled and updated
      const row = claimRes.components[0];
      const claimBtn = row.components[0] as any;
      assert.equal(claimBtn.disabled, true);
      assert.equal(claimBtn.label, 'Claimed');

      // Embed reflects claimed status
      assert.ok(claimRes.embed.fields?.some((f) => f.name.includes('Claimed By')));
    });

    it('rejects claiming an already closed ticket', async () => {
      const { ticket } = await openTicket(GUILD_FREE, USER_ALICE, 'general');
      await closeTicket(GUILD_FREE, ticket.ticketId, STAFF_CHARLIE, 'Resolved');

      await assert.rejects(
        () => claimTicket(GUILD_FREE, ticket.ticketId, STAFF_CHARLIE),
        /Cannot claim closed ticket/,
      );
    });

    it('closes an active ticket and generates markdown transcript', async () => {
      const { ticket } = await openTicket(GUILD_FREE, USER_ALICE, 'billing');
      await claimTicket(GUILD_FREE, ticket.ticketId, STAFF_CHARLIE);

      const messages = [
        { author: 'Alice', content: 'Hi, I was charged twice for Pro tier.' },
        { author: 'Charlie', content: 'Checking invoice records now...' },
        { author: 'Charlie', content: 'Refund processed for transaction #8812.' },
      ];

      const closeRes = await closeTicket(
        GUILD_FREE,
        ticket.ticketId,
        STAFF_CHARLIE,
        'Refund processed',
        messages,
      );

      assert.equal(closeRes.ticket.status, 'closed');
      assert.equal(closeRes.ticket.closedBy, STAFF_CHARLIE);
      assert.equal(closeRes.ticket.closeReason, 'Refund processed');
      assert.ok(closeRes.ticket.closedAt);

      // Verify transcript contents
      assert.ok(closeRes.transcript.includes(ticket.ticketId));
      assert.ok(closeRes.transcript.includes('Refund processed'));
      assert.ok(closeRes.transcript.includes('Alice: Hi, I was charged twice'));
      assert.ok(closeRes.transcript.includes('Charlie: Refund processed for transaction #8812'));

      // Verify CSAT rating buttons row
      assert.ok(closeRes.ratingRow);
      assert.equal(closeRes.ratingRow.components.length, 5);

      // Rejects double close
      await assert.rejects(
        () => closeTicket(GUILD_FREE, ticket.ticketId, STAFF_CHARLIE),
        /already closed/,
      );
    });

    it('generates rich HTML transcript', async () => {
      const { ticket } = await openTicket(GUILD_FREE, USER_ALICE, 'general');
      const messages = [
        { author: 'Alice', content: 'Help please!' },
        { author: 'Bob', content: 'On it!' },
      ];

      const html = generateHtmlTranscript(ticket, messages, STAFF_CHARLIE, 'All good');
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes(ticket.ticketId));
      assert.ok(html.includes('Alice'));
      assert.ok(html.includes('Help please!'));
      assert.ok(html.includes('On it!'));
    });
  });

  // ─── 5. CSAT Customer Satisfaction Ratings ───────────────────────────────────

  describe('CSAT 5-Star Customer Satisfaction Rating', () => {
    it('submits a valid 5-star rating for a closed ticket', async () => {
      const { ticket } = await openTicket(GUILD_FREE, USER_ALICE, 'general');
      await closeTicket(GUILD_FREE, ticket.ticketId, STAFF_CHARLIE);

      const ratingRes = await rateTicket(GUILD_FREE, ticket.ticketId, 5);
      assert.equal(ratingRes.ticket.rating, 5);
      assert.ok(ratingRes.embed.description?.includes('⭐⭐⭐⭐⭐'));

      // In rating row, all buttons are now disabled and button 5 is highlighted
      const buttons = ratingRes.ratingRow.components as any[];
      assert.equal(buttons.length, 5);
      for (const btn of buttons) {
        assert.equal(btn.disabled, true);
      }
      assert.equal(buttons[4].style, 3); // Success (green)
    });

    it('rejects invalid rating values outside 1-5', async () => {
      const { ticket } = await openTicket(GUILD_FREE, USER_ALICE, 'general');
      await closeTicket(GUILD_FREE, ticket.ticketId, STAFF_CHARLIE);

      await assert.rejects(
        () => rateTicket(GUILD_FREE, ticket.ticketId, 0),
        /Rating must be an integer between 1 and 5/,
      );
      await assert.rejects(
        () => rateTicket(GUILD_FREE, ticket.ticketId, 6),
        /Rating must be an integer between 1 and 5/,
      );
      await assert.rejects(
        () => rateTicket(GUILD_FREE, ticket.ticketId, 4.5),
        /Rating must be an integer between 1 and 5/,
      );
    });
  });

  // ─── 6. Ticket Statistics Aggregation ────────────────────────────────────────

  describe('Ticket Hub Metrics & Stats', () => {
    it('aggregates total, open, claimed, closed tickets, and average CSAT rating', async () => {
      // 1. Open ticket 1 (remains open)
      await openTicket(GUILD_PRO, USER_ALICE, 'general');

      // 2. Open ticket 2 (claimed)
      const t2 = await openTicket(GUILD_PRO, USER_BOB, 'tech');
      await claimTicket(GUILD_PRO, t2.ticket.ticketId, STAFF_CHARLIE);

      // 3. Open ticket 3 (closed with 5-star rating)
      const t3 = await openTicket(GUILD_PRO, 'user_3', 'billing');
      await closeTicket(GUILD_PRO, t3.ticket.ticketId, STAFF_CHARLIE);
      await rateTicket(GUILD_PRO, t3.ticket.ticketId, 5);

      // 4. Open ticket 4 (closed with 3-star rating)
      const t4 = await openTicket(GUILD_PRO, 'user_4', 'support');
      await closeTicket(GUILD_PRO, t4.ticket.ticketId, STAFF_CHARLIE);
      await rateTicket(GUILD_PRO, t4.ticket.ticketId, 3);

      const stats = await getTicketStats(GUILD_PRO);
      assert.equal(stats.total, 4);
      assert.equal(stats.open, 1);
      assert.equal(stats.claimed, 1);
      assert.equal(stats.closed, 2);
      assert.equal(stats.ratingCount, 2);
      assert.equal(stats.avgRating, 4.0); // (5 + 3) / 2 = 4.0

      const embed = buildTicketStatsEmbed(stats, 'Pro Gaming Hub');
      assert.ok(embed.title?.includes('Pro Gaming Hub'));
      assert.ok(embed.fields?.some((f) => f.name.includes('Open Tickets') && f.value === '1'));
      assert.ok(embed.fields?.some((f) => f.name.includes('Closed Tickets') && f.value === '2'));
      assert.ok(embed.fields?.some((f) => f.name.includes('CSAT') && f.value.includes('4.0 / 5.0')));
    });
  });
});
