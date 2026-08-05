/**
 * server/src/modules/reminders/models/Reminder.js
 *
 * Mongoose model for Outbox-style Reminder Queue.
 * Stores pending, processing, sent, failed, cancelled, and dead-letter reminders.
 */

import mongoose from 'mongoose';
import {
  ReminderStatus,
  ReminderChannel,
  ReminderEntityType
} from '../constants/reminderConstants.js';

const reminderSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: [true, 'idempotencyKey is required'],
      unique: true,
      trim: true,
      index: true
    },
    ruleId: {
      type: String,
      required: [true, 'ruleId is required'],
      trim: true,
      index: true
    },
    entityType: {
      type: String,
      enum: Object.values(ReminderEntityType),
      required: [true, 'entityType is required'],
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'entityId is required'],
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
      enum: Object.values(ReminderChannel),
      required: [true, 'channel is required'],
      index: true
    },
    scheduledFor: {
      type: Date,
      required: [true, 'scheduledFor date is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(ReminderStatus),
      default: ReminderStatus.QUEUED,
      index: true
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lastAttemptAt: {
      type: Date
    },
    nextRetryAt: {
      type: Date
    },
    sentAt: {
      type: Date
    },
    cancelReason: {
      type: String,
      trim: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for Worker Batch Processing
reminderSchema.index({ status: 1, scheduledFor: 1, nextRetryAt: 1 });

// Compound Index for Entity Cancellation Queries
reminderSchema.index({ entityType: 1, entityId: 1, status: 1 });

// Compound Index for Recipient Notification Views
reminderSchema.index({ recipient: 1, status: 1, createdAt: -1 });

const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);

export default Reminder;
