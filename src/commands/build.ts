/**
 * src/commands/build.ts
 * Handles the /build slash command — AI server builder.
 *
 * Flow:
 * 1. Defer response (type 5 — public deferred)
 * 2. Generate blueprint with Gemini
 * 3. Store BuildJob with status=preview
 * 4. Edit response with preview embed + Confirm/Cancel buttons
 *
 * On Confirm button press (handled in interactions route):
 * 5. Update BuildJob status=confirmed
 * 6. Apply the blueprint (sequential, with progress updates)
 * 7. Update status=done, store createdIds
 * 8. Show Undo button
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIApplicationCommandInteractionDataStringOption,
  type APIModalSubmitInteraction,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import { BuildJob } from '@/models/BuildJob';
import { AuditLog } from '@/models/AuditLog';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { PermissionFlags } from '@/lib/discord/permissions';
import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import { generateBlueprint, SERVER_TEMPLATES } from '@/lib/ai/generate-blueprint';
import { getPreset, getPresetChoices } from '@/lib/build/presets';
import {
  buildBlueprintPreviewEmbeds,
  buildBlueprintActionRows,
  buildCategorySelectRow,
  buildChannelSelectRow,
  buildCancelSelectRow,
  type BlueprintView,
} from '@/lib/discord/blueprint-preview';
import {
  editInteractionResponse,
} from '@/lib/discord/interaction-response';
import { errorEmbed, infoEmbed } from '@/lib/discord/embeds';

export async function handleBuildCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  await connectDB();

  const guildId = interaction.guild_id!;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const userTag =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Unknown';
  const token = interaction.token;
  const channelId = interaction.channel_id ?? '';

  // Extract options
  const options = interaction.data.options ?? [];
  const descriptionOption = options.find(
    (o): o is APIApplicationCommandInteractionDataStringOption => o.name === 'description',
  );
  const templateOption = options.find(
    (o): o is APIApplicationCommandInteractionDataStringOption => o.name === 'template',
  );
  const presetOption = options.find(
    (o): o is APIApplicationCommandInteractionDataStringOption => o.name === 'preset',
  );

  const description = descriptionOption?.value?.trim() ?? '';
  const template = templateOption?.value as keyof typeof SERVER_TEMPLATES | undefined;
  const presetId = presetOption?.value?.trim();

  if (!description && !template && !presetId) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Missing Input',
          'Please provide a description, or choose an architecture preset or template for your server.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  // If user selected an architecture preset without a custom prompt, load preset directly!
  if (presetId && !description) {
    const presetBlueprint = getPreset(presetId);
    if (!presetBlueprint) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Invalid Preset', `Preset "${presetId}" was not found.`)],
        ephemeral: true,
      });
      return;
    }

    const job = await BuildJob.create({
      guildId,
      userId,
      interactionToken: token,
      channelId,
      status: 'preview',
      description: `Preset: ${presetBlueprint.name}`,
      blueprint: presetBlueprint,
      steps: [],
      createdIds: { roles: [], categories: [], channels: [], messages: [] },
    });

    await AuditLog.create({
      guildId,
      type: 'ai_build',
      userId,
      userTag,
      prompt: `Preset: ${presetBlueprint.name}`,
      result: 'success',
      metadata: { jobId: job._id.toString(), blueprintName: presetBlueprint.name, presetId },
    });

    const previewEmbeds = buildBlueprintPreviewEmbeds(presetBlueprint, 'structure');
    const actionRows = buildBlueprintActionRows(job._id.toString(), 'structure');

    await editInteractionResponse(token, {
      embeds: previewEmbeds,
      components: actionRows,
    });
    return;
  }

  // Show generating state
  await editInteractionResponse(token, {
    embeds: [
      infoEmbed(
        'Generating Blueprint…',
        '🤖 AiCord is designing your server with Gemini. This takes about 10-15 seconds.',
      ),
    ],
  });

  try {
    const { blueprint, safetyErrors } = await generateBlueprint({
      description,
      template,
      preset: presetId,
    });

    if (safetyErrors && safetyErrors.length > 0) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Blueprint Safety Check Failed',
            'The AI generated an unsafe blueprint. Please try a different description.\n\nDetails:\n' +
              safetyErrors.map((e) => `• ${e}`).join('\n'),
          ),
        ],
      });
      return;
    }

    // Store the job
    const job = await BuildJob.create({
      guildId,
      userId,
      interactionToken: token,
      channelId,
      status: 'preview',
      description,
      blueprint,
      steps: [],
      createdIds: { roles: [], categories: [], channels: [], messages: [] },
    });

    await AuditLog.create({
      guildId,
      type: 'ai_build',
      userId,
      userTag,
      prompt: description,
      result: 'success',
      metadata: { jobId: job._id.toString(), blueprintName: blueprint.name },
    });

    // Send preview embed with multi-view action rows
    const previewEmbeds = buildBlueprintPreviewEmbeds(blueprint, 'structure');
    const actionRows = buildBlueprintActionRows(job._id.toString(), 'structure');

    await editInteractionResponse(token, {
      embeds: previewEmbeds,
      components: actionRows,
    });
  } catch (err) {
    console.error('[/build] Error generating blueprint:', err);
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Generation Failed',
          'Failed to generate a blueprint. Please try again or use a different description.',
        ),
      ],
    });
  }
}

/**
 * Handle the Confirm button press — start applying the blueprint.
 * This runs asynchronously (after returning a deferred button response).
 */
