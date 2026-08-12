import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Verification from '../../../src/models/Verification.js';
import gstVerificationService from '../../../src/services/gstVerificationService.js';
import { GSTProductionProvider } from '../../../src/services/providers/gstProductionProvider.js';
import { seedVerificationDefaults } from '../../../src/utils/verificationSeed.js';

describe('Phase 3.6.4 Real GST Verification Unit & Integration Tests', () => {
  let mockUserId;
  let otherUserId;
  let verificationDoc;
  const originalGstEnabled = config.GST_ENABLED;
  const originalRealGst = config.REAL_GST_VERIFICATION;

  beforeAll(async () => {
    jest.setTimeout(30000);
    config.GST_ENABLED = true;
    config.REAL_GST_VERIFICATION = false;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.MONGODB_URI);
    }
    await seedVerificationDefaults();

    mockUserId = new mongoose.Types.ObjectId();
    otherUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: mockUserId,
      firstName: 'Gst',
      lastName: 'User',
      email: 'gst.user.p364@tms.com',
      password: 'password123',
      role: 'tenant',
    });

    await User.create({
      _id: otherUserId,
      firstName: 'Other',
      lastName: 'User',
      email: 'other.gst.p364@tms.com',
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
    config.GST_ENABLED = originalGstEnabled;
    config.REAL_GST_VERIFICATION = originalRealGst;
    try {
      await User.deleteMany({ _id: { $in: [mockUserId, otherUserId] } });
      await Verification.deleteMany({ entityId: { $in: [mockUserId, otherUserId] } });
      await mongoose.disconnect();
    } catch (e) {
      // Ignore cleanup error
    }
  });

  describe('1. Formatting, Masking & Zero Plaintext Storage', () => {
    it('should reject invalid GSTIN format with 400 Bad Request', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      await expect(
        gstVerificationService.verifyGstin(verificationDoc._id, { gstin: 'INVALIDGSTIN' }, requester)
      ).rejects.toThrow('Invalid GSTIN format');
    });

    it('should mask GSTIN leaving state code and suffix visible', () => {
      const masked = gstVerificationService.maskGstin('22AAAAA0000A1Z5');
      expect(masked).toBe('22XXXXX0000A1Z5');
    });

    it('should store zero plaintext GSTIN numbers in MongoDB schema', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const rawGstin = '22AAAAA0000A1Z5';

      await gstVerificationService.verifyGstin(
        verificationDoc._id,
        { gstin: rawGstin },
        requester
      );

      const dbDoc = await Verification.findById(verificationDoc._id).lean();
      const info = dbDoc.gstVerification;

      expect(info.maskedGstin).toBe('22XXXXX0000A1Z5');
      expect(info.encryptedGstReference).toBeDefined();
      expect(info.encryptedGstReference).toContain(':');
      expect(JSON.stringify(dbDoc)).not.toContain(rawGstin);
      expect(dbDoc.gstVerification.gstin).toBeUndefined();
    });
  });

  describe('2. GSTIN Lookup & Business Verification Engine', () => {
    it('should verify active GSTIN and return confidenceScore as null by default', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const res = await gstVerificationService.verifyGstin(
        verificationDoc._id,
        { gstin: '22AAAAA0000A1Z5' },
        requester
      );

      expect(res.verificationStatus).toBe('VERIFIED');
      expect(res.businessDetails.gstinStatus).toBe('ACTIVE');
      expect(res.verifiedAt).toBeDefined();
      expect(res.confidenceScore).toBeNull();
    });

    it('should mark verificationStatus as INACTIVE when GSTIN registration is cancelled', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const inactiveDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: mockUserId,
        entityModel: 'User',
        status: 'DRAFT',
      });

      const res = await gstVerificationService.verifyGstin(
        inactiveDoc._id,
        { gstin: '22AAAAA0000A1Z5', forceInactive: true },
        requester
      );

      expect(res.verificationStatus).toBe('INACTIVE');
      expect(res.businessDetails.gstinStatus).toBe('CANCELLED');
    });

    it('should mark verificationStatus as FAILED on non-existent GSTIN registration', async () => {
      const requester = { userId: mockUserId, role: 'tenant' };
      const failDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: mockUserId,
        entityModel: 'User',
        status: 'DRAFT',
      });

      const res = await gstVerificationService.verifyGstin(
        failDoc._id,
        { gstin: '22AAAAA0000A1Z5', forceInvalid: true },
        requester
      );

      expect(res.verificationStatus).toBe('FAILED');
    });
  });

  describe('3. Rate-Limiting, Lockout & Admin Unlock', () => {
    it('should lock GSTIN verification when maximum failed attempts are reached', async () => {
      const lockUser = new mongoose.Types.ObjectId();
      const lockDoc = await Verification.create({
        entityType: 'TENANT',
        entityId: lockUser,
        entityModel: 'User',
        status: 'DRAFT',
      });
      const requester = { userId: lockUser, role: 'tenant' };

      for (let i = 0; i < 3; i++) {
        await gstVerificationService.verifyGstin(
          lockDoc._id,
          { gstin: '22AAAAA0000A1Z5', forceInvalid: true },
          requester
        );
      }

      const updated = await Verification.findById(lockDoc._id);
      expect(updated.gstVerification.lockStatus).toBe('LOCKED');

      await expect(
        gstVerificationService.verifyGstin(
          lockDoc._id,
          { gstin: '22AAAAA0000A1Z5' },
          requester
        )
      ).rejects.toThrow(/locked/i);
    });

    it('should allow admin to unlock locked GSTIN verification', async () => {
      const lockDoc = await Verification.findOne({ 'gstVerification.lockStatus': 'LOCKED' });
      expect(lockDoc).toBeDefined();

      const admin = { userId: new mongoose.Types.ObjectId(), role: 'admin' };
      const unlocked = await gstVerificationService.unlockGstVerification(lockDoc._id, admin);

      expect(unlocked.lockStatus).toBe('ADMIN_UNLOCKED');
      expect(unlocked.lockedUntil).toBeNull();
    });
  });

  describe('4. IDOR Protection & Access Control', () => {
    it('should reject unauthorized cross-tenant GSTIN access with 403 Forbidden', async () => {
      const rogueRequester = { userId: otherUserId, role: 'tenant' };

      await expect(
        gstVerificationService.verifyGstin(
          verificationDoc._id,
          { gstin: '22AAAAA0000A1Z5' },
          rogueRequester
        )
      ).rejects.toThrow('Forbidden');

      await expect(
        gstVerificationService.getGstStatus(verificationDoc._id, rogueRequester)
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('5. Provider Contract Safety & Error Isolation', () => {
    it('should throw 500 AppError when production GST provider is missing configuration', () => {
      const prodProvider = new GSTProductionProvider();
      expect(() => prodProvider.validateConfig()).toThrow('Production GST Provider configuration missing');
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
        gstVerificationService.verifyGstin(
          timeoutDoc._id,
          { gstin: '22AAAAA0000A1Z5', forceTimeout: true },
          requester
        )
      ).rejects.toThrow(/timed out/i);

      const dbDoc = await Verification.findById(timeoutDoc._id);
      expect(dbDoc.gstVerification.verificationStatus).toBe('UNAVAILABLE');
    });
  });
});
