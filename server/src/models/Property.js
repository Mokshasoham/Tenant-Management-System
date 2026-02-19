import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },

    // Geo coordinates for map
    location: {
      lat: { type: Number, default: 12.9716 },  // Default: Bangalore
      lng: { type: Number, default: 77.5946 },
    },

    type: {
      type: String,
      enum: ['apartment', 'house', 'commercial', 'land', 'room', 'villa', 'studio'],
      required: true,
    },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    squareFeet: { type: Number, min: 0 },
    floor: Number,
    totalFloors: Number,
    furnishing: {
      type: String,
      enum: ['unfurnished', 'semi-furnished', 'fully-furnished'],
      default: 'unfurnished',
    },

    rentAmount: {
      type: Number,
      required: [true, 'Rent amount is required'],
      min: 0,
    },
    depositAmount: { type: Number, default: 0, min: 0 },
    minRentDuration: { type: Number, default: 1 },        // e.g. 1
    minRentDurationUnit: {
      type: String,
      enum: ['days', 'months', 'years'],
      default: 'months',
    },

    amenities: [String],
    images: [String],
    videos: [String],
    virtualTourUrl: String,

    // Availability calendar — array of booked date-ranges
    bookedDates: [
      {
        startDate: Date,
        endDate: Date,
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
        status: { type: String, enum: ['booked', 'pending'], default: 'pending' },
      },
    ],

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    currentTenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    leases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lease' }],

    // Ratings & reviews summary
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    verifiedBadge: { type: Boolean, default: false },

    // Saved by users
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'rented'],
      default: 'available',
    },
    description: String,
    notes: String,
    tags: [String],   // smart badges: 'Best Value', 'Family Choice', etc.
  },
  { timestamps: true }
);

propertySchema.index({ owner: 1 });
propertySchema.index({ manager: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ 'location.lat': 1, 'location.lng': 1 });
propertySchema.index({ rentAmount: 1 });
propertySchema.index({ city: 1 });

export default mongoose.model('Property', propertySchema);
