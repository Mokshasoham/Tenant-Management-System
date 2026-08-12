import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Verification from '../../../src/models/Verification.js';
import aadhaarVerificationService from '../../../src/services/aadhaarVerificationService.js';
import { AadhaarProductionProvider } from '../../../src/services/providers/aadhaarProductionProvider.js';
import { seedVerificationDefaults } from '../../../src/utils/verificationSeed.js';

describe('Phase 3.6.4 Real Aadhaar Verification Unit & Integration Tests', () => {
  let mockUserId;
  let otherUserId;
  let verificationDoc;
  const originalAadhaarEnabled = config.AADHAAR_ENABLED;
  const originalRealAadhaar = config.REAL_AADHAAR_VERIFICATION;

  beforeAll(async () => {
    jest.setTimeout(30000);
    config.AADHAAR_ENABLED = true;
    config.REAL_AADHAAR_VERIFICATION = false;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.MONGODB_URI);
    }
    await seedVerificationDefaults();

    mockUserId = new mongoose.Types.ObjectId();
    otherUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: mockUserId,
      firstName: 'Aadhaar',
      lastName: 'User',
      email: 'aadhaar.user.p364@tms.com',
      password: 'password123',
      role: 'tenant',
    });

    await User.create({
      _id: otherUserId,
      firstName: 'Other',
      lastName: 'User',
      email: 'other.user.p364@tms.com',
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
    config.AADHAAR_ENABLED = originalAadhaarEnabled;
    config.REAL_AADHAAR_VERIFICATION = originalRealAadhaar;
    try {
      await User.deleteMany({ _id: { $in: [mockUserId, otherUserId] } });
      await Verification.deleteMany({ entityId: { $in: [mockUserId, otherUserId] } });
      await mongoose.disconnect();
    } catch (e) {
      // Ignore cleanup error
    }
  });

  describe('1. Formatting, Masking & Zero Plaintext Storage', () => {
    it('should reject invalid Aadhaar number formats with 400 Bad Request', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      await expect(
        aadhaarVerificationService.initiateAadhaarOtp(verificationDoc._id, { aadhaarNumber: '1234' }, requester)
      ).rejects.toThrow('Invalid Aadhaar number format');
    });

    it('should mask Aadhaar number leaving only last 4 digits visible', () => {
      const masked = aadhaarVerificationService.maskAadhaar('123456789012');
      expect(masked).toBe('XXXXXXXX9012');
    });

    it('should store zero plaintext Aadhaar numbers in MongoDB schema', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const rawAadhaar = '999988887777';

      await aadhaarVerificationService.initiateAadhaarOtp(
        verificationDoc._id,
        { aadhaarNumber: rawAadhaar },
        requester
      );

      const dbDoc = await Verification.findById(verificationDoc._id).lean();
      const info = dbDoc.aadhaarVerification;

      expect(info.maskedAadhaarNumber).toBe('XXXXXXXX7777');
      expect(info.encryptedAadhaarReference).toBeDefined();
      expect(info.encryptedAadhaarReference).toContain(':');
      expect(JSON.stringify(dbDoc)).not.toContain(rawAadhaar);
      expect(dbDoc.aadhaarVerification.aadhaarNumber).toBeUndefined();
    });
  });

  describe('2. OTP Workflow & Verification Engine', () => {
    it('should dispatch OTP and set verificationStatus to OTP_SENT', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const res = await aadhaarVerificationService.initiateAadhaarOtp(
        verificationDoc._id,
        { aadhaarNumber: '123456789012' },
        requester
      );

      expect(res.verificationStatus).toBe('OTP_SENT');
      expect(res.providerRequestId).toBeDefined();
      expect(res.otpSentAt).toBeDefined();
    });

    it('should fail OTP verification on invalid OTP code', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const res = await aadhaarVerificationService.verifyAadhaarOtp(
        verificationDoc._id,
        { otp: '000000' },
        requester
      );

      expect(res.verificationStatus).toBe('FAILED');
      expect(res.attempts.length).toBeGreaterThan(0);
    });

    it('should verify Aadhaar OTP with 123456 mock OTP and set confidenceScore to null by default', async () => {
      const freshUser = new mongoose.Types.ObjectId();
      const freshDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: freshUser,
        entityModel: 'User',
        status: 'DRAFT',
      });
      const requester = { userId: freshUser, role: 'tenant' };
      await aadhaarVerificationService.initiateAadhaarOtp(
        freshDoc._id,
        { aadhaarNumber: '123456789012' },
        requester
      );

      const res = await aadhaarVerificationService.verifyAadhaarOtp(
        freshDoc._id,
        { otp: '123456' },
        requester
      );

      expect(res.verificationStatus).toBe('VERIFIED');
      expect(res.verifiedAt).toBeDefined();
      expect(res.confidenceScore).toBeNull();
    });
  });

  describe('3. Rate-Limiting, Lockout & Admin Unlock', () => {
    it('should lock Aadhaar verification when maximum attempts are exceeded', async () => {
      const lockUser = new mongoose.Types.ObjectId();
      const lockDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: lockUser,
        entityModel: 'User',
        status: 'DRAFT',
      });
      const requester = { userId: lockUser, role: 'tenant' };

      for (let i = 0; i < 2; i++) {
        await aadhaarVerificationService.initiateAadhaarOtp(
          lockDoc._id,
          { aadhaarNumber: '123456789012' },
          requester
        );
        await aadhaarVerificationService.verifyAadhaarOtp(
          lockDoc._id,
          { otp: '999999' },
          requester
        );
      }

      await expect(
        aadhaarVerificationService.initiateAadhaarOtp(
          lockDoc._id,
          { aadhaarNumber: '123456789012' },
          requester
        )
      ).rejects.toThrow(/locked/i);

      const updated = await Verification.findById(lockDoc._id);
      expect(updated.aadhaarVerification.lockStatus).toBe('LOCKED');
    });

    it('should allow admin to unlock locked Aadhaar verification', async () => {
      const lockDoc = await Verification.findOne({ 'aadhaarVerification.lockStatus': 'LOCKED' });
      expect(lockDoc).toBeDefined();

      const admin = { userId: new mongoose.Types.ObjectId(), role: 'admin' };
      const unlocked = await aadhaarVerificationService.unlockAadhaarVerification(lockDoc._id, admin);

      expect(unlocked.lockStatus).toBe('ADMIN_UNLOCKED');
      expect(unlocked.lockedUntil).toBeNull();
    });
  });

  describe('4. IDOR Protection & Authorization Boundaries', () => {
    it('should reject unauthorized cross-tenant requests with 403 Forbidden', async () => {
      const rogueRequester = { userId: otherUserId, role: 'tenant' };

      await expect(
        aadhaarVerificationService.initiateAadhaarOtp(
          verificationDoc._id,
          { aadhaarNumber: '123456789012' },
          rogueRequester
        )
      ).rejects.toThrow('Forbidden');

      await expect(
        aadhaarVerificationService.getAadhaarStatus(verificationDoc._id, rogueRequester)
      ).rejects.toThrow('Forbidden');
    });

    it('should allow manager or admin to access verification records', async () => {
      const managerUser = { userId: new mongoose.Types.ObjectId(), role: 'manager' };
      const status = await aadhaarVerificationService.getAadhaarStatus(verificationDoc._id, managerUser);
      expect(status).toBeDefined();
    });
  });

  describe('5. Provider Contract Safety & Timeout Handling', () => {
    it('should throw 500 AppError when production provider is initialized without credentials', () => {
      const prodProvider = new AadhaarProductionProvider();
      expect(() => prodProvider.validateConfig()).toThrow('Production Aadhaar Provider configuration missing');
    });

    it('should map provider timeout to UNAVAILABLE status gracefully without inventing success', async () => {
      const timeoutDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: mockUserId,
        entityModel: 'User',
        status: 'DRAFT',
      });
      const requester = { userId: mockUserId, role: 'tenant' };

      await expect(
        aadhaarVerificationService.initiateAadhaarOtp(
          timeoutDoc._id,
          { aadhaarNumber: '123456789012', forceTimeout: true },
          requester
        )
      ).rejects.toThrow(/timed out/i);

      const dbDoc = await Verification.findById(timeoutDoc._id);
      expect(dbDoc.aadhaarVerification.verificationStatus).toBe('UNAVAILABLE');
    });
  });
});
