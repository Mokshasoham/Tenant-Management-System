import verificationRepository from '../repositories/verificationRepository.js';
import { AadhaarDevelopmentProvider } from './providers/aadhaarDevelopmentProvider.js';
import { AadhaarProductionProvider } from './providers/aadhaarProductionProvider.js';
import trustScoreService from './trustScoreService.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';
import { encryptData } from '../utils/encryption.js';

export class AadhaarVerificationService {
  constructor() {
    this.devProvider = new AadhaarDevelopmentProvider();
    this.prodProvider = new AadhaarProductionProvider();
  }

  getProvider() {
    if (config.REAL_AADHAAR_VERIFICATION) {
      this.prodProvider.validateConfig();
      return this.prodProvider;
    }
    return this.devProvider;
  }

  maskAadhaar(aadhaarNumber) {
    if (!aadhaarNumber || typeof aadhaarNumber !== 'string') return '';
    const clean = aadhaarNumber.replace(/\s+/g, '');
    if (clean.length < 4) return 'XXXXXXXXXXXX';
    return `XXXXXXXX${clean.slice(-4)}`;
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

  async initiateAadhaarOtp(verificationId, payload = {}, requesterUser = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    this.checkAccess(verification, requesterUser);

    if (!config.AADHAAR_ENABLED) {
      throw new AppError('Aadhaar verification feature is currently disabled', 400);
    }

    const { aadhaarNumber } = payload;
    const cleanAadhaar = (aadhaarNumber || '').replace(/\s+/g, '');
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      throw new AppError('Invalid Aadhaar number format. Must be a 12-digit numeric identifier.', 400);
    }

    const aadhaarInfo = verification.aadhaarVerification || {};

    if (aadhaarInfo.lockStatus === 'LOCKED' && aadhaarInfo.lockedUntil && new Date() < new Date(aadhaarInfo.lockedUntil)) {
      const remainingMinutes = Math.ceil((new Date(aadhaarInfo.lockedUntil) - new Date()) / (60 * 1000));
      throw new AppError(
        `Aadhaar verification is locked due to maximum attempt failures. Please retry in ${remainingMinutes} minutes or request admin unlock.`,
        429
      );
    }

    const windowHours = config.AADHAAR_ATTEMPT_WINDOW_HOURS || 24;
    const maxAttempts = config.AADHAAR_MAX_ATTEMPTS || 3;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const recentAttempts = (aadhaarInfo.attempts || []).filter(a => new Date(a.timestamp) >= windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      verification.aadhaarVerification.lockStatus = 'LOCKED';
      verification.aadhaarVerification.lockedUntil = lockedUntil;
      await verification.save();
      await eventBus.publish(EventTypes.VERIFICATION.AADHAAR_LOCKED, { verificationId, entityId: verification.entityId });
      throw new AppError(`Maximum Aadhaar verification attempts (${maxAttempts}) exceeded within ${windowHours} hours. Account locked.`, 429);
    }

    const maskedAadhaar = this.maskAadhaar(cleanAadhaar);
    const encryptedReference = encryptData(cleanAadhaar);
    const provider = this.getProvider();

    let result;
    try {
      result = await provider.sendOtp({
        encryptedReference,
        maskedAadhaar,
        forceTimeout: payload.forceTimeout,
        forceError: payload.forceError,
      });
    } catch (err) {
      if (err.name === 'AbortError' || err.isCircuitBreakerOpen) {
        verification.aadhaarVerification.verificationStatus = 'UNAVAILABLE';
        await verification.save();
        throw new AppError('Aadhaar verification provider timed out or service unavailable', 504);
      }
      throw err;
    }

    const nextAttemptNumber = (aadhaarInfo.attempts || []).length + 1;
    verification.aadhaarVerification = {
      ...verification.aadhaarVerification,
      provider: provider.providerName,
      providerRequestId: result.providerRequestId,
      maskedAadhaarNumber: maskedAadhaar,
      encryptedAadhaarReference: encryptedReference,
      verificationStatus: 'OTP_SENT',
      otpSentAt: new Date(),
      otpExpiresAt: new Date(Date.now() + (result.otpExpiresInSec || 600) * 1000),
      attempts: [
        ...(aadhaarInfo.attempts || []),
        {
          attemptNumber: nextAttemptNumber,
          providerRequestId: result.providerRequestId,
          status: 'OTP_SENT',
          reason: result.message || 'OTP sent successfully',
          timestamp: new Date(),
        },
      ],
    };

    verification.timeline.push({
      event: 'AADHAAR_INITIATED',
      description: `Aadhaar verification OTP sent to masked ${maskedAadhaar}`,
      performedBy: requesterUser.userId || requesterUser._id || requesterUser.id,
      timestamp: new Date(),
    });

    const updated = await verification.save();
    await eventBus.publish(EventTypes.VERIFICATION.AADHAAR_INITIATED, {
      verificationId,
      entityId: verification.entityId,
      maskedAadhaar,
    });

    return updated.aadhaarVerification;
  }

