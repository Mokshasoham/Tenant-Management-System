import mongoose from 'mongoose';

const VerificationWorkflowSchema = new mongoose.Schema(
  {
    workflowType: {
      type: String,
      enum: ['TENANT', 'MANAGER', 'PROPERTY', 'TECHNICIAN', 'VENDOR', 'BROKER'],
      required: true,
      unique: true,
    },
    version: { type: String, default: '1.0' },
    isActive: { type: Boolean, default: true },

    levelsRequired: [{ type: Number }],

    steps: [
      {
        stepKey: { type: String, required: true },
        label: { type: String, required: true },
        description: { type: String, default: '' },
        order: { type: Number, required: true },
        isRequired: { type: Boolean, default: true },
        isEnabled: { type: Boolean, default: true },
        allowSkipInDemo: { type: Boolean, default: false },
        documentTypes: [{ type: String }],
        autoApproveInDemo: { type: Boolean, default: false },
      },
    ],

    trustWeights: {
      identity: { type: Number, default: 30 },
      phone: { type: Number, default: 15 },
      business: { type: Number, default: 20 },
      property: { type: Number, default: 10 },
      reviews: { type: Number, default: 12 },
      noFraud: { type: Number, default: 5 },
      base: { type: Number, default: 8 },
    },

    slaConfig: {
      targetHours: { type: Number, default: 48 },
      atRiskThresholdPercent: { type: Number, default: 80 },
      escalateAfterHours: { type: Number, default: 72 },
    },

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

VerificationWorkflowSchema.index({ workflowType: 1 });
VerificationWorkflowSchema.index({ isDeleted: 1 });

export default mongoose.model('VerificationWorkflow', VerificationWorkflowSchema);
