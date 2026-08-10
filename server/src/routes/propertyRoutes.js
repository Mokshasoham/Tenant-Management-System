import express from 'express';
import * as propertyController from '../controllers/propertyController.js';
import { authenticate, managerOrAdmin } from '../middleware/auth.js';
import { validationMiddleware, validatePropertyCreation } from '../middleware/validation.js';
import { uploadMemory } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Public to all authenticated users (browse & details)
router.get('/', propertyController.getAllProperties);
router.get('/stats', managerOrAdmin, propertyController.getPropertyStats);
router.get('/:id', propertyController.getPropertyById);
router.get('/:id/availability', propertyController.getAvailability);
router.get('/:id/similar', propertyController.getSimilarProperties);

// Toggle save/unsave (all authenticated)
router.post('/:id/save', propertyController.saveProperty);
router.delete('/:id/save', propertyController.saveProperty);

// Manager/Admin only
router.post('/', managerOrAdmin, validatePropertyCreation, validationMiddleware, propertyController.createProperty);
router.post('/:id/media', managerOrAdmin, uploadMemory.array('media', 15), propertyController.uploadPropertyMedia);
router.put('/:id', managerOrAdmin, propertyController.updateProperty);
router.delete('/:id', managerOrAdmin, propertyController.deleteProperty);
router.post('/:id/status', managerOrAdmin, propertyController.changePropertyStatus);

export default router;
