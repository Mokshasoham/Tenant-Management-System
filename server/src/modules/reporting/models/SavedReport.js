/**
 * server/src/modules/reporting/models/SavedReport.js
 *
 * Mongoose Schema for User-Saved Report Configurations and Presets.
 */

import mongoose from 'mongoose';

const SavedReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    reportType: {
      type: String,
      required: true,
      enum: [
        'revenue',
        'occupancy',
        'lease',
        'tenant',
        'payment',
        'maintenance',
        'reminder',
        'notification',
        'booking',
        'manager_performance',
        'admin_operations',
        'audit_log'
      ]
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    templateId: {
      type: String,
      default: 'standard'
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

SavedReportSchema.index({ createdBy: 1, reportType: 1 });

const SavedReport = mongoose.models.SavedReport || mongoose.model('SavedReport', SavedReportSchema);
export default SavedReport;
