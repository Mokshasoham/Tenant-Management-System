import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaseRenewalCampaign', required: true },
  evaluatedAt: { type: Date, default: Date.now },
  eligible: { type: Boolean, required: true },
  score: { type: Number, required: true },
  riskGrade: { type: String, required: true }, // 'Excellent', 'Low Risk', 'Medium Risk', 'High Risk', 'Critical'
  
  rules: [
    {
      id: String,
      name: String,
      passed: Boolean,
      severity: { type: String, enum: ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] },
      reason: String,
      code: String,
      durationMs: Number
    }
  ],
  
  // Historical Snapshots
  resolvedPolicy: {
    minDurationMonths: Number,
    maxDurationMonths: Number,
    maxRentIncreasePercent: Number,
    minNoticeDays: Number,
    maxCounterOffers: Number,
    autoApprovalEnabled: Boolean,
    policyId: mongoose.Schema.Types.ObjectId
  },
  
  explainability: {
    why: [String],
    recommendations: [String]
  },
  
  executionTimeMs: { type: Number, required: true },
  policyVersion: { type: Number, required: true },

  // AI Placeholder fields
  ai: {
    recommendation: String,
    confidence: Number,
    explanation: String,
    generatedAt: Date
  }
});

evaluationSchema.index({ campaign: 1, evaluatedAt: -1 });

export default mongoose.model('EligibilityEvaluation', evaluationSchema);
