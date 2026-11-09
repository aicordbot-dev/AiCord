/**
 * src/config/themes.ts
 * 6 Signature Aesthetic Themes & 4 ASCII Progress Bar Styles for AiCord.
 * Provides colors, hex values, CSS variables, and decorators for web & bot screens.
 */

export type ThemeId = 'cyberpunk' | 'midnight' | 'emerald' | 'gold' | 'retro' | 'frost';
export type BarStyle = 'pipes' | 'blocks' | 'squares' | 'retro';

export interface BarCharacterSet {
  filled: string;
  empty: string;
  name: string;
  example: string;
}

export interface HeaderOrnamentation {
  left: string;
  right: string;
}

export interface SignatureTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  primaryColor: number;
  primaryHex: string;
  accentColor: number;
  accentHex: string;
  bgHex: string;
  borderHex: string;
  glowHex: string;
  header: string;
  barStyle: BarStyle;
  icon: string;
  ornamentation: HeaderOrnamentation;
  cssVariables: {
    primary: string;
    accent: string;
    bg: string;
    border: string;
    glow: string;
  };
}

export const BAR_STYLES: Record<BarStyle, BarCharacterSet> = {
  pipes: {
    filled: '▰',
    empty: '▱',
    name: 'Neon Pipes',
    example: '▰▰▰▰▰▰▱▱▱▱',
  },
  blocks: {
    filled: '█',
    empty: '░',
    name: 'Solid Blocks',
    example: '██████░░░░',
  },
  squares: {
    filled: '■',
    empty: '□',
    name: 'Geometric Squares',
    example: '■■■■■■□□□□',
  },
  retro: {
    filled: '▓',
    empty: '░',
    name: 'Retro Dithered',
    example: '▓▓▓▓▓▓░░░░',
  },
};

