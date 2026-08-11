import crypto from 'crypto';
import Verification from '../models/Verification.js';
import SanctionIdempotencyRecord from '../models/SanctionIdempotencyRecord.js';
import { SanctionDevelopmentProvider } from './providers/sanctionDevelopmentProvider.js';
import { SanctionProductionProvider } from './providers/sanctionProductionProvider.js';
import { SanctionMatchEngine } from './sanctionMatchEngine.js';
import config from '../config/config.js';
import { AppError } from '../utils/errorHandling.js';
import EventService from './eventService.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import logger from '../platform/logging/logger.js';
import trustScoreService from './trustScoreService.js';
import fraudSignalService from './fraudSignalService.js';

let _isSanctionMonitoringRunning = false;
let _monitoringMetrics = {
  lastMonitoringRunAt: null,
  lastMonitoringRunStatus: 'IDLE',
  lastMonitoringRunDurationMs: 0,
  lastMonitoringProcessedCount: 0,
  lastMonitoringFailedCount: 0,
};

export class SanctionScreeningService {
  constructor() {
    this.devProvider = new SanctionDevelopmentProvider();
    this.prodProvider = new SanctionProductionProvider();
  }

  _getProvider() {
    return config.REAL_SANCTION_SCREENING ? this.prodProvider : this.devProvider;
  }

  /**
   * Server-side public status mapping for non-admin/manager roles
   */
  static getPublicSanctionStatus(sanctionScreening = {}) {
    const matchStatus = sanctionScreening.matchStatus || 'NOT_EVALUATED';
    if (['POTENTIAL_MATCH', 'CONFIRMED_MATCH', 'DISMISSED_MATCH'].includes(matchStatus)) {
      return 'REVIEW_REQUIRED';
    }
    return matchStatus;
  }

  /**
   * Helper: Check and record idempotency for operations
   */
  async _handleIdempotency(verificationId, operation, idempotencyKey, requestPayload) {
    if (!idempotencyKey) return null;

    const requestHash = crypto.createHash('sha256').update(JSON.stringify(requestPayload || {})).digest('hex');

    const existingRecord = await SanctionIdempotencyRecord.findOne({
      verificationId,
      operation,
      idempotencyKey,
    });

    if (existingRecord) {
      if (existingRecord.requestHash === requestHash) {
        logger.info(`[SanctionScreeningService] Idempotency match for ${operation} key: ${idempotencyKey}`);
        return { isReplay: true, result: existingRecord.resultReference };
      } else {
        logger.warn(`[SanctionScreeningService] Idempotency key collision for ${operation} key: ${idempotencyKey}`);
        throw new AppError('Idempotency key collision with different request payload', 409);
      }
    }

    return { isReplay: false, requestHash };
  }

