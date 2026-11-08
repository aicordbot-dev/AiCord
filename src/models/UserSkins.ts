/**
 * src/models/UserSkins.ts
 * MongoDB model storing unlocked and equipped cosmetic skins per user per guild.
 *
 * Implements:
 * - IUserSkins interface
 * - Default equippedSkin: 'neon_blue'
 * - Default unlockedSkins: ['neon_blue']
 * - Default totalLootboxesOpened: 0
 * - Compound unique index on { guildId: 1, userId: 1 }
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserSkins extends Document {
  guildId: string;
  userId: string;
  unlockedSkins: string[];
  equippedSkin: string;
  totalLootboxesOpened: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSkinsSchema = new Schema<IUserSkins>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    unlockedSkins: {
      type: [String],
      default: ['neon_blue'],
    },
    equippedSkin: {
      type: String,
      default: 'neon_blue',
    },
    totalLootboxesOpened: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound unique index ensuring one skin wardrobe record per user per guild
UserSkinsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const UserSkins: Model<IUserSkins> =
  mongoose.models.UserSkins ??
  mongoose.model<IUserSkins>('UserSkins', UserSkinsSchema);
