/**
 * src/models/Ticket.ts
 * Interactive Ticket Hub Ticket Model for AiCord.
 *
 * Tracks individual support tickets, lifecycles (open, claimed, closed),
 * staff assignments, transcripts, and 5-star CSAT customer ratings.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type TicketStatus = 'open' | 'claimed' | 'closed';

export interface ITicket extends Document {
  guildId: string;
  ticketId: string;
  channelId: string;
  userId: string;
  panelId?: string;
  category: string;
  status: TicketStatus;
  claimedBy?: string;
  claimedAt?: Date;
  closedBy?: string;
  closedAt?: Date;
  closeReason?: string;
  rating?: number;
  transcript?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    guildId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    panelId: { type: String },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'claimed', 'closed'],
      default: 'open',
      index: true,
    },
    claimedBy: { type: String },
    claimedAt: { type: Date },
    closedBy: { type: String },
    closedAt: { type: Date },
    closeReason: { type: String, maxlength: 1024 },
    rating: { type: Number, min: 1, max: 5 },
    transcript: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Ticket: Model<ITicket> =
  mongoose.models.Ticket ??
  mongoose.model<ITicket>('Ticket', TicketSchema);
