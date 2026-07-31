import mongoose from 'mongoose';

const leaseRenewalSchema = new mongoose.Schema(
  {
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    requestedStartDate: {
      type: Date,
      required: true,
    },
    requestedEndDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: String,
      required: true,
    },
    message: String,
    proposedRent: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['tenant_request', 'manager_offer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'offered', 'accepted', 'approved', 'rejected', 'expired', 'cancelled'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,
    rejectionReason: String,
    timeline: [
      {
        event: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
  },
  {
    timestamps: true,
  }
);

leaseRenewalSchema.index({ lease: 1 });
leaseRenewalSchema.index({ tenant: 1 });
leaseRenewalSchema.index({ status: 1 });

export default mongoose.model('LeaseRenewal', leaseRenewalSchema);
