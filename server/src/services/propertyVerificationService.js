import verificationRepository from '../repositories/verificationRepository.js';
import propertyDocumentService from './propertyDocumentService.js';
import propertyDocumentExtractionService from './propertyDocumentExtractionService.js';
import propertyMatchingService from './propertyMatchingService.js';
import propertyDecisionService from './propertyDecisionService.js';
import { PropertyDevelopmentProvider } from './providers/propertyDevelopmentProvider.js';
import { PropertyProductionProvider } from './providers/propertyProductionProvider.js';
import trustScoreService from './trustScoreService.js';
import Property from '../models/Property.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';

export class PropertyVerificationService {
  constructor() {
    this.devProvider = new PropertyDevelopmentProvider();
    this.prodProvider = new PropertyProductionProvider();
  }

  getProvider() {
    if (config.REAL_PROPERTY_VERIFICATION) {
      this.prodProvider.validateConfig();
      return this.prodProvider;
    }
    return this.devProvider;
  }

  async verifyProperty(verificationId, payload = {}, requesterId = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    const propInfo = verification.propertyVerification || {};

    // 1. Isolated Lock Status Guard
    if (propInfo.lockStatus === 'LOCKED' && propInfo.lockedUntil && new Date() < new Date(propInfo.lockedUntil)) {
      const remainingMinutes = Math.ceil((new Date(propInfo.lockedUntil) - new Date()) / (60 * 1000));
      throw new AppError(
        `Property verification is currently locked due to repeated failures. Please try again in ${remainingMinutes} minutes or contact support.`,
        429
      );
    }

    // 2. Rate-Limiting Attempt Window Check
    const windowHours = config.PROPERTY_VERIFICATION_ATTEMPT_WINDOW_HOURS || 24;
    const maxAttempts = config.PROPERTY_VERIFICATION_MAX_ATTEMPTS || 3;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const recentAttempts = (propInfo.attempts || []).filter(a => new Date(a.timestamp) >= windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      verification.propertyVerification.lockStatus = 'LOCKED';
      verification.propertyVerification.lockedUntil = lockedUntil;
      verification.timeline.push({
        event: 'FLAG_RAISED',
        performedBy: requesterId,
        performedAt: new Date(),
        note: `Property verification locked: Exceeded maximum attempts (${maxAttempts}) within ${windowHours} hours window.`,
      });
      await verification.save();

      throw new AppError(`Exceeded maximum property verification attempts (${maxAttempts}). Locked for ${windowHours} hours.`, 429);
    }

    // 3. Active Verification Idempotency Guard
    if (propInfo.verificationStatus === 'PROCESSING') {
      logger.warn(`[PropertyVerificationService] Duplicate request suppressed for verification ${verificationId} (active operation processing)`);
      return verification;
    }

    // Mark as PROCESSING
    verification.propertyVerification.verificationStatus = 'PROCESSING';
    await verification.save();

    // 4. Validate Document Upload & Input Metadata
    const docType = payload.documentType || propInfo.documentType || 'OWNERSHIP_DEED';
    propertyDocumentService.validateDocumentUpload(docType, payload.file);

    const targetPropertyId = payload.propertyId || verification.entityId;
    const docReference = payload.documentNumber || payload.documentReference || propInfo.documentReference || `PROP-REF-${Date.now()}`;
    const maskedDocRef = propertyDocumentService.maskDocumentReference(docReference);
    const secureReference = propertyDocumentService.generateSecureReference(docType, targetPropertyId);
    const encryptedDocRef = propertyDocumentService.encryptReference(secureReference);

    // 5. Fetch Property Details for Data Matching
    let registeredProperty = {};
    if (targetPropertyId) {
      const property = await Property.findById(targetPropertyId);
      if (property) {
        registeredProperty = {
          ownerName: property.ownerName || property.owner,
          address: property.address || property.location || property.title,
          surveyNumber: property.surveyNumber,
          registrationNumber: property.registrationNumber,
          city: property.city,
          state: property.state,
          pincode: property.pincode,
          propertyType: property.propertyType || property.type,
          area: property.area,
        };
      }
    }

    // 6. Provider Selection & Dispatch
    const provider = this.getProvider();
    const providerPayload = {
      documentType: docType,
      documentNumber: docReference,
      documentReference: secureReference,
      ownerName: registeredProperty.ownerName || payload.ownerName,
      address: registeredProperty.address || payload.address,
      surveyNumber: registeredProperty.surveyNumber || payload.surveyNumber,
      registrationNumber: registeredProperty.registrationNumber || payload.registrationNumber,
      forceFail: payload.forceFail || false,
    };

    let providerResponse;
    try {
      providerResponse = await provider.verifyProperty(providerPayload);
    } catch (pErr) {
      logger.error(`[PropertyVerificationService] Provider execution error: ${pErr.message}`);
      providerResponse = {
        success: false,
        requestId: `PROP-ERR-${Date.now()}`,
        status: 'UNAVAILABLE',
        confidenceScore: 0,
        reason: pErr.message,
      };
    }

    // 7. Extraction, Matching & Decision Evaluation
    const extractedData = propertyDocumentExtractionService.extractPropertyData(providerResponse);
    const matchEvaluation = propertyMatchingService.matchProperty(registeredProperty, extractedData);
    const decision = propertyDecisionService.evaluateDecision(providerResponse, matchEvaluation);

    // 8. Update Property Verification Document in MongoDB
    const attemptNumber = (propInfo.attempts?.length || 0) + 1;
    const attemptRecord = {
      attemptNumber,
      providerRequestId: providerResponse.requestId || `PROP-REQ-${attemptNumber}`,
      status: decision.verificationStatus,
      reason: decision.reason,
      timestamp: new Date(),
    };

    verification.propertyVerification.propertyId = targetPropertyId;
    verification.propertyVerification.documentType = docType;
    verification.propertyVerification.documentReference = secureReference;
    verification.propertyVerification.maskedDocumentReference = maskedDocRef;
    verification.propertyVerification.encryptedDocumentReference = encryptedDocRef;
    verification.propertyVerification.provider = provider.providerName;
    verification.propertyVerification.providerRequestId = providerResponse.requestId;
    verification.propertyVerification.providerStatus = providerResponse.providerStatus || 'COMPLETED';
    verification.propertyVerification.verificationStatus = decision.verificationStatus;
    verification.propertyVerification.confidenceScore = matchEvaluation.confidenceScore;
    verification.propertyVerification.matchResult = matchEvaluation.matchResult;
    verification.propertyVerification.mismatchFields = matchEvaluation.mismatchFields;
    if (decision.verificationStatus === 'VERIFIED') {
      verification.propertyVerification.verifiedAt = new Date();
    }
    if (!Array.isArray(verification.propertyVerification.attempts)) {
      verification.propertyVerification.attempts = [];
    }
    verification.propertyVerification.attempts.push(attemptRecord);

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
      note: `Property verification attempt #${attemptNumber}: ${decision.reason} [Provider: ${provider.providerName}]`,
      metadata: {
        provider: provider.providerName,
        confidenceScore: matchEvaluation.confidenceScore,
        matchResult: matchEvaluation.matchResult,
      },
    });

    await verification.save();

    // 9. Domain Event Emission
    const eventType = decision.verificationStatus === 'VERIFIED'
      ? EventTypes.VERIFICATION.PROPERTY_VERIFIED
      : decision.verificationStatus === 'REVIEW_REQUIRED'
      ? EventTypes.VERIFICATION.PROPERTY_REVIEW_REQUIRED
      : EventTypes.VERIFICATION.PROPERTY_FAILED;

    eventBus.publish(eventType, {
      verificationId: verification._id,
      entityType: verification.entityType,
      entityId: verification.entityId,
      propertyId: targetPropertyId,
      provider: provider.providerName,
      status: decision.verificationStatus,
      confidenceScore: matchEvaluation.confidenceScore,
    });

    // 10. Trust Score Recalculation
    if (decision.verificationStatus === 'VERIFIED') {
      try {
        await trustScoreService.recalculateTrustScore(verification.entityType, verification.entityId, 'PROPERTY_VERIFIED');
      } catch (tsErr) {
        logger.warn(`[PropertyVerificationService] Trust score update warning: ${tsErr.message}`);
      }
    }

    logger.info(`[PropertyVerificationService] Completed property verification for ${verification._id} -> Status: ${decision.verificationStatus}`);

    return verification;
  }

  async getPropertyStatus(verificationId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }
    return verification.propertyVerification || {};
  }

  async unlockPropertyVerification(verificationId, adminUserId, note = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    verification.propertyVerification.lockStatus = 'ADMIN_UNLOCKED';
    verification.propertyVerification.lockedUntil = null;
    verification.timeline.push({
      event: 'FLAG_CLEARED',
      performedBy: adminUserId,
      performedAt: new Date(),
      note: `Admin unlocked property verification. ${note}`,
    });

    await verification.save();
    return verification;
  }
}

export default new PropertyVerificationService();
