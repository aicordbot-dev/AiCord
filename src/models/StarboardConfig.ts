/**
 * src/models/StarboardConfig.ts
 * MongoDB model storing per-guild Starboard Community Hall of Fame configuration.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStarboardConfig extends Document {
  guildId: string;
  channelId: string;
  minStars: number;
  emoji: string;
  selfStar: boolean;
  ignoredChannels: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StarboardConfigSchema = new Schema<IStarboardConfig>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    minStars: {
      type: Number,
      default: 3,
      min: 1,
    },
    emoji: {
      type: String,
      default: '⭐',
    },
    selfStar: {
      type: Boolean,
      default: false,
    },
    ignoredChannels: {
      type: [String],
      default: [],
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

export const StarboardConfig: Model<IStarboardConfig> =
  mongoose.models.StarboardConfig ??
  mongoose.model<IStarboardConfig>('StarboardConfig', StarboardConfigSchema);
