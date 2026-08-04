import mongoose from 'mongoose';

/**
 * Audit schema tracking granular changes on lease renewals.
 */
const leaseRenewalAuditSchema = new mongoose.Schema(
  {
    leaseRenewalId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaseRenewal', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    
    // Rich Audit & Correlation Fields
    browser: String,
    device: String,
    platform: String,
    location: String,
    requestId: String,
    sessionId: String,
    userAgent: String,
    ipAddress: String,
    correlationId: String,
    traceId: String,
    timestamp: { type: Date, default: Date.now }
  }
);

leaseRenewalAuditSchema.index({ leaseRenewalId: 1 });
leaseRenewalAuditSchema.index({ timestamp: -1 });

export default mongoose.model('LeaseRenewalAudit', leaseRenewalAuditSchema);