  async verifyAadhaarOtp(verificationId, payload = {}, requesterUser = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    this.checkAccess(verification, requesterUser);

    const aadhaarInfo = verification.aadhaarVerification || {};
    if (aadhaarInfo.verificationStatus !== 'OTP_SENT') {
      throw new AppError("No pending Aadhaar OTP session found. Please initiate OTP first.", 400);
    }

    if (aadhaarInfo.lockStatus === 'LOCKED' && aadhaarInfo.lockedUntil && new Date() < new Date(aadhaarInfo.lockedUntil)) {
      throw new AppError("Aadhaar verification is currently locked.", 429);
    }

    const { otp } = payload;
    if (!otp || typeof otp !== 'string' || otp.trim().length < 4) {
      throw new AppError('Invalid OTP supplied', 400);
    }

    const provider = this.getProvider();
    let result;
    try {
      result = await provider.verifyOtp({
        providerRequestId: aadhaarInfo.providerRequestId,
        otp,
        confidenceScore: payload.confidenceScore,
        forceTimeout: payload.forceTimeout,
        forceError: payload.forceError,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        verification.aadhaarVerification.verificationStatus = 'UNAVAILABLE';
        await verification.save();
        throw new AppError('Aadhaar verification provider request timed out', 504);
      }
      throw err;
    }

    const attempts = aadhaarInfo.attempts || [];
    const nextAttemptNumber = attempts.length + 1;

    if (result.success && result.status === 'VERIFIED') {
      verification.aadhaarVerification.verificationStatus = 'VERIFIED';
      verification.aadhaarVerification.verifiedAt = new Date();
      verification.aadhaarVerification.confidenceScore = result.confidenceScore !== undefined ? result.confidenceScore : null;
      verification.aadhaarVerification.attempts.push({
        attemptNumber: nextAttemptNumber,
        providerRequestId: result.providerRequestId,
        status: 'VERIFIED',
        reason: result.reason || 'OTP verified successfully',
        timestamp: new Date(),
      });

      verification.timeline.push({
        event: 'AADHAAR_VERIFIED',
        description: 'Aadhaar OTP verified successfully',
        performedBy: requesterUser.userId || requesterUser._id || requesterUser.id,
        timestamp: new Date(),
      });

      const saved = await verification.save();
      await trustScoreService.recalculateTrustScore(saved.entityType, saved.entityId, 'AADHAAR_VERIFIED');
      await eventBus.publish(EventTypes.VERIFICATION.AADHAAR_VERIFIED, {
        verificationId,
        entityId: saved.entityId,
      });

      return saved.aadhaarVerification;
    } else {
      const windowHours = config.AADHAAR_ATTEMPT_WINDOW_HOURS || 24;
      const maxAttempts = config.AADHAAR_MAX_ATTEMPTS || 3;
      const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
      const failedAttempts = attempts.filter(a => a.status === 'FAILED' && new Date(a.timestamp) >= windowStart).length + 1;

      verification.aadhaarVerification.verificationStatus = 'FAILED';
      verification.aadhaarVerification.attempts.push({
        attemptNumber: nextAttemptNumber,
        providerRequestId: result.providerRequestId,
        status: 'FAILED',
        reason: result.reason || 'OTP verification failed',
        timestamp: new Date(),
      });

      if (failedAttempts >= maxAttempts) {
        verification.aadhaarVerification.lockStatus = 'LOCKED';
        verification.aadhaarVerification.lockedUntil = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      }

      const saved = await verification.save();
      await eventBus.publish(EventTypes.VERIFICATION.AADHAAR_FAILED, {
        verificationId,
        entityId: saved.entityId,
        reason: result.reason,
      });

      return saved.aadhaarVerification;
    }
  }

  async getAadhaarStatus(verificationId, requesterUser = null) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    this.checkAccess(verification, requesterUser);

    const aadhaarInfo = verification.aadhaarVerification || {};
    const isAdminOrManager = ['admin', 'manager'].includes(requesterUser.role);

    if (!isAdminOrManager) {
      return {
        verificationStatus: aadhaarInfo.verificationStatus || 'NOT_STARTED',
        maskedAadhaarNumber: aadhaarInfo.maskedAadhaarNumber || '',
        verifiedAt: aadhaarInfo.verifiedAt || null,
        lockStatus: aadhaarInfo.lockStatus || 'NONE',
      };
    }

    return aadhaarInfo;
  }

  async unlockAadhaarVerification(verificationId, adminUser = null) {
    if (!adminUser || adminUser.role !== 'admin') {
      throw new AppError('Forbidden: Only administrators can unlock Aadhaar verification', 403);
    }

    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification document '${verificationId}' not found`, 404);
    }

    verification.aadhaarVerification.lockStatus = 'ADMIN_UNLOCKED';
    verification.aadhaarVerification.lockedUntil = null;

    verification.timeline.push({
      event: 'AADHAAR_UNLOCKED',
      description: `Aadhaar verification unlocked by admin ${adminUser.userId || adminUser._id || adminUser.id}`,
      performedBy: adminUser.userId || adminUser._id || adminUser.id,
      timestamp: new Date(),
    });

    const saved = await verification.save();
    await eventBus.publish(EventTypes.VERIFICATION.AADHAAR_UNLOCKED, {
      verificationId,
      entityId: saved.entityId,
    });

    return saved.aadhaarVerification;
  }
}

export default new AadhaarVerificationService();
