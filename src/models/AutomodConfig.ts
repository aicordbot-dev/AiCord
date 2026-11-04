/**
 * src/models/AutomodConfig.ts
 * Per-guild automod configuration.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAutomodConfig extends Document {
  guildId: string;
  enabled: boolean;
  logChannelId?: string;
  exemptRoleIds: string[];
  exemptChannelIds: string[];
  // Individual rule toggles
  antiSpam: boolean;
  antiInvite: boolean;
  antiLinks: boolean;
  antiBannedWords: boolean;
  antiMassMention: boolean;
  antiCaps: boolean;
  antiFakeNitro: boolean;
  bannedWords: string[];
  bannedLinks: string[];
  allowedInvites: string[]; // Guild IDs whose invites are allowed
  spamThreshold: number; // Messages per 5 seconds
  massMentionThreshold: number;
  capsPercentage: number; // 0-100
  escalation: {
    warnsBeforeTimeout: number;
    warnsBeforeBan: number;
    timeoutDuration: number; // seconds
  };
  aiModerationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AutomodConfigSchema = new Schema<IAutomodConfig>(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: false },
    logChannelId: String,
    exemptRoleIds: { type: [String], default: [] },
    exemptChannelIds: { type: [String], default: [] },
    antiSpam: { type: Boolean, default: true },
    antiInvite: { type: Boolean, default: false },
    antiLinks: { type: Boolean, default: false },
    antiBannedWords: { type: Boolean, default: false },
    antiMassMention: { type: Boolean, default: true },
    antiCaps: { type: Boolean, default: false },
    antiFakeNitro: { type: Boolean, default: true },
    bannedWords: { type: [String], default: [] },
    bannedLinks: { type: [String], default: [] },
    allowedInvites: { type: [String], default: [] },
    spamThreshold: { type: Number, default: 5 },
    massMentionThreshold: { type: Number, default: 5 },
    capsPercentage: { type: Number, default: 70 },
    escalation: {
      warnsBeforeTimeout: { type: Number, default: 3 },
      warnsBeforeBan: { type: Number, default: 5 },
      timeoutDuration: { type: Number, default: 600 },
    },
    aiModerationEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const AutomodConfig: Model<IAutomodConfig> =
  mongoose.models.AutomodConfig ??
  mongoose.model<IAutomodConfig>('AutomodConfig', AutomodConfigSchema);
