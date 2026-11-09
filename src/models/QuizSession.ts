/**
 * src/models/QuizSession.ts
 * MongoDB model storing live multiplayer Kahoot-style quiz show sessions.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuizStatus = 'waiting' | 'in_progress' | 'ended';

export interface IQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}

export interface IQuizScore {
  userId: string;
  userTag: string;
  score: number;
}

export interface IQuizRoundAnswer {
  round: number;
  userId: string;
  userTag: string;
  choice: number;
  isCorrect: boolean;
  points: number;
  answeredAt: Date;
}

export interface IQuizSession extends Document {
  guildId: string;
  sessionId: string;
  channelId: string;
  hostId: string;
  category: string;
  rounds: number;
  currentRound: number;
  status: QuizStatus;
  questions: IQuizQuestion[];
  scores: IQuizScore[];
  roundAnswers: IQuizRoundAnswer[];
  roundStartedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    category: { type: String, required: true },
  },
  { _id: false },
);

const QuizScoreSchema = new Schema<IQuizScore>(
  {
    userId: { type: String, required: true },
    userTag: { type: String, required: true },
    score: { type: Number, default: 0 },
  },
  { _id: false },
);

const QuizRoundAnswerSchema = new Schema<IQuizRoundAnswer>(
  {
    round: { type: Number, required: true },
    userId: { type: String, required: true },
    userTag: { type: String, required: true },
    choice: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    points: { type: Number, default: 0 },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const QuizSessionSchema = new Schema<IQuizSession>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      index: true,
    },
    hostId: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'general',
    },
    rounds: {
      type: Number,
      default: 5,
    },
    currentRound: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['waiting', 'in_progress', 'ended'],
      default: 'waiting',
    },
    questions: {
      type: [QuizQuestionSchema],
      default: [],
    },
    scores: {
      type: [QuizScoreSchema],
      default: [],
    },
    roundAnswers: {
      type: [QuizRoundAnswerSchema],
      default: [],
    },
    roundStartedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

QuizSessionSchema.index({ guildId: 1, channelId: 1, status: 1 });

export const QuizSession: Model<IQuizSession> =
  mongoose.models.QuizSession ||
  mongoose.model<IQuizSession>('QuizSession', QuizSessionSchema);
