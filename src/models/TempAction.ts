/**
 * src/models/TempAction.ts
 * Tracks temp bans, temp timeouts, and other time-limited actions.
 * Expired entries are processed by the Vercel Cron job.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type TempActionType = 'temp_ban' | 'temp_timeout' | 'temp_role';

export interface ITempAction extends Document {
  guildId: string;
  type: TempActionType;
  userId: string;
  moderatorId: string;
  roleId?: string; // For temp_role type
  expiresAt: Date;
  processed: boolean;
  caseNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TempActionSchema = new Schema<ITempAction>(
  {
    guildId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['temp_ban', 'temp_timeout', 'temp_role'],
      required: true,
    },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    roleId: String,
    expiresAt: { type: Date, required: true, index: true },
    processed: { type: Boolean, default: false, index: true },
    caseNumber: Number,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

TempActionSchema.index({ processed: 1, expiresAt: 1 });

export const TempAction: Model<ITempAction> =
  mongoose.models.TempAction ??
  mongoose.model<ITempAction>('TempAction', TempActionSchema);
