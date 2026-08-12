import verificationRepository from '../repositories/verificationRepository.js';
import { PANDevelopmentProvider } from './providers/panDevelopmentProvider.js';
import { PANProductionProvider } from './providers/panProductionProvider.js';
import trustScoreService from './trustScoreService.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';
import { encryptData } from '../utils/encryption.js';

export class PANVerificationService {
  constructor() {
    this.devProvider = new PANDevelopmentProvider();
    this.prodProvider = new PANProductionProvider();
  }

  getProvider() {
    if (config.REAL_PAN_VERIFICATION) {
      this.prodProvider.validateConfig();
      return this.prodProvider;
    }
    return this.devProvider;
  }

  maskPan(panNumber) {
    if (!panNumber || typeof panNumber !== 'string') return '';
    const clean = panNumber.trim().toUpperCase();
    if (clean.length < 5) return 'XXXXXXXXXX';
    return `XXXXX${clean.slice(5)}`;
  }

  checkAccess(verification, requesterUser) {
    if (!verification || !requesterUser) {
      throw new AppError('Forbidden: Access denied', 403);
    }
    const requesterId = (requesterUser.userId || requesterUser._id || requesterUser.id || '').toString();
    const isOwner = verification.entityId?.toString() === requesterId;
    const isAdminOrManager = ['admin', 'manager'].includes(requesterUser.role);

    if (!isOwner && !isAdminOrManager) {
      throw new AppError('Forbidden: You do not have permission to access this verification record', 403);
    }
  }

  async verifyPan(verificationId, payload = {}, requesterUser = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    this.checkAccess(verification, requesterUser);

    if (!config.PAN_ENABLED) {
      throw new AppError('PAN verification feature is currently disabled', 400);
    }

    const { panNumber, userProfile } = payload;
    const cleanPan = (panNumber || '').trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      throw new AppError('Invalid PAN format. Must be a 10-character alphanumeric PAN identifier.', 400);
    }

    const panInfo = verification.panVerification || {};

    if (panInfo.lockStatus === 'LOCKED' && panInfo.lockedUntil && new Date() < new Date(panInfo.lockedUntil)) {
      const remainingMinutes = Math.ceil((new Date(panInfo.lockedUntil) - new Date()) / (60 * 1000));
      throw new AppError(
        `PAN verification is locked due to maximum attempt failures. Please retry in ${remainingMinutes} minutes or request admin unlock.`,
        429
      );
    }

    const windowHours = config.PAN_ATTEMPT_WINDOW_HOURS || 24;
    const maxAttempts = config.PAN_MAX_ATTEMPTS || 3;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const recentAttempts = (panInfo.attempts || []).filter(a => new Date(a.timestamp) >= windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      verification.panVerification.lockStatus = 'LOCKED';
      verification.panVerification.lockedUntil = lockedUntil;
      await verification.save();
      await eventBus.publish(EventTypes.VERIFICATION.PAN_LOCKED, { verificationId, entityId: verification.entityId });
      throw new AppError(`Maximum PAN verification attempts (${maxAttempts}) exceeded within ${windowHours} hours. Account locked.`, 429);
    }

    const maskedPan = this.maskPan(cleanPan);
    const encryptedReference = encryptData(cleanPan);
    const provider = this.getProvider();

