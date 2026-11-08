/**
 * src/models/ServerPet.ts
 * MongoDB model storing Virtual Server Pet Companions and Tamagotchi Habitat state.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type PetSpecies = 'shiba' | 'dragon' | 'cat' | 'owl' | 'slime';

export interface IPetStats {
  strength: number;
  agility: number;
  intelligence: number;
}

export interface IServerPet extends Document {
  guildId: string;
  userId: string;
  name: string;
  species: PetSpecies;
  level: number;
  xp: number;
  hunger: number;
  happiness: number;
  energy: number;
  stats: IPetStats;
  battlesWon: number;
  battlesLost: number;
  accessory?: string;
  lastInteractedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ServerPetSchema = new Schema<IServerPet>(
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
      required: true,
      trim: true,
    },
    species: {
      type: String,
      required: true,
      enum: ['shiba', 'dragon', 'cat', 'owl', 'slime'],
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
    hunger: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    happiness: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    energy: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    stats: {
      strength: {
        type: Number,
        default: 10,
      },
      agility: {
        type: Number,
        default: 10,
      },
      intelligence: {
        type: Number,
        default: 10,
      },
    },
    battlesWon: {
      type: Number,
      default: 0,
    },
    battlesLost: {
      type: Number,
      default: 0,
    },
    accessory: {
      type: String,
      required: false,
    },
    lastInteractedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ServerPetSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const ServerPet: Model<IServerPet> =
  mongoose.models.ServerPet ||
  mongoose.model<IServerPet>('ServerPet', ServerPetSchema);
