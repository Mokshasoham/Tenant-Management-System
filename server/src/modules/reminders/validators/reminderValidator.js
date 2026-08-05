/**
 * server/src/modules/reminders/validators/reminderValidator.js
 *
 * Input validation logic for Reminder rules, templates, preferences, and queue items.
 */

import {
  ReminderStatus,
  ReminderChannel,
  ReminderCategory,
  ReminderTriggerType,
  ReminderEntityType,
  UserRole
} from '../constants/reminderConstants.js';

export function validateRuleInput(data = {}) {
  const errors = [];
  if (!data.ruleId || typeof data.ruleId !== 'string' || !data.ruleId.trim()) {
    errors.push('ruleId string is required');
  }
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('name string is required');
  }
  if (!data.category || !Object.values(ReminderCategory).includes(data.category)) {
    errors.push(`category must be one of: ${Object.values(ReminderCategory).join(', ')}`);
  }
  if (data.triggerType && !Object.values(ReminderTriggerType).includes(data.triggerType)) {
    errors.push(`triggerType must be one of: ${Object.values(ReminderTriggerType).join(', ')}`);
  }
  if (!data.templateId || typeof data.templateId !== 'string') {
    errors.push('templateId is required');
  }
  if (!Array.isArray(data.channels) || data.channels.length === 0) {
    errors.push('channels must be a non-empty array');
  } else {
    data.channels.forEach(ch => {
      if (!Object.values(ReminderChannel).includes(ch)) {
        errors.push(`Invalid channel: ${ch}`);
      }
    });
  }
  return { isValid: errors.length === 0, errors };
}

export function validateReminderInput(data = {}) {
  const errors = [];
  if (!data.idempotencyKey || typeof data.idempotencyKey !== 'string') {
    errors.push('idempotencyKey is required');
  }
  if (!data.ruleId || typeof data.ruleId !== 'string') {
    errors.push('ruleId is required');
  }
  if (!data.entityType || !Object.values(ReminderEntityType).includes(data.entityType)) {
    errors.push(`entityType must be one of: ${Object.values(ReminderEntityType).join(', ')}`);
  }
  if (!data.entityId) {
    errors.push('entityId is required');
  }
  if (!data.recipient) {
    errors.push('recipient User ID is required');
  }
  if (!data.channel || !Object.values(ReminderChannel).includes(data.channel)) {
    errors.push(`channel must be one of: ${Object.values(ReminderChannel).join(', ')}`);
  }
  if (!data.scheduledFor) {
    errors.push('scheduledFor Date is required');
  }
  return { isValid: errors.length === 0, errors };
}

export function validateTemplateInput(data = {}) {
  const errors = [];
  if (!data.templateId || typeof data.templateId !== 'string') {
    errors.push('templateId is required');
  }
  if (!data.name || typeof data.name !== 'string') {
    errors.push('name is required');
  }
  if (!data.channel || !Object.values(ReminderChannel).includes(data.channel)) {
    errors.push(`channel must be one of: ${Object.values(ReminderChannel).join(', ')}`);
  }
  if (!data.subject || typeof data.subject !== 'string') {
    errors.push('subject is required');
  }
  if (!data.textBody || typeof data.textBody !== 'string') {
    errors.push('textBody is required');
  }
  return { isValid: errors.length === 0, errors };
}

export default {
  validateRuleInput,
  validateReminderInput,
  validateTemplateInput
};
