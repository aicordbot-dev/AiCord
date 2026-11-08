/**
 * src/models/ModmailConfig.ts
 * MongoDB model storing per-guild Anonymous Modmail Relay configuration.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICannedResponse {
  name: string;
  content: string;
}

export interface IModmailConfig extends Document {
  guildId: string;
  categoryId?: string;
  staffRoleIds: string[];
  logChannelId?: string;
  cannedResponses: ICannedResponse[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CannedResponseSchema = new Schema<ICannedResponse>(
  {
    name: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false },
);

const ModmailConfigSchema = new Schema<IModmailConfig>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    categoryId: {
      type: String,
    },
    staffRoleIds: {
      type: [String],
      default: [],
    },
    logChannelId: {
      type: String,
    },
    cannedResponses: {
      type: [CannedResponseSchema],
      default: [],
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

export const ModmailConfig: Model<IModmailConfig> =
  mongoose.models.ModmailConfig ??
  mongoose.model<IModmailConfig>('ModmailConfig', ModmailConfigSchema);
