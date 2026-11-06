/**
 * src/lib/discord/interaction-response.ts
 * Helpers for responding to Discord interactions.
 */

import { Routes } from 'discord-api-types/v10';
import { getDiscordRest, discordApiCall } from './rest';
import type { DiscordEmbed } from './embeds';
import { EPHEMERAL_FLAG } from '@/lib/limits';
import { env } from '@/lib/env';

export interface InteractionResponseOptions {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: unknown[];
  ephemeral?: boolean;
  flags?: number;
}

// Response hook for unit testing and intercepting responses
type ResponseHandler = (
  token: string,
  options: InteractionResponseOptions,
) => Promise<void>;
type FollowUpHandler = (
  token: string,
  options: InteractionResponseOptions,
) => Promise<{ id: string }>;

let customResponseHandler: ResponseHandler | null = null;
let customFollowUpHandler: FollowUpHandler | null = null;

export function setResponseHandler(handler: ResponseHandler | null): void {
  customResponseHandler = handler;
}

export function setFollowUpHandler(handler: FollowUpHandler | null): void {
  customFollowUpHandler = handler;
}

/**
 * Edit the original deferred response (the "thinking..." message).
 * Called after performing async work.
 */
export async function editInteractionResponse(
  interactionToken: string,
  options: InteractionResponseOptions,
): Promise<void> {
  if (customResponseHandler) {
    await customResponseHandler(interactionToken, options);
    return;
  }

  const rest = getDiscordRest();
  const { content, embeds, components, ephemeral, flags } = options;

  const computedFlags = flags ?? (ephemeral ? EPHEMERAL_FLAG : 0);

  await discordApiCall(() =>
    rest.patch(Routes.webhookMessage(env.DISCORD_APP_ID, interactionToken), {
      body: {
        content: content ?? null,
        embeds: embeds ?? [],
        components: components ?? [],
        flags: computedFlags,
      },
    }),
  );
}

/**
 * Send a follow-up message to an interaction.
 * Follow-up messages can be sent after the initial response, within 15 minutes.
 */
export async function sendFollowUp(
  interactionToken: string,
  options: InteractionResponseOptions,
): Promise<{ id: string }> {
  if (customFollowUpHandler) {
    return await customFollowUpHandler(interactionToken, options);
  }

  const rest = getDiscordRest();
  const { content, embeds, components, ephemeral, flags } = options;

  const computedFlags = flags ?? (ephemeral ? EPHEMERAL_FLAG : 0);

  return discordApiCall(() =>
    rest.post(Routes.webhook(env.DISCORD_APP_ID, interactionToken), {
      body: {
        content: content ?? null,
        embeds: embeds ?? [],
        components: components ?? [],
        flags: computedFlags,
      },
    }) as Promise<{ id: string }>,
  );
}

/**
 * Delete the original interaction response.
 */
export async function deleteInteractionResponse(
  interactionToken: string,
): Promise<void> {
  const rest = getDiscordRest();
  await discordApiCall(() =>
    rest.delete(Routes.webhookMessage(env.DISCORD_APP_ID, interactionToken)),
  );
}

// ─── Component builders ────────────────────────────────────────────────────

export type ButtonStyle = 1 | 2 | 3 | 4 | 5; // Primary, Secondary, Success, Danger, Link

export interface ButtonComponent {
  type: 2;
  style: ButtonStyle;
  label: string;
  custom_id?: string;
  url?: string;
  emoji?: { name: string; id?: string };
  disabled?: boolean;
}

export interface StringSelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: { name: string; id?: string };
  default?: boolean;
}

export interface StringSelectComponent {
  type: 3;
  custom_id: string;
  options: StringSelectOption[];
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  disabled?: boolean;
}

export type MessageComponent = ButtonComponent | StringSelectComponent;

export interface ActionRow {
  type: 1;
  components: (ButtonComponent | StringSelectComponent)[];
}

export function buildButton(options: {
  style: ButtonStyle;
  label: string;
  customId?: string;
  url?: string;
  emoji?: string;
  disabled?: boolean;
}): ButtonComponent {
  return {
    type: 2,
    style: options.style,
    label: options.label,
    custom_id: options.customId,
    url: options.url,
    emoji: options.emoji ? { name: options.emoji } : undefined,
    disabled: options.disabled,
  };
}

export function buildActionRow(...components: (ButtonComponent | StringSelectComponent)[]): ActionRow {
  return {
    type: 1,
    components: components.slice(0, 5), // Max 5 items per row (1 select or up to 5 buttons)
  };
}

// Standard confirm/cancel row
export function buildConfirmCancelRow(jobId: string): ActionRow {
  return buildActionRow(
    buildButton({ style: 3, label: '✅ Confirm', customId: `confirm:${jobId}` }),
    buildButton({ style: 4, label: '❌ Cancel', customId: `cancel:${jobId}` }),
  );
}

// Standard undo row (shown after a successful build)
export function buildUndoRow(jobId: string): ActionRow {
  return buildActionRow(
    buildButton({ style: 2, label: '↩️ Undo Build', customId: `undo:${jobId}` }),
  );
}
