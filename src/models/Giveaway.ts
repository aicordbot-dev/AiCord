/**
 * src/models/Giveaway.ts
 * MongoDB model tracking interactive server giveaways and raffles.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGiveawayRequirements {
  minLevel?: number;
  requiredRoleId?: string;
}

export interface IGiveaway extends Document {
  guildId: string;
  channelId: string;
  messageId: string;
  prize: string;
  winnersCount: number;
  hostId: string;
  endsAt: Date;
  ended: boolean;
  entries: string[];
  winners: string[];
  requirements: IGiveawayRequirements;
  createdAt: Date;
  updatedAt: Date;
}

const GiveawayRequirementsSchema = new Schema<IGiveawayRequirements>(
  {
    minLevel: {
      type: Number,
      required: false,
    },
    requiredRoleId: {
      type: String,
      required: false,
    },
  },
  { _id: false },
);

const GiveawaySchema = new Schema<IGiveaway>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
    prize: {
      type: String,
      required: true,
    },
    winnersCount: {
      type: Number,
      default: 1,
    },
    hostId: {
      type: String,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    ended: {
      type: Boolean,
      default: false,
    },
    entries: {
      type: [String],
      default: [],
    },
    winners: {
      type: [String],
      default: [],
    },
    requirements: {
      type: GiveawayRequirementsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

GiveawaySchema.index({ guildId: 1, ended: 1 });

export const Giveaway: Model<IGiveaway> =
  mongoose.models.Giveaway ?? mongoose.model<IGiveaway>('Giveaway', GiveawaySchema);
