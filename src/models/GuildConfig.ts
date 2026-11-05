/**
 * src/models/GuildConfig.ts
 * Per-guild configuration document.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGuildConfig extends Document {
  guildId: string;
  prefix: string;
  language: string;
  modLogChannelId?: string;
  welcomeChannelId?: string;
  welcomeMessage?: string;
  goodbyeChannelId?: string;
  goodbyeMessage?: string;
  autoRoleIds: string[];
  timezone: string;
  aiModEnabled: boolean;
  features: Record<string, boolean>; // Module toggle map
  disabledCommands?: string[]; // Disabled slash command names
  createdAt: Date;
  updatedAt: Date;
}

const GuildConfigSchema = new Schema<IGuildConfig>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prefix: {
      type: String,
      default: '!',
      maxlength: 5,
    },
    language: {
      type: String,
      default: 'en',
    },
    modLogChannelId: String,
    welcomeChannelId: String,
    welcomeMessage: String,
    goodbyeChannelId: String,
    goodbyeMessage: String,
    autoRoleIds: {
      type: [String],
      default: [],
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    aiModEnabled: {
      type: Boolean,
      default: false,
    },
    features: {
      type: Map,
      of: Boolean,
      default: {},
    },
    disabledCommands: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const GuildConfig: Model<IGuildConfig> =
  mongoose.models.GuildConfig ??
  mongoose.model<IGuildConfig>('GuildConfig', GuildConfigSchema);
