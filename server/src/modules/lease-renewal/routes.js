import express from 'express';
import { authenticate, managerOrAdmin } from '../../middleware/auth.js';
import * as controller from './controller.js';
import * as validator from './validator.js';
import * as campaignController from './campaignController.js';
import * as policyController from './policyController.js';

const router = express.Router();

// RESTful v1 Endpoints (Mounted at /api/v1/lease-renewals)
router.get('/dashboard', authenticate, controller.getDashboard);
router.post('/', authenticate, validator.validateCreateRenewal, controller.createRequest);
router.get('/my', authenticate, controller.getHistory);
router.get('/manager', authenticate, managerOrAdmin, controller.getManagerRequests);
router.get('/:id', authenticate, controller.getDetails);
router.put('/:id', authenticate, validator.validateUpdateRenewal, controller.updateRequest);
router.delete('/:id', authenticate, controller.cancelRequest);

// Negotiation & Workflow Endpoints
router.post('/:id/offers', authenticate, controller.submitCounterOffer);
router.get('/:id/offers', authenticate, controller.getOffers);
router.post('/:id/messages', authenticate, controller.addMessage);
router.get('/:id/messages', authenticate, controller.getMessages);
router.post('/:id/approve', authenticate, controller.approveRenewal);
router.post('/:id/reject', authenticate, controller.rejectRenewal);
router.post('/:id/sign', authenticate, controller.signRenewal);

// Campaign Foundation Endpoints
router.get('/campaigns/index', authenticate, campaignController.getCampaigns);
router.get('/campaigns/:id', authenticate, campaignController.getCampaignDetails);
router.post('/campaigns', authenticate, validator.validateCreateCampaign, campaignController.createCampaign);
router.post('/campaigns/:id/transition', authenticate, validator.validateTransitionCampaign, campaignController.transitionStatus);
router.post('/campaigns/:id/evaluate', authenticate, policyController.evaluateCampaign);

// Policy Endpoints
router.post('/policies/simulate', authenticate, policyController.simulatePolicy);
router.post('/policies', authenticate, managerOrAdmin, policyController.savePolicy);
router.get('/policies', authenticate, policyController.getPolicies);
router.patch('/policies/:id', authenticate, managerOrAdmin, policyController.updatePolicy);
router.delete('/policies/:id', authenticate, managerOrAdmin, policyController.deletePolicy);

export default router;
