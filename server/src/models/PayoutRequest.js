import mongoose from 'mongoose';

const payoutRequestSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [500, 'Minimum payout amount is ₹500'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['requested', 'pending', 'processing', 'approved', 'paid', 'completed', 'failed', 'rejected', 'cancelled'],
      default: 'requested',
      index: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'razorpay', 'manual'],
      default: 'stripe',
    },
    providerTransferId: String,
    providerPayoutId: String,
    stripeTransferId: String,
    idempotencyKey: {
      type: String,
      index: true,
    },
    failureReason: String,
    accountNumberLast4: String,
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processingAt: Date,
    completedAt: Date,
    failedAt: Date,
    processedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

payoutRequestSchema.index({ owner: 1, createdAt: -1 });
payoutRequestSchema.index({ manager: 1, createdAt: -1 });
payoutRequestSchema.index({ status: 1 });
payoutRequestSchema.index({ idempotencyKey: 1 });

export default mongoose.model('PayoutRequest', payoutRequestSchema);

