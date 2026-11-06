/**
 * src/models/LevelConfig.ts
 * MongoDB model storing per-guild level progression configuration, role rewards,
 * announcement channels, and ignore filters.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILevelReward {
  level: number;
  roleId: string;
  roleName: string;
}

export interface ILevelConfig extends Document {
  guildId: string;
  levelRewards: ILevelReward[];
  announcementChannelId?: string;
  dmNotifications?: boolean;
  announcementTemplate?: string;
  ignoredChannels?: string[];
  ignoredRoles?: string[];
  xpMultiplier?: number;
  createdAt: Date;
  updatedAt: Date;
}

const LevelRewardSchema = new Schema<ILevelReward>(
  {
    level: {
      type: Number,
      required: true,
    },
    roleId: {
      type: String,
      required: true,
    },
    roleName: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const LevelConfigSchema = new Schema<ILevelConfig>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    levelRewards: {
      type: [LevelRewardSchema],
      default: [],
    },
    announcementChannelId: {
      type: String,
    },
    dmNotifications: {
      type: Boolean,
      default: false,
    },
    announcementTemplate: {
      type: String,
    },
    ignoredChannels: {
      type: [String],
      default: [],
    },
    ignoredRoles: {
      type: [String],
      default: [],
    },
    xpMultiplier: {
      type: Number,
      default: 1.0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const LevelConfig: Model<ILevelConfig> =
  mongoose.models.LevelConfig ??
  mongoose.model<ILevelConfig>('LevelConfig', LevelConfigSchema);
