import mongoose from 'mongoose';

const VerificationSchema = new mongoose.Schema(
  {
    // Human-readable Verification Number (VRF-YYYY-XXXXXX)
    verificationNumber: {
      type: String,
      unique: true,
      index: true,
      sparse: true, // Drafts before submission may have null
    },

    // Entity Identity
    entityType: {
      type: String,
      enum: ['TENANT', 'MANAGER', 'PROPERTY', 'TECHNICIAN', 'VENDOR', 'BROKER'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityModel: {
      type: String,
      enum: ['User', 'Property'],
      required: true,
    },

    // Workflow Binding
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationWorkflow',
      default: null,
    },
    currentStep: {
      type: String,
      default: '',
    },
    completedSteps: [{ type: String }],

    // Engine Version
    engineVersion: {
      type: String,
      default: 'demo-v1',
    },

    // Submission Versioning
    submissionVersion: {
      type: Number,
      default: 1,
    },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Verification',
      default: null,
    },
    isLatestVersion: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Status Lifecycle
    status: {
      type: String,
      enum: [
        'DRAFT',
        'SUBMITTED',
        'DOCUMENTS_UPLOADED',
        'AUTO_REVIEW',
        'MANAGER_REVIEW',
        'ADMIN_REVIEW',
        'APPROVED',
        'REJECTED',
        'BADGE_ISSUED',
        'SUSPENDED',
        'EXPIRED',
        'RENEWAL_PENDING',
      ],
      default: 'DRAFT',
      index: true,
    },

    // Multi-Level Review State
    reviewLevels: {
      level1: {
        type: { type: String, enum: ['AUTO', 'MANAGER', 'ADMIN'], default: 'AUTO' },
        status: { type: String, enum: ['PENDING', 'PASSED', 'FAILED', 'SKIPPED'], default: 'PENDING' },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        remarks: { type: String, default: '' },
      },
      level2: {
        type: { type: String, enum: ['AUTO', 'MANAGER', 'ADMIN'], default: 'MANAGER' },
        status: { type: String, enum: ['PENDING', 'PASSED', 'FAILED', 'SKIPPED'], default: 'PENDING' },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        remarks: { type: String, default: '' },
      },
      level3: {
        type: { type: String, enum: ['AUTO', 'MANAGER', 'ADMIN'], default: 'ADMIN' },
        status: { type: String, enum: ['PENDING', 'PASSED', 'FAILED', 'SKIPPED'], default: 'PENDING' },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        remarks: { type: String, default: '' },
      },
      currentLevel: { type: Number, default: 1 },
      levelsRequired: [{ type: Number }],
    },

    // Timeline Events
    timeline: [
      {
        event: {
          type: String,
          enum: [
            'DRAFT_CREATED',
            'SUBMITTED',
            'DOCUMENTS_UPLOADED',
            'AUTO_REVIEW_STARTED',
            'AUTO_REVIEW_PASSED',
            'AUTO_REVIEW_FAILED',
            'MANAGER_REVIEW_STARTED',
            'MANAGER_REVIEW_PASSED',
            'MANAGER_REVIEW_FAILED',
            'ADMIN_REVIEW_STARTED',
            'APPROVED',
            'REJECTED',
            'BADGE_ISSUED',
            'TRUST_UPDATED',
            'SUSPENDED',
            'RESUBMITTED',
            'FLAG_RAISED',
            'FLAG_CLEARED',
            'EXPIRY_WARNING',
            'EXPIRED',
            'RENEWAL_SUBMITTED',
          ],
        },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        performedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],

    // Documents Submitted
    documents: [
      {
        templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'VerificationDocumentTemplate', default: null },
        documentType: { type: String, required: true },
        label: { type: String, default: '' },
        isRequired: { type: Boolean, default: true },
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMetadata', default: null },
        filename: { type: String, default: null },
        url: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
        expiryDate: { type: Date, default: null },
        renewalReminderSentAt: { type: Date, default: null },
        renewalStatus: {
          type: String,
          enum: ['NOT_APPLICABLE', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED'],
          default: 'NOT_APPLICABLE',
        },
        daysRemaining: { type: Number, default: null },
        reviewStatus: {
          type: String,
          enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
          default: 'PENDING',
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '' },
      },
    ],

    // Verification Outcome
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verificationRemarks: { type: String, default: '' },
    verifiedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    badgeIssuedAt: { type: Date, default: null },

    // Fraud & Risk Evaluation
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    riskFlags: {
      duplicateIdentity: { type: Boolean, default: false },
      duplicatePhone: { type: Boolean, default: false },
      duplicateEmail: { type: Boolean, default: false },
      duplicateProperty: { type: Boolean, default: false },
      documentExpired: { type: Boolean, default: false },
      documentTampered: { type: Boolean, default: false },
      suspiciousPattern: { type: Boolean, default: false },
    },
    manualReviewRequired: { type: Boolean, default: false, index: true },
    riskEvaluatedAt: { type: Date, default: null },

    // Level & Demo Attributes
    verificationLevel: {
      type: String,
      enum: ['BASIC', 'STANDARD', 'PREMIUM', 'GOVERNMENT_GRADE'],
      default: 'BASIC',
    },
    isDemoVerification: { type: Boolean, default: false },
    demoApprovedBy: { type: String, default: null },

    // Real Identity Verification Sub-document (Phase 3.6.1)
    identityVerification: {
      documentType: { type: String, default: '' },
      documentReference: { type: String, default: '' },
      maskedDocumentNumber: { type: String, default: '' },
      encryptedDocumentReference: { type: String, default: '' },
      provider: { type: String, enum: ['development', 'production'], default: 'development' },
      providerRequestId: { type: String, default: '' },
      providerStatus: { type: String, default: 'NOT_STARTED' },
      verificationStatus: {
        type: String,
        enum: ['NOT_STARTED', 'PENDING', 'PROCESSING', 'VERIFIED', 'REVIEW_REQUIRED', 'REJECTED', 'UNAVAILABLE', 'FAILED'],
        default: 'NOT_STARTED',
      },
      confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
      matchResult: {
        type: String,
        enum: ['NONE', 'MATCH', 'PARTIAL_MATCH', 'MISMATCH', 'UNKNOWN'],
        default: 'NONE',
      },
      mismatchFields: [{ type: String }],
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      attempts: [
        {
          attemptNumber: { type: Number, required: true },
          providerRequestId: { type: String, default: '' },
          status: { type: String, required: true },
          reason: { type: String, default: '' },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },

    // Verification SLA Tracking
    sla: {
      submittedAt: { type: Date, default: null },
      targetReviewAt: { type: Date, default: null },
      reviewStartedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      slaStatus: {
        type: String,
        enum: ['NOT_STARTED', 'ON_TIME', 'AT_RISK', 'OVERDUE'],
        default: 'NOT_STARTED',
        index: true,
      },
      slaHours: { type: Number, default: 48 },
      isOverdue: { type: Boolean, default: false, index: true },
    },

    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for High Performance Querying
VerificationSchema.index({ entityType: 1, entityId: 1, isLatestVersion: 1 });
VerificationSchema.index({ status: 1, manualReviewRequired: 1, isDeleted: 1 });
VerificationSchema.index({ 'reviewLevels.currentLevel': 1, status: 1, isDeleted: 1 });
VerificationSchema.index({ 'sla.slaStatus': 1, 'sla.isOverdue': 1 });
VerificationSchema.index({ isDeleted: 1 });

export default mongoose.model('Verification', VerificationSchema);
