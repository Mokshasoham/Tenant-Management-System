import asyncHandler from 'express-async-handler';
import * as service from './campaignService.js';
import * as repository from './leaseRenewalCampaignRepository.js';
import { toCampaignDto } from './campaignDto.js';

export const getAuditContext = (req) => {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    requestId: req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sessionId: req.sessionID || null,
    correlationId: req.headers['x-correlation-id'] || null,
    traceId: req.headers['x-trace-id'] || null
  };
};

export const getCampaigns = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const sort = req.query.sort || 'createdAt';
  const order = req.query.order || 'desc';

  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.priority) filters.priority = req.query.priority;
  if (req.query.manager) filters.manager = req.query.manager;
  if (req.query.tenant) filters.tenant = req.query.tenant;
  if (req.query.riskMin || req.query.riskMax) {
    filters.riskScore = {};
    if (req.query.riskMin) filters.riskScore.$gte = Number(req.query.riskMin);
    if (req.query.riskMax) filters.riskScore.$lte = Number(req.query.riskMax);
  }

  const result = await repository.findPaginated({ page, limit, sort, order, filters });
  res.status(200).json({
    success: true,
    data: result.records.map(toCampaignDto),
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit
    }
  });
});

export const getCampaignDetails = asyncHandler(async (req, res) => {
  const campaign = await repository.findByIdWithRelations(req.params.id);
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }
  res.status(200).json({ success: true, data: toCampaignDto(campaign) });
});

export const createCampaign = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.createCampaign(
    req.body.leaseId,
    req.body.source || 'manual',
    req.user,
    auditContext
  );
  res.status(201).json({ success: true, data: result, requestId: auditContext.requestId });
});

export const transitionStatus = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.transitionStatus(
    req.params.id,
    req.body.status,
    req.user,
    auditContext
  );
  res.status(200).json({ success: true, data: result, requestId: auditContext.requestId });
});
