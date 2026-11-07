/**
 * src/models/RolePanel.ts
 * Button/select-menu role self-assignment panels.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type RolePanelMode = 'normal' | 'unique' | 'verify' | 'drop';

export interface RolePanelEntry {
  roleId: string;
  label: string;
  emoji?: string;
  description?: string;
}

export interface IRolePanel extends Document {
  guildId: string;
  channelId?: string;
  messageId?: string;
  title: string;
  description?: string;
  color?: number;
  mode: RolePanelMode;
  style: 'buttons' | 'select';
  entries: RolePanelEntry[];
  maxRoles?: number;
  requiredRoleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RolePanelSchema = new Schema<IRolePanel>(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: false },
    messageId: String,
    title: { type: String, required: true, maxlength: 256 },
    description: { type: String, maxlength: 4096 },
    color: Number,
    mode: {
      type: String,
      enum: ['normal', 'unique', 'verify', 'drop'],
      default: 'normal',
    },
    style: {
      type: String,
      enum: ['buttons', 'select'],
      default: 'buttons',
    },
    entries: [
      {
        roleId: { type: String, required: true },
        label: { type: String, required: true, maxlength: 80 },
        emoji: String,
        description: { type: String, maxlength: 100 },
      },
    ],
    maxRoles: Number,
    requiredRoleId: String,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const RolePanel: Model<IRolePanel> =
  mongoose.models.RolePanel ??
  mongoose.model<IRolePanel>('RolePanel', RolePanelSchema);
