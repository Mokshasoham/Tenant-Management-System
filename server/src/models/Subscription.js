import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['tenant', 'manager', 'admin'],
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
      default: 'free', // 'free' | 'plus' | 'pro' for tenant; 'starter' | 'plus' | 'pro' for manager
    },
    planName: {
      type: String,
      required: true,
      default: 'TMS Resident Free',
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'expired', 'trialing'],
      default: 'active',
      index: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    maxLeases: {
      type: Number,
      default: 2, // For tenant plans
    },
    maxProperties: {
      type: Number,
      default: 3, // For manager plans
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    lastPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    features: [String],
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ user: 1, role: 1 });
subscriptionSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.model('Subscription', subscriptionSchema);

