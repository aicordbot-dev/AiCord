/**
 * src/lib/engines/job-queue.ts
 * Enterprise-grade MongoDB-backed job queue with atomic locking,
 * exponential backoff with jitter, dead-letter state, and handler dispatching.
 */

import { connectDB } from '@/lib/db';
import { Job, type IJob, type JobStatus } from '@/models/Job';

export type JobHandler<T = unknown> = (payload: T, job: IJob) => Promise<void> | void;

export interface EnqueueJobOptions {
  guildId?: string;
  runAt?: Date;
  delayMs?: number;
  maxAttempts?: number;
}

export interface ProcessJobsResult {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

// In-memory handler registry
const handlers = new Map<string, JobHandler<unknown>>();

/**
 * Register a handler for a specific job type.
 */
export function registerJobHandler<T = unknown>(type: string, handler: JobHandler<T>): void {
  handlers.set(type, handler as JobHandler<unknown>);
}

/**
 * Get the registered handler for a job type.
 */
export function getJobHandler(type: string): JobHandler | undefined {
  return handlers.get(type);
}

/**
 * Clear all registered job handlers (useful in unit tests).
 */
export function clearJobHandlers(): void {
  handlers.clear();
}

/**
 * Enqueue a new background job into MongoDB.
 */
export async function enqueueJob<T = Record<string, unknown>>(
  type: string,
  payload: T = {} as T,
  options: EnqueueJobOptions = {},
): Promise<IJob> {
  await connectDB();

  let runAt = options.runAt ?? new Date();
  if (options.delayMs && options.delayMs > 0) {
    runAt = new Date(Date.now() + options.delayMs);
  }

  const job = await Job.create({
    type,
    guildId: options.guildId,
    runAt,
    payload: payload as Record<string, unknown>,
    maxAttempts: options.maxAttempts ?? 5,
    status: 'pending' as JobStatus,
    attempts: 0,
  });

  return job;
}

/**
 * Calculate exponential backoff delay with random jitter (prevents thundering herd).
 */
export function computeBackoffDelay(
  attempts: number,
  baseDelayMs = 5_000,
  maxDelayMs = 300_000,
  jitterMs = 1_000,
): number {
  const exponent = Math.max(0, attempts - 1);
  const exponential = baseDelayMs * Math.pow(2, exponent);
  const bounded = Math.min(maxDelayMs, exponential);
  const jitter = Math.floor(Math.random() * jitterMs);
  return bounded + jitter;
}

/**
 * Atomically claim the next due job using findOneAndUpdate.
 * Ensures strict concurrency safety without double-processing across serverless invocations.
 */
export async function claimNextJob(lockDurationMs = 60_000): Promise<IJob | null> {
  await connectDB();

  const now = new Date();
  const lockExpires = new Date(now.getTime() + lockDurationMs);

  const job = await Job.findOneAndUpdate(
    {
      status: { $in: ['pending', 'failed'] },
      runAt: { $lte: now },
      $or: [
        { lockedUntil: { $lte: now } },
        { lockedUntil: null },
        { lockedUntil: { $exists: false } },
      ],
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    },
    {
      $set: {
        status: 'processing' as JobStatus,
        lockedUntil: lockExpires,
      },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { runAt: 1 } },
  );

  return job;
}

/**
 * Process a single claimed job with its registered handler,
 * handling success, exponential retry, or dead-letter transition.
 */
export async function executeJob(
  job: IJob,
): Promise<{ status: 'completed' | 'failed' | 'dead_letter'; error?: string }> {
  const handler = getJobHandler(job.type);

  if (!handler) {
    const errorMsg = `No handler registered for job type: "${job.type}"`;
    return handleJobFailure(job, new Error(errorMsg));
  }

  try {
    await handler(job.payload, job);

    // Job succeeded
    job.status = 'completed';
    job.lockedUntil = undefined;
    job.lastError = undefined;
    await job.save();

    return { status: 'completed' };
  } catch (err: unknown) {
    return handleJobFailure(job, err);
  }
}

/**
 * Handle job failure: record error, calculate backoff or mark as dead-letter.
 */
async function handleJobFailure(
  job: IJob,
  err: unknown,
): Promise<{ status: 'failed' | 'dead_letter'; error: string }> {
  const errorMessage = err instanceof Error ? err.message : String(err);
  job.lastError = errorMessage;

  if (job.attempts >= job.maxAttempts) {
    job.status = 'dead_letter';
    job.lockedUntil = undefined;
    await job.save();
    return { status: 'dead_letter', error: errorMessage };
  }

  const backoffMs = computeBackoffDelay(job.attempts);
  job.status = 'failed';
  job.runAt = new Date(Date.now() + backoffMs);
  job.lockedUntil = undefined;
  await job.save();

  return { status: 'failed', error: errorMessage };
}

/**
 * Process due jobs up to a given limit.
 * Designed to be called by the cron endpoint or background workers.
 */
export async function processDueJobs(
  limit = 10,
  options: { lockDurationMs?: number } = {},
): Promise<ProcessJobsResult> {
  await connectDB();

  const lockDurationMs = options.lockDurationMs ?? 60_000;
  const result: ProcessJobsResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    deadLettered: 0,
  };

  for (let i = 0; i < limit; i++) {
    const job = await claimNextJob(lockDurationMs);
    if (!job) {
      // No more jobs ready to claim
      break;
    }

    result.processed++;
    const execution = await executeJob(job);

    if (execution.status === 'completed') {
      result.succeeded++;
    } else if (execution.status === 'dead_letter') {
      result.deadLettered++;
    } else {
      result.failed++;
    }
  }

  return result;
}
