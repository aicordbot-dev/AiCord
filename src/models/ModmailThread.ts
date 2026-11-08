/**
 * src/models/ModmailThread.ts
 * MongoDB model storing active and archived modmail threads and conversation history.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type ModmailStatus = 'open' | 'closed';

export interface IModmailMessage {
  id: string;
  authorId: string;
  authorTag: string;
  isStaff: boolean;
  anonymous: boolean;
  content: string;
  attachments: string[];
  timestamp: Date;
}

export interface IModmailThread extends Document {
  guildId: string;
  threadId: string;
  channelId: string;
  recipientId: string;
  recipientTag: string;
  status: ModmailStatus;
  category: string;
  messages: IModmailMessage[];
  openedAt: Date;
  closedAt?: Date;
  closedBy?: string;
  closeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ModmailMessageSchema = new Schema<IModmailMessage>(
  {
    id: { type: String, required: true },
    authorId: { type: String, required: true },
    authorTag: { type: String, default: 'Member' },
    isStaff: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
    content: { type: String, default: '' },
    attachments: { type: [String], default: [] },
    timestamp: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const ModmailThreadSchema = new Schema<IModmailThread>(
  {
    guildId: { type: String, required: true, index: true },
    threadId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    recipientTag: { type: String, default: 'Member' },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    category: { type: String, default: 'general' },
    messages: {
      type: [ModmailMessageSchema],
      default: [],
    },
    openedAt: { type: Date, default: () => new Date() },
    closedAt: { type: Date },
    closedBy: { type: String },
    closeReason: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ModmailThreadSchema.index({ guildId: 1, recipientId: 1, status: 1 });

export const ModmailThread: Model<IModmailThread> =
  mongoose.models.ModmailThread ??
  mongoose.model<IModmailThread>('ModmailThread', ModmailThreadSchema);
