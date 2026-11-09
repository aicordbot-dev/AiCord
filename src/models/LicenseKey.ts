/**
 * src/models/LicenseKey.ts
 * Model for generated AiCord license keys awaiting redemption or redeemed via /premium redeem.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { SubscriptionTier } from './GuildSubscription';

export interface ILicenseKey extends Document {
  key: string;
  tier: SubscriptionTier;
  durationDays?: number;
  userId?: string;
  customerEmail?: string;
  stripeSessionId?: string;
  isRedeemed: boolean;
  redeemedByGuildId?: string;
  redeemedByUserId?: string;
  redeemedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LicenseKeySchema = new Schema<ILicenseKey>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['pro', 'ultimate', 'lifetime'],
      required: true,
    },
    durationDays: {
      type: Number,
      default: 0,
    },
    userId: {
      type: String,
      default: '',
      index: true,
    },
    customerEmail: {
      type: String,
      default: '',
    },
    stripeSessionId: {
      type: String,
      sparse: true,
      index: true,
    },
    isRedeemed: {
      type: Boolean,
      default: false,
      index: true,
    },
    redeemedByGuildId: {
      type: String,
    },
    redeemedByUserId: {
      type: String,
    },
    redeemedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const LicenseKey: Model<ILicenseKey> =
  mongoose.models.LicenseKey ?? mongoose.model<ILicenseKey>('LicenseKey', LicenseKeySchema);
