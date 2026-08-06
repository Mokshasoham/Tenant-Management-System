/**
 * server/src/routes/v1DashboardLayoutRoutes.js
 *
 * REST Routes for Dashboard Personalization APIs.
 * Mount path: /api/v1/dashboard-layouts
 */

import express from 'express';
import v1DashboardLayoutController from '../controllers/v1DashboardLayoutController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All layout endpoints require authentication
router.use(authenticate);

router.get('/', (req, res, next) => v1DashboardLayoutController.getMyLayout(req, res, next));
router.put('/', (req, res, next) => v1DashboardLayoutController.saveMyLayout(req, res, next));
router.delete('/', (req, res, next) => v1DashboardLayoutController.resetMyLayout(req, res, next));
router.delete('/widgets/:widgetId', (req, res, next) => v1DashboardLayoutController.resetWidget(req, res, next));

export default router;
