/**
 * server/src/modules/operations/models/OperationHistory.js
 *
 * Mongoose Schema for Tracking Operational Administrative Actions.
 * Provides an immutable audit trail for retry, purge, cancel, trigger, and tuning operations.
 */

import mongoose from 'mongoose';

const OperationHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'bulk_retry_dead_letter',
        'bulk_purge_dead_letter',
        'cancel_job',
        'trigger_scheduler',
        'tune_worker'
      ],
      index: true
    },
    target: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    durationMs: {
      type: Number,
      default: 0
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    success: {
      type: Boolean,
      default: true
    },
    errorMessage: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

OperationHistorySchema.index({ userId: 1, createdAt: -1 });

const OperationHistory = mongoose.models.OperationHistory || mongoose.model('OperationHistory', OperationHistorySchema);
export default OperationHistory;
