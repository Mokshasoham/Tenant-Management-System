/**
 * server/src/routes/technicianRoutes.js
 * Routes for Technician & Workforce Management API endpoints.
 */

import express from 'express';
import * as technicianController from '../controllers/technicianController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/available', technicianController.getAvailableTechnicians);
router.get('/search', technicianController.searchTechnicians);
router.get('/', technicianController.getAllTechnicians);
router.get('/:id', technicianController.getTechnicianById);
router.get('/:id/workload', technicianController.getWorkload);
router.get('/:id/performance', technicianController.getPerformance);

router.post('/', authorize('manager', 'admin'), technicianController.createTechnician);
router.put('/:id', authorize('manager', 'admin'), technicianController.updateTechnician);
router.delete('/:id', authorize('manager', 'admin'), technicianController.deleteTechnician);

export default router;
