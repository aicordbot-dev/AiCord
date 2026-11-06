/**
 * src/models/EconomyUser.ts
 * MongoDB model storing per-guild user economy balances, daily streak, cooldowns, and inventory.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEconomyInventoryItem {
  itemId: string;
  name: string;
  roleId?: string;
  price: number;
  purchasedAt: Date;
}

export interface IEconomyUser extends Document {
  guildId: string;
  userId: string;
  wallet: number;
  bank: number;
  bankCapacity: number;
  dailyStreak: number;
  lastDailyAt?: Date;
  lastWorkAt?: Date;
  lastCrimeAt?: Date;
  inventory: IEconomyInventoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const EconomyInventoryItemSchema = new Schema<IEconomyInventoryItem>(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    roleId: { type: String },
    price: { type: Number, required: true },
    purchasedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const EconomyUserSchema = new Schema<IEconomyUser>(
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
    wallet: {
      type: Number,
      default: 0,
      min: 0,
    },
    bank: {
      type: Number,
      default: 0,
      min: 0,
    },
    bankCapacity: {
      type: Number,
      default: 5000,
    },
    dailyStreak: {
      type: Number,
      default: 0,
    },
    lastDailyAt: {
      type: Date,
    },
    lastWorkAt: {
      type: Date,
    },
    lastCrimeAt: {
      type: Date,
    },
    inventory: {
      type: [EconomyInventoryItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound unique index ensuring one economy record per user per guild
EconomyUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Compound index for wealth leaderboard queries
EconomyUserSchema.index({ guildId: 1, wallet: -1, bank: -1 });

export const EconomyUser: Model<IEconomyUser> =
  mongoose.models.EconomyUser ??
  mongoose.model<IEconomyUser>('EconomyUser', EconomyUserSchema);
