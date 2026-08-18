import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
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
      index: true,
    },
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      index: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Financial Breakdown
    rentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformFeePercentage: {
      type: Number,
      default: 0,
    },
    platformTax: {
      type: Number,
      default: 0,
      min: 0,
    },
    managerCommission: {
      type: Number,
      default: 0,
      min: 0,
    },
    managerCommissionPercentage: {
      type: Number,
      default: 0,
    },
    managerGrossAmount: {
      type: Number,
      default: 0,
    },
    managerNetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    providerFee: {
      type: Number,
      default: 0, // Separate Razorpay provider fee
    },
    providerTax: {
      type: Number,
      default: 0,
    },
    platformRevenue: {
      type: Number,
      required: true,
      default: 0, // Actual TMS net platform revenue
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    feePayer: {
      type: String,
      enum: ['tenant', 'manager', 'split'],
      default: 'tenant',
    },
    // Payment Gateway References
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    razorpaySignature: String,
    status: {
      type: String,
      enum: ['pending', 'captured', 'paid', 'refunded', 'partially_refunded', 'failed'],
      default: 'paid',
      index: true,
    },
    // Reversal / Refund Accounting
    refundedAmount: {
      type: Number,
      default: 0,
    },
    reversedPlatformFee: {
      type: Number,
      default: 0,
    },
    netPlatformRevenue: {
      type: Number,
      default: 0,
    },
    refundReason: String,
    refundedAt: Date,
  },
  {
    timestamps: true,
  }
);

paymentTransactionSchema.index({ property: 1, manager: 1, status: 1 });
paymentTransactionSchema.index({ createdAt: -1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

export default PaymentTransaction;
