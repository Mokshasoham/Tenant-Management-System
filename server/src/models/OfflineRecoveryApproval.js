import mongoose from 'mongoose';

const offlineRecoveryApprovalSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    expectedPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    proposedAt: {
      type: Date,
      default: Date.now,
    },
    proposalReason: {
      type: String,
      required: true,
    },
    evidenceIdentifier: {
      type: String,
      required: true,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    approvalSignature: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        'PENDING_SUPER_ADMIN_APPROVAL',
        'APPROVED',
        'CONSUMED',
        'REJECTED',
        'COMMIT_INDETERMINATE',
      ],
      default: 'PENDING_SUPER_ADMIN_APPROVAL',
      index: true,
    },
    consumedAt: {
      type: Date,
    },
    consumedByTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
    },
    discrepancyNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

offlineRecoveryApprovalSchema.index({ payment: 1, status: 1 });
offlineRecoveryApprovalSchema.index({ evidenceIdentifier: 1, status: 1 });

const OfflineRecoveryApproval = mongoose.model('OfflineRecoveryApproval', offlineRecoveryApprovalSchema);

export default OfflineRecoveryApproval;
