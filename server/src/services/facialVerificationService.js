import verificationRepository from '../repositories/verificationRepository.js';
import Verification from '../models/Verification.js';
import { FacialDevelopmentProvider } from './providers/facialDevelopmentProvider.js';
import { FacialProductionProvider } from './providers/facialProductionProvider.js';
import trustScoreService from './trustScoreService.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';

export class FacialVerificationService {
  constructor() {
    this.devProvider = new FacialDevelopmentProvider();
    this.prodProvider = new FacialProductionProvider();
  }

  getProvider() {
    if (config.REAL_FACIAL_VERIFICATION) {
      this.prodProvider.validateConfig();
      return this.prodProvider;
    }
    return this.devProvider;
  }

  async grantConsent(verificationId, requesterId, ipAddress = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const consentRetentionDays = config.BIOMETRIC_CONSENT_RETENTION_DAYS || 730;
    const retentionExpiresAt = new Date(Date.now() + consentRetentionDays * 24 * 60 * 60 * 1000);

    verification.biometricConsent = {
      consentStatus: 'GRANTED',
      consentVersion: config.CURRENT_BIOMETRIC_CONSENT_VERSION || 'v1.0',
      consentPurpose: config.CURRENT_BIOMETRIC_CONSENT_PURPOSE || 'Identity Verification & Liveness Audit',
      grantedAt: new Date(),
      revokedAt: null,
      ipAddress,
      retentionExpiresAt,
    };

    verification.timeline.push({
      event: 'AUTO_REVIEW_STARTED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: `Explicit biometric processing consent granted [Version: ${verification.biometricConsent.consentVersion}]`,
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.FACIAL_CONSENT_GRANTED, {
      verificationId: verification._id,
      requesterId,
      version: verification.biometricConsent.consentVersion,
    });

    return verification;
  }

  async revokeConsent(verificationId, requesterId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    verification.biometricConsent.consentStatus = 'REVOKED';
    verification.biometricConsent.revokedAt = new Date();

    verification.timeline.push({
      event: 'FLAG_CLEARED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: 'Explicit biometric processing consent revoked by user.',
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.FACIAL_CONSENT_REVOKED, {
      verificationId: verification._id,
      requesterId,
    });

    return verification;
  }

  async verifyFacialBiometrics(verificationId, payload = {}, requesterId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const consent = verification.biometricConsent || {};
    const currentVersion = config.CURRENT_BIOMETRIC_CONSENT_VERSION || 'v1.0';

    // 1. Consent Validation
    if (consent.consentStatus !== 'GRANTED') {
      throw new AppError('Biometric processing consent is required before performing facial verification.', 400);
    }

    // 2. Active Consent Version & Purpose Validation
    if (consent.consentVersion !== currentVersion) {
      verification.biometricConsent.consentStatus = 'RECONSENT_REQUIRED';
      await verification.save();
      throw new AppError(`Biometric consent policy has updated to ${currentVersion}. Re-consent is required before processing.`, 400);
    }

    const facialInfo = verification.facialVerification || {};

    // 3. Isolated Lock Guard
    if (facialInfo.lockStatus === 'LOCKED' && facialInfo.lockedUntil && new Date() < new Date(facialInfo.lockedUntil)) {
      const remainingMinutes = Math.ceil((new Date(facialInfo.lockedUntil) - new Date()) / (60 * 1000));
      throw new AppError(
        `Facial verification is currently locked due to repeated failures. Please try again in ${remainingMinutes} minutes or contact support.`,
        429
      );
    }

    // 4. Rate-Limiting Attempt Window Check
    const windowHours = config.FACIAL_VERIFICATION_ATTEMPT_WINDOW_HOURS || 24;
    const maxAttempts = config.FACIAL_VERIFICATION_MAX_ATTEMPTS || 3;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const recentAttempts = (facialInfo.attempts || []).filter(a => new Date(a.timestamp) >= windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      verification.facialVerification.lockStatus = 'LOCKED';
      verification.facialVerification.lockedUntil = lockedUntil;
      verification.timeline.push({
        event: 'FLAG_RAISED',
        performedBy: requesterId,
        performedAt: new Date(),
        note: `Facial verification locked: Exceeded maximum attempts (${maxAttempts}) within ${windowHours} hours window.`,
      });
      await verification.save();

      throw new AppError(`Exceeded maximum facial verification attempts (${maxAttempts}). Locked for ${windowHours} hours.`, 429);
    }

    // 5. Active Operation Concurrency Guard
    if (verification.facialVerification?.verificationStatus === 'PROCESSING') {
      logger.warn(`[FacialVerificationService] Duplicate request suppressed for verification ${verificationId} (active operation processing)`);
      return verification;
    }

    // Mark as PROCESSING
    verification.facialVerification.verificationStatus = 'PROCESSING';
    await verification.save();

    // 6. Ephemeral Buffer Preparation
    let liveCaptureBuffer = payload.liveCaptureBuffer || Buffer.from('mock_live_capture_stream');
    let referenceImageBuffer = payload.referenceImageBuffer || Buffer.from('mock_reference_photo');

    // 7. Provider Execution
    const provider = this.getProvider();
    let providerResponse;

    try {
      providerResponse = await provider.verifyLivenessAndMatch(liveCaptureBuffer, referenceImageBuffer, {
        forceSpoof: payload.forceSpoof || false,
        forceMismatch: payload.forceMismatch || false,
        forceTimeout: payload.forceTimeout || false,
        forceError: payload.forceError || false,
      });
    } catch (pErr) {
      logger.error(`[FacialVerificationService] Biometric provider execution error: ${pErr.message}`);
      providerResponse = {
        success: false,
        requestId: `FACIAL-ERR-${Date.now()}`,
        status: 'UNAVAILABLE',
        providerStatus: 'SERVICE_ERROR',
        livenessResult: 'UNAVAILABLE',
        livenessConfidence: 0,
        faceMatchResult: 'UNKNOWN',
        faceMatchScore: 0,
        reason: pErr.message,
      };
    } finally {
      // 8. Ephemeral Memory Dereferencing Guarantee (Zero Raw Persistence)
      liveCaptureBuffer = null;
      referenceImageBuffer = null;
    }

    // 9. Decision Evaluation
    let finalStatus = providerResponse.status || 'UNAVAILABLE';
    let reason = providerResponse.reason || 'Facial verification completed';

    if (providerResponse.livenessResult === 'SPOOF_DETECTED') {
      finalStatus = 'REJECTED';
      reason = 'Liveness check failed: Anti-spoofing system detected photo/screen replay';
    } else if (providerResponse.faceMatchResult === 'MISMATCH') {
      finalStatus = 'REVIEW_REQUIRED';
      reason = 'Face match score below required threshold against reference document';
    }

    const attemptNumber = (facialInfo.attempts?.length || 0) + 1;
    const attemptRecord = {
      attemptNumber,
      providerRequestId: providerResponse.requestId || `FACIAL-REQ-${attemptNumber}`,
      livenessResult: providerResponse.livenessResult || 'UNKNOWN',
      faceMatchResult: providerResponse.faceMatchResult || 'UNKNOWN',
      status: finalStatus,
      reason,
      timestamp: new Date(),
    };

    const metadataRetentionDays = config.BIOMETRIC_METADATA_RETENTION_DAYS || 365;
    const metadataRetentionExpiresAt = new Date(Date.now() + metadataRetentionDays * 24 * 60 * 60 * 1000);

    verification.facialVerification.provider = provider.providerName;
    verification.facialVerification.providerRequestId = providerResponse.requestId || `FACIAL-REQ-${Date.now()}`;
    verification.facialVerification.providerStatus = providerResponse.providerStatus || 'COMPLETED';
    verification.facialVerification.livenessResult = providerResponse.livenessResult || 'UNKNOWN';
    verification.facialVerification.livenessConfidence = providerResponse.livenessConfidence || 0;
    verification.facialVerification.faceMatchResult = providerResponse.faceMatchResult || 'UNKNOWN';
    verification.facialVerification.faceMatchScore = providerResponse.faceMatchScore || 0;
    verification.facialVerification.verificationStatus = finalStatus;
    verification.facialVerification.confidenceScore = providerResponse.confidenceScore || 0;
    verification.facialVerification.lockStatus = facialInfo.lockStatus || 'NONE';
    verification.facialVerification.metadataRetentionExpiresAt = metadataRetentionExpiresAt;

    if (finalStatus === 'VERIFIED') {
      verification.facialVerification.verifiedAt = new Date();
    }

    if (!Array.isArray(verification.facialVerification.attempts)) {
      verification.facialVerification.attempts = [];
    }
    verification.facialVerification.attempts.push(attemptRecord);

    if (finalStatus === 'REVIEW_REQUIRED') {
      verification.manualReviewRequired = true;
      verification.status = 'ADMIN_REVIEW';
    }

    verification.timeline.push({
      event: finalStatus === 'VERIFIED' ? 'APPROVED' : (finalStatus === 'REJECTED' ? 'REJECTED' : 'AUTO_REVIEW_STARTED'),
      performedBy: requesterId,
      performedAt: new Date(),
      note: `Facial verification attempt #${attemptNumber}: ${reason} [Liveness: ${providerResponse.livenessResult}, Match: ${providerResponse.faceMatchResult}]`,
    });

    await verification.save();

    // 10. Domain Event Emission
    const eventType = finalStatus === 'VERIFIED'
      ? EventTypes.VERIFICATION.FACIAL_VERIFIED
      : (providerResponse.livenessResult === 'SPOOF_DETECTED'
        ? EventTypes.VERIFICATION.FACIAL_SPOOF_DETECTED
        : (finalStatus === 'REVIEW_REQUIRED'
          ? EventTypes.VERIFICATION.FACIAL_REVIEW_REQUIRED
          : EventTypes.VERIFICATION.FACIAL_FAILED));

    eventBus.publish(eventType, {
      verificationId: verification._id,
      entityType: verification.entityType,
      entityId: verification.entityId,
      provider: provider.providerName,
      status: finalStatus,
      livenessResult: providerResponse.livenessResult,
      faceMatchResult: providerResponse.faceMatchResult,
    });

    // 11. Trust Score Recalculation (Policy Alignment)
    if (finalStatus === 'VERIFIED') {
      try {
        await trustScoreService.recalculateTrustScore(verification.entityType, verification.entityId, 'FACIAL_VERIFIED');
      } catch (tsErr) {
        logger.warn(`[FacialVerificationService] Trust score update warning: ${tsErr.message}`);
      }
    }

    logger.info(`[FacialVerificationService] Completed facial verification for ${verification._id} -> Status: ${finalStatus}`);

    return verification;
  }

  async getStatus(verificationId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }
    return {
      consent: verification.biometricConsent || {},
      facial: verification.facialVerification || {},
    };
  }

  async unlockFacialVerification(verificationId, adminUserId, note = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    verification.facialVerification.lockStatus = 'ADMIN_UNLOCKED';
    verification.facialVerification.lockedUntil = null;
    verification.timeline.push({
      event: 'FLAG_CLEARED',
      performedBy: adminUserId,
      performedAt: new Date(),
      note: `Admin unlocked facial verification. ${note}`,
    });

    await verification.save();
    return verification;
  }

  async purgeExpiredBiometricMetadata() {
    const now = new Date();
    const result = await Verification.updateMany(
      { 'facialVerification.metadataRetentionExpiresAt': { $lte: now } },
      {
        $set: {
          'facialVerification.attempts': [],
          'facialVerification.providerRequestId': 'PURGED',
        },
      }
    );
    logger.info(`[FacialVerificationService] Purged expired biometric metadata for records older than retention policy`);
    return result;
  }
}

export default new FacialVerificationService();
