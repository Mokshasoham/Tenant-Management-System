import { body, param } from 'express-validator';
import { validationMiddleware } from '../../middleware/validation.js';

export const validateCreateRenewal = [
  body('leaseId')
    .isMongoId().withMessage('Invalid Lease ID format'),
  body('duration')
    .notEmpty().withMessage('Duration term is required'),
  body('proposedRent')
    .isNumeric().withMessage('Proposed rent must be a numeric value'),
  body('requestedStartDate')
    .isISO8601().toDate().withMessage('Invalid start date format'),
  body('requestedEndDate')
    .isISO8601().toDate().withMessage('Invalid end date format'),
  body('message')
    .optional()
    .trim(),
  validationMiddleware
];

export const validateUpdateRenewal = [
  param('id')
    .isMongoId().withMessage('Invalid request ID format'),
  body('duration')
    .optional()
    .notEmpty().withMessage('Duration term cannot be empty'),
  body('proposedRent')
    .optional()
    .isNumeric().withMessage('Proposed rent must be a numeric value'),
  body('requestedStartDate')
    .optional()
    .isISO8601().toDate().withMessage('Invalid start date format'),
  body('requestedEndDate')
    .optional()
    .isISO8601().toDate().withMessage('Invalid end date format'),
  body('message')
    .optional()
    .trim(),
  validationMiddleware
];

export const validateCreateCampaign = [
  body('leaseId')
    .isMongoId().withMessage('Invalid Lease ID format'),
  body('source')
    .optional()
    .isIn(['manual', 'scheduler', 'api', 'migration', 'system']).withMessage('Invalid campaign source'),
  validationMiddleware
];

export const validateTransitionCampaign = [
  param('id')
    .isMongoId().withMessage('Invalid campaign ID format'),
  body('status')
    .isIn(['draft', 'created', 'waiting_for_tenant', 'waiting_for_manager', 'negotiating', 'pending_signature', 'approved', 'completed', 'expired', 'cancelled', 'escalated']).withMessage('Invalid campaign status'),
  validationMiddleware
];

