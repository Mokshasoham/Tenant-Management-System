/**
 * server/src/models/DashboardTemplate.js
 *
 * Mongoose schema for Shared Organizational Dashboard Templates & Catalog Engine.
 * Supports RBAC visibility scopes (PRIVATE, TEAM, ORGANIZATION, GLOBAL),
 * Catalog metadata (category, tags, featured, usageCount, rating), soft deletion, and versioning.
 */

import mongoose from 'mongoose';

const templateWidgetSchema = new mongoose.Schema({
  widgetId: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  x: { type: Number, required: true, default: 0 },
  y: { type: Number, required: true, default: 0 },
  w: { type: Number, required: true, default: 2 },
  h: { type: Number, required: true, default: 1 },
  refreshIntervalMs: { type: Number, default: 60000 },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const dashboardTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerRole: { type: String, enum: ['admin', 'manager', 'tenant', 'landlord'], required: true },
  scope: {
    type: String,
    enum: ['PRIVATE', 'TEAM', 'ORGANIZATION', 'GLOBAL'],
    default: 'ORGANIZATION',
    index: true
  },
  category: {
    type: String,
    enum: ['executive', 'finance', 'operations', 'maintenance', 'leasing', 'occupancy', 'revenue', 'support'],
    default: 'executive',
    index: true
  },
  tags: [{ type: String, index: true }],
  featured: { type: Boolean, default: false, index: true },
  usageCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
  templateVersion: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['ACTIVE', 'ARCHIVED', 'DEPRECATED'],
    default: 'ACTIVE',
    index: true
  },
  widgets: [templateWidgetSchema]
}, { timestamps: true });

dashboardTemplateSchema.index({ scope: 1, category: 1, status: 1 });

export default mongoose.model('DashboardTemplate', dashboardTemplateSchema);
