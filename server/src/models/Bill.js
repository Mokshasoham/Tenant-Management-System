import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['rent', 'electricity', 'water', 'maintenance', 'parking', 'internet', 'security_deposit', 'late_fee', 'repair', 'miscellaneous'],
      required: true
    },
    lease: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    status: {
      type: String,
      enum: ['draft', 'generated', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided'],
      default: 'draft'
    },
    dueDate: { type: Date, required: true },
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
    gracePeriodDays: { type: Number, default: 3 },
    meterReading: {
      previous: Number,
      current: Number,
      rate: Number
    },
    breakdown: [
      {
        label: { type: String, required: true },
        amount: { type: Number, required: true }
      }
    ],
    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    lateFeeApplied: { type: Boolean, default: false },
    remindersSent: { type: [String], default: [] },
    invoiceUrl: String,
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMetadata' },
    timeline: [
      {
        status: { type: String, required: true },
        note: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    voidedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    voidReason: String
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtuals
billSchema.virtual('balance').get(function () {
  return this.amountDue - this.amountPaid;
});
billSchema.virtual('meterReading.consumption').get(function () {
  if (this.meterReading?.current !== undefined && this.meterReading?.previous !== undefined) {
    return this.meterReading.current - this.meterReading.previous;
  }
  return undefined;
});

// Recompute amountDue from breakdown before validation
billSchema.pre('validate', function (next) {
  if (this.isModified('breakdown')) {
    this.amountDue = this.breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);
  }
  next();
});

// Indexes
billSchema.index(
  { lease: 1, type: 1, billingPeriodStart: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      type: { $in: ['rent', 'electricity', 'water', 'maintenance', 'parking', 'internet'] } 
    } 
  }
);
billSchema.index({ tenant: 1, status: 1 });
billSchema.index({ dueDate: 1, status: 1 });
billSchema.index({ billNumber: 1 });

export default mongoose.model('Bill', billSchema);
