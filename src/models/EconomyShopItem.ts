/**
 * src/models/EconomyShopItem.ts
 * MongoDB model storing server shop items purchasable with economy coins.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type ShopItemType = 'role' | 'badge' | 'custom';

export interface IEconomyShopItem extends Document {
  guildId: string;
  itemId: string;
  name: string;
  description: string;
  price: number;
  type: ShopItemType;
  roleId?: string;
  stock?: number;
  createdAt: Date;
  updatedAt: Date;
}

const EconomyShopItemSchema = new Schema<IEconomyShopItem>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    itemId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ['role', 'badge', 'custom'],
      default: 'custom',
    },
    roleId: {
      type: String,
    },
    stock: {
      type: Number,
      default: -1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound unique index ensuring item IDs are unique per guild
EconomyShopItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });

export const EconomyShopItem: Model<IEconomyShopItem> =
  mongoose.models.EconomyShopItem ??
  mongoose.model<IEconomyShopItem>('EconomyShopItem', EconomyShopItemSchema);