export async function handleBuildConfirm(
  token: string,
  jobId: string,
  userId: string,
): Promise<void> {
  const { applyBuildJob } = await import('@/lib/discord/build-applier');
  try {
    await applyBuildJob({
      jobId,
      interactionToken: token,
      userId,
    });
  } catch (err) {
    console.error('[handleBuildConfirm] Error executing applyBuildJob:', err);
  }
}

/**
 * Handle the Cancel button press.
 */
export async function handleBuildCancel(
  token: string,
  jobId: string,
  userId: string,
): Promise<void> {
  await connectDB();

  const job = await BuildJob.findById(jobId);
  if (!job) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Not Found', 'Build job not found.')],
      ephemeral: true,
    });
    return;
  }

  if (job.userId !== userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('No Permission', 'Only the person who started this build can cancel it.')],
      ephemeral: true,
    });
    return;
  }

  const previousToken = job.interactionToken;
  job.status = 'cancelled';
  job.interactionToken = token;
  await job.save();

  try {
    await editInteractionResponse(token, {
      embeds: [infoEmbed('Build Cancelled', 'The server build has been cancelled.')],
      components: [],
    });
  } catch {
    if (previousToken && previousToken !== token) {
      await editInteractionResponse(previousToken, {
        embeds: [infoEmbed('Build Cancelled', 'The server build has been cancelled.')],
        components: [],
      }).catch((err) => console.warn('[handleBuildCancel] Edit response failed:', err));
    }
  }
}

/**
 * Handle the Undo button press — rollback a completed build.
 */
export async function handleBuildUndo(
  token: string,
  jobId: string,
  userId: string,
): Promise<void> {
  await connectDB();

  const job = await BuildJob.findById(jobId);
  if (!job || (job.status !== 'done' && job.status !== 'failed')) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Cannot Undo', 'This build cannot be undone (it may have already been rolled back).')],
      ephemeral: true,
    });
    return;
  }

  if (job.userId !== userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('No Permission', 'Only the person who started this build can undo it.')],
      ephemeral: true,
    });
    return;
  }

  const previousToken = job.interactionToken;
  job.interactionToken = token;
  await job.save();

  const safeEditUndo = async (opts: Parameters<typeof editInteractionResponse>[1]) => {
    try {
      await editInteractionResponse(token, opts);
      return;
    } catch {
      if (previousToken && previousToken !== token) {
        await editInteractionResponse(previousToken, opts).catch((err) =>
          console.warn('[handleBuildUndo] Edit response failed:', err),
        );
      }
    }
  };

  // Show rolling back state
  await safeEditUndo({
    embeds: [infoEmbed('Rolling Back…', '⏳ Deleting created channels, categories, and roles…')],
    components: [],
  });

  try {
    const { rollbackBuild } = await import('@/lib/discord/build-applier');
    await rollbackBuild(job.guildId, job.createdIds);

    job.status = 'rolled_back';
    await job.save();

    await safeEditUndo({
      embeds: [infoEmbed('Rollback Complete', 'All created channels, categories, and roles have been deleted.')],
      components: [],
    });
  } catch (err) {
    console.error('[/build undo] Rollback error:', err);
    await safeEditUndo({
      embeds: [errorEmbed('Rollback Failed', 'Some items could not be deleted. Please check your server and remove them manually.')],
      components: [],
    });
  }
}

