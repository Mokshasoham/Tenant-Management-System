import express from 'express';
import * as tenantController from '../controllers/tenantController.js';
import { authenticate, authorize, managerOrAdmin } from '../middleware/auth.js';
import { validationMiddleware, validateTenantCreation } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);
router.use(managerOrAdmin);

router.get('/', tenantController.getAllTenants);
router.post('/', validateTenantCreation, validationMiddleware, tenantController.createTenant);
router.get('/stats', tenantController.getTenantStats);
router.get('/:id', tenantController.getTenantById);
router.put('/:id', tenantController.updateTenant);
router.delete('/:id', tenantController.deleteTenant);
router.post('/:id/status', tenantController.changeTenantStatus);

export default router;
