import verificationRepository from '../repositories/verificationRepository.js';
import Verification from '../models/Verification.js';
import { VideoKYCDevelopmentProvider } from './providers/videoKycDevelopmentProvider.js';
import { VideoKYCProductionProvider } from './providers/videoKycProductionProvider.js';
import trustScoreService from './trustScoreService.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';
import { encryptData, decryptData } from '../utils/encryption.js';

export class VideoKYCService {
  constructor() {
    this.devProvider = new VideoKYCDevelopmentProvider();
    this.prodProvider = new VideoKYCProductionProvider();
  }

  getProvider() {
    if (config.REAL_VIDEO_KYC_VERIFICATION) {
      this.prodProvider.validateConfig();
      return this.prodProvider;
    }
    return this.devProvider;
  }

  async grantConsent(verificationId, permissions = {}, requesterId, ipAddress = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const retentionDays = config.VIDEO_KYC_CONSENT_RETENTION_DAYS || 730;
    const retentionExpiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    verification.videoKycConsent = {
      consentStatus: 'GRANTED',
      consentVersion: config.CURRENT_VIDEO_KYC_CONSENT_VERSION || 'v1.0',
      consentPurpose: config.CURRENT_VIDEO_KYC_CONSENT_PURPOSE || 'Live Agent Video KYC & Geolocation Audit',
      videoRecordingConsent: permissions.videoRecordingConsent === true,
      geolocationConsent: permissions.geolocationConsent === true,
      audioConsent: permissions.audioConsent === true,
      grantedAt: new Date(),
      revokedAt: null,
      ipAddress,
      retentionExpiresAt,
    };

    verification.timeline.push({
      event: 'AUTO_REVIEW_STARTED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: `Explicit Video KYC consent granted [Version: ${verification.videoKycConsent.consentVersion}, Video: ${permissions.videoRecordingConsent ? 'YES' : 'NO'}, Geo: ${permissions.geolocationConsent ? 'YES' : 'NO'}]`,
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.VIDEO_KYC_CONSENT_GRANTED, {
      verificationId: verification._id,
      requesterId,
      version: verification.videoKycConsent.consentVersion,
    });

    return verification;
  }

  async revokeConsent(verificationId, requesterId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    verification.videoKycConsent.consentStatus = 'REVOKED';
    verification.videoKycConsent.revokedAt = new Date();

    verification.timeline.push({
      event: 'FLAG_CLEARED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: 'Explicit Video KYC consent revoked by user.',
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.VIDEO_KYC_CONSENT_REVOKED, {
      verificationId: verification._id,
      requesterId,
    });

    return verification;
  }

  async createSession(verificationId, metadata = {}, requesterId, userRole = 'tenant') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const consent = verification.videoKycConsent || {};
    const currentVersion = config.CURRENT_VIDEO_KYC_CONSENT_VERSION || 'v1.0';

    // 1. Consent Validation
    if (consent.consentStatus !== 'GRANTED') {
      throw new AppError('Video KYC processing consent is required before initiating session.', 400);
    }

    // 2. Active Consent Version Validation
    if (consent.consentVersion !== currentVersion) {
      verification.videoKycConsent.consentStatus = 'RECONSENT_REQUIRED';
      await verification.save();
      throw new AppError(`Video KYC consent policy has updated to ${currentVersion}. Re-consent is required before processing.`, 400);
    }

    const vkycInfo = verification.videoKycVerification || {};

    // 3. Isolated Lock Guard
    if (vkycInfo.lockStatus === 'LOCKED' && vkycInfo.lockedUntil && new Date() < new Date(vkycInfo.lockedUntil)) {
      const remainingMinutes = Math.ceil((new Date(vkycInfo.lockedUntil) - new Date()) / (60 * 1000));
      throw new AppError(`Video KYC is locked due to repeated failures. Try again in ${remainingMinutes} minutes.`, 429);
    }

    // 4. Rate Limiting Attempt Window Check
    const windowHours = config.VIDEO_KYC_ATTEMPT_WINDOW_HOURS || 24;
    const maxAttempts = config.VIDEO_KYC_MAX_ATTEMPTS || 3;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const recentAttempts = (vkycInfo.attempts || []).filter(a => new Date(a.timestamp) >= windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      verification.videoKycVerification.lockStatus = 'LOCKED';
      verification.videoKycVerification.lockedUntil = lockedUntil;
      verification.timeline.push({
        event: 'FLAG_RAISED',
        performedBy: requesterId,
        performedAt: new Date(),
        note: `Video KYC locked: Exceeded maximum attempts (${maxAttempts}) within ${windowHours} hours.`,
      });
      await verification.save();
      throw new AppError(`Exceeded maximum Video KYC attempts (${maxAttempts}). Locked for ${windowHours} hours.`, 429);
    }

    // 5. Active Session Concurrency Guard
    if (vkycInfo.sessionStatus === 'IN_PROGRESS' || vkycInfo.sessionStatus === 'WAITING_FOR_AGENT') {
      logger.warn(`[VideoKYCService] Active session already exists for verification ${verificationId}. Returning active session state.`);
      return {
        verification,
        sessionId: vkycInfo.sessionId,
        roomToken: vkycInfo.encryptedSessionToken ? decryptData(vkycInfo.encryptedSessionToken) : '',
        sessionStatus: vkycInfo.sessionStatus,
      };
    }

    // 6. Provider Session Creation
    const provider = this.getProvider();
    const providerSession = await provider.createSession(verificationId, metadata);
    const tokenRes = await provider.generateRoomToken(providerSession.sessionId, requesterId, userRole);

    const geoRetentionDays = config.VIDEO_KYC_GEO_RETENTION_DAYS || 90;
    const metadataRetentionDays = config.VIDEO_KYC_METADATA_RETENTION_DAYS || 365;

    verification.videoKycVerification.provider = provider.providerName;
    verification.videoKycVerification.sessionId = providerSession.sessionId;
    verification.videoKycVerification.encryptedSessionToken = encryptData(tokenRes.token);
    verification.videoKycVerification.sessionStatus = 'WAITING_FOR_AGENT';
    verification.videoKycVerification.verificationStatus = 'PENDING';
    verification.videoKycVerification.startedAt = new Date();
    verification.videoKycVerification.metadataRetentionExpiresAt = new Date(Date.now() + metadataRetentionDays * 86400000);

    if (metadata.geolocation && consent.geolocationConsent) {
      verification.videoKycVerification.geolocation = {
        latitude: metadata.geolocation.latitude || null,
        longitude: metadata.geolocation.longitude || null,
        city: metadata.geolocation.city || '',
        country: metadata.geolocation.country || '',
        isIpLocationMatched: metadata.geolocation.isIpLocationMatched !== false,
        retentionExpiresAt: new Date(Date.now() + geoRetentionDays * 86400000),
      };
    }

    verification.timeline.push({
      event: 'AUTO_REVIEW_STARTED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: `Video KYC session created [SessionID: ${providerSession.sessionId}]`,
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.VIDEO_KYC_SESSION_CREATED, {
      verificationId: verification._id,
      sessionId: providerSession.sessionId,
      requesterId,
    });

    return {
      verification,
      sessionId: providerSession.sessionId,
      roomToken: tokenRes.token,
      sessionStatus: 'WAITING_FOR_AGENT',
    };
  }

  async assignAgent(verificationId, agentId, agentName, assignedById, actorRole = 'manager') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const previousAgent = verification.videoKycVerification.assignedAgentName || 'UNASSIGNED';

    verification.videoKycVerification.assignedAgentId = agentId;
    verification.videoKycVerification.assignedAgentName = agentName;
    verification.videoKycVerification.sessionStatus = 'IN_PROGRESS';
    verification.videoKycVerification.verificationStatus = 'IN_PROGRESS';

    verification.timeline.push({
      event: 'MANAGER_REVIEW_STARTED',
      performedBy: assignedById,
      performedAt: new Date(),
      note: `Video KYC assigned to agent '${agentName}' by ${actorRole} (Previous: ${previousAgent})`,
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.VIDEO_KYC_AGENT_ASSIGNED, {
      verificationId: verification._id,
      agentId,
      agentName,
      assignedBy: assignedById,
    });

    return verification;
  }

  async submitEvaluation(verificationId, evaluationData = {}, agentId, agentRole = 'manager') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const vkycInfo = verification.videoKycVerification || {};

    // 1. Agent RBAC Check: Only assigned agent, manager, or admin can evaluate
    if (
      agentRole !== 'admin' &&
      agentRole !== 'manager' &&
      vkycInfo.assignedAgentId &&
      vkycInfo.assignedAgentId.toString() !== agentId.toString()
    ) {
      throw new AppError('Unauthorized: Only the assigned agent or supervisor can submit session evaluation.', 403);
    }

    // 2. Provider Evaluation Dispatch
    const provider = this.getProvider();
    const providerResponse = await provider.evaluateSession(vkycInfo.sessionId, evaluationData);

    // 3. Provider Failure Safety Guard
    let finalStatus = providerResponse.status || 'UNAVAILABLE';
    let reason = providerResponse.reason || 'Video KYC evaluation completed';

    if (!providerResponse.success && providerResponse.status === 'UNAVAILABLE') {
      finalStatus = 'UNAVAILABLE';
      reason = providerResponse.reason || 'Video KYC provider service unavailable';
    } else if (providerResponse.livenessCheckResult === 'FLAGGED_SPOOF') {
      finalStatus = 'REJECTED';
      reason = 'Live video anti-spoofing check failed: Video replay or injection detected';
    } else if (providerResponse.documentMatchResult === 'MISMATCH') {
      finalStatus = 'REVIEW_REQUIRED';
      reason = 'Physical ID presented on video does not match reference ID record';
    }

    // 4. Flexible Cross-Engine Evidence Fusion (Non-Mandatory)
    const identityStatus = verification.identityVerification?.verificationStatus;
    const facialStatus = verification.facialVerification?.verificationStatus;

    if (finalStatus === 'VERIFIED') {
      if (identityStatus === 'REJECTED' || facialStatus === 'REJECTED') {
        finalStatus = 'REVIEW_REQUIRED';
        reason = 'Video KYC passed but cross-engine checks (Identity/Facial) require manager review';
      }
    }

    const attemptNumber = (vkycInfo.attempts?.length || 0) + 1;
    const attemptRecord = {
      attemptNumber,
      sessionId: vkycInfo.sessionId || `VKYC-SESS-${attemptNumber}`,
      agentId,
      livenessCheckResult: providerResponse.livenessCheckResult || 'UNKNOWN',
      documentMatchResult: providerResponse.documentMatchResult || 'UNKNOWN',
      status: finalStatus,
      reason,
      timestamp: new Date(),
    };

    // 5. Recording Policy Enforcement
    let recordingUrl = '';
    let isRecordingSaved = false;

    if (config.VIDEO_KYC_SAVE_RECORDING && evaluationData.recordingUrl) {
      recordingUrl = evaluationData.recordingUrl;
      isRecordingSaved = true;
      verification.videoKycVerification.mediaRetentionExpiresAt = new Date(
        Date.now() + (config.VIDEO_KYC_MEDIA_RETENTION_DAYS || 30) * 86400000
      );
    } else {
      recordingUrl = '';
      isRecordingSaved = false;
      verification.videoKycVerification.mediaRetentionExpiresAt = null;
    }

    verification.videoKycVerification.livenessCheckResult = providerResponse.livenessCheckResult || 'NONE';
    verification.videoKycVerification.documentMatchResult = providerResponse.documentMatchResult || 'NONE';
    verification.videoKycVerification.verificationStatus = finalStatus;
    verification.videoKycVerification.sessionStatus = 'COMPLETED';
    verification.videoKycVerification.confidenceScore = providerResponse.confidenceScore || 0;
    verification.videoKycVerification.agentNotes = evaluationData.agentNotes || '';
    verification.videoKycVerification.recordingUrl = recordingUrl;
    verification.videoKycVerification.isRecordingSaved = isRecordingSaved;
    verification.videoKycVerification.completedAt = new Date();
    // Invalidate room token on completion
    verification.videoKycVerification.encryptedSessionToken = '';

    if (finalStatus === 'VERIFIED') {
      verification.videoKycVerification.verifiedAt = new Date();
    }

    if (!Array.isArray(verification.videoKycVerification.attempts)) {
      verification.videoKycVerification.attempts = [];
    }
    verification.videoKycVerification.attempts.push(attemptRecord);

    if (finalStatus === 'REVIEW_REQUIRED') {
      verification.manualReviewRequired = true;
      verification.status = 'MANAGER_REVIEW';
    }

    verification.timeline.push({
      event: finalStatus === 'VERIFIED' ? 'APPROVED' : (finalStatus === 'REJECTED' ? 'REJECTED' : 'MANAGER_REVIEW_STARTED'),
      performedBy: agentId,
      performedAt: new Date(),
      note: `Video KYC evaluation by ${agentRole} (${vkycInfo.assignedAgentName || 'Agent'}): ${reason} [Liveness: ${providerResponse.livenessCheckResult}, Doc: ${providerResponse.documentMatchResult}]`,
    });

    await verification.save();

    // 6. Domain Event Emission
    const eventType = finalStatus === 'VERIFIED'
      ? EventTypes.VERIFICATION.VIDEO_KYC_VERIFIED
      : (providerResponse.livenessCheckResult === 'FLAGGED_SPOOF'
        ? EventTypes.VERIFICATION.VIDEO_KYC_FLAGGED
        : (finalStatus === 'REVIEW_REQUIRED'
          ? EventTypes.VERIFICATION.VIDEO_KYC_FLAGGED
          : EventTypes.VERIFICATION.VIDEO_KYC_FAILED));

    eventBus.publish(eventType, {
      verificationId: verification._id,
      entityType: verification.entityType,
      entityId: verification.entityId,
      agentId,
      status: finalStatus,
      livenessCheckResult: providerResponse.livenessCheckResult,
      documentMatchResult: providerResponse.documentMatchResult,
    });

    // 7. Trust Score Integration (Only on VERIFIED)
    if (finalStatus === 'VERIFIED') {
      try {
        const entityIdStr = verification.entityId?.toString ? verification.entityId.toString() : verification.entityId;
        await trustScoreService.recalculateTrustScore(verification.entityType, entityIdStr, 'VIDEO_KYC_VERIFIED');
      } catch (tsErr) {
        logger.warn(`[VideoKYCService] Trust score update warning: ${tsErr.message}`);
      }
    }

    logger.info(`[VideoKYCService] Completed Video KYC evaluation for ${verification._id} -> Status: ${finalStatus}`);

    return verification;
  }

  async getStatus(verificationId, userRole = 'tenant') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const consent = verification.videoKycConsent || {};
    const vkyc = verification.videoKycVerification || {};

    // Geolocation privacy truncation for non-admin/non-manager roles
    let sanitizedGeo = null;
    if (vkyc.geolocation) {
      if (userRole === 'admin' || userRole === 'manager') {
        sanitizedGeo = vkyc.geolocation;
      } else {
        sanitizedGeo = {
          city: vkyc.geolocation.city || '',
          country: vkyc.geolocation.country || '',
          isIpLocationMatched: vkyc.geolocation.isIpLocationMatched !== false,
        };
      }
    }

    return {
      consent: {
        consentStatus: consent.consentStatus,
        consentVersion: consent.consentVersion,
        grantedAt: consent.grantedAt,
      },
      videoKyc: {
        sessionId: vkyc.sessionId,
        assignedAgentName: vkyc.assignedAgentName,
        sessionStatus: vkyc.sessionStatus,
        livenessCheckResult: vkyc.livenessCheckResult,
        documentMatchResult: vkyc.documentMatchResult,
        verificationStatus: vkyc.verificationStatus,
        confidenceScore: vkyc.confidenceScore,
        lockStatus: vkyc.lockStatus,
        geolocation: sanitizedGeo,
        isRecordingSaved: vkyc.isRecordingSaved,
        verifiedAt: vkyc.verifiedAt,
      },
    };
  }

