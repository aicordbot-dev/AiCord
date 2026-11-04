/**
 * src/lib/limits.ts
 * Centralized Discord API hard limits and validation utilities.
 * ALL limit constants live here — never hard-code them elsewhere.
 */

// ─── Interaction Limits ────────────────────────────────────────────────────
export const INTERACTION_RESPONSE_TIMEOUT_MS = 3_000; // Must respond within 3s
export const INTERACTION_TOKEN_TTL_MS = 15 * 60 * 1000; // Follow-up token valid 15 min
export const AUTOCOMPLETE_MAX_CHOICES = 25;
export const EPHEMERAL_FLAG = 64;

// ─── Message Limits ────────────────────────────────────────────────────────
export const MESSAGE_CONTENT_MAX = 2_000;
export const MESSAGE_EMBEDS_MAX = 10;
export const EMBED_TOTAL_TEXT_MAX = 6_000; // Across all embeds in a message
export const EMBED_TITLE_MAX = 256;
export const EMBED_DESCRIPTION_MAX = 4_096;
export const EMBED_FIELDS_MAX = 25;
export const EMBED_FIELD_NAME_MAX = 256;
export const EMBED_FIELD_VALUE_MAX = 1_024;
export const EMBED_FOOTER_MAX = 2_048;
export const EMBED_AUTHOR_NAME_MAX = 256;

// ─── Component Limits ──────────────────────────────────────────────────────
export const ACTION_ROWS_MAX = 5;
export const BUTTONS_PER_ROW_MAX = 5;
export const BUTTON_LABEL_MAX = 80;
export const CUSTOM_ID_MAX = 100;
export const SELECT_OPTIONS_MAX = 25;
export const SELECT_OPTION_LABEL_MAX = 100;
export const SELECT_OPTION_VALUE_MAX = 100;
export const SELECT_OPTION_DESCRIPTION_MAX = 100;
export const SELECT_PLACEHOLDER_MAX = 150;

// ─── Modal Limits ──────────────────────────────────────────────────────────
export const MODAL_TITLE_MAX = 45;
export const MODAL_INPUTS_MAX = 5;
export const MODAL_INPUT_LABEL_MAX = 45;
export const MODAL_INPUT_PLACEHOLDER_MAX = 100;
export const MODAL_INPUT_VALUE_MAX = 4_000;

// ─── Command Limits ────────────────────────────────────────────────────────
export const COMMAND_NAME_MAX = 32;
export const COMMAND_DESCRIPTION_MAX = 100;
export const COMMAND_OPTIONS_MAX = 25;
export const GLOBAL_SLASH_COMMANDS_MAX = 100;

// ─── Guild Limits ─────────────────────────────────────────────────────────
export const GUILD_ROLES_MAX = 250;
export const GUILD_CHANNELS_MAX = 500;
export const GUILD_CHANNELS_SAFE_MAX = 490; // Leave buffer for safety
export const GUILD_ROLES_SAFE_MAX = 240; // Leave buffer for safety
export const CHANNEL_NAME_MAX = 100;
export const CHANNEL_TOPIC_MAX = 1_024;
export const FORUM_TOPIC_MAX = 4_096;
export const CATEGORY_CHILDREN_MAX = 50;
export const ROLE_NAME_MAX = 100;

// ─── Moderation Limits ─────────────────────────────────────────────────────
export const TIMEOUT_MAX_DURATION_DAYS = 28;
export const BULK_DELETE_MIN = 2;
export const BULK_DELETE_MAX = 100;
export const BULK_DELETE_MAX_AGE_DAYS = 14; // Messages older than 14 days can't be bulk deleted

// ─── Rate Limits ───────────────────────────────────────────────────────────
export const DISCORD_GLOBAL_RATE_LIMIT_PER_SECOND = 50;
export const CHANNEL_NAME_EDIT_PER_10_MIN = 2; // Discord limits channel renames to 2 per 10 minutes

// ─── Validation Utilities ──────────────────────────────────────────────────

/**
 * Truncate a string to the given maximum length, appending "…" if truncated.
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

/**
 * Validate and sanitize a channel name to meet Discord requirements.
 * Discord channel names: max 100 characters.
 * - Text/Announcement/Forum: lowercase, spaces converted to hyphens, control chars stripped. Emojis and unicode preserved.
 * - Voice/Stage: spaces, mixed case, emojis and unicode preserved.
 * Always returns a non-empty string (fallbacks to 'channel' or 'voice-channel') - never throws.
 */
export function sanitizeChannelName(name: string, isVoice = false): string {
  const trimmed = name.trim();
  if (isVoice) {
    const sanitized = trimmed.replace(/[\x00-\x1f\x7f]/g, '').slice(0, CHANNEL_NAME_MAX);
    return sanitized || 'voice-channel';
  }
  const sanitized = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, CHANNEL_NAME_MAX);
  return sanitized || 'channel';
}

/**
 * Validate a role name meets Discord requirements.
 */
export function sanitizeRoleName(name: string): string {
  const sanitized = name.trim().slice(0, ROLE_NAME_MAX);
  return sanitized || 'role';
}

/**
 * Split text into pages that fit within Discord embed description limit.
 * Returns an array of strings, each fitting within maxLength.
 */
export function paginateText(
  text: string,
  maxLength: number = EMBED_DESCRIPTION_MAX,
): string[] {
  if (text.length <= maxLength) return [text];

  const pages: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      pages.push(remaining);
      break;
    }
    // Try to break at a newline near the limit
    const slice = remaining.slice(0, maxLength);
    const lastNewline = slice.lastIndexOf('\n');
    const breakAt = lastNewline > maxLength * 0.5 ? lastNewline : maxLength;
    pages.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }

  return pages;
}

/**
 * Calculate the total character count of an embed for the 6000-char limit.
 */
export function calculateEmbedLength(embed: {
  title?: string;
  description?: string;
  fields?: Array<{ name: string; value: string }>;
  footer?: { text: string };
  author?: { name: string };
}): number {
  return (
    (embed.title?.length ?? 0) +
    (embed.description?.length ?? 0) +
    (embed.fields?.reduce((sum, f) => sum + f.name.length + f.value.length, 0) ?? 0) +
    (embed.footer?.text.length ?? 0) +
    (embed.author?.name.length ?? 0)
  );
}

/**
 * Validate that a timeout duration is within Discord's allowed range.
 * Returns the duration in milliseconds.
 */
export function validateTimeoutDuration(durationMs: number): number {
  const maxMs = TIMEOUT_MAX_DURATION_DAYS * 24 * 60 * 60 * 1000;
  if (durationMs <= 0) throw new Error('Timeout duration must be positive');
  if (durationMs > maxMs) throw new Error(`Timeout duration cannot exceed ${TIMEOUT_MAX_DURATION_DAYS} days`);
  return durationMs;
}

/**
 * Validate bulk delete count.
 */
export function validateBulkDeleteCount(count: number): number {
  if (count < BULK_DELETE_MIN) throw new Error(`Must delete at least ${BULK_DELETE_MIN} messages`);
  if (count > BULK_DELETE_MAX) throw new Error(`Cannot delete more than ${BULK_DELETE_MAX} messages at once`);
  return count;
}
