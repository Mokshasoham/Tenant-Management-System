/**
 * tests/unit/eligibilityEngine.test.js
 *
 * Full eligibility & policy decision engine test suite.
 * Covers: §5 Risk Engine, §6 Explainability, §7 Evaluation History,
 *          §8 Events, §9 Simulation, §10 Performance, §11 Concurrency.
 * Original §1-§4 core tests (policy inheritance, circular ref, risk grade, evaluate, fail, timeout)
 * are preserved below.
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';
import * as orchestrator from '../../src/modules/lease-renewal/eligibilityOrchestrator.js';
import * as policyService from '../../src/modules/lease-renewal/policyService.js';
import { ruleRegistry, BaseRule } from '../../src/modules/lease-renewal/eligibilityRuleEngine.js';
import {
  calculateRiskScore,
  getRiskGrade,
  PaymentRiskStrategy,
  MaintenanceRiskStrategy,
  ViolationRiskStrategy,
  OccupancyRiskStrategy
} from '../../src/modules/lease-renewal/riskEngine.js';
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

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

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
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
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

    const mockLeaseQuery = {
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) { resolve(mockLease); }
    };
    jest.spyOn(Lease, 'findById').mockReturnValue(mockLeaseQuery);

    const mockCampaignQuery = {
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) { resolve(mockCampaign); }
    };
    jest.spyOn(LeaseRenewalCampaign, 'findOne').mockReturnValue(mockCampaignQuery);
    jest.spyOn(LeaseRenewalCampaign, 'findById').mockResolvedValue(mockCampaign);

    jest.spyOn(Tenant, 'findById').mockResolvedValue({ email: 'tenant@test.com' });
    jest.spyOn(User, 'findOne').mockResolvedValue({
      firstName: 'Test', lastName: 'Tenant',
      email: 'tenant@test.com', phone: '1234567890',
      kycDocuments: ['doc']
    });

    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(0);

    jest.spyOn(LeasePolicy, 'findOne').mockImplementation(query => {
      if (query.propertyType === 'global') return Promise.resolve(mockPolicy);
      return Promise.resolve(null);
    });

    jest.spyOn(EligibilityEvaluation, 'create').mockImplementation(payload => {
      const doc = {
        ...payload,
        _id: new mongoose.Types.ObjectId(),
        toObject() { return this; }
      };
      return Promise.resolve(doc);
    });

    auditSpy  = jest.spyOn(LeaseRenewalAudit, 'create').mockResolvedValue({});
    eventBusSpy = jest.spyOn(eventBus, 'publish').mockResolvedValue({});

    jest.spyOn(cacheProvider, 'get').mockResolvedValue(null);
    jest.spyOn(cacheProvider, 'set').mockResolvedValue(true);
    jest.spyOn(cacheProvider, 'del').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of ruleRegistry.rules.keys()) {
      if (!defaultRuleKeys.has(key)) ruleRegistry.rules.delete(key);
    }
    for (const key of defaultRuleKeys) {
      if (ruleRegistry.rules.has(key)) ruleRegistry.rules.get(key).enabled = true;
    }
  });

  // =========================================================================
  // Original core tests (preserved)
  // =========================================================================

  it('§3 — resolves policy with inheritance override hierarchy', async () => {
    const parentPolicy = new LeasePolicy({
      name: 'Residential Base Policy',
      propertyType: 'residential',
      maxRentIncreasePercent: 12,
      active: true
    });

    jest.spyOn(LeasePolicy, 'findOne').mockImplementation(query => {
      if (query.propertyType === 'global')      return Promise.resolve(mockPolicy);
      if (query.propertyType === 'residential') return Promise.resolve(parentPolicy);
      return Promise.resolve(null);
    });

    const resolved = await policyService.resolvePolicy({ propertyType: 'residential' });
    expect(resolved.maxRentIncreasePercent).toBe(12);
    expect(resolved.minDurationMonths).toBe(6);
  });

  it('§3 — detects circular references in parent policies', async () => {
    const p1 = new LeasePolicy({ _id: new mongoose.Types.ObjectId(), propertyType: 'apartment' });
    const p2 = new LeasePolicy({ _id: new mongoose.Types.ObjectId(), propertyType: 'property', parentPolicy: p1._id });
    p1.parentPolicy = p2._id;

    jest.spyOn(LeasePolicy, 'findById').mockImplementation(id => {
      if (id?.toString() === p1._id.toString()) return Promise.resolve(p1);
      if (id?.toString() === p2._id.toString()) return Promise.resolve(p2);
      return Promise.resolve(null);
    });

    await expect(
      policyService.savePolicy({ propertyType: 'apartment', parentPolicy: p2._id }, { userId: 'admin' })
    ).rejects.toThrow('Circular reference detected');
  });

  it('§5 — calculates risk score 70 for 2 overdue bills + 1 damage ticket', async () => {
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

  it('evaluates campaign successfully and generates audit/events', async () => {
    const evaluation = await orchestrator.evaluateCampaign(mockCampaign._id, {
      proposedRent: 1600,
      proposedDurationMonths: 12
    });

    expect(evaluation.eligible).toBe(true);
    expect(evaluation.riskGrade).toBe('Excellent');
    expect(eventBusSpy).toHaveBeenCalledWith('lease.renewal.evaluated', expect.any(Object));
    expect(eventBusSpy).toHaveBeenCalledWith('lease.renewal.eligible', expect.any(Object));
  });

  it('fails eligibility if blockers exist (overdue bills)', async () => {
    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);
    const evaluation = await orchestrator.evaluateCampaign(mockCampaign._id);
    expect(evaluation.eligible).toBe(false);
    expect(evaluation.explainability.why.some(w => w.includes('Payment Overdue'))).toBe(true);
    expect(evaluation.explainability.recommendations).toContain('Tenant must settle outstanding bill balances.');
  });

  it('§2 — handles execution timeout for a slow rule gracefully', async () => {
    class SlowRule extends BaseRule {
      constructor() {
        super({ id: 'slow-rule', name: 'Slow Check Rule', version: '1.0', category: 'Integration', severity: 'HIGH' });
      }
      async execute() {
        return new Promise(resolve => setTimeout(() => resolve({ passed: true, reason: 'done', code: 'OK', metadata: {} }), 1500));
      }
    }
    ruleRegistry.register(new SlowRule());

    const evaluation = await orchestrator.evaluateCampaign(mockCampaign._id);
    expect(evaluation.eligible).toBe(false);
    const slowResult = evaluation.rules.find(r => r.id === 'slow-rule');
    expect(slowResult.passed).toBe(false);
    expect(slowResult.reason).toContain('timeout exceeded');
  });

  // =========================================================================
  // §5 — Risk Engine Strategies (isolated)
  // =========================================================================

  describe('§5 — Risk Engine Strategies', () => {
    afterEach(() => jest.restoreAllMocks());

    // PaymentRiskStrategy
    it('PaymentRisk: 0 overdue → deduction 0', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(0);
      const s = new PaymentRiskStrategy();
      const r = await s.calculate({ tenantId: new mongoose.Types.ObjectId() });
      expect(r.deduction).toBe(0);
      expect(r.reason).toContain('No payment');
    });

    it('PaymentRisk: 2 overdue → deduction 20', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(2);
      const s = new PaymentRiskStrategy();
      const r = await s.calculate({ tenantId: new mongoose.Types.ObjectId() });
      expect(r.deduction).toBe(20);
    });

    it('PaymentRisk: 5 overdue → capped at weight 40', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(5);
      const s = new PaymentRiskStrategy();
      const r = await s.calculate({ tenantId: new mongoose.Types.ObjectId() });
      expect(r.deduction).toBe(40);
    });

    // MaintenanceRiskStrategy
    it('MaintenanceRisk: 0 damage tickets → deduction 0', async () => {
      jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(0);
      const s = new MaintenanceRiskStrategy();
      const r = await s.calculate({ propertyId: new mongoose.Types.ObjectId() });
      expect(r.deduction).toBe(0);
    });

    it('MaintenanceRisk: 1 damage ticket → deduction 10', async () => {
      jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(1);
      const s = new MaintenanceRiskStrategy();
      const r = await s.calculate({ propertyId: new mongoose.Types.ObjectId() });
      expect(r.deduction).toBe(10);
    });

    it('MaintenanceRisk: 3 tickets → capped at weight 20', async () => {
      jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(3);
      const s = new MaintenanceRiskStrategy();
      const r = await s.calculate({ propertyId: new mongoose.Types.ObjectId() });
      expect(r.deduction).toBe(20);
    });

    // ViolationRiskStrategy
    it('ViolationRisk: 0 violations → deduction 0', async () => {
      const s = new ViolationRiskStrategy();
      const r = await s.calculate({ violationsCount: 0 });
      expect(r.deduction).toBe(0);
    });

    it('ViolationRisk: 1 violation → deduction 10', async () => {
      const s = new ViolationRiskStrategy();
      const r = await s.calculate({ violationsCount: 1 });
      expect(r.deduction).toBe(10);
    });

    it('ViolationRisk: 5 violations → capped at weight 20', async () => {
      const s = new ViolationRiskStrategy();
      const r = await s.calculate({ violationsCount: 5 });
      expect(r.deduction).toBe(20);
    });

    // OccupancyRiskStrategy
    it('OccupancyRisk: 6 months → deduction > 0 (short tenancy)', async () => {
      const s = new OccupancyRiskStrategy();
      const r = await s.calculate({ occupancyDurationMonths: 6 });
      expect(r.deduction).toBeGreaterThan(0);
    });

    it('OccupancyRisk: 12 months → deduction 0 (at threshold)', async () => {
      const s = new OccupancyRiskStrategy();
      const r = await s.calculate({ occupancyDurationMonths: 12 });
      expect(r.deduction).toBe(0);
    });

    it('OccupancyRisk: 60 months → deduction 0 (long-term stable)', async () => {
      const s = new OccupancyRiskStrategy();
      const r = await s.calculate({ occupancyDurationMonths: 60 });
      expect(r.deduction).toBe(0);
    });

    // Score bounds
    it('score is never negative when all deductions are maxed', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(10);
      jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(10);
      const risk = await calculateRiskScore({
        tenantId: new mongoose.Types.ObjectId(),
        propertyId: new mongoose.Types.ObjectId(),
        occupancyDurationMonths: 1,
        violationsCount: 10
      });
      expect(risk.score).toBeGreaterThanOrEqual(0);
    });

    it('score is 100 when all deductions are 0', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(0);
      jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(0);
      const risk = await calculateRiskScore({
        tenantId: new mongoose.Types.ObjectId(),
        propertyId: new mongoose.Types.ObjectId(),
        occupancyDurationMonths: 24,
        violationsCount: 0
      });
      expect(risk.score).toBe(100);
    });

    // Grade thresholds
    it('getRiskGrade: 95 → Excellent', () => expect(getRiskGrade(95)).toBe('Excellent'));
    it('getRiskGrade: 75 → Low Risk',  () => expect(getRiskGrade(75)).toBe('Low Risk'));
    it('getRiskGrade: 60 → Medium Risk', () => expect(getRiskGrade(60)).toBe('Medium Risk'));
    it('getRiskGrade: 40 → High Risk',  () => expect(getRiskGrade(40)).toBe('High Risk'));
    it('getRiskGrade: 20 → Critical',   () => expect(getRiskGrade(20)).toBe('Critical'));
  });

  // =========================================================================
  // §6 — Explainability
  // =========================================================================

  describe('§6 — Explainability', () => {
    it('ineligible evaluation response contains all required fields', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);
      const ev = await orchestrator.evaluateCampaign(mockCampaign._id);
      expect(ev).toHaveProperty('eligible');
      expect(ev).toHaveProperty('score');
      expect(ev).toHaveProperty('riskGrade');
      expect(ev).toHaveProperty('explainability');
      expect(ev.explainability).toHaveProperty('why');
      expect(ev.explainability).toHaveProperty('recommendations');
      expect(ev).toHaveProperty('rules');
    });

    it('why array is non-empty when blockers exist', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);
      const ev = await orchestrator.evaluateCampaign(mockCampaign._id);
      expect(ev.explainability.why.length).toBeGreaterThan(0);
    });

    it('each failed rule contributes a why entry containing its name', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);
      const ev = await orchestrator.evaluateCampaign(mockCampaign._id);
      const hasPaymentWhy = ev.explainability.why.some(w => w.includes('Payment Overdue'));
      expect(hasPaymentWhy).toBe(true);
    });

    it('recommendations contain correct advice for payment failure', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);
      const ev = await orchestrator.evaluateCampaign(mockCampaign._id);
      expect(ev.explainability.recommendations).toContain('Tenant must settle outstanding bill balances.');
    });

    it('eligible evaluation: why contains success message', async () => {
      const ev = await orchestrator.evaluateCampaign(mockCampaign._id, { proposedRent: 1560, proposedDurationMonths: 12 });
      expect(ev.eligible).toBe(true);
      expect(ev.explainability.why.some(w => w.includes('All critical policy rules'))).toBe(true);
    });

    it('rules array contains metadata fields for each executed rule', async () => {
      const ev = await orchestrator.evaluateCampaign(mockCampaign._id);
      expect(ev.rules.length).toBeGreaterThan(0);
      ev.rules.forEach(r => {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('name');
        expect(r).toHaveProperty('passed');
        expect(r).toHaveProperty('severity');
        expect(r).toHaveProperty('reason');
        expect(r).toHaveProperty('durationMs');
      });
    });
  });

  // =========================================================================
  // §7 — Evaluation History
  // =========================================================================

  describe('§7 — Evaluation History', () => {
    it('EligibilityEvaluation.create is called exactly once per evaluation', async () => {
      await orchestrator.evaluateCampaign(mockCampaign._id);
      expect(EligibilityEvaluation.create).toHaveBeenCalledTimes(1);
    });

    it('persisted document contains campaign, eligible, score, riskGrade, rules, explainability', async () => {
      await orchestrator.evaluateCampaign(mockCampaign._id);
      const payload = EligibilityEvaluation.create.mock.calls[0][0];
      expect(payload).toHaveProperty('campaign');
      expect(payload).toHaveProperty('eligible');
      expect(payload).toHaveProperty('score');
      expect(payload).toHaveProperty('riskGrade');
      expect(payload).toHaveProperty('rules');
      expect(payload).toHaveProperty('explainability');
    });

    it('executionTimeMs is a positive integer in persisted document', async () => {
      await orchestrator.evaluateCampaign(mockCampaign._id);
      const payload = EligibilityEvaluation.create.mock.calls[0][0];
      expect(typeof payload.executionTimeMs).toBe('number');
      expect(payload.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('policyVersion is stored from the resolved policy', async () => {
      mockPolicy.version = 3;
      await orchestrator.evaluateCampaign(mockCampaign._id);
      const payload = EligibilityEvaluation.create.mock.calls[0][0];
      expect(payload.policyVersion).toBe(3);
    });

    it('resolvedPolicy snapshot contains key policy fields', async () => {
      await orchestrator.evaluateCampaign(mockCampaign._id);
      const payload = EligibilityEvaluation.create.mock.calls[0][0];
      expect(payload.resolvedPolicy).toHaveProperty('minDurationMonths');
      expect(payload.resolvedPolicy).toHaveProperty('maxRentIncreasePercent');
      expect(payload.resolvedPolicy).toHaveProperty('maxCounterOffers');
    });
  });

  // =========================================================================
  // §8 — Events (exactly-once)
  // =========================================================================

  describe('§8 — Events', () => {
    it('lease.renewal.evaluated fires exactly once', async () => {
      await orchestrator.evaluateCampaign(mockCampaign._id);
      const calls = eventBusSpy.mock.calls.filter(c => c[0] === 'lease.renewal.evaluated');
      expect(calls).toHaveLength(1);
    });

    it('lease.renewal.eligible fires when eligible=true', async () => {
      await orchestrator.evaluateCampaign(mockCampaign._id, { proposedRent: 1560, proposedDurationMonths: 12 });
      const calls = eventBusSpy.mock.calls.filter(c => c[0] === 'lease.renewal.eligible');
      expect(calls).toHaveLength(1);
    });

    it('lease.renewal.eligible does NOT fire when eligible=false', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);
      await orchestrator.evaluateCampaign(mockCampaign._id);
      const calls = eventBusSpy.mock.calls.filter(c => c[0] === 'lease.renewal.eligible');
      expect(calls).toHaveLength(0);
    });

    it('lease.renewal.ineligible fires when eligible=false', async () => {
      jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);
      await orchestrator.evaluateCampaign(mockCampaign._id);
      const calls = eventBusSpy.mock.calls.filter(c => c[0] === 'lease.renewal.ineligible');
      expect(calls).toHaveLength(1);
    });

    it('risk.score.calculated fires exactly once', async () => {
      await orchestrator.evaluateCampaign(mockCampaign._id);
      const calls = eventBusSpy.mock.calls.filter(c => c[0] === 'risk.score.calculated');
      expect(calls).toHaveLength(1);
    });

    it('lease.policy.updated fires after savePolicy', async () => {
      jest.spyOn(LeasePolicy, 'findOne').mockResolvedValue(null);
      jest.spyOn(LeasePolicy, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        propertyType: 'global', version: 1, active: true,
        toObject() { return this; }
      });

      await policyService.savePolicy({ propertyType: 'global', name: 'Test' }, { userId: 'admin' });
      const calls = eventBusSpy.mock.calls.filter(c => c[0] === 'lease.policy.updated');
      expect(calls).toHaveLength(1);
    });

    it('lease.policy.cache.invalidated fires after savePolicy', async () => {
      jest.spyOn(LeasePolicy, 'findOne').mockResolvedValue(null);
      jest.spyOn(LeasePolicy, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        propertyType: 'residential', version: 1, active: true,
        toObject() { return this; }
      });

      await policyService.savePolicy({ propertyType: 'residential' }, { userId: 'admin' });
      const calls = eventBusSpy.mock.calls.filter(c => c[0] === 'lease.policy.cache.invalidated');
      expect(calls).toHaveLength(1);
    });
  });

  // =========================================================================
  // §9 — Simulation (pure dry-run)
  // =========================================================================

  describe('§9 — simulateCampaign (pure dry-run)', () => {
    it('returns simulated:true and a full result payload', async () => {
      const result = await orchestrator.simulateCampaign(mockCampaign._id, {
        proposedRent: 1560,
        proposedDurationMonths: 12
      });
      expect(result.simulated).toBe(true);
      expect(result).toHaveProperty('eligible');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('riskGrade');
      expect(result).toHaveProperty('rules');
      expect(result).toHaveProperty('explainability');
    });

    it('does NOT call EligibilityEvaluation.create (no persistence)', async () => {
      await orchestrator.simulateCampaign(mockCampaign._id);
      expect(EligibilityEvaluation.create).not.toHaveBeenCalled();
    });

    it('does NOT call LeaseRenewalAudit.create (no audit trail)', async () => {
      await orchestrator.simulateCampaign(mockCampaign._id);
      expect(auditSpy).not.toHaveBeenCalled();
    });

    it('does NOT publish any domain events', async () => {
      await orchestrator.simulateCampaign(mockCampaign._id);
      expect(eventBusSpy).not.toHaveBeenCalled();
    });

    it('throws when campaign does not exist', async () => {
      jest.spyOn(LeaseRenewalCampaign, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: function(resolve) { resolve(null); }
      });
      await expect(orchestrator.simulateCampaign(new mongoose.Types.ObjectId())).rejects.toThrow('Campaign not found');
    });
  });

  // =========================================================================
  // §10 — Performance Targets
  // =========================================================================

  describe('§10 — Performance Targets', () => {
    it('full eligibility evaluation completes in < 100ms (mocked DB)', async () => {
      const t0 = Date.now();
      await orchestrator.evaluateCampaign(mockCampaign._id, { proposedRent: 1560, proposedDurationMonths: 12 });
      expect(Date.now() - t0).toBeLessThan(100);
    });

    it('risk score calculation alone completes in < 20ms (mocked DB)', async () => {
      const t0 = Date.now();
      await calculateRiskScore({
        tenantId: new mongoose.Types.ObjectId(),
        propertyId: new mongoose.Types.ObjectId(),
        occupancyDurationMonths: 12,
        violationsCount: 0
      });
      expect(Date.now() - t0).toBeLessThan(20);
    });

    it('policy resolution (cache hit) completes in < 10ms', async () => {
      jest.spyOn(cacheProvider, 'get').mockResolvedValue({ minDurationMonths: 6, maxRentIncreasePercent: 10 });
      const t0 = Date.now();
      await policyService.resolvePolicy({ propertyType: 'global' });
      expect(Date.now() - t0).toBeLessThan(10);
    });
  });

  // =========================================================================
  // §11 — Concurrency
  // =========================================================================

  describe('§11 — Concurrency', () => {
    it('5 simultaneous evaluations each produce exactly 1 EligibilityEvaluation.create call', async () => {
      const calls = Array.from({ length: 5 }, () =>
        orchestrator.evaluateCampaign(mockCampaign._id, { proposedRent: 1560, proposedDurationMonths: 12 })
      );
      await Promise.all(calls);
      expect(EligibilityEvaluation.create).toHaveBeenCalledTimes(5);
    });

    it('version-lock conflict: stale-version update throws correctly', async () => {
      // The repository calls findOneAndUpdate({ version: expectedVersion }).
      // When that returns null AND the doc exists, it throws "Version conflict detected".
      jest.spyOn(LeaseRenewalCampaign, 'findOneAndUpdate').mockResolvedValue(null);
      jest.spyOn(LeaseRenewalCampaign, 'findById').mockResolvedValue({ _id: mockCampaign._id });

      // Import repository directly (already a static import at module scope above)
      const repoModule = await import('../../src/modules/lease-renewal/leaseRenewalCampaignRepository.js');
      await expect(
        repoModule.update(mockCampaign._id, { status: 'expired' }, 0) // version 0 → stale
      ).rejects.toThrow('Version conflict detected');
    });
  });

  // =========================================================================
  // §2 — One broken rule must not crash the engine
  // =========================================================================

  it('§2 — one broken rule (throws exception) does not crash; other rules still execute', async () => {
    class BrokenRule extends BaseRule {
      constructor() {
        super({ id: 'broken-rule', name: 'Broken Rule', version: '1.0', category: 'Test', severity: 'LOW' });
      }
      async execute() { throw new Error('Unexpected DB failure'); }
    }
    ruleRegistry.register(new BrokenRule());

    const ev = await orchestrator.evaluateCampaign(mockCampaign._id);
    const brokenResult = ev.rules.find(r => r.id === 'broken-rule');
    expect(brokenResult).toBeDefined();
    expect(brokenResult.passed).toBe(false);
    expect(brokenResult.code).toBe('EXECUTION_FAILED');

    // All other default rules must also be present
    const paymentResult = ev.rules.find(r => r.id === 'payment-rule');
    expect(paymentResult).toBeDefined();
  });
});
