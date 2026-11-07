/**
 * test/build/onboarding.test.ts
 * Unit tests for Auto-Deployed Community Guidelines & Onboarding Suite:
 * - buildOnboardingEmbeds generation, theme decoration, and content
 * - All 6 themes styling and colors
 * - Fallback defaults and Discord limits compliance
 * - deployOnboardingGuide REST posting and error handling
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOnboardingEmbeds,
  deployOnboardingGuide,
} from '@/lib/discord/onboarding-generator';
import { THEMES, getAllThemes, type ThemeId } from '@/lib/styles/themes';
import { setDiscordRest, resetDiscordRest } from '@/lib/discord/rest';
import type { REST } from '@discordjs/rest';

describe('Auto-Deployed Community Guidelines & Onboarding', () => {
  afterEach(() => {
    resetDiscordRest();
  });

  describe('buildOnboardingEmbeds()', () => {
    it('generates exactly 3 distinct styled embeds', () => {
      const embeds = buildOnboardingEmbeds('Test Esports Arena', 'cyberpunk');
      assert.equal(embeds.length, 3);

      const [rules, directory, features] = embeds;
      assert.ok(rules.title?.includes('SERVER RULES'));
      assert.ok(directory.title?.includes('CHANNEL DIRECTORY'));
      assert.ok(features.title?.includes('GETTING STARTED'));
    });

    it('interpolates server name across embeds', () => {
      const serverName = 'Valkyrie Esports Club';
      const embeds = buildOnboardingEmbeds(serverName, 'midnight');

      assert.ok(embeds[0].description?.includes(serverName));
      assert.ok(embeds[0].footer?.text?.includes(serverName));
      assert.ok(embeds[1].description?.includes(serverName));
      assert.ok(embeds[1].footer?.text?.includes(serverName));
      assert.ok(embeds[2].description?.includes(serverName));
      assert.ok(embeds[2].footer?.text?.includes(serverName));
    });

    it('falls back safely to default server name if empty or missing', () => {
      const embeds = buildOnboardingEmbeds('', 'emerald');
      assert.ok(embeds[0].description?.includes('Community Server'));
      assert.ok(embeds[0].footer?.text?.includes('Community Server'));
    });

    it('applies theme colors and headers across all 6 themes', () => {
      const allThemes = getAllThemes();
      assert.equal(allThemes.length, 6);

      for (const theme of allThemes) {
        const embeds = buildOnboardingEmbeds('Theme Testing Realm', theme.id);
        const [rules, directory, features] = embeds;

        // Rules & Features should use primaryColor
        assert.equal(rules.color, theme.primaryColor);
        assert.equal(features.color, theme.primaryColor);

        // Directory should use accentColor
        assert.equal(directory.color, theme.accentColor);

        // Titles should contain theme ornamentation
        assert.ok(rules.title?.includes(theme.ornamentation.left.trim()));
        assert.ok(directory.title?.includes(theme.ornamentation.left.trim()));
        assert.ok(features.title?.includes(theme.ornamentation.left.trim()));
      }
    });

    it('falls back to cyberpunk theme when themeId is invalid or undefined', () => {
      const embeds = buildOnboardingEmbeds('Fallback Server', 'invalid_theme' as ThemeId);
      assert.equal(embeds[0].color, THEMES.cyberpunk.primaryColor);
      assert.equal(embeds[1].color, THEMES.cyberpunk.accentColor);
    });

    it('includes rich navigation fields in directory embed', () => {
      const embeds = buildOnboardingEmbeds('Alpha Server', 'gold');
      const directory = embeds[1];
      assert.ok(directory.fields);
      assert.ok(directory.fields.length >= 4);

      const fieldNames = directory.fields.map((f) => f.name);
      assert.ok(fieldNames.some((n) => n.includes('Information')));
      assert.ok(fieldNames.some((n) => n.includes('Community')));
      assert.ok(fieldNames.some((n) => n.includes('Voice')));
      assert.ok(fieldNames.some((n) => n.includes('Support')));
    });

    it('includes interactive feature guides in features embed', () => {
      const embeds = buildOnboardingEmbeds('Beta Server', 'retro');
      const features = embeds[2];
      assert.ok(features.fields);
      assert.ok(features.fields.length >= 4);

      const fieldNames = features.fields.map((f) => f.name);
      assert.ok(fieldNames.some((n) => n.includes('Profile Customization')));
      assert.ok(fieldNames.some((n) => n.includes('XP & Progression')));
      assert.ok(fieldNames.some((n) => n.includes('Economy')));
      assert.ok(fieldNames.some((n) => n.includes('Interactive Help')));
    });
  });

  describe('deployOnboardingGuide()', () => {
    it('successfully posts onboarding embeds via Discord REST', async () => {
      let postedRoute = '';
      let postedBody: unknown = null;

      const mockRest = {
        post: async (route: string, options: { body: unknown }) => {
          postedRoute = route;
          postedBody = options.body;
          return { id: 'msg_deployed_999' };
        },
      } as unknown as REST;

      setDiscordRest(mockRest);

      const result = await deployOnboardingGuide(
        'guild_test_1',
        'channel_rules_101',
        'frost',
        'Glacial Community',
      );

      assert.equal(result.success, true);
      assert.deepEqual(result.messageIds, ['msg_deployed_999']);
      assert.ok(postedRoute.includes('channel_rules_101'));

      const body = postedBody as { embeds: unknown[] };
      assert.ok(Array.isArray(body.embeds));
      assert.equal(body.embeds.length, 3);
    });

    it('handles REST errors gracefully and returns failure result without throwing', async () => {
      const mockRest = {
        post: async () => {
          throw new Error('50001: Missing Access to channel');
        },
      } as unknown as REST;

      setDiscordRest(mockRest);

      const result = await deployOnboardingGuide(
        'guild_test_1',
        'channel_forbidden_403',
        'cyberpunk',
        'Cyber Security Hub',
      );

      assert.equal(result.success, false);
      assert.deepEqual(result.messageIds, []);
      assert.ok(result.error?.includes('Missing Access'));
    });
  });
});
