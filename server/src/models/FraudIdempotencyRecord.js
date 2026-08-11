import mongoose from 'mongoose';

const FraudIdempotencyRecordSchema = new mongoose.Schema(
  {
    verificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Verification', required: true },
    operation: { type: String, enum: ['EVALUATE', 'CONFIRM', 'DISMISS'], required: true },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    resultReference: { type: Object, default: {} },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

FraudIdempotencyRecordSchema.index(
  { verificationId: 1, operation: 1, idempotencyKey: 1 },
  { unique: true }
);
FraudIdempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('FraudIdempotencyRecord', FraudIdempotencyRecordSchema);
