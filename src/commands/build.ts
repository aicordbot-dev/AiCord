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

import type {
  APIChatInputApplicationCommandInteraction,
  APIApplicationCommandInteractionDataStringOption,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import { BuildJob } from '@/models/BuildJob';
import { AuditLog } from '@/models/AuditLog';
import { generateBlueprint, SERVER_TEMPLATES } from '@/lib/ai/generate-blueprint';
import { buildBlueprintPreviewEmbeds } from '@/lib/discord/blueprint-preview';
import {
  editInteractionResponse,
  buildConfirmCancelRow,
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

  const description = descriptionOption?.value ?? '';
  const template = templateOption?.value as keyof typeof SERVER_TEMPLATES | undefined;

  if (!description && !template) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Description', 'Please provide a description for your server.')],
      ephemeral: true,
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

    // Send preview embed with Confirm/Cancel
    const previewEmbeds = buildBlueprintPreviewEmbeds(blueprint);

    await editInteractionResponse(token, {
      embeds: previewEmbeds,
      components: [buildConfirmCancelRow(job._id.toString())],
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
  await connectDB();

  const job = await BuildJob.findById(jobId);
  if (!job || job.status !== 'preview') {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Action', 'This build job is no longer available.')],
      ephemeral: true,
    });
    return;
  }

  // Only the original requester can confirm
  if (job.userId !== userId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('No Permission', 'Only the person who started this build can confirm it.')],
      ephemeral: true,
    });
    return;
  }

  const previousToken = job.interactionToken;
  job.status = 'running';
  job.interactionToken = token;
  await job.save();

  // Helper to reliably edit the interaction response, trying token first then previousToken
  const safeEdit = async (opts: Parameters<typeof editInteractionResponse>[1]) => {
    try {
      await editInteractionResponse(token, opts);
      return;
    } catch (err) {
      console.warn('[handleBuildConfirm] editInteractionResponse with button token failed:', err);
    }

    if (previousToken && previousToken !== token) {
      try {
        await editInteractionResponse(previousToken, opts);
      } catch (err2) {
        console.warn('[handleBuildConfirm] editInteractionResponse with previousToken failed:', err2);
      }
    }
  };

  // Import here to avoid circular deps
  const { applyBlueprint } = await import('@/lib/discord/build-applier');
  const { progressEmbed, errorEmbed: errEmbed } = await import('@/lib/discord/embeds');
  const { buildUndoRow } = await import('@/lib/discord/interaction-response');
  const { buildBuildCompletionEmbed } = await import('@/lib/discord/blueprint-preview');

  try {
    const result = await applyBlueprint({
      guildId: job.guildId,
      blueprint: job.blueprint as Parameters<typeof applyBlueprint>[0]['blueprint'],
      onProgress: async (steps) => {
        job.steps = steps;
        await job.save().catch(() => {});
        await safeEdit({
          embeds: [progressEmbed('Building your server…', steps)],
          components: [],
        });
      },
    });

    if (result.success) {
      job.status = 'done';
      job.createdIds = result.createdIds;
      job.steps = result.steps;
      await job.save();

      const completionEmbed = buildBuildCompletionEmbed(
        job.blueprint as Parameters<typeof applyBlueprint>[0]['blueprint'],
        result.createdIds,
        result.steps,
      );

      await safeEdit({
        embeds: [completionEmbed],
        components: [buildUndoRow(job._id.toString())],
      });
    } else {
      job.status = 'failed';
      job.errorMessage = result.error;
      job.createdIds = result.createdIds;
      job.steps = result.steps;
      await job.save();

      const hasCreatedItems =
        (result.createdIds.roles?.length ?? 0) > 0 ||
        (result.createdIds.categories?.length ?? 0) > 0 ||
        (result.createdIds.channels?.length ?? 0) > 0;

      await safeEdit({
        embeds: [
          progressEmbed('Build Failed', result.steps),
          errEmbed('Build Error', result.error ?? 'An unknown error occurred'),
        ],
        components: hasCreatedItems ? [buildUndoRow(job._id.toString())] : [],
      });
    }
  } catch (err) {
    console.error('[handleBuildConfirm] Unhandled build execution error:', err);
    job.status = 'failed';
    job.errorMessage = err instanceof Error ? err.message : String(err);
    await job.save().catch(() => {});

    await safeEdit({
      embeds: [
        progressEmbed('Build Failed', job.steps || []),
        errEmbed('Build Error', err instanceof Error ? err.message : 'An unexpected error occurred'),
      ],
      components: [buildUndoRow(job._id.toString())],
    });
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
