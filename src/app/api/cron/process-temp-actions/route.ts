/**
 * src/app/api/cron/process-temp-actions/route.ts
 * Vercel Cron: Expire temp bans, temp timeouts, and temp roles,
 * and execute automated daily birthday celebrations.
 * Schedule: every 5 minutes (see vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { connectDB } from '@/lib/db';
import { TempAction } from '@/models/TempAction';
import { ModCase } from '@/models/ModCase';
import { getDiscordRest, discordApiCall } from '@/lib/discord/rest';
import { Routes } from 'discord-api-types/v10';
import { triggerDailyBirthdaysForAllGuilds } from '@/lib/birthdays/birthday-service';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const rest = getDiscordRest();
  let processed = 0;
  let failed = 0;

  // Find expired, unprocessed actions — claim them atomically
  const expiredActions = await TempAction.find({
    processed: false,
    expiresAt: { $lte: now },
  }).limit(50); // Process in batches

  for (const action of expiredActions) {
    try {
      switch (action.type) {
        case 'temp_ban': {
          await discordApiCall(() =>
            rest.delete(Routes.guildBan(action.guildId, action.userId), {
              reason: 'Temporary ban expired',
            }),
          );

          // Update the mod case
          if (action.caseNumber) {
            await ModCase.updateOne(
              { guildId: action.guildId, caseNumber: action.caseNumber },
              { $set: { active: false } },
            );
          }
          break;
        }

        case 'temp_timeout': {
          // Discord timeouts auto-expire, but we can clear the flag
          if (action.caseNumber) {
            await ModCase.updateOne(
              { guildId: action.guildId, caseNumber: action.caseNumber },
              { $set: { active: false } },
            );
          }
          break;
        }

        case 'temp_role': {
          if (action.roleId) {
            await discordApiCall(() =>
              rest.delete(Routes.guildMemberRole(action.guildId, action.userId, action.roleId!), {
                reason: 'Temporary role expired',
              }),
            );
          }
          break;
        }
      }

      action.processed = true;
      await action.save();
      processed++;
    } catch (err) {
      console.error(`[TempAction] Failed to process ${action.type} for ${action.userId}:`, err);
      failed++;
      // Don't mark as processed — will retry next run
    }
  }

  // Trigger automated daily birthday celebrations across servers
  let celebrationsCount = 0;
  try {
    const celebrations = await triggerDailyBirthdaysForAllGuilds(now);
    celebrationsCount = celebrations.length;
  } catch (bdayErr) {
    console.error('[TempAction Cron] Failed to trigger daily birthdays:', bdayErr);
  }

  console.log(
    `[TempAction Cron] Processed: ${processed}, Failed: ${failed}, Birthdays: ${celebrationsCount}`,
  );
  return NextResponse.json({
    processed,
    failed,
    celebrations: celebrationsCount,
    timestamp: now.toISOString(),
  });
}
