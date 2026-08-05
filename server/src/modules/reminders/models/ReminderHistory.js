/**
 * server/src/modules/reminders/models/ReminderHistory.js
 *
 * Mongoose model for immutable Reminder Audit & Delivery History.
 * Records every dispatch attempt, provider message ID, latency, and template version.
 */

import mongoose from 'mongoose';

const reminderHistorySchema = new mongoose.Schema(
  {
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reminder',
      required: [true, 'reminderId reference is required'],
      index: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'recipient User ID is required'],
      index: true
    },
    channel: {
      type: String,
      required: [true, 'channel is required'],
      index: true
    },
    provider: {
      type: String,
      required: [true, 'provider name is required'],
      trim: true
    },
    providerMessageId: {
      type: String,
      trim: true
    },
    templateVersion: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['delivered', 'failed', 'bounced', 'rejected'],
      required: true,
      index: true
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    executionTimeMs: {
      type: Number,
      default: 0
    },
    error: {
      code: { type: String },
      message: { type: String }
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for recipient audit queries
reminderHistorySchema.index({ recipient: 1, sentAt: -1 });

// Compound Index for delivery analytics aggregations
reminderHistorySchema.index({ channel: 1, status: 1, sentAt: -1 });

const ReminderHistory = mongoose.models.ReminderHistory || mongoose.model('ReminderHistory', reminderHistorySchema);

export default ReminderHistory;
