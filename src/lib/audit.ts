/**
 * src/lib/audit.ts
 * Unified audit logging interface for server connection events, user auth access,
 * and security checkpoints.
 */

import { connectDB } from '@/lib/db';
import { AuditLog } from '@/models/AuditLog';

export interface LogAuditOptions {
  guildId: string;
  userId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}

/**
 * Persists an audit log event.
 * Resilient against database connection unavailability (gracefully logs in fallback mode).
 */
export async function logAudit(options: LogAuditOptions): Promise<void> {
  const { guildId, userId, action, metadata } = options;

  try {
    await connectDB();

    await AuditLog.create({
      guildId,
      type: 'config_change',
      userId,
      prompt: action,
      result: 'success',
      metadata: metadata || {},
    });
  } catch (err) {
    // Non-blocking fallback logging so user operations are never interrupted
    console.warn(`[AuditLog Fallback] guild=${guildId} user=${userId || 'anonymous'} action=${action}`, metadata, err);
  }
}
