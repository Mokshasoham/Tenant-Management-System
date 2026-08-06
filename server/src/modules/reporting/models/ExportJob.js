/**
 * server/src/modules/reporting/models/ExportJob.js
 *
 * Mongoose Schema for Asynchronous Export Background Jobs.
 * Tracks job lifecycle: pending -> processing -> completed / failed -> expired.
 */

import mongoose from 'mongoose';

const ExportJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportType: {
      type: String,
      required: true,
      index: true
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    format: {
      type: String,
      required: true,
      enum: ['pdf', 'csv', 'excel', 'xlsx'],
      default: 'pdf'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
      default: 'pending',
      index: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    downloadUrl: {
      type: String,
      default: null
    },
    fileSizeBytes: {
      type: Number,
      default: 0
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    error: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true
  }
);

ExportJobSchema.index({ status: 1, createdAt: 1 });

const ExportJob = mongoose.models.ExportJob || mongoose.model('ExportJob', ExportJobSchema);
export default ExportJob;
