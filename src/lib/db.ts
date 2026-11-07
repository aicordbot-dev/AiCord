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

function resolveMongoUri(): string {
  try {
    if (env.MONGODB_URI) {
      return env.MONGODB_URI;
    }
  } catch {
    // env validation failed or not initialized
  }
  return process.env.MONGODB_URI || '';
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached) {
    return cached;
  }

  const uri = resolveMongoUri();
  if (!uri) {
    throw new Error('[MongoDB] MONGODB_URI is not defined in environment variables.');
  }

  cached = mongoose.connect(uri, {
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
