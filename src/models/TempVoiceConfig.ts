/**
 * src/models/TempVoiceConfig.ts
 * MongoDB model storing per-guild Dynamic Temporary Auto-Voice ("Join-to-Create") configuration.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITempVoiceConfig extends Document {
  guildId: string;
  hubChannelId: string;
  categoryId?: string;
  defaultLimit: number;
  namingScheme: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TempVoiceConfigSchema = new Schema<ITempVoiceConfig>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    hubChannelId: {
      type: String,
      required: true,
    },
    categoryId: {
      type: String,
    },
    defaultLimit: {
      type: Number,
      default: 0,
    },
    namingScheme: {
      type: String,
      default: "{username}'s Lounge",
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const TempVoiceConfig: Model<ITempVoiceConfig> =
  mongoose.models.TempVoiceConfig ||
  mongoose.model<ITempVoiceConfig>('TempVoiceConfig', TempVoiceConfigSchema);