/**
 * Handle tab switching between preview views: structure, permissions, and roles.
 */
export async function handleBuildViewTab(
  token: string,
  jobId: string,
  view: BlueprintView,
  userId: string,
): Promise<void> {
  await connectDB();

  const job = await BuildJob.findById(jobId);
  if (!job || job.status !== 'preview') {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Action', 'This build preview is no longer active.')],
      ephemeral: true,
    });
    return;
  }

  if (job.userId !== userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('No Permission', 'Only the person who started this build can change views.')],
      ephemeral: true,
    });
    return;
  }

  const blueprint = job.blueprint as ServerBlueprint;
  const previewEmbeds = buildBlueprintPreviewEmbeds(blueprint, view);
  const actionRows = buildBlueprintActionRows(jobId, view);

  await editInteractionResponse(token, {
    embeds: previewEmbeds,
    components: actionRows,
  });
}

/**
 * Present the Category Select Menu for in-place renaming.
 */
export async function handleBuildRenameCategoryPrompt(
  token: string,
  jobId: string,
  userId: string,
): Promise<void> {
  await connectDB();

  const job = await BuildJob.findById(jobId);
  if (!job || job.status !== 'preview') {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Action', 'This build preview is no longer active.')],
      ephemeral: true,
    });
    return;
  }

  if (job.userId !== userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('No Permission', 'Only the person who started this build can rename categories.')],
      ephemeral: true,
    });
    return;
  }

  const blueprint = job.blueprint as ServerBlueprint;
  const selectRow = buildCategorySelectRow(jobId, blueprint);
  const cancelRow = buildCancelSelectRow(jobId);

  await editInteractionResponse(token, {
    components: [selectRow, cancelRow],
  });
}

/**
 * Present the Channel Select Menu for in-place renaming.
 */
export async function handleBuildRenameChannelPrompt(
  token: string,
  jobId: string,
  userId: string,
): Promise<void> {
  await connectDB();

  const job = await BuildJob.findById(jobId);
  if (!job || job.status !== 'preview') {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Action', 'This build preview is no longer active.')],
      ephemeral: true,
    });
    return;
  }

  if (job.userId !== userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('No Permission', 'Only the person who started this build can rename channels.')],
      ephemeral: true,
    });
    return;
  }

  const blueprint = job.blueprint as ServerBlueprint;
  const selectRow = buildChannelSelectRow(jobId, blueprint);
  const cancelRow = buildCancelSelectRow(jobId);

  await editInteractionResponse(token, {
    components: [selectRow, cancelRow],
  });
}

/**
 * Handle Modal Submit (InteractionType.MODAL_SUBMIT / type 5) for category or channel renaming.
 */
