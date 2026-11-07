/**
 * src/models/GuildSubscription.ts
 * Server-Wide Subscription & Entitlement Model for AiCord.
 *
 * Tracks subscription tier (Free, Pro, Ultimate, Lifetime), license keys,
 * active feature limits, custom branding, and expiration timestamps.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type SubscriptionTier = 'free' | 'pro' | 'ultimate' | 'lifetime';

export interface GuildFeatures {
  maxBuildsPerMonth: number;
  maxTickets: number;
  maxShopItems: number;
  unlockedThemes: string[];
  hasWhatsAppBridge: boolean;
  has247Radio: boolean;
  hasBossRaids: boolean;
  hasServerBackups: boolean;
  hasAiTldr: boolean;
}

export interface CustomBranding {
  botNickname?: string;
  embedColor?: number;
  footerText?: string;
}

export interface IGuildSubscription extends Document {
  guildId: string;
  tier: SubscriptionTier;
  licenseKey?: string;
  ownerId: string;
  activatedAt: Date;
  expiresAt?: Date | null;
  features: GuildFeatures;
  customBranding?: CustomBranding;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_FREE_FEATURES: GuildFeatures = {
  maxBuildsPerMonth: 3,
  maxTickets: 3,
  maxShopItems: 10,
  unlockedThemes: ['cyberpunk', 'frost'],
  hasWhatsAppBridge: false,
  has247Radio: false,
  hasBossRaids: false,
  hasServerBackups: false,
  hasAiTldr: false,
};

const GuildFeaturesSchema = new Schema<GuildFeatures>(
  {
    maxBuildsPerMonth: { type: Number, default: 3 },
    maxTickets: { type: Number, default: 3 },
    maxShopItems: { type: Number, default: 10 },
    unlockedThemes: { type: [String], default: ['cyberpunk', 'frost'] },
    hasWhatsAppBridge: { type: Boolean, default: false },
    has247Radio: { type: Boolean, default: false },
    hasBossRaids: { type: Boolean, default: false },
    hasServerBackups: { type: Boolean, default: false },
    hasAiTldr: { type: Boolean, default: false },
  },
  { _id: false },
);

const CustomBrandingSchema = new Schema<CustomBranding>(
  {
    botNickname: { type: String },
    embedColor: { type: Number },
    footerText: { type: String },
  },
  { _id: false },
);

const GuildSubscriptionSchema = new Schema<IGuildSubscription>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'ultimate', 'lifetime'],
      default: 'free',
      index: true,
    },
    licenseKey: {
      type: String,
      sparse: true,
    },
    ownerId: {
      type: String,
      default: '',
    },
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    features: {
      type: GuildFeaturesSchema,
      default: () => ({ ...DEFAULT_FREE_FEATURES }),
    },
    customBranding: {
      type: CustomBrandingSchema,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const GuildSubscription: Model<IGuildSubscription> =
  mongoose.models.GuildSubscription ??
  mongoose.model<IGuildSubscription>('GuildSubscription', GuildSubscriptionSchema);
