import asyncHandler from 'express-async-handler';
import * as policyService from './policyService.js';
import * as orchestrator from './eligibilityOrchestrator.js';
import LeasePolicy from '../../models/LeasePolicy.js';
import { getAuditContext } from './campaignController.js';

// ---------------------------------------------------------------------------
// POST /policies — Create or update a policy
// ---------------------------------------------------------------------------
export const savePolicy = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const policy = await policyService.savePolicy(req.body, req.user, auditContext);
  res.status(201).json({ success: true, data: policy });
});

// ---------------------------------------------------------------------------
// GET /policies — List active policies with pagination, filtering, sorting
// ---------------------------------------------------------------------------
export const getPolicies = asyncHandler(async (req, res) => {
  const page    = Math.max(1, Number(req.query.page)  || 1);
  const limit   = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip    = (page - 1) * limit;
  const sortField = ['version', 'createdAt', 'propertyType', 'name'].includes(req.query.sort)
    ? req.query.sort : 'createdAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;

  const filter = {};
  // status filter: 'active' (default), 'inactive', 'all'
  if (!req.query.status || req.query.status === 'active') {
    filter.active = true;
  } else if (req.query.status === 'inactive') {
    filter.active = false;
  }
  // else 'all' — no active filter

  if (req.query.propertyType) filter.propertyType = req.query.propertyType;

  const [policies, total] = await Promise.all([
    LeasePolicy.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    LeasePolicy.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: policies,
    meta: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

// ---------------------------------------------------------------------------
// PATCH /policies/:id — Deactivate and supersede a policy
// ---------------------------------------------------------------------------
export const updatePolicy = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  // savePolicy handles version-bump and old-policy deactivation via propertyType match
  const policy = await policyService.savePolicy(req.body, req.user, auditContext);
  res.status(200).json({ success: true, data: policy });
});

// ---------------------------------------------------------------------------
// DELETE /policies/:id — Soft-deactivate a policy
// ---------------------------------------------------------------------------
export const deletePolicy = asyncHandler(async (req, res) => {
  const policy = await LeasePolicy.findById(req.params.id);
  if (!policy) {
    return res.status(404).json({ success: false, error: 'Policy not found.' });
  }
  policy.active = false;
  policy.effectiveTo = new Date();
  await policy.save();
  res.status(200).json({ success: true, message: 'Policy deactivated.' });
});

// ---------------------------------------------------------------------------
// POST /campaigns/:id/evaluate — Run full evaluation and persist
// ---------------------------------------------------------------------------
export const evaluateCampaign = asyncHandler(async (req, res) => {
  const evaluation = await orchestrator.evaluateCampaign(
    req.params.id,
    req.body.proposal || {},
    req.user
  );
  res.status(200).json({ success: true, data: evaluation });
});

// ---------------------------------------------------------------------------
// POST /policies/simulate — Pure dry-run: NO persistence, NO events, NO audit
// ---------------------------------------------------------------------------
export const simulatePolicy = asyncHandler(async (req, res) => {
  const { campaignId, proposal = {} } = req.body;

  if (!campaignId) {
    return res.status(400).json({ success: false, error: 'campaignId is required.' });
  }

  const result = await orchestrator.simulateCampaign(campaignId, proposal);
  res.status(200).json({ success: true, data: result });
});
