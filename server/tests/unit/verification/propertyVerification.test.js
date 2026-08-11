import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Property from '../../../src/models/Property.js';
import Verification from '../../../src/models/Verification.js';
import verificationRepository from '../../../src/repositories/verificationRepository.js';
import propertyDocumentService from '../../../src/services/propertyDocumentService.js';
import propertyDocumentExtractionService from '../../../src/services/propertyDocumentExtractionService.js';
import propertyMatchingService from '../../../src/services/propertyMatchingService.js';
import propertyDecisionService from '../../../src/services/propertyDecisionService.js';
import propertyVerificationService from '../../../src/services/propertyVerificationService.js';
import PropertyProductionProvider from '../../../src/services/providers/propertyProductionProvider.js';
import { encryptData, decryptData } from '../../../src/utils/encryption.js';
import { seedVerificationDefaults } from '../../../src/utils/verificationSeed.js';

describe('Phase 3.6.2 Real Property Verification Unit & Integration Tests', () => {
  let mockUserId;
  let mockPropertyId;

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
      firstName: 'John',
      lastName: 'Landlord',
      email: 'john.landlord.p362@tms.com',
      password: 'password123',
      role: 'manager',
    });

    await Property.create({
      _id: mockPropertyId,
      name: 'Green Heights Apartment 4B',
      title: 'Green Heights Apartment 4B',
      address: 'Plot 42, Green Heights',
      type: 'apartment',
      rentAmount: 25000,
      owner: mockUserId,
      ownerName: 'John Landlord',
      surveyNumber: 'SN-9988',
      registrationNumber: 'REG-4433',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      propertyType: 'Residential Apartment',
      area: '1500 sq ft',
      managerId: mockUserId,
    });
  });

  afterAll(async () => {
    try {
      await User.deleteOne({ _id: mockUserId });
      await Property.deleteOne({ _id: mockPropertyId });
      await Verification.deleteMany({ entityId: mockPropertyId });
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors in test teardown
    }
  });

  // ── 1. Document & Encryption Service Tests ─────────────────────

  describe('PropertyDocumentService & AES-256-GCM Encryption', () => {
    it('should validate allowed property document categories and file constraints', () => {
      expect(propertyDocumentService.validateDocumentUpload('OWNERSHIP_DEED', null)).toBe(true);
      expect(propertyDocumentService.validateDocumentUpload('SALE_DEED', null)).toBe(true);
      expect(() => propertyDocumentService.validateDocumentUpload('INVALID_CATEGORY', null)).toThrow();
      expect(() => propertyDocumentService.validateDocumentUpload('OWNERSHIP_DEED', { size: 15 * 1024 * 1024 })).toThrow();
      expect(() => propertyDocumentService.validateDocumentUpload('OWNERSHIP_DEED', { mimetype: 'application/exe' })).toThrow();
    });

    it('should mask and encrypt sensitive property document references', () => {
      const docRef = 'DEED-987654321';
      const masked = propertyDocumentService.maskDocumentReference(docRef);
      expect(masked).toBe('XXXX-XXXXX4321');

      const cipherText = propertyDocumentService.encryptReference(docRef);
      expect(cipherText).toContain(':');

      const decrypted = decryptData(cipherText);
      expect(decrypted).toBe(docRef);
    });
  });

  // ── 2. Property Document Extraction Service Tests ─────────────

  describe('PropertyDocumentExtractionService', () => {
    it('should extract and normalize property metadata, defaulting missing attributes to UNKNOWN', () => {
      const rawInput = {
        extractedData: {
          ownerName: 'John Landlord',
          address: 'Plot 42, Green Heights',
          surveyNumber: 'SN-9988',
        },
      };

      const extracted = propertyDocumentExtractionService.extractPropertyData(rawInput);
      expect(extracted.ownerName).toBe('John Landlord');
      expect(extracted.address).toBe('Plot 42, Green Heights');
      expect(extracted.surveyNumber).toBe('SN-9988');
      expect(extracted.registrationNumber).toBe('UNKNOWN');
      expect(extracted.city).toBe('UNKNOWN');
    });
  });

  // ── 3. Property Matching Service Tests ─────────────────────────

  describe('PropertyMatchingService', () => {
    it('should calculate high confidence score for exact property match', () => {
      const registered = {
        ownerName: 'John Landlord',
        address: 'Plot 42, Green Heights',
        surveyNumber: 'SN-9988',
        propertyType: 'Residential Apartment',
      };
      const extracted = {
        ownerName: 'John Landlord',
        address: 'Plot 42, Green Heights',
        surveyNumber: 'SN-9988',
        propertyType: 'Residential Apartment',
      };

      const match = propertyMatchingService.matchProperty(registered, extracted);
      expect(match.matchResult).toBe('MATCH');
      expect(match.confidenceScore).toBe(100);
      expect(match.mismatchFields.length).toBe(0);
    });

    it('should detect survey number mismatch and report in mismatchFields', () => {
      const registered = {
        ownerName: 'John Landlord',
        address: 'Plot 42, Green Heights',
        surveyNumber: 'SN-9988',
      };
      const extracted = {
        ownerName: 'John Landlord',
        address: 'Plot 42, Green Heights',
        surveyNumber: 'SN-1111',
      };

      const match = propertyMatchingService.matchProperty(registered, extracted);
      expect(match.mismatchFields).toContain('surveyNumber');
      expect(match.matchResult).toBe('MISMATCH');
    });
  });

  // ── 4. Property Decision Service Tests ─────────────────────────

  describe('PropertyDecisionService', () => {
    it('should return VERIFIED for successful provider response with high match score', () => {
      const providerRes = { success: true, status: 'VERIFIED', confidenceScore: 96 };
      const matchEval = { matchResult: 'MATCH', mismatchFields: [] };

      const decision = propertyDecisionService.evaluateDecision(providerRes, matchEval);
      expect(decision.verificationStatus).toBe('VERIFIED');
      expect(decision.requiresManualReview).toBe(false);
    });

    it('should return REVIEW_REQUIRED for partial match or mismatch fields', () => {
      const providerRes = { success: true, status: 'VERIFIED', confidenceScore: 75 };
      const matchEval = { matchResult: 'PARTIAL_MATCH', mismatchFields: ['propertyType'] };

      const decision = propertyDecisionService.evaluateDecision(providerRes, matchEval);
      expect(decision.verificationStatus).toBe('REVIEW_REQUIRED');
      expect(decision.requiresManualReview).toBe(true);
    });

    it('should return UNAVAILABLE when provider is rate limited or unavailable', () => {
      const providerRes = { success: false, status: 'UNAVAILABLE', reason: 'Registry API offline' };
      const decision = propertyDecisionService.evaluateDecision(providerRes, {});

      expect(decision.verificationStatus).toBe('UNAVAILABLE');
    });
  });

  // ── 5. Production Provider Configuration & Security ───────────

  describe('PropertyProductionProvider Isolation', () => {
    it('should throw configuration error if credentials are missing in production mode', () => {
      const prodProvider = new PropertyProductionProvider();
      expect(() => prodProvider.validateConfig()).toThrow(/Production property provider credentials are not configured/);
    });
  });

  // ── 6. Property Verification Orchestration & Rate Limiting ───

  describe('PropertyVerificationService Execution', () => {
    let verificationDoc;

    beforeAll(async () => {
      verificationDoc = await verificationRepository.createVerification({
        entityType: 'PROPERTY',
        entityId: mockPropertyId,
        entityModel: 'Property',
        status: 'DRAFT',
      });
    });

    it('should execute verifyProperty, record masked ID, encrypted reference, and attempts', async () => {
      const updated = await propertyVerificationService.verifyProperty(verificationDoc._id, {
        documentType: 'OWNERSHIP_DEED',
        documentNumber: 'DEED-123456789',
        propertyId: mockPropertyId,
      }, mockUserId);

      expect(updated.propertyVerification).toBeDefined();
      expect(updated.propertyVerification.maskedDocumentReference).toBe('XXXX-XXXXX6789');
      expect(updated.propertyVerification.encryptedDocumentReference).toContain(':');
      expect(updated.propertyVerification.attempts.length).toBe(1);
      expect(updated.propertyVerification.verificationStatus).toBe('VERIFIED');
    });

    it('should enforce attempt limit and lock propertyVerification sub-document', async () => {
      config.PROPERTY_VERIFICATION_MAX_ATTEMPTS = 1;

      await expect(
        propertyVerificationService.verifyProperty(verificationDoc._id, {
          documentType: 'OWNERSHIP_DEED',
          documentNumber: 'DEED-999',
          propertyId: mockPropertyId,
        }, mockUserId)
      ).rejects.toThrow(/Exceeded maximum property verification attempts/);

      const lockedDoc = await verificationRepository.findById(verificationDoc._id);
      expect(lockedDoc.propertyVerification.lockStatus).toBe('LOCKED');

      config.PROPERTY_VERIFICATION_MAX_ATTEMPTS = 3;
    });

    it('should allow admin to unlock property verification', async () => {
      const unlocked = await propertyVerificationService.unlockPropertyVerification(verificationDoc._id, mockUserId, 'Admin cleared lock');
      expect(unlocked.propertyVerification.lockStatus).toBe('ADMIN_UNLOCKED');
    });
  });
});
