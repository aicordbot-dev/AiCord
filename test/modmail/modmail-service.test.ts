/**
 * test/modmail/modmail-service.test.ts
 * Unit tests for Anonymous Modmail Relay — Service Engine:
 * - Test mode store management (enableTestMode, clearTestStore, isTestMode, setTestConfig, getTestConfig, setTestThread, getTestThread)
 * - Server Modmail Configuration & Canned Responses CRUD
 * - Channel Specification & Permission Containment (@everyone denied, staff roles allowed)
 * - Embed Builders (staff header with Close button, anonymous & named staff relay, user relay)
 * - Thread Lifecycle (openModmailThread, active thread deduplication, channel update)
 * - Message Relay (addMessageToThread, anonymous staff vs named staff vs member)
 * - Thread Closure & Transcript Generation (Markdown & HTML transcripts)
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestConfig,
  getTestConfig,
  setTestThread,
  getTestThread,
  getModmailConfig,
  setModmailConfig,
  addCannedResponse,
  removeCannedResponse,
  getCannedResponse,
  buildModmailChannelSpec,
  buildStaffHeaderEmbed,
  buildRelayEmbed,
  generateModmailMarkdownTranscript,
  generateModmailHtmlTranscript,
  openModmailThread,
  getModmailThreadByChannel,
  getModmailThreadById,
  updateModmailThreadChannel,
  addMessageToThread,
  closeModmailThread,
  type IModmailConfig,
  type IModmailThread,
} from '@/lib/modmail/modmail-service';
import { PermissionFlags } from '@/lib/discord/permissions';

describe('Anonymous Modmail Relay — Service Engine', () => {
  const GUILD_ID = 'guild_modmail_999';
  const RECIPIENT_ID = '123456789012345678'; // Snowflake format
  const RECIPIENT_TAG = 'Alice#1234';
  const STAFF_USER_ID = '987654321098765432';
  const STAFF_ROLE_ID = 'role_moderator_111';
  const LOG_CHANNEL_ID = 'channel_modmail_logs_222';
  const CATEGORY_ID = 'category_modmail_333';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  // ─── 1. Test Store Lifecycle ────────────────────────────────────────────────

  describe('Test Store Management', () => {
    it('manages testMode state correctly', () => {
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
    });

    it('stores and retrieves test configurations via setTestConfig and getTestConfig', () => {
      const mockConfig = {
        guildId: GUILD_ID,
        staffRoleIds: [STAFF_ROLE_ID],
        cannedResponses: [{ name: 'rules', content: 'Please read #rules.' }],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as IModmailConfig;

      setTestConfig(mockConfig);
      const retrieved = getTestConfig(GUILD_ID);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.guildId, GUILD_ID);
      assert.strictEqual(retrieved.staffRoleIds[0], STAFF_ROLE_ID);
    });

    it('stores and retrieves test threads via setTestThread and getTestThread', () => {
      const mockThread = {
        guildId: GUILD_ID,
        threadId: 'mm-0001',
        channelId: 'chan_mm-0001',
        recipientId: RECIPIENT_ID,
        recipientTag: RECIPIENT_TAG,
        status: 'open',
        category: 'general',
        messages: [],
        openedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as IModmailThread;

      setTestThread(mockThread);
      const retrieved = getTestThread('mm-0001');
      assert.ok(retrieved);
      assert.strictEqual(retrieved.threadId, 'mm-0001');
      assert.strictEqual(retrieved.recipientId, RECIPIENT_ID);
    });

    it('clears all test stores when clearTestStore is called', () => {
      setTestConfig({ guildId: GUILD_ID } as unknown as IModmailConfig);
      setTestThread({ threadId: 'mm-0001' } as unknown as IModmailThread);

      clearTestStore();
      assert.strictEqual(getTestConfig(GUILD_ID), undefined);
      assert.strictEqual(getTestThread('mm-0001'), undefined);
    });
  });

  // ─── 2. Server Configuration & Canned Responses ─────────────────────────────

  describe('Server Configuration & Canned Responses CRUD', () => {
    it('returns default config with enabled: true when guild is unconfigured', async () => {
      const config = await getModmailConfig(GUILD_ID);
      assert.strictEqual(config.guildId, GUILD_ID);
      assert.strictEqual(config.enabled, true);
      assert.deepStrictEqual(config.staffRoleIds, []);
      assert.deepStrictEqual(config.cannedResponses, []);
    });

    it('updates server modmail config via setModmailConfig', async () => {
      await setModmailConfig(GUILD_ID, {
        categoryId: CATEGORY_ID,
        logChannelId: LOG_CHANNEL_ID,
        staffRoleIds: [STAFF_ROLE_ID],
        enabled: true,
      });

      const config = await getModmailConfig(GUILD_ID);
      assert.strictEqual(config.categoryId, CATEGORY_ID);
      assert.strictEqual(config.logChannelId, LOG_CHANNEL_ID);
      assert.deepStrictEqual(config.staffRoleIds, [STAFF_ROLE_ID]);
    });

    it('adds and updates canned response snippets', async () => {
      // Add initial snippet
      const added = await addCannedResponse(
        GUILD_ID,
        'appeal',
        'Your ban appeal is under review.',
      );
      assert.strictEqual(added.name, 'appeal');
      assert.strictEqual(added.content, 'Your ban appeal is under review.');

      // Retrieve snippet case-insensitively
      const retrieved = await getCannedResponse(GUILD_ID, 'APPEAL');
      assert.ok(retrieved);
      assert.strictEqual(retrieved.name, 'appeal');
      assert.strictEqual(retrieved.content, 'Your ban appeal is under review.');

      // Update existing snippet
      await addCannedResponse(
        GUILD_ID,
        'appeal',
        'Updated: Appeal has been approved!',
      );
      const updated = await getCannedResponse(GUILD_ID, 'appeal');
      assert.strictEqual(updated?.content, 'Updated: Appeal has been approved!');
    });

    it('removes canned responses and handles non-existent lookups', async () => {
      await addCannedResponse(GUILD_ID, 'faq', 'Check out our FAQ.');

      const removed = await removeCannedResponse(GUILD_ID, 'faq');
      assert.strictEqual(removed, true);

      const missing = await getCannedResponse(GUILD_ID, 'faq');
      assert.strictEqual(missing, undefined);

      const nonExistentRemove = await removeCannedResponse(GUILD_ID, 'unknown');
      assert.strictEqual(nonExistentRemove, false);
    });

    it('rejects adding canned snippet with empty name or content', async () => {
      await assert.rejects(
        () => addCannedResponse(GUILD_ID, '', 'Content'),
        /name is required/,
      );
      await assert.rejects(
        () => addCannedResponse(GUILD_ID, 'name', ''),
        /content is required/,
      );
    });
  });

  // ─── 3. Channel Specification & Security Permissions ────────────────────────

  describe('Channel Specification & Security Permissions', () => {
    it('generates sanitized channel name and permission containment overwrites', async () => {
      await setModmailConfig(GUILD_ID, {
        categoryId: CATEGORY_ID,
        staffRoleIds: [STAFF_ROLE_ID],
      });
      const config = await getModmailConfig(GUILD_ID);

      const thread = {
        guildId: GUILD_ID,
        threadId: 'mm-0001',
        channelId: 'chan_mm-0001',
        recipientId: RECIPIENT_ID,
        recipientTag: 'Alice#1234',
        status: 'open',
        category: 'billing',
        messages: [],
        openedAt: new Date(),
      } as unknown as IModmailThread;

      const spec = buildModmailChannelSpec(thread, config);

      assert.strictEqual(spec.name, 'modmail-alice-1234');
      assert.strictEqual(spec.parent_id, CATEGORY_ID);
      assert.ok(spec.topic?.includes('mm-0001'));
      assert.ok(spec.topic?.includes('billing'));

      // Check permission containment: @everyone denied VIEW_CHANNEL
      const everyoneOverwrite = spec.permission_overwrites.find(
        (o) => o.id === GUILD_ID && o.type === 0,
      );
      assert.ok(everyoneOverwrite);
      assert.strictEqual(everyoneOverwrite.deny, PermissionFlags.VIEW_CHANNEL.toString());

      // Check staff role allowed VIEW_CHANNEL and messaging permissions
      const staffOverwrite = spec.permission_overwrites.find(
        (o) => o.id === STAFF_ROLE_ID && o.type === 0,
      );
      assert.ok(staffOverwrite);
      const allowBigInt = BigInt(staffOverwrite.allow);
      assert.ok((allowBigInt & PermissionFlags.VIEW_CHANNEL) !== 0n);
      assert.ok((allowBigInt & PermissionFlags.SEND_MESSAGES) !== 0n);
      assert.ok((allowBigInt & PermissionFlags.READ_MESSAGE_HISTORY) !== 0n);
    });
  });

  // ─── 4. Embed Builders ──────────────────────────────────────────────────────

  describe('Embed Builders & Interactive Components', () => {
    it('buildStaffHeaderEmbed includes recipient info, snowflake age, and close button', () => {
      const thread = {
        guildId: GUILD_ID,
        threadId: 'mm-0001',
        channelId: 'chan_mm-0001',
        recipientId: RECIPIENT_ID,
        recipientTag: RECIPIENT_TAG,
        status: 'open',
        category: 'support',
        messages: [],
        openedAt: new Date(),
      } as unknown as IModmailThread;

      const header = buildStaffHeaderEmbed(thread);

      assert.ok(header.title?.includes(RECIPIENT_TAG));
      assert.strictEqual(header.components.length, 1);
      const row = header.components[0] as unknown as { components: Array<{ custom_id: string; style: number }> };
      assert.strictEqual(row.components[0].custom_id, `mm_close:${thread.channelId}`);
      assert.strictEqual(row.components[0].style, 4); // Danger style
    });

    it('buildRelayEmbed formats anonymous staff replies', () => {
      const embed = buildRelayEmbed('Hello! How can we assist you?', true, true, 'ModeratorBob');
      assert.strictEqual(embed.author?.name, 'Staff Team');
      assert.strictEqual(embed.description, 'Hello! How can we assist you?');
      assert.ok(embed.footer?.text?.includes('Anonymous Staff Message'));
    });

    it('buildRelayEmbed formats named staff replies', () => {
      const embed = buildRelayEmbed('Here is the link.', true, false, 'ModeratorBob');
      assert.strictEqual(embed.author?.name, 'ModeratorBob (Staff)');
      assert.strictEqual(embed.description, 'Here is the link.');
      assert.ok(embed.footer?.text?.includes('Staff Message'));
    });

    it('buildRelayEmbed formats member replies', () => {
      const embed = buildRelayEmbed('I need help with my account.', false, false, RECIPIENT_TAG);
      assert.strictEqual(embed.author?.name, RECIPIENT_TAG);
      assert.strictEqual(embed.description, 'I need help with my account.');
      assert.ok(embed.footer?.text?.includes('Incoming Member Message'));
    });
  });

  // ─── 5. Thread Lifecycle ────────────────────────────────────────────────────

  describe('Thread Lifecycle Mechanics', () => {
    it('opens a new modmail thread and assigns unique threadId and channelSpec', async () => {
      const result = await openModmailThread(
        GUILD_ID,
        RECIPIENT_ID,
        RECIPIENT_TAG,
        'support',
        'Hello staff!',
      );

      assert.ok(result.thread.threadId.startsWith('mm-'));
      assert.strictEqual(result.thread.recipientId, RECIPIENT_ID);
      assert.strictEqual(result.thread.status, 'open');
      assert.strictEqual(result.thread.category, 'support');
      assert.strictEqual(result.thread.messages.length, 1);
      assert.strictEqual(result.thread.messages[0].content, 'Hello staff!');
      assert.strictEqual(result.thread.messages[0].isStaff, false);
      assert.ok(result.channelSpec);
      assert.ok(result.headerEmbed);
      assert.ok(result.headerComponents);
      assert.ok(result.initialRelayEmbed);
    });

    it('enforces single open thread constraint per user in guild', async () => {
      await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);

      // Attempting to open a second thread while first is open should throw
      await assert.rejects(
        () => openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG),
        /User already has an active modmail thread/,
      );
    });

    it('allows opening a new thread after previous thread is closed', async () => {
      const first = await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);
      await closeModmailThread(GUILD_ID, first.thread.channelId, STAFF_USER_ID, 'Resolved');

      // Now opening should succeed
      const second = await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);
      assert.notStrictEqual(first.thread.threadId, second.thread.threadId);
      assert.strictEqual(second.thread.status, 'open');
    });

    it('retrieves thread by channelId and threadId', async () => {
      const opened = await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);
      await updateModmailThreadChannel(GUILD_ID, opened.thread.threadId, 'channel_custom_555');

      const byChannel = await getModmailThreadByChannel(GUILD_ID, 'channel_custom_555');
      assert.ok(byChannel);
      assert.strictEqual(byChannel.threadId, opened.thread.threadId);

      const byId = await getModmailThreadById(GUILD_ID, opened.thread.threadId);
      assert.ok(byId);
      assert.strictEqual(byId.channelId, 'channel_custom_555');
    });
  });

  // ─── 6. Message Relay ───────────────────────────────────────────────────────

  describe('Message Relay Engine', () => {
    it('appends anonymous staff reply and returns relay embed', async () => {
      const opened = await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);

      const { message, embed, thread } = await addMessageToThread(
        GUILD_ID,
        opened.thread.channelId,
        {
          authorId: STAFF_USER_ID,
          authorTag: 'StaffBob',
          isStaff: true,
          content: 'We are investigating your issue.',
          anonymous: true,
        },
      );

      assert.strictEqual(message.isStaff, true);
      assert.strictEqual(message.anonymous, true);
      assert.strictEqual(message.content, 'We are investigating your issue.');
      assert.strictEqual(embed.author?.name, 'Staff Team');
      assert.strictEqual(thread.messages.length, 1);
    });

    it('appends named staff reply when anonymous is false', async () => {
      const opened = await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);

      const { message, embed } = await addMessageToThread(
        GUILD_ID,
        opened.thread.channelId,
        {
          authorId: STAFF_USER_ID,
          authorTag: 'ModeratorBob',
          isStaff: true,
          content: 'Here is my direct response.',
          anonymous: false,
        },
      );

      assert.strictEqual(message.anonymous, false);
      assert.strictEqual(embed.author?.name, 'ModeratorBob (Staff)');
    });

    it('appends user message from recipient', async () => {
      const opened = await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);

      const { message, embed } = await addMessageToThread(
        GUILD_ID,
        opened.thread.channelId,
        {
          authorId: RECIPIENT_ID,
          authorTag: RECIPIENT_TAG,
          isStaff: false,
          content: 'Thank you for the quick reply!',
        },
      );

      assert.strictEqual(message.isStaff, false);
      assert.strictEqual(embed.author?.name, RECIPIENT_TAG);
    });

    it('rejects adding message to closed or non-existent thread', async () => {
      const opened = await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);
      await closeModmailThread(GUILD_ID, opened.thread.channelId, STAFF_USER_ID);

      await assert.rejects(
        () =>
          addMessageToThread(GUILD_ID, opened.thread.channelId, {
            authorId: STAFF_USER_ID,
            authorTag: 'Staff',
            isStaff: true,
            content: 'Hello?',
          }),
        /is already closed/,
      );

      await assert.rejects(
        () =>
          addMessageToThread(GUILD_ID, 'non_existent_channel', {
            authorId: STAFF_USER_ID,
            authorTag: 'Staff',
            isStaff: true,
            content: 'Hello?',
          }),
        /not found/,
      );
    });
  });

  // ─── 7. Thread Closure & Transcripts ────────────────────────────────────────

  describe('Thread Closure & Transcripts (Markdown & HTML)', () => {
    it('closes active thread, marks metadata, and generates Markdown and HTML transcripts', async () => {
      const opened = await openModmailThread(
        GUILD_ID,
        RECIPIENT_ID,
        RECIPIENT_TAG,
        'billing',
        'My subscription did not renew.',
      );

      // Add a staff reply
      await addMessageToThread(GUILD_ID, opened.thread.channelId, {
        authorId: STAFF_USER_ID,
        authorTag: 'AgentSmith',
        isStaff: true,
        content: 'I have refreshed your account.',
        anonymous: true,
      });

      const closeResult = await closeModmailThread(
        GUILD_ID,
        opened.thread.channelId,
        STAFF_USER_ID,
        'Issue resolved satisfactorily',
      );

      assert.strictEqual(closeResult.thread.status, 'closed');
      assert.strictEqual(closeResult.thread.closedBy, STAFF_USER_ID);
      assert.strictEqual(
        closeResult.thread.closeReason,
        'Issue resolved satisfactorily',
      );
      assert.ok(closeResult.thread.closedAt);

      // Verify Markdown transcript
      const md = closeResult.transcriptMd;
      assert.ok(md.includes(opened.thread.threadId));
      assert.ok(md.includes(RECIPIENT_TAG));
      assert.ok(md.includes('Issue resolved satisfactorily'));
      assert.ok(md.includes('My subscription did not renew.'));
      assert.ok(md.includes('I have refreshed your account.'));
      assert.ok(md.includes('Staff (Anonymous)'));

      // Verify HTML transcript
      const html = closeResult.transcriptHtml;
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes(opened.thread.threadId));
      assert.ok(html.includes('My subscription did not renew.'));
      assert.ok(html.includes('class="message staff"'));
    });

    it('rejects closing already closed thread or non-existent channel', async () => {
      const opened = await openModmailThread(GUILD_ID, RECIPIENT_ID, RECIPIENT_TAG);
      await closeModmailThread(GUILD_ID, opened.thread.channelId, STAFF_USER_ID);

      await assert.rejects(
        () => closeModmailThread(GUILD_ID, opened.thread.channelId, STAFF_USER_ID),
        /is already closed/,
      );

      await assert.rejects(
        () => closeModmailThread(GUILD_ID, 'unknown_chan', STAFF_USER_ID),
        /not found/,
      );
    });

    it('generates clean empty transcripts when thread has no messages', () => {
      const emptyThread = {
        guildId: GUILD_ID,
        threadId: 'mm-9999',
        channelId: 'chan_empty',
        recipientId: RECIPIENT_ID,
        recipientTag: RECIPIENT_TAG,
        status: 'closed',
        category: 'general',
        messages: [],
        openedAt: new Date(),
        closedAt: new Date(),
      } as unknown as IModmailThread;

      const md = generateModmailMarkdownTranscript(emptyThread);
      assert.ok(md.includes('No messages recorded'));

      const html = generateModmailHtmlTranscript(emptyThread);
      assert.ok(html.includes('No messages recorded'));
    });
  });
});
