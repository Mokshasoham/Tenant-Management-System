import express from 'express';
import * as leaseController from '../controllers/leaseController.js';
import { authenticate, managerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Tenant-accessible routes
router.get('/my-active', leaseController.getMyLease);
router.get('/my-lease', leaseController.getMyLease);
router.get('/:id', leaseController.getLeaseById);
router.post('/:id/sign', leaseController.signLease);
// Pre-lease checklist (tenant can view their own lease's checklist)
router.get('/:id/checklist', leaseController.getLeaseChecklist);

// Manager/Admin only routes
router.get('/', managerOrAdmin, leaseController.getAllLeases);
router.post('/', managerOrAdmin, leaseController.createLease);
router.get('/stats', managerOrAdmin, leaseController.getLeaseStats);
router.put('/:id', managerOrAdmin, leaseController.updateLease);
router.post('/:id/terminate', managerOrAdmin, leaseController.terminateLease);
router.post('/:id/documents', managerOrAdmin, leaseController.uploadLeaseDocument);
router.post('/:id/generate-pdf', leaseController.generateLeasePDF);
router.post('/:id/manager-sign', managerOrAdmin, leaseController.managerSignLease);

export default router;
