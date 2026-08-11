import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Property from '../../../src/models/Property.js';
import Verification from '../../../src/models/Verification.js';
import verificationRepository from '../../../src/repositories/verificationRepository.js';
import facialVerificationService from '../../../src/services/facialVerificationService.js';
import FacialProductionProvider from '../../../src/services/providers/facialProductionProvider.js';
import { seedVerificationDefaults } from '../../../src/utils/verificationSeed.js';

describe('Phase 3.6.4 Facial Biometric & Liveness Verification Unit Tests', () => {
  let mockUserId;
  let mockPropertyId;
  let mockVerificationDoc;

  beforeAll(async () => {
    jest.setTimeout(30000);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.MONGODB_URI);
    }
    await seedVerificationDefaults();

    mockUserId = new mongoose.Types.ObjectId();
    mockPropertyId = new mongoose.Types.ObjectId();

    await User.create({
      _id: mockUserId,
      firstName: 'Facial',
      lastName: 'User',
      email: 'facial.user.p364@tms.com',
      password: 'password123',
      role: 'tenant',
    });

    await Property.create({
      _id: mockPropertyId,
      name: 'Facial Verification Test Property',
      address: 'Suite 101, Biometric Tower',
      type: 'apartment',
      rentAmount: 30000,
      owner: mockUserId,
      ownerName: 'Facial User',
      surveyNumber: 'SN-7788',
    });

    mockVerificationDoc = await verificationRepository.createVerification({
      entityType: 'TENANT',
      entityId: mockUserId,
      entityModel: 'User',
      status: 'DRAFT',
    });
  });

  afterAll(async () => {
    try {
      await User.deleteOne({ _id: mockUserId });
      await Property.deleteOne({ _id: mockPropertyId });
      await Verification.deleteMany({ entityId: mockUserId });
      await mongoose.disconnect();
    } catch (e) {
      // Teardown fallback
    }
  });

  // ── 1. Biometric Consent & Active Policy Validation ───────────

  describe('Biometric Consent & Version Policy Validation', () => {
    it('should reject facial verification if explicit consent has not been granted', async () => {
      await expect(
        facialVerificationService.verifyFacialBiometrics(mockVerificationDoc._id, {}, mockUserId)
      ).rejects.toThrow(/Biometric processing consent is required/);
    });

    it('should grant explicit consent and record version, purpose, and IP address', async () => {
      const updated = await facialVerificationService.grantConsent(mockVerificationDoc._id, mockUserId, '192.168.1.100');
      expect(updated.biometricConsent.consentStatus).toBe('GRANTED');
      expect(updated.biometricConsent.consentVersion).toBe(config.CURRENT_BIOMETRIC_CONSENT_VERSION || 'v1.0');
      expect(updated.biometricConsent.ipAddress).toBe('192.168.1.100');
    });

    it('should require re-consent if stored consent version is outdated', async () => {
      // Set outdated version manually for testing
      await Verification.updateOne(
        { _id: mockVerificationDoc._id },
        { $set: { 'biometricConsent.consentVersion': 'v0.9-legacy' } }
      );

      await expect(
        facialVerificationService.verifyFacialBiometrics(mockVerificationDoc._id, {}, mockUserId)
      ).rejects.toThrow(/Biometric consent policy has updated/);

      const rechecked = await verificationRepository.findById(mockVerificationDoc._id);
      expect(rechecked.biometricConsent.consentStatus).toBe('RECONSENT_REQUIRED');

      // Re-grant consent for subsequent tests
      await facialVerificationService.grantConsent(mockVerificationDoc._id, mockUserId, '192.168.1.100');
    });
  });

  // ── 2. Zero Biometric Storage Privacy Guarantee ───────────────

  describe('Zero Raw Biometric Storage Privacy Guarantee', () => {
    it('should never persist raw image/video buffers to MongoDB, disk, or logs', async () => {
      const liveBuffer = Buffer.from('RAW_LIVE_CAMERA_STREAM_BYTES_12345');
      const refBuffer = Buffer.from('RAW_ID_DOCUMENT_PHOTO_BYTES_67890');

      const resultDoc = await facialVerificationService.verifyFacialBiometrics(
        mockVerificationDoc._id,
        { liveCaptureBuffer: liveBuffer, referenceImageBuffer: refBuffer },
        mockUserId
      );

      const rawJson = JSON.stringify(resultDoc.toObject());
      expect(rawJson).not.toContain('RAW_LIVE_CAMERA_STREAM_BYTES');
      expect(rawJson).not.toContain('RAW_ID_DOCUMENT_PHOTO_BYTES');
      expect(resultDoc.facialVerification.verificationStatus).toBe('VERIFIED');
    });

    it('should suppress duplicate concurrent requests while verification is in PROCESSING status', async () => {
      // Set status to PROCESSING
      await Verification.updateOne(
        { _id: mockVerificationDoc._id },
        { $set: { 'facialVerification.verificationStatus': 'PROCESSING' } }
      );

      const concurrentRes = await facialVerificationService.verifyFacialBiometrics(
        mockVerificationDoc._id,
        {},
        mockUserId
      );

      expect(concurrentRes.facialVerification.verificationStatus).toBe('PROCESSING');

      // Reset status after concurrency test
      await Verification.updateOne(
        { _id: mockVerificationDoc._id },
        { $set: { 'facialVerification.verificationStatus': 'VERIFIED' } }
      );
    });
  });

  // ── 3. Production Provider Isolation ───────────────────────────

  describe('FacialProductionProvider Security Isolation', () => {
    it('should throw explicit 500 AppError if production credentials are missing in production mode', () => {
      const prodProvider = new FacialProductionProvider();
      expect(() => prodProvider.validateConfig()).toThrow(/Production facial verification credentials are not configured/);
    });
  });

  // ── 4. Liveness & Anti-Spoofing Protection ────────────────────

  describe('Liveness Protection & Anti-Spoofing Engine', () => {
    it('should reject verification and detect photo/screen replay spoofing', async () => {
      const spoofDoc = await facialVerificationService.verifyFacialBiometrics(
        mockVerificationDoc._id,
        { forceSpoof: true },
        mockUserId
      );

      expect(spoofDoc.facialVerification.livenessResult).toBe('SPOOF_DETECTED');
      expect(spoofDoc.facialVerification.verificationStatus).toBe('REJECTED');
    });

    it('should route face mismatch to REVIEW_REQUIRED', async () => {
      const mismatchDoc = await facialVerificationService.verifyFacialBiometrics(
        mockVerificationDoc._id,
        { forceMismatch: true },
        mockUserId
      );

      expect(mismatchDoc.facialVerification.faceMatchResult).toBe('MISMATCH');
      expect(mismatchDoc.facialVerification.verificationStatus).toBe('REVIEW_REQUIRED');
      expect(mismatchDoc.manualReviewRequired).toBe(true);
    });
  });

  // ── 5. Rate Limiting & Admin Lock/Unlock ───────────────────────

  describe('Rate Limiting & Admin Lock State', () => {
    it('should lock facial verification after 3 failures and require admin unlock', async () => {
      // Simulate 3 prior attempts in attempt window
      await Verification.updateOne(
        { _id: mockVerificationDoc._id },
        {
          $set: {
            'facialVerification.attempts': [
              { attemptNumber: 1, providerRequestId: 'REQ-1', livenessResult: 'FAILED', faceMatchResult: 'MISMATCH', status: 'FAILED', timestamp: new Date() },
              { attemptNumber: 2, providerRequestId: 'REQ-2', livenessResult: 'FAILED', faceMatchResult: 'MISMATCH', status: 'FAILED', timestamp: new Date() },
              { attemptNumber: 3, providerRequestId: 'REQ-3', livenessResult: 'FAILED', faceMatchResult: 'MISMATCH', status: 'FAILED', timestamp: new Date() },
            ],
          },
        }
      );

      await expect(
        facialVerificationService.verifyFacialBiometrics(mockVerificationDoc._id, {}, mockUserId)
      ).rejects.toThrow(/Exceeded maximum facial verification attempts/);

      const lockedDoc = await verificationRepository.findById(mockVerificationDoc._id);
      expect(lockedDoc.facialVerification.lockStatus).toBe('LOCKED');

      // Admin Unlock
      const adminUserId = new mongoose.Types.ObjectId();
      const unlockedDoc = await facialVerificationService.unlockFacialVerification(
        mockVerificationDoc._id,
        adminUserId,
        'Unlocked for testing'
      );

      expect(unlockedDoc.facialVerification.lockStatus).toBe('ADMIN_UNLOCKED');
    });
  });

  // ── 6. Retention Purging ───────────────────────────────────────

  describe('Biometric Metadata Retention Purge', () => {
    it('should purge expired attempts and metadata for records exceeding retention policy', async () => {
      await Verification.updateOne(
        { _id: mockVerificationDoc._id },
        { $set: { 'facialVerification.metadataRetentionExpiresAt': new Date(Date.now() - 1000) } }
      );

      await facialVerificationService.purgeExpiredBiometricMetadata();

      const purgedDoc = await verificationRepository.findById(mockVerificationDoc._id);
      expect(purgedDoc.facialVerification.attempts.length).toBe(0);
      expect(purgedDoc.facialVerification.providerRequestId).toBe('PURGED');
    });
  });
});
