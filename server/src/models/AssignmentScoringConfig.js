/**
 * server/src/models/AssignmentScoringConfig.js
 * Mongoose schema for dynamic technician assignment scoring factor weights.
 */

import mongoose from 'mongoose';

const assignmentScoringConfigSchema = new mongoose.Schema({
  configName: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },
  weights: {
    skill: { type: Number, default: 30 },
    distance: { type: Number, default: 20 },
    workload: { type: Number, default: 15 },
    rating: { type: Number, default: 10 },
    sla: { type: Number, default: 15 },
    history: { type: Number, default: 5 },
    availability: { type: Number, default: 5 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const AssignmentScoringConfig = mongoose.model('AssignmentScoringConfig', assignmentScoringConfigSchema);
export default AssignmentScoringConfig;
