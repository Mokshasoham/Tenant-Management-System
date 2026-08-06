/**
 * server/src/routes/v1DashboardTemplateRoutes.js
 *
 * REST Routes for Shared Dashboard Templates & Catalog Engine.
 * Mount path: /api/v1/dashboard-templates
 */

import express from 'express';
import v1DashboardTemplateController from '../controllers/v1DashboardTemplateController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All template endpoints require authentication
router.use(authenticate);

router.get('/', (req, res, next) => v1DashboardTemplateController.listCatalog(req, res, next));
router.post('/', (req, res, next) => v1DashboardTemplateController.createTemplate(req, res, next));
router.post('/:id/apply', (req, res, next) => v1DashboardTemplateController.applyTemplate(req, res, next));
router.delete('/:id', (req, res, next) => v1DashboardTemplateController.archiveTemplate(req, res, next));

export default router;
