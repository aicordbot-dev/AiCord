/**
 * src/app/api/cron/process-build-jobs/route.ts
 * Vercel Cron: Advance stalled or queued build jobs.
 * Schedule: every 2 minutes (see vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { connectDB } from '@/lib/db';
import { BuildJob } from '@/models/BuildJob';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();

  // Find jobs that are confirmed but stalled (lockedUntil expired or not locked)
  const stalledJob = await BuildJob.findOneAndUpdate(
    {
      status: 'confirmed',
      $or: [
        { lockedUntil: { $lt: now } },
        { lockedUntil: { $exists: false } },
      ],
      attempts: { $lt: 5 },
    },
    {
      $set: { lockedUntil: new Date(Date.now() + 60_000) }, // Lock for 60s
      $inc: { attempts: 1 },
    },
    { new: true },
  );

  if (!stalledJob) {
    return NextResponse.json({ message: 'No stalled jobs' });
  }

  console.log(`[BuildJob Cron] Restarting job ${stalledJob._id} (attempt ${stalledJob.attempts})`);

  try {
    stalledJob.status = 'running';
    await stalledJob.save();

    const { applyBlueprint } = await import('@/lib/discord/build-applier');
    const { editInteractionResponse, buildUndoRow } = await import('@/lib/discord/interaction-response');
    const { progressEmbed, errorEmbed } = await import('@/lib/discord/embeds');

    const result = await applyBlueprint({
      guildId: stalledJob.guildId,
      blueprint: stalledJob.blueprint as Parameters<typeof applyBlueprint>[0]['blueprint'],
      onProgress: async (steps) => {
        stalledJob.steps = steps;
        await stalledJob.save();
        await editInteractionResponse(stalledJob.interactionToken, {
          embeds: [progressEmbed('Building your server…', steps)],
          components: [],
        });
      },
    });

    if (result.success) {
      stalledJob.status = 'done';
      stalledJob.createdIds = result.createdIds;
      stalledJob.steps = result.steps;
      stalledJob.lockedUntil = undefined;
      await stalledJob.save();

      await editInteractionResponse(stalledJob.interactionToken, {
        embeds: [progressEmbed('Build Complete! ✨', result.steps)],
        components: [buildUndoRow(stalledJob._id.toString())],
      });
    } else {
      stalledJob.status = 'failed';
      stalledJob.errorMessage = result.error;
      stalledJob.steps = result.steps;
      await stalledJob.save();

      await editInteractionResponse(stalledJob.interactionToken, {
        embeds: [errorEmbed('Build Failed', result.error ?? 'Unknown error')],
      });
    }
  } catch (err) {
    console.error(`[BuildJob Cron] Job ${stalledJob._id} failed:`, err);
    stalledJob.status = 'failed';
    stalledJob.errorMessage = String(err);
    await stalledJob.save();
  }

  return NextResponse.json({ jobId: stalledJob._id.toString() });
}
