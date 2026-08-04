import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import * as campaignService from '../../src/modules/lease-renewal/campaignService.js';
import { toCampaignDto } from '../../src/modules/lease-renewal/campaignDto.js';
import LeaseRenewalCampaign from '../../src/models/LeaseRenewalCampaign.js';
import LeaseRenewalAudit from '../../src/models/LeaseRenewalAudit.js';
import Lease from '../../src/models/Lease.js';
import Tenant from '../../src/models/Tenant.js';
import User from '../../src/models/User.js';
import Counter from '../../src/models/Counter.js';
import eventBus from '../../src/platform/events/eventBus.js';
import { RenewalCampaignStatus } from '../../src/modules/lease-renewal/campaignConstants.js';

describe('Lease Renewal Campaign Foundation Tests', () => {
  let mockLease;
  let mockCampaign;
  let auditSpy;
  let eventBusSpy;

  beforeEach(() => {
    mockLease = new Lease({
      leaseNumber: 'LSE-123456',
      tenant: new mongoose.Types.ObjectId(),
      property: new mongoose.Types.ObjectId(),
      rentAmount: 1200,
      securityDeposit: 2400,
      startDate: new Date(),
      endDate: new Date(),
      createdBy: new mongoose.Types.ObjectId()
    });

    mockCampaign = new LeaseRenewalCampaign({
      campaignNumber: 'LCP-20260804-000001',
      lease: mockLease._id,
      tenant: mockLease.tenant,
      manager: mockLease.createdBy,
      property: mockLease.property,
      startDate: mockLease.startDate,
      expiryDate: mockLease.endDate,
      status: RenewalCampaignStatus.DRAFT,
      version: 1,
      tags: ['test-tag'],
      labels: ['test-label'],
      customFields: new Map(),
      metadata: new Map(),
      lastActivityAt: new Date()
    });

    // Chained Mongoose Query Mocking via Thenables
    const mockLeaseQuery = {
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) {
        resolve(mockLease);
      }
    };
    jest.spyOn(Lease, 'findById').mockReturnValue(mockLeaseQuery);

    const mockCampaignQuery = {
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) {
        resolve(mockCampaign);
      }
    };
    jest.spyOn(LeaseRenewalCampaign, 'findOne').mockReturnValue(mockCampaignQuery);

    const mockFindQuery = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      then: function(resolve) {
        resolve([]);
      }
    };
    jest.spyOn(LeaseRenewalCampaign, 'find').mockReturnValue(mockFindQuery);

    jest.spyOn(Tenant, 'findById').mockResolvedValue({ email: 'test@tenant.com' });
    jest.spyOn(User, 'findOne').mockResolvedValue({ firstName: 'Tenant', lastName: 'Name', email: 'test@tenant.com' });
    jest.spyOn(User, 'findById').mockResolvedValue({ name: 'Property Manager' });

    // Mock Counter to return a valid sequence number
    jest.spyOn(Counter, 'findOneAndUpdate').mockResolvedValue({ seq: 1 });

    // Mock Mongoose model write operations
    jest.spyOn(LeaseRenewalCampaign, 'create').mockResolvedValue(mockCampaign);
    
    // Dynamic findOneAndUpdate mock that mimics property assignment
    jest.spyOn(LeaseRenewalCampaign, 'findOneAndUpdate').mockImplementation((query, updateObj) => {
      if (updateObj && updateObj.$set) {
        Object.assign(mockCampaign, updateObj.$set);
      }
      return Promise.resolve(mockCampaign);
    });

    // Mock Audit and Event Services by spying on their underlying dependency models/objects
    auditSpy = jest.spyOn(LeaseRenewalAudit, 'create').mockResolvedValue({});
    eventBusSpy = jest.spyOn(eventBus, 'publish').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create a campaign successfully and dispatch events', async () => {
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const result = await campaignService.createCampaign(mockLease._id, 'manual', user);

    expect(result.campaignNumber).toBe('LCP-20260804-000001');
    expect(result.status).toBe(RenewalCampaignStatus.DRAFT);
    expect(eventBusSpy).toHaveBeenCalledWith('lease.renewal.campaign.created', expect.any(Object));
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'CAMPAIGN_CREATE'
    }));
  });

  it('should throw an error when creating a campaign if the lease is not found', async () => {
    const mockLeaseQueryNull = {
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) {
        resolve(null);
      }
    };
    jest.spyOn(Lease, 'findById').mockReturnValue(mockLeaseQueryNull);
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    await expect(
      campaignService.createCampaign(mockLease._id, 'manual', user)
    ).rejects.toThrow('Target lease not found.');
  });

  it('should prevent creating a duplicate active campaign', async () => {
    // Override find to simulate an existing active campaign duplicate
    const mockFindQueryDuplicate = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      then: function(resolve) {
        resolve([mockCampaign]);
      }
    };
    jest.spyOn(LeaseRenewalCampaign, 'find').mockReturnValue(mockFindQueryDuplicate);
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    await expect(
      campaignService.createCampaign(mockLease._id, 'manual', user)
    ).rejects.toThrow('An active renewal campaign already exists for this lease.');
  });

  it('should throw an error if the campaign is not found during transition', async () => {
    const mockCampaignQueryNull = {
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) {
        resolve(null);
      }
    };
    jest.spyOn(LeaseRenewalCampaign, 'findOne').mockReturnValue(mockCampaignQueryNull);
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    await expect(
      campaignService.transitionStatus(mockCampaign._id, RenewalCampaignStatus.CREATED, user)
    ).rejects.toThrow('Campaign not found.');
  });

  it('should reject invalid status transitions', async () => {
    mockCampaign.status = RenewalCampaignStatus.DRAFT;
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    await expect(
      campaignService.transitionStatus(mockCampaign._id, RenewalCampaignStatus.WAITING_FOR_TENANT, user)
    ).rejects.toThrow('Invalid campaign state transition');
  });

  it('should successfully transition through allowed states', async () => {
    mockCampaign.status = RenewalCampaignStatus.DRAFT;
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    const result = await campaignService.transitionStatus(mockCampaign._id, RenewalCampaignStatus.CREATED, user);
    expect(result.status).toBe(RenewalCampaignStatus.CREATED);
    expect(eventBusSpy).toHaveBeenCalledWith('lease.renewal.campaign.updated', expect.any(Object));
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'CAMPAIGN_STATUS_TRANSITION'
    }));
  });

  it('should support DTO mapping and preserve future-proof fields', () => {
    const dto = toCampaignDto(mockCampaign);
    expect(dto.campaignNumber).toBe('LCP-20260804-000001');
    expect(dto.tags).toContain('test-tag');
    expect(dto.labels).toContain('test-label');
  });

  it('should surface version conflicts in repository updates', async () => {
    jest.spyOn(LeaseRenewalCampaign, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(LeaseRenewalCampaign, 'findById').mockResolvedValue(mockCampaign);
    const user = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    await expect(
      campaignService.transitionStatus(mockCampaign._id, RenewalCampaignStatus.CREATED, user)
    ).rejects.toThrow('Version conflict detected');
  });
});
