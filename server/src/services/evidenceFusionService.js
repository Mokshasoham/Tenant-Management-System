import crypto from 'crypto';
import Verification from '../models/Verification.js';
import FusionIdempotencyRecord from '../models/FusionIdempotencyRecord.js';
import evidenceSynthesisEngine from './evidenceSynthesisEngine.js';
import trustScoreService from './trustScoreService.js';
import EventService from './eventService.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';
import logger from '../platform/logging/logger.js';

export class EvidenceFusionService {
  constructor() {
    this.engineVersion = 'v1.0';
    this.policyVersion = 'v1.0';
    this.retentionDays = 90;
    this.maxAttemptsPerWindow = 5;
    this.rateLimitWindowMs = 24 * 60 * 60 * 1000;
  }

  /**
   * Helper: Handle Operation-Aware Idempotency
   */
  async _handleIdempotency(verificationId, operation, idempotencyKey, payload) {
    if (!idempotencyKey) return null;

    const requestHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const existingRecord = await FusionIdempotencyRecord.findOne({
      verificationId,
      operation,
      idempotencyKey,
    });

    if (existingRecord) {
      if (existingRecord.requestHash === requestHash) {
        logger.info(`[EvidenceFusionService] Replay detected for ${operation} key: ${idempotencyKey}`);
        return { isReplay: true, result: existingRecord.resultReference };
      } else {
        logger.warn(`[EvidenceFusionService] Idempotency key collision for ${operation} key: ${idempotencyKey}`);
        throw new AppError('Idempotency key collision with different request payload', 409);
      }
    }

    return { isReplay: false, requestHash };
  }

  /**
   * Helper: Store Idempotency Result
   */
  async _saveIdempotency(verificationId, operation, idempotencyKey, requestHash, resultReference) {
    if (!idempotencyKey || !requestHash) return;
    try {
      await FusionIdempotencyRecord.create({
        verificationId,
        operation,
        idempotencyKey,
        requestHash,
        resultReference,
      });
    } catch (err) {
      logger.warn(`[EvidenceFusionService] Failed to store idempotency record: ${err.message}`);
    }
  }

