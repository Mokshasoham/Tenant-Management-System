/**
 * server/src/models/DashboardLayout.js
 *
 * Mongoose schema for User Dashboard Layout Preferences.
 * Stores user-specific widget arrangements using semantic grid coordinates { x, y, w, h }
 * and widget-level settings.
 * Employs Mongoose's built-in __v for Optimistic Concurrency Control (OCC).
 */

import mongoose from 'mongoose';

const widgetPreferenceSchema = new mongoose.Schema({
  widgetId: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  x: { type: Number, required: true, default: 0 },
  y: { type: Number, required: true, default: 0 },
  w: { type: Number, required: true, default: 2 }, // column span (1-4)
  h: { type: Number, required: true, default: 1 }, // row span
  refreshIntervalMs: { type: Number, default: 60000 },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const dashboardLayoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dashboardRole: { type: String, enum: ['admin', 'manager', 'tenant', 'landlord'], required: true },
  profileName: { type: String, default: 'Default' },
  layoutVersion: { type: Number, default: 1 }, // Schema migration version
  isActive: { type: Boolean, default: true },
  lastKnownGoodLayout: [widgetPreferenceSchema],
  recommendation: {
    source: { type: String },
    reason: { type: String },
    confidence: { type: Number }
  },
  widgets: [widgetPreferenceSchema]
}, { timestamps: true });

dashboardLayoutSchema.index({ userId: 1, dashboardRole: 1, profileName: 1 }, { unique: true });

export default mongoose.model('DashboardLayout', dashboardLayoutSchema);
