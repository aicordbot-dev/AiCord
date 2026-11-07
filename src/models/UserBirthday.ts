/**
 * src/models/UserBirthday.ts
 * MongoDB model storing user birthday records and celebration tracking per guild.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserBirthday extends Document {
  guildId: string;
  userId: string;
  month: number;
  day: number;
  timezone?: string;
  lastCelebratedYear?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserBirthdaySchema = new Schema<IUserBirthday>(
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
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    lastCelebratedYear: {
      type: Number,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound unique index ensuring one birthday record per user per guild
UserBirthdaySchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const UserBirthday: Model<IUserBirthday> =
  mongoose.models.UserBirthday ??
  mongoose.model<IUserBirthday>('UserBirthday', UserBirthdaySchema);
