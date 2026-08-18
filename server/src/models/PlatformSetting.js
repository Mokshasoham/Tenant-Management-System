import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema(
  {
    platformFeeEnabled: {
      type: Boolean,
      default: true,
    },
    platformFeeType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    platformFeePercentage: {
      type: Number,
      default: 1.0, // 1% initial platform fee
      min: 0,
      max: 100,
    },
    platformFeeFixedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformFeePayer: {
      type: String,
      enum: ['tenant', 'manager', 'split'],
      default: 'tenant',
    },
    platformFeeTaxPercentage: {
      type: Number,
      default: 0, // Configurable tax on platform fee
      min: 0,
      max: 100,
    },
    managerCommissionEnabled: {
      type: Boolean,
      default: false,
    },
    managerCommissionPercentage: {
      type: Number,
      default: 0, // 0% initial manager commission
      min: 0,
      max: 100,
    },
    // ══ MAINTENANCE ADD-ON CONFIGURATION ══
    maintenanceFeatureEnabled: {
      type: Boolean,
      default: true,
    },
    maintenanceFeeType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
    },
    maintenanceFee: {
      type: Number,
      default: 500, // Default ₹500/month
      min: 0,
    },
    maintenanceFeeFrequency: {
      type: String,
      enum: ['monthly', 'one_time'],
      default: 'monthly',
    },
    maintenanceTermsVersion: {
      type: String,
      default: '1.0',
    },
    maintenanceTermsContent: {
      type: String,
      default: 'Maintenance & Repairs add-on provides access to professional technician dispatch, maintenance tracking, repair history, and scheduled visits. Normal wear-and-tear repairs are covered subject to property terms.',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);

export default PlatformSetting;
