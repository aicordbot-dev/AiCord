/**
 * src/models/Confession.ts
 * MongoDB model storing anonymous confessions and community reaction votes.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type ConfessionStatus = 'approved' | 'pending' | 'rejected';

export interface IConfessionVotes {
  wholesome: string[]; // user IDs
  funny: string[];
  redFlag: string[];
}

export interface IConfession extends Document {
  guildId: string;
  confessionId: number;
  content: string;
  replyToId?: number;
  votes: IConfessionVotes;
  status: ConfessionStatus;
  channelId?: string;
  messageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConfessionSchema = new Schema<IConfession>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    confessionId: {
      type: Number,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    replyToId: {
      type: Number,
      required: false,
    },
    votes: {
      wholesome: {
        type: [String],
        default: [],
      },
      funny: {
        type: [String],
        default: [],
      },
      redFlag: {
        type: [String],
        default: [],
      },
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
    },
    channelId: {
      type: String,
      required: false,
    },
    messageId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ConfessionSchema.index({ guildId: 1, confessionId: 1 }, { unique: true });

export const Confession: Model<IConfession> =
  mongoose.models.Confession ||
  mongoose.model<IConfession>('Confession', ConfessionSchema);
