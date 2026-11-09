/**
 * src/lib/theme-store.ts
 * Universal Theme Engine & Zustand Store.
 * Manages active ThemeId, BarStyle, and Reduced Motion.
 * Synchronizes with localStorage and document.documentElement CSS variables.
 */

import { create } from 'zustand';
import {
  ThemeId,
  BarStyle,
  SignatureTheme,
  SIGNATURE_THEMES,
} from '@/config/themes';

const STORAGE_KEYS = {
  THEME: 'aicord_active_theme',
  BAR_STYLE: 'aicord_bar_style',
  REDUCED_MOTION: 'aicord_reduced_motion',
} as const;

export interface ThemeStoreState {
  themeId: ThemeId;
  barStyle: BarStyle;
  reducedMotion: boolean;
  theme: SignatureTheme;
  isHydrated: boolean;

  // Actions
  setTheme: (themeId: ThemeId) => void;
  setBarStyle: (barStyle: BarStyle) => void;
  setReducedMotion: (reduced: boolean) => void;
  toggleTheme: () => void;
  hydrate: () => void;
}

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Gracefully handle storage quota or privacy mode restriction
  }
}

/**
 * Applies CSS variables and data attributes to document.documentElement.
 */
export function applyThemeToDom(theme: SignatureTheme, reducedMotion: boolean): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set data-theme attribute
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');

  // Apply CSS custom properties
  root.style.setProperty('--theme-primary', theme.primaryHex);
  root.style.setProperty('--theme-accent', theme.accentHex);
  root.style.setProperty('--theme-bg', theme.bgHex);
  root.style.setProperty('--theme-border', theme.borderHex);
  root.style.setProperty('--theme-glow', theme.glowHex);

  // Maintain dark mode compatibility
  if (!root.classList.contains('dark')) {
    root.classList.add('dark');
  }
}

const DEFAULT_THEME_ID: ThemeId = 'cyberpunk';
const DEFAULT_BAR_STYLE: BarStyle = 'pipes';

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  themeId: DEFAULT_THEME_ID,
  barStyle: DEFAULT_BAR_STYLE,
  reducedMotion: false,
  theme: SIGNATURE_THEMES[DEFAULT_THEME_ID],
  isHydrated: false,

  setTheme: (themeId: ThemeId) => {
    const selected = SIGNATURE_THEMES[themeId] || SIGNATURE_THEMES[DEFAULT_THEME_ID];
    safeSetItem(STORAGE_KEYS.THEME, themeId);
    applyThemeToDom(selected, get().reducedMotion);
    set({ themeId, theme: selected });
  },

  setBarStyle: (barStyle: BarStyle) => {
    safeSetItem(STORAGE_KEYS.BAR_STYLE, barStyle);
    set({ barStyle });
  },

  setReducedMotion: (reducedMotion: boolean) => {
    safeSetItem(STORAGE_KEYS.REDUCED_MOTION, String(reducedMotion));
    applyThemeToDom(get().theme, reducedMotion);
    set({ reducedMotion });
  },

  toggleTheme: () => {
    const themeIds: ThemeId[] = ['cyberpunk', 'midnight', 'emerald', 'gold', 'retro', 'frost'];
    const currentIndex = themeIds.indexOf(get().themeId);
    const nextIndex = (currentIndex + 1) % themeIds.length;
    get().setTheme(themeIds[nextIndex]);
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;

    // Detect system reduced motion preference if not explicitly set
    const systemPrefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const storedTheme = safeGetItem(STORAGE_KEYS.THEME) as ThemeId | null;
    const storedBarStyle = safeGetItem(STORAGE_KEYS.BAR_STYLE) as BarStyle | null;
    const storedReduced = safeGetItem(STORAGE_KEYS.REDUCED_MOTION);

    const validThemeId =
      storedTheme && SIGNATURE_THEMES[storedTheme] ? storedTheme : DEFAULT_THEME_ID;
    const validBarStyle = storedBarStyle && ['pipes', 'blocks', 'squares', 'retro'].includes(storedBarStyle)
      ? storedBarStyle
      : SIGNATURE_THEMES[validThemeId].barStyle;
    const reducedMotion =
      storedReduced !== null ? storedReduced === 'true' : systemPrefersReduced;

    const selectedTheme = SIGNATURE_THEMES[validThemeId];
    applyThemeToDom(selectedTheme, reducedMotion);

    set({
      themeId: validThemeId,
      barStyle: validBarStyle,
      reducedMotion,
      theme: selectedTheme,
      isHydrated: true,
    });
  },
}));
