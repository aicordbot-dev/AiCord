/**
 * test/styles/themes.test.ts
 * Comprehensive unit tests for Universal Custom Screens Suite:
 * - 6 Comprehensive Themes configuration & hex colors
 * - getTheme() retrieval, normalization, and fallback to cyberpunk
 * - getAllThemes() discovery
 * - formatThemedHeader() ornamentation and title rendering
 * - renderThemedProgressBar() character sets (pipes, blocks, squares, retro)
 * - Percentage clamping, length boundaries, and theme id resolution
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES,
  BAR_STYLES,
  getTheme,
  getAllThemes,
  getAllBarStyles,
  formatThemedHeader,
  renderThemedProgressBar,
  isValidTheme,
  isValidBarStyle,
  THEME_CHOICES,
  BAR_STYLE_CHOICES,
  type ThemeId,
  type BarStyle,
} from '@/lib/styles/themes';

describe('Universal Custom Screens Suite — Theme & Style Foundation', () => {
  // ─── 1. Theme Configuration & Aesthetics ──────────────────────────────────

  describe('Theme Configurations', () => {
    it('defines exactly 6 comprehensive themes', () => {
      const themes = getAllThemes();
      assert.equal(themes.length, 6);
      const themeIds = themes.map((t) => t.id).sort();
      assert.deepEqual(themeIds, ['cyberpunk', 'emerald', 'frost', 'gold', 'midnight', 'retro'].sort());
    });

    it('verifies cyberpunk theme aesthetics', () => {
      const theme = THEMES.cyberpunk;
      assert.equal(theme.id, 'cyberpunk');
      assert.equal(theme.primaryColor, 0x00f0ff); // Neon Cyan
      assert.equal(theme.accentColor, 0xff003c); // Neon Red
      assert.equal(theme.header, '「 ✦ CYBERPUNK DECK ✦ 」');
      assert.equal(theme.barStyle, 'pipes');
    });

    it('verifies midnight theme aesthetics', () => {
      const theme = THEMES.midnight;
      assert.equal(theme.id, 'midnight');
      assert.equal(theme.primaryColor, 0x6c5ce7); // Deep Purple
      assert.equal(theme.accentColor, 0xa29bfe); // Accent Lavender
      assert.equal(theme.header, '★ ━━━━━ MIDNIGHT ROYALE ━━━━━ ★');
      assert.equal(theme.barStyle, 'blocks');
    });

    it('verifies emerald theme aesthetics', () => {
      const theme = THEMES.emerald;
      assert.equal(theme.id, 'emerald');
      assert.equal(theme.primaryColor, 0x00b894); // Emerald Green
      assert.equal(theme.accentColor, 0x55efc4); // Accent Mint
      assert.equal(theme.header, '🌿 ──── EMERALD SANCTUARY ──── 🌿');
      assert.equal(theme.barStyle, 'pipes');
    });

    it('verifies gold theme aesthetics', () => {
      const theme = THEMES.gold;
      assert.equal(theme.id, 'gold');
      assert.equal(theme.primaryColor, 0xfdcb6e); // Bullion Gold
      assert.equal(theme.accentColor, 0xe17055); // Accent Amber
      assert.equal(theme.header, '🪙 ════ GOLDEN TYCOON ════ 🪙');
      assert.equal(theme.barStyle, 'squares');
    });

    it('verifies retro theme aesthetics', () => {
      const theme = THEMES.retro;
      assert.equal(theme.id, 'retro');
      assert.equal(theme.primaryColor, 0xfd79a8); // 80s Pink
      assert.equal(theme.accentColor, 0x0984e3); // Accent Blue
      assert.equal(theme.header, '[=== 🕹️ RETRO ARCADE 🕹️ ===]');
      assert.equal(theme.barStyle, 'retro');
    });

    it('verifies frost theme aesthetics', () => {
      const theme = THEMES.frost;
      assert.equal(theme.id, 'frost');
      assert.equal(theme.primaryColor, 0x74b9ff); // Ice Blue
      assert.equal(theme.accentColor, 0xdfe6e9); // Accent Silver
      assert.equal(theme.header, '❄️ ─── NORDIC FROST ─── ❄️');
      assert.equal(theme.barStyle, 'blocks');
    });
  });

  // ─── 2. Theme Lookup & Validation ─────────────────────────────────────────

  describe('getTheme() & Validation', () => {
    it('retrieves valid theme by exact id', () => {
      const theme = getTheme('gold');
      assert.equal(theme.id, 'gold');
      assert.equal(theme.name, 'Gold');
    });

    it('normalizes case and surrounding whitespace', () => {
      const theme = getTheme('  MiDnIgHt  ');
      assert.equal(theme.id, 'midnight');
      assert.equal(theme.name, 'Midnight');
    });

    it('falls back safely to cyberpunk when id is missing, null, or undefined', () => {
      assert.equal(getTheme().id, 'cyberpunk');
      assert.equal(getTheme(null).id, 'cyberpunk');
      assert.equal(getTheme('').id, 'cyberpunk');
    });

    it('falls back safely to cyberpunk when id is unknown', () => {
      assert.equal(getTheme('non_existent_theme').id, 'cyberpunk');
    });

    it('validates theme ids correctly via isValidTheme()', () => {
      assert.equal(isValidTheme('cyberpunk'), true);
      assert.equal(isValidTheme('midnight'), true);
      assert.equal(isValidTheme('emerald'), true);
      assert.equal(isValidTheme('gold'), true);
      assert.equal(isValidTheme('retro'), true);
      assert.equal(isValidTheme('frost'), true);
      assert.equal(isValidTheme('vaporwave'), false);
      assert.equal(isValidTheme(''), false);
      assert.equal(isValidTheme(undefined), false);
    });

    it('validates bar styles correctly via isValidBarStyle()', () => {
      assert.equal(isValidBarStyle('pipes'), true);
      assert.equal(isValidBarStyle('blocks'), true);
      assert.equal(isValidBarStyle('squares'), true);
      assert.equal(isValidBarStyle('retro'), true);
      assert.equal(isValidBarStyle('unknown'), false);
    });

    it('provides autocomplete choices for themes and bar styles', () => {
      assert.equal(THEME_CHOICES.length, 6);
      assert.equal(BAR_STYLE_CHOICES.length, 4);
    });
  });

  // ─── 3. Header Formatting ─────────────────────────────────────────────────

  describe('formatThemedHeader()', () => {
    it('returns default banner header when title is omitted or empty', () => {
      assert.equal(formatThemedHeader('cyberpunk'), '「 ✦ CYBERPUNK DECK ✦ 」');
      assert.equal(formatThemedHeader('midnight'), '★ ━━━━━ MIDNIGHT ROYALE ━━━━━ ★');
      assert.equal(formatThemedHeader(THEMES.emerald, ''), '🌿 ──── EMERALD SANCTUARY ──── 🌿');
      assert.equal(formatThemedHeader('gold', null), '🪙 ════ GOLDEN TYCOON ════ 🪙');
    });

    it('decorates custom titles with theme-specific borders', () => {
      assert.equal(formatThemedHeader('cyberpunk', 'RANK PROGRESS'), '「 ✦ RANK PROGRESS ✦ 」');
      assert.equal(formatThemedHeader('midnight', 'LEADERBOARD'), '★ ━━━━━ LEADERBOARD ━━━━━ ★');
      assert.equal(formatThemedHeader('emerald', 'WALLET BALANCE'), '🌿 ──── WALLET BALANCE ──── 🌿');
      assert.equal(formatThemedHeader('gold', 'HIGH ROLLER'), '🪙 ════ HIGH ROLLER ════ 🪙');
      assert.equal(formatThemedHeader('retro', 'LEVEL UP'), '[=== 🕹️ LEVEL UP 🕹️ ===]');
      assert.equal(formatThemedHeader('frost', 'STATS OVERVIEW'), '❄️ ─── STATS OVERVIEW ─── ❄️');
    });

    it('accepts ThemeConfig objects as well as theme id strings', () => {
      const theme = getTheme('frost');
      assert.equal(formatThemedHeader(theme, 'VICTORY'), '❄️ ─── VICTORY ─── ❄️');
    });
  });

  // ─── 4. Themed Progress Bar Rendering ─────────────────────────────────────

  describe('renderThemedProgressBar()', () => {
    it('renders pipes style (▰▱) accurately', () => {
      const empty = renderThemedProgressBar(0, 'pipes', 10);
      assert.equal(empty, '[▱▱▱▱▱▱▱▱▱▱] 0%');

      const half = renderThemedProgressBar(50, 'pipes', 10);
      assert.equal(half, '[▰▰▰▰▰▱▱▱▱▱] 50%');

      const full = renderThemedProgressBar(100, 'pipes', 10);
      assert.equal(full, '[▰▰▰▰▰▰▰▰▰▰] 100%');
    });

    it('renders blocks style (█░) accurately', () => {
      const half = renderThemedProgressBar(50, 'blocks', 10);
      assert.equal(half, '[█████░░░░░] 50%');
    });

    it('renders squares style (■□) accurately', () => {
      const half = renderThemedProgressBar(50, 'squares', 10);
      assert.equal(half, '[■■■■■□□□□□] 50%');
    });

    it('renders retro style (▓░) accurately', () => {
      const half = renderThemedProgressBar(50, 'retro', 10);
      assert.equal(half, '[▓▓▓▓▓░░░░░] 50%');
    });

    it('resolves bar style from theme id if passed as style parameter', () => {
      // gold theme has barStyle 'squares'
      const goldBar = renderThemedProgressBar(50, 'gold', 10);
      assert.equal(goldBar, '[■■■■■□□□□□] 50%');

      // cyberpunk theme has barStyle 'pipes'
      const cyberBar = renderThemedProgressBar(50, 'cyberpunk', 10);
      assert.equal(cyberBar, '[▰▰▰▰▰▱▱▱▱▱] 50%');
    });

    it('clamps negative percentages to 0%', () => {
      const bar = renderThemedProgressBar(-25, 'pipes', 10);
      assert.equal(bar, '[▱▱▱▱▱▱▱▱▱▱] 0%');
    });

    it('clamps excessive percentages to 100%', () => {
      const bar = renderThemedProgressBar(150, 'pipes', 10);
      assert.equal(bar, '[▰▰▰▰▰▰▰▰▰▰] 100%');
    });

    it('handles non-finite and NaN values gracefully', () => {
      const nanBar = renderThemedProgressBar(NaN, 'pipes', 10);
      assert.equal(nanBar, '[▱▱▱▱▱▱▱▱▱▱] 0%');
    });

    it('enforces length boundaries (clamped between 4 and 50)', () => {
      const minBar = renderThemedProgressBar(50, 'pipes', 2);
      // Min length 4: 2 filled, 2 empty
      assert.equal(minBar, '[▰▰▱▱] 50%');

      const customBar = renderThemedProgressBar(50, 'pipes', 16);
      assert.equal(customBar, '[▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱] 50%');
    });
  });
});
