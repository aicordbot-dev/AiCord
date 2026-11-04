/**
 * src/lib/discord/embeds.ts
 * Embed builder utilities that enforce Discord's limits.
 */

import {
  EMBED_TITLE_MAX,
  EMBED_DESCRIPTION_MAX,
  EMBED_FIELDS_MAX,
  EMBED_FIELD_NAME_MAX,
  EMBED_FIELD_VALUE_MAX,
  EMBED_FOOTER_MAX,
  EMBED_AUTHOR_NAME_MAX,
  EMBED_TOTAL_TEXT_MAX,
  calculateEmbedLength,
  truncate,
} from '@/lib/limits';

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: { text: string; icon_url?: string };
  author?: { name: string; icon_url?: string; url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  timestamp?: string;
  url?: string;
}

// Brand colors
export const Colors = {
  PRIMARY: 0x5865f2, // Blurple
  SUCCESS: 0x57f287, // Green
  WARNING: 0xfee75c, // Yellow
  DANGER: 0xed4245, // Red
  INFO: 0x5865f2, // Blue
  SECONDARY: 0x99aab5, // Gray
} as const;

/**
 * Clamps an embed's fields to fit within Discord limits.
 * Truncates strings rather than throwing.
 */
export function clampEmbed(embed: DiscordEmbed): DiscordEmbed {
  const result: DiscordEmbed = {
    ...embed,
    title: embed.title ? truncate(embed.title, EMBED_TITLE_MAX) : undefined,
    description: embed.description ? truncate(embed.description, EMBED_DESCRIPTION_MAX) : undefined,
    footer: embed.footer
      ? { ...embed.footer, text: truncate(embed.footer.text, EMBED_FOOTER_MAX) }
      : undefined,
    author: embed.author
      ? { ...embed.author, name: truncate(embed.author.name, EMBED_AUTHOR_NAME_MAX) }
      : undefined,
    fields: embed.fields
      ?.slice(0, EMBED_FIELDS_MAX)
      .map((f) => ({
        ...f,
        name: truncate(f.name || '\u200b', EMBED_FIELD_NAME_MAX),
        value: truncate(f.value || '\u200b', EMBED_FIELD_VALUE_MAX),
      })),
  };

  // Check total character count
  const total = calculateEmbedLength({
    title: result.title,
    description: result.description,
    fields: result.fields,
    footer: result.footer,
    author: result.author,
  });

  if (total > EMBED_TOTAL_TEXT_MAX) {
    // Trim description to fit
    const overhead = total - EMBED_TOTAL_TEXT_MAX;
    if (result.description) {
      const newLen = Math.max(0, result.description.length - overhead - 1);
      result.description = truncate(result.description, newLen);
    }
  }

  return result;
}

/**
 * Build a standard success embed.
 */
export function successEmbed(title: string, description?: string): DiscordEmbed {
  return clampEmbed({
    color: Colors.SUCCESS,
    title: `✅ ${title}`,
    description,
  });
}

/**
 * Build a standard error embed.
 */
export function errorEmbed(title: string, description?: string): DiscordEmbed {
  return clampEmbed({
    color: Colors.DANGER,
    title: `❌ ${title}`,
    description,
  });
}

/**
 * Build a standard info embed.
 */
export function infoEmbed(title: string, description?: string): DiscordEmbed {
  return clampEmbed({
    color: Colors.INFO,
    title: `ℹ️ ${title}`,
    description,
  });
}

/**
 * Build a standard warning embed.
 */
export function warningEmbed(title: string, description?: string): DiscordEmbed {
  return clampEmbed({
    color: Colors.WARNING,
    title: `⚠️ ${title}`,
    description,
  });
}

/**
 * Build a progress embed for long-running operations.
 */
export function progressEmbed(title: string, steps: Array<{ label: string; status: 'pending' | 'done' | 'failed' }>): DiscordEmbed {
  const statusEmoji = { pending: '⏳', done: '✅', failed: '❌' };
  const description = steps
    .map((s) => `${statusEmoji[s.status]} ${s.label}`)
    .join('\n');

  return clampEmbed({
    color: Colors.PRIMARY,
    title: `🔨 ${title}`,
    description,
  });
}
