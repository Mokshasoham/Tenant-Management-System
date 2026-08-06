/**
 * server/src/services/maintenanceService.js
 *
 * Enterprise Service Layer for Maintenance Management Context.
 * Reuses existing StorageProvider, EventBus, Reminder Queue, and Notification Engine.
 */

import maintenanceRepository from '../repositories/maintenanceRepository.js';
import storageProvider from '../platform/storage/storageProvider.js';
import eventBus from '../platform/events/eventBus.js';
import reminderQueue from '../modules/reminders/queue/reminderQueue.js';
import NotificationService from './NotificationService.js';
import User from '../models/User.js';
import logger from '../platform/logging/logger.js';
import { AppError } from '../utils/errorHandling.js';

export class MaintenanceService {
  /**
   * Validates Maintenance Request payload.
   */
  validateRequest(data) {
    const errors = [];
    if (!data.title || !data.title.trim()) errors.push('Title is required');
    if (!data.description || !data.description.trim()) errors.push('Description is required');
    if (!data.category) errors.push('Category is required');
    if (!data.priority) errors.push('Priority is required');
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Publishes domain events to EventBus.
   */
  async publishEvents(eventType, payload) {
    try {
      await eventBus.publish(eventType, payload);
    } catch (err) {
      logger.error(`[MaintenanceService] Failed to publish event ${eventType}:`, err);
    }
  }

  /**
   * Creates a new Enterprise Maintenance Request.
   */
  async createRequest(data, userContext, reqMeta = {}) {
    const validation = this.validateRequest(data);
    if (!validation.isValid) {
      throw new AppError(`Validation Failed: ${validation.errors.join('; ')}`, 400);
    }

    const userId = userContext.userId || userContext._id || userContext.id;

    // 1. Create Maintenance Document via Repository
    const requestData = {
      ...data,
      requestedBy: userId,
      status: 'open',
      submissionSource: data.submissionSource || 'web',
      createdFromIP: reqMeta.ip || '127.0.0.1',
      deviceInfo: reqMeta.userAgent || 'Web Client'
    };

    const request = await maintenanceRepository.create(requestData);

    const isEmergency = data.priority === 'emergency';
    const eventName = isEmergency ? 'maintenance.emergency.created' : 'maintenance.created';

    // 2. Publish Domain Events via EventBus
    await this.publishEvents(eventName, {
      ticketId: request._id,
      title: request.title,
      category: request.category,
      priority: request.priority,
      requestedBy: userId,
      propertyId: request.property,
      timestamp: new Date().toISOString()
    });

    if (request.requestedVisitDate || request.requestedTimeSlot) {
      await this.publishEvents('maintenance.visit.requested', {
        ticketId: request._id,
        requestedVisitDate: request.requestedVisitDate,
        requestedTimeSlot: request.requestedTimeSlot
      });
    }

    // 3. Create SLA Reminders via Reminder Engine
    const slaMinutes = isEmergency ? 30 : 1440; // 30 mins vs 24 hours
    const scheduledFor = new Date(Date.now() + slaMinutes * 60 * 1000).toISOString();

    await reminderQueue.enqueueReminder({
      idempotencyKey: `maint_sla_${request._id}_${Date.now()}`,
      recipientId: userId,
      recipientType: 'User',
      recipientEmail: userContext.email || 'tenant@system.com',
      channel: 'email',
      templateId: 'maintenance_sla_alert',
      scheduledFor,
      entityType: 'Maintenance',
      entityId: request._id.toString(),
      metadata: {
        ticketId: request._id,
        title: request.title,
        priority: request.priority,
        slaMinutes
      }
    }).catch(err => logger.warn('[MaintenanceService] Reminder enqueue warning:', err.message));

    // 4. Send Notifications to Tenant & Managers via Notification Engine
    const managers = await User.find({ role: { $in: ['manager', 'admin'] }, isActive: true }, '_id email').lean();

    for (const m of managers) {
      if (m._id.toString() !== userId.toString()) {
        await NotificationService.notify({
          recipient: m._id,
          category: 'maintenance',
          event: isEmergency ? 'emergency_created' : 'created',
          title: isEmergency ? '🚨 EMERGENCY Maintenance Request' : 'New Maintenance Request',
          description: `Request "${request.title}" (${request.priority.toUpperCase()}) submitted.`,
          sourceModule: 'maintenance',
          entityType: 'Maintenance',
          entityId: request._id,
          priority: isEmergency ? 'high' : 'medium'
        }).catch(err => logger.warn('[MaintenanceService] Notification send error:', err.message));
      }
    }

    return request;
  }

  /**
   * Uploads and attaches files to a maintenance request.
   */
  async uploadAttachments(ticketId, files = []) {
    const request = await maintenanceRepository.findById(ticketId);
    if (!request) throw new AppError('Maintenance request not found', 404);

    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    if ((request.attachments?.length || 0) + files.length > 10) {
      throw new AppError('Maximum 10 attachments allowed per maintenance request', 400);
    }

    const uploadedRecords = [];

    for (const file of files) {
      // Validate File Size (max 20 MB)
      if (file.size > 20 * 1024 * 1024) {
        throw new AppError(`File '${file.originalname}' exceeds 20MB limit`, 400);
      }

      const filename = `maint_${ticketId}_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const uploadResult = await storageProvider.upload(
        file.buffer,
        filename,
        file.mimetype,
        'maintenance'
      );

      const attachmentData = {
        url: uploadResult.url,
        filename: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        uploadedAt: new Date()
      };

      await maintenanceRepository.appendAttachment(ticketId, attachmentData);
      uploadedRecords.push(attachmentData);
    }

    await this.publishEvents('maintenance.attachment.uploaded', {
      ticketId,
      fileCount: uploadedRecords.length,
      timestamp: new Date().toISOString()
    });

    return await maintenanceRepository.findById(ticketId);
  }

  /**
   * Deletes an attachment from a maintenance request.
   */
  async deleteAttachment(ticketId, attachmentUrl) {
    const request = await maintenanceRepository.findById(ticketId);
    if (!request) throw new AppError('Maintenance request not found', 404);

    const attachment = request.attachments?.find(a => a.url === attachmentUrl);
    if (attachment) {
      await storageProvider.delete(attachment.filename || path.basename(attachmentUrl), 'maintenance').catch(() => {});
    }

    return await maintenanceRepository.deleteAttachment(ticketId, attachmentUrl);
  }

  /**
   * Schedules a visit for a maintenance ticket.
   */
  async scheduleVisit(ticketId, visitDate, timeSlot) {
    const request = await maintenanceRepository.update(ticketId, {
      requestedVisitDate: visitDate,
      requestedTimeSlot: timeSlot,
      scheduledDate: visitDate,
      scheduledSlot: timeSlot
    });

    await this.publishEvents('maintenance.visit.requested', {
      ticketId,
      visitDate,
      timeSlot
    });

    return request;
  }
}

const maintenanceServiceSingleton = new MaintenanceService();
export default maintenanceServiceSingleton;
