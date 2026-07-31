import mongoose from 'mongoose';

const exitFeedbackSchema = new mongoose.Schema(
  {
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
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
    ratings: {
      propertyCondition: { type: Number, min: 1, max: 5, required: true },
      cleanliness: { type: Number, min: 1, max: 5, required: true },
      managerSupport: { type: Number, min: 1, max: 5, required: true },
      maintenanceService: { type: Number, min: 1, max: 5, required: true },
      security: { type: Number, min: 1, max: 5, required: true },
      amenities: { type: Number, min: 1, max: 5, required: true },
      overallExperience: { type: Number, min: 1, max: 5, required: true },
    },
    recommend: { type: Boolean, required: true },
    rentSatisfied: { type: Boolean, required: true },
    maintenanceSatisfied: { type: Boolean, required: true },
    comments: String,
    suggestions: String,
    timeline: [
      {
        event: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
  },
  {
    timestamps: true,
  }
);

exitFeedbackSchema.index({ lease: 1 });
exitFeedbackSchema.index({ property: 1 });

export default mongoose.model('ExitFeedback', exitFeedbackSchema);
