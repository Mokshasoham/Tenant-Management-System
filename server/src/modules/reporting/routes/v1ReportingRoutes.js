/**
 * server/src/modules/reporting/routes/v1ReportingRoutes.js
 *
 * Express V1 Router for Reporting Management APIs.
 * Mounted at /api/v1/reports.
 */

import express from 'express';
import { protect } from '../../../middleware/authMiddleware.js';
import { authorizeReminderRole } from '../../../middleware/reminderAuthorization.js';
import {
  generateReport,
  getSavedReports,
  createSavedReport,
  toggleFavoriteReport,
  deleteSavedReport
} from '../controllers/reportingController.js';

const router = express.Router();

// Apply authentication middleware to all reporting routes
router.use(protect);

// 1. Report Generation (Admin & Manager)
router.post('/generate', authorizeReminderRole(['admin', 'manager']), generateReport);

// 2. Saved Reports & Presets (Admin & Manager)
router.get('/saved', authorizeReminderRole(['admin', 'manager']), getSavedReports);
router.post('/saved', authorizeReminderRole(['admin', 'manager']), createSavedReport);
router.post('/saved/:id/favorite', authorizeReminderRole(['admin', 'manager']), toggleFavoriteReport);
router.delete('/saved/:id', authorizeReminderRole(['admin', 'manager']), deleteSavedReport);

export default router;
