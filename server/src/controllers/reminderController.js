/**
 * server/src/controllers/reminderController.js
 *
 * Thin REST Controller for the Reminder Subsystem.
 * Exposes queue inspection, history audit, telemetry analytics, previews, test dispatches,
 * retry/cancel mutations, and health diagnostics while delegating 100% of business logic to existing services.
 */

import asyncHandler from 'express-async-handler';
import Reminder from '../modules/reminders/models/Reminder.js';
import ReminderHistory from '../modules/reminders/models/ReminderHistory.js';
import reminderTemplateRepository from '../modules/reminders/repositories/reminderTemplateRepository.js';
import reminderMetricsService from '../modules/reminders/services/ReminderMetricsService.js';
import reminderEmailService from '../modules/reminders/services/reminderEmailService.js';
import reminderSmsService from '../modules/reminders/services/reminderSmsService.js';
import reminderDiagnosticsService from '../modules/reminders/services/ReminderDiagnosticsService.js';
import { ReminderStatus } from '../modules/reminders/constants/reminderConstants.js';
import {
  validateQueueQuery,
  validateHistoryQuery,
  validatePreviewInput,
  validateTestEmailInput,
  validateTestSmsInput,
  validateIdParam
} from '../modules/reminders/validators/reminderApiValidator.js';

/**
 * GET /api/v1/reminders/queue
 * Paginated queue inspection endpoint.
 */
export const getQueue = asyncHandler(async (req, res) => {
  const { isValid, errors, page, limit } = validateQueueQuery(req.query);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_QUERY', message: errors.join('; ') }
    });
  }

  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.channel) query.channel = req.query.channel;
  if (req.query.entityType) query.entityType = req.query.entityType;
  if (req.query.recipient) query.recipient = req.query.recipient;

  if (req.query.scheduledFrom || req.query.scheduledTo) {
    query.scheduledFor = {};
    if (req.query.scheduledFrom) query.scheduledFor.$gte = new Date(req.query.scheduledFrom);
    if (req.query.scheduledTo) query.scheduledFor.$lte = new Date(req.query.scheduledTo);
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Reminder.find(query).sort({ scheduledFor: 1 }).skip(skip).limit(limit).lean(),
    Reminder.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    message: 'Reminder queue items retrieved successfully.',
    data: items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * GET /api/v1/reminders/history
 * Paginated audit history endpoint.
 */
export const getHistory = asyncHandler(async (req, res) => {
  const { isValid, errors, page, limit } = validateHistoryQuery(req.query);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_QUERY', message: errors.join('; ') }
    });
  }

  const query = {};
  if (req.query.recipient) query.recipient = req.query.recipient;
  if (req.query.channel) query.channel = req.query.channel;
  if (req.query.status) query.status = req.query.status;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ReminderHistory.find(query).sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
    ReminderHistory.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    message: 'Reminder audit history retrieved successfully.',
    data: items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * GET /api/v1/reminders/analytics
 * Aggregated telemetry stats endpoint.
 */
export const getAnalytics = asyncHandler(async (req, res) => {
  const metrics = await reminderMetricsService.getMetrics();
  res.status(200).json({
    success: true,
    message: 'Reminder analytics metrics retrieved successfully.',
    data: metrics
  });
});

/**
 * POST /api/v1/reminders/preview
 * Renders template preview without sending.
 */
export const previewTemplate = asyncHandler(async (req, res) => {
  const { isValid, errors } = validatePreviewInput(req.body);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: errors.join('; ') }
    });
  }

  const { templateId, payload = {} } = req.body;
  const template = await reminderTemplateRepository.findLatest(templateId);

  const previewTemplateDef = template || {
    templateId,
    version: 1,
    subject: `Preview: Reminder for ${templateId}`,
    htmlBody: `<p>Sample body content for <strong>${templateId}</strong></p>`,
    textBody: `Sample body content for ${templateId}`
  };

  const preview = reminderEmailService.previewTemplate(previewTemplateDef, payload);

  res.status(200).json({
    success: true,
    message: 'Template preview generated successfully.',
    data: {
      templateId,
      templateVersion: previewTemplateDef.version || 1,
      ...preview
    }
  });
});

/**
 * POST /api/v1/reminders/test-email
 * Dispatches a diagnostic test email.
 */
export const testEmail = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateTestEmailInput(req.body);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: errors.join('; ') }
    });
  }

  const { recipientEmail, providerName } = req.body;
  const result = await reminderEmailService.sendTestEmail(providerName, recipientEmail);

  res.status(200).json({
    success: true,
    message: 'Test email dispatch executed.',
    data: result
  });
});

/**
 * POST /api/v1/reminders/test-sms
 * Dispatches a diagnostic test SMS.
 */
export const testSms = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateTestSmsInput(req.body);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: errors.join('; ') }
    });
  }

  const { recipientPhone, providerName } = req.body;
  const result = await reminderSmsService.sendTestSms(providerName, recipientPhone);

  res.status(200).json({
    success: true,
    message: 'Test SMS dispatch executed.',
    data: result
  });
});

/**
 * POST /api/v1/reminders/retry/:id
 * Retries a failed or dead_letter reminder task by resetting status to queued.
 */
export const retryReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const val = validateIdParam(id);
  if (!val.isValid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: val.error }
    });
  }

  const reminder = await Reminder.findById(id);
  if (!reminder) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Reminder ${id} not found.` }
    });
  }

  if (reminder.status !== ReminderStatus.FAILED && reminder.status !== ReminderStatus.DEAD_LETTER) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: `Only 'failed' or 'dead_letter' reminders can be retried. Current status is '${reminder.status}'.`
      }
    });
  }

  reminder.status = ReminderStatus.QUEUED;
  reminder.attempts = 0;
  reminder.nextRetryAt = null;
  reminder.cancelReason = null;
  await reminder.save();

  res.status(200).json({
    success: true,
    message: `Reminder ${id} successfully reset to queued for retry.`,
    data: reminder
  });
});

/**
 * POST /api/v1/reminders/cancel/:id
 * Cancels a queued or processing reminder task.
 */
export const cancelReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const val = validateIdParam(id);
  if (!val.isValid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: val.error }
    });
  }

  const reminder = await Reminder.findById(id);
  if (!reminder) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Reminder ${id} not found.` }
    });
  }

  if (reminder.status !== ReminderStatus.QUEUED && reminder.status !== ReminderStatus.PROCESSING) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: `Only 'queued' or 'processing' reminders can be cancelled. Current status is '${reminder.status}'.`
      }
    });
  }

  reminder.status = ReminderStatus.CANCELLED;
  reminder.cancelReason = req.body.reason || 'Manually cancelled via API';
  await reminder.save();

  res.status(200).json({
    success: true,
    message: `Reminder ${id} successfully cancelled.`,
    data: reminder
  });
});

/**
 * GET /api/v1/reminders/health
 * Read-only health diagnostics endpoint.
 */
export const getHealth = asyncHandler(async (req, res) => {
  const diagnostics = await reminderDiagnosticsService.getDiagnostics();
  res.status(200).json({
    success: true,
    message: 'System health diagnostics retrieved.',
    data: diagnostics
  });
});

export default {
  getQueue,
  getHistory,
  getAnalytics,
  previewTemplate,
  testEmail,
  testSms,
  retryReminder,
  cancelReminder,
  getHealth
};
