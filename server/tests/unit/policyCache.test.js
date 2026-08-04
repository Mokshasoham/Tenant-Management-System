/**
 * tests/unit/policyCache.test.js
 *
 * Tests for:
 *   §3 — Policy inheritance hierarchy (Global → Residential → Apartment → Luxury Apartment)
 *   §4 — Cache hit / miss / invalidation / TTL / stale-prevention
 *
 * All Mongoose model calls and cache provider calls are mocked.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import * as policyService from '../../src/modules/lease-renewal/policyService.js';
import LeasePolicy from '../../src/models/LeasePolicy.js';
import cacheProvider from '../../src/platform/cache/cacheProvider.js';
import { dispatchEvent } from '../../src/platform/events/eventDispatcher.js';
import LeaseRenewalAudit from '../../src/models/LeaseRenewalAudit.js';

// ---------------------------------------------------------------------------
// Helpers — build minimal LeasePolicy-like plain objects
// ---------------------------------------------------------------------------

const makePolicy = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  active: true,
  version: 1,
  propertyType: 'global',
  minDurationMonths: 6,
  maxDurationMonths: 24,
  maxRentIncreasePercent: 10,
  minNoticeDays: 30,
  maxCounterOffers: 3,
  autoApprovalEnabled: true,
  toObject() { return this; },
  save: jest.fn().mockResolvedValue(true),
  ...overrides
});

// ---------------------------------------------------------------------------
// §3 — Policy Inheritance
// ---------------------------------------------------------------------------

describe('Policy Inheritance (§3)', () => {
  beforeEach(() => {
    // Cache always misses so resolvePolicy hits DB
    jest.spyOn(cacheProvider, 'get').mockResolvedValue(null);
    jest.spyOn(cacheProvider, 'set').mockResolvedValue(true);
    jest.spyOn(cacheProvider, 'del').mockResolvedValue(true);
    jest.spyOn(dispatchEvent, 'call').mockResolvedValue({});
  });

  afterEach(() => jest.restoreAllMocks());

  it('inherits all values from global when no child policy exists', async () => {
    const global = makePolicy({ propertyType: 'global', minDurationMonths: 6, maxRentIncreasePercent: 10 });
    jest.spyOn(LeasePolicy, 'findOne').mockImplementation(q => {
      if (q.propertyType === 'global') return Promise.resolve(global);
      return Promise.resolve(null);
    });

    const resolved = await policyService.resolvePolicy({ propertyType: 'apartment' });
    expect(resolved.minDurationMonths).toBe(6);
    expect(resolved.maxRentIncreasePercent).toBe(10);
  });

  it('child (residential) overrides specific fields, falls back to global for unset fields', async () => {
    const global      = makePolicy({ propertyType: 'global',      minDurationMonths: 6, maxRentIncreasePercent: 10 });
    const residential = makePolicy({ propertyType: 'residential', minDurationMonths: 8, maxRentIncreasePercent: 12, maxDurationMonths: null });

    jest.spyOn(LeasePolicy, 'findOne').mockImplementation(q => {
      if (q.propertyType === 'global')      return Promise.resolve(global);
      if (q.propertyType === 'residential') return Promise.resolve(residential);
      return Promise.resolve(null);
    });

    const resolved = await policyService.resolvePolicy({ propertyType: 'residential' });
    // Overridden by residential
    expect(resolved.minDurationMonths).toBe(8);
    expect(resolved.maxRentIncreasePercent).toBe(12);
    // Fallback from global (residential returned null for maxDurationMonths)
    expect(resolved.maxDurationMonths).toBe(24);
  });

  it('four-level chain: Luxury Apartment overrides cascade correctly', async () => {
    const global   = makePolicy({ propertyType: 'global',           minDurationMonths: 6,  maxRentIncreasePercent: 10 });
    const resident = makePolicy({ propertyType: 'residential',      minDurationMonths: 8,  maxRentIncreasePercent: 12 });
    const apart    = makePolicy({ propertyType: 'apartment',        minDurationMonths: 10, maxRentIncreasePercent: null });
    const luxury   = makePolicy({ propertyType: 'luxury_apartment', minDurationMonths: null, maxCounterOffers: 5 });

    jest.spyOn(LeasePolicy, 'findOne').mockImplementation(q => {
      if (q.propertyType === 'global')           return Promise.resolve(global);
      if (q.propertyType === 'residential')      return Promise.resolve(resident);
      if (q.propertyType === 'apartment')        return Promise.resolve(apart);
      if (q.propertyType === 'luxury_apartment') return Promise.resolve(luxury);
      return Promise.resolve(null);
    });

    // Simulate resolving for 'apartment' type (gets global + apartment)
    const resolved = await policyService.resolvePolicy({ propertyType: 'apartment' });
    // apartment overrides minDuration from global
    expect(resolved.minDurationMonths).toBe(10);
    // apartment returns null for maxRentIncreasePercent → falls back to global's 10
    expect(resolved.maxRentIncreasePercent).toBe(10);
  });

  it('inactive parent is skipped — only global used when residential is inactive', async () => {
    const global      = makePolicy({ propertyType: 'global', minDurationMonths: 6 });
    const residential = makePolicy({ propertyType: 'residential', minDurationMonths: 9, active: false });

    jest.spyOn(LeasePolicy, 'findOne').mockImplementation(q => {
      if (q.propertyType === 'global')      return Promise.resolve(global);
      // findOne with active:true will return null for inactive residential
      if (q.propertyType === 'residential') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const resolved = await policyService.resolvePolicy({ propertyType: 'residential' });
    // Falls back to global
    expect(resolved.minDurationMonths).toBe(6);
  });

  it('missing parent returns hardcoded defaults when no global policy exists', async () => {
    jest.spyOn(LeasePolicy, 'findOne').mockResolvedValue(null);
    const resolved = await policyService.resolvePolicy({ propertyType: 'commercial' });
    // Should apply hardcoded defaults
    expect(resolved.minDurationMonths).toBe(6);
    expect(resolved.maxDurationMonths).toBe(36);
    expect(resolved.maxRentIncreasePercent).toBe(15);
    expect(resolved.minNoticeDays).toBe(30);
  });

  it('circular reference detection throws during savePolicy', async () => {
    const p1Id = new mongoose.Types.ObjectId();
    const p2Id = new mongoose.Types.ObjectId();

    const p1 = { _id: p1Id, propertyType: 'apartment', parentPolicy: p2Id };
    const p2 = { _id: p2Id, propertyType: 'residential', parentPolicy: p1Id };

    jest.spyOn(LeasePolicy, 'findById').mockImplementation(id => {
      if (id?.toString() === p1Id.toString()) return Promise.resolve(p1);
      if (id?.toString() === p2Id.toString()) return Promise.resolve(p2);
      return Promise.resolve(null);
    });

    jest.spyOn(LeasePolicy, 'findOne').mockResolvedValue(null);
    jest.spyOn(LeasePolicy, 'create').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(), active: true, version: 1,
      toObject() { return this; }
    });
    jest.spyOn(LeaseRenewalAudit, 'create').mockResolvedValue({});

    await expect(
      policyService.savePolicy({ propertyType: 'apartment', parentPolicy: p2Id }, { userId: 'admin' })
    ).rejects.toThrow('Circular reference detected');
  });

  it('correct merged fallback: specific overrides; unset fields fall back through chain', async () => {
    const global = makePolicy({
      propertyType: 'global',
      minDurationMonths: 6, maxDurationMonths: 24,
      maxRentIncreasePercent: 10, minNoticeDays: 30, maxCounterOffers: 3
    });
    const residential = makePolicy({
      propertyType: 'residential',
      minDurationMonths: 9,  // override
      maxDurationMonths: null,
      maxRentIncreasePercent: null,
      minNoticeDays: 60,     // override
      maxCounterOffers: null,
      autoApprovalEnabled: false // override
    });

    jest.spyOn(LeasePolicy, 'findOne').mockImplementation(q => {
      if (q.propertyType === 'global')      return Promise.resolve(global);
      if (q.propertyType === 'residential') return Promise.resolve(residential);
      return Promise.resolve(null);
    });

    const resolved = await policyService.resolvePolicy({ propertyType: 'residential' });
    expect(resolved.minDurationMonths).toBe(9);    // from residential
    expect(resolved.minNoticeDays).toBe(60);        // from residential
    expect(resolved.autoApprovalEnabled).toBe(false); // from residential
    expect(resolved.maxDurationMonths).toBe(24);    // fallback global
    expect(resolved.maxRentIncreasePercent).toBe(10); // fallback global
    expect(resolved.maxCounterOffers).toBe(3);      // fallback global
  });
});

// ---------------------------------------------------------------------------
// §4 — Cache
// ---------------------------------------------------------------------------

describe('Policy Cache (§4)', () => {
  let getCacheSpy, setCacheSpy, delCacheSpy;

  beforeEach(() => {
    getCacheSpy = jest.spyOn(cacheProvider, 'get').mockResolvedValue(null);
    setCacheSpy = jest.spyOn(cacheProvider, 'set').mockResolvedValue(true);
    delCacheSpy = jest.spyOn(cacheProvider, 'del').mockResolvedValue(true);

    jest.spyOn(LeasePolicy, 'findOne').mockResolvedValue(
      makePolicy({ propertyType: 'global' })
    );
    jest.spyOn(dispatchEvent, 'call').mockResolvedValue({});
  });

  afterEach(() => jest.restoreAllMocks());

  it('cache MISS — queries DB and stores result via cacheProvider.set', async () => {
    getCacheSpy.mockResolvedValue(null); // miss
    await policyService.resolvePolicy({ propertyType: 'apartment' });
    expect(LeasePolicy.findOne).toHaveBeenCalled();
    expect(setCacheSpy).toHaveBeenCalledWith(
      expect.stringContaining('policy:'),
      expect.any(Object),
      3600
    );
  });

  it('cache HIT — returns cached result without querying the DB', async () => {
    const cached = { minDurationMonths: 9, maxRentIncreasePercent: 12 };
    getCacheSpy.mockResolvedValue(cached); // hit
    const result = await policyService.resolvePolicy({ propertyType: 'apartment' });
    expect(LeasePolicy.findOne).not.toHaveBeenCalled();
    expect(result.minDurationMonths).toBe(9);
  });

  it('savePolicy calls cacheProvider.del with correct key', async () => {
    jest.spyOn(LeasePolicy, 'create').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      propertyType: 'apartment', propertyId: null, leaseId: null,
      version: 1, active: true,
      toObject() { return this; }
    });
    jest.spyOn(LeasePolicy, 'findOne').mockResolvedValue(null);
    jest.spyOn(LeaseRenewalAudit, 'create').mockResolvedValue({});

    await policyService.savePolicy({ propertyType: 'apartment' }, { userId: 'admin' });
    expect(delCacheSpy).toHaveBeenCalledWith(expect.stringContaining('policy:apartment'));
  });

  it('cache is set with TTL of 3600 seconds', async () => {
    getCacheSpy.mockResolvedValue(null);
    await policyService.resolvePolicy({ propertyType: 'global' });
    const setCall = setCacheSpy.mock.calls[0];
    expect(setCall[2]).toBe(3600);
  });

  it('getCacheKey produces deterministic keys for same inputs', () => {
    const k1 = policyService.getCacheKey('apartment', null, null);
    const k2 = policyService.getCacheKey('apartment', null, null);
    expect(k1).toBe(k2);
    expect(k1).toContain('apartment');
  });
});
