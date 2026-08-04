import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import * as service from '../../src/modules/lease-renewal/service.js';
import LeaseRenewal from '../../src/modules/lease-renewal/model.js';
import LeaseRenewalAudit from '../../src/models/LeaseRenewalAudit.js';
import Lease from '../../src/models/Lease.js';
import Tenant from '../../src/models/Tenant.js';
import User from '../../src/models/User.js';
import { RenewalStatus } from '../../src/modules/lease-renewal/constants.js';

describe('Lease Renewal Negotiation & Approvals Workflow Tests', () => {
  let mockRenewal;

  beforeEach(() => {
    mockRenewal = new LeaseRenewal({
      lease: new mongoose.Types.ObjectId(),
      tenant: new mongoose.Types.ObjectId(),
      manager: new mongoose.Types.ObjectId(),
      property: new mongoose.Types.ObjectId(),
      requestedStartDate: new Date(),
      requestedEndDate: new Date(),
      duration: '12 months',
      proposedRent: 1500,
      type: 'tenant_request',
      status: RenewalStatus.REQUESTED,
      renewalNumber: 'LRN-2026-000001',
      counterOffers: [],
      messages: []
    });

    const queryStub = {
      populate: jest.fn().mockResolvedValue(mockRenewal)
    };
    jest.spyOn(LeaseRenewal, 'findOne').mockReturnValue(queryStub);
    jest.spyOn(mockRenewal, 'save').mockResolvedValue(mockRenewal);

    // Mock Audit creation and Lease queries to prevent DB timeout hangs
    jest.spyOn(LeaseRenewalAudit, 'create').mockResolvedValue({});
    jest.spyOn(Lease, 'findById').mockResolvedValue(null);

    // Mock Tenant and User lookups for Tenant checks
    jest.spyOn(Tenant, 'findById').mockResolvedValue({ email: 'moksha@test.com' });
    jest.spyOn(User, 'findById').mockResolvedValue({ email: 'moksha@test.com' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully submit a counter offer', async () => {
    // Transition requested -> counter_offer is valid
    mockRenewal.status = RenewalStatus.REQUESTED;

    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    const result = await service.submitCounterOffer(mockRenewal._id, {
      proposedRent: 1600,
      duration: '12 months',
      message: 'New offer details'
    }, user);

    expect(result.status).toBe(RenewalStatus.COUNTER_OFFER);
    expect(result.proposedRent).toBe(1600);
    expect(result.renewalVersion).toBe(2);
    expect(result.counterOffers.length).toBe(1);
    expect(result.counterOffers[0].proposedRent).toBe(1600);
  });

  it('should successfully append chat messages to the renewal history thread', async () => {
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin', name: 'Moksha' };

    const messages = await service.addMessage(mockRenewal._id, 'Can we reduce the rent?', user);
    
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Can we reduce the rent?');
    expect(messages[0].senderName).toBe('Moksha');
  });

  it('should successfully approve and accept renewal terms', async () => {
    // Transition under_review -> approved is valid
    mockRenewal.status = RenewalStatus.UNDER_REVIEW;
    
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    const result = await service.acceptRenewal(mockRenewal._id, user);
    
    expect(result.status).toBe(RenewalStatus.APPROVED);
    expect(result.approvedBy.toString()).toBe(user.userId);
  });

  it('should successfully capture tenant digital signature', async () => {
    // Transition approved -> signed is valid
    mockRenewal.status = RenewalStatus.APPROVED;
    
    const user = { 
      userId: new mongoose.Types.ObjectId().toString(), 
      role: 'tenant' 
    };

    const result = await service.signRenewal(
      mockRenewal._id,
      'data:image/png;base64,signatureBytes...',
      user,
      '127.0.0.1',
      'Mozilla/5.0'
    );

    expect(result.status).toBe(RenewalStatus.SIGNED);
    expect(result.tenantSignature.signatureData).toBe('data:image/png;base64,signatureBytes...');
    expect(result.tenantSignature.ipAddress).toBe('127.0.0.1');
  });
});
