import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
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
    geo: { // Formal 2dsphere index compatibility
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] } // [lng, lat]
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
    media: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMetadata' },
        url: String,
        mediaType: { type: String, enum: ['image', 'video'] },
        key: String, // S3 Bucket Key
        legacyUrl: String
      }
    ],
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

    // Verification & Trust Platform Fields (Phase 3.5 — 100% Backward Compatible)
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'under_review', 'verified', 'rejected', 'expired'],
      default: 'unverified',
    },
    verificationLevel: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      default: 'basic',
    },
    verificationSubmittedAt: { type: Date, default: null },
    verificationApprovedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verificationRemarks: { type: String, default: '' },

    // Saved by users
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'rented'],
      default: 'available',
    },
    bookingType: {
      type: String,
      enum: ['paid', 'free'],
      default: 'paid',
    },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'flexible',
    },
    publishStatus: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    isTest: {
      type: Boolean,
      default: false,
      index: true,
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    seo: {
      title: String,
      description: String,
      keywords: String,
    },
    openGraph: {
      title: String,
      description: String,
      image: String,
    },
    description: String,
    notes: String,
    tags: [String],   // smart badges: 'Best Value', 'Family Choice', etc.
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

propertySchema.virtual('activeLease', {
  ref: 'Lease',
  localField: '_id',
  foreignField: 'property',
  justOne: true,
  match: { status: 'active' }
});

propertySchema.virtual('displayStatus').get(function() {
  if (this.status === 'maintenance') {
    return 'Under Maintenance';
  }

  if (this.status === 'occupied' || this.status === 'rented') {
    // 1. Try to find the active lease
    const activeLease = this.activeLease || this.leases?.find(l => l && l.status === 'active');
    let targetDate = activeLease?.endDate ? new Date(activeLease.endDate) : null;
    
    // 2. If no active lease, try any lease
    if (!targetDate && this.leases && this.leases.length > 0) {
      const sortedLeases = [...this.leases].sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
      if (sortedLeases[0]?.endDate) {
        targetDate = new Date(sortedLeases[0].endDate);
      }
    }
    
    // 3. If still no date, calculate fallback (6 months from property creation)
    if (!targetDate) {
      const baseDate = this.createdAt ? new Date(this.createdAt) : new Date();
      targetDate = new Date(baseDate.getTime() + 180 * 24 * 60 * 60 * 1000);
    }
    
    // 4. If the resolved date is in the past, push it to 30 days from today
    if (targetDate <= new Date()) {
      targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = targetDate.getDate();
    const month = monthNames[targetDate.getMonth()];
    return `Available from ${day} ${month}`;
  }

  return 'Available';
});

propertySchema.index({ owner: 1 });
propertySchema.index({ manager: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ publishStatus: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ 'location.lat': 1, 'location.lng': 1 });
propertySchema.index({ geo: '2dsphere' });
propertySchema.index({ rentAmount: 1 });
propertySchema.index({ city: 1 });

// Slug generation hook
propertySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
      
    if (this.isNew) {
      this.slug += '-' + Math.random().toString(36).substring(2, 8);
    }
  }

  // Auto-sync the geo coordinates if lat/lng are modified manually
  if (this.isModified('location.lat') || this.isModified('location.lng')) {
    this.geo.coordinates = [this.location.lng, this.location.lat];
  }

  // Auto-sync images and videos from media array for frontend/backward compatibility
  if (this.isModified('media')) {
    this.images = this.media.filter(m => m.mediaType === 'image').map(m => m.url);
    this.videos = this.media.filter(m => m.mediaType === 'video').map(m => m.url);
  }

  next();
});

/**
 * Post-delete hook: clean up all property media files from FileMetadata and storage.
 */
propertySchema.post('deleteOne', { document: true, query: false }, async function () {
  try {
    const FileMetadata = mongoose.model('FileMetadata');
    const { deleteFileFromStorage } = await import('../services/fileService.js');
    
    if (this.media && this.media.length > 0) {
      for (const item of this.media) {
        if (item.key) {
          const cleanFilename = item.key.split('/').pop();
          await deleteFileFromStorage(item.key, cleanFilename);
          await FileMetadata.deleteOne({ key: item.key });
        }
      }
    }

    const relatedFiles = await FileMetadata.find({ relatedEntity: this._id, relatedModel: 'Property' });
    for (const meta of relatedFiles) {
      const cleanFilename = meta.key.split('/').pop();
      await deleteFileFromStorage(meta.key, cleanFilename);
      await meta.deleteOne();
    }
  } catch (err) {
    console.error('[Property.post(deleteOne)] File cleanup error:', err);
  }
});

export default mongoose.model('Property', propertySchema);
