/**
 * src/lib/engines/audit-logger.ts
 * Enterprise audit trail logger for configuration changes and admin actions.
 * Computes deep diffs between before and after states, persisting immutable audit records.
 */

import { connectDB } from '@/lib/db';
import { AuditLog, type IAuditLog, type AuditLogType } from '@/models/AuditLog';

export interface FieldChange {
  before: unknown;
  after: unknown;
}

export interface ConfigDiff {
  changed: boolean;
  changes: Record<string, FieldChange>;
  addedKeys: string[];
  removedKeys: string[];
  modifiedKeys: string[];
}

export interface LogConfigChangeOptions {
  guildId: string;
  userId?: string;
  userTag?: string;
  module: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string;
}

/**
 * Check if two values are deeply equal.
 */
function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!isDeepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
      return false;
    }
  }

  return true;
}

/**
 * Compute the changeset (diff) between two state objects.
 * Flattens nested keys with dot-notation for clear reporting.
 */
export function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  prefix = '',
): ConfigDiff {
  const safeBefore = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>;
  const safeAfter = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;

  const changes: Record<string, FieldChange> = {};
  const addedKeys: string[] = [];
  const removedKeys: string[] = [];
  const modifiedKeys: string[] = [];

  const allKeys = new Set([...Object.keys(safeBefore), ...Object.keys(safeAfter)]);

  for (const key of allKeys) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const hasBefore = Object.prototype.hasOwnProperty.call(safeBefore, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(safeAfter, key);

    const valBefore = safeBefore[key];
    const valAfter = safeAfter[key];

    if (!hasBefore && hasAfter) {
      addedKeys.push(fullKey);
      changes[fullKey] = { before: undefined, after: valAfter };
    } else if (hasBefore && !hasAfter) {
      removedKeys.push(fullKey);
      changes[fullKey] = { before: valBefore, after: undefined };
    } else if (!isDeepEqual(valBefore, valAfter)) {
      // If both are plain objects (and neither is an Array/Date), recurse
      if (
        valBefore &&
        valAfter &&
        typeof valBefore === 'object' &&
        typeof valAfter === 'object' &&
        !Array.isArray(valBefore) &&
        !Array.isArray(valAfter) &&
        !(valBefore instanceof Date) &&
        !(valAfter instanceof Date)
      ) {
        const nestedDiff = computeDiff(
          valBefore as Record<string, unknown>,
          valAfter as Record<string, unknown>,
          fullKey,
        );
        Object.assign(changes, nestedDiff.changes);
        addedKeys.push(...nestedDiff.addedKeys);
        removedKeys.push(...nestedDiff.removedKeys);
        modifiedKeys.push(...nestedDiff.modifiedKeys);
      } else {
        modifiedKeys.push(fullKey);
        changes[fullKey] = { before: valBefore, after: valAfter };
      }
    }
  }

  return {
    changed: Object.keys(changes).length > 0,
    changes,
    addedKeys,
    removedKeys,
    modifiedKeys,
  };
}

/**
 * Log a configuration modification to MongoDB with atomic diff computation.
 */
export async function logConfigChange(options: LogConfigChangeOptions): Promise<IAuditLog> {
  await connectDB();

  const diff = computeDiff(options.before, options.after);

  const entry = await AuditLog.create({
    guildId: options.guildId,
    type: 'config_change',
    userId: options.userId,
    userTag: options.userTag,
    metadata: {
      module: options.module,
      action: options.action,
      reason: options.reason,
      diff,
      before: options.before,
      after: options.after,
    },
    result: 'success',
  });

  return entry;
}

/**
 * Fetch recent audit log entries for a guild.
 */
export async function getAuditLogsForGuild(
  guildId: string,
  options: { limit?: number; skip?: number; type?: AuditLogType } = {},
): Promise<IAuditLog[]> {
  await connectDB();

  const query: Record<string, unknown> = { guildId };
  if (options.type) {
    query.type = options.type;
  }

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip(options.skip ?? 0)
    .limit(options.limit ?? 50);

  return logs;
}
