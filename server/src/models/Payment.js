import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['rent', 'security_deposit', 'late_fee', 'subscription', 'commission', 'refund', 'payout'],
      default: 'rent'
    },
    // References - Made optional since some payments (like subscriptions or payouts) 
    // don't have a lease or tenant, they just have an owner.
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    paymentDate: Date,
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'transfer', 'card', 'other'],
    },
    reference: String,
    stripePaymentIntentId: String,
    razorpayPaymentId: String,
    invoiceUrl: String,
    notes: String,
    lateFeeApplied: {
      type: Boolean,
      default: false
    },
    receipts: [
      {
        amount: Number,
        date: Date,
        method: String,
        reference: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ lease: 1 });
paymentSchema.index({ tenant: 1 });
paymentSchema.index({ owner: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });

export default mongoose.model('Payment', paymentSchema);
