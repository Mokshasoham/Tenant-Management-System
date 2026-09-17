import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tenant user ID is required'],
      index: true,
    },
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
      required: [true, 'Lease ID is required'],
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
      index: true,
    },
    periodIndex: {
      type: Number,
      required: [true, 'Period index is required'],
      min: 1,
    },
    periodStart: {
      type: Date,
      required: [true, 'Period start date is required'],
    },
    periodEnd: {
      type: Date,
      required: [true, 'Period end date is required'],
    },
    // Overall primary rating (1-5 stars, required)
    overallRating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: 1,
      max: 5,
    },
    // 7 Core Category Ratings (1-5 stars)
    categoryRatings: {
      propertyCondition: { type: Number, min: 1, max: 5 },
      cleanliness: { type: Number, min: 1, max: 5 },
      maintenance: { type: Number, min: 1, max: 5 },
      location: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 },
      safety: { type: Number, min: 1, max: 5 },
      management: { type: Number, min: 1, max: 5 },
    },
    // Conditional Maintenance Questions
    maintenanceFeedback: {
      hadMaintenance: { type: Boolean, default: false },
      responseRating: {
        type: String,
        enum: ['very_slow', 'slow', 'average', 'fast', 'very_fast'],
      },
      repairQuality: {
        type: String,
        enum: ['very_unsatisfied', 'unsatisfied', 'neutral', 'satisfied', 'very_satisfied'],
      },
      communication: {
        type: String,
        enum: ['yes', 'mostly', 'no'],
      },
    },
    // Property-Type Controlled Questions
    propertyType: {
      type: String,
      enum: ['apartment', 'house', 'commercial', 'land', 'room', 'villa', 'studio', 'hostel', 'pg', 'shop'],
    },
    propertyTypeAnswers: {
      waterSupply: { type: Number, min: 1, max: 5 },
      parking: { type: Number, min: 1, max: 5 },
      security: { type: Number, min: 1, max: 5 },
      commonAreas: { type: Number, min: 1, max: 5 },
      neighborhood: { type: Number, min: 1, max: 5 },
      accessibility: { type: Number, min: 1, max: 5 },
      visibility: { type: Number, min: 1, max: 5 },
      powerSupply: { type: Number, min: 1, max: 5 },
      spaceUsability: { type: Number, min: 1, max: 5 },
    },
    // Dynamic amenities ratings (amenity name -> 1-5 rating)
    amenitiesRatings: {
      type: Map,
      of: Number,
      default: {},
    },
    // Open-Ended Feedback (max 1000 chars)
    liked: {
      type: String,
      maxlength: [1000, 'Liked comments cannot exceed 1000 characters'],
      trim: true,
    },
    improvements: {
      type: String,
      maxlength: [1000, 'Improvements comments cannot exceed 1000 characters'],
      trim: true,
    },
    comments: {
      type: String,
      maxlength: [1000, 'Additional comments cannot exceed 1000 characters'],
      trim: true,
    },

    status: {
      type: String,
      enum: ['published', 'hidden', 'flagged'],
      default: 'published',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Database-level duplicate prevention: STRICTLY ONE submission per lease per periodIndex
feedbackSchema.index({ lease: 1, periodIndex: 1 }, { unique: true });

// Performance indexes for public review aggregation and user queries
feedbackSchema.index({ property: 1, status: 1, createdAt: -1 });
feedbackSchema.index({ tenant: 1, createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);
