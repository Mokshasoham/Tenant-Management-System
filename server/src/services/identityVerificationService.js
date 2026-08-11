import verificationRepository from '../repositories/verificationRepository.js';
import identityDocumentService from './identityDocumentService.js';
import identityMatchingService from './identityMatchingService.js';
import identityDecisionService from './identityDecisionService.js';
import { DevelopmentProvider } from './providers/developmentProvider.js';
import { ProductionProvider } from './providers/productionProvider.js';
import trustScoreService from './trustScoreService.js';
import User from '../models/User.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';

export class IdentityVerificationService {
  constructor() {
    this.devProvider = new DevelopmentProvider();
    this.prodProvider = new ProductionProvider();
  }

  getProvider() {
    if (config.REAL_IDENTITY_VERIFICATION) {
      // Adjustment 3: Strict production requirement without mock fallback
      this.prodProvider.validateConfig();
      return this.prodProvider;
    }
    return this.devProvider;
  }

  async verifyIdentity(verificationId, payload = {}, requesterId = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    const identityInfo = verification.identityVerification || {};

    // Adjustment 2: Isolated lockStatus check
    if (identityInfo.lockStatus === 'LOCKED' && identityInfo.lockedUntil && new Date() < new Date(identityInfo.lockedUntil)) {
      const remainingMinutes = Math.ceil((new Date(identityInfo.lockedUntil) - new Date()) / (60 * 1000));
      throw new AppError(
        `Identity verification is currently locked due to repeated failures. Please try again in ${remainingMinutes} minutes or contact support.`,
        429
      );
    }

    // Adjustment 1: Configurable rate limiting and retry window
    const windowHours = config.IDENTITY_VERIFICATION_ATTEMPT_WINDOW_HOURS || 24;
    const maxAttempts = config.IDENTITY_VERIFICATION_MAX_ATTEMPTS || 3;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const recentAttempts = (identityInfo.attempts || []).filter(a => new Date(a.timestamp) >= windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      verification.identityVerification.lockStatus = 'LOCKED';
      verification.identityVerification.lockedUntil = lockedUntil;
      verification.timeline.push({
        event: 'FLAG_RAISED',
        performedBy: requesterId,
        performedAt: new Date(),
        note: `Identity verification locked: Exceeded maximum attempts (${maxAttempts}) within ${windowHours} hours window.`,
      });
      await verification.save();

      throw new AppError(`Exceeded maximum verification attempts (${maxAttempts}). Identity verification has been locked for ${windowHours} hours.`, 429);
    }

    // 1. Validate Document Upload Inputs
    const docType = payload.documentType || identityInfo.documentType || 'GOVT_ID';
    identityDocumentService.validateDocumentUpload(docType, payload.file);

    const docReference = payload.documentNumber || payload.documentReference || identityInfo.documentReference || `ID-REF-${Date.now()}`;
    const maskedDocNumber = identityDocumentService.maskDocumentNumber(docReference);
    const secureReference = identityDocumentService.generateSecureReference(docType, verification.entityId);

    // 2. Fetch User Profile for Data Matching
    let userProfile = {};
    if (verification.entityModel === 'User') {
      const user = await User.findById(verification.entityId).select('firstName lastName email phone dob gender');
      if (user) {
        userProfile = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          dob: user.dob,
          gender: user.gender,
        };
      }
    }

    // 3. Provider Dispatch
    const provider = this.getProvider();
    const providerPayload = {
      documentType: docType,
      documentNumber: docReference,
      documentReference: secureReference,
      name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
      dob: userProfile.dob,
      forceFail: payload.forceFail || false,
    };

    let providerResponse;
    try {
      providerResponse = await provider.verifyIdentity(providerPayload);
    } catch (pErr) {
      logger.error(`[IdentityVerificationService] Provider execution error: ${pErr.message}`);
      providerResponse = {
        success: false,
        requestId: `ERR-${Date.now()}`,
        status: 'UNAVAILABLE',
        confidenceScore: 0,
        reason: pErr.message,
      };
    }

