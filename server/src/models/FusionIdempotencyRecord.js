import mongoose from 'mongoose';

const FusionIdempotencyRecordSchema = new mongoose.Schema(
  {
    verificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Verification',
      required: true,
      index: true,
    },
    operation: {
      type: String,
      enum: ['SYNTHESIZE', 'CONFIRM', 'OVERRIDE', 'UNLOCK'],
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    resultReference: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d',
    },
  },
  {
    timestamps: true,
  }
);

FusionIdempotencyRecordSchema.index(
  { verificationId: 1, operation: 1, idempotencyKey: 1 },
  { unique: true }
);

export default mongoose.model('FusionIdempotencyRecord', FusionIdempotencyRecordSchema);
