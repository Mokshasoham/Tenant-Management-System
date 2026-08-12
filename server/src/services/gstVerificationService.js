import verificationRepository from '../repositories/verificationRepository.js';
import { GSTDevelopmentProvider } from './providers/gstDevelopmentProvider.js';
import { GSTProductionProvider } from './providers/gstProductionProvider.js';
import trustScoreService from './trustScoreService.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';
import { encryptData } from '../utils/encryption.js';

export class GSTVerificationService {
  constructor() {
    this.devProvider = new GSTDevelopmentProvider();
    this.prodProvider = new GSTProductionProvider();
  }

  getProvider() {
    if (config.REAL_GST_VERIFICATION) {
      this.prodProvider.validateConfig();
      return this.prodProvider;
    }
    return this.devProvider;
  }

  maskGstin(gstin) {
    if (!gstin || typeof gstin !== 'string') return '';
    const clean = gstin.trim().toUpperCase();
    if (clean.length < 15) return 'XXXXXXXXXXXXXXX';
    return `${clean.slice(0, 2)}XXXXX${clean.slice(7)}`;
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

  async verifyGstin(verificationId, payload = {}, requesterUser = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    this.checkAccess(verification, requesterUser);

    const { gstin } = payload;
    const cleanGstin = (gstin || '').trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstin)) {
      throw new AppError('Invalid GSTIN format. Must be a 15-character valid Indian GSTIN number.', 400);
    }

    const gstInfo = verification.gstVerification || {};

    if (gstInfo.lockStatus === 'LOCKED' && gstInfo.lockedUntil && new Date() < new Date(gstInfo.lockedUntil)) {
      const remainingMinutes = Math.ceil((new Date(gstInfo.lockedUntil) - new Date()) / (60 * 1000));
      throw new AppError(
        `GSTIN verification is locked due to maximum attempt failures. Please retry in ${remainingMinutes} minutes or request admin unlock.`,
        429
      );
    }

    const windowHours = config.GST_ATTEMPT_WINDOW_HOURS || 24;
    const maxAttempts = config.GST_MAX_ATTEMPTS || 3;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const recentAttempts = (gstInfo.attempts || []).filter(a => new Date(a.timestamp) >= windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      verification.gstVerification.lockStatus = 'LOCKED';
      verification.gstVerification.lockedUntil = lockedUntil;
      await verification.save();
      await eventBus.publish(EventTypes.VERIFICATION.GST_LOCKED, { verificationId, entityId: verification.entityId });
      throw new AppError(`Maximum GSTIN verification attempts (${maxAttempts}) exceeded within ${windowHours} hours. Account locked.`, 429);
    }

    const maskedGstin = this.maskGstin(cleanGstin);
    const encryptedReference = encryptData(cleanGstin);
    const provider = this.getProvider();

    let result;
    try {
      result = await provider.verifyGstin({
        encryptedReference,
        maskedGstin,
        legalName: payload.legalName,
        tradeName: payload.tradeName,
        forceInactive: payload.forceInactive,
        forceInvalid: payload.forceInvalid,
        forceTimeout: payload.forceTimeout,
        forceError: payload.forceError,
        confidenceScore: payload.confidenceScore,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        verification.gstVerification.verificationStatus = 'UNAVAILABLE';
        await verification.save();
        throw new AppError('GSTIN verification provider request timed out', 504);
      }
      throw err;
    }

    const attempts = gstInfo.attempts || [];
    const nextAttemptNumber = attempts.length + 1;

    verification.gstVerification.provider = provider.providerName;
    verification.gstVerification.providerRequestId = result.providerRequestId;
    verification.gstVerification.maskedGstin = maskedGstin;
    verification.gstVerification.encryptedGstReference = encryptedReference;
    verification.gstVerification.businessDetails = result.businessDetails || {};
    verification.gstVerification.confidenceScore = result.confidenceScore !== undefined ? result.confidenceScore : null;

    if (result.success && result.status === 'VERIFIED') {
      verification.gstVerification.verificationStatus = 'VERIFIED';
      verification.gstVerification.verifiedAt = new Date();
      verification.gstVerification.attempts.push({
        attemptNumber: nextAttemptNumber,
        providerRequestId: result.providerRequestId,
        status: 'VERIFIED',
        reason: result.reason || 'GSTIN verified successfully',
        timestamp: new Date(),
      });

      verification.timeline.push({
        event: 'GST_VERIFIED',
        description: `GSTIN verified successfully for masked ${maskedGstin}`,
        performedBy: requesterUser.userId || requesterUser._id || requesterUser.id,
        timestamp: new Date(),
      });

      const saved = await verification.save();
      await trustScoreService.recalculateTrustScore(saved.entityType, saved.entityId, 'GST_VERIFIED');
      await eventBus.publish(EventTypes.VERIFICATION.GST_VERIFIED, {
        verificationId,
        entityId: saved.entityId,
      });

      return saved.gstVerification;
    } else {
      const isInactive = result.status === 'INACTIVE';
      const statusValue = isInactive ? 'INACTIVE' : 'FAILED';
      verification.gstVerification.verificationStatus = statusValue;

      verification.gstVerification.attempts.push({
        attemptNumber: nextAttemptNumber,
        providerRequestId: result.providerRequestId,
        status: statusValue,
        reason: result.reason || 'GSTIN verification failed',
        timestamp: new Date(),
      });

      const failedCount = verification.gstVerification.attempts.filter(a => ['FAILED', 'INACTIVE'].includes(a.status) && new Date(a.timestamp) >= windowStart).length;
      if (failedCount >= maxAttempts) {
        verification.gstVerification.lockStatus = 'LOCKED';
        verification.gstVerification.lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      }

      const saved = await verification.save();
      await eventBus.publish(isInactive ? EventTypes.VERIFICATION.GST_INACTIVE : EventTypes.VERIFICATION.GST_FAILED, {
        verificationId,
        entityId: saved.entityId,
        reason: result.reason,
      });

      return saved.gstVerification;
    }
  }

  async getGstStatus(verificationId, requesterUser = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    this.checkAccess(verification, requesterUser);

    const gstInfo = verification.gstVerification || {};
    const isAdminOrManager = ['admin', 'manager'].includes(requesterUser.role);

    if (!isAdminOrManager) {
      return {
        verificationStatus: gstInfo.verificationStatus || 'NOT_STARTED',
        maskedGstin: gstInfo.maskedGstin || '',
        verifiedAt: gstInfo.verifiedAt || null,
        lockStatus: gstInfo.lockStatus || 'NONE',
      };
    }

    return gstInfo;
  }

  async unlockGstVerification(verificationId, adminUser = null) {
    if (!adminUser || adminUser.role !== 'admin') {
      throw new AppError('Forbidden: Only administrators can unlock GSTIN verification', 403);
    }

    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    verification.gstVerification.lockStatus = 'ADMIN_UNLOCKED';
    verification.gstVerification.lockedUntil = null;

    verification.timeline.push({
      event: 'GST_UNLOCKED',
      description: `GSTIN verification unlocked by admin ${adminUser.userId || adminUser._id || adminUser.id}`,
      performedBy: adminUser.userId || adminUser._id || adminUser.id,
      timestamp: new Date(),
    });

    const saved = await verification.save();
    await eventBus.publish(EventTypes.VERIFICATION.GST_UNLOCKED, {
      verificationId,
      entityId: saved.entityId,
    });

    return saved.gstVerification;
  }
}

export default new GSTVerificationService();
