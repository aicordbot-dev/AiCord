/**
 * src/models/RadioSession.ts
 * MongoDB model storing active 24/7 Voice Radio streaming sessions for AiCord servers.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type RadioStationId =
  | 'lofi'
  | 'synthwave'
  | 'retro'
  | 'jazz'
  | 'chill'
  | 'classical';

export type RadioStatus = 'playing' | 'paused' | 'stopped';

export interface IRadioTrack {
  title: string;
  artist: string;
  duration: string;
  streamUrl: string;
}

export interface IRadioSession extends Document {
  guildId: string;
  channelId: string;
  station: RadioStationId;
  status: RadioStatus;
  volume: number;
  currentTrack: IRadioTrack;
  startedAt: Date;
  startedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CurrentTrackSchema = new Schema<IRadioTrack>(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    duration: { type: String, default: 'LIVE' },
    streamUrl: { type: String, required: true },
  },
  { _id: false },
);

const RadioSessionSchema = new Schema<IRadioSession>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    station: {
      type: String,
      enum: ['lofi', 'synthwave', 'retro', 'jazz', 'chill', 'classical'],
      default: 'lofi',
    },
    status: {
      type: String,
      enum: ['playing', 'paused', 'stopped'],
      default: 'playing',
    },
    volume: {
      type: Number,
      default: 80,
      min: 1,
      max: 100,
    },
    currentTrack: {
      type: CurrentTrackSchema,
      required: true,
    },
    startedAt: {
      type: Date,
      default: () => new Date(),
    },
    startedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const RadioSession: Model<IRadioSession> =
  mongoose.models.RadioSession ??
  mongoose.model<IRadioSession>('RadioSession', RadioSessionSchema);
