import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Verification from '../../../src/models/Verification.js';
import verificationRepository from '../../../src/repositories/verificationRepository.js';
import identityMatchingService from '../../../src/services/identityMatchingService.js';
import identityDecisionService from '../../../src/services/identityDecisionService.js';
import identityVerificationService from '../../../src/services/identityVerificationService.js';
import identityDocumentService from '../../../src/services/identityDocumentService.js';
import { encryptData, decryptData } from '../../../src/utils/encryption.js';
import ProductionProvider from '../../../src/services/providers/productionProvider.js';
import { seedVerificationDefaults } from '../../../src/utils/verificationSeed.js';

describe('Phase 3.6.1 Real Identity Verification Unit & Integration Tests', () => {
  let mockUserId;

  beforeAll(async () => {
    jest.setTimeout(30000);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.MONGODB_URI);
    }
    await seedVerificationDefaults();

    mockUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: mockUserId,
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith.p361@tms.com',
      password: 'password123',
      role: 'tenant',
      dob: '1992-05-15',
    });
  });

  afterAll(async () => {
    try {
      await User.deleteOne({ _id: mockUserId });
      await Verification.deleteMany({ entityId: mockUserId });
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors in test teardown
    }
  });

  // ── 1. Document & Encryption Service Tests ─────────────────────

  describe('IdentityDocumentService & AES-256-GCM Encryption', () => {
    it('should encrypt and decrypt sensitive identity references using AES-256-GCM', () => {
      const plaintext = 'SEC-REF-AADHAAR-123456-7890';
      const cipherText = encryptData(plaintext);

      expect(cipherText).not.toBe(plaintext);
      expect(cipherText).toContain(':'); // iv:authTag:encrypted

      const decrypted = decryptData(cipherText);
      expect(decrypted).toBe(plaintext);
    });

    it('should correctly mask document numbers', () => {
      expect(identityDocumentService.maskDocumentNumber('123456789012')).toBe('XXXXXXXX9012');
      expect(identityDocumentService.maskDocumentNumber('ABC12345')).toBe('XXXX2345');
      expect(identityDocumentService.maskDocumentNumber('123')).toBe('XXX');
      expect(identityDocumentService.maskDocumentNumber('')).toBe('');
    });

    it('should validate allowed document types and file constraints', () => {
      expect(identityDocumentService.validateDocumentUpload('GOVT_ID', null)).toBe(true);
      expect(() => identityDocumentService.validateDocumentUpload('INVALID_TYPE', null)).toThrow();
      expect(() => identityDocumentService.validateDocumentUpload('GOVT_ID', { size: 15 * 1024 * 1024 })).toThrow();
    });

    it('should generate secure reference strings', () => {
      const ref = identityDocumentService.generateSecureReference('AADHAAR', mockUserId);
      expect(ref).toContain('SEC-REF-AADHAAR-');
    });
  });

  describe('ProductionProvider Security & Isolation', () => {
    it('should throw configuration error if credentials are missing in production mode', () => {
      const prodProvider = new ProductionProvider();
      expect(() => prodProvider.validateConfig()).toThrow(/Production identity provider credentials are not configured/);
    });
  });

  // ── 2. Data Matching Service Tests ─────────────────────────────

  describe('IdentityMatchingService', () => {
    it('should score exact match high and classify as MATCH', () => {
      const userProfile = { firstName: 'Alice', lastName: 'Smith', dob: '1992-05-15' };
      const extractedData = { name: 'Alice Smith', dob: '1992-05-15', documentNumber: 'ID-9999' };

      const result = identityMatchingService.matchIdentity(userProfile, extractedData);
      expect(result.matchResult).toBe('MATCH');
      expect(result.confidenceScore).toBe(100);
      expect(result.mismatchFields.length).toBe(0);
    });

    it('should score partial name match and classify as PARTIAL_MATCH', () => {
      const userProfile = { firstName: 'Alice', lastName: 'Smith', dob: '1992-05-15' };
      const extractedData = { name: 'Alice Smith-Jones', dob: '1992-05-15' };

      const result = identityMatchingService.matchIdentity(userProfile, extractedData);
      expect(result.matchResult).toBe('PARTIAL_MATCH');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    });

    it('should detect DOB mismatch and report in mismatchFields', () => {
      const userProfile = { firstName: 'Alice', lastName: 'Smith', dob: '1992-05-15' };
      const extractedData = { name: 'Alice Smith', dob: '1990-01-01' };

      const result = identityMatchingService.matchIdentity(userProfile, extractedData);
      expect(result.mismatchFields).toContain('dob');
      expect(result.matchResult).toBe('MISMATCH');
    });
  });

  // ── 3. Decision Service Tests ───────────────────────────────────

  describe('IdentityDecisionService', () => {
    it('should return VERIFIED for successful provider response with high match score', () => {
      const providerRes = { success: true, status: 'VERIFIED', confidenceScore: 95 };
      const matchEval = { matchResult: 'MATCH', mismatchFields: [] };

      const decision = identityDecisionService.evaluateDecision(providerRes, matchEval);
      expect(decision.verificationStatus).toBe('VERIFIED');
      expect(decision.requiresManualReview).toBe(false);
    });

    it('should return REVIEW_REQUIRED for partial match or mismatch fields', () => {
      const providerRes = { success: true, status: 'VERIFIED', confidenceScore: 70 };
      const matchEval = { matchResult: 'PARTIAL_MATCH', mismatchFields: ['name_spelling_variation'] };

      const decision = identityDecisionService.evaluateDecision(providerRes, matchEval);
      expect(decision.verificationStatus).toBe('REVIEW_REQUIRED');
      expect(decision.requiresManualReview).toBe(true);
    });

    it('should return UNAVAILABLE when provider is rate limited or unavailable', () => {
      const providerRes = { success: false, status: 'UNAVAILABLE', reason: 'Service down' };
      const decision = identityDecisionService.evaluateDecision(providerRes, {});

      expect(decision.verificationStatus).toBe('UNAVAILABLE');
    });
  });

  // ── 4. End-to-End Orchestrator Service Tests ───────────────────

  describe('IdentityVerificationService Execution', () => {
    let verificationDoc;

    beforeAll(async () => {
      verificationDoc = await verificationRepository.createVerification({
        entityType: 'TENANT',
        entityId: mockUserId,
        entityModel: 'User',
        status: 'DRAFT',
      });
    });

    it('should execute verifyIdentity, record masked ID, attempts, and update document', async () => {
      const updated = await identityVerificationService.verifyIdentity(verificationDoc._id, {
        documentType: 'GOVT_ID',
        documentNumber: 'ID-123456789',
      }, mockUserId);

      expect(updated.identityVerification).toBeDefined();
      expect(updated.identityVerification.maskedDocumentNumber).toBe('XX-XXXXX6789');
      expect(updated.identityVerification.attempts.length).toBe(1);
      expect(updated.identityVerification.verificationStatus).toBe('VERIFIED');
    });

    it('should enforce configurable attempt limit and set isolated lockStatus to LOCKED', async () => {
      // Temporarily lower max attempts for testing rate limiting
      config.IDENTITY_VERIFICATION_MAX_ATTEMPTS = 1;

      await expect(
        identityVerificationService.verifyIdentity(verificationDoc._id, {
          documentType: 'GOVT_ID',
          documentNumber: 'ID-999',
        }, mockUserId)
      ).rejects.toThrow(/Exceeded maximum verification attempts/);

      const lockedDoc = await verificationRepository.findById(verificationDoc._id);
      expect(lockedDoc.identityVerification.lockStatus).toBe('LOCKED');

      // Reset max attempts config
      config.IDENTITY_VERIFICATION_MAX_ATTEMPTS = 3;
    });

    it('should allow admin to unlock identity verification', async () => {
      const unlocked = await identityVerificationService.unlockIdentityVerification(verificationDoc._id, mockUserId, 'Admin cleared lock');
      expect(unlocked.identityVerification.lockStatus).toBe('ADMIN_UNLOCKED');
    });
  });
});
