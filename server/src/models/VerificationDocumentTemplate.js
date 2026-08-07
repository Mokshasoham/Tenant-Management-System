import mongoose from 'mongoose';

const VerificationDocumentTemplateSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['IDENTITY', 'BUSINESS', 'EMPLOYMENT', 'PROPERTY', 'FINANCIAL', 'OTHER'],
      required: true,
    },
    applicableEntityTypes: [
      {
        type: String,
        enum: ['TENANT', 'MANAGER', 'PROPERTY', 'TECHNICIAN', 'VENDOR', 'BROKER'],
      },
    ],
    allowedMimeTypes: [{ type: String }],
    maxFileSizeMB: { type: Number, default: 5 },
    maxFiles: { type: Number, default: 1 },
    instructions: { type: String, default: '' },
    sampleUrl: { type: String, default: null },

    // Expiry Engine
    hasExpiry: { type: Boolean, default: false },
    defaultValidityMonths: { type: Number, default: null },
    renewalReminderDaysBefore: { type: Number, default: 30 },

    // Demo Mode & Admin Controls
    demoAutoAccept: { type: Boolean, default: true },
    isEnabled: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  }
);

VerificationDocumentTemplateSchema.index({ documentType: 1 });
VerificationDocumentTemplateSchema.index({ category: 1 });
VerificationDocumentTemplateSchema.index({ isDeleted: 1 });

export default mongoose.model('VerificationDocumentTemplate', VerificationDocumentTemplateSchema);
