/**
 * server/src/modules/reminders/constants/reminderConstants.js
 *
 * Central constants and enums for the Email & SMS Reminder Engine.
 */

export const ReminderStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  DEAD_LETTER: 'dead_letter'
};

export const ReminderChannel = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  PUSH: 'push'
};

export const ReminderCategory = {
  RENEWAL: 'renewal',
  LEASE: 'lease',
  PAYMENT: 'payment',
  MAINTENANCE: 'maintenance',
  SLA: 'sla',
  SYSTEM: 'system'
};

export const ReminderTriggerType = {
  SCHEDULED_OFFSET: 'SCHEDULED_OFFSET',
  EVENT_DRIVEN: 'EVENT_DRIVEN'
};

export const ReminderEntityType = {
  LEASE: 'Lease',
  PAYMENT: 'Payment',
  MAINTENANCE: 'Maintenance',
  CAMPAIGN: 'Campaign'
};

export const UserRole = {
  TENANT: 'tenant',
  MANAGER: 'manager',
  ADMIN: 'admin'
};

export const DEFAULT_QUIET_HOURS = {
  enabled: true,
  startHour: 22, // 10 PM
  endHour: 7,    // 7 AM
  timezone: 'Asia/Kolkata'
};

export default {
  ReminderStatus,
  ReminderChannel,
  ReminderCategory,
  ReminderTriggerType,
  ReminderEntityType,
  UserRole,
  DEFAULT_QUIET_HOURS
};