    let result;
    try {
      result = await provider.verifyPan({
        encryptedReference,
        maskedPan,
        userProfile,
        forceMismatch: payload.forceMismatch,
        forceInvalid: payload.forceInvalid,
        forceTimeout: payload.forceTimeout,
        forceError: payload.forceError,
        confidenceScore: payload.confidenceScore,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        verification.panVerification.verificationStatus = 'UNAVAILABLE';
        await verification.save();
        throw new AppError('PAN verification provider request timed out', 504);
      }
      throw err;
    }

    const attempts = panInfo.attempts || [];
    const nextAttemptNumber = attempts.length + 1;

    verification.panVerification.provider = provider.providerName;
    verification.panVerification.providerRequestId = result.providerRequestId;
    verification.panVerification.maskedPanNumber = maskedPan;
    verification.panVerification.encryptedPanReference = encryptedReference;
    verification.panVerification.matchDetails = result.matchDetails || { nameMatched: false, dobMatched: false, panStatus: 'VALID' };
    verification.panVerification.confidenceScore = result.confidenceScore !== undefined ? result.confidenceScore : null;

    if (result.success && result.status === 'VERIFIED') {
      verification.panVerification.verificationStatus = 'VERIFIED';
      verification.panVerification.verifiedAt = new Date();
      verification.panVerification.attempts.push({
        attemptNumber: nextAttemptNumber,
        providerRequestId: result.providerRequestId,
        status: 'VERIFIED',
        reason: result.reason || 'PAN verified successfully',
        timestamp: new Date(),
      });

      verification.timeline.push({
        event: 'PAN_VERIFIED',
        description: `PAN verified successfully for masked ${maskedPan}`,
        performedBy: requesterUser.userId || requesterUser._id || requesterUser.id,
        timestamp: new Date(),
      });

      const saved = await verification.save();
      await trustScoreService.recalculateTrustScore(saved.entityType, saved.entityId, 'PAN_VERIFIED');
      await eventBus.publish(EventTypes.VERIFICATION.PAN_VERIFIED, {
        verificationId,
        entityId: saved.entityId,
      });

      return saved.panVerification;
    } else {
      const isMismatch = result.status === 'MISMATCH';
      const statusValue = isMismatch ? 'MISMATCH' : 'FAILED';
      verification.panVerification.verificationStatus = statusValue;

      verification.panVerification.attempts.push({
        attemptNumber: nextAttemptNumber,
        providerRequestId: result.providerRequestId,
        status: statusValue,
        reason: result.reason || 'PAN verification failed',
        timestamp: new Date(),
      });

      const failedCount = verification.panVerification.attempts.filter(a => ['FAILED', 'MISMATCH'].includes(a.status) && new Date(a.timestamp) >= windowStart).length;
      if (failedCount >= maxAttempts) {
        verification.panVerification.lockStatus = 'LOCKED';
        verification.panVerification.lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      }

      const saved = await verification.save();
      await eventBus.publish(isMismatch ? EventTypes.VERIFICATION.PAN_MISMATCH : EventTypes.VERIFICATION.PAN_FAILED, {
        verificationId,
        entityId: saved.entityId,
        reason: result.reason,
      });

      return saved.panVerification;
    }
  }

  async getPanStatus(verificationId, requesterUser = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    this.checkAccess(verification, requesterUser);

    const panInfo = verification.panVerification || {};
    const isAdminOrManager = ['admin', 'manager'].includes(requesterUser.role);

    if (!isAdminOrManager) {
      return {
        verificationStatus: panInfo.verificationStatus || 'NOT_STARTED',
        maskedPanNumber: panInfo.maskedPanNumber || '',
        verifiedAt: panInfo.verifiedAt || null,
        lockStatus: panInfo.lockStatus || 'NONE',
      };
    }

    return panInfo;
  }

  async unlockPanVerification(verificationId, adminUser = null) {
    if (!adminUser || adminUser.role !== 'admin') {
      throw new AppError('Forbidden: Only administrators can unlock PAN verification', 403);
    }

    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    verification.panVerification.lockStatus = 'ADMIN_UNLOCKED';
    verification.panVerification.lockedUntil = null;

    verification.timeline.push({
      event: 'PAN_UNLOCKED',
      description: `PAN verification unlocked by admin ${adminUser.userId || adminUser._id || adminUser.id}`,
      performedBy: adminUser.userId || adminUser._id || adminUser.id,
      timestamp: new Date(),
    });

    const saved = await verification.save();
    await eventBus.publish(EventTypes.VERIFICATION.PAN_UNLOCKED, {
      verificationId,
      entityId: saved.entityId,
    });

    return saved.panVerification;
  }
}

export default new PANVerificationService();
