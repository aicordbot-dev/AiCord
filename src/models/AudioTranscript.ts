/**
 * src/models/AudioTranscript.ts
 * MongoDB model storing AI audio transcriptions, voice note summaries, action items, and sentiment analysis.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type TranscriptFormat = 'full' | 'summary' | 'action_items' | 'bullet_points';

export interface IAudioTranscript extends Document {
  guildId: string;
  userId: string;
  audioUrl: string;
  format: TranscriptFormat;
  transcript: string;
  summary: string;
  actionItems: string[];
  sentiment: string;
  wordCount: number;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AudioTranscriptSchema = new Schema<IAudioTranscript>(
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
    audioUrl: {
      type: String,
      required: true,
      trim: true,
    },
    format: {
      type: String,
      enum: ['full', 'summary', 'action_items', 'bullet_points'],
      default: 'summary',
    },
    transcript: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    actionItems: {
      type: [String],
      default: [],
    },
    sentiment: {
      type: String,
      default: 'neutral',
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

AudioTranscriptSchema.index({ guildId: 1, createdAt: -1 });
AudioTranscriptSchema.index({ guildId: 1, userId: 1, createdAt: -1 });

export const AudioTranscript: Model<IAudioTranscript> =
  mongoose.models.AudioTranscript ||
  mongoose.model<IAudioTranscript>('AudioTranscript', AudioTranscriptSchema);