export const SIGNATURE_THEMES: Record<ThemeId, SignatureTheme> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    subtitle: 'High-Tech Neon Cyan & Vivid Crimson',
    description: 'High-tech neon cyan and vivid red deck aesthetics with synthetic laser borders.',
    primaryColor: 0x00f0ff,
    primaryHex: '#00f0ff',
    accentColor: 0xff003c,
    accentHex: '#ff003c',
    bgHex: '#040b14',
    borderHex: '#00f0ff33',
    glowHex: 'rgba(0, 240, 255, 0.35)',
    header: '「 ✦ CYBERPUNK DECK ✦ 」',
    barStyle: 'pipes',
    icon: '⚡',
    ornamentation: {
      left: '「 ✦ ',
      right: ' ✦ 」',
    },
    cssVariables: {
      primary: '#00f0ff',
      accent: '#ff003c',
      bg: '#040b14',
      border: 'rgba(0, 240, 255, 0.25)',
      glow: 'rgba(0, 240, 255, 0.4)',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Royale',
    subtitle: 'Deep Royal Purple & Ethereal Lavender',
    description: 'Deep royal purple elegance with soothing lavender accents and celestial styling.',
    primaryColor: 0x6c5ce7,
    primaryHex: '#6c5ce7',
    accentColor: 0xa29bfe,
    accentHex: '#a29bfe',
    bgHex: '#0b0817',
    borderHex: '#6c5ce733',
    glowHex: 'rgba(108, 92, 231, 0.35)',
    header: '★ ━━━━━ MIDNIGHT ROYALE ━━━━━ ★',
    barStyle: 'blocks',
    icon: '🌙',
    ornamentation: {
      left: '★ ━━━━━ ',
      right: ' ━━━━━ ★',
    },
    cssVariables: {
      primary: '#6c5ce7',
      accent: '#a29bfe',
      bg: '#0b0817',
      border: 'rgba(108, 92, 231, 0.25)',
      glow: 'rgba(108, 92, 231, 0.4)',
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    subtitle: 'Lush Botanical Jade & Serene Mint',
    description: 'Lush natural sanctuary with serene mint and emerald hues for harmonious spaces.',
    primaryColor: 0x00b894,
    primaryHex: '#00b894',
    accentColor: 0x55efc4,
    accentHex: '#55efc4',
    bgHex: '#04130d',
    borderHex: '#00b89433',
    glowHex: 'rgba(0, 184, 148, 0.35)',
    header: '🌿 ──── EMERALD SANCTUARY ──── 🌿',
    barStyle: 'pipes',
    icon: '🌿',
    ornamentation: {
      left: '🌿 ──── ',
      right: ' ──── 🌿',
    },
    cssVariables: {
      primary: '#00b894',
      accent: '#55efc4',
      bg: '#04130d',
      border: 'rgba(0, 184, 148, 0.25)',
      glow: 'rgba(0, 184, 148, 0.4)',
    },
  },
  gold: {
    id: 'gold',
    name: 'Golden Tycoon',
    subtitle: 'Prestigious Bullion Gold & Warm Amber',
    description: 'Prestigious bullion gold paired with warm tycoon amber for opulent sovereign status.',
    primaryColor: 0xfdcb6e,
    primaryHex: '#ffd700',
    accentColor: 0xe17055,
    accentHex: '#ff9f43',
    bgHex: '#140f04',
    borderHex: '#ffd70033',
    glowHex: 'rgba(255, 215, 0, 0.35)',
    header: '🪙 ════ GOLDEN TYCOON ════ 🪙',
    barStyle: 'squares',
    icon: '🪙',
    ornamentation: {
      left: '🪙 ════ ',
      right: ' ════ 🪙',
    },
    cssVariables: {
      primary: '#ffd700',
      accent: '#ff9f43',
      bg: '#140f04',
      border: 'rgba(255, 215, 0, 0.25)',
      glow: 'rgba(255, 215, 0, 0.4)',
    },
  },
  retro: {
    id: 'retro',
    name: 'Retro 80s Arcade',
    subtitle: 'Synthwave Neon Pink & Cyber Yellow',
    description: 'Nostalgic synthwave arcade fever with high-contrast hot magenta and electric yellow.',
    primaryColor: 0xff007f,
    primaryHex: '#ff007f',
    accentColor: 0xffea00,
    accentHex: '#ffea00',
    bgHex: '#140410',
    borderHex: '#ff007f33',
    glowHex: 'rgba(255, 0, 127, 0.35)',
    header: '▲ ▲ ── RETRO 80S ARCADE ── ▲ ▲',
    barStyle: 'retro',
    icon: '🕹️',
    ornamentation: {
      left: '▲ ▲ ── ',
      right: ' ── ▲ ▲',
    },
    cssVariables: {
      primary: '#ff007f',
      accent: '#ffea00',
      bg: '#140410',
      border: 'rgba(255, 0, 127, 0.25)',
      glow: 'rgba(255, 0, 127, 0.4)',
    },
  },
  frost: {
    id: 'frost',
    name: 'Nordic Frost',
    subtitle: 'Glacial Ice Cyan & Aurora White',
    description: 'Crisp subzero polar glacier with cool crystal cyan and shimmering aurora accents.',
    primaryColor: 0x00d2d3,
    primaryHex: '#00d2d3',
    accentColor: 0xf1f2f6,
    accentHex: '#f1f2f6',
    bgHex: '#040d14',
    borderHex: '#00d2d333',
    glowHex: 'rgba(0, 210, 211, 0.35)',
    header: '❄ ─── NORDIC FROST ─── ❄',
    barStyle: 'pipes',
    icon: '❄️',
    ornamentation: {
      left: '❄ ─── ',
      right: ' ─── ❄',
    },
    cssVariables: {
      primary: '#00d2d3',
      accent: '#f1f2f6',
      bg: '#040d14',
      border: 'rgba(0, 210, 211, 0.25)',
      glow: 'rgba(0, 210, 211, 0.4)',
    },
  },
};

export const THEME_LIST = Object.values(SIGNATURE_THEMES);
export const BAR_STYLE_LIST = Object.entries(BAR_STYLES).map(([key, val]) => ({
  id: key as BarStyle,
  ...val,
}));
