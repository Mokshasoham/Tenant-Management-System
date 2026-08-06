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

// Technician self-service routes (/me/*)
router.get('/me', authorize('technician'), technicianController.getMyProfile);
router.patch('/me', authorize('technician'), technicianController.updateMyProfile);
router.get('/me/jobs', authorize('technician'), technicianController.getMyJobs);
router.get('/me/property-lookup', authorize('technician'), technicianController.lookupPropertyByQR);
router.post('/me/jobs/:id/check-in', authorize('technician'), technicianController.checkInToJob);
router.post('/me/jobs/:id/check-out', authorize('technician'), technicianController.checkOutFromJob);
router.patch('/me/location', authorize('technician'), technicianController.updateLocation);
router.get('/me/schedule', authorize('technician'), technicianController.getMySchedule);
router.patch('/me/availability', authorize('technician'), technicianController.updateMyAvailability);
router.get('/me/kpis', authorize('technician'), technicianController.getMyKPIs);

router.get('/', authorize('manager', 'admin'), technicianController.getAllTechnicians);
router.get('/:id', authorize('manager', 'admin'), technicianController.getTechnicianById);
router.get('/:id/workload', authorize('manager', 'admin'), technicianController.getWorkload);
router.get('/:id/performance', authorize('manager', 'admin'), technicianController.getPerformance);

router.post('/', authorize('manager', 'admin'), technicianController.createTechnician);
router.put('/:id', authorize('manager', 'admin'), technicianController.updateTechnician);
router.delete('/:id', authorize('manager', 'admin'), technicianController.deleteTechnician);

export default router;
