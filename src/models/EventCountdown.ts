/**
 * src/models/EventCountdown.ts
 * MongoDB model storing dynamic real-time event countdown clocks.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventCountdown extends Document {
  guildId: string;
  countdownId: string;
  channelId: string;
  messageId?: string;
  creatorId: string;
  title: string;
  description?: string;
  targetDate: Date;
  notifyRoleId?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EventCountdownSchema = new Schema<IEventCountdown>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    countdownId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
    },
    creatorId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    notifyRoleId: {
      type: String,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

EventCountdownSchema.index({ guildId: 1, completed: 1 });

export const EventCountdown: Model<IEventCountdown> =
  mongoose.models.EventCountdown ||
  mongoose.model<IEventCountdown>('EventCountdown', EventCountdownSchema);
