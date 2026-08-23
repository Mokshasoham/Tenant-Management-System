import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['rent', 'security_deposit', 'late_fee', 'subscription', 'commission', 'refund', 'payout', 'maintenance_unlock'],
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
    // Platform Revenue & Breakdown extensions
    rentAmount: {
      type: Number,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    platformFeePercentage: {
      type: Number,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    feePayer: {
      type: String,
      default: 'tenant',
    },
    managerGrossAmount: {
      type: Number,
    },
    managerCommission: {
      type: Number,
      default: 0,
    },
    managerNetAmount: {
      type: Number,
    },
    platformRevenue: {
      type: Number,
      default: 0,
    },
    providerFee: {
      type: Number,
      default: 0,
    },
    providerTax: {
      type: Number,
      default: 0,
    },
    razorpayOrderId: String,
    razorpaySignature: String,
    providerStatus: String,
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
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
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMetadata' },
    legacyUrl: String,
    notes: String,
    lateFeeApplied: {
      type: Boolean,
      default: false
    },
    lateFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateFeePerDay: {
      type: Number,
      default: 100,
      min: 0,
    },
    daysLate: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDue: {
      type: Number,
    },
    paymentPeriodStart: Date,
    paymentPeriodEnd: Date,
    paidAt: Date,
    receipts: [
      {
        amount: Number,
        date: Date,
        method: String,
      },
    ],
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
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

/**
 * Post-delete hook: clean up invoice FileMetadata records and storage when a payment is deleted.
 */
paymentSchema.post('deleteOne', { document: true, query: false }, async function () {
  try {
    const FileMetadata = mongoose.model('FileMetadata');
    const { deleteFileFromStorage } = await import('../services/fileService.js');
    // Find all FileMetadata records related to this payment (invoice PDFs)
    const relatedFiles = await FileMetadata.find({ relatedEntity: this._id, relatedModel: 'Payment' });
    for (const meta of relatedFiles) {
      const cleanFilename = meta.key.split('/').pop();
      await deleteFileFromStorage(meta.key, cleanFilename);
      await meta.deleteOne();
    }
  } catch (err) {
    console.error('[Payment.post(deleteOne)] File cleanup error:', err);
  }
});

export default mongoose.model('Payment', paymentSchema);

