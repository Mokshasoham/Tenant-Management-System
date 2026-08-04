/**
 * tests/unit/ruleEngine.test.js
 *
 * Isolated unit tests for every Rule class and the RuleRegistry.
 * All external DB calls (Bill, Maintenance, User) are mocked via jest.spyOn.
 *
 * Covers checklist §1 (all four rules) and §2 (registry operations).
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';
import {
  BaseRule,
  PaymentRule,
  MaintenanceRule,
  KYCRule,
  PolicyRule,
  ruleRegistry
} from '../../src/modules/lease-renewal/eligibilityRuleEngine.js';
import Bill from '../../src/models/Bill.js';
import Maintenance from '../../src/models/Maintenance.js';
import User from '../../src/models/User.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCtx = (overrides = {}) => ({
  tenantId:               new mongoose.Types.ObjectId(),
  tenantEmail:            'tenant@test.com',
  propertyId:             new mongoose.Types.ObjectId(),
  currentRent:            1500,
  proposedRent:           1600,
  proposedDurationMonths: 12,
  counterOfferCount:      0,
  policy: {
    minDurationMonths:     6,
    maxDurationMonths:     24,
    maxRentIncreasePercent: 10,
    maxCounterOffers:      3
  },
  ...overrides
});

// ---------------------------------------------------------------------------
// §1-A — PaymentRule
// ---------------------------------------------------------------------------
describe('PaymentRule', () => {
  let rule;

  beforeEach(() => {
    rule = new PaymentRule();
    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(0);
  });

  afterEach(() => jest.restoreAllMocks());

  it('passes when there are no overdue bills', async () => {
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(true);
    expect(result.metadata.overdueBillsCount).toBe(0);
  });

  it('fails with one overdue bill', async () => {
    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(1);
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('1 overdue bill');
    expect(result.code).toBe('PAYMENT_OVERDUE');
  });

  it('fails with multiple overdue bills and reports count', async () => {
    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(4);
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(false);
    expect(result.metadata.overdueBillsCount).toBe(4);
    expect(result.reason).toContain('4 overdue bill');
  });

  it('handles Bill.countDocuments throwing gracefully (caller wraps in timeout)', async () => {
    jest.spyOn(Bill, 'countDocuments').mockRejectedValue(new Error('DB connection lost'));
    // The rule itself propagates; the orchestrator catches it as EXECUTION_FAILED
    await expect(rule.execute(makeCtx())).rejects.toThrow('DB connection lost');
  });

  it('only queries for overdue status — not soft-deleted filter (rule passes when count=0)', async () => {
    // Bill.countDocuments is called with { tenant, status:'overdue' } only.
    // Soft-delete filtering is at the DB index level; rule trusts countDocuments result.
    jest.spyOn(Bill, 'countDocuments').mockResolvedValue(0);
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(true);
    const call = Bill.countDocuments.mock.calls[0][0];
    expect(call.status).toBe('overdue');
    expect(call.tenant).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §1-B — MaintenanceRule
// ---------------------------------------------------------------------------
describe('MaintenanceRule', () => {
  let rule;

  beforeEach(() => {
    rule = new MaintenanceRule();
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(0);
  });

  afterEach(() => jest.restoreAllMocks());

  it('passes when there are no open tickets', async () => {
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(true);
    expect(result.code).toBe('OPEN_MAINTENANCE');
  });

  it('passes when all tickets are closed (count returns 0)', async () => {
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(0);
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(true);
  });

  it('fails when there is 1 pending ticket', async () => {
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(1);
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('1 open maintenance ticket');
  });

  it('fails when there is 1 in_progress ticket', async () => {
    // in_progress is inside the $in filter — the rule delegates filtering to DB
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(1);
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(false);
  });

  it('queries are scoped to the given propertyId', async () => {
    const ctx = makeCtx();
    await rule.execute(ctx);
    const call = Maintenance.countDocuments.mock.calls[0][0];
    expect(call.property.toString()).toBe(ctx.propertyId.toString());
  });

  it('correctly reports count in metadata when multiple tickets exist', async () => {
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(3);
    const result = await rule.execute(makeCtx());
    expect(result.metadata.openTicketsCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// §1-C — KYCRule
// ---------------------------------------------------------------------------
describe('KYCRule', () => {
  let rule;

  beforeEach(() => {
    rule = new KYCRule();
    jest.spyOn(User, 'findOne').mockResolvedValue({
      firstName: 'Alice',
      lastName:  'Smith',
      phone:     '9876543210',
      email:     'tenant@test.com',
      kycDocuments: ['aadhaar.pdf']
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('passes when profile is complete and KYC document exists', async () => {
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(true);
    expect(result.metadata.hasKYC).toBe(true);
    expect(result.metadata.isProfileComplete).toBe(true);
  });

  it('fails when kycDocuments is empty (expired / missing KYC)', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({
      firstName: 'Alice', lastName: 'Smith', phone: '123', kycDocuments: []
    });
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('KYC documents are missing');
    expect(result.code).toBe('INCOMPLETE_KYC');
  });

  it('fails with code USER_NOT_FOUND when user record does not exist', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null);
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(false);
    expect(result.code).toBe('USER_NOT_FOUND');
  });

  it('fails when phone is missing (partial profile)', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({
      firstName: 'Alice', lastName: 'Smith', phone: null, kycDocuments: ['doc.pdf']
    });
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(false);
    expect(result.metadata.isProfileComplete).toBe(false);
  });

  it('fails when firstName is missing', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({
      firstName: null, lastName: 'Smith', phone: '123', kycDocuments: ['doc.pdf']
    });
    const result = await rule.execute(makeCtx());
    expect(result.passed).toBe(false);
    expect(result.metadata.isProfileComplete).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §1-D — PolicyRule
// ---------------------------------------------------------------------------
describe('PolicyRule', () => {
  let rule;

  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    rule = new PolicyRule();
  });

  it('passes when duration is within min/max limits', async () => {
    const result = await rule.execute(makeCtx({ proposedDurationMonths: 12 }));
    expect(result.passed).toBe(true);
  });

  it('fails when duration is below minimum', async () => {
    const result = await rule.execute(makeCtx({ proposedDurationMonths: 3 }));
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('minimum');
  });

  it('fails when duration exceeds maximum', async () => {
    const result = await rule.execute(makeCtx({ proposedDurationMonths: 36 }));
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('maximum');
  });

  it('passes when rent increase is within policy limit (6.7% vs 10% max)', async () => {
    const result = await rule.execute(makeCtx({ currentRent: 1500, proposedRent: 1600, proposedDurationMonths: 12 }));
    expect(result.passed).toBe(true);
  });

  it('fails when rent increase exceeds policy limit (20% vs 10% max)', async () => {
    const result = await rule.execute(makeCtx({ currentRent: 1000, proposedRent: 1200, proposedDurationMonths: 12 }));
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('%');
  });

  it('fails when counter offer limit is reached', async () => {
    const result = await rule.execute(makeCtx({ counterOfferCount: 3 })); // maxCounterOffers: 3
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Counter offer limit');
  });

  it('passes with fallback code NO_POLICY_APPLIED when policy is null', async () => {
    const result = await rule.execute(makeCtx({ policy: null }));
    expect(result.passed).toBe(true);
    expect(result.code).toBe('NO_POLICY_APPLIED');
  });
});

// ---------------------------------------------------------------------------
// §2 — Rule Registry Operations
// ---------------------------------------------------------------------------
describe('RuleRegistry', () => {
  let defaultKeys;

  beforeAll(() => {
    defaultKeys = new Set(ruleRegistry.rules.keys());
  });

  afterEach(() => {
    // Remove any test rules added during the test
    for (const key of ruleRegistry.rules.keys()) {
      if (!defaultKeys.has(key)) {
        ruleRegistry.rules.delete(key);
      }
    }
    // Re-enable any default rules that were disabled
    for (const key of defaultKeys) {
      if (ruleRegistry.rules.has(key)) {
        ruleRegistry.rules.get(key).enabled = true;
      }
    }
  });

  // Helper — creates a minimal rule with a given id
  const makeRule = (id, severity = 'LOW') => {
    class TestRule extends BaseRule {
      constructor() {
        super({ id, name: `Test ${id}`, version: '2.0', category: 'Test', severity });
      }
      async execute() { return { passed: true, reason: 'ok', code: 'OK', metadata: {} }; }
    }
    return new TestRule();
  };

  it('registers a new rule and isRegistered returns true', () => {
    const rule = makeRule('test-reg-rule');
    ruleRegistry.register(rule);
    expect(ruleRegistry.isRegistered('test-reg-rule')).toBe(true);
  });

  it('stores metadata object with enabled, registeredAt, version', () => {
    const rule = makeRule('test-meta-rule');
    ruleRegistry.register(rule);
    const entry = ruleRegistry.rules.get('test-meta-rule');
    expect(entry.enabled).toBe(true);
    expect(entry.registeredAt).toBeInstanceOf(Date);
    expect(entry.version).toBe('2.0');
  });

  it('removes a registered rule successfully', () => {
    const rule = makeRule('test-remove-rule');
    ruleRegistry.register(rule);
    ruleRegistry.remove('test-remove-rule');
    expect(ruleRegistry.isRegistered('test-remove-rule')).toBe(false);
  });

  it('throws when removing a rule that does not exist', () => {
    expect(() => ruleRegistry.remove('nonexistent-xyz')).toThrow('Rule not found: nonexistent-xyz');
  });

  it('throws when registering a duplicate rule id', () => {
    const rule = makeRule('test-dup-rule');
    ruleRegistry.register(rule);
    expect(() => ruleRegistry.register(makeRule('test-dup-rule'))).toThrow('Rule already registered: test-dup-rule');
  });

  it('replace() overwrites duplicate without throwing', () => {
    const rule1 = makeRule('test-replace-rule');
    const rule2 = makeRule('test-replace-rule');
    ruleRegistry.register(rule1);
    expect(() => ruleRegistry.replace(rule2)).not.toThrow();
    expect(ruleRegistry.isRegistered('test-replace-rule')).toBe(true);
  });

  it('disabled rule is excluded from getRules()', () => {
    ruleRegistry.disable('payment-rule');
    const active = ruleRegistry.getRules().map(r => r.metadata.id);
    expect(active).not.toContain('payment-rule');
  });

  it('enable() restores a disabled rule to getRules()', () => {
    ruleRegistry.disable('payment-rule');
    ruleRegistry.enable('payment-rule');
    const active = ruleRegistry.getRules().map(r => r.metadata.id);
    expect(active).toContain('payment-rule');
  });

  it('disable() throws for unknown rule id', () => {
    expect(() => ruleRegistry.disable('ghost-rule')).toThrow('Rule not found: ghost-rule');
  });

  it('getRules() preserves insertion order of enabled rules', () => {
    const ruleA = makeRule('test-order-a');
    const ruleB = makeRule('test-order-b');
    const ruleC = makeRule('test-order-c');
    ruleRegistry.register(ruleA);
    ruleRegistry.register(ruleB);
    ruleRegistry.register(ruleC);
    const ids = ruleRegistry.getRules().map(r => r.metadata.id);
    const idxA = ids.indexOf('test-order-a');
    const idxB = ids.indexOf('test-order-b');
    const idxC = ids.indexOf('test-order-c');
    expect(idxA).toBeLessThan(idxB);
    expect(idxB).toBeLessThan(idxC);
  });

  it('getAll() includes disabled rules with their metadata', () => {
    ruleRegistry.disable('kyc-rule');
    const all = ruleRegistry.getAll();
    const kycEntry = all.find(e => e.id === 'kyc-rule');
    expect(kycEntry).toBeDefined();
    expect(kycEntry.enabled).toBe(false);
    expect(kycEntry.registeredAt).toBeInstanceOf(Date);
  });
});