export async function handleBuildModalSubmit(
  modal: APIModalSubmitInteraction,
): Promise<void> {
  await connectDB();

  const customId = modal.data.custom_id;
  const userId = modal.member?.user?.id ?? modal.user?.id ?? '';
  const token = modal.token;

  // Format: build_modal_cat:${jobId}:${catIndex} or build_modal_chan:${jobId}:${targetKey}
  const parts = customId.split(':');
  const modalType = parts[0];
  const jobId = parts[1];
  const targetKey = parts.slice(2).join(':');

  const job = await BuildJob.findById(jobId);
  if (!job || job.status !== 'preview') {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Action', 'This build preview is no longer active.')],
      ephemeral: true,
    });
    return;
  }

  if (job.userId !== userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('No Permission', 'Only the person who started this build can customize it.')],
      ephemeral: true,
    });
    return;
  }

  // Extract input field values
  const values: Record<string, string> = {};
  for (const row of modal.data.components ?? []) {
    for (const comp of (row as unknown as { components?: Array<{ custom_id: string; value: string }> }).components ?? []) {
      if (comp.custom_id) {
        values[comp.custom_id] = comp.value?.trim() ?? '';
      }
    }
  }

  const blueprint = job.blueprint as ServerBlueprint;

  if (modalType === 'build_modal_cat') {
    const catIndex = parseInt(targetKey, 10);
    const newName = values['new_name'];
    if (newName && !isNaN(catIndex) && blueprint.categories[catIndex]) {
      blueprint.categories[catIndex].name = newName;
      job.markModified('blueprint');
      await job.save();
    }
  } else if (modalType === 'build_modal_chan') {
    const newName = values['new_name'];
    const newTopic = values['new_topic'];

    if (newName) {
      if (targetKey.startsWith('top:')) {
        const topIndex = parseInt(targetKey.replace('top:', ''), 10);
        if (
          !isNaN(topIndex) &&
          blueprint.topLevelChannels &&
          blueprint.topLevelChannels[topIndex]
        ) {
          blueprint.topLevelChannels[topIndex].name = newName;
          if (newTopic !== undefined) {
            blueprint.topLevelChannels[topIndex].topic = newTopic || undefined;
          }
          job.markModified('blueprint');
          await job.save();
        }
      } else {
        const [catIdxStr, chIdxStr] = targetKey.split(':');
        const catIdx = parseInt(catIdxStr, 10);
        const chIdx = parseInt(chIdxStr, 10);
        if (
          !isNaN(catIdx) &&
          !isNaN(chIdx) &&
          blueprint.categories[catIdx]?.channels[chIdx]
        ) {
          blueprint.categories[catIdx].channels[chIdx].name = newName;
          if (newTopic !== undefined) {
            blueprint.categories[catIdx].channels[chIdx].topic = newTopic || undefined;
          }
          job.markModified('blueprint');
          await job.save();
        }
      }
    }
  }

  // Refresh preview back to structure view with updated action rows
  const previewEmbeds = buildBlueprintPreviewEmbeds(blueprint, 'structure');
  const actionRows = buildBlueprintActionRows(jobId, 'structure');

  try {
    await editInteractionResponse(token, {
      embeds: previewEmbeds,
      components: actionRows,
    });
  } catch {
    if (job.interactionToken && job.interactionToken !== token) {
      await editInteractionResponse(job.interactionToken, {
        embeds: previewEmbeds,
        components: actionRows,
      }).catch((err) => console.warn('[handleBuildModalSubmit] Edit fallback token failed:', err));
    }
  }
}

export const buildCommand: RegisteredCommand = {
  name: 'build',
  description: 'AI-generate a complete server structure from a description',
  category: 'builder',
  default_member_permissions: PermissionFlags.MANAGE_GUILD.toString(),
  dm_permission: false,
  rateLimit: { limit: 3, windowMs: 60_000 },
  options: [
    {
      name: 'description',
      description: 'Describe the server you want to build (e.g. "gaming community with web dev section")',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 500,
    },
    {
      name: 'preset',
      description: 'Quick-start from a curated, production-ready server architecture preset',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: getPresetChoices().map((p) => ({ name: p.name, value: p.value })),
    },
    {
      name: 'template',
      description: 'Start from a pre-defined template',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: '🎮 Gaming Community', value: 'gaming' },
        { name: '💻 Developer Community', value: 'dev' },
        { name: '📚 Study Group', value: 'study' },
        { name: '🎨 Creator Community', value: 'creator' },
        { name: '💼 Business Support', value: 'business' },
      ],
    },
  ],
  execute: handleBuildCommand,
  autocomplete: async (ctx) => {
    if (ctx.focusedOption.name === 'preset') {
      const query = ctx.focusedOption.value.toLowerCase();
      const choices = getPresetChoices();
      return choices
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.value.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query),
        )
        .map((p) => ({ name: p.name, value: p.value }));
    }
    if (ctx.focusedOption.name === 'template') {
      const query = ctx.focusedOption.value.toLowerCase();
      const templates = [
        { name: '🎮 Gaming Community', value: 'gaming' },
        { name: '💻 Developer Community', value: 'dev' },
        { name: '📚 Study Group', value: 'study' },
        { name: '🎨 Creator Community', value: 'creator' },
        { name: '💼 Business Support', value: 'business' },
      ];
      return templates.filter(
        (t) => t.name.toLowerCase().includes(query) || t.value.toLowerCase().includes(query),
      );
    }
    return [];
  },
};
