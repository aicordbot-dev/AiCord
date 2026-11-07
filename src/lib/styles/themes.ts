/**
 * src/lib/styles/themes.ts
 * Universal Custom Screens Suite — Theme & Style Foundation for AiCord.
 *
 * Provides:
 * - 6 comprehensive themes: Cyberpunk, Midnight, Emerald, Gold, Retro, Frost
 * - Progress bar renderers with character sets (pipes, blocks, squares, retro)
 * - Header decorators and formatters
 * - Theme lookup and discovery utilities
 */

export type ThemeId = 'cyberpunk' | 'midnight' | 'emerald' | 'gold' | 'retro' | 'frost';
export type BarStyle = 'pipes' | 'blocks' | 'squares' | 'retro';

export interface BarCharacterSet {
  filled: string;
  empty: string;
}

export interface HeaderOrnamentation {
  left: string;
  right: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  primaryColor: number;
  accentColor: number;
  header: string;
  barStyle: BarStyle;
  icon: string;
  ornamentation: HeaderOrnamentation;
}

// ─── Character Sets for Progress Bars ─────────────────────────────────────────

export const BAR_STYLES: Record<BarStyle, BarCharacterSet> = {
  pipes: { filled: '▰', empty: '▱' },
  blocks: { filled: '█', empty: '░' },
  squares: { filled: '■', empty: '□' },
  retro: { filled: '▓', empty: '░' },
};

// ─── Theme Configurations ─────────────────────────────────────────────────────

export const THEMES: Record<ThemeId, ThemeConfig> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'High-tech neon cyan and vivid red deck aesthetics',
    primaryColor: 0x00f0ff, // Neon Cyan
    accentColor: 0xff003c, // Accent Neon Red
    header: '「 ✦ CYBERPUNK DECK ✦ 」',
    barStyle: 'pipes',
    icon: '⚡',
    ornamentation: {
      left: '「 ✦ ',
      right: ' ✦ 」',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep royal purple elegance with soothing lavender accents',
    primaryColor: 0x6c5ce7, // Deep Purple
    accentColor: 0xa29bfe, // Accent Lavender
    header: '★ ━━━━━ MIDNIGHT ROYALE ━━━━━ ★',
    barStyle: 'blocks',
    icon: '🌙',
    ornamentation: {
      left: '★ ━━━━━ ',
      right: ' ━━━━━ ★',
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    description: 'Lush natural sanctuary with serene mint and emerald hues',
    primaryColor: 0x00b894, // Emerald Green
    accentColor: 0x55efc4, // Accent Mint
    header: '🌿 ──── EMERALD SANCTUARY ──── 🌿',
    barStyle: 'pipes',
    icon: '🌿',
    ornamentation: {
      left: '🌿 ──── ',
      right: ' ──── 🌿',
    },
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    description: 'Prestigious bullion gold paired with warm tycoon amber',
    primaryColor: 0xfdcb6e, // Bullion Gold
    accentColor: 0xe17055, // Accent Amber
    header: '🪙 ════ GOLDEN TYCOON ════ 🪙',
    barStyle: 'squares',
    icon: '🪙',
    ornamentation: {
      left: '🪙 ════ ',
      right: ' ════ 🪙',
    },
  },
  retro: {
    id: 'retro',
    name: 'Retro',
    description: '80s synthwave arcade neon pink with electric blue',
    primaryColor: 0xfd79a8, // 80s Pink
    accentColor: 0x0984e3, // Accent Blue
    header: '[=== 🕹️ RETRO ARCADE 🕹️ ===]',
    barStyle: 'retro',
    icon: '🕹️',
    ornamentation: {
      left: '[=== 🕹️ ',
      right: ' 🕹️ ===]',
    },
  },
  frost: {
    id: 'frost',
    name: 'Frost',
    description: 'Crisp glacial ice blue complemented by pristine Nordic silver',
    primaryColor: 0x74b9ff, // Ice Blue
    accentColor: 0xdfe6e9, // Accent Silver
    header: '❄️ ─── NORDIC FROST ─── ❄️',
    barStyle: 'blocks',
    icon: '❄️',
    ornamentation: {
      left: '❄️ ─── ',
      right: ' ─── ❄️',
    },
  },
};

// ─── Theme Choices for Slash Command Autocomplete ─────────────────────────────

