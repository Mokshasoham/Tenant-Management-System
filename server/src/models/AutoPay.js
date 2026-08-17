import mongoose from 'mongoose';

const autoPaySchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tenant user ID is required'],
    },
    tenantProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
      required: [true, 'Lease ID is required'],
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'disabled', 'failed'],
      default: 'active',
    },
    monthlyAmount: {
      type: Number,
      required: [true, 'Monthly rent amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    nextPaymentDate: {
      type: Date,
      required: [true, 'Next scheduled payment date is required'],
    },
    lastPaymentDate: {
      type: Date,
    },
    lastPaymentStatus: {
      type: String,
      enum: ['success', 'failed', 'pending', null],
      default: null,
    },
    lastPaymentReference: {
      type: String,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    failureReason: {
      type: String,
    },
    paymentMethodType: {
      type: String,
      enum: ['upi_autopay', 'card_mandate', 'netbanking_mandate'],
      default: 'upi_autopay',
    },
    provider: {
      type: String,
      default: 'razorpay',
    },
    providerCustomerId: {
      type: String,
    },
    providerSubscriptionId: {
      type: String,
    },
    providerTokenId: {
      type: String,
    },
    providerMandateStatus: {
      type: String,
    },
    enabledAt: {
      type: Date,
      default: Date.now,
    },
    disabledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring at most one AutoPay configuration per tenant and lease
autoPaySchema.index({ tenant: 1, lease: 1 }, { unique: true });
autoPaySchema.index({ lease: 1 });
autoPaySchema.index({ status: 1 });
autoPaySchema.index({ nextPaymentDate: 1 });

export default mongoose.model('AutoPay', autoPaySchema);
