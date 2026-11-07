/**
 * src/models/UserProfileStyle.ts
 * MongoDB model storing per-guild user profile visual customization preferences:
 * - rankTheme: Theme applied to rank card and level displays (default 'cyberpunk')
 * - balanceTheme: Theme applied to economy / balance displays (default 'gold')
 * - barStyle: Character set used for progress bars (default 'pipes')
 * - badges: Awarded or unlocked profile badges (e.g. 'early_adopter', 'vip')
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserProfileStyle extends Document {
  userId: string;
  guildId: string;
  rankTheme: string;
  balanceTheme: string;
  barStyle: string;
  badges: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileStyleSchema = new Schema<IUserProfileStyle>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    rankTheme: {
      type: String,
      default: 'cyberpunk',
    },
    balanceTheme: {
      type: String,
      default: 'gold',
    },
    barStyle: {
      type: String,
      default: 'pipes',
    },
    badges: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index ensuring one profile style record per user per guild
UserProfileStyleSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const UserProfileStyle: Model<IUserProfileStyle> =
  mongoose.models.UserProfileStyle ??
  mongoose.model<IUserProfileStyle>('UserProfileStyle', UserProfileStyleSchema);
