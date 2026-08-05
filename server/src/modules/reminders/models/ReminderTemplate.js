/**
 * server/src/modules/reminders/models/ReminderTemplate.js
 *
 * Mongoose model for Reminder Templates with built-in versioning support.
 * Allows multiple versions (v1, v2, v3) of a template family to co-exist,
 * ensuring historical notifications retain their exact rendering definition.
 */

import mongoose from 'mongoose';
import { ReminderChannel } from '../constants/reminderConstants.js';

const reminderTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: [true, 'templateId is required'],
      trim: true,
      index: true
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
      index: true
    },
    isLatest: {
      type: Boolean,
      default: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true
    },
    channel: {
      type: String,
      enum: Object.values(ReminderChannel),
      required: [true, 'channel is required']
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
    },
    htmlBody: {
      type: String,
      default: ''
    },
    textBody: {
      type: String,
      required: [true, 'textBody is required'],
      trim: true
    },
    variables: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound Unique Index: Each version of a templateId must be unique
reminderTemplateSchema.index({ templateId: 1, version: 1 }, { unique: true });

// Compound Index for finding the latest version of a template
reminderTemplateSchema.index({ templateId: 1, isLatest: 1 });

const ReminderTemplate = mongoose.models.ReminderTemplate || mongoose.model('ReminderTemplate', reminderTemplateSchema);

export default ReminderTemplate;
