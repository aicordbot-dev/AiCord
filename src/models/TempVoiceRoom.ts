/**
 * src/models/TempVoiceRoom.ts
 * MongoDB model storing active Dynamic Temporary Voice Rooms spawned via Join-to-Create.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITempVoiceRoom extends Document {
  guildId: string;
  channelId: string;
  ownerId: string;
  ownerTag: string;
  isLocked: boolean;
  userLimit: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const TempVoiceRoomSchema = new Schema<ITempVoiceRoom>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    ownerTag: {
      type: String,
      default: 'Member',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    userLimit: {
      type: Number,
      default: 0,
    },
    name: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

TempVoiceRoomSchema.index({ guildId: 1, ownerId: 1 });

export const TempVoiceRoom: Model<ITempVoiceRoom> =
  mongoose.models.TempVoiceRoom ||
  mongoose.model<ITempVoiceRoom>('TempVoiceRoom', TempVoiceRoomSchema);
