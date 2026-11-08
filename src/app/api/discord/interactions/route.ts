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

import { NextRequest, NextResponse, after } from 'next/server';
import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
} from 'discord-api-types/v10';
import { env } from '@/lib/env';
import {
  handleCommandInteraction,
  handleAutocompleteInteraction,
} from '@/lib/discord/command-registry';

export const maxDuration = 60;

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

      // Keep serverless execution context alive until async work completes
      after(async () => {
        try {
          await handleCommandInteraction(cmd);
        } catch (err) {
          console.error(`[Interactions] Error handling command "${cmd.data?.name}":`, err);
        }
      });

      return NextResponse.json(DEFERRED_CHANNEL_MESSAGE);
    }

    // ─── Message Components (Buttons, Selects) ────────────────────────────
    if (type === InteractionType.MESSAGE_COMPONENT) {
      const component = interaction as unknown as APIMessageComponentInteraction;
      const customId = component.data.custom_id;
      const userId = component.member?.user?.id ?? component.user?.id ?? '';

      // Direct synchronous response for select menus that trigger Modals
      if (customId.startsWith('build_sel_cat:')) {
        const jobId = customId.split(':')[1];
        const selectedIdx = (component.data as unknown as { values?: string[] }).values?.[0] ?? '0';
        let currentName = '';

        try {
          const { connectDB } = await import('@/lib/db');
          const { BuildJob } = await import('@/models/BuildJob');
          await connectDB();
          const job = await BuildJob.findById(jobId);
          const blueprint = job?.blueprint as import('@/lib/ai/blueprint.schema').ServerBlueprint | undefined;
          const idx = parseInt(selectedIdx, 10);
          if (blueprint && !isNaN(idx) && blueprint.categories[idx]) {
            currentName = blueprint.categories[idx].name;
          }
        } catch (err) {
          console.warn('[Interactions] Could not pre-fetch category name for modal:', err);
        }

        return NextResponse.json({
          type: 9, // APPLICATION_MODAL
          data: {
            custom_id: `build_modal_cat:${jobId}:${selectedIdx}`,
            title: 'Rename Category',
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: 'new_name',
                    label: 'Category Name',
                    style: 1, // Short
                    min_length: 1,
                    max_length: 100,
                    value: currentName,
                    required: true,
                  },
                ],
              },
            ],
          },
        });
      }

      if (customId.startsWith('build_sel_chan:')) {
        const jobId = customId.split(':')[1];
        const targetKey = (component.data as unknown as { values?: string[] }).values?.[0] ?? '';
        let currentName = '';
        let currentTopic = '';

        try {
          const { connectDB } = await import('@/lib/db');
          const { BuildJob } = await import('@/models/BuildJob');
          await connectDB();
          const job = await BuildJob.findById(jobId);
          const blueprint = job?.blueprint as import('@/lib/ai/blueprint.schema').ServerBlueprint | undefined;
          if (blueprint && targetKey) {
            if (targetKey.startsWith('top:')) {
              const topIdx = parseInt(targetKey.replace('top:', ''), 10);
              const ch = blueprint.topLevelChannels?.[topIdx];
              if (ch) {
                currentName = ch.name;
                currentTopic = ch.topic ?? '';
              }
            } else {
              const [catIdxStr, chIdxStr] = targetKey.split(':');
              const catIdx = parseInt(catIdxStr, 10);
              const chIdx = parseInt(chIdxStr, 10);
              const ch = blueprint.categories?.[catIdx]?.channels?.[chIdx];
              if (ch) {
                currentName = ch.name;
                currentTopic = ch.topic ?? '';
              }
            }
          }
        } catch (err) {
          console.warn('[Interactions] Could not pre-fetch channel details for modal:', err);
        }

        return NextResponse.json({
          type: 9, // APPLICATION_MODAL
          data: {
            custom_id: `build_modal_chan:${jobId}:${targetKey}`,
            title: 'Rename Channel',
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: 'new_name',
                    label: 'Channel Name',
                    style: 1,
                    min_length: 1,
                    max_length: 100,
                    value: currentName,
                    required: true,
                  },
                ],
              },
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: 'new_topic',
                    label: 'Channel Topic (optional)',
                    style: 2, // Paragraph
                    max_length: 1024,
                    value: currentTopic,
                    required: false,
                  },
                ],
              },
            ],
          },
        });
      }

      // Default async handling for other components
      after(async () => {
        try {
          await handleComponentAsync(component, customId, userId);
        } catch (err) {
          console.error(`[Interactions] Error handling component "${customId}":`, err);
        }
      });

      return NextResponse.json(DEFERRED_UPDATE_MESSAGE);
    }

    // ─── Modal Submit (type 5) ─────────────────────────────────────────────
    if (type === (InteractionType as unknown as { MODAL_SUBMIT?: number }).MODAL_SUBMIT || type === 5) {
      const modal = interaction as unknown as APIModalSubmitInteraction;
      const customId = modal.data?.custom_id ?? '';

      if (customId.startsWith('build_modal_')) {
        after(async () => {
          try {
            const { handleBuildModalSubmit } = await import('@/commands/build');
            await handleBuildModalSubmit(modal);
          } catch (err) {
            console.error('[Interactions] Error handling build modal submit:', err);
          }
        });
        return NextResponse.json(DEFERRED_UPDATE_MESSAGE);
      }

      return NextResponse.json(DEFERRED_UPDATE_MESSAGE);
    }

    // ─── Autocomplete ──────────────────────────────────────────────────────
    if (type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
      const choices = await handleAutocompleteInteraction(interaction);
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
    case 'build_view': {
      const view = rest[0] as import('@/lib/discord/blueprint-preview').BlueprintView;
      const jobId = rest[1];
      const { handleBuildViewTab } = await import('@/commands/build');
      await handleBuildViewTab(token, jobId, view, userId);
      break;
    }
    case 'build_action': {
      const subAction = rest[0];
      const jobId = rest[1];
      if (subAction === 'rename_cat') {
        const { handleBuildRenameCategoryPrompt } = await import('@/commands/build');
        await handleBuildRenameCategoryPrompt(token, jobId, userId);
      } else if (subAction === 'rename_chan') {
        const { handleBuildRenameChannelPrompt } = await import('@/commands/build');
        await handleBuildRenameChannelPrompt(token, jobId, userId);
      }
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
    case 'game_trivia': {
      const gameId = rest[0];
      const choiceIndex = rest[1];
      const { handleTriviaInteraction } = await import('@/commands/games');
      await handleTriviaInteraction(token, gameId, choiceIndex, userId);
      break;
    }
    case 'game_bj': {
      const subAction = rest[0] as 'hit' | 'stand' | 'double';
      const gameId = rest[1];
      const { handleBlackjackInteraction } = await import('@/commands/games');
      await handleBlackjackInteraction(token, subAction, gameId, userId);
      break;
    }
    case 'game_rps': {
      const gameId = rest[0];
      const choice = rest[1];
      const { handleRpsInteraction } = await import('@/commands/games');
      await handleRpsInteraction(token, gameId, choice, userId);
      break;
    }
    case 'leaderboard': {
      const pageStr = rest[0];
      const targetPage = parseInt(pageStr, 10) || 1;
      const { handleLeaderboardInteraction } = await import('@/commands/levels');
      await handleLeaderboardInteraction(token, guildId, targetPage, component);
      break;
    }
    case 'econ_shop': {
      const pageStr = rest[0];
      const targetPage = parseInt(pageStr, 10) || 1;
      const { handleShopInteraction } = await import('@/commands/economy');
      await handleShopInteraction(token, guildId, targetPage, component);
      break;
    }
    case 'econ_rich': {
      const pageStr = rest[0];
      const targetPage = parseInt(pageStr, 10) || 1;
      const { handleRichInteraction } = await import('@/commands/economy');
      await handleRichInteraction(token, guildId, targetPage, component);
      break;
    }
    case 'customize': {
      const { handleCustomizeInteraction } = await import('@/commands/customize');
      await handleCustomizeInteraction(token, rest, userId, component);
      break;
    }
    case 'ticket_create':
    case 'ticket_claim':
    case 'ticket_close':
    case 'ticket_rate': {
      const { handleTicketComponent } = await import('@/commands/tickets');
      await handleTicketComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'rr_toggle':
    case 'rr_select': {
      const { handleReactionRoleComponent } = await import('@/commands/reaction-roles');
      await handleReactionRoleComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'radio_toggle':
    case 'radio_stop':
    case 'radio_voldown':
    case 'radio_volup':
    case 'radio_select': {
      const { handleRadioComponent } = await import('@/commands/radio');
      await handleRadioComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'adv_choice': {
      const { handleAdventureComponent } = await import('@/commands/adventure');
      await handleAdventureComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'skin_equip':
    case 'skin_select':
    case 'skin_wardrobe':
    case 'skin_catalog':
    case 'unbox_again': {
      const { handleSkinsComponent } = await import('@/commands/skins');
      await handleSkinsComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'mm_close': {
      const { handleModmailComponent } = await import('@/commands/modmail');
      await handleModmailComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'gw_enter': {
      const { handleGiveawayComponent } = await import('@/commands/giveaway');
      await handleGiveawayComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'bounty_claim':
    case 'bounty_pay':
    case 'bounty_cancel': {
      const { handleBountyComponent } = await import('@/commands/bounty');
      await handleBountyComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'confess_vote': {
      const { handleConfessionComponent } = await import('@/commands/confess');
      await handleConfessionComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'pet_feed':
    case 'pet_play':
    case 'pet_train':
    case 'pet_rest': {
      const { handlePetComponent } = await import('@/commands/pet');
      await handlePetComponent(token, customId, userId, guildId, component);
      break;
    }
    case 'run_delete': {
      const { handleCodeRunComponent } = await import('@/commands/run');
      await handleCodeRunComponent(token, customId, userId, guildId, component);
      break;
    }
    default: {
      if (customId.startsWith('pet_')) {
        const { handlePetComponent } = await import('@/commands/pet');
        await handlePetComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('confess_')) {
        const { handleConfessionComponent } = await import('@/commands/confess');
        await handleConfessionComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('run_')) {
        const { handleCodeRunComponent } = await import('@/commands/run');
        await handleCodeRunComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('bounty_')) {
        const { handleBountyComponent } = await import('@/commands/bounty');
        await handleBountyComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('mm_')) {
        const { handleModmailComponent } = await import('@/commands/modmail');
        await handleModmailComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('gw_')) {
        const { handleGiveawayComponent } = await import('@/commands/giveaway');
        await handleGiveawayComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('radio_')) {
        const { handleRadioComponent } = await import('@/commands/radio');
        await handleRadioComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('tx_')) {
        const { handleTranscribeComponent } = await import('@/commands/transcribe');
        await handleTranscribeComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('skin_') || customId.startsWith('unbox_')) {
        const { handleSkinsComponent } = await import('@/commands/skins');
        await handleSkinsComponent(token, customId, userId, guildId, component);
        break;
      }
      if (customId.startsWith('tvc_')) {
        const { handleTempVoiceComponent } = await import('@/commands/temp-vc');
        await handleTempVoiceComponent(token, customId, userId, guildId, component);
        break;
      }
      console.warn(`[Interactions] Unknown component action: ${action}`);
    }
  }
}
