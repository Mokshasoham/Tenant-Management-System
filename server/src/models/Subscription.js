import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planName: {
      type: String,
      required: true,
      enum: ['basic', 'pro', 'enterprise'],
      default: 'basic'
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing'],
      default: 'trialing'
    },
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    currentPeriodEnd: Date,
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ owner: 1 });
subscriptionSchema.index({ status: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
