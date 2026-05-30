import mongoose from 'mongoose';

const payoutRequestSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 10, // Minimum payout logic
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending'
    },
    stripeTransferId: String,
    notes: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: Date
  },
  {
    timestamps: true,
  }
);

payoutRequestSchema.index({ owner: 1 });
payoutRequestSchema.index({ status: 1 });

export default mongoose.model('PayoutRequest', payoutRequestSchema);
