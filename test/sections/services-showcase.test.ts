import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { MASTER_SERVICES, NEXT_GEN_SERVICES, ALL_FEATURES } from '../../src/config/features';
import { ServicesShowcase, ServiceFilterTab } from '../../src/components/sections/ServicesShowcase';
import { openCommandPalette } from '../../src/components/ui/CommandPalette';

test('Services Showcase Section — Redesigned Sleek Catalog', async (t) => {
  await t.test('declares exactly 28 total production-grade services', () => {
    assert.equal(ALL_FEATURES.length, 28, 'Must have exactly 28 services');
    assert.equal(MASTER_SERVICES.length, 18, 'Must have 18 master services');
    assert.equal(NEXT_GEN_SERVICES.length, 10, 'Must have 10 next-gen services');
  });

  await t.test('verifies Top 6 Spotlight services contain core flagship services', () => {
    const spotlightIds = ['build', 'ban', 'balance', 'rank', 'ticket', 'tempvc'];
    assert.equal(spotlightIds.length, 6, 'Must specify exactly 6 spotlight services');

    for (const id of spotlightIds) {
      const match = ALL_FEATURES.find((s) => s.id === id);
      assert.ok(match, `Spotlight service ${id} must exist in catalog`);
      assert.ok(match.commands.length > 0, `Spotlight service ${id} must have commands`);
    }
  });

  await t.test('verifies category classification covers all 28 services cleanly', () => {
    const architectIds = ['build', 'customize', 'premium', 'audit'];
    const modIds = ['ban', 'kick', 'timeout', 'warn', 'purge', 'role', 'channel', 'category'];
    const economyIds = ['balance', 'daily', 'shop', 'leaderboard'];
    const engagementIds = ['rank', 'ticket', 'confess', 'pet', 'worldclock', 'quiz', 'countdown'];
    const devtoolsIds = ['run', 'git'];
    const voiceIds = ['tempvc', 'transcribe', 'clip'];

    const categorizedSum =
      architectIds.length +
      modIds.length +
      economyIds.length +
      engagementIds.length +
      devtoolsIds.length +
      voiceIds.length;

    assert.equal(categorizedSum, 28, 'All 28 services must be cleanly mapped without overlap');

    const allCategorizedIds = [
      ...architectIds,
      ...modIds,
      ...economyIds,
      ...engagementIds,
      ...devtoolsIds,
      ...voiceIds,
    ];

    const uniqueSet = new Set(allCategorizedIds);
    assert.equal(uniqueSet.size, 28, 'Every service must appear exactly once');

    for (const feature of ALL_FEATURES) {
      assert.ok(
        uniqueSet.has(feature.id),
        `Feature ${feature.id} (${feature.name}) must belong to a category`
      );
    }
  });

  await t.test('verifies ServicesShowcase component is a valid React function component', () => {
    assert.equal(typeof ServicesShowcase, 'function');
    const element = React.createElement(ServicesShowcase);
    assert.ok(React.isValidElement(element), 'ServicesShowcase must be a valid React element');
  });

  await t.test('verifies openCommandPalette supports query parameter for command chips', () => {
    assert.doesNotThrow(() => openCommandPalette());
    assert.doesNotThrow(() => openCommandPalette('/build'));
    assert.doesNotThrow(() => openCommandPalette('/ticket'));
    assert.doesNotThrow(() => openCommandPalette('/radio'));
  });
});
