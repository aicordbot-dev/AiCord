'use client';

/**
 * src/components/ui/ThemePicker.tsx
 * Theme & ASCII Bar Style Switcher for in-navbar and standalone views.
 * Controls the 6 signature aesthetic themes and 4 ASCII bar styles.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '@/lib/theme-store';
import {
  ThemeId,
  BarStyle,
  THEME_LIST,
  BAR_STYLE_LIST,
  BAR_STYLES,
} from '@/config/themes';
import { GlassCard } from './GlassCard';

export interface ThemePickerProps {
  variant?: 'navbar' | 'standalone';
  className?: string;
  showBarStyles?: boolean;
}

export function ThemePicker({
  variant = 'navbar',
  className = '',
  showBarStyles = true,
}: ThemePickerProps) {
  const { themeId, barStyle, theme, setTheme, setBarStyle } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // In-Navbar Compact Dropdown Variant
  if (variant === 'navbar') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all font-mono text-xs text-gray-200"
          title="Switch signature aesthetic theme & bar style"
          aria-expanded={isOpen}
          aria-label="Theme switcher"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: theme.primaryHex }}
          />
          <span className="hidden sm:inline font-bold">{theme.name}</span>
          <span className="text-[10px] text-gray-400">▼</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 p-3 rounded-2xl bg-[#090d1a]/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider pb-2 border-b border-white/10 mb-2 flex justify-between items-center">
              <span>Signature Theme (6)</span>
              <span className="text-cyan-400 text-[9px]">Active: {theme.name}</span>
            </div>

            {/* 6 Theme Options */}
            <div className="space-y-1">
              {THEME_LIST.map((t) => {
                const isSelected = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-mono text-xs transition-all text-left
                      ${
                        isSelected
                          ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: t.primaryHex }}
                      />
                      <span className="font-bold">{t.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-sans truncate max-w-[100px]">
                      {t.barStyle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 4 ASCII Bar Styles */}
            {showBarStyles && (
              <div className="mt-3 pt-2.5 border-t border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                  ASCII Bar Style (4)
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                  {BAR_STYLE_LIST.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setBarStyle(style.id)}
                      className={`
                        px-2 py-1 rounded-lg text-left transition-all truncate
                        ${
                          barStyle === style.id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }
                      `}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Standalone Full-Width Interactive Widget Variant
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Themes Grid */}
      <div>
        <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-3">
          Select Signature Theme:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {THEME_LIST.map((t) => {
            const isSelected = t.id === themeId;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`
                  p-3 rounded-2xl text-left transition-all font-mono border relative overflow-hidden group
                  ${
                    isSelected
                      ? 'bg-white/10 border-white/40 shadow-lg ring-1 ring-white/30 scale-[1.02]'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06]'
                  }
                `}
              >
                {/* Glow Dot */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-md"
                      style={{ backgroundColor: t.primaryHex }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-md opacity-75"
                      style={{ backgroundColor: t.accentHex }}
                    />
                  </div>
                  <span className="text-sm">{t.icon}</span>
                </div>
                <div className="font-bold text-white text-xs truncate">{t.name}</div>
                <div className="text-[10px] text-gray-400 font-sans truncate mt-0.5">
                  {t.barStyle} style
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ASCII Bar Styles Selector */}
      {showBarStyles && (
        <div>
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-3">
            Select ASCII Progress Bar Style:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
            {BAR_STYLE_LIST.map((style) => {
              const isSelected = barStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => setBarStyle(style.id)}
                  className={`
                    p-3 rounded-xl border text-left transition-all
                    ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/15'
                        : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }
                  `}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs">{style.name}</span>
                    <span className="text-[10px] text-gray-500">{style.id}</span>
                  </div>
                  <div className="text-xs tracking-widest text-cyan-400 font-bold">
                    {style.example}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Sample Card Preview */}
      <GlassCard padding="md" className="border-white/15">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2 flex justify-between">
          <span>Live Embed Preview</span>
          <span style={{ color: theme.primaryHex }}>{theme.name} Theme</span>
        </div>
        <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs space-y-2">
          <div className="font-bold truncate" style={{ color: theme.primaryHex }}>
            {theme.header}
          </div>
          <div className="text-gray-300 text-xs">
            Level 42 Architect • 18,450 / 20,000 XP (92%)
          </div>
          <div className="tracking-wider text-sm font-bold" style={{ color: theme.accentHex }}>
            {BAR_STYLES[barStyle].filled.repeat(8)}
            {BAR_STYLES[barStyle].empty.repeat(2)} [92%]
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
