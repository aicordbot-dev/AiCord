import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';

import { siteConfig } from '../../src/config/site';
import { copyConfig } from '../../src/config/copy';
import { SIGNATURE_THEMES, BAR_STYLES, THEME_LIST, BAR_STYLE_LIST } from '../../src/config/themes';
import { MASTER_SERVICES, NEXT_GEN_SERVICES, ALL_FEATURES } from '../../src/config/features';
import { PRICING_PLANS, COMPARISON_MATRIX, PLAN_LIST } from '../../src/config/plans';
import { statsConfig } from '../../src/config/stats';
import {
  BOT_PERMISSIONS_CATALOG,
  ADMIN_PERMISSIONS_INTEGER,
  RECOMMENDED_PERMISSIONS_INTEGER,
  buildDiscordOAuthUrl,
} from '../../src/config/bot-permissions';
import { CAMERA_POSES, cameraConfig, getPoseForProgress } from '../../src/config/camera';

test('Phase A Config Layer — Site & Copy Configuration', async (t) => {
  await t.test('siteConfig contains required URLs and invite generator', () => {
    assert.equal(siteConfig.name, 'AiCord');
    assert.ok(siteConfig.url.startsWith('http'));
    assert.ok(siteConfig.discordClientId.length >= 17);
    const inviteUrl = siteConfig.getInviteUrl('8');
    assert.ok(inviteUrl.includes('permissions=8'));
    assert.ok(inviteUrl.includes('applications.commands'));
  });

  await t.test('copyConfig contains Section 8 master copy and H1', () => {
    assert.equal(copyConfig.hero.h1, 'Your Discord server, built by AI in minutes.');
    assert.ok(copyConfig.hero.sub.includes('Synthesize full category layouts'));
    assert.equal(copyConfig.hero.badge, 'GOOGLE GEMINI 2.5 + THREE.JS WEBGL');
    assert.ok(copyConfig.constellation.title.includes('Interactive Guild Topology'));
    assert.ok(copyConfig.pricing.headline.length > 0);
    assert.ok(copyConfig.finalCta.title.includes('Ready to Architect'));
  });
});

test('Phase A Config Layer — Themes & Bar Styles', async (t) => {
  await t.test('declares all 6 signature themes with hexes and CSS vars', () => {
    assert.equal(THEME_LIST.length, 6);
    const expectedThemes = ['cyberpunk', 'midnight', 'emerald', 'gold', 'retro', 'frost'];

    for (const themeId of expectedThemes) {
      const theme = SIGNATURE_THEMES[themeId as keyof typeof SIGNATURE_THEMES];
      assert.ok(theme, `Theme ${themeId} must be declared`);
      assert.ok(theme.primaryHex.startsWith('#'), `Theme ${themeId} primaryHex invalid`);
      assert.ok(theme.accentHex.startsWith('#'), `Theme ${themeId} accentHex invalid`);
      assert.ok(theme.bgHex.startsWith('#'), `Theme ${themeId} bgHex invalid`);
      assert.ok(theme.ornamentation.left.length > 0);
      assert.ok(theme.ornamentation.right.length > 0);
      assert.ok(theme.cssVariables.primary.length > 0);
    }
  });

  await t.test('declares all 4 ASCII progress bar styles', () => {
    assert.equal(BAR_STYLE_LIST.length, 4);
    assert.deepEqual(BAR_STYLES.pipes, {
      filled: '▰',
      empty: '▱',
      name: 'Neon Pipes',
      example: '▰▰▰▰▰▰▱▱▱▱',
    });
    assert.equal(BAR_STYLES.blocks.filled, '█');
    assert.equal(BAR_STYLES.squares.filled, '■');
    assert.equal(BAR_STYLES.retro.filled, '▓');
  });
});

