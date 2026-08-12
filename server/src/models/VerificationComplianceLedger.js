import mongoose from 'mongoose';

const { Schema } = mongoose;

const verificationComplianceLedgerSchema = new Schema(
  {
    verificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Verification',
      required: true,
      index: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    actorId: {
      type: String,
      default: 'system',
    },
    actorRole: {
      type: String,
      enum: ['admin', 'manager', 'tenant', 'user', 'system'],
      required: true,
    },
    previousHash: {
      type: String,
      required: true,
    },
    currentHash: {
      type: String,
      required: true,
    },
    payloadHash: {
      type: String,
      required: true,
    },
    auditPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    engineVersions: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index enforcing sequential hash chain integrity per verification
verificationComplianceLedgerSchema.index({ verificationId: 1, sequenceNumber: 1 }, { unique: true });
verificationComplianceLedgerSchema.index({ verificationId: 1, timestamp: -1 });

// Prevent direct updates or deletes via Mongoose query middleware (Append-Only Guard)
verificationComplianceLedgerSchema.pre('updateOne', function () {
  throw new Error('[ComplianceLedger] Existing ledger entries are immutable and cannot be updated.');
});
verificationComplianceLedgerSchema.pre('updateMany', function () {
  throw new Error('[ComplianceLedger] Existing ledger entries are immutable and cannot be updated.');
});
verificationComplianceLedgerSchema.pre('findOneAndUpdate', function () {
  throw new Error('[ComplianceLedger] Existing ledger entries are immutable and cannot be updated.');
});
verificationComplianceLedgerSchema.pre('deleteOne', function () {
  throw new Error('[ComplianceLedger] Existing ledger entries are immutable and cannot be deleted.');
});
verificationComplianceLedgerSchema.pre('deleteMany', function () {
  throw new Error('[ComplianceLedger] Existing ledger entries are immutable and cannot be deleted.');
});
verificationComplianceLedgerSchema.pre('findOneAndDelete', function () {
  throw new Error('[ComplianceLedger] Existing ledger entries are immutable and cannot be deleted.');
});

export default mongoose.model('VerificationComplianceLedger', verificationComplianceLedgerSchema);
