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
        category: { type: String, default: 'other' },
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
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed'],
      default: 'Pending',
    },
    refundStatus: {
      type: String,
      enum: ['none', 'due', 'processing', 'paid', 'failed'],
      default: 'due',
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    gatewayRefundId: String,
    gatewayPaymentId: String,
    gatewayRefundStatus: String,
    refundFailureReason: String,
    refundMethod: {
      type: String,
      enum: ['razorpay', 'manual', 'none'],
      default: 'razorpay',
    },
    refundProcessedAt: Date,
    refundProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

depositSettlementSchema.index({ lease: 1 }, { unique: true });

export default mongoose.model('DepositSettlement', depositSettlementSchema);
