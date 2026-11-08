/**
 * src/models/GitSubscription.ts
 * MongoDB model storing GitHub and GitLab repository webhook feeds and AI PR subscriptions.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type GitProvider = 'github' | 'gitlab';

export interface IGitSubscription extends Document {
  guildId: string;
  subscriptionId: string;
  repoUrl: string;
  repoName: string;
  provider: GitProvider;
  channelId: string;
  events: string[];
  aiExplain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GitSubscriptionSchema = new Schema<IGitSubscription>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    repoName: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['github', 'gitlab'],
      default: 'github',
    },
    channelId: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      default: ['push', 'pull_request', 'issues'],
    },
    aiExplain: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

GitSubscriptionSchema.index({ guildId: 1, repoName: 1 });
GitSubscriptionSchema.index({ guildId: 1, channelId: 1 });

export const GitSubscription: Model<IGitSubscription> =
  mongoose.models.GitSubscription ||
  mongoose.model<IGitSubscription>('GitSubscription', GitSubscriptionSchema);
