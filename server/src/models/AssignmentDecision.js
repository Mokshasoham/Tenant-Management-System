/**
 * server/src/models/AssignmentDecision.js
 * Mongoose schema for Assignment Decisions, recommendation snapshots, and idempotency tracking.
 */

import mongoose from 'mongoose';

const scoreBreakdownSchema = new mongoose.Schema({
  factor: { type: String, required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  reason: { type: String, required: true }
}, { _id: false });

const recommendationItemSchema = new mongoose.Schema({
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  overallScore: { type: Number, required: true },
  scoreBreakdown: [scoreBreakdownSchema],
  explainability: [{ type: String }]
}, { _id: false });

const technicianSnapshotSchema = new mongoose.Schema({
  rating: { type: Number, default: 4.9 },
  skills: [{ name: String, level: String }],
  workload: { type: Number, default: 0 },
  availabilityStatus: { type: String, default: 'Available' },
  zone: { type: String, default: 'General' }
}, { _id: false });

const assignmentDecisionSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance',
    required: true,
    index: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  assignmentStrategy: {
    type: String,
    enum: ['AUTO', 'MANUAL', 'EMERGENCY', 'REASSIGNMENT'],
    default: 'AUTO'
  },
  assignmentStatus: {
    type: String,
    enum: ['suggested', 'accepted', 'overridden', 'cancelled'],
    default: 'suggested'
  },
  algorithmId: {
    type: String,
    default: 'rule-engine-v1'
  },
  algorithmVersion: {
    type: String,
    default: '1.0.0'
  },
  model: {
    type: String,
    default: 'rule-engine'
  },
  confidence: {
    type: Number,
    required: true,
    default: 95
  },
  recommendedTechnicians: [recommendationItemSchema],
  selectedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  selectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isOverride: {
    type: Boolean,
    default: false
  },
  overrideReason: {
    type: String,
    default: ''
  },
  technicianSnapshot: technicianSnapshotSchema,
  generatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000)
  },
  assignedAt: {
    type: Date
  },
  acceptedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const AssignmentDecision = mongoose.model('AssignmentDecision', assignmentDecisionSchema);
export default AssignmentDecision;
