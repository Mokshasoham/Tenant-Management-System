import express from 'express';
import * as billController from '../controllers/billController.js';
import { authenticate, managerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Tenant scope
router.get('/my-bills', billController.getMyBills);
router.get('/:id/download', billController.getBillDownload);
router.get('/:id', billController.getBillById);

// Manager/Admin scope
router.get('/', managerOrAdmin, billController.getAllBills);
router.get('/analytics/stats', managerOrAdmin, billController.getBillAnalytics);
router.get('/export/csv', managerOrAdmin, billController.exportBillsCSV);
router.post('/', managerOrAdmin, billController.createBill);
router.post('/:id/record-payment', managerOrAdmin, billController.recordBillPayment);
router.post('/:id/void', managerOrAdmin, billController.voidBill);

export default router;