test('Phase A Config Layer — Features & Services Catalog', async (t) => {
  await t.test('declares 18 master services and 10 next-gen services (28 total)', () => {
    assert.equal(MASTER_SERVICES.length, 18);
    assert.equal(NEXT_GEN_SERVICES.length, 10);
    assert.equal(ALL_FEATURES.length, 28);
  });

  await t.test('verifies each feature has required metadata, status, and tier', () => {
    for (const feature of ALL_FEATURES) {
      assert.ok(feature.id.length > 0, 'feature id required');
      assert.ok(feature.name.length > 0, 'feature name required');
      assert.ok(feature.icon.length > 0, 'feature icon required');
      assert.ok(feature.commands.length > 0, 'feature commands required');
      assert.ok(feature.pitch.length > 0, 'feature pitch required');
      assert.ok(['live', 'beta', 'coming-soon'].includes(feature.status));
      assert.ok(['free', 'pro', 'ultimate', 'lifetime'].includes(feature.tier));
    }
  });

  await t.test('confirms next-gen power services are marked isNextGen: true', () => {
    const nextGenIds = [
      'confess',
      'run',
      'pet',
      'worldclock',
      'transcribe',
      'git',
      'tempvc',
      'quiz',
      'countdown',
      'clip',
    ];
    for (const id of nextGenIds) {
      const match = NEXT_GEN_SERVICES.find((s) => s.id === id);
      assert.ok(match, `Expected next-gen service ${id}`);
      assert.equal(match.isNextGen, true);
    }
  });
});

test('Phase A Config Layer — Plans & Pricing Entitlements', async (t) => {
  await t.test('declares Free, Pro, Ultimate, and Lifetime Sovereign plans', () => {
    assert.equal(PLAN_LIST.length, 4);
    assert.ok(PRICING_PLANS.free);
    assert.ok(PRICING_PLANS.pro);
    assert.ok(PRICING_PLANS.ultimate);
    assert.ok(PRICING_PLANS.lifetime);
  });

  await t.test('verifies tier limits and comparison matrix integrity', () => {
    assert.equal(PRICING_PLANS.free.limits.aiBuildsPerMonth, 3);
    assert.equal(PRICING_PLANS.pro.limits.aiBuildsPerMonth, 15);
    assert.equal(PRICING_PLANS.ultimate.limits.aiBuildsPerMonth, -1);
    assert.equal(PRICING_PLANS.lifetime.limits.aiBuildsPerMonth, -1);

    assert.ok(COMPARISON_MATRIX.length >= 10);
  });
});

test('Phase A Config Layer — Operational Statistics (isSample enforcement)', async (t) => {
  await t.test('all counters strictly enforce isSample: true', () => {
    assert.equal(statsConfig.isSample, true);
    assert.equal(statsConfig.sampleLabel, 'sample data');

    for (const [key, stat] of Object.entries(statsConfig.counters)) {
      assert.equal(
        stat.isSample,
        true,
        `Counter ${key} must have isSample: true flag set per spec rule 5`
      );
      assert.ok(stat.value.length > 0);
      assert.ok(stat.numericValue > 0);
    }

    for (const metric of statsConfig.heroMetrics) {
      assert.equal(metric.isSample, true);
    }
  });
});

test('Phase A Config Layer — Bot Permissions & Camera Poses', async (t) => {
  await t.test('declares Administrator integer and recommended least-privilege list', () => {
    assert.equal(ADMIN_PERMISSIONS_INTEGER, '8');
    assert.equal(RECOMMENDED_PERMISSIONS_INTEGER, '534723950656');
    assert.ok(BOT_PERMISSIONS_CATALOG.length >= 15);

    const url = buildDiscordOAuthUrl('123456789012345678', '8');
    assert.ok(url.includes('client_id=123456789012345678'));
    assert.ok(url.includes('permissions=8'));
  });

  await t.test('cameraConfig defines scroll scene poses and interpolates smoothly', () => {
    assert.equal(cameraConfig.poseList.length, 6);
    assert.ok(CAMERA_POSES.hero);
    assert.ok(CAMERA_POSES.sandbox);
    assert.ok(CAMERA_POSES.themes);
    assert.ok(CAMERA_POSES.features);
    assert.ok(CAMERA_POSES.pricing);
    assert.ok(CAMERA_POSES.cta);

    // Test pose interpolation helper
    const heroPose = getPoseForProgress(0.05);
    assert.equal(heroPose.fromPose.id, 'hero');
    assert.ok(heroPose.blend >= 0 && heroPose.blend <= 1);

    const ctaPose = getPoseForProgress(0.98);
    assert.equal(ctaPose.fromPose.id, 'cta');
  });
});
