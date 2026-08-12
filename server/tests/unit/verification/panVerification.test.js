import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Verification from '../../../src/models/Verification.js';
import panVerificationService from '../../../src/services/panVerificationService.js';
import { PANProductionProvider } from '../../../src/services/providers/panProductionProvider.js';
import { seedVerificationDefaults } from '../../../src/utils/verificationSeed.js';

describe('Phase 3.6.4 Real PAN Verification Unit & Integration Tests', () => {
  let mockUserId;
  let otherUserId;
  let verificationDoc;
  const originalPanEnabled = config.PAN_ENABLED;
  const originalRealPan = config.REAL_PAN_VERIFICATION;

  beforeAll(async () => {
    jest.setTimeout(30000);
    config.PAN_ENABLED = true;
    config.REAL_PAN_VERIFICATION = false;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.MONGODB_URI);
    }
    await seedVerificationDefaults();

    mockUserId = new mongoose.Types.ObjectId();
    otherUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: mockUserId,
      firstName: 'Pan',
      lastName: 'User',
      email: 'pan.user.p364@tms.com',
      password: 'password123',
      role: 'tenant',
    });

    await User.create({
      _id: otherUserId,
      firstName: 'Other',
      lastName: 'User',
      email: 'other.pan.p364@tms.com',
      password: 'password123',
      role: 'tenant',
    });

    verificationDoc = await Verification.create({
      entityType: 'TENANT',
      entityId: mockUserId,
      entityModel: 'User',
      status: 'DRAFT',
    });
  });

  afterAll(async () => {
    config.PAN_ENABLED = originalPanEnabled;
    config.REAL_PAN_VERIFICATION = originalRealPan;
    try {
      await User.deleteMany({ _id: { $in: [mockUserId, otherUserId] } });
      await Verification.deleteMany({ entityId: { $in: [mockUserId, otherUserId] } });
      await mongoose.disconnect();
    } catch (e) {
      // Ignore cleanup error
    }
  });

  describe('1. Formatting, Masking & Zero Plaintext Storage', () => {
    it('should reject invalid PAN format with 400 Bad Request', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      await expect(
        panVerificationService.verifyPan(verificationDoc._id, { panNumber: 'INVALID123' }, requester)
      ).rejects.toThrow('Invalid PAN format');
    });

    it('should mask PAN leaving only last 5 characters visible', () => {
      const masked = panVerificationService.maskPan('ABCDE1234F');
      expect(masked).toBe('XXXXX1234F');
    });

    it('should store zero plaintext PAN numbers in MongoDB schema', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const rawPan = 'ABCDE1234F';

      await panVerificationService.verifyPan(
        verificationDoc._id,
        { panNumber: rawPan },
        requester
      );

      const dbDoc = await Verification.findById(verificationDoc._id).lean();
      const info = dbDoc.panVerification;

      expect(info.maskedPanNumber).toBe('XXXXX1234F');
      expect(info.encryptedPanReference).toBeDefined();
      expect(info.encryptedPanReference).toContain(':');
      expect(JSON.stringify(dbDoc)).not.toContain(rawPan);
      expect(dbDoc.panVerification.panNumber).toBeUndefined();
    });
  });

  describe('2. PAN Verification & Profile Matching Engine', () => {
    it('should verify valid PAN and return confidenceScore as null by default', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const res = await panVerificationService.verifyPan(
        verificationDoc._id,
        { panNumber: 'ABCDE1234F' },
        requester
      );

      expect(res.verificationStatus).toBe('VERIFIED');
      expect(res.matchDetails.nameMatched).toBe(true);
      expect(res.verifiedAt).toBeDefined();
      expect(res.confidenceScore).toBeNull();
    });

    it('should mark verificationStatus as MISMATCH when name/dob mismatch occurs', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const mismatchDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: mockUserId,
        entityModel: 'User',
        status: 'DRAFT',
      });

      const res = await panVerificationService.verifyPan(
        mismatchDoc._id,
        { panNumber: 'ABCDE1234F', forceMismatch: true },
        requester
      );

      expect(res.verificationStatus).toBe('MISMATCH');
      expect(res.matchDetails.nameMatched).toBe(false);
    });

    it('should mark verificationStatus as FAILED on non-existent PAN', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const failDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: mockUserId,
        entityModel: 'User',
        status: 'DRAFT',
      });

      const res = await panVerificationService.verifyPan(
        failDoc._id,
        { panNumber: 'ABCDE1234F', forceInvalid: true },
        requester
      );

      expect(res.verificationStatus).toBe('FAILED');
    });
  });

  describe('3. Rate-Limiting, Lockout & Admin Unlock', () => {
    it('should lock PAN verification when maximum failed attempts are reached', async () => {
      const lockUser = new mongoose.Types.ObjectId();
      const lockDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: lockUser,
        entityModel: 'User',
        status: 'DRAFT',
      });
      const requester = { userId: lockUser, role: 'tenant' };

      for (let i = 0; i < 3; i++) {
        await panVerificationService.verifyPan(
          lockDoc._id,
          { panNumber: 'ABCDE1234F', forceInvalid: true },
          requester
        );
      }

      const updated = await Verification.findById(lockDoc._id);
      expect(updated.panVerification.lockStatus).toBe('LOCKED');

      await expect(
        panVerificationService.verifyPan(
          lockDoc._id,
          { panNumber: 'ABCDE1234F' },
          requester
        )
      ).rejects.toThrow(/locked/i);
    });

    it('should allow admin to unlock locked PAN verification', async () => {
      const lockDoc = await Verification.findOne({ 'panVerification.lockStatus': 'LOCKED' });
      expect(lockDoc).toBeDefined();

      const admin = { userId: new mongoose.Types.ObjectId(), role: 'admin' };
      const unlocked = await panVerificationService.unlockPanVerification(lockDoc._id, admin);

      expect(unlocked.lockStatus).toBe('ADMIN_UNLOCKED');
      expect(unlocked.lockedUntil).toBeNull();
    });
  });

  describe('4. IDOR Protection & Access Control', () => {
    it('should reject unauthorized cross-tenant PAN access with 403 Forbidden', async () => {
      const rogueRequester = { userId: otherUserId, role: 'tenant' };

      await expect(
        panVerificationService.verifyPan(
          verificationDoc._id,
          { panNumber: 'ABCDE1234F' },
          rogueRequester
        )
      ).rejects.toThrow('Forbidden');

      await expect(
        panVerificationService.getPanStatus(verificationDoc._id, rogueRequester)
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('5. Provider Contract Safety & Error Isolation', () => {
    it('should throw 500 AppError when production PAN provider is missing configuration', () => {
      const prodProvider = new PANProductionProvider();
      expect(() => prodProvider.validateConfig()).toThrow('Production PAN Provider configuration missing');
    });

    it('should map provider timeout to UNAVAILABLE status gracefully', async () => {
      const timeoutDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: mockUserId,
        entityModel: 'User',
        status: 'DRAFT',
      });
      const requester = { userId: mockUserId, role: 'tenant' };

      await expect(
        panVerificationService.verifyPan(
          timeoutDoc._id,
          { panNumber: 'ABCDE1234F', forceTimeout: true },
          requester
        )
      ).rejects.toThrow(/timed out/i);

      const dbDoc = await Verification.findById(timeoutDoc._id);
      expect(dbDoc.panVerification.verificationStatus).toBe('UNAVAILABLE');
    });
  });
});
