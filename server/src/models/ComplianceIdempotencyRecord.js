import mongoose from 'mongoose';

const { Schema } = mongoose;

const complianceIdempotencyRecordSchema = new Schema(
  {
    verificationId: {
      type: String,
      required: true,
      index: true,
    },
    operation: {
      type: String,
      enum: ['LOG_AUDIT', 'TRIGGER_RECERTIFICATION', 'EXPORT_PACKAGE'],
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    resultReference: {
      type: Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d', // Auto-purge idempotency keys after 7 days
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index enforcing operation-level key isolation per verification
complianceIdempotencyRecordSchema.index({ verificationId: 1, operation: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model('ComplianceIdempotencyRecord', complianceIdempotencyRecordSchema);
