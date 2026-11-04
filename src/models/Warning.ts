/**
 * src/models/Warning.ts
 * Per-user warning records (separate from mod cases for quick lookup).
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWarning extends Document {
  guildId: string;
  userId: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  caseNumber?: number; // Reference to the ModCase
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarningSchema = new Schema<IWarning>(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    moderatorTag: { type: String, required: true },
    reason: { type: String, required: true, maxlength: 500, default: 'No reason provided' },
    caseNumber: Number,
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

WarningSchema.index({ guildId: 1, userId: 1 });
WarningSchema.index({ guildId: 1, userId: 1, active: 1 });

export const Warning: Model<IWarning> =
  mongoose.models.Warning ??
  mongoose.model<IWarning>('Warning', WarningSchema);
