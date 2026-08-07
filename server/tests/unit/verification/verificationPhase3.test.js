import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Property from '../../../src/models/Property.js';
import Verification from '../../../src/models/Verification.js';
import TrustScoreHistory from '../../../src/models/TrustScoreHistory.js';
import verificationRepository from '../../../src/repositories/verificationRepository.js';
import trustScoreService from '../../../src/services/trustScoreService.js';
import verificationService from '../../../src/services/verificationService.js';
import { seedVerificationDefaults } from '../../../src/utils/verificationSeed.js';

describe('Phase 3 Verification Subsystem Unit Tests', () => {
  let mockTenantId;
  let mockManagerId;
  let mockPropertyId;

  beforeAll(async () => {
    jest.setTimeout(30000);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.MONGODB_URI);
    }
    // Seed verification templates and workflows
    await seedVerificationDefaults();

    mockTenantId = new mongoose.Types.ObjectId();
    mockManagerId = new mongoose.Types.ObjectId();
    mockPropertyId = new mongoose.Types.ObjectId();

    await User.create({
      _id: mockTenantId,
      firstName: 'John',
      lastName: 'Tenant',
      email: 'john.tenant.phase3@tms.com',
      password: 'password123',
      role: 'tenant',
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    await User.create({
      _id: mockManagerId,
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'sarah.manager.phase3@tms.com',
      password: 'password123',
      role: 'manager',
    });

    await Property.create({
      _id: mockPropertyId,
      name: 'Sunset Heights',
      address: '123 Solar St',
      type: 'apartment',
      rentAmount: 2500,
      owner: mockManagerId,
      manager: mockManagerId,
    });
  });

  afterAll(async () => {
    try {
      await User.deleteMany({ _id: { $in: [mockTenantId, mockManagerId] } });
      await Property.deleteOne({ _id: mockPropertyId });
      await Verification.deleteMany({ entityId: { $in: [mockTenantId, mockManagerId, mockPropertyId] } });
      await TrustScoreHistory.deleteMany({ entityId: { $in: [mockTenantId, mockManagerId, mockPropertyId] } });
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors in test teardown
    }
  });

  // ── 1. Repository Tests ──────────────────────────────────────────

  describe('VerificationRepository', () => {
    it('should create and retrieve a verification document', async () => {
      const vDoc = await verificationRepository.createVerification({
        entityType: 'TENANT',
        entityId: mockTenantId,
        entityModel: 'User',
        status: 'DRAFT',
      });

      expect(vDoc).toBeDefined();
      expect(vDoc._id).toBeDefined();

      const retrieved = await verificationRepository.findById(vDoc._id);
      expect(retrieved.status).toBe('DRAFT');
    });

    it('should filter soft-deleted verifications by default', async () => {
      const vDoc = await verificationRepository.createVerification({
        entityType: 'TENANT',
        entityId: mockTenantId,
        entityModel: 'User',
        status: 'DRAFT',
      });

      await verificationRepository.softDeleteVerification(vDoc._id, mockManagerId);

      const retrieved = await verificationRepository.findById(vDoc._id);
      expect(retrieved).toBeNull();
    });
  });

  // ── 2. TrustScoreService Tests ────────────────────────────────────

  describe('TrustScoreService', () => {
    it('should calculate trust score breakdown accurately', () => {
      const workflow = {
        trustWeights: { identity: 30, phone: 15, business: 20, property: 10, reviews: 12, noFraud: 5, base: 8 },
      };

      const verification = {
        workflowId: workflow,
        documents: [{ documentType: 'AADHAAR', reviewStatus: 'ACCEPTED' }],
        riskScore: 0,
        riskFlags: {},
      };

      const userDoc = { isEmailVerified: true, isPhoneVerified: true, rating: 5.0 };

      const { score, breakdown } = trustScoreService.calculateScoreAndBreakdown('TENANT', verification, userDoc);

      expect(score).toBeGreaterThan(50);
      expect(breakdown.identity).toBe(30);
      expect(breakdown.phone).toBe(15);
      expect(breakdown.noFraud).toBe(5);
    });

    it('should record score changes and update User currentTrustScore cache', async () => {
      const historyDoc = await trustScoreService.updateTrustScore({
        entityType: 'TENANT',
        entityId: mockTenantId,
        reason: 'VERIFICATION_APPROVED',
        triggeredBy: mockManagerId,
      });

      expect(historyDoc).toBeDefined();
      expect(historyDoc.score).toBeGreaterThan(0);

      const user = await User.findById(mockTenantId);
      expect(user.currentTrustScore).toBe(historyDoc.score);
    });
  });

  // ── 3. VerificationService Tests ─────────────────────────────────

  describe('VerificationService', () => {
    let verificationDoc;

    it('should initiate a new verification draft for tenant', async () => {
      verificationDoc = await verificationService.initiateVerification('TENANT', mockTenantId, mockTenantId);

      expect(verificationDoc).toBeDefined();
      expect(verificationDoc.status).toBe('DRAFT');
      expect(verificationDoc.documents.length).toBeGreaterThan(0);
    });

    it('should upload a verification document', async () => {
      const updated = await verificationService.uploadVerificationDocument(
        verificationDoc._id,
        'AADHAAR',
        { fileId: new mongoose.Types.ObjectId(), filename: 'aadhaar.pdf', url: '/uploads/verification/aadhaar.pdf' },
        mockTenantId
      );

      const aadhaarDoc = updated.documents.find((d) => d.documentType === 'AADHAAR');
      expect(aadhaarDoc).toBeDefined();
      expect(aadhaarDoc.url).toBe('/uploads/verification/aadhaar.pdf');
    });

    it('should submit verification and generate VRF number', async () => {
      const submitted = await verificationService.submitVerification(verificationDoc._id, mockTenantId);

      expect(submitted.verificationNumber).toMatch(/^VRF-\d{4}-\d{6}$/);
      expect(['SUBMITTED', 'AUTO_REVIEW', 'ADMIN_REVIEW']).toContain(submitted.status);
    });

    it('should support admin approval flow and update trust score', async () => {
      const approved = await verificationService.adminApprove(verificationDoc._id, mockManagerId, 'Looks good');

      expect(approved.status).toBe('APPROVED');
      expect(approved.verifiedBy._id.toString()).toBe(mockManagerId.toString());

      const user = await User.findById(mockTenantId);
      expect(user.verificationStatus).toBe('approved');
    });

    it('should return pre-composed tenant widget payload', async () => {
      const widget = await verificationService.getWidgetData('TENANT', mockTenantId);

      expect(widget).toBeDefined();
      expect(widget.trustScore).toBeGreaterThan(0);
      expect(widget.verificationStatus).toBe('APPROVED');
      expect(widget.verificationBadge).toBe(true);
    });

    it('should return admin widget stats aggregate payload', async () => {
      const adminWidget = await verificationService.getWidgetData('ADMIN');

      expect(adminWidget).toBeDefined();
      expect(adminWidget.total).toBeGreaterThan(0);
    });
  });
});
