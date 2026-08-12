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
            'AADHAAR_INITIATED',
            'AADHAAR_VERIFIED',
            'AADHAAR_FAILED',
            'AADHAAR_UNLOCKED',
            'PAN_VERIFIED',
            'PAN_MISMATCH',
            'PAN_FAILED',
            'PAN_UNLOCKED',
            'GST_VERIFIED',
            'GST_INACTIVE',
            'GST_FAILED',
            'GST_UNLOCKED',
            'FRAUD_RISK_CALCULATED',
            'FRAUD_CONFIRMED',
            'FRAUD_DISMISSED',
            'FRAUD_UNLOCKED',
            'FRAUD_UNAVAILABLE',
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
        source: { type: String, enum: ['UPLOAD', 'DIGILOCKER'], default: 'UPLOAD' },
        providerDocumentId: { type: String, default: '' },
        providerRequestId: { type: String, default: '' },
        documentHash: { type: String, default: '' },
        retrievedAt: { type: Date, default: null },
      },
    ],

    // DigiLocker Connection & Acquisition Sub-document (Phase 3.6.3)
    digilocker: {
      connected: { type: Boolean, default: false },
      providerUserReference: { type: String, default: '' },
      encryptedAccessToken: { type: String, default: '' },
      encryptedRefreshToken: { type: String, default: '' },
      tokenExpiresAt: { type: Date, default: null },
      connectedAt: { type: Date, default: null },
      lastSyncedAt: { type: Date, default: null },
      consentStatus: {
        type: String,
        enum: ['NONE', 'GRANTED', 'DENIED', 'EXPIRED', 'REVOKED'],
        default: 'NONE',
      },
      revokedAt: { type: Date, default: null },
      documents: [
        {
          providerDocumentId: { type: String, required: true },
          documentType: { type: String, required: true },
          documentName: { type: String, default: '' },
          documentHash: { type: String, default: '' },
          importedAt: { type: Date, default: Date.now },
          verifiedAt: { type: Date, default: null },
          status: { type: String, default: 'IMPORTED' },
        },
      ],
    },

    // Biometric Consent Sub-document (Phase 3.6.4)
    biometricConsent: {
      consentStatus: {
        type: String,
        enum: ['NONE', 'GRANTED', 'DENIED', 'REVOKED', 'EXPIRED', 'RECONSENT_REQUIRED'],
        default: 'NONE',
      },
      consentVersion: { type: String, default: 'v1.0' },
      consentPurpose: { type: String, default: 'Identity Verification & Liveness Audit' },
      grantedAt: { type: Date, default: null },
      revokedAt: { type: Date, default: null },
      ipAddress: { type: String, default: '' },
      retentionExpiresAt: { type: Date, default: null },
    },

    // Real Facial Biometric & Liveness Verification Sub-document (Phase 3.6.4)
    facialVerification: {
      provider: { type: String, enum: ['development', 'production'], default: 'development' },
      providerRequestId: { type: String, default: '' },
      providerStatus: { type: String, default: 'NOT_STARTED' },
      livenessResult: {
        type: String,
        enum: ['NONE', 'LIVE', 'SPOOF_DETECTED', 'REVIEW_REQUIRED', 'FAILED', 'UNAVAILABLE'],
        default: 'NONE',
      },
      livenessConfidence: { type: Number, min: 0, max: 100, default: 0 },
      faceMatchResult: {
        type: String,
        enum: ['NONE', 'MATCH', 'PARTIAL_MATCH', 'MISMATCH', 'UNKNOWN'],
        default: 'NONE',
      },
      faceMatchScore: { type: Number, min: 0, max: 100, default: 0 },
      verificationStatus: {
        type: String,
        enum: ['NOT_STARTED', 'PENDING', 'PROCESSING', 'VERIFIED', 'REVIEW_REQUIRED', 'REJECTED', 'UNAVAILABLE', 'FAILED'],
        default: 'NOT_STARTED',
      },
      confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      metadataRetentionExpiresAt: { type: Date, default: null },
      attempts: [
        {
          attemptNumber: { type: Number, required: true },
          providerRequestId: { type: String, default: '' },
          livenessResult: { type: String, required: true },
          faceMatchResult: { type: String, required: true },
          status: { type: String, required: true },
          reason: { type: String, default: '' },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },

    // Video KYC Consent Sub-document (Phase 3.6.5)
    videoKycConsent: {
      consentStatus: {
        type: String,
        enum: ['NONE', 'GRANTED', 'DENIED', 'REVOKED', 'EXPIRED', 'RECONSENT_REQUIRED'],
        default: 'NONE',
      },
      consentVersion: { type: String, default: 'v1.0' },
      consentPurpose: { type: String, default: 'Live Agent Video KYC & Geolocation Audit' },
      videoRecordingConsent: { type: Boolean, default: false },
      geolocationConsent: { type: Boolean, default: false },
      audioConsent: { type: Boolean, default: false },
      grantedAt: { type: Date, default: null },
      revokedAt: { type: Date, default: null },
      ipAddress: { type: String, default: '' },
      retentionExpiresAt: { type: Date, default: null },
    },

    // Real Video KYC & Agent Assisted Verification Sub-document (Phase 3.6.5)
    videoKycVerification: {
      provider: { type: String, enum: ['development', 'production'], default: 'development' },
      sessionId: { type: String, default: '' },
      encryptedSessionToken: { type: String, default: '' },
      assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      assignedAgentName: { type: String, default: '' },
      sessionStatus: {
        type: String,
        enum: ['NOT_STARTED', 'WAITING_FOR_AGENT', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED'],
        default: 'NOT_STARTED',
      },
      livenessCheckResult: {
        type: String,
        enum: ['NONE', 'PASSED', 'FLAGGED_SPOOF', 'FAILED', 'UNAVAILABLE'],
        default: 'NONE',
      },
      documentMatchResult: {
        type: String,
        enum: ['NONE', 'MATCH', 'MISMATCH', 'UNCLEAR', 'NOT_PRESENTED'],
        default: 'NONE',
      },
      geolocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        city: { type: String, default: '' },
        country: { type: String, default: '' },
        isIpLocationMatched: { type: Boolean, default: true },
        retentionExpiresAt: { type: Date, default: null },
      },
      verificationStatus: {
        type: String,
        enum: ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'VERIFIED', 'REVIEW_REQUIRED', 'REJECTED', 'UNAVAILABLE', 'FAILED'],
        default: 'NOT_STARTED',
      },
      confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
      agentNotes: { type: String, default: '' },
      recordingUrl: { type: String, default: '' },
      isRecordingSaved: { type: Boolean, default: false },
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
      metadataRetentionExpiresAt: { type: Date, default: null },
      mediaRetentionExpiresAt: { type: Date, default: null },
      attempts: [
        {
          attemptNumber: { type: Number, required: true },
          sessionId: { type: String, default: '' },
          agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
          livenessCheckResult: { type: String, required: true },
          documentMatchResult: { type: String, required: true },
          status: { type: String, required: true },
          reason: { type: String, default: '' },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },

    // Real Fraud Detection Engine Sub-document (Phase 3.6.6)
    fraudDetection: {
      provider: { type: String, enum: ['development', 'production'], default: 'development' },
      scanId: { type: String, default: '' },
      evaluationId: { type: String, default: '' },
      correlationId: { type: String, default: '' },
      engineVersion: { type: String, default: 'v1.0' },
      policyVersion: { type: String, default: 'v1.0' },
      signalPolicyVersion: { type: String, default: 'v1.0' },
      riskScore: { type: Number, min: 0, max: 100, default: 0 },
      riskLevel: {
        type: String,
        enum: ['NOT_EVALUATED', 'LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'CRITICAL_RISK', 'UNAVAILABLE'],
        default: 'NOT_EVALUATED',
      },
      decision: {
        type: String,
        enum: ['NOT_STARTED', 'PASSED', 'REVIEW_REQUIRED', 'FRAUD_CONFIRMED', 'FRAUD_DISMISSED', 'UNAVAILABLE'],
        default: 'NOT_STARTED',
      },
      reviewState: {
        type: String,
        enum: ['NONE', 'PENDING_REVIEW', 'UNDER_REVIEW', 'FRAUD_CONFIRMED', 'FRAUD_DISMISSED'],
        default: 'NONE',
      },
      scanStatus: {
        type: String,
        enum: ['NOT_STARTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'NOT_STARTED',
      },
      signals: [
        {
          signalFingerprint: { type: String, required: true },
          signalCode: { type: String, required: true },
          category: { type: String, required: true },
          severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
          scoreImpact: { type: Number, required: true },
          confidence: { type: Number, min: 0, max: 100, default: 100 },
          description: { type: String, required: true },
          evidenceRef: { type: String, default: '' },
          detectedAt: { type: Date, default: Date.now },
        },
      ],
      explanations: [
        {
          ruleCode: { type: String, required: true },
          summary: { type: String, required: true },
          recommendation: { type: String, default: '' },
        },
      ],
      sourcePhaseVersions: {
        identity: { type: String, default: 'v1.0' },
        property: { type: String, default: 'v1.0' },
        digilocker: { type: String, default: 'v1.0' },
        facial: { type: String, default: 'v1.0' },
        videoKyc: { type: String, default: 'v1.0' },
      },
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      reviewLockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewLockedUntil: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
      reviewNotes: { type: String, default: '' },
      scannedAt: { type: Date, default: null },
      metadataRetentionExpiresAt: { type: Date, default: null },
      attempts: [
        {
          attemptNumber: { type: Number, required: true },
          scanId: { type: String, default: '' },
          riskScore: { type: Number, required: true },
          riskLevel: { type: String, required: true },
          decision: { type: String, required: true },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },

    // Global Sanctions, PEP & Adverse Media Screening Sub-document (Phase 3.6.7)
    sanctionScreening: {
      provider: { type: String, enum: ['development', 'production'], default: 'development' },
      scanId: { type: String, default: '' },
      searchCorrelationId: { type: String, default: '' },
      engineVersion: { type: String, default: 'v1.0' },
      listPolicyVersion: { type: String, default: 'v1.0' },
      matchStatus: {
        type: String,
        enum: ['NOT_EVALUATED', 'NO_MATCH', 'POTENTIAL_MATCH', 'CONFIRMED_MATCH', 'DISMISSED_MATCH', 'UNAVAILABLE'],
        default: 'NOT_EVALUATED',
      },
      reviewState: {
        type: String,
        enum: ['NONE', 'PENDING_REVIEW', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'],
        default: 'NONE',
      },
      scanStatus: {
        type: String,
        enum: ['NOT_STARTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'NOT_STARTED',
      },
      highestMatchScore: { type: Number, min: 0, max: 100, default: 0 },
      lastSuccessfulScreenAt: { type: Date, default: null },
      lastSuccessfulMatchStatus: { type: String, default: 'NOT_EVALUATED' },
      lastMonitoringAttemptAt: { type: Date, default: null },
      nextMonitoringAt: { type: Date, default: null },
      matches: [
        {
          matchId: { type: String, required: true },
          evidenceFingerprint: { type: String, required: true },
          matchType: {
            type: String,
            enum: ['SANCTION_MATCH', 'PEP_MATCH', 'RCA_MATCH', 'ADVERSE_MEDIA_MATCH', 'ENFORCEMENT_MATCH'],
            required: true,
          },
          listName: { type: String, required: true },
          matchedName: { type: String, required: true },
          similarityScore: { type: Number, required: true },
          country: { type: String, default: '' },
          anonymizedReference: { type: String, required: true },
          sourceProvider: { type: String, required: true },
          sourceList: { type: String, required: true },
          sourceType: { type: String, required: true },
          sourceRecordReference: { type: String, required: true },
          sourceRetrievedAt: { type: Date, default: Date.now },
          sourcePolicyVersion: { type: String, default: 'v1.0' },
          adverseMediaDetails: {
            sourceName: { type: String, default: '' },
            sourceUrl: { type: String, default: '' },
            publicationDate: { type: Date, default: null },
            entityResolutionConfidence: { type: Number, min: 0, max: 100, default: 0 },
            relevanceConfidence: { type: Number, min: 0, max: 100, default: 0 },
            mediaCategory: { type: String, default: '' },
            classification: {
              type: String,
              enum: ['NONE', 'ALLEGATION', 'INVESTIGATION', 'CHARGE', 'CONVICTION', 'REGULATORY_ACTION', 'CONFIRMED_ENFORCEMENT'],
              default: 'NONE',
            },
          },
          firstSeenAt: { type: Date, default: Date.now },
          lastSeenAt: { type: Date, default: Date.now },
        },
      ],
      reviewHistory: [
        {
          decision: { type: String, enum: ['CONFIRMED', 'DISMISSED'], required: true },
          reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          reviewedByRole: { type: String, default: '' },
          reviewedAt: { type: Date, default: Date.now },
          notes: { type: String, default: '' },
          evidenceFingerprint: { type: String, required: true },
        },
      ],
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      reviewLockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewLockedUntil: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedByRole: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
      reviewNotes: { type: String, default: '' },
      scannedAt: { type: Date, default: null },
      metadataRetentionExpiresAt: { type: Date, default: null },
      attempts: [
        {
          attemptNumber: { type: Number, required: true },
          scanId: { type: String, default: '' },
          matchStatus: { type: String, required: true },
          highestMatchScore: { type: Number, required: true },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },

    // Multi-Engine Evidence Fusion & Synthesis Sub-document (Phase 3.6.8)
    evidenceFusion: {
      synthesisId: { type: String, default: '' },
      correlationId: { type: String, default: '' },
      synthesisFingerprint: { type: String, default: '' },
      engineVersion: { type: String, default: 'v1.0' },
      policyVersion: { type: String, default: 'v1.0' },
      unifiedScore: { type: Number, min: 0, max: 100, default: 0 },
      synthesisStatus: {
        type: String,
        enum: ['NOT_EVALUATED', 'EVALUATED', 'PARTIAL_EVIDENCE', 'CONFLICT_DETECTED', 'UNAVAILABLE', 'FAILED'],
        default: 'NOT_EVALUATED',
      },
      recommendation: {
        type: String,
        enum: ['NOT_STARTED', 'AUTO_APPROVE', 'RECOMMEND_APPROVE', 'RECOMMEND_MANUAL_REVIEW', 'RECOMMEND_REJECT', 'CRITICAL_BLOCK'],
        default: 'NOT_STARTED',
      },
      reviewState: {
        type: String,
        enum: ['NONE', 'PENDING_REVIEW', 'CONFIRMED', 'OVERRIDDEN'],
        default: 'NONE',
      },
      scanStatus: {
        type: String,
        enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
        default: 'NOT_STARTED',
      },
      engineScores: {
        identityScore: { type: Number, default: 0 },
        propertyScore: { type: Number, default: 0 },
        digilockerScore: { type: Number, default: 0 },
        facialScore: { type: Number, default: 0 },
        videoKycScore: { type: Number, default: 0 },
        fraudPenalty: { type: Number, default: 0 },
        sanctionPenalty: { type: Number, default: 0 },
      },
      conflicts: [
        {
          conflictCode: { type: String, required: true },
          severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
          enginesInvolved: [{ type: String }],
          description: { type: String, required: true },
          detectedAt: { type: Date, default: Date.now },
        },
      ],
      sourceSnapshots: {
        identity: { engineVersion: String, policyVersion: String, evaluatedAt: Date, evidenceFingerprint: String, status: String, confidenceScore: Number },
        property: { engineVersion: String, policyVersion: String, evaluatedAt: Date, evidenceFingerprint: String, status: String, confidenceScore: Number },
        digilocker: { engineVersion: String, policyVersion: String, evaluatedAt: Date, evidenceFingerprint: String, status: String },
        facial: { engineVersion: String, policyVersion: String, evaluatedAt: Date, evidenceFingerprint: String, status: String, matchScore: Number },
        videoKyc: { engineVersion: String, policyVersion: String, evaluatedAt: Date, evidenceFingerprint: String, status: String },
        fraud: { engineVersion: String, policyVersion: String, evaluatedAt: Date, evidenceFingerprint: String, riskScore: Number, riskLevel: String },
        sanctions: { engineVersion: String, policyVersion: String, evaluatedAt: Date, evidenceFingerprint: String, matchStatus: String, highestMatchScore: Number },
      },
      reviewHistory: [
        {
          decision: { type: String, enum: ['CONFIRMED', 'OVERRIDDEN'], required: true },
          reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          reviewedByRole: { type: String, default: '' },
          reviewedAt: { type: Date, default: Date.now },
          notes: { type: String, default: '' },
          evidenceFingerprint: { type: String, required: true },
        },
      ],
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedByRole: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
      reviewNotes: { type: String, default: '' },
      synthesizedAt: { type: Date, default: null },
      metadataRetentionExpiresAt: { type: Date, default: null },
    },

    // Verification Compliance Ledger, Recertification & Audit Sub-document (Phase 3.6.9)
    complianceAudit: {
      ledgerSequenceCount: { type: Number, default: 0 },
      latestHash: { type: String, default: '0000000000000000000000000000000000000000000000000000000000000000' },
      recertificationStatus: {
        type: String,
        enum: ['CURRENT', 'RECERTIFICATION_DUE', 'EXPIRED'],
        default: 'CURRENT',
      },
      lastRecertifiedAt: { type: Date, default: null },
      nextRecertificationDueAt: { type: Date, default: null },
      auditPackageReference: { type: String, default: null },
      lastAuditExportAt: { type: Date, default: null },
      syncState: {
        type: String,
        enum: ['HEALTHY', 'DEGRADED_PENDING_RETRY'],
        default: 'HEALTHY',
      },
    },

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

    // Real Property Verification Sub-document (Phase 3.6.2)
    propertyVerification: {
      propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null, index: true },
      documentType: { type: String, default: '' },
      documentReference: { type: String, default: '' },
      maskedDocumentReference: { type: String, default: '' },
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

    // Real Aadhaar Verification Sub-document (Phase 3.6.4)
    // ZERO PLAINTEXT AADHAAR NUMBERS STORED
    aadhaarVerification: {
      provider: { type: String, enum: ['development', 'production'], default: 'development' },
      providerRequestId: { type: String, default: '' },
      maskedAadhaarNumber: { type: String, default: '' },
      encryptedAadhaarReference: { type: String, default: '' },
      verificationStatus: {
        type: String,
        enum: ['NOT_STARTED', 'OTP_SENT', 'VERIFIED', 'FAILED', 'UNAVAILABLE', 'EXPIRED'],
        default: 'NOT_STARTED',
      },
      confidenceScore: { type: Number, min: 0, max: 100, default: null },
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      otpSentAt: { type: Date, default: null },
      otpExpiresAt: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
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

    // Real PAN Verification Sub-document (Phase 3.6.4)
    // ZERO PLAINTEXT PAN NUMBERS STORED
    panVerification: {
      provider: { type: String, enum: ['development', 'production'], default: 'development' },
      providerRequestId: { type: String, default: '' },
      maskedPanNumber: { type: String, default: '' },
      encryptedPanReference: { type: String, default: '' },
      verificationStatus: {
        type: String,
        enum: ['NOT_STARTED', 'PENDING', 'VERIFIED', 'MISMATCH', 'FAILED', 'UNAVAILABLE'],
        default: 'NOT_STARTED',
      },
      confidenceScore: { type: Number, min: 0, max: 100, default: null },
      matchDetails: {
        nameMatched: { type: Boolean, default: false },
        dobMatched: { type: Boolean, default: false },
        panStatus: { type: String, default: 'VALID' },
      },
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
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

    // Real GST Verification Sub-document (Phase 3.6.4)
    // ZERO PLAINTEXT GSTIN STORED (gstin field strictly omitted)
    gstVerification: {
      provider: { type: String, enum: ['development', 'production'], default: 'development' },
      providerRequestId: { type: String, default: '' },
      maskedGstin: { type: String, default: '' },
      encryptedGstReference: { type: String, default: '' },
      verificationStatus: {
        type: String,
        enum: ['NOT_STARTED', 'PENDING', 'VERIFIED', 'INACTIVE', 'FAILED', 'UNAVAILABLE'],
        default: 'NOT_STARTED',
      },
      confidenceScore: { type: Number, min: 0, max: 100, default: null },
      businessDetails: {
        legalName: { type: String, default: '' },
        tradeName: { type: String, default: '' },
        gstinStatus: { type: String, default: 'ACTIVE' },
        taxpayerType: { type: String, default: '' },
        registrationDate: { type: Date, default: null },
      },
      lockStatus: {
        type: String,
        enum: ['NONE', 'LOCKED', 'ADMIN_UNLOCKED'],
        default: 'NONE',
      },
      lockedUntil: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
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
VerificationSchema.index({ 'identityVerification.verificationStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'identityVerification.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'propertyVerification.propertyId': 1, isDeleted: 1 });
VerificationSchema.index({ 'propertyVerification.verificationStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'propertyVerification.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'propertyVerification.providerRequestId': 1, isDeleted: 1 });
VerificationSchema.index({ 'digilocker.providerUserReference': 1, isDeleted: 1 });
VerificationSchema.index({ 'digilocker.consentStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'documents.providerDocumentId': 1, isDeleted: 1 });
VerificationSchema.index({ 'documents.documentHash': 1, isDeleted: 1 });
VerificationSchema.index({ 'facialVerification.verificationStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'facialVerification.livenessResult': 1, isDeleted: 1 });
VerificationSchema.index({ 'facialVerification.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'biometricConsent.consentStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'facialVerification.metadataRetentionExpiresAt': 1, isDeleted: 1 });
VerificationSchema.index({ 'videoKycVerification.verificationStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'videoKycVerification.sessionStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'videoKycVerification.assignedAgentId': 1, isDeleted: 1 });
VerificationSchema.index({ 'videoKycVerification.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'videoKycConsent.consentStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'videoKycVerification.metadataRetentionExpiresAt': 1, isDeleted: 1 });
VerificationSchema.index({ 'fraudDetection.decision': 1, isDeleted: 1 });
VerificationSchema.index({ 'fraudDetection.riskLevel': 1, isDeleted: 1 });
VerificationSchema.index({ 'fraudDetection.riskScore': 1, isDeleted: 1 });
VerificationSchema.index({ 'fraudDetection.scanStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'fraudDetection.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'fraudDetection.metadataRetentionExpiresAt': 1, isDeleted: 1 });
VerificationSchema.index({ 'sanctionScreening.matchStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'sanctionScreening.scanStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'sanctionScreening.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'sanctionScreening.metadataRetentionExpiresAt': 1, isDeleted: 1 });
VerificationSchema.index({ 'evidenceFusion.synthesisStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'evidenceFusion.recommendation': 1, isDeleted: 1 });
VerificationSchema.index({ 'evidenceFusion.unifiedScore': 1, isDeleted: 1 });
VerificationSchema.index({ 'evidenceFusion.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'evidenceFusion.metadataRetentionExpiresAt': 1, isDeleted: 1 });
VerificationSchema.index({ 'aadhaarVerification.verificationStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'aadhaarVerification.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'panVerification.verificationStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'panVerification.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'gstVerification.verificationStatus': 1, isDeleted: 1 });
VerificationSchema.index({ 'gstVerification.lockStatus': 1, isDeleted: 1 });
VerificationSchema.index({ isDeleted: 1 });

export default mongoose.model('Verification', VerificationSchema);
