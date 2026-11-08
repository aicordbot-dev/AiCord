/**
 * src/models/UserTimezone.ts
 * MongoDB model storing member IANA timezones and active waking hours for World Clock & Overlap Finder.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActiveHours {
  startHour: number; // default: 9 (09:00 local time)
  endHour: number;   // default: 22 (22:00 local time)
}

export interface IUserTimezone extends Document {
  guildId: string;
  userId: string;
  userTag: string;
  timezone: string; // IANA format, e.g. 'America/New_York'
  activeHours: IActiveHours;
  createdAt: Date;
  updatedAt: Date;
}

const UserTimezoneSchema = new Schema<IUserTimezone>(
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
      default: 'Member',
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
    },
    activeHours: {
      startHour: {
        type: Number,
        default: 9,
        min: 0,
        max: 23,
      },
      endHour: {
        type: Number,
        default: 22,
        min: 0,
        max: 23,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

UserTimezoneSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const UserTimezone: Model<IUserTimezone> =
  mongoose.models.UserTimezone ||
  mongoose.model<IUserTimezone>('UserTimezone', UserTimezoneSchema);
