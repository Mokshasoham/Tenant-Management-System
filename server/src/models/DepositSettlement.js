import mongoose from 'mongoose';

const depositSettlementSchema = new mongoose.Schema(
  {
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    depositAmount: {
      type: Number,
      required: true,
    },
    deductions: [
      {
        reason: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    totalDeduction: {
      type: Number,
      default: 0,
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed'],
      default: 'Pending',
    },
    refundDate: Date,
    reason: String,
    timeline: [
      {
        event: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
  },
  {
    timestamps: true,
  }
);

depositSettlementSchema.index({ lease: 1 });

export default mongoose.model('DepositSettlement', depositSettlementSchema);
