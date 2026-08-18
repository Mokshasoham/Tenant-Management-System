import mongoose from 'mongoose';

const stripeConnectAccountSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    stripeAccountId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: ['standard', 'express', 'custom'],
      default: 'express',
    },
    onboardingStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'restricted', 'failed'],
      default: 'pending',
    },
    chargesEnabled: {
      type: Boolean,
      default: false,
    },
    payoutsEnabled: {
      type: Boolean,
      default: false,
    },
    detailsSubmitted: {
      type: Boolean,
      default: false,
    },
    requirementsDue: {
      type: [String],
      default: [],
    },
    requirementsEventuallyDue: {
      type: [String],
      default: [],
    },
    requirementsPastDue: {
      type: [String],
      default: [],
    },
    disabledReason: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: 'IN',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    bankName: {
      type: String,
      default: null,
    },
    accountNumberLast4: {
      type: String,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

stripeConnectAccountSchema.index({ manager: 1 });
stripeConnectAccountSchema.index({ stripeAccountId: 1 });

export default mongoose.model('StripeConnectAccount', stripeConnectAccountSchema);
