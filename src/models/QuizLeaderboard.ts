/**
 * src/models/QuizLeaderboard.ts
 * MongoDB model storing persistent server trivia leaderboard statistics.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuizLeaderboard extends Document {
  guildId: string;
  userId: string;
  userTag: string;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuizLeaderboardSchema = new Schema<IQuizLeaderboard>(
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
    userTag: {
      type: String,
      required: true,
      default: 'Player',
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    gamesWon: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

QuizLeaderboardSchema.index({ guildId: 1, userId: 1 }, { unique: true });
QuizLeaderboardSchema.index({ guildId: 1, totalScore: -1, gamesWon: -1 });

export const QuizLeaderboard: Model<IQuizLeaderboard> =
  mongoose.models.QuizLeaderboard ||
  mongoose.model<IQuizLeaderboard>('QuizLeaderboard', QuizLeaderboardSchema);
