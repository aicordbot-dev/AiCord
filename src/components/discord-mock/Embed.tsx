'use client';

/**
 * src/components/discord-mock/Embed.tsx
 * Authentic Discord Embed component matching Discord desktop client styling.
 */

import React from 'react';
import { useThemeStore } from '@/lib/theme-store';

export interface DiscordEmbedField {
  name: string;
  value: React.ReactNode;
  inline?: boolean;
}

export interface DiscordEmbedAuthor {
  name: string;
  url?: string;
  iconUrl?: string;
}

export interface DiscordEmbedFooter {
  text: string;
  iconUrl?: string;
}

export interface DiscordEmbedProps {
  color?: string; // Hex color code or falls back to theme primaryHex
  author?: DiscordEmbedAuthor;
  title?: string;
  url?: string;
  description?: React.ReactNode;
  fields?: DiscordEmbedField[];
  thumbnail?: string;
  image?: string;
  footer?: DiscordEmbedFooter;
  timestamp?: string;
  className?: string;
  children?: React.ReactNode;
}

export function DiscordEmbed({
  color,
  author,
  title,
  url,
  description,
  fields = [],
  thumbnail,
  image,
  footer,
  timestamp,
  className = '',
  children,
}: DiscordEmbedProps) {
  const currentTheme = useThemeStore((state) => state.theme);
  const borderColor = color || currentTheme?.primaryHex || '#5865F2';

  return (
    <div
      className={`relative rounded bg-[#2B2D31] text-[#DBDEE1] max-w-2xl border-l-4 overflow-hidden shadow-md text-xs sm:text-sm font-sans my-2 ${className}`}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="p-3 sm:p-4 space-y-3">
        {/* Top Header: Author + Optional Thumbnail */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            {/* Author */}
            {author && (
              <div className="flex items-center gap-2 mb-1.5">
                {author.iconUrl && (
                  <img
                    src={author.iconUrl}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                  />
                )}
                {author.url ? (
                  <a
                    href={author.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white hover:underline text-xs truncate"
                  >
                    {author.name}
                  </a>
                ) : (
                  <span className="font-medium text-white text-xs truncate">
                    {author.name}
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            {title && (
              <div className="text-sm sm:text-base font-semibold text-white">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00A8FC] hover:underline"
                  >
                    {title}
                  </a>
                ) : (
                  title
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm break-words">
                {description}
              </div>
            )}
          </div>

          {/* Thumbnail */}
          {thumbnail && (
            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-black/20 flex items-center justify-center">
              <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Children (e.g. customized inner elements) */}
        {children}

        {/* Fields Grid */}
        {fields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {fields.map((field, idx) => (
              <div
                key={idx}
                className={field.inline ? 'col-span-1' : 'col-span-full'}
              >
                <div className="font-bold text-white text-xs mb-1 tracking-wide">
                  {field.name}
                </div>
                <div className="text-gray-300 text-xs sm:text-sm leading-relaxed break-words font-sans">
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Large Media Image */}
        {image && (
          <div className="rounded overflow-hidden max-h-72 mt-2">
            <img src={image} alt="Embed" className="w-full h-auto object-cover" />
          </div>
        )}

        {/* Footer & Timestamp */}
        {(footer || timestamp) && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[11px] text-gray-400">
            {footer?.iconUrl && (
              <img
                src={footer.iconUrl}
                alt=""
                className="w-4 h-4 rounded-full object-cover shrink-0"
              />
            )}
            {footer?.text && <span>{footer.text}</span>}
            {footer?.text && timestamp && <span>•</span>}
            {timestamp && <span>{timestamp}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscordEmbed;
