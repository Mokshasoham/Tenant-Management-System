import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Property from '../../../src/models/Property.js';
import Verification from '../../../src/models/Verification.js';
import verificationRepository from '../../../src/repositories/verificationRepository.js';
import digilockerService from '../../../src/services/digilockerService.js';
import DigiLockerProductionProvider from '../../../src/services/providers/digilockerProductionProvider.js';
import { encryptData, decryptData } from '../../../src/utils/encryption.js';
import { seedVerificationDefaults } from '../../../src/utils/verificationSeed.js';

describe('Phase 3.6.3 DigiLocker Integration Unit & Integration Tests', () => {
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
      firstName: 'Digi',
      lastName: 'User',
      email: 'digi.user.p363@tms.com',
      password: 'password123',
      role: 'tenant',
    });

    await Property.create({
      _id: mockPropertyId,
      name: 'DigiLocker Verification Test Property',
      address: 'Plot 42, Green Heights',
      type: 'apartment',
      rentAmount: 25000,
      owner: mockUserId,
      ownerName: 'Digi User',
      surveyNumber: 'SN-9988',
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

  // ── 1. OAuth Security & State Validation ─────────────────────

  describe('OAuth Security & Encrypted State Validation', () => {
    it('should generate and validate encrypted OAuth state with timestamp and user binding', () => {
      const state = digilockerService.generateOAuthState(mockVerificationDoc._id, mockUserId);
      expect(state).toContain(':');

      const validated = digilockerService.validateOAuthState(state, mockUserId);
      expect(validated.verificationId).toBe(mockVerificationDoc._id.toString());
      expect(validated.userId).toBe(mockUserId.toString());
      expect(validated.timestamp).toBeDefined();
    });

    it('should reject state parameter if user ID does not match expected requester (IDOR protection)', () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const state = digilockerService.generateOAuthState(mockVerificationDoc._id, mockUserId);

      expect(() => digilockerService.validateOAuthState(state, otherUserId)).toThrow(/OAuth state user mismatch/);
    });

    it('should reject corrupted or invalid state parameters', () => {
      expect(() => digilockerService.validateOAuthState('invalid_state_string')).toThrow();
    });
  });

  // ── 2. Production Provider Isolation & Configuration ───────────

  describe('DigiLockerProductionProvider Security Isolation', () => {
    it('should throw explicit 500 error if production credentials are missing in production mode', () => {
      const prodProvider = new DigiLockerProductionProvider();
      expect(() => prodProvider.validateConfig()).toThrow(/Production DigiLocker credentials are not configured/);
    });
  });

  // ── 3. Connection & Callback Processing ────────────────────────

  describe('DigiLocker OAuth Connection & Token Encryption', () => {
    it('should generate connect URL and exchange code for encrypted access tokens', async () => {
      const connectRes = await digilockerService.getConnectUrl(mockVerificationDoc._id, mockUserId);
      expect(connectRes.authUrl).toContain('sandbox.digitallocker.gov.in');

      const updated = await digilockerService.handleCallback('dev_code_123', connectRes.state, mockUserId);
      expect(updated.digilocker.connected).toBe(true);
      expect(updated.digilocker.consentStatus).toBe('GRANTED');
      expect(updated.digilocker.encryptedAccessToken).toContain(':');

      const status = await digilockerService.getStatus(mockVerificationDoc._id);
      expect(status.connected).toBe(true);
      expect(status.consentStatus).toBe('GRANTED');
    });

    it('should reject callback with invalid authorization code', async () => {
      const state = digilockerService.generateOAuthState(mockVerificationDoc._id, mockUserId);
      await expect(
        digilockerService.handleCallback('INVALID_CODE', state, mockUserId)
      ).rejects.toThrow(/DigiLocker authorization failed/);
    });
  });

  // ── 4. Document Listing, Import & Idempotency ──────────────────

  describe('Document Acquisition, Hash Integrity & Engine Feeding', () => {
    it('should list available DigiLocker issued documents for connected user', async () => {
      const docs = await digilockerService.listDocuments(mockVerificationDoc._id);
      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThan(0);
      expect(docs.some(d => d.documentType === 'AADHAAR')).toBe(true);
    });

    it('should import document, compute SHA-256 hash, tag source DIGILOCKER, and feed Identity Engine', async () => {
      const updated = await digilockerService.importDocument(
        mockVerificationDoc._id,
        {
          providerDocumentId: 'DL-DOC-AADHAAR-8877',
          targetCategory: 'AADHAAR',
        },
        mockUserId
      );

      const importedDoc = updated.documents.find(d => d.providerDocumentId === 'DL-DOC-AADHAAR-8877');
      expect(importedDoc).toBeDefined();
      expect(importedDoc.source).toBe('DIGILOCKER');
      expect(importedDoc.documentHash).toBeDefined();
      expect(importedDoc.documentHash.length).toBe(64); // SHA-256 hex length
      expect(updated.identityVerification.verificationStatus).toBe('VERIFIED');
    });

    it('should enforce idempotency and prevent duplicate import of same providerDocumentId or hash', async () => {
      const beforeCount = (await verificationRepository.findById(mockVerificationDoc._id)).documents.length;

      const duplicateImport = await digilockerService.importDocument(
        mockVerificationDoc._id,
        {
          providerDocumentId: 'DL-DOC-AADHAAR-8877',
          targetCategory: 'AADHAAR',
        },
        mockUserId
      );

      expect(duplicateImport.documents.length).toBe(beforeCount);
    });
  });

  // ── 5. Disconnection & Revocation ──────────────────────────────

  describe('DigiLocker Disconnection', () => {
    it('should disconnect account, revoke tokens, and clear consent state', async () => {
      const disconnected = await digilockerService.disconnect(mockVerificationDoc._id, mockUserId);
      expect(disconnected.digilocker.connected).toBe(false);
      expect(disconnected.digilocker.consentStatus).toBe('REVOKED');
      expect(disconnected.digilocker.encryptedAccessToken).toBe('');

      const status = await digilockerService.getStatus(mockVerificationDoc._id);
      expect(status.connected).toBe(false);
      expect(status.requiresReauth).toBe(true);
    });
  });
});