  async unlockVideoKyc(verificationId, adminUserId, note = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    verification.videoKycVerification.lockStatus = 'ADMIN_UNLOCKED';
    verification.videoKycVerification.lockedUntil = null;
    verification.timeline.push({
      event: 'FLAG_CLEARED',
      performedBy: adminUserId,
      performedAt: new Date(),
      note: `Admin unlocked Video KYC verification. ${note}`,
    });

    await verification.save();
    return verification;
  }

  async reconcileAbandonedSessions() {
    const now = new Date();
    const timeoutMinutes = config.VIDEO_KYC_SESSION_TIMEOUT_MINUTES || 15;
    const cutoff = new Date(now - timeoutMinutes * 60 * 1000);

    const result = await Verification.updateMany(
      {
        'videoKycVerification.sessionStatus': 'WAITING_FOR_AGENT',
        'videoKycVerification.startedAt': { $lte: cutoff },
      },
      {
        $set: {
          'videoKycVerification.sessionStatus': 'EXPIRED',
          'videoKycVerification.verificationStatus': 'UNAVAILABLE',
          'videoKycVerification.encryptedSessionToken': '',
        },
      }
    );

    logger.info(`[VideoKYCService] Reconciled abandoned Video KYC sessions older than ${timeoutMinutes}m`);
    return result;
  }

  async purgeExpiredVideoKYCMetadata() {
    const now = new Date();
    const result = await Verification.updateMany(
      { 'videoKycVerification.metadataRetentionExpiresAt': { $lte: now } },
      {
        $set: {
          'videoKycVerification.attempts': [],
          'videoKycVerification.sessionId': 'PURGED',
          'videoKycVerification.agentNotes': '',
          'videoKycVerification.geolocation': null,
        },
      }
    );
    logger.info(`[VideoKYCService] Purged expired Video KYC metadata and geolocation records`);
    return result;
  }
}

export default new VideoKYCService();
