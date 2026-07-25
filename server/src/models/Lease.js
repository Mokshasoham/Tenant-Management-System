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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documents: [
      {
        name: String,
        url: String,
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

export default mongoose.model('Lease', leaseSchema);
