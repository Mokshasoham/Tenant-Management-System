import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../../../src/config/config.js';
import User from '../../../src/models/User.js';
import Verification from '../../../src/models/Verification.js';
import verificationService from '../../../src/services/verificationService.js';

describe('Phase 4 Verification Controller & Route Integration Tests', () => {
  let mockTenantId;
  let mockManagerId;
  let mockAdminId;

  beforeAll(async () => {
    jest.setTimeout(30000);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.MONGODB_URI);
    }

    mockTenantId = new mongoose.Types.ObjectId();
    mockManagerId = new mongoose.Types.ObjectId();
    mockAdminId = new mongoose.Types.ObjectId();

    await User.create({
      _id: mockTenantId,
      firstName: 'Alice',
      lastName: 'Tenant',
      email: 'alice.tenant.phase4@tms.com',
      password: 'password123',
      role: 'tenant',
    });

    await User.create({
      _id: mockManagerId,
      firstName: 'Bob',
      lastName: 'Manager',
      email: 'bob.manager.phase4@tms.com',
      password: 'password123',
      role: 'manager',
    });

    await User.create({
      _id: mockAdminId,
      firstName: 'Carol',
      lastName: 'Admin',
      email: 'carol.admin.phase4@tms.com',
      password: 'password123',
      role: 'admin',
    });
  });

  afterAll(async () => {
    try {
      await User.deleteMany({ _id: { $in: [mockTenantId, mockManagerId, mockAdminId] } });
      await Verification.deleteMany({ entityId: { $in: [mockTenantId, mockManagerId, mockAdminId] } });
      await mongoose.disconnect();
    } catch (e) {
      // Teardown fallback
    }
  });

  it('should fetch document templates via service wrapper', async () => {
    const templates = await verificationService.getDocumentTemplates();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
  });

  it('should fetch workflows via service wrapper', async () => {
    const workflows = await verificationService.getWorkflows();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
  });

  it('should initiate and submit verification through controller service flow', async () => {
    const vDoc = await verificationService.initiateVerification('TENANT', mockTenantId, mockTenantId);
    expect(vDoc.status).toBe('DRAFT');

    const submitted = await verificationService.submitVerification(vDoc._id, mockTenantId);
    expect(submitted.verificationNumber).toMatch(/^VRF-\d{4}-\d{6}$/);
    expect(['SUBMITTED', 'AUTO_REVIEW', 'ADMIN_REVIEW']).toContain(submitted.status);
  });

  it('should process admin approval and update user trust score', async () => {
    const vDoc = await verificationService.initiateVerification('TENANT', mockTenantId, mockTenantId);

    const approved = await verificationService.adminApprove(vDoc._id, mockAdminId, 'Phase 4 verification test');
    expect(approved.status).toBe('APPROVED');

    const user = await User.findById(mockTenantId);
    expect(user.verificationStatus).toBe('approved');
  });
});
