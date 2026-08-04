import express from 'express';
import { authenticate, managerOrAdmin } from '../middleware/auth.js';
import {
  sendRenewalOffer,
  respondToOffer,
  submitMoveOutNotice,
  submitExitFeedback,
  scheduleInspection,
  completeInspection,
  processDepositRefund,
  approveRenewal,
  rejectRenewal,
  finalizeMoveOut,
  getUpcomingExpiringLeases,
  getInspectionById,
  getFeedbackByLeaseId,
  getDepositByLeaseId,
  getExitReportPDF,
  getRenewalReportPDF
} from '../controllers/leaseRenewalController.js';
import {
  createRequest,
  getHistory,
  getManagerRequests
} from '../modules/lease-renewal/controller.js';

const router = express.Router();

// Tenant Endpoints
router.post('/renewals/request', authenticate, createRequest);
router.post('/renewals/:id/respond', authenticate, respondToOffer);
router.post('/lease/moveout', authenticate, submitMoveOutNotice);
router.post('/feedback/exit', authenticate, submitExitFeedback);

// Manager Endpoints
router.get('/renewals', authenticate, managerOrAdmin, getManagerRequests);
// Tenant-accessible: returns only their own renewals/offers
router.get('/renewals/my', authenticate, getHistory);
router.post('/renewals/offer', authenticate, managerOrAdmin, sendRenewalOffer);
router.put('/renewals/:id/approve', authenticate, managerOrAdmin, approveRenewal);
router.put('/renewals/:id/reject', authenticate, managerOrAdmin, rejectRenewal);
router.post('/inspection', authenticate, managerOrAdmin, scheduleInspection);
router.put('/inspection/:id', authenticate, managerOrAdmin, completeInspection);
router.post('/deposit/refund', authenticate, managerOrAdmin, processDepositRefund);
router.put('/lease/:id/final-moveout', authenticate, managerOrAdmin, finalizeMoveOut);

// Common Endpoints
router.get('/lease/upcoming', authenticate, getUpcomingExpiringLeases);
router.get('/inspection/:id', authenticate, getInspectionById);
router.get('/feedback/:leaseId', authenticate, getFeedbackByLeaseId);
router.get('/deposit/:leaseId', authenticate, getDepositByLeaseId);
router.get('/lease/:id/exit-report', authenticate, getExitReportPDF);
router.get('/renewals/:id/renewal-report', authenticate, getRenewalReportPDF);

export default router;
