/**
 * src/models/AdventurePlayer.ts
 * MongoDB model storing per-guild player progression, inventory, and active dungeon state
 * for the Gemini AI Dynamic RPG (/adventure) engine.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type AdventureClass = 'warrior' | 'mage' | 'rogue' | 'cleric' | 'ranger';
export type AdventureItemType = 'weapon' | 'armor' | 'potion' | 'relic';

export interface AdventureItem {
  id: string;
  name: string;
  type: AdventureItemType;
  power: number;
}

export interface AdventureDungeonState {
  active: boolean;
  floor: number;
  encounterCount: number;
  currentScenario: string;
  choices: string[];
  lastOutcome?: string;
}

export interface IAdventurePlayer extends Document {
  guildId: string;
  userId: string;
  name: string;
  class: AdventureClass;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  gold: number;
  inventory: AdventureItem[];
  dungeon: AdventureDungeonState;
  monstersDefeated: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdventureItemSchema = new Schema<AdventureItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['weapon', 'armor', 'potion', 'relic'],
      required: true,
    },
    power: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const AdventureDungeonSchema = new Schema<AdventureDungeonState>(
  {
    active: { type: Boolean, default: false },
    floor: { type: Number, default: 1 },
    encounterCount: { type: Number, default: 0 },
    currentScenario: { type: String, default: '' },
    choices: { type: [String], default: [] },
    lastOutcome: { type: String, required: false },
  },
  { _id: false },
);

const AdventurePlayerSchema = new Schema<IAdventurePlayer>(
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
    name: {
      type: String,
      default: 'Adventurer',
    },
    class: {
      type: String,
      enum: ['warrior', 'mage', 'rogue', 'cleric', 'ranger'],
      default: 'warrior',
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    hp: {
      type: Number,
      default: 100,
    },
    maxHp: {
      type: Number,
      default: 100,
      min: 1,
    },
    gold: {
      type: Number,
      default: 50,
      min: 0,
    },
    inventory: {
      type: [AdventureItemSchema],
      default: [],
    },
    dungeon: {
      type: AdventureDungeonSchema,
      default: () => ({
        active: false,
        floor: 1,
        encounterCount: 0,
        currentScenario: '',
        choices: [],
      }),
    },
    monstersDefeated: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound unique index ensuring one adventurer profile per user per server
AdventurePlayerSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const AdventurePlayer: Model<IAdventurePlayer> =
  mongoose.models.AdventurePlayer ??
  mongoose.model<IAdventurePlayer>('AdventurePlayer', AdventurePlayerSchema);
