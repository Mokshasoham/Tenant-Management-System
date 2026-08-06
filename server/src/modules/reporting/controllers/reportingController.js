/**
 * server/src/modules/reporting/controllers/reportingController.js
 *
 * REST Controller for Reporting Bounded Context.
 * Handles generation requests, preset management, and user favorite toggles.
 */

import asyncHandler from 'express-async-handler';
import reportService from '../services/ReportService.js';
import savedReportRepository from '../repositories/savedReportRepository.js';

/**
 * POST /api/v1/reports/generate
 * Generates an AI-Ready DTO report for specified type and filters.
 */
export const generateReport = asyncHandler(async (req, res) => {
  const { reportType, filters = {}, format = 'json' } = req.body;

  if (!reportType) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'reportType string is required.' }
    });
  }

  const userId = req.user?._id || req.user?.id || null;
  const report = await reportService.generateReport(reportType, filters, userId, format);

  res.status(200).json(report);
});

/**
 * GET /api/v1/reports/saved
 * Retrieves saved report presets and favorites for current user.
 */
export const getSavedReports = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const saved = await savedReportRepository.findByUser(userId);

  res.status(200).json({
    success: true,
    message: 'Saved reports retrieved.',
    data: saved
  });
});

/**
 * POST /api/v1/reports/saved
 * Saves a new report preset.
 */
export const createSavedReport = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { name, description, reportType, filters, isFavorite } = req.body;

  if (!name || !reportType) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'name and reportType are required.' }
    });
  }

  const saved = await savedReportRepository.create({
    name,
    description,
    reportType,
    filters,
    isFavorite: !!isFavorite,
    createdBy: userId
  });

  res.status(201).json({
    success: true,
    message: 'Report configuration saved successfully.',
    data: saved
  });
});

/**
 * POST /api/v1/reports/saved/:id/favorite
 * Toggles user favorite state for a saved report preset.
 */
export const toggleFavoriteReport = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { id } = req.params;

  const updated = await savedReportRepository.toggleFavorite(id, userId);
  if (!updated) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Saved report not found.' }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Report favorite state toggled.',
    data: updated
  });
});

/**
 * DELETE /api/v1/reports/saved/:id
 * Deletes a saved report preset.
 */
export const deleteSavedReport = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { id } = req.params;

  await savedReportRepository.delete(id, userId);

  res.status(200).json({
    success: true,
    message: 'Saved report configuration deleted.'
  });
});

export default {
  generateReport,
  getSavedReports,
  createSavedReport,
  toggleFavoriteReport,
  deleteSavedReport
};
