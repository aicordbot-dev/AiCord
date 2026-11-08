/**
 * src/models/Bounty.ts
 * MongoDB model tracking community bounties and escrow lifecycle.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type BountyCategory = 'dev' | 'design' | 'gaming' | 'general';
export type BountyStatus = 'open' | 'claimed' | 'completed' | 'cancelled';

export interface IBounty extends Document {
  guildId: string;
  bountyId: string;
  creatorId: string;
  creatorTag: string;
  title: string;
  description: string;
  reward: number;
  category: BountyCategory;
  status: BountyStatus;
  claimedBy?: string;
  claimedByTag?: string;
  claimedAt?: Date;
  submission?: string;
  submittedAt?: Date;
  completedAt?: Date;
  channelId?: string;
  messageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BountySchema = new Schema<IBounty>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    bountyId: {
      type: String,
      required: true,
      unique: true,
    },
    creatorId: {
      type: String,
      required: true,
      index: true,
    },
    creatorTag: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 256,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2048,
    },
    reward: {
      type: Number,
      required: true,
      min: 10,
    },
    category: {
      type: String,
      enum: ['dev', 'design', 'gaming', 'general'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['open', 'claimed', 'completed', 'cancelled'],
      default: 'open',
    },
    claimedBy: {
      type: String,
      required: false,
    },
    claimedByTag: {
      type: String,
      required: false,
    },
    claimedAt: {
      type: Date,
      required: false,
    },
    submission: {
      type: String,
      required: false,
      maxlength: 2048,
    },
    submittedAt: {
      type: Date,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
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

BountySchema.index({ guildId: 1, status: 1 });
BountySchema.index({ bountyId: 1 }, { unique: true });

export const Bounty: Model<IBounty> =
  mongoose.models.Bounty ?? mongoose.model<IBounty>('Bounty', BountySchema);
