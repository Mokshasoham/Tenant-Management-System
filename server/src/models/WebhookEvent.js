import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  provider: { type: String, enum: ['stripe', 'razorpay'], required: true }
}, { timestamps: true });

webhookEventSchema.index({ eventId: 1 });

export default mongoose.model('WebhookEvent', webhookEventSchema);
