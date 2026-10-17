import mongoose from 'mongoose';

const checkoutSessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['lease', 'bill', 'payment'],
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    currentAttempt: {
      type: Number,
      default: 0,
    },
    activeReceiptId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    activeOrderId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    expectedAmountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    dispatchState: {
      type: String,
      enum: ['UNCLAIMED', 'CLAIMED', 'BOUND', 'SETTLED', 'EXPIRED'],
      default: 'UNCLAIMED',
      index: true,
    },
    claimWorkerId: {
      type: String,
    },
    claimExpiresAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    _id: false, // Explicitly tell mongoose we provide custom string _id
  }
);

checkoutSessionSchema.index({ targetId: 1, targetType: 1 });
checkoutSessionSchema.index({ expiresAt: 1 });

const CheckoutSession = mongoose.model('CheckoutSession', checkoutSessionSchema);

export default CheckoutSession;
