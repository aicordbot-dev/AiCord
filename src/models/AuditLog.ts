/**
 * src/models/AuditLog.ts
 * Records every AI action and config change for the dashboard audit log.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditLogType = 'ai_build' | 'ai_manage' | 'mod_action' | 'config_change' | 'role_panel' | 'cron_job';

export interface IAuditLog extends Document {
  guildId: string;
  type: AuditLogType;
  userId?: string;
  userTag?: string;
  prompt?: string;
  actions?: unknown[];
  result?: 'success' | 'failure' | 'cancelled';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    guildId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['ai_build', 'ai_manage', 'mod_action', 'config_change', 'role_panel', 'cron_job'],
      required: true,
    },
    userId: String,
    userTag: String,
    prompt: { type: String, maxlength: 1000 },
    actions: [Schema.Types.Mixed],
    result: { type: String, enum: ['success', 'failure', 'cancelled'] },
    errorMessage: String,
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Index for dashboard queries: get logs for a guild, newest first
AuditLogSchema.index({ guildId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
