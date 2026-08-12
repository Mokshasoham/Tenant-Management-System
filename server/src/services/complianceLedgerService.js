import crypto from 'crypto';
import mongoose from 'mongoose';
import Verification from '../models/Verification.js';
import VerificationComplianceLedger from '../models/VerificationComplianceLedger.js';
import ComplianceIdempotencyRecord from '../models/ComplianceIdempotencyRecord.js';
import trustScoreService from './trustScoreService.js';
import EventService from './eventService.js';
import EVENT_TYPES from '../platform/events/eventTypes.js';
import logger from '../platform/logging/logger.js';
import { AppError } from '../utils/errorHandling.js';

const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class ComplianceLedgerService {
  /**
   * Calculates deterministic SHA-256 hash for audit entry payload
   */
  _hashPayload(payload) {
    const jsonStr = JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  /**
   * Calculates SHA-256 currentHash for sequential ledger entry
   */
  _calculateCurrentHash(previousHash, verificationId, eventType, timestamp, payloadHash) {
    const raw = `${previousHash}:${verificationId.toString()}:${eventType}:${new Date(timestamp).toISOString()}:${payloadHash}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Operation-level idempotency handler
   */
  async _handleIdempotency(verificationId, operation, options = {}) {
    const idempotencyKey = options.idempotencyKey || options.headers?.['idempotency-key'];
    if (!idempotencyKey) return null;

    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ verificationId: verificationId.toString(), operation, options: options.payload || {} }))
      .digest('hex');

    const existingRecord = await ComplianceIdempotencyRecord.findOne({
      verificationId: verificationId.toString(),
      operation,
      idempotencyKey,
    });

    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        logger.warn(`[ComplianceLedgerService] Idempotency key collision for ${operation} key: ${idempotencyKey}`);
        throw new AppError('Idempotency key collision: Reused key with modified request parameters', 409);
      }
      logger.info(`[ComplianceLedgerService] Replay detected for ${operation} key: ${idempotencyKey}`);
      return { isReplay: true, result: existingRecord.resultReference };
    }

    return { idempotencyKey, requestHash };
  }

  /**
   * Sanitize & allowlist server-constructed audit payload (No PII / credentials / binaries)
   */
  _constructAllowlistedPayload(verification, eventType, metadata = {}) {
    return {
      verificationId: verification._id.toString(),
      eventType,
      applicantId: verification.entityId ? verification.entityId.toString() : '',
      applicantModel: verification.entityModel || 'User',
      globalStatus: verification.status,
      recertificationStatus: verification.complianceAudit?.recertificationStatus || 'CURRENT',
      engineVersions: {
        identity: verification.identityVerification?.engineVersion || 'v1.0',
        property: verification.propertyVerification?.engineVersion || 'v1.0',
        facial: verification.facialVerification?.engineVersion || 'v1.0',
        videoKyc: verification.videoKycVerification?.engineVersion || 'v1.0',
        fraud: verification.fraudDetection?.engineVersion || 'v1.0',
        sanctions: verification.sanctionScreening?.engineVersion || 'v1.0',
        fusion: verification.evidenceFusion?.engineVersion || 'v1.0',
      },
      summaryMetadata: {
        manualReviewRequired: verification.manualReviewRequired || false,
        riskScore: verification.riskScore || 0,
        fusionScore: verification.evidenceFusion?.unifiedScore || 0,
        fusionRecommendation: verification.evidenceFusion?.recommendation || 'NOT_STARTED',
        customContext: metadata.context || '',
      },
    };
  }

  /**
   * Appends an immutable, cryptographically chained audit log entry to the ledger
   */
  async appendAuditEntry(verificationId, eventType, actor = {}, options = {}) {
    if (!verificationId || !mongoose.Types.ObjectId.isValid(verificationId)) {
      throw new AppError('Invalid verification ID format', 400);
    }

    const idempotencyCheck = await this._handleIdempotency(verificationId, 'LOG_AUDIT', options);
    if (idempotencyCheck?.isReplay) {
      return idempotencyCheck.result;
    }

    const actorId = actor.id || actor._id || 'system';
    const actorRole = actor.role || 'system';

    // Fetch verification record
    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    if (!verification.complianceAudit) {
      verification.complianceAudit = {
        ledgerSequenceCount: 0,
        latestHash: GENESIS_PREVIOUS_HASH,
        recertificationStatus: 'CURRENT',
        syncState: 'HEALTHY',
      };
    }

    try {
      // Atomic increment of sequence count on Verification sub-document
      const updatedDoc = await Verification.findOneAndUpdate(
        { _id: verificationId },
        { $inc: { 'complianceAudit.ledgerSequenceCount': 1 } },
        { new: true }
      );

      const sequenceNumber = updatedDoc.complianceAudit.ledgerSequenceCount;

      // Get latest previousHash from the highest existing sequence entry or genesis hash
      const lastLedgerEntry = await VerificationComplianceLedger.findOne({ verificationId })
        .sort({ sequenceNumber: -1 })
        .lean();

      const previousHash = lastLedgerEntry ? lastLedgerEntry.currentHash : GENESIS_PREVIOUS_HASH;
      const timestamp = new Date();

      // Construct server-sanitized allowlisted audit payload
      const auditPayload = this._constructAllowlistedPayload(verification, eventType, options.metadata);
      const payloadHash = this._hashPayload(auditPayload);
      const currentHash = this._calculateCurrentHash(previousHash, verificationId, eventType, timestamp, payloadHash);

      // Create immutable ledger entry
      const ledgerEntry = await VerificationComplianceLedger.create({
        verificationId,
        sequenceNumber,
        eventType,
        actorId: actorId.toString(),
        actorRole,
        previousHash,
        currentHash,
        payloadHash,
        auditPayload,
        engineVersions: auditPayload.engineVersions,
        timestamp,
      });

      // Update Verification sub-document latest hash and sync state
      verification.complianceAudit.latestHash = currentHash;
      verification.complianceAudit.syncState = 'HEALTHY';
      await verification.save();

      const result = {
        sequenceNumber,
        eventType,
        currentHash,
        previousHash,
        timestamp,
      };

      if (idempotencyCheck?.idempotencyKey) {
        await ComplianceIdempotencyRecord.create({
          verificationId: verificationId.toString(),
          operation: 'LOG_AUDIT',
          idempotencyKey: idempotencyCheck.idempotencyKey,
          requestHash: idempotencyCheck.requestHash,
          resultReference: result,
        });
      }

      // Publish domain event
      await EventService.publish({
        type: EVENT_TYPES.COMPLIANCE_AUDIT_LOGGED || 'compliance.audit.logged',
        aggregateId: verificationId.toString(),
        payload: {
          verificationId: verificationId.toString(),
          sequenceNumber,
          eventType,
          currentHash,
          actorRole,
        },
      });

      return result;
    } catch (err) {
      logger.error(`[ComplianceLedgerService] Failed to append audit entry for ${verificationId}: ${err.message}`);
      // Mark compliance sync state as degraded pending retry
      await Verification.updateOne(
        { _id: verificationId },
        { $set: { 'complianceAudit.syncState': 'DEGRADED_PENDING_RETRY' } }
      ).catch(() => {});

      throw new AppError(`Compliance audit logging failed: ${err.message}`, 500);
    }
  }

  /**
   * Verifies cryptographic SHA-256 hash chain continuity and tamper integrity
   */
  async verifyLedgerIntegrity(verificationId) {
    if (!verificationId || !mongoose.Types.ObjectId.isValid(verificationId)) {
      throw new AppError('Invalid verification ID format', 400);
    }

    const entries = await VerificationComplianceLedger.find({ verificationId }).sort({ sequenceNumber: 1 }).lean();

    if (!entries || entries.length === 0) {
      return { valid: true, totalEntries: 0, message: 'No compliance audit entries recorded yet' };
    }

    let expectedPreviousHash = GENESIS_PREVIOUS_HASH;
    let lastTimestamp = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedSeq = i + 1;

      // 1. Sequence continuity check
      if (entry.sequenceNumber !== expectedSeq) {
        const errorMsg = `Sequence gap detected: expected ${expectedSeq}, found ${entry.sequenceNumber}`;
        logger.error(`[ComplianceLedgerService] TAMPER ALERT for ${verificationId}: ${errorMsg}`);
        await EventService.publish({
          type: EVENT_TYPES.LEDGER_TAMPER_DETECTED || 'compliance.ledger.tamper_detected',
          aggregateId: verificationId.toString(),
          payload: { verificationId: verificationId.toString(), brokenAtSequence: entry.sequenceNumber, reason: errorMsg },
        });
        return { valid: false, brokenAtSequence: entry.sequenceNumber, reason: errorMsg };
      }

      // 2. Previous hash linkage check
      if (entry.previousHash !== expectedPreviousHash) {
        const errorMsg = `Previous hash mismatch at sequence ${entry.sequenceNumber}: expected ${expectedPreviousHash}, found ${entry.previousHash}`;
        logger.error(`[ComplianceLedgerService] TAMPER ALERT for ${verificationId}: ${errorMsg}`);
        await EventService.publish({
          type: EVENT_TYPES.LEDGER_TAMPER_DETECTED || 'compliance.ledger.tamper_detected',
          aggregateId: verificationId.toString(),
          payload: { verificationId: verificationId.toString(), brokenAtSequence: entry.sequenceNumber, reason: errorMsg },
        });
        return { valid: false, brokenAtSequence: entry.sequenceNumber, reason: errorMsg };
      }

      // 3. Payload hash integrity check
      const recomputedPayloadHash = this._hashPayload(entry.auditPayload);
      if (entry.payloadHash !== recomputedPayloadHash) {
        const errorMsg = `Payload tampered at sequence ${entry.sequenceNumber}: hash mismatch`;
        logger.error(`[ComplianceLedgerService] TAMPER ALERT for ${verificationId}: ${errorMsg}`);
        await EventService.publish({
          type: EVENT_TYPES.LEDGER_TAMPER_DETECTED || 'compliance.ledger.tamper_detected',
          aggregateId: verificationId.toString(),
          payload: { verificationId: verificationId.toString(), brokenAtSequence: entry.sequenceNumber, reason: errorMsg },
        });
        return { valid: false, brokenAtSequence: entry.sequenceNumber, reason: errorMsg };
      }

      // 4. Current hash computation check
      const recomputedCurrentHash = this._calculateCurrentHash(
        entry.previousHash,
        verificationId,
        entry.eventType,
        entry.timestamp,
        entry.payloadHash
      );

      if (entry.currentHash !== recomputedCurrentHash) {
        const errorMsg = `Current hash invalid at sequence ${entry.sequenceNumber}`;
        logger.error(`[ComplianceLedgerService] TAMPER ALERT for ${verificationId}: ${errorMsg}`);
        await EventService.publish({
          type: EVENT_TYPES.LEDGER_TAMPER_DETECTED || 'compliance.ledger.tamper_detected',
          aggregateId: verificationId.toString(),
          payload: { verificationId: verificationId.toString(), brokenAtSequence: entry.sequenceNumber, reason: errorMsg },
        });
        return { valid: false, brokenAtSequence: entry.sequenceNumber, reason: errorMsg };
      }

      // 5. Timestamp ordering check
      const entryTime = new Date(entry.timestamp).getTime();
      if (lastTimestamp && entryTime < lastTimestamp) {
        const errorMsg = `Timestamp out of order at sequence ${entry.sequenceNumber}`;
        logger.error(`[ComplianceLedgerService] TAMPER ALERT for ${verificationId}: ${errorMsg}`);
        return { valid: false, brokenAtSequence: entry.sequenceNumber, reason: errorMsg };
      }

      lastTimestamp = entryTime;
      expectedPreviousHash = entry.currentHash;
    }

    await EventService.publish({
      type: EVENT_TYPES.LEDGER_VERIFIED || 'compliance.ledger.verified',
      aggregateId: verificationId.toString(),
      payload: { verificationId: verificationId.toString(), totalEntries: entries.length },
    });

    return { valid: true, totalEntries: entries.length, latestHash: expectedPreviousHash };
  }

  /**
   * Gets role-sanitized audit history for a verification record
   */
  async getAuditHistory(verificationId, requesterUser = {}) {
    if (!verificationId || !mongoose.Types.ObjectId.isValid(verificationId)) {
      throw new AppError('Invalid verification ID format', 400);
    }

    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    const requesterRole = (requesterUser.role || 'user').toLowerCase();
    const isTenantOrUser = requesterRole === 'tenant' || requesterRole === 'user';

    // IDOR Protection: Tenant can only view own verification compliance ledger
    if (isTenantOrUser) {
      if (verification.entityId && verification.entityId.toString() !== requesterUser.id?.toString()) {
        throw new AppError('Access denied: You do not have permission to view this compliance ledger', 403);
      }

      return {
        verificationId: verification._id.toString(),
        publicStatus: verification.status,
        recertificationStatus: verification.complianceAudit?.recertificationStatus || 'CURRENT',
        lastRecertifiedAt: verification.complianceAudit?.lastRecertifiedAt || null,
        nextRecertificationDueAt: verification.complianceAudit?.nextRecertificationDueAt || null,
      };
    }

    // Full granular details for admin / manager
    const entries = await VerificationComplianceLedger.find({ verificationId }).sort({ sequenceNumber: 1 }).lean();
    const integrity = await this.verifyLedgerIntegrity(verificationId);

    return {
      verificationId: verification._id.toString(),
      globalStatus: verification.status,
      recertificationStatus: verification.complianceAudit?.recertificationStatus || 'CURRENT',
      syncState: verification.complianceAudit?.syncState || 'HEALTHY',
      integrity,
      ledgerEntries: entries.map((e) => ({
        sequenceNumber: e.sequenceNumber,
        eventType: e.eventType,
        actorId: e.actorId,
        actorRole: e.actorRole,
        previousHash: e.previousHash,
        currentHash: e.currentHash,
        payloadHash: e.payloadHash,
        timestamp: e.timestamp,
        auditPayload: e.auditPayload,
      })),
    };
  }

  /**
   * Continuous Recertification Daemon Sweep (Targets APPROVED verifications only)
   */
  async triggerRecertificationSweep(options = {}) {
    const idempotencyCheck = await this._handleIdempotency('SYSTEM_SWEEP', 'TRIGGER_RECERTIFICATION', options);
    if (idempotencyCheck?.isReplay) return idempotencyCheck.result;

    logger.info('[ComplianceLedgerService] Starting continuous recertification sweep...');

    // Rule: Recertification sweep targets ONLY APPROVED completed verifications. Incomplete ones are ignored.
    const approvedVerifications = await Verification.find({
      status: 'APPROVED',
      isDeleted: false,
    });

    let warningsTriggered = 0;
    let dueTriggered = 0;
    let expiredTriggered = 0;

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    for (const v of approvedVerifications) {
      try {
        const baseDate = v.complianceAudit?.lastRecertifiedAt || v.verifiedAt || v.updatedAt || v.createdAt;
        const ageDays = Math.floor((now - new Date(baseDate).getTime()) / DAY_MS);

        if (!v.complianceAudit) {
          v.complianceAudit = { recertificationStatus: 'CURRENT', ledgerSequenceCount: 0, syncState: 'HEALTHY' };
        }

        if (ageDays > 395 && v.complianceAudit.recertificationStatus !== 'EXPIRED') {
          // Day 395+: Expiration grace window lapsed -> update complianceAudit.recertificationStatus = EXPIRED
          // Phase 3.5 global status remains APPROVED (untouched)!
          v.complianceAudit.recertificationStatus = 'EXPIRED';
          await v.save();
          await this.appendAuditEntry(v._id, 'RECERTIFICATION_EXPIRED', { id: 'system', role: 'system' });
          expiredTriggered++;
        } else if (ageDays > 365 && ageDays <= 395 && v.complianceAudit.recertificationStatus === 'CURRENT') {
          // Day 365+: Annual recertification due
          v.complianceAudit.recertificationStatus = 'RECERTIFICATION_DUE';
          v.complianceAudit.nextRecertificationDueAt = new Date(now + 30 * DAY_MS);
          await v.save();
          await this.appendAuditEntry(v._id, 'RECERTIFICATION_DUE_FLAGGED', { id: 'system', role: 'system' });
          dueTriggered++;
        } else if (ageDays > 335 && ageDays <= 365) {
          // Day 335+: Recertification warning notice
          warningsTriggered++;
          await EventService.publish({
            type: EVENT_TYPES.RECERTIFICATION_TRIGGERED || 'compliance.recertification.triggered',
            aggregateId: v._id.toString(),
            payload: { verificationId: v._id.toString(), daysUntilDue: 365 - ageDays },
          });
        }
      } catch (err) {
        logger.error(`[ComplianceLedgerService] Recertification sweep error on ${v._id}: ${err.message}`);
      }
    }

    const summary = { warningsTriggered, dueTriggered, expiredTriggered, totalProcessed: approvedVerifications.length };
    logger.info(`[ComplianceLedgerService] Recertification sweep completed: ${JSON.stringify(summary)}`);

    if (idempotencyCheck?.idempotencyKey) {
      await ComplianceIdempotencyRecord.create({
        verificationId: 'SYSTEM_SWEEP',
        operation: 'TRIGGER_RECERTIFICATION',
        idempotencyKey: idempotencyCheck.idempotencyKey,
        requestHash: idempotencyCheck.requestHash,
        resultReference: summary,
      });
    }

    return summary;
  }

  /**
   * Recertifies an eligible verification (Human Manager/Admin action)
   */
  async recertifyVerification(verificationId, decision, actor = {}, notes = '') {
    if (!verificationId || !mongoose.Types.ObjectId.isValid(verificationId)) {
      throw new AppError('Invalid verification ID format', 400);
    }

    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    if (verification.status !== 'APPROVED') {
      throw new AppError('Recertification is only permitted for completed APPROVED verifications', 400);
    }

    const isApprove = decision === 'APPROVE';
    const now = new Date();

    if (isApprove) {
      verification.complianceAudit.recertificationStatus = 'CURRENT';
      verification.complianceAudit.lastRecertifiedAt = now;
      verification.complianceAudit.nextRecertificationDueAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else {
      verification.complianceAudit.recertificationStatus = 'EXPIRED';
    }

    await verification.save();

    const auditEvent = isApprove ? 'RECERTIFICATION_APPROVED' : 'RECERTIFICATION_REJECTED';
    await this.appendAuditEntry(verificationId, auditEvent, actor, { metadata: { context: notes } });

    // Delegate to central Trust Score service ONLY if reason code exists in trustScoreService
    try {
      if (verification.entityId) {
        await trustScoreService.recalculateTrustScore(verification.entityId, verification.entityModel || 'User', auditEvent);
      }
    } catch (err) {
      logger.info(`[ComplianceLedgerService] Trust score delegation skipped for ${auditEvent}: ${err.message}`);
    }

    return {
      verificationId: verification._id.toString(),
      recertificationStatus: verification.complianceAudit.recertificationStatus,
      lastRecertifiedAt: verification.complianceAudit.lastRecertifiedAt,
    };
  }

  /**
   * Generates a cryptographically verifiable compliance export package
   */
  async generateCompliancePackage(verificationId, requesterUser = {}, options = {}) {
    if (!verificationId || !mongoose.Types.ObjectId.isValid(verificationId)) {
      throw new AppError('Invalid verification ID format', 400);
    }

    const idempotencyCheck = await this._handleIdempotency(verificationId, 'EXPORT_PACKAGE', options);
    if (idempotencyCheck?.isReplay) return idempotencyCheck.result;

    const verification = await Verification.findOne({ _id: verificationId, isDeleted: false });
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    const requesterRole = (requesterUser.role || 'user').toLowerCase();
    if (requesterRole !== 'admin' && requesterRole !== 'manager') {
      throw new AppError('Access denied: Only Admin and Manager roles can download compliance packages', 403);
    }

    const integrity = await this.verifyLedgerIntegrity(verificationId);
    const timestamp = new Date();

    // Deterministic cryptographic package digest
    const rawPackageString = `${verificationId.toString()}:${integrity.latestHash}:${timestamp.toISOString()}:${verification.status}`;
    const packageVerificationDigest = crypto.createHash('sha256').update(rawPackageString).digest('hex');

    const packageReference = `PKG-REF-${verificationId.toString().slice(-8)}-${Date.now()}`;

    const compliancePackage = {
      packageReference,
      verificationId: verification._id.toString(),
      applicantName: verification.applicantName || 'Confidential',
      globalStatus: verification.status,
      recertificationStatus: verification.complianceAudit?.recertificationStatus || 'CURRENT',
      totalAuditEntries: integrity.totalEntries || 0,
      chainIntegrityValid: integrity.valid,
      latestHash: integrity.latestHash,
      packageVerificationDigest,
      generatedAt: timestamp,
      generatedByRole: requesterRole,
    };

    verification.complianceAudit.auditPackageReference = packageReference;
    verification.complianceAudit.lastAuditExportAt = timestamp;
    await verification.save();

    await this.appendAuditEntry(verificationId, 'COMPLIANCE_PACKAGE_EXPORTED', requesterUser);

    if (idempotencyCheck?.idempotencyKey) {
      await ComplianceIdempotencyRecord.create({
        verificationId: verificationId.toString(),
        operation: 'EXPORT_PACKAGE',
        idempotencyKey: idempotencyCheck.idempotencyKey,
        requestHash: idempotencyCheck.requestHash,
        resultReference: compliancePackage,
      });
    }

    return compliancePackage;
  }
}

export default new ComplianceLedgerService();
