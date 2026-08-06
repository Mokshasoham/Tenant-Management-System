import express from 'express';
import multer from 'multer';
import * as maintenanceController from '../controllers/maintenanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB per file limit
});

const router = express.Router();

router.use(authenticate);

router.get('/', maintenanceController.getAllRequests);
router.get('/stats', maintenanceController.getStats);
router.get('/manager-dashboard', maintenanceController.getManagerDashboard);
router.get('/:id', maintenanceController.getRequestById);
router.get('/:id/timeline', maintenanceController.getTimeline);
router.get('/:id/comments', maintenanceController.getComments);

router.post('/', maintenanceController.createRequest);
router.post('/:id/attachments', upload.array('attachments', 10), maintenanceController.uploadAttachments);
router.delete('/:id/attachments', maintenanceController.deleteAttachment);
router.post('/:id/notes', maintenanceController.addNote);
router.post('/:id/comments', maintenanceController.addNote);
router.post('/:id/rating', maintenanceController.addRating);

router.put('/:id/status', maintenanceController.updateStatus);
router.put('/:id', authorize('manager', 'admin'), maintenanceController.updateRequest);
router.delete('/:id', authorize('manager', 'admin'), maintenanceController.deleteRequest);

export default router;
