/**
 * src/models/Job.ts
 * MongoDB model for asynchronous background jobs and tasks.
 * Supports atomic claiming, automatic retry with exponential backoff, and dead-letter queue.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';

export interface IJob extends Document {
  type: string;
  guildId?: string;
  runAt: Date;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  lockedUntil?: Date;
  status: JobStatus;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    type: { type: String, required: true, index: true },
    guildId: { type: String, index: true, sparse: true },
    runAt: { type: Date, required: true, default: Date.now },
    payload: { type: Schema.Types.Mixed, default: () => ({}) },
    attempts: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true, default: 5 },
    lockedUntil: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'dead_letter'],
      default: 'pending',
      required: true,
      index: true,
    },
    lastError: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// High-performance compound indexes for atomic polling and guild query filtering
JobSchema.index({ status: 1, runAt: 1, lockedUntil: 1 });
JobSchema.index({ guildId: 1, type: 1 });

export const Job: Model<IJob> =
  mongoose.models.Job ?? mongoose.model<IJob>('Job', JobSchema);
