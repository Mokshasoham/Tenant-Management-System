import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    idNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    occupationStatus: {
      type: String,
      enum: ['employed', 'self-employed', 'student', 'retired', 'other'],
      default: 'other',
    },
    monthlyIncome: {
      type: Number,
      min: 0,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    leases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lease',
      },
    ],
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ email: 1 });
tenantSchema.index({ managedBy: 1 });
tenantSchema.index({ status: 1 });

export default mongoose.model('Tenant', tenantSchema);
