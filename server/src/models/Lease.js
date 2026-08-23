import mongoose from 'mongoose';

const leaseSchema = new mongoose.Schema(
  {
    leaseNumber: {
      type: String,
      unique: true,
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    rentAmount: {
      type: Number,
      required: [true, 'Rent amount is required'],
      min: 0,
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateFeePerDay: {
      type: Number,
      default: 100,
      min: 0,
    },
    utilities: {
      water: Boolean,
      electricity: Boolean,
      gas: Boolean,
      internet: Boolean,
    },
    terms: String,
    status: {
      type: String,
      enum: ['active', 'terminated', 'expired', 'pending'],
      default: 'pending',
    },
    leaseDecision: {
      type: String,
      enum: ['pending', 'offer_sent', 'renewal_requested', 'moving_out', 'renewed', 'expired'],
      default: 'pending',
    },
    moveOutStatus: {
      type: String,
      enum: ['none', 'requested', 'inspection_scheduled', 'inspection_completed', 'refund_processing', 'completed'],
      default: 'none',
    },
    // ══ LEASE-SPECIFIC MAINTENANCE ACCESS CONTROL ══
    maintenanceEnabled: {
      type: Boolean,
      default: false,
    },
    maintenanceAccessStatus: {
      type: String,
      enum: ['not_selected', 'included', 'locked', 'unlocked'],
      default: 'not_selected',
    },
    maintenancePlan: {
      type: String,
      enum: ['none', 'included', 'paid_unlock'],
      default: 'none',
    },
    maintenanceFee: {
      type: Number,
      default: 0,
    },
    maintenanceTermsAccepted: {
      type: Boolean,
      default: false,
    },
    maintenanceTermsAcceptedAt: Date,
    maintenanceTermsVersion: String,
    maintenanceUnlockedAt: Date,
    maintenanceUnlockPaymentId: String,
    renewedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
    },
    renewedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
    },
    leaseVersion: {
      type: Number,
      default: 1,
    },
    parentLease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
    },
    lastReminderSent: Date,
    nextReminderDate: Date,
    sentReminders: [{ type: Number }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documents: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMetadata' },
        name: String,
        url: String,
        legacyUrl: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    signature: {
      type: String, // base64 representation of drawing/upload or typed text representation
    },
    signatureType: {
      type: String,
      enum: ['draw', 'type', 'upload'],
    },
    signedBy: {
      type: String,
    },
    signedAt: {
      type: Date,
    },
    tenantSignatureIp: {
      type: String,
    },
    managerSignature: {
      type: String, // base64 representation of manager drawing/upload or typed text
    },
    managerSignatureType: {
      type: String,
      enum: ['draw', 'type', 'upload'],
    },
    managerSignedBy: {
      type: String,
    },
    managerSignedAt: {
      type: Date,
    },
    managerSignatureIp: {
      type: String,
    },
    documentGeneration: {
      status: {
        type: String,
        enum: ['pending', 'generating', 'completed', 'failed'],
        default: 'pending',
      },
      lastAttempt: Date,
      completedAt: Date,
      retryCount: {
        type: Number,
        default: 0,
      },
      lastError: String,
    },
  },
  {
    timestamps: true,
  }
);

leaseSchema.pre('validate', async function (next) {
  if (!this.leaseNumber) {
    const count = await mongoose.model('Lease').countDocuments();
    this.leaseNumber = `LEASE-${Date.now()}-${count + 1}`;
  }
  next();
});

leaseSchema.index({ property: 1 });
leaseSchema.index({ tenant: 1 });
leaseSchema.index({ status: 1 });

/**
 * Post-delete hook: clean up all lease document files from FileMetadata and storage.
 */
leaseSchema.post('deleteOne', { document: true, query: false }, async function () {
  if (this.documents && this.documents.length > 0) {
    try {
      const FileMetadata = mongoose.model('FileMetadata');
      const { deleteFileFromStorage } = await import('../services/fileService.js');
      for (const doc of this.documents) {
        if (doc.fileId) {
          const meta = await FileMetadata.findByIdAndDelete(doc.fileId);
          if (meta) {
            const cleanFilename = meta.key.split('/').pop();
            await deleteFileFromStorage(meta.key, cleanFilename);
          }
        }
      }
      // Also clean up any FileMetadata records where relatedEntity is this lease _id
      const relatedFiles = await FileMetadata.find({ relatedEntity: this._id, relatedModel: 'Lease' });
      for (const meta of relatedFiles) {
        const cleanFilename = meta.key.split('/').pop();
        await deleteFileFromStorage(meta.key, cleanFilename);
        await meta.deleteOne();
      }
    } catch (err) {
      console.error('[Lease.post(deleteOne)] File cleanup error:', err);
    }
  }
});

export default mongoose.model('Lease', leaseSchema);
