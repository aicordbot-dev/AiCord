/**
 * src/models/BirthdayConfig.ts
 * MongoDB model storing per-guild birthday announcement and celebration settings.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBirthdayConfig extends Document {
  guildId: string;
  enabled: boolean;
  channelId?: string;
  roleId?: string;
  message?: string;
  pingRole?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BirthdayConfigSchema = new Schema<IBirthdayConfig>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    channelId: {
      type: String,
    },
    roleId: {
      type: String,
    },
    message: {
      type: String,
    },
    pingRole: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const BirthdayConfig: Model<IBirthdayConfig> =
  mongoose.models.BirthdayConfig ??
  mongoose.model<IBirthdayConfig>('BirthdayConfig', BirthdayConfigSchema);
