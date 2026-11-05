/**
 * src/app/api/cron/jobs/route.ts
 * Vercel Cron endpoint to advance and execute asynchronous background jobs.
 * Protected by CRON_SECRET bearer token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { processDueJobs } from '@/lib/engines/job-queue';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await processDueJobs(25);
    return NextResponse.json({
      message: 'Job queue processed',
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Jobs Cron] Error processing jobs:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: errorMessage },
      { status: 500 },
    );
  }
}
