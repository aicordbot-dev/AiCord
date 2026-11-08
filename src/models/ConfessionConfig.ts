/**
 * src/models/ConfessionConfig.ts
 * MongoDB model storing guild configuration for anonymous confessions.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConfessionConfig extends Document {
  guildId: string;
  channelId: string;
  filterProfanity: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConfessionConfigSchema = new Schema<IConfessionConfig>(
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
    filterProfanity: {
      type: Boolean,
      default: true,
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

export const ConfessionConfig: Model<IConfessionConfig> =
  mongoose.models.ConfessionConfig ||
  mongoose.model<IConfessionConfig>('ConfessionConfig', ConfessionConfigSchema);
