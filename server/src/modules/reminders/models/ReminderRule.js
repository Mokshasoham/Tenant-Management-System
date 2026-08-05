/**
 * server/src/modules/reminders/models/ReminderRule.js
 *
 * Mongoose model for Reminder Rules.
 * Defines triggers, offset days, targeted roles, and channel mappings.
 */

import mongoose from 'mongoose';
import {
  ReminderCategory,
  ReminderTriggerType,
  ReminderChannel,
  UserRole
} from '../constants/reminderConstants.js';

const reminderRuleSchema = new mongoose.Schema(
  {
    ruleId: {
      type: String,
      required: [true, 'ruleId is required'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Rule name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: Object.values(ReminderCategory),
      required: [true, 'Rule category is required'],
      index: true
    },
    triggerType: {
      type: String,
      enum: Object.values(ReminderTriggerType),
      default: ReminderTriggerType.SCHEDULED_OFFSET
    },
    offsetDays: {
      type: Number,
      default: 0
    },
    channels: {
      type: [String],
      enum: Object.values(ReminderChannel),
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one channel must be specified'
      }
    },
    templateId: {
      type: String,
      required: [true, 'templateId reference is required'],
      trim: true
    },
    recipientRoles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.TENANT]
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index for active rules by category
reminderRuleSchema.index({ isEnabled: 1, category: 1 });

const ReminderRule = mongoose.models.ReminderRule || mongoose.model('ReminderRule', reminderRuleSchema);

export default ReminderRule;
