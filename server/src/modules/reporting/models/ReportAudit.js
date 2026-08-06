/**
 * server/src/modules/reporting/models/ReportAudit.js
 *
 * Mongoose Schema for Tracking Report Execution Audits.
 */

import mongoose from 'mongoose';

const ReportAuditSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      required: true,
      index: true
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    exportFormat: {
      type: String,
      enum: ['json', 'csv', 'xlsx', 'pdf'],
      default: 'json'
    },
    executionTimeMs: {
      type: Number,
      default: 0
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recordCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success'
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

ReportAuditSchema.index({ requestedBy: 1, createdAt: -1 });

const ReportAudit = mongoose.models.ReportAudit || mongoose.model('ReportAudit', ReportAuditSchema);
export default ReportAudit;
