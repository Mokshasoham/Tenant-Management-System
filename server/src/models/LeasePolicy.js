import mongoose from 'mongoose';

const policySchema = new mongoose.Schema({
  name: { type: String, required: true },
  propertyType: { type: String, required: true }, // 'global', 'residential', 'apartment', 'property', 'lease'
  parentPolicy: { type: mongoose.Schema.Types.ObjectId, ref: 'LeasePolicy', default: null },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  leaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease', default: null },
  
  // Rule Boundaries
  minDurationMonths: { type: Number },
  maxDurationMonths: { type: Number },
  maxRentIncreasePercent: { type: Number },
  minNoticeDays: { type: Number },
  maxCounterOffers: { type: Number },
  autoApprovalEnabled: { type: Boolean },
  
  version: { type: Number, default: 1 },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo: { type: Date },
  active: { type: Boolean, default: true }
});

policySchema.index({ propertyType: 1, active: 1 });
policySchema.index({ propertyId: 1, active: 1 });
policySchema.index({ leaseId: 1, active: 1 });
policySchema.index({ parentPolicy: 1 });

export default mongoose.model('LeasePolicy', policySchema);
