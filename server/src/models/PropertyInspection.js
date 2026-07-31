import mongoose from 'mongoose';

const propertyInspectionSchema = new mongoose.Schema(
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
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    inspectionDate: {
      type: Date,
      required: true,
    },
    inspectionStatus: {
      type: String,
      enum: ['pending', 'scheduled', 'completed'],
      default: 'pending',
    },
    inspectionResult: {
      type: String,
      enum: ['none', 'passed', 'minor_damage', 'major_damage'],
      default: 'none',
    },
    checklist: {
      walls: { type: Boolean, default: false },
      paint: { type: Boolean, default: false },
      furniture: { type: Boolean, default: false },
      kitchen: { type: Boolean, default: false },
      bathroom: { type: Boolean, default: false },
      plumbing: { type: Boolean, default: false },
      electrical: { type: Boolean, default: false },
      windows: { type: Boolean, default: false },
      doors: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
      keysReturned: { type: Boolean, default: false },
      waterReading: { type: String, default: '' },
      electricityReading: { type: String, default: '' },
    },
    beforePhotos: [String],
    damagePhotos: [String],
    afterRepairPhotos: [String],
    notes: String,
    estimatedRepairCost: { type: Number, default: 0 },
    actualRepairCost: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
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
    updatedBy: {
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

propertyInspectionSchema.index({ lease: 1 });
propertyInspectionSchema.index({ property: 1 });

export default mongoose.model('PropertyInspection', propertyInspectionSchema);
