/**
 * src/lib/engines/pagination.ts
 * Embed and message splitting utilities adhering to Discord hard limits.
 * Handles markdown code-block boundary preservation and action row pagination controls.
 */

import {
  MESSAGE_CONTENT_MAX,
  EMBED_FIELDS_MAX,
  EMBED_TOTAL_TEXT_MAX,
  calculateEmbedLength,
} from '@/lib/limits';
import type { DiscordEmbed, EmbedField } from '@/lib/discord/embeds';

export interface PaginateEmbedOptions {
  title?: string;
  description?: string;
  color?: number;
  footerText?: string;
  footerIconUrl?: string;
  authorName?: string;
  authorIconUrl?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  itemsPerPage?: number; // Clamped between 1 and 25
  showPageNumbers?: boolean; // Append "Page X of Y" to footer (default: true)
}

export interface DiscordButtonComponent {
  type: 2;
  style: 1 | 2 | 3 | 4 | 5;
  label?: string;
  emoji?: { name: string; id?: string };
  custom_id?: string;
  url?: string;
  disabled?: boolean;
}

export interface DiscordActionRowComponent {
  type: 1;
  components: DiscordButtonComponent[];
}

/**
 * Split a long text string into messages that strictly fit within Discord's character limit (default 2000).
 * Respects line boundaries, word boundaries, and preserves codeblock syntax highlighting across chunks.
 */
export function splitMessage(text: string, maxLength: number = MESSAGE_CONTENT_MAX): string[] {
  if (!text || typeof text !== 'string') return [];
  const limit = Math.min(maxLength, MESSAGE_CONTENT_MAX);

  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;
  let inCodeBlock = false;
  let codeBlockLang = '';

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }

    // Determine target slice
    let sliceEnd = limit;

    // Search for best split point: prefer paragraph break, then newline, then space
    const candidateSlice = remaining.slice(0, limit);
    const lastDoubleNewline = candidateSlice.lastIndexOf('\n\n');
    const lastNewline = candidateSlice.lastIndexOf('\n');
    const lastSpace = candidateSlice.lastIndexOf(' ');

    if (lastDoubleNewline > limit * 0.4) {
      sliceEnd = lastDoubleNewline + 1;
    } else if (lastNewline > limit * 0.4) {
      sliceEnd = lastNewline + 1;
    } else if (lastSpace > limit * 0.4) {
      sliceEnd = lastSpace + 1;
    }

    let chunk = remaining.slice(0, sliceEnd);
    remaining = remaining.slice(sliceEnd);

    // If we were inside an unclosed code block from previous chunk, prepend opening
    if (inCodeBlock) {
      chunk = '```' + codeBlockLang + '\n' + chunk;
    }

    // Scan chunk for code block toggles
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?/g;
    let match: RegExpExecArray | null;
    let blockCount = 0;
    let lastLang = '';

    while ((match = codeBlockRegex.exec(chunk)) !== null) {
      blockCount++;
      if (match[1]) lastLang = match[1];
    }

    // Check if code block remains unclosed in this chunk
    // (If previously closed and odd toggles, or previously open and even toggles)
    const endsInsideCodeBlock = inCodeBlock ? blockCount % 2 === 0 : blockCount % 2 === 1;

    if (endsInsideCodeBlock) {
      inCodeBlock = true;
      if (lastLang) codeBlockLang = lastLang;
      // Close codeblock for current chunk
      chunk = chunk + '\n```';
    } else {
      inCodeBlock = false;
      codeBlockLang = '';
    }

    chunks.push(chunk);
    remaining = remaining.trimStart();
  }

  return chunks;
}

/**
 * Split a list of embed fields into an array of embeds respecting Discord's
 * 25 fields per embed limit and 6000 total character count per embed.
 */
