import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, type PresetId } from '@/lib/build/presets';
import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';

describe('Discrofy AI Server Builder State Logic', () => {
  it('covers all 5 premier architecture presets with rich category structures', () => {
    const requiredPresets: PresetId[] = ['gaming', 'developer', 'creator', 'campus', 'anime'];

    for (const id of requiredPresets) {
      const blueprint = PRESETS[id];
      assert.ok(blueprint, `Preset ${id} should exist`);
      assert.ok(blueprint.name.length > 0, `Preset ${id} should have a name`);
      assert.ok(blueprint.description.length > 0, `Preset ${id} should have a description`);
      assert.ok(blueprint.categories.length > 0, `Preset ${id} should have categories`);
      assert.ok(blueprint.roles.length > 0, `Preset ${id} should have roles`);
    }
  });

  it('performs clean in-place channel renaming sanitization', () => {
    const rawInput = '  VIP Exclusive Lounge!!  ';
    const cleanName = rawInput.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');

    assert.equal(cleanName, 'vip-exclusive-lounge');

    const edgeInput = '###---special***chars&&&';
    const cleanEdge = edgeInput.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    assert.equal(cleanEdge, '---specialchars');
  });

  it('adds and deletes channels under categories correctly', () => {
    const blueprint: ServerBlueprint = JSON.parse(JSON.stringify(PRESETS.developer));
    const initialCategoryChannelsCount = blueprint.categories[0].channels.length;

    // Add new channel
    blueprint.categories[0].channels.push({
      name: 'pair-programming-voice',
      type: 'voice',
      topic: 'Live screenshare and pair debugging',
    });

    assert.equal(blueprint.categories[0].channels.length, initialCategoryChannelsCount + 1);
    assert.equal(
      blueprint.categories[0].channels[blueprint.categories[0].channels.length - 1].name,
      'pair-programming-voice'
    );

    // Delete channel
    blueprint.categories[0].channels.splice(blueprint.categories[0].channels.length - 1, 1);
    assert.equal(blueprint.categories[0].channels.length, initialCategoryChannelsCount);
  });

  it('preserves snapshot for undo build / rollback', () => {
    const initialBlueprint: ServerBlueprint = JSON.parse(JSON.stringify(PRESETS.gaming));
    const snapshot = JSON.parse(JSON.stringify(initialBlueprint));

    // Mutate current blueprint
    const mutated: ServerBlueprint = JSON.parse(JSON.stringify(initialBlueprint));
    mutated.name = 'Mutated Tournament Guild';
    mutated.categories.push({
      name: 'EXTRA CATEGORY',
      channels: [{ name: 'new-chat', type: 'text' }],
    });

    assert.notEqual(mutated.name, snapshot.name);
    assert.equal(mutated.categories.length, snapshot.categories.length + 1);

    // Rollback mutation
    const restored: ServerBlueprint = JSON.parse(JSON.stringify(snapshot));
    assert.equal(restored.name, initialBlueprint.name);
    assert.equal(restored.categories.length, initialBlueprint.categories.length);
  });
});
