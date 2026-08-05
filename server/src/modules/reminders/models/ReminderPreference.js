/**
 * server/src/modules/reminders/models/ReminderPreference.js
 *
 * Mongoose model for User Communication Preferences and Quiet Hours settings.
 */

import mongoose from 'mongoose';
import { DEFAULT_QUIET_HOURS } from '../constants/reminderConstants.js';

const quietHoursSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    startHour: { type: Number, default: 22, min: 0, max: 23 },
    endHour: { type: Number, default: 7, min: 0, max: 23 },
    timezone: { type: String, default: 'Asia/Kolkata' }
  },
  { _id: false }
);

const reminderPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true
    },
    emailEnabled: {
      type: Boolean,
      default: true
    },
    smsEnabled: {
      type: Boolean,
      default: true
    },
    categoryPreferences: {
      type: Map,
      of: Boolean,
      default: {
        renewal: true,
        lease: true,
        payment: true,
        maintenance: true,
        sla: true,
        system: true
      }
    },
    quietHours: {
      type: quietHoursSchema,
      default: () => ({ ...DEFAULT_QUIET_HOURS })
    },
    phoneNumberOverride: {
      type: String,
      trim: true
    },
    emailOverride: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  {
    timestamps: true
  }
);

const ReminderPreference = mongoose.models.ReminderPreference || mongoose.model('ReminderPreference', reminderPreferenceSchema);

export default ReminderPreference;
