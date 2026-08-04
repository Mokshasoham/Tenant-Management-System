import asyncHandler from 'express-async-handler';
import * as policyService from './policyService.js';
import * as orchestrator from './eligibilityOrchestrator.js';
import LeasePolicy from '../../models/LeasePolicy.js';
import { getAuditContext } from './campaignController.js';

export const savePolicy = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const policy = await policyService.savePolicy(req.body, req.user, auditContext);
  res.status(201).json({ success: true, data: policy });
});

export const getPolicies = asyncHandler(async (req, res) => {
  const policies = await LeasePolicy.find({ active: true });
  res.status(200).json({ success: true, data: policies });
});

export const evaluateCampaign = asyncHandler(async (req, res) => {
  const evaluation = await orchestrator.evaluateCampaign(
    req.params.id,
    req.body.proposal || {},
    req.user
  );
  res.status(200).json({ success: true, data: evaluation });
});
