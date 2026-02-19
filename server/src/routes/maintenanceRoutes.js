import express from 'express';
import * as maintenanceController from '../controllers/maintenanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', maintenanceController.getAllRequests);
router.get('/stats', maintenanceController.getStats);
router.get('/:id', maintenanceController.getRequestById);
router.post('/', maintenanceController.createRequest);
router.put('/:id', authorize('manager', 'admin'), maintenanceController.updateRequest);
router.post('/:id/notes', maintenanceController.addNote);
router.delete('/:id', authorize('manager', 'admin'), maintenanceController.deleteRequest);

export default router;
