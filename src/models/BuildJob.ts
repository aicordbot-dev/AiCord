/**
 * src/models/BuildJob.ts
 * Tracks AI server build jobs — status, progress, and created IDs for rollback.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type BuildJobStatus =
  | 'pending'
  | 'preview'
  | 'confirmed'
  | 'running'
  | 'done'
  | 'failed'
  | 'rolled_back'
  | 'cancelled';

export interface CreatedIds {
  roles: string[];
  categories: string[];
  channels: string[];
  messages: Array<{ channelId: string; messageId: string }>;
}

export interface BuildStep {
  label: string;
  status: 'pending' | 'done' | 'failed';
  error?: string;
}

export interface IBuildJob extends Document {
  guildId: string;
  userId: string;
  interactionToken: string;
  channelId: string;
  status: BuildJobStatus;
  description: string;
  blueprint?: unknown; // Zod-validated blueprint stored as plain object
  steps: BuildStep[];
  createdIds: CreatedIds;
  errorMessage?: string;
  attempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BuildJobSchema = new Schema<IBuildJob>(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    interactionToken: { type: String, required: true },
    channelId: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'pending',
        'preview',
        'confirmed',
        'running',
        'done',
        'failed',
        'rolled_back',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    description: { type: String, required: true, maxlength: 500 },
    blueprint: { type: Schema.Types.Mixed },
    steps: [
      {
        label: String,
        status: { type: String, enum: ['pending', 'done', 'failed'] },
        error: String,
      },
    ],
    createdIds: {
      roles: { type: [String], default: [] },
      categories: { type: [String], default: [] },
      channels: { type: [String], default: [] },
      messages: [{ channelId: String, messageId: String }],
    },
    errorMessage: String,
    attempts: { type: Number, default: 0 },
    lockedUntil: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index for the job processor query
BuildJobSchema.index({ status: 1, lockedUntil: 1, createdAt: 1 });

export const BuildJob: Model<IBuildJob> =
  mongoose.models.BuildJob ??
  mongoose.model<IBuildJob>('BuildJob', BuildJobSchema);
