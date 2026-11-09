import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';

import { COMMANDS_DATA, openCommandPalette } from '../../src/components/ui/CommandPalette';
import { STUDIO_THEMES } from '../../src/components/sections/ThemeStudio';
import {
  isSoundEnabled,
  setSoundEnabled,
  toggleSound,
  playPop,
  playChime,
  playCard,
  playSuccess,
  playUnbox,
  onSoundStateChange,
} from '../../src/lib/audio';

test('Elite Web Experience & Interactive Marketing Suite', async (t) => {
  // ─── 1. Command Search Palette Data Verification ──────────────────────────
  await t.test('Command Palette contains all 28+ commands with rich metadata', () => {
    assert.ok(COMMANDS_DATA.length >= 28, `Expected at least 28 commands, got ${COMMANDS_DATA.length}`);

    const commandNames = COMMANDS_DATA.map((c) => c.name);

    // Verify key commands requested in requirements
    const expectedKeyCommands = [
      '/build',
      '/ai',
      '/transcribe',
      '/rank',
      '/levels',
      '/birthdays',
      '/reaction-roles',
      '/starboard',
      '/blackjack',
      '/economy',
      '/games',
      '/adventure',
      '/bounty',
      '/giveaway',
      '/ticket',
      '/modmail',
      '/worldclock',
      '/countdown',
      '/radio',
      '/temp-vc',
      '/clip',
      '/mod',
      '/role',
      '/channel',
      '/run',
      '/git',
      '/confess',
      '/pet',
      '/skins',
      '/customize',
      '/premium',
    ];

    for (const expected of expectedKeyCommands) {
      assert.ok(
        commandNames.includes(expected),
        `Expected command ${expected} to be present in COMMANDS_DATA`
      );
    }

    // Verify all commands have proper required fields
    for (const cmd of COMMANDS_DATA) {
      assert.ok(cmd.name.startsWith('/'), `Command ${cmd.name} must start with /`);
      assert.ok(cmd.syntax.length > 0, `Command ${cmd.name} must have a non-empty syntax`);
      assert.ok(cmd.description.length > 0, `Command ${cmd.name} must have a description`);
      assert.ok(cmd.category.length > 0, `Command ${cmd.name} must have a category`);
      assert.ok(cmd.permissions.length > 0, `Command ${cmd.name} must specify permissions`);
      assert.ok(cmd.example.length > 0, `Command ${cmd.name} must specify an example`);
      assert.ok(cmd.preview.length > 0, `Command ${cmd.name} must specify an embed preview`);
    }
  });

  // ─── 2. Signature Theme Studio Verification ──────────────────────────────
  await t.test('Theme Studio defines all 6 luxury aesthetic themes', () => {
    assert.equal(STUDIO_THEMES.length, 6, 'Must define exactly 6 signature themes');

    const themeIds = STUDIO_THEMES.map((th) => th.id);
    const expectedIds = ['blurple', 'cyberpunk', 'midnight', 'emerald', 'gold', 'retro'];

    for (const id of expectedIds) {
      assert.ok(themeIds.includes(id), `Theme ${id} must be in STUDIO_THEMES`);
    }

    for (const theme of STUDIO_THEMES) {
      assert.ok(theme.name.length > 0, `Theme ${theme.id} must have a name`);
      assert.ok(theme.primary.startsWith('#'), `Theme ${theme.id} primary must be hex`);
      assert.ok(theme.accent.startsWith('#'), `Theme ${theme.id} accent must be hex`);
      assert.ok(theme.header.length > 0, `Theme ${theme.id} must have header ornamentation`);
      assert.ok(['pipes', 'blocks', 'squares', 'retro'].includes(theme.barStyle));
    }
  });

  // ─── 3. Procedural WebAudio State & Resilience ────────────────────────────
  await t.test('WebAudio helper handles SSR / headless Node gracefully', () => {
    // Sound is muted by default
    assert.equal(isSoundEnabled(), false);

    // Calling synthesize routines in headless environment should not crash or throw
    assert.doesNotThrow(() => playPop());
    assert.doesNotThrow(() => playChime());
    assert.doesNotThrow(() => playCard());
    assert.doesNotThrow(() => playSuccess());
    assert.doesNotThrow(() => playUnbox());

    // State change subscriptions should be un-subscribable without error
    const unsubscribe = onSoundStateChange(() => {});
    assert.equal(typeof unsubscribe, 'function');
    assert.doesNotThrow(() => unsubscribe());

    // Toggle helper in SSR
    assert.doesNotThrow(() => toggleSound());
    assert.doesNotThrow(() => setSoundEnabled(false));
  });

  // ─── 4. Command Palette Helper Trigger ────────────────────────────────────
  await t.test('openCommandPalette dispatches custom event safely', () => {
    assert.doesNotThrow(() => openCommandPalette());
  });
});
