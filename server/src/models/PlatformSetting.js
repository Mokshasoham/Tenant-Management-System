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
    // ══ SUBSCRIPTION PLAN CONFIGURATIONS ══
    tenantPlans: {
      free: {
        maxLeases: { type: Number, default: 2 },
        price: { type: Number, default: 0 },
        enabled: { type: Boolean, default: true },
      },
      plus: {
        maxLeases: { type: Number, default: 4 },
        price: { type: Number, default: 499 }, // Default ₹499/mo (configurable by admin)
        enabled: { type: Boolean, default: true },
      },
      pro: {
        maxLeases: { type: Number, default: 999999 }, // Unlimited / 5+
        price: { type: Number, default: 999 }, // Default ₹999/mo (configurable by admin)
        enabled: { type: Boolean, default: true },
      },
    },
    managerPlans: {
      starter: {
        maxProperties: { type: Number, default: 3 },
        price: { type: Number, default: 0 },
        enabled: { type: Boolean, default: true },
      },
      plus: {
        maxProperties: { type: Number, default: 5 },
        price: { type: Number, default: 1499 }, // Default ₹1,499/mo (configurable by admin)
        enabled: { type: Boolean, default: true },
      },
      pro: {
        maxProperties: { type: Number, default: 999999 }, // Unlimited / 6+
        price: { type: Number, default: 2999 }, // Default ₹2,999/mo (configurable by admin)
        enabled: { type: Boolean, default: true },
      },
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
