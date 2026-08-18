import mongoose from 'mongoose';

const managerBankAccountSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumberLast4: {
      type: String,
      required: true,
      trim: true,
    },
    ifsc: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    branch: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed', 'unverified'],
      default: 'pending',
    },
    connectionStatus: {
      type: String,
      enum: ['disconnected', 'connected_pending_verification', 'connected'],
      default: 'connected_pending_verification',
    },
    providerVerificationAvailable: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      default: 'razorpay',
    },
    providerReference: {
      type: String,
      default: null,
    },
    fundAccountId: {
      type: String,
      default: null,
    },
    registeredName: {
      type: String,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

managerBankAccountSchema.index({ manager: 1 });

export default mongoose.model('ManagerBankAccount', managerBankAccountSchema);
