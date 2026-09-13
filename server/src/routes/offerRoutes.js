import express from 'express';
import {
    createOffer,
    getPropertyOffers,
    getMyOffers,
    getManagerOffers,
    getOfferById,
    respondToOffer,
} from '../controllers/offerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createOffer);
router.get('/my', getMyOffers);
router.get('/manager', authorize('manager', 'admin'), getManagerOffers);
router.get('/property/:propertyId', authorize('manager', 'admin'), getPropertyOffers);
router.get('/:id', getOfferById);
router.put('/:id/respond', respondToOffer);

export default router;
