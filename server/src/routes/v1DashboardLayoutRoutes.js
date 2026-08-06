/**
 * server/src/routes/v1DashboardLayoutRoutes.js
 *
 * REST Routes for Dashboard Personalization, Profile Switching, and Import/Export Engine.
 * Mount path: /api/v1/dashboard-layouts
 */

import express from 'express';
import v1DashboardLayoutController from '../controllers/v1DashboardLayoutController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All layout endpoints require authentication
router.use(authenticate);

// Import / Export Engine Routes
router.get('/export', (req, res, next) => v1DashboardLayoutController.exportLayout(req, res, next));
router.post('/import/preview', (req, res, next) => v1DashboardLayoutController.previewImport(req, res, next));
router.post('/import/execute', (req, res, next) => v1DashboardLayoutController.executeImport(req, res, next));

// Profile Management Routes
router.get('/profiles', (req, res, next) => v1DashboardLayoutController.listProfiles(req, res, next));
router.post('/profiles/switch', (req, res, next) => v1DashboardLayoutController.switchProfile(req, res, next));
router.post('/profiles/clone', (req, res, next) => v1DashboardLayoutController.cloneProfile(req, res, next));

// Direct Layout Preferences & Widget Reset Routes
router.get('/', (req, res, next) => v1DashboardLayoutController.getMyLayout(req, res, next));
router.put('/', (req, res, next) => v1DashboardLayoutController.saveMyLayout(req, res, next));
router.delete('/', (req, res, next) => v1DashboardLayoutController.resetMyLayout(req, res, next));
router.delete('/widgets/:widgetId', (req, res, next) => v1DashboardLayoutController.resetWidget(req, res, next));

export default router;
