import mongoose from 'mongoose';

const refundIntentSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    reason: {
      type: String,
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'INTENT_PERSISTED',
        'GATEWAY_DISPATCHED',
        'SETTLED',
        'REFUND_INDETERMINATE',
        'FAILED',
      ],
      default: 'INTENT_PERSISTED',
      index: true,
    },
    gatewayRefundId: {
      type: String,
      index: true,
      sparse: true,
    },
    gatewayPaymentId: {
      type: String,
      index: true,
    },
    dispatchAttempts: {
      type: Number,
      default: 0,
    },
    dispatchedAt: {
      type: Date,
    },
    settledAt: {
      type: Date,
    },
    lastError: {
      type: String,
    },
    reversalBreakdown: {
      refundedAmount: Number,
      reversedPlatformFee: Number,
      netPlatformRevenue: Number,
    },
  },
  {
    timestamps: true,
  }
);

refundIntentSchema.index({ payment: 1, status: 1 });

const RefundIntent = mongoose.model('RefundIntent', refundIntentSchema);

export default RefundIntent;
