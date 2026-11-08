/**
 * test/temp-vc/temp-vc-service.test.ts
 * Comprehensive unit tests for Dynamic Temporary Auto-Voice Rooms — Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestConfig, getTestConfig, setTestRoom, getTestRoom, getAllTestRooms)
 * - Configuration setup, persistence, retrieval, and updates
 * - Room creation with default and custom naming schemes ({username} token replacement)
 * - Channel specification and permission overwrite generation (ChannelType.GuildVoice, parent category, MANAGE_CHANNELS, MOVE_MEMBERS)
 * - Lock/Unlock toggling, state updates, and @everyone CONNECT overwrite calculation
 * - User limit clamping (0 to 99) and floating-point handling
 * - Room renaming, sanitization, length boundaries (1-100), and empty name rejection
 * - Ownership transfer to another member and permission delegation
 * - Empty room deletion mechanics
 * - Dashboard embed and interactive button components generation
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelType } from 'discord-api-types/v10';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestConfig,
  getTestConfig,
  setTestRoom,
  getTestRoom,
  getAllTestRooms,
  getTempVoiceConfig,
  setTempVoiceConfig,
  sanitizeRoomName,
  createTempVoiceRoom,
  getTempVoiceRoom,
  getTempVoiceRoomByOwner,
  toggleRoomLock,
  setRoomLimit,
  renameRoom,
  transferRoomOwnership,
  deleteTempVoiceRoom,
  buildRoomDashboardEmbed,
  buildRoomDashboardComponents,
  type ITempVoiceRoom,
} from '@/lib/temp-vc/temp-vc-service';

describe('Dynamic Temporary Voice Rooms — Service Engine', () => {
  const GUILD_ID = 'guild_tvc_test_001';
  const OTHER_GUILD = 'guild_tvc_test_002';
  const HUB_CHANNEL = 'hub_voice_chan_100';
  const CATEGORY_ID = 'category_temp_voice_200';
  const USER_ALICE = 'user_alice_301';
  const USER_BOB = 'user_bob_302';
  const USER_CHARLIE = 'user_charlie_303';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  describe('Test Store Lifecycle', () => {
    it('manages testMode state toggles correctly', () => {
      enableTestMode(true);
      assert.strictEqual(isTestMode(), true);
      enableTestMode(false);
      assert.strictEqual(isTestMode(), false);
      enableTestMode(true);
    });

    it('sets and retrieves test configurations accurately', () => {
      setTestConfig(GUILD_ID, {
        hubChannelId: HUB_CHANNEL,
        categoryId: CATEGORY_ID,
        defaultLimit: 5,
        namingScheme: "{username}'s Squad",
        enabled: true,
      });

      const config = getTestConfig(GUILD_ID);
      assert.ok(config);
      assert.strictEqual(config?.hubChannelId, HUB_CHANNEL);
      assert.strictEqual(config?.categoryId, CATEGORY_ID);
      assert.strictEqual(config?.defaultLimit, 5);
      assert.strictEqual(config?.namingScheme, "{username}'s Squad");
      assert.strictEqual(config?.enabled, true);
    });

    it('sets, retrieves, and lists test rooms accurately', () => {
      setTestRoom(GUILD_ID, 'chan_1', {
        ownerId: USER_ALICE,
        ownerTag: 'Alice',
        name: "Alice's Room",
        userLimit: 4,
        isLocked: false,
      });

      setTestRoom(GUILD_ID, 'chan_2', {
        ownerId: USER_BOB,
        ownerTag: 'Bob',
        name: "Bob's Room",
        userLimit: 2,
        isLocked: true,
      });

      setTestRoom(OTHER_GUILD, 'chan_3', {
        ownerId: USER_CHARLIE,
        ownerTag: 'Charlie',
        name: "Charlie's Room",
      });

      const room1 = getTestRoom(GUILD_ID, 'chan_1');
      assert.ok(room1);
      assert.strictEqual(room1?.ownerId, USER_ALICE);
      assert.strictEqual(room1?.isLocked, false);

      const guildRooms = getAllTestRooms(GUILD_ID);
      assert.strictEqual(guildRooms.length, 2);

      const allRooms = getAllTestRooms();
      assert.strictEqual(allRooms.length, 3);
    });

    it('clears test store completely', () => {
      setTestConfig(GUILD_ID, { hubChannelId: HUB_CHANNEL });
      setTestRoom(GUILD_ID, 'chan_1', { ownerId: USER_ALICE });

      clearTestStore();

      assert.strictEqual(getTestConfig(GUILD_ID), undefined);
      assert.strictEqual(getTestRoom(GUILD_ID, 'chan_1'), undefined);
      assert.strictEqual(getAllTestRooms().length, 0);
    });
  });

  describe('Configuration Helpers', () => {
    it('returns null when no config has been set', async () => {
      const config = await getTempVoiceConfig(GUILD_ID);
      assert.strictEqual(config, null);
    });

    it('creates and saves new configuration via setTempVoiceConfig', async () => {
      const created = await setTempVoiceConfig(GUILD_ID, {
        hubChannelId: HUB_CHANNEL,
        categoryId: CATEGORY_ID,
        defaultLimit: 10,
        namingScheme: "🔊 {username}'s Den",
        enabled: true,
      });

      assert.strictEqual(created.guildId, GUILD_ID);
      assert.strictEqual(created.hubChannelId, HUB_CHANNEL);
      assert.strictEqual(created.categoryId, CATEGORY_ID);
      assert.strictEqual(created.defaultLimit, 10);
      assert.strictEqual(created.namingScheme, "🔊 {username}'s Den");
      assert.strictEqual(created.enabled, true);

      const fetched = await getTempVoiceConfig(GUILD_ID);
      assert.deepStrictEqual(fetched?.hubChannelId, HUB_CHANNEL);
    });

    it('partially updates existing configuration', async () => {
      await setTempVoiceConfig(GUILD_ID, {
        hubChannelId: HUB_CHANNEL,
        defaultLimit: 0,
      });

      const updated = await setTempVoiceConfig(GUILD_ID, {
        defaultLimit: 8,
      });

      assert.strictEqual(updated.hubChannelId, HUB_CHANNEL);
      assert.strictEqual(updated.defaultLimit, 8);
    });
  });

  describe('Name Sanitization & Formatting', () => {
    it('replaces {username} token with userTag', () => {
      const pattern = "{username}'s Lounge";
      const formatted = pattern.replace(/\{username\}/gi, 'Alice');
      assert.strictEqual(formatted, "Alice's Lounge");
    });

    it('clamps room name to 100 characters', () => {
      const longName = 'A'.repeat(150);
      const sanitized = sanitizeRoomName(longName);
      assert.strictEqual(sanitized.length, 100);
      assert.strictEqual(sanitized, 'A'.repeat(100));
    });

    it('trims whitespace and falls back to default when empty', () => {
      const sanitized = sanitizeRoomName('   ', 'Bob');
      assert.strictEqual(sanitized, "Bob's Lounge");
    });
  });

  describe('Room Creation & Channel Specification', () => {
    beforeEach(async () => {
      await setTempVoiceConfig(GUILD_ID, {
        hubChannelId: HUB_CHANNEL,
        categoryId: CATEGORY_ID,
        defaultLimit: 6,
        namingScheme: "{username}'s Hangout",
        enabled: true,
      });
    });

    it('creates temporary voice room with config defaults', async () => {
      const { channelSpec, room } = await createTempVoiceRoom(
        GUILD_ID,
        USER_ALICE,
        'Alice',
      );

      assert.ok(room.channelId.startsWith('tvc_'));
      assert.strictEqual(room.guildId, GUILD_ID);
      assert.strictEqual(room.ownerId, USER_ALICE);
      assert.strictEqual(room.ownerTag, 'Alice');
      assert.strictEqual(room.name, "Alice's Hangout");
      assert.strictEqual(room.userLimit, 6);
      assert.strictEqual(room.isLocked, false);

      // Verify Discord channel specification
      assert.strictEqual(channelSpec.name, "Alice's Hangout");
      assert.strictEqual(channelSpec.type, ChannelType.GuildVoice);
      assert.strictEqual(channelSpec.parent_id, CATEGORY_ID);
      assert.strictEqual(channelSpec.user_limit, 6);

      // Verify permission overwrites grant owner MANAGE_CHANNELS and MOVE_MEMBERS
      const ownerOverwrite = channelSpec.permission_overwrites.find(
        (o) => o.id === USER_ALICE && o.type === 1,
      );
      assert.ok(ownerOverwrite, 'Owner overwrite must be present');
      const allowBits = BigInt(ownerOverwrite!.allow);
      assert.ok(
        (allowBits & PermissionFlags.MANAGE_CHANNELS) !== 0n,
        'Owner must have MANAGE_CHANNELS permission',
      );
      assert.ok(
        (allowBits & PermissionFlags.MOVE_MEMBERS) !== 0n,
        'Owner must have MOVE_MEMBERS permission',
      );
    });

    it('supports custom room name and custom limit overriding config', async () => {
      const { channelSpec, room } = await createTempVoiceRoom(
        GUILD_ID,
        USER_BOB,
        'Bob',
        'Valorant 5v5 Scrims',
        5,
        'channel_custom_bob',
      );

      assert.strictEqual(room.channelId, 'channel_custom_bob');
      assert.strictEqual(room.name, 'Valorant 5v5 Scrims');
      assert.strictEqual(room.userLimit, 5);
      assert.strictEqual(channelSpec.user_limit, 5);
    });

    it('throws error when temp voice is disabled in config', async () => {
      await setTempVoiceConfig(GUILD_ID, { enabled: false });

      await assert.rejects(
        () => createTempVoiceRoom(GUILD_ID, USER_ALICE, 'Alice'),
        /disabled on this server/i,
      );
    });
  });

  describe('Room Retrieval', () => {
    it('retrieves room by guildId and channelId', async () => {
      setTestRoom(GUILD_ID, 'room_123', {
        ownerId: USER_ALICE,
        name: "Alice's Studio",
      });

      const room = await getTempVoiceRoom(GUILD_ID, 'room_123');
      assert.ok(room);
      assert.strictEqual(room?.name, "Alice's Studio");
    });

    it('retrieves room by guildId and ownerId', async () => {
      setTestRoom(GUILD_ID, 'room_456', {
        ownerId: USER_BOB,
        name: "Bob's Studio",
      });

      const room = await getTempVoiceRoomByOwner(GUILD_ID, USER_BOB);
      assert.ok(room);
      assert.strictEqual(room?.channelId, 'room_456');
    });

    it('returns null for non-existent room', async () => {
      const room = await getTempVoiceRoom(GUILD_ID, 'non_existent');
      assert.strictEqual(room, null);
    });
  });

  describe('Room Lock / Unlock Mechanics', () => {
    const CHANNEL_ID = 'room_lock_test';

    beforeEach(() => {
      setTestRoom(GUILD_ID, CHANNEL_ID, {
        ownerId: USER_ALICE,
        isLocked: false,
      });
    });

    it('allows room owner to toggle lock and generates deny CONNECT overwrite', async () => {
      const result = await toggleRoomLock(GUILD_ID, CHANNEL_ID, USER_ALICE);

      assert.strictEqual(result.isLocked, true);
      assert.strictEqual(result.room.isLocked, true);

      // Overwrite denies @everyone CONNECT
      assert.strictEqual(result.overwrite.id, GUILD_ID);
      assert.strictEqual(result.overwrite.type, 0); // Role
      assert.strictEqual(result.overwrite.deny, PermissionFlags.CONNECT.toString());
      assert.strictEqual(result.overwrite.allow, '0');
    });

    it('allows room owner to unlock locked room and clears deny overwrite', async () => {
      // First lock it
      await toggleRoomLock(GUILD_ID, CHANNEL_ID, USER_ALICE);

      // Then unlock it
      const result = await toggleRoomLock(GUILD_ID, CHANNEL_ID, USER_ALICE);
      assert.strictEqual(result.isLocked, false);
      assert.strictEqual(result.overwrite.deny, '0');
    });

    it('allows moderator to toggle lock even if not owner', async () => {
      const result = await toggleRoomLock(
        GUILD_ID,
        CHANNEL_ID,
        USER_CHARLIE,
        true, // isMod
      );
      assert.strictEqual(result.isLocked, true);
    });

    it('rejects unauthorized member trying to lock another members room', async () => {
      await assert.rejects(
        () => toggleRoomLock(GUILD_ID, CHANNEL_ID, USER_BOB, false),
        /Only the room owner or a moderator/i,
      );
    });

    it('rejects toggling non-existent room', async () => {
      await assert.rejects(
        () => toggleRoomLock(GUILD_ID, 'phantom_room', USER_ALICE),
        /not found/i,
      );
    });
  });

  describe('User Limit Clamping & Updates', () => {
    const CHANNEL_ID = 'room_limit_test';

    beforeEach(() => {
      setTestRoom(GUILD_ID, CHANNEL_ID, {
        ownerId: USER_ALICE,
        userLimit: 0,
      });
    });

    it('updates user limit within valid range (0-99)', async () => {
      const updated = await setRoomLimit(GUILD_ID, CHANNEL_ID, USER_ALICE, 8);
      assert.strictEqual(updated.userLimit, 8);
    });

    it('clamps negative limit to 0', async () => {
      const updated = await setRoomLimit(GUILD_ID, CHANNEL_ID, USER_ALICE, -5);
      assert.strictEqual(updated.userLimit, 0);
    });

    it('clamps excessive limit (>99) to 99', async () => {
      const updated = await setRoomLimit(GUILD_ID, CHANNEL_ID, USER_ALICE, 250);
      assert.strictEqual(updated.userLimit, 99);
    });

    it('floors floating-point limit inputs', async () => {
      const updated = await setRoomLimit(GUILD_ID, CHANNEL_ID, USER_ALICE, 4.8);
      assert.strictEqual(updated.userLimit, 4);
    });

    it('rejects non-owner non-moderator setting limit', async () => {
      await assert.rejects(
        () => setRoomLimit(GUILD_ID, CHANNEL_ID, USER_BOB, 5, false),
        /Only the room owner or a moderator/i,
      );
    });
  });

  describe('Room Renaming', () => {
    const CHANNEL_ID = 'room_rename_test';

    beforeEach(() => {
      setTestRoom(GUILD_ID, CHANNEL_ID, {
        ownerId: USER_ALICE,
        name: "Alice's Corner",
      });
    });

    it('updates room title successfully', async () => {
      const updated = await renameRoom(
        GUILD_ID,
        CHANNEL_ID,
        USER_ALICE,
        'Chill Music & Coding',
      );
      assert.strictEqual(updated.name, 'Chill Music & Coding');
    });

    it('sanitizes and clamps long name to 100 characters', async () => {
      const veryLong = 'V'.repeat(120);
      const updated = await renameRoom(GUILD_ID, CHANNEL_ID, USER_ALICE, veryLong);
      assert.strictEqual(updated.name.length, 100);
    });

    it('allows moderator to rename room', async () => {
      const updated = await renameRoom(
        GUILD_ID,
        CHANNEL_ID,
        USER_CHARLIE,
        'Moderated Room',
        true, // isMod
      );
      assert.strictEqual(updated.name, 'Moderated Room');
    });

    it('rejects non-owner non-moderator renaming room', async () => {
      await assert.rejects(
        () => renameRoom(GUILD_ID, CHANNEL_ID, USER_BOB, 'Hacked Title', false),
        /Only the room owner or a moderator/i,
      );
    });
  });

  describe('Ownership Transfer', () => {
    const CHANNEL_ID = 'room_transfer_test';

    beforeEach(() => {
      setTestRoom(GUILD_ID, CHANNEL_ID, {
        ownerId: USER_ALICE,
        ownerTag: 'Alice',
        name: "Alice's Space",
      });
    });

    it('transfers room ownership to new member', async () => {
      const updated = await transferRoomOwnership(
        GUILD_ID,
        CHANNEL_ID,
        USER_ALICE,
        USER_BOB,
        'Bob',
      );

      assert.strictEqual(updated.ownerId, USER_BOB);
      assert.strictEqual(updated.ownerTag, 'Bob');

      // Former owner is no longer owner
      await assert.rejects(
        () => setRoomLimit(GUILD_ID, CHANNEL_ID, USER_ALICE, 2, false),
        /Only the room owner or a moderator/i,
      );

      // New owner can now configure room
      const reconfigured = await setRoomLimit(GUILD_ID, CHANNEL_ID, USER_BOB, 2, false);
      assert.strictEqual(reconfigured.userLimit, 2);
    });

    it('allows moderator to transfer ownership', async () => {
      const updated = await transferRoomOwnership(
        GUILD_ID,
        CHANNEL_ID,
        USER_CHARLIE,
        USER_BOB,
        'Bob',
        true, // isMod
      );
      assert.strictEqual(updated.ownerId, USER_BOB);
    });

    it('rejects non-owner non-moderator transferring ownership', async () => {
      await assert.rejects(
        () =>
          transferRoomOwnership(
            GUILD_ID,
            CHANNEL_ID,
            USER_BOB,
            USER_CHARLIE,
            'Charlie',
            false,
          ),
        /Only the current room owner or a moderator/i,
      );
    });
  });

  describe('Room Deletion Mechanics', () => {
    it('deletes active room and returns true', async () => {
      setTestRoom(GUILD_ID, 'room_del_1', { ownerId: USER_ALICE });
      const deleted = await deleteTempVoiceRoom(GUILD_ID, 'room_del_1');
      assert.strictEqual(deleted, true);
      assert.strictEqual(await getTempVoiceRoom(GUILD_ID, 'room_del_1'), null);
    });

    it('returns false when deleting non-existent room', async () => {
      const deleted = await deleteTempVoiceRoom(GUILD_ID, 'phantom_room');
      assert.strictEqual(deleted, false);
    });
  });

  describe('Dashboard Embed & Component Builders', () => {
    const mockRoom: ITempVoiceRoom = {
      guildId: GUILD_ID,
      channelId: 'room_mock_999',
      ownerId: USER_ALICE,
      ownerTag: 'Alice',
      isLocked: false,
      userLimit: 5,
      name: "Alice's Chill Zone",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ITempVoiceRoom;

    it('renders clean thematic dashboard embed', () => {
      const embed = buildRoomDashboardEmbed(mockRoom);

      assert.strictEqual(embed.title, "🔊 Alice's Chill Zone");
      assert.ok(embed.description?.includes(`<@${USER_ALICE}>`));
      assert.strictEqual(embed.color, 0x5865f2); // Unlocked blurple

      const statusField = embed.fields?.find((f) => f.name.includes('Status'));
      assert.ok(statusField?.value.includes('🟢 Unlocked'));

      const limitField = embed.fields?.find((f) => f.name.includes('Limit'));
      assert.ok(limitField?.value.includes('5 Users'));
    });

    it('renders red theme and locked indicator when room is locked', () => {
      const lockedRoom = { ...mockRoom, isLocked: true } as unknown as ITempVoiceRoom;
      const embed = buildRoomDashboardEmbed(lockedRoom);

      assert.strictEqual(embed.color, 0xed4245);
      const statusField = embed.fields?.find((f) => f.name.includes('Status'));
      assert.ok(statusField?.value.includes('🔒 Locked'));
    });

    it('renders interactive action row buttons with matching customIds', () => {
      const rows = buildRoomDashboardComponents(mockRoom);
      assert.strictEqual(rows.length, 1);

      const buttons = rows[0].components as Array<{
        custom_id?: string;
        label: string;
        style: number;
      }>;
      assert.strictEqual(buttons.length, 4);

      assert.strictEqual(buttons[0].custom_id, `tvc_lock:${mockRoom.channelId}`);
      assert.strictEqual(buttons[1].custom_id, `tvc_limit:${mockRoom.channelId}`);
      assert.strictEqual(buttons[2].custom_id, `tvc_rename:${mockRoom.channelId}`);
      assert.strictEqual(buttons[3].custom_id, `tvc_status:${mockRoom.channelId}`);
    });
  });
});