export const THEME_CHOICES: Array<{ name: string; value: ThemeId }> = [
  { name: 'Cyberpunk (Neon Cyan & Red)', value: 'cyberpunk' },
  { name: 'Midnight (Deep Purple & Lavender)', value: 'midnight' },
  { name: 'Emerald (Emerald Green & Mint)', value: 'emerald' },
  { name: 'Gold (Bullion Gold & Amber)', value: 'gold' },
  { name: 'Retro (80s Pink & Arcade Blue)', value: 'retro' },
  { name: 'Frost (Ice Blue & Silver)', value: 'frost' },
];

export const BAR_STYLE_CHOICES: Array<{ name: string; value: BarStyle }> = [
  { name: 'Pipes (▰▱)', value: 'pipes' },
  { name: 'Blocks (█░)', value: 'blocks' },
  { name: 'Retro (▓░)', value: 'retro' },
  { name: 'Squares (■□)', value: 'squares' },
];

// ─── Validation Helpers ───────────────────────────────────────────────────────

export function isValidTheme(id?: string | null): id is ThemeId {
  if (!id) return false;
  return Object.prototype.hasOwnProperty.call(THEMES, id.toLowerCase().trim());
}

export function isValidBarStyle(style?: string | null): style is BarStyle {
  if (!style) return false;
  return Object.prototype.hasOwnProperty.call(BAR_STYLES, style.toLowerCase().trim());
}

// ─── Core Retrieval Functions ─────────────────────────────────────────────────

/**
 * Get a ThemeConfig by theme id. Defaults to 'cyberpunk' if id is missing or invalid.
 */
export function getTheme(id?: string | null): ThemeConfig {
  if (!id) return THEMES.cyberpunk;
  const key = id.toLowerCase().trim() as ThemeId;
  return THEMES[key] ?? THEMES.cyberpunk;
}

/**
 * Retrieve all 6 available themes.
 */
export function getAllThemes(): ThemeConfig[] {
  return Object.values(THEMES);
}

/**
 * Retrieve all available bar styles.
 */
export function getAllBarStyles(): BarStyle[] {
  return Object.keys(BAR_STYLES) as BarStyle[];
}

// ─── Progress Bar Rendering ───────────────────────────────────────────────────

/**
 * Generates a themed visual progress bar string.
 * Example: `[▰▰▰▰▰▱▱▱▱▱] 50%`
 *
 * @param pct Progress percentage (0 - 100)
 * @param style Bar style name ('pipes', 'blocks', 'squares', 'retro') or theme id
 * @param length Total length of the bar in segments (default: 10, clamped between 4 and 50)
 */
export function renderThemedProgressBar(
  pct: number,
  style: BarStyle | string = 'pipes',
  length: number = 10,
): string {
  const safePct = Number.isFinite(pct) ? pct : 0;
  const clamped = Math.min(100, Math.max(0, Math.round(safePct)));
  const barLength = Math.max(4, Math.min(50, Math.floor(length)));

  // Resolve style: direct match in BAR_STYLES or from theme config barStyle
  const normalized = (style ?? 'pipes').toLowerCase().trim();
  let charset: BarCharacterSet;

  if (isValidBarStyle(normalized)) {
    charset = BAR_STYLES[normalized];
  } else if (isValidTheme(normalized)) {
    charset = BAR_STYLES[THEMES[normalized].barStyle];
  } else {
    charset = BAR_STYLES.pipes;
  }

  const filledCount = Math.round((clamped / 100) * barLength);
  const emptyCount = barLength - filledCount;
  const bar = charset.filled.repeat(filledCount) + charset.empty.repeat(emptyCount);

  return `[${bar}] ${clamped}%`;
}

// ─── Header Decorator ─────────────────────────────────────────────────────────

/**
 * Formats a title with the theme's header ornamentation.
 * If title is omitted or empty, returns the theme's default banner header.
 *
 * @param theme ThemeConfig object or theme id string
 * @param title Optional custom header title (e.g. 'RANK CARD', 'PROFILE')
 */
export function formatThemedHeader(theme: ThemeConfig | string, title?: string | null): string {
  const config = typeof theme === 'string' ? getTheme(theme) : theme;
  if (!title || !title.trim()) {
    return config.header;
  }

  const cleanTitle = title.trim().toUpperCase();
  return `${config.ornamentation.left}${cleanTitle}${config.ornamentation.right}`;
}
