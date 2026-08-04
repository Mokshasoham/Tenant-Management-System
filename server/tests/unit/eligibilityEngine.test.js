import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';
import * as orchestrator from '../../src/modules/lease-renewal/eligibilityOrchestrator.js';
import * as policyService from '../../src/modules/lease-renewal/policyService.js';
import { ruleRegistry, BaseRule } from '../../src/modules/lease-renewal/eligibilityRuleEngine.js';
import { calculateRiskScore, getRiskGrade } from '../../src/modules/lease-renewal/riskEngine.js';
import LeaseRenewalCampaign from '../../src/models/LeaseRenewalCampaign.js';
import LeasePolicy from '../../src/models/LeasePolicy.js';
import EligibilityEvaluation from '../../src/models/EligibilityEvaluation.js';
import LeaseRenewalAudit from '../../src/models/LeaseRenewalAudit.js';
import Lease from '../../src/models/Lease.js';
import Tenant from '../../src/models/Tenant.js';
import User from '../../src/models/User.js';
import Bill from '../../src/models/Bill.js';
import Maintenance from '../../src/models/Maintenance.js';
import eventBus from '../../src/platform/events/eventBus.js';
import cacheProvider from '../../src/platform/cache/cacheProvider.js';

describe('Eligibility & Policy Decision Engine Tests', () => {
  let mockLease;
  let mockCampaign;
  let mockPolicy;
  let auditSpy;
  let eventBusSpy;

  let defaultRuleKeys;

  beforeAll(() => {
    defaultRuleKeys = new Set(ruleRegistry.rules.keys());
  });

  beforeEach(() => {
    mockLease = new Lease({
      leaseNumber: 'LSE-654321',
      tenant: new mongoose.Types.ObjectId(),
      property: new mongoose.Types.ObjectId(),
      rentAmount: 1500,
      securityDeposit: 3000,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: new Date(),
      createdBy: new mongoose.Types.ObjectId()
    });

    mockCampaign = new LeaseRenewalCampaign({
      campaignNumber: 'LCP-20260804-999999',
      lease: mockLease,
      tenant: mockLease.tenant,
      manager: mockLease.createdBy,
      property: { _id: mockLease.property, type: 'apartment' },
      startDate: mockLease.startDate,
      expiryDate: mockLease.endDate,
      status: 'draft',
      version: 1
    });

    mockPolicy = new LeasePolicy({
      name: 'Global Default Policy',
      propertyType: 'global',
      minDurationMonths: 6,
      maxDurationMonths: 24,
      maxRentIncreasePercent: 10,
      minNoticeDays: 30,
      maxCounterOffers: 3,
      autoApprovalEnabled: true,
      active: true
    });

    // Mock findById & populate for Lease, Tenant, User, and Campaign
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

    jest.spyOn(LeaseRenewalCampaign, 'findById').mockResolvedValue(mockCampaign);
    jest.spyOn(Tenant, 'findById').mockResolvedValue({ email: 'tenant@test.com' });
    jest.spyOn(User, 'findOne').mockResolvedValue({ firstName: 'Test', lastName: 'Tenant', email: 'tenant@test.com', phone: '1234567890', kycDocuments: ['doc'] });
    
    // Mock DB calls for Rules & Risk
    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(0);

    // Mock Policy DB calls
    jest.spyOn(LeasePolicy, 'findOne').mockImplementation((query) => {
      if (query.propertyType === 'global') return Promise.resolve(mockPolicy);
      return Promise.resolve(null);
    });

    // Mock Save & Updates
    jest.spyOn(EligibilityEvaluation, 'create').mockImplementation((payload) => {
      const doc = {
        ...payload,
        _id: new mongoose.Types.ObjectId(),
        toObject: function() { return this; }
      };
      return Promise.resolve(doc);
    });

    // Mock Audit and Event Services
    auditSpy = jest.spyOn(LeaseRenewalAudit, 'create').mockResolvedValue({});
    eventBusSpy = jest.spyOn(eventBus, 'publish').mockResolvedValue({});

    // Clear Cache
    jest.spyOn(cacheProvider, 'get').mockResolvedValue(null);
    jest.spyOn(cacheProvider, 'set').mockResolvedValue(true);
    jest.spyOn(cacheProvider, 'del').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset rule registry to defaults
    for (const key of ruleRegistry.rules.keys()) {
      if (!defaultRuleKeys.has(key)) {
        ruleRegistry.rules.delete(key);
      }
    }
  });

  it('should resolve policy with inheritance override hierarchy', async () => {
    const parentPolicy = new LeasePolicy({
      name: 'Residential Base Policy',
      propertyType: 'residential',
      maxRentIncreasePercent: 12,
      active: true
    });

    jest.spyOn(LeasePolicy, 'findOne').mockImplementation((query) => {
      if (query.propertyType === 'global') return Promise.resolve(mockPolicy);
      if (query.propertyType === 'residential') return Promise.resolve(parentPolicy);
      return Promise.resolve(null);
    });

    const resolved = await policyService.resolvePolicy({ propertyType: 'residential' });
    
    // Derived values should take maxRentIncreasePercent from the more specific 'residential' policy
    expect(resolved.maxRentIncreasePercent).toBe(12);
    // While fallback back to 'global' minDurationMonths
    expect(resolved.minDurationMonths).toBe(6);
  });

  it('should detect circular references in parent policies', async () => {
    const p1 = new LeasePolicy({ _id: new mongoose.Types.ObjectId(), propertyType: 'apartment', parentPolicy: null });
    const p2 = new LeasePolicy({ _id: new mongoose.Types.ObjectId(), propertyType: 'property', parentPolicy: p1._id });
    
    // Set p1's parent to p2 (creates a loop: p1 -> p2 -> p1)
    p1.parentPolicy = p2._id;

    jest.spyOn(LeasePolicy, 'findById').mockImplementation((id) => {
      if (id.toString() === p1._id.toString()) return Promise.resolve(p1);
      if (id.toString() === p2._id.toString()) return Promise.resolve(p2);
      return Promise.resolve(null);
    });

    await expect(
      policyService.savePolicy({
        propertyType: 'apartment',
        parentPolicy: p2._id
      }, { userId: 'admin' })
    ).rejects.toThrow('Circular reference detected');
  });

  it('should calculate risk score and match appropriate grades', async () => {
    // 2 late payments (deduct 20) + 1 damage ticket (deduct 10) = 30 deduction. Score 70.
    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(2);
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(1);

    const risk = await calculateRiskScore({
      tenantId: new mongoose.Types.ObjectId(),
      propertyId: new mongoose.Types.ObjectId(),
      occupancyDurationMonths: 12
    });

    expect(risk.score).toBe(70);
    expect(risk.grade).toBe('Medium Risk');
  });

  it('should evaluate campaign successfully and generate audit/events', async () => {
    const evaluation = await orchestrator.evaluateCampaign(mockCampaign._id, {
      proposedRent: 1600, // 6.6% increase
      proposedDurationMonths: 12
    });

    expect(evaluation.eligible).toBe(true);
    expect(evaluation.riskGrade).toBe('Excellent');
    expect(eventBusSpy).toHaveBeenCalledWith('lease.renewal.evaluated', expect.any(Object));
    expect(eventBusSpy).toHaveBeenCalledWith('lease.renewal.eligible', expect.any(Object));
  });

  it('should fail eligibility if blockers exist', async () => {
    // Overdue bills exist
    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);

    const evaluation = await orchestrator.evaluateCampaign(mockCampaign._id);

    expect(evaluation.eligible).toBe(false);
    expect(evaluation.explainability.why.some(w => w.includes('Payment Overdue'))).toBe(true);
    expect(evaluation.explainability.recommendations).toContain('Tenant must settle outstanding bill balances.');
  });

  it('should handle execution timeout for a slow rule gracefully', async () => {
    // Register a custom slow rule
    class SlowRule extends BaseRule {
      constructor() {
        super({
          id: 'slow-rule',
          name: 'Slow Check Rule',
          version: '1.0',
          category: 'Integration',
          severity: 'HIGH'
        });
      }
      async execute(context) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ passed: true, reason: 'Finished after delay' });
          }, 1500); // Exceeds 1000ms limit
        });
      }
    }

    ruleRegistry.register(new SlowRule());

    const evaluation = await orchestrator.evaluateCampaign(mockCampaign._id);
    
    // SlowRule should timeout and fail, and since it is HIGH severity, eligibility should fail
    expect(evaluation.eligible).toBe(false);
    const slowRuleResult = evaluation.rules.find(r => r.id === 'slow-rule');
    expect(slowRuleResult.passed).toBe(false);
    expect(slowRuleResult.reason).toContain('timeout exceeded');
  });
});
