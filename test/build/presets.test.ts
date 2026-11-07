/**
 * test/build/presets.test.ts
 * Comprehensive unit tests for Architecture Presets Library:
 * - Validation of all 5 production presets (gaming, developer, creator, campus, anime)
 * - ServerBlueprintSchema adherence
 * - validateBlueprintSafety() security checks
 * - Channel structure, topics, slowmodes, and role hierarchies
 * - getPreset, getAllPresets, and getPresetChoices
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESETS,
  getPreset,
  getAllPresets,
  getAllPresetMap,
  getPresetChoices,
  type PresetId,
} from '@/lib/build/presets';
import { ServerBlueprintSchema, validateBlueprintSafety } from '@/lib/ai/blueprint.schema';

describe('Architecture Presets Library (Phase 3 & 4)', () => {
  const PRESET_IDS: PresetId[] = ['gaming', 'developer', 'creator', 'campus', 'anime'];

  describe('Discovery & Retrieval', () => {
    it('defines exactly 5 production presets', () => {
      const presets = getAllPresets();
      assert.equal(presets.length, 5);
      const keys = Object.keys(getAllPresetMap()).sort();
      assert.deepEqual(keys, [...PRESET_IDS].sort());
    });

    it('retrieves presets case-insensitively with trimming', () => {
      const g1 = getPreset('gaming');
      const g2 = getPreset(' GAMING ');
      assert.ok(g1);
      assert.ok(g2);
      assert.equal(g1.name, 'Gaming & Esports Arena');
      assert.equal(g2.name, 'Gaming & Esports Arena');

      const d1 = getPreset('developer');
      assert.ok(d1);
      assert.equal(d1.name, 'Software & Tech Community');

      const c1 = getPreset('creator');
      assert.ok(c1);
      assert.equal(c1.name, 'Content Creator & Streamer');

      const camp = getPreset('campus');
      assert.ok(camp);
      assert.equal(camp.name, 'Study & Academic Campus');

      const an = getPreset('anime');
      assert.ok(an);
      assert.equal(an.name, 'Anime & Social Community');
    });

    it('returns undefined for non-existent or empty preset ids', () => {
      assert.equal(getPreset('nonexistent'), undefined);
      assert.equal(getPreset(''), undefined);
      assert.equal(getPreset(null), undefined);
      assert.equal(getPreset(undefined), undefined);
    });

    it('returns defensive clones to protect constants against mutation', () => {
      const blueprint1 = getPreset('gaming');
      assert.ok(blueprint1);
      blueprint1.name = 'Mutated Gaming Name';

      const blueprint2 = getPreset('gaming');
      assert.ok(blueprint2);
      assert.equal(blueprint2.name, 'Gaming & Esports Arena');
    });

    it('provides valid Discord slash command choices via getPresetChoices()', () => {
      const choices = getPresetChoices();
      assert.equal(choices.length, 5);
      for (const choice of choices) {
        assert.ok(choice.name.length > 0);
        assert.ok(PRESET_IDS.includes(choice.value));
        assert.ok(choice.description.length > 0);
      }
    });
  });

  describe('Blueprint Schema & Safety Validation', () => {
    for (const presetId of PRESET_IDS) {
      describe(`Preset: ${presetId}`, () => {
        const blueprint = PRESETS[presetId];

        it('strictly passes ServerBlueprintSchema validation', () => {
          const parseResult = ServerBlueprintSchema.safeParse(blueprint);
          assert.equal(
            parseResult.success,
            true,
            `Schema validation failed for ${presetId}: ${JSON.stringify(parseResult.error?.issues)}`,
          );
        });

        it('passes validateBlueprintSafety with 0 security warnings/errors', () => {
          const { valid, errors } = validateBlueprintSafety(blueprint);
          assert.equal(valid, true, `Safety errors found for ${presetId}: ${errors.join(', ')}`);
          assert.equal(errors.length, 0);
        });

        it('contains a valid role hierarchy with unique role names', () => {
          assert.ok(blueprint.roles.length >= 4, 'Should define at least 4 roles');
          const roleNames = blueprint.roles.map((r) => r.name.toLowerCase());
          const uniqueRoles = new Set(roleNames);
          assert.equal(roleNames.length, uniqueRoles.size, 'All role names must be unique');

          // Check that staff roles have isStaff: true
          const staffRoles = blueprint.roles.filter((r) => r.isStaff);
          assert.ok(staffRoles.length >= 1, 'Should have at least 1 staff role');
        });

        it('contains well-structured categories with valid channel names and types', () => {
          assert.ok(blueprint.categories.length >= 4, 'Should define at least 4 categories');

          let totalChannels = 0;
          for (const category of blueprint.categories) {
            assert.ok(category.name.length > 0);
            assert.ok(category.channels.length > 0, `Category ${category.name} has no channels`);

            const channelNames = category.channels.map((c) => c.name.toLowerCase());
            const uniqueChannels = new Set(channelNames);
            assert.equal(
              channelNames.length,
              uniqueChannels.size,
              `Channels in ${category.name} must be unique`,
            );

            totalChannels += category.channels.length;

            for (const ch of category.channels) {
              assert.ok(
                ['text', 'voice', 'forum', 'announcement', 'stage'].includes(ch.type),
                `Invalid channel type ${ch.type}`,
              );

              // Private channel references must exist in the blueprint roles
              if (ch.isPrivate && ch.privateRoles) {
                const availableRoles = blueprint.roles.map((r) => r.name);
                for (const privRole of ch.privateRoles) {
                  assert.ok(
                    availableRoles.includes(privRole),
                    `Private role "${privRole}" not in roles list of ${presetId}`,
                  );
                }
              }
            }
          }

          assert.ok(totalChannels >= 10, 'Preset should have at least 10 channels');
        });

        it('includes setup messages and community rules content', () => {
          assert.ok(blueprint.rulesContent, 'Should specify rules content');
          assert.ok(blueprint.rulesContent.channelRef.length > 0);
          assert.ok(blueprint.rulesContent.content.length > 0);

          assert.ok(blueprint.welcomeMessages, 'Should specify welcome messages');
          assert.ok(blueprint.welcomeMessages.length > 0);
        });
      });
    }
  });

  describe('Preset Specific Architecture Details', () => {
    it('verifies gaming preset contains LFG, clips, and team voice lobbies', () => {
      const gaming = getPreset('gaming')!;
      const categoryNames = gaming.categories.map((c) => c.name);
      assert.ok(categoryNames.some((c) => c.includes('LOOKING FOR GROUP') || c.includes('LFG')));
      assert.ok(categoryNames.some((c) => c.includes('VOICE LOBBIES') || c.includes('VOICE')));

      const allChannels = gaming.categories.flatMap((c) => c.channels);
      assert.ok(allChannels.some((ch) => ch.name.includes('lfg')));
      assert.ok(allChannels.some((ch) => ch.name.includes('clips')));
      assert.ok(allChannels.some((ch) => ch.name.includes('Duos')));
      assert.ok(allChannels.some((ch) => ch.type === 'stage'));
    });

    it('verifies developer preset contains tech stacks, code reviews, and pair programming', () => {
      const dev = getPreset('developer')!;
      const allChannels = dev.categories.flatMap((c) => c.channels);
      assert.ok(allChannels.some((ch) => ch.name.includes('typescript')));
      assert.ok(allChannels.some((ch) => ch.name.includes('python')));
      assert.ok(allChannels.some((ch) => ch.name.includes('rust')));
      assert.ok(allChannels.some((ch) => ch.name.includes('code-reviews')));
      assert.ok(allChannels.some((ch) => ch.name.includes('Pair Desk')));
    });

    it('verifies creator preset contains stream alerts, VIP lounge, and fan content', () => {
      const creator = getPreset('creator')!;
      const allChannels = creator.categories.flatMap((c) => c.channels);
      assert.ok(allChannels.some((ch) => ch.name.includes('stream-alerts')));
      assert.ok(allChannels.some((ch) => ch.name.includes('fan-art')));
      assert.ok(allChannels.some((ch) => ch.name.includes('vip-lounge')));
      const vipChannel = allChannels.find((ch) => ch.name === 'vip-lounge')!;
      assert.equal(vipChannel.isPrivate, true);
    });

    it('verifies campus preset contains bulletin, STEM/humanities, and Pomodoro study rooms', () => {
      const campus = getPreset('campus')!;
      const allChannels = campus.categories.flatMap((c) => c.channels);
      assert.ok(allChannels.some((ch) => ch.name.includes('campus-bulletin')));
      assert.ok(allChannels.some((ch) => ch.name.includes('stem')));
      assert.ok(allChannels.some((ch) => ch.name.includes('homework-help')));
      assert.ok(allChannels.some((ch) => ch.name.includes('Pomodoro Focus Room')));
    });

    it('verifies anime preset contains seasonal airing, manga, and watch parties', () => {
      const anime = getPreset('anime')!;
      const allChannels = anime.categories.flatMap((c) => c.channels);
      assert.ok(allChannels.some((ch) => ch.name.includes('seasonal-airing')));
      assert.ok(allChannels.some((ch) => ch.name.includes('manga')));
      assert.ok(allChannels.some((ch) => ch.name.includes('fan-art')));
      assert.ok(allChannels.some((ch) => ch.name.includes('Cinema Stage')));
    });
  });
});
