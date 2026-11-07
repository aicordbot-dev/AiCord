/**
 * test/build/build-applier.test.ts
 * Comprehensive unit tests for Build Applier & Live Construction Suite:
 * - 4-phase live build execution (Roles, Categories, Channels, Welcome & Onboarding)
 * - Auto-onboarding guide deployment into #rules or #welcome
 * - Throttled live progress updates with renderThemedProgressBar
 * - Error handling, rollback mechanics, and completion embed generation
 * - applyBuildJob orchestrator with authorization & job status tracking
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBlueprint,
  applyBuildJob,
  rollbackBuild,
  type BuildProgressMeta,
} from '@/lib/discord/build-applier';
import { getPreset } from '@/lib/build/presets';
import { setDiscordRest, resetDiscordRest } from '@/lib/discord/rest';
import {
  setResponseHandler,
  type InteractionResponseOptions,
} from '@/lib/discord/interaction-response';
import { BuildJob, type BuildStep } from '@/models/BuildJob';
import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import type { REST } from '@discordjs/rest';

describe('Build Applier & Live Construction Suite (Phase 4)', () => {
  const GUILD_ID = 'guild_build_999';
  let createdResources: {
    roles: Array<{ name: string; id: string }>;
    categories: Array<{ name: string; id: string }>;
    channels: Array<{ name: string; id: string }>;
    messages: Array<{ channelId: string; id: string }>;
  };
  let interceptedEdits: Array<{ token: string; payload: InteractionResponseOptions }>;
  let idCounter = 1000;

  beforeEach(() => {
    idCounter = 1000;
    interceptedEdits = [];
    createdResources = {
      roles: [],
      categories: [],
      channels: [],
      messages: [],
    };

    setResponseHandler(async (token, payload) => {
      interceptedEdits.push({ token, payload });
    });

    const mockRest = {
      get: async (route: string) => {
        if (route.includes('/channels')) {
          return createdResources.channels.map((ch) => ({ id: ch.id, name: ch.name }));
        }
        return { features: ['COMMUNITY'] };
      },
      post: async (route: string, options: { body: unknown }) => {
        idCounter++;
        const id = `created_${idCounter}`;
        const body = options?.body as Record<string, unknown> | undefined;

        if (route.includes('/roles')) {
          createdResources.roles.push({ name: String(body?.name || id), id });
        } else if (route.includes('/messages')) {
          const parts = route.split('/');
          const channelId = parts[parts.indexOf('channels') + 1] || 'ch_unknown';
          createdResources.messages.push({ channelId, id });
        } else if (route.includes('/channels')) {
          if (body?.type === 4) {
            // GuildCategory
            createdResources.categories.push({ name: String(body?.name || id), id });
          } else {
            createdResources.channels.push({ name: String(body?.name || id), id });
          }
        }
        return { id };
      },
      delete: async () => ({}),
    } as unknown as REST;

    setDiscordRest(mockRest);
  });

  afterEach(() => {
    resetDiscordRest();
    setResponseHandler(null);
  });

  describe('applyBlueprint() 4-Phase Execution', () => {
    it('executes all 4 phases and reports progressive percentages (5% -> 25% -> 45% -> 85% -> 100%)', async () => {
      const blueprint = getPreset('gaming')!;
      assert.ok(blueprint);

      const progressSnapshots: Array<{ steps: BuildStep[]; meta?: BuildProgressMeta }> = [];

      const result = await applyBlueprint({
        guildId: GUILD_ID,
        blueprint,
        themeId: 'cyberpunk',
        onProgress: async (steps, meta) => {
          progressSnapshots.push({ steps: [...steps], meta });
        },
      });

      assert.equal(result.success, true);
      assert.ok(result.createdIds.roles.length > 0);
      assert.ok(result.createdIds.categories.length > 0);
      assert.ok(result.createdIds.channels.length > 0);
      assert.ok(result.createdIds.messages.length > 0);

      // Verify all 4 phases occurred in metadata
      const phasesRecorded = progressSnapshots
        .map((s) => s.meta?.phase)
        .filter((p): p is 1 | 2 | 3 | 4 => p !== undefined);

      assert.ok(phasesRecorded.includes(1), 'Phase 1 should be recorded');
      assert.ok(phasesRecorded.includes(2), 'Phase 2 should be recorded');
      assert.ok(phasesRecorded.includes(3), 'Phase 3 should be recorded');
      assert.ok(phasesRecorded.includes(4), 'Phase 4 should be recorded');

      // Verify final percent reached 100%
      const finalMeta = progressSnapshots[progressSnapshots.length - 1]?.meta;
      assert.equal(finalMeta?.percent, 100);
      assert.equal(finalMeta?.phase, 4);
    });

    it('auto-deploys onboarding guide into rules or welcome channel in Phase 4', async () => {
      const blueprint: ServerBlueprint = {
        name: 'Auto-Onboard Guild',
        description: 'Test community with auto-onboarding',
        roles: [
          { name: 'Admin', isStaff: true, permissions: '0' },
          { name: 'Member', permissions: '0' },
        ],
        categories: [
          {
            name: '📌 INFORMATION',
            channels: [
              { name: 'rules-and-faq', type: 'text', topic: 'Rules for members' },
              { name: 'general', type: 'text', topic: 'General chat' },
            ],
          },
        ],
        welcomeMessages: [
          { channelRef: 'general', content: 'Welcome everyone to the server!' },
        ],
      };

      const result = await applyBlueprint({
        guildId: GUILD_ID,
        blueprint,
        themeId: 'emerald',
      });

      assert.equal(result.success, true);

      // Verify created messages include onboarding guide and welcome message
      assert.ok(result.createdIds.messages.length >= 2);
    });

    it('handles role creation failure and stops further phases', async () => {
      const failingRest = {
        get: async () => ({ features: [] }),
        post: async (route: string) => {
          if (route.includes('/roles')) {
            throw new Error('50013: Missing Permissions to create roles');
          }
          return { id: 'created_x' };
        },
      } as unknown as REST;

      setDiscordRest(failingRest);

      const blueprint = getPreset('developer')!;
      const result = await applyBlueprint({
        guildId: GUILD_ID,
        blueprint,
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes('Failed to create roles'));
      assert.equal(result.createdIds.categories.length, 0);
      assert.equal(result.createdIds.channels.length, 0);
    });
  });

  describe('rollbackBuild() Mechanics', () => {
    it('deletes created messages, channels, categories, and roles while skipping @everyone', async () => {
      const deletedRoutes: string[] = [];

      const deleteTrackingRest = {
        delete: async (route: string) => {
          deletedRoutes.push(route);
          return {};
        },
      } as unknown as REST;

      setDiscordRest(deleteTrackingRest);

      await rollbackBuild(GUILD_ID, {
        roles: ['role_1', GUILD_ID, 'role_2'], // GUILD_ID is @everyone
        categories: ['cat_1'],
        channels: ['chan_1', 'chan_2'],
        messages: [{ channelId: 'chan_1', messageId: 'msg_1' }],
      });

      // Role delete route should not contain GUILD_ID (everyone role)
      assert.ok(deletedRoutes.some((r) => r.includes('role_1')));
      assert.ok(deletedRoutes.some((r) => r.includes('role_2')));
      assert.ok(!deletedRoutes.some((r) => r.endsWith(`/roles/${GUILD_ID}`)));

      // Channels and categories deleted
      assert.ok(deletedRoutes.some((r) => r.includes('cat_1')));
      assert.ok(deletedRoutes.some((r) => r.includes('chan_1')));
      assert.ok(deletedRoutes.some((r) => r.includes('chan_2')));

      // Message deleted
      assert.ok(deletedRoutes.some((r) => r.includes('msg_1')));
    });
  });

  describe('applyBuildJob() Orchestrator & Live Themed Progress', () => {
    it('rejects execution if build job is not found', async () => {
      // Mock findById returning null
      const origFindById = BuildJob.findById;
      (BuildJob as unknown as { findById: unknown }).findById = async () => null;

      try {
        await assert.rejects(
          async () => {
            await applyBuildJob({
              jobId: 'nonexistent_job',
              interactionToken: 'token_123',
            });
          },
          /Build job not found/,
        );
      } finally {
        (BuildJob as unknown as { findById: unknown }).findById = origFindById;
      }
    });

    it('rejects execution if job is not in preview state', async () => {
      const mockJob = {
        _id: 'job_done_101',
        status: 'done',
        userId: 'user_initiator_1',
        guildId: GUILD_ID,
      };

      const origFindById = BuildJob.findById;
      (BuildJob as unknown as { findById: unknown }).findById = async () => mockJob;

      try {
        await assert.rejects(
          async () => {
            await applyBuildJob({
              jobId: 'job_done_101',
              interactionToken: 'token_123',
            });
          },
          /not in preview state/,
        );
      } finally {
        (BuildJob as unknown as { findById: unknown }).findById = origFindById;
      }
    });

    it('rejects execution if another user attempts to confirm the build', async () => {
      const mockJob = {
        _id: 'job_prev_102',
        status: 'preview',
        userId: 'user_initiator_1',
        guildId: GUILD_ID,
      };

      const origFindById = BuildJob.findById;
      (BuildJob as unknown as { findById: unknown }).findById = async () => mockJob;

      try {
        await assert.rejects(
          async () => {
            await applyBuildJob({
              jobId: 'job_prev_102',
              interactionToken: 'token_123',
              userId: 'user_malicious_2',
            });
          },
          /Unauthorized/,
        );
      } finally {
        (BuildJob as unknown as { findById: unknown }).findById = origFindById;
      }
    });

    it('successfully applies build job, sends live progress with renderThemedProgressBar, and sends completion embed', async () => {
      const blueprint = getPreset('campus')!;
      let savedStatus = 'preview';
      let savedCreatedIds: unknown = null;
      let savedSteps: unknown = null;

      const mockJob = {
        _id: 'job_active_200',
        guildId: GUILD_ID,
        userId: 'user_ok',
        interactionToken: 'token_init',
        status: 'preview',
        blueprint,
        steps: [] as BuildStep[],
        createdIds: {},
        save: async function () {
          savedStatus = this.status;
          savedCreatedIds = this.createdIds;
          savedSteps = this.steps;
          return this;
        },
      };

      const origFindById = BuildJob.findById;
      (BuildJob as unknown as { findById: unknown }).findById = async () => mockJob;

      try {
        const result = await applyBuildJob({
          jobId: 'job_active_200',
          interactionToken: 'token_button_press',
          userId: 'user_ok',
          themeId: 'gold',
        });

        assert.equal(result.success, true);
        assert.equal(savedStatus, 'done');
        assert.ok(savedCreatedIds);
        assert.ok(Array.isArray(savedSteps));

        // Verify interaction edits occurred
        assert.ok(interceptedEdits.length >= 2, 'Should have received multiple live edits');

        // Verify live progress embeds contained progress bars and 4 phases
        const firstEdit = interceptedEdits[0];
        const firstEmbed = firstEdit.payload.embeds?.[0];
        assert.ok(firstEmbed);
        assert.ok(firstEmbed.description?.includes('BUILD PROGRESS') || firstEmbed.title?.includes('BUILD PROGRESS'));
        assert.ok(firstEmbed.description?.includes('Phase 1: 🎭 Roles Hierarchy'));
        assert.ok(firstEmbed.description?.includes('Phase 2: 📁 Categories Setup'));
        assert.ok(firstEmbed.description?.includes('Phase 3: 💬 Channels & Overwrites'));
        assert.ok(firstEmbed.description?.includes('Phase 4: 📜 Welcome & Community Guidelines'));

        // Verify completion edit
        const lastEdit = interceptedEdits[interceptedEdits.length - 1];
        assert.ok(lastEdit.payload.components?.length! > 0, 'Should attach undo action row');
      } finally {
        (BuildJob as unknown as { findById: unknown }).findById = origFindById;
      }
    });
  });
});
