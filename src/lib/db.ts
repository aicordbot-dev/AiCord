/**
 * src/lib/db.ts
 * MongoDB connection singleton using Mongoose.
 * Re-uses the connection across serverless invocations via global cache.
 */

import mongoose from 'mongoose';
import { env } from '@/lib/env';

declare global {
  // Allow global variable to persist across HMR in development
  var __mongoose_conn: Promise<typeof mongoose> | null;
}

let cached: Promise<typeof mongoose> | null = global.__mongoose_conn ?? null;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached) {
    return cached;
  }

  cached = mongoose.connect(env.MONGODB_URI, {
    // Recommended settings for serverless environments
    serverSelectionTimeoutMS: 5_000,
    maxPoolSize: 10, // Connection pool — shared across invocations
  });

  global.__mongoose_conn = cached;

  cached.catch((err) => {
    // Clear the cached promise so the next call retries
    global.__mongoose_conn = null;
    cached = null;
    console.error('[MongoDB] Connection error:', err);
  });

  return cached;
}

/**
 * Convenience wrapper — connects and returns the mongoose instance.
 * Usage: const db = await getDB();
 */
export async function getDB() {
  return connectDB();
}
