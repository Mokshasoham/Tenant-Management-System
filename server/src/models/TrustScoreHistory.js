import mongoose from 'mongoose';

const TrustScoreHistorySchema = new mongoose.Schema(
  {
    // Entity
    entityType: {
      type: String,
      enum: ['TENANT', 'MANAGER', 'PROPERTY', 'TECHNICIAN'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Score Metrics
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    previousScore: {
      type: Number,
      default: null,
    },
    delta: {
      type: Number,
      default: 0,
    },

    // Score Component Breakdown
    breakdown: {
      identity: { type: Number, default: 0 },
      phone: { type: Number, default: 0 },
      business: { type: Number, default: 0 },
      property: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 },
      noFraud: { type: Number, default: 0 },
      penalties: { type: Number, default: 0 },
    },

    // Audit Trigger & Context
    reason: {
      type: String,
      enum: [
        'VERIFICATION_APPROVED',
        'VERIFICATION_REJECTED',
        'DOCUMENT_EXPIRED',
        'DOCUMENT_RENEWED',
        'FRAUD_FLAG_RAISED',
        'FRAUD_FLAG_CLEARED',
        'POSITIVE_REVIEW',
        'COMPLAINT_RECEIVED',
        'MANUAL_ADJUSTMENT',
        'SYSTEM_RECALCULATION',
        'IDENTITY_VERIFIED',
        'PROPERTY_VERIFIED',
        'FACIAL_VERIFIED',
        'VIDEO_KYC_VERIFIED',
        'BADGE_AWARDED',
        'BADGE_REVOKED',
      ],
      required: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Verification',
      default: null,
    },
    note: {
      type: String,
      default: '',
    },

    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  }
);

TrustScoreHistorySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
TrustScoreHistorySchema.index({ isDeleted: 1 });

export default mongoose.model('TrustScoreHistory', TrustScoreHistorySchema);