export function paginateEmbeds(
  items: EmbedField[],
  options: PaginateEmbedOptions = {},
): DiscordEmbed[] {
  const itemsPerPage = Math.max(1, Math.min(options.itemsPerPage ?? 10, EMBED_FIELDS_MAX));
  const showPageNumbers = options.showPageNumbers ?? true;

  if (items.length === 0) {
    const singleEmbed: DiscordEmbed = {
      title: options.title,
      description: options.description,
      color: options.color,
      thumbnail: options.thumbnailUrl ? { url: options.thumbnailUrl } : undefined,
      image: options.imageUrl ? { url: options.imageUrl } : undefined,
      author: options.authorName
        ? {
            name: options.authorName,
            icon_url: options.authorIconUrl,
            url: options.authorUrl,
          }
        : undefined,
      footer: options.footerText
        ? { text: options.footerText, icon_url: options.footerIconUrl }
        : undefined,
      fields: [],
    };
    return [singleEmbed];
  }

  // Pre-split fields into pages
  const pagesOfFields: EmbedField[][] = [];
  let currentBatch: EmbedField[] = [];

  for (const item of items) {
    currentBatch.push(item);
    if (currentBatch.length >= itemsPerPage) {
      pagesOfFields.push(currentBatch);
      currentBatch = [];
    }
  }
  if (currentBatch.length > 0) {
    pagesOfFields.push(currentBatch);
  }

  const totalPages = pagesOfFields.length;
  const embeds: DiscordEmbed[] = [];

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    let footerText = options.footerText ?? '';

    if (showPageNumbers) {
      const pageIndicator = `Page ${pageNum} of ${totalPages}`;
      footerText = footerText ? `${footerText} • ${pageIndicator}` : pageIndicator;
    }

    const embed: DiscordEmbed = {
      title: options.title,
      description: options.description,
      color: options.color,
      thumbnail: options.thumbnailUrl ? { url: options.thumbnailUrl } : undefined,
      image: options.imageUrl ? { url: options.imageUrl } : undefined,
      author: options.authorName
        ? {
            name: options.authorName,
            icon_url: options.authorIconUrl,
            url: options.authorUrl,
          }
        : undefined,
      footer: footerText
        ? { text: footerText, icon_url: options.footerIconUrl }
        : undefined,
      fields: pagesOfFields[i],
    };

    // Safety check: ensure total embed character length doesn't exceed EMBED_TOTAL_TEXT_MAX (6000)
    while (calculateEmbedLength(embed) > EMBED_TOTAL_TEXT_MAX && embed.fields && embed.fields.length > 1) {
      embed.fields.pop();
    }

    embeds.push(embed);
  }

  return embeds;
}

/**
 * Build a Discord action row containing 5 standard pagination buttons:
 * [ First («) | Prev (‹) | Page X / Y | Next (›) | Last (») ]
 */
export function buildPaginationRow(
  currentPage: number,
  totalPages: number,
  customIdPrefix: string,
): DiscordActionRowComponent {
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return {
    type: 1, // ActionRow
    components: [
      {
        type: 2, // Button
        style: 2, // Secondary
        label: '«',
        custom_id: `${customIdPrefix}:first`,
        disabled: isFirst,
      },
      {
        type: 2,
        style: 2,
        label: '‹',
        custom_id: `${customIdPrefix}:prev`,
        disabled: isFirst,
      },
      {
        type: 2,
        style: 2,
        label: `${currentPage} / ${Math.max(1, totalPages)}`,
        custom_id: `${customIdPrefix}:page`,
        disabled: true,
      },
      {
        type: 2,
        style: 2,
        label: '›',
        custom_id: `${customIdPrefix}:next`,
        disabled: isLast,
      },
      {
        type: 2,
        style: 2,
        label: '»',
        custom_id: `${customIdPrefix}:last`,
        disabled: isLast,
      },
    ],
  };
}

/**
 * Parse a pagination button custom_id.
 * Example: "roles_page:next" -> { prefix: "roles_page", action: "next" }
 */
export function parsePaginationCustomId(
  customId: string,
): { prefix: string; action: 'first' | 'prev' | 'page' | 'next' | 'last' } | null {
  const parts = customId.split(':');
  if (parts.length < 2) return null;

  const action = parts[parts.length - 1];
  const validActions = ['first', 'prev', 'page', 'next', 'last'];

  if (!validActions.includes(action)) return null;

  const prefix = parts.slice(0, parts.length - 1).join(':');
  return {
    prefix,
    action: action as 'first' | 'prev' | 'page' | 'next' | 'last',
  };
}
