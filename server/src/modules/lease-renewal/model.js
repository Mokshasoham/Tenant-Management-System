import mongoose from 'mongoose';
import { addBaseFields } from '../../platform/models/BaseSchema.js';
import { RenewalStatus } from './constants.js';

const leaseRenewalSchema = new mongoose.Schema(
  {
    lease: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    requestedStartDate: { type: Date, required: true },
    requestedEndDate: { type: Date, required: true },
    duration: { type: String, required: true },
    message: String,
    proposedRent: { type: Number, required: true },
    type: { type: String, enum: ['tenant_request', 'manager_offer'], required: true },
    status: { 
      type: String, 
      enum: Object.values(RenewalStatus), 
      default: RenewalStatus.REQUESTED 
    },
    
    // Enterprise Extensions
    renewalNumber: { type: String, unique: true, required: true },
    renewalVersion: { type: Number, default: 1 },
    previousLease: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease' },
    newLease: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease' },
    counterOffers: [
      {
        proposedRent: Number,
        duration: String,
        message: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FileMetadata' }],
    rejectionReason: String,
    approvalDate: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Enterprise Signatures
    tenantSignature: {
      signatureData: String,
      signedAt: Date,
      ipAddress: String,
      userAgent: String
    },
    managerSignature: {
      signatureData: String,
      signedAt: Date,
      ipAddress: String,
      userAgent: String
    },

    // Conversation messages history
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        senderName: String,
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { 
    timestamps: true,
    versionKey: 'version' // Mongoose built-in optimistic locking via 'version' key
  }
);

addBaseFields(leaseRenewalSchema);

// Optimized compound indexes
leaseRenewalSchema.index({ lease: 1, isDeleted: 1 });
leaseRenewalSchema.index({ tenant: 1, lease: 1, status: 1 });
leaseRenewalSchema.index({ manager: 1, status: 1 });
leaseRenewalSchema.index({ organizationId: 1, renewalNumber: 1 }, { unique: true });

export default mongoose.model('LeaseRenewal', leaseRenewalSchema);
