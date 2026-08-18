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
router.get('/technician/search', maintenanceController.searchTechnicianData);
router.get('/:id', maintenanceController.getRequestById);
router.get('/:id/timeline', maintenanceController.getTimeline);
router.get('/:id/comments', maintenanceController.getComments);
router.get('/:id/audit-trail', maintenanceController.getAuditTrail);
router.get('/:id/related', maintenanceController.getRelatedTickets);

router.post('/', maintenanceController.createRequest);
router.post('/:id/attachments', upload.array('attachments', 10), maintenanceController.uploadAttachments);
router.post('/:id/photos/:phase', upload.any(), maintenanceController.uploadPhasePhotos);
router.delete('/:id/photos/:phase', maintenanceController.deletePhasePhoto);
router.post('/:id/signature', maintenanceController.saveSignature);
router.post('/:id/voice-notes', upload.single('audio'), maintenanceController.uploadVoiceNote);
router.post('/:id/check-in/override', authorize('manager', 'admin'), maintenanceController.overrideCheckInGps);
router.delete('/:id/attachments', maintenanceController.deleteAttachment);
router.post('/:id/notes', maintenanceController.addNote);
router.post('/:id/comments', maintenanceController.addNote);
router.post('/:id/internal-notes', authorize('manager', 'admin'), maintenanceController.addInternalNote);
router.post('/:id/escalate', authorize('manager', 'admin'), maintenanceController.escalateTicket);
router.post('/:id/merge', authorize('manager', 'admin'), maintenanceController.mergeTicket);
router.get('/verify/:ticketCode', maintenanceController.verifyTicketByCode);
router.post('/verify', maintenanceController.verifyTicketByCode);
router.get('/:id/qr', maintenanceController.getTicketQr);
router.post('/:id/complete', maintenanceController.submitCompletion);
router.post('/:id/resolve', maintenanceController.resolveTicket);
router.post('/:id/rating', maintenanceController.addRating);
router.post('/:id/feedback', maintenanceController.addRating);

router.put('/:id/costs', authorize('manager', 'admin'), maintenanceController.updateCosts);
router.put('/:id/checklist', authorize('manager', 'admin'), maintenanceController.updateChecklist);
router.put('/:id/status', maintenanceController.updateStatus);
router.put('/:id/assign', authorize('manager', 'admin'), maintenanceController.assignTechnician);
router.put('/:id', authorize('manager', 'admin'), maintenanceController.updateRequest);
router.delete('/:id', authorize('manager', 'admin'), maintenanceController.deleteRequest);

export default router;
