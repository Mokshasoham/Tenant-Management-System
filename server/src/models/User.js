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
      enum: ['admin', 'manager', 'tenant', 'user'],
      default: 'tenant',
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
    // Profile V2.0 Extended Fields (100% Backward Compatible)
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
 * Post-delete hook: clean up KYC documents and avatar files when a user is hard-deleted.
 */
userSchema.post('deleteOne', { document: true, query: false }, async function () {
  try {
    const FileMetadata = mongoose.model('FileMetadata');
    const { deleteFileFromStorage } = await import('../services/fileService.js');
    // Find all FileMetadata records uploaded by this user (KYC, avatars)
    const relatedFiles = await FileMetadata.find({
      $or: [
        { uploader: this._id, category: 'kyc' },
        { relatedEntity: this._id, relatedModel: 'User' }
      ]
    });
    for (const meta of relatedFiles) {
      const cleanFilename = meta.key.split('/').pop();
      await deleteFileFromStorage(meta.key, cleanFilename);
      await meta.deleteOne();
    }
  } catch (err) {
    console.error('[User.post(deleteOne)] File cleanup error:', err);
  }
});

export default mongoose.model('User', userSchema);

