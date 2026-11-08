/**
 * test/giveaways/giveaway-service.test.ts
 * Unit tests for Interactive Giveaways & Raffles Suite Engine:
 * - parseDuration (seconds, minutes, hours, days, combined tokens, case insensitivity, validation)
 * - Giveaway creation, active listing, and retrieval
 * - Entry toggle mechanics (enter, leave, multiple users)
 * - State checks (ended and expired giveaways)
 * - Level requirement gating (minLevel)
 * - Role requirement gating (requiredRoleId)
 * - Combined requirements gating
 * - Fair duplicate-free random winner drawing
 * - Winner reroll mechanics
 * - Discord embed & interactive ActionRow component builders
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  parseDuration,
  createGiveaway,
  getGiveaway,
  listActiveGiveaways,
  enterGiveaway,
  endGiveaway,
  rerollGiveaway,
  drawRandomWinners,
  buildGiveawayEmbed,
  buildEndedGiveawayEmbed,
  buildGiveawayComponents,
  setTestGiveaway,
} from '@/lib/giveaways/giveaway-service';
import type { IGiveaway } from '@/models';

describe('Interactive Giveaways Suite — Service Engine', () => {
  const GUILD_ID = 'guild_gw_service_101';
  const CHANNEL_ID = 'channel_gw_101';
  const HOST_ID = 'user_host_101';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    enableTestMode(false);
  });

  // ─── 1. Duration Parser ───────────────────────────────────────────────────────

  describe('parseDuration()', () => {
    it('parses single unit seconds correctly', () => {
      assert.equal(parseDuration('30s'), 30_000);
      assert.equal(parseDuration('1s'), 1_000);
      assert.equal(parseDuration('60s'), 60_000);
    });

    it('parses single unit minutes correctly', () => {
      assert.equal(parseDuration('10m'), 600_000);
      assert.equal(parseDuration('1m'), 60_000);
      assert.equal(parseDuration('45m'), 2_700_000);
    });

    it('parses single unit hours correctly', () => {
      assert.equal(parseDuration('2h'), 7_200_000);
      assert.equal(parseDuration('1h'), 3_600_000);
      assert.equal(parseDuration('24h'), 86_400_000);
    });

    it('parses single unit days correctly', () => {
      assert.equal(parseDuration('7d'), 604_800_000);
      assert.equal(parseDuration('1d'), 86_400_000);
      assert.equal(parseDuration('14d'), 1_209_600_000);
    });

    it('handles case-insensitivity and whitespace', () => {
      assert.equal(parseDuration(' 10M '), 600_000);
      assert.equal(parseDuration('2H'), 7_200_000);
      assert.equal(parseDuration('7D'), 604_800_000);
      assert.equal(parseDuration('30S'), 30_000);
    });

    it('parses combined duration tokens accurately', () => {
      // 1d 2h = 86400000 + 7200000 = 93600000
      assert.equal(parseDuration('1d 2h'), 93_600_000);
      // 2h 30m = 7200000 + 1800000 = 9000000
      assert.equal(parseDuration('2h 30m'), 9_000_000);
      // 1h 15m 30s = 3600000 + 900000 + 30000 = 4530000
      assert.equal(parseDuration('1h 15m 30s'), 4_530_000);
    });

    it('throws descriptive error on invalid duration formats', () => {
      assert.throws(() => parseDuration(''), /Invalid duration/);
      assert.throws(() => parseDuration('abc'), /Invalid duration/);
      assert.throws(() => parseDuration('10x'), /Invalid duration/);
      assert.throws(() => parseDuration('0s'), /greater than zero/);
      assert.throws(() => parseDuration('-5m'), /Invalid duration/);
      assert.throws(() => parseDuration('2 hours'), /Invalid duration/);
    });
  });

  // ─── 2. Creation & Active Listing ─────────────────────────────────────────────

  describe('Giveaway Lifecycle: Creation & Listing', () => {
    it('creates a giveaway with default 1 winner and active status', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Discord Nitro 1-Year',
        durationMs: 3_600_000, // 1 hour
      });

      assert.ok(giveaway);
      assert.equal(giveaway.guildId, GUILD_ID);
      assert.equal(giveaway.channelId, CHANNEL_ID);
      assert.equal(giveaway.hostId, HOST_ID);
      assert.equal(giveaway.prize, 'Discord Nitro 1-Year');
      assert.equal(giveaway.winnersCount, 1);
      assert.equal(giveaway.ended, false);
      assert.deepEqual(giveaway.entries, []);
      assert.deepEqual(giveaway.winners, []);
      assert.ok(giveaway.messageId);
      assert.ok(giveaway.endsAt.getTime() > Date.now());
    });

    it('creates a giveaway with custom winner count and requirements', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Gaming Keyboard',
        durationMs: 7_200_000,
        winnersCount: 3,
        minLevel: 15,
        requiredRoleId: 'role_subscriber',
      });

      assert.equal(giveaway.winnersCount, 3);
      assert.equal(giveaway.requirements.minLevel, 15);
      assert.equal(giveaway.requirements.requiredRoleId, 'role_subscriber');
    });

    it('retrieves an existing giveaway by messageId', async () => {
      const created = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'AiCord VIP Pass',
        durationMs: 1_800_000,
      });

      const fetched = await getGiveaway(GUILD_ID, created.messageId);
      assert.ok(fetched);
      assert.equal(fetched.messageId, created.messageId);
      assert.equal(fetched.prize, 'AiCord VIP Pass');

      const nonExistent = await getGiveaway(GUILD_ID, 'non_existent_msg');
      assert.equal(nonExistent, null);
    });

    it('lists only active non-ended giveaways for the guild', async () => {
      const g1 = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Prize 1',
        durationMs: 3_600_000,
      });

      const g2 = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Prize 2',
        durationMs: 7_200_000,
      });

      // Another guild
      await createGiveaway({
        guildId: 'other_guild',
        channelId: 'other_chan',
        hostId: HOST_ID,
        prize: 'Other Guild Prize',
        durationMs: 3_600_000,
      });

      let active = await listActiveGiveaways(GUILD_ID);
      assert.equal(active.length, 2);
      assert.equal(active[0].prize, 'Prize 1');
      assert.equal(active[1].prize, 'Prize 2');

      // End g1
      await endGiveaway(GUILD_ID, g1.messageId);
      active = await listActiveGiveaways(GUILD_ID);
      assert.equal(active.length, 1);
      assert.equal(active[0].messageId, g2.messageId);
    });
  });

  // ─── 3. Entry Toggling Mechanics ─────────────────────────────────────────────

  describe('enterGiveaway() Entry Toggling', () => {
    it('enters a user on first call and leaves on second call', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Steam $50 Gift Card',
        durationMs: 3_600_000,
      });

      // First call: enters
      const enterRes = await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_alice');
      assert.equal(enterRes.status, 'entered');
      assert.equal(enterRes.entryCount, 1);
      assert.deepEqual(enterRes.giveaway?.entries, ['user_alice']);

      // Second call: leaves
      const leaveRes = await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_alice');
      assert.equal(leaveRes.status, 'left');
      assert.equal(leaveRes.entryCount, 0);
      assert.deepEqual(leaveRes.giveaway?.entries, []);
    });

    it('handles multiple users entering independently', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Custom Role',
        durationMs: 3_600_000,
      });

      await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_1');
      await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_2');
      const r3 = await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_3');

      assert.equal(r3.entryCount, 3);
      assert.deepEqual(r3.giveaway?.entries, ['user_1', 'user_2', 'user_3']);

      // user_2 leaves
      const rLeave = await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_2');
      assert.equal(rLeave.status, 'left');
      assert.equal(rLeave.entryCount, 2);
      assert.deepEqual(rLeave.giveaway?.entries, ['user_1', 'user_3']);
    });

    it('rejects entry if giveaway message is not found', async () => {
      const res = await enterGiveaway(GUILD_ID, 'non_existent_id', 'user_alice');
      assert.equal(res.status, 'not_found');
      assert.equal(res.entryCount, 0);
    });

    it('rejects entry if giveaway is already ended', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Mystery Box',
        durationMs: 3_600_000,
      });

      await endGiveaway(GUILD_ID, giveaway.messageId);

      const res = await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_alice');
      assert.equal(res.status, 'ended');
      assert.equal(res.entryCount, 0);
    });

    it('rejects entry if giveaway endsAt timestamp has expired', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Expired Key',
        durationMs: 10,
      });

      // Simulate expiration
      giveaway.endsAt = new Date(Date.now() - 5_000);
      setTestGiveaway(giveaway);

      const res = await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_alice');
      assert.equal(res.status, 'ended');
    });
  });

  // ─── 4. Level & Role Gating ──────────────────────────────────────────────────

  describe('Requirements Gating (Level & Role)', () => {
    it('enforces minLevel gating: rejects users below requirement and accepts users meeting it', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'High-Level Bounty',
        durationMs: 3_600_000,
        minLevel: 10,
      });

      // User with Level 5: rejected
      const underLevel = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_low',
        5,
        [],
      );
      assert.equal(underLevel.status, 'level_too_low');
      assert.equal(underLevel.entryCount, 0);

      // User with undefined level: rejected (defaults to 0)
      const undefLevel = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_undef',
        undefined,
        [],
      );
      assert.equal(undefLevel.status, 'level_too_low');

      // User with Level 10: accepted
      const exactLevel = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_exact',
        10,
        [],
      );
      assert.equal(exactLevel.status, 'entered');
      assert.equal(exactLevel.entryCount, 1);

      // User with Level 25: accepted
      const highLevel = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_high',
        25,
        [],
      );
      assert.equal(highLevel.status, 'entered');
      assert.equal(highLevel.entryCount, 2);
    });

    it('enforces requiredRoleId gating: rejects users missing role and accepts users with role', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'VIP Exclusive Lounge Access',
        durationMs: 3_600_000,
        requiredRoleId: 'role_vip_pass',
      });

      // User with no roles: rejected
      const noRoles = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_guest',
        20,
        [],
      );
      assert.equal(noRoles.status, 'missing_role');

      // User with wrong roles: rejected
      const wrongRoles = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_member',
        20,
        ['role_regular', 'role_active'],
      );
      assert.equal(wrongRoles.status, 'missing_role');

      // User with required role: accepted
      const vipUser = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_vip',
        20,
        ['role_regular', 'role_vip_pass'],
      );
      assert.equal(vipUser.status, 'entered');
      assert.equal(vipUser.entryCount, 1);
    });

    it('enforces combined level AND role gating', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Master Champion Crown',
        durationMs: 3_600_000,
        minLevel: 20,
        requiredRoleId: 'role_champion',
      });

      // Low level, has role -> level_too_low
      const r1 = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_low_role',
        15,
        ['role_champion'],
      );
      assert.equal(r1.status, 'level_too_low');

      // High level, missing role -> missing_role
      const r2 = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_high_norole',
        50,
        ['role_regular'],
      );
      assert.equal(r2.status, 'missing_role');

      // Both satisfied -> entered
      const r3 = await enterGiveaway(
        GUILD_ID,
        giveaway.messageId,
        'user_champ',
        25,
        ['role_champion'],
      );
      assert.equal(r3.status, 'entered');
    });
  });

  // ─── 5. Winner Selection Mechanics ───────────────────────────────────────────

  describe('Winner Drawing & Reroll Mechanics', () => {
    it('drawRandomWinners() selects unique winners without duplicates', () => {
      const entries = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
      const winners = drawRandomWinners(entries, 3);

      assert.equal(winners.length, 3);
      assert.equal(new Set(winners).size, 3, 'all winners must be unique');
      for (const w of winners) {
        assert.ok(entries.includes(w));
      }
    });

    it('drawRandomWinners() respects exclusion array', () => {
      const entries = ['user_1', 'user_2', 'user_3', 'user_4'];
      const winners = drawRandomWinners(entries, 2, ['user_1', 'user_2']);

      assert.equal(winners.length, 2);
      assert.ok(!winners.includes('user_1'));
      assert.ok(!winners.includes('user_2'));
      assert.ok(winners.includes('user_3'));
      assert.ok(winners.includes('user_4'));
    });

    it('endGiveaway() draws up to winnersCount unique winners and marks ended', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Gaming Headset',
        durationMs: 3_600_000,
        winnersCount: 2,
      });

      // Enter 4 participants
      for (let i = 1; i <= 4; i++) {
        await enterGiveaway(GUILD_ID, giveaway.messageId, `participant_${i}`);
      }

      const { winners, giveaway: ended } = await endGiveaway(
        GUILD_ID,
        giveaway.messageId,
      );

      assert.equal(ended.ended, true);
      assert.equal(winners.length, 2);
      assert.equal(new Set(winners).size, 2, 'winners must be unique');
      assert.deepEqual(ended.winners, winners);
    });

    it('endGiveaway() handles fewer entries than winnersCount gracefully', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Rare Badge',
        durationMs: 3_600_000,
        winnersCount: 5,
      });

      await enterGiveaway(GUILD_ID, giveaway.messageId, 'lone_ranger');

      const { winners } = await endGiveaway(GUILD_ID, giveaway.messageId);
      assert.equal(winners.length, 1);
      assert.equal(winners[0], 'lone_ranger');
    });

    it('endGiveaway() handles zero entries with empty winners list', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Unclaimed Trophy',
        durationMs: 3_600_000,
        winnersCount: 3,
      });

      const { winners, giveaway: ended } = await endGiveaway(
        GUILD_ID,
        giveaway.messageId,
      );
      assert.equal(ended.ended, true);
      assert.deepEqual(winners, []);
    });

    it('rerollGiveaway() draws new winners excluding previous winners when possible', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Mystery Loot',
        durationMs: 3_600_000,
        winnersCount: 1,
      });

      await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_a');
      await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_b');
      await enterGiveaway(GUILD_ID, giveaway.messageId, 'user_c');

      // End initially
      const initial = await endGiveaway(GUILD_ID, giveaway.messageId);
      const originalWinner = initial.winners[0];
      assert.ok(originalWinner);

      // Reroll
      const rerollRes = await rerollGiveaway(GUILD_ID, giveaway.messageId, 1);
      assert.equal(rerollRes.newWinners.length, 1);
      assert.notEqual(
        rerollRes.newWinners[0],
        originalWinner,
        'rerolled winner should exclude previous winner',
      );
      assert.deepEqual(rerollRes.giveaway.winners, rerollRes.newWinners);
    });

    it('rerollGiveaway() falls back to whole pool if all entries were already winners', async () => {
      const giveaway = await createGiveaway({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        hostId: HOST_ID,
        prize: 'Solo Bounty',
        durationMs: 3_600_000,
        winnersCount: 1,
      });

      await enterGiveaway(GUILD_ID, giveaway.messageId, 'only_user');
      await endGiveaway(GUILD_ID, giveaway.messageId);

      // Reroll with only 1 participant in total
      const rerollRes = await rerollGiveaway(GUILD_ID, giveaway.messageId, 1);
      assert.equal(rerollRes.newWinners.length, 1);
      assert.equal(rerollRes.newWinners[0], 'only_user');
    });
  });

  // ─── 6. Embed & Component Builders ───────────────────────────────────────────

  describe('Embed & Component Presentation', () => {
    it('buildGiveawayEmbed() builds eye-catching embed with countdown, host, and requirements', () => {
      const fakeGiveaway: IGiveaway = {
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        messageId: 'gw_embed_test',
        prize: 'Cyberpunk LED Neon Sign',
        winnersCount: 2,
        hostId: HOST_ID,
        endsAt: new Date(Date.now() + 3_600_000),
        ended: false,
        entries: ['user_1', 'user_2', 'user_3'],
        winners: [],
        requirements: {
          minLevel: 5,
          requiredRoleId: 'role_enthusiast',
        },
      } as unknown as IGiveaway;

      const embed = buildGiveawayEmbed(fakeGiveaway);

      assert.ok(embed.title?.includes('🎉 GIVEAWAY: Cyberpunk LED Neon Sign 🎉'));
      assert.ok(embed.description?.includes(`<@${HOST_ID}>`));
      assert.ok(embed.description?.includes('**2**'));
      assert.ok(embed.description?.includes('**3**'));
      assert.ok(embed.description?.includes('Level 5'));
      assert.ok(embed.description?.includes('role_enthusiast'));
      assert.ok(embed.footer?.text.includes('2 Winners'));
      assert.ok(embed.timestamp);
    });

    it('buildEndedGiveawayEmbed() displays winner mentions and concluded status', () => {
      const endedGiveaway: IGiveaway = {
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        messageId: 'gw_ended_embed',
        prize: 'Grand Prize Laptop',
        winnersCount: 2,
        hostId: HOST_ID,
        endsAt: new Date(Date.now() - 10_000),
        ended: true,
        entries: ['user_1', 'user_2', 'user_3', 'user_4'],
        winners: ['user_2', 'user_4'],
        requirements: {},
      } as unknown as IGiveaway;

      const embed = buildEndedGiveawayEmbed(endedGiveaway);

      assert.ok(embed.title?.includes('🎉 GIVEAWAY ENDED: Grand Prize Laptop 🎉'));
      assert.ok(embed.description?.includes('<@user_2>'));
      assert.ok(embed.description?.includes('<@user_4>'));
      assert.ok(embed.description?.includes('**4**'));
      assert.equal(embed.footer?.text, 'Giveaway Concluded');
    });

    it('buildGiveawayComponents() creates ActionRow with Enter button and counter', () => {
      const activeGiveaway: IGiveaway = {
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        messageId: 'msg_btn_123',
        prize: 'Test',
        winnersCount: 1,
        hostId: HOST_ID,
        endsAt: new Date(),
        ended: false,
        entries: ['u1', 'u2', 'u3', 'u4', 'u5'],
        winners: [],
        requirements: {},
      } as unknown as IGiveaway;

      const rows = buildGiveawayComponents(activeGiveaway);
      assert.equal(rows.length, 1);

      const btn = rows[0].components[0] as {
        type: number;
        label: string;
        custom_id: string;
        disabled?: boolean;
      };
      assert.equal(btn.type, 2);
      assert.equal(btn.label, '🎉 Enter (5)');
      assert.equal(btn.custom_id, 'gw_enter:msg_btn_123');
      assert.equal(btn.disabled, false);

      // When ended: button is disabled
      activeGiveaway.ended = true;
      const endedRows = buildGiveawayComponents(activeGiveaway);
      const endedBtn = endedRows[0].components[0] as { disabled?: boolean };
      assert.equal(endedBtn.disabled, true);
    });
  });
});
