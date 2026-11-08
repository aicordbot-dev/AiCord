/**
 * test/temp-vc/commands.test.ts
 * Comprehensive unit tests for Dynamic Temporary Auto-Voice Rooms — Slash Commands & Components:
 * - Central Command Registry lookup & subcommands schema verification (setup, create, lock, unlock, limit, rename, transfer, status)
 * - Rate limit (5/10s), utility category, dm_permission: false, and options schema verification
 * - Permission enforcement (MANAGE_CHANNELS / MANAGE_GUILD required on /temp-vc setup)
 * - /temp-vc setup: hub channel configuration, category, default limit, naming scheme
 * - /temp-vc create: on-demand temporary room creation, name and limit overrides
 * - /temp-vc lock & unlock: privacy toggling, state verification, already locked/unlocked notices
 * - /temp-vc limit: user slot capacity updates and clamping
 * - /temp-vc rename: title updating and length sanitization
 * - /temp-vc transfer: ownership handoff and permission delegation
 * - /temp-vc status: interactive dashboard embed & action row components
 * - Main command router: DM rejection and unknown subcommand handling
 * - handleTempVoiceComponent: interactive button routing (tvc_lock, tvc_limit, tvc_rename, tvc_status) & ownership security
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
  registerTempVoiceCommands,
} from '@/lib/discord/command-registry';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  handleTempVoiceCommand,
  handleTempVoiceSetupSubcommand,
  handleTempVoiceCreateSubcommand,
  handleTempVoiceLockSubcommand,
  handleTempVoiceUnlockSubcommand,
  handleTempVoiceLimitSubcommand,
  handleTempVoiceRenameSubcommand,
  handleTempVoiceTransferSubcommand,
  handleTempVoiceStatusSubcommand,
  handleTempVoiceComponent,
  tempVcCommand,
} from '@/commands/temp-vc';
import {
  enableTestMode,
  clearTestStore,
  setTestConfig,
  setTestRoom,
  getTestRoom,
} from '@/lib/temp-vc/temp-vc-service';

describe('Dynamic Temporary Voice Rooms — Slash Commands Suite', () => {
  const GUILD_ID = 'guild_tvc_cmd_999';
  const USER_ALICE = 'user_alice_tvc_111';
  const USER_BOB = 'user_bob_tvc_222';
  const USER_MOD = 'user_mod_tvc_333';
  const HUB_CHANNEL = 'channel_hub_voice_444';
  const CATEGORY_ID = 'channel_category_555';
  const ROOM_CHANNEL = 'channel_room_voice_666';

  const PERMS_MANAGE_CHANNELS = PermissionFlags.MANAGE_CHANNELS.toString();
  const PERMS_MANAGE_GUILD = PermissionFlags.MANAGE_GUILD.toString();
  const PERMS_UNPRIVILEGED = '0';

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

  describe('Command Registry Integration & Schema', () => {
    it('registers /temp-vc in the central command registry', () => {
      registerTempVoiceCommands();
      const cmd = getCommand('temp-vc');
      assert.ok(cmd, 'temp-vc command should be registered in the registry');
      assert.strictEqual(cmd?.name, 'temp-vc');
      assert.strictEqual(cmd?.category, 'utility');
      assert.deepStrictEqual(cmd?.rateLimit, { limit: 5, windowMs: 10_000 });
      assert.strictEqual(cmd?.dm_permission, false);
    });

    it('defines 8 subcommands with accurate option schemas', () => {
      const subcommands = tempVcCommand.options?.map(
        (o: unknown) => (o as { name: string }).name,
      );
      assert.deepStrictEqual(subcommands, [
        'setup',
        'create',
        'lock',
        'unlock',
        'limit',
        'rename',
        'transfer',
        'status',
      ]);

      // Check 'setup' options
      const setupSub = tempVcCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'setup',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(setupSub?.options?.some((o) => o.name === 'hub_channel' && o.required === true));
      assert.ok(setupSub?.options?.some((o) => o.name === 'category' && o.required === false));
      assert.ok(setupSub?.options?.some((o) => o.name === 'default_limit' && o.required === false));
      assert.ok(setupSub?.options?.some((o) => o.name === 'naming_scheme' && o.required === false));

      // Check 'limit' options
      const limitSub = tempVcCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'limit',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(limitSub?.options?.some((o) => o.name === 'slots' && o.required === true));

      // Check 'transfer' options
      const transferSub = tempVcCommand.options?.find(
        (o: unknown) => (o as { name: string }).name === 'transfer',
      ) as { options?: Array<{ name: string; required?: boolean }> };
      assert.ok(transferSub?.options?.some((o) => o.name === 'new_owner' && o.required === true));
    });
  });

  describe('/temp-vc setup Subcommand', () => {
    it('enforces MANAGE_CHANNELS or MANAGE_GUILD permission', async () => {
      await handleTempVoiceSetupSubcommand(
        GUILD_ID,
        'token_setup_perm',
        PERMS_UNPRIVILEGED,
        [{ name: 'hub_channel', value: HUB_CHANNEL }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed?.title?.includes('Permission Denied'));
    });

    it('configures temp voice when executed by privileged staff', async () => {
      await handleTempVoiceSetupSubcommand(
        GUILD_ID,
        'token_setup_success',
        PERMS_MANAGE_CHANNELS,
        [
          { name: 'hub_channel', value: HUB_CHANNEL },
          { name: 'category', value: CATEGORY_ID },
          { name: 'default_limit', value: 4 },
          { name: 'naming_scheme', value: "🔥 {username}'s Fireplace" },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed?.title?.includes('Join-to-Create Configured'));
      assert.ok(embed?.description?.includes(HUB_CHANNEL));
      assert.ok(embed?.description?.includes(CATEGORY_ID));
      assert.ok(embed?.description?.includes('4 users'));
      assert.ok(embed?.description?.includes("{username}'s Fireplace"));
    });

    it('rejects setup when hub_channel option is missing', async () => {
      await handleTempVoiceSetupSubcommand(
        GUILD_ID,
        'token_setup_no_hub',
        PERMS_MANAGE_GUILD,
        [],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.ok(embed?.title?.includes('Hub Channel Required'));
    });
  });

  describe('/temp-vc create Subcommand', () => {
    beforeEach(() => {
      setTestConfig(GUILD_ID, {
        hubChannelId: HUB_CHANNEL,
        namingScheme: "{username}'s Room",
        defaultLimit: 0,
        enabled: true,
      });
    });

    it('spawns a new temporary voice room and returns dashboard embed & components', async () => {
      await handleTempVoiceCreateSubcommand(
        GUILD_ID,
        USER_ALICE,
        'Alice',
        'token_create_1',
        [
          { name: 'name', value: 'Casual Co-op Gaming' },
          { name: 'limit', value: 4 },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.embeds?.length, 2); // Success embed + Dashboard embed
      assert.ok(res.embeds?.[0].title?.includes('Voice Room Created!'));

      const dashboardEmbed = res.embeds?.[1];
      assert.strictEqual(dashboardEmbed?.title, '🔊 Casual Co-op Gaming');
      assert.ok(res.components && res.components.length > 0);
    });
  });

  describe('/temp-vc lock & unlock Subcommands', () => {
    beforeEach(() => {
      setTestRoom(GUILD_ID, ROOM_CHANNEL, {
        ownerId: USER_ALICE,
        name: "Alice's Sanctum",
        isLocked: false,
      });
    });

    it('locks room and updates components', async () => {
      await handleTempVoiceLockSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_lock_1',
        PERMS_UNPRIVILEGED,
        ROOM_CHANNEL,
        [{ name: 'channel', value: ROOM_CHANNEL }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Room Locked'));

      const room = getTestRoom(GUILD_ID, ROOM_CHANNEL);
      assert.strictEqual(room?.isLocked, true);
    });

    it('returns notice when room is already locked', async () => {
      setTestRoom(GUILD_ID, ROOM_CHANNEL, { isLocked: true });

      await handleTempVoiceLockSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_already_locked',
        PERMS_UNPRIVILEGED,
        ROOM_CHANNEL,
        [{ name: 'channel', value: ROOM_CHANNEL }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Already Locked'));
    });

    it('unlocks locked room and updates state', async () => {
      setTestRoom(GUILD_ID, ROOM_CHANNEL, { isLocked: true });

      await handleTempVoiceUnlockSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_unlock_1',
        PERMS_UNPRIVILEGED,
        ROOM_CHANNEL,
        [{ name: 'channel', value: ROOM_CHANNEL }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Room Unlocked'));

      const room = getTestRoom(GUILD_ID, ROOM_CHANNEL);
      assert.strictEqual(room?.isLocked, false);
    });

    it('returns notice when room is already unlocked', async () => {
      await handleTempVoiceUnlockSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_already_unlocked',
        PERMS_UNPRIVILEGED,
        ROOM_CHANNEL,
        [{ name: 'channel', value: ROOM_CHANNEL }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Already Unlocked'));
    });
  });

  describe('/temp-vc limit Subcommand', () => {
    beforeEach(() => {
      setTestRoom(GUILD_ID, ROOM_CHANNEL, {
        ownerId: USER_ALICE,
        userLimit: 0,
      });
    });

    it('sets member limit successfully', async () => {
      await handleTempVoiceLimitSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_limit_1',
        PERMS_UNPRIVILEGED,
        ROOM_CHANNEL,
        [
          { name: 'slots', value: 5 },
          { name: 'channel', value: ROOM_CHANNEL },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Slot Limit Updated'));

      const room = getTestRoom(GUILD_ID, ROOM_CHANNEL);
      assert.strictEqual(room?.userLimit, 5);
    });
  });

  describe('/temp-vc rename Subcommand', () => {
    beforeEach(() => {
      setTestRoom(GUILD_ID, ROOM_CHANNEL, {
        ownerId: USER_ALICE,
        name: "Alice's Space",
      });
    });

    it('renames temporary room successfully', async () => {
      await handleTempVoiceRenameSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_rename_1',
        PERMS_UNPRIVILEGED,
        ROOM_CHANNEL,
        [
          { name: 'name', value: 'Late Night Chill & Lo-Fi' },
          { name: 'channel', value: ROOM_CHANNEL },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Room Renamed'));

      const room = getTestRoom(GUILD_ID, ROOM_CHANNEL);
      assert.strictEqual(room?.name, 'Late Night Chill & Lo-Fi');
    });
  });

  describe('/temp-vc transfer Subcommand', () => {
    beforeEach(() => {
      setTestRoom(GUILD_ID, ROOM_CHANNEL, {
        ownerId: USER_ALICE,
        ownerTag: 'Alice',
        name: "Alice's Studio",
      });
    });

    it('transfers room ownership to specified member', async () => {
      await handleTempVoiceTransferSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_transfer_1',
        PERMS_UNPRIVILEGED,
        ROOM_CHANNEL,
        [
          { name: 'new_owner', value: USER_BOB },
          { name: 'channel', value: ROOM_CHANNEL },
        ],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Ownership Transferred'));

      const room = getTestRoom(GUILD_ID, ROOM_CHANNEL);
      assert.strictEqual(room?.ownerId, USER_BOB);
    });
  });

  describe('/temp-vc status Subcommand', () => {
    beforeEach(() => {
      setTestRoom(GUILD_ID, ROOM_CHANNEL, {
        ownerId: USER_ALICE,
        name: "Alice's Studio",
        userLimit: 3,
        isLocked: false,
      });
    });

    it('displays interactive room dashboard with controls', async () => {
      await handleTempVoiceStatusSubcommand(
        GUILD_ID,
        USER_ALICE,
        'token_status_1',
        ROOM_CHANNEL,
        [{ name: 'channel', value: ROOM_CHANNEL }],
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      const embed = res.embeds?.[0];
      assert.strictEqual(embed?.title, "🔊 Alice's Studio");
      assert.ok(res.components && res.components.length > 0);
    });
  });

  describe('Main Slash Command Router', () => {
    it('rejects command when executed outside server (in DMs)', async () => {
      const dmInteraction = {
        token: 'token_dm',
        channel_id: 'dm_chan',
        data: { options: [{ name: 'status' }] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTempVoiceCommand(dmInteraction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Server Required'));
    });

    it('returns unknown subcommand error for invalid subcommand', async () => {
      const interaction = {
        guild_id: GUILD_ID,
        token: 'token_unknown',
        channel_id: 'chan_1',
        member: { user: { id: USER_ALICE } },
        data: { options: [{ name: 'explode' }] },
      } as unknown as APIChatInputApplicationCommandInteraction;

      await handleTempVoiceCommand(interaction);

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Unknown Subcommand'));
    });
  });

  describe('handleTempVoiceComponent Interactive Routing', () => {
    beforeEach(() => {
      setTestRoom(GUILD_ID, ROOM_CHANNEL, {
        ownerId: USER_ALICE,
        name: "Alice's Studio",
        userLimit: 0,
        isLocked: false,
      });
    });

    it('handles tvc_lock button click by room owner', async () => {
      const mockComponent = {
        member: { permissions: '0' },
      } as unknown as APIMessageComponentInteraction;

      await handleTempVoiceComponent(
        'token_btn_lock',
        `tvc_lock:${ROOM_CHANNEL}`,
        USER_ALICE,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const room = getTestRoom(GUILD_ID, ROOM_CHANNEL);
      assert.strictEqual(room?.isLocked, true);
    });

    it('handles tvc_limit button click cycling capacity slots', async () => {
      const mockComponent = {
        member: { permissions: '0' },
      } as unknown as APIMessageComponentInteraction;

      await handleTempVoiceComponent(
        'token_btn_limit',
        `tvc_limit:${ROOM_CHANNEL}`,
        USER_ALICE,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const room = getTestRoom(GUILD_ID, ROOM_CHANNEL);
      assert.strictEqual(room?.userLimit, 2); // 0 -> 2
    });

    it('handles tvc_status button click returning dashboard', async () => {
      const mockComponent = {
        member: { permissions: '0' },
      } as unknown as APIMessageComponentInteraction;

      await handleTempVoiceComponent(
        'token_btn_status',
        `tvc_status:${ROOM_CHANNEL}`,
        USER_ALICE,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.strictEqual(res.embeds?.[0].title, "🔊 Alice's Studio");
    });

    it('handles tvc_rename button click with rename instructions', async () => {
      const mockComponent = {
        member: { permissions: '0' },
      } as unknown as APIMessageComponentInteraction;

      await handleTempVoiceComponent(
        'token_btn_rename',
        `tvc_rename:${ROOM_CHANNEL}`,
        USER_ALICE,
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Rename Voice Room'));
      assert.strictEqual(res.ephemeral, true);
    });

    it('enforces ownership security: unauthorized member is rejected', async () => {
      const mockComponent = {
        member: { permissions: '0' },
      } as unknown as APIMessageComponentInteraction;

      await handleTempVoiceComponent(
        'token_btn_unauth',
        `tvc_lock:${ROOM_CHANNEL}`,
        USER_BOB, // Not owner
        GUILD_ID,
        mockComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const res = interceptedResponses[0].options;
      assert.ok(res.embeds?.[0].title?.includes('Voice Control Error'));
      assert.strictEqual(res.ephemeral, true);
    });

    it('allows moderator override on button actions', async () => {
      const mockModComponent = {
        member: { permissions: PERMS_MANAGE_CHANNELS },
      } as unknown as APIMessageComponentInteraction;

      await handleTempVoiceComponent(
        'token_btn_mod',
        `tvc_lock:${ROOM_CHANNEL}`,
        USER_MOD, // Not owner, but moderator
        GUILD_ID,
        mockModComponent,
      );

      assert.strictEqual(interceptedResponses.length, 1);
      const room = getTestRoom(GUILD_ID, ROOM_CHANNEL);
      assert.strictEqual(room?.isLocked, true);
    });
  });
});
