/**
 * server/src/modules/reporting/routes/v1ReportingRoutes.js
 *
 * Express V1 Router for Reporting Bounded Context.
 * Mounted at /api/v1/reports.
 */

import express from 'express';
import { protect } from '../../../middleware/authMiddleware.js';
import { authorizeReminderRole } from '../../../middleware/reminderAuthorization.js';
import {
  generateReport,
  exportReportSync,
  createExportJob,
  getExportJobStatus,
  getSavedReports,
  createSavedReport,
  toggleFavoriteReport,
  deleteSavedReport
} from '../controllers/reportingController.js';

const router = express.Router();

// Apply JWT Authentication Guard
router.use(protect);
router.use(authorizeReminderRole(['admin', 'manager', 'tenant']));

// Report Generation & Direct Sync Export
router.post('/generate', generateReport);
router.post('/export', exportReportSync);

// Background Export Jobs
router.post('/export/jobs', createExportJob);
router.get('/export/jobs/:id', getExportJobStatus);

// Saved Report Presets & Favorites
router.get('/saved', getSavedReports);
router.post('/saved', createSavedReport);
router.post('/saved/:id/favorite', toggleFavoriteReport);
router.delete('/saved/:id', deleteSavedReport);

export default router;
