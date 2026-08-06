import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'tenant', 'technician', 'user'],
      default: 'tenant',
    },
    technicianProfile: {
      employeeId: { type: String },
      employmentStatus: { type: String, enum: ['active', 'on_leave', 'suspended', 'inactive'], default: 'active' },
      employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'vendor'], default: 'full_time' },
      joiningDate: { type: Date },
      yearsOfExperience: { type: Number, default: 0 },
      maxCapacity: { type: Number, default: 5 },
      skills: [{
        name: String,
        level: { type: String, enum: ['beginner', 'intermediate', 'expert'], default: 'intermediate' },
        stars: { type: Number, min: 1, max: 5, default: 4 },
        yearsExperience: { type: Number, default: 3 },
        lastUsedDate: Date,
        linkedCertification: String
      }],
      certifications: [{
        title: String,
        issuer: String,
        expiryDate: Date,
        certificateUrl: String,
        status: { type: String, enum: ['valid', 'expiring_soon', 'expired', 'pending'], default: 'valid' }
      }],
      documents: [{
        type: { type: String, enum: ['id_card', 'license', 'police_verification', 'insurance', 'training_certificate', 'other'] },
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      availabilityStatus: {
        type: String,
        enum: ['available', 'working', 'travelling', 'break', 'meeting', 'emergency_call', 'on_leave', 'training', 'off_duty', 'free', 'busy', 'offline'],
        default: 'available'
      },
      liveStatus: { type: String, enum: ['online', 'travelling', 'working', 'break', 'off_duty', 'emergency'], default: 'online' },
      shift: { type: String, enum: ['morning', 'afternoon', 'night', 'custom'], default: 'morning' },
      workingDays: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
      workingHours: { start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } },
      territory: {
        assignedBuildings: [String],
        assignedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
        preferredZone: String,
        travelRadiusKm: { type: Number, default: 25 }
      },
      activityTimeline: [{
        title: String,
        time: { type: Date, default: Date.now },
        type: String
      }],
      rating: { type: Number, default: 5.0 },
      firstTimeFixRate: { type: Number, default: 95 },
      reopenedTickets: { type: Number, default: 0 },
      verificationStatus: {
        type: String,
        enum: ['PENDING_INVITATION', 'INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED'],
        default: 'PENDING_INVITATION'
      },
      managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      invitationSentAt: Date,
      activatedAt: Date,
      lastLoginAt: Date,
      invitationToken: String,
      invitationExpires: Date,
      deviceId: String,
      devicePlatform: { type: String, enum: ['ios', 'android', 'web', null], default: null },
      lastKnownLocation: String,
      fcmToken: String,
      pushNotificationEnabled: { type: Boolean, default: false },
      onlineStatus: { type: String, enum: ['online', 'offline', 'unknown'], default: 'unknown' },
      currentLatitude: Number,
      currentLongitude: Number,
      batteryLevel: Number
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    googleId: {
      type: String,
      default: null,
      index: true,
    },
    twoFactorSecret: String,
    kycStatus: {
      type: String,
      enum: ['unverified', 'pending', 'approved', 'rejected'],
      default: 'unverified',
    },
    kycDocuments: [{
      type: String,
    }],
    kycFileIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileMetadata'
    }],
    kycLegacyUrls: [{
      type: String,
    }],
    passwordResetToken: String,
    passwordResetExpires: Date,
    // Profile V2.0 Extended & Versioning Fields (100% Backward Compatible)
    avatarVersion: { type: Number, default: 1 },
    avatarUpdatedAt: { type: Date, default: null },
    preferredName: { type: String, default: '' },
    gender: { type: String, default: '' },
    dob: { type: String, default: '' },
    occupation: { type: String, default: '' },
    nationality: { type: String, default: '' },
    secondaryEmail: { type: String, default: '' },
    alternatePhone: { type: String, default: '' },
    isPhoneVerified: { type: Boolean, default: false },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' }
    },
    address: {
      currentAddress: { type: String, default: '' },
      permanentAddress: { type: String, default: '' },
      country: { type: String, default: '' },
      state: { type: String, default: '' },
      city: { type: String, default: '' },
      postalCode: { type: String, default: '' }
    }
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

/**
 * Post-delete hook: clean up KYC documents, avatar files, and audit records when a user is deleted.
 */
userSchema.post('deleteOne', { document: true, query: false }, async function () {
  try {
    const FileMetadata = mongoose.model('FileMetadata');
    const ProfileAudit = mongoose.model('ProfileAudit');
    const { deleteFileFromStorage } = await import('../services/fileService.js');
    
    // Find all FileMetadata records uploaded by this user (KYC, avatars)
    const relatedFiles = await FileMetadata.find({
      $or: [
        { uploader: this._id },
        { relatedEntity: this._id, relatedModel: 'User' }
      ]
    });
    for (const meta of relatedFiles) {
      const cleanFilename = meta.key ? meta.key.split('/').pop() : meta.filename;
      await deleteFileFromStorage(meta.key, cleanFilename);
      await meta.deleteOne();
    }

    // Clean up ProfileAudit logs for this user
    await ProfileAudit.deleteMany({ userId: this._id });
  } catch (err) {
    console.error('[User.post(deleteOne)] File & Audit cleanup error:', err);
  }
});

export default mongoose.model('User', userSchema);

