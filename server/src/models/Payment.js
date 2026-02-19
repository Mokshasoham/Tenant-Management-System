import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
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
    paymentDate: Date,
    dueDate: {
      type: Date,
      required: true,
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
    notes: String,
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
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });

export default mongoose.model('Payment', paymentSchema);
