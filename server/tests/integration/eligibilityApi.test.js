/**
 * tests/integration/eligibilityApi.test.js
 *
 * Controller-level integration tests for the policy & evaluation API.
 * Tests HTTP response shape, status codes, input validation, and security.
 *
 * ESM NOTE: jest.unstable_mockModule + pre-declared mock.fn() refs + dynamic
 * imports is the correct ESM Jest pattern for mocking module dependencies.
 * The mock function references are created first, then passed into the
 * unstable_mockModule factories, then the controller is dynamically imported
 * AFTER all mock declarations so it uses the mock modules.
 *
 * Covers checklist §9 (API tests) and §12 (security).
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// 1. Pre-declare mock function references (created before module factories)
// ---------------------------------------------------------------------------
const mockSavePolicy         = jest.fn();
const mockResolvePolicy      = jest.fn();
const mockGetCacheKey        = jest.fn().mockReturnValue('policy:global::');
const mockEvaluateCampaign   = jest.fn();
const mockSimulateCampaign   = jest.fn();
const mockLeasePolicyFind    = jest.fn();
const mockLeasePolicyFindById = jest.fn();
const mockLeasePolicyCount   = jest.fn();

// ---------------------------------------------------------------------------
// 2. Mock module declarations (hoisted by jest.unstable_mockModule)
//    Must happen BEFORE any dynamic import() of these modules.
// ---------------------------------------------------------------------------

jest.unstable_mockModule('../../src/modules/lease-renewal/policyService.js', () => ({
  savePolicy:    mockSavePolicy,
  resolvePolicy: mockResolvePolicy,
  getCacheKey:   mockGetCacheKey,
}));

jest.unstable_mockModule('../../src/modules/lease-renewal/eligibilityOrchestrator.js', () => ({
  evaluateCampaign: mockEvaluateCampaign,
  simulateCampaign: mockSimulateCampaign,
}));

jest.unstable_mockModule('../../src/models/LeasePolicy.js', () => ({
  default: {
    find:           mockLeasePolicyFind,
    findById:       mockLeasePolicyFindById,
    countDocuments: mockLeasePolicyCount,
  }
}));

// express-async-handler shim (shimmed by moduleNameMapper in package.json)
// No mock needed here — the __mocks__/expressAsyncHandler.js handles it.

// ---------------------------------------------------------------------------
// 3. Dynamic imports — must come AFTER all unstable_mockModule declarations
// ---------------------------------------------------------------------------
const policyController =
  await import('../../src/modules/lease-renewal/policyController.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (overrides = {}) => ({
  body:    {},
  query:   {},
  params:  {},
  headers: { 'user-agent': 'jest-test', 'x-request-id': 'req-test-001' },
  ip:      '127.0.0.1',
  user:    { userId: new mongoose.Types.ObjectId().toString(), role: 'manager' },
  ...overrides
});

const tenantUser  = { userId: new mongoose.Types.ObjectId().toString(), role: 'tenant' };
const managerUser = { userId: new mongoose.Types.ObjectId().toString(), role: 'manager' };
const adminUser   = { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

const makeFakePolicy = (overrides = {}) => ({
  _id:   new mongoose.Types.ObjectId(),
  propertyType: 'global', minDurationMonths: 6, maxDurationMonths: 24,
  maxRentIncreasePercent: 10, version: 1, active: true,
  toObject() { return this; },
  save:  jest.fn().mockResolvedValue(true),
  ...overrides
});

// ---------------------------------------------------------------------------
// §9-A — POST /policies (savePolicy)
// ---------------------------------------------------------------------------

describe('§9-A — POST /policies (savePolicy)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new policy and returns 201', async () => {
    mockSavePolicy.mockResolvedValue(makeFakePolicy());

    const req  = makeReq({ body: { propertyType: 'global', name: 'Default Policy' }, user: managerUser });
    const res  = makeMockRes();
    const next = jest.fn();
    await policyController.savePolicy(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns version-bumped policy when updating an existing one', async () => {
    mockSavePolicy.mockResolvedValue(makeFakePolicy({ version: 2 }));

    const req = makeReq({ body: { propertyType: 'global', name: 'Updated Policy' }, user: managerUser });
    const res = makeMockRes();
    await policyController.savePolicy(req, res, jest.fn());

    const body = res.json.mock.calls[0][0];
    expect(body.data.version).toBe(2);
  });

  it('calls next(err) when service throws', async () => {
    mockSavePolicy.mockRejectedValue(new Error('Validation failed'));

    const req  = makeReq({ body: {}, user: managerUser });
    const res  = makeMockRes();
    const next = jest.fn();
    await policyController.savePolicy(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('forwards user context to service', async () => {
    mockSavePolicy.mockResolvedValue(makeFakePolicy());
    const req = makeReq({ body: { propertyType: 'global' }, user: managerUser });
    await policyController.savePolicy(req, makeMockRes(), jest.fn());
    expect(mockSavePolicy).toHaveBeenCalledWith(
      expect.any(Object), managerUser, expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------
// §9-B — GET /policies (pagination, filtering, sorting)
// ---------------------------------------------------------------------------

describe('§9-B — GET /policies (getPolicies)', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockFind = (docs) => {
    const chain = {
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(docs)
    };
    mockLeasePolicyFind.mockReturnValue(chain);
    return chain;
  };

  it('returns 200 with paginated policy list', async () => {
    const policies = [makeFakePolicy(), makeFakePolicy({ propertyType: 'residential' })];
    mockFind(policies);
    mockLeasePolicyCount.mockResolvedValue(2);

    const req = makeReq({ query: { page: '1', limit: '10' } });
    const res = makeMockRes();
    await policyController.getPolicies(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.meta.total).toBe(2);
    expect(body.meta.page).toBe(1);
  });

  it('filters by propertyType when query param is provided', async () => {
    mockFind([makeFakePolicy({ propertyType: 'commercial' })]);
    mockLeasePolicyCount.mockResolvedValue(1);

    const req = makeReq({ query: { propertyType: 'commercial' } });
    await policyController.getPolicies(req, makeMockRes(), jest.fn());

    expect(mockLeasePolicyFind).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: 'commercial' })
    );
  });

  it('sorts by version desc when query params provided', async () => {
    const chain = mockFind([]);
    mockLeasePolicyCount.mockResolvedValue(0);

    const req = makeReq({ query: { sort: 'version', order: 'desc' } });
    await policyController.getPolicies(req, makeMockRes(), jest.fn());

    expect(chain.sort).toHaveBeenCalledWith({ version: -1 });
  });

  it('returns correct meta.pages (ceiling division)', async () => {
    mockFind([]);
    mockLeasePolicyCount.mockResolvedValue(25);

    const req = makeReq({ query: { page: '1', limit: '10' } });
    const res = makeMockRes();
    await policyController.getPolicies(req, res, jest.fn());

    expect(res.json.mock.calls[0][0].meta.pages).toBe(3);
  });

  it('returns only active policies by default (no status param)', async () => {
    mockFind([]);
    mockLeasePolicyCount.mockResolvedValue(0);

    await policyController.getPolicies(makeReq({}), makeMockRes(), jest.fn());

    expect(mockLeasePolicyFind).toHaveBeenCalledWith(
      expect.objectContaining({ active: true })
    );
  });
});

// ---------------------------------------------------------------------------
// §9-C — POST /policies/simulate
// ---------------------------------------------------------------------------

describe('§9-C — POST /policies/simulate (simulatePolicy)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with simulated:true and full payload', async () => {
    mockSimulateCampaign.mockResolvedValue({
      simulated: true, eligible: true, riskScore: 90,
      riskGrade: 'Excellent', rules: [],
      explainability: { why: [], recommendations: [] }, executionTimeMs: 5
    });

    const req = makeReq({ body: { campaignId: new mongoose.Types.ObjectId().toString() } });
    const res = makeMockRes();
    await policyController.simulatePolicy(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.simulated).toBe(true);
  });

  it('returns 400 when campaignId is missing', async () => {
    const req = makeReq({ body: {} });
    const res = makeMockRes();
    await policyController.simulatePolicy(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('campaignId is required');
  });

  it('calls next(err) for campaign not found', async () => {
    mockSimulateCampaign.mockRejectedValue(new Error('Campaign not found.'));
    const req  = makeReq({ body: { campaignId: new mongoose.Types.ObjectId().toString() } });
    const next = jest.fn();
    await policyController.simulatePolicy(req, makeMockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does NOT call evaluateCampaign (simulate is a separate code path)', async () => {
    mockSimulateCampaign.mockResolvedValue({
      simulated: true, eligible: true, riskScore: 100, riskGrade: 'Excellent',
      rules: [], explainability: { why: [], recommendations: [] }, executionTimeMs: 2
    });

    const req = makeReq({ body: { campaignId: new mongoose.Types.ObjectId().toString() } });
    await policyController.simulatePolicy(req, makeMockRes(), jest.fn());
    expect(mockEvaluateCampaign).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// §9-D — POST /campaigns/:id/evaluate
// ---------------------------------------------------------------------------

describe('§9-D — POST /campaigns/:id/evaluate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with evaluation result for valid campaign', async () => {
    const evalResult = {
      _id: new mongoose.Types.ObjectId(), eligible: true, score: 95,
      riskGrade: 'Excellent', rules: [], explainability: { why: [], recommendations: [] },
      toObject() { return this; }
    };
    mockEvaluateCampaign.mockResolvedValue(evalResult);

    const req = makeReq({ params: { id: new mongoose.Types.ObjectId().toString() }, body: {} });
    const res = makeMockRes();
    await policyController.evaluateCampaign(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('calls next(err) when campaign is not found', async () => {
    mockEvaluateCampaign.mockRejectedValue(new Error('Campaign not found.'));
    const req  = makeReq({ params: { id: new mongoose.Types.ObjectId().toString() }, body: {} });
    const next = jest.fn();
    await policyController.evaluateCampaign(req, makeMockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ---------------------------------------------------------------------------
// §12 — Security
// ---------------------------------------------------------------------------

describe('§12 — Security', () => {
  beforeEach(() => jest.clearAllMocks());

  it('savePolicy forwards exact user object to service (auth is middleware concern)', async () => {
    mockSavePolicy.mockResolvedValue(makeFakePolicy());
    const req = makeReq({ body: { propertyType: 'global' }, user: tenantUser });
    await policyController.savePolicy(req, makeMockRes(), jest.fn());
    expect(mockSavePolicy).toHaveBeenCalledWith(expect.any(Object), tenantUser, expect.any(Object));
  });

  it('simulatePolicy returns 400 on missing campaignId — injection-safe early exit', async () => {
    const req = makeReq({ body: { proposal: { proposedRent: { $gt: '' } } } });
    const res = makeMockRes();
    await policyController.simulatePolicy(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('XSS payload in name field is forwarded raw to service (sanitization at schema level)', async () => {
    const xss = '<script>alert(1)</script>';
    mockSavePolicy.mockResolvedValue(makeFakePolicy({ name: xss }));
    const req = makeReq({ body: { propertyType: 'global', name: xss }, user: managerUser });
    const res = makeMockRes();
    await policyController.savePolicy(req, res, jest.fn());
    expect(mockSavePolicy.mock.calls[0][0].name).toBe(xss);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deletePolicy returns 404 for non-existent policy', async () => {
    mockLeasePolicyFindById.mockResolvedValue(null);
    const req = makeReq({ params: { id: new mongoose.Types.ObjectId().toString() }, user: adminUser });
    const res = makeMockRes();
    await policyController.deletePolicy(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].success).toBe(false);
  });

  it('deletePolicy soft-deactivates and returns 200 when policy exists', async () => {
    const policy = makeFakePolicy({ active: true });
    mockLeasePolicyFindById.mockResolvedValue(policy);
    const req = makeReq({ params: { id: policy._id.toString() }, user: adminUser });
    const res = makeMockRes();
    await policyController.deletePolicy(req, res, jest.fn());
    expect(policy.active).toBe(false);
    expect(policy.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
