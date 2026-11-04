/**
 * src/app/api/discord/interactions/route.ts
 * Discord HTTP Interactions endpoint.
 *
 * Handles:
 * - PING (type 1) — Discord endpoint verification
 * - APPLICATION_COMMAND (type 2) — slash commands
 * - MESSAGE_COMPONENT (type 3) — button/select interactions
 * - APPLICATION_COMMAND_AUTOCOMPLETE (type 4) — autocomplete
 *
 * Security: Ed25519 signature verification using discord-interactions.
 * All slash commands return a deferred response (type 5) immediately,
 * then do async work and edit via webhook.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import { env } from '@/lib/env';

// ─── Response constants ───────────────────────────────────────────────────

const DEFERRED_CHANNEL_MESSAGE = {
  type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
};

const DEFERRED_UPDATE_MESSAGE = {
  type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE ?? 6,
};

const PONG = { type: InteractionResponseType.PONG };

// ─── Signature Verification ───────────────────────────────────────────────

async function verifyDiscordRequest(req: NextRequest): Promise<{
  valid: boolean;
  body: string;
}> {
  try {
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const body = await req.text();

    if (!signature || !timestamp) {
      return { valid: false, body };
    }

    let publicKey: string | undefined;
    try {
      publicKey = env.DISCORD_PUBLIC_KEY;
    } catch {
      publicKey = process.env.DISCORD_PUBLIC_KEY;
    }

    if (!publicKey) {
      console.warn('[Interactions] DISCORD_PUBLIC_KEY is not configured');
      return { valid: false, body };
    }

    const isValid = await verifyKey(body, signature, timestamp, publicKey);
    return { valid: isValid, body };
  } catch (err) {
    console.error('[Interactions] Error during signature verification:', err);
    return { valid: false, body: '' };
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { valid, body } = await verifyDiscordRequest(req);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 });
    }

    let interaction: { type?: number } | null = null;
    try {
      interaction = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!interaction || typeof interaction !== 'object') {
      return NextResponse.json({ error: 'Invalid interaction payload' }, { status: 400 });
    }

    const type = interaction.type;

    // ─── PING ──────────────────────────────────────────────────────────────
    if (type === InteractionType.PING) {
      return NextResponse.json(PONG);
    }

    // ─── Slash Commands ────────────────────────────────────────────────────
    if (type === InteractionType.APPLICATION_COMMAND) {
      const cmd = interaction as unknown as APIChatInputApplicationCommandInteraction;
      const commandName = cmd.data.name;

      // Fire-and-forget the async work after returning deferred immediately
      handleCommandAsync(cmd, commandName).catch((err) => {
        console.error(`[Interactions] Error handling command "${commandName}":`, err);
      });

      return NextResponse.json(DEFERRED_CHANNEL_MESSAGE);
    }

    // ─── Message Components (Buttons, Selects) ────────────────────────────
    if (type === InteractionType.MESSAGE_COMPONENT) {
      const component = interaction as unknown as APIMessageComponentInteraction;
      const customId = component.data.custom_id;
      const userId = component.member?.user?.id ?? component.user?.id ?? '';

      handleComponentAsync(component, customId, userId).catch((err) => {
        console.error(`[Interactions] Error handling component "${customId}":`, err);
      });

      return NextResponse.json(DEFERRED_UPDATE_MESSAGE);
    }

    // ─── Autocomplete ──────────────────────────────────────────────────────
    if (type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
      const choices = await handleAutocomplete();
      return NextResponse.json({
        type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
        data: { choices },
      });
    }

    return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
  } catch (err) {
    console.error('[Interactions] Unexpected error handling interaction:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Async Command Dispatcher ─────────────────────────────────────────────

async function handleCommandAsync(
  interaction: APIChatInputApplicationCommandInteraction,
  commandName: string,
): Promise<void> {
  switch (commandName) {
    case 'build': {
      const { handleBuildCommand } = await import('@/commands/build');
      await handleBuildCommand(interaction);
      break;
    }
    case 'ai': {
      const { handleAiCommand } = await import('@/commands/ai');
      await handleAiCommand(interaction);
      break;
    }
    case 'role': {
      const { handleRoleCommand } = await import('@/commands/role');
      await handleRoleCommand(interaction);
      break;
    }
    case 'channel': {
      const { handleChannelCommand } = await import('@/commands/channel');
      await handleChannelCommand(interaction);
      break;
    }
    case 'mod': {
      const { handleModCommand } = await import('@/commands/mod');
      await handleModCommand(interaction);
      break;
    }
    default: {
      console.warn(`[Interactions] Unknown command: ${commandName}`);
    }
  }
}

// ─── Async Component Dispatcher ───────────────────────────────────────────

async function handleComponentAsync(
  component: APIMessageComponentInteraction,
  customId: string,
  userId: string,
): Promise<void> {
  const token = component.token;
  const guildId = component.guild_id ?? '';
  const [action, ...rest] = customId.split(':');

  switch (action) {
    case 'confirm': {
      const jobId = rest[0];
      const { handleBuildConfirm } = await import('@/commands/build');
      await handleBuildConfirm(token, jobId, userId);
      break;
    }
    case 'cancel': {
      const jobId = rest[0];
      const { handleBuildCancel } = await import('@/commands/build');
      await handleBuildCancel(token, jobId, userId);
      break;
    }
    case 'undo': {
      const jobId = rest[0];
      const { handleBuildUndo } = await import('@/commands/build');
      await handleBuildUndo(token, jobId, userId);
      break;
    }
    case 'ai_apply': {
      const auditId = rest[0];
      const { handleAiApply } = await import('@/commands/ai');
      await handleAiApply(token, auditId, userId, guildId);
      break;
    }
    case 'ai_cancel': {
      const { editInteractionResponse } = await import('@/lib/discord/interaction-response');
      const { infoEmbed } = await import('@/lib/discord/embeds');
      await editInteractionResponse(token, {
        embeds: [infoEmbed('Cancelled', 'AI actions have been cancelled.')],
        components: [],
      });
      break;
    }
    case 'role_delete_confirm': {
      const roleId = rest[0];
      const targetGuildId = rest[1];
      const { handleRoleDeleteConfirm } = await import('@/commands/role');
      await handleRoleDeleteConfirm(token, roleId, targetGuildId);
      break;
    }
    case 'role_delete_cancel': {
      const { editInteractionResponse } = await import('@/lib/discord/interaction-response');
      const { infoEmbed } = await import('@/lib/discord/embeds');
      await editInteractionResponse(token, {
        embeds: [infoEmbed('Cancelled', 'Role deletion cancelled.')],
        components: [],
      });
      break;
    }
    default: {
      console.warn(`[Interactions] Unknown component action: ${action}`);
    }
  }
}

// ─── Autocomplete Handler ─────────────────────────────────────────────────

async function handleAutocomplete(): Promise<Array<{ name: string; value: string }>> {
  // Expanded in later phases with role/channel name autocomplete
  return [];
}
