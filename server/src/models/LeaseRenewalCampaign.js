import mongoose from 'mongoose';
import { addBaseFields } from '../platform/models/BaseSchema.js';
import { RenewalCampaignStatus, CampaignSource } from '../modules/lease-renewal/campaignConstants.js';

const campaignSchema = new mongoose.Schema(
  {
    campaignNumber: { type: String, unique: true, required: true },
    lease: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { 
      type: String, 
      enum: Object.values(RenewalCampaignStatus), 
      default: RenewalCampaignStatus.DRAFT 
    },
    source: {
      type: String,
      enum: Object.values(CampaignSource),
      default: CampaignSource.MANUAL
    },
    riskScore: { type: Number, default: 100 },
    slaLimitDate: Date,
    slaStatus: { type: String, enum: ['within_sla', 'approaching_breach', 'breached'], default: 'within_sla' },
    
    // Historical Ownership Snapshot
    snapshot: {
      tenantName: String,
      propertyName: String,
      propertyAddress: String,
      leaseNumber: String,
      managerName: String
    },

    // Lifecycle Milestones
    lifecycle: {
      createdAt: { type: Date, default: Date.now },
      waitingTenantAt: Date,
      negotiationStartedAt: Date,
      pendingSignatureAt: Date,
      approvedAt: Date,
      completedAt: Date,
      expiredAt: Date
    },

    // Future AI Readiness
    ai: {
      recommendation: String,
      confidence: Number,
      explanation: String,
      generatedAt: Date
    },

    // Metrics
    metrics: {
      startedAt: Date,
      firstResponseAt: Date,
      approvedAt: Date,
      signedAt: Date,
      completedAt: Date,
      durationMs: Number,
      slaBreaches: { type: Number, default: 0 }
    },

    // Future-proofing fields
    labels: [String],
    tags: [String],
    customFields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    lastActivityAt: { type: Date, default: Date.now }
  },
  { 
    timestamps: true,
    optimisticConcurrency: true,
    versionKey: 'version'
  }
);

addBaseFields(campaignSchema);

// Optimized compound indexes & compound uniqueness
campaignSchema.index({ organizationId: 1, lease: 1, status: 1, isDeleted: 1 }, { 
  unique: true,
  partialFilterExpression: { 
    status: { $in: ['draft', 'created', 'waiting_for_tenant', 'waiting_for_manager', 'negotiating', 'pending_signature', 'approved', 'escalated'] },
    isDeleted: false 
  }
});
campaignSchema.index({ manager: 1, status: 1 });
campaignSchema.index({ tenant: 1, status: 1 });
campaignSchema.index({ expiryDate: 1 });
campaignSchema.index({ slaStatus: 1 });
campaignSchema.index({ riskScore: 1 });

// Analytics performance compound indexes
campaignSchema.index({ organizationId: 1, status: 1 });
campaignSchema.index({ status: 1, expiryDate: 1 });
campaignSchema.index({ organizationId: 1, createdAt: -1 });
campaignSchema.index({ organizationId: 1, riskScore: 1 });

export default mongoose.model('LeaseRenewalCampaign', campaignSchema);