  async _saveIdempotencyRecord(verificationId, operation, idempotencyKey, requestHash, resultReference) {
    if (!idempotencyKey) return;
    try {
      await SanctionIdempotencyRecord.create({
        verificationId,
        operation,
        idempotencyKey,
        requestHash,
        resultReference,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } catch (err) {
      logger.warn(`[SanctionScreeningService] Error writing idempotency record: ${err.message}`);
    }
  }

  /**
   * Initiates or re-runs Sanctions, PEP & Adverse Media Screening
   */
  async screenEntity(verificationId, requesterUser = {}, options = {}) {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    if (!verification.sanctionScreening) {
      verification.sanctionScreening = {
        provider: 'development',
        scanId: '',
        searchCorrelationId: '',
        engineVersion: 'v1.0',
        listPolicyVersion: 'v1.0',
        matchStatus: 'NOT_EVALUATED',
        reviewState: 'NONE',
        scanStatus: 'NOT_STARTED',
        highestMatchScore: 0,
        lastSuccessfulScreenAt: null,
        lastSuccessfulMatchStatus: 'NOT_EVALUATED',
        lastMonitoringAttemptAt: null,
        nextMonitoringAt: null,
        matches: [],
        reviewHistory: [],
        lockStatus: 'NONE',
        lockedUntil: null,
        reviewLockedBy: null,
        reviewLockedUntil: null,
        reviewedBy: null,
        reviewedByRole: '',
        reviewedAt: null,
        reviewNotes: '',
        scannedAt: null,
        metadataRetentionExpiresAt: null,
        attempts: [],
      };
    }

    const { idempotencyKey, simulationScenario, forceTimeout, forceError } = options;

    // Idempotency check
    const idempotency = await this._handleIdempotency(verificationId, 'SCREEN', idempotencyKey, options);
    if (idempotency?.isReplay) {
      return idempotency.result;
    }

    // Lock check
    if (verification.sanctionScreening?.lockStatus === 'LOCKED') {
      const lockedUntil = verification.sanctionScreening.lockedUntil;
      if (lockedUntil && new Date() < new Date(lockedUntil)) {
        throw new AppError('Sanctions screening attempt limit exceeded. Account locked.', 429);
      }
    }

    // Rate Limiting Attempt window check (max 5 per 24h)
    const attempts = verification.sanctionScreening?.attempts || [];
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAttempts = attempts.filter((a) => new Date(a.timestamp) > windowStart);

    if (recentAttempts.length >= (config.SANCTION_MAX_ATTEMPTS || 5)) {
      verification.sanctionScreening.lockStatus = 'LOCKED';
      verification.sanctionScreening.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await verification.save();
      throw new AppError('Sanctions screening rate limit reached. Attempt lock applied.', 429);
    }

    const provider = this._getProvider();
    const entityData = {
      legalName: verification.applicantName || verification.identityVerification?.documentDetails?.fullName || 'APPLICANT',
      dob: verification.identityVerification?.documentDetails?.dob,
      country: verification.applicantCountry || 'IN',
      entityType: verification.entityType || 'TENANT',
    };

    // Emit SCAN_STARTED
    await EventService.publish({
      type: EventTypes.VERIFICATION.SANCTION_SCAN_STARTED,
      payload: { verificationId: verification._id, entityType: verification.entityType },
      actor: requesterUser.id || 'system',
      actorRole: requesterUser.role || 'system',
      recipient: verification.entityId || verification._id.toString(),
    });

    let rawResult;
    let providerFailed = false;

    try {
      rawResult = await provider.screenEntity(verification._id, entityData, {
        simulationScenario,
        forceTimeout,
        forceError,
      });
    } catch (err) {
      logger.error(`[SanctionScreeningService] Provider screening error: ${err.message}`);
      providerFailed = true;

      // Provider failure: preserve historical CONFIRMED_MATCH or DISMISSED_MATCH if previously set
      const historicalStatus = verification.sanctionScreening?.matchStatus || 'NOT_EVALUATED';
      const preservedMatchStatus = ['CONFIRMED_MATCH', 'DISMISSED_MATCH'].includes(historicalStatus) ? historicalStatus : 'UNAVAILABLE';

      verification.sanctionScreening.scanStatus = 'FAILED';
      verification.sanctionScreening.matchStatus = preservedMatchStatus;
      if (preservedMatchStatus === 'UNAVAILABLE' && !verification.sanctionScreening.lastSuccessfulMatchStatus) {
        verification.sanctionScreening.lastSuccessfulMatchStatus = 'NOT_EVALUATED';
      }
      verification.sanctionScreening.lastMonitoringAttemptAt = new Date();
      verification.sanctionScreening.attempts.push({
        attemptNumber: attempts.length + 1,
        scanId: `FAIL-${Date.now()}`,
        matchStatus: 'UNAVAILABLE',
        highestMatchScore: 0,
        timestamp: new Date(),
      });

      await verification.save();

      await EventService.publish({
        type: EventTypes.VERIFICATION.SANCTION_UNAVAILABLE,
        payload: { verificationId: verification._id, error: err.message },
        actor: requesterUser.id || 'system',
        actorRole: requesterUser.role || 'system',
        recipient: verification.entityId || verification._id.toString(),
      });

      const responsePayload = {
        matchStatus: preservedMatchStatus,
        scanStatus: 'FAILED',
        scannedAt: new Date(),
        lastSuccessfulScreenAt: verification.sanctionScreening.lastSuccessfulScreenAt,
        provider: config.REAL_SANCTION_SCREENING ? 'production' : 'development',
      };

      if (idempotencyKey && idempotency?.requestHash) {
        await this._saveIdempotencyRecord(verificationId, 'SCREEN', idempotencyKey, idempotency.requestHash, responsePayload);
      }

      return responsePayload;
    }

    // Evaluate candidates using Match Engine
    const evalResult = SanctionMatchEngine.evaluateCandidates(entityData, rawResult.matches || []);

    const now = new Date();
    const existingMatches = verification.sanctionScreening?.matches || [];
    const updatedMatches = [];

    let newEvidenceDetected = false;
    let highestScore = evalResult.highestMatchScore;

    for (const newMatch of evalResult.matches) {
      const existing = existingMatches.find((m) => m.evidenceFingerprint === newMatch.evidenceFingerprint);
      if (existing) {
        // Same fingerprint: update lastSeenAt
        existing.lastSeenAt = now;
        updatedMatches.push(existing);
      } else {
        // New fingerprint detected
        newEvidenceDetected = true;
        updatedMatches.push(newMatch);
      }
    }

    // Retain existing matches that weren't in current scan if they are confirmed/dismissed
    for (const oldMatch of existingMatches) {
      if (!updatedMatches.some((m) => m.evidenceFingerprint === oldMatch.evidenceFingerprint)) {
        updatedMatches.push(oldMatch);
      }
    }

    // Determine final matchStatus & reviewState
    let finalMatchStatus = evalResult.matchStatus;
    let finalReviewState = verification.sanctionScreening?.reviewState || 'NONE';

    const previousStatus = verification.sanctionScreening?.matchStatus || 'NOT_EVALUATED';

    if (previousStatus === 'DISMISSED_MATCH') {
      if (newEvidenceDetected) {
        // New fingerprint on dismissed entity ➔ archive previous review and queue for re-review
        if (verification.sanctionScreening.reviewedBy) {
          verification.sanctionScreening.reviewHistory.push({
            decision: 'DISMISSED',
            reviewedBy: verification.sanctionScreening.reviewedBy,
            reviewedByRole: verification.sanctionScreening.reviewedByRole || 'manager',
            reviewedAt: verification.sanctionScreening.reviewedAt || now,
            notes: verification.sanctionScreening.reviewNotes || 'Previous dismissal archived on new evidence',
            evidenceFingerprint: existingMatches[0]?.evidenceFingerprint || 'LEGACY-FINGERPRINT',
          });
        }
        finalMatchStatus = 'POTENTIAL_MATCH';
        finalReviewState = 'PENDING_REVIEW';
      } else {
        // Same fingerprint on dismissed match ➔ remain DISMISSED_MATCH
        finalMatchStatus = 'DISMISSED_MATCH';
        finalReviewState = 'DISMISSED';
      }
    } else if (previousStatus === 'CONFIRMED_MATCH') {
      // Remain CONFIRMED_MATCH
      finalMatchStatus = 'CONFIRMED_MATCH';
      finalReviewState = 'CONFIRMED';
    } else if (finalMatchStatus === 'POTENTIAL_MATCH') {
      finalReviewState = 'PENDING_REVIEW';
    } else if (finalMatchStatus === 'NO_MATCH') {
      finalReviewState = 'NONE';
    }

    verification.sanctionScreening.provider = rawResult.provider;
    verification.sanctionScreening.scanId = rawResult.scanId;
    verification.sanctionScreening.searchCorrelationId = rawResult.searchCorrelationId;
    verification.sanctionScreening.matchStatus = finalMatchStatus;
    verification.sanctionScreening.reviewState = finalReviewState;
    verification.sanctionScreening.scanStatus = 'COMPLETED';
    verification.sanctionScreening.highestMatchScore = highestScore;
    verification.sanctionScreening.lastSuccessfulScreenAt = now;
    verification.sanctionScreening.lastSuccessfulMatchStatus = finalMatchStatus;
    verification.sanctionScreening.lastMonitoringAttemptAt = now;
    verification.sanctionScreening.matches = updatedMatches;
    verification.sanctionScreening.scannedAt = now;
    verification.sanctionScreening.metadataRetentionExpiresAt = new Date(now.getTime() + (config.SANCTION_METADATA_RETENTION_DAYS || 90) * 86400000);
    verification.sanctionScreening.attempts.push({
      attemptNumber: attempts.length + 1,
      scanId: rawResult.scanId,
      matchStatus: finalMatchStatus,
      highestMatchScore: highestScore,
      timestamp: now,
    });

    await verification.save();

    if (finalMatchStatus === 'POTENTIAL_MATCH' && (previousStatus !== 'POTENTIAL_MATCH' || newEvidenceDetected)) {
      await EventService.publish({
        type: EventTypes.VERIFICATION.SANCTION_MATCH_DETECTED,
        payload: { verificationId: verification._id, matchesCount: updatedMatches.length, highestMatchScore: highestScore },
        actor: requesterUser.id || 'system',
        actorRole: requesterUser.role || 'system',
        recipient: verification.entityId || verification._id.toString(),
      });
    }

    const responsePayload = {
      matchStatus: finalMatchStatus,
      scanStatus: 'COMPLETED',
      highestMatchScore: highestScore,
      scannedAt: now,
      lastSuccessfulScreenAt: now,
      provider: rawResult.provider,
    };

    if (idempotencyKey && idempotency?.requestHash) {
      await this._saveIdempotencyRecord(verificationId, 'SCREEN', idempotencyKey, idempotency.requestHash, responsePayload);
    }

    return responsePayload;
  }

  /**
   * Retrieves screening status (Role-sanitized for non-admin/manager roles)
   */
  async getSanctionStatus(verificationId, requesterUser = {}) {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    const sanction = verification.sanctionScreening || {};
    const isElevatedRole = ['admin', 'manager'].includes(requesterUser.role);

    if (!isElevatedRole) {
      // Role-sanitized response for tenant / user
      return {
        publicStatus: SanctionScreeningService.getPublicSanctionStatus(sanction),
        scanStatus: sanction.scanStatus || 'NOT_STARTED',
        scannedAt: sanction.scannedAt || null,
        lastSuccessfulScreenAt: sanction.lastSuccessfulScreenAt || null,
      };
    }

    // Elevated Manager / Admin Response
    return sanction;
  }

  /**
   * Confirms a potential sanction/PEP match (Admin / Manager only)
   */
  async confirmSanctionMatch(verificationId, requesterUser = {}, payload = {}, idempotencyKey = '') {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    // Admin-vs-Manager lock check: Manager cannot override an Admin decision
    if (verification.sanctionScreening?.reviewedByRole === 'admin' && requesterUser.role === 'manager') {
      throw new AppError('Managers cannot override a compliance decision previously rendered by an Administrator', 403);
    }

    const idempotency = await this._handleIdempotency(verificationId, 'CONFIRM', idempotencyKey, payload);
    if (idempotency?.isReplay) {
      return idempotency.result;
    }

    const now = new Date();
    verification.sanctionScreening.matchStatus = 'CONFIRMED_MATCH';
    verification.sanctionScreening.reviewState = 'CONFIRMED';
    verification.sanctionScreening.reviewedBy = requesterUser.id;
    verification.sanctionScreening.reviewedByRole = requesterUser.role;
    verification.sanctionScreening.reviewedAt = now;
    verification.sanctionScreening.reviewNotes = payload.notes || 'Confirmed match by compliance officer';

    // Archive into reviewHistory (retained for 7-year compliance audit trail)
    verification.sanctionScreening.reviewHistory.push({
      decision: 'CONFIRMED',
      reviewedBy: requesterUser.id,
      reviewedByRole: requesterUser.role,
      reviewedAt: now,
      notes: payload.notes || 'Confirmed match',
      evidenceFingerprint: verification.sanctionScreening.matches[0]?.evidenceFingerprint || 'MANUAL-CONFIRM',
    });

    await verification.save();

    // Trigger Trust Score recalculation (SANCTION_FLAG_RAISED)
    await trustScoreService.recalculateTrustScore(
      verification.entityType || 'TENANT',
      verification.entityId || verification._id.toString(),
      'SANCTION_FLAG_RAISED'
    );

    // Extract signals for Fraud Engine
    await fraudSignalService.extractSanctionSignals(verification._id);

    // Publish event
    await EventService.publish({
      type: EventTypes.VERIFICATION.SANCTION_CONFIRMED,
      payload: { verificationId: verification._id, reviewerId: requesterUser.id },
      actor: requesterUser.id || 'system',
      actorRole: requesterUser.role || 'system',
      recipient: verification.entityId || verification._id.toString(),
    });

    const resultPayload = {
      matchStatus: 'CONFIRMED_MATCH',
      reviewState: 'CONFIRMED',
      reviewedAt: now,
    };

    if (idempotencyKey && idempotency?.requestHash) {
      await this._saveIdempotencyRecord(verificationId, 'CONFIRM', idempotencyKey, idempotency.requestHash, resultPayload);
    }

    return resultPayload;
  }

  /**
   * Dismisses a potential match as a false positive (Admin / Manager only)
   */
  async dismissSanctionMatch(verificationId, requesterUser = {}, payload = {}, idempotencyKey = '') {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    // Admin-vs-Manager lock check: Manager cannot override an Admin decision
    if (verification.sanctionScreening?.reviewedByRole === 'admin' && requesterUser.role === 'manager') {
      throw new AppError('Managers cannot override a compliance decision previously rendered by an Administrator', 403);
    }

    const idempotency = await this._handleIdempotency(verificationId, 'DISMISS', idempotencyKey, payload);
    if (idempotency?.isReplay) {
      return idempotency.result;
    }

    const now = new Date();
    verification.sanctionScreening.matchStatus = 'DISMISSED_MATCH';
    verification.sanctionScreening.reviewState = 'DISMISSED';
    verification.sanctionScreening.reviewedBy = requesterUser.id;
    verification.sanctionScreening.reviewedByRole = requesterUser.role;
    verification.sanctionScreening.reviewedAt = now;
    verification.sanctionScreening.reviewNotes = payload.notes || 'Dismissed as false positive';

    // Archive into reviewHistory (retained for 7-year compliance audit trail)
    verification.sanctionScreening.reviewHistory.push({
      decision: 'DISMISSED',
      reviewedBy: requesterUser.id,
      reviewedByRole: requesterUser.role,
      reviewedAt: now,
      notes: payload.notes || 'Dismissed false positive',
      evidenceFingerprint: verification.sanctionScreening.matches[0]?.evidenceFingerprint || 'MANUAL-DISMISS',
    });

    await verification.save();

    // Trigger Trust Score recalculation (SANCTION_FLAG_CLEARED)
    await trustScoreService.recalculateTrustScore(
      verification.entityType || 'TENANT',
      verification.entityId || verification._id.toString(),
      'SANCTION_FLAG_CLEARED'
    );

    // Publish event
    await EventService.publish({
      type: EventTypes.VERIFICATION.SANCTION_DISMISSED,
      payload: { verificationId: verification._id, reviewerId: requesterUser.id },
      actor: requesterUser.id || 'system',
      actorRole: requesterUser.role || 'system',
      recipient: verification.entityId || verification._id.toString(),
    });

    const resultPayload = {
      matchStatus: 'DISMISSED_MATCH',
      reviewState: 'DISMISSED',
      reviewedAt: now,
    };

    if (idempotencyKey && idempotency?.requestHash) {
      await this._saveIdempotencyRecord(verificationId, 'DISMISS', idempotencyKey, idempotency.requestHash, resultPayload);
    }

    return resultPayload;
  }

  /**
   * Resets attempt lock and unlocks screening (Admin only)
   */
  async unlockSanctionScreening(verificationId, requesterUser = {}, payload = {}, idempotencyKey = '') {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    const idempotency = await this._handleIdempotency(verificationId, 'UNLOCK', idempotencyKey, payload);
    if (idempotency?.isReplay) {
      return idempotency.result;
    }

    verification.sanctionScreening.lockStatus = 'ADMIN_UNLOCKED';
    verification.sanctionScreening.lockedUntil = null;
    verification.sanctionScreening.attempts = [];

    await verification.save();

    await EventService.publish({
      type: EventTypes.VERIFICATION.SANCTION_UNLOCKED,
      payload: { verificationId: verification._id, adminId: requesterUser.id },
      actor: requesterUser.id || 'system',
      actorRole: requesterUser.role || 'system',
      recipient: verification.entityId || verification._id.toString(),
    });

    const resultPayload = {
      lockStatus: 'ADMIN_UNLOCKED',
      unlockedAt: new Date(),
    };

    if (idempotencyKey && idempotency?.requestHash) {
      await this._saveIdempotencyRecord(verificationId, 'UNLOCK', idempotencyKey, idempotency.requestHash, resultPayload);
    }

    return resultPayload;
  }

  /**
   * Daily continuous monitoring background sweep
   */
  async runContinuousMonitoring() {
    if (_isSanctionMonitoringRunning) {
      logger.info('[SanctionScreeningService] Continuous monitoring sweep already running. Skipping.');
      return { status: 'SKIPPED_ALREADY_RUNNING' };
    }

    _isSanctionMonitoringRunning = true;
    const startTime = Date.now();
    _monitoringMetrics.lastMonitoringRunAt = new Date(startTime);
    _monitoringMetrics.lastMonitoringRunStatus = 'RUNNING';

    let processedCount = 0;
    let failedCount = 0;

    try {
      // Eligible verifications: active verifications with valid status (DOCUMENTS_UPLOADED excluded intentionally)
      const eligibleVerifications = await Verification.find({
        status: { $in: ['SUBMITTED', 'APPROVED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'] },
        isDeleted: false,
      }).select('_id applicantName applicantCountry entityType entityId sanctionScreening');

      logger.info(`[SanctionScreeningService] Starting continuous monitoring for ${eligibleVerifications.length} verifications`);

      const batchSize = 50;
      for (let i = 0; i < eligibleVerifications.length; i += batchSize) {
        const batch = eligibleVerifications.slice(i, i + batchSize);

        // Batch failure isolation: process each entity in its own try/catch
        await Promise.all(
          batch.map(async (v) => {
            try {
              await this.screenEntity(v._id, { id: 'system', role: 'system' });
              processedCount++;
            } catch (err) {
              failedCount++;
              logger.error(`[SanctionScreeningService] Continuous monitoring failed for ${v._id}: ${err.message}`);
            }
          })
        );

        if (i + batchSize < eligibleVerifications.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const durationMs = Date.now() - startTime;
      _monitoringMetrics.lastMonitoringRunStatus = 'COMPLETED';
      _monitoringMetrics.lastMonitoringRunDurationMs = durationMs;
      _monitoringMetrics.lastMonitoringProcessedCount = processedCount;
      _monitoringMetrics.lastMonitoringFailedCount = failedCount;

      logger.info(`[SanctionScreeningService] Continuous monitoring completed: ${processedCount} processed, ${failedCount} failed in ${durationMs}ms`);

      return {
        status: 'COMPLETED',
        processedCount,
        failedCount,
        durationMs,
      };
    } catch (err) {
      _monitoringMetrics.lastMonitoringRunStatus = 'FAILED';
      logger.error(`[SanctionScreeningService] Continuous monitoring run error: ${err.message}`);
      return { status: 'FAILED', error: err.message };
    } finally {
      _isSanctionMonitoringRunning = false;
    }
  }

  /**
   * Metadata retention purge (purges matches & attempts; excludes reviewHistory)
   */
  async purgeExpiredSanctionMetadata() {
    const now = new Date();
    const expiredVerifications = await Verification.find({
      'sanctionScreening.metadataRetentionExpiresAt': { $lte: now },
      isDeleted: false,
    });

    let purgedCount = 0;
    for (const verification of expiredVerifications) {
      verification.sanctionScreening.matches = [];
      verification.sanctionScreening.attempts = [];
      verification.sanctionScreening.metadataRetentionExpiresAt = null;
      await verification.save();
      purgedCount++;

      await EventService.publish({
        type: EventTypes.VERIFICATION.SANCTION_METADATA_PURGED,
        payload: { verificationId: verification._id },
        actor: 'system',
        actorRole: 'system',
        recipient: verification.entityId || verification._id.toString(),
      });
    }

    logger.info(`[SanctionScreeningService] Purged expired sanction metadata for ${purgedCount} verifications`);
    return { purgedCount };
  }

  getMonitoringMetrics() {
    return { ..._monitoringMetrics };
  }
}

export default new SanctionScreeningService();