  /**
   * Core Synthesis Operation: Synthesize Evidence Across All 7 Sub-Engines
   */
  async synthesizeEvidence(verificationId, requesterUser = {}, options = {}) {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    const { idempotencyKey } = options;

    // Idempotency check
    const idempotency = await this._handleIdempotency(verificationId, 'SYNTHESIZE', idempotencyKey, options);
    if (idempotency?.isReplay) {
      return idempotency.result;
    }

    // Initialize sub-document if missing
    if (!verification.evidenceFusion) {
      verification.evidenceFusion = {
        synthesisId: `SYN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        correlationId: options.correlationId || `CORR-${Date.now()}`,
        synthesisFingerprint: '',
        engineVersion: this.engineVersion,
        policyVersion: this.policyVersion,
        unifiedScore: 0,
        synthesisStatus: 'NOT_EVALUATED',
        recommendation: 'NOT_STARTED',
        reviewState: 'NONE',
        scanStatus: 'NOT_STARTED',
        engineScores: { identityScore: 0, propertyScore: 0, digilockerScore: 0, facialScore: 0, videoKycScore: 0, fraudPenalty: 0, sanctionPenalty: 0 },
        conflicts: [],
        sourceSnapshots: {},
        reviewHistory: [],
        lockStatus: 'NONE',
        lockedUntil: null,
        reviewedBy: null,
        reviewedByRole: '',
        reviewedAt: null,
        reviewNotes: '',
        synthesizedAt: null,
        metadataRetentionExpiresAt: null,
      };
    }

    // Lock check
    if (verification.evidenceFusion.lockStatus === 'LOCKED') {
      const lockedUntil = verification.evidenceFusion.lockedUntil;
      if (lockedUntil && new Date() < new Date(lockedUntil)) {
        throw new AppError('Evidence fusion rate limit exceeded. Account locked.', 429);
      }
    }

    // Rate Limiting Check (Max 5 evaluations per 24h)
    const now = new Date();
    const recentAttempts = (verification.evidenceFusion.reviewHistory || []).filter(
      (h) => now.getTime() - new Date(h.reviewedAt).getTime() < this.rateLimitWindowMs
    );
    if (recentAttempts.length >= this.maxAttemptsPerWindow && verification.evidenceFusion.lockStatus !== 'ADMIN_UNLOCKED') {
      verification.evidenceFusion.lockStatus = 'LOCKED';
      verification.evidenceFusion.lockedUntil = new Date(now.getTime() + this.rateLimitWindowMs);
      await verification.save();
      throw new AppError('Evidence fusion rate limit exceeded (Max 5 runs per 24h)', 429);
    }

    // Emit domain event: Synthesis Started
    await EventService.publish({
      type: EventTypes.VERIFICATION.EVIDENCE_SYNTHESIS_STARTED || 'VERIFICATION.EVIDENCE_SYNTHESIS_STARTED',
      payload: { verificationId: verification._id },
      actor: requesterUser.id || 'system',
      actorRole: requesterUser.role || 'system',
      recipient: verification.entityId || verification._id.toString(),
    });

    // Execute synthesis engine
    const synthesisResult = evidenceSynthesisEngine.synthesize(verification);

    // Replay check: Identical fingerprint and policy version yields cached output
    if (
      verification.evidenceFusion.synthesisFingerprint === synthesisResult.synthesisFingerprint &&
      verification.evidenceFusion.policyVersion === this.policyVersion
    ) {
      logger.info(`[EvidenceFusionService] Identical evidence snapshot fingerprint for ${verificationId}, returning cached synthesis.`);
      const resultData = verification.evidenceFusion.toObject ? verification.evidenceFusion.toObject() : verification.evidenceFusion;
      if (idempotencyKey) {
        await this._saveIdempotency(verificationId, 'SYNTHESIZE', idempotencyKey, idempotency.requestHash, resultData);
      }
      return resultData;
    }

    // Update sub-document
    verification.evidenceFusion.synthesisId = `SYN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    verification.evidenceFusion.correlationId = options.correlationId || `CORR-${Date.now()}`;
    verification.evidenceFusion.synthesisFingerprint = synthesisResult.synthesisFingerprint;
    verification.evidenceFusion.engineVersion = this.engineVersion;
    verification.evidenceFusion.policyVersion = this.policyVersion;
    verification.evidenceFusion.unifiedScore = synthesisResult.unifiedScore;
    verification.evidenceFusion.synthesisStatus = synthesisResult.synthesisStatus;
    verification.evidenceFusion.recommendation = synthesisResult.recommendation;
    verification.evidenceFusion.engineScores = synthesisResult.engineScores;
    verification.evidenceFusion.conflicts = synthesisResult.conflicts;
    verification.evidenceFusion.sourceSnapshots = synthesisResult.sourceSnapshots;
    verification.evidenceFusion.scanStatus = 'COMPLETED';
    verification.evidenceFusion.synthesizedAt = now;
    verification.evidenceFusion.metadataRetentionExpiresAt = new Date(now.getTime() + this.retentionDays * 24 * 60 * 60 * 1000);

    if (verification.evidenceFusion.reviewState === 'NONE') {
      verification.evidenceFusion.reviewState = 'PENDING_REVIEW';
    }

    await verification.save();

    // Emit Domain Events
    await EventService.publish({
      type: EventTypes.VERIFICATION.EVIDENCE_SYNTHESIS_COMPLETED || 'VERIFICATION.EVIDENCE_SYNTHESIS_COMPLETED',
      payload: { verificationId: verification._id, unifiedScore: synthesisResult.unifiedScore, recommendation: synthesisResult.recommendation },
      actor: requesterUser.id || 'system',
      actorRole: requesterUser.role || 'system',
      recipient: verification.entityId || verification._id.toString(),
    });

    if (synthesisResult.conflicts.length > 0) {
      await EventService.publish({
        type: EventTypes.VERIFICATION.SYNTHESIS_CONFLICT_DETECTED || 'VERIFICATION.SYNTHESIS_CONFLICT_DETECTED',
        payload: { verificationId: verification._id, conflictsCount: synthesisResult.conflicts.length },
        actor: requesterUser.id || 'system',
        actorRole: requesterUser.role || 'system',
        recipient: verification.entityId || verification._id.toString(),
      });
    }

    await EventService.publish({
      type: EventTypes.VERIFICATION.RECOMMENDATION_GENERATED || 'VERIFICATION.RECOMMENDATION_GENERATED',
      payload: { verificationId: verification._id, recommendation: synthesisResult.recommendation },
      actor: requesterUser.id || 'system',
      actorRole: requesterUser.role || 'system',
      recipient: verification.entityId || verification._id.toString(),
    });

    const finalResult = verification.evidenceFusion.toObject ? verification.evidenceFusion.toObject() : verification.evidenceFusion;
    if (idempotencyKey) {
      await this._saveIdempotency(verificationId, 'SYNTHESIZE', idempotencyKey, idempotency.requestHash, finalResult);
    }

    return finalResult;
  }

  /**
   * Role-Sanitized Retrieval Endpoint
   */
  async getFusionStatus(verificationId, requesterUser = {}) {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    const fusion = verification.evidenceFusion || {};
    const role = requesterUser.role || 'tenant';

    if (role === 'admin' || role === 'manager') {
      return fusion.toObject ? fusion.toObject() : fusion;
    }

    // Role-Sanitized Public Output for tenant / user
    let publicStatus = 'NOT_STARTED';
    if (fusion.synthesisStatus === 'EVALUATED' || fusion.synthesisStatus === 'PARTIAL_EVIDENCE') {
      publicStatus = 'COMPLETED';
    } else if (fusion.synthesisStatus === 'CONFLICT_DETECTED' || fusion.synthesisStatus === 'UNAVAILABLE') {
      publicStatus = 'REVIEW_REQUIRED';
    }

    return {
      publicStatus,
      synthesisStatus: fusion.synthesisStatus || 'NOT_EVALUATED',
      synthesizedAt: fusion.synthesizedAt || null,
    };
  }

  /**
   * Confirm Advisory Recommendation (Admin / Manager)
   */
  async confirmFusionRecommendation(verificationId, requesterUser = {}, payload = {}, idempotencyKey = null) {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    // Admin Lock Check
    if (verification.evidenceFusion?.reviewedByRole === 'admin' && requesterUser.role === 'manager') {
      throw new AppError('Cannot modify decision locked by an Admin', 403);
    }

    const idempotency = await this._handleIdempotency(verificationId, 'CONFIRM', idempotencyKey, payload);
    if (idempotency?.isReplay) {
      return idempotency.result;
    }

    const now = new Date();
    const fp = verification.evidenceFusion?.synthesisFingerprint || 'FINGERPRINT_DEFAULT';

    verification.evidenceFusion.reviewState = 'CONFIRMED';
    verification.evidenceFusion.reviewedBy = requesterUser.id;
    verification.evidenceFusion.reviewedByRole = requesterUser.role;
    verification.evidenceFusion.reviewedAt = now;
    verification.evidenceFusion.reviewNotes = payload.notes || 'Recommendation confirmed by reviewer';

    verification.evidenceFusion.reviewHistory.push({
      decision: 'CONFIRMED',
      reviewedBy: requesterUser.id,
      reviewedByRole: requesterUser.role,
      reviewedAt: now,
      notes: payload.notes || 'Recommendation confirmed',
      evidenceFingerprint: fp,
    });

    await verification.save();

    // Delegate Trust Score recalculation strictly to trustScoreService
    await trustScoreService.recalculateTrustScore(
      verification.entityId,
      verification.entityModel,
      'FUSION_RECOMMENDATION_CONFIRMED'
    );

    // Emit domain event
    await EventService.publish({
      type: EventTypes.VERIFICATION.SYNTHESIS_CONFIRMED || 'VERIFICATION.SYNTHESIS_CONFIRMED',
      payload: { verificationId: verification._id, decision: 'CONFIRMED' },
      actor: requesterUser.id,
      actorRole: requesterUser.role,
      recipient: verification.entityId || verification._id.toString(),
    });

    const resultData = verification.evidenceFusion.toObject ? verification.evidenceFusion.toObject() : verification.evidenceFusion;
    if (idempotencyKey) {
      await this._saveIdempotency(verificationId, 'CONFIRM', idempotencyKey, idempotency.requestHash, resultData);
    }

    return resultData;
  }

  /**
   * Override Advisory Recommendation (Admin / Manager)
   */
  async overrideFusionRecommendation(verificationId, requesterUser = {}, payload = {}, idempotencyKey = null) {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    if (!payload.overrideDecision) {
      throw new AppError('overrideDecision is required', 400);
    }

    // Admin Lock Check
    if (verification.evidenceFusion?.reviewedByRole === 'admin' && requesterUser.role === 'manager') {
      throw new AppError('Cannot modify decision locked by an Admin', 403);
    }

    const idempotency = await this._handleIdempotency(verificationId, 'OVERRIDE', idempotencyKey, payload);
    if (idempotency?.isReplay) {
      return idempotency.result;
    }

    const now = new Date();
    const fp = verification.evidenceFusion?.synthesisFingerprint || 'FINGERPRINT_DEFAULT';

    verification.evidenceFusion.reviewState = 'OVERRIDDEN';
    verification.evidenceFusion.recommendation = payload.overrideDecision;
    verification.evidenceFusion.reviewedBy = requesterUser.id;
    verification.evidenceFusion.reviewedByRole = requesterUser.role;
    verification.evidenceFusion.reviewedAt = now;
    verification.evidenceFusion.reviewNotes = payload.notes || 'Recommendation overridden by reviewer';

    verification.evidenceFusion.reviewHistory.push({
      decision: 'OVERRIDDEN',
      reviewedBy: requesterUser.id,
      reviewedByRole: requesterUser.role,
      reviewedAt: now,
      notes: payload.notes || `Overridden to ${payload.overrideDecision}`,
      evidenceFingerprint: fp,
    });

    await verification.save();

    // Delegate Trust Score recalculation strictly to trustScoreService
    await trustScoreService.recalculateTrustScore(
      verification.entityId,
      verification.entityModel,
      'FUSION_RECOMMENDATION_OVERRIDDEN'
    );

    // Emit domain event
    await EventService.publish({
      type: EventTypes.VERIFICATION.SYNTHESIS_OVERRIDDEN || 'VERIFICATION.SYNTHESIS_OVERRIDDEN',
      payload: { verificationId: verification._id, overrideDecision: payload.overrideDecision },
      actor: requesterUser.id,
      actorRole: requesterUser.role,
      recipient: verification.entityId || verification._id.toString(),
    });

    const resultData = verification.evidenceFusion.toObject ? verification.evidenceFusion.toObject() : verification.evidenceFusion;
    if (idempotencyKey) {
      await this._saveIdempotency(verificationId, 'OVERRIDE', idempotencyKey, idempotency.requestHash, resultData);
    }

    return resultData;
  }

  /**
   * Unlock Evidence Fusion Lock (Admin Only)
   */
  async unlockFusion(verificationId, requesterUser = {}, payload = {}, idempotencyKey = null) {
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    if (requesterUser.role !== 'admin') {
      throw new AppError('Only administrators can unlock evidence fusion', 403);
    }

    const idempotency = await this._handleIdempotency(verificationId, 'UNLOCK', idempotencyKey, payload);
    if (idempotency?.isReplay) {
      return idempotency.result;
    }

    verification.evidenceFusion.lockStatus = 'ADMIN_UNLOCKED';
    verification.evidenceFusion.lockedUntil = null;
    await verification.save();

    await EventService.publish({
      type: EventTypes.VERIFICATION.SYNTHESIS_UNLOCKED || 'VERIFICATION.SYNTHESIS_UNLOCKED',
      payload: { verificationId: verification._id },
      actor: requesterUser.id,
      actorRole: requesterUser.role,
      recipient: verification.entityId || verification._id.toString(),
    });

    const resultData = verification.evidenceFusion.toObject ? verification.evidenceFusion.toObject() : verification.evidenceFusion;
    if (idempotencyKey) {
      await this._saveIdempotency(verificationId, 'UNLOCK', idempotencyKey, idempotency.requestHash, resultData);
    }

    return resultData;
  }

  /**
   * Maintenance Purge Sweeper (Preserves 7-year reviewHistory)
   */
  async purgeExpiredFusionMetadata() {
    const now = new Date();
    const expiredVerifications = await Verification.find({
      'evidenceFusion.metadataRetentionExpiresAt': { $lte: now },
      isDeleted: false,
    });

    let purgedCount = 0;
    for (const v of expiredVerifications) {
      if (v.evidenceFusion) {
        v.evidenceFusion.conflicts = [];
        v.evidenceFusion.sourceSnapshots = {};
        v.evidenceFusion.metadataRetentionExpiresAt = null;
        await v.save();
        purgedCount++;
      }
    }

    logger.info(`[EvidenceFusionService] Purged expired evidence fusion metadata for ${purgedCount} verifications`);
    return purgedCount;
  }
}

export default new EvidenceFusionService();
