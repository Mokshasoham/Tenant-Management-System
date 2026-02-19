import express from 'express';
import {
    createOffer,
    getPropertyOffers,
    getMyOffers,
    respondToOffer,
} from '../controllers/offerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createOffer);
router.get('/my', getMyOffers);
router.get('/property/:propertyId', authorize('manager', 'admin'), getPropertyOffers);
router.put('/:id/respond', respondToOffer);

export default router;
