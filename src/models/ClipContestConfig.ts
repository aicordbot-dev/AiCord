/**
 * src/models/ClipContestConfig.ts
 * MongoDB model storing guild configuration for community gaming clip competitions.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClipContestConfig extends Document {
  guildId: string;
  channelId: string;
  championRoleId?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClipContestConfigSchema = new Schema<IClipContestConfig>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelId: {
      type: String,
      default: '',
    },
    championRoleId: {
      type: String,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const ClipContestConfig: Model<IClipContestConfig> =
  mongoose.models.ClipContestConfig ||
  mongoose.model<IClipContestConfig>('ClipContestConfig', ClipContestConfigSchema);
