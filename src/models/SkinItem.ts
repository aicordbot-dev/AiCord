/**
 * src/models/SkinItem.ts
 * MongoDB model and TypeScript interface for collectible cosmetic skin items.
 *
 * Implements:
 * - ISkinItem interface with skinId, name, description, rarity, type, price, previewHex, badgeEmoji, isAnimated
 * - SkinRarity & SkinType union types
 * - Mongoose Schema & Model with unique skinId index
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type SkinType = 'theme' | 'card_frame' | 'badge' | 'title';

export interface ISkinItem {
  skinId: string;
  name: string;
  description: string;
  rarity: SkinRarity;
  type: SkinType;
  price: number;
  previewHex: string;
  badgeEmoji: string;
  isAnimated: boolean;
}

export interface ISkinItemDocument extends ISkinItem, Document {
  createdAt: Date;
  updatedAt: Date;
}

const SkinItemSchema = new Schema<ISkinItemDocument>(
  {
    skinId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary', 'mythic'],
      required: true,
    },
    type: {
      type: String,
      enum: ['theme', 'card_frame', 'badge', 'title'],
      default: 'card_frame',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    previewHex: {
      type: String,
      required: true,
    },
    badgeEmoji: {
      type: String,
      required: true,
    },
    isAnimated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const SkinItem: Model<ISkinItemDocument> =
  mongoose.models.SkinItem ??
  mongoose.model<ISkinItemDocument>('SkinItem', SkinItemSchema);
