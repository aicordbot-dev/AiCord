/**
 * src/models/ClipSubmission.ts
 * MongoDB model storing community gaming clip submissions, interactive ratings, and weekly contest entries.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClipVotes {
  fire: string[];   // userIds who voted fire
  smart: string[];  // userIds who voted 200 IQ
  fail: string[];   // userIds who voted funny fail
}

export interface IClipSubmission extends Document {
  guildId: string;
  clipId: string;
  userId: string;
  userTag: string;
  title: string;
  game: string;
  clipUrl: string;
  votes: IClipVotes;
  totalScore: number;
  week: string;
  isWinner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClipSubmissionSchema = new Schema<IClipSubmission>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    clipId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userTag: {
      type: String,
      default: 'Member',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    game: {
      type: String,
      default: 'General',
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    clipUrl: {
      type: String,
      required: true,
      trim: true,
    },
    votes: {
      fire: {
        type: [String],
        default: [],
      },
      smart: {
        type: [String],
        default: [],
      },
      fail: {
        type: [String],
        default: [],
      },
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    week: {
      type: String,
      required: true,
    },
    isWinner: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index on { guildId: 1, week: 1, totalScore: -1 } for fast weekly leaderboard queries
ClipSubmissionSchema.index({ guildId: 1, week: 1, totalScore: -1 });

export const ClipSubmission: Model<IClipSubmission> =
  mongoose.models.ClipSubmission ||
  mongoose.model<IClipSubmission>('ClipSubmission', ClipSubmissionSchema);
