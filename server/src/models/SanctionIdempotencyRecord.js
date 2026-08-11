import mongoose from 'mongoose';

const SanctionIdempotencyRecordSchema = new mongoose.Schema(
  {
    verificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Verification', required: true },
    operation: { type: String, enum: ['SCREEN', 'CONFIRM', 'DISMISS', 'UNLOCK'], required: true },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    resultReference: { type: Object, default: {} },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

SanctionIdempotencyRecordSchema.index(
  { verificationId: 1, operation: 1, idempotencyKey: 1 },
  { unique: true }
);
SanctionIdempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('SanctionIdempotencyRecord', SanctionIdempotencyRecordSchema);
