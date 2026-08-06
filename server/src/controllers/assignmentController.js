/**
 * server/src/controllers/assignmentController.js
 * Controller layer for Smart Technician Assignment & Dispatch Intelligence.
 */

import assignmentEngineService from '../services/assignmentEngineService.js';
import { catchAsync } from '../utils/errorHandling.js';

export const getRecommendations = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const { algorithmId, bypassCache } = req.query;

  const result = await assignmentEngineService.getRecommendationsForTicket(ticketId, {
    algorithmId,
    bypassCache: bypassCache === 'true'
  });

  res.status(200).json({
    status: 'success',
    data: result
  });
});

export const getRecommendationHistory = catchAsync(async (req, res) => {
  const { ticketId } = req.params;

  const history = await assignmentEngineService.getTicketRecommendationHistory(ticketId);

  res.status(200).json({
    status: 'success',
    data: history
  });
});

export const recordDecision = catchAsync(async (req, res) => {
  const { ticketId, selectedTechnicianId, overrideReason, assignmentStrategy, idempotencyKey } = req.body;
  const selectedByUserId = req.user.userId || req.user.id || req.user._id;

  const decision = await assignmentEngineService.recordAssignmentDecision({
    ticketId,
    idempotencyKey,
    selectedTechnicianId,
    selectedByUserId,
    overrideReason,
    assignmentStrategy
  }, req.headers);

  res.status(201).json({
    status: 'success',
    data: decision
  });
});

export const simulateAssignment = catchAsync(async (req, res) => {
  const { ticketId, priority, requestedCategory } = req.body;

  const simulation = await assignmentEngineService.simulateAssignment(ticketId, {
    priority,
    requestedCategory
  });

  res.status(200).json({
    status: 'success',
    data: simulation
  });
});

export const optimizeRoute = catchAsync(async (req, res) => {
  const { technicianId, ticketIds } = req.body;

  const routeDTO = await assignmentEngineService.optimizeRoute(technicianId, ticketIds);

  res.status(200).json({
    status: 'success',
    data: routeDTO
  });
});

export const getAnalytics = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  const analytics = await assignmentEngineService.getAnalytics({ startDate, endDate });

  res.status(200).json({
    status: 'success',
    data: analytics
  });
});

export const getConfig = catchAsync(async (req, res) => {
  const config = await assignmentEngineService.getConfig();

  res.status(200).json({
    status: 'success',
    data: config
  });
});

export const updateConfig = catchAsync(async (req, res) => {
  const { weights } = req.body;
  const userId = req.user.userId || req.user.id || req.user._id;

  const updated = await assignmentEngineService.updateConfig(weights, userId);

  res.status(200).json({
    status: 'success',
    data: updated
  });
});
