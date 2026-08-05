/**
 * server/src/modules/reminders/validators/reminderApiValidator.js
 *
 * Input validation logic for REST API query parameters and request bodies.
 */

import mongoose from 'mongoose';
import { ReminderStatus, ReminderChannel, ReminderEntityType } from '../constants/reminderConstants.js';

export function validateIdParam(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { isValid: false, error: 'Invalid ID parameter format.' };
  }
  return { isValid: true };
}

export function validateQueueQuery(query = {}) {
  const errors = [];
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '20', 10);

  if (isNaN(page) || page < 1) errors.push('page must be a positive integer');
  if (isNaN(limit) || limit < 1 || limit > 100) errors.push('limit must be between 1 and 100');

  if (query.status && !Object.values(ReminderStatus).includes(query.status)) {
    errors.push(`status must be one of: ${Object.values(ReminderStatus).join(', ')}`);
  }
  if (query.channel && !Object.values(ReminderChannel).includes(query.channel)) {
    errors.push(`channel must be one of: ${Object.values(ReminderChannel).join(', ')}`);
  }
  if (query.entityType && !Object.values(ReminderEntityType).includes(query.entityType)) {
    errors.push(`entityType must be one of: ${Object.values(ReminderEntityType).join(', ')}`);
  }

  return { isValid: errors.length === 0, errors, page, limit };
}

export function validateHistoryQuery(query = {}) {
  const errors = [];
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '20', 10);

  if (isNaN(page) || page < 1) errors.push('page must be a positive integer');
  if (isNaN(limit) || limit < 1 || limit > 100) errors.push('limit must be between 1 and 100');

  return { isValid: errors.length === 0, errors, page, limit };
}

export function validatePreviewInput(body = {}) {
  const errors = [];
  if (!body.templateId || typeof body.templateId !== 'string') {
    errors.push('templateId string is required');
  }
  return { isValid: errors.length === 0, errors };
}

export function validateTestEmailInput(body = {}) {
  const errors = [];
  if (!body.recipientEmail || typeof body.recipientEmail !== 'string') {
    errors.push('recipientEmail is required');
  }
  return { isValid: errors.length === 0, errors };
}

export function validateTestSmsInput(body = {}) {
  const errors = [];
  if (!body.recipientPhone || typeof body.recipientPhone !== 'string') {
    errors.push('recipientPhone is required');
  }
  return { isValid: errors.length === 0, errors };
}

export default {
  validateIdParam,
  validateQueueQuery,
  validateHistoryQuery,
  validatePreviewInput,
  validateTestEmailInput,
  validateTestSmsInput
};