    // 4. Identity Data Matching & Decision Engine
    const matchResult = identityMatchingService.matchIdentity(userProfile, providerResponse.extractedData || providerPayload);
    const decision = identityDecisionService.evaluateDecision(providerResponse, matchResult);

    // 5. Update Verification Document in MongoDB
    const attemptNumber = (identityInfo.attempts?.length || 0) + 1;
    const attemptRecord = {
      attemptNumber,
      providerRequestId: providerResponse.requestId || `REQ-${attemptNumber}`,
      status: decision.verificationStatus,
      reason: decision.reason,
      timestamp: new Date(),
    };

    verification.identityVerification = {
      ...verification.identityVerification,
      documentType: docType,
      documentReference: secureReference,
      maskedDocumentNumber: maskedDocNumber,
      encryptedDocumentReference: Buffer.from(secureReference).toString('base64'),
      provider: provider.providerName,
      providerRequestId: providerResponse.requestId,
      providerStatus: providerResponse.providerStatus || 'COMPLETED',
      verificationStatus: decision.verificationStatus,
      confidenceScore: matchResult.confidenceScore,
      matchResult: matchResult.matchResult,
      mismatchFields: matchResult.mismatchFields,
      lockStatus: identityInfo.lockStatus || 'NONE',
      verifiedAt: decision.verificationStatus === 'VERIFIED' ? new Date() : identityInfo.verifiedAt,
      attempts: [...(identityInfo.attempts || []), attemptRecord],
    };

    // Update global status if appropriate
    if (decision.verificationStatus === 'REVIEW_REQUIRED') {
      verification.manualReviewRequired = true;
      verification.status = 'ADMIN_REVIEW';
    } else if (decision.verificationStatus === 'VERIFIED' && verification.status === 'DRAFT') {
      verification.status = 'SUBMITTED';
    }

    verification.timeline.push({
      event: decision.verificationStatus === 'VERIFIED' ? 'APPROVED' : 'AUTO_REVIEW_STARTED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: `Identity verification attempt #${attemptNumber}: ${decision.reason} [Provider: ${provider.providerName}]`,
      metadata: {
        provider: provider.providerName,
        confidenceScore: matchResult.confidenceScore,
        matchResult: matchResult.matchResult,
      },
    });

    await verification.save();

    // 6. Domain Event Emission
    const eventType = decision.verificationStatus === 'VERIFIED'
      ? EventTypes.VERIFICATION.IDENTITY_VERIFIED
      : decision.verificationStatus === 'REVIEW_REQUIRED'
      ? EventTypes.VERIFICATION.IDENTITY_REVIEW_REQUIRED
      : EventTypes.VERIFICATION.IDENTITY_FAILED;

    eventBus.publish(eventType, {
      verificationId: verification._id,
      entityType: verification.entityType,
      entityId: verification.entityId,
      provider: provider.providerName,
      status: decision.verificationStatus,
      confidenceScore: matchResult.confidenceScore,
    });

    // 7. Trust Score Recalculation Trigger
    if (decision.verificationStatus === 'VERIFIED') {
      try {
        await trustScoreService.recalculateTrustScore(verification.entityType, verification.entityId, 'IDENTITY_VERIFIED');
      } catch (tsErr) {
        logger.warn(`[IdentityVerificationService] Trust score update warning: ${tsErr.message}`);
      }
    }

    logger.info(`[IdentityVerificationService] Completed identity verification for ${verification._id} -> Status: ${decision.verificationStatus}`);

    return verification;
  }

  async getIdentityStatus(verificationId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }
    return verification.identityVerification || {};
  }

  async unlockIdentityVerification(verificationId, adminUserId, note = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    verification.identityVerification.lockStatus = 'ADMIN_UNLOCKED';
    verification.identityVerification.lockedUntil = null;
    verification.timeline.push({
      event: 'FLAG_CLEARED',
      performedBy: adminUserId,
      performedAt: new Date(),
      note: `Admin unlocked identity verification. ${note}`,
    });

    await verification.save();
    return verification;
  }
}

export default new IdentityVerificationService();
