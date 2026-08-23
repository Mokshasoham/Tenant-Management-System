import express from 'express';
import * as propertyController from '../controllers/propertyController.js';
import * as nearbyController from '../controllers/nearbyPlacesController.js';
import { authenticate, optionalAuthenticate, managerOrAdmin } from '../middleware/auth.js';
import { validationMiddleware, validatePropertyCreation } from '../middleware/validation.js';
import { uploadMemory } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// ══ PUBLIC (UNAUTHENTICATED) FOR MOBILE CAMERA SCANNING ══
router.get('/public-verify/:token', propertyController.verifyPropertyByToken);
router.get('/verify/:token', propertyController.verifyPropertyByToken);

// Public / Optional Auth (Landing page discovery, public search & details)
router.get('/', optionalAuthenticate, propertyController.getAllProperties);
router.get('/:id', optionalAuthenticate, propertyController.getPropertyById);
router.get('/:id/availability', optionalAuthenticate, propertyController.getAvailability);
router.get('/:id/similar', optionalAuthenticate, propertyController.getSimilarProperties);

router.use(authenticate);

// Authenticated Property Routes
router.get('/stats', managerOrAdmin, propertyController.getPropertyStats);
router.get('/:id/qr-pass', propertyController.getPropertyQrPass);

// Explore Nearby Places & Driving Route & City Discovery (Authenticated)
router.get('/:id/nearby', nearbyController.getNearbyPlaces);
router.get('/:id/city-places', nearbyController.getCityPlaces);
router.get('/:id/route', nearbyController.getRoute);

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

