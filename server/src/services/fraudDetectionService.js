import crypto from 'crypto';
import Verification from '../models/Verification.js';
import FraudIdempotencyRecord from '../models/FraudIdempotencyRecord.js';
import fraudSignalService from './fraudSignalService.js';
import fraudRiskEngine from './fraudRiskEngine.js';
import { FraudDevelopmentProvider } from './providers/fraudDevelopmentProvider.js';
import { FraudProductionProvider } from './providers/fraudProductionProvider.js';
import trustScoreService from './trustScoreService.js';
import EventService from './eventService.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import config from '../config/config.js';
import { AppError } from '../utils/errorHandling.js';
import logger from '../platform/logging/logger.js';

export class FraudDetectionService {
  constructor() {
    this.devProvider = new FraudDevelopmentProvider();
    this.prodProvider = new FraudProductionProvider();
  }

  _getProvider() {
    return config.REAL_FRAUD_DETECTION ? this.prodProvider : this.devProvider;
  }

  /**
   * Helper to check and store operation-aware idempotency records
   */
  async _handleIdempotency(verificationId, operation, idempotencyKey, requestData) {
    if (!idempotencyKey) return null;

    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(requestData || {}))
      .digest('hex');

    const existing = await FraudIdempotencyRecord.findOne({
      verificationId,
      operation,
      idempotencyKey,
    });

    if (existing) {
      logger.info(`[FraudDetectionService] Reusing idempotency record for ${operation}:${idempotencyKey}`);
      return existing.resultReference;
    }

