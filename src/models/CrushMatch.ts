/**
 * src/models/CrushMatch.ts
 * MongoDB model storing confidential crush declarations and mutual matches.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICrushMatch extends Document {
  guildId: string;
  userId: string;
  crushUserId: string;
  matched: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CrushMatchSchema = new Schema<ICrushMatch>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    crushUserId: {
      type: String,
      required: true,
      index: true,
    },
    matched: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

CrushMatchSchema.index({ guildId: 1, userId: 1, crushUserId: 1 }, { unique: true });

export const CrushMatch: Model<ICrushMatch> =
  mongoose.models.CrushMatch ||
  mongoose.model<ICrushMatch>('CrushMatch', CrushMatchSchema);
