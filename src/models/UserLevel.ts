/**
 * src/models/UserLevel.ts
 * MongoDB model storing per-guild user XP, level, message count, and voice stats.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserLevel extends Document {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  totalMessages: number;
  voiceSeconds: number;
  lastXpAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserLevelSchema = new Schema<IUserLevel>(
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
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
    voiceSeconds: {
      type: Number,
      default: 0,
    },
    lastXpAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound unique index ensuring one level record per user per guild
UserLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Compound index optimized for leaderboard queries sorted by XP descending
UserLevelSchema.index({ guildId: 1, xp: -1 });

export const UserLevel: Model<IUserLevel> =
  mongoose.models.UserLevel ??
  mongoose.model<IUserLevel>('UserLevel', UserLevelSchema);
