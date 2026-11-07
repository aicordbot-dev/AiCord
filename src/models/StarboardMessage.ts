/**
 * src/models/StarboardMessage.ts
 * MongoDB model tracking messages starred and posted to the Starboard Community Hall of Fame.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStarboardMessage extends Document {
  guildId: string;
  originalChannelId: string;
  originalMessageId: string;
  starboardMessageId?: string;
  authorId: string;
  content: string;
  attachments: string[];
  starCount: number;
  starredBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

const StarboardMessageSchema = new Schema<IStarboardMessage>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    originalChannelId: {
      type: String,
      required: true,
    },
    originalMessageId: {
      type: String,
      required: true,
    },
    starboardMessageId: {
      type: String,
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: '',
    },
    attachments: {
      type: [String],
      default: [],
    },
    starCount: {
      type: Number,
      default: 0,
      index: true,
    },
    starredBy: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound unique index on guildId and originalMessageId
StarboardMessageSchema.index({ guildId: 1, originalMessageId: 1 }, { unique: true });

export const StarboardMessage: Model<IStarboardMessage> =
  mongoose.models.StarboardMessage ??
  mongoose.model<IStarboardMessage>('StarboardMessage', StarboardMessageSchema);