    return { requestHash };
  }

  async _saveIdempotency(verificationId, operation, idempotencyKey, requestHash, resultReference) {
    if (!idempotencyKey) return;

    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h expiration
      await FraudIdempotencyRecord.create({
        verificationId,
        operation,
        idempotencyKey,
        requestHash,
        resultReference,
        expiresAt,
      });
    } catch (err) {
      logger.warn(`[FraudDetectionService] Idempotency record save duplicate ignored: ${err.message}`);
    }
  }

  /**
   * Evaluates fraud risk for a verification record
   */
  async evaluateVerificationFraud(verificationId, requesterId, options = {}, idempotencyKey = null) {
    const cachedResult = await this._handleIdempotency(
      verificationId,
      'EVALUATE',
      idempotencyKey,
      options
    );
    if (cachedResult && !cachedResult.requestHash) {
      return cachedResult;
    }

    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    if (verification.fraudDetection?.lockStatus === 'LOCKED') {
      throw new AppError('Fraud detection is locked for this verification due to excessive attempts', 429);
    }

    // Atomic scan lock: transition to PROCESSING
    const lockedDoc = await Verification.findOneAndUpdate(
      {
        _id: verificationId,
        isDeleted: false,
        'fraudDetection.scanStatus': { $ne: 'PROCESSING' },
      },
      {
        $set: {
          'fraudDetection.scanStatus': 'PROCESSING',
        },
      },
      { new: true }
    );

    if (!lockedDoc) {
      logger.warn(`[FraudDetectionService] Scan already in PROCESSING for ${verificationId}, returning active state`);
      return verification.fraudDetection;
    }

    const evaluationId = `FRD-EVAL-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const correlationId = options.correlationId || `CORR-${Date.now()}`;

    try {
      // 1. Extract signals
      const extractedSignals = await fraudSignalService.extractSignals(verification);

      // 2. Risk Engine Evaluation
      const customThresholds = options.customThresholds || null;
      const riskCalc = fraudRiskEngine.calculateRisk(extractedSignals, customThresholds);

      // 3. Provider Evaluation
      const provider = this._getProvider();
      let providerRes = null;
      let isProviderError = false;

      try {
        providerRes = await provider.evaluateFraudRisk(verificationId, riskCalc.uniqueSignals, {
          ...options,
          forceDocReuse: options.forceDocReuse,
          forceDeepfake: options.forceDeepfake,
          forceTimeout: options.forceTimeout,
          forceError: options.forceError,
        });
      } catch (pErr) {
        logger.error(`[FraudDetectionService] Provider evaluation failed: ${pErr.message}`);
        isProviderError = true;
        if (pErr.statusCode === 500 && config.REAL_FRAUD_DETECTION) {
          throw pErr; // Rethrow missing credentials or configuration error
        }
      }

      const now = Date.now();
      const retentionExpiresAt = new Date(now + config.FRAUD_METADATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      let finalRiskLevel = riskCalc.riskLevel;
      let finalDecision = riskCalc.decision;
      let finalScore = riskCalc.riskScore;

      if (isProviderError) {
        finalRiskLevel = 'UNAVAILABLE';
        finalDecision = 'UNAVAILABLE';
      } else if (providerRes && providerRes.providerRiskScore > finalScore) {
        finalScore = providerRes.providerRiskScore;
        const reCalc = fraudRiskEngine.calculateRisk(riskCalc.uniqueSignals, customThresholds);
        finalRiskLevel = reCalc.riskLevel;
        finalDecision = reCalc.decision;
      }

      // Update Verification Document atomically
      verification.fraudDetection = {
        provider: config.REAL_FRAUD_DETECTION ? 'production' : 'development',
        scanId: providerRes?.providerScanId || `FRD-SCAN-${now}`,
        evaluationId,
        correlationId,
        engineVersion: 'v1.0',
        policyVersion: 'v1.0',
        signalPolicyVersion: 'v1.0',
        riskScore: finalScore,
        riskLevel: finalRiskLevel,
        decision: finalDecision,
        reviewState: finalDecision === 'REVIEW_REQUIRED' ? 'PENDING_REVIEW' : 'NONE',
        scanStatus: 'COMPLETED',
        signals: riskCalc.uniqueSignals,
        explanations: riskCalc.explanations,
        sourcePhaseVersions: {
          identity: 'v1.0',
          property: 'v1.0',
          digilocker: 'v1.0',
          facial: 'v1.0',
          videoKyc: 'v1.0',
        },
        lockStatus: verification.fraudDetection?.lockStatus || 'NONE',
        lockedUntil: null,
        reviewLockedBy: null,
        reviewLockedUntil: null,
        reviewedBy: verification.fraudDetection?.reviewedBy || null,
        reviewedAt: verification.fraudDetection?.reviewedAt || null,
        reviewNotes: verification.fraudDetection?.reviewNotes || '',
        scannedAt: new Date(now),
        metadataRetentionExpiresAt: retentionExpiresAt,
        attempts: [
          ...(verification.fraudDetection?.attempts || []),
          {
            attemptNumber: (verification.fraudDetection?.attempts?.length || 0) + 1,
            scanId: providerRes?.providerScanId || `FRD-SCAN-${now}`,
            riskScore: finalScore,
            riskLevel: finalRiskLevel,
            decision: finalDecision,
            timestamp: new Date(now),
          },
        ],
      };

      // Check Attempt Limit Lock
      if (verification.fraudDetection.attempts.length >= config.FRAUD_MAX_ATTEMPTS) {
        verification.fraudDetection.lockStatus = 'LOCKED';
        verification.fraudDetection.lockedUntil = new Date(now + config.FRAUD_ATTEMPT_WINDOW_HOURS * 60 * 60 * 1000);
      }

      await verification.save();

      // Emit Event
      await EventService.publish({
        recipient: verification.entityId,
        category: 'verification',
        event: finalDecision === 'UNAVAILABLE' ? EventTypes.VERIFICATION.FRAUD_UNAVAILABLE : EventTypes.VERIFICATION.FRAUD_RISK_CALCULATED,
        entityType: verification.entityType,
        entityId: verification.entityId,
        verificationId: verification._id.toString(),
        riskScore: finalScore,
        riskLevel: finalRiskLevel,
        decision: finalDecision,
        evaluationId,
      });

      const resultRef = typeof verification.fraudDetection?.toObject === 'function' ? verification.fraudDetection.toObject() : (verification.fraudDetection || {});
      if (idempotencyKey && cachedResult?.requestHash) {
        await this._saveIdempotency(verificationId, 'EVALUATE', idempotencyKey, cachedResult.requestHash, resultRef);
      }

      return resultRef;
    } catch (err) {
      // Revert scanStatus to FAILED on error
      await Verification.updateOne(
        { _id: verificationId },
        { $set: { 'fraudDetection.scanStatus': 'FAILED' } }
      );
      throw err;
    }
  }

  /**
   * Confirms fraud on a verification record (Manager / Admin Action)
   */
  async confirmFraud(verificationId, reviewerId, notes = '', actorRole = 'manager', idempotencyKey = null) {
    const cachedResult = await this._handleIdempotency(
      verificationId,
      'CONFIRM',
      idempotencyKey,
      { reviewerId, notes }
    );
    if (cachedResult && !cachedResult.requestHash) {
      return cachedResult;
    }

    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    if (verification.fraudDetection?.reviewState === 'FRAUD_CONFIRMED') {
      return verification.fraudDetection;
    }

    // Atomic Review Lock Guard: Prevent collision
    const updated = await Verification.findOneAndUpdate(
      {
        _id: verificationId,
        isDeleted: false,
        'fraudDetection.reviewState': { $in: ['NONE', 'PENDING_REVIEW', 'UNDER_REVIEW'] },
      },
      {
        $set: {
          'fraudDetection.decision': 'FRAUD_CONFIRMED',
          'fraudDetection.reviewState': 'FRAUD_CONFIRMED',
          'fraudDetection.reviewedBy': reviewerId,
          'fraudDetection.reviewedAt': new Date(),
          'fraudDetection.reviewNotes': notes || 'Fraud confirmed by reviewer',
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new AppError('Verification is already reviewed or locked by another reviewer', 409);
    }

    // Recalculate Trust Score ONLY on explicit human confirm decision
    await trustScoreService.recalculateTrustScore(
      updated.entityType,
      updated.entityId,
      'FRAUD_FLAG_RAISED'
    );

    await EventService.publish({
      recipient: updated.entityId,
      category: 'verification',
      event: EventTypes.VERIFICATION.FRAUD_CONFIRMED,
      entityType: updated.entityType,
      entityId: updated.entityId,
      verificationId: updated._id.toString(),
      reviewerId,
      actorRole,
    });

    const resultRef = typeof updated.fraudDetection?.toObject === 'function' ? updated.fraudDetection.toObject() : (updated.fraudDetection || {});
    if (idempotencyKey && cachedResult?.requestHash) {
      await this._saveIdempotency(verificationId, 'CONFIRM', idempotencyKey, cachedResult.requestHash, resultRef);
    }

    return resultRef;
  }

  /**
   * Dismisses fraud risk on a verification record (Manager / Admin Action)
   */
  async dismissFraud(verificationId, reviewerId, notes = '', actorRole = 'manager', idempotencyKey = null) {
    const cachedResult = await this._handleIdempotency(
      verificationId,
      'DISMISS',
      idempotencyKey,
      { reviewerId, notes }
    );
    if (cachedResult && !cachedResult.requestHash) {
      return cachedResult;
    }

    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    if (verification.fraudDetection?.reviewState === 'FRAUD_DISMISSED') {
      return verification.fraudDetection;
    }

    const updated = await Verification.findOneAndUpdate(
      {
        _id: verificationId,
        isDeleted: false,
        'fraudDetection.reviewState': { $in: ['NONE', 'PENDING_REVIEW', 'UNDER_REVIEW', 'FRAUD_CONFIRMED'] },
      },
      {
        $set: {
          'fraudDetection.decision': 'FRAUD_DISMISSED',
          'fraudDetection.reviewState': 'FRAUD_DISMISSED',
          'fraudDetection.reviewedBy': reviewerId,
          'fraudDetection.reviewedAt': new Date(),
          'fraudDetection.reviewNotes': notes || 'Fraud risk dismissed by reviewer',
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new AppError('Unable to update review status', 409);
    }

    // Recalculate Trust Score ONLY on explicit human dismiss decision
    await trustScoreService.recalculateTrustScore(
      updated.entityType,
      updated.entityId,
      'FRAUD_FLAG_CLEARED'
    );

    await EventService.publish({
      recipient: updated.entityId,
      category: 'verification',
      event: EventTypes.VERIFICATION.FRAUD_DISMISSED,
      entityType: updated.entityType,
      entityId: updated.entityId,
      verificationId: updated._id.toString(),
      reviewerId,
      actorRole,
    });

    const resultRef = typeof updated.fraudDetection?.toObject === 'function' ? updated.fraudDetection.toObject() : (updated.fraudDetection || {});
    if (idempotencyKey && cachedResult?.requestHash) {
      await this._saveIdempotency(verificationId, 'DISMISS', idempotencyKey, cachedResult.requestHash, resultRef);
    }

    return resultRef;
  }

  async getFraudStatus(verificationId, userRole = 'tenant') {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false }).select('fraudDetection entityType entityId');
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    const fraud = verification.fraudDetection?.toObject() || {};

    if (userRole === 'tenant' || userRole === 'user') {
      // Non-sensitive status view for end users
      return {
        riskLevel: fraud.riskLevel || 'NOT_EVALUATED',
        decision: fraud.decision || 'NOT_STARTED',
        scanStatus: fraud.scanStatus || 'NOT_STARTED',
        scannedAt: fraud.scannedAt || null,
      };
    }

    return fraud;
  }

  async unlockFraudDetection(verificationId, adminUserId, note = '') {
    const updated = await Verification.findOneAndUpdate(
      { _id: verificationId, isDeleted: false },
      {
        $set: {
          'fraudDetection.lockStatus': 'ADMIN_UNLOCKED',
          'fraudDetection.lockedUntil': null,
          'fraudDetection.attempts': [],
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new AppError('Verification record not found', 404);
    }

    await EventService.publish({
      recipient: updated.entityId,
      category: 'verification',
      event: EventTypes.VERIFICATION.FRAUD_UNLOCKED,
      entityType: updated.entityType,
      entityId: updated.entityId,
      verificationId: updated._id.toString(),
      adminUserId,
      note,
    });

    return updated.fraudDetection;
  }

  async purgeExpiredFraudMetadata() {
    const now = new Date();
    const result = await Verification.updateMany(
      { 'fraudDetection.metadataRetentionExpiresAt': { $lte: now } },
      {
        $set: {
          'fraudDetection.attempts': [],
          'fraudDetection.signals': [],
          'fraudDetection.explanations': [],
        },
      }
    );
    logger.info(`[FraudDetectionService] Purged expired fraud metadata records older than retention policy`);
    return result;
  }
}

export default new FraudDetectionService();
