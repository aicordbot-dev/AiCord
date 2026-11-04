/**
 * src/models/ModCase.ts
 * Moderation case records (bans, kicks, timeouts, warns).
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type CaseAction = 'ban' | 'kick' | 'timeout' | 'warn' | 'softban' | 'unban' | 'untimeout';

export interface IModCase extends Document {
  guildId: string;
  caseNumber: number;
  action: CaseAction;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  duration?: number; // milliseconds, for temp actions
  expiresAt?: Date;
  active: boolean; // For temp actions: is this still active?
  messageId?: string; // Mod log message ID
  createdAt: Date;
  updatedAt: Date;
}

const ModCaseSchema = new Schema<IModCase>(
  {
    guildId: { type: String, required: true, index: true },
    caseNumber: { type: Number, required: true },
    action: {
      type: String,
      enum: ['ban', 'kick', 'timeout', 'warn', 'softban', 'unban', 'untimeout'],
      required: true,
    },
    targetId: { type: String, required: true },
    targetTag: { type: String, required: true },
    moderatorId: { type: String, required: true },
    moderatorTag: { type: String, required: true },
    reason: { type: String, required: true, maxlength: 1000, default: 'No reason provided' },
    duration: Number,
    expiresAt: Date,
    active: { type: Boolean, default: false },
    messageId: String,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Unique case numbers per guild
ModCaseSchema.index({ guildId: 1, caseNumber: 1 }, { unique: true });
// Query cases for a target user
ModCaseSchema.index({ guildId: 1, targetId: 1 });
// Find expiring temp actions
ModCaseSchema.index({ active: 1, expiresAt: 1 });

export const ModCase: Model<IModCase> =
  mongoose.models.ModCase ??
  mongoose.model<IModCase>('ModCase', ModCaseSchema);
