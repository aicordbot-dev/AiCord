/**
 * src/models/TicketPanel.ts
 * Ticket Hub Panel configuration model for AiCord.
 *
 * Defines interactive ticket creation panels with category buttons/select menus,
 * support role permissions, channel routing, and naming schemes.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface TicketPanelCategory {
  id: string;
  label: string;
  emoji?: string;
  description?: string;
}

export interface ITicketPanel extends Document {
  guildId: string;
  panelId: string;
  channelId: string;
  messageId?: string;
  title: string;
  description: string;
  categories: TicketPanelCategory[];
  supportRoleIds: string[];
  logChannelId?: string;
  categoryId?: string;
  namingScheme: string;
  createdAt: Date;
  updatedAt: Date;
}

const TicketPanelCategorySchema = new Schema<TicketPanelCategory>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, maxlength: 80 },
    emoji: { type: String },
    description: { type: String, maxlength: 100 },
  },
  { _id: false },
);

const TicketPanelSchema = new Schema<ITicketPanel>(
  {
    guildId: { type: String, required: true, index: true },
    panelId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String },
    title: { type: String, required: true, maxlength: 256 },
    description: { type: String, required: true, maxlength: 4096 },
    categories: { type: [TicketPanelCategorySchema], default: [] },
    supportRoleIds: { type: [String], default: [] },
    logChannelId: { type: String },
    categoryId: { type: String },
    namingScheme: { type: String, default: 'ticket-{number}' },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const TicketPanel: Model<ITicketPanel> =
  mongoose.models.TicketPanel ??
  mongoose.model<ITicketPanel>('TicketPanel', TicketPanelSchema);
